import { Address, PublicClient, WalletClient, Chain, Hex } from 'viem';
import RuntimeRBACABIJson from '../abi/RuntimeRBAC.abi.json';
import { TransactionOptions, TransactionResult } from '../interfaces/base.index';
import { IRuntimeRBAC } from '../interfaces/core.access.index';
import { TxAction } from '../types/lib.index';
import { MetaTransaction } from '../interfaces/lib.index';
import { BaseStateMachine } from './BaseStateMachine';
import { Uint16Bitmap } from '../utils/bitmap';
import { INTERFACE_IDS } from '../utils/interface-ids';

/**
 * FunctionPermission structure matching Solidity EngineBlox.FunctionPermission
 */
interface EngineBloxFunctionPermission {
  functionSelector: Hex;
  grantedActionsBitmap: Uint16Bitmap; // uint16
  handlerForSelectors: Hex[]; // Array of execution selectors this function can access
}

/**
 * FunctionSchema structure matching Solidity EngineBlox.FunctionSchema for loadDefinitions
 */
interface EngineBloxFunctionSchema {
  functionSignature: string;
  functionSelector: Hex;
  operationType: Hex;
  operationName: string;
  supportedActionsBitmap: Uint16Bitmap; // uint16
  isProtected: boolean;
  handlerForSelectors: Hex[]; // Empty array for execution selector permissions (defines what action is performed), non-empty array for handler selector permissions (indicates which execution selectors this handler is connected to)
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

  /**
   * @dev Gets all authorized wallets for a role
   * @param roleHash The role hash to get wallets for
   * @return Array of authorized wallet addresses
   * @notice Requires caller to have any role (via _validateAnyRole) for privacy protection
   */
  async getWalletsInRole(roleHash: Hex): Promise<Address[]> {
    return this.executeReadContract<Address[]>('getWalletsInRole', [roleHash]);
  }

  // ============ INTERFACE SUPPORT ============

  /**
   * @dev Check if this contract supports IRuntimeRBAC interface
   * @return Promise<boolean> indicating if IRuntimeRBAC is supported
   */
  async supportsRuntimeRBACInterface(): Promise<boolean> {
    return this.supportsInterface(INTERFACE_IDS.IRuntimeRBAC);
  }

}

export default RuntimeRBAC;
