/**
 * Base Test Class for GuardController Tests
 * Provides common functionality for all GuardController test sections
 */

const Web3 = require('web3');
const fs = require('fs');
const path = require('path');
const EIP712Signer = require('../utils/eip712-signing.cjs');

// Patch web3-eth-abi globally in sanity tests to coerce any truncated/invalid
// scalar types (e.g. "u") to "uint8" before ethers' AbiCoder sees them.
// This protects against ABI metadata bugs in enum-encoded structs.
try {
    // eslint-disable-next-line import/no-extraneous-dependencies
    const AbiModule = require('web3-eth-abi');
    const AbiCoder = AbiModule.ABICoder || AbiModule.AbiCoder || AbiModule;
    if (AbiCoder && AbiCoder.prototype && typeof AbiCoder.prototype.mapTypes === 'function') {
        const originalMapTypes = AbiCoder.prototype.mapTypes;
        AbiCoder.prototype.mapTypes = function (types) {
            let sawSuspicious = false;
            const fixed = (types || []).map((t) => {
                if (t && typeof t === 'object' && typeof t.type === 'string') {
                    const ty = t.type.trim();
                    if (ty === 'u' || ty.length < 2) {
                        sawSuspicious = true;
                        return { ...t, type: 'uint8' };
                    }
                } else if (typeof t === 'string') {
                    const ty = t.trim();
                    if (ty === 'u' || ty.length < 2) {
                        sawSuspicious = true;
                        return 'uint8';
                    }
                }
                return t;
            });
            if (sawSuspicious) {
                // Log the original and fixed types to understand where "u" comes from
                try {
                    console.error('  [ABI-PATCH] Detected suspicious type in mapTypes. Original:', JSON.stringify(types));
                    console.error('  [ABI-PATCH] Fixed types:', JSON.stringify(fixed));
                } catch {
                    // ignore logging errors
                }
            }
            return originalMapTypes.call(this, fixed);
        };
    }
} catch {
    // If patching fails we continue; tests will still run (worst case: original bug persists).
}

// Load environment variables from the project root
require('dotenv').config({ path: path.join(__dirname, '../../../.env'), quiet: true });

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

class BaseGuardControllerTest {
    constructor(testName) {
        this.testName = testName;
        this.web3 = new Web3(getWeb3Url());
        
        // Determine test mode
        this.testMode = process.env.TEST_MODE || 'manual';
        console.log(`🔧 Test Mode: ${this.testMode.toUpperCase()}`);
        
        // Initialize contract address and ABI
        this.contractAddress = null; // Will be set during initialization
        this.contractABI = this.loadABI('AccountBlox'); // AccountBlox is the concrete implementation
        
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
        
        // Constants for RuntimeRBAC (AccountBlox includes RuntimeRBAC)
        this.ROLE_CONFIG_BATCH_META_SELECTOR = this.web3.utils.keccak256(
            'roleConfigBatchRequestAndApprove(((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))'
        ).slice(0, 10); // First 4 bytes
        
        this.ROLE_CONFIG_BATCH_EXECUTE_SELECTOR = this.web3.utils.keccak256(
            'executeRoleConfigBatch((uint8,bytes)[])'
        ).slice(0, 10); // First 4 bytes
        
        this.ROLE_CONFIG_BATCH_OPERATION_TYPE = this.web3.utils.keccak256('ROLE_CONFIG_BATCH');
        
        // RoleConfigActionType enum values (RuntimeRBAC component)
        this.RoleConfigActionType = {
            CREATE_ROLE: 0,
            REMOVE_ROLE: 1,
            ADD_WALLET: 2,
            REVOKE_WALLET: 3,
            ADD_FUNCTION_TO_ROLE: 4,
            REMOVE_FUNCTION_FROM_ROLE: 5
        };
        
        // GuardConfigActionType enum values (match GuardControllerDefinitions)
        this.GuardConfigActionType = {
            ADD_TARGET_TO_WHITELIST: 0,
            REMOVE_TARGET_FROM_WHITELIST: 1,
            REGISTER_FUNCTION: 2,
            UNREGISTER_FUNCTION: 3
        };
        
        // TxAction enum values
        this.TxAction = {
            EXECUTE_TIME_DELAY_REQUEST: 0,
            EXECUTE_TIME_DELAY_APPROVE: 1,
            EXECUTE_TIME_DELAY_CANCEL: 2,
            SIGN_META_REQUEST_AND_APPROVE: 3,
            SIGN_META_APPROVE: 4,
            SIGN_META_CANCEL: 5,
            EXECUTE_META_REQUEST_AND_APPROVE: 6,
            EXECUTE_META_APPROVE: 7,
            EXECUTE_META_CANCEL: 8
        };
        // TxStatus enum values (EngineBlox)
        this.TxStatus = {
            UNDEFINED: 0,
            PENDING: 1,
            EXECUTING: 2,
            PROCESSING_PAYMENT: 3,
            CANCELLED: 4,
            COMPLETED: 5,
            FAILED: 6,
            REJECTED: 7
        };
        
        // GuardController constants
        // NATIVE_TRANSFER uses a reserved signature: __bloxchain_native_transfer__()
        // This matches EngineBlox.NATIVE_TRANSFER_SELECTOR constant
        this.NATIVE_TRANSFER_OPERATION_TYPE = this.web3.utils.keccak256('NATIVE_TRANSFER');
        this.NATIVE_TRANSFER_SELECTOR = '0xd8cb519d'; // bytes4(keccak256("__bloxchain_native_transfer__()")) - matches EngineBlox.NATIVE_TRANSFER_SELECTOR
        this.REQUEST_AND_APPROVE_EXECUTION_SELECTOR = this.web3.utils.keccak256(
            'requestAndApproveExecution((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))'
        ).slice(0, 10);
        
        // GuardController batch config constants
        this.CONTROLLER_OPERATION_TYPE = this.web3.utils.keccak256('CONTROLLER_OPERATION');
        this.GUARD_CONFIG_BATCH_META_SELECTOR = this.web3.utils.keccak256(
            'guardConfigBatchRequestAndApprove(((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))'
        ).slice(0, 10);
        this.GUARD_CONFIG_BATCH_EXECUTE_SELECTOR = this.web3.utils.keccak256(
            'executeGuardConfigBatch((uint8,bytes)[])'
        ).slice(0, 10);
        
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
        const abi = JSON.parse(fs.readFileSync(abiPath, 'utf8'));
        return this._normalizeABIEnumsToUint8(abi);
    }

    /**
     * Recursively replace enum internalType with "uint8" and fix truncated type (e.g. "u") so
     * contract method output decoding (web3/ethers) does not hit "invalid type".
     */
    _normalizeABIEnumsToUint8(abi) {
        if (!abi) return abi;
        if (Array.isArray(abi)) {
            return abi.map(item => this._normalizeABIEnumsToUint8(item));
        }
        if (typeof abi === 'object') {
            const out = {};
            for (const key of Object.keys(abi)) {
                let val = abi[key];
                if (key === 'internalType' && typeof val === 'string' && val.indexOf('enum') !== -1) {
                    val = 'uint8';
                }
                if (key === 'type' && typeof val === 'string' && (val.length < 3 || val === 'u' || !/^(u?int|address|bool|bytes|string|tuple)/.test(val))) {
                    if (val === 'u' || (val.length <= 2 && val.startsWith('u'))) val = 'uint8';
                }
                out[key] = this._normalizeABIEnumsToUint8(val);
            }
            return out;
        }
        return abi;
    }

