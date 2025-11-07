/**
 * Recovery Update Tests
 * Tests updating the recovery address via meta-transaction
 */

import { Address, Hex } from 'viem';
import { BaseSecureOwnableTest } from './base-test';
import { TxAction, ExecutionType } from '../../../sdk/typescript/types/lib.index';
import { FUNCTION_SELECTORS, OPERATION_TYPES } from '../../../sdk/typescript/types/core.access.index';

export class RecoveryUpdateTests extends BaseSecureOwnableTest {
  constructor() {
    super('Recovery Update Tests');
  }

  async executeTests(): Promise<void> {
    console.log('\n🔄 TESTING RECOVERY ADDRESS UPDATE');
    console.log('==================================================');
    console.log('📋 This test changes recovery to an unused wallet');
    console.log('   to ensure recovery ≠ owner for ownership transfer tests');

    // Check if recovery needs to be updated
    const owner = this.roles.owner;
    const recovery = this.roles.recovery;
    
    if (owner.toLowerCase() === recovery.toLowerCase()) {
      console.log('⚠️  Recovery equals owner - updating recovery to different address');
      await this.testRecoveryUpdate();
    } else {
      console.log('✅ Recovery already differs from owner');
      console.log(`   Owner: ${owner}`);
      console.log(`   Recovery: ${recovery}`);
      console.log('   Skipping recovery update test');
    }
  }

  async testRecoveryUpdate(): Promise<void> {
    console.log('\n📝 Testing Recovery Address Update via Meta-transaction');
    console.log('--------------------------------------------------------');

    if (!this.secureOwnable) {
      throw new Error('SecureOwnable SDK not initialized');
    }

    try {
      // Get current recovery and owner addresses
      const currentRecovery = await this.secureOwnable.getRecovery();
      const currentOwner = await this.roles.owner;

      console.log(`  👑 Owner address: ${currentOwner}`);
      console.log(`  🛡️ Current recovery address: ${currentRecovery}`);

      // Test recovery functionality by changing it and then changing it back
      if (currentRecovery.toLowerCase() !== currentOwner.toLowerCase()) {
        console.log('  📋 Recovery is different from owner - testing by changing to unused wallet then back to original');
        const newRecovery = this.findUnusedWalletForRecovery(currentRecovery);
        console.log(`  🔍 New recovery address: ${newRecovery}`);
        await this.testRecoveryChange(newRecovery, 'unused wallet');
        await this.testRecoveryChange(currentRecovery, 'original recovery');
      } else {
        console.log('  📋 Recovery is same as owner - testing by changing to unused wallet');
        const newRecovery = this.findUnusedWalletForRecovery(currentRecovery);
        console.log(`  🔍 New recovery address: ${newRecovery}`);
        await this.testRecoveryChange(newRecovery, 'unused wallet');
      }

      console.log('  🎉 Recovery functionality testing completed successfully!');
      console.log('  📋 Recovery is now different from owner for ownership transfer tests');
    } catch (error: any) {
      console.log(`  ❌ Recovery functionality testing failed: ${error.message}`);
      throw error;
    }
  }

