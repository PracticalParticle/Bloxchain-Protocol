// Bloxchain Protocol TypeScript SDK
// Main entry point for all SDK functionality

// Core Classes
export { default as BaseStateMachine } from './contracts/BaseStateMachine';
export { default as SecureOwnable } from './contracts/SecureOwnable';
export { default as RuntimeRBAC } from './contracts/RuntimeRBAC';
export { default as GuardController } from './contracts/GuardController';
export { Definitions } from './lib/Definition';
export { EngineBlox } from './lib/EngineBlox';
export {
  updateRecoveryExecutionParams,
  updateTimeLockExecutionParams,
  roleConfigBatchExecutionParams,
  guardConfigBatchExecutionParams
} from './lib/definitions';

// Interfaces
export * from './interfaces/base.index';
export * from './interfaces/base.state.machine.index';
export * from './interfaces/core.access.index';
export * from './interfaces/core.security.index';
export * from './interfaces/core.execution.index';
export * from './interfaces/lib.index';
export * from './interfaces/definition.index';

// Types and Constants
export { 
  RUNTIME_RBAC_FUNCTION_SELECTORS,
  RUNTIME_RBAC_OPERATION_TYPES,
  RoleConfigActionType
} from './types/core.access.index';
export type { RoleConfigAction } from './types/core.access.index';
export { 
  OPERATION_TYPES
} from './types/core.security.index';
export type { OperationType } from './types/core.security.index';
export {
  GUARD_CONTROLLER_FUNCTION_SELECTORS,
  GUARD_CONTROLLER_OPERATION_TYPES,
  GuardConfigActionType
} from './types/core.execution.index';
export type { GuardConfigAction } from './types/core.execution.index';
export * from './types/base.state.machine.index';
export * from './types/lib.index';
export * from './types/definition.index';
export * from './utils/bitmap';

// Utilities
export * from './utils/validations';
export * from './utils/erc20/erc20Token';
export { MetaTransactionSigner, MetaTransactionBuilder } from './utils/metaTx/metaTransaction';
export * from './utils/contract-errors';
export * from './utils/viem-error-handler';

// Re-export commonly used types from viem
export type { Address, Hex, PublicClient, WalletClient, Chain } from 'viem';
