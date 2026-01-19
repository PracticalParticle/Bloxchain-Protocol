/**
 * Base Test Class for GuardController Tests
 * Provides common functionality for all GuardController test sections
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

class BaseGuardControllerTest {
    constructor(testName) {
        this.testName = testName;
        this.web3 = new Web3(getWeb3Url());
        
        // Determine test mode
        this.testMode = process.env.TEST_MODE || 'manual';
        console.log(`🔧 Test Mode: ${this.testMode.toUpperCase()}`);
        
        // Initialize contract address and ABI
        this.contractAddress = null; // Will be set during initialization
        this.contractABI = this.loadABI('ControlBlox'); // ControlBlox is the concrete implementation
        
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
        
        // Constants for RuntimeRBAC (needed for function registration)
        this.ROLE_CONFIG_BATCH_META_SELECTOR = this.web3.utils.keccak256(
            'roleConfigBatchRequestAndApprove(((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))'
        ).slice(0, 10); // First 4 bytes
        
        this.ROLE_CONFIG_BATCH_EXECUTE_SELECTOR = this.web3.utils.keccak256(
            'executeRoleConfigBatch((uint8,bytes)[])'
        ).slice(0, 10); // First 4 bytes
        
        this.ROLE_CONFIG_BATCH_OPERATION_TYPE = this.web3.utils.keccak256('ROLE_CONFIG_BATCH');
        
        // RoleConfigActionType enum values
        this.RoleConfigActionType = {
            CREATE_ROLE: 0,
            REMOVE_ROLE: 1,
            ADD_WALLET: 2,
            REVOKE_WALLET: 3,
            REGISTER_FUNCTION: 4,
            UNREGISTER_FUNCTION: 5,
            ADD_FUNCTION_TO_ROLE: 6,
            REMOVE_FUNCTION_FROM_ROLE: 7,
            LOAD_DEFINITIONS: 8
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
            EXECUTE_META_CANCEL: 8,
            EXECUTE_UPDATE_PAYMENT: 9
        };
        
        // GuardController constants
        this.ETH_TRANSFER_OPERATION_TYPE = this.web3.utils.keccak256('ETH_TRANSFER');
        this.ETH_TRANSFER_SELECTOR = '0x00000000'; // bytes4(0)
        this.REQUEST_AND_APPROVE_EXECUTION_SELECTOR = this.web3.utils.keccak256(
            'requestAndApproveExecution((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))'
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
        return JSON.parse(fs.readFileSync(abiPath, 'utf8'));
    }

    async initializeAutoMode() {
        console.log('🤖 AUTO MODE: Fetching contract addresses and Ganache accounts...');
        
        try {
            // Get contract addresses from Truffle artifacts
            this.contractAddress = await this.getContractAddressFromArtifacts('ControlBlox');
            
            if (!this.contractAddress) {
                throw new Error('Could not find ControlBlox address in Truffle artifacts');
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
            this.contractAddress = process.env.CONTROLBLOX_ADDRESS || process.env.GUARD_CONTROLLER_ADDRESS;
            
            if (!this.contractAddress) {
                throw new Error('CONTROLBLOX_ADDRESS or GUARD_CONTROLLER_ADDRESS not set in environment variables');
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
        
        console.log(`✅ ${this.testName} initialized successfully\n`);
    }

    async verifyRuntimeRBACInitialized() {
        try {
            console.log('🔍 Verifying RuntimeRBAC initialization...');
            
            // Check if roleConfigBatchRequestAndApprove function schema exists
            const functionSchema = await this.callContractMethod(
                this.contract.methods.getFunctionSchema(this.ROLE_CONFIG_BATCH_META_SELECTOR)
            );
            
            if (functionSchema.functionSelectorReturn !== this.ROLE_CONFIG_BATCH_META_SELECTOR) {
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
            this.roles.broadcaster = await this.callContractMethod(this.contract.methods.getBroadcaster());
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
                if (wallet.address.toLowerCase() === this.roles.broadcaster.toLowerCase()) {
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
        try {
            const from = wallet.address;
            const gas = await method.estimateGas({ from });
            const result = await method.send({ from, gas });
            return result;
        } catch (error) {
            let errorMessage = error.message;
            if (error.data) {
                try {
                    // Try to decode RestrictedBroadcaster error
                    const errorData = error.data.result || error.data;
                    if (errorData && typeof errorData === 'string' && errorData.startsWith('0xf37a3442')) {
                        // RestrictedBroadcaster(address,address) selector: 0xf37a3442
                        const decoded = this.web3.eth.abi.decodeParameters(
                            ['address', 'address'],
                            '0x' + errorData.slice(10)
                        );
                        errorMessage = `RestrictedBroadcaster: caller=${decoded[0]}, expected broadcaster=${decoded[1]}`;
                    } else {
                        // Try to decode as string
                        const revertReason = this.web3.eth.abi.decodeParameter('string', errorData);
                        errorMessage = `${error.message} (Revert reason: ${revertReason})`;
                    }
                } catch (decodeError) {
                    errorMessage = `${error.message} (Data: ${JSON.stringify(error.data)})`;
                }
            }
            if (error.reason) {
                errorMessage = `${errorMessage} (Reason: ${error.reason})`;
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
            
            const result = await method.call({ from: fromWallet.address });
            return result;
        } catch (error) {
            throw new Error(`Contract call failed: ${error.message}`);
        }
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
            case this.RoleConfigActionType.REGISTER_FUNCTION:
                // (string functionSignature, string operationName, uint8[] supportedActions)
                encodedData = this.web3.eth.abi.encodeParameters(
                    ['string', 'string', 'uint8[]'],
                    [data.functionSignature, data.operationName, data.supportedActions]
                );
                break;
            case this.RoleConfigActionType.ADD_FUNCTION_TO_ROLE:
                // (bytes32 roleHash, FunctionPermission functionPermission)
                // FunctionPermission is tuple(bytes4,uint16)
                encodedData = this.web3.eth.abi.encodeParameters(
                    ['bytes32', 'tuple(bytes4,uint16)'],
                    [data.roleHash, [data.functionPermission.functionSelector, data.functionPermission.grantedActionsBitmap]]
                );
                break;
            default:
                throw new Error(`Unsupported action type for GuardController tests: ${actionType}`);
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
    createFunctionPermission(functionSelector, actions) {
        const bitmap = this.createBitmapFromActions(actions);
        return {
            functionSelector: functionSelector,
            grantedActionsBitmap: bitmap
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
            
            // Create meta-transaction parameters using contract method
            const metaParams = await this.callContractMethod(
                this.contract.methods.createMetaTxParams(
                    this.contractAddress,
                    this.ROLE_CONFIG_BATCH_META_SELECTOR,
                    this.TxAction.SIGN_META_REQUEST_AND_APPROVE,
                    3600, // 1 hour default
                    0, // maxGasPrice
                    signerAddress
                )
            );
            
            // Generate unsigned meta-transaction for new operation
            const unsignedMetaTx = await this.callContractMethod(
                this.contract.methods.generateUnsignedMetaTransactionForNew(
                    signerAddress,
                    this.contractAddress,
                    0, // value
                    1000000, // gasLimit
                    this.ROLE_CONFIG_BATCH_OPERATION_TYPE,
                    this.ROLE_CONFIG_BATCH_EXECUTE_SELECTOR,
                    executionParams,
                    metaParams
                )
            );
            
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
            
            // Execute meta-transaction via broadcaster
            const receipt = await this.sendTransaction(
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
     * Register a function schema using RuntimeRBAC
     * @param {string} functionSelector - Function selector (4 bytes)
     * @param {string} functionSignature - Function signature (can be empty string for bytes4(0))
     * @param {string} operationName - Operation name (e.g., "ETH_TRANSFER")
     * @param {number[]} supportedActions - Array of TxAction enum values
     * @param {string} signerPrivateKey - Private key of the signer (owner)
     * @param {Object} broadcasterWallet - Wallet object for broadcaster
     * @returns {Promise<Object>} Transaction receipt
     */
    async registerFunction(functionSelector, functionSignature, operationName, supportedActions, signerPrivateKey, broadcasterWallet) {
        const action = this.encodeRoleConfigAction(
            this.RoleConfigActionType.REGISTER_FUNCTION,
            {
                functionSignature: functionSignature,
                operationName: operationName,
                supportedActions: supportedActions
            }
        );
        
        return await this.executeRoleConfigBatch([action], signerPrivateKey, broadcasterWallet);
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
     * Create a meta-transaction for ETH transfer
     * @param {string} target - Target address (contract or wallet)
     * @param {string} value - ETH value in wei
     * @param {string} signerAddress - Address that will sign the meta-transaction
     * @returns {Promise<Object>} Unsigned meta-transaction ready for signing
     */
    async createEthTransferMetaTx(target, value, signerAddress) {
        try {
            // Create meta-transaction parameters
            const metaParams = await this.callContractMethod(
                this.contract.methods.createMetaTxParams(
                    target,
                    this.ETH_TRANSFER_SELECTOR,
                    this.TxAction.SIGN_META_REQUEST_AND_APPROVE,
                    3600, // 1 hour default
                    0, // maxGasPrice
                    signerAddress
                )
            );
            
            // Generate unsigned meta-transaction for new operation
            const unsignedMetaTx = await this.callContractMethod(
                this.contract.methods.generateUnsignedMetaTransactionForNew(
                    signerAddress,
                    target,
                    value,
                    100000, // gasLimit for ETH transfer
                    this.ETH_TRANSFER_OPERATION_TYPE,
                    this.ETH_TRANSFER_SELECTOR,
                    '0x', // empty params for ETH transfer
                    metaParams
                )
            );
            
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
     * @param {string} target - Target address (contract or wallet)
     * @param {string} value - ETH value in wei
     * @param {string} signerPrivateKey - Private key of the signer (owner)
     * @param {Object} broadcasterWallet - Wallet object for broadcaster
     * @returns {Promise<Object>} Transaction receipt
     */
    async executeEthTransfer(target, value, signerPrivateKey, broadcasterWallet) {
        try {
            const signerAddress = this.web3.eth.accounts.privateKeyToAccount(signerPrivateKey).address;
            
            // Create unsigned meta-transaction
            const unsignedMetaTx = await this.createEthTransferMetaTx(target, value, signerAddress);
            
            // Sign meta-transaction
            const signedMetaTx = await this.eip712Signer.signMetaTransaction(
                unsignedMetaTx,
                signerPrivateKey,
                this.contract
            );
            
            // Execute via broadcaster using requestAndApproveExecution
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
            return functionSchema.functionSelectorReturn === functionSelector;
        } catch (error) {
            return false;
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
