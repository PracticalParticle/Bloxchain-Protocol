/**
 * Base Test Class for GuardController SDK Tests
 * Provides GuardController-specific functionality
 */

import { Address, Hex } from 'viem';
import { GuardController } from '../../../sdk/typescript/contracts/core/GuardController.tsx';
import { RuntimeRBAC } from '../../../sdk/typescript/contracts/core/RuntimeRBAC.tsx';
import AccountBloxABIJson from '../../../sdk/typescript/abi/AccountBlox.abi.json';
import { BaseSDKTest, TestWallet } from '../base/BaseSDKTest.ts';
import { getContractAddressFromArtifacts, getDefinitionAddress } from '../base/test-helpers.ts';
import { getTestConfig } from '../base/test-config.ts';
import { MetaTransactionSigner } from '../../../sdk/typescript/utils/metaTx/metaTransaction.tsx';
import { MetaTransaction, MetaTxParams } from '../../../sdk/typescript/interfaces/lib.index.tsx';
import { TxAction } from '../../../sdk/typescript/types/lib.index.tsx';
import { GuardConfigActionType, GuardConfigAction } from '../../../sdk/typescript/types/core.execution.index.tsx';
import { guardConfigBatchExecutionParams } from '../../../sdk/typescript/lib/definitions/GuardControllerDefinitions';
import { roleConfigBatchExecutionParams } from '../../../sdk/typescript/lib/definitions/RuntimeRBACDefinitions';
import { RoleConfigActionType, RoleConfigAction, FunctionPermission } from '../runtime-rbac/base-test.ts';
import { keccak256, encodeAbiParameters, parseAbiParameters, toBytes } from 'viem';

export interface GuardControllerRoles {
  owner: Address;
  broadcaster: Address;
  recovery: Address;
}

export abstract class BaseGuardControllerTest extends BaseSDKTest {
  protected guardController: GuardController | null = null;
  /** RuntimeRBAC SDK (AccountBlox ABI) for role config batch (mint roles). */
  protected runtimeRBAC: RuntimeRBAC | null = null;
  /** Deployed GuardControllerDefinitions library address (for execution params) */
  protected guardControllerDefinitionsAddress: Address | null = null;
  /** Deployed RuntimeRBACDefinitions library address (for role config batch params) */
  protected runtimeRBACDefinitionsAddress: Address | null = null;
  protected roles: GuardControllerRoles = {
    owner: '0x' as Address,
    broadcaster: '0x' as Address,
    recovery: '0x' as Address,
  };
  protected roleWallets: Record<string, TestWallet> = {};
  protected metaTxSigner: MetaTransactionSigner | null = null;

  // GuardController constants
  protected readonly CONTROLLER_OPERATION_TYPE: Hex = keccak256(new TextEncoder().encode('CONTROLLER_OPERATION')) as Hex;
  protected readonly GUARD_CONFIG_BATCH_META_SELECTOR: Hex = keccak256(
    new TextEncoder().encode('guardConfigBatchRequestAndApprove(((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))')
  ).slice(0, 10) as Hex;
  protected readonly GUARD_CONFIG_BATCH_EXECUTE_SELECTOR: Hex = keccak256(
    new TextEncoder().encode('executeGuardConfigBatch((uint8,bytes)[])')
  ).slice(0, 10) as Hex;
  protected readonly NATIVE_TRANSFER_SELECTOR: Hex = '0xd8cb519d' as Hex; // bytes4(keccak256("__bloxchain_native_transfer__()")) - matches EngineBlox.NATIVE_TRANSFER_SELECTOR

  // Role config batch (for mint flow: create MINT_REQUESTOR, MINT_APPROVER, add function to roles)
  protected readonly ROLE_CONFIG_BATCH_META_SELECTOR: Hex = keccak256(
    toBytes('roleConfigBatchRequestAndApprove(((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))')
  ).slice(0, 10) as Hex;
  protected readonly ROLE_CONFIG_BATCH_EXECUTE_SELECTOR: Hex = keccak256(
    toBytes('executeRoleConfigBatch((uint8,bytes)[])')
  ).slice(0, 10) as Hex;
  protected readonly ROLE_CONFIG_BATCH_OPERATION_TYPE: Hex = keccak256(toBytes('ROLE_CONFIG_BATCH')) as Hex;
  /** requestAndApproveExecution selector (handler for mint meta-approve). */
  protected readonly REQUEST_AND_APPROVE_EXECUTION_SELECTOR: Hex = keccak256(
    toBytes('requestAndApproveExecution(((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))')
  ).slice(0, 10) as Hex;

