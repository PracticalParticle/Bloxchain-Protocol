/**
 * ERC20 Mint via GuardController SDK Sanity Tests
 *
 * Uses the 3-step mint flow (no requestAndApproveExecution):
 *   1. MINT_REQUESTOR (wallet3) calls executeWithTimeLock to request mint
 *   2. MINT_APPROVER (wallet4) signs meta approve for the pending tx
 *   3. BROADCASTER (wallet2) calls approveTimeLockExecutionWithMetaTx to execute mint
 * Verifies AccountBlox BASIC balance increased by 100e18.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Address, Hex } from 'viem';
import { keccak256, encodeAbiParameters, parseAbiParameters, decodeErrorResult, stringToHex, bytesToHex } from 'viem';

import { BaseGuardControllerTest } from './base-test.ts';
import { TxAction } from '../../../sdk/typescript/types/lib.index.tsx';
import { RoleConfigActionType } from '../runtime-rbac/base-test.ts';
import { extractErrorInfo } from '../../../sdk/typescript/utils/contract-errors.ts';

const ERC20_MINT_SELECTOR = '0x40c10f19' as Hex; // mint(address,uint256)
const ERC20_MINT_SIGNATURE = 'mint(address,uint256)';
/** Must match CJS erc20-mint-controller-tests.cjs ERC20_MINT_OPERATION_TYPE and FULL_WORKFLOW_ACTIONS [0..8] */
const ERC20_MINT_OPERATION_TYPE = 'ERC20_MINT';

interface DeployedAddressesFile {
  [network: string]: {
    BasicERC20?: {
      address: string;
    };
  };
}

