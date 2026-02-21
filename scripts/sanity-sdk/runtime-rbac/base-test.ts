/**
 * Base Test Class for RuntimeRBAC SDK Tests
 * Provides RuntimeRBAC-specific functionality
 */

import { Address, Hex } from 'viem';
import { RuntimeRBAC } from '../../../sdk/typescript/contracts/core/RuntimeRBAC.tsx';
import { BaseSDKTest, TestWallet } from '../base/BaseSDKTest.ts';
import { getContractAddressFromArtifacts, getDefinitionAddress } from '../base/test-helpers.ts';
import { getTestConfig } from '../base/test-config.ts';
import { MetaTransactionSigner } from '../../../sdk/typescript/utils/metaTx/metaTransaction.tsx';
import { MetaTransaction, MetaTxParams, TxParams } from '../../../sdk/typescript/interfaces/lib.index.tsx';
import { TxAction } from '../../../sdk/typescript/types/lib.index.tsx';
import { keccak256, toBytes } from 'viem';
import {
  roleConfigBatchExecutionParams,
  encodeCreateRole,
  encodeRemoveRole,
  encodeAddWallet,
  encodeRevokeWallet,
  encodeAddFunctionToRole,
  encodeRemoveFunctionFromRole,
} from '../../../sdk/typescript/lib/definitions/RuntimeRBACDefinitions';
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
  /** Deployed RuntimeRBACDefinitions library address (for execution params) */
  protected runtimeRBACDefinitionsAddress: Address | null = null;
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

    this.runtimeRBACDefinitionsAddress = await getDefinitionAddress('RuntimeRBACDefinitions');

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
   * Return an RuntimeRBAC instance whose wallet has a role (owner).
   * Use for any read that requires _validateAnyRole (getRole, getSupportedRoles, getTransaction, etc.).
   */
  protected getRuntimeRBACForRoleQueries(): RuntimeRBAC {
    const ownerWallet = this.getRoleWallet('owner');
    const ownerWalletName =
      Object.keys(this.wallets).find(
        (k) => this.wallets[k].address.toLowerCase() === ownerWallet.address.toLowerCase()
      ) || 'wallet1';
    const rbac = this.createRuntimeRBACWithWallet(ownerWalletName);
    (rbac as any).abi = AccountBloxABIJson;
    return rbac;
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
   * Encode RoleConfigAction data using the deployed definition contract (single source of truth).
   */
  protected async encodeRoleConfigAction(
    actionType: RoleConfigActionType,
    data: any
  ): Promise<RoleConfigAction> {
    if (!this.publicClient || !this.runtimeRBACDefinitionsAddress) {
      throw new Error('publicClient and runtimeRBACDefinitionsAddress required for definition encoding');
    }
    const client = this.publicClient;
    const def = this.runtimeRBACDefinitionsAddress;
    let encodedData: Hex;

    switch (actionType) {
      case RoleConfigActionType.CREATE_ROLE:
        encodedData = await encodeCreateRole(client, def, data.roleName, BigInt(data.maxWallets));
        break;
      case RoleConfigActionType.REMOVE_ROLE:
        encodedData = await encodeRemoveRole(client, def, data.roleHash);
        break;
      case RoleConfigActionType.ADD_WALLET:
        encodedData = await encodeAddWallet(client, def, data.roleHash, data.wallet);
        break;
      case RoleConfigActionType.REVOKE_WALLET:
        encodedData = await encodeRevokeWallet(client, def, data.roleHash, data.wallet);
        break;
      case RoleConfigActionType.ADD_FUNCTION_TO_ROLE:
        encodedData = await encodeAddFunctionToRole(client, def, data.roleHash, {
          functionSelector: data.functionPermission.functionSelector,
          grantedActionsBitmap: data.functionPermission.grantedActionsBitmap,
          handlerForSelectors: data.functionPermission.handlerForSelectors ?? [data.functionPermission.functionSelector],
        });
        break;
      case RoleConfigActionType.REMOVE_FUNCTION_FROM_ROLE:
        encodedData = await encodeRemoveFunctionFromRole(client, def, data.roleHash, data.functionSelector);
        break;
      default:
        throw new Error(`Unsupported action type: ${actionType}`);
    }

    return { actionType, data: encodedData };
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

    // Create execution params (via definition contract)
    if (!this.runtimeRBACDefinitionsAddress) {
      throw new Error('RuntimeRBACDefinitions address not set');
    }
    const executionParams = await roleConfigBatchExecutionParams(this.publicClient, this.runtimeRBACDefinitionsAddress, actions);

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
    const result = await broadcasterRuntimeRBAC.roleConfigBatchRequestAndApprove(signedMetaTx, this.getTxOptions(broadcasterWallet.address));

    return result;
  }

  /**
   * Get role hash from role name
   */
  protected getRoleHash(roleName: string): Hex {
    return keccak256(toBytes(roleName)) as Hex;
  }

  /**
   * Check if role exists (getRole succeeds and returns matching hash).
   * If getRole throws (e.g. RPC "Missing or invalid parameters"), falls back to getSupportedRoles()
   * so idempotent runs can still detect an existing role when getRole is unreliable.
   */
  protected async roleExists(roleHash: Hex): Promise<boolean> {
    if (!this.runtimeRBAC) {
      throw new Error('RuntimeRBAC SDK not initialized');
    }

    const rbacForRead = this.getRuntimeRBACForRoleQueries();
    try {
      const role = await rbacForRead.getRole(roleHash);
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
      // getRole failed (contract revert or RPC error). Fallback: check supported roles list
      // so we can still treat "role already exists" idempotently when getRole is unreliable.
      const msg = (error?.cause?.shortMessage ?? error?.message ?? 'revert').toString();
      if (msg.length > 80) {
        console.log(`  🔍 Role check failed: ${msg.slice(0, 77)}...`);
      } else {
        console.log(`  🔍 Role check failed: ${msg}`);
      }
      try {
        const supported = await rbacForRead.getSupportedRoles();
        const inList = Array.isArray(supported) && supported.some(
          (h: string) => typeof h === 'string' && h.toLowerCase() === roleHash.toLowerCase()
        );
        if (inList) {
          console.log(`  🔍 Role found in getSupportedRoles() (getRole failed), treating as exists`);
          return true;
        }
      } catch (supErr: any) {
        const supMsg = (supErr?.message ?? supErr).toString();
        if (supMsg.length <= 80) {
          console.log(`  🔍 getSupportedRoles fallback failed: ${supMsg}`);
        }
      }
      return false;
    }
  }

  /**
   * Check if role exists and has the exact expected values (for skip-only-when-already-correct rule).
   * Returns false if getRole throws or if any field does not match.
   */
  protected async roleExistsWithExpectedValues(
    roleHash: Hex,
    expected: { roleName: string; maxWallets: number }
  ): Promise<boolean> {
    if (!this.runtimeRBAC) {
      return false;
    }
    try {
      const role = await this.getRuntimeRBACForRoleQueries().getRole(roleHash);
      const maxMatch =
        Number(role.maxWallets) === expected.maxWallets ||
        role.maxWallets === BigInt(expected.maxWallets);
      return role.roleName === expected.roleName && maxMatch;
    } catch {
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
      await this.getRuntimeRBACForRoleQueries().getFunctionSchema(functionSelector);
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

      const removeAction = await this.encodeRoleConfigAction(RoleConfigActionType.REMOVE_ROLE, {
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

      // Check transaction record status (TxStatus 6 = failed test)
      const receipt = await result.wait();
      const txStatus = await this.checkTransactionRecordStatus(receipt, 'Remove role');

      if (!txStatus.success && txStatus.status === 6) {
        throw new Error(`Remove role failed (TxStatus 6). Error: ${txStatus.error || 'Unknown'}`);
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
      const txRecord = await this.getRuntimeRBACForRoleQueries().getTransaction(txId);
      return txRecord;
    } catch (error: any) {
      console.log(`  ⚠️  Could not get transaction record: ${error.message}`);
      return null;
    }
  }

  /**
   * Normalize tx record result (bytes) to 0x-prefixed hex. Viem/ABI can return bytes as string, Uint8Array, or number[].
   */
  protected normalizeResultToHex(result: unknown): string {
    if (result == null) return '0x';
    if (typeof result === 'string') {
      return result.startsWith('0x') ? result : `0x${result}`;
    }
    if (result instanceof Uint8Array) {
      return '0x' + Array.from(result).map((b) => b.toString(16).padStart(2, '0')).join('');
    }
    if (Array.isArray(result)) {
      return '0x' + result.map((b) => Number(b).toString(16).padStart(2, '0')).join('');
    }
    if (typeof result === 'object' && result !== null && 'length' in result) {
      const arr = Array.from(result as ArrayLike<number>);
      return '0x' + arr.map((b) => Number(b).toString(16).padStart(2, '0')).join('');
    }
    return '0x';
  }

  /**
   * Decode error selector from transaction result (raw bytes from tx record or revert data).
   */
  protected decodeErrorSelector(result: unknown): string | null {
    const resultStr = this.normalizeResultToHex(result);
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
   * Considers enhanced errors from handleViemError (errorData, originalError) and raw viem revert data.
   * When RPC/viem wraps the revert with "Missing or invalid parameters", the role name REGISTRY_ADMIN
   * may still appear in the revert text; treat that as create-role ResourceAlreadyExists for idempotency.
   */
  protected isResourceAlreadyExistsRevert(error: any): boolean {
    if (!error) return false;
    const msg = (error.shortMessage || error.message || '').toString();
    if (/ResourceAlreadyExists/i.test(msg)) return true;
    const data = error.data ?? error.cause?.data ?? error.originalError?.data ?? error.originalError?.cause?.data;
    if (data?.errorName === 'ResourceAlreadyExists') return true;
    const revertHex = (typeof data?.data !== 'undefined' ? data.data : data) ?? error.errorData;
    const selector = this.decodeErrorSelector(revertHex);
    if (selector && this.getErrorName(selector) === 'ResourceAlreadyExists') return true;
    if (/REGISTRY_ADMIN/.test(msg)) return true;
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
        // Transaction failed internally; normalize result (viem may return bytes as string, Uint8Array, or array)
        const resultHex = this.normalizeResultToHex(txRecord.result);
        const errorSelector = this.decodeErrorSelector(txRecord.result);
        const errorName = errorSelector ? this.getErrorName(errorSelector) : 'Unknown';
        
        console.log(`  ❌ Transaction failed internally (status 6) for ${operationName}`);
        if (errorSelector) {
          console.log(`  🔍 Error selector: ${errorSelector} (${errorName})`);
        } else if (resultHex.length > 2) {
          console.log(`  🔍 Raw result (first 20 chars): ${resultHex.slice(0, 20)}...`);
        } else {
          console.log(`  🔍 No revert data in tx record (result empty); run against local node or inspect chain to see revert reason`);
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
