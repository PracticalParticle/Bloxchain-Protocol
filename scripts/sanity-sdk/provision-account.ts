/**
 * provision-account.ts — the reference provisioner (SPEC-2026-0118 R5 + R6).
 *
 * Takes an owner from nothing to a governed account that can make its first guarded
 * transfer, using only what `@bloxchain/contracts` and `@bloxchain/sdk` publish:
 * the official addresses file, the clone factory, and the SDK wrappers.
 *
 * ## The three locks
 *
 * A fresh account is a vault. Three things must be true before the first
 * `requestAndApproveExecution` succeeds, and skipping any of them fails in a way that
 * looks like a different problem:
 *
 *   1. **initialize** — owner, broadcaster, recovery and time lock are set. The clone
 *      factory does this in the same transaction as the clone.
 *   2. **guard batch** — the execution target is whitelisted for its selector. Without
 *      it: `TargetNotWhitelisted`.
 *   3. **role batch** — a role actually holds an action on the execution selector *and*
 *      on the handler. `initialize` registers the `transfer(address,uint256)` schema, but
 *      no role holds an action on it, so a whitelist alone still reverts
 *      `NoPermission(caller)`. Whitelist is not permission.
 *
 * ## Idempotency
 *
 * Every lock is read back before anything is sent, so re-running is safe and a repeat run
 * sends no transactions at all. Grants are versioned with {@link ROLE_SET_VERSION}: bump
 * it when the desired role set below changes, and the provisioner re-applies the affected
 * grants as REMOVE + ADD in one batch (a second `addFunctionToRole` for the same
 * (role, selector) reverts `ResourceAlreadyExists`, so changing a grant is never a plain
 * add).
 *
 * ## Usage
 *
 *   npm run provision:account -- --offline                      # validate config, no RPC
 *   npm run provision:account -- --dry-run                      # read chain, print plan
 *   npm run provision:account -- --chain sepolia --token 0x...  # apply
 *
 * Options:
 *   --chain <name|id>     network key or chain id in official-deployed-addresses.json
 *   --rpc <url>           RPC URL (default: .env RPC_URL or REMOTE_*)
 *   --account 0x...       provision this existing account (runs the shape gate first)
 *   --clone               clone a new account when the owner has none
 *   --token 0x...         ERC-20 to whitelist for governed transfers
 *   --role-set-version n  expected role set version (default: ROLE_SET_VERSION below)
 *   --force-role-sync     re-apply grants as REMOVE + ADD even when they look current
 *   --dry-run             read chain state, print the plan, send nothing
 *   --offline             no RPC at all: validate configuration and print the plan shape
 *
 * Environment (.env):
 *   RPC_URL or REMOTE_HOST/REMOTE_PROTOCOL/REMOTE_PORT
 *   OWNER_PRIVATE_KEY          signs meta-transactions (never pays gas)
 *   BROADCASTER_PRIVATE_KEY    executes meta-transactions (pays gas)
 *   RECOVERY_ADDRESS           recovery role for a new clone
 *   TOKEN_ADDRESS              default for --token
 */

import './load-env.ts';
import { createPublicClient, createWalletClient, http, defineChain, parseEventLogs } from 'viem';
import type { Address, Chain, Hex, PublicClient, WalletClient, Abi, Log } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

import officialAddresses from '../../official-deployed-addresses.json';
import engineBloxAbiJson from '../../sdk/typescript/abi/EngineBlox.abi.json' with { type: 'json' };

