import { Address, Hex } from 'viem';
import { TxStatus, ExecutionType, TxAction } from '../types/lib.index';
// import { ReadableOperationType } from '../types/definition.index';

/**
 * Interfaces for execution options
 */
export interface StandardExecutionOptions {
  functionSelector: Hex;
  params: Hex;
}

export interface RawExecutionOptions {
  rawTxData: Hex;
}

/**
 * Payment and transaction related interfaces
 */
export interface PaymentDetails {
  recipient: Address;
  nativeTokenAmount: bigint;
  erc20TokenAddress: Address;
  erc20TokenAmount: bigint;
}

export interface TxParams {
  requester: Address;
  target: Address;
  value: bigint;
  gasLimit: bigint;
  operationType: Hex;
  executionType: ExecutionType;
  executionOptions: Hex;
}

export interface MetaTxParams {
  chainId: bigint;
  nonce: bigint;
  handlerContract: Address;
  handlerSelector: Hex;
  action: TxAction;
  deadline: bigint;
  maxGasPrice: bigint;
  signer: Address;
}

export interface TxRecord {
  txId: bigint;
  releaseTime: bigint;
  status: TxStatus;
  params: TxParams;
  message: Hex;
  result: Hex;
  payment: PaymentDetails;
}

export interface MetaTransaction {
  txRecord: TxRecord;
  params: MetaTxParams;
  message: Hex;
  signature: Hex;
  data: Hex;
}

/**
 * State management interfaces
 */

export interface SecureOperationState {
  txRecords: Map<bigint, TxRecord>;
  roles: Map<Hex, Address>;
  authorizedSigners: Map<Address, boolean>;
  allowedRolesForFunction: Map<Hex, Hex[]>;
  supportedOperationTypes: Map<Hex, boolean>;
  operationTypeNames: Map<Hex, string>;
  txCounter: bigint;
  metaTxNonce: bigint;
  timeLockPeriodSec: bigint;
  supportedOperationTypesList: Hex[];
}

/**
 * Event interfaces
 */
export interface RequestedTxEvent {
  txId: bigint;
  releaseTime: bigint;
  target: Address;
  executionType: ExecutionType;
  executionOptions: Hex;
}

export interface TxApprovedEvent {
  txId: bigint;
}

export interface TxCancelledEvent {
  txId: bigint;
}

export interface TxExecutedEvent {
  txId: bigint;
  success: boolean;
  result: string;
}
