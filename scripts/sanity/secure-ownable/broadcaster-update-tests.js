/**
 * Broadcaster Update Tests
 * Comprehensive tests for broadcaster address update workflow
 * Tests all 4 options: meta-cancel, timelock-cancel, meta-approve, timelock-approve
 */

const BaseSecureOwnableTest = require('./base-test');

class BroadcasterUpdateTests extends BaseSecureOwnableTest {
    constructor() {
        super('Broadcaster Update Tests');
    }

    async executeTests() {
        console.log('\n🔄 TESTING COMPLETE BROADCASTER UPDATE WORKFLOW');
        console.log('==================================================');
        console.log('📋 This workflow tests all 4 broadcaster update options:');
        console.log('   1. Meta-transaction Cancellation (immediate)');
        console.log('   2. Time Delay Cancellation (requires 1 second wait)');
        console.log('   3. Meta-transaction Approval (immediate)');
        console.log('   4. Time Delay Approval (requires 1 second wait)');
        console.log('📋 Each section creates its own independent request');

        await this.testMetaTransactionCancellation();
        await this.cleanupPendingTransactions();
        
        await this.testTimeDelayCancellation();
        await this.cleanupPendingTransactions();
        
        await this.testMetaTransactionApproval();
        await this.cleanupPendingTransactions();
        
        await this.testTimeDelayApproval();
    }

    async testMetaTransactionCancellation() {
        console.log('\n📝 SECTION 1: Testing Meta-transaction Cancellation');
        console.log('----------------------------------------------------');
        console.log('⚡ This test provides instant cancellation (bypasses timelock)');

        // Validate permissions
        await this.validateWorkflowPermissions('BROADCASTER UPDATE META-TRANSACTION CANCELLATION', [
            {
                role: 'owner',
                functionSelector: '0x1100b576', // UPDATE_BROADCASTER_CANCEL_META_SELECTOR
                expectedActions: [5], // SIGN_META_CANCEL
                description: 'Owner can sign broadcaster update cancellation meta-transaction'
            },
            {
                role: 'broadcaster',
                functionSelector: '0x1100b576', // UPDATE_BROADCASTER_CANCEL_META_SELECTOR
                expectedActions: [8], // EXECUTE_META_CANCEL
                description: 'Broadcaster can execute broadcaster update cancellation meta-transaction'
            }
        ]);

        // Check for pending transactions
        const pendingCheck = await this.checkPendingTransactions();

        try {
            let txRecord;
            if (pendingCheck.hasPending) {
                // Use existing pending transaction
                const broadcasterTx = pendingCheck.transactions.find(tx => 
                    tx.operationType === '0xae23396f8eb008d2f5f9673f91ccf20bf248201a6e0dbeaf46c421777ad8dc5b' // BROADCASTER_UPDATE
                );
                if (broadcasterTx) {
                    txRecord = { txId: broadcasterTx.txId };
                    console.log(`  📋 Using existing broadcaster update transaction ${txRecord.txId}`);
                } else {
                    // Create a new broadcaster update request
                    txRecord = await this.createBroadcasterRequestAndDeriveTxId();
                    this.assertTest(txRecord.txId > 0, 'Broadcaster update request created');
                }
            } else {
                // Create a new broadcaster update request
                txRecord = await this.createBroadcasterRequestAndDeriveTxId();
                this.assertTest(txRecord.txId > 0, 'Broadcaster update request created');
            }

            // Create meta-transaction parameters for cancellation
            const metaTxParams = await this.callContractMethod(this.contract.methods.createMetaTxParams(
                this.contractAddress,
                '0x1100b576', // UPDATE_BROADCASTER_CANCEL_META_SELECTOR
                this.getTxAction('SIGN_META_CANCEL'),
                3600, // 1 hour deadline
                0, // no max gas price
                this.getRoleWalletObject('owner').address // Owner signs the meta-transaction
            ));

            // Create unsigned meta-transaction for existing tx
            const unsignedMetaTx = await this.callContractMethod(this.contract.methods.generateUnsignedMetaTransactionForExisting(
                txRecord.txId,
                metaTxParams
            ));

            // Sign meta-transaction
            console.log('  🔐 Signing meta-transaction cancellation...');
            const signature = await this.eip712Signer.signMetaTransaction(unsignedMetaTx, this.getRoleWallet('owner'), this.contract);
            this.assertTest(signature && signature.signature.length > 0, 'Meta-transaction signed successfully');

            // Execute meta-transaction
            const fullMetaTx = {
                txRecord: unsignedMetaTx.txRecord,
                params: unsignedMetaTx.params,
                message: unsignedMetaTx.message,
                signature: signature.signature,
                data: unsignedMetaTx.data
            };

            const receipt = await this.sendTransaction(
                this.contract.methods.updateBroadcasterCancellationWithMetaTx(fullMetaTx),
                this.getRoleWalletObject('broadcaster')
            );

            console.log('  ✅ Meta-transaction cancellation executed successfully');
            console.log(`  📋 Transaction Hash: ${receipt.transactionHash}`);

            // Verify transaction is cancelled
            const tx = await this.callContractMethod(this.contract.methods.getTransaction(txRecord.txId));
            this.assertTest(tx.status === '2', 'Transaction cancelled successfully');

            console.log('  🎉 Meta-transaction cancellation test completed');

        } catch (error) {
            console.log(`  ❌ Meta-transaction cancellation failed: ${error.message}`);
            throw error;
        }
    }

