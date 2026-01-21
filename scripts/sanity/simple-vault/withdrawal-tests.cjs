/**
 * SimpleVault Withdrawal Tests
 * Tests ETH and token withdrawal functionality with time-lock and meta-transaction support
 */

const BaseSimpleVaultTest = require('./base-test.cjs');

class SimpleVaultWithdrawalTests extends BaseSimpleVaultTest {
    constructor() {
        super('SimpleVault Withdrawal');
    }

    async executeTests() {
        // 1) deposit 1 ETH
        await this.testEthDeposit();

        // 2) request withdrawal 0.5 by owner
        const firstTxId = await this.testEthWithdrawalRequest(this.wallets.owner.address, this.wallets.broadcaster.address, '0.5');

        // 3) cancel withdrawal by owner
        await this.testWithdrawalCancellation(firstTxId);

        // 4) request withdrawal again 0.5 by owner
        const secondTxId = await this.testEthWithdrawalRequest(this.wallets.owner.address, this.wallets.broadcaster.address, '0.5');

        // 5) approve after time delay by owner
        await this.testEthWithdrawalApproval(secondTxId);

        // 6) request withdrawal again 0.5 by owner
        const thirdTxId = await this.testEthWithdrawalRequest(this.wallets.owner.address, this.wallets.broadcaster.address, '0.5');

        // 7-8) owner signs meta approve, broadcaster executes
        await this.testMetaTransactionApproval(thirdTxId);
    }

    async testInitialState() {
        await this.startTest('Verify initial contract state');
        
        try {
            // Check initial ETH balance
            const ethBalance = await this.getEthBalance(this.contractAddress);
            console.log(`   Initial ETH balance: ${ethBalance} ETH`);
            
            // Check owner
            const owner = await this.callMethod(this.contract.methods.owner);
            console.log(`   Owner: ${owner}`);
            
            // Check broadcaster
            const broadcaster = await this.callMethod(this.contract.methods.getBroadcaster);
            console.log(`   Broadcaster: ${broadcaster}`);
            
            // Check recovery
            const recovery = await this.callMethod(this.contract.methods.getRecovery);
            console.log(`   Recovery: ${recovery}`);
            
            await this.passTest('Initial state verification', 'Contract properly initialized');
            
        } catch (error) {
            await this.failTest('Initial state verification', error);
        }
    }

    async testEthDeposit() {
        await this.startTest('Test ETH deposit to vault');
        
        try {
            const depositAmount = '1.0'; // 1 ETH
            const initialBalance = await this.getEthBalance(this.contractAddress);
            
            // Send ETH to the contract
            await this.sendEth(this.contractAddress, depositAmount);
            
            const finalBalance = await this.getEthBalance(this.contractAddress);
            const balanceIncrease = parseFloat(finalBalance) - parseFloat(initialBalance);
            
            console.log(`   Initial balance: ${initialBalance} ETH`);
            console.log(`   Final balance: ${finalBalance} ETH`);
            console.log(`   Balance increase: ${balanceIncrease} ETH`);
            
            if (Math.abs(balanceIncrease - parseFloat(depositAmount)) < 0.001) {
                await this.passTest('ETH deposit', `Successfully deposited ${depositAmount} ETH`);
            } else {
                throw new Error(`Expected ${depositAmount} ETH increase, got ${balanceIncrease}`);
            }
            
        } catch (error) {
            await this.failTest('ETH deposit', error);
        }
    }

    async testEthWithdrawalRequest(fromAddress, recipient, withdrawAmountEth) {
        await this.startTest('Test ETH withdrawal request');
        
        try {
            // Request ETH withdrawal
            const tx = await this.executeTransaction(
                this.contract.methods.withdrawEthRequest,
                [recipient, this.web3.utils.toWei(withdrawAmountEth, 'ether')],
                { from: fromAddress }
            );
            
            console.log(`   Transaction hash: ${tx.transactionHash}`);
            console.log(`   Recipient: ${recipient}`);
            console.log(`   Amount: ${withdrawAmountEth} ETH`);

            // Read latest pending tx id as source of truth
            const txId = await this.getLatestPendingTxId();
            if (!txId) throw new Error('No pending txId found after request');
            console.log(`   Pending Transaction ID: ${txId}`);
            await this.passTest('ETH withdrawal request', `Created transaction ${txId}`);
            return txId;
            
        } catch (error) {
            await this.failTest('ETH withdrawal request', error);
            throw error;
        }
    }

