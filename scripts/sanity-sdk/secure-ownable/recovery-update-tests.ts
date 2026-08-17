/**
 * Recovery Update Tests
 * Tests updating the recovery address via meta-transaction
 */

import { Address, Hex } from 'viem';
import { BaseSecureOwnableTest } from './base-test.ts';
import { TxAction } from '../../../sdk/typescript/types/lib.index.tsx';
import { FUNCTION_SELECTORS, OPERATION_TYPES } from '../../../sdk/typescript/types/core.security.index.tsx';
import { updateRecoveryExecutionParams } from '../../../sdk/typescript/lib/definitions/SecureOwnableDefinitions';

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

      // Get execution params for recovery update (via definition contract)
      if (!this.secureOwnableDefinitionsAddress) {
        throw new Error('SecureOwnableDefinitions address not set');
      }
      let executionOptions: Hex;
      try {
        const result = await updateRecoveryExecutionParams(this.publicClient, this.secureOwnableDefinitionsAddress, newRecoveryAddress);
        console.log(`    🔍 Raw execution params result:`, result, `(type: ${typeof result})`);
        executionOptions = result;
        this.assertTest(!!executionOptions && typeof executionOptions === 'string' && executionOptions.startsWith('0x'), 'Execution params created successfully');
        console.log(`    ✅ Execution params created for ${description}: ${executionOptions}`);
      } catch (error: any) {
        console.error(`    ❌ Failed to get execution params: ${error.message}`);
        if (process.env.DEBUG) {
          const errorName = (error && error.name) ? error.name : 'Error';
          console.error(`    ❌ Debug: ${errorName} (stack trace suppressed to avoid logging sensitive data)`);
        }
        throw new Error(`Failed to get execution params: ${error.message}`);
      }

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
      // Ensure executionParams is properly formatted as Hex
      if (!executionOptions || typeof executionOptions !== 'string' || !executionOptions.startsWith('0x')) {
        throw new Error(`Invalid execution params: ${executionOptions} (type: ${typeof executionOptions})`);
      }
      
      // Validate all required parameters before creating txParams
      if (!ownerWallet || !ownerWallet.address) {
        throw new Error('Owner wallet or address is undefined');
      }
      if (!this.contractAddress) {
        throw new Error('Contract address is undefined');
      }
      if (!executionOptions) {
        throw new Error('Execution options is undefined');
      }
      
      const txParams = {
        requester: ownerWallet.address,
        target: this.contractAddress,
        value: BigInt(0),
        gasLimit: BigInt(0),
        operationType: OPERATION_TYPES.RECOVERY_UPDATE,
        executionSelector: FUNCTION_SELECTORS.UPDATE_RECOVERY_SELECTOR,
        executionParams: executionOptions as Hex
      };
      
      console.log(`    🔍 txParams: operationType=${txParams.operationType}, executionSelector=${txParams.executionSelector}`);

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
      // For requestAndApprove, the contract expects txId to be 0 or match txCounter
      // The contract will create a new txRecord and replace this one
      // So we use the signedMetaTx structure directly as it comes from the contract
      const fullMetaTx = {
        txRecord: signedMetaTx.txRecord,
        params: signedMetaTx.params,
        message: signedMetaTx.message,
        signature: signedMetaTx.signature,
        data: signedMetaTx.data
      };
      
      console.log(`    🔍 Full meta-transaction structure:`, {
        txRecord: {
          txId: fullMetaTx.txRecord.txId.toString(),
          status: fullMetaTx.txRecord.status,
          params: {
            requester: fullMetaTx.txRecord.params.requester,
            executionSelector: fullMetaTx.txRecord.params.executionSelector
          }
        },
        params: {
          action: fullMetaTx.params.action,
          handlerSelector: fullMetaTx.params.handlerSelector
        },
        message: fullMetaTx.message,
        hasSignature: !!fullMetaTx.signature
      });

      // Execute meta-transaction using broadcaster wallet (matches sanity test pattern)
      console.log(`    📡 Executing meta-transaction for ${description}...`);
      const broadcasterWallet = this.getRoleWallet('broadcaster');
      const broadcasterWalletName = Object.keys(this.wallets).find(
        (k) => this.wallets[k].address.toLowerCase() === broadcasterWallet.address.toLowerCase()
      ) || 'wallet2';
      const secureOwnableBroadcaster = this.createSecureOwnableWithWallet(broadcasterWalletName);
      const result = await secureOwnableBroadcaster.updateRecoveryRequestAndApprove(
        fullMetaTx,
        this.getTxOptions(broadcasterWallet.address)
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

