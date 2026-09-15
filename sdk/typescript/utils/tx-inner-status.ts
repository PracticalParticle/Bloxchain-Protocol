/**
 * @file tx-inner-status.ts
 * @description A mined transaction is not a successful one.
 *
 * When the call inside a Bloxchain workflow reverts, `EngineBlox._completeTransaction`
 * catches it: the record is written `TxStatus.FAILED`, the revert bytes go out on
 * `TxExecutionResult`, and the outer transaction **still mines, still returns
 * `status: 'success'`, and still charges for every unit of gas it burned**. A
 * role-configuration batch can cost two million gas, report success, and grant
 * nothing.
 *
 * So `receipt.status === 'success'` answers "did the account accept the request",
 * not "did the work happen". The helpers here answer the second question:
 *
 * | Helper | Use |
 * |--------|-----|
 * | {@link readInnerOutcomes} | What terminal records did this receipt touch? |
 * | {@link assertInnerSuccess} | Throw {@link InnerTransactionFailedError} if any of them failed |
 * | {@link waitForTransactionAndAssertInner} | Wait for the receipt, then assert |
 *
 * All three work off the receipt's own logs, so they cost no extra RPC round trip
 * and are immune to a later state change.
 */

import { decodeEventLog, type Address, type Hex, type PublicClient, type TransactionReceipt } from 'viem';
import { TxStatus } from '../types/lib.index.js';
import { explainError, decodeRevert, type ExplainedError } from './errors.js';

/**
 * The two `EngineBlox` lifecycle events every Blox emits on a terminal state.
 *
 * They are declared on the library rather than the contract, so they do **not**
 * appear in a Blox's own compiled ABI — which is exactly why an integrator has to
 * transcribe them to read a receipt back. Exported here so nobody has to.
 */
