/**
 * R7 / AC5 — a mined transaction is not a successful one.
 *
 * Builds the receipt the FX role batch actually produced: outer status
 * `success`, two million gas spent, and a `TransactionEvent` recording the
 * inner work `FAILED`. The helper must refuse that receipt; it must also let a
 * genuinely successful one through, and stay quiet about logs from other
 * contracts in the same transaction.
 */

import { encodeAbiParameters, encodeEventTopics, toFunctionSelector, type Address, type Hex } from 'viem';
import {
  ENGINE_BLOX_EVENTS_ABI,
  readInnerOutcomes,
  assertInnerSuccess,
  InnerTransactionFailedError,
  TxStatus,
  txStatusName,
  ALL_ERROR_ABI,
} from '../../../sdk/typescript/index.js';
import type { SurfaceTestResult } from './package-exports-tests.ts';

const ACCOUNT = '0x000000000000000000000000000000000000ba51' as Address;
const OTHER_CONTRACT = '0x000000000000000000000000000000000000c0de' as Address;
const REQUESTER = '0x00000000000000000000000000000000000000f1' as Address;
const TARGET = '0x00000000000000000000000000000000000000f2' as Address;
const OPERATION = `0x${'33'.repeat(32)}` as Hex;
const FN_HASH = '0xabcdef12' as Hex;

function transactionEventLog(address: Address, txId: bigint, status: number) {
  const topics = encodeEventTopics({
    abi: ENGINE_BLOX_EVENTS_ABI,
    eventName: 'TransactionEvent',
    args: { txId, functionHash: FN_HASH, requester: REQUESTER },
  });
  const data = encodeAbiParameters(
    [{ type: 'uint8' }, { type: 'address' }, { type: 'bytes32' }, { type: 'bytes32' }],
    [status, TARGET, OPERATION, `0x${'00'.repeat(32)}` as Hex]
  );
  return { address, topics, data };
}

function txExecutionResultLog(address: Address, txId: bigint, result: Hex) {
  const topics = encodeEventTopics({
    abi: ENGINE_BLOX_EVENTS_ABI,
    eventName: 'TxExecutionResult',
    args: { txId },
  });
  const data = encodeAbiParameters([{ type: 'bytes' }], [result]);
  return { address, topics, data };
}

/** `NoPermission(address)` — the inner revert the account caught and recorded. */
function innerRevertBytes(): Hex {
  const selector = toFunctionSelector('NoPermission(address)');
  const args = encodeAbiParameters([{ type: 'address' }], [REQUESTER]);
  return `${selector}${args.slice(2)}` as Hex;
}

function receipt(logs: any[], gasUsed = 2_021_592n) {
  return {
    status: 'success' as const,
    transactionHash: `0x${'ab'.repeat(32)}` as Hex,
    gasUsed,
    logs,
  };
}

export async function runInnerStatusTests(): Promise<SurfaceTestResult[]> {
  const results: SurfaceTestResult[] = [];
  const add = (name: string, passed: boolean, detail?: string) => {
    results.push({ name, passed, detail });
    console.log(`  ${passed ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
  };

  const revert = innerRevertBytes();

  // --- AC5: outer success, inner FAILED ---
  const failed = receipt([
    transactionEventLog(ACCOUNT, 42n, TxStatus.FAILED),
    txExecutionResultLog(ACCOUNT, 42n, revert),
  ]);

  const outcomes = readInnerOutcomes(failed, { address: ACCOUNT, abi: ALL_ERROR_ABI });
  add('readInnerOutcomes finds the terminal record', outcomes.length === 1, `${outcomes.length} outcome(s)`);
  add('outcome reports FAILED', outcomes[0]?.statusName === 'FAILED', outcomes[0]?.statusName);
  add('outcome keeps the inner revert bytes', outcomes[0]?.result === revert);
  add(
    'outcome names the inner revert',
    outcomes[0]?.failure?.errorName === 'NoPermission',
    outcomes[0]?.failure?.errorName ?? '(unnamed)'
  );

  let threw: unknown;
  try {
    assertInnerSuccess(failed, { address: ACCOUNT, abi: ALL_ERROR_ABI });
  } catch (e) {
    threw = e;
  }
  add(
    'assertInnerSuccess throws when the outer receipt succeeded but the work failed',
    threw instanceof InnerTransactionFailedError,
    threw instanceof Error ? threw.name : String(threw)
  );
  if (threw instanceof InnerTransactionFailedError) {
    add('thrown error names the inner revert', threw.errorName === 'NoPermission', threw.errorName);
    add('thrown error keeps the inner revert bytes', threw.raw === revert);
    add('thrown error lists the failed records', threw.failures.length === 1);
    add(
      'thrown message says gas was still spent',
      /gas was still spent/i.test(threw.message),
      threw.message.slice(0, 120)
    );
  }

  // --- A genuinely successful receipt passes ---
  const completed = receipt([
    transactionEventLog(ACCOUNT, 43n, TxStatus.COMPLETED),
    txExecutionResultLog(ACCOUNT, 43n, '0x' as Hex),
  ]);
  let passedThrough = true;
  try {
    assertInnerSuccess(completed, { address: ACCOUNT, abi: ALL_ERROR_ABI });
  } catch {
    passedThrough = false;
  }
  add('assertInnerSuccess lets a COMPLETED record through', passedThrough);

  // --- CANCELLED is a decision, not a fault, unless asked ---
  const cancelled = receipt([transactionEventLog(ACCOUNT, 44n, TxStatus.CANCELLED)]);
  let cancelPassed = true;
  try {
    assertInnerSuccess(cancelled, { address: ACCOUNT });
  } catch {
    cancelPassed = false;
  }
  add('CANCELLED passes by default', cancelPassed);
  let cancelFailed = false;
  try {
    assertInnerSuccess(cancelled, { address: ACCOUNT, failOnCancelled: true });
  } catch {
    cancelFailed = true;
  }
  add('CANCELLED fails with failOnCancelled', cancelFailed);

  // --- Scoping: another contract's failure in the same transaction ---
  const mixed = receipt([
    transactionEventLog(ACCOUNT, 45n, TxStatus.COMPLETED),
    transactionEventLog(OTHER_CONTRACT, 99n, TxStatus.FAILED),
  ]);
  let scopedPassed = true;
  try {
    assertInnerSuccess(mixed, { address: ACCOUNT });
  } catch {
    scopedPassed = false;
  }
  add("scoping to `address` ignores another contract's records", scopedPassed);
  add(
    'unscoped, both records are seen',
    readInnerOutcomes(mixed).length === 2,
    `${readInnerOutcomes(mixed).length} outcome(s)`
  );

  // --- A transaction with no Blox workflow is not a failure ---
  add('a receipt with no lifecycle events yields no outcomes', readInnerOutcomes(receipt([])).length === 0);

  // --- Non-terminal states are not reported as outcomes ---
  const pending = receipt([transactionEventLog(ACCOUNT, 46n, TxStatus.PENDING)]);
  add('a PENDING record is not a terminal outcome', readInnerOutcomes(pending, { address: ACCOUNT }).length === 0);

  add('txStatusName maps the enum', txStatusName(TxStatus.FAILED) === 'FAILED', txStatusName(TxStatus.FAILED));

  return results;
}
