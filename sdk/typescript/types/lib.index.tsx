import { keccak256 as k256, toHex } from 'viem';

const keccak256 = (str: string): string => {
  return toHex(k256(new TextEncoder().encode(str)));
};

/**
 * Enums and constants for EngineBlox (match contracts/core/lib/EngineBlox.sol).
 */
export const TxStatus = {
  UNDEFINED: 0,
  PENDING: 1,
  EXECUTING: 2,
  PROCESSING_PAYMENT: 3,
  CANCELLED: 4,
  COMPLETED: 5,
  FAILED: 6,
} as const;

export type TxStatus = (typeof TxStatus)[keyof typeof TxStatus];

export const TxAction = {
  EXECUTE_TIME_DELAY_REQUEST: 0,
  EXECUTE_TIME_DELAY_APPROVE: 1,
  EXECUTE_TIME_DELAY_CANCEL: 2,
  SIGN_META_REQUEST_AND_APPROVE: 3,
  SIGN_META_APPROVE: 4,
  SIGN_META_CANCEL: 5,
  EXECUTE_META_REQUEST_AND_APPROVE: 6,
  EXECUTE_META_APPROVE: 7,
  EXECUTE_META_CANCEL: 8,
} as const;

export type TxAction = (typeof TxAction)[keyof typeof TxAction];

/**
 * Core role hashes (match EngineBlox OWNER_ROLE / BROADCASTER_ROLE / RECOVERY_ROLE).
 */
export const ROLES = {
  OWNER_ROLE: keccak256('OWNER_ROLE'),
  BROADCASTER_ROLE: keccak256('BROADCASTER_ROLE'),
  RECOVERY_ROLE: keccak256('RECOVERY_ROLE'),
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

/**
 * @deprecated Pre–EngineBlox tx surface; not used by current contracts. Use component `*_FUNCTION_SELECTORS` from types/core.*.index instead.
 */
export const LEGACY_ENGINE_BLOX_FUNCTION_SELECTORS = {
  TX_REQUEST: keccak256('txRequest(address,address,uint256,uint256,bytes32,uint8,bytes)').slice(0, 10),
  TX_DELAYED_APPROVAL: keccak256('txDelayedApproval(uint256)').slice(0, 10),
  TX_CANCELLATION: keccak256('txCancellation(uint256)').slice(0, 10),
} as const;

/**
 * @deprecated Use EIP-712 types in `utils/metaTx/metaTransaction.tsx` (`META_TX_TYPES`) — matches selective MetaTxRecord signing in EngineBlox.sol.
 */
export const LEGACY_TYPE_HASHES = {
  DOMAIN_SEPARATOR: keccak256(
    'EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)'
  ),
} as const;

/**
 * Event names (EngineBlox transaction lifecycle).
 */
export const EVENTS = {
  REQUESTED_TX: 'RequestedTx',
  TX_APPROVED: 'TxApproved',
  TX_CANCELLED: 'TxCancelled',
  TX_EXECUTED: 'TxExecuted',
} as const;

export type Event = (typeof EVENTS)[keyof typeof EVENTS];