import { CopyBlox } from '../../sdk/typescript/contracts/factories/CopyBlox.tsx';
import { GuardController } from '../../sdk/typescript/contracts/core/GuardController.tsx';
import { RuntimeRBAC } from '../../sdk/typescript/contracts/core/RuntimeRBAC.tsx';
import { SecureOwnable } from '../../sdk/typescript/contracts/core/SecureOwnable.tsx';
import { MetaTransactionSigner } from '../../sdk/typescript/utils/metaTx/metaTransaction.tsx';
import { EngineBlox } from '../../sdk/typescript/lib/EngineBlox.tsx';
import {
  inspectAccountBlox,
  assertOwnedAccount,
} from '../../sdk/typescript/utils/account-gate.ts';
import {
  resolveOfficialNetwork,
  assertNetworkIsOfficial,
  getOfficialAddress,
  pendingOfficialContracts,
  factorySupportsClonesOf,
  type OfficialAddressesFile,
  type ResolvedOfficialNetwork,
} from '../../sdk/typescript/utils/official-addresses.ts';
import { GAS_ENVELOPE, MAX_TX_GAS } from '../../sdk/typescript/utils/gas.ts';
import { TxAction, TxStatus } from '../../sdk/typescript/types/lib.index.tsx';
import type { MetaTransaction } from '../../sdk/typescript/interfaces/lib.index.tsx';
import {
  GuardConfigActionType,
  GUARD_CONTROLLER_FUNCTION_SELECTORS as GC_SEL,
  GUARD_CONTROLLER_OPERATION_TYPES as GC_OP,
  type GuardConfigAction,
} from '../../sdk/typescript/types/core.execution.index.tsx';
import {
  RoleConfigActionType,
  RUNTIME_RBAC_FUNCTION_SELECTORS as RBAC_SEL,
  RUNTIME_RBAC_OPERATION_TYPES as RBAC_OP,
  type RoleConfigAction,
} from '../../sdk/typescript/types/core.access.index.tsx';
import {
  guardConfigBatchExecutionParams,
  encodeAddTargetToWhitelist,
  roleConfigBatchExecutionParams,
  encodeAddFunctionToRole,
  encodeRemoveFunctionFromRole,
} from '../../sdk/typescript/lib/definitions/index.ts';
import { createBitmapFromActions, getBitValue } from '../../sdk/typescript/utils/bitmap.ts';

const ENGINE_BLOX_ABI = engineBloxAbiJson as Abi;

/**
 * Version of the desired role set below.
 *
 * Bump this whenever {@link desiredRoleSet} changes. It travels into the run log so a
 * deployment can be asked "which role set is this account on?", and `--force-role-sync`
 * re-applies the set without needing to guess which grants drifted.
 */
const ROLE_SET_VERSION = 1;

const DEFAULT_TIMELOCK_SEC = 3600n;
const META_TX_TTL_SEC = 3600;
/** Explicit gas for the config batches: these payloads defeat eth_estimateGas on public nodes. */
const GUARD_BATCH_GAS = GAS_ENVELOPE.guardConfigBatch;
const ROLE_BATCH_GAS = GAS_ENVELOPE.roleConfigBatch;

// ============ CLI ============

interface Options {
  chain: string | null;
  rpc: string | null;
  account: Address | null;
  clone: boolean;
  token: Address | null;
  roleSetVersion: number;
  forceRoleSync: boolean;
  dryRun: boolean;
  offline: boolean;
}

function parseOptions(argv: string[]): Options {
  const value = (flag: string): string | null => {
    const i = argv.indexOf(flag);
    return i === -1 ? null : argv[i + 1] ?? null;
  };
  const versionArg = value('--role-set-version');

  return {
    chain: value('--chain') ?? process.env.PROVISION_CHAIN ?? null,
    rpc: value('--rpc'),
    account: (value('--account') as Address | null) ?? null,
    clone: argv.includes('--clone'),
    token: ((value('--token') ?? process.env.TOKEN_ADDRESS ?? null) as Address | null),
    roleSetVersion: versionArg ? Number(versionArg) : ROLE_SET_VERSION,
    forceRoleSync: argv.includes('--force-role-sync'),
    dryRun: argv.includes('--dry-run'),
    offline: argv.includes('--offline'),
  };
}

function rpcUrlFromEnv(): string | null {
  if (process.env.REMOTE_HOST) {
    const protocol = process.env.REMOTE_PROTOCOL || 'https';
    const port = process.env.REMOTE_PORT || '8545';
    return `${protocol}://${process.env.REMOTE_HOST}:${port}`;
  }
  return process.env.RPC_URL ?? null;
}

// ============ THE DESIRED ROLE SET ============

interface DesiredGrant {
  /** Role that holds the grant. */
  roleName: 'OWNER_ROLE' | 'BROADCASTER_ROLE';
  roleHash: Hex;
  /** Execution selector the grant is on. */
  selector: Hex;
  /** Human label for the plan output. */
  label: string;
  /** Actions granted on that selector. */
  actions: TxAction[];
  /**
   * Handler selectors this grant is allowed to be submitted through.
   *
   * For the built-in schemas (`transfer(address,uint256)` is one) the handler is the
   * account's `requestAndApproveExecution`. A schema you register yourself is different:
   * `GuardController._registerGuardedFunction` hard-codes `enforceHandlerRelations: true`
   * with a self-reference, so a grant on a self-registered selector must name the
   * selector itself or the batch reverts `HandlerForSelectorMismatch`.
   */
  handlerForSelectors: Hex[];
}

/**
 * Grants a governed ERC-20 transfer needs: the owner may sign the request-and-approve,
 * the broadcaster may execute it. Both halves are required; either alone is
 * `NoPermission`.
 */