  constructor(testName: string) {
    super(testName);
  }

  /**
   * Get contract address from artifacts
   */
  protected async getContractAddress(): Promise<Address | null> {
    return getContractAddressFromArtifacts('AccountBlox');
  }

  /**
   * Get contract address from environment (single account contract)
   */
  protected getContractAddressFromEnv(): Address | null {
    const address = getTestConfig().contractAddresses.accountBlox;
    if (!address) {
      throw new Error('ACCOUNTBLOX_ADDRESS not set in environment variables');
    }
    return address as Address;
  }

  /**
   * Initialize GuardController SDK instance
   */
  protected async initializeSDK(): Promise<void> {
    if (!this.contractAddress) {
      throw new Error('Contract address not set');
    }

    this.guardControllerDefinitionsAddress = await getDefinitionAddress('GuardControllerDefinitions');
    this.runtimeRBACDefinitionsAddress = await getDefinitionAddress('RuntimeRBACDefinitions');

    // Create a wallet client for the owner (default)
    const walletClient = this.createWalletClient('wallet1');

    this.guardController = new GuardController(
      this.publicClient,
      walletClient,
      this.contractAddress,
      this.chain
    );
    (this.guardController as any).abi = AccountBloxABIJson;

    this.runtimeRBAC = new RuntimeRBAC(
      this.publicClient,
      walletClient,
      this.contractAddress,
      this.chain
    );
    (this.runtimeRBAC as any).abi = AccountBloxABIJson;

    console.log('✅ GuardController SDK initialized');
  }

  /**
   * Discover role assignments from contract
   */
  protected async discoverRoleAssignments(): Promise<void> {
    if (!this.guardController) {
      throw new Error('GuardController SDK not initialized');
    }

    try {
      this.roles.owner = await this.guardController.owner();
      const broadcasters = await this.guardController.getBroadcasters();
      if (!broadcasters || broadcasters.length === 0) {
        throw new Error('No broadcasters configured on contract');
      }
      this.roles.broadcaster = broadcasters[0]; // Use primary broadcaster
      this.roles.recovery = await this.guardController.getRecovery();

      console.log('📋 DISCOVERED ROLE ASSIGNMENTS:');
      console.log(`  👑 Owner: ${this.roles.owner}`);
      console.log(`  📡 Broadcaster: ${this.roles.broadcaster}`);
      console.log(`  🛡️ Recovery: ${this.roles.recovery}`);

      // Map roles to available wallets
      for (const [walletName, wallet] of Object.entries(this.wallets)) {
        if (wallet.address.toLowerCase() === this.roles.owner.toLowerCase()) {
          this.roleWallets.owner = wallet;
          console.log(`  🔑 Owner role served by: ${walletName} (${wallet.address})`);
        }
        if (wallet.address.toLowerCase() === this.roles.broadcaster.toLowerCase()) {
          this.roleWallets.broadcaster = wallet;
          console.log(`  🔑 Broadcaster role served by: ${walletName} (${wallet.address})`);
        }
        if (wallet.address.toLowerCase() === this.roles.recovery.toLowerCase()) {
          this.roleWallets.recovery = wallet;
          console.log(`  🔑 Recovery role served by: ${walletName} (${wallet.address})`);
        }
      }
    } catch (error: any) {
      console.error('❌ Failed to discover role assignments:', error.message);
      throw new Error(`Role discovery failed: ${error.message}`);
    }
  }

  /**
   * Get wallet for a specific role
   */
  protected getRoleWallet(roleName: 'owner' | 'broadcaster' | 'recovery'): TestWallet {
    const wallet = this.roleWallets[roleName.toLowerCase()];
    if (!wallet) {
      throw new Error(`No wallet found for role: ${roleName}`);
    }
    return wallet;
  }

