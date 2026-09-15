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
import abiJson from '../abi/RoleBlox.abi.json' with { type: 'json' };

/** RoleBlox contract ABI (full, as published in `abi/RoleBlox.abi.json`). */
export const roleBloxAbi = abiJson as readonly unknown[];

/** RoleBlox ABI entries for custom errors only (for viem `decodeErrorResult`). */
export const roleBloxErrorAbi = (roleBloxAbi as Array<{ type?: string }>).filter(
  (item) => item.type === 'error'
);

/** RoleBlox ABI entries for events only (for viem `decodeEventLog` / `parseEventLogs`). */
export const roleBloxEventAbi = (roleBloxAbi as Array<{ type?: string }>).filter(
  (item) => item.type === 'event'
);

export default roleBloxAbi;
