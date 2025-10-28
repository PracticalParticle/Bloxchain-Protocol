/**
 * Base Test Class for SimpleVault Tests
 * Provides common functionality for all SimpleVault test sections
 */

const Web3 = require('web3');
const fs = require('fs');
const path = require('path');
const EIP712Signer = require('../utils/eip712-signing');

// Load environment variables from the project root
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

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

class BaseSimpleVaultTest {
    constructor(testName) {
        this.testName = testName;
        this.web3 = new Web3(getWeb3Url());
        
        // Determine test mode
        this.testMode = process.env.TEST_MODE || 'manual';
        console.log(`🔧 Test Mode: ${this.testMode.toUpperCase()}`);
        
        // Initialize contract address and ABI
        this.contractAddress = null; // Will be set during initialization
        this.contractABI = this.loadABI('SimpleVault');
        
        // Initialize test wallets - will be populated during initialization
        this.wallets = {};
        
        this.contract = null; // Will be initialized after getting contract address
        
        // Initialize utilities - will be set after contract address is determined
        this.eip712Signer = null;
        
        // Dynamic role assignments - will be populated during initialization
        this.roles = {
            owner: null,
            broadcaster: null,
            recovery: null
        };
        
        this.roleWallets = {};
        
        // Test results
        this.testResults = {
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            startTime: null,
            endTime: null
        };
    }

    loadABI(contractName) {
        const abiPath = path.join(__dirname, '../../../abi', `${contractName}.abi.json`);
        return JSON.parse(fs.readFileSync(abiPath, 'utf8'));
    }

    async initializeAutoMode() {
        console.log('🤖 AUTO MODE: Fetching contract addresses and Ganache accounts...');
        
        try {
            // Get contract addresses from Truffle artifacts
            this.contractAddress = await this.getContractAddressFromArtifacts('SimpleVault');
            
            if (!this.contractAddress) {
                throw new Error('Could not find SimpleVault address in Truffle artifacts');
            }
            
            console.log(`📋 Contract Address: ${this.contractAddress}`);
            
            // Get Ganache accounts
            await this.initializeGanacheWallets();
            
            console.log('✅ Auto mode initialization completed');
            
        } catch (error) {
            console.error('❌ Auto mode initialization failed:', error.message);
            throw new Error(`Auto mode failed: ${error.message}`);
        }
    }

    async initializeManualMode() {
        console.log('👤 MANUAL MODE: Using provided contract addresses and private keys...');
        
        try {
            // Get contract address from environment
            this.contractAddress = process.env.SIMPLE_VAULT_ADDRESS;
            
            if (!this.contractAddress) {
                throw new Error('SIMPLE_VAULT_ADDRESS not set in environment variables');
            }
            
            console.log(`📋 Contract Address: ${this.contractAddress}`);
            
            // Initialize wallets from environment variables
            this.wallets = {
                owner: this.web3.eth.accounts.privateKeyToAccount(process.env.OWNER_PRIVATE_KEY),
                broadcaster: this.web3.eth.accounts.privateKeyToAccount(process.env.BROADCASTER_PRIVATE_KEY),
                recovery: this.web3.eth.accounts.privateKeyToAccount(process.env.RECOVERY_PRIVATE_KEY)
            };
            
            // Add wallets to web3
            Object.values(this.wallets).forEach(wallet => {
                this.web3.eth.accounts.wallet.add(wallet);
            });
            
            console.log('✅ Manual mode initialization completed');
            
        } catch (error) {
            console.error('❌ Manual mode initialization failed:', error.message);
            throw new Error(`Manual mode failed: ${error.message}`);
        }
    }

