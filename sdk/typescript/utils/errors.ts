/**
 * @file errors.ts
 * @description Honest, structured failure analysis for Bloxchain writes and reads.
 *
 * Three questions an integrator actually asks when a call fails, and the helper
 * that answers each:
 *
 * | Question | Helper |
 * |----------|--------|
 * | Did the chain revert, and with what? | {@link extractRevertData} → {@link decodeRevert} |
 * | Did the *signer* refuse before anything was broadcast? | {@link classifySignerError} |
 * | Just tell me what happened. | {@link explainError} |
 *
 * `explainError` never throws and never invents: when it cannot name a failure
 * it says `Unknown` and hands back the raw text it saw. It keeps the revert
 * bytes on the result so a caller can decode them against an ABI the SDK does
 * not ship.
 *
 * ### Why this exists beside `viem-error-handler.ts`
 *
 * `enhanceViemError` flattens a decoded error into the message string. That is
 * fine for logging and useless for branching — you cannot `switch` on prose, and
 * regexing a name back out of a message is how integrators ended up writing a
 * second decoder on top of the SDK's. Everything here returns data.
 */

import { decodeErrorResult, decodeAbiParameters } from 'viem';
import {
  decodeRevertReason,
  getUserFriendlyErrorMessage,
  ERROR_SIGNATURES,
  type GuardianContractError,
} from './contract-errors.js';

// ============ REVERT DATA EXTRACTION ============

/** `Error(string)` selector. */
const ERROR_STRING_SELECTOR = '0x08c379a0';
/** `Panic(uint256)` selector. */
const PANIC_SELECTOR = '0x4e487b71';

/**
 * Is this hex plausibly a revert payload rather than something else that happens
 * to be hex?
 *
 * Two rejections carry the weight:
 *
 * 1. **Word alignment.** A revert payload is a 4-byte selector followed by whole
 *    32-byte ABI words. A 20-byte address is 40 hex characters — never
 *    selector-plus-words — so an address can never pass this test. That matters
 *    because the common failure mode is grabbing the `from` address out of
 *    viem's error message and "decoding" its bytes as ASCII, which produces
 *    confident garbage like `yT'VUZt.k` in place of the real error name.
 * 2. **Request calldata.** Viem attaches the *outgoing* calldata to some errors.
 *    Calldata is also selector-plus-words, so alignment alone will not catch it;
 *    callers pass the selectors they sent via `ignoreSelectors` to exclude it.
 */
function looksLikeRevertData(hex: string, ignoreSelectors?: Set<string>): boolean {
  if (typeof hex !== 'string') return false;
  if (!/^0x[0-9a-fA-F]+$/.test(hex)) return false;
  // Bare `0x` is an empty revert — real, but nothing to decode.
  if (hex.length < 10) return false;
  // Selector (8 hex chars) + whole 32-byte words (64 hex chars each).
  if ((hex.length - 10) % 64 !== 0) return false;
  if (ignoreSelectors?.has(hex.slice(0, 10).toLowerCase())) return false;
  return true;
}

/**
 * Is this hex an address rather than revert data?
 *
 * Exported because the check is worth having on its own: it is the single guard
 * that stops a 20-byte address being read as a string.
 */
export function isAddressShapedHex(value: unknown): boolean {
  return typeof value === 'string' && /^0x[0-9a-fA-F]{40}$/.test(value);
}

/** Options for {@link extractRevertData}. */
export interface ExtractRevertDataOptions {
  /**
   * Function selectors of the call being made. Viem attaches outgoing calldata
   * as `error.data` on some errors; listing the selectors you sent keeps that
   * calldata from being mistaken for a revert payload.
   */
  ignoreSelectors?: readonly string[];
}

/**
 * Walk an error for the raw revert bytes the chain actually returned.
 *
 * Viem nests: a `ContractFunctionExecutionError` wraps a
 * `ContractFunctionRevertedError` wraps an `RpcRequestError`, and the SDK may
 * re-wrap the lot again with `originalError`. The payload can sit on `data`,
 * `raw`, `errorData`, or `data.data` at any depth. This walks the whole graph
 * breadth-first, following `cause` and `originalError`, and returns the first
 * candidate that survives {@link looksLikeRevertData}.
 *
 * Returns `undefined` — not a guess — when there are no revert bytes to be had,
 * which is the honest answer for a signer refusal or a transport failure.
 */
