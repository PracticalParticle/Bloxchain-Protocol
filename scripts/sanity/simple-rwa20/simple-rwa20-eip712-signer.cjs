/**
 * SimpleRWA20 EIP-712 Signing Implementation
 * 
 * This module extends the base EIP712Signer to work specifically with SimpleRWA20
 * meta-transactions, handling the minting and burning workflows.
 */

const EIP712Signer = require('../utils/eip712-signing.cjs');

class SimpleRWA20EIP712Signer extends EIP712Signer {
    constructor(web3Instance, contractAddress) {
        super(web3Instance, contractAddress);
        this.contract = null; // Will be set by the test class
    }

    /**
     * Set the contract instance for SimpleRWA20-specific operations
     * @param {Object} contract - The SimpleRWA20 contract instance
     */
    setContract(contract) {
        this.contract = contract;
    }

    /**
     * Set the time advancement methods from the base test
     * @param {Function} advanceBlockchainTime - Method to advance blockchain time
     * @param {Function} waitForTimelock - Method to wait for timelock
     */
    setTimeAdvancementMethods(advanceBlockchainTime, waitForTimelock) {
        this.advanceBlockchainTime = advanceBlockchainTime;
        this.waitForTimelock = waitForTimelock;
    }

    /**
     * Generate an unsigned mint meta-transaction using SimpleRWA20's generateUnsignedMintMetaTx
     * @param {string} to - Recipient address
     * @param {string} amount - Amount to mint (in tokens, not wei)
     * @param {Object} params - Meta-transaction parameters
     * @returns {Object} The unsigned meta-transaction
     */
    async generateUnsignedMintMetaTx(to, amount, params) {
        try {
            console.log(`🏗️ Generating unsigned mint meta-transaction for ${amount} tokens to ${to}`);
            
            // Convert amount to wei
            const amountWei = this.web3.utils.toWei(amount, 'ether');
            
            // Call SimpleRWA20's generateUnsignedMintMetaTx function
            const metaTx = await this.contract.methods.generateUnsignedMintMetaTx(
                to,
                amountWei,
                params
            ).call({ from: this.web3.eth.defaultAccount }); // Add from address
            
            console.log(`📋 Generated unsigned mint meta-transaction:`);
            console.log(`   TxId: ${metaTx.txRecord.txId}`);
            console.log(`   Operation Type: ${metaTx.txRecord.params.operationType}`);
            console.log(`   Target: ${metaTx.txRecord.params.target}`);
            console.log(`   Handler Contract: ${metaTx.params.handlerContract}`);
            console.log(`   Handler Selector: ${metaTx.params.handlerSelector}`);
            console.log(`   Signer: ${metaTx.params.signer}`);
            console.log(`   Nonce: ${metaTx.params.nonce}`);
            console.log(`   Deadline: ${metaTx.params.deadline}`);
            
            return metaTx;
            
        } catch (error) {
            console.error('❌ Failed to generate unsigned mint meta-transaction:', error.message);
            throw error;
        }
    }

    /**
     * Generate an unsigned burn meta-transaction using SimpleRWA20's generateUnsignedBurnMetaTx
     * @param {string} from - Address to burn from
     * @param {string} amount - Amount to burn (in tokens, not wei)
     * @param {Object} params - Meta-transaction parameters
     * @returns {Object} The unsigned meta-transaction
     */
    async generateUnsignedBurnMetaTx(from, amount, params) {
        try {
            console.log(`🏗️ Generating unsigned burn meta-transaction for ${amount} tokens from ${from}`);
            
            // Convert amount to wei
            const amountWei = this.web3.utils.toWei(amount, 'ether');
            
            // Call SimpleRWA20's generateUnsignedBurnMetaTx function
            const metaTx = await this.contract.methods.generateUnsignedBurnMetaTx(
                from,
                amountWei,
                params
            ).call({ from: this.web3.eth.defaultAccount }); // Add from address
            
            console.log(`📋 Generated unsigned burn meta-transaction:`);
            console.log(`   TxId: ${metaTx.txRecord.txId}`);
            console.log(`   Operation Type: ${metaTx.txRecord.params.operationType}`);
            console.log(`   Target: ${metaTx.txRecord.params.target}`);
            console.log(`   Handler Contract: ${metaTx.params.handlerContract}`);
            console.log(`   Handler Selector: ${metaTx.params.handlerSelector}`);
            console.log(`   Signer: ${metaTx.params.signer}`);
            console.log(`   Nonce: ${metaTx.params.nonce}`);
            console.log(`   Deadline: ${metaTx.params.deadline}`);
            
            return metaTx;
            
        } catch (error) {
            console.error('❌ Failed to generate unsigned burn meta-transaction:', error.message);
            throw error;
        }
    }

