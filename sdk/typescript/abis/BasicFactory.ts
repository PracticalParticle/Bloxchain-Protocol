/**
 * BasicFactory contract ABI (SPEC-2026-0130 canonical source; no official deployment declared).
 *
 * ```ts
 * import { basicFactoryAbi } from '@bloxchain/sdk/abi/BasicFactory';
 * ```
 *
 * The same bytes are also reachable as raw JSON via
 * `@bloxchain/sdk/abi/BasicFactory.abi.json`, and from the typed barrel
 * `@bloxchain/sdk/abi`.
 */
import type { Abi } from 'viem';
import abiJson from '../abi/BasicFactory.abi.json' with { type: 'json' };

/** BasicFactory contract ABI (full, as published in `abi/BasicFactory.abi.json`). */
export const basicFactoryAbi = abiJson as Abi;

/** BasicFactory ABI entries for custom errors only (for viem `decodeErrorResult`). */
export const basicFactoryErrorAbi = basicFactoryAbi.filter(
  (item): item is Extract<Abi[number], { type: 'error' }> => item.type === 'error'
);

/** BasicFactory ABI entries for events only (for viem `decodeEventLog` / `parseEventLogs`). */
export const basicFactoryEventAbi = basicFactoryAbi.filter(
  (item): item is Extract<Abi[number], { type: 'event' }> => item.type === 'event'
);

export default basicFactoryAbi;
