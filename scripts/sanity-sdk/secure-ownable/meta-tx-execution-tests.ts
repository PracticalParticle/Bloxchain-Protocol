/**
 * Meta-Transaction Execution Tests
 * Full off-chain signature + on-chain execution test (no UI).
 * Flow: request → sign meta-tx → broadcaster executes → assert on-chain state.
 */

import { Address } from 'viem';
import { BaseSecureOwnableTest } from './base-test.ts';
import { TxAction } from '../../../sdk/typescript/types/lib.index.tsx';
import { FUNCTION_SELECTORS } from '../../../sdk/typescript/types/core.access.index.tsx';

export class MetaTxExecutionTests extends BaseSecureOwnableTest {
  constructor() {
    super('Meta-Transaction Execution Tests');
  }

  async executeTests(): Promise<void> {
    console.log('\n⚡ TESTING META-TRANSACTION EXECUTION (FULL FLOW)');
    console.log('==================================================');
    console.log('📋 Flow: request → off-chain sign → broadcaster executes → assert on-chain');
    await this.testMetaTxApprovalExecution();
  }

  /**
   * Full meta-tx execution: owner requests → owner signs → broadcaster executes → assert broadcaster changed.
   */
  async testMetaTxApprovalExecution(): Promise<void> {
    console.log('\n📝 Meta-transaction approval execution');
    console.log('-'.repeat(40));

    if (!this.secureOwnable) {
      throw new Error('SecureOwnable SDK not initialized');
    }

    const currentBroadcaster = this.roles.broadcaster;
    const newBroadcaster = this.findUnusedWallet(currentBroadcaster);
    console.log(`  📡 Current broadcaster: ${currentBroadcaster}`);
    console.log(`  📡 New broadcaster (requested): ${newBroadcaster}`);

    const ownerWallet = this.getRoleWallet('owner');
    const ownerWalletName = Object.keys(this.wallets).find(
      (k) => this.wallets[k].address.toLowerCase() === ownerWallet.address.toLowerCase()
    ) || 'wallet1';

    const secureOwnableOwner = this.createSecureOwnableWithWallet(ownerWalletName);
    const result = await secureOwnableOwner.updateBroadcasterRequest(newBroadcaster, 0n, {
      from: ownerWallet.address,
    });

    await result.wait();
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const pendingTxs = await this.secureOwnable.getPendingTransactions();
    this.assertTest(pendingTxs.length > 0, 'Pending transaction found');
    const txId = pendingTxs[pendingTxs.length - 1];
    console.log(`  📋 Transaction ID: ${txId}`);

    const broadcasterWalletName = Object.keys(this.wallets).find(
      (k) => this.wallets[k].address.toLowerCase() === this.roles.broadcaster.toLowerCase()
    ) || 'wallet2';

    console.log('  🔐 Owner signing meta-transaction approval (off-chain)...');
    const signedMetaTx = await this.createSignedMetaTxForExisting(
      txId,
      FUNCTION_SELECTORS.UPDATE_BROADCASTER_APPROVE_META_SELECTOR,
      TxAction.SIGN_META_APPROVE,
      ownerWalletName
    );
    this.assertTest(!!signedMetaTx.signature && signedMetaTx.signature.length > 0, 'Meta-transaction signed');

    console.log('  📡 Broadcaster executing meta-transaction on-chain...');
    const secureOwnableBroadcaster = this.createSecureOwnableWithWallet(broadcasterWalletName);
    const executeResult = await secureOwnableBroadcaster.updateBroadcasterApprovalWithMetaTx(
      signedMetaTx,
      { from: this.roles.broadcaster }
    );

    await executeResult.wait();
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const tx = await this.secureOwnable.getTransaction(txId);
    this.assertTest(Number(tx.status) === 5, 'Transaction completed on-chain'); // COMPLETED = 5

    const updatedBroadcasters = await this.secureOwnable.getBroadcasters();
    const updatedBroadcaster = updatedBroadcasters.length > 0 ? updatedBroadcasters[0] : null;
    this.assertTest(
      updatedBroadcaster !== null && updatedBroadcaster.toLowerCase() === newBroadcaster.toLowerCase(),
      'Broadcaster updated on-chain (state asserted)'
    );

    console.log(`  ✅ On-chain broadcaster after execution: ${updatedBroadcaster}`);
    console.log('  🎉 Meta-transaction execution test passed');
  }

  private findUnusedWallet(excludeAddress: Address): Address {
    for (const wallet of Object.values(this.wallets)) {
      if (wallet.address.toLowerCase() !== excludeAddress.toLowerCase()) {
        return wallet.address;
      }
    }
    throw new Error('No unused wallet found');
  }
}
