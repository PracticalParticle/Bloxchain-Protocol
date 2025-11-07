import { keccak256, Hex } from 'viem';


/**
 * Constants for SecureOwnable operations
 * These match the keccak256 hashes defined in SecureOwnableDefinitions.sol
 */
export const OPERATION_TYPES = {
  OWNERSHIP_TRANSFER: keccak256(new TextEncoder().encode("OWNERSHIP_TRANSFER")),
  BROADCASTER_UPDATE: keccak256(new TextEncoder().encode("BROADCASTER_UPDATE")),
  RECOVERY_UPDATE: keccak256(new TextEncoder().encode("RECOVERY_UPDATE")),
  TIMELOCK_UPDATE: keccak256(new TextEncoder().encode("TIMELOCK_UPDATE"))
} as const;

export type OperationType = typeof OPERATION_TYPES[keyof typeof OPERATION_TYPES];

/**
 * Constants for function selectors
 * These match the selectors from SecureOwnableDefinitions.sol
 */
export const FUNCTION_SELECTORS = {
  // Execution selectors
  TRANSFER_OWNERSHIP_SELECTOR: keccak256(new TextEncoder().encode("executeTransferOwnership(address)")).slice(0, 10) as Hex,
  UPDATE_BROADCASTER_SELECTOR: keccak256(new TextEncoder().encode("executeBroadcasterUpdate(address)")).slice(0, 10) as Hex,
  UPDATE_RECOVERY_SELECTOR: keccak256(new TextEncoder().encode("executeRecoveryUpdate(address)")).slice(0, 10) as Hex,
  UPDATE_TIMELOCK_SELECTOR: keccak256(new TextEncoder().encode("executeTimeLockUpdate(uint256)")).slice(0, 10) as Hex,
  
  // Time delay selectors
  TRANSFER_OWNERSHIP_REQUEST_SELECTOR: keccak256(new TextEncoder().encode("transferOwnershipRequest()")).slice(0, 10) as Hex,
  TRANSFER_OWNERSHIP_DELAYED_APPROVAL_SELECTOR: keccak256(new TextEncoder().encode("transferOwnershipDelayedApproval(uint256)")).slice(0, 10) as Hex,
  TRANSFER_OWNERSHIP_CANCELLATION_SELECTOR: keccak256(new TextEncoder().encode("transferOwnershipCancellation(uint256)")).slice(0, 10) as Hex,
  UPDATE_BROADCASTER_REQUEST_SELECTOR: keccak256(new TextEncoder().encode("updateBroadcasterRequest(address)")).slice(0, 10) as Hex,
  UPDATE_BROADCASTER_DELAYED_APPROVAL_SELECTOR: keccak256(new TextEncoder().encode("updateBroadcasterDelayedApproval(uint256)")).slice(0, 10) as Hex,
  UPDATE_BROADCASTER_CANCELLATION_SELECTOR: keccak256(new TextEncoder().encode("updateBroadcasterCancellation(uint256)")).slice(0, 10) as Hex,
  
  // Meta-transaction selectors
  TRANSFER_OWNERSHIP_APPROVE_META_SELECTOR: keccak256(new TextEncoder().encode("transferOwnershipApprovalWithMetaTx(((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,uint8,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))")).slice(0, 10) as Hex,
  TRANSFER_OWNERSHIP_CANCEL_META_SELECTOR: keccak256(new TextEncoder().encode("transferOwnershipCancellationWithMetaTx(((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,uint8,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))")).slice(0, 10) as Hex,
  UPDATE_BROADCASTER_APPROVE_META_SELECTOR: keccak256(new TextEncoder().encode("updateBroadcasterApprovalWithMetaTx(((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,uint8,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))")).slice(0, 10) as Hex,
  UPDATE_BROADCASTER_CANCEL_META_SELECTOR: keccak256(new TextEncoder().encode("updateBroadcasterCancellationWithMetaTx(((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,uint8,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))")).slice(0, 10) as Hex,
  UPDATE_RECOVERY_META_SELECTOR: keccak256(new TextEncoder().encode("updateRecoveryRequestAndApprove(((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,uint8,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))")).slice(0, 10) as Hex,
  UPDATE_TIMELOCK_META_SELECTOR: keccak256(new TextEncoder().encode("updateTimeLockRequestAndApprove(((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,uint8,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))")).slice(0, 10) as Hex
} as const;

export type FunctionSelector = typeof FUNCTION_SELECTORS[keyof typeof FUNCTION_SELECTORS];

/**
 * Constants for DynamicRBAC operation types
 * These match the keccak256 hashes defined in DynamicRBACDefinitions.sol
 */
export const DYNAMIC_RBAC_OPERATION_TYPES = {
  ROLE_EDITING_TOGGLE: keccak256(new TextEncoder().encode("ROLE_EDITING_TOGGLE"))
} as const;

/**
 * Constants for DynamicRBAC function selectors
 * These match the selectors from DynamicRBACDefinitions.sol
 */
export const DYNAMIC_RBAC_FUNCTION_SELECTORS = {
  ROLE_EDITING_TOGGLE_SELECTOR: keccak256(new TextEncoder().encode("executeRoleEditingToggle(bool)")).slice(0, 10) as Hex,
  ROLE_EDITING_TOGGLE_META_SELECTOR: keccak256(new TextEncoder().encode("updateRoleEditingToggleRequestAndApprove(((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,uint8,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))")).slice(0, 10) as Hex,
  CREATE_ROLE: keccak256(new TextEncoder().encode("createRole(string,uint256)")).slice(0, 10) as Hex,
  UPDATE_ROLE: keccak256(new TextEncoder().encode("updateRole(bytes32,string,uint256)")).slice(0, 10) as Hex,
  DELETE_ROLE: keccak256(new TextEncoder().encode("deleteRole(bytes32)")).slice(0, 10) as Hex,
  ADD_WALLET_TO_ROLE: keccak256(new TextEncoder().encode("addWalletToRole(bytes32,address)")).slice(0, 10) as Hex,
  REMOVE_WALLET_FROM_ROLE: keccak256(new TextEncoder().encode("revokeWallet(bytes32,address)")).slice(0, 10) as Hex,
  REPLACE_WALLET_IN_ROLE: keccak256(new TextEncoder().encode("replaceWalletInRole(bytes32,address,address)")).slice(0, 10) as Hex,
  ADD_FUNCTION_PERMISSION_TO_ROLE: keccak256(new TextEncoder().encode("addFunctionPermissionToRole(bytes32,bytes4,uint8)")).slice(0, 10) as Hex,
  REMOVE_FUNCTION_PERMISSION_FROM_ROLE: keccak256(new TextEncoder().encode("removeFunctionPermissionFromRole(bytes32,bytes4)")).slice(0, 10) as Hex
} as const;

