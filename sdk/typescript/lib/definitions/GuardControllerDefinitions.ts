/**
 * GuardControllerDefinitions
 * Pure helpers for building execution params for GuardController operations.
 * Mirrors GuardControllerDefinitions.sol; no contract calls.
 * Uses parseAbiParameters + array-of-[actionType,data] to match web3 encodeParameter('tuple(uint8,bytes)[]', [[actionType, data], ...]).
 */

import { Hex, encodeAbiParameters, parseAbiParameters } from 'viem';
import type { GuardConfigAction } from '../../types/core.execution.index';

/**
 * Builds execution params for executeGuardConfigBatch((uint8,bytes)[]).
 * Equivalent to GuardControllerDefinitions.guardConfigBatchExecutionParams in Solidity.
 * Same encoding as web3.eth.abi.encodeParameter('tuple(uint8,bytes)[]', actionsArray).
 */
export function guardConfigBatchExecutionParams(actions: GuardConfigAction[]): Hex {
  const actionsArray = actions.map((a) => [Number(a.actionType), a.data] as [number, Hex]);
  return encodeAbiParameters(
    parseAbiParameters('(uint8 actionType, bytes data)[]'),
    [actionsArray as unknown as readonly { actionType: number; data: Hex }[]]
  ) as Hex;
}