// ESM-compatible __dirname
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export class Erc20MintControllerSdkTests extends BaseGuardControllerTest {
  private basicErc20Address: Address | null = null;
  private balanceBefore: bigint | null = null;
  /** Total supply of BasicERC20 before mint (for step 3 verification). */
  private totalSupplyBefore: bigint | null = null;
  /** Whether the mint 3-step flow was skipped due to environment limitations (e.g. RPC rejecting payload). */
  private mintFlowSkipped = false;

  /** ERC20 ABI fragment for balanceOf and totalSupply (shared for reads). */
  private static readonly ERC20_READ_ABI = [
    {
      name: 'balanceOf',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ name: 'account', type: 'address' }],
      outputs: [{ type: 'uint256' }],
    },
    {
      name: 'totalSupply',
      type: 'function',
      stateMutability: 'view',
      inputs: [],
      outputs: [{ type: 'uint256' }],
    },
  ] as const;

  constructor() {
    super('ERC20 Mint via GuardController SDK Tests');
  }

  async executeTests(): Promise<void> {
    console.log('\n🔄 ERC20 MINT VIA CONTROLLER WORKFLOW (SDK)');
    console.log('==================================================');
    console.log('   1. Ensure mint(address,uint256) schema exists');
    console.log('   2. Ensure BasicERC20 is whitelisted for mint selector');
    console.log('   3. Ensure mint roles and permissions (MINT_REQUESTOR, MINT_APPROVER, BROADCASTER)');
    console.log('   4. Mint 100 BASIC via 3-step flow (request → sign approve → execute approve)');
    console.log('   5. Verify tokens minted and passed to destination (totalSupply + balance increase)');
    console.log('   6. Snapshot mint readiness state (schema, whitelist, roles, balances)\n');

    await this.step0RegisterMintSchemaIfNeeded();
    await this.step1WhitelistBasicErc20IfNeeded();
    await this.step1bEnsureMintRolesAndPermissions();
    await this.step2Mint100ToAccountBloxViaMetaTx();
    await this.step3VerifyBalanceIncrease();
    await this.step4SnapshotMintReadinessState();
  }

  private getBasicErc20Address(): Address {
    if (this.basicErc20Address) return this.basicErc20Address;

    const envAddr = process.env.BASICERC20_ADDRESS;
    if (envAddr) {
      this.basicErc20Address = envAddr as Address;
      return this.basicErc20Address;
    }

    const addressesPath = path.join(__dirname, '../../../deployed-addresses.json');
    if (!fs.existsSync(addressesPath)) {
      throw new Error(
        'BasicERC20 address not set (BASICERC20_ADDRESS) and deployed-addresses.json not found'
      );
    }
    const raw = fs.readFileSync(addressesPath, 'utf8');
    const json = JSON.parse(raw) as DeployedAddressesFile;
    const network = process.env.NETWORK_NAME || 'development';
    const info = json[network]?.BasicERC20;
    if (!info?.address) {
      throw new Error(`BasicERC20 not in deployed-addresses.json for network "${network}"`);
    }
    this.basicErc20Address = info.address as Address;
    return this.basicErc20Address;
  }

  private async readAccountBloxBasicBalance(): Promise<bigint> {
    if (!this.publicClient || !this.contractAddress) {
      throw new Error('Public client or contract address not initialized');
    }
    const token = this.getBasicErc20Address();
    const accountBlox = this.contractAddress;

    const balance = await this.publicClient.readContract({
      address: token,
      abi: Erc20MintControllerSdkTests.ERC20_READ_ABI,
      functionName: 'balanceOf',
      args: [accountBlox],
    });

    return balance as bigint;
  }

  /** Read totalSupply of BasicERC20 (for verifying mint occurred). */
  private async readTotalSupply(): Promise<bigint> {
    if (!this.publicClient) {
      throw new Error('Public client not initialized');
    }
    const token = this.getBasicErc20Address();
    const supply = await this.publicClient.readContract({
      address: token,
      abi: Erc20MintControllerSdkTests.ERC20_READ_ABI,
      functionName: 'totalSupply',
      args: [],
    });
    return supply as bigint;
  }

  /**
   * Step 0: Register mint(address,uint256) schema via GuardController if not already present.
   * This step is the single source of mint schema registration for this suite (self-contained).
   * Must match CJS testStep2RegisterMintFunction: same operationName ('ERC20_MINT'), same full workflow bitmap (TxAction 0..8).
   * RuntimeRBAC tests (and any reader of getFunctionSchema(mint)) see this schema on the same contract (AccountBlox).
   */
  private async step0RegisterMintSchemaIfNeeded(): Promise<void> {
    console.log('\n🧪 SDK Step 0: Ensure ERC20 mint schema exists');
    try {
      if (!this.guardController) throw new Error('GuardController not initialized');

      // CJS-style pre-check: getFunctionSchema + getSupportedFunctions (scripts/sanity/guard-controller)
      if (await this.schemaOrSupportedSetPreCheck(ERC20_MINT_SELECTOR)) {
        console.log('  ℹ️  mint(address,uint256) schema already registered (getFunctionSchema or getSupportedFunctions); skipping');
        this.assertTest(true, 'Mint schema already registered');
        return;
      }

      // Full workflow actions: same as CJS FULL_WORKFLOW_ACTIONS = [0,1,2,3,4,5,6,7,8] (TxAction enum)
      const fullWorkflowActions = [
        TxAction.EXECUTE_TIME_DELAY_REQUEST,
        TxAction.EXECUTE_TIME_DELAY_APPROVE,
        TxAction.EXECUTE_TIME_DELAY_CANCEL,
        TxAction.SIGN_META_REQUEST_AND_APPROVE,
        TxAction.SIGN_META_APPROVE,
        TxAction.SIGN_META_CANCEL,
        TxAction.EXECUTE_META_REQUEST_AND_APPROVE,
        TxAction.EXECUTE_META_APPROVE,
        TxAction.EXECUTE_META_CANCEL,
      ];

      const ownerWallet = this.getRoleWallet('owner');
      const ownerWalletName =
        Object.keys(this.wallets).find(
          (k) => this.wallets[k].address.toLowerCase() === ownerWallet.address.toLowerCase()
        ) || 'wallet1';

      console.log('  📝 Creating signed meta-transaction for mint schema registration...');
      const signedMetaTx = await this.createSignedMetaTxForFunctionRegistration(
        ERC20_MINT_SIGNATURE,
        ERC20_MINT_OPERATION_TYPE,
        fullWorkflowActions,
        ownerWalletName
      );

      const broadcasterWallet = this.getRoleWallet('broadcaster');
      const broadcasterGuardController = this.createGuardControllerWithWallet(
        Object.keys(this.wallets).find(
          (k) => this.wallets[k].address.toLowerCase() === broadcasterWallet.address.toLowerCase()
        ) || 'wallet2'
      );

      const result = await broadcasterGuardController.guardConfigBatchRequestAndApprove(
        signedMetaTx,
        // Explicit gas so viem does not call eth_estimateGas for this large
        // guardConfigBatchRequestAndApprove payload (can hang/timeout on some RPCs).
        this.getTxOptions(broadcasterWallet.address, { gas: 1_500_000 })
      );
      const receipt = await result.wait();

      console.log('  ✅ Mint schema registration tx sent');
      console.log(`     Tx hash: ${result.hash}`);
      const status0 = receipt.status as any;
      const isSuccess0 = status0 === 'success' || status0 === 1 || String(status0) === '1';
      console.log(`     Status: ${isSuccess0 ? 'SUCCESS' : 'FAILED'}`);

      try {
        await this.assertGuardConfigBatchSucceeded(receipt, 'Register ERC20 mint schema');
      } catch (e: any) {
        if (e?.message?.includes('TxStatus 6')) {
          if (e?.message?.includes('ResourceAlreadyExists')) {
            console.log('  ⚠️  ResourceAlreadyExists — mint schema already registered; step passed');
            this.assertTest(true, 'Mint schema already registered (ResourceAlreadyExists)');
            return;
          }
          const verified = await this.schemaOrSupportedSetPreCheck(ERC20_MINT_SELECTOR);
          if (verified) {
            console.log('  ℹ️  Register returned TxStatus 6; verified mint schema already exists via getFunctionSchema/getSupportedFunctions — step passed');
            return;
          }
        }
        throw e;
      }

      const maxRetries = 10;
      const retryDelayMs = 3000;
      let existsNow = false;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        try {
          existsNow = await this.schemaOrSupportedSetPreCheck(ERC20_MINT_SELECTOR);
          if (existsNow) {
            console.log('  ✅ Mint schema is visible via getFunctionSchema/getSupportedFunctions after registration');
            break;
          }
        } catch (checkError: any) {
          console.warn(`  ⏳ schema check attempt ${attempt}/${maxRetries}: ${checkError?.message || checkError}`);
        }
      }
      this.assertTest(existsNow, 'Mint schema must be visible via getFunctionSchema/getSupportedFunctions after registration');
      if (existsNow) {
        console.log('  📋 Mint schema is now registered on contract; getFunctionSchema(0x40c10f19) will succeed for runtime-rbac and other readers.');
      }
    } catch (error: any) {
      this.handleTestError('Ensure ERC20 mint schema', error);
      throw error;
    }
  }

  private async step1WhitelistBasicErc20IfNeeded(): Promise<void> {
    console.log('\n🧪 SDK Step 1: Ensure BasicERC20 is whitelisted for mint selector');
    try {
      const token = this.getBasicErc20Address();
      if (!this.guardController) throw new Error('GuardController not initialized');

      const ownerWallet = this.getRoleWallet('owner');
      const ownerWalletName =
        Object.keys(this.wallets).find(
          (k) => this.wallets[k].address.toLowerCase() === ownerWallet.address.toLowerCase()
        ) || 'wallet1';
      const broadcasterWallet = this.getRoleWallet('broadcaster');
      const broadcasterGuardController = this.createGuardControllerWithWallet(
        Object.keys(this.wallets).find(
          (k) => this.wallets[k].address.toLowerCase() === broadcasterWallet.address.toLowerCase()
        ) || 'wallet2'
      );

      // Check if already whitelisted (contract may revert if selector not yet registered)
      let targets: Address[] = [];
      try {
        targets = await this.getFunctionWhitelistTargetsAsOwner(ERC20_MINT_SELECTOR, 2, 500);
      } catch (_) {
        console.log('  ℹ️  getFunctionWhitelistTargets reverted (selector may be unregistered); treating as empty');
      }
      const already = targets.some((t) => t.toLowerCase() === token.toLowerCase());
      if (already) {
        console.log('  ℹ️  BasicERC20 already whitelisted for mint; skipping add');
        this.assertTest(true, 'BasicERC20 already whitelisted for mint selector');
        return;
      }

      console.log('  📝 Creating signed meta-transaction to add BasicERC20 to whitelist...');
      const signedMetaTx = await this.createSignedMetaTxForWhitelistUpdate(
        ERC20_MINT_SELECTOR,
        token,
        true,
        ownerWalletName
      );

      const result = await broadcasterGuardController.guardConfigBatchRequestAndApprove(
        signedMetaTx,
        // Explicit gas to avoid internal eth_estimateGas for this whitelist batch.
        this.getTxOptions(broadcasterWallet.address, { gas: 1_500_000 })
      );
      const receipt = await result.wait();

      console.log('  ✅ Whitelist update tx sent');
      console.log(`     Tx hash: ${result.hash}`);
      const status1 = receipt.status as any;
      const isSuccess1 = status1 === 'success' || status1 === 1 || String(status1) === '1';
      console.log(`     Status: ${isSuccess1 ? 'SUCCESS' : 'FAILED'}`);

      try {
        await this.assertGuardConfigBatchSucceeded(receipt, 'Add BasicERC20 to mint whitelist');
      } catch (e: any) {
        if (!e?.message?.includes('TxStatus 6')) throw e;
        const isItemAlreadyExists = /ItemAlreadyExists/i.test(e?.message ?? '');
        let isInList = false;
        try {
          const targetsCheck = await this.getFunctionWhitelistTargetsAsOwner(ERC20_MINT_SELECTOR, 3, 1000);
          isInList = targetsCheck.some((t) => t.toLowerCase() === token.toLowerCase());
        } catch (verifyErr: any) {
          if (isItemAlreadyExists) {
            console.log('  ℹ️  Add returned TxStatus 6 (ItemAlreadyExists); verification failed but revert implies already whitelisted — step passed');
            this.assertTest(true, 'BasicERC20 is whitelisted for mint selector (verified after TxStatus 6)');
            return;
          }
          throw new Error(
            `Add BasicERC20 returned TxStatus 6 and getFunctionWhitelistTargets failed; cannot verify. ${e.message}`
          );
        }
        if (!isInList) {
          throw new Error(
            `Add BasicERC20 returned TxStatus 6 and token is not in whitelist (verified). Step must succeed or data must already be in place. ${e.message}`
          );
        }
        console.log('  ℹ️  Add returned TxStatus 6; verified BasicERC20 is already in whitelist — step passed');
        await new Promise((resolve) => setTimeout(resolve, 2500));
        this.assertTest(true, 'BasicERC20 is whitelisted for mint selector (verified after TxStatus 6)');
        return;
      }

      const targetsAfter = await this.getFunctionWhitelistTargetsAsOwner(ERC20_MINT_SELECTOR);
      console.log(`  📋 Whitelist targets after SDK update (${targetsAfter.length}):`);
      targetsAfter.forEach((t, i) => {
        console.log(`     ${i + 1}. ${t}`);
      });

      const nowWhitelisted = targetsAfter.some((t) => t.toLowerCase() === token.toLowerCase());
      if (nowWhitelisted) {
        this.assertTest(
          true,
          `BasicERC20 ${token} is whitelisted for mint selector after SDK step`
        );
      }
      // Allow chain state to settle before mint step (whitelist visibility).
      await new Promise((resolve) => setTimeout(resolve, 2500));
      this.assertTest(nowWhitelisted, `BasicERC20 ${token} must be whitelisted for mint selector after update`);
    } catch (error: any) {
      this.handleTestError('Ensure BasicERC20 whitelisted for mint', error);
      throw error;
    }
  }

  /**
   * Ensure MINT_REQUESTOR, MINT_APPROVER roles exist and have correct function permissions for the
   * 3-step mint flow: (1) MINT_REQUESTOR requests via executeWithTimeLock, (2) MINT_APPROVER signs
   * meta approve, (3) BROADCASTER executes approveTimeLockExecutionWithMetaTx.
   * Does NOT use requestAndApproveExecution.
   */
  private async step1bEnsureMintRolesAndPermissions(): Promise<void> {
    console.log('\n🧪 SDK Step 1b: Ensure mint roles and permissions (3-step flow)');
    try {
      const ownerWalletName =
        Object.keys(this.wallets).find(
          (k) => this.wallets[k].address.toLowerCase() === this.getRoleWallet('owner').address.toLowerCase()
        ) || 'wallet1';
      const broadcasterWalletName =
        Object.keys(this.wallets).find(
          (k) => this.wallets[k].address.toLowerCase() === this.getRoleWallet('broadcaster').address.toLowerCase()
        ) || 'wallet2';
      const requestorHash = this.getRoleHash('MINT_REQUESTOR');
      const approverHash = this.getRoleHash('MINT_APPROVER');
      const broadcasterHash = this.getRoleHash('BROADCASTER_ROLE');

      const requestorExists = await this.roleExists(requestorHash);
      const approverExists = await this.roleExists(approverHash);
      if (!requestorExists || !approverExists) {
        const actions: import('../runtime-rbac/base-test.ts').RoleConfigAction[] = [];
        if (!requestorExists) {
          actions.push(
            await this.encodeRoleConfigAction(RoleConfigActionType.CREATE_ROLE, { roleName: 'MINT_REQUESTOR', maxWallets: 10 }),
            await this.encodeRoleConfigAction(RoleConfigActionType.ADD_WALLET, {
              roleHash: requestorHash,
              wallet: this.wallets.wallet3!.address,
            })
          );
        }
        if (!approverExists) {
          actions.push(
            await this.encodeRoleConfigAction(RoleConfigActionType.CREATE_ROLE, { roleName: 'MINT_APPROVER', maxWallets: 10 }),
            await this.encodeRoleConfigAction(RoleConfigActionType.ADD_WALLET, {
              roleHash: approverHash,
              wallet: this.wallets.wallet4!.address,
            })
          );
        }
        if (actions.length > 0) {
          await this.executeRoleConfigBatch(actions, ownerWalletName, broadcasterWalletName);
          await new Promise((r) => setTimeout(r, 1500));
        }
      }

      // When roles already exist (e.g. from previous suite or CJS run), ensure mint wallets are in them.
      if (requestorExists || approverExists) {
        const ensureWalletActions: import('../runtime-rbac/base-test.ts').RoleConfigAction[] = [];
        if (requestorExists && this.wallets.wallet3) {
          const inRequestor = await this.guardController!.hasRole(requestorHash, this.wallets.wallet3.address as Address);
          if (!inRequestor) {
            ensureWalletActions.push(
              await this.encodeRoleConfigAction(RoleConfigActionType.ADD_WALLET, {
                roleHash: requestorHash,
                wallet: this.wallets.wallet3.address,
              })
            );
          }
        }
        if (approverExists && this.wallets.wallet4) {
          const inApprover = await this.guardController!.hasRole(approverHash, this.wallets.wallet4.address as Address);
          if (!inApprover) {
            ensureWalletActions.push(
              await this.encodeRoleConfigAction(RoleConfigActionType.ADD_WALLET, {
                roleHash: approverHash,
                wallet: this.wallets.wallet4.address,
              })
            );
          }
        }
        if (ensureWalletActions.length > 0) {
          console.log('  📋 Ensuring mint requestor/approver wallets are in roles...');
          try {
            await this.executeRoleConfigBatch(ensureWalletActions, ownerWalletName, broadcasterWalletName);
            await new Promise((r) => setTimeout(r, 1000));
          } catch (e: any) {
            if (this.isResourceAlreadyExistsRevert(e)) {
              console.log('  ⏭️  Wallets already in roles (ItemAlreadyExists)');
            } else {
              throw e;
            }
          }
        }
      }

      // Ensure current broadcaster wallet is in BROADCASTER_ROLE (RBAC). getBroadcasters() returns the
      // stored broadcaster address, but that address must also be in BROADCASTER_ROLE for
      // hasActionPermission to pass when the broadcaster calls approveTimeLockExecutionWithMetaTx.
      // Use Owner as executor so we can add the broadcaster even when they are not yet in the role.
      const broadcasterWallet = this.wallets[broadcasterWalletName];
      if (broadcasterWallet && (await this.roleExists(broadcasterHash))) {
        const broadcasterInRole = await this.guardController!.hasRole(
          broadcasterHash,
          broadcasterWallet.address as Address
        );
        if (!broadcasterInRole) {
          console.log('  📋 Adding broadcaster wallet to BROADCASTER_ROLE for RBAC...');
          try {
            await this.executeRoleConfigBatch(
              [
                await this.encodeRoleConfigAction(RoleConfigActionType.ADD_WALLET, {
                  roleHash: broadcasterHash,
                  wallet: broadcasterWallet.address,
                }),
              ],
              ownerWalletName,
              ownerWalletName
            );
            await new Promise((r) => setTimeout(r, 800));
          } catch (e: any) {
            if (this.isResourceAlreadyExistsRevert(e)) {
              console.log('  ⏭️  Broadcaster already in BROADCASTER_ROLE (ItemAlreadyExists)');
            } else {
              throw e;
            }
          }
        }
      }

      const requestorActions = [TxAction.EXECUTE_TIME_DELAY_REQUEST];
      // 3-step flow: MINT_APPROVER only signs approve/cancel (no SIGN_META_REQUEST_AND_APPROVE).
      const approverActions = [TxAction.SIGN_META_APPROVE, TxAction.SIGN_META_CANCEL];
      const broadcasterApproveCancelActions = [TxAction.EXECUTE_META_APPROVE, TxAction.EXECUTE_META_CANCEL];

      // Batch A: MINT_REQUESTOR + MINT_APPROVER permissions for 3-step flow (no requestAndApprove).
      const batchRequestorApprover = [
        await this.encodeRoleConfigAction(RoleConfigActionType.ADD_FUNCTION_TO_ROLE, {
          roleHash: requestorHash,
          functionPermission: this.createFunctionPermission(ERC20_MINT_SELECTOR, requestorActions),
        }),
        await this.encodeRoleConfigAction(RoleConfigActionType.ADD_FUNCTION_TO_ROLE, {
          roleHash: approverHash,
          functionPermission: this.createFunctionPermission(ERC20_MINT_SELECTOR, approverActions),
        }),
        await this.encodeRoleConfigAction(RoleConfigActionType.ADD_FUNCTION_TO_ROLE, {
          roleHash: requestorHash,
          functionPermission: this.createFunctionPermission(this.EXECUTE_WITH_TIMELOCK_SELECTOR, requestorActions),
        }),
        await this.encodeRoleConfigAction(RoleConfigActionType.ADD_FUNCTION_TO_ROLE, {
          roleHash: approverHash,
          functionPermission: this.createFunctionPermission(this.APPROVE_TIMELOCK_EXECUTION_META_SELECTOR, [TxAction.SIGN_META_APPROVE]),
        }),
        await this.encodeRoleConfigAction(RoleConfigActionType.ADD_FUNCTION_TO_ROLE, {
          roleHash: approverHash,
          functionPermission: this.createFunctionPermission(this.CANCEL_TIMELOCK_EXECUTION_META_SELECTOR, [TxAction.SIGN_META_CANCEL]),
        }),
      ];
      try {
        await this.executeRoleConfigBatch(batchRequestorApprover, ownerWalletName, broadcasterWalletName);
        console.log('  ✅ Requestor/approver permissions applied');
      } catch (batchError: any) {
        if (this.isResourceAlreadyExistsRevert(batchError)) {
          console.log('  ⏭️  Requestor/approver permissions already present (ResourceAlreadyExists/ItemAlreadyExists)');
        } else {
          throw batchError;
        }
      }
      await new Promise((r) => setTimeout(r, 800));

      // Batch B: BROADCASTER_ROLE can execute approve/cancel meta-tx only (3-step flow).
      // Apply in two separate batches so that if handler permissions already exist (ItemAlreadyExists),
      // the execution-selector permission (mint) still gets applied. A single batch would revert entirely
      // on the first duplicate and never apply the mint permission required by _validateExecutionAndHandlerPermissions.
      const batchBroadcasterHandlers = [
        await this.encodeRoleConfigAction(RoleConfigActionType.ADD_FUNCTION_TO_ROLE, {
          roleHash: broadcasterHash,
          functionPermission: this.createFunctionPermission(
            this.APPROVE_TIMELOCK_EXECUTION_META_SELECTOR,
            broadcasterApproveCancelActions,
          ),
        }),
        await this.encodeRoleConfigAction(RoleConfigActionType.ADD_FUNCTION_TO_ROLE, {
          roleHash: broadcasterHash,
          functionPermission: this.createFunctionPermission(
            this.CANCEL_TIMELOCK_EXECUTION_META_SELECTOR,
            broadcasterApproveCancelActions,
          ),
        }),
      ];
      const batchBroadcasterMint = [
        // Broadcaster must have EXECUTE_META_APPROVE/EXECUTE_META_CANCEL on the underlying
        // execution selector (mint) so EngineBlox._validateExecutionAndHandlerPermissions passes
        // for both executionSelector (mint) and handlerSelector (approveTimeLockExecutionWithMetaTx).
        await this.encodeRoleConfigAction(RoleConfigActionType.ADD_FUNCTION_TO_ROLE, {
          roleHash: broadcasterHash,
          functionPermission: this.createFunctionPermission(
            ERC20_MINT_SELECTOR,
            broadcasterApproveCancelActions,
          ),
        }),
      ];
      try {
        await this.executeRoleConfigBatch(batchBroadcasterMint, ownerWalletName, broadcasterWalletName);
        console.log('  ✅ Broadcaster mint (execution selector) permissions applied');
      } catch (batchError: any) {
        if (this.isResourceAlreadyExistsRevert(batchError)) {
          console.log('  ⏭️  Broadcaster mint permissions already present (ResourceAlreadyExists/ItemAlreadyExists)');
        } else {
          throw batchError;
        }
      }
      await new Promise((r) => setTimeout(r, 800));
      try {
        await this.executeRoleConfigBatch(batchBroadcasterHandlers, ownerWalletName, broadcasterWalletName);
        console.log('  ✅ Broadcaster handler (approve/cancel meta-tx) permissions applied');
      } catch (batchError: any) {
        if (this.isResourceAlreadyExistsRevert(batchError)) {
          console.log('  ⏭️  Broadcaster handler permissions already present (ResourceAlreadyExists/ItemAlreadyExists)');
        } else {
          throw batchError;
        }
      }
      await new Promise((r) => setTimeout(r, 1500));
      console.log('  ✅ Mint roles and permissions ensured');
    } catch (error: any) {
      this.handleTestError('Ensure mint roles and permissions', error);
      throw error;
    }
  }

  /**
   * Negative test: requestAndApproveExecution expects SIGN_META_REQUEST_AND_APPROVE; passing
   * SIGN_META_APPROVE must revert (NotSupported). Mint flow uses 3-step approveTimeLockExecutionWithMetaTx instead.
   */
  private async step2aMintMetaTxWrongActionMustRevert(): Promise<void> {
    console.log('\n🧪 SDK Step 2a: requestAndApproveExecution must reject SIGN_META_APPROVE meta action');
    try {
      if (!this.guardController || !this.metaTxSigner) {
        throw new Error('GuardController or MetaTransactionSigner not initialized');
      }
      if (!this.contractAddress) {
        throw new Error('Contract address not set');
      }

      const token = this.getBasicErc20Address();
      const accountBlox = this.contractAddress;

      const mintRequestor = this.wallets.wallet3;
      const mintApprover = this.wallets.wallet4;
      if (!mintRequestor || !mintApprover) {
        throw new Error('wallet3 and wallet4 must be configured for mint test');
      }

      const amount = 100n * 10n ** 18n;
      const executionParams = encodeAbiParameters(
        parseAbiParameters('address, uint256'),
        [accountBlox, amount]
      ) as Hex;

      const operationType = keccak256(stringToHex('ERC20_MINT')) as Hex;
      const txParams = {
        requester: mintRequestor.address as Address,
        target: token,
        value: BigInt(0),
        gasLimit: BigInt(200000),
        operationType,
        executionSelector: ERC20_MINT_SELECTOR,
        executionParams,
      };

      // Deliberately use the WRONG signer action for requestAndApproveExecution.
      const badMetaTxParams = await this.createMetaTxParams(
        ERC20_MINT_SELECTOR,
        TxAction.SIGN_META_APPROVE,
        mintApprover.address as Address,
        3600
      );

      console.log('  📋 Generating unsigned meta-transaction (wrong action SIGN_META_APPROVE)...');
      const unsignedMetaTx = await this.metaTxSigner.createUnsignedMetaTransactionForNew(
        txParams,
        badMetaTxParams
      );
      console.log('  🔐 Signing bad meta-transaction...');
      let signedMetaTx = await this.metaTxSigner.signMetaTransaction(
        unsignedMetaTx,
        mintApprover.address as Address,
        mintApprover.privateKey
      );
      signedMetaTx = this.normalizeMetaTxToHex(signedMetaTx);

      const broadcasterWallet = this.getRoleWallet('broadcaster');
      const broadcasterGuardController = this.createGuardControllerWithWallet(
        Object.keys(this.wallets).find(
          (k) => this.wallets[k].address.toLowerCase() === broadcasterWallet.address.toLowerCase()
        ) || 'wallet2'
      );

      console.log('  📤 Calling requestAndApproveExecution(metaTx) with SIGN_META_APPROVE (should revert)...');
      let reverted = false;
      try {
        const result = await broadcasterGuardController.requestAndApproveExecution(
          signedMetaTx,
          this.getTxOptions(broadcasterWallet.address)
        );
        await result.wait();
      } catch (error: any) {
        reverted = true;
        this.logRevertReason(error);
      }

      this.assertTest(
        reverted,
        'requestAndApproveExecution with SIGN_META_APPROVE must revert (NotSupported)'
      );
    } catch (error: any) {
      this.handleTestError('Mint via wrong meta action (SIGN_META_APPROVE)', error);
      throw error;
    }
  }

  /**
   * Mint 100 BASIC to AccountBlox via the 3-step flow:
   * (1) MINT_REQUESTOR calls executeWithTimeLock, (2) MINT_APPROVER signs meta approve,
   * (3) BROADCASTER calls approveTimeLockExecutionWithMetaTx.
   */
  private async step2Mint100ToAccountBloxViaMetaTx(): Promise<void> {
    console.log('\n🧪 SDK Step 2: Mint 100 BASIC via 3-step flow (executeWithTimeLock → sign approve → execute approve)');
    try {
      if (!this.guardController || !this.metaTxSigner) {
        throw new Error('GuardController or MetaTransactionSigner not initialized');
      }
      if (!this.contractAddress) {
        throw new Error('Contract address not set');
      }

      const token = this.getBasicErc20Address();
      const accountBlox = this.contractAddress;

      const mintRequestor = this.wallets.wallet3;
      const mintApprover = this.wallets.wallet4;
      if (!mintRequestor || !mintApprover) {
        throw new Error('wallet3 and wallet4 must be configured for mint test');
      }

      this.balanceBefore = await this.readAccountBloxBasicBalance();
      this.totalSupplyBefore = await this.readTotalSupply();
      console.log(`  ℹ️  BASIC balance before mint (destination AccountBlox): ${this.balanceBefore.toString()}`);
      console.log(`  ℹ️  BASIC totalSupply before mint: ${this.totalSupplyBefore.toString()}`);

      await new Promise((r) => setTimeout(r, 1000));

      const amount = 100n * 10n ** 18n;
      const executionParams = encodeAbiParameters(
        parseAbiParameters('address, uint256'),
        [accountBlox, amount]
      ) as Hex;
      const operationType = keccak256(stringToHex('ERC20_MINT')) as Hex;

      // Step 1: MINT_REQUESTOR requests via executeWithTimeLock
      const requestorWalletName =
        Object.keys(this.wallets).find(
          (k) => this.wallets[k].address.toLowerCase() === mintRequestor.address.toLowerCase()
        ) || 'wallet3';
      const requestorGC = this.createGuardControllerWithWallet(requestorWalletName);
      console.log('  📤 Step 1: MINT_REQUESTOR calling executeWithTimeLock...');
      const requestResult = await requestorGC.executeWithTimeLock(
        token,
        BigInt(0),
        ERC20_MINT_SELECTOR,
        executionParams,
        BigInt(200000),
        operationType,
        this.getTxOptions(mintRequestor.address, { gas: 500_000 })
      );
      const requestReceipt = await requestResult.wait();
      const txId = this.extractTxIdFromReceipt(requestReceipt);
      if (txId == null) {
        throw new Error('Could not extract txId from executeWithTimeLock receipt');
      }
      console.log(`  ✅ Timelock request created (txId: ${txId})`);

      // Step 2: Wait for timelock
      const timeLockSec = await this.guardController.getTimeLockPeriodSec();
      const waitSec = Number(timeLockSec) + 1;
      console.log(`  ⏳ Waiting ${waitSec}s for timelock...`);
      await new Promise((r) => setTimeout(r, waitSec * 1000));

      // Step 3a: MINT_APPROVER signs meta approve for existing tx
      const metaTxParams = await this.createMetaTxParams(
        this.APPROVE_TIMELOCK_EXECUTION_META_SELECTOR,
        TxAction.SIGN_META_APPROVE,
        mintApprover.address as Address,
        3600
      );
      console.log('  📋 Generating unsigned meta-tx for approve (existing tx)...');
      const unsignedApproveMetaTx = await this.guardController!.generateUnsignedMetaTransactionForExisting(txId, metaTxParams);
      console.log('  🔐 MINT_APPROVER signing approve meta-tx...');
      let signedApproveMetaTx = await this.metaTxSigner!.signMetaTransaction(
        unsignedApproveMetaTx,
        mintApprover.address as Address,
        mintApprover.privateKey
      );
      // Normalize hex/bytes so SDK validation and write encoding accept (contract is source of struct; we only fix types)
      signedApproveMetaTx = this.normalizeMetaTxToHex(signedApproveMetaTx);

      // Step 3b: BROADCASTER executes approveTimeLockExecutionWithMetaTx
      const broadcasterWallet = this.getRoleWallet('broadcaster');
      const broadcasterGuardController = this.createGuardControllerWithWallet(
        Object.keys(this.wallets).find(
          (k) => this.wallets[k].address.toLowerCase() === broadcasterWallet.address.toLowerCase()
        ) || 'wallet2'
      );
      console.log('  📤 Step 3: BROADCASTER calling approveTimeLockExecutionWithMetaTx...');
      const approveResult = await broadcasterGuardController.approveTimeLockExecutionWithMetaTx(
        signedApproveMetaTx,
        this.getTxOptions(broadcasterWallet.address, { simulationMode: 'warn-only', gas: 1_500_000 })
      );
      const approveReceipt = await approveResult.wait();
      const status = approveReceipt.status as any;
      const isSuccess = status === 'success' || status === 1 || String(status) === '1';
      console.log(`  ✅ approveTimeLockExecutionWithMetaTx ${isSuccess ? 'SUCCESS' : 'FAILED'} (tx hash: ${approveResult.hash})`);

      if (!isSuccess) {
        const revertMsg = await this.tryGetRevertReasonFromFailedTx(approveReceipt.transactionHash);
        this.assertTest(false, revertMsg ? `Mint approve failed: ${revertMsg}` : 'Mint approve tx reverted');
      }
      this.assertTest(true, 'Mint 100 BASIC via 3-step flow executed successfully');
    } catch (error: any) {
      this.logRevertReason(error);
      this.handleTestError('Mint 100 BASIC via 3-step flow', error);
      throw error;
    }
  }

  /**
   * Try to obtain a human-readable revert reason from a failed transaction.
   * Uses: (1) re-call at same block to get revert data then decode via contract-errors catalog;
   *       (2) fallback to debug_traceTransaction if RPC supports it.
   */
  private async tryGetRevertReasonFromFailedTx(txHash: string): Promise<string | null> {
    if (!this.publicClient) return null;

    // 1) Re-execute the failed tx at its block to get revert data, then decode with contract-errors catalog
    try {
      const tx = await this.publicClient.getTransaction({ hash: txHash as `0x${string}` });
      if (tx && tx.from && tx.to && tx.input && tx.blockNumber != null) {
        await this.publicClient.call({
          account: tx.from,
          to: tx.to,
          data: tx.input,
          value: tx.value ?? 0n,
          blockNumber: tx.blockNumber,
        });
      }
    } catch (callErr: any) {
      // Revert data can be on error.data (raw RPC) or error.cause (viem wrappers)
      let revertData: string | undefined;
      const d = callErr?.data ?? callErr?.cause?.data ?? callErr?.cause?.cause?.data;
      if (typeof d === 'string' && d.startsWith('0x')) revertData = d;
      else if (d && typeof d === 'object' && typeof (d as any).data === 'string') revertData = (d as any).data;
      if (!revertData && callErr?.message && /0x[0-9a-fA-F]{8,}/.test(callErr.message)) {
        const m = callErr.message.match(/0x[0-9a-fA-F]{8,}/);
        if (m && m[0].length <= 600) revertData = m[0];
      }
      if (revertData) {
        const { userMessage, error: decodedError, isKnownError } = extractErrorInfo(revertData);
        if (decodedError) {
          console.log(`  📋 Revert decoded (contract-errors): ${decodedError.name}`);
          if (decodedError.params && Object.keys(decodedError.params).length > 0) {
            console.log(`     Params: ${JSON.stringify(decodedError.params)}`);
          }
          if (isKnownError && userMessage && userMessage !== 'Transaction reverted with unknown error') {
            return userMessage;
          }
          return decodedError.message || userMessage || null;
        }
        if (userMessage && userMessage !== 'Transaction reverted with unknown error') return userMessage;
      }
    }

    // 2) Fallback: debug_traceTransaction (some RPCs return revert reason here)
    try {
      const result = await (this.publicClient as any).request({
        method: 'debug_traceTransaction',
        params: [
          txHash,
          { tracer: 'callTracer', tracerConfig: { onlyTopCall: false } },
        ],
      });
      if (result?.error) return result.error;
      if (result?.revertReason) return result.revertReason;
      const err = typeof result === 'string' ? result : (result?.returnValue ?? result?.output);
      if (err && typeof err === 'string') return err;
    } catch (_) {
      /* RPC may not support debug_traceTransaction */
    }
    return null;
  }

  /** Decode and log contract revert data when present (supports EnhancedViemError and nested cause). */
  private logRevertReason(error: any): void {
    try {
      let errData: unknown =
        error?.errorData ??
        error?.data ??
        error?.cause?.data ??
        error?.cause?.cause?.data ??
        error?.originalError?.data ??
        error?.originalError?.cause?.data ??
        (typeof error?.details === 'string' ? error.details : error?.details?.data);
      if (errData && typeof errData === 'object' && (errData as any)?.data) errData = (errData as any).data;
      let hexData: string | null =
        typeof errData === 'string' && errData.startsWith('0x') ? errData : null;
      // Only use hex from message if short (revert data is selector + args; avoid using full calldata)
      if (!hexData && error?.message && typeof error.message === 'string') {
        const m = error.message.match(/0x[0-9a-fA-F]{8,}/);
        if (m && m[0].length >= 10 && m[0].length <= 600) hexData = m[0];
      }
      if (!hexData || hexData.length <= 10) return;
      const abiDir = path.join(__dirname, '../../../sdk/typescript/abi');
      const abis: { name: string; path: string }[] = [
        { name: 'GuardController', path: path.join(abiDir, 'GuardController.abi.json') },
        { name: 'AccountBlox', path: path.join(abiDir, 'AccountBlox.abi.json') },
      ];
      // Prefer ABI decode so we get exact error name and args (revert data is usually from contract)
      for (const { name, path: abiPath } of abis) {
        try {
          const abi = JSON.parse(fs.readFileSync(abiPath, 'utf8')) as any[];
          const decoded = decodeErrorResult({ abi, data: hexData as `0x${string}` });
          const { userMessage } = extractErrorInfo(hexData);
          const clearMsg = userMessage && userMessage !== 'Transaction reverted with unknown error'
            ? userMessage
            : `${decoded.errorName}(${JSON.stringify(decoded.args)})`;
          console.error(`  🔍 Contract revert (${name}): ${clearMsg}`);
          return;
        } catch (_) {
          /* try next ABI */
        }
      }
      const { userMessage, error: decodedError, isKnownError } = extractErrorInfo(hexData);
      if (decodedError && userMessage && userMessage !== 'Transaction reverted with unknown error') {
        console.error(`  🔍 Contract revert: ${userMessage}`);
        if (isKnownError && decodedError.params && Object.keys(decodedError.params).length > 0) {
          console.error(`     Decoded: ${decodedError.name}(${JSON.stringify(decodedError.params)})`);
        }
      } else if (userMessage) {
        console.error(`  🔍 Contract revert: ${userMessage}`);
      }
    } catch (_) {
      /* ignore decode failure */
    }
  }

  /** Ensure bytes/hex fields are normalized (match CJS _normalizeMessageHex / raw hex for encoding). */
  private normalizeMetaTxToHex(metaTx: any): any {
    const toHex = (v: unknown): string => {
      if (typeof v === 'string' && v.startsWith('0x')) return v;
      if (v instanceof Uint8Array) return bytesToHex(v);
      if (typeof v !== 'string' && typeof v !== 'undefined') {
        console.warn('normalizeMetaTxToHex: unexpected type for hex field', typeof v, v);
      }
      return (v as string) ?? '0x';
    };
    // Normalize message to 66-char hex (0x + 64 hex digits) like CJS eip712-signing._normalizeMessageHex
    let messageHex = metaTx.message;
    if (messageHex != null) {
      const raw = typeof messageHex === 'string' ? messageHex : bytesToHex(messageHex as Uint8Array);
      const body = (raw.startsWith('0x') ? raw.slice(2) : raw).replace(/[^0-9a-fA-F]/g, '') || '0';
      if (body.length > 64) {
        throw new Error(
          `normalizeMetaTxToHex: message hash must be 64 hex chars (32 bytes), got ${body.length}; truncation would corrupt data`
        );
      }
      if (body.length !== 64) {
        console.warn(`normalizeMetaTxToHex: message body length ${body.length}, expected 64; padding to 64`);
      }
      messageHex = '0x' + body.padStart(64, '0');
    }
    const params = metaTx.txRecord?.params;
    const executionParams = params?.executionParams;
    const normalizedExecutionParams =
      executionParams != null && typeof executionParams === 'string' && executionParams.startsWith('0x')
        ? executionParams
        : executionParams instanceof Uint8Array
          ? bytesToHex(executionParams)
          : '0x';
    return {
      ...metaTx,
      message: messageHex ?? metaTx.message,
      signature: toHex(metaTx.signature),
      data: toHex(metaTx.data),
      txRecord: {
        ...metaTx.txRecord,
        message: metaTx.txRecord?.message != null ? toHex(metaTx.txRecord.message) : metaTx.txRecord?.message,
        params: params
          ? {
              ...params,
              executionParams: normalizedExecutionParams,
              executionSelector: params.executionSelector != null ? toHex(params.executionSelector) : '0x00000000',
              operationType: params.operationType != null ? toHex(params.operationType) : '0x' + '0'.repeat(64),
            }
          : metaTx.txRecord?.params,
        result: metaTx.txRecord?.result != null ? toHex(metaTx.txRecord.result) : metaTx.txRecord?.result,
      },
    };
  }

  private async step3VerifyBalanceIncrease(): Promise<void> {
    console.log('\n🧪 SDK Step 3: Verify tokens minted and passed to destination');
    try {
      if (this.balanceBefore === null) {
        throw new Error('Balance before mint not recorded');
      }
      if (this.totalSupplyBefore === null) {
        throw new Error('Total supply before mint not recorded');
      }

      const token = this.getBasicErc20Address();
      const destination = this.contractAddress!;
      const expectedAmount = 100n * 10n ** 18n;

      const balanceAfter = await this.readAccountBloxBasicBalance();
      const totalSupplyAfter = await this.readTotalSupply();

      const balanceDelta = balanceAfter - this.balanceBefore;
      const supplyDelta = totalSupplyAfter - this.totalSupplyBefore;

      console.log(`  📋 Destination (AccountBlox): ${destination}`);
      console.log(`  📋 Token (BasicERC20): ${token}`);
      console.log(`  📋 Amount minted: ${expectedAmount.toString()} (100e18)`);
      console.log(`  📋 Balance after: ${balanceAfter.toString()}`);
      console.log(`  📋 Total supply after: ${totalSupplyAfter.toString()}`);

      // 1. Verify tokens were minted (totalSupply increased by expected amount)
      this.assertTest(
        supplyDelta === expectedAmount,
        `Tokens minted: totalSupply must increase by 100e18 (delta=${supplyDelta.toString()}, expected=${expectedAmount.toString()})`
      );
      if (supplyDelta === expectedAmount) {
        console.log(`  ✅ Verified: tokens were minted (totalSupply increased by ${expectedAmount.toString()})`);
      }

      // 2. Verify tokens were passed to the destination (AccountBlox balance increased by expected amount)
      this.assertTest(
        balanceDelta === expectedAmount,
        `Tokens passed to destination: AccountBlox balance must increase by 100e18 (delta=${balanceDelta.toString()}, expected=${expectedAmount.toString()})`
      );
      if (balanceDelta === expectedAmount) {
        console.log(
          `  ✅ Verified: tokens passed to destination (AccountBlox balance increased by ${expectedAmount.toString()})`
        );
      }

      this.assertTest(
        balanceAfter >= expectedAmount,
        `AccountBlox BASIC balance >= 100e18 (after=${balanceAfter.toString()})`
      );
    } catch (error: any) {
      this.handleTestError('Verify tokens minted and passed to destination', error);
      throw error;
    }
  }

  /**
   * Step 4: Snapshot mint readiness state after sanity run.
   * Logs current schema, whitelist, role permissions and BASIC balances to aid manual review.
   */
  private async step4SnapshotMintReadinessState(): Promise<void> {
    console.log('\n🧪 SDK Step 4: Snapshot mint readiness state');
    try {
      if (!this.guardController || !this.runtimeRBAC || !this.publicClient || !this.contractAddress) {
        throw new Error('GuardController, RuntimeRBAC, publicClient or contractAddress not initialized');
      }

      const token = this.getBasicErc20Address();
      const accountBlox = this.contractAddress;

      console.log('  📋 Addresses');
      console.log(`     AccountBlox (controller): ${accountBlox}`);
      console.log(`     BasicERC20 (token):       ${token}`);

      // Role permissions snapshot (using same hashes as step1b)
      const requestorHash = this.getRoleHash('MINT_REQUESTOR');
      const approverHash = this.getRoleHash('MINT_APPROVER');
      const broadcasterHash = this.getRoleHash('BROADCASTER_ROLE');

      console.log('  📋 Role permission snapshot (RuntimeRBAC.getActiveRolePermissions)');
      for (const [name, hash] of [
        ['MINT_REQUESTOR', requestorHash],
        ['MINT_APPROVER', approverHash],
        ['BROADCASTER_ROLE', broadcasterHash],
      ] as const) {
        try {
          // Rely on RuntimeRBAC SDK wrapper from base-test
          const permissions = await this.runtimeRBAC!.getActiveRolePermissions(hash);
          console.log(`     ${name}:`);
          console.log(`       functionSelectors: ${JSON.stringify((permissions as any).functionSelectors ?? (permissions as any).functionSelectorsReturn ?? [], null, 2)}`);
          console.log(
            `       functionPermissions: ${JSON.stringify(
              (permissions as any).functionPermissions ?? (permissions as any).functionPermissionsReturn ?? [],
              null,
              2
            )}`
          );
        } catch (e: any) {
          console.warn(`     [WARN] Failed to read permissions for role ${name}: ${e?.message ?? e}`);
        }
      }

      // BASIC token balances
      const totalSupply = await this.readTotalSupply();
      const accountBloxBalance = await this.readAccountBloxBasicBalance();

      console.log('  📋 BASIC token state');
      console.log(`     totalSupply:        ${totalSupply.toString()}`);
      console.log(`     AccountBlox balance: ${accountBloxBalance.toString()}`);

      // Engine transaction history snapshot
      try {
        console.log('  📋 Engine transaction history (recent records)');
        // getTransactionHistory(fromTxId, toTxId)
        // Use a wide, valid range: fromTxId=1, toTxId=largeUpperBound (contract clamps to actual txCounter)
        const largeUpperBound = BigInt('0xffffffffffffffff');
        const history: any[] = await (this.guardController as any).getTransactionHistory(1n, largeUpperBound);
        const maxToPrint = 20;
        for (let i = 0; i < history.length && i < maxToPrint; i++) {
          const tx = history[i] as any;
          const params = tx.params ?? tx[3] ?? {};
          const opType = params.operationType ?? params.operationTypeReturn ?? params[5];
          const execSel = params.executionSelector ?? params.executionSelectorReturn ?? params[6];
          const requester = params.requester ?? params.requesterReturn ?? params[1];
          const target = params.target ?? params.targetReturn ?? params[2];
          const status = tx.status ?? tx.statusReturn ?? tx[2];
          console.log(
            `     txId=${String(tx.txId ?? tx.txIdReturn ?? tx[0])}, ` +
              `status=${String(status)}, ` +
              `operationType=${String(opType)}, ` +
              `executionSelector=${String(execSel)}, ` +
              `requester=${String(requester)}, ` +
              `target=${String(target)}`
          );
        }
        if (history.length > maxToPrint) {
          console.log(`     ... ${history.length - maxToPrint} more transaction(s) omitted`);
        }
      } catch (e: any) {
        console.warn(`  [WARN] Failed to read transaction history: ${e?.message ?? e}`);
      }
    } catch (error: any) {
      this.handleTestError('Snapshot mint readiness state', error);
      throw error;
    }
  }
}

