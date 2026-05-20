/**
 * Ownership Transfer Tests
 * Comprehensive tests for ownership transfer workflow
 * Tests all 4 options: owner meta-cancel, recovery timelock-cancel, owner meta-approve, recovery timelock-approve
 */

const BaseSecureOwnableTest = require('./base-test.cjs');

class OwnershipTransferTests extends BaseSecureOwnableTest {
    constructor() {
        super('Ownership Transfer Tests');
    }

    async executeTests() {
        console.log('\n🔄 TESTING COMPLETE OWNERSHIP TRANSFER WORKFLOW');
        console.log('==================================================');
        console.log('📋 This workflow tests the complete ownership transfer cycle:');
        console.log('   1. Create ownership transfer request (recovery role)');
        console.log('   2. Meta cancel (owner sign, broadcaster execute)');
        console.log('   3. Create new ownership transfer request');
        console.log('   4. Time delay cancel (recovery role)');
        console.log('   5. Create new ownership transfer request');
        console.log('   6. Meta approve (owner sign, broadcaster execute)');
        console.log('   7. Verify ownership changed (recovery is now owner)');
        console.log('   8. Update recovery address to new wallet');
        console.log('   9. Create new ownership transfer request (new recovery)');
        console.log('   10. Time delay approve (new recovery wallet)');
        console.log('   11. Verify final ownership change');

        await this.testStep1CreateOwnershipRequest();
        await this.testStep2MetaCancel();
        await this.cleanupPendingTransactions();
        
        await this.testStep3CreateNewRequest();
        await this.testStep4TimeDelayCancel();
        await this.cleanupPendingTransactions();
        
        await this.testStep5CreateNewRequest();
        await this.testStep6MetaApprove();
        await this.testStep7VerifyOwnershipChange();
        await this.testStep8UpdateRecoveryAddress();
        await this.testStep9CreateNewRequestWithNewRecovery();
        await this.testStep10TimeDelayApprove();
        await this.testStep11VerifyFinalOwnershipChange();
    }

    async testStep1CreateOwnershipRequest() {
        console.log('\n📝 STEP 1: Create Ownership Transfer Request');
        console.log('---------------------------------------------');
        console.log('📋 Recovery role creates ownership transfer request');

        // Validate permissions
        await this.validateWorkflowPermissions('OWNERSHIP TRANSFER REQUEST', [
            {
                role: 'recovery',
                functionSelector: '0x538cdba8', // TRANSFER_OWNERSHIP_REQUEST_SELECTOR
                expectedActions: [0], // EXECUTE_TIME_DELAY_REQUEST
                description: 'Recovery can create ownership transfer request'
            }
        ]);

        // Check for pending transactions
        const pendingCheck = await this.checkPendingTransactions();

        try {
            let txRecord;
            if (pendingCheck.hasPending) {
                console.log(`  📋 Found ${pendingCheck.transactions.length} pending transactions`);
                
                // Use existing pending transaction
                const ownershipTx = pendingCheck.transactions.find(tx => 
                    tx.operationType === '0xb23d8fa2f62c8a954db45521d1249908693b29ffd3d2dab6348898c4198996b2' // Actual OWNERSHIP_TRANSFER hash from transaction
                );
                if (ownershipTx) {
                    // Get the full transaction record
                    const fullTx = await this.callContractMethod(this.contract.methods.getTransaction(ownershipTx.txId));
                    txRecord = { txId: ownershipTx.txId, ...fullTx };
                    console.log(`  📋 Using existing ownership transfer transaction ${txRecord.txId}`);
                } else {
                    console.log(`  📋 No existing ownership transfer transaction found, creating new one...`);
                    // Create a new ownership transfer request
                    txRecord = await this.createOwnershipRequestAndDeriveTxId();
                    this.assertTest(txRecord.txId > 0, 'Ownership transfer request created');
                }
            } else {
                console.log(`  📋 No pending transactions found, creating new ownership transfer request...`);
                // Create a new ownership transfer request
                txRecord = await this.createOwnershipRequestAndDeriveTxId();
                this.assertTest(txRecord.txId > 0, 'Ownership transfer request created');
            }
            
            console.log(`  📋 Created transaction ID: ${txRecord.txId}`);
            console.log(`  📋 Transaction status: ${txRecord.status}`);
            console.log(`  📋 Operation type: ${txRecord.params.operationType}`);

            // Verify transaction is pending
            const tx = await this.callContractMethod(this.contract.methods.getTransaction(txRecord.txId));
            this.assertTest(tx.status === '1', 'Transaction is pending');

            console.log('  🎉 Step 1 completed: Ownership transfer request created');

        } catch (error) {
            console.log(`  ❌ Step 1 failed: ${error.message}`);
            throw error;
        }
    }

