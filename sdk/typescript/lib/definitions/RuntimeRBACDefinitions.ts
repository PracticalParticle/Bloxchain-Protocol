/**
 * RuntimeRBACDefinitions
 * Calls the deployed RuntimeRBACDefinitions contract for specs and encoding.
 * Single source of truth: action names, formats, and encoding come from the contract.
 * @see contracts/core/access/lib/definitions/RuntimeRBACDefinitions.sol
 */

import { type Abi, type Address, type Hex, type PublicClient, bytesToHex, encodeAbiParameters, parseAbiParameters } from 'viem';
import RuntimeRBACDefinitionsAbi from '../../abi/RuntimeRBACDefinitions.abi.json' with { type: 'json' };
import type { RoleConfigAction } from '../../types/core.access.index.js';

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
 *
 * `handlerForSelectors` is optional. Omit it and the encoder self-references the selector
 * (`[functionSelector]`), which is the value a **runtime-registered** selector requires — see
 * {@link encodeAddFunctionToRole}. Built-in schemas that run strict mode against a *different* handler need
 * the explicit value, or {@link resolveHandlerForSelectors} to derive it from the schema.
 */
export interface FunctionPermissionForEncoding {
  functionSelector: Hex;
  grantedActionsBitmap: number;
  handlerForSelectors?: readonly Hex[];
}

/** The single read {@link resolveHandlerForSelectors} needs. `GuardController` and `RuntimeRBAC` satisfy it. */
export interface FunctionSchemaReader {
  getFunctionSchema(functionSelector: Hex): Promise<{
    enforceHandlerRelations: boolean;
    handlerForSelectors: readonly Hex[];
  }>;
}

/**
 * Derives the `handlerForSelectors` a grant on `functionSelector` must carry, by reading the schema.
 *
 * This is the only way to get the value right for *every* selector, because the correct default is not
 * uniform:
 *
 * - A selector registered at runtime via `REGISTER_FUNCTION` is created by
 *   `GuardController._registerGuardedFunction` with `enforceHandlerRelations: true` and
 *   `handlerForSelectors: [self]`, and the batch format `(string, string, TxAction[])` exposes no field to
 *   change either. Its grants **must** self-reference or `addFunctionToRole` reverts
 *   `HandlerForSelectorMismatch`.
 * - Some built-in schemas also run strict mode but point at a *different* selector — e.g.
 *   `roleConfigBatchRequestAndApprove` lists `[executeRoleConfigBatch]`. Self-referencing those reverts.
 * - Flexible schemas (`enforceHandlerRelations: false`) are not validated at grant time at all, and the
 *   stored list is never re-read by `hasActionPermission`.
 *
 * @param reader Reader for the governed account (e.g. a `GuardController`). Reads are permissioned.
 * @param functionSelector The selector the grant is for.
 * @param explicit A caller-supplied `handlerForSelectors`. When given it is validated against the schema
 *                 rather than replaced, so a wrong value fails here instead of on chain.
 * @returns The `handlerForSelectors` to encode.
 * @throws When `explicit` names a handler the schema enforces against — the pre-flight for
 *         `HandlerForSelectorMismatch`.
 */
export async function resolveHandlerForSelectors(
  reader: FunctionSchemaReader,
  functionSelector: Hex,
  explicit?: readonly Hex[]
): Promise<Hex[]> {
  const schema = await reader.getFunctionSchema(functionSelector);
  const schemaHandlers = [...(schema.handlerForSelectors ?? [])] as Hex[];

  if (explicit && explicit.length > 0) {
    if (schema.enforceHandlerRelations) {
      const allowed = new Set(schemaHandlers.map((h) => h.toLowerCase()));
      const rejected = explicit.filter((h) => !allowed.has(h.toLowerCase()));
      if (rejected.length > 0) {
        throw new Error(
          `HandlerForSelectorMismatch (pre-flight): schema for ${functionSelector} enforces handler relations and ` +
            `lists [${schemaHandlers.join(', ')}], but the grant names [${rejected.join(', ')}]. ` +
            'A selector registered at runtime must self-reference.'
        );
      }
    }
    return [...explicit];
  }

  // No explicit value: mirror the schema. For a runtime-registered execution selector that is `[self]`.
  return schemaHandlers.length > 0 ? schemaHandlers : [functionSelector];
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
 *
 * When `functionPermission.handlerForSelectors` is omitted, it defaults to `[functionSelector]`
 * (self-reference). That is the required value for any selector registered at runtime via
 * `REGISTER_FUNCTION`: `GuardController._registerGuardedFunction` hard-codes
 * `enforceHandlerRelations: true` with `handlerForSelectors: [self]`, so a grant that names anything else
 * reverts `HandlerForSelectorMismatch`.
 *
 * The default is **not** correct for every selector — a few built-in schemas run strict mode against a
 * *different* handler (`roleConfigBatchRequestAndApprove` lists `[executeRoleConfigBatch]`). For those,
 * pass the value explicitly, or derive it from the schema with {@link resolveHandlerForSelectors}, which
 * also rejects a wrong explicit value before it costs a transaction.
 */
export function encodeAddFunctionToRole(
  _client: PublicClient,
  _definitionAddress: Address,
  roleHash: Hex,
  functionPermission: FunctionPermissionForEncoding
): Hex {
  const handlerForSelectors =
    functionPermission.handlerForSelectors && functionPermission.handlerForSelectors.length > 0
      ? [...functionPermission.handlerForSelectors]
      : [functionPermission.functionSelector];
  const tuple: [Hex, number, readonly Hex[]] = [
    functionPermission.functionSelector,
    functionPermission.grantedActionsBitmap,
    handlerForSelectors
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
