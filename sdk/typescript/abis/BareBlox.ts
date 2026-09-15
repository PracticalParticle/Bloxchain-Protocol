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
import type { Abi } from 'viem';
import abiJson from '../abi/BareBlox.abi.json' with { type: 'json' };

/** BareBlox contract ABI (full, as published in `abi/BareBlox.abi.json`). */
export const bareBloxAbi = abiJson as Abi;

/** BareBlox ABI entries for custom errors only (for viem `decodeErrorResult`). */
export const bareBloxErrorAbi = bareBloxAbi.filter(
  (item): item is Extract<Abi[number], { type: 'error' }> => item.type === 'error'
);

/** BareBlox ABI entries for events only (for viem `decodeEventLog` / `parseEventLogs`). */
export const bareBloxEventAbi = bareBloxAbi.filter(
  (item): item is Extract<Abi[number], { type: 'event' }> => item.type === 'event'
);

export default bareBloxAbi;
