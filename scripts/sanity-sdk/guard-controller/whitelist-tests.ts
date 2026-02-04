/**
 * Whitelist Management Tests
 * Comprehensive tests for target whitelist management using SDK
 */

import { Address, Hex } from 'viem';
import { BaseGuardControllerTest } from './base-test.ts';
import { TxAction } from '../../../sdk/typescript/types/lib.index.tsx';

export class WhitelistTests extends BaseGuardControllerTest {
  private testTarget: Address | null = null;

  constructor() {
    super('Whitelist Management Tests');
  }

  async executeTests(): Promise<void> {
    console.log('\n🔄 TESTING COMPLETE WHITELIST MANAGEMENT WORKFLOW');
    console.log('==================================================');
    console.log('📋 This workflow tests the complete whitelist management cycle using SDK:');
    console.log('   1. Add target to whitelist via meta-transaction (owner signs, broadcaster executes)');
    console.log('   2. Verify target is whitelisted');
    console.log('   3. Query all whitelisted targets');
    console.log('   4. Remove target from whitelist via meta-transaction');
    console.log('   5. Verify target is removed');

    // Use a test target address (one of the wallets that's not owner/broadcaster/recovery)
    const availableWallets = Object.keys(this.wallets).filter(
      (name) => {
        const wallet = this.wallets[name];
        return wallet.address.toLowerCase() !== this.roles.owner.toLowerCase() &&
               wallet.address.toLowerCase() !== this.roles.broadcaster.toLowerCase() &&
               wallet.address.toLowerCase() !== this.roles.recovery.toLowerCase();
      }
    );

    if (availableWallets.length === 0) {
      throw new Error('No available wallet for test target');
    }

    this.testTarget = this.wallets[availableWallets[0]].address;
    console.log(`📋 Test Target Address: ${this.testTarget}`);

    // First, register the function selector (required before adding targets to whitelist)
    await this.testStep0RegisterFunction();
    await this.testStep1AddTargetToWhitelist();
    await this.testStep2VerifyTargetWhitelisted();
    await this.testStep3QueryAllowedTargets();
    await this.testStep4RemoveTargetFromWhitelist();
    await this.testStep5VerifyTargetRemoved();
  }

