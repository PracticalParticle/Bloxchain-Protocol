import { Address, Hex } from 'viem';
import { TransactionResult, TransactionOptions } from './base.index';
import { TxRecord, MetaTransaction, MetaTxParams } from './lib.index';
import { TxAction } from '../types/lib.index';
import { Uint16Bitmap } from '../utils/bitmap';

/**
 * Interface for SecureOwnable contract events
 */
export interface OwnershipTransferRequestEvent {
  currentOwner: Address;
  newOwner: Address;
}

export interface OwnershipTransferCancelledEvent {
  txId: bigint;
}

export interface OwnershipTransferUpdatedEvent {
  oldOwner: Address;
  newOwner: Address;
}

export interface BroadcasterUpdateRequestEvent {
  currentBroadcaster: Address;
  newBroadcaster: Address;
}

export interface BroadcasterUpdateCancelledEvent {
  txId: bigint;
}

export interface BroadcasterUpdatedEvent {
  oldBroadcaster: Address;
  newBroadcaster: Address;
}

export interface RecoveryAddressUpdatedEvent {
  oldRecovery: Address;
  newRecovery: Address;
}

export interface TimeLockPeriodUpdatedEvent {
  oldPeriod: bigint;
  newPeriod: bigint;
}

/**
 * Interface for SecureOwnable contract state
 */
export interface SecureOwnableState {
  owner: Address;
  broadcaster: Address;
  recoveryAddress: Address;
  timeLockPeriodSec: bigint;
  operationHistory: Map<bigint, TxRecord>;
}

/**
 * Interface for SecureOwnable contract methods
 */
export interface ISecureOwnable {
  // Ownership Management
  transferOwnershipRequest(options: TransactionOptions): Promise<TransactionResult>;
  transferOwnershipDelayedApproval(txId: bigint, options: TransactionOptions): Promise<TransactionResult>;
  transferOwnershipApprovalWithMetaTx(metaTx: MetaTransaction, options: TransactionOptions): Promise<TransactionResult>;
  transferOwnershipCancellation(txId: bigint, options: TransactionOptions): Promise<TransactionResult>;
  transferOwnershipCancellationWithMetaTx(metaTx: MetaTransaction, options: TransactionOptions): Promise<TransactionResult>;

  // Broadcaster Management
  updateBroadcasterRequest(newBroadcaster: Address, options: TransactionOptions): Promise<TransactionResult>;
  updateBroadcasterDelayedApproval(txId: bigint, options: TransactionOptions): Promise<TransactionResult>;
  updateBroadcasterApprovalWithMetaTx(metaTx: MetaTransaction, options: TransactionOptions): Promise<TransactionResult>;
  updateBroadcasterCancellation(txId: bigint, options: TransactionOptions): Promise<TransactionResult>;
  updateBroadcasterCancellationWithMetaTx(metaTx: MetaTransaction, options: TransactionOptions): Promise<TransactionResult>;

  // Recovery Management
  updateRecoveryExecutionOptions(newRecoveryAddress: Address): Promise<Hex>;
  updateRecoveryRequestAndApprove(metaTx: MetaTransaction, options: TransactionOptions): Promise<TransactionResult>;

  // TimeLock Management
  updateTimeLockExecutionOptions(newTimeLockPeriodSec: bigint): Promise<Hex>;
  updateTimeLockRequestAndApprove(metaTx: MetaTransaction, options: TransactionOptions): Promise<TransactionResult>;

  // Meta Transaction Management
  createMetaTxParams(
    handlerContract: Address,
    handlerSelector: Hex,
    action: TxAction,
    deadline: bigint,
    maxGasPrice: bigint,
    signer: Address
  ): Promise<MetaTxParams>;

  generateUnsignedMetaTransactionForNew(
    requester: Address,
    target: Address,
    value: bigint,
    gasLimit: bigint,
    operationType: Hex,
    executionType: ExecutionType,
    executionOptions: Hex,
    metaTxParams: MetaTxParams
  ): Promise<MetaTransaction>;

  generateUnsignedMetaTransactionForExisting(
    txId: bigint,
    metaTxParams: MetaTxParams
  ): Promise<MetaTransaction>;

  // Getters
  getTransactionHistory(fromTxId: bigint, toTxId: bigint): Promise<TxRecord[]>;
  getTransaction(txId: bigint): Promise<TxRecord>;
  getPendingTransactions(): Promise<bigint[]>;
  getTimeLockPeriodSec(): Promise<bigint>;
  // Note: owner(), getBroadcaster(), and getRecovery() are available through BaseStateMachine inheritance

  // Operation Type Support
  getSupportedOperationTypes(): Promise<Hex[]>;
  getSupportedRoles(): Promise<Hex[]>;
  getSupportedFunctions(): Promise<Hex[]>;

  // Additional Query Functions
  hasRole(roleHash: Hex, wallet: Address): Promise<boolean>;
  isActionSupportedByFunction(functionSelector: Hex, action: TxAction): Promise<boolean>;
  getSignerNonce(signer: Address): Promise<bigint>;
  getActiveRolePermissions(roleHash: Hex): Promise<any[]>;
  initialized(): Promise<boolean>;

  // Interface Support
  supportsInterface(interfaceId: Hex): Promise<boolean>;
}

/**
 * Interface for DynamicRBAC contract methods
 * Note: This interface matches the actual contract methods. Some convenience methods
 * may be provided but are not part of the core contract interface.
 */
export interface IDynamicRBAC {
  /**
   * @dev Creates execution options for a RBAC configuration batch
   */
  roleConfigBatchExecutionOptions(
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
    functionName: string;
    functionSelectorReturn: Hex;
    operationType: Hex;
    operationName: string;
    supportedActions: TxAction[];
    isProtected: boolean;
  }>;
}
