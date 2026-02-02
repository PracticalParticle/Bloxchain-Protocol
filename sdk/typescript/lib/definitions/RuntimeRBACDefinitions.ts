/**
 * RuntimeRBACDefinitions
 * Pure helpers for building execution params for RuntimeRBAC operations.
 * Mirrors RuntimeRBACDefinitions.sol; no contract calls.
 * Uses parseAbiParameters + array-of-[actionType,data] to match web3 encodeParameter('tuple(uint8,bytes)[]', ...).
 */

import { Hex, encodeAbiParameters, parseAbiParameters } from 'viem';
import type { RoleConfigAction } from '../../types/core.access.index';

/**
 * Builds execution params for executeRoleConfigBatch((uint8,bytes)[]).
 * Equivalent to RuntimeRBACDefinitions.roleConfigBatchExecutionParams in Solidity.
 * Same encoding as web3.eth.abi.encodeParameter('tuple(uint8,bytes)[]', actionsArray).
 */
export function roleConfigBatchExecutionParams(actions: RoleConfigAction[]): Hex {
  const actionsArray = actions.map((a) => [Number(a.actionType), a.data] as [number, Hex]);
  return encodeAbiParameters(
    parseAbiParameters('(uint8 actionType, bytes data)[]'),
    [actionsArray]
  ) as Hex;
}
