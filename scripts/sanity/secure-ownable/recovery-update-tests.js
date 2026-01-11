/**
 * Recovery Update Tests
 * Tests updating the recovery address to an unused wallet via meta-transaction
 * This ensures recovery is different from owner for subsequent ownership transfer tests
 */

const BaseSecureOwnableTest = require('./base-test');

class RecoveryUpdateTests extends BaseSecureOwnableTest {
    constructor() {
        super('Recovery Update Tests');
    }

    async executeTests() {
        console.log('\n🔄 TESTING RECOVERY ADDRESS UPDATE');
        console.log('==================================================');
        console.log('📋 This test changes recovery to an unused wallet');
        console.log('   to ensure recovery ≠ owner for ownership transfer tests');

        await this.testRecoveryUpdate();
    }

    async testRecoveryUpdate() {
        console.log('\n📝 Testing Recovery Address Update via Meta-transaction');
        console.log('--------------------------------------------------------');

        // Check what recovery functions are available
        console.log('  🔍 Checking available recovery functions...');
        
        // Try to get current recovery address first
        try {
            const currentRecovery = await this.callContractMethod(this.contract.methods.getRecovery());
            console.log(`  📊 Current recovery address: ${currentRecovery}`);
        } catch (error) {
            console.log(`  ❌ Cannot get recovery address: ${error.message}`);
            throw error;
        }
        
        // Check if recovery update functions exist
        const recoveryFunctions = [
            'updateRecoveryRequestAndApprove',
            'updateRecoveryExecutionParams'
        ];
        
        for (const funcName of recoveryFunctions) {
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
            // Get current recovery and owner addresses
            const ownerAddress = await this.callContractMethod(this.contract.methods.owner());
            const currentRecovery = await this.callContractMethod(this.contract.methods.getRecovery());
            
            console.log(`  👑 Owner address: ${ownerAddress}`);
            console.log(`  🛡️ Current recovery address: ${currentRecovery}`);

            // Test recovery functionality by changing it and then changing it back
            if (currentRecovery.toLowerCase() !== ownerAddress.toLowerCase()) {
                console.log('  📋 Recovery is different from owner - testing by changing to unused wallet then back to original');
                const newRecovery = this.findUnusedWalletForRecovery(currentRecovery);
                console.log(`  🔍 New recovery address: ${newRecovery}`);
                console.log(`  🔍 Current recovery address: ${currentRecovery}`);
                console.log(`  🔍 Are they the same? ${newRecovery.toLowerCase() === currentRecovery.toLowerCase()}`);
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

        } catch (error) {
            console.log(`  ❌ Recovery functionality testing failed: ${error.message}`);
            throw error;
        }
    }

    async testRecoveryChange(newRecoveryAddress, description) {
        console.log(`  🎯 Testing recovery change to: ${description} (${newRecoveryAddress})`);

        try {
            // Create execution params for recovery update
            const executionParams = await this.callContractMethod(this.contract.methods.updateRecoveryExecutionParams(newRecoveryAddress));
            console.log(`    ✅ Execution params created for ${description}`);

            // Get the execution selector for executeRecoveryUpdate(address)
            // This is keccak256("executeRecoveryUpdate(address)") first 4 bytes
            const executionSelector = '0x9ce5606e'; // UPDATE_RECOVERY_SELECTOR

            // Create meta-transaction parameters
            const metaTxParams = await this.callContractMethod(this.contract.methods.createMetaTxParams(
                this.contractAddress,
                '0xfa3fb3e7', // UPDATE_RECOVERY_META_SELECTOR
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
                this.getOperationType('RECOVERY_UPDATE'), // operation type
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
                this.contract.methods.updateRecoveryRequestAndApprove(fullMetaTx),
                this.getRoleWalletObject('broadcaster')
            );

            console.log(`    ✅ Meta-transaction executed successfully for ${description}`);
            console.log(`    📋 Transaction Hash: ${receipt.transactionHash}`);

            // Verify the recovery address was updated
            const updatedRecovery = await this.callContractMethod(this.contract.methods.getRecovery());
            console.log(`    🛡️ Updated recovery address: ${updatedRecovery}`);
            
            this.assertTest(
                updatedRecovery.toLowerCase() === newRecoveryAddress.toLowerCase(),
                `Recovery address updated to ${newRecoveryAddress}`
            );

            // Update internal role tracking
            this.roles.recovery = updatedRecovery;
            if (newRecoveryAddress.toLowerCase() === this.wallets.wallet4.address.toLowerCase()) {
                this.roleWallets.recovery = this.wallets.wallet4;
            } else if (newRecoveryAddress.toLowerCase() === this.wallets.wallet3.address.toLowerCase()) {
                this.roleWallets.recovery = this.wallets.wallet3;
            }

            console.log(`    🎉 Recovery change to ${description} completed successfully!`);

        } catch (error) {
            console.log(`    ❌ Recovery change to ${description} failed: ${error.message}`);
            throw error;
        }
    }

    /**
     * Find the first unused wallet for recovery update
     * @param {string} currentRecovery - Current recovery address
     * @returns {string} Address of unused wallet
     */
    findUnusedWalletForRecovery(currentRecovery) {
        const availableWallets = [
            this.wallets.wallet1.address,
            this.wallets.wallet2.address,
            this.wallets.wallet3.address,
            this.wallets.wallet4.address,
            this.wallets.wallet5.address
        ];

        // Find first wallet that's different from current recovery
        for (const wallet of availableWallets) {
            if (wallet.toLowerCase() !== currentRecovery.toLowerCase()) {
                return wallet;
            }
        }

        throw new Error('No unused wallet found for recovery update');
    }
}

module.exports = RecoveryUpdateTests;