function desiredRoleSet(): DesiredGrant[] {
  const transferSelector = EngineBlox.ERC20_TRANSFER_SELECTOR;
  const handler = [GC_SEL.REQUEST_AND_APPROVE_EXECUTION_SELECTOR];

  return [
    {
      roleName: 'OWNER_ROLE',
      roleHash: EngineBlox.OWNER_ROLE,
      selector: transferSelector,
      label: 'owner may sign a governed transfer',
      actions: [TxAction.SIGN_META_REQUEST_AND_APPROVE],
      handlerForSelectors: handler,
    },
    {
      roleName: 'BROADCASTER_ROLE',
      roleHash: EngineBlox.BROADCASTER_ROLE,
      selector: transferSelector,
      label: 'broadcaster may execute a governed transfer',
      actions: [TxAction.EXECUTE_META_REQUEST_AND_APPROVE],
      handlerForSelectors: handler,
    },
  ];
}

// ============ REPORTING ============

type PlanStatus = 'satisfied' | 'to-apply' | 'blocked' | 'skipped';

interface PlanStep {
  lock: 1 | 2 | 3;
  name: string;
  status: PlanStatus;
  detail: string;
}

const plan: PlanStep[] = [];

function record(lock: 1 | 2 | 3, name: string, status: PlanStatus, detail: string): void {
  plan.push({ lock, name, status, detail });
  const icon = { satisfied: '✅', 'to-apply': '📝', blocked: '❌', skipped: '⏭️ ' }[status];
  console.log(`${icon} lock ${lock} · ${name}: ${detail}`);
}

function printPlan(): void {
  console.log(`\n${'─'.repeat(72)}`);
  console.log('Summary');
  for (const step of plan) {
    console.log(`  [lock ${step.lock}] ${step.status.padEnd(10)} ${step.name}`);
  }
  const blocked = plan.filter((s) => s.status === 'blocked');
  const pending = plan.filter((s) => s.status === 'to-apply');
  console.log(
    `\n${plan.filter((s) => s.status === 'satisfied').length} satisfied, ${pending.length} to apply, ${blocked.length} blocked`
  );
}

function section(title: string): void {
  console.log(`\n${'='.repeat(72)}\n${title}\n${'='.repeat(72)}`);
}

// ============ CHAIN PLUMBING ============

function makeChain(chainId: number, rpcUrl: string, name: string): Chain {
  return defineChain({
    id: chainId,
    name,
    nativeCurrency: { decimals: 18, name: 'Ether', symbol: 'ETH' },
    rpcUrls: { default: { http: [rpcUrl] } },
  });
}

/** Deadline is a duration the contract adds to `block.timestamp`, not a timestamp. */
async function metaTxDuration(client: PublicClient, ttlSeconds: number): Promise<bigint> {
  const block = await client.getBlock({ blockTag: 'latest' });
  const now = BigInt(Math.floor(Date.now() / 1000));
  const drift = now > block.timestamp ? now - block.timestamp : 0n;
  return drift + BigInt(ttlSeconds);
}

// ============ LOCK 1: initialize ============

interface AccountContext {
  account: Address;
  owner: Address;
  broadcaster: Address;
  recovery: Address;
  timeLockPeriodSec: bigint;
}

