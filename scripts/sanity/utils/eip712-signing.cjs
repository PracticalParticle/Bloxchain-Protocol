const Web3 = require('web3');
const fs = require('fs');
require('dotenv').config({ quiet: true });

// Helper function to get RPC URL dynamically
function getWeb3Url() {
  if (process.env.RPC_URL) {
    return process.env.RPC_URL;
  }
  
  if (process.env.REMOTE_HOST) {
    const protocol = process.env.REMOTE_PROTOCOL || 'https';
    const port = process.env.REMOTE_PORT || 8545;
    return `${protocol}://${process.env.REMOTE_HOST}:${port}`;
  }
  
  // Default to http for localhost
  return 'http://localhost:8545';
}

const web3 = new Web3(getWeb3Url());

/**
 * EIP-712 Signing Implementation for Meta-Transactions
 * 
 * This module provides comprehensive EIP-712 signing functionality for the
 * EngineBlox library's meta-transaction system.
 * 
 * Based on the contract analysis:
 * - Domain: "EngineBlox", version "1"
 * - Chain ID: Current blockchain chain ID
 * - Verifying Contract: The contract address
 * 
 * The signing process follows the EIP-712 standard with the specific
 * type definitions from EngineBlox.sol
 */

class EIP712Signer {
    constructor(web3Instance, contractAddress) {
        this.web3 = web3Instance;
        this.contractAddress = contractAddress;
        this.chainId = null;
    }

    /**
     * Initialize the signer with current chain ID
     */
    async initialize() {
        this.chainId = await this.web3.eth.getChainId();
        console.log(`🔗 Chain ID: ${this.chainId}`);
        console.log(`📋 Contract Address: ${this.contractAddress}`);
    }

    /**
     * Get the EIP-712 domain separator
     * Based on EngineBlox.sol lines 197-198
     */
    getDomainSeparator() {
        console.log(`  🔍 Debug: Getting domain separator...`);
        console.log(`  🔍 Debug: this.chainId = ${this.chainId} (type: ${typeof this.chainId})`);
        console.log(`  🔍 Debug: this.contractAddress = ${this.contractAddress} (type: ${typeof this.contractAddress})`);
        
        const domainTypeHash = this.web3.utils.keccak256(
            this.web3.utils.encodePacked(
                'EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)'
            )
        );

        // Use abi.encode instead of encodePacked to match Solidity implementation
        const domainSeparator = this.web3.utils.keccak256(
            this.web3.eth.abi.encodeParameters(
                ['bytes32', 'bytes32', 'bytes32', 'uint256', 'address'],
                [
                    domainTypeHash,
                    this.web3.utils.keccak256('Bloxchain'),
                    this.web3.utils.keccak256('1'),
                    this.chainId,
                    this.contractAddress
                ]
            )
        );

        console.log(`  🔍 Debug: Domain separator created successfully`);
        return domainSeparator;
    }

    /**
     * Get the EIP-712 type hash for MetaTransaction
     * Based on EngineBlox.sol line 197
     */
    getTypeHash() {
        return this.web3.utils.keccak256(
            this.web3.utils.encodePacked(
                'MetaTransaction(TxRecord txRecord,MetaTxParams params,bytes data)',
                'TxRecord(uint256 txId,uint256 releaseTime,uint8 status,TxParams params,bytes32 message,bytes result,PaymentDetails payment)',
                'TxParams(address requester,address target,uint256 value,uint256 gasLimit,bytes32 operationType,bytes4 executionSelector,bytes executionParams)',
                'MetaTxParams(uint256 chainId,uint256 nonce,address handlerContract,bytes4 handlerSelector,uint8 action,uint256 deadline,uint256 maxGasPrice,address signer)',
                'PaymentDetails(address recipient,uint256 nativeTokenAmount,address erc20TokenAddress,uint256 erc20TokenAmount)'
            )
        );
    }

    /**
     * Normalize a value to a 66-char hex message hash (0x + 64 hex digits).
     * Handles string, BN, and other types; returns null if invalid.
     */
    _normalizeMessageHex(value) {
        if (value == null || value === '') return null;
        let hex;
        try {
            if (typeof value === 'string') hex = value;
            else if (typeof value === 'bigint') hex = '0x' + value.toString(16);
            else hex = this.web3.utils.toHex(value);
        } catch (_) {
            hex = String(value);
        }
        if (!hex || typeof hex !== 'string') return null;
        if (!hex.startsWith('0x')) hex = '0x' + hex;
        const body = hex.slice(2).replace(/[^0-9a-fA-F]/g, '') || '0';
        if (body.length > 64) hex = '0x' + body.slice(-64);
        else hex = '0x' + body.padStart(64, '0');
        return /^0x[0-9a-fA-F]{64}$/.test(hex) ? hex : null;
    }

    /**
     * Generate the EIP-712 message hash for a meta-transaction.
     *
     * EngineBlox (see EngineBlox.generateMetaTransaction) already computes and
     * stores the hash in `metaTx.message` inside the unsigned meta-transaction
     * returned by `generateUnsignedMetaTransactionForNew/Existing`.
     *
     * For sanity tests we MUST trust that field and MUST NOT call the contract
     * again to recreate the hash, because some ABIs contain enum metadata that
     * breaks generic decoders (\"invalid type: u\").
     */
    async generateMessageHash(metaTx, contract) {
        const hex = this._normalizeMessageHex(metaTx.message);
        if (!hex) {
            throw new Error(
                'Meta-transaction missing valid message hash in `metaTx.message`. ' +
                'EngineBlox.generateUnsignedMetaTransactionForNew/Existing must populate this field.'
            );
        }

        console.log('  📋 Using metaTx.message from unsigned meta-transaction...');
        console.log(`📝 Message Hash: ${hex}`);
        return hex;
    }

