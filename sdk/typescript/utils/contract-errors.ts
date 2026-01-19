/**
 * @file contract-errors.ts
 * @description Official error definitions and utilities for Guardian contracts
 * 
 * This file provides TypeScript interfaces and utilities for handling
 * custom errors from Guardian smart contracts, particularly those defined
 * in SharedValidation.sol. It enables proper error decoding and user-friendly
 * error messages in the frontend.
 * 
 * @author Guardian Framework Team
 * @version 1.0.0
 */

/**
 * Custom error interfaces matching SharedValidation.sol definitions
 */
export interface ContractError {
  name: string
  signature: string
  params: Record<string, any>
  message: string
}

/**
 * Address validation errors
 */
export interface InvalidAddressError extends ContractError {
  name: 'InvalidAddress'
  params: { provided: string }
}

export interface InvalidTargetAddressError extends ContractError {
  name: 'InvalidTargetAddress'
  params: { target: string }
}

export interface InvalidRequesterAddressError extends ContractError {
  name: 'InvalidRequesterAddress'
  params: { requester: string }
}

export interface InvalidHandlerContractError extends ContractError {
  name: 'InvalidHandlerContract'
  params: { handler: string }
}

export interface InvalidSignerAddressError extends ContractError {
  name: 'InvalidSignerAddress'
  params: { signer: string }
}

export interface NotNewAddressError extends ContractError {
  name: 'NotNewAddress'
  params: { newAddress: string; currentAddress: string }
}

/**
 * Time and deadline errors
 */
export interface InvalidTimeLockPeriodError extends ContractError {
  name: 'InvalidTimeLockPeriod'
  params: { provided: string }
}

export interface TimeLockPeriodZeroError extends ContractError {
  name: 'TimeLockPeriodZero'
  params: { provided: string }
}

export interface DeadlineInPastError extends ContractError {
  name: 'DeadlineInPast'
  params: { deadline: string; currentTime: string }
}

export interface MetaTxExpiredError extends ContractError {
  name: 'MetaTxExpired'
  params: { deadline: string; currentTime: string }
}

export interface BeforeReleaseTimeError extends ContractError {
  name: 'BeforeReleaseTime'
  params: { releaseTime: string; currentTime: string }
}

export interface NewTimelockSameError extends ContractError {
  name: 'NewTimelockSame'
  params: { newPeriod: string; currentPeriod: string }
}

/**
 * Permission and authorization errors
 */
export interface NoPermissionError extends ContractError {
  name: 'NoPermission'
  params: { caller: string }
}

export interface NoPermissionExecuteError extends ContractError {
  name: 'NoPermissionExecute'
  params: { caller: string }
}

export interface RestrictedOwnerError extends ContractError {
  name: 'RestrictedOwner'
  params: { caller: string; owner: string }
}

export interface RestrictedOwnerRecoveryError extends ContractError {
  name: 'RestrictedOwnerRecovery'
  params: { caller: string; owner: string; recovery: string }
}

export interface RestrictedRecoveryError extends ContractError {
  name: 'RestrictedRecovery'
  params: { caller: string; recovery: string }
}

export interface RestrictedBroadcasterError extends ContractError {
  name: 'RestrictedBroadcaster'
  params: { caller: string; broadcaster: string }
}

export interface SignerNotAuthorizedError extends ContractError {
  name: 'SignerNotAuthorized'
  params: { signer: string }
}

export interface OnlyCallableByContractError extends ContractError {
  name: 'OnlyCallableByContract'
  params: { caller: string; contractAddress: string }
}

/**
 * Transaction and operation errors
 */
export interface OperationNotSupportedError extends ContractError {
  name: 'OperationNotSupported'
  params: {}
}

export interface OperationTypeExistsError extends ContractError {
  name: 'OperationTypeExists'
  params: {}
}

export interface InvalidOperationTypeError extends ContractError {
  name: 'InvalidOperationType'
  params: { actualType: string; expectedType: string }
}

export interface ZeroOperationTypeNotAllowedError extends ContractError {
  name: 'ZeroOperationTypeNotAllowed'
  params: {}
}

export interface TransactionNotFoundError extends ContractError {
  name: 'TransactionNotFound'
  params: { txId: string }
}

export interface CanOnlyApprovePendingError extends ContractError {
  name: 'CanOnlyApprovePending'
  params: { currentStatus: string }
}

