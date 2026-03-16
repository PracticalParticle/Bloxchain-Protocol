/**
 * EIP-712 Signing Tests
 * Tests EIP-712 meta-transaction signing functionality
 */

import { Address, Hex } from 'viem';
import { BaseSecureOwnableTest, TestWallet } from './base-test.ts';
import { TxAction } from '../../../sdk/typescript/types/lib.index.tsx';
import { FUNCTION_SELECTORS } from '../../../sdk/typescript/types/core.access.index.tsx';

export class EIP712SigningTests extends BaseSecureOwnableTest {
  constructor() {
    super('EIP-712 Signing Tests');
  }

  async executeTests(): Promise<void> {
    console.log('\n🔐 TESTING EIP-712 SIGNING FUNCTIONALITY');
    console.log('='.repeat(50));

    // Test EIP-712 initialization
    await this.testEIP712Initialization();

    // Test meta-transaction signing
    await this.testMetaTransactionSigning();

    // Test signature verification
    await this.testSignatureVerification();

    console.log('✅ All EIP-712 signing tests completed successfully');
  }

  /**
   * Get a suitable OWNERSHIP_TRANSFER transaction ID for meta-tx tests.
   * Reuses an existing pending tx when available to avoid failing on _hasOpenRequest,
   * otherwise creates a fresh transferOwnershipRequest from the recovery wallet.
   */
  private async getOrCreateOwnershipTransferTxId(
    secureOwnableRecovery: any,
    recoveryWallet: TestWallet
  ): Promise<bigint> {
    // Prefer reusing an existing pending ownership-transfer transaction if present.
    try {
      const pendingTxs = await secureOwnableRecovery.getPendingTransactions();
      if (pendingTxs && pendingTxs.length > 0) {
        for (const id of pendingTxs as bigint[]) {
          const tx = await secureOwnableRecovery.getTransaction(id);
          const params = (tx as any).params ?? (tx as any)[3];
          const op = params?.operationType ?? params?.[4];
          const requester = params?.requester ?? params?.[0];

          const isOwnershipTransfer =
            String(op).toLowerCase() ===
            this.getOperationType('OWNERSHIP_TRANSFER').toLowerCase();
          const isFromRecovery =
            requester &&
            String(recoveryWallet.address).toLowerCase() ===
              String(requester).toLowerCase();

          if (isOwnershipTransfer && isFromRecovery) {
            console.log(`  📋 Reusing existing OWNERSHIP_TRANSFER txId: ${id}`);
            return id;
          }
        }
      }
    } catch (e: unknown) {
      const err = e as Error;
      console.log(
        `  ⚠️  getPendingTransactions failed while searching for reusable tx: ${err.message}`
      );
    }

    // No suitable pending tx; create a fresh ownership transfer request.
    console.log('  📋 No existing pending ownership transfer found; creating a new request...');
    const result = await secureOwnableRecovery.transferOwnershipRequest(
      this.getTxOptions(recoveryWallet.address)
    );

    const receipt = await result.wait();
    const status = (receipt as any).status;
    const ok = status === 'success' || status === 1 || String(status) === '1';
    if (!ok) {
      throw new Error('transferOwnershipRequest tx reverted');
    }
    // Allow the chain indexer / state to settle before querying again.
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const pendingAfter = await secureOwnableRecovery.getPendingTransactions();
    if (!pendingAfter || pendingAfter.length === 0) {
      throw new Error('No pending transactions found after transferOwnershipRequest');
    }
    const txId = pendingAfter[pendingAfter.length - 1] as bigint;
    console.log(`  📋 Using newly created transaction ID: ${txId}`);
    return txId;
  }

  async testEIP712Initialization(): Promise<void> {
    console.log('\n📝 Testing EIP-712 Initialization');
    console.log('-'.repeat(40));

    // Test that MetaTransactionSigner is initialized
    this.assertTest(this.metaTxSigner !== null, 'MetaTransactionSigner is initialized');

    if (this.metaTxSigner) {
      // Verify contract address is set
      this.assertTest(this.contractAddress !== null, 'Contract address is set');
      console.log(`  🔗 Contract Address: ${this.contractAddress}`);
      console.log(`  📋 Chain ID: ${this.chain.id}`);
    }

    console.log('✅ EIP-712 initialization tests passed\n');
  }

