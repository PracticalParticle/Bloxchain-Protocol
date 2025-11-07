import { Hex } from 'viem';
import { TxAction } from '../../../types/lib.index';
import { OperationWorkflow, WorkflowPath, WorkflowStep, WorkflowBuilderOptions, WorkflowValidationResult } from './workflow-types';
import { generateTransitionMapFromWorkflow } from './workflow-transition-generator';

/**
 * Workflow builder utility
 * Provides declarative API for constructing and validating workflows
 */

/**
 * Build a workflow from options
 * @param options Workflow builder options
 * @returns Built operation workflow with transition map
 */
export function buildWorkflow(options: WorkflowBuilderOptions): OperationWorkflow {
  const workflow = {
    operationType: options.operationType,
    operationName: options.operationName,
    paths: options.paths,
    supportedRoles: options.supportedRoles
  };

  // Generate transition map if enabled (default: true)
  const shouldGenerateMap = options.generateTransitionMap !== false;
  
  if (shouldGenerateMap) {
    const transitionMap = generateTransitionMapFromWorkflow(workflow);
    return {
      ...workflow,
      transitionMap
    };
  }

  // If transition map generation is disabled, create empty one
  // (This should rarely be used, but provides flexibility)
  const emptyTransitionMap = {
    operationType: options.operationType,
    operationName: options.operationName,
    transitions: {
      [0]: [], // UNDEFINED
      [1]: [], // PENDING
      [2]: [], // CANCELLED
      [3]: [], // COMPLETED
      [4]: [], // FAILED
      [5]: []  // REJECTED
    }
  };

  return {
    ...workflow,
    transitionMap: emptyTransitionMap
  };
}

/**
 * Validate a workflow
 * @param workflow Workflow to validate
 * @returns Validation result with errors and warnings
 */