export interface CanOnlyCancelPendingError extends ContractError {
  name: 'CanOnlyCancelPending'
  params: { currentStatus: string }
}

export interface TransactionNotPendingError extends ContractError {
  name: 'TransactionNotPending'
  params: { currentStatus: string }
}

export interface RequestAlreadyPendingError extends ContractError {
  name: 'RequestAlreadyPending'
  params: { txId: string }
}

export interface AlreadyInitializedError extends ContractError {
  name: 'AlreadyInitialized'
  params: {}
}

export interface TransactionIdMismatchError extends ContractError {
  name: 'TransactionIdMismatch'
  params: { expectedTxId: string; providedTxId: string }
}

/**
 * Signature and meta-transaction errors
 */
export interface InvalidSignatureLengthError extends ContractError {
  name: 'InvalidSignatureLength'
  params: { providedLength: string; expectedLength: string }
}

export interface InvalidSignatureError extends ContractError {
  name: 'InvalidSignature'
  params: { signature: string }
}

export interface InvalidNonceError extends ContractError {
  name: 'InvalidNonce'
  params: { providedNonce: string; expectedNonce: string }
}

export interface ChainIdMismatchError extends ContractError {
  name: 'ChainIdMismatch'
  params: { providedChainId: string; expectedChainId: string }
}

export interface InvalidHandlerSelectorError extends ContractError {
  name: 'InvalidHandlerSelector'
  params: { selector: string }
}

export interface InvalidSValueError extends ContractError {
  name: 'InvalidSValue'
  params: { s: string }
}

export interface InvalidVValueError extends ContractError {
  name: 'InvalidVValue'
  params: { v: string }
}

export interface ECDSAInvalidSignatureError extends ContractError {
  name: 'ECDSAInvalidSignature'
  params: { recoveredSigner: string }
}

export interface GasPriceExceedsMaxError extends ContractError {
  name: 'GasPriceExceedsMax'
  params: { currentGasPrice: string; maxGasPrice: string }
}

/**
 * Role and function errors
 */
export interface RoleDoesNotExistError extends ContractError {
  name: 'RoleDoesNotExist'
  params: {}
}

export interface RoleAlreadyExistsError extends ContractError {
  name: 'RoleAlreadyExists'
  params: {}
}

export interface FunctionAlreadyExistsError extends ContractError {
  name: 'FunctionAlreadyExists'
  params: { functionSelector: string }
}

export interface FunctionDoesNotExistError extends ContractError {
  name: 'FunctionDoesNotExist'
  params: { functionSelector: string }
}

export interface WalletAlreadyInRoleError extends ContractError {
  name: 'WalletAlreadyInRole'
  params: { wallet: string }
}

export interface RoleWalletLimitReachedError extends ContractError {
  name: 'RoleWalletLimitReached'
  params: { currentCount: string; maxWallets: string }
}

export interface OldWalletNotFoundError extends ContractError {
  name: 'OldWalletNotFound'
  params: { wallet: string }
}

export interface CannotRemoveLastWalletError extends ContractError {
  name: 'CannotRemoveLastWallet'
  params: { wallet: string }
}

export interface RoleNameEmptyError extends ContractError {
  name: 'RoleNameEmpty'
  params: {}
}

export interface MaxWalletsZeroError extends ContractError {
  name: 'MaxWalletsZero'
  params: { provided: string }
}

export interface CannotModifyProtectedRolesError extends ContractError {
  name: 'CannotModifyProtectedRoles'
  params: {}
}

export interface CannotRemoveProtectedRoleError extends ContractError {
  name: 'CannotRemoveProtectedRole'
  params: {}
}

export interface RoleEditingDisabledError extends ContractError {
  name: 'RoleEditingDisabled'
  params: {}
}

export interface FunctionPermissionExistsError extends ContractError {
  name: 'FunctionPermissionExists'
  params: { functionSelector: string }
}

export interface ActionNotSupportedError extends ContractError {
  name: 'ActionNotSupported'
  params: {}
}

export interface ConflictingMetaTxPermissionsError extends ContractError {
  name: 'ConflictingMetaTxPermissions'
  params: { functionSelector: string }
}

export interface InvalidRangeError extends ContractError {
  name: 'InvalidRange'
  params: { from: string; to: string }
}

/**
 * Payment and balance errors
 */
export interface InsufficientBalanceError extends ContractError {
  name: 'InsufficientBalance'
  params: { currentBalance: string; requiredAmount: string }
}