async function resolveAccount(
  client: PublicClient,
  network: ResolvedOfficialNetwork,
  options: Options,
  ownerAddress: Address,
  broadcasterAddress: Address,
  recoveryAddress: Address,
  ownerWallet: WalletClient | undefined,
  broadcasterWallet: WalletClient | undefined,
  chain: Chain
): Promise<Address | null> {
  if (options.account) {
    const gated = await assertOwnedAccount(client, options.account, ownerAddress);
    record(1, 'account gate', 'satisfied', `${gated} passes the gate and is owned by ${ownerAddress}`);
    return gated;
  }

  const factoryAddress = getOfficialAddress(network, 'CopyBlox');
  const cloneWallet = broadcasterWallet ?? ownerWallet;
  const cloneFrom =
    (cloneWallet?.account?.address as Address | undefined) ?? broadcasterAddress;
  const factory = new CopyBlox(client, cloneWallet, factoryAddress, chain);

  // The factory must never read as an account; if it did, the gate below is worthless.
  const factoryInspection = await inspectAccountBlox(client, factoryAddress);
  record(
    1,
    'factory is not an account',
    factoryInspection.isAccount ? 'blocked' : 'satisfied',
    factoryInspection.isAccount
      ? `${factoryAddress} passes the account gate, which it must not`
      : `${factoryAddress} rejected as expected (${factoryInspection.rejection})`
  );

  const { clones, source } = await factory.clonesOf(ownerAddress);
  record(
    1,
    'existing accounts',
    'satisfied',
    clones.length === 0
      ? `no accounts for ${ownerAddress} (via ${source})`
      : `${clones.length} account(s) for ${ownerAddress} via ${source}: ${clones.join(', ')}`
  );

  if (clones.length > 0) {
    // Newest last: creation order. Deliberately reported in full, because adopting only
    // the latest is how earlier accounts get stranded.
    return clones[clones.length - 1]!;
  }

  if (!options.clone) {
    record(
      1,
      'clone',
      'skipped',
      `${ownerAddress} has no account. Re-run with --clone to create one (~${GAS_ENVELOPE.cloneOfAccountBlox} gas).`
    );
    return null;
  }

  const template = getOfficialAddress(network, 'AccountBlox');
  const cloneParams = {
    template,
    initialOwner: ownerAddress,
    broadcaster: broadcasterAddress,
    recovery: recoveryAddress,
    timeLockPeriodSec: DEFAULT_TIMELOCK_SEC,
  };

  if (options.dryRun) {
    record(
      1,
      'clone',
      'to-apply',
      `would clone ${template} for ${ownerAddress} with gas ${GAS_ENVELOPE.cloneSendGasLimit} (cap ${MAX_TX_GAS})`
    );
    return null;
  }

  console.log(`\n   cloning ${template} for ${ownerAddress}...`);
  const result = await factory.cloneBlox(cloneParams, {
    from: cloneFrom,
    gas: GAS_ENVELOPE.cloneSendGasLimit,
    // The clone payload defeats estimation on public nodes; simulation still proves it
    // is revert-free, which is all it can prove.
    simulationMode: 'warn-only',
  });
  const receipt = await result.wait();
  const cloned = factory.cloneAddressFromReceipt(receipt);
  if (!cloned) {
    record(1, 'clone', 'blocked', `tx ${result.hash} carried no BloxCloned log`);
    return null;
  }
  record(1, 'clone', 'to-apply', `created ${cloned} in tx ${result.hash}`);
  return cloned;
}

async function readAccountContext(
  client: PublicClient,
  account: Address,
  chain: Chain
): Promise<AccountContext> {
  const secureOwnable = new SecureOwnable(client, undefined, account, chain);
  const [owner, broadcasters, recovery, timeLockPeriodSec] = await Promise.all([
    secureOwnable.owner(),
    secureOwnable.getBroadcasters(),
    secureOwnable.getRecovery(),
    secureOwnable.getTimeLockPeriodSec(),
  ]);

  return {
    account,
    owner,
    broadcaster: broadcasters[0] as Address,
    recovery,
    timeLockPeriodSec,
  };
}

// ============ LOCK 2: guard batch ============

async function syncWhitelist(
  client: PublicClient,
  ctx: AccountContext,
  network: ResolvedOfficialNetwork,
  token: Address,
  chain: Chain,
  ownerPrivateKey: Hex | null,
  broadcasterWallet: WalletClient | undefined,
  options: Options
): Promise<void> {
  const selector = EngineBlox.ERC20_TRANSFER_SELECTOR;
  const guardDefinitions = getOfficialAddress(network, 'GuardControllerDefinitions');

  // Read back first. A repeat run must send nothing.
  const reader = new GuardController(client, broadcasterWallet, ctx.account, chain);
  let current: Address[] = [];
  try {
    current = await reader.getFunctionWhitelistTargets(selector);
  } catch {
    // The view is permissioned and reverts when the selector is not registered; an empty
    // list is the right assumption either way.
    current = [];
  }

  if (current.some((t) => t.toLowerCase() === token.toLowerCase())) {
    record(2, 'whitelist', 'satisfied', `${token} already whitelisted for ${selector}`);
    return;
  }

  const actions: GuardConfigAction[] = [
    {
      actionType: GuardConfigActionType.ADD_TARGET_TO_WHITELIST,
      data: encodeAddTargetToWhitelist(client, guardDefinitions, selector, token),
    },
  ];

  if (options.dryRun || !ownerPrivateKey || !broadcasterWallet) {
    record(
      2,
      'whitelist',
      'to-apply',
      `would add ${token} to the whitelist for ${selector} (1 guard action, gas ${GUARD_BATCH_GAS})`
    );
    return;
  }

  const executionParams = guardConfigBatchExecutionParams(client, guardDefinitions, actions);
  const signed = await signBatch(client, ctx, chain, ownerPrivateKey, {
    handlerSelector: GC_SEL.GUARD_CONFIG_BATCH_META_SELECTOR,
    operationType: GC_OP.CONTROLLER_CONFIG_BATCH,
    executionSelector: GC_SEL.GUARD_CONFIG_BATCH_EXECUTE_SELECTOR,
    executionParams,
    gasLimit: GUARD_BATCH_GAS,
  });

  const guardController = new GuardController(client, broadcasterWallet, ctx.account, chain);
  const result = await guardController.guardConfigBatchRequestAndApprove(signed, {
    from: ctx.broadcaster,
    gas: GUARD_BATCH_GAS,
    simulationMode: 'warn-only',
  });
  const receipt = await result.wait();
  await assertInnerSuccess(client, ctx, chain, receipt, 'guard config batch');
  record(2, 'whitelist', 'to-apply', `added ${token} for ${selector} in tx ${result.hash}`);
}

