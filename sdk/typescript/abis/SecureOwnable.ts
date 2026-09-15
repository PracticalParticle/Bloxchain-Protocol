/**
 * SecureOwnable contract ABI — the published artifact, reachable without transcription.
 *
 * ```ts
 * import { secureOwnableAbi } from '@bloxchain/sdk/abi/SecureOwnable';
 * ```
 *
 * The same bytes are also reachable as raw JSON via
 * `@bloxchain/sdk/abi/SecureOwnable.abi.json`, and from the typed barrel
 * `@bloxchain/sdk/abi`.
 */
import type { Abi } from 'viem';
import abiJson from '../abi/SecureOwnable.abi.json' with { type: 'json' };

/** SecureOwnable contract ABI (full, as published in `abi/SecureOwnable.abi.json`). */
export const secureOwnableAbi = abiJson as Abi;

/** SecureOwnable ABI entries for custom errors only (for viem `decodeErrorResult`). */
export const secureOwnableErrorAbi = secureOwnableAbi.filter(
  (item): item is Extract<Abi[number], { type: 'error' }> => item.type === 'error'
);

/** SecureOwnable ABI entries for events only (for viem `decodeEventLog` / `parseEventLogs`). */
export const secureOwnableEventAbi = secureOwnableAbi.filter(
  (item): item is Extract<Abi[number], { type: 'event' }> => item.type === 'event'
);

export default secureOwnableAbi;
