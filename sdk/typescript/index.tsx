// Bloxchain Protocol TypeScript SDK
// Main entry point for all SDK functionality

// Core Classes
export { default as BaseStateMachine } from './contracts/core/BaseStateMachine.js';
export { default as SecureOwnable } from './contracts/core/SecureOwnable.js';
export { default as RuntimeRBAC } from './contracts/core/RuntimeRBAC.js';
export { default as GuardController } from './contracts/core/GuardController.js';
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
export * from './utils/contract-errors.js';
export * from './utils/viem-error-handler.js';
export {
  INTERFACE_IDS,
  ComponentDetection,
  supportsInterface,
} from './utils/interface-ids.js';

// Re-export commonly used types from viem
export type { Address, Hex, PublicClient, WalletClient, Chain } from 'viem';
