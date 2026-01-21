/**
 * Base Test Class for RuntimeRBAC Tests
 * Provides common functionality for all RuntimeRBAC test sections
 */

const Web3 = require('web3');
const fs = require('fs');
const path = require('path');
const EIP712Signer = require('../utils/eip712-signing.cjs');

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

class BaseRuntimeRBACTest {
    constructor(testName) {
        this.testName = testName;
        this.web3 = new Web3(getWeb3Url());
        
        // Determine test mode
        this.testMode = process.env.TEST_MODE || 'manual';
        console.log(`🔧 Test Mode: ${this.testMode.toUpperCase()}`);
        
        // Initialize contract address and ABI
        this.contractAddress = null; // Will be set during initialization
        this.contractABI = this.loadABI('RoleBlox'); // RoleBlox is the concrete implementation of RuntimeRBAC
        
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
        
        // Constants for RuntimeRBAC
        this.ROLE_CONFIG_BATCH_META_SELECTOR = this.web3.utils.keccak256(
            'roleConfigBatchRequestAndApprove(((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))'
        ).slice(0, 10); // First 4 bytes
        
        this.ROLE_CONFIG_BATCH_EXECUTE_SELECTOR = this.web3.utils.keccak256(
            'executeRoleConfigBatch((uint8,bytes)[])'
        ).slice(0, 10); // First 4 bytes
        
        this.ROLE_CONFIG_BATCH_OPERATION_TYPE = this.web3.utils.keccak256('ROLE_CONFIG_BATCH');

        // Precomputed role hashes (must match StateAbstraction constants)
        this.OWNER_ROLE_HASH = this.web3.utils.keccak256('OWNER_ROLE');
        this.BROADCASTER_ROLE_HASH = this.web3.utils.keccak256('BROADCASTER_ROLE');
        
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
        
        // Test results
        this.testResults = {
            totalTests: 0,
            passedTests: 0,
            failedTests: 0,
            startTime: null,
            endTime: null
        };
    }

    /**
     * Check if a function schema exists on the RuntimeRBAC/BaseStateMachine contract.
     * @param {string} functionSelector - 4-byte selector as 0x-prefixed hex string
     * @returns {Promise<boolean>} true if schema exists, false otherwise
     */
    async functionSchemaExists(functionSelector) {
        try {
            const exists = await this.callContractMethod(
                this.contract.methods.functionSchemaExists(functionSelector)
            );
            return !!exists;
        } catch (error) {
            // If the call reverts, treat as non-existent
            return false;
        }
    }

    loadABI(contractName) {
        const abiPath = path.join(__dirname, '../../../abi', `${contractName}.abi.json`);
        return JSON.parse(fs.readFileSync(abiPath, 'utf8'));
    }