  async testRecoveryChange(newRecoveryAddress: Address, description: string): Promise<void> {
    console.log(`  🎯 Testing recovery change to: ${description} (${newRecoveryAddress})`);

    if (!this.secureOwnable) {
      throw new Error('SecureOwnable SDK not initialized');
    }

    try {
      // Get owner wallet
      const ownerWallet = this.getRoleWallet('owner');
      const ownerWalletName = Object.keys(this.wallets).find(
        (k) => this.wallets[k].address.toLowerCase() === ownerWallet.address.toLowerCase()
      ) || 'wallet1';

      // Get execution options for recovery update
      const executionOptions = await this.secureOwnable.updateRecoveryExecutionOptions(newRecoveryAddress);
      console.log(`    ✅ Execution options created for ${description}`);

      // Create meta-transaction parameters
      const metaTxParams = await this.createMetaTxParams(
        FUNCTION_SELECTORS.UPDATE_RECOVERY_META_SELECTOR,
        TxAction.SIGN_META_REQUEST_AND_APPROVE,
        ownerWallet.address
      );

      // Create unsigned meta-transaction for new operation
      if (!this.metaTxSigner) {
        throw new Error('MetaTransactionSigner not initialized');
      }

      // Create txParams for new recovery update
      const txParams = {
        requester: ownerWallet.address,
        target: this.contractAddress!,
        value: BigInt(0),
        gasLimit: BigInt(0),
        operationType: OPERATION_TYPES.RECOVERY_UPDATE,
        executionType: ExecutionType.STANDARD,
        executionOptions: executionOptions
      };

      const unsignedMetaTx = await this.metaTxSigner.createUnsignedMetaTransactionForNew(
        txParams,
        metaTxParams
      );

      // Sign meta-transaction using private key (for remote Ganache compatibility)
      console.log(`    🔐 Signing meta-transaction for ${description}...`);
      const signedMetaTx = await this.metaTxSigner.signMetaTransaction(
        unsignedMetaTx,
        ownerWallet.address,
        ownerWallet.privateKey
      );
      this.assertTest(!!signedMetaTx.signature && signedMetaTx.signature.length > 0, 'Meta-transaction signed successfully');

      // Create fullMetaTx object matching sanity test structure
      const fullMetaTx = {
        txRecord: signedMetaTx.txRecord,
        params: signedMetaTx.params,
        message: signedMetaTx.message,
        signature: signedMetaTx.signature,
        data: signedMetaTx.data
      };

      // Execute meta-transaction using broadcaster wallet (matches sanity test pattern)
      console.log(`    📡 Executing meta-transaction for ${description}...`);
      const broadcasterWallet = this.getRoleWallet('broadcaster');
      const broadcasterWalletName = Object.keys(this.wallets).find(
        (k) => this.wallets[k].address.toLowerCase() === broadcasterWallet.address.toLowerCase()
      ) || 'wallet2';
      const secureOwnableBroadcaster = this.createSecureOwnableWithWallet(broadcasterWalletName);
      const result = await secureOwnableBroadcaster.updateRecoveryRequestAndApprove(
        fullMetaTx,
        { from: broadcasterWallet.address }
      );

      this.assertTest(!!result.hash, 'Recovery update transaction created');
      console.log(`    📋 Transaction Hash: ${result.hash}`);

      const receipt = await result.wait();
      // Viem receipt.status can be 'success' or 'reverted' (string), or 1/0 (number)
      const isSuccess = receipt.status === 'success' || (typeof receipt.status === 'number' && receipt.status === 1);
      this.assertTest(isSuccess, `Transaction succeeded (status: ${receipt.status})`);

      // Verify recovery changed
      await new Promise(resolve => setTimeout(resolve, 1000));
      const updatedRecovery = await this.secureOwnable.getRecovery();
      this.assertTest(
        updatedRecovery.toLowerCase() === newRecoveryAddress.toLowerCase(),
        `Recovery updated to ${description}`
      );

      // Update internal role tracking
      this.roles.recovery = updatedRecovery;
      const recoveryWallet = Object.keys(this.wallets).find(
        (k) => this.wallets[k].address.toLowerCase() === updatedRecovery.toLowerCase()
      );
      if (recoveryWallet) {
        this.roleWallets.recovery = this.wallets[recoveryWallet];
      }

      console.log(`    ✅ Recovery updated to ${description} successfully`);
    } catch (error: any) {
      console.log(`    ❌ Recovery change to ${description} failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find an unused wallet for recovery update
   */
  private findUnusedWalletForRecovery(excludeAddress?: Address): Address {
    const excludeList = excludeAddress ? [excludeAddress] : [];
    const excludeSet = new Set(
      excludeList
        .concat([
          this.roles.owner,
          this.roles.broadcaster,
          this.roles.recovery
        ])
        .map(addr => addr.toLowerCase())
    );

    // Find first wallet not in exclude set
    for (const wallet of Object.values(this.wallets)) {
      if (!excludeSet.has(wallet.address.toLowerCase())) {
        return wallet.address;
      }
    }
    throw new Error('No unused wallet found');
  }
}