  /**
   * Create GuardController instance with specific wallet
   */
  protected createGuardControllerWithWallet(walletName: string): GuardController {
    if (!this.contractAddress) {
      throw new Error('Contract address not set');
    }

    const walletClient = this.createWalletClient(walletName);
    return new GuardController(
      this.publicClient,
      walletClient,
      this.contractAddress,
      this.chain
    );
  }

  /**
   * Override initialize to include SDK initialization
   */
  async initialize(): Promise<void> {
    await super.initialize();
    await this.initializeSDK();
    await this.discoverRoleAssignments();
    await this.initializeMetaTxSigner();
  }

  /**
   * Initialize MetaTransactionSigner for EIP-712 signing
   */
  protected async initializeMetaTxSigner(): Promise<void> {
    if (!this.contractAddress) {
      throw new Error('Contract address not set');
    }

    // Use a wallet client for signing (owner wallet by default)
    const ownerWallet = this.getRoleWallet('owner');
    const ownerWalletName = Object.keys(this.wallets).find(
      (k) => this.wallets[k].address.toLowerCase() === ownerWallet.address.toLowerCase()
    ) || 'wallet1';
    
    const walletClient = this.createWalletClient(ownerWalletName);
    this.metaTxSigner = new MetaTransactionSigner(
      this.publicClient,
      walletClient,
      this.contractAddress,
      this.chain
    );
  }

  /**
   * Create meta-transaction parameters for a function
   */
  protected async createMetaTxParams(
    handlerSelector: Hex,
    action: TxAction,
    signerAddress: Address,
    deadlineSeconds: number = 3600
  ): Promise<MetaTxParams> {
    if (!this.guardController) {
      throw new Error('GuardController SDK not initialized');
    }

    const deadline = BigInt(deadlineSeconds);
    const maxGasPrice = BigInt(0);

    return await this.guardController.createMetaTxParams(
      this.contractAddress!,
      handlerSelector,
      action,
      deadline,
      maxGasPrice,
      signerAddress
    );
  }

  /**
   * Encode guard config action data
   */
  protected encodeGuardConfigAction(
    actionType: GuardConfigActionType,
    data: {
      functionSelector?: Hex;
      target?: Address;
      isAdd?: boolean;
      functionSignature?: string;
      operationName?: string;
      supportedActions?: number[];
      safeRemoval?: boolean;
    }
  ): Hex {
    switch (actionType) {
      case GuardConfigActionType.ADD_TARGET_TO_WHITELIST:
      case GuardConfigActionType.REMOVE_TARGET_FROM_WHITELIST:
        if (!data.functionSelector || !data.target) {
          throw new Error('Missing required data for whitelist action');
        }
        return encodeAbiParameters(
          parseAbiParameters('bytes4, address'),
          [data.functionSelector, data.target]
        ) as Hex;

      case GuardConfigActionType.REGISTER_FUNCTION:
        if (!data.functionSignature || !data.operationName || !data.supportedActions) {
          throw new Error('Missing required data for register function action');
        }
        return encodeAbiParameters(
          parseAbiParameters('string, string, uint8[]'),
          [data.functionSignature, data.operationName, data.supportedActions]
        ) as Hex;

      case GuardConfigActionType.UNREGISTER_FUNCTION:
        if (!data.functionSelector || data.safeRemoval === undefined) {
          throw new Error('Missing required data for unregister function action');
        }
        return encodeAbiParameters(
          parseAbiParameters('bytes4, bool'),
          [data.functionSelector, data.safeRemoval]
        ) as Hex;

      default:
        throw new Error(`Unknown action type: ${actionType}`);
    }
  }