// ============ LOCK 3: role batch ============

interface OnChainGrant {
  functionSelector: string;
  grantedActionsBitmap: number | bigint;
  handlerForSelectors?: readonly string[];
}

function sameSelectorList(a: readonly string[] = [], b: readonly string[] = []): boolean {
  if (a.length !== b.length) return false;
  const left = [...a].map((s) => s.toLowerCase()).sort();
  const right = [...b].map((s) => s.toLowerCase()).sort();
  return left.every((value, index) => value === right[index]);
}

async function syncRolePermissions(
  client: PublicClient,
  ctx: AccountContext,
  network: ResolvedOfficialNetwork,
  chain: Chain,
  ownerPrivateKey: Hex | null,
  broadcasterWallet: WalletClient | undefined,
  options: Options
): Promise<void> {
  if (options.roleSetVersion !== ROLE_SET_VERSION) {
    record(
      3,
      'role set',
      'blocked',
      `unsupported role set version ${options.roleSetVersion}; this script supports version ${ROLE_SET_VERSION}`
    );
    return;
  }

  const rbacDefinitions = getOfficialAddress(network, 'RuntimeRBACDefinitions');
  const grants = desiredRoleSet();

  // Registry views are permissioned: a reader built with no wallet client sends from
  // 0x0 and is refused NoPermission(0x0). Read as the broadcaster.
  const reader = new RuntimeRBAC(client, broadcasterWallet, ctx.account, chain);

  const actions: RoleConfigAction[] = [];
  const applied: string[] = [];

  for (const grant of grants) {
    const desiredBitmap = getBitValue(createBitmapFromActions(grant.actions));

    let onChain: OnChainGrant[] = [];
    try {
      onChain = (await reader.getActiveRolePermissions(grant.roleHash)) as OnChainGrant[];
    } catch (error) {
      record(
        3,
        `${grant.roleName} grants`,
        'blocked',
        `getActiveRolePermissions(${grant.roleName}) failed: ${(error as Error).message}. ` +
          'Permissioned view: build the reader with a wallet client (V10).'
      );
      return;
    }

    const existing = onChain.find(
      (row) => row.functionSelector?.toLowerCase() === grant.selector.toLowerCase()
    );

    const bitmapMatches = existing ? Number(existing.grantedActionsBitmap) === desiredBitmap : false;
    const handlerMatches = existing
      ? sameSelectorList(existing.handlerForSelectors, grant.handlerForSelectors)
      : false;

    if (existing && bitmapMatches && handlerMatches && !options.forceRoleSync) {
      record(
        3,
        `${grant.roleName} on ${grant.selector}`,
        'satisfied',
        `${grant.label} (bitmap ${desiredBitmap}) already granted`
      );
      continue;
    }

    if (existing) {
      // A second addFunctionToRole for the same (role, selector) reverts
      // ResourceAlreadyExists, so a change is REMOVE then ADD, both in this batch.
      actions.push({
        actionType: RoleConfigActionType.REMOVE_FUNCTION_FROM_ROLE,
        data: encodeRemoveFunctionFromRole(client, rbacDefinitions, grant.roleHash, grant.selector),
      });
      applied.push(
        `REMOVE ${grant.roleName} ${grant.selector} (was bitmap ${Number(existing.grantedActionsBitmap)})`
      );
    }

    actions.push({
      actionType: RoleConfigActionType.ADD_FUNCTION_TO_ROLE,
      data: encodeAddFunctionToRole(client, rbacDefinitions, grant.roleHash, {
        functionSelector: grant.selector,
        grantedActionsBitmap: desiredBitmap,
        handlerForSelectors: grant.handlerForSelectors,
      }),
    });
    applied.push(`ADD ${grant.roleName} ${grant.selector} bitmap ${desiredBitmap} (${grant.label})`);
  }

  if (actions.length === 0) {
    record(
      3,
      'role set',
      'satisfied',
      `already at role set version ${options.roleSetVersion}; nothing to send`
    );
    return;
  }

  for (const line of applied) console.log(`     ${line}`);

  if (options.dryRun || !ownerPrivateKey || !broadcasterWallet) {
    record(
      3,
      'role set',
      'to-apply',
      `would send ${actions.length} role action(s) for version ${options.roleSetVersion} (gas ${ROLE_BATCH_GAS})`
    );
    return;
  }

  const executionParams = roleConfigBatchExecutionParams(client, rbacDefinitions, actions);
  const signed = await signBatch(client, ctx, chain, ownerPrivateKey, {
    handlerSelector: RBAC_SEL.ROLE_CONFIG_BATCH_META_SELECTOR,
    operationType: RBAC_OP.ROLE_CONFIG_BATCH,
    executionSelector: RBAC_SEL.ROLE_CONFIG_BATCH_EXECUTE_SELECTOR,
    executionParams,
    gasLimit: ROLE_BATCH_GAS,
  });

  const rbac = new RuntimeRBAC(client, broadcasterWallet, ctx.account, chain);
  const result = await rbac.roleConfigBatchRequestAndApprove(signed, {
    from: ctx.broadcaster,
    gas: ROLE_BATCH_GAS,
    simulationMode: 'warn-only',
  });
  const receipt = await result.wait();
  await assertInnerSuccess(client, ctx, chain, receipt, 'role config batch');
  record(
    3,
    'role set',
    'to-apply',
    `applied ${actions.length} role action(s) for version ${options.roleSetVersion} in tx ${result.hash}`
  );
}

