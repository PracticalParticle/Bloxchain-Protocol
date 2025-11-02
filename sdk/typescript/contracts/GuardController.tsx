import { Address, PublicClient, WalletClient, Chain, Hex } from 'viem';
import GuardControllerABIJson from '../../../abi/GuardController.abi.json';
import { TransactionOptions, TransactionResult } from '../interfaces/base.index';
import { IGuardController } from '../interfaces/core.execution.index';
import { MetaTransaction } from '../interfaces/lib.index';
import { DynamicRBAC } from './DynamicRBAC';

/**
 * @title GuardController
 * @notice TypeScript wrapper for GuardController smart contract
 * @dev Lightweight controller for generic contract delegation with full StateAbstraction workflows
 * 
 * This contract provides a complete solution for delegating control to external addresses.
 * It extends DynamicRBAC for runtime function registration and supports all StateAbstraction
 * execution patterns including time-locked transactions, meta-transactions, and payment management.
 */
export class GuardController extends DynamicRBAC implements IGuardController {
  constructor(
    client: PublicClient,
    walletClient: WalletClient | undefined,
    contractAddress: Address,
    chain: Chain
  ) {
    super(client, walletClient, contractAddress, chain);
    // Override ABI to use GuardController ABI
    // Since DynamicRBAC constructor doesn't accept ABI parameter, we override the protected abi property
    (this as any).abi = GuardControllerABIJson;
  }

  // ============ EXECUTION FUNCTIONS ============

  /**
   * @dev Requests a time-locked standard execution via StateAbstraction workflow
   * @param target The address of the target contract
   * @param functionSelector The function selector to execute
   * @param params The encoded parameters for the function
   * @param gasLimit The gas limit for execution
   * @param operationType The operation type hash
   * @param options Transaction options including from address
   * @return TransactionResult with hash and wait function
   * @notice Creates a time-locked transaction that must be approved after the timelock period
   * @notice Requires EXECUTE_TIME_DELAY_REQUEST permission for the function selector
   */
  async executeWithTimeLock(
    target: Address,
    functionSelector: Hex,
    params: Hex,
    gasLimit: bigint,
    operationType: Hex,
    options: TransactionOptions
  ): Promise<TransactionResult> {
    return this.executeWriteContract(
      'executeWithTimeLock',
      [target, functionSelector, params, gasLimit, operationType],
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

  // Note: Function registration methods (registerFunction, unregisterFunction, functionSchemaExists)
  // are already available through inheritance from DynamicRBAC
  // Note: Meta-transaction utility functions (createMetaTxParams,
  // generateUnsignedMetaTransactionForNew, generateUnsignedMetaTransactionForExisting)
  // are already available through inheritance from BaseStateMachine
}

export default GuardController;

