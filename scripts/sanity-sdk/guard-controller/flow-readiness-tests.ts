/**
 * Flow Readiness Tests (SPEC-2026-0119 R6)
 *
 * Proves the two halves of the guard/RBAC ergonomics story on a live chain:
 *
 * 1. **The shut door reads shut.** An account with a registered schema and a whitelisted target, but no
 *    role grant on the execution selector, reports `flowReadiness.open === false` and names the missing
 *    grant. A probe that can pass over a shut door is not a probe.
 * 2. **The self-handler rule is real.** A selector registered at runtime via `REGISTER_FUNCTION` is created
 *    with `enforceHandlerRelations: true` and `handlerForSelectors: [self]`. A grant that names any other
 *    handler reverts `HandlerForSelectorMismatch` — caught first by the SDK's `resolveHandlerForSelectors`
 *    pre-flight, then by the chain. Grant it correctly and the same probe reports `open === true`.
 */

import { Address, Hex, keccak256, toBytes } from 'viem';
import { BaseGuardControllerTest } from './base-test.ts';
import { TxAction } from '../../../sdk/typescript/types/lib.index.tsx';
import { GuardConfigActionType, GuardConfigAction } from '../../../sdk/typescript/types/core.execution.index.tsx';
import { RoleConfigActionType, RoleConfigAction } from '../runtime-rbac/base-test.ts';
import {
  flowReadiness,
  formatFlowReadiness
} from '../../../sdk/typescript/utils/readiness.ts';
import { resolveHandlerForSelectors } from '../../../sdk/typescript/lib/definitions/RuntimeRBACDefinitions.ts';

/** Signature registered at runtime for this suite. Stable across runs so re-runs are idempotent. */
const PROBE_FUNCTION_SIGNATURE = '__spec0119_readiness_probe__()';
const PROBE_OPERATION_NAME = 'SPEC0119_READINESS';

/** Role that receives the correct grant — the flow this suite opens. */
const PROBE_SIGNER_ROLE_NAME = 'SPEC0119_PROBE_SIGNER';
/** Role that is created but deliberately never granted, so the "shut door" assertion is re-run stable. */
const PROBE_UNGRANTED_ROLE_NAME = 'SPEC0119_PROBE_UNGRANTED';

export class FlowReadinessTests extends BaseGuardControllerTest {
  private probeSelector: Hex = keccak256(toBytes(PROBE_FUNCTION_SIGNATURE)).slice(0, 10) as Hex;
  private probeTarget: Address | null = null;
  private signerRoleHash: Hex = '0x' as Hex;
  private ungrantedRoleHash: Hex = '0x' as Hex;

  constructor() {
    super('Flow Readiness Tests (SPEC-0119)');
  }

  async executeTests(): Promise<void> {
    console.log('\n🔄 TESTING flowReadiness + self-handler grant rule (SPEC-2026-0119 R6)');
    console.log('='.repeat(60));
    console.log('   1. Register a runtime selector (gets enforceHandlerRelations + self-handler)');
    console.log('   2. Whitelist a target for it');
    console.log('   3. Create probe roles (one is never granted)');
    console.log('   4. AC1: schema + whitelist, no grant  → flowReadiness.open === false, grant named');
    console.log('   5. AC3: grant with the wrong handler  → HandlerForSelectorMismatch');
    console.log('   6. AC2: grant correctly               → flowReadiness.open === true');
    console.log('   7. Fail-closed: a reader that cannot read never reports open');

    this.signerRoleHash = this.getRoleHash(PROBE_SIGNER_ROLE_NAME);
    this.ungrantedRoleHash = this.getRoleHash(PROBE_UNGRANTED_ROLE_NAME);

    const ownerAddress = this.getRoleWallet('owner').address.toLowerCase();
    const broadcasterAddress = this.getRoleWallet('broadcaster').address.toLowerCase();
    const recoveryAddress = this.getRoleWallet('recovery').address.toLowerCase();
    const spareWallet = Object.keys(this.wallets).find((name) => {
      const address = this.wallets[name].address.toLowerCase();
      return address !== ownerAddress && address !== broadcasterAddress && address !== recoveryAddress;
    });
    if (!spareWallet) {
      throw new Error('No spare wallet available for the probe target');
    }
    this.probeTarget = this.wallets[spareWallet].address;
    console.log(`\n📋 Probe selector: ${this.probeSelector} (${PROBE_FUNCTION_SIGNATURE})`);
    console.log(`📋 Probe target:   ${this.probeTarget}`);

    await this.step1RegisterProbeSelector();
    await this.step2WhitelistProbeTarget();
    await this.step3CreateProbeRoles();
    await this.step4AssertShutDoorReadsShut();
    await this.step5AssertWrongHandlerReverts();
    await this.step6AssertCorrectGrantOpensFlow();
    await this.step7AssertUnreadableNeverOpens();
  }