    async testTimeDelayCancellation() {
        console.log('\n📝 SECTION 2: Testing Time Delay Cancellation');
        console.log('----------------------------------------------');
        console.log('⏰ This test requires waiting 1 second for timelock...');

        // Validate permissions
        await this.validateWorkflowPermissions('BROADCASTER UPDATE TIME DELAY CANCELLATION', [
            {
                role: 'owner',
                functionSelector: '0x62544d90', // updateBroadcasterCancellation
                expectedActions: [2], // CANCEL
                description: 'Owner can cancel broadcaster update after timelock'
            }
        ]);

        // Check for pending transactions
        await this.checkPendingTransactions();

        try {
            // Create a new broadcaster update request
            const txRecord = await this.createBroadcasterRequestAndDeriveTxId();
            this.assertTest(txRecord.txId > 0, 'Broadcaster update request created');

            // Wait for timelock to expire
            console.log('  ⏳ Waiting for timelock to expire...');
            
            // Get the actual timelock period and release time
            const txBeforeCancellation = await this.callContractMethod(this.contract.methods.getTransaction(txRecord.txId));
            const releaseTime = parseInt(txBeforeCancellation.releaseTime);
            
            // Get actual blockchain time instead of machine time
            const currentBlock = await this.web3.eth.getBlock('latest');
            const currentBlockchainTime = currentBlock.timestamp;
            
            // Calculate time to advance with safety buffer
            // We need to advance at least 1 second MORE than the timelock period to ensure it has expired
            const timeToAdvance = Math.max(0, releaseTime - currentBlockchainTime + 2); // Add 2 seconds buffer (1 sec + 1 sec safety)
            
            console.log(`  📋 Release time: ${releaseTime}`);
            console.log(`  📋 Current blockchain time: ${currentBlockchainTime}`);
            console.log(`  📋 Time to advance: ${timeToAdvance} seconds (includes 2-second safety buffer)`);
            
            // Advance time by the calculated amount to ensure timelock has expired
            if (timeToAdvance > 0) {
                console.log(`  ⏰ Advancing blockchain time by ${timeToAdvance} seconds...`);
                await this.advanceBlockchainTime(timeToAdvance);
            } else {
                console.log(`  ✅ Timelock already expired, no need to advance time`);
            }

            // Cancel the transaction
            const receipt = await this.sendTransaction(
                this.contract.methods.updateBroadcasterCancellation(txRecord.txId),
                this.getRoleWalletObject('owner')
            );

            console.log('  ✅ Time delay cancellation executed successfully');
            console.log(`  📋 Transaction Hash: ${receipt.transactionHash}`);

            // Verify transaction is cancelled
            const tx = await this.callContractMethod(this.contract.methods.getTransaction(txRecord.txId));
            this.assertTest(tx.status === '2', 'Transaction cancelled successfully');

            console.log('  🎉 Time delay cancellation test completed');

        } catch (error) {
            console.log(`  ❌ Time delay cancellation failed: ${error.message}`);
            throw error;
        }
    }

