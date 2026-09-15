/**
 * RuntimeRBACDefinitions contract ABI — the published artifact, reachable without transcription.
 *
 * ```ts
 * import { runtimeRBACDefinitionsAbi } from '@bloxchain/sdk/abi/RuntimeRBACDefinitions';
 * ```
 *
 * The same bytes are also reachable as raw JSON via
 * `@bloxchain/sdk/abi/RuntimeRBACDefinitions.abi.json`, and from the typed barrel
 * `@bloxchain/sdk/abi`.
 */
import type { Abi } from 'viem';
import abiJson from '../abi/RuntimeRBACDefinitions.abi.json' with { type: 'json' };

/** RuntimeRBACDefinitions contract ABI (full, as published in `abi/RuntimeRBACDefinitions.abi.json`). */
export const runtimeRBACDefinitionsAbi = abiJson as Abi;

/** RuntimeRBACDefinitions ABI entries for custom errors only (for viem `decodeErrorResult`). */
export const runtimeRBACDefinitionsErrorAbi = runtimeRBACDefinitionsAbi.filter(
  (item): item is Extract<Abi[number], { type: 'error' }> => item.type === 'error'
);

/** RuntimeRBACDefinitions ABI entries for events only (for viem `decodeEventLog` / `parseEventLogs`). */
export const runtimeRBACDefinitionsEventAbi = runtimeRBACDefinitionsAbi.filter(
  (item): item is Extract<Abi[number], { type: 'event' }> => item.type === 'event'
);

export default runtimeRBACDefinitionsAbi;
