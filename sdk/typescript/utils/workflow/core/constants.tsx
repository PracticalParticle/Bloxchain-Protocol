/**
 * Core workflow constants
 * These are generic constants used across all workflows (no contract-specific logic)
 */

/**
 * Workflow Type Constants
 */
export const WorkflowType = {
  TIME_DELAY_ONLY: 0,
  META_TX_ONLY: 1,
  HYBRID: 2
} as const;

export type WorkflowType = typeof WorkflowType[keyof typeof WorkflowType];

/**
 * Phase Type Constants
 */
export const PhaseType = {
  SIGNING: "SIGNING",
  EXECUTION: "EXECUTION"
} as const;

export type PhaseType = typeof PhaseType[keyof typeof PhaseType];

