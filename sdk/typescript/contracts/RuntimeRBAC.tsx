import { Address, PublicClient, WalletClient, Chain, Hex } from 'viem';
import RuntimeRBACABIJson from '../../../abi/RuntimeRBAC.abi.json';
import { TransactionOptions, TransactionResult } from '../interfaces/base.index';
import { IRuntimeRBAC } from '../interfaces/core.access.index';
import { TxAction } from '../types/lib.index';
import { MetaTransaction } from '../interfaces/lib.index';
import { BaseStateMachine } from './BaseStateMachine';
import { Uint16Bitmap } from '../utils/bitmap';
import { INTERFACE_IDS } from '../utils/interface-ids';

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
  functionSignature: string;
  functionSelector: Hex;
  operationType: Hex;
  operationName: string;
  supportedActionsBitmap: Uint16Bitmap; // uint16
  isProtected: boolean;
}

/**
 * @title RuntimeRBAC
 * @notice TypeScript wrapper for RuntimeRBAC smart contract
 * @dev Matches the actual Solidity contract implementation
 * @dev Extends BaseStateMachine directly for modular architecture
 */
export class RuntimeRBAC extends BaseStateMachine implements IRuntimeRBAC {
  constructor(
    client: PublicClient,
    walletClient: WalletClient | undefined,
    contractAddress: Address,
    chain: Chain
  ) {
    super(client, walletClient, contractAddress, chain, RuntimeRBACABIJson);
  }

  // ============ ROLE CONFIGURATION BATCH ============

  /**
   * @dev Creates execution params for a RBAC configuration batch
   * @param actions Encoded role configuration actions
   */
  async roleConfigBatchExecutionParams(
    actions: Array<{ actionType: number; data: Hex }>
  ): Promise<Hex> {
    return this.executeReadContract<Hex>('roleConfigBatchExecutionParams', [actions]);
  }

  /**
   * @dev Requests and approves a RBAC configuration batch using a meta-transaction
   * @param metaTx The meta-transaction
   * @param options Transaction options
   */
  async roleConfigBatchRequestAndApprove(
    metaTx: MetaTransaction,
    options: TransactionOptions
  ): Promise<TransactionResult> {
    return this.executeWriteContract('roleConfigBatchRequestAndApprove', [metaTx], options);
  }

  /**
   * @dev Gets function schema information
   * @param functionSelector The function selector to get information for
   * @return Function schema information
   */
  async getFunctionSchema(functionSelector: Hex): Promise<{
    functionSignature: string;
    functionSelectorReturn: Hex;
    operationType: Hex;
    operationName: string;
    supportedActions: TxAction[];
    isProtected: boolean;
  }> {
    return this.executeReadContract<{
      functionSignature: string;
      functionSelectorReturn: Hex;
      operationType: Hex;
      operationName: string;
      supportedActions: TxAction[];
      isProtected: boolean;
    }>('getFunctionSchema', [functionSelector]);
  }

  // ============ INTERFACE SUPPORT ============

  /**
   * @dev Check if this contract supports IRuntimeRBAC interface
   * @return Promise<boolean> indicating if IRuntimeRBAC is supported
   */
  async supportsRuntimeRBACInterface(): Promise<boolean> {
    return this.supportsInterface(INTERFACE_IDS.IRuntimeRBAC);
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

export default RuntimeRBAC;
