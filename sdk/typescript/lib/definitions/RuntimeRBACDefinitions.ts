/**
 * RuntimeRBACDefinitions
 * Pure helpers for building execution params for RuntimeRBAC operations.
 * Mirrors RuntimeRBACDefinitions.sol; no contract calls.
 * Uses parseAbiParameters + array-of-[actionType,data] to match web3 encodeParameter('tuple(uint8,bytes)[]', ...).
 */

import { type Address, type Hex, encodeAbiParameters, parseAbiParameters } from 'viem';
import type { RoleConfigAction } from '../../types/core.access.index';

/**
 * FunctionPermission shape for encoding ADD_FUNCTION_TO_ROLE action data.
 * Matches Solidity EngineBlox.FunctionPermission (functionSelector, grantedActionsBitmap, handlerForSelectors).
 */
export interface FunctionPermissionForEncoding {
  functionSelector: Hex;
  grantedActionsBitmap: number;
  handlerForSelectors: readonly Hex[];
}

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

// ============ Role config action data encoders ============
// Use these helpers to build action.data for each RoleConfigActionType without reading the contract.
// Each encoder returns Hex (bytes) suitable for RoleConfigAction(actionType, data).

/**
 * Encodes data for CREATE_ROLE. Use with RoleConfigActionType.CREATE_ROLE.
 */
export function encodeCreateRole(roleName: string, maxWallets: bigint): Hex {
  return encodeAbiParameters(parseAbiParameters('string, uint256'), [roleName, maxWallets]) as Hex;
}

/**
 * Encodes data for REMOVE_ROLE. Use with RoleConfigActionType.REMOVE_ROLE.
 */
export function encodeRemoveRole(roleHash: Hex): Hex {
  return encodeAbiParameters(parseAbiParameters('bytes32'), [roleHash]) as Hex;
}

/**
 * Encodes data for ADD_WALLET. Use with RoleConfigActionType.ADD_WALLET.
 */
export function encodeAddWallet(roleHash: Hex, wallet: Address): Hex {
  return encodeAbiParameters(parseAbiParameters('bytes32, address'), [roleHash, wallet]) as Hex;
}

/**
 * Encodes data for REVOKE_WALLET. Use with RoleConfigActionType.REVOKE_WALLET.
 */
export function encodeRevokeWallet(roleHash: Hex, wallet: Address): Hex {
  return encodeAbiParameters(parseAbiParameters('bytes32, address'), [roleHash, wallet]) as Hex;
}

/**
 * Encodes data for ADD_FUNCTION_TO_ROLE. Use with RoleConfigActionType.ADD_FUNCTION_TO_ROLE.
 * Uses flat parameters to match Solidity abi.decode(action.data, (bytes32, EngineBlox.FunctionPermission)).
 */
export function encodeAddFunctionToRole(
  roleHash: Hex,
  functionPermission: FunctionPermissionForEncoding
): Hex {
  const inner: readonly [Hex, number, readonly Hex[]] = [
    functionPermission.functionSelector,
    functionPermission.grantedActionsBitmap,
    [...functionPermission.handlerForSelectors]
  ];
  return encodeAbiParameters(
    parseAbiParameters('bytes32, (bytes4, uint16, bytes4[])'),
    [roleHash, inner]
  ) as Hex;
}

/**
 * Encodes data for REMOVE_FUNCTION_FROM_ROLE. Use with RoleConfigActionType.REMOVE_FUNCTION_FROM_ROLE.
 */
export function encodeRemoveFunctionFromRole(roleHash: Hex, functionSelector: Hex): Hex {
  return encodeAbiParameters(parseAbiParameters('bytes32, bytes4'), [roleHash, functionSelector]) as Hex;
}
