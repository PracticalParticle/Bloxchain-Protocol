import { Address, Hex } from 'viem';
import { TransactionResult, TransactionOptions } from './base.index';
import { MetaTransaction } from './lib.index';
import { IDynamicRBAC } from './core.access.index';

/**
 * Interface for GuardController contract methods
 */
export interface IGuardController extends IDynamicRBAC {
  // Execution Functions
  executeWithTimeLock(
    target: Address,
    functionSelector: Hex,
    params: Hex,
    gasLimit: bigint,
    operationType: Hex,
    options: TransactionOptions
  ): Promise<TransactionResult>;

  approveTimeLockExecution(
    txId: bigint,
    expectedOperationType: Hex,
    options: TransactionOptions
  ): Promise<TransactionResult>;

  cancelTimeLockExecution(
    txId: bigint,
    expectedOperationType: Hex,
    options: TransactionOptions
  ): Promise<TransactionResult>;

  approveTimeLockExecutionWithMetaTx(
    metaTx: MetaTransaction,
    expectedOperationType: Hex,
    requiredSelector: Hex,
    options: TransactionOptions
  ): Promise<TransactionResult>;

  cancelTimeLockExecutionWithMetaTx(
    metaTx: MetaTransaction,
    expectedOperationType: Hex,
    requiredSelector: Hex,
    options: TransactionOptions
  ): Promise<TransactionResult>;

  requestAndApproveExecution(
    metaTx: MetaTransaction,
    requiredSelector: Hex,
    options: TransactionOptions
  ): Promise<TransactionResult>;
}

