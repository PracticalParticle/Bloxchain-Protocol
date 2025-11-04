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
import { extractErrorInfo, getUserFriendlyErrorMessage, GuardianContractError } from './contract-errors';

/**
 * Enhanced Viem error with decoded contract error information
 */
export interface EnhancedViemError extends Error {
  originalError: any;
  contractError: GuardianContractError | null;
  userMessage: string;
  isKnownError: boolean;
  errorData?: string;
}

/**
 * Extract error data from Viem error object
 * @param error The Viem error object
 * @returns Hex string of error data or null if not found
 */
function extractErrorData(error: any): string | null {
  if (!error) return null;

  // Check common Viem error data locations
  if (error.data) {
    return typeof error.data === 'string' ? error.data : error.data.data || null;
  }

  if (error.cause?.data) {
    return typeof error.cause.data === 'string' ? error.cause.data : error.cause.data.data || null;
  }

  // Check for error in nested structures
  if (error.details) {
    return typeof error.details === 'string' && error.details.startsWith('0x') ? error.details : null;
  }

  return null;
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
    errorData: errorData || undefined
  };

  // If no error data, return with original message
  if (!errorData) {
    return enhancedError;
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