export function extractRevertData(
  error: unknown,
  options: ExtractRevertDataOptions = {}
): `0x${string}` | undefined {
  const ignore = options.ignoreSelectors
    ? new Set(options.ignoreSelectors.map((s) => s.toLowerCase()))
    : undefined;
  const seen = new Set<unknown>();
  const queue: unknown[] = [error];

  while (queue.length) {
    const cur = queue.shift() as Record<string, unknown> | undefined;
    if (!cur || typeof cur !== 'object' || seen.has(cur)) continue;
    seen.add(cur);

    for (const candidate of [cur.errorData, cur.raw, cur.data, cur.details, cur.reason]) {
      if (typeof candidate === 'string' && looksLikeRevertData(candidate, ignore)) {
        return candidate as `0x${string}`;
      }
      if (candidate && typeof candidate === 'object') {
        const nested = (candidate as { data?: unknown }).data;
        if (typeof nested === 'string' && looksLikeRevertData(nested, ignore)) {
          return nested as `0x${string}`;
        }
      }
    }

    if (cur.cause) queue.push(cur.cause);
    if (cur.originalError) queue.push(cur.originalError);
    if (Array.isArray(cur.errors)) queue.push(...cur.errors);
  }

  return undefined;
}

/**
 * Flatten `shortMessage` / `message` / `details` down the whole cause chain.
 *
 * The real reason often lives on an inner error while the outer one says only
 * "an unknown error occurred while executing…".
 */
export function errorTextChain(error: unknown): string {
  const parts: string[] = [];
  const seen = new Set<unknown>();
  for (
    let cur = error as Record<string, unknown> | undefined;
    cur && typeof cur === 'object' && !seen.has(cur);
    cur = (cur.cause ?? cur.originalError) as Record<string, unknown> | undefined
  ) {
    seen.add(cur);
    for (const key of ['shortMessage', 'message', 'details'] as const) {
      const p = cur[key];
      if (typeof p === 'string' && p.trim() && !parts.includes(p)) parts.push(p);
    }
  }
  return parts.join('\n');
}

/** The error name viem itself decoded, if it got that far. */
function viemDecodedErrorName(error: unknown): string | undefined {
  const seen = new Set<unknown>();
  for (
    let cur = error as Record<string, unknown> | undefined;
    cur && typeof cur === 'object' && !seen.has(cur);
    cur = (cur.cause ?? cur.originalError) as Record<string, unknown> | undefined
  ) {
    seen.add(cur);
    const name = (cur.data as { errorName?: string } | undefined)?.errorName;
    if (typeof name === 'string' && name) return name;
  }
  return undefined;
}

// ============ REVERT DECODING ============

/** A decoded contract revert. */
export interface DecodedRevert {
  /** Custom-error name (`NoPermission`), `Error` for `Error(string)`, or `Panic`. */
  errorName: string;
  /** Decoded arguments, keyed by the ABI parameter name where one exists. */
  args: Record<string, unknown>;
  /** Positional decoded arguments. */
  argsList: readonly unknown[];
  /** The 4-byte selector these bytes started with. */
  selector: `0x${string}`;
  /** The raw revert bytes, untouched — decode them yourself against any ABI. */
  raw: `0x${string}`;
  /** Where the name came from: the supplied ABI, the SDK's curated table, or `Error(string)`. */
  source: 'abi' | 'signatures' | 'error-string' | 'panic';
  /** Human-readable message for the decoded error. */
  message: string;
}

/** Panic codes from the Solidity spec, for `Panic(uint256)`. */
const PANIC_REASONS: Record<string, string> = {
  '0x00': 'generic compiler panic',
  '0x01': 'assert(false)',
  '0x11': 'arithmetic overflow or underflow',
  '0x12': 'division or modulo by zero',
  '0x21': 'invalid enum conversion',
  '0x22': 'incorrectly encoded storage byte array',
  '0x31': 'pop() on an empty array',
  '0x32': 'array index out of bounds',
  '0x41': 'out of memory',
  '0x51': 'call to an uninitialized internal function',
};