    async testStep2MetaCancel() {
        console.log('\n📝 STEP 2: Meta Cancel (Owner Sign, Broadcaster Execute)');
        console.log('--------------------------------------------------------');
        console.log('⚡ This test provides instant cancellation (bypasses timelock)');

        // Validate permissions
        await this.validateWorkflowPermissions('OWNERSHIP TRANSFER META-TRANSACTION CANCELLATION', [
            {
                role: 'owner',
                functionSelector: '0xffe364b8', // TRANSFER_OWNERSHIP_CANCEL_META_SELECTOR
                expectedActions: [5], // SIGN_META_CANCEL
                description: 'Owner can sign ownership transfer cancellation meta-transaction'
            },
            {
                role: 'broadcaster',
                functionSelector: '0xffe364b8', // TRANSFER_OWNERSHIP_CANCEL_META_SELECTOR
                expectedActions: [8], // EXECUTE_META_CANCEL
                description: 'Broadcaster can execute ownership transfer cancellation meta-transaction'
            }
        ]);

        // Check for pending transactions
        const pendingCheck = await this.checkPendingTransactions();
        let txRecord;
        
        if (pendingCheck.hasPending) {
            // Use existing pending transaction
            const ownershipTx = pendingCheck.transactions.find(tx => 
                tx.operationType === '0xb23d8fa2f62c8a954db45521d1249908693b29ffd3d2dab6348898c4198996b2' // Actual OWNERSHIP_TRANSFER hash from transaction
            );
            if (ownershipTx) {
                // Get the full transaction record
                const fullTx = await this.callContractMethod(this.contract.methods.getTransaction(ownershipTx.txId));
                txRecord = { txId: ownershipTx.txId, ...fullTx };
                console.log(`  📋 Using existing ownership transfer transaction ${txRecord.txId}`);
            } else {
                // Create a new ownership transfer request
                txRecord = await this.createOwnershipRequestAndDeriveTxId();
                this.assertTest(txRecord.txId > 0, 'Ownership transfer request created');
            }
        } else {
            // Create a new ownership transfer request
            txRecord = await this.createOwnershipRequestAndDeriveTxId();
            this.assertTest(txRecord.txId > 0, 'Ownership transfer request created');
        }

        try {
            // Create meta-transaction parameters for cancellation
            const metaTxParams = await this.callContractMethod(this.contract.methods.createMetaTxParams(
                this.contractAddress,
                '0xffe364b8', // TRANSFER_OWNERSHIP_CANCEL_META_SELECTOR
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
                this.contract.methods.transferOwnershipCancellationWithMetaTx(fullMetaTx),
                this.getRoleWalletObject('broadcaster')
            );

            console.log('  ✅ Meta-transaction cancellation executed successfully');
            console.log(`  📋 Transaction Hash: ${receipt.transactionHash}`);

            // Verify transaction is cancelled
            // TxStatus enum: 0=UNDEFINED, 1=PENDING, 2=EXECUTING, 3=PROCESSING_PAYMENT, 4=CANCELLED, 5=COMPLETED, 6=FAILED            const tx = await this.callContractMethod(this.contract.methods.getTransaction(txRecord.txId));
            this.assertTest(tx.status === '4', 'Transaction cancelled successfully');

            console.log('  🎉 Step 2 completed: Meta cancel executed');

        } catch (error) {
            console.log(`  ❌ Step 2 failed: ${error.message}`);
            throw error;
        }
    }

    async testStep3CreateNewRequest() {
        console.log('\n📝 STEP 3: Create New Ownership Transfer Request');
        console.log('-----------------------------------------------');
        console.log('📋 Recovery role creates new ownership transfer request');

        // Check for pending transactions
        await this.checkPendingTransactions();

        try {
            // Recovery creates new ownership transfer request
            const txRecord = await this.createOwnershipRequestAndDeriveTxId();
            this.assertTest(txRecord.txId > 0, 'New ownership transfer request created');
            
            console.log(`  📋 Created transaction ID: ${txRecord.txId}`);
            console.log(`  📋 Transaction status: ${txRecord.status}`);
            console.log(`  📋 Operation type: ${txRecord.params.operationType}`);

            // Verify transaction is pending
            const tx = await this.callContractMethod(this.contract.methods.getTransaction(txRecord.txId));
            this.assertTest(tx.status === '1', 'Transaction is pending');

            console.log('  🎉 Step 3 completed: New ownership transfer request created');

        } catch (error) {
            console.log(`  ❌ Step 3 failed: ${error.message}`);
            throw error;
        }
    }

    async testStep4TimeDelayCancel() {
        console.log('\n📝 STEP 4: Time Delay Cancel (Recovery Role)');
        console.log('---------------------------------------------');
        console.log('⏰ This test requires waiting 1 second for timelock...');

        // Validate permissions
        await this.validateWorkflowPermissions('OWNERSHIP TRANSFER TIME DELAY CANCELLATION', [
            {
                role: 'recovery',
                functionSelector: '0x5f861ebf', // TRANSFER_OWNERSHIP_CANCELLATION_SELECTOR
                expectedActions: [2], // EXECUTE_TIME_DELAY_CANCEL
                description: 'Recovery can cancel ownership transfer after timelock'
            }
        ]);

        // Check for pending transactions
        const pendingCheck = await this.checkPendingTransactions();

        try {
            let txRecord;
            if (pendingCheck.hasPending) {
                // Use existing pending transaction
                const ownershipTx = pendingCheck.transactions.find(tx => 
                    tx.operationType === '0xb23d8fa2f62c8a954db45521d1249908693b29ffd3d2dab6348898c4198996b2' // Actual OWNERSHIP_TRANSFER hash from transaction
                );
                if (ownershipTx) {
                    // Get the full transaction record
                    const fullTx = await this.callContractMethod(this.contract.methods.getTransaction(ownershipTx.txId));
                    txRecord = { txId: ownershipTx.txId, ...fullTx };
                    console.log(`  📋 Using existing ownership transfer transaction ${txRecord.txId}`);
                } else {
                    console.log(`  📋 No existing ownership transfer transaction found, creating new one...`);
                    // Create a new ownership transfer request
                    txRecord = await this.createOwnershipRequestAndDeriveTxId();
                    this.assertTest(txRecord.txId > 0, 'Ownership transfer request created');
                }
            } else {
                console.log(`  📋 No pending transactions found, creating new ownership transfer request...`);
                // Create a new ownership transfer request
                txRecord = await this.createOwnershipRequestAndDeriveTxId();
                this.assertTest(txRecord.txId > 0, 'Ownership transfer request created');
            }

            // Wait for timelock to expire
            console.log('  ⏳ Waiting for timelock to expire...');
            
            // Get the actual timelock period and release time
            const txBeforeCancellation = await this.callContractMethod(this.contract.methods.getTransaction(txRecord.txId));
            const releaseTime = parseInt(txBeforeCancellation.releaseTime);
            
            // Get actual blockchain time instead of machine time
            const currentBlock = await this.web3.eth.getBlock('latest');
            const currentBlockchainTime = currentBlock.timestamp;
            const timeToAdvance = releaseTime - currentBlockchainTime + 10; // Add 10 seconds buffer
            
            console.log(`  📋 Release time: ${releaseTime}`);
            console.log(`  📋 Current blockchain time: ${currentBlockchainTime}`);
            console.log(`  📋 Time to advance: ${timeToAdvance} seconds`);
            
            // Advance time by the calculated amount
            if (timeToAdvance > 0) {
                console.log(`  ⏰ Advancing blockchain time by ${timeToAdvance} seconds...`);
                await this.advanceBlockchainTime(timeToAdvance);
            } else {
                console.log(`  ✅ Timelock already expired, no need to advance time`);
            }

            // Recovery cancels the transaction
            const receipt = await this.sendTransaction(
                this.contract.methods.transferOwnershipCancellation(txRecord.txId),
                this.getRoleWalletObject('recovery')
            );

            console.log('  ✅ Time delay cancellation executed successfully');
            console.log(`  📋 Transaction Hash: ${receipt.transactionHash}`);

            // Verify transaction is cancelled
            // TxStatus enum: 0=UNDEFINED, 1=PENDING, 2=EXECUTING, 3=PROCESSING_PAYMENT, 4=CANCELLED, 5=COMPLETED, 6=FAILED            const tx = await this.callContractMethod(this.contract.methods.getTransaction(txRecord.txId));
            this.assertTest(tx.status === '4', 'Transaction cancelled successfully');

            console.log('  🎉 Step 4 completed: Time delay cancel executed');

        } catch (error) {
            console.log(`  ❌ Step 4 failed: ${error.message}`);
            throw error;
        }
    }

    async testStep5CreateNewRequest() {
        console.log('\n📝 STEP 5: Create New Ownership Transfer Request');
        console.log('-----------------------------------------------');
        console.log('📋 Recovery role creates new ownership transfer request');

        // Check for pending transactions
        await this.checkPendingTransactions();

        try {
            // Recovery creates new ownership transfer request
            const txRecord = await this.createOwnershipRequestAndDeriveTxId();
            this.assertTest(txRecord.txId > 0, 'New ownership transfer request created');
            
            console.log(`  📋 Created transaction ID: ${txRecord.txId}`);
            console.log(`  📋 Transaction status: ${txRecord.status}`);
            console.log(`  📋 Operation type: ${txRecord.params.operationType}`);

            // Verify transaction is pending
            const tx = await this.callContractMethod(this.contract.methods.getTransaction(txRecord.txId));
            this.assertTest(tx.status === '1', 'Transaction is pending');

            console.log('  🎉 Step 5 completed: New ownership transfer request created');

        } catch (error) {
            console.log(`  ❌ Step 5 failed: ${error.message}`);
            throw error;
        }
    }

    async testStep6MetaApprove() {
        console.log('\n📝 STEP 6: Meta Approve (Owner Sign, Broadcaster Execute)');
        console.log('--------------------------------------------------------');
        console.log('⚡ This test provides instant approval (bypasses timelock)');

        // Validate permissions
        await this.validateWorkflowPermissions('OWNERSHIP TRANSFER META-TRANSACTION APPROVAL', [
            {
                role: 'owner',
                functionSelector: '0xcaca0f7e', // TRANSFER_OWNERSHIP_APPROVE_META_SELECTOR
                expectedActions: [4], // SIGN_META_APPROVE
                description: 'Owner can sign ownership transfer approval meta-transaction'
            },
            {
                role: 'broadcaster',
                functionSelector: '0xcaca0f7e', // TRANSFER_OWNERSHIP_APPROVE_META_SELECTOR
                expectedActions: [7], // EXECUTE_META_APPROVE
                description: 'Broadcaster can execute ownership transfer approval meta-transaction'
            }
        ]);

        // Check for pending transactions
        const pendingCheck = await this.checkPendingTransactions();

        try {
            let txRecord;
            if (pendingCheck.hasPending) {
                // Use existing pending transaction
                const ownershipTx = pendingCheck.transactions.find(tx => 
                    tx.operationType === '0xb23d8fa2f62c8a954db45521d1249908693b29ffd3d2dab6348898c4198996b2' // Actual OWNERSHIP_TRANSFER hash from transaction
                );
                if (ownershipTx) {
                    // Get the full transaction record
                    const fullTx = await this.callContractMethod(this.contract.methods.getTransaction(ownershipTx.txId));
                    txRecord = { txId: ownershipTx.txId, ...fullTx };
                    console.log(`  📋 Using existing ownership transfer transaction ${txRecord.txId}`);
                } else {
                    console.log(`  📋 No existing ownership transfer transaction found, creating new one...`);
                    // Create a new ownership transfer request
                    txRecord = await this.createOwnershipRequestAndDeriveTxId();
                    this.assertTest(txRecord.txId > 0, 'Ownership transfer request created');
                }
            } else {
                console.log(`  📋 No pending transactions found, creating new ownership transfer request...`);
                // Create a new ownership transfer request
                txRecord = await this.createOwnershipRequestAndDeriveTxId();
                this.assertTest(txRecord.txId > 0, 'Ownership transfer request created');
            }

            // Create meta-transaction parameters for approval
        const metaTxParams = await this.callContractMethod(this.contract.methods.createMetaTxParams(
            this.contractAddress,
            '0xcaca0f7e', // TRANSFER_OWNERSHIP_APPROVE_META_SELECTOR
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
                this.contract.methods.transferOwnershipApprovalWithMetaTx(fullMetaTx),
                this.getRoleWalletObject('broadcaster')
            );

            console.log('  ✅ Meta-transaction approval executed successfully');
            console.log(`  📋 Transaction Hash: ${receipt.transactionHash}`);

            // Verify transaction is completed (use recovery wallet since owner has changed)
            // TxStatus enum: 0=UNDEFINED, 1=PENDING, 2=EXECUTING, 3=PROCESSING_PAYMENT, 4=CANCELLED, 5=COMPLETED, 6=FAILED            const tx = await this.callContractMethod(this.contract.methods.getTransaction(txRecord.txId), this.getRoleWalletObject('recovery'));
            this.assertTest(Number(tx.status) === 5, 'Transaction completed successfully');

            console.log('  🎉 Step 6 completed: Meta approve executed');

        } catch (error) {
            console.log(`  ❌ Step 6 failed: ${error.message}`);
            throw error;
        }
    }

    async testStep7VerifyOwnershipChange() {
        console.log('\n📝 STEP 7: Verify Ownership Change');
        console.log('-----------------------------------');
        console.log('📋 Verify that ownership has changed (recovery is now owner)');

        try {
            // Get current owner
            const currentOwner = await this.callContractMethod(this.contract.methods.owner());
            console.log(`  👑 Current owner: ${currentOwner}`);
            console.log(`  🛡️ Original recovery: ${this.roles.recovery}`);

            // Verify ownership changed to recovery address
            this.assertTest(
                currentOwner.toLowerCase() === this.roles.recovery.toLowerCase(),
                'Ownership transferred to recovery address'
            );

            // Update internal role tracking
            this.roles.owner = currentOwner;
            this.roleWallets.owner = this.roleWallets.recovery;

            console.log('  🎉 Step 7 completed: Ownership change verified');

        } catch (error) {
            console.log(`  ❌ Step 7 failed: ${error.message}`);
            throw error;
        }
    }

    async testStep8UpdateRecoveryAddress() {
        console.log('\n📝 STEP 8: Update Recovery Address to New Wallet');
        console.log('------------------------------------------------');
        console.log('📋 Update recovery address to a new wallet (wallet4)');

        try {
            // Find unused wallet for recovery update
            const currentRecovery = await this.callContractMethod(this.contract.methods.getRecovery());
            const newRecovery = this.findUnusedWalletForRecovery(currentRecovery);
            console.log(`  🛡️ Current recovery: ${currentRecovery}`);
            console.log(`  🛡️ New recovery: ${newRecovery}`);

            // Build execution params locally (definition-library pattern; contract no longer exposes updateRecoveryExecutionParams)
            const executionParams = this.web3.eth.abi.encodeParameter('address', newRecovery);

            // Get the execution selector for executeRecoveryUpdate(address)
            const executionSelector = '0x9ce5606e'; // UPDATE_RECOVERY_SELECTOR

            // Create meta-transaction parameters
            const metaTxParams = await this.callContractMethod(this.contract.methods.createMetaTxParams(
                this.contractAddress,
                '0xfa3fb3e7', // UPDATE_RECOVERY_META_SELECTOR
                this.getTxAction('SIGN_META_REQUEST_AND_APPROVE'),
                3600, // 1 hour deadline
                0, // no max gas price
                this.getRoleWalletObject('owner').address // Current owner signs
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

            // Sign the meta-transaction
            const signature = await this.eip712Signer.signMetaTransaction(unsignedMetaTx, this.getRoleWallet('owner'), this.contract);

            // Execute the meta-transaction
            const fullMetaTx = {
                txRecord: unsignedMetaTx.txRecord,
                params: unsignedMetaTx.params,
                message: unsignedMetaTx.message,
                signature: signature.signature,
                data: unsignedMetaTx.data
            };

            const receipt = await this.sendTransaction(
                this.contract.methods.updateRecoveryRequestAndApprove(fullMetaTx),
                this.getRoleWalletObject('broadcaster')
            );

            console.log('  ✅ Recovery address updated successfully');
            console.log(`  📋 Transaction Hash: ${receipt.transactionHash}`);

            // Update internal role tracking
            this.roles.recovery = newRecovery;
            this.roleWallets.recovery = this.findWalletByAddress(newRecovery);

            console.log('  🎉 Step 8 completed: Recovery address updated');

        } catch (error) {
            console.log(`  ❌ Step 8 failed: ${error.message}`);
            throw error;
        }
    }

    async testStep9CreateNewRequestWithNewRecovery() {
        console.log('\n📝 STEP 9: Create New Ownership Transfer Request (New Recovery)');
        console.log('---------------------------------------------------------------');
        console.log('📋 New recovery role creates ownership transfer request');

        // Check for pending transactions
        await this.checkPendingTransactions();

        try {
            // New recovery creates ownership transfer request
            const txRecord = await this.createOwnershipRequestAndDeriveTxId();
            this.assertTest(txRecord.txId > 0, 'New ownership transfer request created');
            
            console.log(`  📋 Created transaction ID: ${txRecord.txId}`);
            console.log(`  📋 Transaction status: ${txRecord.status}`);
            console.log(`  📋 Operation type: ${txRecord.params.operationType}`);

            // Verify transaction is pending
            const tx = await this.callContractMethod(this.contract.methods.getTransaction(txRecord.txId));
            this.assertTest(tx.status === '1', 'Transaction is pending');

            console.log('  🎉 Step 9 completed: New ownership transfer request created');

        } catch (error) {
            console.log(`  ❌ Step 9 failed: ${error.message}`);
            throw error;
        }
    }

    async testStep10TimeDelayApprove() {
        console.log('\n📝 STEP 10: Time Delay Approve (New Recovery Wallet)');
        console.log('-----------------------------------------------------');
        console.log('⏰ This test requires waiting 1 second for timelock...');

        // Validate permissions
        await this.validateWorkflowPermissions('OWNERSHIP TRANSFER TIME DELAY APPROVAL', [
            {
                role: 'owner',
                functionSelector: '0xb7d254d6', // TRANSFER_OWNERSHIP_DELAYED_APPROVAL_SELECTOR
                expectedActions: [1], // EXECUTE_TIME_DELAY_APPROVE
                description: 'Owner can approve ownership transfer after timelock'
            }
        ]);

        // Check for pending transactions
        const pendingCheck = await this.checkPendingTransactions();
        
        let txRecord;
        if (pendingCheck.hasPending) {
            // Use existing pending transaction
            const ownershipTx = pendingCheck.transactions.find(tx => 
                tx.operationType === '0xb23d8fa2f62c8a954db45521d1249908693b29ffd3d2dab6348898c4198996b2' // Actual OWNERSHIP_TRANSFER hash from transaction
            );
            if (ownershipTx) {
                console.log(`  📋 Using existing ownership transfer transaction ${ownershipTx.txId}`);
                // Get the full transaction record
                const fullTx = await this.callContractMethod(this.contract.methods.getTransaction(ownershipTx.txId));
                txRecord = { txId: ownershipTx.txId, ...fullTx };
            } else {
                console.log(`  📋 Creating new ownership transfer request...`);
                txRecord = await this.createOwnershipRequestAndDeriveTxId();
                this.assertTest(txRecord.txId > 0, 'Ownership transfer request created');
            }
        } else {
            console.log(`  📋 Creating new ownership transfer request...`);
            txRecord = await this.createOwnershipRequestAndDeriveTxId();
            this.assertTest(txRecord.txId > 0, 'Ownership transfer request created');
        }

        try {
            // Wait for timelock to expire
            console.log('  ⏳ Waiting for timelock to expire...');
            
            // Get the actual timelock period and release time
            const txBeforeApproval = await this.callContractMethod(this.contract.methods.getTransaction(txRecord.txId));
            const releaseTime = parseInt(txBeforeApproval.releaseTime);
            
            // Get actual blockchain time instead of machine time
            const currentBlock = await this.web3.eth.getBlock('latest');
            const currentBlockchainTime = currentBlock.timestamp;
            const timeToAdvance = releaseTime - currentBlockchainTime + 10; // Add 10 seconds buffer
            
            console.log(`  📋 Release time: ${releaseTime}`);
            console.log(`  📋 Current blockchain time: ${currentBlockchainTime}`);
            console.log(`  📋 Time to advance: ${timeToAdvance} seconds`);
            
            // Advance time by the calculated amount
            if (timeToAdvance > 0) {
                console.log(`  ⏰ Advancing blockchain time by ${timeToAdvance} seconds...`);
                await this.advanceBlockchainTime(timeToAdvance);
            } else {
                console.log(`  ✅ Timelock already expired, no need to advance time`);
            }

            // Owner approves the transaction
            console.log(`  📋 Calling transferOwnershipDelayedApproval(${txRecord.txId})...`);
            const receipt = await this.sendTransaction(
                this.contract.methods.transferOwnershipDelayedApproval(txRecord.txId),
                this.getRoleWalletObject('owner')
            );

            console.log('  ✅ Time delay approval executed successfully');
            console.log(`  📋 Transaction Hash: ${receipt.transactionHash}`);

            // Verify transaction is completed (use recovery wallet since owner has changed)
            // TxStatus enum: 0=UNDEFINED, 1=PENDING, 2=EXECUTING, 3=PROCESSING_PAYMENT, 4=CANCELLED, 5=COMPLETED, 6=FAILED            const tx = await this.callContractMethod(this.contract.methods.getTransaction(txRecord.txId), this.getRoleWalletObject('recovery'));
            this.assertTest(Number(tx.status) === 5, 'Transaction completed successfully');

            console.log('  🎉 Step 10 completed: Time delay approve executed');

        } catch (error) {
            console.log(`  ❌ Step 10 failed: ${error.message}`);
            throw error;
        }
    }

    async testStep11VerifyFinalOwnershipChange() {
        console.log('\n📝 STEP 11: Verify Final Ownership Change');
        console.log('---------------------------------------');
        console.log('📋 Verify that ownership has changed back to new recovery');

        try {
            // Get current owner
            const currentOwner = await this.callContractMethod(this.contract.methods.owner());
            console.log(`  👑 Current owner: ${currentOwner}`);
            console.log(`  🛡️ New recovery: ${this.roles.recovery}`);

            // Verify ownership changed to new recovery address
            this.assertTest(
                currentOwner.toLowerCase() === this.roles.recovery.toLowerCase(),
                'Ownership transferred to new recovery address'
            );

            // Update internal role tracking
            this.roles.owner = currentOwner;
            this.roleWallets.owner = this.roleWallets.recovery;

            console.log('  🎉 Step 11 completed: Final ownership change verified');
            console.log('  🎉 Complete ownership transfer workflow completed successfully!');

        } catch (error) {
            console.log(`  ❌ Step 11 failed: ${error.message}`);
            throw error;
        }
    }

    async createOwnershipRequestAndDeriveTxId() {
        // Send the request
        await this.sendTransaction(
            this.contract.methods.transferOwnershipRequest(),
            this.getRoleWalletObject('recovery')
        );

        // Try to get the txId from pending transactions
        for (let i = 0; i < 5; i++) {
            const pending = await this.callContractMethod(this.contract.methods.getPendingTransactions());
            if (pending && pending.length > 0) {
                const lastId = pending[pending.length - 1];
                if (lastId) {
                    // Get the full transaction record
                    const txRecord = await this.callContractMethod(this.contract.methods.getTransaction(lastId));
                    return { txId: parseInt(lastId), ...txRecord };
                }
            }
            await new Promise(r => setTimeout(r, 300));
        }

        // Fallback: scan transaction history
        try {
            const history = await this.callContractMethod(this.contract.methods.getTransactionHistory(1, 50));
            const ownershipHash = this.web3.utils.keccak256('OWNERSHIP_TRANSFER');
            for (let i = history.length - 1; i >= 0; i--) {
                const rec = history[i];
                if (rec && rec.status === '1' && rec.params && rec.params.operationType &&
                    rec.params.operationType.toLowerCase() === ownershipHash.toLowerCase() &&
                    rec.params.requester && rec.params.requester.toLowerCase() === this.roles.recovery.toLowerCase()) {
                    return { txId: parseInt(rec.txId), ...rec };
                }
            }
        } catch (_) {}

        return { txId: 0 };
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

    /**
     * Find wallet object by address
     * @param {string} address - Wallet address
     * @returns {object} Wallet object
     */
    findWalletByAddress(address) {
        const wallets = [
            this.wallets.wallet1,
            this.wallets.wallet2,
            this.wallets.wallet3,
            this.wallets.wallet4,
            this.wallets.wallet5
        ];

        for (const wallet of wallets) {
            if (wallet.address.toLowerCase() === address.toLowerCase()) {
                return wallet;
            }
        }

        throw new Error(`Wallet not found for address: ${address}`);
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
                    // Cancel the transaction using the appropriate cancellation function
                    // For ownership transfer, we need to use the recovery role
                    await this.sendTransaction(
                        this.contract.methods.transferOwnershipCancellation(txId),
                        this.getRoleWalletObject('recovery')
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
}

module.exports = OwnershipTransferTests;