    async testMetaTransactionApproval() {
        console.log('\n📝 SECTION 3: Testing Meta-transaction Approval');
        console.log('------------------------------------------------');
        console.log('⚡ This test provides instant approval (bypasses timelock)');

        // Validate permissions
        await this.validateWorkflowPermissions('BROADCASTER UPDATE META-TRANSACTION APPROVAL', [
            {
                role: 'owner',
                functionSelector: '0x6511dd1e', // UPDATE_BROADCASTER_APPROVE_META_SELECTOR
                expectedActions: [4], // SIGN_META_APPROVE
                description: 'Owner can sign broadcaster update approval meta-transaction'
            },
            {
                role: 'broadcaster',
                functionSelector: '0x6511dd1e', // UPDATE_BROADCASTER_APPROVE_META_SELECTOR
                expectedActions: [7], // EXECUTE_META_REQUEST_AND_APPROVE
                description: 'Broadcaster can execute broadcaster update request and approve meta-transaction'
            }
        ]);

        // Check for pending transactions
        await this.checkPendingTransactions();

        try {
            // Create a new broadcaster update request
            const txRecord = await this.createBroadcasterRequestAndDeriveTxId();
            this.assertTest(txRecord.txId > 0, 'Broadcaster update request created');

            // Create meta-transaction parameters for approval
            const metaTxParams = await this.callContractMethod(this.contract.methods.createMetaTxParams(
                this.contractAddress,
                '0x6511dd1e', // UPDATE_BROADCASTER_APPROVE_META_SELECTOR
                this.getTxAction('SIGN_META_APPROVE'),
                3600, // 1 hour deadline
                0, // no max gas price
                this.getRoleWalletObject('owner').address // Owner signs the meta-transaction
            ));

            // Create unsigned meta-transaction for existing tx
            const unsignedMetaTx = await this.callContractMethod(this.contract.methods.generateUnsignedMetaTransactionForExisting(
                txRecord.txId,
                metaTxParams
            ));

            // Sign meta-transaction
            console.log('  🔐 Signing meta-transaction approval...');
            const signature = await this.eip712Signer.signMetaTransaction(unsignedMetaTx, this.getRoleWallet('owner'));
            this.assertTest(signature && signature.signature.length > 0, 'Meta-transaction signed successfully');

            // Execute meta-transaction
            const fullMetaTx = {
                txRecord: unsignedMetaTx.txRecord,
                params: unsignedMetaTx.params,
                message: unsignedMetaTx.message,
                signature: signature.signature,
                data: unsignedMetaTx.data
            };

            const receipt = await this.sendTransaction(
                this.contract.methods.updateBroadcasterApprovalWithMetaTx(fullMetaTx),
                this.getRoleWalletObject('broadcaster')
            );

            console.log('  ✅ Meta-transaction approval executed successfully');
            console.log(`  📋 Transaction Hash: ${receipt.transactionHash}`);

            // Verify transaction is completed
            const tx = await this.callContractMethod(this.contract.methods.getTransaction(txRecord.txId));
            this.assertTest(tx.status === '3', 'Transaction completed successfully');

            // Verify broadcaster address changed
            const newBroadcaster = await this.callContractMethod(this.contract.methods.getBroadcaster());
            console.log(`  📡 New broadcaster address: ${newBroadcaster}`);

            console.log('  🎉 Meta-transaction approval test completed');

        } catch (error) {
            console.log(`  ❌ Meta-transaction approval failed: ${error.message}`);
            throw error;
        }
    }

