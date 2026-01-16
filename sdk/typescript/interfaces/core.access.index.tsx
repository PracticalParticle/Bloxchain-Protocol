import { Address, Hex } from 'viem';
import { TransactionResult, TransactionOptions } from './base.index';
import { MetaTransaction } from './lib.index';
import { TxAction } from '../types/lib.index';

/**
 * Interface for RuntimeRBAC contract methods
 * Note: This interface matches the actual contract methods. Some convenience methods
 * may be provided but are not part of the core contract interface.
 */
export interface IRuntimeRBAC {
  /**
   * @dev Creates execution params for a RBAC configuration batch
   */
  roleConfigBatchExecutionParams(
    actions: Array<{ actionType: number; data: Hex }>
  ): Promise<Hex>;

  /**
   * @dev Requests and approves a RBAC configuration batch using a meta-transaction
   */
  roleConfigBatchRequestAndApprove(
    metaTx: MetaTransaction,
    options: TransactionOptions
  ): Promise<TransactionResult>;

  // Query Functions (from contract)
  roleExists(roleHash: Hex): Promise<boolean>;

  // Note: getFunctionSchema remains available from the contract and is exposed via the wrapper
  getFunctionSchema(functionSelector: Hex): Promise<{
    functionSignature: string;
    functionSelectorReturn: Hex;
    operationType: Hex;
    operationName: string;
    supportedActions: TxAction[];
    isProtected: boolean;
  }>;
}