  async testStep0RegisterFunction(): Promise<void> {
    console.log('\n🧪 Test: Register Function Selector');
    console.log('─'.repeat(60));

    try {
      if (!this.guardController) {
        throw new Error('GuardController not initialized');
      }

      console.log('📋 Step 0: Register function selector before adding targets to whitelist');
      console.log(`   Function Selector: ${this.NATIVE_TRANSFER_SELECTOR}`);
      console.log(`   Function Signature: __bloxchain_native_transfer__()`);
      console.log(`   Operation Name: NATIVE_TRANSFER`);

      // Check if function is already registered
      const alreadyRegistered = await this.guardController.functionSchemaExists(this.NATIVE_TRANSFER_SELECTOR);
      if (alreadyRegistered) {
        console.log('  ℹ️  Function selector already registered, skipping registration');
        this.assertTest(true, `Function selector ${this.NATIVE_TRANSFER_SELECTOR} already registered`);
        return;
      }

      // Get owner and broadcaster wallets
      const ownerWallet = this.getRoleWallet('owner');
      const broadcasterWallet = this.getRoleWallet('broadcaster');
      
      const ownerWalletName = Object.keys(this.wallets).find(
        (k) => this.wallets[k].address.toLowerCase() === ownerWallet.address.toLowerCase()
      ) || 'wallet1';

      // Create signed meta-transaction for function registration
      console.log('  📝 Creating signed meta-transaction for function registration...');
      const signedMetaTx = await this.createSignedMetaTxForFunctionRegistration(
        '__bloxchain_native_transfer__()',
        'NATIVE_TRANSFER',
        [TxAction.EXECUTE_META_REQUEST_AND_APPROVE], // Supported actions
        ownerWalletName
      );

      console.log('  ✅ Meta-transaction created and signed');
      console.log(`     Signer: ${signedMetaTx.params.signer}`);
      console.log(`     Message Hash: ${signedMetaTx.message}`);

      // Execute via broadcaster
      console.log('  📝 Executing meta-transaction via broadcaster...');
      const broadcasterGuardController = this.createGuardControllerWithWallet(
        Object.keys(this.wallets).find(
          (k) => this.wallets[k].address.toLowerCase() === broadcasterWallet.address.toLowerCase()
        ) || 'wallet2'
      );

      const result = await broadcasterGuardController.guardConfigBatchRequestAndApprove(
        signedMetaTx,
        { from: broadcasterWallet.address }
      );

      const receipt = await result.wait();

      console.log('  ✅ Function selector registered successfully');
      console.log(`     Transaction Hash: ${result.hash}`);
      console.log(`     Transaction Status: ${receipt.status === 'success' ? 'SUCCESS' : 'FAILED'}`);

      // Wait for state to update and retry (chain propagation / indexing delay)
      const maxRetries = 5;
      const retryDelayMs = 2000;
      let isRegistered = false;
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        console.log(`  ⏳ Waiting for state to update (attempt ${attempt}/${maxRetries})...`);
        await new Promise((resolve) => setTimeout(resolve, retryDelayMs));
        isRegistered = await this.guardController.functionSchemaExists(this.NATIVE_TRANSFER_SELECTOR);
        if (isRegistered) break;
      }
      if (!isRegistered) {
        throw new Error(`Function selector ${this.NATIVE_TRANSFER_SELECTOR} registration did not persist after ${maxRetries} retries - transaction may have reverted`);
      }
      console.log(`  ✅ Verified function selector is registered: ${isRegistered}`);

      this.assertTest(true, `Function selector ${this.NATIVE_TRANSFER_SELECTOR} registered successfully`);
    } catch (error: any) {
      this.handleTestError('Register function selector', error);
      throw error;
    }
  }

  async testStep1AddTargetToWhitelist(): Promise<void> {
    console.log('\n🧪 Test: Add Target to Whitelist via Meta-Transaction');
    console.log('─'.repeat(60));

    try {
      if (!this.guardController || !this.testTarget) {
        throw new Error('GuardController or testTarget not initialized');
      }

      console.log('📋 Step 1: Add target to whitelist using meta-transaction workflow');
      console.log(`   Function Selector: ${this.NATIVE_TRANSFER_SELECTOR}`);
      console.log(`   Target: ${this.testTarget}`);
      console.log(`   Operation: ADD`);

      // Get owner and broadcaster wallets
      const ownerWallet = this.getRoleWallet('owner');
      const broadcasterWallet = this.getRoleWallet('broadcaster');
      
      const ownerWalletName = Object.keys(this.wallets).find(
        (k) => this.wallets[k].address.toLowerCase() === ownerWallet.address.toLowerCase()
      ) || 'wallet1';

      // Create signed meta-transaction
      console.log('  📝 Creating signed meta-transaction...');
      const signedMetaTx = await this.createSignedMetaTxForWhitelistUpdate(
        this.NATIVE_TRANSFER_SELECTOR,
        this.testTarget,
        true, // isAdd = true
        ownerWalletName
      );

      console.log('  ✅ Meta-transaction created and signed');
      console.log(`     Signer: ${signedMetaTx.params.signer}`);
      console.log(`     Message Hash: ${signedMetaTx.message}`);

      // Execute via broadcaster
      console.log('  📝 Executing meta-transaction via broadcaster...');
      const broadcasterGuardController = this.createGuardControllerWithWallet(
        Object.keys(this.wallets).find(
          (k) => this.wallets[k].address.toLowerCase() === broadcasterWallet.address.toLowerCase()
        ) || 'wallet2'
      );

      const result = await broadcasterGuardController.guardConfigBatchRequestAndApprove(
        signedMetaTx,
        { from: broadcasterWallet.address }
      );

      const receipt = await result.wait();

      console.log('  ✅ Target added to whitelist successfully');
      console.log(`     Transaction Hash: ${result.hash}`);
      console.log(`     Transaction Status: ${receipt.status === 'success' ? 'SUCCESS' : 'FAILED'}`);
      
      // Check for GuardConfigApplied event
      if (receipt.logs && receipt.logs.length > 0) {
        console.log(`     Events emitted: ${receipt.logs.length}`);
      }

      // Wait a bit for state to update
      console.log('  ⏳ Waiting for state to update...');
      await new Promise((resolve) => setTimeout(resolve, 2000));

      this.assertTest(true, `Target ${this.testTarget} added to whitelist successfully`);
    } catch (error: any) {
      this.handleTestError('Add target to whitelist', error);
      throw error;
    }
  }

  async testStep2VerifyTargetWhitelisted(): Promise<void> {
    console.log('\n🧪 Test: Verify Target is Whitelisted');
    console.log('─'.repeat(60));

    try {
      if (!this.guardController || !this.testTarget) {
        throw new Error('GuardController or testTarget not initialized');
      }

      console.log('📋 Step 2: Verify target is in whitelist');

      // First verify function is registered
      const isFunctionRegistered = await this.guardController.functionSchemaExists(this.NATIVE_TRANSFER_SELECTOR);
      console.log(`  📋 Function selector registered: ${isFunctionRegistered}`);
      if (!isFunctionRegistered) {
        throw new Error(`Function selector ${this.NATIVE_TRANSFER_SELECTOR} is not registered`);
      }

      // Use owner wallet for query (needed for _validateAnyRole check)
      const ownerWallet = this.getRoleWallet('owner');
      const ownerWalletName = Object.keys(this.wallets).find(
        (k) => this.wallets[k].address.toLowerCase() === ownerWallet.address.toLowerCase()
      ) || 'wallet1';
      
      const ownerGuardController = this.createGuardControllerWithWallet(ownerWalletName);

      // Query allowed targets using owner's GuardController instance
      const allowedTargets = await ownerGuardController.getFunctionWhitelistTargets(
        this.NATIVE_TRANSFER_SELECTOR
      );

      console.log(`  📋 Allowed targets: ${allowedTargets.length} found`);
      allowedTargets.forEach((target, index) => {
        console.log(`     ${index + 1}. ${target}`);
      });

      // Check if test target is in the list
      const isWhitelisted = allowedTargets.some(
        (target) => target.toLowerCase() === this.testTarget!.toLowerCase()
      );

      const expectedIsWhitelisted = true;
      this.assertTest(
        isWhitelisted === expectedIsWhitelisted,
        `Target is whitelisted (expected: ${expectedIsWhitelisted}, actual: ${isWhitelisted})`
      );

      console.log('  ✅ Target verified as whitelisted');

      this.assertTest(true, `Target ${this.testTarget} found in whitelist`);
    } catch (error: any) {
      this.handleTestError('Verify target is whitelisted', error);
      throw error;
    }
  }

  async testStep3QueryAllowedTargets(): Promise<void> {
    console.log('\n🧪 Test: Query All Allowed Targets');
    console.log('─'.repeat(60));

    try {
      if (!this.guardController) {
        throw new Error('GuardController not initialized');
      }

      console.log('📋 Step 3: Query all allowed targets for function selector');

      // Use owner wallet for query (needed for _validateAnyRole check)
      const ownerWallet = this.getRoleWallet('owner');
      const ownerWalletName = Object.keys(this.wallets).find(
        (k) => this.wallets[k].address.toLowerCase() === ownerWallet.address.toLowerCase()
      ) || 'wallet1';
      
      const ownerGuardController = this.createGuardControllerWithWallet(ownerWalletName);

      const allowedTargets = await ownerGuardController.getFunctionWhitelistTargets(
        this.NATIVE_TRANSFER_SELECTOR
      );

      const expectedMinTargets = 1;
      const actualTargets = allowedTargets.length;
      this.assertTest(
        actualTargets >= expectedMinTargets,
        `At least one target whitelisted (expected: >= ${expectedMinTargets}, actual: ${actualTargets})`
      );

      console.log(`  ✅ Query successful: ${actualTargets} target(s) found`);
      allowedTargets.forEach((target, index) => {
        console.log(`     ${index + 1}. ${target}`);
      });

      this.assertTest(true, `Query successful: ${actualTargets} target(s) found`);
    } catch (error: any) {
      this.handleTestError('Query allowed targets', error);
      throw error;
    }
  }

  async testStep4RemoveTargetFromWhitelist(): Promise<void> {
    console.log('\n🧪 Test: Remove Target from Whitelist via Meta-Transaction');
    console.log('─'.repeat(60));

    try {
      if (!this.guardController || !this.testTarget) {
        throw new Error('GuardController or testTarget not initialized');
      }

      console.log('📋 Step 4: Remove target from whitelist using meta-transaction workflow');
      console.log(`   Function Selector: ${this.NATIVE_TRANSFER_SELECTOR}`);
      console.log(`   Target: ${this.testTarget}`);
      console.log(`   Operation: REMOVE`);

      // Get owner and broadcaster wallets
      const ownerWallet = this.getRoleWallet('owner');
      const broadcasterWallet = this.getRoleWallet('broadcaster');
      
      const ownerWalletName = Object.keys(this.wallets).find(
        (k) => this.wallets[k].address.toLowerCase() === ownerWallet.address.toLowerCase()
      ) || 'wallet1';

      // Create signed meta-transaction
      console.log('  📝 Creating signed meta-transaction...');
      const signedMetaTx = await this.createSignedMetaTxForWhitelistUpdate(
        this.NATIVE_TRANSFER_SELECTOR,
        this.testTarget,
        false, // isAdd = false (remove)
        ownerWalletName
      );

      console.log('  ✅ Meta-transaction created and signed');
      console.log(`     Signer: ${signedMetaTx.params.signer}`);
      console.log(`     Message Hash: ${signedMetaTx.message}`);

      // Execute via broadcaster
      console.log('  📝 Executing meta-transaction via broadcaster...');
      const broadcasterGuardController = this.createGuardControllerWithWallet(
        Object.keys(this.wallets).find(
          (k) => this.wallets[k].address.toLowerCase() === broadcasterWallet.address.toLowerCase()
        ) || 'wallet2'
      );

      const result = await broadcasterGuardController.guardConfigBatchRequestAndApprove(
        signedMetaTx,
        { from: broadcasterWallet.address }
      );

      await result.wait();

      console.log('  ✅ Target removed from whitelist successfully');
      console.log(`     Transaction Hash: ${result.hash}`);

      // Wait a bit for state to update
      console.log('  ⏳ Waiting for state to update...');
      await new Promise((resolve) => setTimeout(resolve, 1000));

      this.assertTest(true, `Target ${this.testTarget} removed from whitelist successfully`);
    } catch (error: any) {
      this.handleTestError('Remove target from whitelist', error);
      throw error;
    }
  }

  async testStep5VerifyTargetRemoved(): Promise<void> {
    console.log('\n🧪 Test: Verify Target is Removed from Whitelist');
    console.log('─'.repeat(60));

    try {
      if (!this.guardController || !this.testTarget) {
        throw new Error('GuardController or testTarget not initialized');
      }

      console.log('📋 Step 5: Verify target is no longer in whitelist');

      // Use owner wallet for query (needed for _validateAnyRole check)
      const ownerWallet = this.getRoleWallet('owner');
      const ownerWalletName = Object.keys(this.wallets).find(
        (k) => this.wallets[k].address.toLowerCase() === ownerWallet.address.toLowerCase()
      ) || 'wallet1';
      
      const ownerGuardController = this.createGuardControllerWithWallet(ownerWalletName);

      // Query allowed targets using owner's GuardController instance
      const allowedTargets = await ownerGuardController.getFunctionWhitelistTargets(
        this.NATIVE_TRANSFER_SELECTOR
      );

      console.log(`  📋 Allowed targets: ${allowedTargets.length} found`);
      allowedTargets.forEach((target, index) => {
        console.log(`     ${index + 1}. ${target}`);
      });

      // Check if test target is NOT in the list
      const isWhitelisted = allowedTargets.some(
        (target) => target.toLowerCase() === this.testTarget!.toLowerCase()
      );

      const expectedIsWhitelisted = false;
      this.assertTest(
        isWhitelisted === expectedIsWhitelisted,
        `Target is not whitelisted (expected: ${expectedIsWhitelisted}, actual: ${isWhitelisted})`
      );

      console.log('  ✅ Target verified as removed from whitelist');

      this.assertTest(true, `Target ${this.testTarget} not found in whitelist (removed successfully)`);
    } catch (error: any) {
      this.handleTestError('Verify target is removed', error);
      throw error;
    }
  }
}
