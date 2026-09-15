/**
 * BareBlox contract ABI — the published artifact, reachable without transcription.
 *
 * ```ts
 * import { bareBloxAbi } from '@bloxchain/sdk/abi/BareBlox';
 * ```
 *
 * The same bytes are also reachable as raw JSON via
 * `@bloxchain/sdk/abi/BareBlox.abi.json`, and from the typed barrel
 * `@bloxchain/sdk/abi`.
 */
import abiJson from '../abi/BareBlox.abi.json' with { type: 'json' };

/** BareBlox contract ABI (full, as published in `abi/BareBlox.abi.json`). */
export const bareBloxAbi = abiJson as readonly unknown[];

/** BareBlox ABI entries for custom errors only (for viem `decodeErrorResult`). */
export const bareBloxErrorAbi = (bareBloxAbi as Array<{ type?: string }>).filter(
  (item) => item.type === 'error'
);

/** BareBlox ABI entries for events only (for viem `decodeEventLog` / `parseEventLogs`). */
export const bareBloxEventAbi = (bareBloxAbi as Array<{ type?: string }>).filter(
  (item) => item.type === 'event'
);

export default bareBloxAbi;
