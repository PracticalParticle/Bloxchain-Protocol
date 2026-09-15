/**
 * RoleBlox contract ABI — the published artifact, reachable without transcription.
 *
 * ```ts
 * import { roleBloxAbi } from '@bloxchain/sdk/abi/RoleBlox';
 * ```
 *
 * The same bytes are also reachable as raw JSON via
 * `@bloxchain/sdk/abi/RoleBlox.abi.json`, and from the typed barrel
 * `@bloxchain/sdk/abi`.
 */
import type { Abi } from 'viem';
import abiJson from '../abi/RoleBlox.abi.json' with { type: 'json' };

/** RoleBlox contract ABI (full, as published in `abi/RoleBlox.abi.json`). */
export const roleBloxAbi = abiJson as Abi;

/** RoleBlox ABI entries for custom errors only (for viem `decodeErrorResult`). */
export const roleBloxErrorAbi = roleBloxAbi.filter(
  (item): item is Extract<Abi[number], { type: 'error' }> => item.type === 'error'
);

/** RoleBlox ABI entries for events only (for viem `decodeEventLog` / `parseEventLogs`). */
export const roleBloxEventAbi = roleBloxAbi.filter(
  (item): item is Extract<Abi[number], { type: 'event' }> => item.type === 'event'
);

export default roleBloxAbi;