    async initializeGanacheWallets() {
        console.log('🔑 Fetching Ganache accounts...');
        
        try {
            const accounts = await this.web3.eth.getAccounts();
            
            if (accounts.length < 3) {
                throw new Error('Not enough Ganache accounts available (need at least 3)');
            }
            
            // Use first 3 accounts for owner, broadcaster, recovery
            // Ganache uses deterministic private keys for the first 10 accounts
            const ganachePrivateKeys = [
                '0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d', // accounts[0]
                '0x6cbed15c793ce57650b9877cf6fa156fbef513c4e6134f022a85b1ffdd59b2a1', // accounts[1]
                '0x6370fd033278c143179d81c5526140625662b8daa446c22ee2d73db3707e620c'  // accounts[2]
            ];
            
            this.wallets = {
                owner: this.web3.eth.accounts.privateKeyToAccount(ganachePrivateKeys[0]),
                broadcaster: this.web3.eth.accounts.privateKeyToAccount(ganachePrivateKeys[1]),
                recovery: this.web3.eth.accounts.privateKeyToAccount(ganachePrivateKeys[2])
            };
            
            // Add wallets to web3
            Object.values(this.wallets).forEach(wallet => {
                this.web3.eth.accounts.wallet.add(wallet);
            });
            
            console.log(`✅ Initialized ${Object.keys(this.wallets).length} wallets from Ganache`);
            
        } catch (error) {
            console.error('❌ Failed to initialize Ganache wallets:', error.message);
            throw error;
        }
    }

    async getContractAddressFromArtifacts(contractName) {
        try {
            const artifactsPath = path.join(__dirname, '../../../build/contracts', `${contractName}.json`);
            const artifacts = JSON.parse(fs.readFileSync(artifactsPath, 'utf8'));
            
            // Get network ID from web3
            const networkId = await this.web3.eth.net.getId();
            
            if (artifacts.networks && artifacts.networks[networkId]) {
                return artifacts.networks[networkId].address;
            }
            
            return null;
        } catch (error) {
            console.error(`❌ Failed to get contract address for ${contractName}:`, error.message);
            return null;
        }
    }

    async initialize() {
        console.log(`\n🚀 Initializing ${this.testName}...`);
        
        try {
            if (this.testMode === 'auto') {
                await this.initializeAutoMode();
            } else {
                await this.initializeManualMode();
            }
            
            // Initialize contract instance
            this.contract = new this.web3.eth.Contract(this.contractABI, this.contractAddress);
            
            // Initialize EIP712 signer
            this.eip712Signer = new EIP712Signer(this.web3, this.contractAddress);
            if (this.eip712Signer && this.eip712Signer.initialize) {
                await this.eip712Signer.initialize();
            }
            
            // Get role assignments from contract
            await this.loadRoleAssignments();
            
            console.log('✅ Initialization completed successfully');
            
        } catch (error) {
            console.error('❌ Initialization failed:', error.message);
            throw error;
        }
    }

    async loadRoleAssignments() {
        console.log('👥 Loading role assignments from contract...');
        
        try {
            // Get owner (use authorized from)
            this.roles.owner = await this.callMethod(this.contract.methods.owner, [], { from: this.wallets.owner.address });
            
            // Try to get broadcaster and recovery using SecureOwnable methods (authorized from)
            try {
                this.roles.broadcaster = await this.callMethod(this.contract.methods.getBroadcaster, [], { from: this.wallets.owner.address });
            } catch (error) {
                console.log('⚠️  getBroadcaster method not available, using owner address');
                this.roles.broadcaster = this.roles.owner;
            }
            
            try {
                this.roles.recovery = await this.callMethod(this.contract.methods.getRecovery, [], { from: this.wallets.owner.address });
            } catch (error) {
                console.log('⚠️  getRecovery method not available, using owner address');
                this.roles.recovery = this.roles.owner;
            }
            
            console.log(`✅ Role assignments loaded:`);
            console.log(`   Owner: ${this.roles.owner}`);
            console.log(`   Broadcaster: ${this.roles.broadcaster}`);
            console.log(`   Recovery: ${this.roles.recovery}`);
            
            // Map roles to available wallets
            for (const [walletName, wallet] of Object.entries(this.wallets)) {
                if (wallet.address.toLowerCase() === this.roles.owner.toLowerCase()) {
                    this.roleWallets.owner = wallet;
                    console.log(`   🔑 Owner role served by: ${walletName} (${wallet.address})`);
                }
                if (wallet.address.toLowerCase() === this.roles.broadcaster.toLowerCase()) {
                    this.roleWallets.broadcaster = wallet;
                    console.log(`   🔑 Broadcaster role served by: ${walletName} (${wallet.address})`);
                }
                if (wallet.address.toLowerCase() === this.roles.recovery.toLowerCase()) {
                    this.roleWallets.recovery = wallet;
                    console.log(`   🔑 Recovery role served by: ${walletName} (${wallet.address})`);
                }
            }
            
        } catch (error) {
            console.error('❌ Failed to load role assignments:', error.message);
            throw error;
        }
    }