  /** Wallet name for one of the three system role wallets. */
  private walletNameFor(role: 'owner' | 'broadcaster' | 'recovery'): string {
    const wallet = this.getRoleWallet(role);
    const name = Object.keys(this.wallets).find(
      (k) => this.wallets[k].address.toLowerCase() === wallet.address.toLowerCase()
    );
    if (!name) throw new Error(`No wallet entry found for role ${role}`);
    return name;
  }

  /** An owner-scoped reader; the readiness reads are gated by `_validateAnyRole()`. */
  private ownerReader() {
    return this.createGuardControllerWithWallet(this.walletNameFor('owner'));
  }

  // ---------------------------------------------------------------------------------------------

  async step1RegisterProbeSelector(): Promise<void> {
    console.log('\n🧪 Step 1: Register the probe selector at runtime');
    console.log('─'.repeat(60));

    if (await this.schemaOrSupportedSetPreCheck(this.probeSelector)) {
      console.log('  ℹ️  Probe selector already registered; skipping registration');
      this.assertTest(true, `Probe selector ${this.probeSelector} registered`);
      return;
    }

    const signedMetaTx = await this.createSignedMetaTxForFunctionRegistration(
      PROBE_FUNCTION_SIGNATURE,
      PROBE_OPERATION_NAME,
      [TxAction.SIGN_META_REQUEST_AND_APPROVE, TxAction.EXECUTE_META_REQUEST_AND_APPROVE],
      this.walletNameFor('owner')
    );

    const broadcasterWallet = this.getRoleWallet('broadcaster');
    const broadcasterGuardController = this.createGuardControllerWithWallet(this.walletNameFor('broadcaster'));
    const result = await broadcasterGuardController.guardConfigBatchRequestAndApprove(
      signedMetaTx,
      this.getTxOptions(broadcasterWallet.address, { gas: 1_500_000n })
    );
    const receipt = await result.wait();

    try {
      await this.assertGuardConfigBatchSucceeded(receipt, 'Register probe selector');
    } catch (error: any) {
      if (await this.schemaOrSupportedSetPreCheck(this.probeSelector)) {
        console.log('  ℹ️  Registration reported a revert but the selector is registered; continuing');
      } else {
        throw error;
      }
    }

    this.assertTest(
      await this.schemaOrSupportedSetPreCheck(this.probeSelector),
      `Probe selector ${this.probeSelector} registered`
    );
  }

  async step2WhitelistProbeTarget(): Promise<void> {
    console.log('\n🧪 Step 2: Whitelist the probe target for the selector');
    console.log('─'.repeat(60));

    const reader = this.ownerReader();
    const existing = await reader.getFunctionWhitelistTargets(this.probeSelector);
    if (existing.some((t) => t.toLowerCase() === this.probeTarget!.toLowerCase())) {
      console.log('  ℹ️  Target already whitelisted; skipping');
      this.assertTest(true, `Target ${this.probeTarget} whitelisted for ${this.probeSelector}`);
      return;
    }

    const actionData = await this.encodeGuardConfigAction(GuardConfigActionType.ADD_TARGET_TO_WHITELIST, {
      functionSelector: this.probeSelector,
      target: this.probeTarget!,
      isAdd: true
    });
    const actions: GuardConfigAction[] = [
      { actionType: GuardConfigActionType.ADD_TARGET_TO_WHITELIST, data: actionData }
    ];
    await this.executeGuardConfigActions(
      actions,
      this.walletNameFor('owner'),
      this.walletNameFor('broadcaster'),
      'Whitelist probe target'
    );

    const after = await reader.getFunctionWhitelistTargets(this.probeSelector);
    this.assertTest(
      after.some((t) => t.toLowerCase() === this.probeTarget!.toLowerCase()),
      `Target ${this.probeTarget} whitelisted for ${this.probeSelector}`
    );
  }

