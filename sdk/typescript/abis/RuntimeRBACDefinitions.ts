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
import abiJson from '../abi/RuntimeRBACDefinitions.abi.json' with { type: 'json' };

/** RuntimeRBACDefinitions contract ABI (full, as published in `abi/RuntimeRBACDefinitions.abi.json`). */
export const runtimeRBACDefinitionsAbi = abiJson as readonly unknown[];

/** RuntimeRBACDefinitions ABI entries for custom errors only (for viem `decodeErrorResult`). */
export const runtimeRBACDefinitionsErrorAbi = (runtimeRBACDefinitionsAbi as Array<{ type?: string }>).filter(
  (item) => item.type === 'error'
);

/** RuntimeRBACDefinitions ABI entries for events only (for viem `decodeEventLog` / `parseEventLogs`). */
export const runtimeRBACDefinitionsEventAbi = (runtimeRBACDefinitionsAbi as Array<{ type?: string }>).filter(
  (item) => item.type === 'event'
);

export default runtimeRBACDefinitionsAbi;
