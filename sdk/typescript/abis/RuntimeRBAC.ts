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
import abiJson from '../abi/RuntimeRBAC.abi.json' with { type: 'json' };

/** RuntimeRBAC contract ABI (full, as published in `abi/RuntimeRBAC.abi.json`). */
export const runtimeRBACAbi = abiJson as readonly unknown[];

/** RuntimeRBAC ABI entries for custom errors only (for viem `decodeErrorResult`). */
export const runtimeRBACErrorAbi = (runtimeRBACAbi as Array<{ type?: string }>).filter(
  (item) => item.type === 'error'
);

/** RuntimeRBAC ABI entries for events only (for viem `decodeEventLog` / `parseEventLogs`). */
export const runtimeRBACEventAbi = (runtimeRBACAbi as Array<{ type?: string }>).filter(
  (item) => item.type === 'event'
);

export default runtimeRBACAbi;
