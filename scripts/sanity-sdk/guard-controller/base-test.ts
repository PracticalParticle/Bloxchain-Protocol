/**
 * Base Test Class for GuardController SDK Tests
 * Provides GuardController-specific functionality
 */

import { Address, Hex } from 'viem';
import { GuardController } from '../../../sdk/typescript/contracts/core/GuardController.tsx';
import { BaseSDKTest, TestWallet } from '../base/BaseSDKTest.ts';
import { getContractAddressFromArtifacts, getDefinitionAddress } from '../base/test-helpers.ts';
import { getTestConfig } from '../base/test-config.ts';
import { MetaTransactionSigner } from '../../../sdk/typescript/utils/metaTx/metaTransaction.tsx';
import { MetaTransaction, MetaTxParams } from '../../../sdk/typescript/interfaces/lib.index.tsx';
import { TxAction } from '../../../sdk/typescript/types/lib.index.tsx';
import { GuardConfigActionType, GuardConfigAction } from '../../../sdk/typescript/types/core.execution.index.tsx';
import { guardConfigBatchExecutionParams } from '../../../sdk/typescript/lib/definitions/GuardControllerDefinitions';
import { keccak256, encodeAbiParameters, parseAbiParameters } from 'viem';

export interface GuardControllerRoles {
  owner: Address;
  broadcaster: Address;
  recovery: Address;
}

export abstract class BaseGuardControllerTest extends BaseSDKTest {
  protected guardController: GuardController | null = null;
  /** Deployed GuardControllerDefinitions library address (for execution params) */
  protected guardControllerDefinitionsAddress: Address | null = null;
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

    // Create a wallet client for the owner (default)
    const walletClient = this.createWalletClient('wallet1');

    this.guardController = new GuardController(
      this.publicClient,
      walletClient,
      this.contractAddress,
      this.chain
    );

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
   * Get role hash from role name
   */
  protected getRoleHash(roleName: string): Hex {
    return keccak256(new TextEncoder().encode(roleName)) as Hex;
  }

  /**
   * Decode error selector from transaction result
   */
  protected decodeErrorSelector(result: any): string | null {
    if (!result || typeof result !== 'string') {
      return null;
    }
    const resultStr = result.startsWith('0x') ? result : `0x${result}`;
    if (resultStr.length < 10) {
      return null;
    }
    const errorSelector = resultStr.slice(0, 10);
    return errorSelector;
  }

  /**
   * Get error name from error selector
   */
  protected getErrorName(errorSelector: string): string {
    // Common error selectors (calculated from keccak256 of error signature)
    const errorMap: Record<string, string> = {
      '0x430fab94': 'ResourceAlreadyExists',
      '0x474d3baf': 'ResourceNotFound',
      '0x3b94fe24': 'SignerNotAuthorized',
      '0xf37a3442': 'NoPermission',
      '0xc26028e0': 'InvalidOperation',
      '0x6e8eb7bc': 'ResourceNotFound', // Alternative selector
      '0x7a6318f1': 'ItemNotFound',
      '0x0da9443d': 'ItemAlreadyExists',
      '0xf438c55f': 'InvalidOperation',
      '0xa0387940': 'NotSupported',
      '0x405c16b9': 'ConflictingMetaTxPermissions',
      '0xee809d50': 'CannotModifyProtected',
    };

    return errorMap[errorSelector.toLowerCase()] || `Unknown(${errorSelector})`;
  }
}