    async startTest(testDescription) {
        this.testResults.totalTests++;
        console.log(`\n🧪 Test ${this.testResults.totalTests}: ${testDescription}`);
        console.log('─'.repeat(60));
    }

    async passTest(testDescription, details = '') {
        this.testResults.passedTests++;
        console.log(`✅ PASSED: ${testDescription}`);
        if (details) {
            console.log(`   ${details}`);
        }
    }

    async failTest(testDescription, error) {
        this.testResults.failedTests++;
        console.log(`❌ FAILED: ${testDescription}`);
        console.log(`   Error: ${error.message || error}`);
        if (error.reason) {
            console.log(`   Reason: ${error.reason}`);
        }
    }

    async executeTransaction(method, params = [], options = {}) {
        try {
            const tx = method(...params);
            
            // Set default options
            const txOptions = {
                from: options.from || this.wallets.owner.address,
                ...options
            };
            
            // Estimate gas and include it in the send to avoid provider defaults causing reverts
            const gas = await tx.estimateGas(txOptions);
            txOptions.gas = gas;
            
            const result = await tx.send(txOptions);
            return result;
        } catch (error) {
            console.error('❌ Transaction failed:', error.message);
            throw error;
        }
    }

    async callMethod(method, params = [], options = {}) {
        try {
            const callOptions = {
                from: options.from || this.wallets.owner.address,
                ...options
            };
            
            const result = await method(...params).call(callOptions);
            return result;
        } catch (error) {
            console.error('❌ Call failed:', error.message);
            throw error;
        }
    }

    async getEthBalance(address) {
        try {
            const balance = await this.web3.eth.getBalance(address);
            return this.web3.utils.fromWei(balance, 'ether');
        } catch (error) {
            console.error('❌ Failed to get ETH balance:', error.message);
            throw error;
        }
    }

    async sendEth(to, amount, fromWallet = null) {
        try {
            const from = fromWallet ? fromWallet.address : this.wallets.owner.address;
            const value = this.web3.utils.toWei(amount.toString(), 'ether');

            // Try to estimate gas for payable receive; fallback to a safe buffer if estimation fails
            let gas;
            try {
                gas = await this.web3.eth.estimateGas({ from, to, value });
                // Add a buffer for event emission costs
                gas = Math.floor(gas * 1.5);
            } catch (_) {
                gas = 80000; // fallback gas
            }

            const result = await this.web3.eth.sendTransaction({ from, to, value, gas });
            return result;
        } catch (error) {
            console.error('❌ Failed to send ETH:', error.message);
            throw error;
        }
    }

    async waitForTimeLock(seconds) {
        console.log(`⏰ Waiting ${seconds} seconds for timelock...`);
        await new Promise(resolve => setTimeout(resolve, seconds * 1000));
        console.log('✅ Timelock period completed');
    }

