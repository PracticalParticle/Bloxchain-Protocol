/**
 * RuntimeRBACDefinitions
 * Calls the deployed RuntimeRBACDefinitions contract for specs and encoding.
 * Single source of truth: action names, formats, and encoding come from the contract.
 * @see contracts/core/access/lib/definitions/RuntimeRBACDefinitions.sol
 */

import { type Abi, type Address, type Hex, type PublicClient, bytesToHex, encodeAbiParameters, parseAbiParameters } from 'viem';
import RuntimeRBACDefinitionsAbi from '../../abi/RuntimeRBACDefinitions.abi.json';
import type { RoleConfigAction } from '../../types/core.access.index';

const ABI = RuntimeRBACDefinitionsAbi as Abi;

/** Normalize bytes to ABI Hex (0x-prefixed); empty -> '0x'. */
function normalizeData(data: Hex | Uint8Array | undefined | null): Hex {
  if (data === undefined || data === null) return '0x';
  if (typeof data === 'string') return data.startsWith('0x') ? (data as Hex) : (`0x${data}` as Hex);
  return bytesToHex(data as Uint8Array) as Hex;
}

/**
 * FunctionPermission shape for encodeAddFunctionToRole.
 * Matches Solidity EngineBlox.FunctionPermission (functionSelector, grantedActionsBitmap, handlerForSelectors).
 */
export interface FunctionPermissionForEncoding {
  functionSelector: Hex;
  grantedActionsBitmap: number;
  handlerForSelectors: readonly Hex[];
}

/**
 * Builds execution params for executeRoleConfigBatch((uint8,bytes)[]).
 * Encoding matches RuntimeRBACDefinitions.sol roleConfigBatchExecutionParams (abi.encode(actions)).
 * Same format as scripts/sanity (direct contract tests); single source of truth in this module.
 */
export function roleConfigBatchExecutionParams(
  _client: PublicClient,
  _definitionAddress: Address,
  actions: RoleConfigAction[]
): Hex {
  const actionsTuple = actions.map((a) => ({
    actionType: Number(a.actionType),
    data: normalizeData(a.data)
  }));
  return encodeAbiParameters(
    parseAbiParameters('(uint8 actionType, bytes data)[]'),
    [actionsTuple]
  ) as Hex;
}

/**
 * Returns all available RoleConfig action types and their ABI decode formats from the contract.
 * Index i in both arrays corresponds to RoleConfigActionType enum value i.
 */
export async function getRoleConfigActionSpecs(
  client: PublicClient,
  definitionAddress: Address
): Promise<{ actionNames: string[]; formats: string[] }> {
  const result = (await client.readContract({
    address: definitionAddress,
    abi: ABI,
    functionName: 'getRoleConfigActionSpecs'
  })) as [string[], string[]];
  return { actionNames: result[0], formats: result[1] };
}

/**
 * Encodes data for CREATE_ROLE. Matches RuntimeRBACDefinitions.sol encodeCreateRole (abi.encode(roleName, maxWallets)).
 */
export function encodeCreateRole(
  _client: PublicClient,
  _definitionAddress: Address,
  roleName: string,
  maxWallets: bigint
): Hex {
  return encodeAbiParameters(parseAbiParameters('string, uint256'), [roleName, maxWallets]) as Hex;
}

/**
 * Encodes data for REMOVE_ROLE. Matches RuntimeRBACDefinitions.sol encodeRemoveRole (abi.encode(roleHash)).
 */
export function encodeRemoveRole(
  _client: PublicClient,
  _definitionAddress: Address,
  roleHash: Hex
): Hex {
  return encodeAbiParameters(parseAbiParameters('bytes32'), [roleHash]) as Hex;
}

/**
 * Encodes data for ADD_WALLET. Matches RuntimeRBACDefinitions.sol encodeAddWallet (abi.encode(roleHash, wallet)).
 */
export function encodeAddWallet(
  _client: PublicClient,
  _definitionAddress: Address,
  roleHash: Hex,
  wallet: Address
): Hex {
  return encodeAbiParameters(parseAbiParameters('bytes32, address'), [roleHash, wallet]) as Hex;
}

/**
 * Encodes data for REVOKE_WALLET. Matches RuntimeRBACDefinitions.sol encodeRevokeWallet (abi.encode(roleHash, wallet)).
 */
export function encodeRevokeWallet(
  _client: PublicClient,
  _definitionAddress: Address,
  roleHash: Hex,
  wallet: Address
): Hex {
  return encodeAbiParameters(parseAbiParameters('bytes32, address'), [roleHash, wallet]) as Hex;
}

/**
 * Encodes data for ADD_FUNCTION_TO_ROLE. Matches RuntimeRBACDefinitions.sol encodeAddFunctionToRole (abi.encode(roleHash, functionPermission)).
 */
export function encodeAddFunctionToRole(
  _client: PublicClient,
  _definitionAddress: Address,
  roleHash: Hex,
  functionPermission: FunctionPermissionForEncoding
): Hex {
  const tuple: [Hex, number, readonly Hex[]] = [
    functionPermission.functionSelector,
    functionPermission.grantedActionsBitmap,
    [...functionPermission.handlerForSelectors]
  ];
  return encodeAbiParameters(
    parseAbiParameters('bytes32, (bytes4, uint16, bytes4[])'),
    [roleHash, tuple]
  ) as Hex;
}

/**
 * Encodes data for REMOVE_FUNCTION_FROM_ROLE. Matches RuntimeRBACDefinitions.sol encodeRemoveFunctionFromRole (abi.encode(roleHash, functionSelector)).
 */
export function encodeRemoveFunctionFromRole(
  _client: PublicClient,
  _definitionAddress: Address,
  roleHash: Hex,
  functionSelector: Hex
): Hex {
  return encodeAbiParameters(parseAbiParameters('bytes32, bytes4'), [roleHash, functionSelector]) as Hex;
}
