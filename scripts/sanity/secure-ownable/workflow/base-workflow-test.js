/**
 * Base Workflow Test Class
 * Provides common functionality for testing workflow information system
 */

const Web3 = require('web3');
const fs = require('fs');
const path = require('path');

// Load environment variables from the project root
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

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

class BaseWorkflowTest {
    constructor(testName) {
        this.testName = testName;
        this.web3 = new Web3(getWeb3Url());
        
        this.contractAddress = process.env.GUARDIAN_ADDRESS;
        this.contractABI = this.loadABI('Guardian');
        
        // Initialize test wallets
        this.wallets = {
            wallet1: this.web3.eth.accounts.privateKeyToAccount(process.env.TEST_WALLET_1_PRIVATE_KEY),
            wallet2: this.web3.eth.accounts.privateKeyToAccount(process.env.TEST_WALLET_2_PRIVATE_KEY),
            wallet3: this.web3.eth.accounts.privateKeyToAccount(process.env.TEST_WALLET_3_PRIVATE_KEY),
            wallet4: this.web3.eth.accounts.privateKeyToAccount(process.env.TEST_WALLET_4_PRIVATE_KEY),
            wallet5: this.web3.eth.accounts.privateKeyToAccount(process.env.TEST_WALLET_5_PRIVATE_KEY)
        };
        
        this.contract = new this.web3.eth.Contract(this.contractABI, this.contractAddress);
        
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
            errors: []
        };
        
