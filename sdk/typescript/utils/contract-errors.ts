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

import { decodeAbiParameters, parseAbiParameters } from 'viem'

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
 * Resource and item management errors
 */
export interface ItemAlreadyExistsError extends ContractError {
  name: 'ItemAlreadyExists'
  params: { item: string }
}

export interface ItemNotFoundError extends ContractError {
  name: 'ItemNotFound'
  params: { item: string }
}

export interface DefinitionNotIDefinitionError extends ContractError {
  name: 'DefinitionNotIDefinition'
  params: { definition: string }
}

export interface TargetNotWhitelistedError extends ContractError {
  name: 'TargetNotWhitelisted'
  params: { target: string; functionSelector: string }
}

export interface ResourceNotFoundError extends ContractError {
  name: 'ResourceNotFound'
  params: { resource: string }
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

export interface NotInitializedError extends ContractError {
  name: 'NotInitialized'
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

export interface CannotModifyProtectedError extends ContractError {
  name: 'CannotModifyProtected'
  params: { resourceId: string }
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

export interface ContractFunctionMustBeProtectedError extends ContractError {
  name: 'ContractFunctionMustBeProtected'
  params: { functionSelector: string }
}

export interface InvalidRangeError extends ContractError {
  name: 'InvalidRange'
  params: { from: string; to: string }
}

export interface HandlerForSelectorMismatchError extends ContractError {
  name: 'HandlerForSelectorMismatch'
  params: { schemaHandlerForSelector: string; permissionHandlerForSelector: string }
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

export interface InvalidPaymentError extends ContractError {
  name: 'InvalidPayment'
  params: {}
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

/** Errors from SharedValidation.sol not previously in the union */
export interface NoPermissionForFunctionError extends ContractError {
  name: 'NoPermissionForFunction'
  params: { caller: string; functionSelector: string }
}

export interface NotSupportedError extends ContractError {
  name: 'NotSupported'
  params: {}
}

export interface TransactionStatusMismatchError extends ContractError {
  name: 'TransactionStatusMismatch'
  params: { expectedStatus: string; currentStatus: string }
}

export interface PendingSecureRequestError extends ContractError {
  name: 'PendingSecureRequest'
  params: {}
}

export interface ResourceAlreadyExistsError extends ContractError {
  name: 'ResourceAlreadyExists'
  params: { resourceId: string }
}

export interface InvalidOperationError extends ContractError {
  name: 'InvalidOperation'
  params: { item: string }
}

export interface InternalFunctionNotAccessibleError extends ContractError {
  name: 'InternalFunctionNotAccessible'
  params: { functionSelector: string }
}

export interface FunctionSelectorMismatchError extends ContractError {
  name: 'FunctionSelectorMismatch'
  params: { providedSelector: string; derivedSelector: string }
}

export interface OperationFailedError extends ContractError {
  name: 'OperationFailed'
  params: {}
}

export interface BatchSizeExceededError extends ContractError {
  name: 'BatchSizeExceeded'
  params: { currentSize: string; maxSize: string }
}

export interface MaxRolesExceededError extends ContractError {
  name: 'MaxRolesExceeded'
  params: { currentCount: string; maxRoles: string }
}

export interface MaxHooksExceededError extends ContractError {
  name: 'MaxHooksExceeded'
  params: { currentCount: string; maxHooks: string }
}

export interface MaxFunctionsExceededError extends ContractError {
  name: 'MaxFunctionsExceeded'
  params: { currentCount: string; maxFunctions: string }
}

export interface RangeSizeExceededError extends ContractError {
  name: 'RangeSizeExceeded'
  params: { rangeSize: string; maxRangeSize: string }
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
  | ItemAlreadyExistsError
  | ItemNotFoundError
  | DefinitionNotIDefinitionError
  | TargetNotWhitelistedError
  | ResourceNotFoundError
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
  | NotInitializedError
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
  | CannotModifyProtectedError
  | FunctionPermissionExistsError
  | ActionNotSupportedError
  | ConflictingMetaTxPermissionsError
  | ContractFunctionMustBeProtectedError
  | InvalidRangeError
  | HandlerForSelectorMismatchError
  | InsufficientBalanceError
  | PaymentFailedError
  | InvalidPaymentError
  | ArrayLengthMismatchError
  | IndexOutOfBoundsError
  | PatternMatchError
  | ReadableTextError
  | CustomErrorError
  | NoPermissionForFunctionError
  | NotSupportedError
  | TransactionStatusMismatchError
  | PendingSecureRequestError
  | ResourceAlreadyExistsError
  | InvalidOperationError
  | InternalFunctionNotAccessibleError
  | FunctionSelectorMismatchError
  | OperationFailedError
  | BatchSizeExceededError
  | MaxRolesExceededError
  | MaxHooksExceededError
  | MaxFunctionsExceededError
  | RangeSizeExceededError

/**
 * Error signature mapping for quick lookup.
 * Selectors are the first 4 bytes of keccak256("ErrorName(type1,type2,...)") from SharedValidation.sol.
 */
export const ERROR_SIGNATURES: Record<string, {
  name: string
  params: string[]
  userMessage: (params: Record<string, any>) => string
}> = {
  // Address validation (SharedValidation.sol)
  '0x8e4c8aa6': {
    name: 'InvalidAddress',
    params: ['provided'],
    userMessage: (params) => `InvalidAddress: Invalid address provided: ${params.provided}`
  },
  '0x1c024b14': {
    name: 'NotNewAddress',
    params: ['newAddress', 'currentAddress'],
    userMessage: () => `NotNewAddress: New address must be different from current address`
  },

  // Time and deadline
  '0xf027e09d': {
    name: 'InvalidTimeLockPeriod',
    params: ['provided'],
    userMessage: (params) => `InvalidTimeLockPeriod: Invalid time lock period: ${params.provided}`
  },
  '0xbcdedf97': {
    name: 'TimeLockPeriodZero',
    params: ['provided'],
    userMessage: () => `TimeLockPeriodZero: Time lock period must be greater than zero`
  },
  '0x0e6fd6e4': {
    name: 'DeadlineInPast',
    params: ['deadline', 'currentTime'],
    userMessage: () => `DeadlineInPast: Transaction deadline has passed`
  },
  '0x0ce5c69c': {
    name: 'MetaTxExpired',
    params: ['deadline', 'currentTime'],
    userMessage: () => `MetaTxExpired: Meta-transaction has expired`
  },
  '0xee142cd7': {
    name: 'BeforeReleaseTime',
    params: ['releaseTime', 'currentTime'],
    userMessage: () => `BeforeReleaseTime: Current time is before release time`
  },
  '0x013cfafc': {
    name: 'NewTimelockSame',
    params: ['newPeriod', 'currentPeriod'],
    userMessage: () => `NewTimelockSame: New timelock period must differ from current`
  },

  // Permission and authorization
  '0xf37a3442': {
    name: 'NoPermission',
    params: ['caller'],
    userMessage: (params) => `NoPermission: Caller ${params.caller} does not have permission`
  },
  '0x3975c914': {
    name: 'NoPermissionForFunction',
    params: ['caller', 'functionSelector'],
    userMessage: (params) => `NoPermissionForFunction: Caller ${params.caller} has no permission for function ${params.functionSelector}`
  },
  '0x5f16a21a': {
    name: 'RestrictedOwner',
    params: ['caller', 'owner'],
    userMessage: () => `RestrictedOwner: Only the owner can perform this action`
  },
  '0x14437a05': {
    name: 'RestrictedOwnerRecovery',
    params: ['caller', 'owner', 'recovery'],
    userMessage: () => `RestrictedOwnerRecovery: Only owner or recovery can perform this action`
  },
  '0x92e22b88': {
    name: 'RestrictedRecovery',
    params: ['caller', 'recovery'],
    userMessage: () => `RestrictedRecovery: Only the recovery address can perform this action`
  },
  '0xc26028e0': {
    name: 'RestrictedBroadcaster',
    params: ['caller', 'broadcaster'],
    userMessage: () => `RestrictedBroadcaster: Only the broadcaster can perform this action`
  },
  '0x3b94fe24': {
    name: 'SignerNotAuthorized',
    params: ['signer'],
    userMessage: (params) => `SignerNotAuthorized: Signer ${params.signer} is not authorized`
  },
  '0xf364cb26': {
    name: 'OnlyCallableByContract',
    params: ['caller', 'contractAddress'],
    userMessage: (params) => `OnlyCallableByContract: Caller ${params.caller} is not the contract ${params.contractAddress}`
  },

  // Transaction and operation
  '0xa0387940': {
    name: 'NotSupported',
    params: [],
    userMessage: () => `NotSupported: This operation is not supported`
  },
  '0xc502078d': {
    name: 'InvalidOperationType',
    params: ['actualType', 'expectedType'],
    userMessage: () => `InvalidOperationType: Operation type does not match expected`
  },
  '0x784a33af': {
    name: 'ZeroOperationTypeNotAllowed',
    params: [],
    userMessage: () => `ZeroOperationTypeNotAllowed: Zero operation type is not allowed`
  },
  '0x10423d7c': {
    name: 'TransactionStatusMismatch',
    params: ['expectedStatus', 'currentStatus'],
    userMessage: (params) => `TransactionStatusMismatch: Expected status ${params.expectedStatus}, current ${params.currentStatus}`
  },
  '0x0dc149f0': {
    name: 'AlreadyInitialized',
    params: [],
    userMessage: () => `AlreadyInitialized: Contract is already initialized`
  },
  '0x87138d5c': {
    name: 'NotInitialized',
    params: [],
    userMessage: () => `NotInitialized: Contract is not initialized`
  },
  '0x1efa143c': {
    name: 'TransactionIdMismatch',
    params: ['expectedTxId', 'providedTxId'],
    userMessage: (params) => `TransactionIdMismatch: Transaction ID mismatch (expected: ${params.expectedTxId}, provided: ${params.providedTxId})`
  },
  '0xf5b20274': {
    name: 'PendingSecureRequest',
    params: [],
    userMessage: () => `PendingSecureRequest: A secure request is already pending`
  },

  // Signature and meta-transaction
  '0xd615d706': {
    name: 'InvalidSignatureLength',
    params: ['providedLength', 'expectedLength'],
    userMessage: (params) => `InvalidSignatureLength: Invalid signature length: ${params.providedLength} (expected: ${params.expectedLength})`
  },
  '0x2adfdc30': {
    name: 'InvalidSignature',
    params: ['signature'],
    userMessage: () => `InvalidSignature: Invalid signature`
  },
  '0x06427aeb': {
    name: 'InvalidNonce',
    params: ['providedNonce', 'expectedNonce'],
    userMessage: (params) => `InvalidNonce: Invalid nonce: ${params.providedNonce} (expected: ${params.expectedNonce})`
  },
  '0x21967608': {
    name: 'ChainIdMismatch',
    params: ['providedChainId', 'expectedChainId'],
    userMessage: (params) => `ChainIdMismatch: Chain ID mismatch: ${params.providedChainId} (expected: ${params.expectedChainId})`
  },
  '0x1c3e0d9d': {
    name: 'InvalidHandlerSelector',
    params: ['selector'],
    userMessage: (params) => `InvalidHandlerSelector: Invalid handler selector: ${params.selector}`
  },
  '0xa9f81b00': {
    name: 'InvalidSValue',
    params: ['s'],
    userMessage: () => `InvalidSValue: Invalid signature s value`
  },
  '0x8da8a15b': {
    name: 'InvalidVValue',
    params: ['v'],
    userMessage: (params) => `InvalidVValue: Invalid signature v value: ${params.v}`
  },
  '0xb840c203': {
    name: 'ECDSAInvalidSignature',
    params: ['recoveredSigner'],
    userMessage: (params) => `ECDSAInvalidSignature: ECDSA recovery returned invalid signer: ${params.recoveredSigner}`
  },
  '0xc6ded982': {
    name: 'GasPriceExceedsMax',
    params: ['currentGasPrice', 'maxGasPrice'],
    userMessage: (params) => `GasPriceExceedsMax: Gas price ${params.currentGasPrice} exceeds max ${params.maxGasPrice}`
  },

  // Resource and item (SharedValidation.sol)
  '0x474d3baf': {
    name: 'ResourceNotFound',
    params: ['resource'],
    userMessage: (params) => `ResourceNotFound: Resource ${params.resource} not found`
  },
  '0x430fab94': {
    name: 'ResourceAlreadyExists',
    params: ['resourceId'],
    userMessage: (params) => `ResourceAlreadyExists: Resource ${params.resourceId} already exists`
  },
  '0xee809d50': {
    name: 'CannotModifyProtected',
    params: ['resourceId'],
    userMessage: (params) => `CannotModifyProtected: Cannot modify protected resource ${params.resourceId}`
  },
  '0x0da9443d': {
    name: 'ItemAlreadyExists',
    params: ['item'],
    userMessage: (params) => `ItemAlreadyExists: Item ${params.item} already exists`
  },
  '0x7a6318f1': {
    name: 'ItemNotFound',
    params: ['item'],
    userMessage: (params) => `ItemNotFound: Item ${params.item} not found`
  },
  '0xf438c55f': {
    name: 'InvalidOperation',
    params: ['item'],
    userMessage: (params) => `InvalidOperation: Invalid operation for item ${params.item}`
  },
  '0x5ca3be63': {
    name: 'DefinitionNotIDefinition',
    params: ['definition'],
    userMessage: (params) => `DefinitionNotIDefinition: Address ${params.definition} is not an IDefinition contract`
  },

  // Role and function
  '0xfc861e8c': {
    name: 'RoleWalletLimitReached',
    params: ['currentCount', 'maxWallets'],
    userMessage: (params) => `RoleWalletLimitReached: Role wallet limit reached (${params.currentCount}/${params.maxWallets})`
  },
  '0xd2bbf46a': {
    name: 'MaxWalletsZero',
    params: ['provided'],
    userMessage: () => `MaxWalletsZero: Max wallets must be greater than zero`
  },
  '0x405c16b9': {
    name: 'ConflictingMetaTxPermissions',
    params: ['functionSelector'],
    userMessage: (params) => `ConflictingMetaTxPermissions: Conflicting meta-tx permissions for selector ${params.functionSelector}`
  },
  '0xbb8128de': {
    name: 'InternalFunctionNotAccessible',
    params: ['functionSelector'],
    userMessage: (params) => `InternalFunctionNotAccessible: Internal function ${params.functionSelector} is not accessible`
  },
  '0x11269582': {
    name: 'ContractFunctionMustBeProtected',
    params: ['functionSelector'],
    userMessage: (params) => `ContractFunctionMustBeProtected: Internal function (selector: ${params.functionSelector}) must be protected`
  },
  '0x1fe7e0ac': {
    name: 'TargetNotWhitelisted',
    params: ['target', 'functionSelector'],
    userMessage: (params) => `TargetNotWhitelisted: Target ${params.target} is not whitelisted for function selector ${params.functionSelector}`
  },
  '0x2584c569': {
    name: 'FunctionSelectorMismatch',
    params: ['providedSelector', 'derivedSelector'],
    userMessage: (params) => `FunctionSelectorMismatch: Selector mismatch (provided: ${params.providedSelector}, derived: ${params.derivedSelector})`
  },
  '0xc0baa221': {
    name: 'HandlerForSelectorMismatch',
    params: ['schemaHandlerForSelector', 'permissionHandlerForSelector'],
    userMessage: (params) => `HandlerForSelectorMismatch: Handler selector mismatch - schema: ${params.schemaHandlerForSelector}, permission: ${params.permissionHandlerForSelector}`
  },
  '0x2457cde7': {
    name: 'InvalidRange',
    params: ['from', 'to'],
    userMessage: (params) => `InvalidRange: Invalid range (from: ${params.from}, to: ${params.to})`
  },
  '0x0364eed2': {
    name: 'OperationFailed',
    params: [],
    userMessage: () => `OperationFailed: Operation failed`
  },

  // Payment and balance
  '0x3c6b4b28': {
    name: 'InvalidPayment',
    params: [],
    userMessage: () => `InvalidPayment: Invalid payment (e.g. wrong value or payment not allowed)`
  },
  '0xcf479181': {
    name: 'InsufficientBalance',
    params: ['currentBalance', 'requiredAmount'],
    userMessage: (params) => `InsufficientBalance: Insufficient balance: ${params.currentBalance} (required: ${params.requiredAmount})`
  },
  '0xadca8d51': {
    name: 'PaymentFailed',
    params: ['recipient', 'amount', 'reason'],
    userMessage: (params) => `PaymentFailed: Payment to ${params.recipient} for ${params.amount} failed`
  },

  // Array validation
  '0xfa5dbe08': {
    name: 'ArrayLengthMismatch',
    params: ['array1Length', 'array2Length'],
    userMessage: (params) => `ArrayLengthMismatch: Array length mismatch: ${params.array1Length} vs ${params.array2Length}`
  },
  '0x63a056dd': {
    name: 'IndexOutOfBounds',
    params: ['index', 'arrayLength'],
    userMessage: (params) => `IndexOutOfBounds: Index out of bounds: ${params.index} (array length: ${params.arrayLength})`
  },

  // System limits
  '0xf80a4845': {
    name: 'BatchSizeExceeded',
    params: ['currentSize', 'maxSize'],
    userMessage: (params) => `BatchSizeExceeded: Batch size ${params.currentSize} exceeds max ${params.maxSize}`
  },
  '0xc37aabb4': {
    name: 'MaxRolesExceeded',
    params: ['currentCount', 'maxRoles'],
    userMessage: (params) => `MaxRolesExceeded: Role count ${params.currentCount} exceeds max ${params.maxRoles}`
  },
  '0x0c285f2e': {
    name: 'MaxHooksExceeded',
    params: ['currentCount', 'maxHooks'],
    userMessage: (params) => `MaxHooksExceeded: Hook count ${params.currentCount} exceeds max ${params.maxHooks}`
  },
  '0x106e9da6': {
    name: 'MaxFunctionsExceeded',
    params: ['currentCount', 'maxFunctions'],
    userMessage: (params) => `MaxFunctionsExceeded: Function count ${params.currentCount} exceeds max ${params.maxFunctions}`
  },
  '0x82289375': {
    name: 'RangeSizeExceeded',
    params: ['rangeSize', 'maxRangeSize'],
    userMessage: (params) => `RangeSizeExceeded: Range size ${params.rangeSize} exceeds max ${params.maxRangeSize}`
  }
}

/**
 * ABI parameter types for decoding custom error args (selector -> viem parseAbiParameters string).
 * Keys match ERROR_SIGNATURES; values are canonical ABI type strings for decodeAbiParameters.
 */
export const ERROR_DECODE_TYPES: Record<string, string> = {
  '0x8e4c8aa6': 'address',
  '0x1c024b14': 'address, address',
  '0xf027e09d': 'uint256',
  '0xbcdedf97': 'uint256',
  '0x0e6fd6e4': 'uint256, uint256',
  '0x0ce5c69c': 'uint256, uint256',
  '0xee142cd7': 'uint256, uint256',
  '0x013cfafc': 'uint256, uint256',
  '0xf37a3442': 'address',
  '0x3975c914': 'address, bytes4',
  '0x5f16a21a': 'address, address',
  '0x14437a05': 'address, address, address',
  '0x92e22b88': 'address, address',
  '0xc26028e0': 'address, address',
  '0x3b94fe24': 'address',
  '0xf364cb26': 'address, address',
  '0xa0387940': '',
  '0xc502078d': 'bytes32, bytes32',
  '0x784a33af': '',
  '0x10423d7c': 'uint8, uint8',
  '0x0dc149f0': '',
  '0x87138d5c': '',
  '0x1efa143c': 'uint256, uint256',
  '0xf5b20274': '',
  '0xd615d706': 'uint256, uint256',
  '0x2adfdc30': 'bytes',
  '0x06427aeb': 'uint256, uint256',
  '0x21967608': 'uint256, uint256',
  '0x1c3e0d9d': 'bytes4',
  '0xa9f81b00': 'bytes32',
  '0x8da8a15b': 'uint8',
  '0xb840c203': 'address',
  '0xc6ded982': 'uint256, uint256',
  '0x474d3baf': 'bytes32',
  '0x430fab94': 'bytes32',
  '0xee809d50': 'bytes32',
  '0x0da9443d': 'address',
  '0x7a6318f1': 'address',
  '0xf438c55f': 'address',
  '0x5ca3be63': 'address',
  '0xfc861e8c': 'uint256, uint256',
  '0xd2bbf46a': 'uint256',
  '0x405c16b9': 'bytes4',
  '0xbb8128de': 'bytes4',
  '0x11269582': 'bytes4',
  '0x1fe7e0ac': 'address, bytes4',
  '0x2584c569': 'bytes4, bytes4',
  '0xc0baa221': 'bytes4, bytes4',
  '0x2457cde7': 'uint256, uint256',
  '0x0364eed2': '',
  '0x3c6b4b28': '',
  '0xcf479181': 'uint256, uint256',
  '0xadca8d51': 'address, uint256, bytes',
  '0xfa5dbe08': 'uint256, uint256',
  '0x63a056dd': 'uint256, uint256',
  '0xf80a4845': 'uint256, uint256',
  '0xc37aabb4': 'uint256, uint256',
  '0x0c285f2e': 'uint256, uint256',
  '0x106e9da6': 'uint256, uint256',
  '0x82289375': 'uint256, uint256'
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
    // Ensure data is hex string without 0x prefix (normalize to lowercase for lookup)
    if (data.startsWith('0x')) {
      data = data.slice(2)
    }
    data = data.toLowerCase()

    // Try known custom error by 4-byte selector (before Error(string))
    if (data.length >= 8) {
      const selector = ('0x' + data.slice(0, 8)) as keyof typeof ERROR_SIGNATURES
      const sig = ERROR_SIGNATURES[selector]
      const types = ERROR_DECODE_TYPES[selector]
      if (sig && (types === '' || types)) {
        const paramNames = sig.params
        let params: Record<string, any> = {}
        let decodeOk = true
        if (types) {
          try {
            const argsHex = '0x' + data.slice(8)
            const decoded = decodeAbiParameters(parseAbiParameters(types), argsHex as `0x${string}`)
            paramNames.forEach((name, i) => {
              params[name] = decoded[i] !== undefined ? String(decoded[i]) : ''
            })
          } catch (_) {
            decodeOk = false
          }
        }
        if (decodeOk) {
          const message = sig.userMessage(params)
          return {
            name: sig.name,
            signature: selector,
            params,
            message
          } as unknown as GuardianContractError
        }
      }
    }

    // Check if it starts with Error(string) selector (0x08c379a0); data already lowercased
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
  // Check if it's a known error signature (normalize selector to lowercase for lookup)
  const selectorKey = (error.signature as string).toLowerCase()
  const errorSignature = ERROR_SIGNATURES[selectorKey]
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
    case 'ItemAlreadyExists':
      return `ItemAlreadyExists: Item ${error.params.item} already exists`
    case 'ItemNotFound':
      return `ItemNotFound: Item ${error.params.item} not found`
    case 'DefinitionNotIDefinition':
      return `DefinitionNotIDefinition: Address ${error.params.definition} is not an IDefinition contract`
    case 'InvalidPayment':
      return 'InvalidPayment: Invalid payment (e.g. wrong value or payment not allowed)'
    case 'TargetNotWhitelisted':
      return `TargetNotWhitelisted: Target ${error.params.target} is not whitelisted for function selector ${error.params.functionSelector}`
    case 'ResourceNotFound':
      return `ResourceNotFound: Resource ${error.params.resource} not found`
    case 'HandlerForSelectorMismatch':
      return `HandlerForSelectorMismatch: Handler selector mismatch - schema handler: ${error.params.schemaHandlerForSelector}, permission handler: ${error.params.permissionHandlerForSelector}`
    case 'ContractFunctionMustBeProtected':
      return `ContractFunctionMustBeProtected: Internal function (selector: ${error.params.functionSelector}) must be protected`
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
  const isKnownError = ERROR_SIGNATURES[(error.signature as string).toLowerCase()] !== undefined

  return {
    error,
    userMessage,
    isKnownError
  }
}

export default {
  ERROR_SIGNATURES,
  ERROR_DECODE_TYPES,
  COMMON_ERROR_PATTERNS,
  decodeRevertReason,
  getUserFriendlyErrorMessage,
  isErrorType,
  extractErrorInfo
}