  async step3CreateProbeRoles(): Promise<void> {
    console.log('\n🧪 Step 3: Create the probe roles');
    console.log('─'.repeat(60));

    const signerExists = await this.roleExists(this.signerRoleHash);
    const ungrantedExists = await this.roleExists(this.ungrantedRoleHash);
    if (signerExists && ungrantedExists) {
      console.log('  ℹ️  Both probe roles already exist; skipping creation');
      this.assertTest(true, 'Probe roles exist');
      return;
    }

    const actions: RoleConfigAction[] = [];
    if (!signerExists) {
      actions.push(
        await this.encodeRoleConfigAction(RoleConfigActionType.CREATE_ROLE, {
          roleName: PROBE_SIGNER_ROLE_NAME,
          maxWallets: 2
        })
      );
      actions.push(
        await this.encodeRoleConfigAction(RoleConfigActionType.ADD_WALLET, {
          roleHash: this.signerRoleHash,
          wallet: this.getRoleWallet('owner').address
        })
      );
    }
    if (!ungrantedExists) {
      actions.push(
        await this.encodeRoleConfigAction(RoleConfigActionType.CREATE_ROLE, {
          roleName: PROBE_UNGRANTED_ROLE_NAME,
          maxWallets: 2
        })
      );
    }

    await this.executeRoleConfigBatch(actions, this.walletNameFor('owner'), this.walletNameFor('broadcaster'));

    this.assertTest(await this.roleExists(this.signerRoleHash), `Role ${PROBE_SIGNER_ROLE_NAME} exists`);
    this.assertTest(await this.roleExists(this.ungrantedRoleHash), `Role ${PROBE_UNGRANTED_ROLE_NAME} exists`);
  }

  /** AC1: schema + whitelist present, no grant → `open` false and the missing grant is named. */
  async step4AssertShutDoorReadsShut(): Promise<void> {
    console.log('\n🧪 Step 4 (AC1): schema + whitelist but no grant → flow must read shut');
    console.log('─'.repeat(60));

    const readiness = await flowReadiness(this.ownerReader(), {
      selector: this.probeSelector,
      targets: [this.probeTarget!],
      roles: [{ role: this.ungrantedRoleHash, actions: [TxAction.SIGN_META_REQUEST_AND_APPROVE] }]
    });
    console.log(formatFlowReadiness(readiness));

    this.assertTest(readiness.schema.holds, 'AC1: schema row holds (selector is registered)');
    this.assertTest(
      readiness.whitelisted.length === 1 && readiness.whitelisted[0].holds,
      'AC1: whitelist row holds (target is whitelisted)'
    );
    this.assertTest(readiness.grants.length === 1 && !readiness.grants[0].holds, 'AC1: grant row does not hold');
    this.assertTest(readiness.open === false, 'AC1: flowReadiness.open is false over a shut door');
    this.assertTest(
      readiness.missing.some((m) => m.startsWith('grant:') && m.includes(this.ungrantedRoleHash)),
      'AC1: the missing grant is named in flowReadiness.missing'
    );
  }

  /** AC3: a runtime-registered selector refuses any handler but itself. */
  async step5AssertWrongHandlerReverts(): Promise<void> {
    console.log('\n🧪 Step 5 (AC3): grant with the wrong handlerForSelectors → HandlerForSelectorMismatch');
    console.log('─'.repeat(60));

    // A selector the schema certainly does not list: the guard config batch execution selector.
    const wrongHandler = this.GUARD_CONFIG_BATCH_EXECUTE_SELECTOR;

    // 5a. The SDK pre-flight rejects it before a transaction is ever built (SPEC-0119 R3).
    let preflightRejected = false;
    let preflightMessage = '';
    try {
      await resolveHandlerForSelectors(this.ownerReader() as any, this.probeSelector, [wrongHandler]);
    } catch (error: any) {
      preflightRejected = true;
      preflightMessage = error?.message ?? String(error);
    }
    console.log(`  📋 resolveHandlerForSelectors pre-flight: ${preflightRejected ? preflightMessage : 'accepted (unexpected)'}`);
    this.assertTest(preflightRejected, 'AC3: resolveHandlerForSelectors rejects the wrong handler off-chain');

    // 5b. The chain agrees: the role config batch reverts HandlerForSelectorMismatch.
    const badPermission = this.createFunctionPermission(
      this.probeSelector,
      [TxAction.SIGN_META_REQUEST_AND_APPROVE],
      [wrongHandler]
    );
    const actions: RoleConfigAction[] = [
      await this.encodeRoleConfigAction(RoleConfigActionType.ADD_FUNCTION_TO_ROLE, {
        roleHash: this.signerRoleHash,
        functionPermission: badPermission
      })
    ];

    let revertName = '';
    try {
      await this.executeRoleConfigBatch(actions, this.walletNameFor('owner'), this.walletNameFor('broadcaster'));
    } catch (error: any) {
      revertName = (error?.message ?? String(error)).toString();
    }
    console.log(`  📋 On-chain result: ${revertName || 'batch reported success (unexpected)'}`);
    this.assertTest(
      revertName.includes('HandlerForSelectorMismatch'),
      'AC3: the role config batch reverts HandlerForSelectorMismatch'
    );

    // The bad grant must not have landed.
    const permissions = await this.ownerReader().getActiveRolePermissions(this.signerRoleHash);
    const stored = permissions.find(
      (p: any) => String(p.functionSelector).toLowerCase() === this.probeSelector.toLowerCase()
    );
    this.assertTest(
      !stored || (stored as any).handlerForSelectors?.[0]?.toLowerCase() !== wrongHandler.toLowerCase(),
      'AC3: the rejected grant did not land on the role'
    );
  }

