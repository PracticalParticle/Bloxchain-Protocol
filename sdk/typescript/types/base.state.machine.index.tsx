import { keccak256 } from 'viem';

/**
 * Constants for BaseStateMachine operations
 */
export const BASE_STATE_MACHINE_OPERATION_TYPES = {
  // Core state machine operations
  TX_REQUEST: keccak256(new TextEncoder().encode("TX_REQUEST")),
  TX_DELAYED_APPROVAL: keccak256(new TextEncoder().encode("TX_DELAYED_APPROVAL")),
  TX_CANCELLATION: keccak256(new TextEncoder().encode("TX_CANCELLATION")),
  META_TX_APPROVAL: keccak256(new TextEncoder().encode("META_TX_APPROVAL")),
  META_TX_CANCELLATION: keccak256(new TextEncoder().encode("META_TX_CANCELLATION")),
  META_TX_REQUEST_AND_APPROVE: keccak256(new TextEncoder().encode("META_TX_REQUEST_AND_APPROVE"))
} as const;

export type BaseStateMachineOperationType = typeof BASE_STATE_MACHINE_OPERATION_TYPES[keyof typeof BASE_STATE_MACHINE_OPERATION_TYPES];

/**
 * Constants for BaseStateMachine function selectors
 */
export const BASE_STATE_MACHINE_FUNCTION_SELECTORS = {
  // Meta-transaction utilities
  CREATE_META_TX_PARAMS: keccak256(new TextEncoder().encode("createMetaTxParams(address,bytes4,uint8,uint256,uint256,address)")).slice(0, 10),
  GENERATE_UNSIGNED_META_TX_FOR_NEW: keccak256(new TextEncoder().encode("generateUnsignedMetaTransactionForNew(address,address,uint256,uint256,bytes32,uint8,bytes,(uint256,uint256,address,bytes4,uint256,uint256,address))")).slice(0, 10),
  GENERATE_UNSIGNED_META_TX_FOR_EXISTING: keccak256(new TextEncoder().encode("generateUnsignedMetaTransactionForExisting(uint256,(uint256,uint256,address,bytes4,uint256,uint256,address))")).slice(0, 10),
  
  // State queries
  GET_TRANSACTION_HISTORY: keccak256(new TextEncoder().encode("getTransactionHistory(uint256,uint256)")).slice(0, 10),
  GET_TRANSACTION: keccak256(new TextEncoder().encode("getTransaction(uint256)")).slice(0, 10),
  GET_PENDING_TRANSACTIONS: keccak256(new TextEncoder().encode("getPendingTransactions()")).slice(0, 10),
  
  // Role and permission queries
  HAS_ROLE: keccak256(new TextEncoder().encode("hasRole(bytes32,address)")).slice(0, 10),
  GET_ACTIVE_ROLE_PERMISSIONS: keccak256(new TextEncoder().encode("getActiveRolePermissions(bytes32)")).slice(0, 10),
  GET_SIGNER_NONCE: keccak256(new TextEncoder().encode("getSignerNonce(address)")).slice(0, 10),
  
  // System state queries
  GET_SUPPORTED_OPERATION_TYPES: keccak256(new TextEncoder().encode("getSupportedOperationTypes()")).slice(0, 10),
  GET_SUPPORTED_ROLES: keccak256(new TextEncoder().encode("getSupportedRoles()")).slice(0, 10),
  GET_SUPPORTED_FUNCTIONS: keccak256(new TextEncoder().encode("getSupportedFunctions()")).slice(0, 10),
  GET_TIME_LOCK_PERIOD_SEC: keccak256(new TextEncoder().encode("getTimeLockPeriodSec()")).slice(0, 10),
  INITIALIZED: keccak256(new TextEncoder().encode("initialized()")).slice(0, 10),
  
  // Interface support
  SUPPORTS_INTERFACE: keccak256(new TextEncoder().encode("supportsInterface(bytes4)")).slice(0, 10)
} as const;

export type BaseStateMachineFunctionSelector = typeof BASE_STATE_MACHINE_FUNCTION_SELECTORS[keyof typeof BASE_STATE_MACHINE_FUNCTION_SELECTORS];

/**
 * Constants for core role hashes
 */
export const CORE_ROLE_HASHES = {
  OWNER_ROLE: keccak256(new TextEncoder().encode("OWNER_ROLE")),
  BROADCASTER_ROLE: keccak256(new TextEncoder().encode("BROADCASTER_ROLE")),
  RECOVERY_ROLE: keccak256(new TextEncoder().encode("RECOVERY_ROLE"))
} as const;

export type CoreRoleHash = typeof CORE_ROLE_HASHES[keyof typeof CORE_ROLE_HASHES];
