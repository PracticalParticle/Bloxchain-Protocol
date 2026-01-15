import { keccak256, Hex } from 'viem';

/**
 * Constants for RuntimeRBAC operation types
 * These match the keccak256 hashes defined in RuntimeRBACDefinitions.sol
 */
export const RUNTIME_RBAC_OPERATION_TYPES = {
  ROLE_CONFIG_BATCH: keccak256(new TextEncoder().encode("ROLE_CONFIG_BATCH"))
} as const;

/**
 * Legacy export for backwards compatibility
 * @deprecated Use RUNTIME_RBAC_OPERATION_TYPES instead
 */
export const DYNAMIC_RBAC_OPERATION_TYPES = RUNTIME_RBAC_OPERATION_TYPES;

/**
 * Constants for RuntimeRBAC function selectors
 * These match the selectors from RuntimeRBACDefinitions.sol
 */
export const RUNTIME_RBAC_FUNCTION_SELECTORS = {
  ROLE_CONFIG_BATCH_EXECUTE_SELECTOR: keccak256(
    new TextEncoder().encode("executeRoleConfigBatch((uint8,bytes)[])")
  ).slice(0, 10) as Hex,
  ROLE_CONFIG_BATCH_META_SELECTOR: keccak256(
    new TextEncoder().encode(
      "roleConfigBatchRequestAndApprove(((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,uint8,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))"
    )
  ).slice(0, 10) as Hex
} as const;

/**
 * Legacy export for backwards compatibility
 * @deprecated Use RUNTIME_RBAC_FUNCTION_SELECTORS instead
 */
export const DYNAMIC_RBAC_FUNCTION_SELECTORS = RUNTIME_RBAC_FUNCTION_SELECTORS;

// Re-export SecureOwnable constants from core.security.index for convenience
export { OPERATION_TYPES, FUNCTION_SELECTORS } from './core.security.index';