// ============ SIGNING AND INNER STATUS ============

interface BatchToSign {
  handlerSelector: Hex;
  operationType: Hex;
  executionSelector: Hex;
  executionParams: Hex;
  gasLimit: bigint;
}

async function signBatch(
  client: PublicClient,
  ctx: AccountContext,
  chain: Chain,
  ownerPrivateKey: Hex,
  batch: BatchToSign
): Promise<MetaTransaction> {
  const signer = new MetaTransactionSigner(client, undefined, ctx.account, chain);
  const base = new GuardController(client, undefined, ctx.account, chain);

  const metaTxParams = await base.createMetaTxParams(
    ctx.account,
    batch.handlerSelector,
    TxAction.SIGN_META_REQUEST_AND_APPROVE,
    // A duration, not a timestamp, and corrected for block-time drift on chains that
    // mine on demand: the view reads the latest block, so an idle chain hands out a
    // deadline that is already in the past.
    await metaTxDuration(client, META_TX_TTL_SEC),
    0n,
    ctx.owner
  );

  const unsigned = await signer.createUnsignedMetaTransactionForNew(
    {
      requester: ctx.owner,
      target: ctx.account,
      value: 0n,
      gasLimit: batch.gasLimit,
      operationType: batch.operationType,
      executionSelector: batch.executionSelector,
      executionParams: batch.executionParams,
    },
    metaTxParams
  );

  return signer.signMetaTransaction(unsigned, ctx.owner, ownerPrivateKey);
}

/**
 * A mined receipt is not a result.
 *
 * A config batch can mine `success`, burn its gas and grant nothing. Decode the indexed
 * txId from `TransactionEvent` / `TxExecutionResult` on this receipt, then read that
 * record — never assume history slot 1 is the batch just sent.
 */
function txIdFromBatchReceipt(logs: readonly Log[], account: Address): bigint | null {
  const accountLower = account.toLowerCase();
  const fromAccount = (log: { address?: string }) =>
    typeof log.address === 'string' && log.address.toLowerCase() === accountLower;

  try {
    const txEvents = parseEventLogs({
      abi: ENGINE_BLOX_ABI,
      logs: logs as Log[],
      eventName: 'TransactionEvent',
    }).filter(fromAccount);
    if (txEvents.length > 0) {
      const last = txEvents[txEvents.length - 1];
      const txId = (last.args as { txId?: bigint }).txId;
      if (typeof txId === 'bigint') return txId;
    }
  } catch {
    // Fall through to TxExecutionResult.
  }

  try {
    const execEvents = parseEventLogs({
      abi: ENGINE_BLOX_ABI,
      logs: logs as Log[],
      eventName: 'TxExecutionResult',
    }).filter(fromAccount);
    if (execEvents.length > 0) {
      const last = execEvents[execEvents.length - 1];
      const txId = (last.args as { txId?: bigint }).txId;
      if (typeof txId === 'bigint') return txId;
    }
  } catch {
    // No usable event.
  }

  return null;
}

