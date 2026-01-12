import { Address, Hex } from 'viem';
import { TransactionResult, TransactionOptions } from './base.index';
import { MetaTransaction } from './lib.index';
import { IBaseStateMachine } from './base.state.machine.index';

/**
 * Interface for GuardController contract methods
 * @notice GuardController extends BaseStateMachine and provides execution workflows
 * @notice For role management, combine GuardController with RuntimeRBAC
 */
export interface IGuardController extends IBaseStateMachine {
  // Initialization
  initialize(
    initialOwner: Address,
    broadcaster: Address,
    recovery: Address,
    timeLockPeriodSec: bigint,
    eventForwarder: Address,
    options: TransactionOptions
  ): Promise<TransactionResult>;

  // Execution Functions
  executeWithTimeLock(
    target: Address,
    value: bigint,
    functionSelector: Hex,
    params: Hex,
    gasLimit: bigint,
    operationType: Hex,
    options: TransactionOptions
  ): Promise<TransactionResult>;

  approveTimeLockExecution(
    txId: bigint,
    options: TransactionOptions
  ): Promise<TransactionResult>;

  cancelTimeLockExecution(
    txId: bigint,
    options: TransactionOptions
  ): Promise<TransactionResult>;

  approveTimeLockExecutionWithMetaTx(
    metaTx: MetaTransaction,
    options: TransactionOptions
  ): Promise<TransactionResult>;

  cancelTimeLockExecutionWithMetaTx(
    metaTx: MetaTransaction,
    options: TransactionOptions
  ): Promise<TransactionResult>;

  requestAndApproveExecution(
    metaTx: MetaTransaction,
    options: TransactionOptions
  ): Promise<TransactionResult>;
}

