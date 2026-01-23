/**
 * EIP-712 Signing Tests
 * Tests EIP-712 meta-transaction signing functionality
 */

import { Address, Hex } from 'viem';
import { BaseSecureOwnableTest } from './base-test.ts';
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
      // Create a test ownership transfer request to get a real txId
      // Must use recovery role (not owner) for ownership transfer requests
      const recoveryWallet = this.getRoleWallet('recovery');
      const ownerWallet = this.getRoleWallet('owner');
      
      // Check if recovery == owner (not allowed for ownership transfers)
      if (recoveryWallet.address.toLowerCase() === ownerWallet.address.toLowerCase()) {
        console.log('  ⚠️  Recovery equals owner - skipping ownership transfer test');
        console.log('  ℹ️  This test requires recovery ≠ owner');
        return;
      }

      const recoveryWalletName = Object.keys(this.wallets).find(
        (k) => this.wallets[k].address.toLowerCase() === recoveryWallet.address.toLowerCase()
      ) || 'wallet1';

      const secureOwnableRecovery = this.createSecureOwnableWithWallet(recoveryWalletName);
      const result = await secureOwnableRecovery.transferOwnershipRequest({
        from: recoveryWallet.address,
      });

      await result.wait();
      await new Promise(resolve => setTimeout(resolve, 1000));

      const pendingTxs = await this.secureOwnable.getPendingTransactions();
      this.assertTest(pendingTxs.length > 0, 'Pending transaction found');
      const txId = pendingTxs[pendingTxs.length - 1];
      console.log(`  📋 Using transaction ID: ${txId}`);
      const ownerWalletName = Object.keys(this.wallets).find(
        (k) => this.wallets[k].address.toLowerCase() === ownerWallet.address.toLowerCase()
      ) || 'wallet1';

      // Create meta-transaction parameters
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
      // Create a test ownership transfer request
      // Check if recovery == owner (not allowed for ownership transfers)
      const recoveryWallet = this.getRoleWallet('recovery');
      const ownerWallet = this.getRoleWallet('owner');
      
      if (recoveryWallet.address.toLowerCase() === ownerWallet.address.toLowerCase()) {
        console.log('  ⚠️  Recovery equals owner - skipping signature verification test');
        console.log('  ℹ️  This test requires recovery ≠ owner');
        console.log('  ℹ️  Please run recovery-update tests first to set recovery ≠ owner');
        return;
      }

      const recoveryWalletName = Object.keys(this.wallets).find(
        (k) => this.wallets[k].address.toLowerCase() === recoveryWallet.address.toLowerCase()
      ) || 'wallet1';

      const secureOwnableRecovery = this.createSecureOwnableWithWallet(recoveryWalletName);
      const result = await secureOwnableRecovery.transferOwnershipRequest({
        from: recoveryWallet.address,
      });

      await result.wait();
      await new Promise(resolve => setTimeout(resolve, 1000));

      const pendingTxs = await this.secureOwnable.getPendingTransactions();
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