    async testTimeDelayApproval() {
        console.log('\n📝 SECTION 4: Testing Time Delay Approval');
        console.log('----------------------------------------');
        console.log('⏰ This test requires waiting 1 second for timelock...');

        // Validate permissions
        await this.validateWorkflowPermissions('BROADCASTER UPDATE TIME DELAY APPROVAL', [
            {
                role: 'owner',
                functionSelector: '0xb7d254d6', // updateBroadcasterApproval
                expectedActions: [1], // APPROVE
                description: 'Owner can approve broadcaster update after timelock'
            }
        ]);

        // Check for pending transactions
        await this.checkPendingTransactions();

        try {
            // Get current broadcaster before the test
            const currentBroadcaster = await this.callContractMethod(this.contract.methods.getBroadcaster());
            
            // Create a new broadcaster update request (use wallet5 since broadcaster is now wallet2)
            const txRecord = await this.createBroadcasterRequestForTimeDelayApproval();
            this.assertTest(txRecord.txId > 0, 'Broadcaster update request created');
            
            console.log(`  📋 Created transaction ID: ${txRecord.txId}`);
            console.log(`  📋 Transaction status: ${txRecord.status}`);
            console.log(`  📋 Operation type: ${txRecord.params.operationType}`);

            // Wait for timelock to expire using the robust waitForTimelock method
            await this.waitForTimelock(txRecord.txId, 'Broadcaster Update Time Delay Approval');

            // Approve the transaction
            console.log(`  📋 Calling updateBroadcasterDelayedApproval(${txRecord.txId})...`);
            const receipt = await this.sendTransaction(
                this.contract.methods.updateBroadcasterDelayedApproval(txRecord.txId),
                this.getRoleWalletObject('owner')
            );

            console.log('  ✅ Time delay approval executed successfully');
            console.log(`  📋 Transaction Hash: ${receipt.transactionHash}`);

            // Verify transaction is completed (use owner wallet since broadcaster has changed)
            const tx = await this.callContractMethod(this.contract.methods.getTransaction(txRecord.txId), this.getRoleWalletObject('owner'));
            this.assertTest(tx.status === '3', 'Transaction completed successfully');

            // Verify broadcaster address changed to target
            const finalBroadcaster = await this.callContractMethod(this.contract.methods.getBroadcaster());
            console.log(`  📡 Final broadcaster address: ${finalBroadcaster}`);
            console.log(`  🛡️ Current recovery address: ${await this.callContractMethod(this.contract.methods.getRecovery())}`);
            
            // Verify that the broadcaster was successfully updated to a different address
            this.assertTest(
                finalBroadcaster.toLowerCase() !== currentBroadcaster.toLowerCase(),
                'Broadcaster was successfully updated to a different address'
            );

            console.log('  🎉 Time delay approval test completed');

        } catch (error) {
            console.log(`  ❌ Time delay approval failed: ${error.message}`);
            throw error;
        }
    }

    async createBroadcasterRequestAndDeriveTxId() {
        // Get current broadcaster address
        const currentBroadcaster = await this.callContractMethod(this.contract.methods.getBroadcaster());
        
        // Find first unused wallet for broadcaster update
        const newBroadcaster = this.findUnusedWalletForBroadcaster(currentBroadcaster);
        console.log(`  📡 Current broadcaster: ${currentBroadcaster}`);
        console.log(`  📡 New broadcaster: ${newBroadcaster}`);

        // Send the request
        await this.sendTransaction(
            this.contract.methods.updateBroadcasterRequest(newBroadcaster),
            this.getRoleWalletObject('owner')
        );

        // Try to get the txId from pending transactions
        for (let i = 0; i < 5; i++) {
            const pending = await this.callContractMethod(this.contract.methods.getPendingTransactions());
            if (pending && pending.length > 0) {
                const lastId = pending[pending.length - 1];
                if (lastId) return { txId: parseInt(lastId) };
            }
            await new Promise(r => setTimeout(r, 300));
        }

        // Fallback: scan transaction history
        try {
            const history = await this.callContractMethod(this.contract.methods.getTransactionHistory(1, 50));
            const broadcasterHash = this.web3.utils.keccak256('BROADCASTER_UPDATE');
            for (let i = history.length - 1; i >= 0; i--) {
                const rec = history[i];
                if (rec && rec.status === '1' && rec.params && rec.params.operationType &&
                    rec.params.operationType.toLowerCase() === broadcasterHash.toLowerCase() &&
                    rec.params.requester && rec.params.requester.toLowerCase() === this.roles.owner.toLowerCase()) {
                    return { txId: parseInt(rec.txId) };
                }
            }
        } catch (_) {}

        return { txId: 0 };
    }

