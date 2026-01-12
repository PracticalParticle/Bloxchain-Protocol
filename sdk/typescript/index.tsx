// Bloxchain Protocol TypeScript SDK
// Main entry point for all SDK functionality

// Core Classes
export { default as BaseStateMachine } from './contracts/BaseStateMachine';
export { default as SecureOwnable } from './contracts/SecureOwnable';
export { default as DynamicRBAC } from './contracts/DynamicRBAC';
export { default as GuardController } from './contracts/GuardController';
export { Definitions } from './lib/Definition';
export { Workflow, createWorkflowWithDefaults } from './utils/workflow';

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
  DYNAMIC_RBAC_FUNCTION_SELECTORS
} from './types/core.access.index';
export { 
  OPERATION_TYPES
} from './types/core.security.index';
export type { OperationType } from './types/core.security.index';
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

// Workflow Utilities
export * from './utils/workflow';

// Re-export commonly used types from viem
export type { Address, Hex, PublicClient, WalletClient, Chain } from 'viem';
