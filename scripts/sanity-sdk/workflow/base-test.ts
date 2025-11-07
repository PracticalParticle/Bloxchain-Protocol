/**
 * Base Test Class for Workflow SDK Tests
 * Provides workflow-specific functionality
 */

import { BaseSDKTest } from '../base/BaseSDKTest';
import { Workflow } from '../../../sdk/typescript/utils/workflow';
import { createWorkflowWithDefaults } from '../../../sdk/typescript/utils/workflow';

export class BaseWorkflowTest extends BaseSDKTest {
  protected workflow: Workflow | null = null;

  constructor(testName: string) {
    super(testName);
  }

  /**
   * Workflow tests don't need contract addresses
   */
  protected async getContractAddress(): Promise<null> {
    return null;
  }

  /**
   * Workflow tests don't need contract addresses
   */
  protected getContractAddressFromEnv(): null {
    return null;
  }

  /**
   * Initialize workflow instance
   */
  protected async initializeWorkflow(): Promise<void> {
    this.workflow = createWorkflowWithDefaults();
    console.log('✅ Workflow SDK initialized with default extensions');
  }

  /**
   * Override initialize to include workflow initialization
   */
  async initialize(): Promise<void> {
    // Skip base initialization (no contracts needed)
    console.log(`🔧 Initializing ${this.testName}...`);
    await this.initializeWorkflow();
    console.log(`✅ ${this.testName} initialized successfully\n`);
  }

  /**
   * Abstract method - must be implemented by subclasses
   */
  protected async executeTests(): Promise<void> {
    throw new Error('executeTests() must be implemented by subclasses');
  }
}

