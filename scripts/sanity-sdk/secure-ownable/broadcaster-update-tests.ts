/**
 * Broadcaster Update Tests
 * Comprehensive tests for broadcaster address update workflow using SDK
 * Tests all 4 options: meta-cancel, timelock-cancel, meta-approve, timelock-approve
 */

import { Address } from 'viem';
import { BaseSecureOwnableTest } from './base-test.ts';
import { TxAction } from '../../../sdk/typescript/types/lib.index.tsx';
import { FUNCTION_SELECTORS, OPERATION_TYPES } from '../../../sdk/typescript/types/core.access.index.tsx';

export class BroadcasterUpdateTests extends BaseSecureOwnableTest {
  constructor() {
    super('Broadcaster Update Tests');
  }

  async executeTests(): Promise<void> {
    console.log('\n🔄 TESTING COMPLETE BROADCASTER UPDATE WORKFLOW');
    console.log('==================================================');
    console.log('📋 This workflow tests all 4 broadcaster update options:');
    console.log('   1. Meta-transaction Cancellation (immediate)');
    console.log('   2. Time Delay Cancellation (requires wait)');
    console.log('   3. Meta-transaction Approval (immediate)');
    console.log('   4. Time Delay Approval (requires wait)');

    await this.clearPendingSecureRequests();
    await this.testMetaTransactionCancellation();
    await this.testTimeDelayCancellation();
    await this.testMetaTransactionApproval();
    await this.testTimeDelayApproval();
  }

  /**
   * Clear any pending secure requests so updateBroadcasterRequest() does not revert with PendingSecureRequest.
   */
  private async clearPendingSecureRequests(): Promise<void> {
    if (!this.secureOwnable) return;
    try {
      const pendingTxs = await this.secureOwnable.getPendingTransactions();
      if (pendingTxs.length === 0) return;
      for (const txId of pendingTxs) {
        try {
          const tx = await this.secureOwnable.getTransaction(txId);
          const op = tx.params?.operationType?.toLowerCase?.();
          if (op === OPERATION_TYPES.OWNERSHIP_TRANSFER.toLowerCase()) {
            const recoveryWallet = this.getRoleWallet('recovery');
            const recoveryWalletName = Object.keys(this.wallets).find(
              (k) => this.wallets[k].address.toLowerCase() === recoveryWallet.address.toLowerCase()
            ) || 'wallet1';
            await this.waitForTimelockWithTxId(txId);
            await this.createSecureOwnableWithWallet(recoveryWalletName).transferOwnershipCancellation(
              txId,
              this.getTxOptions(recoveryWallet.address)
            );
          } else if (op === OPERATION_TYPES.BROADCASTER_UPDATE.toLowerCase()) {
            const ownerWallet = this.getRoleWallet('owner');
            const ownerWalletName = Object.keys(this.wallets).find(
              (k) => this.wallets[k].address.toLowerCase() === ownerWallet.address.toLowerCase()
            ) || 'wallet1';
            await this.waitForTimelockWithTxId(txId);
            await this.createSecureOwnableWithWallet(ownerWalletName).updateBroadcasterCancellation(
              txId,
              this.getTxOptions(ownerWallet.address)
            );
          }
          await new Promise((r) => setTimeout(r, 1000));
        } catch (_) {}
      }
    } catch (_) {}
  }

  async testMetaTransactionCancellation(): Promise<void> {
    console.log('\n📝 SECTION 1: Testing Meta-transaction Cancellation');
    console.log('----------------------------------------------------');
    console.log('⚡ This test provides instant cancellation (bypasses timelock)');

    if (!this.secureOwnable) {
      throw new Error('SecureOwnable SDK not initialized');
    }

    try {
      // Find unused wallet for broadcaster update
      const currentBroadcaster = this.roles.broadcaster;
      const newBroadcaster = this.findUnusedWallet(currentBroadcaster);
      console.log(`  📡 Current broadcaster: ${currentBroadcaster}`);
      console.log(`  📡 New broadcaster: ${newBroadcaster}`);

      // Owner creates broadcaster update request
      const ownerWallet = this.getRoleWallet('owner');
      const ownerWalletName = Object.keys(this.wallets).find(
        (k) => this.wallets[k].address.toLowerCase() === ownerWallet.address.toLowerCase()
      ) || 'wallet1';

      const secureOwnableOwner = this.createSecureOwnableWithWallet(ownerWalletName);
      const result = await secureOwnableOwner.updateBroadcasterRequest(newBroadcaster, 0n, this.getTxOptions(ownerWallet.address));

      await result.wait();
      await new Promise(resolve => setTimeout(resolve, 1000));

      const pendingTxs = await this.secureOwnable.getPendingTransactions();
      this.assertTest(pendingTxs.length > 0, 'Pending transaction found');
      const txId = pendingTxs[pendingTxs.length - 1];
      console.log(`  📋 Transaction ID: ${txId}`);

      // Get broadcaster wallet name
      const broadcasterWalletName = Object.keys(this.wallets).find(
        (k) => this.wallets[k].address.toLowerCase() === this.roles.broadcaster.toLowerCase()
      ) || 'wallet2';

      // Owner signs meta-transaction cancellation
      console.log('  🔐 Owner signing meta-transaction cancellation...');
      const signedMetaTx = await this.createSignedMetaTxForExisting(
        txId,
        FUNCTION_SELECTORS.UPDATE_BROADCASTER_CANCEL_META_SELECTOR,
        TxAction.SIGN_META_CANCEL,
        ownerWalletName
      );
      this.assertTest(!!signedMetaTx.signature && signedMetaTx.signature.length > 0, 'Meta-transaction signed successfully');

      // Broadcaster executes meta-transaction
      console.log('  📡 Broadcaster executing meta-transaction cancellation...');
      const secureOwnableBroadcaster = this.createSecureOwnableWithWallet(broadcasterWalletName);
      const executeResult = await secureOwnableBroadcaster.updateBroadcasterCancellationWithMetaTx(
        signedMetaTx,
        this.getTxOptions(this.roles.broadcaster)
      );

      await executeResult.wait();
      await new Promise(resolve => setTimeout(resolve, 1000));

      const tx = await this.secureOwnable.getTransaction(txId);
      this.assertTest(Number(tx.status) === 4, 'Transaction cancelled successfully'); // CANCELLED = 4

      console.log('  🎉 Meta-transaction cancellation executed successfully');
    } catch (error: any) {
      console.log(`  ❌ Meta-transaction cancellation failed: ${error.message}`);
      throw error;
    }
  }

