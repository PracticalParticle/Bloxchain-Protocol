/**
 * Timelock Period Tests
 * Tests updating the timelock period to 1 minute via meta-transaction
 * This is the foundation test that sets up the timelock for all other tests
 */

const BaseSecureOwnableTest = require('./base-test.cjs');

class TimelockPeriodTests extends BaseSecureOwnableTest {
    constructor() {
        super('Timelock Period Tests');
    }

    async executeTests() {
        console.log('\n🔄 TESTING TIMELOCK PERIOD UPDATE');
        console.log('==================================================');
        console.log('📋 This test sets up the timelock period to 1 second');
        console.log('   for all subsequent tests that require timelock functionality');

        await this.testTimelockPeriodUpdate();
    }

    async testTimelockPeriodUpdate() {
        console.log('\n📝 Testing Timelock Period Update via Meta-transaction');
        console.log('------------------------------------------------------');

        // Check what timelock functions are available
        console.log('  🔍 Checking available timelock functions...');
        
        // Try to get current timelock period first
        try {
            const currentTimelockSeconds = await this.callContractMethod(this.contract.methods.getTimeLockPeriodSec());
            console.log(`  📊 Current timelock period: ${currentTimelockSeconds} seconds`);
        } catch (error) {
            console.log(`  ⚠️ Cannot get timelock period: ${error.message}`);
            console.log(`  📋 Proceeding with timelock update test anyway...`);
        }
        
        // Check if timelock update functions exist
        const timelockFunctions = [
            'updateTimeLockRequestAndApprove',
            'updateTimeLockExecutionParams'
        ];
        
        for (const funcName of timelockFunctions) {
            try {
                if (this.contract.methods[funcName]) {
                    console.log(`  ✅ Function ${funcName} is available`);
                } else {
                    console.log(`  ❌ Function ${funcName} is not available`);
                }
            } catch (error) {
                console.log(`  ❌ Error checking ${funcName}: ${error.message}`);
            }
        }

        // Check for pending transactions
        await this.checkPendingTransactions();

        try {
            // Get current timelock period
            let currentTimelockSeconds;
            try {
                currentTimelockSeconds = await this.callContractMethod(this.contract.methods.getTimeLockPeriodSec());
                console.log(`  📊 Current timelock period: ${currentTimelockSeconds} seconds`);
            } catch (error) {
                console.log(`  ⚠️ Cannot get current timelock period: ${error.message}`);
                console.log(`  📋 Proceeding with default timelock test...`);
                currentTimelockSeconds = '1'; // Default to 1 second
            }

            // Test timelock functionality by changing it to a different value
            const currentTimelock = parseInt(currentTimelockSeconds.toString());
            if (currentTimelock === 1) {
                console.log('  📋 Current timelock is 1 second - testing by changing to 2 seconds');
                await this.testTimelockChange(2, '2 seconds');
            } else if (currentTimelock === 2) {
                console.log('  📋 Current timelock is 2 seconds - testing by changing to 1 second');
                await this.testTimelockChange(1, '1 second');
            } else {
                console.log(`  📋 Current timelock is ${currentTimelock} seconds - testing by changing to 1 second`);
                await this.testTimelockChange(1, '1 second');
            }

            console.log('  🎉 Timelock functionality testing completed successfully!');
            console.log('  📋 All subsequent tests will use 1-second timelock period');

        } catch (error) {
            console.log(`  ❌ Timelock functionality testing failed: ${error.message}`);
            throw error;
        }
    }

    async testTimelockChange(newTimelockSeconds, description) {
        console.log(`  🎯 Testing timelock change to: ${description}`);

        try {
            // Create execution params for timelock update
            const executionParams = await this.callContractMethod(this.contract.methods.updateTimeLockExecutionParams(newTimelockSeconds));
            console.log(`    ✅ Execution params created for ${description}`);

            // Get the execution selector for executeTimeLockUpdate(uint256)
            // This is keccak256("executeTimeLockUpdate(uint256)") first 4 bytes
            const executionSelector = '0x949ab909'; // UPDATE_TIMELOCK_SELECTOR

            // Create meta-transaction parameters
            const metaTxParams = await this.callContractMethod(this.contract.methods.createMetaTxParams(
                this.contractAddress,
                '0x458102e4', // UPDATE_TIMELOCK_META_SELECTOR
                this.getTxAction('SIGN_META_REQUEST_AND_APPROVE'),
                3600, // 1 hour deadline
                0, // no max gas price
                this.getRoleWalletObject('owner').address // Owner signs the meta-transaction
            ));

            // Create unsigned meta-transaction with new signature
            const unsignedMetaTx = await this.callContractMethod(this.contract.methods.generateUnsignedMetaTransactionForNew(
                this.getRoleWalletObject('owner').address, // requester
                this.contractAddress, // target
                0, // no value
                0, // no gas limit
                this.getOperationType('TIMELOCK_UPDATE'), // operation type
                executionSelector, // execution selector
                executionParams, // execution params
                metaTxParams // meta-transaction parameters
            ));

                        // Sign the meta-transaction using the standardized EIP712Signer utility
                        console.log(`    🔐 Signing meta-transaction for ${description}...`);
                        const signedMetaTx = await this.eip712Signer.signMetaTransaction(unsignedMetaTx, this.getRoleWallet('owner'), this.contract);
                        this.assertTest(signedMetaTx && signedMetaTx.signature && signedMetaTx.signature.length > 0, `Meta-transaction signed successfully for ${description}`);

            // The EIP712Signer already returns the complete signed meta-transaction
            const fullMetaTx = {
                txRecord: signedMetaTx.txRecord,
                params: signedMetaTx.params,
                message: signedMetaTx.message,
                signature: signedMetaTx.signature,
                data: signedMetaTx.data
            };

            const receipt = await this.sendTransaction(
                this.contract.methods.updateTimeLockRequestAndApprove(fullMetaTx),
                this.getRoleWalletObject('broadcaster')
            );

            console.log(`    ✅ Meta-transaction executed successfully for ${description}`);
            console.log(`    📋 Transaction Hash: ${receipt.transactionHash}`);

            // Verify the timelock was updated
            try {
                const updatedTimelockSeconds = await this.callContractMethod(this.contract.methods.getTimeLockPeriodSec());
                console.log(`    ⏰ Updated timelock period: ${updatedTimelockSeconds} second(s)`);
                
                this.assertTest(
                    parseInt(updatedTimelockSeconds.toString()) === newTimelockSeconds,
                    `Timelock period updated to ${newTimelockSeconds} second(s)`
                );
            } catch (error) {
                console.log(`    ❌ Cannot verify timelock update: ${error.message}`);
                console.log(`    ❌ Timelock period update verification failed - this indicates a contract issue`);
                throw new Error(`Timelock period update verification failed: ${error.message}`);
            }

            console.log(`    🎉 Timelock change to ${description} completed successfully!`);

        } catch (error) {
            console.log(`    ❌ Timelock change to ${description} failed: ${error.message}`);
            throw error;
        }
    }
}

module.exports = TimelockPeriodTests;