  /**
   * Create and sign a meta-transaction for guard config batch (whitelist update)
   */
  protected async createSignedMetaTxForWhitelistUpdate(
    functionSelector: Hex,
    target: Address,
    isAdd: boolean,
    signerWalletName: string
  ): Promise<MetaTransaction> {
    if (!this.metaTxSigner || !this.guardController) {
      throw new Error('MetaTransactionSigner or GuardController not initialized');
    }

    const signerWallet = this.wallets[signerWalletName];
    if (!signerWallet) {
      throw new Error(`Wallet not found: ${signerWalletName}`);
    }

    // Create guard config action
    const actionType = isAdd 
      ? GuardConfigActionType.ADD_TARGET_TO_WHITELIST 
      : GuardConfigActionType.REMOVE_TARGET_FROM_WHITELIST;
    
    const actionData = this.encodeGuardConfigAction(actionType, {
      functionSelector,
      target,
      isAdd,
    });

    const actions: GuardConfigAction[] = [
      {
        actionType,
        data: actionData,
      },
    ];

    // Get execution params using the new batch method (via definition contract)
    if (!this.guardControllerDefinitionsAddress) {
      throw new Error('GuardControllerDefinitions address not set');
    }
    console.log(`    📋 Getting execution params for guard config batch...`);
    const executionParams = await guardConfigBatchExecutionParams(this.publicClient, this.guardControllerDefinitionsAddress!, actions);
    console.log(`    ✅ Execution params obtained`);

    // Create meta-tx params
    console.log(`    📋 Creating meta-transaction parameters...`);
    console.log(`       Handler Selector: ${this.GUARD_CONFIG_BATCH_META_SELECTOR}`);
    console.log(`       Action: ${TxAction.SIGN_META_REQUEST_AND_APPROVE}`);
    console.log(`       Signer: ${signerWallet.address}`);
    
    const metaTxParams = await this.createMetaTxParams(
      this.GUARD_CONFIG_BATCH_META_SELECTOR,
      TxAction.SIGN_META_REQUEST_AND_APPROVE,
      signerWallet.address
    );
    
    console.log(`    ✅ Meta-transaction parameters created:`);
    console.log(`       Nonce: ${metaTxParams.nonce}`);
    console.log(`       Chain ID: ${metaTxParams.chainId}`);
    console.log(`       Deadline: ${metaTxParams.deadline}`);

    // Create TxParams for the new transaction
    const txParams = {
      requester: signerWallet.address,
      target: this.contractAddress!,
      value: BigInt(0),
      gasLimit: BigInt(200000),
      operationType: this.CONTROLLER_OPERATION_TYPE,
      executionSelector: this.GUARD_CONFIG_BATCH_EXECUTE_SELECTOR,
      executionParams: executionParams
    };

    // Generate unsigned meta-transaction
    console.log(`    📋 Generating unsigned meta-transaction for guard config batch...`);
    const unsignedMetaTx = await this.metaTxSigner.createUnsignedMetaTransactionForNew(
      txParams,
      metaTxParams
    );
    console.log(`    ✅ Unsigned meta-transaction generated`);

    // Sign the meta-transaction
    const signedMetaTx = await this.metaTxSigner.signMetaTransaction(
      unsignedMetaTx,
      signerWallet.address,
      signerWallet.privateKey
    );

    return signedMetaTx;
  }

