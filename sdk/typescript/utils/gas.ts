import { PublicClient } from 'viem';

/**
 * Transaction gas ceilings and the measured envelope for account provisioning.
 *
 * SPEC-2026-0118 R4. The numbers here are measured, not estimated: `cloneBlox` against
 * the `AccountBlox` template is close enough to the public per-transaction cap that the
 * difference between "estimate" and "cap" is the difference between an account and a
 * half-made one.
 */

/**
 * EIP-7825 per-transaction gas cap enforced by public networks (2^24 = 16,777,216).
 *
 * This is a **protocol** limit on a single transaction, and it is not the block gas
 * limit: a network can have a 60 M block and still refuse a 20 M transaction with
 * `transaction gas limit too high (cap: 16777216, tx: 20000000)`. A local or lab chain
 * that has not implemented EIP-7825 may accept more, which is exactly how a flow passes
 * in the lab and fails on Sepolia.
 */
export const MAX_TX_GAS = 16_777_216n;

/**
 * Measured gas envelope for obtaining a governed account.
 *
 * `cloneOfAccountBlox` is the observed `gasUsed` for `CopyBlox.cloneBlox` against the
 * `AccountBlox` template on Sepolia. It leaves roughly 590 k of head-room under
 * {@link MAX_TX_GAS}, so treat the clone as a fixed-cost operation with a thin margin
 * rather than something to pad by a percentage.
 */
export const GAS_ENVELOPE = {
  /** Observed `gasUsed` for a clone + initialize in one transaction. */
  cloneOfAccountBlox: 16_183_550n,
  /** Send a clone with this explicit limit: the cap itself, not an estimate. */
  cloneSendGasLimit: MAX_TX_GAS,
  /**
   * Fail loudly below this. An estimate under the floor means the estimator did not
   * actually price the clone (a public node answering "insufficient funds" without a
   * state override, or a stale cached estimate), not that the clone got cheaper.
   */
  cloneGasFloor: 15_000_000n,
  /** Guard configuration batch (schemas + whitelists), observed order of magnitude. */
  guardConfigBatch: 1_000_000n,
  /** Role configuration batch (grants), observed order of magnitude. */
  roleConfigBatch: 2_000_000n,
} as const;

export class MaxTxGasExceededError extends Error {
  readonly gas: bigint;
  readonly cap: bigint;

  constructor(label: string, gas: bigint, cap: bigint) {
    super(
      `${label} needs ${gas.toString()} gas, over the EIP-7825 per-transaction cap of ${cap.toString()} (2^24). ` +
        'Public networks reject the transaction outright; the block gas limit is irrelevant here.'
    );
    this.name = 'MaxTxGasExceededError';
    this.gas = gas;
    this.cap = cap;
  }
}

export class GasFloorNotMetError extends Error {
  readonly gas: bigint;
  readonly floor: bigint;

  constructor(label: string, gas: bigint, floor: bigint) {
    super(
      `${label} was priced at ${gas.toString()} gas, below the floor of ${floor.toString()}. ` +
        'This is almost never a cheaper transaction: an estimator that cannot price the call ' +
        'returns a number that looks real. Re-estimate with a state override, or send the ' +
        'measured limit instead of an estimate.'
    );
    this.name = 'GasFloorNotMetError';
    this.gas = gas;
    this.floor = floor;
  }
}

/**
 * Throw when a gas amount is over the per-transaction cap.
 *
 * @param gas Gas limit or estimate about to be used
 * @param label What the gas is for, used in the message
 * @param cap Override the cap for a network that sets a different one
 */
export function assertUnderMaxTxGas(gas: bigint, label = 'transaction', cap = MAX_TX_GAS): void {
  if (gas > cap) throw new MaxTxGasExceededError(label, gas, cap);
}

/**
 * Check a gas estimate against both a floor and the per-transaction cap.
 *
 * An estimate that comes back **at** the cap is the shape of a failure, not a price: the
 * node clamped it. Treat it the same as being over the cap.
 *
 * Prefer {@link assertUnderMaxTxGas} alone for generic `IBaseStateMachine` templates whose
 * clone cost is not the measured AccountBlox envelope. Pass an explicit `floor` (for
 * example {@link GAS_ENVELOPE.cloneGasFloor}) only when pricing that measured path.
 *
 * @param estimate Gas the estimator returned
 * @param floor Minimum credible gas for this operation
 * @param label What the gas is for, used in the message
 * @param cap Per-transaction cap
 */
export function assertGasEnvelope(
  estimate: bigint,
  floor: bigint,
  label = 'transaction',
  cap = MAX_TX_GAS
): void {
  if (estimate >= cap) {
    throw new MaxTxGasExceededError(
      `${label} (estimate came back at or over the cap, which is what a clamped estimate looks like)`,
      estimate,
      cap
    );
  }
  if (estimate < floor) throw new GasFloorNotMetError(label, estimate, floor);
}

/**
 * Cap-only check for a clone gas estimate, with an optional AccountBlox-measured floor.
 *
 * When `floor` is omitted, only the EIP-7825 per-transaction cap is enforced — correct for
 * arbitrary `IBaseStateMachine` templates. Pass {@link GAS_ENVELOPE.cloneGasFloor} (or
 * another measured floor) when the template is the official AccountBlox shape.
 */
export function assertCloneGasEstimate(
  estimate: bigint,
  options: { floor?: bigint; label?: string; cap?: bigint } = {}
): void {
  const label = options.label ?? 'CopyBlox.cloneBlox';
  const cap = options.cap ?? MAX_TX_GAS;
  if (options.floor !== undefined) {
    assertGasEnvelope(estimate, options.floor, label, cap);
    return;
  }
  if (estimate >= cap) {
    throw new MaxTxGasExceededError(
      `${label} (estimate came back at or over the cap, which is what a clamped estimate looks like)`,
      estimate,
      cap
    );
  }
}

/**
 * Read the connected chain's block gas limit, for reporting only.
 *
 * Deliberately separate from {@link MAX_TX_GAS}: conflating the two is the mistake that
 * sent a 20 M transaction at a network that caps a transaction at 2^24.
 */
export async function getBlockGasLimit(client: PublicClient): Promise<bigint> {
  const block = await client.getBlock({ blockTag: 'latest' });
  return block.gasLimit;
}
