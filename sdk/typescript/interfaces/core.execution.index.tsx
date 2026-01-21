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

  // Target Whitelist Management
  /**
   * @dev Creates execution params for updating the target whitelist for a role and function selector
   * @param roleHash The role hash (currently ignored by GuardController and kept for backwards compatibility)
   * @param functionSelector The function selector
   * @param target The target address to add or remove
   * @param isAdd True to add the target, false to remove
   * @return Promise<Hex> The execution params to be used in a meta-transaction
   */
  updateTargetWhitelistExecutionParams(
    roleHash: Hex,
    functionSelector: Hex,
    target: Address,
    isAdd: boolean
  ): Promise<Hex>;

  /**
   * @dev Requests and approves a whitelist update using a meta-transaction
   * @param metaTx The meta-transaction describing the whitelist update
   * @param options Transaction options including from address
   * @return TransactionResult with hash and wait function
   * @notice OWNER signs, BROADCASTER executes according to GuardControllerDefinitions
   */
  updateTargetWhitelistRequestAndApprove(
    metaTx: MetaTransaction,
    options: TransactionOptions
  ): Promise<TransactionResult>;

  /**
   * @dev Gets all whitelisted targets for a role and function selector
   * @param roleHash The role hash (currently ignored by GuardController and kept for backwards compatibility)
   * @param functionSelector The function selector
   * @return Promise<Address[]> Array of whitelisted target addresses
   * @notice Requires caller to have any role (via _validateAnyRole) for privacy protection
   */
  getAllowedTargets(
    roleHash: Hex,
    functionSelector: Hex
  ): Promise<Address[]>;
}

