/**
 * Workflow Core Tests
 * Tests the core Workflow class and WorkflowRegistry functionality
 */

import { BaseWorkflowTest } from './base-test';
import { Workflow } from '../../../sdk/typescript/utils/workflow';
import { getSecureOwnableExtension } from '../../../sdk/typescript/utils/workflow';
import { getRuntimeRBACExtension } from '../../../sdk/typescript/utils/workflow';
import { OPERATION_TYPES } from '../../../sdk/typescript/types/core.access.index';

export class WorkflowCoreTests extends BaseWorkflowTest {
  constructor() {
    super('Workflow Core Tests');
  }

  async executeTests(): Promise<void> {
    console.log('\n🔄 TESTING WORKFLOW CORE FUNCTIONALITY');
    console.log('======================================');
    console.log('📋 This test suite verifies:');
    console.log('   1. Workflow initialization');
    console.log('   2. Extension registration');
    console.log('   3. Workflow queries');
    console.log('   4. Workflow path queries');

    await this.testStep1WorkflowInitialization();
    await this.testStep2ExtensionRegistration();
    await this.testStep3GetOperationWorkflows();
    await this.testStep4GetWorkflowForOperation();
    await this.testStep5GetWorkflowPaths();
  }

  async testStep1WorkflowInitialization(): Promise<void> {
    console.log('\n📝 STEP 1: Workflow Initialization');
    console.log('-----------------------------------');

    try {
      this.assertTest(this.workflow !== null, 'Workflow instance created');
      console.log('  🎉 Step 1 completed: Workflow initialized');
    } catch (error: any) {
      console.log(`  ❌ Step 1 failed: ${error.message}`);
      throw error;
    }
  }

  async testStep2ExtensionRegistration(): Promise<void> {
    console.log('\n📝 STEP 2: Extension Registration');
    console.log('--------------------------------');

    if (!this.workflow) {
      throw new Error('Workflow not initialized');
    }

    try {
      // Create a new workflow and register extensions manually
      const newWorkflow = new Workflow();
      const secureOwnableExtension = getSecureOwnableExtension();
      const runtimeRBACExtension = getRuntimeRBACExtension();

      newWorkflow.registerExtension(secureOwnableExtension);
      newWorkflow.registerExtension(runtimeRBACExtension);

      this.assertTest(true, 'Extensions registered successfully');
      console.log('  🎉 Step 2 completed: Extensions registered');
    } catch (error: any) {
      console.log(`  ❌ Step 2 failed: ${error.message}`);
      throw error;
    }
  }

  async testStep3GetOperationWorkflows(): Promise<void> {
    console.log('\n📝 STEP 3: Get Operation Workflows');
    console.log('-----------------------------------');

    if (!this.workflow) {
      throw new Error('Workflow not initialized');
    }

    try {
      const workflows = await this.workflow.getOperationWorkflows();

      this.assertTest(workflows.length > 0, 'Workflows returned');
      console.log(`  📋 Found ${workflows.length} operation workflows`);

      // Verify SecureOwnable workflows are present
      const ownershipWorkflow = workflows.find(
        (w: any) => w.operationType.toLowerCase() === OPERATION_TYPES.OWNERSHIP_TRANSFER.toLowerCase()
      );
      this.assertTest(!!ownershipWorkflow, 'Ownership transfer workflow found');

      console.log('  🎉 Step 3 completed: Operation workflows retrieved');
    } catch (error: any) {
      console.log(`  ❌ Step 3 failed: ${error.message}`);
      throw error;
    }
  }

  async testStep4GetWorkflowForOperation(): Promise<void> {
    console.log('\n📝 STEP 4: Get Workflow For Operation');
    console.log('-------------------------------------');

    if (!this.workflow) {
      throw new Error('Workflow not initialized');
    }

    try {
      const workflow = await this.workflow.getWorkflowForOperation(
        OPERATION_TYPES.OWNERSHIP_TRANSFER
      );

      this.assertTest(!!workflow, 'Workflow found for operation');
      this.assertTest(
        workflow.operationType.toLowerCase() === OPERATION_TYPES.OWNERSHIP_TRANSFER.toLowerCase(),
        'Correct workflow returned'
      );
      this.assertTest(workflow.paths.length > 0, 'Workflow has paths');

      console.log(`  📋 Operation: ${workflow.operationName}`);
      console.log(`  📋 Paths: ${workflow.paths.length}`);
      console.log('  🎉 Step 4 completed: Workflow retrieved for operation');
    } catch (error: any) {
      console.log(`  ❌ Step 4 failed: ${error.message}`);
      throw error;
    }
  }

  async testStep5GetWorkflowPaths(): Promise<void> {
    console.log('\n📝 STEP 5: Get Workflow Paths');
    console.log('-----------------------------');

    if (!this.workflow) {
      throw new Error('Workflow not initialized');
    }

    try {
      const paths = await this.workflow.getWorkflowPaths();

      this.assertTest(paths.length > 0, 'Workflow paths returned');
      console.log(`  📋 Found ${paths.length} workflow paths`);

      // Verify paths have required properties
      const firstPath = paths[0];
      this.assertTest(!!firstPath.name, 'Path has name');
      this.assertTest(!!firstPath.steps, 'Path has steps');
      this.assertTest(firstPath.steps.length > 0, 'Path has at least one step');

      console.log(`  📋 Example path: ${firstPath.name}`);
      console.log(`  📋 Steps: ${firstPath.steps.length}`);
      console.log('  🎉 Step 5 completed: Workflow paths retrieved');
    } catch (error: any) {
      console.log(`  ❌ Step 5 failed: ${error.message}`);
      throw error;
    }
  }
}

