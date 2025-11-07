/**
 * DynamicRBAC workflow extension
 * Register this with Workflow class to enable DynamicRBAC workflows
 */

import { OperationWorkflow } from '../../core/workflow-types';
import { getDynamicRBACWorkflows } from './workflows';

/**
 * Get DynamicRBAC workflow extension
 * @returns Array of DynamicRBAC operation workflows
 */
export function getDynamicRBACExtension(): OperationWorkflow[] {
  return getDynamicRBACWorkflows();
}

// Export workflows for direct access if needed
export * from './workflows';

// Re-export constants from core.access.index for convenience
export { DYNAMIC_RBAC_OPERATION_TYPES, DYNAMIC_RBAC_OPERATION_TYPES as OPERATION_TYPES, DYNAMIC_RBAC_FUNCTION_SELECTORS as DYNAMIC_RBAC_SELECTORS, DYNAMIC_RBAC_FUNCTION_SELECTORS } from '../../../../types/core.access.index';

