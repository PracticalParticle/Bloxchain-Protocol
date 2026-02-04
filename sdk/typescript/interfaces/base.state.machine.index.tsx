import { Address, Hex } from 'viem';
// import { TransactionResult, TransactionOptions } from './base.index';
import { TxRecord, MetaTransaction, MetaTxParams } from './lib.index';
import { TxAction } from '../types/lib.index';

/**
 * Interface for BaseStateMachine contract events
 */
export interface TransactionRequestedEvent {
  txId: bigint;
  requester: Address;
  operationType: Hex;
  releaseTime: bigint;
}

export interface TransactionApprovedEvent {
  txId: bigint;
  operationType: Hex;
  approver: Address;
}

export interface TransactionCancelledEvent {
  txId: bigint;
  operationType: Hex;
  canceller: Address;
}

export interface TransactionExecutedEvent {
  txId: bigint;
  operationType: Hex;
  success: boolean;
}

/**
 * Interface for BaseStateMachine contract state
 */
export interface BaseStateMachineState {
  initialized: boolean;
  txCounter: bigint;
  timeLockPeriodSec: bigint;
  supportedOperationTypes: Hex[];
  supportedRoles: Hex[];
  supportedFunctions: Hex[];
}

/**
 * Interface for BaseStateMachine contract methods
 */
export interface IBaseStateMachine {
  // Meta-transaction utilities
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
    executionSelector: Hex,
    executionParams: Hex,
    metaTxParams: MetaTxParams
  ): Promise<MetaTransaction>;

  generateUnsignedMetaTransactionForExisting(
    txId: bigint,
    metaTxParams: MetaTxParams
  ): Promise<MetaTransaction>;

  // State queries
  getTransactionHistory(fromTxId: bigint, toTxId: bigint): Promise<TxRecord[]>;
  getTransaction(txId: bigint): Promise<TxRecord>;
  getPendingTransactions(): Promise<bigint[]>;

  // Role and permission queries
  getRole(roleHash: Hex): Promise<{
    roleName: string;
    roleHashReturn: Hex;
    maxWallets: bigint;
    walletCount: bigint;
    isProtected: boolean;
  }>;
  hasRole(roleHash: Hex, wallet: Address): Promise<boolean>;
  getWalletRoles(wallet: Address): Promise<Hex[]>;
  getWalletsInRole(roleHash: Hex): Promise<Address[]>;
  functionSchemaExists(functionSelector: Hex): Promise<boolean>;
  getFunctionSchema(functionSelector: Hex): Promise<{
    functionSignature: string;
    functionSelectorReturn: Hex;
    operationType: Hex;
    operationName: string;
    supportedActions: TxAction[];
    isProtected: boolean;
  }>;
  isActionSupportedByFunction(functionSelector: Hex, action: TxAction): Promise<boolean>;
  getActiveRolePermissions(roleHash: Hex): Promise<any[]>;
  getSignerNonce(signer: Address): Promise<bigint>;

  // System state queries
  getSupportedOperationTypes(): Promise<Hex[]>;
  getSupportedRoles(): Promise<Hex[]>;
  getSupportedFunctions(): Promise<Hex[]>;
  getTimeLockPeriodSec(): Promise<bigint>;
  initialized(): Promise<boolean>;

  // System role query functions
  owner(): Promise<Address>;
  getBroadcasters(): Promise<Address[]>;
  getRecovery(): Promise<Address>;

  // Interface support
  supportsInterface(interfaceId: Hex): Promise<boolean>;
}
