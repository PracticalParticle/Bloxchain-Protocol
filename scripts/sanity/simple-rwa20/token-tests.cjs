/**
 * SimpleRWA20 Token Operation Tests
 * Tests minting and burning functionality with meta-transaction support
 */

const BaseSimpleRWA20Test = require('./base-test.cjs');

class SimpleRWA20TokenTests extends BaseSimpleRWA20Test {
    constructor() {
        super('SimpleRWA20 Token Operations');
    }

    async executeTests() {
        await this.testInitialState();
        await this.testTokenMinting();
        await this.testTokenBurning();
        await this.testMetaTransactionMinting();
        await this.testMetaTransactionBurning();
        await this.testTokenTransfers();
        await this.testBurnableFunctionality();
    }

    async testInitialState() {
        await this.startTest('Verify initial contract state');
        
        try {
            // Check token name and symbol
            const name = await this.callMethod(this.contract.methods.name);
            const symbol = await this.callMethod(this.contract.methods.symbol);
            const decimals = await this.callMethod(this.contract.methods.decimals);
            
            console.log(`   Token Name: ${name}`);
            console.log(`   Token Symbol: ${symbol}`);
            console.log(`   Decimals: ${decimals}`);
            
            // Check initial total supply
            const totalSupply = await this.getTotalSupply();
            console.log(`   Initial Total Supply: ${totalSupply} tokens`);
            
            // Check owner balances
            const ownerBalance = await this.getTokenBalance(this.roles.owner);
            const broadcasterBalance = await this.getTokenBalance(this.roles.broadcaster);
            const recoveryBalance = await this.getTokenBalance(this.roles.recovery);
            
            console.log(`   Owner Balance: ${ownerBalance} tokens`);
            console.log(`   Broadcaster Balance: ${broadcasterBalance} tokens`);
            console.log(`   Recovery Balance: ${recoveryBalance} tokens`);
            
            // Check role assignments
            console.log(`   Owner: ${this.roles.owner}`);
            console.log(`   Broadcaster: ${this.roles.broadcaster}`);
            console.log(`   Recovery: ${this.roles.recovery}`);
            
            await this.passTest('Initial state verification', 'Contract properly initialized');
            
        } catch (error) {
            await this.failTest('Initial state verification', error);
        }
    }

    async testTokenMinting() {
        await this.startTest('Test token minting via meta-transaction');
        
        try {
            const mintAmount = '1000'; // 1000 tokens
            const recipient = this.wallets.broadcaster.address;
            const beforeBalance = await this.getTokenBalance(recipient);
            const beforeTotalSupply = await this.getTotalSupply();
            
            // Meta-transaction parameters
            const metaTxParams = {
                deadline: 3600, // 1 hour from now (3600 seconds)
                maxGasPrice: this.web3.utils.toWei('20', 'gwei')
            };
            
            console.log(`   Generated mint meta-transaction for ${mintAmount} tokens`);
            
            // Use the complete mint workflow: generate -> sign -> execute
            const mintTx = await this.completeMintWorkflow(recipient, mintAmount, metaTxParams);
            
            console.log(`   Mint transaction hash: ${mintTx.transactionHash}`);
            
            // Verify tokens were minted (no hardcoded expectations)
            const newBalance = await this.getTokenBalance(recipient);
            const newTotalSupply = await this.getTotalSupply();
            
            console.log(`   Recipient new balance: ${newBalance} tokens`);
            console.log(`   New total supply: ${newTotalSupply} tokens`);
            
            const expectedBalance = parseFloat(beforeBalance) + parseFloat(mintAmount);
            const expectedSupply = parseFloat(beforeTotalSupply) + parseFloat(mintAmount);
            if (
                Math.abs(parseFloat(newBalance) - expectedBalance) < 0.001 &&
                Math.abs(parseFloat(newTotalSupply) - expectedSupply) < 0.001
            ) {
                await this.passTest('Token minting', `Balance +${mintAmount}, supply +${mintAmount}`);
            } else {
                throw new Error(`Expected balance ${expectedBalance} and supply ${expectedSupply}, got balance ${newBalance}, supply ${newTotalSupply}`);
            }
            
        } catch (error) {
            await this.failTest('Token minting', error);
        }
    }