export function validateWorkflow(workflow: OperationWorkflow): WorkflowValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Validate operation type is not zero
  if (workflow.operationType === '0x0000000000000000000000000000000000000000000000000000000000000000') {
    errors.push('Operation type cannot be zero');
  }

  // Validate operation name is not empty
  if (!workflow.operationName || workflow.operationName.trim() === '') {
    errors.push('Operation name cannot be empty');
  }

  // Validate at least one path exists
  if (workflow.paths.length === 0) {
    errors.push('Workflow must have at least one path');
  }

  // Validate each path
  workflow.paths.forEach((path, pathIndex) => {
    const pathErrors = validateWorkflowPath(path, pathIndex);
    errors.push(...pathErrors);
  });

  // Validate supported roles is not empty
  if (workflow.supportedRoles.length === 0) {
    warnings.push('Workflow has no supported roles');
  }

  // Check for duplicate paths
  const pathNames = workflow.paths.map(p => p.name);
  const uniqueNames = new Set(pathNames);
  if (uniqueNames.size !== pathNames.length) {
    warnings.push('Duplicate path names found');
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate a workflow path
 * @param path Path to validate
 * @param pathIndex Index of path in workflow
 * @returns Array of error messages
 */
function validateWorkflowPath(path: WorkflowPath, pathIndex: number): string[] {
  const errors: string[] = [];

  // Validate path name
  if (!path.name || path.name.trim() === '') {
    errors.push(`Path ${pathIndex}: name cannot be empty`);
  }

  // Validate path has at least one step
  if (path.steps.length === 0) {
    errors.push(`Path ${pathIndex}: must have at least one step`);
  }

  // Validate each step
  path.steps.forEach((step, stepIndex) => {
    const stepErrors = validateWorkflowStep(step, pathIndex, stepIndex);
    errors.push(...stepErrors);
  });

  // Validate workflow type is valid
  if (path.workflowType < 0 || path.workflowType > 2) {
    errors.push(`Path ${pathIndex}: invalid workflow type (must be 0, 1, or 2)`);
  }

  // Validate estimated time is non-negative
  if (path.estimatedTimeSec < 0n) {
    errors.push(`Path ${pathIndex}: estimated time cannot be negative`);
  }

  // Validate consistency: if hasOffChainPhase is true, at least one step should be off-chain
  if (path.hasOffChainPhase) {
    const hasOffChainStep = path.steps.some(s => s.isOffChain);
    if (!hasOffChainStep) {
      errors.push(`Path ${pathIndex}: hasOffChainPhase is true but no off-chain steps found`);
    }
  }

  // Validate consistency: if requiresSignature is true, at least one step should have SIGNING phase
  if (path.requiresSignature) {
    const hasSigningStep = path.steps.some(s => s.phaseType === 'SIGNING');
    if (!hasSigningStep) {
      errors.push(`Path ${pathIndex}: requiresSignature is true but no SIGNING phase steps found`);
    }
  }

  return errors;
}

/**
 * Validate a workflow step
 * @param step Step to validate
 * @param pathIndex Index of path
 * @param stepIndex Index of step
 * @returns Array of error messages
 */
function validateWorkflowStep(step: WorkflowStep, pathIndex: number, stepIndex: number): string[] {
  const errors: string[] = [];

  // Validate function name
  if (!step.functionName || step.functionName.trim() === '') {
    errors.push(`Path ${pathIndex}, Step ${stepIndex}: function name cannot be empty`);
  }

  // Validate function selector (for on-chain steps)
  if (!step.isOffChain) {
    if (step.functionSelector === '0x00000000' || step.functionSelector === '0x') {
      errors.push(`Path ${pathIndex}, Step ${stepIndex}: on-chain step must have valid function selector`);
    }
  }

  // Validate roles array is not empty
  if (step.roles.length === 0) {
    errors.push(`Path ${pathIndex}, Step ${stepIndex}: must have at least one role`);
  }

  // Validate description
  if (!step.description || step.description.trim() === '') {
    errors.push(`Path ${pathIndex}, Step ${stepIndex}: description cannot be empty`);
  }

  // Validate phase type
  if (step.phaseType !== 'SIGNING' && step.phaseType !== 'EXECUTION') {
    errors.push(`Path ${pathIndex}, Step ${stepIndex}: invalid phase type (must be SIGNING or EXECUTION)`);
  }

  // Validate off-chain steps are SIGNING phase
  if (step.isOffChain && step.phaseType !== 'SIGNING') {
    errors.push(`Path ${pathIndex}, Step ${stepIndex}: off-chain steps must be SIGNING phase`);
  }

  // Validate that action transitions are valid (if possible)
  // Note: We can't fully validate this without knowing the current status,
  // but we can at least check that the action is defined

  return errors;
}

/**
 * Create a workflow step builder
 */
export class WorkflowStepBuilder {
  private step: Partial<WorkflowStep> = {};

  functionName(name: string): this {
    this.step.functionName = name;
    return this;
  }

  functionSelector(selector: Hex): this {
    this.step.functionSelector = selector;
    return this;
  }

  action(action: number | TxAction): this {
    this.step.action = action as TxAction;
    return this;
  }

  roles(roles: string[]): this {
    this.step.roles = roles;
    return this;
  }

  description(desc: string): this {
    this.step.description = desc;
    return this;
  }

  offChain(isOffChain: boolean = true): this {
    this.step.isOffChain = isOffChain;
    return this;
  }

  phaseType(type: 'SIGNING' | 'EXECUTION'): this {
    this.step.phaseType = type;
    return this;
  }

  build(): WorkflowStep {
    if (!this.step.functionName) throw new Error('functionName is required');
    if (!this.step.functionSelector) throw new Error('functionSelector is required');
    if (this.step.action === undefined) throw new Error('action is required');
    if (!this.step.roles || this.step.roles.length === 0) throw new Error('roles are required');
    if (!this.step.description) throw new Error('description is required');
    if (this.step.isOffChain === undefined) throw new Error('isOffChain is required');
    if (!this.step.phaseType) throw new Error('phaseType is required');

    return {
      functionName: this.step.functionName,
      functionSelector: this.step.functionSelector,
      action: this.step.action,
      roles: this.step.roles,
      description: this.step.description,
      isOffChain: this.step.isOffChain,
      phaseType: this.step.phaseType
    };
  }
}

/**
 * Create a workflow path builder
 */
export class WorkflowPathBuilder {
  private path: Partial<WorkflowPath> = {
    steps: []
  };

  name(name: string): this {
    this.path.name = name;
    return this;
  }

  description(desc: string): this {
    this.path.description = desc;
    return this;
  }

  step(step: WorkflowStep): this {
    if (!this.path.steps) this.path.steps = [];
    this.path.steps.push(step);
    return this;
  }

  workflowType(type: number): this {
    this.path.workflowType = type;
    return this;
  }

  estimatedTimeSec(seconds: bigint): this {
    this.path.estimatedTimeSec = seconds;
    return this;
  }

  requiresSignature(required: boolean = true): this {
    this.path.requiresSignature = required;
    return this;
  }

  hasOffChainPhase(has: boolean = true): this {
    this.path.hasOffChainPhase = has;
    return this;
  }

  build(): WorkflowPath {
    if (!this.path.name) throw new Error('name is required');
    if (!this.path.description) throw new Error('description is required');
    if (!this.path.steps || this.path.steps.length === 0) throw new Error('at least one step is required');
    if (this.path.workflowType === undefined) throw new Error('workflowType is required');
    if (this.path.estimatedTimeSec === undefined) throw new Error('estimatedTimeSec is required');
    if (this.path.requiresSignature === undefined) throw new Error('requiresSignature is required');
    if (this.path.hasOffChainPhase === undefined) throw new Error('hasOffChainPhase is required');

    return {
      name: this.path.name,
      description: this.path.description,
      steps: this.path.steps,
      workflowType: this.path.workflowType,
      estimatedTimeSec: this.path.estimatedTimeSec,
      requiresSignature: this.path.requiresSignature,
      hasOffChainPhase: this.path.hasOffChainPhase
    };
  }
}

