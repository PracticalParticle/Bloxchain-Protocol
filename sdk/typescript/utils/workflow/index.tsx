/**
 * Workflow utilities index
 * Central export point for all workflow-related utilities
 */

// Core exports (generic workflow utilities)
export * from './core';

// Extension exports (optional - users can import separately)
export { getSecureOwnableExtension } from './extensions/secure-ownable';
export { getDynamicRBACExtension } from './extensions/dynamic-rbac';

// Re-export extension constants from core.access.index for convenience
export { OPERATION_TYPES as SECURE_OWNABLE_OPERATION_TYPES, OPERATION_TYPES, FUNCTION_SELECTORS as SECURE_OWNABLE_SELECTORS, FUNCTION_SELECTORS } from '../../types/core.access.index';
export { DYNAMIC_RBAC_OPERATION_TYPES, DYNAMIC_RBAC_FUNCTION_SELECTORS as DYNAMIC_RBAC_SELECTORS, DYNAMIC_RBAC_FUNCTION_SELECTORS } from '../../types/core.access.index';

// Convenience function: create Workflow with default extensions
import { Workflow } from './core/Workflow';
import { getSecureOwnableExtension } from './extensions/secure-ownable';
import { getDynamicRBACExtension } from './extensions/dynamic-rbac';

/**
 * Create a Workflow instance with default extensions (SecureOwnable and DynamicRBAC) pre-registered
 * @returns Workflow instance with default extensions loaded
 * 
 * @example
 * ```typescript
 * const workflow = createWorkflowWithDefaults();
 * const workflows = await workflow.getOperationWorkflows();
 * ```
 */
export function createWorkflowWithDefaults(): Workflow {
  const workflow = new Workflow();
  workflow.registerExtension(getSecureOwnableExtension());
  workflow.registerExtension(getDynamicRBACExtension());
  return workflow;
}
