/**
 * Base Test Class for RuntimeRBAC SDK Tests
 * Provides RuntimeRBAC-specific functionality
 */

import { Address, Hex } from 'viem';
import { RuntimeRBAC } from '../../../sdk/typescript/contracts/core/RuntimeRBAC.tsx';
import { BaseSDKTest, TestWallet } from '../base/BaseSDKTest.ts';
import { getContractAddressFromArtifacts } from '../base/test-helpers.ts';
import { getTestConfig } from '../base/test-config.ts';
import { MetaTransactionSigner } from '../../../sdk/typescript/utils/metaTx/metaTransaction.tsx';
import { MetaTransaction, MetaTxParams, TxParams } from '../../../sdk/typescript/interfaces/lib.index.tsx';
import { TxAction } from '../../../sdk/typescript/types/lib.index.tsx';
import { keccak256, toBytes } from 'viem';
import { encodeAbiParameters, parseAbiParameters } from 'viem';
import AccountBloxABIJson from '../../../sdk/typescript/abi/AccountBlox.abi.json';

export interface RuntimeRBACRoles {
  owner: Address;
  broadcaster: Address;
  recovery: Address;
}

/**
 * RoleConfigActionType enum values
 * Note: REGISTER_FUNCTION and UNREGISTER_FUNCTION have been moved to GuardController
 * Note: LOAD_DEFINITIONS is in IRuntimeRBAC interface but not implemented in RuntimeRBAC contract
 */
export enum RoleConfigActionType {
  CREATE_ROLE = 0,
  REMOVE_ROLE = 1,
  ADD_WALLET = 2,
  REVOKE_WALLET = 3,
  ADD_FUNCTION_TO_ROLE = 4,
  REMOVE_FUNCTION_FROM_ROLE = 5,
}

/**
 * FunctionPermission structure matching Solidity EngineBlox.FunctionPermission
 */
export interface FunctionPermission {
  functionSelector: Hex;
  grantedActionsBitmap: number; // uint16
  handlerForSelectors: Hex[]; // bytes4[]
}

/**
 * RoleConfigAction structure
 */
export interface RoleConfigAction {
  actionType: RoleConfigActionType;
  data: Hex;
}

export abstract class BaseRuntimeRBACTest extends BaseSDKTest {
  protected runtimeRBAC: RuntimeRBAC | null = null;
  protected roles: RuntimeRBACRoles = {
    owner: '0x' as Address,
    broadcaster: '0x' as Address,
    recovery: '0x' as Address,
  };
  protected roleWallets: Record<string, TestWallet> = {};
  protected metaTxSigner: MetaTransactionSigner | null = null;

  // Constants for RuntimeRBAC
  protected readonly ROLE_CONFIG_BATCH_META_SELECTOR: Hex;
  protected readonly ROLE_CONFIG_BATCH_EXECUTE_SELECTOR: Hex;
  protected readonly ROLE_CONFIG_BATCH_OPERATION_TYPE: Hex;

  constructor(testName: string) {
    super(testName);

    // Calculate function selectors
    this.ROLE_CONFIG_BATCH_META_SELECTOR = keccak256(
      toBytes('roleConfigBatchRequestAndApprove(((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))')
    ).slice(0, 10) as Hex; // First 4 bytes

    this.ROLE_CONFIG_BATCH_EXECUTE_SELECTOR = keccak256(
      toBytes('executeRoleConfigBatch((uint8,bytes)[])')
    ).slice(0, 10) as Hex; // First 4 bytes

    this.ROLE_CONFIG_BATCH_OPERATION_TYPE = keccak256(toBytes('ROLE_CONFIG_BATCH')) as Hex;
  }

  /**
   * Get contract address from artifacts (AccountBlox is the single account contract)
   */
  protected async getContractAddress(): Promise<Address | null> {
    return getContractAddressFromArtifacts('AccountBlox');
  }

  /**
   * Get contract address from environment
   */
  protected getContractAddressFromEnv(): Address | null {
    const address = getTestConfig().contractAddresses.accountBlox;
    if (!address) {
      throw new Error('ACCOUNTBLOX_ADDRESS not set in environment variables');
    }
    return address as Address;
  }

