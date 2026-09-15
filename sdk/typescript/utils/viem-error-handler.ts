/**
 * @file viem-error-handler.ts
 * @description Utility for handling and decoding Viem transaction errors
 * 
 * This module provides clean error handling for Viem errors, integrating
 * with the contract-errors.ts utilities for proper error decoding.
 * 
 * @author Guardian Framework Team
 * @version 1.0.0
 */

import { decodeAbiParameters, decodeErrorResult } from 'viem';
import { extractErrorInfo, getUserFriendlyErrorMessage, GuardianContractError } from './contract-errors.js';
import {
  extractRevertData,
  decodeRevert,
  classifySignerError,
  type SignerFailure,
} from './errors.js';

/**
 * Enhanced Viem error with decoded contract error information.
 *
 * The structured fields (`errorName`, `args`, `selector`, `raw`, `kind`,
 * `signerFailure`) are the ones to branch on — `message` and `userMessage` are
 * prose and their wording is not a contract. For new code prefer
 * `explainError` from `./errors.js`, which returns the same facts without
 * throwing.
 */
export interface EnhancedViemError extends Error {
  originalError: any;
  contractError: GuardianContractError | null;
  userMessage: string;
  isKnownError: boolean;
  errorData?: string;
  /** Which layer failed: the chain, the signer, or something unnamed. */
  kind?: 'revert' | 'signer' | 'unknown';
  /** Stable name to switch on — a custom-error name, `SignerDenied`/`SignerError`, or `Unknown`. */
  errorName?: string;
  /** Decoded revert arguments, keyed by ABI parameter name where one exists. */
  args?: Record<string, unknown>;
  /** Selector of the revert, when there was one. */
  selector?: `0x${string}`;
  /** Raw revert bytes, preserved exactly as returned. */
  raw?: `0x${string}`;
  /** Set when the signer refused or faulted before anything was broadcast. */
  signerFailure?: SignerFailure;
}

/**
 * Extract revert data from a Viem error object.
 *
 * Delegates to {@link extractRevertData}, which walks `cause` / `originalError` /
 * `errorData` / `raw` / `data.data` and rejects hex that cannot be a revert
 * payload — in particular a 20-byte address, which is not selector-plus-32-byte-
 * words and so can never again be mistaken for one and "decoded" as text.
 *
 * @param error The Viem error object
 * @returns Hex string of revert data, or null when there is none
 */
export function extractErrorData(error: any): string | null {
  if (!error) return null;
  return extractRevertData(error) ?? null;
}

/**
 * Try to decode error using Viem's decodeErrorResult
 * @param errorData Hex string of error data
 * @param abi Contract ABI
 * @returns Decoded error result or null if decoding fails
 */
async function tryDecodeWithViem(
  errorData: string,
  abi: any[]
): Promise<{ errorName: string; args: any } | null> {
  try {
    const decoded = decodeErrorResult({
      abi,
      data: errorData as `0x${string}`
    });
    return {
      errorName: decoded.errorName,
      args: decoded.args
    };
  } catch {
    return null;
  }
}

/**
 * Try to decode Error(string) selector
 * @param errorData Hex string of error data
 * @returns Decoded string message or null if decoding fails
 */
