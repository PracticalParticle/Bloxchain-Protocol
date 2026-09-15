// Bloxchain Protocol TypeScript SDK
// Main entry point for all SDK functionality

// Core Classes
export { default as BaseStateMachine } from './contracts/core/BaseStateMachine.js';
export { default as SecureOwnable } from './contracts/core/SecureOwnable.js';
export { default as RuntimeRBAC } from './contracts/core/RuntimeRBAC.js';
export { default as GuardController } from './contracts/core/GuardController.js';

// Provisioning: the sanctioned clone factory (SPEC-2026-0118)
export { default as CopyBlox } from './contracts/factories/CopyBlox.js';
export type {
  CloneAccountParams,
  CloneLogScanOptions,
  CloneListResult
} from './contracts/factories/CopyBlox.js';
export { Definitions } from './lib/Definition.js';
export { EngineBlox } from './lib/EngineBlox.js';
export {
  updateRecoveryExecutionParams,
  updateTimeLockExecutionParams,
  roleConfigBatchExecutionParams,
  guardConfigBatchExecutionParams,
  getRoleConfigActionSpecs,
  encodeCreateRole,
  encodeRemoveRole,
  encodeAddWallet,
  encodeRevokeWallet,
  encodeAddFunctionToRole,
  encodeRemoveFunctionFromRole,
  getGuardConfigActionSpecs,
  encodeAddTargetToWhitelist,
  encodeRemoveTargetFromWhitelist,
  encodeRegisterFunction,
  encodeUnregisterFunction
} from './lib/definitions/index.js';
export type { FunctionPermissionForEncoding } from './lib/definitions/index.js';

// Interfaces
export * from './interfaces/base.index.js';
export * from './interfaces/base.state.machine.index.js';
export * from './interfaces/core.access.index.js';
export * from './interfaces/core.security.index.js';
export * from './interfaces/core.execution.index.js';
export * from './interfaces/lib.index.js';
export * from './interfaces/definition.index.js';

// Types and Constants
export { 
  RUNTIME_RBAC_FUNCTION_SELECTORS,
  RUNTIME_RBAC_OPERATION_TYPES,
  RoleConfigActionType
} from './types/core.access.index.js';
export type { RoleConfigAction } from './types/core.access.index.js';
export { OPERATION_TYPES, FUNCTION_SELECTORS as SECURITY_FUNCTION_SELECTORS } from './types/core.security.index.js';
export type { OperationType, FunctionSelector as SecurityFunctionSelector } from './types/core.security.index.js';
export {
  GUARD_CONTROLLER_FUNCTION_SELECTORS,
  GUARD_CONTROLLER_OPERATION_TYPES,
  GuardConfigActionType
} from './types/core.execution.index.js';
export type { GuardConfigAction } from './types/core.execution.index.js';
export * from './types/base.state.machine.index.js';
export * from './types/lib.index.js';
export * from './types/definition.index.js';
export {
  ENGINE_BLOX_META_TRANSACTION_PARAM,
  ENGINE_BLOX_META_TX_PARAMS,
  metaTxHandlerSignature
} from './types/meta-tx-signatures.js';
export * from './utils/bitmap.js';

// Utilities
export * from './utils/validations.js';
export * from './utils/erc20/erc20Token.js';
export { MetaTransactionSigner, MetaTransactionBuilder } from './utils/metaTx/metaTransaction.js';

// EIP-712 meta-transaction constants (public: build a signer-policy condition or a
// browser `signTypedData` call without re-deriving the shape the SDK signs).
export {
  META_TX_DOMAIN,
  META_TX_DOMAIN_NAME,
  META_TX_PRIMARY_TYPE,
  META_TX_TYPES,
  META_TX_TYPED_DATA_TYPES_AS_SIGNED,
  EIP712_DOMAIN_TYPE,
  buildTypedDataMessage,
  buildMetaTxTypedData,
  metaTxDeadlineFor
} from './utils/metaTx/metaTransaction.js';
export type { MetaTxTypedData, MetaTxDeadlineDuration } from './utils/metaTx/metaTransaction.js';

export * from './utils/contract-errors.js';
export * from './utils/viem-error-handler.js';

// Structured failure analysis (revert bytes kept, signer refusals named).
export {
  explainError,
  extractRevertData,
  decodeRevert,
  classifySignerError,
  errorTextChain,
  isAddressShapedHex,
  isRevertNamed
} from './utils/errors.js';
export type {
  ExplainedError,
  ExplainErrorOptions,
  ExtractRevertDataOptions,
  DecodedRevert,
  SignerFailure,
  SignerErrorCode,
  FailureKind
} from './utils/errors.js';

// Inner transaction status — a mined transaction is not a successful one.
export {
  ENGINE_BLOX_EVENTS_ABI,
  TX_STATUS_NAMES,
  txStatusName,
  readInnerOutcomes,
  assertInnerSuccess,
  waitForTransactionAndAssertInner,
  InnerTransactionFailedError
} from './utils/tx-inner-status.js';
export type { InnerTxOutcome, InnerStatusAssertOptions } from './utils/tx-inner-status.js';

// ABIs — also reachable as `@bloxchain/sdk/abi` and `@bloxchain/sdk/abi/<Name>`.
export { ABIS, ALL_ERROR_ABI } from './abi.js';
export type { BloxchainAbiName } from './abi.js';
export {
  INTERFACE_IDS,
  ComponentDetection,
  supportsInterface,
} from './utils/interface-ids.js';

// The account shape gate: never adopt an address without it (SPEC-2026-0118 R3)
export {
  isAccountBlox,
  inspectAccountBlox,
  assertOwnedAccount,
  NotAnAccountError,
  AccountNotOwnedError,
} from './utils/account-gate.js';
export type { AccountBloxInspection, AccountBloxRejection } from './utils/account-gate.js';

// Gas envelope and the EIP-7825 per-transaction cap (SPEC-2026-0118 R4)
export {
  MAX_TX_GAS,
  GAS_ENVELOPE,
  assertUnderMaxTxGas,
  assertGasEnvelope,
  getBlockGasLimit,
  MaxTxGasExceededError,
  GasFloorNotMetError,
} from './utils/gas.js';

// official-deployed-addresses.json (SPEC-2026-0118 R2)
export {
  OFFICIAL_ADDRESSES_FORMAT,
  resolveOfficialNetwork,
  getOfficialAddress,
  pendingOfficialContracts,
  factorySupportsClonesOf,
  OfficialNetworkNotFoundError,
  OfficialContractNotDeclaredError,
} from './utils/official-addresses.js';
export type {
  OfficialAddressesFile,
  OfficialNetwork,
  ResolvedOfficialNetwork,
  OfficialContract,
  OfficialContractKind,
  OfficialGasNotes,
  OfficialStatus,
} from './utils/official-addresses.js';

// Re-export commonly used types from viem
export type { Address, Hex, PublicClient, WalletClient, Chain } from 'viem';
