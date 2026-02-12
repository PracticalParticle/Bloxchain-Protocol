/**
 * GuardControllerDefinitions
 * Pure helpers for building execution params for GuardController operations.
 * Mirrors GuardControllerDefinitions.sol; no contract calls.
 * Uses parseAbiParameters + array-of-[actionType,data] to match web3 encodeParameter('tuple(uint8,bytes)[]', [[actionType, data], ...]).
 */

import { Hex, encodeAbiParameters, parseAbiParameters } from 'viem';
import type { GuardConfigAction } from '../../types.core.execution.index';

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