  /**
   * Create and sign a meta-transaction for guard config batch (function registration)
   */
  protected async createSignedMetaTxForFunctionRegistration(
    functionSignature: string,
    operationName: string,
    supportedActions: number[],
    signerWalletName: string
  ): Promise<MetaTransaction> {
    if (!this.metaTxSigner || !this.guardController) {
      throw new Error('MetaTransactionSigner or GuardController not initialized');
    }

    const signerWallet = this.wallets[signerWalletName];
    if (!signerWallet) {
      throw new Error(`Wallet not found: ${signerWalletName}`);
    }

    // Create guard config action for function registration
    const actionData = this.encodeGuardConfigAction(GuardConfigActionType.REGISTER_FUNCTION, {
      functionSignature,
      operationName,
      supportedActions,
    });

    const actions: GuardConfigAction[] = [
      {
        actionType: GuardConfigActionType.REGISTER_FUNCTION,
        data: actionData,
      },
    ];

    // Get execution params using the new batch method (via definition contract)
    if (!this.guardControllerDefinitionsAddress) {
      throw new Error('GuardControllerDefinitions address not set');
    }
    console.log(`    📋 Getting execution params for guard config batch (function registration)...`);
    const executionParams = await guardConfigBatchExecutionParams(this.publicClient, this.guardControllerDefinitionsAddress!, actions);
    console.log(`    ✅ Execution params obtained`);

    // Create meta-tx params
    console.log(`    📋 Creating meta-transaction parameters...`);
    console.log(`       Handler Selector: ${this.GUARD_CONFIG_BATCH_META_SELECTOR}`);
    console.log(`       Action: ${TxAction.SIGN_META_REQUEST_AND_APPROVE}`);
    console.log(`       Signer: ${signerWallet.address}`);
    
    const metaTxParams = await this.createMetaTxParams(
      this.GUARD_CONFIG_BATCH_META_SELECTOR,
      TxAction.SIGN_META_REQUEST_AND_APPROVE,
      signerWallet.address
    );
    
    console.log(`    ✅ Meta-transaction parameters created:`);
    console.log(`       Nonce: ${metaTxParams.nonce}`);
    console.log(`       Chain ID: ${metaTxParams.chainId}`);
    console.log(`       Deadline: ${metaTxParams.deadline}`);

    // Create TxParams for the new transaction
    const txParams = {
      requester: signerWallet.address,
      target: this.contractAddress!,
      value: BigInt(0),
      gasLimit: BigInt(200000),
      operationType: this.CONTROLLER_OPERATION_TYPE,
      executionSelector: this.GUARD_CONFIG_BATCH_EXECUTE_SELECTOR,
      executionParams: executionParams
    };

    // Generate unsigned meta-transaction
    console.log(`    📋 Generating unsigned meta-transaction for guard config batch...`);
    const unsignedMetaTx = await this.metaTxSigner.createUnsignedMetaTransactionForNew(
      txParams,
      metaTxParams
    );
    console.log(`    ✅ Unsigned meta-transaction generated`);

    // Sign the meta-transaction
    const signedMetaTx = await this.metaTxSigner.signMetaTransaction(
      unsignedMetaTx,
      signerWallet.address,
      signerWallet.privateKey
    );

    return signedMetaTx;
  }

  /**
   * Get role hash from role name (must match contract keccak256(roleName))
   */
  protected getRoleHash(roleName: string): Hex {
    return keccak256(toBytes(roleName)) as Hex;
  }

  /**
   * Check if role exists (for mint flow setup).
   */
  protected async roleExists(roleHash: Hex): Promise<boolean> {
    if (!this.runtimeRBAC) return false;
    try {
      const role = await this.runtimeRBAC.getRole(roleHash);
      const h = (role as any).roleHashReturn ?? (role as any).roleHash;
      return !!h && String(h).toLowerCase() !== '0x0000000000000000000000000000000000000000000000000000000000000000';
    } catch {
      return false;
    }
  }

  protected createBitmapFromActions(actions: TxAction[]): number {
    let bitmap = 0;
    for (const action of actions) bitmap |= 1 << action;
    return bitmap;
  }

  protected createFunctionPermission(
    functionSelector: Hex,
    actions: TxAction[],
    handlerForSelectors: Hex[] | null = null
  ): FunctionPermission {
    return {
      functionSelector,
      grantedActionsBitmap: this.createBitmapFromActions(actions),
      handlerForSelectors: handlerForSelectors ?? [functionSelector],
    };
  }

  protected encodeRoleConfigAction(actionType: RoleConfigActionType, data: any): RoleConfigAction {
    let encodedData: Hex;
    switch (actionType) {
      case RoleConfigActionType.CREATE_ROLE:
        encodedData = encodeAbiParameters(
          parseAbiParameters('string, uint256'),
          [data.roleName, BigInt(data.maxWallets)]
        ) as Hex;
        break;
      case RoleConfigActionType.ADD_WALLET:
        encodedData = encodeAbiParameters(
          parseAbiParameters('bytes32, address'),
          [data.roleHash, data.wallet]
        ) as Hex;
        break;
      case RoleConfigActionType.ADD_FUNCTION_TO_ROLE:
        encodedData = encodeAbiParameters(
          parseAbiParameters('bytes32, (bytes4, uint16, bytes4[])'),
          [
            data.roleHash,
            [
              data.functionPermission.functionSelector,
              data.functionPermission.grantedActionsBitmap,
              data.functionPermission.handlerForSelectors ?? [data.functionPermission.functionSelector],
            ] as [Hex, number, Hex[]],
          ]
        ) as Hex;
        break;
      default:
        throw new Error(`Unsupported role config action type: ${actionType}`);
    }
    return { actionType, data: encodedData };
  }

