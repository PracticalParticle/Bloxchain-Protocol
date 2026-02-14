/**
 * GuardControllerDefinitions
 * Pure helpers for building execution params for GuardController operations.
 * Mirrors GuardControllerDefinitions.sol; no contract calls.
 * Uses parseAbiParameters + array-of-[actionType,data] to match web3 encodeParameter('tuple(uint8,bytes)[]', [[actionType, data], ...]).
 */

import { type Address, type Hex, encodeAbiParameters, parseAbiParameters } from 'viem';
import type { GuardConfigAction } from '../../types/core.execution.index';
import type { TxAction } from '../../types/lib.index';

/**
 * Builds execution params for executeGuardConfigBatch((uint8,bytes)[]).
 * Equivalent to GuardControllerDefinitions.guardConfigBatchExecutionParams in Solidity.
 * Same encoding as web3.eth.abi.encodeParameter('tuple(uint8,bytes)[]', actionsArray).
 */
export function guardConfigBatchExecutionParams(actions: GuardConfigAction[]): Hex {
  const actionsArray = actions.map((a) => ({
    actionType: Number(a.actionType),
    data: a.data
  }));
  return encodeAbiParameters(
    parseAbiParameters('(uint8 actionType, bytes data)[]'),
    [actionsArray]
  ) as Hex;
}

/**
 * Returns all available GuardConfig action types and their ABI decode formats.
 * Mirrors GuardControllerDefinitions.getGuardConfigActionSpecs in Solidity.
 *
 * Index i in both arrays corresponds to GuardConfigActionType enum value i.
 */
export function getGuardConfigActionSpecs(): {
  actionNames: string[];
  formats: string[];
} {
  const actionNames = [
    'ADD_TARGET_TO_WHITELIST',
    'REMOVE_TARGET_FROM_WHITELIST',
    'REGISTER_FUNCTION',
    'UNREGISTER_FUNCTION'
  ];

  const formats = [
    '(bytes4 functionSelector, address target)',
    '(bytes4 functionSelector, address target)',
    '(string functionSignature, string operationName, TxAction[] supportedActions)',
    '(bytes4 functionSelector, bool safeRemoval)'
  ];

  return { actionNames, formats };
}

// ============ Guard config action data encoders ============
// Use these helpers to build action.data for each GuardConfigActionType without reading the contract.
// Each encoder returns Hex (bytes) suitable for GuardConfigAction(actionType, data).

/**
 * Encodes data for ADD_TARGET_TO_WHITELIST. Use with GuardConfigActionType.ADD_TARGET_TO_WHITELIST.
 */
export function encodeAddTargetToWhitelist(functionSelector: Hex, target: Address): Hex {
  return encodeAbiParameters(parseAbiParameters('bytes4, address'), [functionSelector, target]) as Hex;
}

/**
 * Encodes data for REMOVE_TARGET_FROM_WHITELIST. Use with GuardConfigActionType.REMOVE_TARGET_FROM_WHITELIST.
 */
export function encodeRemoveTargetFromWhitelist(functionSelector: Hex, target: Address): Hex {
  return encodeAbiParameters(parseAbiParameters('bytes4, address'), [functionSelector, target]) as Hex;
}

/**
 * Encodes data for REGISTER_FUNCTION. Use with GuardConfigActionType.REGISTER_FUNCTION.
 * supportedActions: array of TxAction enum values (e.g. TxAction.EXECUTE_TIME_DELAY_REQUEST).
 */
export function encodeRegisterFunction(
  functionSignature: string,
  operationName: string,
  supportedActions: TxAction[]
): Hex {
  return encodeAbiParameters(
    parseAbiParameters('string, string, uint8[]'),
    [functionSignature, operationName, supportedActions.map((a) => Number(a))]
  ) as Hex;
}

/**
 * Encodes data for UNREGISTER_FUNCTION. Use with GuardConfigActionType.UNREGISTER_FUNCTION.
 */
export function encodeUnregisterFunction(functionSelector: Hex, safeRemoval: boolean): Hex {
  return encodeAbiParameters(parseAbiParameters('bytes4, bool'), [functionSelector, safeRemoval]) as Hex;
}
