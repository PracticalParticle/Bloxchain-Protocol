/**
 * BaseStateMachine contract ABI — the published artifact, reachable without transcription.
 *
 * ```ts
 * import { baseStateMachineAbi } from '@bloxchain/sdk/abi/BaseStateMachine';
 * ```
 *
 * The same bytes are also reachable as raw JSON via
 * `@bloxchain/sdk/abi/BaseStateMachine.abi.json`, and from the typed barrel
 * `@bloxchain/sdk/abi`.
 */
import abiJson from '../abi/BaseStateMachine.abi.json' with { type: 'json' };

/** BaseStateMachine contract ABI (full, as published in `abi/BaseStateMachine.abi.json`). */
export const baseStateMachineAbi = abiJson as readonly unknown[];

/** BaseStateMachine ABI entries for custom errors only (for viem `decodeErrorResult`). */
export const baseStateMachineErrorAbi = (baseStateMachineAbi as Array<{ type?: string }>).filter(
  (item) => item.type === 'error'
);

/** BaseStateMachine ABI entries for events only (for viem `decodeEventLog` / `parseEventLogs`). */
export const baseStateMachineEventAbi = (baseStateMachineAbi as Array<{ type?: string }>).filter(
  (item) => item.type === 'event'
);

export default baseStateMachineAbi;