    async initializeAutoMode() {
        console.log('🤖 AUTO MODE: Fetching contract addresses and Ganache accounts...');
        
        try {
            // Get contract addresses from Truffle artifacts
            // RoleBlox is the concrete implementation of RuntimeRBAC
            this.contractAddress = await this.getContractAddressFromArtifacts('RoleBlox');
            
            if (!this.contractAddress) {
                throw new Error('Could not find RoleBlox address in Truffle artifacts');
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
            // Try RUNTIME_RBAC_ADDRESS first, then ROLEBLOX_ADDRESS
            this.contractAddress = process.env.RUNTIME_RBAC_ADDRESS || process.env.ROLEBLOX_ADDRESS;
            
            if (!this.contractAddress) {
                throw new Error('RUNTIME_RBAC_ADDRESS or ROLEBLOX_ADDRESS not set in environment variables');
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
            // Note: We can't directly check permissions via contract, but we can verify the role exists
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
            // Estimate gas and include it in the send to avoid provider defaults causing reverts
            const from = wallet.address;
            
            // Try to estimate gas first to catch errors early
            try {
                const gas = await method.estimateGas({ from });
                const result = await method.send({ from, gas });
                return result;
            } catch (estimateError) {
                // If estimation fails, try to decode the error
                if (estimateError.data) {
                    const errorData = estimateError.data;
                    // Try to decode custom errors
                    try {
                        // RestrictedBroadcaster(address,address) selector: 0xf37a3442
                        if (errorData.result && errorData.result.startsWith('0xf37a3442')) {
                            const decoded = this.web3.eth.abi.decodeParameters(
                                ['address', 'address'],
                                '0x' + errorData.result.slice(10)
                            );
                            throw new Error(`RestrictedBroadcaster: caller=${decoded[0]}, broadcaster=${decoded[1]}`);
                        }
                    } catch (decodeError) {
                        // Continue with original error
                    }
                }
                throw estimateError;
            }
        } catch (error) {
            // Try to extract revert reason if available
            let errorMessage = error.message;
            if (error.data) {
                // Try to decode revert reason
                try {
                    // Check for custom error in result field
                    if (error.data.result) {
                        const result = error.data.result;
                        // RestrictedBroadcaster(address,address) selector: 0xf37a3442
                        if (result.startsWith('0xf37a3442')) {
                            const decoded = this.web3.eth.abi.decodeParameters(
                                ['address', 'address'],
                                '0x' + result.slice(10)
                            );
                            errorMessage = `RestrictedBroadcaster error: caller (msg.sender) = ${decoded[0]}, expected broadcaster = ${decoded[1]}`;
                        } else {
                            const revertReason = this.web3.eth.abi.decodeParameter('string', result);
                            errorMessage = `${error.message} (Revert reason: ${revertReason})`;
                        }
                    } else {
                        const revertReason = this.web3.eth.abi.decodeParameter('string', error.data);
                        errorMessage = `${error.message} (Revert reason: ${revertReason})`;
                    }
                } catch (decodeError) {
                    // If decoding fails, include the raw data
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
                // Use owner wallet if available
                fromWallet = this.roleWallets.owner;
            } else {
                // Fallback to first wallet if role wallets not discovered yet
                fromWallet = this.wallets.wallet1;
            }
            
            // For contract methods that return values without changing state, use call()
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
            case this.RoleConfigActionType.CREATE_ROLE:
                // (string roleName, uint256 maxWallets, FunctionPermission[] functionPermissions)
                // FunctionPermission is tuple(bytes4,uint16)
                const functionPermsArray = data.functionPermissions.map(fp => [
                    fp.functionSelector,
                    fp.grantedActionsBitmap
                ]);
                encodedData = this.web3.eth.abi.encodeParameters(
                    ['string', 'uint256', 'tuple(bytes4,uint16)[]'],
                    [data.roleName, data.maxWallets, functionPermsArray]
                );
                break;
            case this.RoleConfigActionType.REMOVE_ROLE:
                // (bytes32 roleHash)
                encodedData = this.web3.eth.abi.encodeParameters(['bytes32'], [data]);
                break;
            case this.RoleConfigActionType.ADD_WALLET:
            case this.RoleConfigActionType.REVOKE_WALLET:
                // (bytes32 roleHash, address wallet)
                encodedData = this.web3.eth.abi.encodeParameters(['bytes32', 'address'], data);
                break;
            case this.RoleConfigActionType.REGISTER_FUNCTION:
                // (string functionSignature, string operationName, TxAction[] supportedActions)
                encodedData = this.web3.eth.abi.encodeParameters(
                    ['string', 'string', 'uint8[]'],
                    [data.functionSignature, data.operationName, data.supportedActions]
                );
                break;
            case this.RoleConfigActionType.UNREGISTER_FUNCTION:
                // (bytes4 functionSelector, bool safeRemoval)
                encodedData = this.web3.eth.abi.encodeParameters(['bytes4', 'bool'], data);
                break;
            case this.RoleConfigActionType.ADD_FUNCTION_TO_ROLE:
                // (bytes32 roleHash, FunctionPermission functionPermission)
                // FunctionPermission is tuple(bytes4,uint16)
                encodedData = this.web3.eth.abi.encodeParameters(
                    ['bytes32', 'tuple(bytes4,uint16)'],
                    [data.roleHash, [data.functionPermission.functionSelector, data.functionPermission.grantedActionsBitmap]]
                );
                break;
            case this.RoleConfigActionType.REMOVE_FUNCTION_FROM_ROLE:
                // (bytes32 roleHash, bytes4 functionSelector)
                encodedData = this.web3.eth.abi.encodeParameters(['bytes32', 'bytes4'], data);
                break;
            default:
                throw new Error(`Unknown action type: ${actionType}`);
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
     * @param {Object} metaTxParams - Additional meta-transaction parameters
     * @returns {Promise<Object>} Unsigned meta-transaction ready for signing
     */
    async createRoleConfigBatchMetaTx(actions, signerAddress, metaTxParams = {}) {
        try {
            // Encode actions array
            const actionsArray = actions.map(a => [a.actionType, a.data]);
            console.log(`  🔍 Encoding ${actions.length} action(s) for batch execution`);
            console.log(`  🔍 Action types: ${actions.map(a => a.actionType).join(', ')}`);
            const executionParams = this.web3.eth.abi.encodeParameter(
                'tuple(uint8,bytes)[]',
                actionsArray
            );
            console.log(`  🔍 Execution params length: ${executionParams.length} bytes`);
            
            // Create meta-transaction parameters using contract method (handles nonce automatically)
            const metaParams = await this.callContractMethod(
                this.contract.methods.createMetaTxParams(
                    this.contractAddress,
                    this.ROLE_CONFIG_BATCH_META_SELECTOR,
                    this.TxAction.SIGN_META_REQUEST_AND_APPROVE,
                    metaTxParams.deadline || 3600, // 1 hour default
                    metaTxParams.maxGasPrice || 0,
                    signerAddress
                )
            );
            
            // Generate unsigned meta-transaction for new operation
            const unsignedMetaTx = await this.callContractMethod(
                this.contract.methods.generateUnsignedMetaTransactionForNew(
                    signerAddress,
                    this.contractAddress,
                    0, // value
                    metaTxParams.gasLimit || 1000000,
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
            
            console.log(`  🔍 Signer address: ${signerAddress}`);
            console.log(`  🔍 Signer private key provided: ${signerPrivateKey ? 'YES' : 'NO'}`);
            
            // Verify broadcaster address matches contract's broadcaster
            const contractBroadcaster = await this.callContractMethod(this.contract.methods.getBroadcaster());
            if (contractBroadcaster.toLowerCase() !== broadcasterWallet.address.toLowerCase()) {
                throw new Error(`Broadcaster mismatch: contract has ${contractBroadcaster}, but using ${broadcasterWallet.address}`);
            }
            console.log(`  ✅ Verified broadcaster: ${broadcasterWallet.address}`);
            
            // Encode actions array for execution (needed for debugging)
            const actionsArray = actions.map(a => [a.actionType, a.data]);
            const executionParams = this.web3.eth.abi.encodeParameter(
                'tuple(uint8,bytes)[]',
                actionsArray
            );
            console.log(`  🔍 Execution params length: ${executionParams.length} bytes`);
            
            // Create unsigned meta-transaction
            const unsignedMetaTx = await this.createRoleConfigBatchMetaTx(actions, signerAddress);
            
            // Sign meta-transaction
            console.log('  🔐 Signing meta-transaction...');
            console.log(`  🔍 Meta-transaction signer address: ${unsignedMetaTx.params.signer}`);
            const signedMetaTx = await this.eip712Signer.signMetaTransaction(
                unsignedMetaTx,
                signerPrivateKey,
                this.contract
            );
            
            // Execute meta-transaction via broadcaster
            console.log('  📡 Executing meta-transaction via broadcaster...');
            console.log(`  📋 Calling from: ${broadcasterWallet.address}`);
            console.log(`  📋 Contract broadcaster: ${contractBroadcaster}`);
            
            // Debug: Verify execution params encoding
            const executionParamsForCall = this.web3.eth.abi.encodeParameter(
                'tuple(uint8,bytes)[]',
                actionsArray
            );
            const expectedCallData = this.ROLE_CONFIG_BATCH_EXECUTE_SELECTOR + executionParamsForCall.slice(2);
            console.log(`  🔍 Expected execution selector: ${this.ROLE_CONFIG_BATCH_EXECUTE_SELECTOR}`);
            console.log(`  🔍 Execution params encoded: ${executionParamsForCall.length} bytes`);
            console.log(`  🔍 Expected call data length: ${expectedCallData.length} bytes`);
            console.log(`  🔍 Expected call data (first 100 chars): ${expectedCallData.slice(0, 100)}`);
            
            // Verify selector matches expected function signature
            const expectedSelector = this.web3.utils.keccak256('executeRoleConfigBatch((uint8,bytes)[])').slice(0, 10);
            console.log(`  🔍 Expected selector from signature: ${expectedSelector}`);
            console.log(`  🔍 Selector match: ${this.ROLE_CONFIG_BATCH_EXECUTE_SELECTOR === expectedSelector}`);
            
            // Verify the actual execution params in the meta-transaction match
            console.log(`  🔍 Execution params match: ${executionParams === executionParamsForCall}`);
            
            // Test: Verify function exists on contract by checking if selector is in ABI
            try {
                console.log(`  🔍 Verifying function exists on contract...`);
                const contractABI = this.contract.options.jsonInterface;
                const functionExists = contractABI.some(item => 
                    item.type === 'function' && 
                    item.name === 'executeRoleConfigBatch' &&
                    this.web3.utils.keccak256(item.signature).slice(0, 10) === this.ROLE_CONFIG_BATCH_EXECUTE_SELECTOR
                );
                console.log(`  📋 Function exists in ABI: ${functionExists}`);
                
                if (!functionExists) {
                    console.log(`  ⚠️  WARNING: executeRoleConfigBatch not found in contract ABI!`);
                    const functionNames = contractABI.filter(i => i.type === 'function').map(i => i.name);
                    console.log(`  📋 Available functions (first 20): ${functionNames.slice(0, 20).join(', ')}`);
                }
            } catch (e) {
                console.log(`  ⚠️  Could not verify function existence: ${e.message}`);
            }
            
            // Test: Try to call executeRoleConfigBatch directly to see if it works
            // Note: web3.eth.call is a read-only call, so msg.sender will be the zero address
            // This will fail validateInternalCall, but we can see the error
            try {
                console.log(`  🔍 Testing direct call to executeRoleConfigBatch (read-only)...`);
                console.log(`  📋 Call data length: ${expectedCallData.length} bytes`);
                console.log(`  📋 Call data (first 100 chars): ${expectedCallData.slice(0, 100)}`);
                const directCallResult = await this.web3.eth.call({
                    to: this.contractAddress,
                    data: expectedCallData
                });
                console.log(`  ✅ Direct call succeeded: ${directCallResult ? 'YES' : 'NO'}`);
            } catch (error) {
                console.log(`  ⚠️  Direct call failed: ${error.message}`);
                // Try to decode the error
                if (error.data) {
                    const errorData = error.data.result || error.data;
                    if (errorData && typeof errorData === 'string' && errorData.length > 2) {
                        console.log(`  📋 Error data (first 200 chars): ${errorData.slice(0, 200)}`);
                        const errorSelector = errorData.slice(0, 10);
                        console.log(`  📋 Error selector: ${errorSelector}`);
                        const onlyCallable = this.web3.utils.keccak256('OnlyCallableByContract(address,address)').slice(0, 10);
                        if (errorSelector === onlyCallable) {
                            try {
                                const decoded = this.web3.eth.abi.decodeParameters(
                                    ['address', 'address'],
                                    '0x' + errorData.slice(10)
                                );
                                console.log(`  📋 OnlyCallableByContract: caller=${decoded[0]}, expected=${decoded[1]}`);
                                console.log(`  📋 This is expected for read-only calls (msg.sender = zero address)`);
                                console.log(`  📋 When executeTransaction calls, msg.sender should be contract address (${this.contractAddress})`);
                            } catch (e) {
                                console.log(`  ⚠️  Could not decode error: ${e.message}`);
                            }
                        } else {
                            console.log(`  📋 Unknown error selector: ${errorSelector}`);
                        }
                    } else {
                        console.log(`  ⚠️  Error data is empty or invalid`);
                    }
                } else {
                    console.log(`  ⚠️  No error data in error object`);
                }
            }
            
            // Test 1: Try to call executeRoleConfigBatch directly using a write transaction
            // This simulates what executeTransaction does internally
            console.log(`  🔍 Test 1: Direct function call (simulating executeTransaction)...`);
            try {
                // Create a test transaction that calls executeRoleConfigBatch directly
                // We'll use the contract's own address as the caller to pass validateInternalCall
                const directCallData = expectedCallData;
                console.log(`  📋 Direct call data: ${directCallData.slice(0, 100)}...`);
                console.log(`  📋 Call data length: ${directCallData.length} bytes`);
                
                // Try to estimate gas for the direct call
                try {
                    const gasEstimate = await this.web3.eth.estimateGas({
                        to: this.contractAddress,
                        data: directCallData,
                        from: this.contractAddress // This won't work for estimateGas, but let's try
                    });
                    console.log(`  📋 Gas estimate for direct call: ${gasEstimate}`);
                } catch (gasError) {
                    console.log(`  ⚠️  Could not estimate gas: ${gasError.message}`);
                }
                
                // Test: Try to call the function directly using web3.eth.call
                // This will show us what error we get
                try {
                    console.log(`  🔍 Testing direct call using web3.eth.call...`);
                    const callResult = await this.web3.eth.call({
                        to: this.contractAddress,
                        data: directCallData,
                        from: this.contractAddress
                    });
                    console.log(`  ✅ Direct call succeeded! Result: ${callResult}`);
                } catch (callError) {
                    console.log(`  ⚠️  Direct call failed: ${callError.message}`);
                    if (callError.data) {
                        const errorData = callError.data.result || callError.data;
                        if (errorData && typeof errorData === 'string' && errorData.length > 2) {
                            console.log(`  📋 Error data (first 200 chars): ${errorData.slice(0, 200)}`);
                            const errorSelector = errorData.slice(0, 10);
                            console.log(`  📋 Error selector: ${errorSelector}`);
                            
                            // Check for common errors
                            const onlyCallable = this.web3.utils.keccak256('OnlyCallableByContract(address,address)').slice(0, 10);
                            const resourceExists = this.web3.utils.keccak256('ResourceAlreadyExists(bytes32)').slice(0, 10);
                            const notSupported = this.web3.utils.keccak256('NotSupported()').slice(0, 10);
                            
                            if (errorSelector === onlyCallable) {
                                try {
                                    const decoded = this.web3.eth.abi.decodeParameters(
                                        ['address', 'address'],
                                        '0x' + errorData.slice(10)
                                    );
                                    console.log(`  📋 OnlyCallableByContract: caller=${decoded[0]}, expected=${decoded[1]}`);
                                    console.log(`  📋 This is expected for read-only calls (msg.sender = zero address)`);
                                } catch (e) {
                                    console.log(`  ⚠️  Could not decode OnlyCallableByContract: ${e.message}`);
                                }
                            } else if (errorSelector === resourceExists) {
                                try {
                                    const decoded = this.web3.eth.abi.decodeParameter('bytes32', '0x' + errorData.slice(10));
                                    console.log(`  ❌ ResourceAlreadyExists error detected!`);
                                    console.log(`     Resource ID: ${decoded}`);
                                    console.log(`     This means the role already exists!`);
                                    console.log(`     We should remove it first before creating it.`);
                                } catch (e) {
                                    console.log(`  ⚠️  Could not decode ResourceAlreadyExists: ${e.message}`);
                                }
                            } else if (errorSelector === notSupported) {
                                console.log(`  ❌ NotSupported error - action type may be invalid`);
                            } else {
                                console.log(`  📋 Unknown error selector: ${errorSelector}`);
                                console.log(`  📋 Try decoding as string error...`);
                                try {
                                    const stringError = this.web3.eth.abi.decodeParameter('string', errorData);
                                    console.log(`  📋 String error: ${stringError}`);
                                } catch (e) {
                                    console.log(`  ⚠️  Could not decode as string: ${e.message}`);
                                }
                            }
                        }
                    }
                }
            } catch (testError) {
                console.log(`  ⚠️  Direct call test failed: ${testError.message}`);
            }
            
            // Test 2: Verify gas limit in the meta-transaction
            console.log(`  🔍 Test 2: Checking gas limit in meta-transaction...`);
            const metaTxGasLimit = unsignedMetaTx.txRecord.params.gasLimit || unsignedMetaTx.txRecord.params[4];
            console.log(`  📋 Meta-transaction gas limit: ${metaTxGasLimit}`);
            console.log(`  📋 Default gas limit used: 1000000`);
            if (metaTxGasLimit && metaTxGasLimit < 100000) {
                console.log(`  ⚠️  WARNING: Gas limit is very low (${metaTxGasLimit}) - may cause out of gas`);
            }
            
            // Test 3: Verify exact call data format
            console.log(`  🔍 Test 3: Verifying exact call data format...`);
            const metaTxExecutionParams = unsignedMetaTx.txRecord.params.executionParams || unsignedMetaTx.txRecord.params[6];
            const metaTxExecutionSelector = unsignedMetaTx.txRecord.params.executionSelector || unsignedMetaTx.txRecord.params[5];
            console.log(`  📋 Meta-transaction execution selector: ${metaTxExecutionSelector}`);
            console.log(`  📋 Expected execution selector: ${this.ROLE_CONFIG_BATCH_EXECUTE_SELECTOR}`);
            console.log(`  📋 Selector match: ${metaTxExecutionSelector === this.ROLE_CONFIG_BATCH_EXECUTE_SELECTOR}`);
            
            if (metaTxExecutionParams) {
                // Convert params to hex string (handling both string and buffer types)
                let paramsStr;
                if (typeof metaTxExecutionParams === 'string') {
                    // If it's already a string, remove 0x prefix if present
                    paramsStr = metaTxExecutionParams.startsWith('0x') ? metaTxExecutionParams.slice(2) : metaTxExecutionParams;
                } else if (Buffer.isBuffer(metaTxExecutionParams)) {
                    paramsStr = metaTxExecutionParams.toString('hex');
                } else if (Array.isArray(metaTxExecutionParams)) {
                    paramsStr = Buffer.from(metaTxExecutionParams).toString('hex');
                } else {
                    paramsStr = metaTxExecutionParams.toString ? metaTxExecutionParams.toString('hex') : String(metaTxExecutionParams);
                }
                
                const expectedParamsStr = executionParams.startsWith('0x') ? executionParams.slice(2) : executionParams;
                console.log(`  📋 Meta-transaction execution params length: ${paramsStr.length / 2} bytes`);
                console.log(`  📋 Expected execution params length: ${expectedParamsStr.length / 2} bytes`);
                console.log(`  📋 Params match: ${paramsStr.toLowerCase() === expectedParamsStr.toLowerCase()}`);
                
                if (paramsStr.toLowerCase() !== expectedParamsStr.toLowerCase()) {
                    console.log(`  ⚠️  WARNING: Execution params mismatch!`);
                    console.log(`  📋 Meta-tx params (first 100 chars): ${paramsStr.slice(0, 100)}`);
                    console.log(`  📋 Expected params (first 100 chars): ${expectedParamsStr.slice(0, 100)}`);
                }
                
                // Reconstruct the call data that should be used (selector + params, no 0x prefix)
                const selectorStr = metaTxExecutionSelector.startsWith('0x') ? metaTxExecutionSelector.slice(2) : metaTxExecutionSelector;
                const reconstructedCallData = selectorStr + paramsStr;
                console.log(`  📋 Reconstructed call data length: ${reconstructedCallData.length / 2} bytes`);
                console.log(`  📋 Reconstructed call data (first 100 chars): ${reconstructedCallData.slice(0, 100)}`);
                const expectedCallDataStr = expectedCallData.startsWith('0x') ? expectedCallData.slice(2) : expectedCallData;
                console.log(`  📋 Expected call data (first 100 chars): ${expectedCallDataStr.slice(0, 100)}`);
                console.log(`  📋 Call data match: ${reconstructedCallData.toLowerCase() === expectedCallDataStr.toLowerCase()}`);
                
                if (reconstructedCallData.toLowerCase() !== expectedCallDataStr.toLowerCase()) {
                    console.log(`  ⚠️  WARNING: Call data mismatch! This could be the root cause!`);
                    // Find where they differ
                    for (let i = 0; i < Math.min(reconstructedCallData.length, expectedCallDataStr.length); i++) {
                        if (reconstructedCallData[i].toLowerCase() !== expectedCallDataStr[i].toLowerCase()) {
                            console.log(`  📋 First difference at position ${i}:`);
                            console.log(`     Reconstructed: ${reconstructedCallData.slice(Math.max(0, i-10), i+20)}`);
                            console.log(`     Expected:      ${expectedCallDataStr.slice(Math.max(0, i-10), i+20)}`);
                            break;
                        }
                    }
                }
            }
            
            const receipt = await this.sendTransaction(
                this.contract.methods.roleConfigBatchRequestAndApprove(signedMetaTx),
                broadcasterWallet
            );
            
            // Check if transaction actually executed by looking for TransactionEvent and ExecutionDebug
            if (receipt.logs && receipt.logs.length > 0) {
                console.log(`  📋 Transaction emitted ${receipt.logs.length} log(s)`);
                
                // Try to find TransactionEvent
                const eventSignature = this.web3.utils.keccak256('TransactionEvent(uint256,bytes4,uint8,address,address,bytes32)');
                for (let i = 0; i < receipt.logs.length; i++) {
                    const log = receipt.logs[i];
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
                            console.log(`  📋 TransactionEvent found:`);
                            console.log(`     txId: ${decoded.txId}`);
                            console.log(`     status: ${decoded.status} (0=UNDEFINED, 1=PENDING, 2=EXECUTING, 5=COMPLETED, 6=FAILED)`);
                            console.log(`     functionHash: ${decoded.functionHash}`);
                            if (decoded.status === 6) {
                                console.log(`  ⚠️  Transaction execution FAILED`);
                            } else if (decoded.status === 5) {
                                console.log(`  ✅ Transaction execution COMPLETED`);
                            }
                        } catch (e) {
                            console.log(`  ⚠️  Could not decode TransactionEvent: ${e.message}`);
                        }
                    }
                }
            } else {
                console.log(`  ⚠️  WARNING: Transaction has 0 logs - execution may not have happened`);
                
                // Try to query the transaction status directly from the contract
                // Get txId from the meta-transaction
                try {
                    console.log(`  🔍 Attempting to query transaction status from contract...`);
                    const txId = unsignedMetaTx.txRecord.txId;
                    console.log(`  📋 Transaction ID from meta-transaction: ${txId}`);
                    
                    // Query the transaction status
                    const txRecord = await this.callContractMethod(
                        this.contract.methods.getTransaction(txId)
                    );
                    console.log(`  📋 Transaction status: ${txRecord.status} (0=UNDEFINED, 1=PENDING, 2=EXECUTING, 5=COMPLETED, 6=FAILED)`);
                    console.log(`  📋 Transaction target: ${txRecord.params.target}`);
                    console.log(`  📋 Contract address: ${this.contractAddress}`);
                    console.log(`  📋 Target matches contract: ${txRecord.params.target.toLowerCase() === this.contractAddress.toLowerCase()}`);
                    console.log(`  📋 Transaction executionSelector: ${txRecord.params.executionSelector}`);
                    
                    // Check result field - try multiple ways to access it
                    console.log(`  📋 Transaction record keys: ${Object.keys(txRecord).join(', ')}`);
                    const resultField = txRecord.result || txRecord[6] || txRecord['6']; // Try different access methods
                    console.log(`  📋 Result field exists: ${resultField !== undefined && resultField !== null}`);
                    console.log(`  📋 Result field value: ${resultField}`);
                    console.log(`  📋 Result field type: ${typeof resultField}`);
                    
                    if (resultField && resultField !== '0x' && resultField.length > 2) {
                        const resultStr = typeof resultField === 'string' ? resultField : (resultField.toString ? resultField.toString() : JSON.stringify(resultField));
                        console.log(`  📋 Result as string: ${resultStr}`);
                        console.log(`  📋 Result length: ${resultStr.length}`);
                        if (resultStr.length > 2) {
                            console.log(`  📋 Result (first 200 chars): ${resultStr.slice(0, 200)}`);
                            
                            // Try to decode the error
                            try {
                                const errorSelector = resultStr.slice(0, 10);
                                console.log(`  📋 Error selector: ${errorSelector}`);
                                
                                // Check for common errors
                                const onlyCallable = this.web3.utils.keccak256('OnlyCallableByContract(address,address)').slice(0, 10);
                                const resourceExists = this.web3.utils.keccak256('ResourceAlreadyExists(bytes32)').slice(0, 10);
                                const notSupported = this.web3.utils.keccak256('NotSupported()').slice(0, 10);
                                
                                if (errorSelector === onlyCallable) {
                                    const decoded = this.web3.eth.abi.decodeParameters(
                                        ['address', 'address'],
                                        '0x' + resultStr.slice(10)
                                    );
                                    console.log(`  ❌ OnlyCallableByContract error detected:`);
                                    console.log(`     Caller (msg.sender): ${decoded[0]}`);
                                    console.log(`     Expected (address(this)): ${decoded[1]}`);
                                    console.log(`     Contract address: ${this.contractAddress}`);
                                    console.log(`     Issue: msg.sender (${decoded[0]}) != address(this) (${decoded[1]})`);
                                    console.log(`     This means the low-level call is not working as expected!`);
                                }
                            } catch (e) {
                                console.log(`  ⚠️  Could not decode error: ${e.message}`);
                            }
                        }
                    } else {
                        console.log(`  ⚠️  Result field is empty or null - execution may have failed without revert data`);
                    }
                    
                    if (txRecord.status === 6) {
                        console.log(`  ⚠️  Transaction FAILED - execution did not succeed`);
                        console.log(`  📋 Full txRecord: ${JSON.stringify(txRecord, null, 2)}`);
                        
                        // Try to get result in different ways
                        const result = txRecord.result;
                        console.log(`  📋 Result raw: ${result}`);
                        console.log(`  📋 Result type: ${typeof result}`);
                        
                        if (result) {
                            let resultHex = '';
                            if (typeof result === 'string') {
                                resultHex = result;
                            } else if (Buffer.isBuffer(result)) {
                                resultHex = '0x' + result.toString('hex');
                            } else if (Array.isArray(result)) {
                                resultHex = '0x' + Buffer.from(result).toString('hex');
                            } else {
                                resultHex = String(result);
                            }
                            
                            console.log(`  📋 Failure reason (hex): ${resultHex}`);
                            console.log(`  📋 Failure reason length: ${resultHex.length}`);
                            
                            if (resultHex.length > 2) {
                                // Try to decode the error
                                try {
                                    const errorSelector = resultHex.slice(0, 10);
                                    console.log(`  📋 Error selector: ${errorSelector}`);
                                    
                                    // Check for known error selectors
                                    const onlyCallableByContract = this.web3.utils.keccak256('OnlyCallableByContract(address,address)').slice(0, 10);
                                    const notSupported = this.web3.utils.keccak256('NotSupported()').slice(0, 10);
                                    
                                    if (errorSelector === onlyCallableByContract) {
                                        const decoded = this.web3.eth.abi.decodeParameters(
                                            ['address', 'address'],
                                            '0x' + resultHex.slice(10)
                                        );
                                        console.log(`  ❌ OnlyCallableByContract error:`);
                                        console.log(`     Caller: ${decoded[0]}`);
                                        console.log(`     Expected: ${decoded[1]}`);
                                        console.log(`     Contract address: ${this.contractAddress}`);
                                        console.log(`     Issue: msg.sender (${decoded[0]}) != contract address (${decoded[1]})`);
                                    } else if (errorSelector === notSupported) {
                                        console.log(`  ❌ NotSupported error - action type may be invalid`);
                                    } else {
                                        console.log(`  📋 Unknown error - trying to decode as string...`);
                                        try {
                                            const decoded = this.web3.eth.abi.decodeParameter('string', resultHex);
                                            console.log(`  📋 Decoded error: ${decoded}`);
                                        } catch (e) {
                                            console.log(`  📋 Could not decode error: ${e.message}`);
                                        }
                                    }
                                } catch (e) {
                                    console.log(`  ⚠️  Could not decode error: ${e.message}`);
                                }
                            } else {
                                console.log(`  ⚠️  No failure reason in result - execution may have reverted without data`);
                            }
                        } else {
                            console.log(`  ⚠️  No failure reason in result - execution may have reverted without data`);
                        }
                    } else if (txRecord.status === 5) {
                        console.log(`  ✅ Transaction COMPLETED`);
                    } else if (txRecord.status === 1) {
                        console.log(`  ⚠️  Transaction still PENDING - execution may not have happened`);
                    } else if (txRecord.status === 2) {
                        console.log(`  ⚠️  Transaction still EXECUTING - this should not happen`);
                    }
                } catch (queryError) {
                    console.log(`  ⚠️  Could not query transaction status: ${queryError.message}`);
                }
            }
            
            return receipt;
            
        } catch (error) {
            console.error('❌ Failed to execute role config batch:', error.message);
            
            // Extract error selector from error data and attach it to the error object
            // so that test functions can check for specific error types
            // The error structure from web3.js is: error.data = { result: "0x...", ... }
            if (error.data) {
                // error.data can be an object with a 'result' field, or a string directly
                let errorData = null;
                if (typeof error.data === 'object') {
                    errorData = error.data.result || error.data.data || error.data;
                } else if (typeof error.data === 'string') {
                    errorData = error.data;
                }
                
                if (errorData && typeof errorData === 'string' && errorData.length > 10) {
                    error.errorSelector = errorData.slice(0, 10);
                    console.log(`  📋 Extracted error selector in executeRoleConfigBatch: ${error.errorSelector}`);
                }
            }
            
            // Also try to extract from error message if it contains the result
            if (!error.errorSelector && error.message) {
                // Look for "result":"0x..." pattern in the error message
                const resultMatch = error.message.match(/"result":"(0x[a-fA-F0-9]+)"/);
                if (resultMatch && resultMatch[1] && resultMatch[1].length > 10) {
                    error.errorSelector = resultMatch[1].slice(0, 10);
                    console.log(`  📋 Extracted error selector from message: ${error.errorSelector}`);
                }
            }
            
            throw error;
        }
    }

    /**
     * Get role hash from role name
     * @param {string} roleName - Role name
     * @returns {string} Role hash (bytes32)
     */
    getRoleHash(roleName) {
        return this.web3.utils.keccak256(roleName);
    }

    /**
     * Check if a role exists by using getRole
     * @param {string} roleHash - Role hash (bytes32)
     * @returns {Promise<boolean>} True if role exists, false otherwise
     */
    async roleExists(roleHash) {
        try {
            const role = await this.callContractMethod(
                this.contract.methods.getRole(roleHash)
            );
            // getRole returns: (roleName, roleHashReturn, maxWallets, walletCount, isProtected)
            // web3.js returns this as an object with named properties or an array
            let roleHashReturn;
            if (role && typeof role === 'object') {
                // If it's an object with named properties
                roleHashReturn = role.roleHashReturn || role[1];
            } else if (Array.isArray(role)) {
                // If it's an array, roleHashReturn is at index 1
                roleHashReturn = role[1];
            }
            
            // Role exists if roleHashReturn matches the input roleHash (and is not zero)
            return roleHashReturn && 
                   roleHashReturn !== '0x0000000000000000000000000000000000000000000000000000000000000000' &&
                   roleHashReturn.toLowerCase() === roleHash.toLowerCase();
        } catch (error) {
            // If getRole throws an error (e.g., NoPermission or ResourceNotFound), role doesn't exist
            return false;
        }
    }

    /**
     * Extract transaction ID from receipt by decoding TransactionEvent
     * @param {Object} receipt - Transaction receipt
     * @returns {string|null} Transaction ID or null if not found
     */
    extractTxIdFromReceipt(receipt) {
        if (!receipt || !receipt.logs || receipt.logs.length === 0) {
            return null;
        }
        
        const eventSignature = this.web3.utils.keccak256('TransactionEvent(uint256,bytes4,uint8,address,address,bytes32)');
        for (let i = 0; i < receipt.logs.length; i++) {
            const log = receipt.logs[i];
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

    /**
     * Get function selector from function signature
     * @param {string} functionSignature - Function signature (e.g., "mint(address,uint256)")
     * @returns {string} Function selector (4 bytes)
     */
    getFunctionSelector(functionSignature) {
        return this.web3.utils.keccak256(functionSignature).slice(0, 10); // First 4 bytes
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

module.exports = BaseRuntimeRBACTest;