async function assertInnerSuccess(
  client: PublicClient,
  ctx: AccountContext,
  chain: Chain,
  receipt: { status: unknown; gasUsed?: bigint; logs?: readonly Log[] },
  label: string
): Promise<void> {
  const outerOk =
    receipt.status === 'success' || receipt.status === 1 || String(receipt.status) === '1';
  if (!outerOk) {
    throw new Error(`${label}: transaction reverted (status ${String(receipt.status)})`);
  }

  const logs = receipt.logs ?? [];
  const txId = txIdFromBatchReceipt(logs, ctx.account);
  if (txId == null) {
    console.warn(
      `   ⚠️  ${label}: no TransactionEvent/TxExecutionResult txId on receipt; inner status unverified`
    );
    return;
  }

  const base = new GuardController(client, undefined, ctx.account, chain);
  const record = await base.getTransaction(txId);

  // TxStatus.COMPLETED (5) is the only outcome that means the batch took effect.
  // FAILED and other statuses must not be reported as applied.
  const status = Number((record as { status?: number | bigint }).status ?? -1);
  if (status !== TxStatus.COMPLETED) {
    throw new Error(
      `${label}: outer receipt succeeded (gas ${receipt.gasUsed ?? 'unknown'}) but record ` +
        `${String(txId)} has inner status ${status}, not COMPLETED. ` +
        'Nothing was configured.'
    );
  }
}

// ============ MAIN ============