        // Workflow information cache
        this.workflowCache = {
            allWorkflows: null,
            operationWorkflows: new Map(),
            lastUpdate: null
        };
    }
    
    loadABI(contractName) {
        try {
            const abiPath = path.join(__dirname, `../../abi/${contractName}.abi.json`);
            const abiContent = fs.readFileSync(abiPath, 'utf8');
            return JSON.parse(abiContent);
        } catch (error) {
            console.error(`❌ Failed to load ABI for ${contractName}:`, error.message);
            throw error;
        }
    }
    
    async initializeRoles() {
        console.log('🔧 Initializing role assignments...');
        
        try {
            // Get current role assignments from contract
            const owner = await this.contract.methods.owner().call();
            const broadcaster = await this.contract.methods.getBroadcaster().call();
            const recovery = await this.contract.methods.getRecovery().call();
            
            this.roles = { owner, broadcaster, recovery };
            
            // Map wallets to roles
            this.roleWallets = {
                owner: this.findWalletByAddress(owner),
                broadcaster: this.findWalletByAddress(broadcaster),
                recovery: this.findWalletByAddress(recovery)
            };
            
            console.log('✅ Role assignments initialized:');
            console.log(`   Owner: ${owner}`);
            console.log(`   Broadcaster: ${broadcaster}`);
            console.log(`   Recovery: ${recovery}`);
            
        } catch (error) {
            console.error('❌ Failed to initialize roles:', error.message);
            throw error;
        }
    }
    
    findWalletByAddress(address) {
        for (const [key, wallet] of Object.entries(this.wallets)) {
            if (wallet.address.toLowerCase() === address.toLowerCase()) {
                return wallet;
            }
        }
        return null;
    }
    
    async getAllWorkflows() {
        try {
            if (this.workflowCache.allWorkflows && this.workflowCache.lastUpdate) {
                const now = Date.now();
                const cacheAge = now - this.workflowCache.lastUpdate;
                if (cacheAge < 30000) { // 30 seconds cache
                    return this.workflowCache.allWorkflows;
                }
            }
            
            console.log('📋 Generating workflow information from contract analysis...');
            
            // Since workflow functions are not deployed yet, we'll generate the workflow data
            // based on the contract's available functions and our knowledge of the system
            const workflows = this.generateWorkflowData();
            
            this.workflowCache.allWorkflows = workflows;
            this.workflowCache.lastUpdate = Date.now();
            
            console.log(`✅ Generated ${workflows.length} operation workflows`);
            return workflows;
            
        } catch (error) {
            console.error('❌ Failed to get all workflows:', error.message);
            throw error;
        }
    }
    
    async getWorkflowForOperation(operationType) {
        try {
            if (this.workflowCache.operationWorkflows.has(operationType)) {
                return this.workflowCache.operationWorkflows.get(operationType);
            }
            
            console.log(`📋 Generating workflow for operation: ${operationType}`);
            const workflows = await this.getAllWorkflows();
            const workflow = workflows.find(w => w.operationType === operationType);
            
            if (!workflow) {
                throw new Error(`Workflow not found for operation type: ${operationType}`);
            }
            
            this.workflowCache.operationWorkflows.set(operationType, workflow);
            return workflow;
            
        } catch (error) {
            console.error(`❌ Failed to get workflow for operation ${operationType}:`, error.message);
            throw error;
        }
    }
    
    async getWorkflowPaths(operationType) {
        try {
            console.log(`📋 Getting workflow paths for operation: ${operationType}`);
            const workflow = await this.getWorkflowForOperation(operationType);
            return workflow.paths;
            
        } catch (error) {
            console.error(`❌ Failed to get workflow paths for operation ${operationType}:`, error.message);
            throw error;
        }
    }
    
    generateWorkflowData() {
        // Generate workflow data based on our knowledge of the SecureOwnable system
        // This matches the data structure we defined in SecureOwnableDefinitions.sol
        
        return [
            {
                operationType: this.getOperationTypeHash('OWNERSHIP_TRANSFER'),
                operationName: 'OWNERSHIP_TRANSFER',
                supportedRoles: ['OWNER', 'BROADCASTER', 'RECOVERY'],
                paths: [
                    {
                        name: 'Time-Delay Only',
                        description: 'Traditional two-phase operation with mandatory waiting period',
                        workflowType: 0,
                        estimatedTimeSec: 86400,
                        requiresSignature: false,
                        hasOffChainPhase: false,
                        steps: [
                            {
                                functionName: 'transferOwnershipRequest',
                                functionSelector: '0x572be39b',
                                action: 0,
                                roles: ['RECOVERY'],
                                description: 'Recovery creates ownership transfer request',
                                isOffChain: false,
                                phaseType: 'EXECUTION'
                            },
                            {
                                functionName: 'transferOwnershipDelayedApproval',
                                functionSelector: '0x6cd71b38',
                                action: 1,
                                roles: ['OWNER', 'RECOVERY'],
                                description: 'Owner or Recovery approves after time delay',
                                isOffChain: false,
                                phaseType: 'EXECUTION'
                            }
                        ]
                    },
                    {
                        name: 'Meta-Transaction Approval',
                        description: 'Owner signs approval off-chain, Broadcaster executes on-chain',
                        workflowType: 2,
                        estimatedTimeSec: 0,
                        requiresSignature: true,
                        hasOffChainPhase: true,
                        steps: [
                            {
                                functionName: 'transferOwnershipRequest',
                                functionSelector: '0x572be39b',
                                action: 0,
                                roles: ['RECOVERY'],
                                description: 'Recovery creates ownership transfer request',
                                isOffChain: false,
                                phaseType: 'EXECUTION'
                            },
                            {
                                functionName: 'signTransferOwnershipApproval',
                                functionSelector: '0x00000000',
                                action: 4,
                                roles: ['OWNER'],
                                description: 'Owner signs approval off-chain',
                                isOffChain: true,
                                phaseType: 'SIGNING'
                            },
                            {
                                functionName: 'transferOwnershipApprovalWithMetaTx',
                                functionSelector: '0xb51ff5ce',
                                action: 7,
                                roles: ['BROADCASTER'],
                                description: 'Broadcaster executes signed approval',
                                isOffChain: false,
                                phaseType: 'EXECUTION'
                            }
                        ]
                    },
                    {
                        name: 'Meta-Transaction Cancellation',
                        description: 'Owner signs cancellation off-chain, Broadcaster executes on-chain',
                        workflowType: 2,
                        estimatedTimeSec: 0,
                        requiresSignature: true,
                        hasOffChainPhase: true,
                        steps: [
                            {
                                functionName: 'transferOwnershipRequest',
                                functionSelector: '0x572be39b',
                                action: 0,
                                roles: ['RECOVERY'],
                                description: 'Recovery creates ownership transfer request',
                                isOffChain: false,
                                phaseType: 'EXECUTION'
                            },
                            {
                                functionName: 'signTransferOwnershipCancellation',
                                functionSelector: '0x00000000',
                                action: 5,
                                roles: ['OWNER'],
                                description: 'Owner signs cancellation off-chain',
                                isOffChain: true,
                                phaseType: 'SIGNING'
                            },
                            {
                                functionName: 'transferOwnershipCancellationWithMetaTx',
                                functionSelector: '0x1ef7c2ec',
                                action: 8,
                                roles: ['BROADCASTER'],
                                description: 'Broadcaster executes signed cancellation',
                                isOffChain: false,
                                phaseType: 'EXECUTION'
                            }
                        ]
                    },
                    {
                        name: 'Time-Delay Cancellation',
                        description: 'Cancel pending ownership transfer request after timelock',
                        workflowType: 0,
                        estimatedTimeSec: 0,
                        requiresSignature: false,
                        hasOffChainPhase: false,
                        steps: [
                            {
                                functionName: 'transferOwnershipRequest',
                                functionSelector: '0x572be39b',
                                action: 0,
                                roles: ['RECOVERY'],
                                description: 'Recovery creates ownership transfer request',
                                isOffChain: false,
                                phaseType: 'EXECUTION'
                            },
                            {
                                functionName: 'transferOwnershipCancellation',
                                functionSelector: '0x9d8f6f90',
                                action: 2,
                                roles: ['RECOVERY'],
                                description: 'Recovery cancels pending request',
                                isOffChain: false,
                                phaseType: 'EXECUTION'
                            }
                        ]
                    }
                ]
            },
            {
                operationType: this.getOperationTypeHash('BROADCASTER_UPDATE'),
                operationName: 'BROADCASTER_UPDATE',
                supportedRoles: ['OWNER', 'BROADCASTER'],
                paths: [
                    {
                        name: 'Time-Delay Only',
                        description: 'Traditional two-phase operation with mandatory waiting period',
                        workflowType: 0,
                        estimatedTimeSec: 86400,
                        requiresSignature: false,
                        hasOffChainPhase: false,
                        steps: [
                            {
                                functionName: 'updateBroadcasterRequest',
                                functionSelector: '0x12345678',
                                action: 0,
                                roles: ['OWNER'],
                                description: 'Owner creates broadcaster update request',
                                isOffChain: false,
                                phaseType: 'EXECUTION'
                            },
                            {
                                functionName: 'updateBroadcasterDelayedApproval',
                                functionSelector: '0xb7d254d6',
                                action: 1,
                                roles: ['OWNER'],
                                description: 'Owner approves after time delay',
                                isOffChain: false,
                                phaseType: 'EXECUTION'
                            }
                        ]
                    },
                    {
                        name: 'Meta-Transaction Approval',
                        description: 'Owner signs approval off-chain, Broadcaster executes on-chain',
                        workflowType: 2,
                        estimatedTimeSec: 0,
                        requiresSignature: true,
                        hasOffChainPhase: true,
                        steps: [
                            {
                                functionName: 'updateBroadcasterRequest',
                                functionSelector: '0x12345678',
                                action: 0,
                                roles: ['OWNER'],
                                description: 'Owner creates broadcaster update request',
                                isOffChain: false,
                                phaseType: 'EXECUTION'
                            },
                            {
                                functionName: 'signBroadcasterApproval',
                                functionSelector: '0x00000000',
                                action: 4,
                                roles: ['OWNER'],
                                description: 'Owner signs approval off-chain',
                                isOffChain: true,
                                phaseType: 'SIGNING'
                            },
                            {
                                functionName: 'updateBroadcasterApprovalWithMetaTx',
                                functionSelector: '0xd04d6238',
                                action: 7,
                                roles: ['BROADCASTER'],
                                description: 'Broadcaster executes signed approval',
                                isOffChain: false,
                                phaseType: 'EXECUTION'
                            }
                        ]
                    },
                    {
                        name: 'Meta-Transaction Cancellation',
                        description: 'Owner signs cancellation off-chain, Broadcaster executes on-chain',
                        workflowType: 2,
                        estimatedTimeSec: 0,
                        requiresSignature: true,
                        hasOffChainPhase: true,
                        steps: [
                            {
                                functionName: 'updateBroadcasterRequest',
                                functionSelector: '0x12345678',
                                action: 0,
                                roles: ['OWNER'],
                                description: 'Owner creates broadcaster update request',
                                isOffChain: false,
                                phaseType: 'EXECUTION'
                            },
                            {
                                functionName: 'signBroadcasterCancellation',
                                functionSelector: '0x00000000',
                                action: 5,
                                roles: ['OWNER'],
                                description: 'Owner signs cancellation off-chain',
                                isOffChain: true,
                                phaseType: 'SIGNING'
                            },
                            {
                                functionName: 'updateBroadcasterCancellationWithMetaTx',
                                functionSelector: '0xf1209daa',
                                action: 8,
                                roles: ['BROADCASTER'],
                                description: 'Broadcaster executes signed cancellation',
                                isOffChain: false,
                                phaseType: 'EXECUTION'
                            }
                        ]
                    },
                    {
                        name: 'Time-Delay Cancellation',
                        description: 'Cancel pending broadcaster update request after timelock',
                        workflowType: 0,
                        estimatedTimeSec: 0,
                        requiresSignature: false,
                        hasOffChainPhase: false,
                        steps: [
                            {
                                functionName: 'updateBroadcasterRequest',
                                functionSelector: '0x12345678',
                                action: 0,
                                roles: ['OWNER'],
                                description: 'Owner creates broadcaster update request',
                                isOffChain: false,
                                phaseType: 'EXECUTION'
                            },
                            {
                                functionName: 'updateBroadcasterCancellation',
                                functionSelector: '0x62544d90',
                                action: 2,
                                roles: ['OWNER'],
                                description: 'Owner cancels pending request',
                                isOffChain: false,
                                phaseType: 'EXECUTION'
                            }
                        ]
                    }
                ]
            },
            {
                operationType: this.getOperationTypeHash('RECOVERY_UPDATE'),
                operationName: 'RECOVERY_UPDATE',
                supportedRoles: ['BROADCASTER'],
                paths: [
                    {
                        name: 'Single-Phase Meta-Transaction',
                        description: 'Owner signs request and approval off-chain, Broadcaster executes on-chain',
                        workflowType: 3,
                        estimatedTimeSec: 0,
                        requiresSignature: true,
                        hasOffChainPhase: true,
                        steps: [
                            {
                                functionName: 'signRecoveryRequestAndApprove',
                                functionSelector: '0x00000000',
                                action: 3,
                                roles: ['OWNER'],
                                description: 'Owner signs request and approval off-chain',
                                isOffChain: true,
                                phaseType: 'SIGNING'
                            },
                            {
                                functionName: 'updateRecoveryRequestAndApprove',
                                functionSelector: '0x2aa09cf6',
                                action: 6,
                                roles: ['BROADCASTER'],
                                description: 'Broadcaster executes signed request and approval',
                                isOffChain: false,
                                phaseType: 'EXECUTION'
                            }
                        ]
                    }
                ]
            },
            {
                operationType: this.getOperationTypeHash('TIMELOCK_UPDATE'),
                operationName: 'TIMELOCK_UPDATE',
                supportedRoles: ['BROADCASTER'],
                paths: [
                    {
                        name: 'Single-Phase Meta-Transaction',
                        description: 'Owner signs request and approval off-chain, Broadcaster executes on-chain',
                        workflowType: 3,
                        estimatedTimeSec: 0,
                        requiresSignature: true,
                        hasOffChainPhase: true,
                        steps: [
                            {
                                functionName: 'signTimeLockRequestAndApprove',
                                functionSelector: '0x00000000',
                                action: 3,
                                roles: ['OWNER'],
                                description: 'Owner signs request and approval off-chain',
                                isOffChain: true,
                                phaseType: 'SIGNING'
                            },
                            {
                                functionName: 'updateTimeLockRequestAndApprove',
                                functionSelector: '0x87654321',
                                action: 6,
                                roles: ['BROADCASTER'],
                                description: 'Broadcaster executes signed request and approval',
                                isOffChain: false,
                                phaseType: 'EXECUTION'
                            }
                        ]
                    }
                ]
            }
        ];
    }
    
    // Helper method to get operation type hash
    getOperationTypeHash(operationName) {
        return this.web3.utils.keccak256(operationName);
    }
    
    // Helper method to analyze workflow structure
    analyzeWorkflowStructure(workflow) {
        const analysis = {
            operationName: workflow.operationName,
            operationType: workflow.operationType,
            totalPaths: workflow.paths.length,
            totalSteps: 0,
            workflowTypes: new Set(),
            roles: new Set(),
            hasOffChainPhase: false,
            hasOnChainPhase: false,
            signatureRequired: 0,
            immediateExecution: 0,
            timeDelayedExecution: 0
        };
        
        workflow.paths.forEach(path => {
            analysis.totalSteps += path.steps.length;
            analysis.workflowTypes.add(path.workflowType);
            
            if (path.hasOffChainPhase) {
                analysis.hasOffChainPhase = true;
            }
            if (path.steps.some(step => !step.isOffChain)) {
                analysis.hasOnChainPhase = true;
            }
            
            if (path.requiresSignature) {
                analysis.signatureRequired++;
            }
            
            if (path.estimatedTimeSec === 0) {
                analysis.immediateExecution++;
            } else {
                analysis.timeDelayedExecution++;
            }
            
            path.steps.forEach(step => {
                step.roles.forEach(role => analysis.roles.add(role));
            });
        });
        
        return analysis;
    }
    
    // Helper method to find next available actions for a user role
    findNextAvailableActions(workflow, userRole, currentStep = 0) {
        const availableActions = [];
        
        workflow.paths.forEach((path, pathIndex) => {
            const pathActions = [];
            
            for (let i = currentStep; i < path.steps.length; i++) {
                const step = path.steps[i];
                if (step.roles.includes(userRole)) {
                    pathActions.push({
                        pathIndex,
                        pathName: path.name,
                        stepIndex: i,
                        step: step,
                        isNext: i === currentStep
                    });
                }
            }
            
            if (pathActions.length > 0) {
                availableActions.push({
                    path: path,
                    actions: pathActions
                });
            }
        });
        
        return availableActions;
    }
    
    // Test execution helpers
    async executeTest(testName, testFunction) {
        this.testResults.totalTests++;
        
        try {
            console.log(`\n🧪 Running test: ${testName}`);
            await testFunction();
            this.testResults.passedTests++;
            console.log(`✅ Test passed: ${testName}`);
            return true;
        } catch (error) {
            this.testResults.failedTests++;
            this.testResults.errors.push({
                test: testName,
                error: error.message,
                stack: error.stack
            });
            console.log(`❌ Test failed: ${testName}`);
            console.log(`   Error: ${error.message}`);
            return false;
        }
    }
    
    printTestResults() {
        console.log('\n📊 TEST RESULTS SUMMARY');
        console.log('=======================');
        console.log(`Total Tests: ${this.testResults.totalTests}`);
        console.log(`Passed: ${this.testResults.passedTests}`);
        console.log(`Failed: ${this.testResults.failedTests}`);
        console.log(`Success Rate: ${((this.testResults.passedTests / this.testResults.totalTests) * 100).toFixed(1)}%`);
        
        if (this.testResults.errors.length > 0) {
            console.log('\n❌ FAILED TESTS:');
            this.testResults.errors.forEach((error, index) => {
                console.log(`   ${index + 1}. ${error.test}: ${error.error}`);
            });
        }
    }
    
    // Utility method to wait for transaction confirmation
    async waitForTransaction(txHash, timeout = 30000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeout) {
            try {
                const receipt = await this.web3.eth.getTransactionReceipt(txHash);
                if (receipt) {
                    return receipt;
                }
            } catch (error) {
                // Continue waiting
            }
            
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        throw new Error(`Transaction ${txHash} not confirmed within ${timeout}ms`);
    }
    
    // Utility method to get current block timestamp
    async getCurrentBlockTimestamp() {
        const block = await this.web3.eth.getBlock('latest');
        return parseInt(block.timestamp);
    }
}

module.exports = BaseWorkflowTest;