export interface PaymentFailedError extends ContractError {
  name: 'PaymentFailed'
  params: { recipient: string; amount: string; reason: string }
}

/**
 * Array validation errors
 */
export interface ArrayLengthMismatchError extends ContractError {
  name: 'ArrayLengthMismatch'
  params: { array1Length: string; array2Length: string }
}

export interface IndexOutOfBoundsError extends ContractError {
  name: 'IndexOutOfBounds'
  params: { index: string; arrayLength: string }
}

/**
 * Additional error types for decoded errors
 */
export interface PatternMatchError extends ContractError {
  name: 'PatternMatch'
  params: { pattern: string }
}

export interface ReadableTextError extends ContractError {
  name: 'ReadableText'
  params: { text: string }
}

export interface CustomErrorError extends ContractError {
  name: 'CustomError'
  params: { message: string }
}

/**
 * Union type for all contract errors
 */
export type GuardianContractError = 
  | InvalidAddressError
  | InvalidTargetAddressError
  | InvalidRequesterAddressError
  | InvalidHandlerContractError
  | InvalidSignerAddressError
  | NotNewAddressError
  | InvalidTimeLockPeriodError
  | TimeLockPeriodZeroError
  | DeadlineInPastError
  | MetaTxExpiredError
  | BeforeReleaseTimeError
  | NewTimelockSameError
  | NoPermissionError
  | NoPermissionExecuteError
  | RestrictedOwnerError
  | RestrictedOwnerRecoveryError
  | RestrictedRecoveryError
  | RestrictedBroadcasterError
  | SignerNotAuthorizedError
  | OnlyCallableByContractError
  | OperationNotSupportedError
  | OperationTypeExistsError
  | InvalidOperationTypeError
  | ZeroOperationTypeNotAllowedError
  | TransactionNotFoundError
  | CanOnlyApprovePendingError
  | CanOnlyCancelPendingError
  | TransactionNotPendingError
  | RequestAlreadyPendingError
  | AlreadyInitializedError
  | TransactionIdMismatchError
  | InvalidSignatureLengthError
  | InvalidSignatureError
  | InvalidNonceError
  | ChainIdMismatchError
  | InvalidHandlerSelectorError
  | InvalidSValueError
  | InvalidVValueError
  | ECDSAInvalidSignatureError
  | GasPriceExceedsMaxError
  | RoleDoesNotExistError
  | RoleAlreadyExistsError
  | FunctionAlreadyExistsError
  | FunctionDoesNotExistError
  | WalletAlreadyInRoleError
  | RoleWalletLimitReachedError
  | OldWalletNotFoundError
  | CannotRemoveLastWalletError
  | RoleNameEmptyError
  | MaxWalletsZeroError
  | CannotModifyProtectedRolesError
  | CannotRemoveProtectedRoleError
  | RoleEditingDisabledError
  | FunctionPermissionExistsError
  | ActionNotSupportedError
  | ConflictingMetaTxPermissionsError
  | InvalidRangeError
  | InsufficientBalanceError
  | PaymentFailedError
  | ArrayLengthMismatchError
  | IndexOutOfBoundsError
  | PatternMatchError
  | ReadableTextError
  | CustomErrorError

/**
 * Error signature mapping for quick lookup
 * Maps the keccak256 hash of the error signature to error information
 * Note: These are placeholder signatures - in practice, you would use the actual keccak256 hashes
 */