/**
 * Decode revert bytes into a structured result.
 *
 * Tries, in order of trust:
 *
 * 1. viem's `decodeErrorResult` against `abi`, when one is supplied — the only
 *    path that recovers real argument *types*;
 * 2. `Error(string)` and `Panic(uint256)`, the two built-ins;
 * 3. the SDK's curated `ERROR_SIGNATURES` table, which covers every custom error
 *    the protocol declares.
 *
 * Returns `undefined` when the bytes name nothing known. It never falls back to
 * reading the bytes as text: bytes that decode to nothing are reported as
 * nothing, and `raw` is on the caller's result either way.
 *
 * @param data Revert bytes (from {@link extractRevertData})
 * @param abi Optional ABI to decode against — pass the contract's, or
 *        `ALL_ERROR_ABI` from `@bloxchain/sdk/abi` when the revert may come from
 *        a guarded inner call into a contract you do not have an ABI for
 */
export function decodeRevert(data: string, abi?: readonly unknown[]): DecodedRevert | undefined {
  if (!looksLikeRevertData(data)) return undefined;
  const raw = data as `0x${string}`;
  const selector = raw.slice(0, 10).toLowerCase() as `0x${string}`;

  if (abi && abi.length > 0) {
    try {
      const decoded = decodeErrorResult({ abi: abi as any, data: raw });
      const argsList = (decoded.args ?? []) as readonly unknown[];
      const names =
        (decoded.abiItem as { inputs?: Array<{ name?: string }> } | undefined)?.inputs ?? [];
      const args: Record<string, unknown> = {};
      argsList.forEach((v, i) => {
        args[names[i]?.name || String(i)] = v;
      });
      return {
        errorName: decoded.errorName,
        args,
        argsList,
        selector,
        raw,
        source: 'abi',
        message: `${decoded.errorName}(${formatArgs(argsList)})`,
      };
    } catch {
      // fall through to the built-ins and the curated table
    }
  }

  if (selector === ERROR_STRING_SELECTOR) {
    try {
      const [reason] = decodeAbiParameters([{ type: 'string' }], `0x${raw.slice(10)}`);
      return {
        errorName: 'Error',
        args: { reason },
        argsList: [reason],
        selector,
        raw,
        source: 'error-string',
        message: `Error(${JSON.stringify(reason)})`,
      };
    } catch {
      /* not a well-formed Error(string) after all */
    }
  }

  if (selector === PANIC_SELECTOR) {
    try {
      const [code] = decodeAbiParameters([{ type: 'uint256' }], `0x${raw.slice(10)}`);
      const codeHex = `0x${(code as bigint).toString(16).padStart(2, '0')}`;
      const reason = PANIC_REASONS[codeHex] ?? 'unknown panic code';
      return {
        errorName: 'Panic',
        args: { code, reason },
        argsList: [code],
        selector,
        raw,
        source: 'panic',
        message: `Panic(${codeHex}): ${reason}`,
      };
    } catch {
      /* not a well-formed Panic(uint256) */
    }
  }

  // Curated table (covers every custom error the protocol declares).
  const curated = decodeRevertReason(raw);
  if (
    curated &&
    ERROR_SIGNATURES[selector] &&
    curated.name !== 'ReadableText' &&
    curated.name !== 'PatternMatch'
  ) {
    const args = (curated.params ?? {}) as Record<string, unknown>;
    return {
      errorName: curated.name,
      args,
      argsList: Object.values(args),
      selector,
      raw,
      source: 'signatures',
      message: getUserFriendlyErrorMessage(curated),
    };
  }

  return undefined;
}

function formatArgs(args: readonly unknown[]): string {
  return args
    .map((a) => (typeof a === 'bigint' ? a.toString() : typeof a === 'string' ? a : JSON.stringify(a)))
    .join(', ');
}

// ============ SIGNER-LAYER CLASSIFICATION (R5) ============

/** How a failure that never reached the chain is classified. */
export type SignerErrorCode = 'SignerDenied' | 'SignerError';

/** A refusal or fault from the signing layer, not from the chain. */
export interface SignerFailure {
  code: SignerErrorCode;
  /** What the signer said, trimmed to something loggable. */
  detail: string;
  /** HTTP status, when the signer answered over HTTP. */
  status?: number;
}

/**
 * Policy-refusal vocabulary across remote signers and custody providers.
 * Deliberately narrow: a *deny* is a decision, and mistaking a transport blip
 * for one sends the integrator to the wrong dashboard.
 */
const DENIED_PATTERNS =
  /policy[_ ]violation|policy[_ ]denied|denied by policy|transaction[_ ]denied|rejected by (?:the )?(?:policy|governance|approver)|user (?:rejected|denied)|request rejected|action_rejected|not authorized by policy|signature (?:request )?(?:rejected|denied)/i;

