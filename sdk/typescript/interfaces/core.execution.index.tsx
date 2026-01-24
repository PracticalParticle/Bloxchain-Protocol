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

  // Guard Configuration Batch
  /**
   * @dev Creates execution params for a guard configuration batch
   * @param actions Encoded guard configuration actions
   * @return Promise<Hex> The execution params to be used in a meta-transaction
   */
  guardConfigBatchExecutionParams(
    actions: Array<{ actionType: number; data: Hex }>
  ): Promise<Hex>;

  /**
   * @dev Requests and approves a guard configuration batch using a meta-transaction
   * @param metaTx The meta-transaction describing the guard configuration batch
   * @param options Transaction options including from address
   * @return TransactionResult with hash and wait function
   * @notice OWNER signs, BROADCASTER executes according to GuardControllerDefinitions
   * @notice Supports whitelist management and function schema registration
   */
  guardConfigBatchRequestAndApprove(
    metaTx: MetaTransaction,
    options: TransactionOptions
  ): Promise<TransactionResult>;

  /**
   * @dev Gets all whitelisted targets for a function selector
   * @param functionSelector The function selector
   * @return Promise<Address[]> Array of whitelisted target addresses
   * @notice Requires caller to have any role (via _validateAnyRole) for privacy protection
   */
  getAllowedTargets(
    functionSelector: Hex
  ): Promise<Address[]>;
}