export const ERROR_SIGNATURES: Record<string, {
  name: string
  params: string[]
  userMessage: (params: Record<string, any>) => string
}> = {
  // Address validation errors (placeholder signatures)
  '0x2c7b6e7f': { // InvalidAddress(address)
    name: 'InvalidAddress',
    params: ['provided'],
    userMessage: (params) => `InvalidAddress: Invalid address provided: ${params.provided}`
  },
  '0x8c5be1e6': { // InvalidTargetAddress(address)
    name: 'InvalidTargetAddress',
    params: ['target'],
    userMessage: (params) => `InvalidTargetAddress: Invalid target address: ${params.target}`
  },
  '0x5c60da1c': { // InvalidRequesterAddress(address)
    name: 'InvalidRequesterAddress',
    params: ['requester'],
    userMessage: (params) => `InvalidRequesterAddress: Invalid requester address: ${params.requester}`
  },
  '0x8da5cb5c': { // InvalidHandlerContract(address)
    name: 'InvalidHandlerContract',
    params: ['handler'],
    userMessage: (params) => `InvalidHandlerContract: Invalid handler contract: ${params.handler}`
  },
  '0x8c5be1e7': { // InvalidSignerAddress(address)
    name: 'InvalidSignerAddress',
    params: ['signer'],
    userMessage: (params) => `InvalidSignerAddress: Invalid signer address: ${params.signer}`
  },
  '0x5c60da1d': { // NotNewAddress(address,address)
    name: 'NotNewAddress',
    params: ['newAddress', 'currentAddress'],
    userMessage: () => `NotNewAddress: New address must be different from current address`
  },

  // Permission errors
  '0x8da5cb5d': { // NoPermission(address)
    name: 'NoPermission',
    params: ['caller'],
    userMessage: (params) => `NoPermission: Caller ${params.caller} does not have permission`
  },
  '0x8c5be1e8': { // RestrictedOwner(address,address)
    name: 'RestrictedOwner',
    params: ['caller', 'owner'],
    userMessage: () => `RestrictedOwner: Only the owner can perform this action`
  },
  '0x5c60da1e': { // RestrictedBroadcaster(address,address)
    name: 'RestrictedBroadcaster',
    params: ['caller', 'broadcaster'],
    userMessage: () => `RestrictedBroadcaster: Only the broadcaster can perform this action`
  },
  '0x8da5cb5e': { // SignerNotAuthorized(address)
    name: 'SignerNotAuthorized',
    params: ['signer'],
    userMessage: (params) => `SignerNotAuthorized: Signer ${params.signer} is not authorized`
  },

  // Operation errors
  '0x8c5be1e9': { // OperationNotSupported()
    name: 'OperationNotSupported',
    params: [],
    userMessage: () => `OperationNotSupported: This operation is not supported`
  },
  '0x5c60da1f': { // RequestAlreadyPending(uint256)
    name: 'RequestAlreadyPending',
    params: ['txId'],
    userMessage: (params) => `RequestAlreadyPending: Request is already pending (Transaction ID: ${params.txId})`
  },
  '0x8da5cb5f': { // TransactionNotFound(uint256)
    name: 'TransactionNotFound',
    params: ['txId'],
    userMessage: (params) => `TransactionNotFound: Transaction not found: ${params.txId}`
  },

  // Time errors
  '0x8c5be1ea': { // DeadlineInPast(uint256,uint256)
    name: 'DeadlineInPast',
    params: ['deadline', 'currentTime'],
    userMessage: () => `DeadlineInPast: Transaction deadline has passed`
  },
  '0x5c60da20': { // MetaTxExpired(uint256,uint256)
    name: 'MetaTxExpired',
    params: ['deadline', 'currentTime'],
    userMessage: () => `MetaTxExpired: Meta-transaction has expired`
  },

  // Role errors
  '0x8da5cb60': { // RoleDoesNotExist()
    name: 'RoleDoesNotExist',
    params: [],
    userMessage: () => `RoleDoesNotExist: Role does not exist`
  },
  '0x8c5be1eb': { // WalletAlreadyInRole(address)
    name: 'WalletAlreadyInRole',
    params: ['wallet'],
    userMessage: (params) => `WalletAlreadyInRole: Wallet ${params.wallet} is already in this role`
  },
  '0x5c60da21': { // RoleWalletLimitReached(uint256,uint256)
    name: 'RoleWalletLimitReached',
    params: ['currentCount', 'maxWallets'],
    userMessage: (params) => `RoleWalletLimitReached: Role wallet limit reached (${params.currentCount}/${params.maxWallets})`
  },

  // Signature errors
  '0x8da5cb61': { // InvalidSignatureLength(uint256,uint256)
    name: 'InvalidSignatureLength',
    params: ['providedLength', 'expectedLength'],
    userMessage: (params) => `InvalidSignatureLength: Invalid signature length: ${params.providedLength} (expected: ${params.expectedLength})`
  },
  '0x8c5be1ec': { // InvalidNonce(uint256,uint256)
    name: 'InvalidNonce',
    params: ['providedNonce', 'expectedNonce'],
    userMessage: (params) => `InvalidNonce: Invalid nonce: ${params.providedNonce} (expected: ${params.expectedNonce})`
  },
  '0x5c60da22': { // ChainIdMismatch(uint256,uint256)
    name: 'ChainIdMismatch',
    params: ['providedChainId', 'expectedChainId'],
    userMessage: (params) => `ChainIdMismatch: Chain ID mismatch: ${params.providedChainId} (expected: ${params.expectedChainId})`
  },

  // Balance errors
  '0x8da5cb62': { // InsufficientBalance(uint256,uint256)
    name: 'InsufficientBalance',
    params: ['currentBalance', 'requiredAmount'],
    userMessage: (params) => `InsufficientBalance: Insufficient balance: ${params.currentBalance} (required: ${params.requiredAmount})`
  },

  // Array errors
  '0x8c5be1ed': { // ArrayLengthMismatch(uint256,uint256)
    name: 'ArrayLengthMismatch',
    params: ['array1Length', 'array2Length'],
    userMessage: (params) => `ArrayLengthMismatch: Array length mismatch: ${params.array1Length} vs ${params.array2Length}`
  },
  '0x5c60da23': { // IndexOutOfBounds(uint256,uint256)
    name: 'IndexOutOfBounds',
    params: ['index', 'arrayLength'],
    userMessage: (params) => `IndexOutOfBounds: Index out of bounds: ${params.index} (array length: ${params.arrayLength})`
  }
}