/** Signer/transport faults that are not a decision about this transaction. */
const SIGNER_FAULT_PATTERNS =
  /unauthorized|invalid api key|invalid credentials|forbidden|token expired|authentication failed|signer unavailable|key ?(?:vault|store) unavailable/i;

/**
 * Classify a failure that came from the **signer**, before anything was broadcast.
 *
 * A remote signer (Privy, Fireblocks, Turnkey, a browser wallet) answers the
 * `eth_signTypedData_v4` / `eth_sendTransaction` request itself. viem wraps that
 * answer as the `cause` of a contract error, so it arrives looking exactly like
 * a failed write — and a decoder that only knows about reverts will guess at a
 * contract cause for something the contract never saw.
 *
 * Call this **first**. It returns `undefined` when the failure is not the
 * signer's, which is the signal to go on and decode a revert.
 *
 * - `SignerDenied` — the signer decided no (policy violation, user rejection).
 *   Nothing was broadcast; no gas was spent; retrying unchanged will fail again.
 * - `SignerError` — the signer could not answer (auth, outage, bad credentials).
 *   Also nothing broadcast, but the transaction itself may be fine.
 */
export function classifySignerError(error: unknown): SignerFailure | undefined {
  // If the chain returned revert bytes, the chain answered — full stop. A signer
  // refusal never carries revert data, and without this guard a contract that
  // reverts `Error("Unauthorized")` would be read as a signer fault, because the
  // reason string lands in the same message text the patterns below scan.
  try {
    if (extractRevertData(error) !== undefined) return undefined;
  } catch {
    /* fall through and classify on text alone */
  }

  const seen = new Set<unknown>();
  const queue: unknown[] = [error];

  while (queue.length) {
    const cur = queue.shift() as Record<string, unknown> | undefined;
    if (!cur || typeof cur !== 'object' || seen.has(cur)) continue;
    seen.add(cur);

    // A viem-decoded contract revert is the chain talking, not the signer.
    if ((cur.data as { errorName?: string } | undefined)?.errorName) return undefined;

    const body = cur.error as { error?: string; code?: string; message?: string } | string | undefined;
    const bodyCode = typeof body === 'object' && body ? body.code : undefined;
    const status = Number(cur.status ?? cur.statusCode ?? NaN);
    const text = [
      typeof body === 'string' ? body : body?.error ?? body?.message,
      typeof cur.details === 'string' ? cur.details : undefined,
      typeof cur.shortMessage === 'string' ? cur.shortMessage : undefined,
      typeof cur.message === 'string' ? cur.message : undefined,
      typeof cur.code === 'string' ? cur.code : undefined,
    ]
      .filter((x): x is string => typeof x === 'string')
      .join(' ');

    // EIP-1193 user rejection.
    const numericCode = typeof cur.code === 'number' ? cur.code : undefined;
    if (numericCode === 4001 || bodyCode === 'policy_violation' || DENIED_PATTERNS.test(text)) {
      return {
        code: 'SignerDenied',
        detail: truncate(describeSigner(body, text)),
        ...(Number.isFinite(status) ? { status } : {}),
      };
    }

    if (SIGNER_FAULT_PATTERNS.test(text) || (Number.isFinite(status) && status >= 400 && body !== undefined)) {
      return {
        code: 'SignerError',
        detail: truncate(describeSigner(body, text)),
        ...(Number.isFinite(status) ? { status } : {}),
      };
    }

    if (cur.cause) queue.push(cur.cause);
    if (cur.originalError) queue.push(cur.originalError);
  }

  return undefined;
}

function describeSigner(body: unknown, text: string): string {
  if (typeof body === 'string' && body.trim()) return body;
  if (body && typeof body === 'object') {
    try {
      return JSON.stringify(body);
    } catch {
      /* circular — fall through */
    }
  }
  return text;
}

function truncate(s: string, max = 300): string {
  const flat = s.replace(/\s+/g, ' ').trim();
  return flat.length > max ? `${flat.slice(0, max)}…` : flat;
}

// ============ ONE ANSWER (R4 + R5) ============

/** Where a failure came from. */
export type FailureKind = 'revert' | 'signer' | 'transport' | 'unknown';

