import { keccak256, Hex } from 'viem';
import { metaTxHandlerSignature } from './meta-tx-signatures.js';

/**
 * RoleConfigActionType enum matching Solidity RuntimeRBAC.RoleConfigActionType
 */
export enum RoleConfigActionType {
  CREATE_ROLE = 0,
  REMOVE_ROLE = 1,
  ADD_WALLET = 2,
  REVOKE_WALLET = 3,
  ADD_FUNCTION_TO_ROLE = 4,
  REMOVE_FUNCTION_FROM_ROLE = 5
}

/**
 * Type for RoleConfigAction struct
 */
export interface RoleConfigAction {
  actionType: RoleConfigActionType;
  data: Hex;
}

/**
 * Constants for RuntimeRBAC operation types
 * These match the keccak256 hashes defined in RuntimeRBACDefinitions.sol
 */
export const RUNTIME_RBAC_OPERATION_TYPES = {
  ROLE_CONFIG_BATCH: keccak256(new TextEncoder().encode("ROLE_CONFIG_BATCH"))
} as const;

/**
 * Constants for RuntimeRBAC function selectors
 * These match the selectors from RuntimeRBACDefinitions.sol
 */
export const RUNTIME_RBAC_FUNCTION_SELECTORS = {
  ROLE_CONFIG_BATCH_EXECUTE_SELECTOR: keccak256(
    new TextEncoder().encode("executeRoleConfigBatch((uint8,bytes)[])")
  ).slice(0, 10) as Hex,
  ROLE_CONFIG_BATCH_META_SELECTOR: keccak256(
    new TextEncoder().encode(metaTxHandlerSignature('roleConfigBatchRequestAndApprove'))
  ).slice(0, 10) as Hex
} as const;