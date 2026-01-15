import { Address, PublicClient, WalletClient, Chain, Hex } from 'viem';
import GuardControllerABIJson from '../../../abi/GuardController.abi.json';
import { TransactionOptions, TransactionResult } from '../interfaces/base.index';
import { IGuardController } from '../interfaces/core.execution.index';
import { MetaTransaction } from '../interfaces/lib.index';
import { BaseStateMachine } from './BaseStateMachine';

/**
 * @title GuardController
 * @notice TypeScript wrapper for GuardController smart contract
 * @dev Lightweight controller for generic contract delegation with full StateAbstraction workflows
 * 
 * This contract provides a complete solution for delegating control to external addresses.
 * It extends BaseStateMachine for core state machine functionality and supports all StateAbstraction
 * execution patterns including time-locked transactions, meta-transactions, and payment management.
 * 
 * This contract is modular and can be combined with RuntimeRBAC and SecureOwnable for role management.
 */
export class GuardController extends BaseStateMachine implements IGuardController {
  constructor(
    client: PublicClient,
    walletClient: WalletClient | undefined,
    contractAddress: Address,
    chain: Chain
  ) {
    super(client, walletClient, contractAddress, chain, GuardControllerABIJson);
  }

  // ============ INITIALIZATION ============

  /**
   * @notice Initializer to initialize GuardController
   * @param initialOwner The initial owner address
   * @param broadcaster The broadcaster address
   * @param recovery The recovery address
   * @param timeLockPeriodSec The timelock period in seconds
   * @param eventForwarder The event forwarder address
   * @param options Transaction options including from address
   * @return TransactionResult with hash and wait function
   */
  async initialize(
    initialOwner: Address,
    broadcaster: Address,
    recovery: Address,
    timeLockPeriodSec: bigint,
    eventForwarder: Address,
    options: TransactionOptions
  ): Promise<TransactionResult> {
    return this.executeWriteContract(
      'initialize',
      [initialOwner, broadcaster, recovery, timeLockPeriodSec, eventForwarder],
      options
    );
  }

  // ============ EXECUTION FUNCTIONS ============

  /**
   * @dev Requests a time-locked execution via StateAbstraction workflow
   * @param target The address of the target contract
   * @param value The ETH value to send (0 for standard function calls)
   * @param functionSelector The function selector to execute (0x00000000 for simple ETH transfers)
   * @param params The encoded parameters for the function (empty for simple ETH transfers)
   * @param gasLimit The gas limit for execution
   * @param operationType The operation type hash
   * @param options Transaction options including from address
   * @return TransactionResult with hash and wait function
   * @notice Creates a time-locked transaction that must be approved after the timelock period
   * @notice Requires EXECUTE_TIME_DELAY_REQUEST permission for the function selector
   * @notice For standard function calls: value=0, functionSelector=non-zero, params=encoded data
   * @notice For simple ETH transfers: value>0, functionSelector=0x00000000, params=""
   */
  async executeWithTimeLock(
    target: Address,
    value: bigint,
    functionSelector: Hex,
    params: Hex,
    gasLimit: bigint,
    operationType: Hex,
    options: TransactionOptions
  ): Promise<TransactionResult> {
    return this.executeWriteContract(
      'executeWithTimeLock',
      [target, value, functionSelector, params, gasLimit, operationType],
      options
    );
  }

  /**
   * @dev Approves and executes a time-locked transaction
   * @param txId The transaction ID
   * @param options Transaction options including from address
   * @return TransactionResult with hash and wait function
   * @notice Requires STANDARD execution type and EXECUTE_TIME_DELAY_APPROVE permission for the execution function
   */
  async approveTimeLockExecution(
    txId: bigint,
    options: TransactionOptions
  ): Promise<TransactionResult> {
    return this.executeWriteContract(
      'approveTimeLockExecution',
      [txId],
      options
    );
  }

  /**
   * @dev Cancels a time-locked transaction
   * @param txId The transaction ID
   * @param options Transaction options including from address
   * @return TransactionResult with hash and wait function
   * @notice Requires STANDARD execution type and EXECUTE_TIME_DELAY_CANCEL permission for the execution function
   */
  async cancelTimeLockExecution(
    txId: bigint,
    options: TransactionOptions
  ): Promise<TransactionResult> {
    return this.executeWriteContract(
      'cancelTimeLockExecution',
      [txId],
      options
    );
  }

  /**
   * @dev Approves a time-locked transaction using a meta-transaction
   * @param metaTx The meta-transaction containing the transaction record and signature
   * @param options Transaction options including from address
   * @return TransactionResult with hash and wait function
   * @notice Requires STANDARD execution type and EXECUTE_META_APPROVE permission for the execution function
   */
  async approveTimeLockExecutionWithMetaTx(
    metaTx: MetaTransaction,
    options: TransactionOptions
  ): Promise<TransactionResult> {
    return this.executeWriteContract(
      'approveTimeLockExecutionWithMetaTx',
      [metaTx],
      options
    );
  }

  /**
   * @dev Cancels a time-locked transaction using a meta-transaction
   * @param metaTx The meta-transaction containing the transaction record and signature
   * @param options Transaction options including from address
   * @return TransactionResult with hash and wait function
   * @notice Requires STANDARD execution type and EXECUTE_META_CANCEL permission for the execution function
   */
  async cancelTimeLockExecutionWithMetaTx(
    metaTx: MetaTransaction,
    options: TransactionOptions
  ): Promise<TransactionResult> {
    return this.executeWriteContract(
      'cancelTimeLockExecutionWithMetaTx',
      [metaTx],
      options
    );
  }

  /**
   * @dev Requests and approves a transaction in one step using a meta-transaction
   * @param metaTx The meta-transaction containing the transaction record and signature
   * @param options Transaction options including from address
   * @return TransactionResult with hash and wait function
   * @notice Requires STANDARD execution type
   * @notice Validates function schema and permissions for the execution function (same as executeWithTimeLock)
   * @notice Requires EXECUTE_META_REQUEST_AND_APPROVE permission for the execution function selector
   */
  async requestAndApproveExecution(
    metaTx: MetaTransaction,
    options: TransactionOptions
  ): Promise<TransactionResult> {
    return this.executeWriteContract(
      'requestAndApproveExecution',
      [metaTx],
      options
    );
  }

  // Note: Function schema query (functionSchemaExists) is available through inheritance from BaseStateMachine
  // Note: Meta-transaction utility functions (createMetaTxParams,
  // generateUnsignedMetaTransactionForNew, generateUnsignedMetaTransactionForExisting)
  // are already available through inheritance from BaseStateMachine
  // Note: For role management and function registration, combine with RuntimeRBAC
}

export default GuardController;

