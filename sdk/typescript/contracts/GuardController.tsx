import { Address, PublicClient, WalletClient, Chain, Hex } from 'viem';
import GuardControllerABIJson from '../../../abi/GuardController.abi.json';
import { TransactionOptions, TransactionResult } from '../interfaces/base.index';
import { IGuardController } from '../interfaces/core.execution.index';
import { MetaTransaction } from '../interfaces/lib.index';
import { BaseStateMachine } from './BaseStateMachine';
import { INTERFACE_IDS } from '../utils/interface-ids';

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

  // ============ TARGET WHITELIST MANAGEMENT ============

  /**
   * @dev Creates execution params for updating the target whitelist for a function selector.
   * @param functionSelector The function selector
   * @param target The target address to add or remove
   * @param isAdd True to add the target, false to remove
   * @return Promise<Hex> The execution params to be used in a meta-transaction
   * @notice Validation focuses on basic input checks; full validation occurs during execution
   */
  async updateTargetWhitelistExecutionParams(
    functionSelector: Hex,
    target: Address,
    isAdd: boolean
  ): Promise<Hex> {
    const result = await this.executeReadContract<any>('updateTargetWhitelistExecutionParams', [
      functionSelector,
      target,
      isAdd
    ]);
    
    // viem returns bytes as Hex string, but ensure it's properly formatted
    if (result === null || result === undefined) {
      throw new Error('updateTargetWhitelistExecutionParams returned null or undefined');
    }
    
    // Convert to Hex if needed
    if (typeof result === 'string' && result.startsWith('0x')) {
      return result as Hex;
    }
    
    // If result is Uint8Array, convert to Hex
    if (result instanceof Uint8Array) {
      const { toHex } = await import('viem');
      return toHex(result) as Hex;
    }
    
    // If result is already a Hex type from viem
    if (typeof result === 'string') {
      return `0x${result.replace(/^0x/, '')}` as Hex;
    }
    
    throw new Error(`Unexpected return type from updateTargetWhitelistExecutionParams: ${typeof result}, value: ${result}`);
  }

  /**
   * @dev Requests and approves a whitelist update using a meta-transaction
   * @param metaTx The meta-transaction describing the whitelist update
   * @param options Transaction options including from address
   * @return TransactionResult with hash and wait function
   * @notice OWNER signs, BROADCASTER executes according to GuardControllerDefinitions
   */
  async updateTargetWhitelistRequestAndApprove(
    metaTx: MetaTransaction,
    options: TransactionOptions
  ): Promise<TransactionResult> {
    return this.executeWriteContract('updateTargetWhitelistRequestAndApprove', [metaTx], options);
  }

  /**
   * @dev Gets all whitelisted targets for a role and function selector.
   * @param roleHash The role hash (currently ignored by the underlying contract; kept for backwards compatibility)
   * @param functionSelector The function selector
   * @return Promise<Address[]> Array of whitelisted target addresses
   * @notice Requires caller to have any role (via _validateAnyRole) for privacy protection
   */
  async getAllowedTargets(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    roleHash: Hex,
    functionSelector: Hex
  ): Promise<Address[]> {
    const result = await this.executeReadContract<Address[]>('getAllowedTargets', [
      functionSelector
    ]);
    
    if (!Array.isArray(result)) {
      throw new Error(`Unexpected return type from getAllowedTargets: ${typeof result}`);
    }
    
    return result;
  }

  // ============ INTERFACE SUPPORT ============

  /**
   * @dev Check if this contract supports IGuardController interface
   * @return Promise<boolean> indicating if IGuardController is supported
   */
  async supportsGuardControllerInterface(): Promise<boolean> {
    return this.supportsInterface(INTERFACE_IDS.IGuardController);
  }

  // Note: Function schema query (functionSchemaExists) is available through inheritance from BaseStateMachine
  // Note: Meta-transaction utility functions (createMetaTxParams,
  // generateUnsignedMetaTransactionForNew, generateUnsignedMetaTransactionForExisting)
  // are already available through inheritance from BaseStateMachine
  // Note: For role management and function registration, combine with RuntimeRBAC
  // Note: executeUpdateTargetWhitelist is an internal execution function called by the contract itself
  //       during StateAbstraction workflows - it should not be called directly
}

export default GuardController;