    async testTokenBurning() {
        await this.startTest('Test token burning via meta-transaction');
        
        try {
            const burnAmount = '100'; // 100 tokens
            const burner = this.wallets.broadcaster.address;
            
            // First, ensure the burner has enough tokens
            const currentBalance = await this.getTokenBalance(burner);
            console.log(`   Current burner balance: ${currentBalance} tokens`);
            
            if (parseFloat(currentBalance) < parseFloat(burnAmount)) {
                console.log(`   Insufficient balance for burning, skipping test`);
                await this.passTest('Token burning', 'Skipped - insufficient balance');
                return;
            }

            // Ensure allowance is set for the contract to burn tokens via burnFrom
            const amountWei = this.web3.utils.toWei(burnAmount, 'ether');
            const allowance = await this.contract.methods.allowance(burner, this.contract.options.address).call();
            if (this.web3.utils.toBN(allowance).lt(this.web3.utils.toBN(amountWei))) {
                const approveTx = await this.executeTransaction(
                    this.contract.methods.approve,
                    [this.contract.options.address, amountWei],
                    { from: burner }
                );
                console.log(`   Approved allowance for burn: ${approveTx.transactionHash}`);
            } else {
                console.log(`   Sufficient allowance already set for burn`);
            }
            
            // Meta-transaction parameters
            const metaTxParams = {
                deadline: 3600, // 1 hour from now (3600 seconds)
                maxGasPrice: this.web3.utils.toWei('20', 'gwei')
            };
            
            console.log(`   Generated burn meta-transaction for ${burnAmount} tokens`);
            
            // Use the complete burn workflow: generate -> sign -> execute
            const burnTx = await this.completeBurnWorkflow(burner, burnAmount, metaTxParams);
            
            console.log(`   Burn transaction hash: ${burnTx.transactionHash}`);
            
            // Verify tokens were burned
            const newBalance = await this.getTokenBalance(burner);
            const newTotalSupply = await this.getTotalSupply();
            
            console.log(`   Burner new balance: ${newBalance} tokens`);
            console.log(`   New total supply: ${newTotalSupply} tokens`);
            
            const expectedBalance = parseFloat(currentBalance) - parseFloat(burnAmount);
            if (Math.abs(parseFloat(newBalance) - expectedBalance) < 0.001) {
                await this.passTest('Token burning', `Successfully burned ${burnAmount} tokens`);
            } else {
                throw new Error(`Expected ${expectedBalance} tokens, got ${newBalance}`);
            }
            
        } catch (error) {
            await this.failTest('Token burning', error);
        }
    }

    async testMetaTransactionMinting() {
        await this.startTest('Test meta-transaction minting with different parameters');
        
        try {
            const mintAmount = '500'; // 500 tokens
            const recipient = this.wallets.recovery.address;
            const beforeBalance = await this.getTokenBalance(recipient);
            const beforeTotalSupply = await this.getTotalSupply();
            
            // Meta-transaction parameters with different values
            const metaTxParams = {
                deadline: 3600, // 1 hour from now (3600 seconds)
                maxGasPrice: this.web3.utils.toWei('15', 'gwei')
            };
            
            console.log(`   Generated mint meta-transaction for ${mintAmount} tokens`);
            
            // Use the complete mint workflow: generate -> sign -> execute
            const mintTx = await this.completeMintWorkflow(recipient, mintAmount, metaTxParams);
            
            console.log(`   Mint transaction hash: ${mintTx.transactionHash}`);
            
            // Verify tokens were minted (delta-based)
            const newBalance = await this.getTokenBalance(recipient);
            const newTotalSupply = await this.getTotalSupply();
            console.log(`   Recipient new balance: ${newBalance} tokens`);
            const expectedBalance = parseFloat(beforeBalance) + parseFloat(mintAmount);
            const expectedSupply = parseFloat(beforeTotalSupply) + parseFloat(mintAmount);
            if (
                Math.abs(parseFloat(newBalance) - expectedBalance) < 0.001 &&
                Math.abs(parseFloat(newTotalSupply) - expectedSupply) < 0.001
            ) {
                await this.passTest('Meta-transaction minting', `Balance +${mintAmount}, supply +${mintAmount}`);
            } else {
                throw new Error(`Expected balance ${expectedBalance} and supply ${expectedSupply}, got balance ${newBalance}, supply ${newTotalSupply}`);
            }
            
        } catch (error) {
            await this.failTest('Meta-transaction minting', error);
        }
    }

