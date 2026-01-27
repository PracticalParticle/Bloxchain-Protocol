import { keccak256, Hex } from 'viem';

/**
 * Constants for GuardController operation types
 * These match the keccak256 hashes defined in GuardControllerDefinitions.sol
 */
export const GUARD_CONTROLLER_OPERATION_TYPES = {
  CONTROLLER_OPERATION: keccak256(new TextEncoder().encode("CONTROLLER_OPERATION")),
  NATIVE_TRANSFER: keccak256(new TextEncoder().encode("NATIVE_TRANSFER"))
} as const;

/**
 * Constants for GuardController function selectors
 * These match the selectors from GuardControllerDefinitions.sol
 */
export const GUARD_CONTROLLER_FUNCTION_SELECTORS = {
  GUARD_CONFIG_BATCH_EXECUTE_SELECTOR: keccak256(
    new TextEncoder().encode("executeGuardConfigBatch((uint8,bytes)[])")
  ).slice(0, 10) as Hex,
  GUARD_CONFIG_BATCH_META_SELECTOR: keccak256(
    new TextEncoder().encode(
      "guardConfigBatchRequestAndApprove(((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))"
    )
  ).slice(0, 10) as Hex,
  REQUEST_AND_APPROVE_EXECUTION_SELECTOR: keccak256(
    new TextEncoder().encode(
      "requestAndApproveExecution(((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))"
    )
  ).slice(0, 10) as Hex,
  NATIVE_TRANSFER_SELECTOR: "0xd8cb519d" as Hex // bytes4(keccak256("__bloxchain_native_transfer__()")) - matches EngineBlox.NATIVE_TRANSFER_SELECTOR
} as const;

/**
 * GuardConfigActionType enum matching Solidity GuardController.GuardConfigActionType
 */
export enum GuardConfigActionType {
  ADD_TARGET_TO_WHITELIST = 0,
  REMOVE_TARGET_FROM_WHITELIST = 1,
  REGISTER_FUNCTION = 2,
  UNREGISTER_FUNCTION = 3
}

/**
 * Type for GuardConfigAction struct
 */
export interface GuardConfigAction {
  actionType: GuardConfigActionType;
  data: Hex;
}