  protected async createRoleConfigBatchMetaTx(
    actions: RoleConfigAction[],
    signerWalletName: string
  ): Promise<MetaTransaction> {
    if (!this.metaTxSigner || !this.runtimeRBAC || !this.runtimeRBACDefinitionsAddress) {
      throw new Error('MetaTransactionSigner or RuntimeRBAC not initialized');
    }
    const signerWallet = this.wallets[signerWalletName];
    if (!signerWallet) throw new Error(`Wallet not found: ${signerWalletName}`);

    const executionParams = await roleConfigBatchExecutionParams(
      this.publicClient,
      this.runtimeRBACDefinitionsAddress,
      actions
    );
    const metaTxParams = await this.guardController!.createMetaTxParams(
      this.contractAddress!,
      this.ROLE_CONFIG_BATCH_META_SELECTOR,
      TxAction.SIGN_META_REQUEST_AND_APPROVE,
      BigInt(3600),
      BigInt(0),
      signerWallet.address
    );
    const txParams = {
      requester: signerWallet.address,
      target: this.contractAddress!,
      value: BigInt(0),
      gasLimit: BigInt(0),
      operationType: this.ROLE_CONFIG_BATCH_OPERATION_TYPE,
      executionSelector: this.ROLE_CONFIG_BATCH_EXECUTE_SELECTOR,
      executionParams,
    };
    const unsignedMetaTx = await this.metaTxSigner.createUnsignedMetaTransactionForNew(txParams, metaTxParams);
    const signedMetaTx = await this.metaTxSigner.signMetaTransaction(
      unsignedMetaTx,
      signerWallet.address,
      signerWallet.privateKey
    );
    return {
      txRecord: signedMetaTx.txRecord,
      params: signedMetaTx.params,
      message: signedMetaTx.message,
      signature: signedMetaTx.signature,
      data: signedMetaTx.data ?? ('0x' as Hex),
    };
  }

  protected async executeRoleConfigBatch(
    actions: RoleConfigAction[],
    signerWalletName: string,
    broadcasterWalletName: string
  ): Promise<any> {
    if (!this.runtimeRBAC) throw new Error('RuntimeRBAC SDK not initialized');
    const signedMetaTx = await this.createRoleConfigBatchMetaTx(actions, signerWalletName);
    const broadcasterWallet = this.wallets[broadcasterWalletName];
    if (!broadcasterWallet) throw new Error(`Broadcaster wallet not found: ${broadcasterWalletName}`);
    const broadcasterRuntimeRBAC = this.createRuntimeRBACWithWallet(broadcasterWalletName);
    return broadcasterRuntimeRBAC.roleConfigBatchRequestAndApprove(signedMetaTx, this.getTxOptions(broadcasterWallet.address));
  }

  protected createRuntimeRBACWithWallet(walletName: string): RuntimeRBAC {
    if (!this.contractAddress) throw new Error('Contract address not set');
    const walletClient = this.createWalletClient(walletName);
    const rbac = new RuntimeRBAC(
      this.publicClient,
      walletClient,
      this.contractAddress,
      this.chain
    );
    (rbac as any).abi = AccountBloxABIJson;
    return rbac;
  }

  /**
   * Decode error selector from transaction result (revert data)
   */
  protected decodeErrorSelector(result: any): string | null {
    if (!result) return null;
    let resultStr = '';
    if (typeof result === 'string') {
      resultStr = result.startsWith('0x') ? result : `0x${result}`;
    } else if (result instanceof Uint8Array) {
      resultStr = '0x' + Array.from(result).map((b) => b.toString(16).padStart(2, '0')).join('');
    } else {
      return null;
    }
    if (resultStr.length < 10) return null;
    return resultStr.slice(0, 10);
  }

  /**
   * Get error name from error selector
   */
  protected getErrorName(errorSelector: string): string {
    const errorMap: Record<string, string> = {
      '0x430fab94': 'ResourceAlreadyExists',
      '0x474d3baf': 'ResourceNotFound',
      '0x3b94fe24': 'SignerNotAuthorized',
      '0xf37a3442': 'NoPermission',
      '0xc26028e0': 'InvalidOperation',
      '0x6e8eb7bc': 'ResourceNotFound',
      '0x7a6318f1': 'ItemNotFound',
      '0x0da9443d': 'ItemAlreadyExists',
      '0xf438c55f': 'InvalidOperation',
      '0xa0387940': 'NotSupported',
      '0x405c16b9': 'ConflictingMetaTxPermissions',
      '0xee809d50': 'CannotModifyProtected',
    };
    return errorMap[errorSelector.toLowerCase()] || `Unknown(${errorSelector})`;
  }