    async initializeAutoMode() {
        console.log('🤖 AUTO MODE: Fetching contract addresses and Ganache accounts...');
        
        try {
            // Prefer deployed-addresses.json so AccountBlox and BasicERC20 stay in sync (same minter); use development for remote dev
            const networkName = process.env.NETWORK_NAME || process.env.GUARDIAN_NETWORK || 'development';
            this.contractAddress = this.getAccountBloxFromDeployedAddresses(networkName);
            if (!this.contractAddress) {
                this.contractAddress = await this.getContractAddressFromArtifacts('AccountBlox');
            }
            if (!this.contractAddress) {
                throw new Error(`Could not find AccountBlox (deployed-addresses.json["${networkName}"] or Truffle artifacts)`);
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
            this.contractAddress = process.env.ACCOUNTBLOX_ADDRESS;
            
            if (!this.contractAddress) {
                throw new Error('ACCOUNTBLOX_ADDRESS not set in environment variables');
            }
            
            console.log(`📋 Contract Address: ${this.contractAddress}`);
            
            // Initialize wallets from environment variables
            this.wallets = {
                wallet1: this.web3.eth.accounts.privateKeyToAccount(process.env.TEST_WALLET_1_PRIVATE_KEY),
                wallet2: this.web3.eth.accounts.privateKeyToAccount(process.env.TEST_WALLET_2_PRIVATE_KEY),
                wallet3: this.web3.eth.accounts.privateKeyToAccount(process.env.TEST_WALLET_3_PRIVATE_KEY),
                wallet4: this.web3.eth.accounts.privateKeyToAccount(process.env.TEST_WALLET_4_PRIVATE_KEY),
                wallet5: this.web3.eth.accounts.privateKeyToAccount(process.env.TEST_WALLET_5_PRIVATE_KEY)
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

    /**
     * Get AccountBlox address from deployed-addresses.json for the given network key.
     * Use this so AccountBlox and BasicERC20 (which also uses deployed-addresses.json[network])
     * stay in sync (BasicERC20.minter === AccountBlox when deployed in same run).
     * @param {string} networkName - e.g. 'development'
     * @returns {string|null} AccountBlox address or null if not found
     */
    getAccountBloxFromDeployedAddresses(networkName) {
        try {
            const addressesPath = path.join(__dirname, '../../../deployed-addresses.json');
            if (!fs.existsSync(addressesPath)) return null;
            const addresses = JSON.parse(fs.readFileSync(addressesPath, 'utf8'));
            const entry = addresses[networkName]?.AccountBlox;
            const addr = entry?.address || entry;
            if (addr) {
                console.log(`📋 Found AccountBlox at ${addr} from deployed-addresses.json (network: ${networkName})`);
                return addr;
            }
            return null;
        } catch (e) {
            return null;
        }
    }

    async getContractAddressFromArtifacts(contractName) {
        try {
            const buildDir = path.join(__dirname, '../../../build/contracts');
            const artifactPath = path.join(buildDir, `${contractName}.json`);
            
            if (!fs.existsSync(artifactPath)) {
                throw new Error(`Artifact not found: ${artifactPath}`);
            }
            
            const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
            
            if (!artifact.networks || Object.keys(artifact.networks).length === 0) {
                throw new Error(`No deployment networks found in ${contractName} artifact`);
            }
            
            // Get the most recent deployment (highest network ID)
            const networkIds = Object.keys(artifact.networks).map(id => parseInt(id)).sort((a, b) => b - a);
            const latestNetworkId = networkIds[0];
            const networkData = artifact.networks[latestNetworkId.toString()];
            
            if (!networkData.address) {
                throw new Error(`No address found for ${contractName} on network ${latestNetworkId}`);
            }
            
            console.log(`📋 Found ${contractName} at ${networkData.address} on network ${latestNetworkId}`);
            return networkData.address;
            
        } catch (error) {
            console.error(`❌ Error reading ${contractName} artifact:`, error.message);
            return null;
        }
    }

    async initializeGanacheWallets() {
        try {
            console.log('🔑 Fetching Ganache accounts...');
            
            // Get accounts from Ganache
            const accounts = await this.web3.eth.getAccounts();
            
            if (accounts.length < 5) {
                throw new Error(`Insufficient Ganache accounts. Found ${accounts.length}, need at least 5`);
            }
            
            // For Ganache, we need to get the private keys
            // Ganache uses deterministic private keys based on account index
            const ganachePrivateKeys = [
                '0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d', // Account 0
                '0x6cbed15c793ce57650b9877cf6fa156fbef513c4e6134f022a85b1ffdd59b2a1', // Account 1
                '0x6370fd033278c143179d81c5526140625662b8daa446c22ee2d73db3707e620c', // Account 2
                '0x646f1ce2fdad0e6deeeb5c7e8e5543bdde65e86029e2fd9fc169899c440a7913', // Account 3
                '0xadd53f9a7e588d003326d1cbf9e4a43c061aadd9bc938c843a79e7b4fd2ad743'  // Account 4
            ];
            
            // Initialize wallets with Ganache accounts
            this.wallets = {};
            for (let i = 0; i < 5; i++) {
                const walletName = `wallet${i + 1}`;
                this.wallets[walletName] = this.web3.eth.accounts.privateKeyToAccount(ganachePrivateKeys[i]);
                console.log(`  🔑 ${walletName}: ${accounts[i]}`);
            }
            
            // Add wallets to web3
            Object.values(this.wallets).forEach(wallet => {
                this.web3.eth.accounts.wallet.add(wallet);
            });
            
            console.log('✅ Ganache wallets initialized');
            
        } catch (error) {
            console.error('❌ Error initializing Ganache wallets:', error.message);
            throw error;
        }
    }

    async initialize() {
        console.log(`🔧 Initializing ${this.testName}...`);
        
        // Initialize based on test mode
        if (this.testMode === 'auto') {
            await this.initializeAutoMode();
        } else {
            await this.initializeManualMode();
        }
        
        // Initialize contract instance
        this.contract = new this.web3.eth.Contract(this.contractABI, this.contractAddress);
        
        // Initialize EIP-712 signer
        this.eip712Signer = new EIP712Signer(this.web3, this.contractAddress);
        await this.eip712Signer.initialize();
        
        // Discover dynamic role assignments
        await this.discoverRoleAssignments();
        
        // Verify RuntimeRBAC function schema is registered
        await this.verifyRuntimeRBACInitialized();
        
        // Verify GuardController function schema is registered
        await this.verifyGuardControllerInitialized();
        
        console.log(`✅ ${this.testName} initialized successfully\n`);
    }

    async verifyGuardControllerInitialized() {
        try {
            console.log('🔍 Verifying GuardController initialization...');
            
            // Check if guardConfigBatchRequestAndApprove function schema exists
            const handlerSchema = await this.callContractMethod(
                this.contract.methods.getFunctionSchema(this.GUARD_CONFIG_BATCH_META_SELECTOR)
            );
            
            const handlerSelector = handlerSchema.functionSelector ?? handlerSchema.functionSelectorReturn;
            if (handlerSelector !== this.GUARD_CONFIG_BATCH_META_SELECTOR) {
                throw new Error('GuardController handler function schema not found. Contract may not be initialized with GuardController.initialize()');
            }
            
            console.log('  ✅ GuardController handler function schema verified');
            console.log(`  📋 Operation: ${handlerSchema.operationName}`);
            
            // Also verify execution function schema exists
            const executionSchema = await this.callContractMethod(
                this.contract.methods.getFunctionSchema(this.GUARD_CONFIG_BATCH_EXECUTE_SELECTOR)
            );
            
            const execSelector = executionSchema.functionSelector ?? executionSchema.functionSelectorReturn;
            if (execSelector !== this.GUARD_CONFIG_BATCH_EXECUTE_SELECTOR) {
                throw new Error('GuardController execution function schema not found. Contract may not be initialized with GuardController.initialize()');
            }
            
            console.log('  ✅ GuardController execution function schema verified');
            console.log(`  📋 Execution operation: ${executionSchema.operationName}`);
            
        } catch (error) {
            console.error('❌ GuardController initialization verification failed:', error.message);
            throw error;
        }
    }

    async verifyRuntimeRBACInitialized() {
        try {
            console.log('🔍 Verifying RuntimeRBAC initialization...');
            
            // Check if roleConfigBatchRequestAndApprove function schema exists
            const functionSchema = await this.callContractMethod(
                this.contract.methods.getFunctionSchema(this.ROLE_CONFIG_BATCH_META_SELECTOR)
            );
            
            const rbacSelector = functionSchema.functionSelector ?? functionSchema.functionSelectorReturn;
            if (rbacSelector !== this.ROLE_CONFIG_BATCH_META_SELECTOR) {
                throw new Error('RuntimeRBAC function schema not found. Contract may not be initialized with RuntimeRBAC.initialize()');
            }
            
            console.log('  ✅ RuntimeRBAC function schema verified');
            console.log(`  📋 Operation: ${functionSchema.operationName}`);
            
            // Verify broadcaster has EXECUTE_META_REQUEST_AND_APPROVE permission
            const broadcasterRoleHash = this.web3.utils.keccak256('BROADCASTER_ROLE');
            const broadcasterRoleExists = await this.roleExists(broadcasterRoleHash);
            
            if (!broadcasterRoleExists) {
                throw new Error('BROADCASTER role not found. Contract may not be properly initialized.');
            }
            
            console.log('  ✅ BROADCASTER role verified');
            
        } catch (error) {
            console.error('  ❌ RuntimeRBAC initialization verification failed:', error.message);
            throw new Error(`RuntimeRBAC not properly initialized: ${error.message}`);
        }
    }

    async discoverRoleAssignments() {
        try {
            // Get actual role addresses from contract
            this.roles.owner = await this.callContractMethod(this.contract.methods.owner());
            const broadcasters = await this.callContractMethod(this.contract.methods.getBroadcasters());
            // getBroadcasters() returns an array, get the first broadcaster
            this.roles.broadcaster = broadcasters.length > 0 ? broadcasters[0] : null;
            this.roles.recovery = await this.callContractMethod(this.contract.methods.getRecovery());
            
            console.log('📋 DISCOVERED ROLE ASSIGNMENTS:');
            console.log(`  👑 Owner: ${this.roles.owner}`);
            console.log(`  📡 Broadcaster: ${this.roles.broadcaster}`);
            console.log(`  🛡️ Recovery: ${this.roles.recovery}`);
            
            // Map roles to available wallets
            for (const [walletName, wallet] of Object.entries(this.wallets)) {
                if (wallet.address.toLowerCase() === this.roles.owner.toLowerCase()) {
                    this.roleWallets.owner = wallet;
                    console.log(`  🔑 Owner role served by: ${walletName} (${wallet.address})`);
                }
                if (this.roles.broadcaster && wallet.address.toLowerCase() === this.roles.broadcaster.toLowerCase()) {
                    this.roleWallets.broadcaster = wallet;
                    console.log(`  🔑 Broadcaster role served by: ${walletName} (${wallet.address})`);
                }
                if (wallet.address.toLowerCase() === this.roles.recovery.toLowerCase()) {
                    this.roleWallets.recovery = wallet;
                    console.log(`  🔑 Recovery role served by: ${walletName} (${wallet.address})`);
                }
            }
            
        } catch (error) {
            console.error('❌ Failed to discover role assignments:', error.message);
            throw new Error(`Role discovery failed: ${error.message}`);
        }
    }

    getRoleWallet(roleName) {
        const wallet = this.roleWallets[roleName.toLowerCase()];
        if (!wallet) {
            throw new Error(`No wallet found for role: ${roleName}`);
        }
        return wallet.privateKey;
    }

    getRoleWalletObject(roleName) {
        const wallet = this.roleWallets[roleName.toLowerCase()];
        if (!wallet) {
            throw new Error(`No wallet found for role: ${roleName}`);
        }
        return wallet;
    }

    async sendTransaction(method, wallet) {
        return await this.sendTransactionWithValue(method, wallet, '0');
    }

    /**
     * Send a contract method as a transaction and return only the receipt (avoids ABI decode of return value).
     * Use when the method's return type causes decode errors (e.g. complex tuple with enum).
     * Uses raw eth_sendTransaction so the contract Method's output formatter is never invoked.
     */
    async sendTransactionReceiptOnly(method, wallet, value = '0') {
        const from = wallet.address;
        const data = method.encodeABI();
        let gas;
        try {
            gas = await this.web3.eth.estimateGas({ from, to: this.contractAddress, data, value });
        } catch (e) {
            gas = 500000;
        }
        const pk = wallet.privateKey || wallet;
        const signed = await this.web3.eth.accounts.signTransaction(
            { to: this.contractAddress, data, gas, value },
            pk
        );
        const { transactionHash } = await this.web3.eth.sendSignedTransaction(signed.rawTransaction);
        let receipt = await this.web3.eth.getTransactionReceipt(transactionHash);
        if (!receipt && transactionHash) {
            const maxWait = 30;
            for (let i = 0; i < maxWait; i++) {
                await new Promise(r => setTimeout(r, 1000));
                receipt = await this.web3.eth.getTransactionReceipt(transactionHash);
                if (receipt) break;
            }
        }
        if (!receipt) throw new Error('Transaction receipt not found');
        if (receipt.status === false || receipt.status === '0x0') {
            throw new Error(`Transaction reverted. Receipt status: ${receipt.status}`);
        }
        return receipt;
    }

    async sendTransactionWithValue(method, wallet, value) {
        try {
            const from = wallet.address;
            const gas = await method.estimateGas({ from, value });
            const result = await method.send({ from, gas, value });
            
            // Check if transaction actually succeeded by examining the receipt
            if (result && result.receipt) {
                console.log(`  🔍 Transaction receipt status: ${result.receipt.status}`);
                console.log(`  🔍 Transaction receipt logs: ${result.receipt.logs ? result.receipt.logs.length : 0}`);
                if (result.receipt.status === false || result.receipt.status === '0x0') {
                    throw new Error(`Transaction reverted. Receipt status: ${result.receipt.status}`);
                }
            }
            
            return result;
        } catch (error) {
            let errorMessage = error.message;
            if (error.data) {
                try {
                    // Try to decode error
                    const errorData = error.data.result || error.data;
                    if (errorData && typeof errorData === 'string' && errorData.length >= 10) {
                        const errorSelector = errorData.slice(0, 10);
                        console.log(`  🔍 Error selector: ${errorSelector}`);
                        console.log(`  🔍 Full error data: ${errorData}`);
                        
                        // Check for common errors
                        const resourceNotFound = this.web3.utils.keccak256('ResourceNotFound(bytes32)').slice(0, 10);
                        const resourceExists = this.web3.utils.keccak256('ResourceAlreadyExists(bytes32)').slice(0, 10);
                        const noPermission = this.web3.utils.keccak256('NoPermission(address)').slice(0, 10);
                        const signerNotAuthorized = this.web3.utils.keccak256('SignerNotAuthorized(address)').slice(0, 10);
                        const restrictedBroadcaster = this.web3.utils.keccak256('RestrictedBroadcaster(address,address)').slice(0, 10);
                        const conflictingMetaTx = this.web3.utils.keccak256('ConflictingMetaTxPermissions(bytes4)').slice(0, 10);
                        const notSupported = this.web3.utils.keccak256('NotSupported()').slice(0, 10);
                        const targetNotWhitelisted = this.web3.utils.keccak256('TargetNotWhitelisted(address,bytes4,bytes32)').slice(0, 10);
                        const itemAlreadyExists = this.web3.utils.keccak256('ItemAlreadyExists(address)').slice(0, 10);
                        const itemNotFound = this.web3.utils.keccak256('ItemNotFound(address)').slice(0, 10);
                        
                        if (errorSelector === resourceNotFound) {
                            const decoded = this.web3.eth.abi.decodeParameter('bytes32', '0x' + errorData.slice(10));
                            errorMessage = `ResourceNotFound: ${decoded}`;
                        } else if (errorSelector === resourceExists) {
                            const decoded = this.web3.eth.abi.decodeParameter('bytes32', '0x' + errorData.slice(10));
                            errorMessage = `ResourceAlreadyExists: ${decoded}`;
                        } else if (errorSelector === noPermission) {
                            const decoded = this.web3.eth.abi.decodeParameter('address', '0x' + errorData.slice(10));
                            errorMessage = `NoPermission: ${decoded}`;
                        } else if (errorSelector === signerNotAuthorized) {
                            const decoded = this.web3.eth.abi.decodeParameter('address', '0x' + errorData.slice(10));
                            errorMessage = `SignerNotAuthorized: ${decoded}`;
                        } else if (errorSelector === restrictedBroadcaster) {
                            const decoded = this.web3.eth.abi.decodeParameters(['address', 'address'], '0x' + errorData.slice(10));
                            errorMessage = `RestrictedBroadcaster: caller=${decoded[0]}, expected broadcaster=${decoded[1]}`;
                        } else if (errorSelector === targetNotWhitelisted) {
                            const decoded = this.web3.eth.abi.decodeParameters(['address', 'bytes4', 'bytes32'], '0x' + errorData.slice(10));
                            errorMessage = `TargetNotWhitelisted: target=${decoded[0]}, functionSelector=${decoded[1]}, roleHash=${decoded[2]}`;
                        } else if (errorSelector === itemAlreadyExists) {
                            const decoded = this.web3.eth.abi.decodeParameter('address', '0x' + errorData.slice(10));
                            errorMessage = `ItemAlreadyExists: ${decoded}`;
                        } else if (errorSelector === itemNotFound) {
                            const decoded = this.web3.eth.abi.decodeParameter('address', '0x' + errorData.slice(10));
                            errorMessage = `ItemNotFound: ${decoded}`;
                        } else if (errorSelector === conflictingMetaTx) {
                            const decoded = this.web3.eth.abi.decodeParameter('bytes4', '0x' + errorData.slice(10));
                            errorMessage = `ConflictingMetaTxPermissions: ${decoded}`;
                        } else if (errorSelector === notSupported) {
                            errorMessage = `NotSupported`;
                        } else {
                            // Try to decode as string
                            try {
                                const revertReason = this.web3.eth.abi.decodeParameter('string', errorData);
                                errorMessage = `${error.message} (Revert reason: ${revertReason})`;
                            } catch (e) {
                                errorMessage = `${error.message} (Unknown error selector: ${errorSelector}, Data: ${errorData})`;
                            }
                        }
                    } else {
                        errorMessage = `${error.message} (Data: ${JSON.stringify(error.data)})`;
                    }
                } catch (decodeError) {
                    errorMessage = `${error.message} (Decode error: ${decodeError.message}, Data: ${JSON.stringify(error.data)})`;
                }
            }
            if (error.reason) {
                errorMessage = `${errorMessage} (Reason: ${error.reason})`;
            }
            // Workaround: ABI decode failure on return value (e.g. requestAndApproveExecution returns uint256, ABI expected TxRecord) - tx may have succeeded.
            // Callers may receive a raw receipt instead of a decoded return; they should check for receipt.status and handle both shapes.
            const isDecodeError = (error.code === 'INVALID_ARGUMENT' || (error.message && error.message.includes('invalid type')));
            if (isDecodeError) {
                let receipt = error.receipt || (error.transaction && error.transaction.receipt);
                const txHash = error.transactionHash || error.hash || error.receipt?.transactionHash || (error.transaction && (error.transaction.transactionHash || error.transaction.hash));
                if (!receipt && txHash) {
                    try {
                        receipt = await this.web3.eth.getTransactionReceipt(txHash);
                    } catch (e) { /* ignore */ }
                }
                if (!receipt && txHash) {
                    try {
                        await new Promise(r => setTimeout(r, 2000));
                        receipt = await this.web3.eth.getTransactionReceipt(txHash);
                    } catch (e) { /* ignore */ }
                }
                if (receipt && (receipt.status === true || receipt.status === 1 || receipt.status === '0x1')) {
                    console.log('  ⚠️  Return value decode failed but tx succeeded; using receipt');
                    return receipt;
                }
            }
            throw new Error(`Transaction failed: ${errorMessage}`);
        }
    }

    async callContractMethod(method, wallet = null) {
        try {
            let fromWallet;
            
            if (wallet) {
                fromWallet = wallet;
            } else if (this.roleWallets.owner) {
                fromWallet = this.roleWallets.owner;
            } else {
                fromWallet = this.wallets.wallet1;
            }
            const methodName = method && method._method && (method._method.name || method._method.signature || 'unknown');
            console.log(`  [DEBUG] callContractMethod: ${methodName}`);
            const result = await method.call({ from: fromWallet.address });
            return result;
        } catch (error) {
            const methodName = method && method._method && (method._method.name || method._method.signature || 'unknown');
            throw new Error(`Contract call failed for ${methodName}: ${error.message}`);
        }
    }

    /**
     * Sanitize ABI outputs for decode: force type "uint8" for enum fields so decoders
     * (web3-eth-abi + ethers) do not choke on "enum EngineBlox.TxStatus" / "enum EngineBlox.TxAction".
     * Deep clone with only name/type/components; strip internalType entirely; enums and invalid types become "uint8".
     */
    _sanitizeOutputsForDecode(outputs) {
        if (!outputs || !Array.isArray(outputs)) return outputs;
        return outputs.map((out) => {
            let type = (out && out.type != null) ? String(out.type).trim() : '';
            const isEnum = out && out.internalType && String(out.internalType).indexOf('enum') !== -1;
            if (isEnum || !type || type.length < 2 || type === 'u') {
                type = 'uint8';
            }
            const clone = { name: out.name != null ? out.name : '', type };
            if (out.components && out.components.length) {
                clone.components = this._sanitizeOutputsForDecode(out.components);
            }
            return clone;
        });
    }

    /**
     * Minimal output schema for createMetaTxParams return: one tuple (MetaTxParams).
     * All enum-like fields use uint8 so decoder never sees "u" or enum internalType.
     */
    _getMinimalCreateMetaTxParamsOutputs() {
        return [{
            name: '',
            type: 'tuple',
            components: [
                { name: 'chainId', type: 'uint256' },
                { name: 'nonce', type: 'uint256' },
                { name: 'handlerContract', type: 'address' },
                { name: 'handlerSelector', type: 'bytes4' },
                { name: 'action', type: 'uint8' },
                { name: 'deadline', type: 'uint256' },
                { name: 'maxGasPrice', type: 'uint256' },
                { name: 'signer', type: 'address' }
            ]
        }];
    }

    /**
     * Call createMetaTxParams via raw eth_call and decode with minimal hand-built
     * outputs (no ABI file) to avoid ABI decoder errors on enum / "u" type.
     */
    async _callCreateMetaTxParamsRaw(handlerContract, handlerSelector, action, deadline, maxGasPrice, signer) {
        const fromWallet = this.roleWallets.owner || this.wallets.wallet1;
        const method = this.contract.methods.createMetaTxParams(
            handlerContract,
            handlerSelector,
            action,
            deadline,
            maxGasPrice,
            signer
        );
        const data = method.encodeABI();
        const returnHex = await this.web3.eth.call({
            to: this.contractAddress,
            data,
            from: fromWallet.address
        });
        const outputs = this._getMinimalCreateMetaTxParamsOutputs();
        let decoded;
        try {
            decoded = this.web3.eth.abi.decodeParameters(outputs, returnHex);
        } catch (e) {
            console.error('  [RAW] createMetaTxParams decode failed:', e.message);
            throw e;
        }
        return decoded.__length__ === 1 ? decoded[0] : decoded;
    }

    /**
     * Minimal output schema for generateUnsignedMetaTransactionForNew return: one tuple
     * (txRecord, params, message, signature, data). All enum-like fields forced to uint8
     * so decoder never sees "u" or enum internalType.
     */
    _getMinimalGenerateUnsignedOutputs() {
        return [{
            name: '',
            type: 'tuple',
            components: [
                { name: 'txRecord', type: 'tuple', components: [
                    { name: 'txId', type: 'uint256' },
                    { name: 'releaseTime', type: 'uint256' },
                    { name: 'status', type: 'uint8' },
                    { name: 'params', type: 'tuple', components: [
                        { name: 'requester', type: 'address' },
                        { name: 'target', type: 'address' },
                        { name: 'value', type: 'uint256' },
                        { name: 'gasLimit', type: 'uint256' },
                        { name: 'operationType', type: 'bytes32' },
                        { name: 'executionSelector', type: 'bytes4' },
                        { name: 'executionParams', type: 'bytes' }
                    ]},
                    { name: 'message', type: 'bytes32' },
                    { name: 'result', type: 'bytes' },
                    { name: 'payment', type: 'tuple', components: [
                        { name: 'recipient', type: 'address' },
                        { name: 'nativeTokenAmount', type: 'uint256' },
                        { name: 'erc20TokenAddress', type: 'address' },
                        { name: 'erc20TokenAmount', type: 'uint256' }
                    ]}
                ]},
                { name: 'params', type: 'tuple', components: [
                    { name: 'chainId', type: 'uint256' },
                    { name: 'nonce', type: 'uint256' },
                    { name: 'handlerContract', type: 'address' },
                    { name: 'handlerSelector', type: 'bytes4' },
                    { name: 'action', type: 'uint8' },
                    { name: 'deadline', type: 'uint256' },
                    { name: 'maxGasPrice', type: 'uint256' },
                    { name: 'signer', type: 'address' }
                ]},
                { name: 'message', type: 'bytes32' },
                { name: 'signature', type: 'bytes' },
                { name: 'data', type: 'bytes' }
            ]
        }];
    }

    /**
     * Call generateUnsignedMetaTransactionForNew via raw eth_call and decode with
     * minimal hand-built outputs (no ABI file) to avoid ABI decoder errors on enum / "u" type.
     * Uses same return shape as createExternalExecutionMetaTx: { txRecord, params, message, signature, data }.
     */
    async _callGenerateUnsignedMetaTransactionForNewRaw(requesterAddress, targetAddress, value, gasLimit, operationType, executionSelector, executionParams, metaParams) {
        const fromWallet = this.roleWallets.owner || this.wallets.wallet1;
        const method = this.contract.methods.generateUnsignedMetaTransactionForNew(
            requesterAddress,
            targetAddress,
            value,
            gasLimit,
            operationType,
            executionSelector,
            executionParams,
            metaParams
        );
        const data = method.encodeABI();
        const returnHex = await this.web3.eth.call({
            to: this.contractAddress,
            data,
            from: fromWallet.address
        });
        const outputs = this._getMinimalGenerateUnsignedOutputs();
        let decoded;
        try {
            decoded = this.web3.eth.abi.decodeParameters(outputs, returnHex);
        } catch (e) {
            console.error('  [RAW] generateUnsignedMetaTransactionForNew decode failed:', e.message);
            throw e;
        }
        const single = decoded.__length__ === 1;
        const result = single ? decoded[0] : decoded;
        const tuple = result && (result.txRecord !== undefined || result[0] !== undefined) ? result : (single ? decoded : result);
        const msg = (tuple && (tuple.message ?? tuple[2])) ?? (result && (result.message ?? result[2]));
        const sig = (tuple && (tuple.signature ?? tuple[3])) ?? (result && (result.signature ?? result[3]));
        const dat = (tuple && (tuple.data ?? tuple[4])) ?? (result && (result.data ?? result[4]));
        const txRecord = (tuple && (tuple.txRecord ?? tuple[0])) ?? (result && (result.txRecord ?? result[0]));
        const params = (tuple && (tuple.params ?? tuple[1])) ?? (result && (result.params ?? result[1]));
        let messageHex = msg;
        if (msg != null) {
            const raw = typeof msg === 'string' ? msg : this.web3.utils.toHex(msg);
            messageHex = raw.startsWith('0x') ? raw : '0x' + raw;
            if (messageHex.length < 66) messageHex = '0x' + messageHex.slice(2).padStart(64, '0');
        }
        // Ensure txRecord has .message so signer can use metaTx.txRecord?.message
        if (txRecord != null && messageHex != null) {
            if (typeof txRecord === 'object' && !Array.isArray(txRecord)) {
                txRecord.message = txRecord.message ?? messageHex;
            }
        }
        return {
            txRecord,
            params,
            message: messageHex,
            signature: sig !== undefined ? sig : '0x',
            data: dat
        };
    }

    assertTest(condition, message) {
        this.testResults.totalTests++;
        
        if (condition) {
            this.testResults.passedTests++;
            console.log(`  ✅ ${message}`);
        } else {
            this.testResults.failedTests++;
            console.log(`  ❌ ${message}`);
            throw new Error(`Test assertion failed: ${message}`);
        }
    }

    handleTestError(testName, error) {
        this.testResults.failedTests++;
        console.log(`❌ ${testName} failed: ${error.message}`);
        console.log(`   Stack: ${error.stack}`);
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

    /**
     * Create a bitmap from an array of TxAction enum values
     * @param {number[]} actions - Array of TxAction enum values
     * @returns {number} Bitmap value
     */
    createBitmapFromActions(actions) {
        let bitmap = 0;
        for (const action of actions) {
            bitmap |= (1 << action);
        }
        return bitmap;
    }

    /**
     * Encode a RoleConfigAction struct
     * @param {number} actionType - RoleConfigActionType enum value
     * @param {any} data - Data to encode (will be ABI encoded based on action type)
     * @returns {Object} RoleConfigAction struct
     */
    encodeRoleConfigAction(actionType, data) {
        let encodedData;
        
        switch (actionType) {
            case this.RoleConfigActionType.CREATE_ROLE: {
                // New format: (string roleName, uint256 maxWallets)
                // Function permissions must be configured separately via ADD_FUNCTION_TO_ROLE actions.
                encodedData = this.web3.eth.abi.encodeParameters(
                    ['string', 'uint256'],
                    [data.roleName, data.maxWallets || 10]
                );
                break;
            }
            case this.RoleConfigActionType.ADD_WALLET:
                // (bytes32 roleHash, address wallet)
                encodedData = this.web3.eth.abi.encodeParameters(
                    ['bytes32', 'address'],
                    [data.roleHash, data.wallet]
                );
                break;
            case this.RoleConfigActionType.ADD_FUNCTION_TO_ROLE:
                // (bytes32 roleHash, FunctionPermission functionPermission)
                // FunctionPermission is tuple(bytes4,uint16,bytes4[])
                encodedData = this.web3.eth.abi.encodeParameters(
                    ['bytes32', 'tuple(bytes4,uint16,bytes4[])'],
                    [data.roleHash, [
                        data.functionPermission.functionSelector,
                        data.functionPermission.grantedActionsBitmap,
                        data.functionPermission.handlerForSelectors || [data.functionPermission.functionSelector]
                    ]]
                );
                break;
            case this.RoleConfigActionType.REMOVE_FUNCTION_FROM_ROLE:
                // (bytes32 roleHash, bytes4 functionSelector)
                encodedData = this.web3.eth.abi.encodeParameters(
                    ['bytes32', 'bytes4'],
                    [data.roleHash, data.functionSelector]
                );
                break;
            default:
                throw new Error(`Unsupported RoleConfigActionType for GuardController tests: ${actionType}`);
        }
        
        return {
            actionType: actionType,
            data: encodedData
        };
    }

    /**
     * Encode a GuardConfigAction struct
     * @param {number} actionType - GuardConfigActionType enum value
     * @param {any} data - Data to encode (will be ABI encoded based on action type)
     * @returns {Object} GuardConfigAction struct
     */
    encodeGuardConfigAction(actionType, data) {
        let encodedData;
        
        switch (actionType) {
            case this.GuardConfigActionType.ADD_TARGET_TO_WHITELIST:
            case this.GuardConfigActionType.REMOVE_TARGET_FROM_WHITELIST:
                // (bytes4 functionSelector, address target)
                encodedData = this.web3.eth.abi.encodeParameters(
                    ['bytes4', 'address'],
                    [data.functionSelector, data.target]
                );
                break;
            case this.GuardConfigActionType.REGISTER_FUNCTION:
                // (string functionSignature, string operationName, TxAction[] supportedActions)
                encodedData = this.web3.eth.abi.encodeParameters(
                    ['string', 'string', 'uint8[]'],
                    [data.functionSignature, data.operationName, data.supportedActions]
                );
                break;
            case this.GuardConfigActionType.UNREGISTER_FUNCTION:
                // (bytes4 functionSelector, bool safeRemoval)
                encodedData = this.web3.eth.abi.encodeParameters(
                    ['bytes4', 'bool'],
                    [data.functionSelector, data.safeRemoval]
                );
                break;
            default:
                throw new Error(`Unknown GuardConfigActionType: ${actionType}`);
        }
        
        return {
            actionType: actionType,
            data: encodedData
        };
    }

    /**
     * Create a FunctionPermission struct
     * @param {string} functionSelector - Function selector (4 bytes)
     * @param {number[]} actions - Array of TxAction enum values
     * @returns {Object} FunctionPermission struct
     */
    createFunctionPermission(functionSelector, actions, handlerForSelectors = null) {
        const bitmap = this.createBitmapFromActions(actions);
        // If handlerForSelectors is not provided, use [functionSelector] (self-reference indicates execution selector)
        let finalHandlerForSelectors;
        if (handlerForSelectors === null) {
            finalHandlerForSelectors = [functionSelector];
        } else if (Array.isArray(handlerForSelectors)) {
            finalHandlerForSelectors = handlerForSelectors;
        } else {
            // Single string provided, wrap in array
            finalHandlerForSelectors = [handlerForSelectors];
        }
        return {
            functionSelector: functionSelector,
            grantedActionsBitmap: bitmap,
            handlerForSelectors: finalHandlerForSelectors
        };
    }

    /**
     * Create a meta-transaction for roleConfigBatchRequestAndApprove
     * @param {Object[]} actions - Array of RoleConfigAction structs
     * @param {string} signerAddress - Address that will sign the meta-transaction
     * @returns {Promise<Object>} Unsigned meta-transaction ready for signing
     */
    async createRoleConfigBatchMetaTx(actions, signerAddress) {
        try {
            // Encode actions array
            const actionsArray = actions.map(a => [a.actionType, a.data]);
            const executionParams = this.web3.eth.abi.encodeParameter(
                'tuple(uint8,bytes)[]',
                actionsArray
            );

            // Create meta-transaction parameters using raw eth_call to avoid enum ABI decode
            const metaParams = await this._callCreateMetaTxParamsRaw(
                this.contractAddress,
                this.ROLE_CONFIG_BATCH_META_SELECTOR,
                this.TxAction.SIGN_META_REQUEST_AND_APPROVE,
                3600, // 1 hour default
                0, // maxGasPrice
                signerAddress
            );

            // Generate unsigned meta-transaction for new operation via raw helper
            const unsignedMetaTx = await this._callGenerateUnsignedMetaTransactionForNewRaw(
                signerAddress,
                this.contractAddress,
                0, // value
                1000000, // gasLimit
                this.ROLE_CONFIG_BATCH_OPERATION_TYPE,
                this.ROLE_CONFIG_BATCH_EXECUTE_SELECTOR,
                executionParams,
                metaParams
            );

            if (!unsignedMetaTx.message) {
                throw new Error('createRoleConfigBatchMetaTx: raw path returned no message hash');
            }

            return {
                txRecord: unsignedMetaTx.txRecord,
                params: unsignedMetaTx.params,
                message: unsignedMetaTx.message,
                signature: '0x',
                data: unsignedMetaTx.data
            };

        } catch (error) {
            console.error('❌ Failed to create role config batch meta-transaction:', error.message);
            throw error;
        }
    }

    /**
     * Execute a role config batch via meta-transaction
     * @param {Object[]} actions - Array of RoleConfigAction structs
     * @param {string} signerPrivateKey - Private key of the signer
     * @param {Object} broadcasterWallet - Wallet object for broadcaster
     * @returns {Promise<Object>} Transaction receipt
     */
    async executeRoleConfigBatch(actions, signerPrivateKey, broadcasterWallet) {
        try {
            const signerAddress = this.web3.eth.accounts.privateKeyToAccount(signerPrivateKey).address;
            
            // Create unsigned meta-transaction
            const unsignedMetaTx = await this.createRoleConfigBatchMetaTx(actions, signerAddress);
            
            // Sign meta-transaction
            const signedMetaTx = await this.eip712Signer.signMetaTransaction(
                unsignedMetaTx,
                signerPrivateKey,
                this.contract
            );
            
            // Execute meta-transaction via broadcaster (receipt-only to avoid ABI decode of uint256 return)
            const receipt = await this.sendTransactionReceiptOnly(
                this.contract.methods.roleConfigBatchRequestAndApprove(signedMetaTx),
                broadcasterWallet
            );
            
            return receipt;
            
        } catch (error) {
            console.error('❌ Failed to execute role config batch:', error.message);
            throw error;
        }
    }

    /**
     * Register a function schema using GuardController batch config
     * @param {string} functionSelector - Function selector (4 bytes) - kept for compatibility but not used
     * @param {string} functionSignature - Function signature
     * @param {string} operationName - Operation name (e.g., "ETH_TRANSFER")
     * @param {number[]} supportedActions - Array of TxAction enum values
     * @param {string} signerPrivateKey - Private key of the signer (owner)
     * @param {Object} broadcasterWallet - Wallet object for broadcaster
     * @returns {Promise<Object>} Transaction receipt
     */
    async registerFunction(functionSelector, functionSignature, operationName, supportedActions, signerPrivateKey, broadcasterWallet) {
        // Use GuardController batch config (function registration moved from RuntimeRBAC to GuardController)
        const action = this.encodeGuardConfigAction(
            this.GuardConfigActionType.REGISTER_FUNCTION,
            {
                functionSignature: functionSignature,
                operationName: operationName,
                supportedActions: supportedActions
            }
        );
        
        return await this.executeGuardConfigBatch([action], signerPrivateKey, broadcasterWallet);
    }

    /**
     * Add function permission to a role
     * @param {string} roleHash - Role hash (bytes32)
     * @param {string} functionSelector - Function selector (4 bytes)
     * @param {number[]} actions - Array of TxAction enum values
     * @param {string} signerPrivateKey - Private key of the signer (owner)
     * @param {Object} broadcasterWallet - Wallet object for broadcaster
     * @returns {Promise<Object>} Transaction receipt
     */
    async addFunctionToRole(roleHash, functionSelector, actions, signerPrivateKey, broadcasterWallet) {
        const functionPermission = this.createFunctionPermission(functionSelector, actions);
        const action = this.encodeRoleConfigAction(
            this.RoleConfigActionType.ADD_FUNCTION_TO_ROLE,
            {
                roleHash: roleHash,
                functionPermission: functionPermission
            }
        );
        
        return await this.executeRoleConfigBatch([action], signerPrivateKey, broadcasterWallet);
    }

    /**
     * Add function permission to a role with an explicit handlerForSelectors array.
     * This is required when granting permissions on a handler selector that should
     * point at one or more underlying execution selectors, instead of using the
     * default self-reference used for execution selectors.
     * @param {string} roleHash - Role hash (bytes32)
     * @param {string} functionSelector - Function selector (4 bytes)
     * @param {number[]} actions - Array of TxAction enum values
     * @param {string[]} handlerForSelectors - Array of bytes4 selectors this function can act on
     * @param {string} signerPrivateKey - Private key of the signer (owner)
     * @param {Object} broadcasterWallet - Wallet object for broadcaster
     * @returns {Promise<Object>} Transaction receipt
     */
    async addFunctionToRoleWithHandlerForSelectors(roleHash, functionSelector, actions, handlerForSelectors, signerPrivateKey, broadcasterWallet) {
        const functionPermission = this.createFunctionPermission(functionSelector, actions, handlerForSelectors);
        const action = this.encodeRoleConfigAction(
            this.RoleConfigActionType.ADD_FUNCTION_TO_ROLE,
            {
                roleHash: roleHash,
                functionPermission: functionPermission
            }
        );
        
        return await this.executeRoleConfigBatch([action], signerPrivateKey, broadcasterWallet);
    }

    /**
     * Remove a function permission from a role (for idempotent re-set of permissions).
     * Ignores ResourceNotFound (no-op if permission not present).
     * @param {string} roleHash - Role hash (bytes32)
     * @param {string} functionSelector - Function selector (4 bytes)
     * @param {string} signerPrivateKey - Owner key for signing
     * @param {Object} broadcasterWallet - Wallet to send tx
     * @returns {Promise<Object>} Receipt or null if removed/not found
     */
    async removeFunctionFromRole(roleHash, functionSelector, signerPrivateKey, broadcasterWallet) {
        const action = this.encodeRoleConfigAction(
            this.RoleConfigActionType.REMOVE_FUNCTION_FROM_ROLE,
            { roleHash, functionSelector }
        );
        try {
            return await this.executeRoleConfigBatch([action], signerPrivateKey, broadcasterWallet);
        } catch (error) {
            if (error.message && (error.message.includes('ResourceNotFound') || error.message.includes('ItemNotFound'))) {
                return null;
            }
            throw error;
        }
    }

    /**
     * Create a meta-transaction for ETH transfer
     * @param {string} target - Target address (contract or wallet)
     * @param {string} value - ETH value in wei
     * @param {string} signerAddress - Address that will sign the meta-transaction
     * @returns {Promise<Object>} Unsigned meta-transaction ready for signing
     */
    async createEthTransferMetaTx(target, value, signerAddress) {
        try {
            // Create meta-transaction parameters using raw helper to avoid enum ABI decode
            const metaParams = await this._callCreateMetaTxParamsRaw(
                target, // handlerContract (see EngineBlox validation notes above)
                this.REQUEST_AND_APPROVE_EXECUTION_SELECTOR, // handlerSelector for requestAndApproveExecution
                this.TxAction.SIGN_META_REQUEST_AND_APPROVE,
                3600, // 1 hour default
                0, // maxGasPrice
                signerAddress
            );

            // Generate unsigned meta-transaction for new operation via raw helper
            const unsignedMetaTx = await this._callGenerateUnsignedMetaTransactionForNewRaw(
                signerAddress,
                target, // target = recipient/contract
                value,
                100000, // gasLimit for native token transfer
                this.NATIVE_TRANSFER_OPERATION_TYPE,
                this.NATIVE_TRANSFER_SELECTOR,
                '0x', // empty params for native token transfer
                metaParams
            );

            if (!unsignedMetaTx.message) {
                throw new Error('createEthTransferMetaTx: raw path returned no message hash');
            }

            return {
                txRecord: unsignedMetaTx.txRecord,
                params: unsignedMetaTx.params,
                message: unsignedMetaTx.message,
                signature: '0x',
                data: unsignedMetaTx.data
            };

        } catch (error) {
            console.error('❌ Failed to create ETH transfer meta-transaction:', error.message);
            throw error;
        }
    }

    /**
     * Execute ETH transfer via requestAndApproveExecution
     * @param {string} recipient - Recipient address (wallet that will receive ETH)
     * @param {string} value - ETH value in wei
     * @param {string} signerPrivateKey - Private key of the signer (owner)
     * @param {Object} broadcasterWallet - Wallet object for broadcaster
     * @returns {Promise<Object>} Transaction receipt
     */
    async executeEthTransfer(recipient, value, signerPrivateKey, broadcasterWallet) {
        try {
            const signerAddress = this.web3.eth.accounts.privateKeyToAccount(signerPrivateKey).address;
            
            // For native transfers via meta-tx, there's a validation issue:
            // - handlerContract must equal target (EngineBlox validation)
            // - handlerContract should be AccountBlox (has requestAndApproveExecution)
            // - target should be recipient (where ETH is sent)
            // This creates a conflict: handlerContract (contract) != target (recipient wallet)
            //
            // SOLUTION: Use target = contract, handlerContract = contract
            // GuardController allows NATIVE_TRANSFER_SELECTOR to target address(this)
            // The contract will receive ETH, then we need another mechanism to forward it
            // But actually, NATIVE_TRANSFER_SELECTOR sends ETH to target, so if target=contract,
            // ETH goes to contract (not recipient). This doesn't solve the problem.
            //
            // ACTUAL ISSUE: The handlerContract == target validation prevents native transfers
            // to external addresses via meta-tx. This might be a design limitation.
            //
            // WORKAROUND: Set target = recipient, handlerContract = recipient
            // This will fail when calling requestAndApproveExecution on recipient (not a contract)
            // So this approach won't work.
            //
            // Let me check if there's a special case or if we need to use a different method
            const target = recipient; // Target is where ETH will be sent
            
            // Create unsigned meta-transaction
            const unsignedMetaTx = await this.createEthTransferMetaTx(target, value, signerAddress);
            
            // Sign meta-transaction
            const signedMetaTx = await this.eip712Signer.signMetaTransaction(
                unsignedMetaTx,
                signerPrivateKey,
                this.contract
            );
            
            // Execute via broadcaster using requestAndApproveExecution
            // NOTE: Do NOT send ETH with requestAndApproveExecution - the value is in the meta-transaction record
            // The contract will use the value from record.params.value when executing the transaction
            const receipt = await this.sendTransaction(
                this.contract.methods.requestAndApproveExecution(signedMetaTx),
                broadcasterWallet
            );
            
            return receipt;
            
        } catch (error) {
            console.error('❌ Failed to execute ETH transfer:', error.message);
            throw error;
        }
    }

    /**
     * Create unsigned meta-transaction for external execution (e.g. ERC20 mint on another contract).
     * Used for request flow: requester in tx record, signerForMetaApprove signs, broadcaster calls requestAndApproveExecution.
     * @param {string} requesterAddress - Address recorded as requester (e.g. MINT_REQUESTOR)
     * @param {string} targetAddress - Target contract (e.g. BasicERC20)
     * @param {string} value - Value in wei (usually '0')
     * @param {number} gasLimit - Gas limit for execution
     * @param {string} operationType - bytes32 operation type (e.g. ERC20_MINT)
     * @param {string} executionSelector - bytes4 execution selector (e.g. mint(address,uint256))
     * @param {string} executionParams - ABI-encoded execution params (e.g. (to, amount))
     * @param {string} signerForMetaApproveAddress - Address that will sign
     * @param {number} [metaAction] - TxAction for meta (default SIGN_META_APPROVE; use SIGN_META_REQUEST_AND_APPROVE for single-step request+approve)
     * @returns {Promise<Object>} Unsigned meta-transaction { txRecord, params, message, signature, data }
     */
    async createExternalExecutionMetaTx(requesterAddress, targetAddress, value, gasLimit, operationType, executionSelector, executionParams, signerForMetaApproveAddress, metaAction = null) {
        process.stderr.write('  [DEBUG] createExternalExecutionMetaTx ENTER\n');
        const action = metaAction !== null && metaAction !== undefined ? metaAction : this.TxAction.SIGN_META_APPROVE;
        // Use raw eth_call + sanitized decode to avoid ABI decoder errors on enum TxAction/TxStatus.
        let metaParams;
        let unsignedMetaTx;
        try {
            process.stderr.write('  [DEBUG] calling _callCreateMetaTxParamsRaw\n');
            metaParams = await this._callCreateMetaTxParamsRaw(
                this.contractAddress,
                executionSelector,
                action,
                3600,
                0,
                signerForMetaApproveAddress
            );
            process.stderr.write('  [DEBUG] calling _callGenerateUnsignedMetaTransactionForNewRaw\n');
            unsignedMetaTx = await this._callGenerateUnsignedMetaTransactionForNewRaw(
                requesterAddress,
                targetAddress,
                value,
                gasLimit,
                operationType,
                executionSelector,
                executionParams,
                metaParams
            );
        } catch (e) {
            const msg = e && (e.message || String(e));
            throw new Error(`createExternalExecutionMetaTx raw path failed: ${msg}`);
        }
        if (unsignedMetaTx.message == null || unsignedMetaTx.message === '') {
            throw new Error('createExternalExecutionMetaTx: raw path returned no message hash');
        }
        console.log('  [DEBUG] createExternalExecutionMetaTx EXIT (message set)');
        return {
            txRecord: unsignedMetaTx.txRecord,
            params: unsignedMetaTx.params,
            message: unsignedMetaTx.message,
            signature: '0x',
            data: unsignedMetaTx.data
        };
    }

    /**
     * Execute a guard config batch via meta-transaction
     * @param {Object[]} actions - Array of GuardConfigAction structs
     * @param {string} signerPrivateKey - Private key of the signer
     * @param {Object} broadcasterWallet - Wallet object for broadcaster
     * @returns {Promise<Object>} Transaction receipt
     */
    async executeGuardConfigBatch(actions, signerPrivateKey, broadcasterWallet) {
        try {
            const signerAddress = this.web3.eth.accounts.privateKeyToAccount(signerPrivateKey).address;
            
            console.log(`  🔍 Creating meta-transaction for guard config batch...`);
            console.log(`     Signer: ${signerAddress}`);
            console.log(`     Broadcaster: ${broadcasterWallet.address}`);
            console.log(`     Actions count: ${actions.length}`);
            
            // Create unsigned meta-transaction
            const unsignedMetaTx = await this.createGuardConfigBatchMetaTx(actions, signerAddress);
            console.log(`  ✅ Meta-transaction created`);
            console.log(`     Execution selector: ${unsignedMetaTx.txRecord.params.executionSelector}`);
            console.log(`     Handler selector: ${unsignedMetaTx.params.handlerSelector}`);
            console.log(`     Operation type: ${unsignedMetaTx.txRecord.params.operationType}`);
            
            // Sign meta-transaction
            console.log(`  🔐 Signing meta-transaction...`);
            const signedMetaTx = await this.eip712Signer.signMetaTransaction(
                unsignedMetaTx,
                signerPrivateKey,
                this.contract
            );
            console.log(`  ✅ Meta-transaction signed`);
            
            // Execute meta-transaction via broadcaster
            console.log(`  📤 Executing meta-transaction via broadcaster...`);
            const receipt = await this.sendTransaction(
                this.contract.methods.guardConfigBatchRequestAndApprove(signedMetaTx),
                broadcasterWallet
            );
            
            console.log(`  ✅ Transaction sent`);
            console.log(`     Receipt status: ${receipt.status}`);
            console.log(`     Receipt logs: ${receipt.logs ? receipt.logs.length : 0}`);
            
            return receipt;
            
        } catch (error) {
            console.error('❌ Failed to execute guard config batch:', error.message);
            if (error.receipt) {
                console.error(`  📋 Error receipt status: ${error.receipt.status}`);
                console.error(`  📋 Error receipt logs: ${error.receipt.logs ? error.receipt.logs.length : 0}`);
            }
            if (error.data) {
                console.error(`  📋 Error data: ${JSON.stringify(error.data, null, 2)}`);
            }
            if (error.stack) {
                console.error(`  📋 Stack trace: ${error.stack}`);
            }
            throw error;
        }
    }

    /**
     * Create a meta-transaction for guard config batch
     * @param {Object[]} actions - Array of GuardConfigAction structs
     * @param {string} signerAddress - Address that will sign the meta-transaction
     * @returns {Promise<Object>} Unsigned meta-transaction ready for signing
     */
    async createGuardConfigBatchMetaTx(actions, signerAddress) {
        try {
            // Convert actions to format expected for ABI encoding (array of [actionType, data] tuples)
            const actionsArray = actions.map(a => [a.actionType, a.data]);
            // Build execution params locally (definition-library pattern; contract no longer exposes guardConfigBatchExecutionParams)
            const executionParams = this.web3.eth.abi.encodeParameter(
                'tuple(uint8,bytes)[]',
                actionsArray
            );

            // Create meta-transaction parameters using raw helper (no ABI enums)
            const metaParams = await this._callCreateMetaTxParamsRaw(
                this.contractAddress,
                this.GUARD_CONFIG_BATCH_META_SELECTOR,
                this.TxAction.SIGN_META_REQUEST_AND_APPROVE,
                3600, // 1 hour default
                0, // maxGasPrice
                signerAddress
            );

            // Generate unsigned meta-transaction for new operation via raw helper
            const unsignedMetaTx = await this._callGenerateUnsignedMetaTransactionForNewRaw(
                signerAddress,
                this.contractAddress,
                0, // value
                1000000, // gasLimit
                this.CONTROLLER_OPERATION_TYPE,
                this.GUARD_CONFIG_BATCH_EXECUTE_SELECTOR,
                executionParams,
                metaParams
            );

            if (!unsignedMetaTx.message) {
                throw new Error('createGuardConfigBatchMetaTx: raw path returned no message hash');
            }

            return {
                txRecord: unsignedMetaTx.txRecord,
                params: unsignedMetaTx.params,
                message: unsignedMetaTx.message,
                signature: '0x',
                data: unsignedMetaTx.data
            };

        } catch (error) {
            console.error('❌ Failed to create guard config batch meta-transaction:', error.message);
            throw error;
        }
    }

    /**
     * Add target to whitelist using GuardController batch config
     * @param {string} functionSelector - Function selector (hex string)
     * @param {string} target - Target address to whitelist
     * @param {string} signerPrivateKey - Private key of the signer (owner)
     * @param {Object} broadcasterWallet - Wallet object for broadcaster
     * @returns {Promise<Object>} Transaction receipt
     * @deprecated Legacy signature kept for compatibility, use with functionSelector only
     */
    async addTargetToWhitelist(functionSelector, target, signerPrivateKey, broadcasterWallet) {
        // Handle both old (roleHash, functionSelector, target, ...) and new (functionSelector, target, ...) signatures
        let actualFunctionSelector, actualTarget, actualSignerKey, actualBroadcaster;
        
        if (arguments.length === 5) {
            // Old signature: (roleHash, functionSelector, target, signerPrivateKey, broadcasterWallet)
            actualFunctionSelector = arguments[1]; // functionSelector
            actualTarget = arguments[2]; // target
            actualSignerKey = arguments[3]; // signerPrivateKey
            actualBroadcaster = arguments[4]; // broadcasterWallet
            console.log(`  ⚠️  Using legacy whitelist signature (roleHash ignored)`);
        } else {
            // New signature: (functionSelector, target, signerPrivateKey, broadcasterWallet)
            actualFunctionSelector = functionSelector;
            actualTarget = target;
            actualSignerKey = signerPrivateKey;
            actualBroadcaster = broadcasterWallet;
        }
        
        const action = this.encodeGuardConfigAction(
            this.GuardConfigActionType.ADD_TARGET_TO_WHITELIST,
            {
                functionSelector: actualFunctionSelector,
                target: actualTarget
            }
        );
        
        return await this.executeGuardConfigBatch([action], actualSignerKey, actualBroadcaster);
    }

    /**
     * Get contract ETH balance
     * @returns {Promise<string>} Balance in wei
     */
    async getContractBalance() {
        return await this.web3.eth.getBalance(this.contractAddress);
    }

    /**
     * Get wallet ETH balance
     * @param {string} address - Wallet address
     * @returns {Promise<string>} Balance in wei
     */
    async getWalletBalance(address) {
        return await this.web3.eth.getBalance(address);
    }

    /**
     * Get role hash from role name
     * @param {string} roleName - Role name (e.g., "OWNER_ROLE")
     * @returns {string} Role hash (bytes32)
     */
    getRoleHash(roleName) {
        return this.web3.utils.keccak256(roleName);
    }

    /**
     * Check if a role exists
     * @param {string} roleHash - Role hash (bytes32)
     * @returns {Promise<boolean>} True if role exists, false otherwise
     */
    async roleExists(roleHash) {
        try {
            const role = await this.callContractMethod(
                this.contract.methods.getRole(roleHash)
            );
            let roleHashReturn;
            if (role && typeof role === 'object') {
                roleHashReturn = role.roleHashReturn || role[1];
            } else if (Array.isArray(role)) {
                roleHashReturn = role[1];
            }
            
            return roleHashReturn && 
                   roleHashReturn !== '0x0000000000000000000000000000000000000000000000000000000000000000' &&
                   roleHashReturn.toLowerCase() === roleHash.toLowerCase();
        } catch (error) {
            return false;
        }
    }

    /**
     * Check if a function schema exists
     * @param {string} functionSelector - Function selector (4 bytes)
     * @returns {Promise<boolean>} True if function schema exists, false otherwise
     */
    async functionSchemaExists(functionSelector) {
        try {
            const functionSchema = await this.callContractMethod(
                this.contract.methods.getFunctionSchema(functionSelector)
            );
            const selector = functionSchema.functionSelector ?? functionSchema.functionSelectorReturn ?? functionSchema[1];
            return selector != null && String(selector).toLowerCase() === String(functionSelector).toLowerCase();
        } catch (error) {
            return false;
        }
    }

    /**
     * Get function schema or null if it does not exist (ResourceNotFound)
     * @param {string} functionSelector - Function selector (4 bytes)
     * @returns {Promise<Object|null>} FunctionSchema (signature, selector, operationType, operationName, supportedActionsBitmap, isProtected, handlerForSelectors) or null
     */
    async getFunctionSchemaOrNull(functionSelector) {
        try {
            return await this.callContractMethod(
                this.contract.methods.getFunctionSchema(functionSelector)
            );
        } catch (error) {
            // Any revert (ResourceNotFound, missing selector, etc.) means schema not present
            const msg = (error && error.message) ? String(error.message) : '';
            if (msg.includes('ResourceNotFound') || msg.includes('function schema') || msg.includes('revert') || msg.includes('invalid opcode')) {
                return null;
            }
            throw error;
        }
    }

    /**
     * Verify function schema state: exists and matches expected (signature, operationName, supportedActionsBitmap or actions).
     * @param {string} functionSelector - Function selector
     * @param {Object} expected - { functionSignature?, operationName?, supportedActionsBitmap? (number), supportedActions? (number[] TxAction) }
     * @returns {Promise<Object>} The schema if all checks pass
     */
    async verifyFunctionSchema(functionSelector, expected) {
        const schema = await this.getFunctionSchemaOrNull(functionSelector);
        if (!schema) {
            throw new Error(`Expected function schema to exist for selector ${functionSelector}`);
        }
        const sel = schema.functionSelector ?? schema[1];
        if (String(sel).toLowerCase() !== String(functionSelector).toLowerCase()) {
            throw new Error(`Schema selector mismatch: expected ${functionSelector}, got ${sel}`);
        }
        if (expected.functionSignature != null) {
            const sig = schema.functionSignature ?? schema[0];
            if (sig !== expected.functionSignature) {
                throw new Error(`Schema functionSignature mismatch: expected ${expected.functionSignature}, got ${sig}`);
            }
        }
        if (expected.operationName != null) {
            const op = schema.operationName ?? schema[3];
            if (op !== expected.operationName) {
                throw new Error(`Schema operationName mismatch: expected ${expected.operationName}, got ${op}`);
            }
        }
        const bitmapRaw = schema.supportedActionsBitmap ?? schema[4] ?? 0;
        const bitmap = typeof bitmapRaw === 'bigint' ? Number(bitmapRaw) : (Number(bitmapRaw) || 0);
        if (expected.supportedActionsBitmap != null) {
            if (bitmap !== expected.supportedActionsBitmap) {
                throw new Error(`Schema supportedActionsBitmap mismatch: expected ${expected.supportedActionsBitmap}, got ${bitmap}`);
            }
        }
        if (expected.supportedActions != null && Array.isArray(expected.supportedActions)) {
            const expectedBitmap = this.createBitmapFromActions(expected.supportedActions);
            if (bitmap !== expectedBitmap) {
                throw new Error(`Schema supportedActions bitmap mismatch: expected ${expectedBitmap} (from actions), got ${bitmap}`);
            }
        }
        return schema;
    }

    /**
     * Check if target is whitelisted for a function selector
     * @param {string} functionSelector - Function selector (4 bytes)
     * @param {string} target - Address to check
     * @returns {Promise<boolean>}
     */
    async isTargetWhitelistedForSelector(functionSelector, target) {
        const list = await this.callContractMethod(
            this.contract.methods.getFunctionWhitelistTargets(functionSelector)
        );
        const addresses = Array.isArray(list) ? list : (list || []);
        const targetLower = String(target).toLowerCase();
        return addresses.some(addr => String(addr).toLowerCase() === targetLower);
    }

    /** Normalize bytes4 selector for comparison (contract may return 32-byte padded). */
    _normalizeSelector(sel) {
        const s = String(sel || '').toLowerCase();
        if (s.startsWith('0x') && s.length > 10) return s.slice(0, 10);
        return s;
    }

    /**
     * Check if a role has a specific action permission for a function selector
     * @param {string} roleHash - Role hash (bytes32)
     * @param {string} functionSelector - Function selector (4 bytes)
     * @param {number} txAction - TxAction enum value
     * @returns {Promise<boolean>}
     */
    async roleHasPermissionForSelector(roleHash, functionSelector, txAction) {
        const permissions = await this.callContractMethod(
            this.contract.methods.getActiveRolePermissions(roleHash)
        );
        const perms = Array.isArray(permissions) ? permissions : (permissions || []);
        const selectorNorm = this._normalizeSelector(functionSelector);
        for (const p of perms) {
            const sel = p.functionSelector ?? p[0];
            if (sel && this._normalizeSelector(sel) === selectorNorm) {
                const raw = p.grantedActionsBitmap ?? p[1];
                const bitmap = typeof raw === 'bigint' ? Number(raw) : (Number(raw) || 0);
                return (bitmap & (1 << txAction)) !== 0;
            }
        }
        return false;
    }

    /**
     * Extract transaction ID from receipt by finding TransactionEvent log
     * @param {Object} receipt - Transaction receipt
     * @returns {string|null} Transaction ID or null if not found
     */
    extractTxIdFromReceipt(receipt) {
        if (!receipt || !receipt.logs || receipt.logs.length === 0) {
            return null;
        }
        
        const eventSignature = this.web3.utils.keccak256('TransactionEvent(uint256,bytes4,uint8,address,address,bytes32)');
        
        for (const log of receipt.logs) {
            if (log.topics && log.topics[0] === eventSignature) {
                try {
                    const decoded = this.web3.eth.abi.decodeLog(
                        [
                            { type: 'uint256', name: 'txId', indexed: true },
                            { type: 'bytes4', name: 'functionHash', indexed: true },
                            { type: 'uint8', name: 'status' },
                            { type: 'address', name: 'requester', indexed: true },
                            { type: 'address', name: 'target' },
                            { type: 'bytes32', name: 'operationType' }
                        ],
                        log.data,
                        log.topics.slice(1)
                    );
                    return decoded.txId.toString();
                } catch (e) {
                    console.log(`  ⚠️  Could not decode TransactionEvent: ${e.message}`);
                }
            }
        }
        
        return null;
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

    async runTest() {
        this.testResults.startTime = Date.now();
        console.log(`🚀 Starting ${this.testName}...`);
        
        try {
            await this.initialize();
            await this.executeTests();
            
            this.testResults.endTime = Date.now();
            this.printTestResults();
            
            return this.testResults.failedTests === 0;
            
        } catch (error) {
            this.testResults.endTime = Date.now();
            this.handleTestError(this.testName, error);
            this.printTestResults();
            return false;
        }
    }

    async executeTests() {
        throw new Error('executeTests() must be implemented by subclasses');
    }
}

module.exports = BaseGuardControllerTest;
