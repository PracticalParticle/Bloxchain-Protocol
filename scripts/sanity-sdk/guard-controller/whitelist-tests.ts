/**
 * Whitelist Management Tests
 * Comprehensive tests for target whitelist management using SDK
 */

import { Address, Hex } from 'viem';
import { BaseGuardControllerTest } from './base-test';

export class WhitelistTests extends BaseGuardControllerTest {
  private ownerRoleHash: Hex | null = null;
  private testTarget: Address | null = null;

  constructor() {
    super('Whitelist Management Tests');
  }

  async executeTests(): Promise<void> {
    console.log('\n🔄 TESTING COMPLETE WHITELIST MANAGEMENT WORKFLOW');
    console.log('==================================================');
    console.log('📋 This workflow tests the complete whitelist management cycle using SDK:');
    console.log('   1. Get owner role hash');
    console.log('   2. Add target to whitelist via meta-transaction (owner signs, broadcaster executes)');
    console.log('   3. Verify target is whitelisted');
    console.log('   4. Query all whitelisted targets');
    console.log('   5. Remove target from whitelist via meta-transaction');
    console.log('   6. Verify target is removed');

    // Get owner role hash
    this.ownerRoleHash = this.getRoleHash('OWNER_ROLE');
    console.log(`\n📋 Owner Role Hash: ${this.ownerRoleHash}`);

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

    await this.testStep1AddTargetToWhitelist();
    await this.testStep2VerifyTargetWhitelisted();
    await this.testStep3QueryAllowedTargets();
    await this.testStep4RemoveTargetFromWhitelist();
    await this.testStep5VerifyTargetRemoved();
  }

  async testStep1AddTargetToWhitelist(): Promise<void> {
    console.log('\n🧪 Test: Add Target to Whitelist via Meta-Transaction');
    console.log('─'.repeat(60));

    try {
      if (!this.guardController || !this.ownerRoleHash || !this.testTarget) {
        throw new Error('GuardController, ownerRoleHash, or testTarget not initialized');
      }

      console.log('📋 Step 1: Add target to whitelist using meta-transaction workflow');
      console.log(`   Role Hash: ${this.ownerRoleHash}`);
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
        this.ownerRoleHash,
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

      const result = await broadcasterGuardController.updateTargetWhitelistRequestAndApprove(
        signedMetaTx,
        { from: broadcasterWallet.address }
      );

      await result.wait();

      console.log('  ✅ Target added to whitelist successfully');
      console.log(`     Transaction Hash: ${result.hash}`);

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
      if (!this.guardController || !this.ownerRoleHash || !this.testTarget) {
        throw new Error('GuardController, ownerRoleHash, or testTarget not initialized');
      }

      console.log('📋 Step 2: Verify target is in whitelist');

      // Query allowed targets
      const allowedTargets = await this.guardController.getAllowedTargets(
        this.ownerRoleHash,
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
      if (!this.guardController || !this.ownerRoleHash) {
        throw new Error('GuardController or ownerRoleHash not initialized');
      }

      console.log('📋 Step 3: Query all allowed targets for role and function selector');

      const allowedTargets = await this.guardController.getAllowedTargets(
        this.ownerRoleHash,
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
      if (!this.guardController || !this.ownerRoleHash || !this.testTarget) {
        throw new Error('GuardController, ownerRoleHash, or testTarget not initialized');
      }

      console.log('📋 Step 4: Remove target from whitelist using meta-transaction workflow');
      console.log(`   Role Hash: ${this.ownerRoleHash}`);
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
        this.ownerRoleHash,
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

      const result = await broadcasterGuardController.updateTargetWhitelistRequestAndApprove(
        signedMetaTx,
        { from: broadcasterWallet.address }
      );

      await result.wait();

      console.log('  ✅ Target removed from whitelist successfully');
      console.log(`     Transaction Hash: ${result.hash}`);

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
      if (!this.guardController || !this.ownerRoleHash || !this.testTarget) {
        throw new Error('GuardController, ownerRoleHash, or testTarget not initialized');
      }

      console.log('📋 Step 5: Verify target is no longer in whitelist');

      // Query allowed targets
      const allowedTargets = await this.guardController.getAllowedTargets(
        this.ownerRoleHash,
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