    /**
     * Sign a mint meta-transaction with the owner's private key
     * @param {string} to - Recipient address
     * @param {string} amount - Amount to mint (in tokens, not wei)
     * @param {Object} params - Meta-transaction parameters
     * @param {string} ownerPrivateKey - Owner's private key for signing
     * @returns {Object} The signed meta-transaction
     */
    async signMintMetaTransaction(to, amount, params, ownerPrivateKey) {
        try {
            console.log(`🔐 Signing mint meta-transaction for ${amount} tokens to ${to}`);
            
            // Generate unsigned meta-transaction
            const unsignedMetaTx = await this.generateUnsignedMintMetaTx(to, amount, params);
            
            // Sign the meta-transaction
            const signedMetaTx = await this.signMetaTransaction(unsignedMetaTx, ownerPrivateKey, this.contract);
            
            console.log(`✅ Mint meta-transaction signed successfully`);
            return signedMetaTx;
            
        } catch (error) {
            console.error('❌ Failed to sign mint meta-transaction:', error.message);
            throw error;
        }
    }

    /**
     * Sign a burn meta-transaction with the owner's private key
     * @param {string} from - Address to burn from
     * @param {string} amount - Amount to burn (in tokens, not wei)
     * @param {Object} params - Meta-transaction parameters
     * @param {string} ownerPrivateKey - Owner's private key for signing
     * @returns {Object} The signed meta-transaction
     */
    async signBurnMetaTransaction(from, amount, params, ownerPrivateKey) {
        try {
            console.log(`🔐 Signing burn meta-transaction for ${amount} tokens from ${from}`);
            
            // Generate unsigned meta-transaction
            const unsignedMetaTx = await this.generateUnsignedBurnMetaTx(from, amount, params);
            
            // Sign the meta-transaction
            const signedMetaTx = await this.signMetaTransaction(unsignedMetaTx, ownerPrivateKey, this.contract);
            
            console.log(`✅ Burn meta-transaction signed successfully`);
            return signedMetaTx;
            
        } catch (error) {
            console.error('❌ Failed to sign burn meta-transaction:', error.message);
            throw error;
        }
    }

    /**
     * Execute a signed mint meta-transaction using the broadcaster role
     * @param {Object} signedMetaTx - The signed meta-transaction
     * @param {Object} broadcasterWallet - The broadcaster wallet
     * @returns {Object} The transaction result
     */
    async executeMintMetaTransaction(signedMetaTx, broadcasterWallet) {
        try {
            console.log(`🚀 Executing mint meta-transaction via broadcaster`);
            
            // Execute the mintWithMetaTx function using the broadcaster
            const tx = this.contract.methods.mintWithMetaTx(signedMetaTx);
            
            // Estimate gas first to catch any revert reasons
            let gasEstimate;
            try {
                gasEstimate = await tx.estimateGas({ from: broadcasterWallet.address });
                console.log(`   Gas estimate: ${gasEstimate}`);
            } catch (gasError) {
                console.error('❌ Gas estimation failed:', gasError.message);
                console.error('   This usually indicates the transaction will revert');
                throw gasError;
            }
            
            // Send transaction
            const result = await tx.send({
                from: broadcasterWallet.address,
                gas: gasEstimate
            });
            
            console.log(`✅ Mint meta-transaction executed successfully`);
            console.log(`   Transaction hash: ${result.transactionHash}`);
            
            return result;
            
        } catch (error) {
            console.error('❌ Failed to execute mint meta-transaction:', error.message);
            
            // Try to get more detailed error information
            if (error.message.includes('revert')) {
                console.error('   Detailed error information:');
                console.error('   - Error message:', error.message);
                if (error.reason) {
                    console.error('   - Revert reason:', error.reason);
                }
                if (error.data) {
                    console.error('   - Error data:', error.data);
                }
            }
            
            throw error;
        }
    }

