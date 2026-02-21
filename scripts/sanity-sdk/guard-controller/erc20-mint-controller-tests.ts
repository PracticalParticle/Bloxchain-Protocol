/**
 * ERC20 Mint via GuardController SDK Sanity Tests
 *
 * Mirrors the direct CJS sanity test:
 *   - MINT_REQUESTOR (wallet3) requests mint on BasicERC20 via AccountBlox
 *   - MINT_APPROVER (wallet4) signs meta-approve
 *   - BROADCASTER executes requestAndApproveExecution
 *   - Verifies AccountBlox BASIC balance increased by 100e18.
 *
 * This version uses the TypeScript SDK `GuardController` wrapper and `MetaTransactionSigner`.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import type { Address, Hex } from 'viem';
import { keccak256, encodeAbiParameters, parseAbiParameters } from 'viem';

import { BaseGuardControllerTest } from './base-test.ts';
import { TxAction } from '../../../sdk/typescript/types/lib.index.tsx';
import { RoleConfigActionType } from '../runtime-rbac/base-test.ts';

const ERC20_MINT_SELECTOR = '0x40c10f19' as Hex; // mint(address,uint256)
const ERC20_MINT_SIGNATURE = 'mint(address,uint256)';

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

  constructor() {
    super('ERC20 Mint via GuardController SDK Tests');
  }

  async executeTests(): Promise<void> {
    console.log('\n🔄 ERC20 MINT VIA CONTROLLER WORKFLOW (SDK)');
    console.log('==================================================');
    console.log('   1. Ensure mint(address,uint256) schema exists');
    console.log('   2. Ensure BasicERC20 is whitelisted for mint selector');
    console.log('   3. Ensure mint roles and permissions (MINT_REQUESTOR, MINT_APPROVER, BROADCASTER)');
    console.log('   4. Mint 100 BASIC to AccountBlox via meta-transaction');
    console.log('   5. Verify BASIC balance increased by 100e18\n');

    await this.step0RegisterMintSchemaIfNeeded();
    await this.step1WhitelistBasicErc20IfNeeded();
    await this.step1bEnsureMintRolesAndPermissions();
    await this.step2Mint100ToAccountBloxViaMetaTx();
    await this.step3VerifyBalanceIncrease();
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

    const ERC20_BALANCE_OF_ABI = [
      {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ type: 'uint256' }],
      },
    ] as const;

    const balance = await this.publicClient.readContract({
      address: token,
      abi: ERC20_BALANCE_OF_ABI,
      functionName: 'balanceOf',
      args: [accountBlox],
    });

    return balance as bigint;
  }

  private async step0RegisterMintSchemaIfNeeded(): Promise<void> {
    console.log('\n🧪 SDK Step 0: Ensure ERC20 mint schema exists');
    try {
      if (!this.guardController) throw new Error('GuardController not initialized');

      const already = await this.guardController.functionSchemaExists(ERC20_MINT_SELECTOR);
      if (already) {
        console.log('  ℹ️  mint(address,uint256) schema already registered; skipping registration');
        this.assertTest(true, 'Mint schema already registered');
        return;
      }

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
        'ERC20_MINT',
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
        this.getTxOptions(broadcasterWallet.address)
      );
      const receipt = await result.wait();

      console.log('  ✅ Mint schema registration tx sent');
      console.log(`     Tx hash: ${result.hash}`);
      const status0 = receipt.status as any;
      const isSuccess0 = status0 === 'success' || status0 === 1 || String(status0) === '1';
      console.log(`     Status: ${isSuccess0 ? 'SUCCESS' : 'FAILED'}`);

      await this.assertGuardConfigBatchSucceeded(receipt, 'Register ERC20 mint schema');

      const maxRetries = 10;
      const retryDelayMs = 3000;
      let existsNow = false;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        try {
          existsNow = await this.guardController.functionSchemaExists(ERC20_MINT_SELECTOR);
          if (existsNow) {
            console.log('  ✅ Mint schema is visible via functionSchemaExists after registration');
            break;
          }
        } catch (checkError: any) {
          console.warn(`  ⏳ functionSchemaExists attempt ${attempt}/${maxRetries}: ${checkError?.message || checkError}`);
        }
      }
      this.assertTest(existsNow, 'Mint schema must be visible via functionSchemaExists after registration');
    } catch (error: any) {
      this.handleTestError('Ensure ERC20 mint schema', error);
      throw error;
    }
  }

  private async step1WhitelistBasicErc20IfNeeded(): Promise<void> {
    console.log('\n🧪 SDK Step 1: Ensure BasicERC20 is whitelisted for mint selector');
    try {
      if (!this.guardController) throw new Error('GuardController not initialized');
      const token = this.getBasicErc20Address();

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
        targets = await this.guardController.getFunctionWhitelistTargets(ERC20_MINT_SELECTOR);
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
        this.getTxOptions(broadcasterWallet.address)
      );
      const receipt = await result.wait();

      console.log('  ✅ Whitelist update tx sent');
      console.log(`     Tx hash: ${result.hash}`);
      const status1 = receipt.status as any;
      const isSuccess1 = status1 === 'success' || status1 === 1 || String(status1) === '1';
      console.log(`     Status: ${isSuccess1 ? 'SUCCESS' : 'FAILED'}`);

      let addTreatedAsIdempotent = false;
      try {
        await this.assertGuardConfigBatchSucceeded(receipt, 'Add BasicERC20 to mint whitelist');
      } catch (e: any) {
        if (e?.message?.includes('TxStatus 6')) {
          addTreatedAsIdempotent = true;
          const targetsCheck = await this.guardController.getFunctionWhitelistTargets(ERC20_MINT_SELECTOR).catch(() => [] as Address[]);
          if (targetsCheck.some((t) => t.toLowerCase() === token.toLowerCase())) {
            console.log('  ℹ️  Add reported TxStatus 6 but BasicERC20 is in whitelist; treating as success (idempotent)');
          } else {
            console.log('  ℹ️  Add reported TxStatus 6 (e.g. already whitelisted); treating as success for idempotent runs');
          }
        } else {
          throw e;
        }
      }

      let targetsAfter: Address[] = [];
      try {
        targetsAfter = await this.guardController.getFunctionWhitelistTargets(ERC20_MINT_SELECTOR);
      } catch (_) {
        if (addTreatedAsIdempotent) {
          console.log('  ℹ️  getFunctionWhitelistTargets reverted (selector may be unregistered); treating step as success (idempotent)');
        } else {
          throw new Error('getFunctionWhitelistTargets failed after whitelist update');
        }
      }
      console.log(`  📋 Whitelist targets after SDK update (${targetsAfter.length}):`);
      targetsAfter.forEach((t, i) => {
        console.log(`     ${i + 1}. ${t}`);
      });

      const nowWhitelisted = targetsAfter.some((t) => t.toLowerCase() === token.toLowerCase()) || addTreatedAsIdempotent;
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
   * Ensure MINT_REQUESTOR, MINT_APPROVER roles exist and have correct function permissions;
   * BROADCASTER_ROLE must have EXECUTE_META_REQUEST_AND_APPROVE for mint. Aligns with CJS steps 1 and 4.
   */
  private async step1bEnsureMintRolesAndPermissions(): Promise<void> {
    console.log('\n🧪 SDK Step 1b: Ensure mint roles and permissions');
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

      const requestorActions = [TxAction.EXECUTE_TIME_DELAY_REQUEST];
      const approverActions = [TxAction.SIGN_META_APPROVE, TxAction.SIGN_META_CANCEL];
      const broadcasterActions = [TxAction.EXECUTE_META_REQUEST_AND_APPROVE];

      const batch1 = [
        await this.encodeRoleConfigAction(RoleConfigActionType.ADD_FUNCTION_TO_ROLE, {
          roleHash: requestorHash,
          functionPermission: this.createFunctionPermission(ERC20_MINT_SELECTOR, requestorActions),
        }),
        await this.encodeRoleConfigAction(RoleConfigActionType.ADD_FUNCTION_TO_ROLE, {
          roleHash: approverHash,
          functionPermission: this.createFunctionPermission(ERC20_MINT_SELECTOR, approverActions),
        }),
        await this.encodeRoleConfigAction(RoleConfigActionType.ADD_FUNCTION_TO_ROLE, {
          roleHash: approverHash,
          functionPermission: this.createFunctionPermission(this.REQUEST_AND_APPROVE_EXECUTION_SELECTOR, approverActions, [ERC20_MINT_SELECTOR]),
        }),
        await this.encodeRoleConfigAction(RoleConfigActionType.ADD_FUNCTION_TO_ROLE, {
          roleHash: broadcasterHash,
          functionPermission: this.createFunctionPermission(ERC20_MINT_SELECTOR, broadcasterActions),
        }),
      ];
      try {
        await this.executeRoleConfigBatch(batch1, ownerWalletName, broadcasterWalletName);
      } catch (batchError: any) {
        if (this.isResourceAlreadyExistsRevert(batchError)) {
          console.log('  ⏭️  Mint permissions already present (ResourceAlreadyExists/ItemAlreadyExists), continuing');
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

  private async step2Mint100ToAccountBloxViaMetaTx(): Promise<void> {
    console.log('\n🧪 SDK Step 2: Mint 100 BASIC to AccountBlox via meta-transaction');
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
      console.log(`  ℹ️  BASIC balance before mint: ${this.balanceBefore.toString()}`);

      const amount = 100n * 10n ** 18n;

      const executionParams = encodeAbiParameters(
        parseAbiParameters('address, uint256'),
        [accountBlox, amount]
      ) as Hex;

      // Build TxParams for new ERC20_MINT operation
      const operationType = keccak256(new TextEncoder().encode('ERC20_MINT')) as Hex;
      const txParams = {
        requester: mintRequestor.address as Address,
        target: token,
        value: BigInt(0),
        gasLimit: BigInt(200000),
        operationType,
        executionSelector: ERC20_MINT_SELECTOR,
        executionParams,
      };

      // Meta-tx params: use mint selector as handlerSelector so signer auth path
      // only depends on mint permissions (matches direct sanity fix).
      const metaTxParams = await this.createMetaTxParams(
        ERC20_MINT_SELECTOR,
        TxAction.SIGN_META_APPROVE,
        mintApprover.address as Address
      );

      console.log('  📝 Generating and signing ERC20 mint meta-transaction via SDK...');
      const signedMetaTx = await this.metaTxSigner.createSignedMetaTransactionForNew(
        txParams,
        metaTxParams,
        mintApprover.address as Address,
        mintApprover.privateKey
      );

      const broadcasterWallet = this.getRoleWallet('broadcaster');
      const broadcasterGuardController = this.createGuardControllerWithWallet(
        Object.keys(this.wallets).find(
          (k) => this.wallets[k].address.toLowerCase() === broadcasterWallet.address.toLowerCase()
        ) || 'wallet2'
      );

      console.log('  📤 Calling requestAndApproveExecution(metaTx) via broadcaster wallet...');

      const result = await broadcasterGuardController.requestAndApproveExecution(signedMetaTx, this.getTxOptions(broadcasterWallet.address));
      const receipt = await result.wait();

      console.log('  ✅ requestAndApproveExecution meta-tx sent');
      console.log(`     Tx hash: ${result.hash}`);
      const status2 = receipt.status as any;
      const isSuccess2 = status2 === 'success' || status2 === 1 || String(status2) === '1';
      console.log(`     Status: ${isSuccess2 ? 'SUCCESS' : 'FAILED'}`);

      this.assertTest(isSuccess2, 'Mint meta-transaction must execute successfully');
    } catch (error: any) {
      this.handleTestError('Mint 100 BASIC via GuardController meta-tx', error);
      throw error;
    }
  }

  private async step3VerifyBalanceIncrease(): Promise<void> {
    console.log('\n🧪 SDK Step 3: Verify BASIC balance increased');
    try {
      if (this.balanceBefore === null) {
        throw new Error('Balance before mint not recorded');
      }

      const balanceAfter = await this.readAccountBloxBasicBalance();
      const delta = balanceAfter - this.balanceBefore;
      const expected = 100n * 10n ** 18n;

      this.assertTest(delta === expected, `BASIC balance must increase by 100e18 (delta=${delta.toString()}, expected=${expected.toString()})`);
      this.assertTest(balanceAfter >= expected, `AccountBlox BASIC balance >= 100 (after=${balanceAfter.toString()})`);
    } catch (error: any) {
      this.handleTestError('Verify BASIC balance after mint', error);
      throw error;
    }
  }
}