async function main(): Promise<void> {
  const options = parseOptions(process.argv.slice(2));
  const file = officialAddresses as OfficialAddressesFile;

  section('SPEC-2026-0118 reference provisioner — three locks, idempotent');
  console.log(`role set version: ${options.roleSetVersion} (script default ${ROLE_SET_VERSION})`);
  console.log(
    `mode: ${options.offline ? 'offline (no RPC)' : options.dryRun ? 'dry run (reads only)' : 'apply'}`
  );

  // ---- configuration: the official address file ----
  section('Official addresses');
  const chainLookup =
    options.chain !== null
      ? /^\d+$/.test(options.chain)
        ? Number(options.chain)
        : options.chain
      : Number(process.env.CHAIN_ID ?? process.env.REMOTE_NETWORK_ID ?? 11155111);

  const network = resolveOfficialNetwork(file, chainLookup);
  assertNetworkIsOfficial(network);
  const pending = pendingOfficialContracts(network);
  console.log(`network: ${network.network} (chain ${network.chainId}, ${network.status})`);
  console.log(`factory: ${network.contracts.CopyBlox?.address}`);
  console.log(`template: ${network.contracts.AccountBlox?.address}`);
  console.log(
    `owner index on factory: ${factorySupportsClonesOf(network) ? 'yes (clonesOf)' : 'no (BloxCloned log scan)'}`
  );
  if (pending.length > 0) {
    console.log(`⚠️  pending declaration on this network: ${pending.join(', ')}`);
  }

  section('Gas envelope');
  console.log(`clone, observed:        ${GAS_ENVELOPE.cloneOfAccountBlox}`);
  console.log(`clone, sent with limit: ${GAS_ENVELOPE.cloneSendGasLimit}`);
  console.log(`floor (fail below):     ${GAS_ENVELOPE.cloneGasFloor}`);
  console.log(`EIP-7825 per-tx cap:    ${MAX_TX_GAS}`);
  console.log(
    `head-room:              ${MAX_TX_GAS - GAS_ENVELOPE.cloneOfAccountBlox} gas. Send the limit, not an estimate.`
  );

  if (options.offline) {
    section('Plan (offline)');
    console.log('lock 1  initialize      clone + initialize in one transaction via the factory');
    console.log('lock 2  guard batch     whitelist the token for transfer(address,uint256)');
    console.log('lock 3  role batch      owner may sign, broadcaster may execute, on that selector');
    console.log('\nWhitelist is not permission: locks 2 and 3 are both required.');
    console.log('Re-run without --offline (add --dry-run) to check the locks against a chain.');
    return;
  }

  // ---- keys and clients ----
  const rpcUrl = options.rpc ?? rpcUrlFromEnv();
  if (!rpcUrl) {
    throw new Error(
      'No RPC URL. Pass --rpc <url>, or set RPC_URL (or REMOTE_HOST/REMOTE_PROTOCOL/REMOTE_PORT) in .env. ' +
        'Use --offline to validate configuration without a chain.'
    );
  }

  const chain = makeChain(network.chainId, rpcUrl, network.network);
  const client = createPublicClient({ chain, transport: http(rpcUrl) }) as PublicClient;

  const ownerKey = (process.env.OWNER_PRIVATE_KEY ?? '').trim();
  const broadcasterKey = (process.env.BROADCASTER_PRIVATE_KEY ?? '').trim();
  const normalize = (key: string): Hex | null =>
    key ? ((key.startsWith('0x') ? key : `0x${key}`) as Hex) : null;

  const ownerPrivateKey = normalize(ownerKey);
  const broadcasterPrivateKey = normalize(broadcasterKey);

  if (!ownerPrivateKey) {
    throw new Error(
      'OWNER_PRIVATE_KEY is not set. Set it in .env to apply or dry-run against a chain ' +
        '(owner address and owned-account checks come from the key). Use --offline to validate ' +
        'configuration without keys or RPC.'
    );
  }

  const ownerAccount = ownerPrivateKey ? privateKeyToAccount(ownerPrivateKey) : null;
  const broadcasterAccount = broadcasterPrivateKey
    ? privateKeyToAccount(broadcasterPrivateKey)
    : null;

  const ownerWallet = ownerAccount
    ? (createWalletClient({ account: ownerAccount, chain, transport: http(rpcUrl) }) as WalletClient)
    : undefined;
  const broadcasterWallet = broadcasterAccount
    ? (createWalletClient({
        account: broadcasterAccount,
        chain,
        transport: http(rpcUrl),
      }) as WalletClient)
    : undefined;

  const ownerAddress = (ownerAccount?.address ?? null) as Address | null;
  if (!ownerAddress) {
    throw new Error('Cannot determine the owner address without OWNER_PRIVATE_KEY.');
  }
  const broadcasterAddress = (broadcasterAccount?.address ?? ownerAddress) as Address;
  const recoveryAddress = ((process.env.RECOVERY_ADDRESS ?? ownerAddress).trim() ||
    ownerAddress) as Address;

  section('Lock 1 — initialize');
  const resolved = await resolveAccount(
    client,
    network,
    options,
    ownerAddress,
    broadcasterAddress,
    recoveryAddress,
    ownerWallet,
    broadcasterWallet,
    chain
  );

  if (!resolved) {
    printPlan();
    console.log('\nNo account to configure yet. Locks 2 and 3 were not evaluated.');
    return;
  }

  const gate = await inspectAccountBlox(client, resolved);
  if (!gate.isAccount) {
    record(1, 'account gate', 'blocked', `${resolved} is not an account: ${gate.reason}`);
    printPlan();
    process.exitCode = 1;
    return;
  }

  const ctx = await readAccountContext(client, resolved, chain);
  record(
    1,
    'initialize',
    'satisfied',
    `${ctx.account} owner ${ctx.owner}, broadcaster ${ctx.broadcaster}, recovery ${ctx.recovery}, timelock ${ctx.timeLockPeriodSec}s`
  );

  // Balances, read before sending: a broadcaster with no gas produces a confusing revert.
  const broadcasterBalance = await client.getBalance({ address: ctx.broadcaster });
  record(
    1,
    'broadcaster balance',
    broadcasterBalance > 0n ? 'satisfied' : 'blocked',
    `${ctx.broadcaster} holds ${broadcasterBalance} wei`
  );

  section('Lock 2 — guard batch (schemas and whitelists)');
  if (!options.token) {
    record(
      2,
      'whitelist',
      'skipped',
      'no --token given, so there is no transfer target to whitelist. Pass --token 0x... (or set TOKEN_ADDRESS).'
    );
  } else {
    await syncWhitelist(
      client,
      ctx,
      network,
      options.token,
      chain,
      ownerPrivateKey,
      broadcasterWallet,
      options
    );
  }

  section('Lock 3 — role batch (grants on the execution selector and the handler)');
  await syncRolePermissions(
    client,
    ctx,
    network,
    chain,
    ownerPrivateKey,
    broadcasterWallet,
    options
  );

  printPlan();

  const blocked = plan.some((s) => s.status === 'blocked');
  if (blocked) {
    process.exitCode = 1;
    console.log('\nAt least one lock is blocked; the first governed transfer would fail.');
  } else if (plan.some((s) => s.status === 'to-apply')) {
    console.log(
      options.dryRun
        ? '\nDry run: nothing was sent. Re-run without --dry-run to apply.'
        : '\nApplied. Re-running now should report every lock as satisfied.'
    );
  } else {
    console.log('\nAll three locks are satisfied. A governed transfer can be requested.');
  }
}

main().catch((error) => {
  console.error(`\n❌ ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
