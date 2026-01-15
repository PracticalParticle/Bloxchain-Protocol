/**
 * RuntimeRBAC workflow extension
 * Register this with Workflow class to enable RuntimeRBAC workflows
 */

import { OperationWorkflow } from '../../core/workflow-types';
import { getRuntimeRBACWorkflows } from './workflows';

/**
 * Get RuntimeRBAC workflow extension
 * @returns Array of RuntimeRBAC operation workflows
 */
export function getRuntimeRBACExtension(): OperationWorkflow[] {
  return getRuntimeRBACWorkflows();
}

// Export workflows for direct access if needed
export * from './workflows';

// Re-export constants from core.access.index for convenience
export { 
  RUNTIME_RBAC_OPERATION_TYPES, 
  RUNTIME_RBAC_OPERATION_TYPES as OPERATION_TYPES, 
  RUNTIME_RBAC_FUNCTION_SELECTORS as RUNTIME_RBAC_SELECTORS, 
  RUNTIME_RBAC_FUNCTION_SELECTORS
} from '../../../../types/core.access.index';