    async advanceBlockchainTime(seconds) {
        console.log(`⏰ ADVANCING BLOCKCHAIN TIME BY ${seconds} SECONDS`);
        console.log('-'.repeat(40));
        try {
            const initialBlock = await this.web3.eth.getBlock('latest');
            const initialTime = initialBlock.timestamp;
            const targetTime = initialTime + seconds;

            let attempts = 0;
            const maxAttempts = Math.min(30, Math.ceil(seconds * 2));
            let currentTime = initialTime;

            while (currentTime < targetTime && attempts < maxAttempts) {
                attempts++;
                try {
                    const tx = {
                        from: this.wallets.owner.address,
                        to: this.wallets.owner.address,
                        value: 0,
                        gas: 21000,
                        gasPrice: await this.web3.eth.getGasPrice()
                    };
                    const signedTx = await this.wallets.owner.signTransaction(tx);
                    await this.web3.eth.sendSignedTransaction(signedTx.rawTransaction);
                    const newBlock = await this.web3.eth.getBlock('latest');
                    currentTime = newBlock.timestamp;
                } catch (_) {}
                if (attempts < maxAttempts && currentTime < targetTime) {
                    await new Promise(resolve => setTimeout(resolve, 50));
                }
            }

            const finalBlock = await this.web3.eth.getBlock('latest');
            const finalTime = finalBlock.timestamp;
            return finalTime >= targetTime - 1;
        } catch (error) {
            console.log(`  ❌ Failed to advance blockchain time: ${error.message}`);
            return false;
        }
    }

    async waitForTimelockUntil(releaseTime) {
        console.log(`⏳ WAITING FOR TIMELOCK UNTIL ${new Date(releaseTime * 1000).toLocaleString()}`);
        const currentBlockTime = await this.web3.eth.getBlock('latest').then(b => b.timestamp);
        const waitTime = releaseTime - currentBlockTime;
        if (waitTime <= 0) return true;
        const ok = await this.advanceBlockchainTime(waitTime + 2);
        return ok;
    }

    async getPendingTransactions() {
        try {
            return await this.callMethod(this.contract.methods.getPendingTransactions);
        } catch (_) {
            return [];
        }
    }

    async getTransaction(txId) {
        try {
            return await this.callMethod(this.contract.methods.getTransaction, [txId]);
        } catch (error) {
            throw error;
        }
    }

    async getLatestPendingTxId() {
        const pending = await this.getPendingTransactions();
        if (pending && pending.length > 0) {
            return pending[pending.length - 1];
        }
        return null;
    }

    async generateMetaTransaction(txId, params) {
        try {
            const metaTx = await this.eip712Signer.generateUnsignedMetaTransaction(txId, params);
            return metaTx;
        } catch (error) {
            console.error('❌ Failed to generate meta transaction:', error.message);
            throw error;
        }
    }

    async signMetaTransaction(metaTx, privateKey) {
        try {
            const signature = await this.eip712Signer.signMetaTransaction(metaTx, privateKey, this.contract);
            return signature;
        } catch (error) {
            console.error('❌ Failed to sign meta transaction:', error.message);
            throw error;
        }
    }

    printTestResults() {
        console.log('\n📊 Test Results Summary');
        console.log('═'.repeat(50));
        console.log(`Total Tests: ${this.testResults.totalTests}`);
        console.log(`Passed: ${this.testResults.passedTests}`);
        console.log(`Failed: ${this.testResults.failedTests}`);
        console.log(`Success Rate: ${((this.testResults.passedTests / this.testResults.totalTests) * 100).toFixed(1)}%`);
        
        if (this.testResults.startTime && this.testResults.endTime) {
            const duration = (this.testResults.endTime - this.testResults.startTime) / 1000;
            console.log(`Duration: ${duration.toFixed(2)} seconds`);
        }
        
        console.log('═'.repeat(50));
    }

    async runTests() {
        this.testResults.startTime = Date.now();
        console.log(`\n🚀 Starting ${this.testName} Tests`);
        console.log('═'.repeat(60));
        
        try {
            await this.initialize();
            await this.executeTests();
        } catch (error) {
            console.error(`❌ Test suite failed: ${error.message}`);
        } finally {
            this.testResults.endTime = Date.now();
            this.printTestResults();
        }
    }

    async executeTests() {
        throw new Error('executeTests() must be implemented by subclasses');
    }
}

module.exports = BaseSimpleVaultTest;