  /** AC2: grant correctly (self-referencing handler) → the same probe reports open. */
  async step6AssertCorrectGrantOpensFlow(): Promise<void> {
    console.log('\n🧪 Step 6 (AC2): grant correctly → flowReadiness.open === true');
    console.log('─'.repeat(60));

    const reader = this.ownerReader();

    // R3: with no explicit value the SDK derives the schema's own handler list, which for a
    // runtime-registered execution selector is the self-reference.
    const resolved = await resolveHandlerForSelectors(reader as any, this.probeSelector);
    console.log(`  📋 resolveHandlerForSelectors default: [${resolved.join(', ')}]`);
    this.assertTest(
      resolved.length === 1 && resolved[0].toLowerCase() === this.probeSelector.toLowerCase(),
      'R3: the SDK default self-references a runtime-registered selector'
    );

    const existing = await reader.getActiveRolePermissions(this.signerRoleHash);
    const alreadyGranted = existing.some(
      (p: any) => String(p.functionSelector).toLowerCase() === this.probeSelector.toLowerCase()
    );
    if (alreadyGranted) {
      console.log('  ℹ️  Grant already present from a previous run; skipping the batch');
    } else {
      const permission = this.createFunctionPermission(
        this.probeSelector,
        [TxAction.SIGN_META_REQUEST_AND_APPROVE],
        resolved
      );
      const actions: RoleConfigAction[] = [
        await this.encodeRoleConfigAction(RoleConfigActionType.ADD_FUNCTION_TO_ROLE, {
          roleHash: this.signerRoleHash,
          functionPermission: permission
        })
      ];
      await this.executeRoleConfigBatch(actions, this.walletNameFor('owner'), this.walletNameFor('broadcaster'));
    }

    const readiness = await flowReadiness(reader, {
      selector: this.probeSelector,
      targets: [this.probeTarget!],
      roles: [{ role: this.signerRoleHash, actions: [TxAction.SIGN_META_REQUEST_AND_APPROVE] }]
    });
    console.log(formatFlowReadiness(readiness));

    this.assertTest(readiness.grants[0].handlerSelfReferenced, 'AC2: the landed grant self-references the selector');
    this.assertTest(readiness.grants[0].handlerRelationsHold, 'AC2: the grant satisfies the schema handler relations');
    this.assertTest(readiness.missing.length === 0, 'AC2: nothing is reported missing');
    this.assertTest(readiness.open === true, 'AC2: flowReadiness.open is true once the flow is configured');
  }

  /** The fail-closed lock: reads that cannot be completed must never report an open flow. */
  async step7AssertUnreadableNeverOpens(): Promise<void> {
    console.log('\n🧪 Step 7: a probe that cannot read must not report open');
    console.log('─'.repeat(60));

    // An unknown role: the flow itself is configured, but this row cannot hold.
    const unknownRole = keccak256(toBytes('SPEC0119_ROLE_THAT_DOES_NOT_EXIST')) as Hex;
    const unknownRoleReadiness = await flowReadiness(this.ownerReader(), {
      selector: this.probeSelector,
      targets: [this.probeTarget!],
      roles: [{ role: unknownRole, actions: [TxAction.SIGN_META_REQUEST_AND_APPROVE] }]
    });
    this.assertTest(unknownRoleReadiness.open === false, 'Fail-closed: an unknown role never reports open');

    // An empty probe proves nothing and must not pass.
    const emptyReadiness = await flowReadiness(this.ownerReader(), {
      selector: this.probeSelector,
      targets: [],
      roles: []
    });
    this.assertTest(emptyReadiness.open === false, 'Fail-closed: an empty probe never reports open');
    this.assertTest(emptyReadiness.missing.length > 0, 'Fail-closed: an empty probe says why it cannot pass');
  }
}