    /**
     * Sign a meta-transaction with EIP-712 using the contract's own process
     * @param metaTx The meta-transaction to sign
     * @param privateKey The private key to sign with
     * @param contract The SecureOwnable contract instance
     * @returns The signed meta-transaction with signature
     */
    async signMetaTransaction(metaTx, privateKey, contract) {
        try {
            console.log('🔐 Signing meta-transaction with EIP-712 using contract process...');
            
            // Generate the message hash using the contract's own EIP-712 process
            const messageHash = await this.generateMessageHash(metaTx, contract);
            console.log(`📝 Contract Message Hash: ${messageHash}`);
            
            // Sign the message hash
            const signature = await this.web3.eth.accounts.sign(messageHash, privateKey);
            console.log(`✍️ Signature: ${signature.signature}`);
            console.log(`🔑 Signer: ${signature.address}`);
            
            // Verify the signature
            const recoveredAddress = this.web3.eth.accounts.recover(messageHash, signature.signature);
            console.log(`🔑 Recovered Address: ${recoveredAddress}`);
            console.log(`🔑 Expected Address: ${signature.address}`);
            
            // Use recovered address if signature.address is undefined (Web3.js issue)
            const signerAddress = signature.address || recoveredAddress;
            console.log(`🔑 Using Signer Address: ${signerAddress}`);
            
            if (recoveredAddress.toLowerCase() !== signerAddress.toLowerCase()) {
                throw new Error('Signature verification failed');
            }
            console.log('✅ Signature verified successfully');
            
            // Return the signed meta-transaction
            return {
                ...metaTx,
                signature: signature.signature,
                message: messageHash
            };
            
        } catch (error) {
            console.error('❌ EIP-712 signing failed:', error.message);
            throw error;
        }
    }

    /**
     * Verify a signed meta-transaction using the contract's own process
     * @param signedMetaTx The signed meta-transaction to verify
     * @param contract The SecureOwnable contract instance
     * @returns True if valid, false otherwise
     */
    async verifySignedMetaTransaction(signedMetaTx, contract) {
        try {
            console.log('🔍 Verifying signed meta-transaction using contract process...');
            
            // Generate the message hash using the contract's own EIP-712 process
            const messageHash = await this.generateMessageHash(signedMetaTx, contract);
            console.log(`📝 Contract Message Hash: ${messageHash}`);
            
            // Recover the signer
            const recoveredAddress = this.web3.eth.accounts.recover(messageHash, signedMetaTx.signature);
            console.log(`🔑 Recovered Signer: ${recoveredAddress}`);
            console.log(`📋 Expected Signer: ${signedMetaTx.params.signer}`);
            
            // Check if the recovered address matches the expected signer
            const isValid = recoveredAddress.toLowerCase() === signedMetaTx.params.signer.toLowerCase();
            
            if (isValid) {
                console.log('✅ Meta-transaction signature is valid');
            } else {
                console.log('❌ Meta-transaction signature is invalid');
            }
            
            return isValid;
            
        } catch (error) {
            console.error('❌ EIP-712 verification failed:', error.message);
            return false;
        }
    }

    /**
     * Create a complete signed meta-transaction for testing using the contract's own process
     * @param txRecord The transaction record
     * @param metaTxParams The meta-transaction parameters
     * @param privateKey The private key to sign with
     * @param contract The SecureOwnable contract instance
     * @returns The complete signed meta-transaction
     */
    async createSignedMetaTransaction(txRecord, metaTxParams, privateKey, contract) {
        try {
            console.log('🏗️ Creating complete signed meta-transaction using contract process...');
            
            // Create the unsigned meta-transaction
            const metaTx = {
                txRecord: txRecord,
                params: metaTxParams,
                message: '0x0000000000000000000000000000000000000000000000000000000000000000',
                signature: '0x',
                data: this.prepareTransactionData(txRecord)
            };
            
            console.log('📋 Meta-transaction structure:');
            console.log(`  TxId: ${metaTx.txRecord.txId}`);
            console.log(`  Operation Type: ${metaTx.txRecord.params.operationType}`);
            console.log(`  Handler Contract: ${metaTx.params.handlerContract}`);
            console.log(`  Handler Selector: ${metaTx.params.handlerSelector}`);
            console.log(`  Action: ${metaTx.params.action}`);
            console.log(`  Signer: ${metaTx.params.signer}`);
            console.log();
            
            // Sign the meta-transaction using the contract's EIP-712 process
            const signedMetaTx = await this.signMetaTransaction(metaTx, privateKey, contract);
            
            return signedMetaTx;
            
        } catch (error) {
            console.error('❌ Failed to create signed meta-transaction:', error.message);
            throw error;
        }
    }

    /**
     * Prepare transaction data based on execution selector and params
     * Based on EngineBlox.sol lines 486-493
     */
    prepareTransactionData(txRecord) {
        // Directly use executionSelector and executionParams
        const executionSelector = txRecord.params.executionSelector || txRecord.params[5];
        const executionParams = txRecord.params.executionParams || txRecord.params[6];
        
        // If executionSelector is 0x00000000, it's a simple ETH transfer (no function call)
        if (executionSelector === '0x00000000' || executionSelector === '0x0' || !executionSelector) {
            return '0x';
        }
        
        // Otherwise, encode the function selector with params
        return this.web3.utils.encodePacked(executionSelector, executionParams);
    }
}

module.exports = EIP712Signer;