export const ENGINE_BLOX_EVENTS_ABI = [
  {
    type: 'event',
    name: 'TransactionEvent',
    anonymous: false,
    inputs: [
      { name: 'txId', type: 'uint256', indexed: true },
      { name: 'functionHash', type: 'bytes4', indexed: true },
      { name: 'status', type: 'uint8', indexed: false },
      { name: 'requester', type: 'address', indexed: true },
      { name: 'target', type: 'address', indexed: false },
      { name: 'operationType', type: 'bytes32', indexed: false },
      { name: 'resultHash', type: 'bytes32', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'TxExecutionResult',
    anonymous: false,
    inputs: [
      { name: 'txId', type: 'uint256', indexed: true },
      { name: 'result', type: 'bytes', indexed: false },
    ],
  },
] as const;

/** `TxStatus` values that are terminal — the record will not change again. */
const TERMINAL_STATUSES: readonly number[] = [TxStatus.CANCELLED, TxStatus.COMPLETED, TxStatus.FAILED];

/** Human-readable `TxStatus` names, by enum position. */
export const TX_STATUS_NAMES = [
  'UNDEFINED',
  'PENDING',
  'EXECUTING',
  'PROCESSING_PAYMENT',
  'CANCELLED',
  'COMPLETED',
  'FAILED',
] as const;

/** Name a `TxStatus` value, falling back to the number for a value we do not know. */
export function txStatusName(status: number | bigint): string {
  const n = Number(status);
  return TX_STATUS_NAMES[n] ?? `UNKNOWN(${n})`;
}

/** One record that reached a terminal state inside a transaction. */
export interface InnerTxOutcome {
  /** Record id inside the Blox. */
  txId: bigint;
  /** Terminal `TxStatus` — `CANCELLED`, `COMPLETED`, or `FAILED`. */
  status: number;
  /** `TX_STATUS_NAMES[status]`. */
  statusName: string;
  /** Address of the Blox that emitted the event. */
  address: Address;
  /** Selector of the guarded function this record ran. */
  functionHash: Hex;
  /** Address that requested the record. */
  requester: Address;
  /** Target the record called. */
  target: Address;
  /** Operation type hash. */
  operationType: Hex;
  /** Raw execution returndata from `TxExecutionResult`, when the event was emitted. */
  result?: Hex;
  /**
   * The inner revert, decoded — present when `status` is `FAILED` and the
   * returndata could be named. `raw` on this is the inner revert payload.
   */
  failure?: ExplainedError;
}

/** Options shared by the inner-status helpers. */
export interface InnerStatusAssertOptions {
  /**
   * Only consider events emitted by this address. Pass the Blox you called —
   * without it, logs from any contract in the transaction are considered, which
   * matters for a batch that touches more than one Blox.
   */
  address?: Address;
  /**
   * ABI used to decode the inner revert bytes. Pass the **target's** ABI (the
   * contract the guarded call went into), not the Blox's — the revert came from
   * there. `ALL_ERROR_ABI` from `@bloxchain/sdk/abi` is a reasonable default.
   */
  abi?: readonly unknown[];
  /**
   * Treat `CANCELLED` as a failure too. Off by default: a cancellation is a
   * deliberate outcome, not a fault.
   */
  failOnCancelled?: boolean;
}

/** Minimal log shape — matches viem's `TransactionReceipt['logs'][number]`. */
interface LogLike {
  address: string;
  data: Hex;
  topics: readonly Hex[];
}

/**
 * Read back every record that reached a terminal state in this receipt.
 *
 * Returns `[]` when the transaction touched no Blox workflow — a plain transfer,
 * or a call that only requested a time-locked record without executing it.
 *
 * @param receiptOrLogs A transaction receipt, or just its logs
 * @param options `address` to scope to one Blox, `abi` to decode inner reverts
 */
export function readInnerOutcomes(
  receiptOrLogs: TransactionReceipt | { logs: readonly LogLike[] } | readonly LogLike[],
  options: InnerStatusAssertOptions = {}
): InnerTxOutcome[] {
  const logs: readonly LogLike[] = Array.isArray(receiptOrLogs)
    ? (receiptOrLogs as readonly LogLike[])
    : ((receiptOrLogs as { logs: readonly LogLike[] }).logs ?? []);

  const wanted = options.address?.toLowerCase();
  const scoped = wanted ? logs.filter((l) => l.address?.toLowerCase() === wanted) : logs;

  const results = new Map<string, Hex>();
  const terminal: InnerTxOutcome[] = [];

  for (const log of scoped) {
    let decoded: any;
    try {
      decoded = decodeEventLog({
        abi: ENGINE_BLOX_EVENTS_ABI,
        data: log.data,
        topics: log.topics as [Hex, ...Hex[]],
      });
    } catch {
      // Another contract's event, or a shape this ABI does not cover.
      continue;
    }

    if (decoded.eventName === 'TxExecutionResult') {
      results.set(String(decoded.args.txId), decoded.args.result as Hex);
      continue;
    }

    if (decoded.eventName !== 'TransactionEvent') continue;
    const status = Number(decoded.args.status);
    if (!TERMINAL_STATUSES.includes(status)) continue;

    terminal.push({
      txId: decoded.args.txId as bigint,
      status,
      statusName: txStatusName(status),
      address: log.address as Address,
      functionHash: decoded.args.functionHash as Hex,
      requester: decoded.args.requester as Address,
      target: decoded.args.target as Address,
      operationType: decoded.args.operationType as Hex,
    });
  }

  for (const outcome of terminal) {
    const result = results.get(String(outcome.txId));
    if (result !== undefined) outcome.result = result;
    if (outcome.status === TxStatus.FAILED && result && result.length >= 10) {
      const decodedRevert = decodeRevert(result, options.abi);
      outcome.failure = decodedRevert
        ? {
            kind: 'revert',
            errorName: decodedRevert.errorName,
            args: decodedRevert.args,
            selector: decodedRevert.selector,
            raw: decodedRevert.raw,
            message: decodedRevert.message,
            cause: undefined,
          }
        : {
            kind: 'revert',
            errorName: 'Unknown',
            args: {},
            selector: result.slice(0, 10).toLowerCase() as `0x${string}`,
            raw: result,
            message: `Inner call reverted with undecodable data ${result.slice(0, 10)}`,
            cause: undefined,
          };
    }
  }

  return terminal;
}

/**
 * Thrown by {@link assertInnerSuccess} when a transaction mined but the Blox
 * recorded the work as failed.
 */
export class InnerTransactionFailedError extends Error {
  readonly name = 'InnerTransactionFailedError';
  /** Transaction hash of the outer (successful) transaction, when known. */
  readonly hash?: Hex;
  /** Every terminal record from the receipt, failed and otherwise. */
  readonly outcomes: readonly InnerTxOutcome[];
  /** The records that failed. */
  readonly failures: readonly InnerTxOutcome[];
  /** Stable name of the first inner revert, for switching on. */
  readonly errorName: string;
  /** Decoded arguments of the first inner revert. */
  readonly args: Record<string, unknown>;
  /** Raw inner revert bytes of the first failure, when there were any. */
  readonly raw?: Hex;

  constructor(message: string, init: {
    hash?: Hex;
    outcomes: readonly InnerTxOutcome[];
    failures: readonly InnerTxOutcome[];
  }) {
    super(message);
    this.hash = init.hash;
    this.outcomes = init.outcomes;
    this.failures = init.failures;
    const first = init.failures[0];
    this.errorName = first?.failure?.errorName ?? 'Unknown';
    this.args = first?.failure?.args ?? {};
    this.raw = first?.failure?.raw ?? first?.result;
  }
}

/**
 * Throw unless every terminal record in this receipt succeeded.
 *
 * Use it after **every** guarded write and every configuration batch. The outer
 * receipt says only that the account ran; this says whether the work landed.
 *
 * ```ts
 * const res = await account.roleConfigBatchRequestAndApprove(metaTx, { from: broadcaster });
 * const receipt = await res.wait();
 * assertInnerSuccess(receipt, { address: accountAddress, abi: ALL_ERROR_ABI });
 * // past this line the roles really were granted
 * ```
 *
 * @throws InnerTransactionFailedError when a record is `FAILED`
 *         (or `CANCELLED` with `failOnCancelled`)
 * @returns the terminal outcomes, so a caller can inspect what ran
 */
export function assertInnerSuccess(
  receipt: TransactionReceipt | { logs: readonly LogLike[]; transactionHash?: Hex },
  options: InnerStatusAssertOptions = {}
): InnerTxOutcome[] {
  const outcomes = readInnerOutcomes(receipt as any, options);
  const failures = outcomes.filter(
    (o) => o.status === TxStatus.FAILED || (options.failOnCancelled === true && o.status === TxStatus.CANCELLED)
  );
  if (failures.length === 0) return outcomes;

  const hash = (receipt as { transactionHash?: Hex }).transactionHash;
  const detail = failures
    .map((f) => {
      const why = f.failure ? f.failure.message : `revert data ${f.result ?? '(none)'}`;
      return `tx ${f.txId.toString()} on ${f.address} recorded ${f.statusName}: ${why}`;
    })
    .join('; ');

  throw new InnerTransactionFailedError(
    `Transaction mined successfully but the work inside it did not: ${detail}` +
      (hash ? ` (${hash})` : '') +
      '. The outer receipt reports success for a caught inner revert — gas was still spent.',
    { hash, outcomes, failures }
  );
}

/**
 * Wait for a transaction receipt, then assert the work inside it succeeded.
 *
 * The one-call form of "mined is not done": it fails on an outer revert the way
 * viem does, and on an inner `TxStatus.FAILED` the way
 * {@link assertInnerSuccess} does.
 *
 * ```ts
 * const receipt = await waitForTransactionAndAssertInner(publicClient, res.hash, {
 *   address: accountAddress,
 *   abi: ALL_ERROR_ABI,
 * });
 * ```
 *
 * @throws InnerTransactionFailedError when the outer receipt succeeded but a record failed
 */
export async function waitForTransactionAndAssertInner(
  client: PublicClient,
  hash: Hex,
  options: InnerStatusAssertOptions & { confirmations?: number; timeout?: number } = {}
): Promise<TransactionReceipt> {
  const receipt = await client.waitForTransactionReceipt({
    hash,
    ...(options.confirmations !== undefined ? { confirmations: options.confirmations } : {}),
    ...(options.timeout !== undefined ? { timeout: options.timeout } : {}),
  });

  if (receipt.status !== 'success') {
    throw new Error(`Transaction ${hash} reverted (receipt status "${receipt.status}")`);
  }

  assertInnerSuccess(receipt, options);
  return receipt;
}

export { explainError };

export default {
  ENGINE_BLOX_EVENTS_ABI,
  TX_STATUS_NAMES,
  txStatusName,
  readInnerOutcomes,
  assertInnerSuccess,
  waitForTransactionAndAssertInner,
  InnerTransactionFailedError,
};
