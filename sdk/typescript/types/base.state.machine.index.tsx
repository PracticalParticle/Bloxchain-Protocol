import { keccak256 } from 'viem';
import { ENGINE_BLOX_META_TX_PARAMS } from './meta-tx-signatures.js';

/**
 * @deprecated Not defined in EngineBlox.sol operation-type registry. Prefer component `*_OPERATION_TYPES` (e.g. CONTROLLER_OPERATION).
 */
export const BASE_STATE_MACHINE_OPERATION_TYPES = {
  TX_REQUEST: keccak256(new TextEncoder().encode('TX_REQUEST')),
  TX_DELAYED_APPROVAL: keccak256(new TextEncoder().encode('TX_DELAYED_APPROVAL')),
  TX_CANCELLATION: keccak256(new TextEncoder().encode('TX_CANCELLATION')),
  META_TX_APPROVAL: keccak256(new TextEncoder().encode('META_TX_APPROVAL')),
  META_TX_CANCELLATION: keccak256(new TextEncoder().encode('META_TX_CANCELLATION')),
  META_TX_REQUEST_AND_APPROVE: keccak256(new TextEncoder().encode('META_TX_REQUEST_AND_APPROVE')),
} as const;

export type BaseStateMachineOperationType =
  (typeof BASE_STATE_MACHINE_OPERATION_TYPES)[keyof typeof BASE_STATE_MACHINE_OPERATION_TYPES];

/**
 * Function selectors for IBaseStateMachine (contracts/core/base/interface/IBaseStateMachine.sol).
 */
export const BASE_STATE_MACHINE_FUNCTION_SELECTORS = {
  CREATE_META_TX_PARAMS: keccak256(
    new TextEncoder().encode('createMetaTxParams(address,bytes4,uint8,uint256,uint256,address)')
  ).slice(0, 10),
  GENERATE_UNSIGNED_META_TX_FOR_NEW: keccak256(
    new TextEncoder().encode(
      `generateUnsignedMetaTransactionForNew(address,address,uint256,uint256,bytes32,bytes4,bytes,${ENGINE_BLOX_META_TX_PARAMS})`
    )
  ).slice(0, 10),
  GENERATE_UNSIGNED_META_TX_FOR_EXISTING: keccak256(
    new TextEncoder().encode(
      `generateUnsignedMetaTransactionForExisting(uint256,${ENGINE_BLOX_META_TX_PARAMS})`
    )
  ).slice(0, 10),
  GET_TRANSACTION_HISTORY: keccak256(
    new TextEncoder().encode('getTransactionHistory(uint256,uint256)')
  ).slice(0, 10),
  GET_TRANSACTION: keccak256(new TextEncoder().encode('getTransaction(uint256)')).slice(0, 10),
  GET_PENDING_TRANSACTIONS: keccak256(new TextEncoder().encode('getPendingTransactions()')).slice(0, 10),
  HAS_ROLE: keccak256(new TextEncoder().encode('hasRole(bytes32,address)')).slice(0, 10),
  GET_FUNCTION_SCHEMA: keccak256(new TextEncoder().encode('getFunctionSchema(bytes4)')).slice(0, 10),
  GET_ACTIVE_ROLE_PERMISSIONS: keccak256(
    new TextEncoder().encode('getActiveRolePermissions(bytes32)')
  ).slice(0, 10),
  GET_SIGNER_NONCE: keccak256(new TextEncoder().encode('getSignerNonce(address)')).slice(0, 10),
  GET_SUPPORTED_OPERATION_TYPES: keccak256(
    new TextEncoder().encode('getSupportedOperationTypes()')
  ).slice(0, 10),
  GET_SUPPORTED_ROLES: keccak256(new TextEncoder().encode('getSupportedRoles()')).slice(0, 10),
  GET_SUPPORTED_FUNCTIONS: keccak256(new TextEncoder().encode('getSupportedFunctions()')).slice(0, 10),
  GET_TIME_LOCK_PERIOD_SEC: keccak256(new TextEncoder().encode('getTimeLockPeriodSec()')).slice(0, 10),
  INITIALIZED: keccak256(new TextEncoder().encode('initialized()')).slice(0, 10),
} as const;

export type BaseStateMachineFunctionSelector =
  (typeof BASE_STATE_MACHINE_FUNCTION_SELECTORS)[keyof typeof BASE_STATE_MACHINE_FUNCTION_SELECTORS];

export const CORE_ROLE_HASHES = {
  OWNER_ROLE: keccak256(new TextEncoder().encode('OWNER_ROLE')),
  BROADCASTER_ROLE: keccak256(new TextEncoder().encode('BROADCASTER_ROLE')),
  RECOVERY_ROLE: keccak256(new TextEncoder().encode('RECOVERY_ROLE')),
} as const;

export type CoreRoleHash = (typeof CORE_ROLE_HASHES)[keyof typeof CORE_ROLE_HASHES];