/** A structured account of why a call failed. */
export interface ExplainedError {
  /** Layer that produced the failure. */
  kind: FailureKind;
  /**
   * Stable, switchable name. A custom-error name (`NoPermission`,
   * `BeforeReleaseTime`) for reverts; `SignerDenied` / `SignerError` for the
   * signer layer; `RpcError` for transport; `Unknown` when nothing could be named.
   */
  errorName: string;
  /** Decoded arguments, keyed by ABI parameter name where one exists. Empty when unknown. */
  args: Record<string, unknown>;
  /** Selector of the revert, when there was one. */
  selector?: `0x${string}`;
  /** Raw revert bytes, when there were any — always preserved, never re-read as text. */
  raw?: `0x${string}`;
  /** A message suitable for a log line. */
  message: string;
  /** The error this was derived from. */
  cause: unknown;
}

const TRANSPORT_PATTERNS =
  /http request failed|fetch failed|econnreset|econnrefused|etimedout|timeout|socket hang up|network error|\b50[234]\b|rate limit|too many requests|nonce too low|replacement transaction underpriced|already known/i;

/** Options for {@link explainError}. */
export interface ExplainErrorOptions extends ExtractRevertDataOptions {
  /** ABI to decode revert bytes against. Falls back to the SDK's curated table. */
  abi?: readonly unknown[];
}

/**
 * Explain a failed call — one call, one structured answer.
 *
 * Order matters and is the point: the **signer** is asked first (it may have
 * refused before anything was broadcast), then the **chain** (decode the revert
 * bytes we actually hold), then **transport**. Guessing a contract cause for a
 * signer refusal was the specific failure this replaces.
 *
 * ```ts
 * try {
 *   await account.transferOwnershipRequest({ from: owner });
 * } catch (e) {
 *   const why = explainError(e, { abi: secureOwnableAbi });
 *   if (why.errorName === 'SignerDenied') { …ask the signer's owner… }
 *   else if (why.errorName === 'BeforeReleaseTime') { …still in timelock… }
 *   else console.error(why.message, why.raw);
 * }
 * ```
 *
 * Never throws.
 */
export function explainError(error: unknown, options: ExplainErrorOptions = {}): ExplainedError {
  const text = errorTextChain(error);

  // 1. The signer may have answered instead of the chain.
  try {
    const signer = classifySignerError(error);
    if (signer) {
      return {
        kind: 'signer',
        errorName: signer.code,
        args: signer.status !== undefined ? { status: signer.status } : {},
        message: signer.detail || signer.code,
        cause: error,
      };
    }
  } catch {
    /* classification must never be the thing that throws */
  }

  // 2. The chain reverted — decode the bytes we hold.
  let raw: `0x${string}` | undefined;
  try {
    raw = extractRevertData(error, options);
  } catch {
    raw = undefined;
  }
  if (raw) {
    const decoded = decodeRevert(raw, options.abi);
    if (decoded) {
      return {
        kind: 'revert',
        errorName: decoded.errorName,
        args: decoded.args,
        selector: decoded.selector,
        raw: decoded.raw,
        message: decoded.message,
        cause: error,
      };
    }
    // Bytes we cannot name. Say so, and keep the bytes.
    return {
      kind: 'revert',
      errorName: 'Unknown',
      args: {},
      selector: raw.slice(0, 10).toLowerCase() as `0x${string}`,
      raw,
      message: `Reverted with undecodable data ${raw.slice(0, 10)} (${raw.length - 2} hex chars). ${truncate(text)}`,
      cause: error,
    };
  }

  // 2b. No bytes survived, but viem may still have decoded a name upstream.
  const viemName = viemDecodedErrorName(error);
  if (viemName) {
    return { kind: 'revert', errorName: viemName, args: {}, message: truncate(text) || viemName, cause: error };
  }

  // 3. Transport.
  if (TRANSPORT_PATTERNS.test(text)) {
    return { kind: 'transport', errorName: 'RpcError', args: {}, message: truncate(text), cause: error };
  }

  return {
    kind: 'unknown',
    errorName: 'Unknown',
    args: {},
    message: truncate(text) || String(error),
    cause: error,
  };
}

/**
 * Narrow an explained failure to a specific protocol error.
 *
 * ```ts
 * if (isRevertNamed(why, 'NoPermission')) { … }
 * ```
 */
export function isRevertNamed(explained: ExplainedError, errorName: string): boolean {
  return explained.kind === 'revert' && explained.errorName === errorName;
}

export type { GuardianContractError };

export default {
  extractRevertData,
  isAddressShapedHex,
  errorTextChain,
  decodeRevert,
  classifySignerError,
  explainError,
  isRevertNamed,
};
