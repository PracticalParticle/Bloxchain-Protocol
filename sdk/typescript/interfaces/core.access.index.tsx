import { Address, Hex } from 'viem';
import { TransactionResult, TransactionOptions } from './base.index';
import { TxRecord, MetaTransaction, MetaTxParams } from './lib.index';
import { ExecutionType, TxAction } from '../types/lib.index';

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
  getBroadcaster(): Promise<Address>;
  getRecovery(): Promise<Address>;
  getTimeLockPeriodSec(): Promise<bigint>;
  owner(): Promise<Address>;

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
  // Role Editing Control
  roleEditingEnabled(): Promise<boolean>;
  updateRoleEditingToggleExecutionOptions(enabled: boolean): Promise<Hex>;
  updateRoleEditingToggleRequestAndApprove(metaTx: MetaTransaction, options: TransactionOptions): Promise<TransactionResult>;

  // Role Management Functions (from contract)
  createNewRole(
    roleName: string,
    maxWallets: bigint,
    functionPermissions: Array<{ functionSelector: Hex; grantedActionsBitmap: number }>,
    options: TransactionOptions
  ): Promise<TransactionResult>;
  removeRole(roleHash: Hex, options: TransactionOptions): Promise<TransactionResult>;

  // Wallet Management Functions (from contract)
  addWalletToRole(roleHash: Hex, wallet: Address, options: TransactionOptions): Promise<TransactionResult>;
  revokeWallet(roleHash: Hex, wallet: Address, options: TransactionOptions): Promise<TransactionResult>;

  // Function Registration (from contract)
  registerFunction(
    functionSignature: string,
    operationName: string,
    supportedActions: TxAction[],
    options: TransactionOptions
  ): Promise<TransactionResult>;
  unregisterFunction(functionSelector: Hex, safeRemoval: boolean, options: TransactionOptions): Promise<TransactionResult>;
  functionSchemaExists(functionSelector: Hex): Promise<boolean>;
  getFunctionSchema(functionSelector: Hex): Promise<{
    functionName: string;
    functionSelectorReturn: Hex;
    operationType: Hex;
    operationName: string;
    supportedActions: TxAction[];
    isProtected: boolean;
  }>;

  // Definition Management (from contract)
  loadDefinitions(
    functionSchemas: Array<{
      functionName: string;
      functionSelector: Hex;
      operationType: Hex;
      operationName: string;
      supportedActionsBitmap: number;
      isProtected: boolean;
    }>,
    roleHashes: Hex[],
    functionPermissions: Array<{ functionSelector: Hex; grantedActionsBitmap: number }>,
    options: TransactionOptions
  ): Promise<TransactionResult>;

  // Query Functions (from contract)
  roleExists(roleHash: Hex): Promise<boolean>;
}