    async cleanupPendingTransactions() {
        console.log('\n🧹 CLEANING UP PENDING TRANSACTIONS');
        console.log('------------------------------------');
        
        try {
            const pendingTxIds = await this.callContractMethod(this.contract.methods.getPendingTransactions());
            if (pendingTxIds.length === 0) {
                console.log('✅ No pending transactions to clean up');
                return;
            }

            console.log(`📋 Found ${pendingTxIds.length} pending transactions to clean up`);
            
            for (const txId of pendingTxIds) {
                const tx = await this.callContractMethod(this.contract.methods.getTransaction(txId));
                console.log(`📋 Cleaning up transaction ${txId}: ${tx.params.operationType}`);
                
                try {
                    // Cancel the transaction
                    await this.sendTransaction(
                        this.contract.methods.updateBroadcasterCancellation(txId),
                        this.getRoleWalletObject('owner')
                    );
                    console.log(`✅ Transaction ${txId} cancelled successfully`);
                } catch (error) {
                    console.log(`❌ Failed to cancel transaction ${txId}: ${error.message}`);
                }
            }
            
            // Verify cleanup
            const remainingPendingTxIds = await this.callContractMethod(this.contract.methods.getPendingTransactions());
            console.log(`📋 Remaining pending transactions: ${remainingPendingTxIds.length}`);
            
        } catch (error) {
            console.log(`❌ Cleanup failed: ${error.message}`);
        }
    }

    async createBroadcasterRequestForTimeDelayApproval() {
        // Get current broadcaster address
        const currentBroadcaster = await this.callContractMethod(this.contract.methods.getBroadcaster());
        
        // For time delay approval, we want to change to any unused address
        // Use the dynamic wallet selection to find an unused wallet
        const targetBroadcaster = this.findUnusedWalletForBroadcaster(currentBroadcaster);
        console.log(`  📡 Current broadcaster: ${currentBroadcaster}`);
        console.log(`  📡 Target broadcaster: ${targetBroadcaster}`);

        // Send the request to change to target broadcaster
        await this.sendTransaction(
            this.contract.methods.updateBroadcasterRequest(targetBroadcaster),
            this.getRoleWalletObject('owner')
        );

        // Try to get the txId from pending transactions
        for (let i = 0; i < 5; i++) {
            const pending = await this.callContractMethod(this.contract.methods.getPendingTransactions());
            if (pending.length > 0) {
                const txId = pending[0];
                const txRecord = await this.callContractMethod(this.contract.methods.getTransaction(txId));
                if (txRecord.params.operationType === this.getOperationType('BROADCASTER_UPDATE')) {
                    console.log(`  ✅ Broadcaster update request created`);
                    return txRecord;
                }
            }
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        throw new Error('Failed to create broadcaster update request');
    }

    /**
     * Find the first unused wallet for broadcaster update
     * @param {string} currentBroadcaster - Current broadcaster address
     * @returns {string} Address of unused wallet
     */
    findUnusedWalletForBroadcaster(currentBroadcaster) {
        const availableWallets = [
            this.wallets.wallet1.address,
            this.wallets.wallet2.address,
            this.wallets.wallet3.address,
            this.wallets.wallet4.address,
            this.wallets.wallet5.address
        ];

        // Find first wallet that's different from current broadcaster
        for (const wallet of availableWallets) {
            if (wallet.toLowerCase() !== currentBroadcaster.toLowerCase()) {
                return wallet;
            }
        }

        throw new Error('No unused wallet found for broadcaster update');
    }
}

module.exports = BroadcasterUpdateTests;