  async testTimeDelayCancellation(): Promise<void> {
    console.log('\n📝 SECTION 2: Testing Time Delay Cancellation');
    console.log('---------------------------------------------');
    console.log('⏰ This test requires waiting for timelock...');

    if (!this.secureOwnable) {
      throw new Error('SecureOwnable SDK not initialized');
    }

    try {
      // Find unused wallet for broadcaster update
      const currentBroadcaster = this.roles.broadcaster;
      const newBroadcaster = this.findUnusedWallet(currentBroadcaster);

      // Owner creates broadcaster update request
      const ownerWallet = this.getRoleWallet('owner');
      const ownerWalletName = Object.keys(this.wallets).find(
        (k) => this.wallets[k].address.toLowerCase() === ownerWallet.address.toLowerCase()
      ) || 'wallet1';

      const secureOwnableOwner = this.createSecureOwnableWithWallet(ownerWalletName);
      const result = await secureOwnableOwner.updateBroadcasterRequest(newBroadcaster, 0n, this.getTxOptions(ownerWallet.address));

      await result.wait();
      await new Promise(resolve => setTimeout(resolve, 1000));

      const pendingTxs = await this.secureOwnable.getPendingTransactions();
      this.assertTest(pendingTxs.length > 0, 'Pending transaction found');
      const txId = pendingTxs[pendingTxs.length - 1];

      // Wait for timelock
      await this.waitForTimelockWithTxId(txId);

      // Owner cancels after timelock
      const cancelResult = await secureOwnableOwner.updateBroadcasterCancellation(txId, this.getTxOptions(ownerWallet.address));

      await cancelResult.wait();
      await new Promise(resolve => setTimeout(resolve, 1000));

      const tx = await this.secureOwnable.getTransaction(txId);
      this.assertTest(Number(tx.status) === 4, 'Transaction cancelled successfully'); // CANCELLED = 4

      console.log('  🎉 Time delay cancellation executed successfully');
    } catch (error: any) {
      console.log(`  ❌ Time delay cancellation failed: ${error.message}`);
      throw error;
    }
  }

