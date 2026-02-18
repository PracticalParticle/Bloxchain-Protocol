/**
 * RuntimeRBACDefinitions
 * Calls the deployed RuntimeRBACDefinitions contract for specs and encoding.
 * Single source of truth: action names, formats, and encoding come from the contract.
 * @see contracts/core/access/lib/definitions/RuntimeRBACDefinitions.sol
 */

import { type Address, type Hex, type PublicClient } from 'viem';
import RuntimeRBACDefinitionsAbi from '../../abi/RuntimeRBACDefinitions.abi.json';
import type { RoleConfigAction } from '../../types/core.access.index';

const ABI = RuntimeRBACDefinitionsAbi as readonly unknown[];

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
 * Builds execution params for executeRoleConfigBatch((uint8,bytes)[]) by calling the definition contract.
 * Equivalent to RuntimeRBACDefinitions.roleConfigBatchExecutionParams in Solidity.
 */
export async function roleConfigBatchExecutionParams(
  client: PublicClient,
  definitionAddress: Address,
  actions: RoleConfigAction[]
): Promise<Hex> {
  const actionsTuple = actions.map((a) => ({
    actionType: Number(a.actionType),
    data: a.data
  }));
  return client.readContract({
    address: definitionAddress,
    abi: ABI,
    functionName: 'roleConfigBatchExecutionParams',
    args: [actionsTuple]
  }) as Promise<Hex>;
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
 * Encodes data for CREATE_ROLE by calling the definition contract.
 */
export async function encodeCreateRole(
  client: PublicClient,
  definitionAddress: Address,
  roleName: string,
  maxWallets: bigint
): Promise<Hex> {
  return client.readContract({
    address: definitionAddress,
    abi: ABI,
    functionName: 'encodeCreateRole',
    args: [roleName, maxWallets]
  }) as Promise<Hex>;
}

/**
 * Encodes data for REMOVE_ROLE by calling the definition contract.
 */
export async function encodeRemoveRole(
  client: PublicClient,
  definitionAddress: Address,
  roleHash: Hex
): Promise<Hex> {
  return client.readContract({
    address: definitionAddress,
    abi: ABI,
    functionName: 'encodeRemoveRole',
    args: [roleHash]
  }) as Promise<Hex>;
}

/**
 * Encodes data for ADD_WALLET by calling the definition contract.
 */
export async function encodeAddWallet(
  client: PublicClient,
  definitionAddress: Address,
  roleHash: Hex,
  wallet: Address
): Promise<Hex> {
  return client.readContract({
    address: definitionAddress,
    abi: ABI,
    functionName: 'encodeAddWallet',
    args: [roleHash, wallet]
  }) as Promise<Hex>;
}

/**
 * Encodes data for REVOKE_WALLET by calling the definition contract.
 */
export async function encodeRevokeWallet(
  client: PublicClient,
  definitionAddress: Address,
  roleHash: Hex,
  wallet: Address
): Promise<Hex> {
  return client.readContract({
    address: definitionAddress,
    abi: ABI,
    functionName: 'encodeRevokeWallet',
    args: [roleHash, wallet]
  }) as Promise<Hex>;
}

/**
 * Encodes data for ADD_FUNCTION_TO_ROLE by calling the definition contract.
 */
export async function encodeAddFunctionToRole(
  client: PublicClient,
  definitionAddress: Address,
  roleHash: Hex,
  functionPermission: FunctionPermissionForEncoding
): Promise<Hex> {
  const tuple = [
    functionPermission.functionSelector,
    functionPermission.grantedActionsBitmap,
    [...functionPermission.handlerForSelectors]
  ] as const;
  return client.readContract({
    address: definitionAddress,
    abi: ABI,
    functionName: 'encodeAddFunctionToRole',
    args: [roleHash, tuple]
  }) as Promise<Hex>;
}

/**
 * Encodes data for REMOVE_FUNCTION_FROM_ROLE by calling the definition contract.
 */
export async function encodeRemoveFunctionFromRole(
  client: PublicClient,
  definitionAddress: Address,
  roleHash: Hex,
  functionSelector: Hex
): Promise<Hex> {
  return client.readContract({
    address: definitionAddress,
    abi: ABI,
    functionName: 'encodeRemoveFunctionFromRole',
    args: [roleHash, functionSelector]
  }) as Promise<Hex>;
}