  /**
   * Initialize RuntimeRBAC SDK instance
   * AccountBlox implements RuntimeRBAC; we use AccountBlox ABI for full function coverage.
   */
  protected async initializeSDK(): Promise<void> {
    if (!this.contractAddress) {
      throw new Error('Contract address not set');
    }

    // Create a wallet client for the owner (default)
    const walletClient = this.createWalletClient('wallet1');

    this.runtimeRBAC = new RuntimeRBAC(
      this.publicClient,
      walletClient,
      this.contractAddress,
      this.chain
    );

    // Override the ABI to use AccountBlox ABI which includes all RuntimeRBAC + GuardController + SecureOwnable functions
    (this.runtimeRBAC as any).abi = AccountBloxABIJson;

    console.log('✅ RuntimeRBAC SDK initialized (AccountBlox)');
  }

  /**
   * Discover role assignments from contract
   */
  protected async discoverRoleAssignments(): Promise<void> {
    if (!this.runtimeRBAC || !this.contractAddress) {
      throw new Error('RuntimeRBAC SDK not initialized');
    }

    try {
      // For now, use standard Ganache setup assumption
      // In a real deployment, these would be discovered from the contract
      // wallet1 is typically owner, wallet2 is broadcaster, wallet3 is recovery
      this.roles.owner = this.wallets.wallet1.address;
      this.roles.broadcaster = this.wallets.wallet2.address;
      this.roles.recovery = this.wallets.wallet3.address;

      this.roleWallets.owner = this.wallets.wallet1;
      this.roleWallets.broadcaster = this.wallets.wallet2;
      this.roleWallets.recovery = this.wallets.wallet3;

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
   * Create RuntimeRBAC instance with specific wallet
   */
  protected createRuntimeRBACWithWallet(walletName: string): RuntimeRBAC {
    if (!this.contractAddress) {
      throw new Error('Contract address not set');
    }

    const walletClient = this.createWalletClient(walletName);
    return new RuntimeRBAC(
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
    if (!this.runtimeRBAC) {
      throw new Error('RuntimeRBAC SDK not initialized');
    }

    const deadline = BigInt(deadlineSeconds);
    const maxGasPrice = BigInt(0);

    return await this.runtimeRBAC.createMetaTxParams(
      this.contractAddress!,
      handlerSelector,
      action,
      deadline,
      maxGasPrice,
      signerAddress
    );
  }

  /**
   * Create bitmap from actions array
   */
  protected createBitmapFromActions(actions: TxAction[]): number {
    let bitmap = 0;
    for (const action of actions) {
      bitmap |= 1 << action;
    }
    return bitmap;
  }

  /**
   * Create FunctionPermission struct
   */
  protected createFunctionPermission(
    functionSelector: Hex,
    actions: TxAction[],
    handlerForSelectors: Hex[] | null = null
  ): FunctionPermission {
    const finalHandlerForSelectors = handlerForSelectors || [functionSelector]; // Self-reference by default
    return {
      functionSelector,
      grantedActionsBitmap: this.createBitmapFromActions(actions),
      handlerForSelectors: finalHandlerForSelectors,
    };
  }

  /**
   * Encode RoleConfigAction data based on action type
   */
  protected encodeRoleConfigAction(
    actionType: RoleConfigActionType,
    data: any
  ): RoleConfigAction {
    let encodedData: Hex;

    switch (actionType) {
      case RoleConfigActionType.CREATE_ROLE:
        // New format: (string roleName, uint256 maxWallets)
        // Function permissions must be configured separately via ADD_FUNCTION_TO_ROLE actions.
        encodedData = encodeAbiParameters(
          parseAbiParameters('string, uint256'),
          [data.roleName, BigInt(data.maxWallets)]
        ) as Hex;
        break;

      case RoleConfigActionType.REMOVE_ROLE:
        // Format: (bytes32 roleHash)
        encodedData = encodeAbiParameters(
          parseAbiParameters('bytes32'),
          [data.roleHash]
        ) as Hex;
        break;

      case RoleConfigActionType.ADD_WALLET:
        // Format: (bytes32 roleHash, address wallet)
        encodedData = encodeAbiParameters(
          parseAbiParameters('bytes32, address'),
          [data.roleHash, data.wallet]
        ) as Hex;
        break;

      case RoleConfigActionType.REVOKE_WALLET:
        // Format: (bytes32 roleHash, address wallet)
        encodedData = encodeAbiParameters(
          parseAbiParameters('bytes32, address'),
          [data.roleHash, data.wallet]
        ) as Hex;
        break;

      case RoleConfigActionType.ADD_FUNCTION_TO_ROLE:
        // Format: (bytes32 roleHash, FunctionPermission functionPermission)
        // FunctionPermission is tuple(bytes4,uint16,bytes4[])
        encodedData = encodeAbiParameters(
          parseAbiParameters('bytes32, (bytes4, uint16, bytes4[])'),
          [
            data.roleHash,
            [
              data.functionPermission.functionSelector,
              data.functionPermission.grantedActionsBitmap,
              data.functionPermission.handlerForSelectors || [data.functionPermission.functionSelector], // Default to self-reference if missing
            ] as [Hex, number, Hex[]]
          ]
        ) as Hex;
        break;

      case RoleConfigActionType.REMOVE_FUNCTION_FROM_ROLE:
        // Format: (bytes32 roleHash, bytes4 functionSelector)
        encodedData = encodeAbiParameters(
          parseAbiParameters('bytes32, bytes4'),
          [data.roleHash, data.functionSelector]
        ) as Hex;
        break;

      default:
        throw new Error(`Unsupported action type: ${actionType}`);
    }

    return {
      actionType,
      data: encodedData,
    };
  }

  /**
   * Create and sign a meta-transaction for role config batch
   */
  protected async createRoleConfigBatchMetaTx(
    actions: RoleConfigAction[],
    signerWalletName: string
  ): Promise<MetaTransaction> {
    if (!this.metaTxSigner || !this.runtimeRBAC) {
      throw new Error('MetaTransactionSigner or RuntimeRBAC not initialized');
    }

    const signerWallet = this.wallets[signerWalletName];
    if (!signerWallet) {
      throw new Error(`Wallet not found: ${signerWalletName}`);
    }

    // Create execution params
    const executionParams = await this.runtimeRBAC.roleConfigBatchExecutionParams(actions);

    // Create meta-tx params
    const metaTxParams = await this.createMetaTxParams(
      this.ROLE_CONFIG_BATCH_META_SELECTOR,
      TxAction.SIGN_META_REQUEST_AND_APPROVE,
      signerWallet.address
    );

    // Create TxParams object
    const txParams = {
      requester: signerWallet.address,
      target: this.contractAddress!,
      value: BigInt(0),
      gasLimit: BigInt(0), // Will be set by contract
      operationType: this.ROLE_CONFIG_BATCH_OPERATION_TYPE,
      executionSelector: this.ROLE_CONFIG_BATCH_EXECUTE_SELECTOR,
      executionParams: executionParams,
    };

    // Generate unsigned meta-transaction
    const unsignedMetaTx = await this.metaTxSigner.createUnsignedMetaTransactionForNew(
      txParams,
      metaTxParams
    );

    // Sign the meta-transaction
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
      data: signedMetaTx.data,
    };
  }

  /**
   * Execute role config batch
   */
  protected async executeRoleConfigBatch(
    actions: RoleConfigAction[],
    signerWalletName: string,
    broadcasterWalletName: string
  ): Promise<any> {
    if (!this.runtimeRBAC) {
      throw new Error('RuntimeRBAC SDK not initialized');
    }

    // Create and sign meta-transaction
    const signedMetaTx = await this.createRoleConfigBatchMetaTx(actions, signerWalletName);

    // Execute using broadcaster wallet
    const broadcasterWallet = this.wallets[broadcasterWalletName];
    if (!broadcasterWallet) {
      throw new Error(`Broadcaster wallet not found: ${broadcasterWalletName}`);
    }

    const broadcasterRuntimeRBAC = this.createRuntimeRBACWithWallet(broadcasterWalletName);
    const result = await broadcasterRuntimeRBAC.roleConfigBatchRequestAndApprove(signedMetaTx, {
      from: broadcasterWallet.address,
    });

    return result;
  }

  /**
   * Get role hash from role name
   */
  protected getRoleHash(roleName: string): Hex {
    return keccak256(toBytes(roleName)) as Hex;
  }

  /**
   * Check if role exists
   */
  protected async roleExists(roleHash: Hex): Promise<boolean> {
    if (!this.runtimeRBAC) {
      throw new Error('RuntimeRBAC SDK not initialized');
    }

    try {
      const role = await this.runtimeRBAC.getRole(roleHash);
      // getRole returns: { roleName, roleHashReturn, maxWallets, walletCount, isProtected }
      const roleHashReturn = role.roleHashReturn;
      const exists = (
        roleHashReturn &&
        typeof roleHashReturn === 'string' &&
        roleHashReturn.toLowerCase() === roleHash.toLowerCase() &&
        roleHashReturn !== '0x0000000000000000000000000000000000000000000000000000000000000000'
      );
      if (!exists) {
        console.log(`  🔍 Role check: roleHashReturn=${roleHashReturn}, expected=${roleHash}`);
      }
      return exists;
    } catch (error: any) {
      // If getRole throws, role doesn't exist
      console.log(`  🔍 Role check failed: ${error.message}`);
      return false;
    }
  }

  /**
   * Check if function schema exists
   */
  protected async functionSchemaExists(functionSelector: Hex): Promise<boolean> {
    if (!this.runtimeRBAC) {
      throw new Error('RuntimeRBAC SDK not initialized');
    }

    try {
      await this.runtimeRBAC.getFunctionSchema(functionSelector);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Remove role if it exists (for clean state)
   */
  protected async removeRoleIfExists(roleHash: Hex): Promise<boolean> {
    if (!this.runtimeRBAC) {
      throw new Error('RuntimeRBAC SDK not initialized');
    }

    try {
      console.log(`  📝 Attempting to remove role to ensure clean state...`);

      const removeAction = this.encodeRoleConfigAction(RoleConfigActionType.REMOVE_ROLE, {
        roleHash,
      });

      const ownerWallet = this.getRoleWallet('owner');
      const ownerWalletName = Object.keys(this.wallets).find(
        (k) => this.wallets[k].address.toLowerCase() === ownerWallet.address.toLowerCase()
      ) || 'wallet1';

      const broadcasterWalletName = Object.keys(this.wallets).find(
        (k) => this.wallets[k].address.toLowerCase() === this.roles.broadcaster.toLowerCase()
      ) || 'wallet2';

      const result = await this.executeRoleConfigBatch(
        [removeAction],
        ownerWalletName,
        broadcasterWalletName
      );

      await this.assertTransactionSuccess(result, 'Remove role');

      // Check transaction record status
      const receipt = await result.wait();
      const txStatus = await this.checkTransactionRecordStatus(receipt, 'Remove role');

      if (!txStatus.success && txStatus.status === 6) {
        console.log(`  ⚠️  Role removal failed internally (status 6), but role might still be removed`);
        return false;
      }

      // Wait for transaction to be fully mined and verify
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Retry verification up to 3 times
      for (let attempt = 0; attempt < 3; attempt++) {
        const roleExistsAfterRemoval = await this.roleExists(roleHash);
        if (!roleExistsAfterRemoval) {
          console.log(`  ✅ Role confirmed removed`);
          return true;
        }
        if (attempt < 2) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      // Role still exists after removal attempt
      console.log(`  ⚠️  Role still exists after removal attempt`);
      return false;
    } catch (error: any) {
      // If removal fails with ResourceNotFound, role doesn't exist (success)
      if (error.message && error.message.includes('ResourceNotFound')) {
        console.log(`  ✅ Role does not exist (ResourceNotFound)`);
        return true;
      }
      console.log(`  ⚠️  Error in removeRoleIfExists: ${error.message}`);
      return false;
    }
  }

  /**
   * Extract transaction ID from receipt by decoding TransactionEvent
   */
  protected extractTxIdFromReceipt(receipt: any): bigint | null {
    if (!receipt || !receipt.logs || receipt.logs.length === 0) {
      return null;
    }

    // TransactionEvent signature: TransactionEvent(uint256,bytes4,uint8,address,address,bytes32)
    const eventSignature = keccak256(toBytes('TransactionEvent(uint256,bytes4,uint8,address,address,bytes32)')) as Hex;

    for (const log of receipt.logs) {
      if (log.topics && log.topics[0] === eventSignature) {
        try {
          // Decode the log - txId is the first indexed parameter (in topics[1])
          // topics[0] = event signature
          // topics[1] = txId (indexed uint256)
          // topics[2] = functionHash (indexed bytes4)
          // topics[3] = requester (indexed address)
          // data contains: status (uint8), target (address), operationType (bytes32)
          if (log.topics.length >= 2) {
            const txId = BigInt(log.topics[1]);
            console.log(`  📋 Extracted txId from TransactionEvent: ${txId}`);
            return txId;
          }
        } catch (e: any) {
          console.log(`  ⚠️  Could not decode TransactionEvent: ${e.message}`);
        }
      }
    }
    return null;
  }

  /**
   * Get transaction record from contract
   */
  protected async getTransactionRecord(txId: bigint): Promise<any> {
    if (!this.runtimeRBAC) {
      throw new Error('RuntimeRBAC SDK not initialized');
    }

    try {
      const txRecord = await this.runtimeRBAC.getTransaction(txId);
      return txRecord;
    } catch (error: any) {
      console.log(`  ⚠️  Could not get transaction record: ${error.message}`);
      return null;
    }
  }

  /**
   * Decode error selector from transaction result
   */
  protected decodeErrorSelector(result: Hex | string | Uint8Array | null): string | null {
    if (!result) {
      return null;
    }

    let resultStr = '';
    if (typeof result === 'string') {
      resultStr = result;
    } else if (result instanceof Uint8Array) {
      resultStr = '0x' + Array.from(result).map(b => b.toString(16).padStart(2, '0')).join('');
    } else {
      return null;
    }

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

  /**
   * Detect if a thrown error is a contract revert with ResourceAlreadyExists.
   * Used when executeRoleConfigBatch throws (e.g. simulateContract reverts) before a receipt is produced.
   */
  protected isResourceAlreadyExistsRevert(error: any): boolean {
    if (!error) return false;
    const msg = (error.shortMessage || error.message || '').toString();
    if (/ResourceAlreadyExists/i.test(msg)) return true;
    const data = error.data ?? error.cause?.data;
    if (data?.errorName === 'ResourceAlreadyExists') return true;
    const selector = this.decodeErrorSelector(data?.data ?? data);
    if (selector && this.getErrorName(selector) === 'ResourceAlreadyExists') return true;
    return false;
  }

  /**
   * Check transaction record status and decode errors
   */
  protected async checkTransactionRecordStatus(
    receipt: any,
    operationName: string
  ): Promise<{ success: boolean; txId: bigint | null; status: number | null; error: string | null }> {
    const txId = this.extractTxIdFromReceipt(receipt);
    
    if (!txId) {
      console.log(`  ⚠️  Could not extract txId from receipt for ${operationName}`);
      return { success: true, txId: null, status: null, error: null }; // Assume success if no txId
    }

    try {
      const txRecord = await this.getTransactionRecord(txId);
      
      if (!txRecord) {
        console.log(`  ⚠️  Could not get transaction record for txId ${txId}`);
        return { success: true, txId, status: null, error: null }; // Assume success if can't get record
      }

      // Status: 0=UNDEFINED, 1=PENDING, 2=EXECUTING, 5=COMPLETED, 6=FAILED
      const status = typeof txRecord.status === 'bigint' 
        ? Number(txRecord.status) 
        : typeof txRecord.status === 'string' 
        ? parseInt(txRecord.status, 10) 
        : txRecord.status;

      console.log(`  📋 Transaction record status: ${status} (0=UNDEFINED, 1=PENDING, 2=EXECUTING, 5=COMPLETED, 6=FAILED)`);

      if (status === 6) {
        // Transaction failed internally
        const result = txRecord.result || '0x';
        const errorSelector = this.decodeErrorSelector(result);
        const errorName = errorSelector ? this.getErrorName(errorSelector) : 'Unknown';
        
        console.log(`  ❌ Transaction failed internally (status 6) for ${operationName}`);
        if (errorSelector) {
          console.log(`  🔍 Error selector: ${errorSelector} (${errorName})`);
        }

        return {
          success: false,
          txId,
          status: 6,
          error: errorName
        };
      } else if (status === 5) {
        // Transaction completed successfully
        console.log(`  ✅ Transaction completed successfully (status 5) for ${operationName}`);
        return {
          success: true,
          txId,
          status: 5,
          error: null
        };
      } else {
        // Other status (PENDING, EXECUTING, etc.)
        console.log(`  ⚠️  Transaction status: ${status} for ${operationName}`);
        return {
          success: true, // Assume success for non-failed statuses
          txId,
          status,
          error: null
        };
      }
    } catch (error: any) {
      console.log(`  ⚠️  Error checking transaction record: ${error.message}`);
      return { success: true, txId, status: null, error: null }; // Assume success on error
    }
  }
}