async function tryDecodeErrorString(errorData: string): Promise<string | null> {
  try {
    // Check for Error(string) selector (0x08c379a0)
    if (errorData.length > 10 && errorData.slice(0, 10) === '0x08c379a0') {
      const decoded = decodeAbiParameters(
        [{ type: 'string' }],
        errorData.slice(10) as `0x${string}`
      );
      return decoded[0] as string;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Enhance Viem error with contract error information
 * @param error The original Viem error
 * @param abi Contract ABI for decoding
 * @returns Enhanced error with decoded contract error information
 */
export async function enhanceViemError(
  error: any,
  abi: any[]
): Promise<EnhancedViemError> {
  const errorData = extractErrorData(error);

  // Default enhanced error
  const enhancedError: EnhancedViemError = {
    name: error.name || 'TransactionError',
    message: error.message || 'Transaction failed',
    originalError: error,
    contractError: null,
    userMessage: error.message || 'Transaction failed',
    isKnownError: false,
    errorData: errorData || undefined,
    kind: 'unknown',
    errorName: 'Unknown',
    args: {},
    raw: (errorData as `0x${string}`) || undefined,
    selector: errorData ? (errorData.slice(0, 10).toLowerCase() as `0x${string}`) : undefined
  };

  // R5: the signer may have answered instead of the chain. A remote signer's
  // refusal (policy violation, user rejection) or fault (auth, outage) arrives
  // wrapped as the cause of a contract error and looks exactly like a failed
  // write — but nothing was broadcast and no gas was spent, so guessing a
  // contract revert for it sends the caller to the wrong place entirely.
  // Classify it *before* any revert decoding.
  const signerFailure = classifySignerError(error);
  if (signerFailure) {
    enhancedError.kind = 'signer';
    enhancedError.errorName = signerFailure.code;
    enhancedError.signerFailure = signerFailure;
    enhancedError.isKnownError = true;
    enhancedError.userMessage = `${signerFailure.code}: ${signerFailure.detail}`;
    enhancedError.message = `${error.message ?? 'Transaction failed'} (${signerFailure.code}: ${signerFailure.detail})`;
    return enhancedError;
  }

  // If no error data, return with original message
  if (!errorData) {
    return enhancedError;
  }

  // R4: keep the structured facts alongside the prose, so callers can switch on
  // an error name instead of regexing one back out of a message.
  const structured = decodeRevert(errorData, abi);
  if (structured) {
    enhancedError.kind = 'revert';
    enhancedError.errorName = structured.errorName;
    enhancedError.args = structured.args;
    enhancedError.selector = structured.selector;
    enhancedError.raw = structured.raw;
  } else {
    enhancedError.kind = 'revert';
  }

  // Try to decode using Viem's decodeErrorResult first (most accurate)
  const viemDecoded = await tryDecodeWithViem(errorData, abi);
  if (viemDecoded) {
    const viemMessage = `${viemDecoded.errorName}(${JSON.stringify(viemDecoded.args)})`;
    enhancedError.message = `${error.message} (${viemMessage})`;
    enhancedError.userMessage = `${error.message} (${viemMessage})`;
    
    // Try to map to GuardianContractError if possible
    const errorInfo = extractErrorInfo(errorData);
    if (errorInfo.error) {
      enhancedError.contractError = errorInfo.error;
      enhancedError.userMessage = errorInfo.userMessage;
      enhancedError.isKnownError = errorInfo.isKnownError;
    }
    
    return enhancedError;
  }

  // Try to decode Error(string)
  const errorString = await tryDecodeErrorString(errorData);
  if (errorString) {
    enhancedError.message = `${error.message} (Error: ${errorString})`;
    enhancedError.userMessage = `${error.message} (Error: ${errorString})`;
    
    // Try to extract error info using contract-errors utilities
    const errorInfo = extractErrorInfo(errorData);
    if (errorInfo.error) {
      enhancedError.contractError = errorInfo.error;
      enhancedError.userMessage = errorInfo.userMessage;
      enhancedError.isKnownError = errorInfo.isKnownError;
    }
    
    return enhancedError;
  }

  // Fall back to contract-errors.ts utilities
  const errorInfo = extractErrorInfo(errorData);
  if (errorInfo.error) {
    enhancedError.contractError = errorInfo.error;
    enhancedError.userMessage = errorInfo.userMessage;
    enhancedError.isKnownError = errorInfo.isKnownError;
    enhancedError.message = `${error.message} (${errorInfo.userMessage})`;
  }

  return enhancedError;
}

/**
 * Handle Viem error and throw enhanced error
 * @param error The original Viem error
 * @param abi Contract ABI for decoding
 * @throws EnhancedViemError with decoded contract error information
 */
export async function handleViemError(error: any, abi: any[]): Promise<never> {
  const enhanced = await enhanceViemError(error, abi);
  throw enhanced;
}

export default {
  enhanceViemError,
  handleViemError,
  extractErrorData
};

