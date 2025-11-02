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
 */
export interface IDynamicRBAC {
  // Role Management Functions
  createRole(roleName: string, maxWallets: bigint, options: TransactionOptions): Promise<TransactionResult>;
  updateRole(roleHash: Hex, newRoleName: string, newMaxWallets: bigint, options: TransactionOptions): Promise<TransactionResult>;
  deleteRole(roleHash: Hex, options: TransactionOptions): Promise<TransactionResult>;

  // Wallet Management Functions
  addWalletToRole(roleHash: Hex, wallet: Address, options: TransactionOptions): Promise<TransactionResult>;
  revokeWallet(roleHash: Hex, wallet: Address, options: TransactionOptions): Promise<TransactionResult>;
  replaceWalletInRole(roleHash: Hex, newWallet: Address, oldWallet: Address, options: TransactionOptions): Promise<TransactionResult>;

  // Permission Management Functions
  addFunctionPermissionToRole(roleHash: Hex, functionSelector: Hex, action: TxAction, options: TransactionOptions): Promise<TransactionResult>;
  removeFunctionPermissionFromRole(roleHash: Hex, functionSelector: Hex, options: TransactionOptions): Promise<TransactionResult>;

  // Query Functions
  getDynamicRoles(): Promise<Hex[]>;
  getAllRoles(): Promise<Hex[]>;
  getRoleInfo(roleHash: Hex): Promise<{
    roleName: string;
    roleHashReturn: Hex;
    maxWallets: bigint;
    walletCount: bigint;
    isProtected: boolean;
    authorizedWallets: Address[];
    functionPermissions: any[];
  }>;
  hasRole(roleHash: Hex, wallet: Address): Promise<boolean>;
  getWalletsInRole(roleHash: Hex): Promise<Address[]>;
  getRolePermissions(roleHash: Hex): Promise<{
    functionSelectors: Hex[];
    actions: TxAction[];
  }>;
  roleExists(roleHash: Hex): Promise<boolean>;
  isRoleProtected(roleHash: Hex): Promise<boolean>;
  getRoleWalletCount(roleHash: Hex): Promise<bigint>;
  isRoleAtCapacity(roleHash: Hex): Promise<boolean>;
}
