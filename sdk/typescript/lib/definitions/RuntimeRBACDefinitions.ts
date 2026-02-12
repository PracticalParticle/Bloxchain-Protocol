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
 * Returns all available RoleConfig action types and their ABI decode formats.
 * Mirrors RuntimeRBACDefinitions.getRoleConfigActionSpecs in Solidity.
 *
 * Index i in both arrays corresponds to RoleConfigActionType enum value i.
 */
export function getRoleConfigActionSpecs(): {
  actionNames: string[];
  formats: string[];
} {
  const actionNames = [
    'CREATE_ROLE',
    'REMOVE_ROLE',
    'ADD_WALLET',
    'REVOKE_WALLET',
    'ADD_FUNCTION_TO_ROLE',
    'REMOVE_FUNCTION_FROM_ROLE'
  ];

  // CREATE_ROLE expects exactly (roleName, maxWallets). Some tests pass a third parameter (e.g. empty
  // FunctionPermission[]); abi.decode ignores trailing bytes, but new code should use only 2 params.
  const formats = [
    '(string roleName, uint256 maxWallets)',
    '(bytes32 roleHash)',
    '(bytes32 roleHash, address wallet)',
    '(bytes32 roleHash, address wallet)',
    '(bytes32 roleHash, FunctionPermission functionPermission)',
    '(bytes32 roleHash, bytes4 functionSelector)'
  ];

  return { actionNames, formats };
}
