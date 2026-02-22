/**
 * Base Test Class for CopyBlox Tests
 * Provides common functionality: CopyBlox + AccountBlox addresses, wallets, cloneBlox flow
 */

const Web3 = require('web3');
const fs = require('fs');
const path = require('path');

// Load environment variables from the project root
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });

function getWeb3Url() {
  if (process.env.RPC_URL) {
    return process.env.RPC_URL;
  }
  if (process.env.REMOTE_HOST) {
    const protocol = process.env.REMOTE_PROTOCOL || 'https';
    const port = process.env.REMOTE_PORT || 8545;
    return `${protocol}://${process.env.REMOTE_HOST}:${port}`;
  }
  return 'http://localhost:8545';
}

class BaseCopyBloxTest {
    constructor(testName) {
        this.testName = testName;
        this.web3 = new Web3(getWeb3Url());

        this.testMode = process.env.TEST_MODE || 'manual';
        console.log(`🔧 Test Mode: ${this.testMode.toUpperCase()}`);

        // CopyBlox contract (main contract under test)
        this.contractAddress = null;
        this.contractABI = this.loadCopyBloxABI();
        this.contract = null;

        // AccountBlox address (the blox we clone)
        this.accountBloxAddress = null;

        // Wallets used as initialOwner, broadcaster, recovery for cloned blox
        this.wallets = {};

        // Timelock period used when cloning (seconds)
        this.timeLockPeriodSec = 60;

        this.testResults = {
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            startTime: null,
            endTime: null
        };
    }

    /**
     * Load CopyBlox ABI from abi/CopyBlox.abi.json or build/contracts/CopyBlox.json
     */
    loadCopyBloxABI() {
        const abiPath = path.join(__dirname, '../../../abi', 'CopyBlox.abi.json');
        const artifactPath = path.join(__dirname, '../../../build/contracts', 'CopyBlox.json');
        if (fs.existsSync(abiPath)) {
            return JSON.parse(fs.readFileSync(abiPath, 'utf8'));
        }
        if (fs.existsSync(artifactPath)) {
            const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
            return artifact.abi || [];
        }
        throw new Error('CopyBlox ABI not found. Run "npm run compile:truffle" and optionally "npm run extract-abi".');
    }

    loadABI(contractName) {
        const abiPath = path.join(__dirname, '../../../abi', `${contractName}.abi.json`);
        return JSON.parse(fs.readFileSync(abiPath, 'utf8'));
    }

    async initializeAutoMode() {
        console.log('🤖 AUTO MODE: Fetching CopyBlox, AccountBlox addresses and Ganache accounts...');

        try {
            this.contractAddress = await this.getContractAddressFromArtifacts('CopyBlox');
            if (!this.contractAddress) {
                throw new Error('Could not find CopyBlox address in Truffle artifacts');
            }
            this.accountBloxAddress = await this.getContractAddressFromArtifacts('AccountBlox');
            if (!this.accountBloxAddress) {
                throw new Error('Could not find AccountBlox address in Truffle artifacts');
            }

            console.log(`📋 CopyBlox Address: ${this.contractAddress}`);
            console.log(`📋 AccountBlox Address (to clone): ${this.accountBloxAddress}`);

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
            this.contractAddress = process.env.COPYBLOX_ADDRESS;
            this.accountBloxAddress = process.env.ACCOUNTBLOX_ADDRESS;

            if (!this.contractAddress) {
                throw new Error('COPYBLOX_ADDRESS not set in environment variables');
            }
            if (!this.accountBloxAddress) {
                throw new Error('ACCOUNTBLOX_ADDRESS not set in environment variables');
            }

            console.log(`📋 CopyBlox Address: ${this.contractAddress}`);
            console.log(`📋 AccountBlox Address (to clone): ${this.accountBloxAddress}`);

            const ownerKey = process.env.OWNER_PRIVATE_KEY || process.env.TEST_WALLET_1_PRIVATE_KEY;
            const broadcasterKey = process.env.BROADCASTER_PRIVATE_KEY || process.env.TEST_WALLET_2_PRIVATE_KEY;
            const recoveryKey = process.env.RECOVERY_PRIVATE_KEY || process.env.TEST_WALLET_3_PRIVATE_KEY;

            if (!ownerKey || !broadcasterKey || !recoveryKey) {
                throw new Error(
                    'Set OWNER_PRIVATE_KEY, BROADCASTER_PRIVATE_KEY, RECOVERY_PRIVATE_KEY (or TEST_WALLET_1/2/3_PRIVATE_KEY) for manual mode'
                );
            }

            this.wallets = {
                owner: this.web3.eth.accounts.privateKeyToAccount(ownerKey),
                broadcaster: this.web3.eth.accounts.privateKeyToAccount(broadcasterKey),
                recovery: this.web3.eth.accounts.privateKeyToAccount(recoveryKey)
            };

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

            const ganachePrivateKeys = [
                '0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d',
                '0x6cbed15c793ce57650b9877cf6fa156fbef513c4e6134f022a85b1ffdd59b2a1',
                '0x6370fd033278c143179d81c5526140625662b8daa446c22ee2d73db3707e620c'
            ];

            this.wallets = {
                owner: this.web3.eth.accounts.privateKeyToAccount(ganachePrivateKeys[0]),
                broadcaster: this.web3.eth.accounts.privateKeyToAccount(ganachePrivateKeys[1]),
                recovery: this.web3.eth.accounts.privateKeyToAccount(ganachePrivateKeys[2])
            };

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

            this.contract = new this.web3.eth.Contract(this.contractABI, this.contractAddress);
            console.log('✅ Initialization completed successfully');
        } catch (error) {
            console.error('❌ Initialization failed:', error.message);
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
        const txOptions = {
            from: options.from || this.wallets.owner.address,
            ...options
        };
        const tx = method(...params);
        const gas = await tx.estimateGas(txOptions);
        txOptions.gas = gas;
        return tx.send(txOptions);
    }

    async callMethod(method, params = [], options = {}) {
        const callOptions = {
            from: options.from || this.wallets.owner.address,
            ...options
        };
        return method(...params).call(callOptions);
    }

    printTestResults() {
        console.log('\n📊 Test Results Summary');
        console.log('═'.repeat(50));
        console.log(`Total Tests: ${this.testResults.totalTests}`);
        console.log(`Passed: ${this.testResults.passedTests}`);
        console.log(`Failed: ${this.testResults.failedTests}`);
        const rate = this.testResults.totalTests > 0
            ? ((this.testResults.passedTests / this.testResults.totalTests) * 100).toFixed(1)
            : '0';
        console.log(`Success Rate: ${rate}%`);
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

module.exports = BaseCopyBloxTest;
