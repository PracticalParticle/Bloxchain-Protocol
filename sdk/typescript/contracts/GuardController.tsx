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
   * @param txId The transaction ID to approve
   * @param expectedOperationType The expected operation type for validation
   * @param options Transaction options including from address
   * @return TransactionResult with hash and wait function
   */
  async approveTimeLockExecution(
    txId: bigint,
    expectedOperationType: Hex,
    options: TransactionOptions
  ): Promise<TransactionResult> {
    return this.executeWriteContract(
      'approveTimeLockExecution',
      [txId, expectedOperationType],
      options
    );
  }

  /**
   * @dev Cancels a time-locked transaction
   * @param txId The transaction ID to cancel
   * @param expectedOperationType The expected operation type for validation
   * @param options Transaction options including from address
   * @return TransactionResult with hash and wait function
   */
  async cancelTimeLockExecution(
    txId: bigint,
    expectedOperationType: Hex,
    options: TransactionOptions
  ): Promise<TransactionResult> {
    return this.executeWriteContract(
      'cancelTimeLockExecution',
      [txId, expectedOperationType],
      options
    );
  }

  /**
   * @dev Approves a time-locked transaction using a meta-transaction
   * @param metaTx The meta-transaction object
   * @param expectedOperationType The expected operation type for validation
   * @param requiredSelector The required function selector
   * @param options Transaction options including from address
   * @return TransactionResult with hash and wait function
   */
  async approveTimeLockExecutionWithMetaTx(
    metaTx: MetaTransaction,
    expectedOperationType: Hex,
    requiredSelector: Hex,
    options: TransactionOptions
  ): Promise<TransactionResult> {
    return this.executeWriteContract(
      'approveTimeLockExecutionWithMetaTx',
      [metaTx, expectedOperationType, requiredSelector],
      options
    );
  }

  /**
   * @dev Cancels a time-locked transaction using a meta-transaction
   * @param metaTx The meta-transaction object
   * @param expectedOperationType The expected operation type for validation
   * @param requiredSelector The required function selector
   * @param options Transaction options including from address
   * @return TransactionResult with hash and wait function
   */
  async cancelTimeLockExecutionWithMetaTx(
    metaTx: MetaTransaction,
    expectedOperationType: Hex,
    requiredSelector: Hex,
    options: TransactionOptions
  ): Promise<TransactionResult> {
    return this.executeWriteContract(
      'cancelTimeLockExecutionWithMetaTx',
      [metaTx, expectedOperationType, requiredSelector],
      options
    );
  }

  /**
   * @dev Requests and approves a transaction in one step using a meta-transaction
   * @param metaTx The meta-transaction object
   * @param requiredSelector The required function selector
   * @param options Transaction options including from address
   * @return TransactionResult with hash and wait function
   */
  async requestAndApproveExecution(
    metaTx: MetaTransaction,
    requiredSelector: Hex,
    options: TransactionOptions
  ): Promise<TransactionResult> {
    return this.executeWriteContract(
      'requestAndApproveExecution',
      [metaTx, requiredSelector],
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