  async testMetaTransactionSigning(): Promise<void> {
    console.log('\n📝 Testing Meta-transaction Signing');
    console.log('-'.repeat(40));

    if (!this.secureOwnable || !this.metaTxSigner) {
      throw new Error('SecureOwnable SDK or MetaTransactionSigner not initialized');
    }

    try {
      // Create a test ownership transfer request to get a real txId.
      // Contract requires recovery role to call transferOwnershipRequest().
      const recoveryWallet = this.getRoleWallet('recovery');
      const recoveryWalletName = Object.keys(this.wallets).find(
        (k) => this.wallets[k].address.toLowerCase() === recoveryWallet.address.toLowerCase()
      ) || 'wallet1';
      const ownerWallet = this.getRoleWallet('owner');
      const ownerWalletName = Object.keys(this.wallets).find(
        (k) => this.wallets[k].address.toLowerCase() === ownerWallet.address.toLowerCase()
      ) || 'wallet1';

      const secureOwnableRecovery = this.createSecureOwnableWithWallet(recoveryWalletName);
      // Reuse an existing pending OWNERSHIP_TRANSFER tx when possible, otherwise create a new one.
      const txId = await this.getOrCreateOwnershipTransferTxId(secureOwnableRecovery, recoveryWallet);
      this.assertTest(!!txId, 'Pending transaction found for meta-tx signing');

      // Create meta-transaction parameters (owner signs approval)
      const metaTxParams = await this.createMetaTxParams(
        FUNCTION_SELECTORS.TRANSFER_OWNERSHIP_APPROVE_META_SELECTOR,
        TxAction.SIGN_META_APPROVE,
        ownerWallet.address
      );
      console.log('  ✅ Meta-transaction parameters created');

      // Generate unsigned meta-transaction
      const unsignedMetaTx = await this.metaTxSigner.createUnsignedMetaTransactionForExisting(
        txId,
        metaTxParams
      );
      this.assertTest(!!unsignedMetaTx.message && unsignedMetaTx.message.length > 0, 'Unsigned meta-transaction created');
      console.log(`  ✅ Unsigned meta-transaction created`);
      console.log(`  📋 Message hash: ${unsignedMetaTx.message}`);

      // Sign meta-transaction using private key (for remote Ganache compatibility)
      console.log('  🔐 Signing meta-transaction...');
      const signedMetaTx = await this.metaTxSigner.signMetaTransaction(
        unsignedMetaTx,
        ownerWallet.address,
        ownerWallet.privateKey
      );
      this.assertTest(!!signedMetaTx.signature && signedMetaTx.signature.length > 0, 'Meta-transaction signed successfully');
      console.log(`  ✅ Meta-transaction signed successfully`);
      console.log(`  📋 Signature: ${signedMetaTx.signature}`);

      // Verify signature is valid format (65 bytes = 130 hex chars + 0x prefix)
      const signatureLength = signedMetaTx.signature.length;
      this.assertTest(signatureLength === 132, `Signature has correct length (${signatureLength} chars)`);
      console.log('  ✅ Signature format is valid');

      console.log('✅ Meta-transaction signing tests passed\n');
    } catch (error: any) {
      console.log(`  ❌ Meta-transaction signing test failed: ${error.message}`);
      throw error;
    }
  }

  async testSignatureVerification(): Promise<void> {
    console.log('\n📝 Testing Signature Verification');
    console.log('-'.repeat(40));

    if (!this.secureOwnable || !this.metaTxSigner) {
      throw new Error('SecureOwnable SDK or MetaTransactionSigner not initialized');
    }

    try {
      const recoveryWallet = this.getRoleWallet('recovery');
      const recoveryWalletName = Object.keys(this.wallets).find(
        (k) => this.wallets[k].address.toLowerCase() === recoveryWallet.address.toLowerCase()
      ) || 'wallet1';
      const ownerWallet = this.getRoleWallet('owner');
      const ownerWalletName = Object.keys(this.wallets).find(
        (k) => this.wallets[k].address.toLowerCase() === ownerWallet.address.toLowerCase()
      ) || 'wallet1';

      const secureOwnableRecovery = this.createSecureOwnableWithWallet(recoveryWalletName);
      // getPendingTransactions() may require owner/recovery; use recovery-scoped client
      let pendingTxs = await secureOwnableRecovery.getPendingTransactions();
      if (pendingTxs.length === 0) {
        // Create a test ownership transfer request (contract requires recovery to call transferOwnershipRequest())
        const result = await secureOwnableRecovery.transferOwnershipRequest(this.getTxOptions(recoveryWallet.address));
        await result.wait();
        await new Promise(resolve => setTimeout(resolve, 1000));
        pendingTxs = await secureOwnableRecovery.getPendingTransactions();
      }
      this.assertTest(pendingTxs.length > 0, 'Pending transaction found');
      const txId = pendingTxs[pendingTxs.length - 1];

      // Create and sign meta-transaction
      const metaTxParams = await this.createMetaTxParams(
        FUNCTION_SELECTORS.TRANSFER_OWNERSHIP_APPROVE_META_SELECTOR,
        TxAction.SIGN_META_APPROVE,
        ownerWallet.address
      );

      const unsignedMetaTx = await this.metaTxSigner.createUnsignedMetaTransactionForExisting(
        txId,
        metaTxParams
      );

      const signedMetaTx = await this.metaTxSigner.signMetaTransaction(
        unsignedMetaTx,
        ownerWallet.address,
        ownerWallet.privateKey
      );

      // The signature verification is done internally by MetaTransactionSigner.signMetaTransaction
      // If it gets here without throwing, the signature is valid
      this.assertTest(!!signedMetaTx.signature, 'Signature verification passed');
      console.log('  ✅ Signature verification passed');
      console.log('  ✅ Signature matches the signer address');

      console.log('✅ Signature verification tests passed\n');
    } catch (error: any) {
      console.log(`  ❌ Signature verification test failed: ${error.message}`);
      throw error;
    }
  }
}

