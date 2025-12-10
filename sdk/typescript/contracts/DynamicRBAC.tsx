import { Address, PublicClient, WalletClient, Chain, Hex } from 'viem';
import DynamicRBACABIJson from '../../../abi/DynamicRBAC.abi.json';
import { TransactionOptions, TransactionResult } from '../interfaces/base.index';
import { IDynamicRBAC } from '../interfaces/core.access.index';
import { TxAction } from '../types/lib.index';
import { MetaTransaction } from '../interfaces/lib.index';
import { BaseStateMachine } from './BaseStateMachine';
import { Uint16Bitmap, fromContractValue } from '../utils/bitmap';

/**
 * FunctionPermission structure matching Solidity StateAbstraction.FunctionPermission
 */
interface StateAbstractionFunctionPermission {
  functionSelector: Hex;
  grantedActionsBitmap: Uint16Bitmap; // uint16
}

/**
 * FunctionSchema structure matching Solidity StateAbstraction.FunctionSchema for loadDefinitions
 */
interface StateAbstractionFunctionSchema {
  functionName: string;
  functionSelector: Hex;
  operationType: Hex;
  operationName: string;
  supportedActionsBitmap: Uint16Bitmap; // uint16
  isProtected: boolean;
}

/**
 * @title DynamicRBAC
 * @notice TypeScript wrapper for DynamicRBAC smart contract
 * @dev Matches the actual Solidity contract implementation
 * @dev Extends BaseStateMachine directly for modular architecture
 */
export class DynamicRBAC extends BaseStateMachine implements IDynamicRBAC {
  constructor(
    client: PublicClient,
    walletClient: WalletClient | undefined,
    contractAddress: Address,
    chain: Chain
  ) {
    super(client, walletClient, contractAddress, chain, DynamicRBACABIJson);
  }

  // ============ ROLE EDITING CONTROL ============

  /**
   * @dev Creates execution options for updating the role editing flag
   * @param enabled True to enable role editing, false to disable
   * @return The execution options bytes
   */
  async updateRoleEditingToggleExecutionOptions(enabled: boolean): Promise<Hex> {
    return this.executeReadContract<Hex>('updateRoleEditingToggleExecutionOptions', [enabled]);
  }

  /**
   * @dev Requests and approves a role editing toggle using a meta-transaction
   * @param metaTx The meta-transaction
   * @param options Transaction options
   * @return TransactionResult with hash and wait function
   */
  async updateRoleEditingToggleRequestAndApprove(
    metaTx: MetaTransaction,
    options: TransactionOptions
  ): Promise<TransactionResult> {
    return this.executeWriteContract('updateRoleEditingToggleRequestAndApprove', [metaTx], options);
  }

  /**
   * @dev Gets the role editing enabled flag
   * @return True if role editing is enabled, false otherwise
   */
  async roleEditingEnabled(): Promise<boolean> {
    return this.executeReadContract<boolean>('roleEditingEnabled');
  }

  // ============ ROLE MANAGEMENT ============

  /**
   * @dev Creates a new dynamic role with function permissions (always non-protected)
   * @param roleName The name of the role to create
   * @param maxWallets Maximum number of wallets allowed for this role
   * @param functionPermissions Array of function permissions to grant to the role
   * @param options Transaction options
   * @return TransactionResult with hash and wait function
   * @notice Role becomes uneditable after creation - all permissions must be set at creation time
   */
  async createNewRole(
    roleName: string,
    maxWallets: bigint,
    functionPermissions: StateAbstractionFunctionPermission[],
    options: TransactionOptions
  ): Promise<TransactionResult> {
    return this.executeWriteContract('createNewRole', [roleName, maxWallets, functionPermissions], options);
  }

  /**
   * @dev Removes a role from the system
   * @param roleHash The hash of the role to remove
   * @param options Transaction options
   * @return TransactionResult with hash and wait function
   * @notice Security: Cannot remove protected roles
   */
  async removeRole(roleHash: Hex, options: TransactionOptions): Promise<TransactionResult> {
    return this.executeWriteContract('removeRole', [roleHash], options);
  }

  /**
   * @dev Adds a wallet to a role
   * @param roleHash The hash of the role
   * @param wallet The wallet address to add
   * @param options Transaction options
   * @return TransactionResult with hash and wait function
   */
  async addWalletToRole(roleHash: Hex, wallet: Address, options: TransactionOptions): Promise<TransactionResult> {
    return this.executeWriteContract('addWalletToRole', [roleHash, wallet], options);
  }