/**
 * Common error patterns that can be extracted from revert data
 */
export const COMMON_ERROR_PATTERNS = [
  'OWNER_ROLE',
  'ADMIN_ROLE',
  'OPERATOR_ROLE',
  'GUARDIAN_ROLE',
  'Only owner',
  'Access denied',
  'Not authorized',
  'Invalid role',
  'Unauthorized',
  'Permission denied',
  'Caller is not',
  'Only one',
  'already exists',
  'not found',
  'insufficient',
  'overflow',
  'underflow',
  'division by zero',
  'invalid opcode',
  'execution reverted',
  'revert',
  'require',
  'assert'
]

/**
 * Decode a revert reason from hex data
 * @param data Hex string containing the revert data
 * @returns Decoded error information or null if decoding fails
 */
export function decodeRevertReason(data: string): GuardianContractError | null {
  try {
    // Ensure data is hex string without 0x prefix
    if (data.startsWith('0x')) {
      data = data.slice(2)
    }

    // Check if it starts with Error(string) selector (0x08c379a0)
    if (data.length >= 8 && data.startsWith('08c379a0')) {
      const stringData = data.slice(8) // Remove selector
      if (stringData.length < 64) return null
      
      // Get the length of the string (first 32 bytes after selector)
      const lengthHex = stringData.slice(0, 64)
      const length = parseInt(lengthHex, 16)
      
      if (length <= 0 || length > 1000) return null // Sanity check
      
      // Get the string data (after length)
      const stringHex = stringData.slice(64, 64 + length * 2)
      const bytes = Buffer.from(stringHex, 'hex')
      const message = bytes.toString('utf8').replace(/\0/g, '') // Remove null bytes
      
      return {
        name: 'CustomError',
        signature: 'Error(string)',
        params: { message },
        message
      } as unknown as GuardianContractError
    }

    // Try to decode custom errors with parameters
    // Look for common custom error patterns in the hex data
    const bytes = Buffer.from(data, 'hex')
    const hexString = data.toLowerCase()
    
    // Check for specific Guardian contract errors
    // Look for OWNER_ROLE, ADMIN_ROLE, etc. as parameters in custom errors
    for (const pattern of COMMON_ERROR_PATTERNS) {
      const hexPattern = Buffer.from(pattern, 'utf8').toString('hex')
      if (hexString.includes(hexPattern)) {
        // Try to determine which specific error this is based on the pattern
        let errorName = 'UnknownError'
        let errorParams: Record<string, any> = {}
        
        if (pattern === 'OWNER_ROLE') {
          errorName = 'RestrictedOwner'
          errorParams = { caller: 'unknown', owner: 'unknown' }
        } else if (pattern === 'ADMIN_ROLE') {
          errorName = 'NoPermission'
          errorParams = { caller: 'unknown' }
        } else if (pattern === 'OPERATOR_ROLE') {
          errorName = 'NoPermission'
          errorParams = { caller: 'unknown' }
        } else if (pattern === 'GUARDIAN_ROLE') {
          errorName = 'NoPermission'
          errorParams = { caller: 'unknown' }
        } else if (pattern.includes('already exists')) {
          errorName = 'RequestAlreadyPending'
          errorParams = { txId: 'unknown' }
        } else if (pattern.includes('not found')) {
          errorName = 'TransactionNotFound'
          errorParams = { txId: 'unknown' }
        } else if (pattern.includes('insufficient')) {
          errorName = 'InsufficientBalance'
          errorParams = { currentBalance: 'unknown', requiredAmount: 'unknown' }
        }
        
        return {
          name: errorName,
          signature: `CustomError(${Object.keys(errorParams).join(',')})`,
          params: errorParams,
          message: pattern
        } as unknown as GuardianContractError
      }
    }

    // Try to extract readable ASCII from the data
    let readableText = ''
    for (let i = 0; i < bytes.length; i++) {
      const byte = bytes[i]
      if (byte >= 32 && byte <= 126) { // Printable ASCII
        readableText += String.fromCharCode(byte)
      } else if (byte === 0) {
        readableText += ' ' // Replace null bytes with spaces
      }
    }
    
    // Clean up the text
    readableText = readableText.trim().replace(/\s+/g, ' ')
    
    if (readableText.length > 3 && readableText.length < 200) {
      return {
        name: 'ReadableText',
        signature: 'Custom',
        params: { text: readableText },
        message: readableText
      } as unknown as GuardianContractError
    }

    return null
  } catch (error) {
    return null
  }
}

