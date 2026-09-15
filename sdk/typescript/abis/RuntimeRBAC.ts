/**
 * RuntimeRBAC contract ABI — the published artifact, reachable without transcription.
 *
 * ```ts
 * import { runtimeRBACAbi } from '@bloxchain/sdk/abi/RuntimeRBAC';
 * ```
 *
 * The same bytes are also reachable as raw JSON via
 * `@bloxchain/sdk/abi/RuntimeRBAC.abi.json`, and from the typed barrel
 * `@bloxchain/sdk/abi`.
 */
import type { Abi } from 'viem';
import abiJson from '../abi/RuntimeRBAC.abi.json' with { type: 'json' };

/** RuntimeRBAC contract ABI (full, as published in `abi/RuntimeRBAC.abi.json`). */
export const runtimeRBACAbi = abiJson as Abi;

/** RuntimeRBAC ABI entries for custom errors only (for viem `decodeErrorResult`). */
export const runtimeRBACErrorAbi = runtimeRBACAbi.filter(
  (item): item is Extract<Abi[number], { type: 'error' }> => item.type === 'error'
);

/** RuntimeRBAC ABI entries for events only (for viem `decodeEventLog` / `parseEventLogs`). */
export const runtimeRBACEventAbi = runtimeRBACAbi.filter(
  (item): item is Extract<Abi[number], { type: 'event' }> => item.type === 'event'
);

export default runtimeRBACAbi;