  /**
   * @dev Removes a wallet from a role
   * @param roleHash The hash of the role
   * @param wallet The wallet address to remove
   * @param options Transaction options
   * @return TransactionResult with hash and wait function
   */
  async revokeWallet(roleHash: Hex, wallet: Address, options: TransactionOptions): Promise<TransactionResult> {
    return this.executeWriteContract('revokeWallet', [roleHash, wallet], options);
  }

  // ============ FUNCTION REGISTRATION ============

  /**
   * @dev Registers a function schema with its full signature
   * @param functionSignature The full function signature (e.g., "transfer(address,uint256)")
   * @param operationName The operation name (hashed to operationType)
   * @param supportedActions Array of supported actions (converted to bitmap internally)
   * @param options Transaction options
   * @return TransactionResult with hash and wait function
   */
  async registerFunction(
    functionSignature: string,
    operationName: string,
    supportedActions: TxAction[],
    options: TransactionOptions
  ): Promise<TransactionResult> {
    return this.executeWriteContract('registerFunction', [functionSignature, operationName, supportedActions], options);
  }

  /**
   * @dev Unregisters a function schema and removes its signature
   * @param functionSelector The function selector to remove
   * @param safeRemoval If true, ensures no role currently references this function
   * @param options Transaction options
   * @return TransactionResult with hash and wait function
   */
  async unregisterFunction(
    functionSelector: Hex,
    safeRemoval: boolean,
    options: TransactionOptions
  ): Promise<TransactionResult> {
    return this.executeWriteContract('unregisterFunction', [functionSelector, safeRemoval], options);
  }

  /**
   * @dev Gets function schema information
   * @param functionSelector The function selector to get information for
   * @return Function schema information
   */
  async getFunctionSchema(functionSelector: Hex): Promise<{
    functionName: string;
    functionSelectorReturn: Hex;
    operationType: Hex;
    operationName: string;
    supportedActions: TxAction[];
    isProtected: boolean;
  }> {
    return this.executeReadContract<{
      functionName: string;
      functionSelectorReturn: Hex;
      operationType: Hex;
      operationName: string;
      supportedActions: TxAction[];
      isProtected: boolean;
    }>('getFunctionSchema', [functionSelector]);
  }

  // ============ DEFINITION MANAGEMENT ============

  /**
   * @dev Public function to load function schemas and role permissions dynamically at runtime
   * @param functionSchemas Array of function schema definitions to load
   * @param roleHashes Array of role hashes to add permissions to
   * @param functionPermissions Array of function permissions (parallel to roleHashes)
   * @param options Transaction options
   * @return TransactionResult with hash and wait function
   */
  async loadDefinitions(
    functionSchemas: StateAbstractionFunctionSchema[],
    roleHashes: Hex[],
    functionPermissions: StateAbstractionFunctionPermission[],
    options: TransactionOptions
  ): Promise<TransactionResult> {
    return this.executeWriteContract('loadDefinitions', [functionSchemas, roleHashes, functionPermissions], options);
  }

  // ============ QUERY FUNCTIONS ============

  /**
   * @dev Checks if a role exists
   * @param roleHash The hash of the role
   * @return True if the role exists, false otherwise
   */
  async roleExists(roleHash: Hex): Promise<boolean> {
    return this.executeReadContract<boolean>('roleExists', [roleHash]);
  }

  // ============ HELPER FUNCTIONS (Computed from base class) ============
  // These functions don't exist in Solidity but are provided as convenience methods
  // that compute values from existing base class methods

  /**
   * @dev Gets role information by combining base class methods
   * @param roleHash The hash of the role
   * @return Role information including basic info, wallets, and permissions
   */
  async getRoleInfo(roleHash: Hex): Promise<{
    roleName: string;
    roleHashReturn: Hex;
    maxWallets: bigint;
    walletCount: bigint;
    isProtected: boolean;
    authorizedWallets: Address[];
    functionPermissions: any[];
  }> {
    // Get basic role info from BaseStateMachine
    const roleInfo = await this.getRole(roleHash);
    
    // Get authorized wallets - Note: getWalletsInRole doesn't exist in Solidity
    // This would require iterating through StateAbstraction, which is not directly accessible
    // Return empty array as placeholder - users should use StateAbstraction helpers directly
    const authorizedWallets: Address[] = [];
    
    // Get function permissions for the role
    const functionPermissions = await this.getActiveRolePermissions(roleHash);
    
    return {
      roleName: roleInfo.roleName,
      roleHashReturn: roleInfo.roleHashReturn,
      maxWallets: roleInfo.maxWallets,
      walletCount: roleInfo.walletCount,
      isProtected: roleInfo.isProtected,
      authorizedWallets,
      functionPermissions
    };
  }

}

export default DynamicRBAC;