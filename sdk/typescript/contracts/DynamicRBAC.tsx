import { Address, PublicClient, WalletClient, Chain, Hex } from 'viem';
import DynamicRBACABIJson from '../../../abi/DynamicRBAC.abi.json';
import { TransactionOptions, TransactionResult } from '../interfaces/base.index';
import { IDynamicRBAC } from '../interfaces/core.access.index';
import { TxAction } from '../types/lib.index';
import { MetaTransaction } from '../interfaces/lib.index';
import { SecureOwnable } from './SecureOwnable';

/**
 * FunctionPermission structure matching Solidity StateAbstraction.FunctionPermission
 */
interface StateAbstractionFunctionPermission {
  functionSelector: Hex;
  grantedActionsBitmap: number; // uint16
}

/**
 * FunctionSchema structure matching Solidity StateAbstraction.FunctionSchema for loadDefinitions
 */
interface StateAbstractionFunctionSchema {
  functionName: string;
  functionSelector: Hex;
  operationType: Hex;
  operationName: string;
  supportedActionsBitmap: number; // uint16
  isProtected: boolean;
}

/**
 * @title DynamicRBAC
 * @notice TypeScript wrapper for DynamicRBAC smart contract
 * @dev Matches the actual Solidity contract implementation
 * @dev Extends SecureOwnable which extends BaseStateMachine
 */
export class DynamicRBAC extends SecureOwnable implements IDynamicRBAC {
  constructor(
    client: PublicClient,
    walletClient: WalletClient | undefined,
    contractAddress: Address,
    chain: Chain
  ) {
    // Note: SecureOwnable uses SecureOwnableABI, but DynamicRBAC needs DynamicRBACABI
    // We override the ABI after calling super
    super(client, walletClient, contractAddress, chain);
    // Override ABI to use DynamicRBAC ABI instead of SecureOwnable ABI
    (this as any).abi = DynamicRBACABIJson;
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
   * @dev Checks if a function schema exists
   * @param functionSelector The function selector to check
   * @return True if the function schema exists, false otherwise
   */
  async functionSchemaExists(functionSelector: Hex): Promise<boolean> {
    return this.executeReadContract<boolean>('functionSchemaExists', [functionSelector]);
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

  // ============ INTERFACE COMPLIANCE (IDynamicRBAC) ============
  // These methods are required by IDynamicRBAC interface but don't exist in Solidity
  // They are provided for backward compatibility but will throw errors when called

  /**
   * @deprecated Use createNewRole instead. This method doesn't exist in Solidity.
   */
  async createRole(roleName: string, maxWallets: bigint, options: TransactionOptions): Promise<TransactionResult> {
    throw new Error('createRole is deprecated. Use createNewRole with functionPermissions parameter instead.');
  }

  /**
   * @deprecated This method doesn't exist in Solidity. Roles are created with all permissions at creation time.
   */
  async updateRole(roleHash: Hex, newRoleName: string, newMaxWallets: bigint, options: TransactionOptions): Promise<TransactionResult> {
    throw new Error('updateRole does not exist in Solidity. Roles are immutable after creation.');
  }

  /**
   * @deprecated Use removeRole instead. This method doesn't exist in Solidity.
   */
  async deleteRole(roleHash: Hex, options: TransactionOptions): Promise<TransactionResult> {
    return this.removeRole(roleHash, options);
  }

  /**
   * @deprecated This method doesn't exist in Solidity. Use addWalletToRole and revokeWallet separately.
   */
  async replaceWalletInRole(roleHash: Hex, newWallet: Address, oldWallet: Address, options: TransactionOptions): Promise<TransactionResult> {
    throw new Error('replaceWalletInRole does not exist in Solidity. Use revokeWallet and addWalletToRole separately.');
  }

  /**
   * @deprecated This method doesn't exist in Solidity. Permissions are set at role creation time via createNewRole.
   */
  async addFunctionPermissionToRole(roleHash: Hex, functionSelector: Hex, action: TxAction, options: TransactionOptions): Promise<TransactionResult> {
    throw new Error('addFunctionPermissionToRole does not exist in Solidity. Permissions must be set when creating the role with createNewRole.');
  }

  /**
   * @deprecated This method doesn't exist in Solidity. Permissions cannot be removed after role creation.
   */
  async removeFunctionPermissionFromRole(roleHash: Hex, functionSelector: Hex, options: TransactionOptions): Promise<TransactionResult> {
    throw new Error('removeFunctionPermissionFromRole does not exist in Solidity. Permissions are immutable after role creation.');
  }

  /**
   * @deprecated This method doesn't exist in Solidity. Use getSupportedRoles and filter by isProtected.
   */
  async getDynamicRoles(): Promise<Hex[]> {
    throw new Error('getDynamicRoles does not exist in Solidity. Use getSupportedRoles and filter roles where isProtected is false.');
  }

  /**
   * @deprecated Use getSupportedRoles from BaseStateMachine instead. This method doesn't exist in Solidity.
   */
  async getAllRoles(): Promise<Hex[]> {
    return this.getSupportedRoles();
  }

  /**
   * @deprecated This method doesn't exist in Solidity. Use hasRole with iteration or StateAbstraction helpers.
   */
  async getWalletsInRole(roleHash: Hex): Promise<Address[]> {
    throw new Error('getWalletsInRole does not exist in Solidity. This requires iteration through walletCount using StateAbstraction helpers.');
  }

  /**
   * @deprecated Use getActiveRolePermissions from BaseStateMachine instead. This method doesn't exist in Solidity.
   */
  async getRolePermissions(roleHash: Hex): Promise<{
    functionSelectors: Hex[];
    actions: TxAction[];
  }> {
    const permissions = await this.getActiveRolePermissions(roleHash);
    // Transform the permissions array to match the expected format
    const functionSelectors = permissions.map((p: any) => p.functionSelector);
    const actions: TxAction[] = [];
    // Note: Actions are stored as bitmaps, so this is a simplified version
    return { functionSelectors, actions };
  }

  /**
   * @deprecated Use getRole and check isProtected property instead. This method doesn't exist in Solidity.
   */
  async isRoleProtected(roleHash: Hex): Promise<boolean> {
    const role = await this.getRole(roleHash);
    return role.isProtected;
  }

  /**
   * @deprecated Use getRole and check walletCount property instead. This method doesn't exist in Solidity.
   */
  async getRoleWalletCount(roleHash: Hex): Promise<bigint> {
    const role = await this.getRole(roleHash);
    return role.walletCount;
  }

  /**
   * @deprecated Use getRole and compare walletCount with maxWallets instead. This method doesn't exist in Solidity.
   */
  async isRoleAtCapacity(roleHash: Hex): Promise<boolean> {
    const role = await this.getRole(roleHash);
    return role.walletCount >= role.maxWallets;
  }
}

export default DynamicRBAC;