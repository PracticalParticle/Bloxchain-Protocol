import { keccak256, Hex } from 'viem';
import { metaTxHandlerSignature } from './meta-tx-signatures.js';

/**
 * Constants for GuardController operation types (GuardControllerDefinitions.sol).
 */
export const GUARD_CONTROLLER_OPERATION_TYPES = {
  CONTROLLER_OPERATION: keccak256(new TextEncoder().encode('CONTROLLER_OPERATION')),
  CONTROLLER_CONFIG_BATCH: keccak256(new TextEncoder().encode('CONTROLLER_CONFIG_BATCH')),
  NATIVE_TRANSFER: keccak256(new TextEncoder().encode('NATIVE_TRANSFER')),
} as const;

/**
 * Function selectors (GuardControllerDefinitions.sol + EngineBlox.NATIVE_TRANSFER_SELECTOR).
 */
export const GUARD_CONTROLLER_FUNCTION_SELECTORS = {
  EXECUTE_WITH_TIMELOCK_SELECTOR: keccak256(
    new TextEncoder().encode(
      'executeWithTimeLock(address,uint256,bytes4,bytes,uint256,bytes32)'
    )
  ).slice(0, 10) as Hex,
  EXECUTE_WITH_PAYMENT_SELECTOR: keccak256(
    new TextEncoder().encode(
      'executeWithPayment(address,uint256,bytes4,bytes,uint256,bytes32,(address,uint256,address,uint256))'
    )
  ).slice(0, 10) as Hex,
  APPROVE_TIMELOCK_EXECUTION_SELECTOR: keccak256(
    new TextEncoder().encode('approveTimeLockExecution(uint256)')
  ).slice(0, 10) as Hex,
  CANCEL_TIMELOCK_EXECUTION_SELECTOR: keccak256(
    new TextEncoder().encode('cancelTimeLockExecution(uint256)')
  ).slice(0, 10) as Hex,
  APPROVE_TIMELOCK_EXECUTION_META_SELECTOR: keccak256(
    new TextEncoder().encode(metaTxHandlerSignature('approveTimeLockExecutionWithMetaTx'))
  ).slice(0, 10) as Hex,
  CANCEL_TIMELOCK_EXECUTION_META_SELECTOR: keccak256(
    new TextEncoder().encode(metaTxHandlerSignature('cancelTimeLockExecutionWithMetaTx'))
  ).slice(0, 10) as Hex,
  GUARD_CONFIG_BATCH_EXECUTE_SELECTOR: keccak256(
    new TextEncoder().encode('executeGuardConfigBatch((uint8,bytes)[])')
  ).slice(0, 10) as Hex,
  GUARD_CONFIG_BATCH_META_SELECTOR: keccak256(
    new TextEncoder().encode(metaTxHandlerSignature('guardConfigBatchRequestAndApprove'))
  ).slice(0, 10) as Hex,
  REQUEST_AND_APPROVE_EXECUTION_SELECTOR: keccak256(
    new TextEncoder().encode(metaTxHandlerSignature('requestAndApproveExecution'))
  ).slice(0, 10) as Hex,
  NATIVE_TRANSFER_SELECTOR: '0xd8cb519d' as Hex,
} as const;

export enum GuardConfigActionType {
  ADD_TARGET_TO_WHITELIST = 0,
  REMOVE_TARGET_FROM_WHITELIST = 1,
  REGISTER_FUNCTION = 2,
  UNREGISTER_FUNCTION = 3,
}

export interface GuardConfigAction {
  actionType: GuardConfigActionType;
  data: Hex;
}