  /**
   * Extract transaction ID from receipt by decoding TransactionEvent (same state machine as runtime-rbac).
   */
  protected extractTxIdFromReceipt(receipt: any): bigint | null {
    if (!receipt?.logs?.length) return null;
    const eventSignature = keccak256(toBytes('TransactionEvent(uint256,bytes4,uint8,address,address,bytes32)')) as Hex;
    for (const log of receipt.logs) {
      if (log.topics?.[0] === eventSignature && log.topics.length >= 2) {
        const txId = BigInt(log.topics[1]);
        console.log(`  📋 Extracted txId from TransactionEvent: ${txId}`);
        return txId;
      }
    }
    return null;
  }

  /**
   * Get transaction record from contract (GuardController/AccountBlox has getTransaction).
   * getTransaction requires _validateAnyRole(), so we use the owner wallet for the read.
   */
  protected async getGuardTransactionRecord(txId: bigint): Promise<any> {
    if (!this.guardController || !this.contractAddress) throw new Error('GuardController not initialized');
    const ownerWallet = this.getRoleWallet('owner');
    const ownerWalletName =
      Object.keys(this.wallets).find(
        (k) => this.wallets[k].address.toLowerCase() === ownerWallet.address.toLowerCase()
      ) ?? 'wallet1';
    const clientWithRole = this.createGuardControllerWithWallet(ownerWalletName);
    try {
      return await clientWithRole.getTransaction(txId);
    } catch (e: any) {
      console.log(`  ⚠️  Could not get transaction record: ${e?.message}`);
      return null;
    }
  }

  /**
   * Assert guard config batch succeeded by checking tx record status (5 = COMPLETED, 6 = FAILED).
   * Call after guardConfigBatchRequestAndApprove + result.wait(). Throws with decoded revert reason if status 6.
   */
  protected async assertGuardConfigBatchSucceeded(receipt: any, operationName: string): Promise<void> {
    const txId = this.extractTxIdFromReceipt(receipt);
    if (txId == null) {
      console.log(`  ⚠️  No txId in receipt for ${operationName}; skipping tx-record status check`);
      return;
    }
    const txRecord = await this.getGuardTransactionRecord(txId);
    if (!txRecord) {
      throw new Error(`${operationName}: could not get transaction record for txId ${txId}`);
    }
    const status =
      typeof txRecord.status === 'bigint'
        ? Number(txRecord.status)
        : typeof txRecord.status === 'string'
          ? parseInt(txRecord.status, 10)
          : txRecord.status;
    console.log(`  📋 Guard config tx record status: ${status} (5=COMPLETED, 6=FAILED)`);
    if (status === 6) {
      const result = txRecord.result ?? '0x';
      const resultHex =
        typeof result === 'string'
          ? result
          : result && typeof result === 'object' && 'length' in result
            ? '0x' + Array.from(new Uint8Array(result as ArrayBuffer)).map((b) => b.toString(16).padStart(2, '0')).join('')
            : String(result);
      const errorSelector = this.decodeErrorSelector(result);
      const errorName = errorSelector ? this.getErrorName(errorSelector) : 'Unknown';
      console.log(`  🔍 Revert selector: ${errorSelector ?? 'none'} (${errorName})`);
      if (!errorSelector || errorName.startsWith('Unknown')) {
        console.log(`  🔍 Raw revert data (first 66 chars): ${resultHex.slice(0, 66)}`);
      }
      throw new Error(
        `Guard config batch failed (TxStatus 6) for ${operationName}. Revert: ${errorName}`
      );
    }
    if (status !== 5) {
      throw new Error(
        `Guard config batch did not complete for ${operationName}. Status: ${status} (expected 5)`
      );
    }
    console.log(`  ✅ Guard config batch completed (status 5) for ${operationName}`);
  }
}
