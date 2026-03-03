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
import { keccak256, encodeAbiParameters, parseAbiParameters, decodeErrorResult, stringToHex, bytesToHex } from 'viem';

import { BaseGuardControllerTest } from './base-test.ts';
import { TxAction } from '../../../sdk/typescript/types/lib.index.tsx';
import { RoleConfigActionType } from '../runtime-rbac/base-test.ts';
import { extractErrorInfo } from '../../../sdk/typescript/utils/contract-errors.ts';

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

      // CJS-style pre-check: getFunctionSchema + getSupportedFunctions (scripts/sanity/guard-controller)
      if (await this.schemaOrSupportedSetPreCheck(ERC20_MINT_SELECTOR)) {
        console.log('  ℹ️  mint(address,uint256) schema already registered (getFunctionSchema or getSupportedFunctions); skipping');
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
        this.getTxOptions(broadcasterWallet.address)
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

  /**
   * Mint 100 BASIC to AccountBlox via requestAndApproveExecution.
   * Flow mirrors sanity direct (100% working reference):
   *   scripts/sanity/guard-controller/erc20-mint-controller-tests.cjs (testStep5MintFlow)
   * Run CJS on same RPC to compare: node scripts/sanity/guard-controller/run-tests.cjs --erc20-mint-controller
   */
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

      // Build TxParams for new ERC20_MINT operation (match CJS: web3.utils.keccak256('ERC20_MINT'))
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

      // Meta-tx params: match CJS createExternalExecutionMetaTx (handlerContract=AccountBlox,
      // handlerSelector=executionSelector=mint, action=SIGN_META_APPROVE, deadline=3600, maxGasPrice=0).
      const metaTxParams = await this.createMetaTxParams(
        ERC20_MINT_SELECTOR,
        TxAction.SIGN_META_APPROVE,
        mintApprover.address as Address,
        3600
      );

      // Flow mirrors sanity direct: scripts/sanity/guard-controller/erc20-mint-controller-tests.cjs
      // testStep5MintFlow (createExternalExecutionMetaTx → signMetaTransaction → requestAndApproveExecution).
      // Reference: run "node scripts/sanity/guard-controller/erc20-mint-controller-tests.cjs" on same RPC to compare.
      console.log('  📋 Generating unsigned meta-transaction from contract (nonce + txRecord)...');
      const unsignedMetaTx = await this.metaTxSigner.createUnsignedMetaTransactionForNew(txParams, metaTxParams);
      console.log('  🔐 Signing meta-transaction...');
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
      this.logRevertReason(error);
      this.handleTestError('Mint 100 BASIC via GuardController meta-tx', error);
      throw error;
    }
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
      return v as string;
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
    return {
      ...metaTx,
      message: messageHex ?? metaTx.message,
      signature: toHex(metaTx.signature),
      data: toHex(metaTx.data),
      txRecord: {
        ...metaTx.txRecord,
        message: metaTx.txRecord?.message != null ? toHex(metaTx.txRecord.message) : metaTx.txRecord?.message,
        params: metaTx.txRecord?.params
          ? {
              ...metaTx.txRecord.params,
              executionParams: toHex(metaTx.txRecord.params.executionParams),
            }
          : metaTx.txRecord?.params,
        result: metaTx.txRecord?.result != null ? toHex(metaTx.txRecord.result) : metaTx.txRecord?.result,
      },
    };
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