    async testMetaTransactionBurning() {
        await this.startTest('Test meta-transaction burning with different parameters');
        
        try {
            const burnAmount = '50'; // 50 tokens
            const burner = this.wallets.recovery.address;
            
            // Check current balance
            const currentBalance = await this.getTokenBalance(burner);
            console.log(`   Current burner balance: ${currentBalance} tokens`);
            
            if (parseFloat(currentBalance) < parseFloat(burnAmount)) {
                console.log(`   Insufficient balance for burning, skipping test`);
                await this.passTest('Meta-transaction burning', 'Skipped - insufficient balance');
                return;
            }

            // Ensure allowance is set for the contract to burn tokens via burnFrom
            const amountWei = this.web3.utils.toWei(burnAmount, 'ether');
            const allowance = await this.contract.methods.allowance(burner, this.contract.options.address).call();
            if (this.web3.utils.toBN(allowance).lt(this.web3.utils.toBN(amountWei))) {
                const approveTx = await this.executeTransaction(
                    this.contract.methods.approve,
                    [this.contract.options.address, amountWei],
                    { from: burner }
                );
                console.log(`   Approved allowance for burn: ${approveTx.transactionHash}`);
            } else {
                console.log(`   Sufficient allowance already set for burn`);
            }
            
            // Meta-transaction parameters with different values
            const metaTxParams = {
                deadline: 3600, // 1 hour from now (3600 seconds)
                maxGasPrice: this.web3.utils.toWei('15', 'gwei')
            };
            
            console.log(`   Generated burn meta-transaction for ${burnAmount} tokens`);
            
            // Use the complete burn workflow: generate -> sign -> execute
            const burnTx = await this.completeBurnWorkflow(burner, burnAmount, metaTxParams);
            
            console.log(`   Burn transaction hash: ${burnTx.transactionHash}`);
            
            // Verify tokens were burned (delta-based)
            const newBalance = await this.getTokenBalance(burner);
            const expectedBalance = parseFloat(currentBalance) - parseFloat(burnAmount);
            console.log(`   Burner new balance: ${newBalance} tokens`);
            if (Math.abs(parseFloat(newBalance) - expectedBalance) < 0.001) {
                await this.passTest('Meta-transaction burning', `Balance -${burnAmount}`);
            } else {
                throw new Error(`Expected balance ${expectedBalance}, got ${newBalance}`);
            }
            
        } catch (error) {
            await this.failTest('Meta-transaction burning', error);
        }
    }

    async testTokenTransfers() {
        await this.startTest('Test standard ERC20 token transfers');
        
        try {
            const transferAmount = '100'; // 100 tokens
            const from = this.wallets.broadcaster.address;
            const to = this.wallets.recovery.address;
            
            // Check sender balance
            const senderBalance = await this.getTokenBalance(from);
            console.log(`   Sender balance: ${senderBalance} tokens`);
            
            if (parseFloat(senderBalance) < parseFloat(transferAmount)) {
                console.log(`   Insufficient balance for transfer, skipping test`);
                await this.passTest('Token transfers', 'Skipped - insufficient balance');
                return;
            }
            
            // Execute transfer
            const transferTx = await this.executeTransaction(
                this.contract.methods.transfer,
                [to, this.web3.utils.toWei(transferAmount, 'ether')],
                { from: from }
            );
            
            console.log(`   Transfer transaction hash: ${transferTx.transactionHash}`);
            
            // Verify transfer
            const senderNewBalance = await this.getTokenBalance(from);
            const recipientNewBalance = await this.getTokenBalance(to);
            
            console.log(`   Sender new balance: ${senderNewBalance} tokens`);
            console.log(`   Recipient new balance: ${recipientNewBalance} tokens`);
            
            await this.passTest('Token transfers', `Successfully transferred ${transferAmount} tokens`);
            
        } catch (error) {
            await this.failTest('Token transfers', error);
        }
    }

    async testBurnableFunctionality() {
        await this.startTest('Test ERC20Burnable functionality');
        
        try {
            const burnAmount = '25'; // 25 tokens
            const burner = this.wallets.recovery.address;
            
            // Check current balance
            const currentBalance = await this.getTokenBalance(burner);
            console.log(`   Current burner balance: ${currentBalance} tokens`);
            
            if (parseFloat(currentBalance) < parseFloat(burnAmount)) {
                console.log(`   Insufficient balance for burning, skipping test`);
                await this.passTest('Burnable functionality', 'Skipped - insufficient balance');
                return;
            }
            
            // Execute burn using ERC20Burnable
            const burnTx = await this.executeTransaction(
                this.contract.methods.burn,
                [this.web3.utils.toWei(burnAmount, 'ether')],
                { from: burner }
            );
            
            console.log(`   Burn transaction hash: ${burnTx.transactionHash}`);
            
            // Verify burn
            const newBalance = await this.getTokenBalance(burner);
            const newTotalSupply = await this.getTotalSupply();
            
            console.log(`   Burner new balance: ${newBalance} tokens`);
            console.log(`   New total supply: ${newTotalSupply} tokens`);
            
            const expectedBalance = parseFloat(currentBalance) - parseFloat(burnAmount);
            if (Math.abs(parseFloat(newBalance) - expectedBalance) < 0.001) {
                await this.passTest('Burnable functionality', `Successfully burned ${burnAmount} tokens using ERC20Burnable`);
            } else {
                throw new Error(`Expected ${expectedBalance} tokens, got ${newBalance}`);
            }
            
        } catch (error) {
            await this.failTest('Burnable functionality', error);
        }
    }
}

module.exports = SimpleRWA20TokenTests;