/**
 * Get user-friendly error message from contract error
 * @param error The contract error
 * @returns User-friendly error message
 */
export function getUserFriendlyErrorMessage(error: GuardianContractError): string {
  // Check if it's a known error signature
  const errorSignature = ERROR_SIGNATURES[error.signature]
  if (errorSignature) {
    return errorSignature.userMessage(error.params)
  }

  // Handle specific error names with custom messages
  switch (error.name) {
    case 'RestrictedOwner':
      return 'RestrictedOwner: Only the owner can perform this action'
    case 'NoPermission':
      return 'NoPermission: Caller does not have permission to perform this action'
    case 'RequestAlreadyPending':
      return 'RequestAlreadyPending: A request is already pending for this operation'
    case 'TransactionNotFound':
      return 'TransactionNotFound: Transaction not found'
    case 'InsufficientBalance':
      return 'InsufficientBalance: Insufficient balance for this operation'
    case 'PatternMatch':
      // For pattern matches, return a more descriptive message
      if (error.params.pattern === 'OWNER_ROLE') {
        return 'RestrictedOwner: Only the owner can perform this action'
      } else if (error.params.pattern === 'ADMIN_ROLE') {
        return 'NoPermission: Only administrators can perform this action'
      } else if (error.params.pattern === 'OPERATOR_ROLE') {
        return 'NoPermission: Only operators can perform this action'
      } else if (error.params.pattern === 'GUARDIAN_ROLE') {
        return 'NoPermission: Only guardians can perform this action'
      }
      return `PatternMatch: Access denied: ${error.params.pattern}`
    case 'ReadableText':
      return `ReadableText: Contract error: ${error.params.text}`
    case 'CustomError':
      return `CustomError: ${error.params.message || 'Custom contract error occurred'}`
    default:
      return `${error.name}: ${error.message || 'Unknown contract error occurred'}`
  }
}

/**
 * Check if an error is a specific type
 * @param error The contract error
 * @param errorName The error name to check
 * @returns True if the error matches the specified type
 */
export function isErrorType(error: GuardianContractError, errorName: string): boolean {
  return error.name === errorName
}

/**
 * Extract error information from a transaction revert
 * @param revertData Hex string containing revert data
 * @returns Error information or null if extraction fails
 */
export function extractErrorInfo(revertData: string): {
  error: GuardianContractError | null
  userMessage: string
  isKnownError: boolean
} {
  const error = decodeRevertReason(revertData)
  
  if (!error) {
    return {
      error: null,
      userMessage: 'Transaction reverted with unknown error',
      isKnownError: false
    }
  }

  const userMessage = getUserFriendlyErrorMessage(error)
  const isKnownError = ERROR_SIGNATURES[error.signature] !== undefined

  return {
    error,
    userMessage,
    isKnownError
  }
}

export default {
  ERROR_SIGNATURES,
  COMMON_ERROR_PATTERNS,
  decodeRevertReason,
  getUserFriendlyErrorMessage,
  isErrorType,
  extractErrorInfo
}
