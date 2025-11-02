// Bloxchain Protocol TypeScript SDK
// Main entry point for all SDK functionality

// Core Classes
export { default as BaseStateMachine } from './contracts/BaseStateMachine';
export { default as SecureOwnable } from './contracts/SecureOwnable';
export { default as DynamicRBAC } from './contracts/DynamicRBAC';
export { default as GuardController } from './contracts/GuardController';
export { Definitions } from './lib/Definition';
export { Workflow } from './lib/Workflow';

// Interfaces
export * from './interfaces/base.index';
export * from './interfaces/base.state.machine.index';
export * from './interfaces/core.access.index';
export * from './interfaces/core.execution.index';
export * from './interfaces/lib.index';
export * from './interfaces/definition.index';
export * from './interfaces/workflow.index';

// Types and Constants
export { 
  OPERATION_TYPES, 
  DYNAMIC_RBAC_FUNCTION_SELECTORS
} from './types/core.access.index';
export type { OperationType } from './types/core.access.index';
export * from './types/base.state.machine.index';
export * from './types/lib.index';
export * from './types/definition.index';
export * from './types/workflow.index';

// Utilities
export * from './utils/validations';
export * from './utils/erc20/erc20Token';
export { MetaTransactionSigner, MetaTransactionBuilder } from './utils/metaTx/metaTransaction';
export * from './utils/contract-errors';

// Re-export commonly used types from viem
export type { Address, Hex, PublicClient, WalletClient, Chain } from 'viem';
