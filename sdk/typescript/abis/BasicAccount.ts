/**
 * BasicAccount contract ABI (SPEC-2026-0130 canonical source; no official deployment declared).
 *
 * ```ts
 * import { basicAccountAbi } from '@bloxchain/sdk/abi/BasicAccount';
 * ```
 *
 * The same bytes are also reachable as raw JSON via
 * `@bloxchain/sdk/abi/BasicAccount.abi.json`, and from the typed barrel
 * `@bloxchain/sdk/abi`.
 */
import type { Abi } from 'viem';
import abiJson from '../abi/BasicAccount.abi.json' with { type: 'json' };

/** BasicAccount contract ABI (full, as published in `abi/BasicAccount.abi.json`). */
export const basicAccountAbi = abiJson as Abi;

/** BasicAccount ABI entries for custom errors only (for viem `decodeErrorResult`). */
export const basicAccountErrorAbi = basicAccountAbi.filter(
  (item): item is Extract<Abi[number], { type: 'error' }> => item.type === 'error'
);

/** BasicAccount ABI entries for events only (for viem `decodeEventLog` / `parseEventLogs`). */
export const basicAccountEventAbi = basicAccountAbi.filter(
  (item): item is Extract<Abi[number], { type: 'event' }> => item.type === 'event'
);

export default basicAccountAbi;