    /**
     * Execute a signed burn meta-transaction using the broadcaster role
     * @param {Object} signedMetaTx - The signed meta-transaction
     * @param {Object} broadcasterWallet - The broadcaster wallet
     * @returns {Object} The transaction result
     */
    async executeBurnMetaTransaction(signedMetaTx, broadcasterWallet) {
        try {
            console.log(`🚀 Executing burn meta-transaction via broadcaster`);
            
            // Execute the burnWithMetaTx function using the broadcaster
            const tx = this.contract.methods.burnWithMetaTx(signedMetaTx);
            
            // Estimate gas
            const gas = await tx.estimateGas({ from: broadcasterWallet.address });
            
            // Send transaction
            const result = await tx.send({
                from: broadcasterWallet.address,
                gas: gas
            });
            
            console.log(`✅ Burn meta-transaction executed successfully`);
            console.log(`   Transaction hash: ${result.transactionHash}`);
            
            return result;
            
        } catch (error) {
            console.error('❌ Failed to execute burn meta-transaction:', error.message);
            throw error;
        }
    }

    /**
     * Complete mint workflow: generate -> sign -> execute (single-phase meta-transaction)
     * @param {string} to - Recipient address
     * @param {string} amount - Amount to mint (in tokens, not wei)
     * @param {Object} params - Meta-transaction parameters
     * @param {string} ownerPrivateKey - Owner's private key for signing
     * @param {Object} broadcasterWallet - Broadcaster wallet for execution
     * @returns {Object} The transaction result
     */
    async completeMintWorkflow(to, amount, params, ownerPrivateKey, broadcasterWallet) {
        try {
            console.log(`🔄 Starting complete mint workflow for ${amount} tokens to ${to}`);
            
            // Step 1: Sign the meta-transaction with owner
            const signedMetaTx = await this.signMintMetaTransaction(to, amount, params, ownerPrivateKey);
            
            // Step 2: Execute the meta-transaction immediately (no timelock for requestAndApprove)
            console.log(`🚀 Executing meta-transaction immediately (single-phase requestAndApprove)`);
            const result = await this.executeMintMetaTransaction(signedMetaTx, broadcasterWallet);
            
            console.log(`✅ Complete mint workflow completed successfully`);
            return result;
            
        } catch (error) {
            console.error('❌ Complete mint workflow failed:', error.message);
            throw error;
        }
    }

    /**
     * Complete burn workflow: generate -> sign -> execute (single-phase meta-transaction)
     * @param {string} from - Address to burn from
     * @param {string} amount - Amount to burn (in tokens, not wei)
     * @param {Object} params - Meta-transaction parameters
     * @param {string} ownerPrivateKey - Owner's private key for signing
     * @param {Object} broadcasterWallet - Broadcaster wallet for execution
     * @returns {Object} The transaction result
     */
    async completeBurnWorkflow(from, amount, params, ownerPrivateKey, broadcasterWallet) {
        try {
            console.log(`🔄 Starting complete burn workflow for ${amount} tokens from ${from}`);
            
            // Step 1: Sign the meta-transaction with owner
            const signedMetaTx = await this.signBurnMetaTransaction(from, amount, params, ownerPrivateKey);
            
            // Step 2: Execute the meta-transaction immediately (no timelock for requestAndApprove)
            console.log(`🚀 Executing meta-transaction immediately (single-phase requestAndApprove)`);
            const result = await this.executeBurnMetaTransaction(signedMetaTx, broadcasterWallet);
            
            console.log(`✅ Complete burn workflow completed successfully`);
            return result;
            
        } catch (error) {
            console.error('❌ Complete burn workflow failed:', error.message);
            throw error;
        }
    }
}

module.exports = SimpleRWA20EIP712Signer;