  async testMetaTransactionApproval(): Promise<void> {
    console.log('\n📝 SECTION 3: Testing Meta-transaction Approval');
    console.log('-----------------------------------------------');
    console.log('⚡ This test provides instant approval (bypasses timelock)');

    if (!this.secureOwnable) {
      throw new Error('SecureOwnable SDK not initialized');
    }

    try {
      // Find unused wallet for broadcaster update
      const currentBroadcaster = this.roles.broadcaster;
      const newBroadcaster = this.findUnusedWallet(currentBroadcaster);

      // Owner creates broadcaster update request
      const ownerWallet = this.getRoleWallet('owner');
      const ownerWalletName = Object.keys(this.wallets).find(
        (k) => this.wallets[k].address.toLowerCase() === ownerWallet.address.toLowerCase()
      ) || 'wallet1';

      const secureOwnableOwner = this.createSecureOwnableWithWallet(ownerWalletName);
      const result = await secureOwnableOwner.updateBroadcasterRequest(newBroadcaster, 0n, this.getTxOptions(ownerWallet.address));

      await result.wait();
      await new Promise(resolve => setTimeout(resolve, 1000));

      const pendingTxs = await this.secureOwnable.getPendingTransactions();
      this.assertTest(pendingTxs.length > 0, 'Pending transaction found');
      const txId = pendingTxs[pendingTxs.length - 1];

      // Get broadcaster wallet name
      const broadcasterWalletName = Object.keys(this.wallets).find(
        (k) => this.wallets[k].address.toLowerCase() === this.roles.broadcaster.toLowerCase()
      ) || 'wallet2';

      // Owner signs meta-transaction approval
      console.log('  🔐 Owner signing meta-transaction approval...');
      const signedMetaTx = await this.createSignedMetaTxForExisting(
        txId,
        FUNCTION_SELECTORS.UPDATE_BROADCASTER_APPROVE_META_SELECTOR,
        TxAction.SIGN_META_APPROVE,
        ownerWalletName
      );
      this.assertTest(!!signedMetaTx.signature && signedMetaTx.signature.length > 0, 'Meta-transaction signed successfully');

      // Broadcaster executes meta-transaction
      console.log('  📡 Broadcaster executing meta-transaction approval...');
      const secureOwnableBroadcaster = this.createSecureOwnableWithWallet(broadcasterWalletName);
      const executeResult = await secureOwnableBroadcaster.updateBroadcasterApprovalWithMetaTx(
        signedMetaTx,
        this.getTxOptions(this.roles.broadcaster)
      );

      await executeResult.wait();
      await new Promise(resolve => setTimeout(resolve, 1000));

      const tx = await this.secureOwnable.getTransaction(txId);
      this.assertTest(Number(tx.status) === 5, 'Transaction completed successfully'); // COMPLETED = 5

      // Verify broadcaster changed
      const updatedBroadcasters = await this.secureOwnable.getBroadcasters();
      const updatedBroadcaster = updatedBroadcasters.length > 0 ? updatedBroadcasters[0] : null;
      this.assertTest(
        updatedBroadcaster !== null && updatedBroadcaster.toLowerCase() === newBroadcaster.toLowerCase(),
        'Broadcaster updated successfully'
      );

      // Update internal role tracking
      this.roles.broadcaster = updatedBroadcaster;
      const broadcasterWallet = Object.keys(this.wallets).find(
        (k) => this.wallets[k].address.toLowerCase() === updatedBroadcaster.toLowerCase()
      );
      if (broadcasterWallet) {
        this.roleWallets.broadcaster = this.wallets[broadcasterWallet];
      }

      console.log('  🎉 Meta-transaction approval executed successfully');
    } catch (error: any) {
      console.log(`  ❌ Meta-transaction approval failed: ${error.message}`);
      throw error;
    }
  }

  async testTimeDelayApproval(): Promise<void> {
    console.log('\n📝 SECTION 4: Testing Time Delay Approval');
    console.log('----------------------------------------');
    console.log('⏰ This test requires waiting for timelock...');

    if (!this.secureOwnable) {
      throw new Error('SecureOwnable SDK not initialized');
    }

    try {
      // Find unused wallet for broadcaster update
      const currentBroadcaster = this.roles.broadcaster;
      const newBroadcaster = this.findUnusedWallet(currentBroadcaster);

      // Owner creates broadcaster update request
      const ownerWallet = this.getRoleWallet('owner');
      const ownerWalletName = Object.keys(this.wallets).find(
        (k) => this.wallets[k].address.toLowerCase() === ownerWallet.address.toLowerCase()
      ) || 'wallet1';

      const secureOwnableOwner = this.createSecureOwnableWithWallet(ownerWalletName);
      const result = await secureOwnableOwner.updateBroadcasterRequest(newBroadcaster, 0n, this.getTxOptions(ownerWallet.address));

      await result.wait();
      await new Promise(resolve => setTimeout(resolve, 1000));

      const pendingTxs = await this.secureOwnable.getPendingTransactions();
      this.assertTest(pendingTxs.length > 0, 'Pending transaction found');
      const txId = pendingTxs[pendingTxs.length - 1];

      // Wait for timelock
      await this.waitForTimelockWithTxId(txId);

      // Owner approves after timelock
      const approveResult = await secureOwnableOwner.updateBroadcasterDelayedApproval(txId, this.getTxOptions(ownerWallet.address));

      await approveResult.wait();
      await new Promise(resolve => setTimeout(resolve, 1000));

      const tx = await this.secureOwnable.getTransaction(txId);
      this.assertTest(Number(tx.status) === 5, 'Transaction completed successfully'); // COMPLETED = 5

      // Verify broadcaster changed
      const updatedBroadcasters = await this.secureOwnable.getBroadcasters();
      const updatedBroadcaster = updatedBroadcasters.length > 0 ? updatedBroadcasters[0] : null;
      this.assertTest(
        updatedBroadcaster !== null && updatedBroadcaster.toLowerCase() === newBroadcaster.toLowerCase(),
        'Broadcaster updated successfully'
      );

      console.log('  🎉 Time delay approval executed successfully');
    } catch (error: any) {
      console.log(`  ❌ Time delay approval failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Find an unused wallet for broadcaster update
   */
  private findUnusedWallet(excludeAddress: Address): Address {
    for (const wallet of Object.values(this.wallets)) {
      if (wallet.address.toLowerCase() !== excludeAddress.toLowerCase()) {
        return wallet.address;
      }
    }
    throw new Error('No unused wallet found');
  }
}