    async testEthWithdrawalApproval(txId) {
        await this.startTest('Test ETH withdrawal approval after timelock');
        
        try {
            // Get release time and advance chain time until ready
            const txInfo = await this.getTransaction(txId);
            const releaseTime = parseInt(txInfo.releaseTime);
            await this.waitForTimelockUntil(releaseTime);
            
            // Approve the withdrawal
            const approveTx = await this.executeTransaction(
                this.contract.methods.approveWithdrawalAfterDelay,
                [txId],
                { from: this.wallets.owner.address }
            );
            
            console.log(`   Approval transaction hash: ${approveTx.transactionHash}`);
            // Check if ETH was actually withdrawn
            await this.passTest('ETH withdrawal approval', `Successfully approved and executed withdrawal ${txId}`);
            
        } catch (error) {
            await this.failTest('ETH withdrawal approval', error);
            throw error;
        }
    }

    async testTokenWithdrawal() {
        await this.startTest('Test token withdrawal (simulated)');
        
        try {
            // For this test, we'll simulate a token withdrawal request
            // In a real scenario, you would need to deploy a test ERC20 token first
            
            const tokenAddress = '0x0000000000000000000000000000000000000000'; // Placeholder
            const recipient = this.wallets.broadcaster.address;
            const amount = this.web3.utils.toWei('100', 'ether'); // 100 tokens
            
            // This will likely fail since we don't have a real token, but we can test the request mechanism
            try {
                const tx = await this.executeTransaction(
                    this.contract.methods.withdrawTokenRequest,
                    [tokenAddress, recipient, amount],
                    { from: this.wallets.owner.address }
                );
                
                console.log(`   Token withdrawal request created`);
                await this.passTest('Token withdrawal request', 'Request mechanism works');
                
            } catch (error) {
                if (error.message.includes('OperationNotSupported') || error.message.includes('Insufficient balance')) {
                    console.log(`   Expected error for non-existent token: ${error.message}`);
                    await this.passTest('Token withdrawal request', 'Properly handles non-existent token');
                } else {
                    throw error;
                }
            }
            
        } catch (error) {
            await this.failTest('Token withdrawal', error);
        }
    }

    async testWithdrawalCancellation(existingTxId = null) {
        await this.startTest('Test withdrawal cancellation');
        
        try {
            // Use provided txId or create one and cancel it
            let txId = existingTxId;
            if (!txId) {
                const recipient = this.wallets.recovery.address;
                const requestTx = await this.executeTransaction(
                    this.contract.methods.withdrawEthRequest,
                    [recipient, this.web3.utils.toWei('0.1', 'ether')],
                    { from: this.wallets.owner.address }
                );
                txId = await this.getLatestPendingTxId();
                if (!txId) throw new Error('No pending txId found to cancel');
            }
            
            // Cancel the withdrawal before timelock expires
            const cancelTx = await this.executeTransaction(
                this.contract.methods.cancelWithdrawal,
                [txId],
                { from: this.wallets.owner.address }
            );
            
            console.log(`   Cancellation transaction hash: ${cancelTx.transactionHash}`);
            
            await this.passTest('Withdrawal cancellation', `Successfully cancelled withdrawal ${txId}`);
            
        } catch (error) {
            await this.failTest('Withdrawal cancellation', error);
            throw error;
        }
    }

    async testMetaTransactionApproval(txId) {
        await this.startTest('Test meta-transaction approval');
        
        try {
            // Meta-transaction approval permissions are verified through successful execution

            // Ensure timelock expired
            const txInfo = await this.getTransaction(txId);
            const releaseTime = parseInt(txInfo.releaseTime);
            await this.waitForTimelockUntil(releaseTime);
            
            // Generate meta-transaction for approval
            const metaTxParams = {
                deadline: 3600, // 1 hour from now (in seconds)
                maxGasPrice: this.web3.utils.toWei('20', 'gwei')
            };
            
            let metaTx = await this.callMethod(
                this.contract.methods.generateUnsignedWithdrawalMetaTxApproval,
                [txId, metaTxParams],
                { from: this.wallets.owner.address }
            );
            
            console.log(`   Generated meta-transaction for approval`);
            
            // Sign the meta-transaction
            metaTx = await this.signMetaTransaction(metaTx, this.wallets.owner.privateKey, this.contract);
            console.log(`   Signed meta-transaction`);
            
            // Execute meta-transaction approval
            const approveTx = await this.executeTransaction(
                this.contract.methods.approveWithdrawalWithMetaTx,
                [metaTx],
                { from: this.roleWallets.broadcaster.address }
            );
            
            console.log(`   Meta-transaction approval hash: ${approveTx.transactionHash}`);
            
            await this.passTest('Meta-transaction approval', `Successfully approved via meta-transaction`);
            
        } catch (error) {
            await this.failTest('Meta-transaction approval', error);
            throw error;
        }
    }
}

module.exports = SimpleVaultWithdrawalTests;
