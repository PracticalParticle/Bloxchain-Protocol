/**
 * Timelock Period Tests
 * Tests updating the timelock period via meta-transaction
 */

import { BaseSecureOwnableTest } from './base-test.ts';
import { TxAction } from '../../../sdk/typescript/types/lib.index.tsx';
import { FUNCTION_SELECTORS, OPERATION_TYPES } from '../../../sdk/typescript/types/core.access.index.tsx';

export class TimelockPeriodTests extends BaseSecureOwnableTest {
  constructor() {
    super('Timelock Period Tests');
  }

  async executeTests(): Promise<void> {
    console.log('\n🔄 TESTING TIMELOCK PERIOD UPDATE');
    console.log('==================================================');
    console.log('📋 This test sets up the timelock period to 1 second');
    console.log('   for all subsequent tests that require timelock functionality');

    await this.testTimelockPeriodUpdate();
  }

  async testTimelockPeriodUpdate(): Promise<void> {
    console.log('\n📝 Testing Timelock Period Update via Meta-transaction');
    console.log('------------------------------------------------------');

    if (!this.secureOwnable) {
      throw new Error('SecureOwnable SDK not initialized');
    }

    try {
      // Get current timelock period
      let currentTimelockSeconds: bigint;
      try {
        currentTimelockSeconds = await this.secureOwnable.getTimeLockPeriodSec();
        console.log(`  📊 Current timelock period: ${currentTimelockSeconds.toString()} seconds`);
      } catch (error: any) {
        console.log(`  ⚠️ Cannot get timelock period: ${error.message}`);
        console.log(`  📋 Proceeding with default timelock test...`);
        currentTimelockSeconds = BigInt(1); // Default to 1 second
      }

      // Test timelock functionality by changing it to a different value
      const currentTimelock = Number(currentTimelockSeconds);
      let targetTimelock: number;
      if (currentTimelock === 1) {
        console.log('  📋 Current timelock is 1 second - testing by changing to 2 seconds');
        targetTimelock = 2;
      } else if (currentTimelock === 2) {
        console.log('  📋 Current timelock is 2 seconds - testing by changing to 1 second');
        targetTimelock = 1;
      } else {
        console.log(`  📋 Current timelock is ${currentTimelock} seconds - testing by changing to 1 second`);
        targetTimelock = 1;
      }

      await this.testTimelockChange(BigInt(targetTimelock), `${targetTimelock} second${targetTimelock !== 1 ? 's' : ''}`);

      // Restore timelock back to 1 second for subsequent tests
      if (targetTimelock !== 1) {
        console.log('  🔄 Restoring timelock period to 1 second for subsequent tests...');
        await this.testTimelockChange(BigInt(1), '1 second');
      }

      console.log('  🎉 Timelock functionality testing completed successfully!');
      console.log('  📋 All subsequent tests will use 1-second timelock period');
    } catch (error: any) {
      console.log(`  ❌ Timelock functionality testing failed: ${error.message}`);
      throw error;
    }
  }

  async testTimelockChange(newTimelockSeconds: bigint, description: string): Promise<void> {
    console.log(`  🎯 Testing timelock change to: ${description}`);

    if (!this.secureOwnable) {
      throw new Error('SecureOwnable SDK not initialized');
    }

    try {
      // Get owner wallet
      const ownerWallet = this.getRoleWallet('owner');
      const ownerWalletName = Object.keys(this.wallets).find(
        (k) => this.wallets[k].address.toLowerCase() === ownerWallet.address.toLowerCase()
      ) || 'wallet1';

      // Get execution params for timelock update
      let executionOptions: Hex;
      try {
        executionOptions = await this.secureOwnable.updateTimeLockExecutionParams(newTimelockSeconds);
        this.assertTest(!!executionOptions && typeof executionOptions === 'string' && executionOptions.startsWith('0x'), 'Execution params created successfully');
        console.log(`    ✅ Execution params created for ${description}`);
      } catch (error: any) {
        console.error(`    ❌ Failed to get execution params: ${error.message}`);
        throw new Error(`Failed to get execution params: ${error.message}`);
      }

      // Create meta-transaction parameters
      const metaTxParams = await this.createMetaTxParams(
        FUNCTION_SELECTORS.UPDATE_TIMELOCK_META_SELECTOR,
        TxAction.SIGN_META_REQUEST_AND_APPROVE,
        ownerWallet.address
      );

      // Create unsigned meta-transaction for new operation
      if (!this.metaTxSigner) {
        throw new Error('MetaTransactionSigner not initialized');
      }

      // Create txParams for new timelock update
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
        operationType: OPERATION_TYPES.TIMELOCK_UPDATE,
        executionSelector: FUNCTION_SELECTORS.UPDATE_TIMELOCK_SELECTOR,
        executionParams: executionOptions as Hex
      };
      
      console.log(`    🔍 txParams:`, {
        requester: txParams.requester,
        target: txParams.target,
        operationType: txParams.operationType,
        executionSelector: txParams.executionSelector,
        executionParams: txParams.executionParams
      });

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
      const result = await secureOwnableBroadcaster.updateTimeLockRequestAndApprove(
        fullMetaTx,
        { from: broadcasterWallet.address }
      );

      this.assertTest(!!result.hash, 'Timelock update transaction created');
      console.log(`    📋 Transaction Hash: ${result.hash}`);

      const receipt = await result.wait();
      // Viem receipt.status can be 'success' or 'reverted' (string), or 1/0 (number)
      const isSuccess = receipt.status === 'success' || (typeof receipt.status === 'number' && receipt.status === 1);
      this.assertTest(isSuccess, `Transaction succeeded (status: ${receipt.status})`);

      // Verify timelock changed
      await new Promise(resolve => setTimeout(resolve, 1000));
      const updatedTimelock = await this.secureOwnable.getTimeLockPeriodSec();
      this.assertTest(
        updatedTimelock === newTimelockSeconds,
        `Timelock updated to ${description}`
      );

      console.log(`    ✅ Timelock updated to ${description} successfully`);
      console.log(`    📊 New timelock period: ${updatedTimelock.toString()} seconds`);
    } catch (error: any) {
      console.log(`    ❌ Timelock change to ${description} failed: ${error.message}`);
      throw error;
    }
  }
}

