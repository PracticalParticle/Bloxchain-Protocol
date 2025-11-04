/**
 * SecureOwnable workflow extension
 * Register this with Workflow class to enable SecureOwnable workflows
 */

import { OperationWorkflow } from '../../core/workflow-types';
import { getSecureOwnableWorkflows } from './workflows';

/**
 * Get SecureOwnable workflow extension
 * @returns Array of SecureOwnable operation workflows
 */
export function getSecureOwnableExtension(): OperationWorkflow[] {
  return getSecureOwnableWorkflows();
}

// Export workflows for direct access if needed
export * from './workflows';

// Re-export constants from core.access.index for convenience
export { OPERATION_TYPES as SECURE_OWNABLE_OPERATION_TYPES, OPERATION_TYPES, FUNCTION_SELECTORS as SECURE_OWNABLE_SELECTORS, FUNCTION_SELECTORS } from '../../../../types/core.access.index';

