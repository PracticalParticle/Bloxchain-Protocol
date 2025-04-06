import { keccak256 as k256, toHex } from 'viem';

/**
 * Helper function to compute keccak256 of a string
 */
const keccak256 = (str: string): string => {
  return toHex(k256(new TextEncoder().encode(str)));
};

/**
 * Enums and constants for MultiPhaseSecureOperation
 */
export const TxStatus = {
  UNDEFINED: 0,
  PENDING: 1,
  CANCELLED: 2,
  COMPLETED: 3,
  FAILED: 4,
  REJECTED: 5
} as const;

export type TxStatus = typeof TxStatus[keyof typeof TxStatus];

export const ExecutionType = {
  NONE: 0,
  STANDARD: 1,
  RAW: 2
} as const;

export type ExecutionType = typeof ExecutionType[keyof typeof ExecutionType];

/**
 * Constants for function selectors
 */
export const FUNCTION_SELECTORS = {
  TX_REQUEST: keccak256("txRequest(address,address,uint256,uint256,bytes32,uint8,bytes)").slice(0, 10),
  TX_DELAYED_APPROVAL: keccak256("txDelayedApproval(uint256)").slice(0, 10),
  TX_CANCELLATION: keccak256("txCancellation(uint256)").slice(0, 10),
  META_TX_APPROVAL: keccak256("txApprovalWithMetaTx((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,uint8,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,address,bytes4,uint256,uint256,uint256,address),bytes,bytes)").slice(0, 10),
  META_TX_CANCELLATION: keccak256("txCancellationWithMetaTx((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,uint8,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,address,bytes4,uint256,uint256,uint256,address),bytes,bytes)").slice(0, 10),
  META_TX_REQUEST_AND_APPROVE: keccak256("requestAndApprove((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,uint8,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,address,bytes4,uint256,uint256,uint256,address),bytes,bytes)").slice(0, 10)
} as const;

export type FunctionSelector = typeof FUNCTION_SELECTORS[keyof typeof FUNCTION_SELECTORS];

/**
 * Constants for roles
 */
export const ROLES = {
  OWNER_ROLE: keccak256("OWNER_ROLE"),
  BROADCASTER_ROLE: keccak256("BROADCASTER_ROLE"),
  RECOVERY_ROLE: keccak256("RECOVERY_ROLE")
} as const;

export type Role = typeof ROLES[keyof typeof ROLES];

/**
 * Constants for EIP-712 type hashes
 */
export const TYPE_HASHES = {
  DOMAIN_SEPARATOR: keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
  META_TRANSACTION: keccak256("MetaTransaction(TxRecord txRecord,MetaTxParams params,bytes data)TxRecord(uint256 txId,uint256 releaseTime,uint8 status,TxParams params,bytes32 message,bytes result,PaymentDetails payment)TxParams(address requester,address target,uint256 value,uint256 gasLimit,bytes32 operationType,uint8 executionType,bytes executionOptions)MetaTxParams(uint256 chainId,uint256 nonce,address handlerContract,bytes4 handlerSelector,uint256 deadline,uint256 maxGasPrice,address signer)PaymentDetails(address recipient,uint256 nativeTokenAmount,address erc20TokenAddress,uint256 erc20TokenAmount)")
} as const;

export type TypeHash = typeof TYPE_HASHES[keyof typeof TYPE_HASHES];

/**
 * Event names
 */
export const EVENTS = {
  REQUESTED_TX: "RequestedTx",
  TX_APPROVED: "TxApproved",
  TX_CANCELLED: "TxCancelled",
  TX_EXECUTED: "TxExecuted"
} as const;

export type Event = typeof EVENTS[keyof typeof EVENTS];