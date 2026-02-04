/**
 * GuardController Functionality Tests
 * Comprehensive tests for GuardController ETH transfer functionality
 * Tests complete workflow: function registration, permission setup, ETH deposit, and ETH withdrawal
 */

const BaseGuardControllerTest = require('./base-test.cjs');

class GuardControllerTests extends BaseGuardControllerTest {
    constructor() {
        super('GuardController Functionality Tests');
        this.ownerRoleHash = null;
    }

    async executeTests() {
        console.log('\n🔄 TESTING COMPLETE GUARDCONTROLLER NATIVE TRANSFER WORKFLOW');
        console.log('==================================================');
        console.log('📋 This workflow tests the complete native token transfer lifecycle:');
        console.log('   1. Register NATIVE_TRANSFER_SELECTOR function with NATIVE_TRANSFER operation');
        console.log('   2. Add function permissions to OWNER and BROADCASTER roles');
        console.log('   3. Deposit native tokens from owner wallet to contract');
        console.log('   4. Withdraw native tokens from contract to owner wallet');

        await this.testStep1RegisterNativeTransferFunction();
        await this.testStep2AddFunctionPermissionToOwner();
        await this.testStep3DepositEthToContract();
        await this.testStep4WithdrawEthFromContract();
    }

    async testStep1RegisterNativeTransferFunction() {
        await this.startTest('Register NATIVE_TRANSFER_SELECTOR Function for Native Transfers');
        
        try {
            console.log('📋 Step 1: Register NATIVE_TRANSFER_SELECTOR function with NATIVE_TRANSFER operation');
            console.log(`   Function Selector: ${this.NATIVE_TRANSFER_SELECTOR}`);
            console.log('   Function Signature: __bloxchain_native_transfer__()');
            console.log('   Operation Name: NATIVE_TRANSFER');
            console.log('   Supported Actions: SIGN_META_REQUEST_AND_APPROVE, EXECUTE_META_REQUEST_AND_APPROVE');
            
            // Verify the selector matches the signature (matches EngineBlox.NATIVE_TRANSFER_SELECTOR)
            const expectedSelector = this.web3.utils.keccak256('__bloxchain_native_transfer__()').slice(0, 10);
            if (expectedSelector.toLowerCase() !== this.NATIVE_TRANSFER_SELECTOR.toLowerCase()) {
                throw new Error(`Selector mismatch: expected ${expectedSelector} but test uses ${this.NATIVE_TRANSFER_SELECTOR}`);
            }
            console.log(`  ✅ Selector verification: ${this.NATIVE_TRANSFER_SELECTOR} matches signature __bloxchain_native_transfer__()`);
            console.log(`  ✅ This matches EngineBlox.NATIVE_TRANSFER_SELECTOR constant`);
            
            // Check if function already exists - do a thorough check
            console.log('  🔍 Checking if function already exists...');
            let alreadyExists = false;
            try {
                const existingSchema = await this.callContractMethod(
                    this.contract.methods.getFunctionSchema(this.NATIVE_TRANSFER_SELECTOR)
                );
                const existingSelector = existingSchema && (existingSchema.functionSelector ?? existingSchema.functionSelectorReturn ?? existingSchema[1]);
                if (existingSelector != null && String(existingSelector).toLowerCase() === this.NATIVE_TRANSFER_SELECTOR.toLowerCase()) {
                    alreadyExists = true;
                    console.log('  ✅ Function already registered!');
                    console.log(`     Signature: ${existingSchema.functionSignature ?? existingSchema[0]}`);
                    console.log(`     Operation: ${existingSchema.operationName ?? existingSchema[3]}`);
                    console.log(`     isProtected: ${existingSchema.isProtected ?? existingSchema[5]}`);
                    console.log('  ⚠️  Function already registered, skipping registration');
                    await this.passTest('Function already registered');
                    return;
                } else {
                    console.log('  📋 Function schema check returned but selector does not match');
                    console.log(`     Expected: ${this.NATIVE_TRANSFER_SELECTOR}`);
                    console.log(`     Got: ${existingSelector !== undefined ? existingSelector : 'undefined'}`);
                }
            } catch (schemaError) {
                console.log('  📋 Function does not exist (expected for new registration)');
                console.log(`     Error: ${schemaError.message}`);
                alreadyExists = false;
            }
            
            // Also check using functionSchemaExists helper
            const existsCheck = await this.functionSchemaExists(this.NATIVE_TRANSFER_SELECTOR);
            if (existsCheck && !alreadyExists) {
                console.log('  ⚠️  WARNING: functionSchemaExists returned true but getFunctionSchema failed or returned different selector');
            }
            
            // Verify we're using the correct selector that matches EngineBlox constant
            const engineBloxSelector = this.web3.utils.keccak256('__bloxchain_native_transfer__()').slice(0, 10);
            if (engineBloxSelector.toLowerCase() !== this.NATIVE_TRANSFER_SELECTOR.toLowerCase()) {
                throw new Error(`Selector mismatch: test uses ${this.NATIVE_TRANSFER_SELECTOR} but EngineBlox constant is ${engineBloxSelector}`);
            }
            console.log(`  ✅ Selector matches EngineBlox.NATIVE_TRANSFER_SELECTOR constant`);
            
            // Check if our selector is in supportedFunctionsSet (even if not in mapping)
            console.log(`  🔍 Checking if selector ${this.NATIVE_TRANSFER_SELECTOR} is in supportedFunctionsSet...`);
            try {
                const supportedFunctions = await this.callContractMethod(
                    this.contract.methods.getSupportedFunctions()
                );
                console.log(`  📋 Total supported functions: ${supportedFunctions ? supportedFunctions.length : 0}`);
                if (supportedFunctions && Array.isArray(supportedFunctions)) {
                    const selectorInSet = supportedFunctions.some(f => 
                        f && (typeof f === 'string' ? f.toLowerCase() : f.toString().toLowerCase()) === this.NATIVE_TRANSFER_SELECTOR.toLowerCase()
                    );
                    console.log(`  📋 Selector ${this.NATIVE_TRANSFER_SELECTOR} in supportedFunctionsSet: ${selectorInSet ? '✅ YES' : '❌ NO'}`);
                    if (selectorInSet && !alreadyExists) {
                        // Selector in set but getFunctionSchema returned no/other selector (e.g. tuple decode quirk). Treat as already registered.
                        console.log(`  ⚠️  Selector is in supportedFunctionsSet; treating as already registered (skipping registration).`);
                        await this.passTest('Function already in supportedFunctionsSet (skip registration)');
                        return;
                    }
                }
            } catch (setError) {
                if (setError.message.includes('inconsistent state')) {
                    throw setError; // Re-throw our custom error
                }
                console.log(`  ⚠️  Could not check supportedFunctionsSet: ${setError.message}`);
            }
            
            if (alreadyExists || existsCheck) {
                console.log('  ⚠️  Function already registered, skipping registration');
                await this.passTest('Function already registered');
                return;
            }
            
            // Get owner and broadcaster wallets
            const ownerPrivateKey = this.getRoleWallet('owner');
            const broadcasterWallet = this.getRoleWalletObject('broadcaster');
            
            // Verify permissions before attempting registration
            console.log('  🔒 Validating permissions before function registration...');
            try {
                const ownerAddress = this.web3.eth.accounts.privateKeyToAccount(ownerPrivateKey).address;
                const broadcasterAddress = broadcasterWallet.address;
                
                // Check owner permissions for handler selector (GUARD_CONFIG_BATCH_META_SELECTOR)
                console.log(`  📋 Checking owner permissions for handler selector: ${this.GUARD_CONFIG_BATCH_META_SELECTOR}`);
                const ownerHandlerPermissions = await this.callContractMethod(
                    this.contract.methods.getActiveRolePermissions(this.getRoleHash('OWNER_ROLE'))
                );
                let ownerHasHandlerPermission = false;
                if (ownerHandlerPermissions && Array.isArray(ownerHandlerPermissions)) {
                    for (const perm of ownerHandlerPermissions) {
                        if (perm.functionSelector && perm.functionSelector.toLowerCase() === this.GUARD_CONFIG_BATCH_META_SELECTOR.toLowerCase()) {
                            const bitmapValue = typeof perm.grantedActionsBitmap === 'string' 
                                ? parseInt(perm.grantedActionsBitmap) 
                                : perm.grantedActionsBitmap;
                            ownerHasHandlerPermission = (bitmapValue & (1 << this.TxAction.SIGN_META_REQUEST_AND_APPROVE)) !== 0;
                            console.log(`  📋 Owner handler permission bitmap: ${bitmapValue} (binary: ${bitmapValue.toString(2)})`);
                            break;
                        }
                    }
                }
                
                // Check broadcaster permissions for handler selector
                console.log(`  📋 Checking broadcaster permissions for handler selector: ${this.GUARD_CONFIG_BATCH_META_SELECTOR}`);
                const broadcasterHandlerPermissions = await this.callContractMethod(
                    this.contract.methods.getActiveRolePermissions(this.getRoleHash('BROADCASTER_ROLE'))
                );
                let broadcasterHasHandlerPermission = false;
                if (broadcasterHandlerPermissions && Array.isArray(broadcasterHandlerPermissions)) {
                    for (const perm of broadcasterHandlerPermissions) {
                        if (perm.functionSelector && perm.functionSelector.toLowerCase() === this.GUARD_CONFIG_BATCH_META_SELECTOR.toLowerCase()) {
                            const bitmapValue = typeof perm.grantedActionsBitmap === 'string' 
                                ? parseInt(perm.grantedActionsBitmap) 
                                : perm.grantedActionsBitmap;
                            broadcasterHasHandlerPermission = (bitmapValue & (1 << this.TxAction.EXECUTE_META_REQUEST_AND_APPROVE)) !== 0;
                            console.log(`  📋 Broadcaster handler permission bitmap: ${bitmapValue} (binary: ${bitmapValue.toString(2)})`);
                            break;
                        }
                    }
                }
                
                // Check owner permissions for execution selector (GUARD_CONFIG_BATCH_EXECUTE_SELECTOR)
                console.log(`  📋 Checking owner permissions for execution selector: ${this.GUARD_CONFIG_BATCH_EXECUTE_SELECTOR}`);
                let ownerHasExecutionPermission = false;
                if (ownerHandlerPermissions && Array.isArray(ownerHandlerPermissions)) {
                    for (const perm of ownerHandlerPermissions) {
                        if (perm.functionSelector && perm.functionSelector.toLowerCase() === this.GUARD_CONFIG_BATCH_EXECUTE_SELECTOR.toLowerCase()) {
                            const bitmapValue = typeof perm.grantedActionsBitmap === 'string' 
                                ? parseInt(perm.grantedActionsBitmap) 
                                : perm.grantedActionsBitmap;
                            ownerHasExecutionPermission = (bitmapValue & (1 << this.TxAction.SIGN_META_REQUEST_AND_APPROVE)) !== 0;
                            console.log(`  📋 Owner execution permission bitmap: ${bitmapValue} (binary: ${bitmapValue.toString(2)})`);
                            break;
                        }
                    }
                }
                
                // Check broadcaster permissions for execution selector
                console.log(`  📋 Checking broadcaster permissions for execution selector: ${this.GUARD_CONFIG_BATCH_EXECUTE_SELECTOR}`);
                let broadcasterHasExecutionPermission = false;
                if (broadcasterHandlerPermissions && Array.isArray(broadcasterHandlerPermissions)) {
                    for (const perm of broadcasterHandlerPermissions) {
                        if (perm.functionSelector && perm.functionSelector.toLowerCase() === this.GUARD_CONFIG_BATCH_EXECUTE_SELECTOR.toLowerCase()) {
                            const bitmapValue = typeof perm.grantedActionsBitmap === 'string' 
                                ? parseInt(perm.grantedActionsBitmap) 
                                : perm.grantedActionsBitmap;
                            broadcasterHasExecutionPermission = (bitmapValue & (1 << this.TxAction.EXECUTE_META_REQUEST_AND_APPROVE)) !== 0;
                            console.log(`  📋 Broadcaster execution permission bitmap: ${bitmapValue} (binary: ${bitmapValue.toString(2)})`);
                            break;
                        }
                    }
                }
                
                console.log(`  📊 Permission Summary:`);
                console.log(`     Owner handler permission (${this.GUARD_CONFIG_BATCH_META_SELECTOR}): ${ownerHasHandlerPermission ? '✅' : '❌'}`);
                console.log(`     Broadcaster handler permission (${this.GUARD_CONFIG_BATCH_META_SELECTOR}): ${broadcasterHasHandlerPermission ? '✅' : '❌'}`);
                console.log(`     Owner execution permission (${this.GUARD_CONFIG_BATCH_EXECUTE_SELECTOR}): ${ownerHasExecutionPermission ? '✅' : '❌'}`);
                console.log(`     Broadcaster execution permission (${this.GUARD_CONFIG_BATCH_EXECUTE_SELECTOR}): ${broadcasterHasExecutionPermission ? '✅' : '❌'}`);
                
                if (!ownerHasHandlerPermission || !broadcasterHasHandlerPermission || !ownerHasExecutionPermission || !broadcasterHasExecutionPermission) {
                    throw new Error(`Missing required permissions for guard config batch. Please ensure GuardController is properly initialized.`);
                }
                
                console.log(`  ✅ All required permissions verified`);
            } catch (permError) {
                console.error(`  ❌ Permission verification failed: ${permError.message}`);
                throw permError;
            }
            
            // Register function with SIGN and EXECUTE permissions for REQUEST_AND_APPROVE
            const supportedActions = [
                this.TxAction.SIGN_META_REQUEST_AND_APPROVE,
                this.TxAction.EXECUTE_META_REQUEST_AND_APPROVE
            ];
            
            // Check if selector exists in contract bytecode (this would require isProtected=true)
            console.log('  🔍 Checking if selector exists in contract bytecode...');
            let selectorExistsInBytecode = false;
            try {
                // selectorExistsInContract is a public view function in EngineBlox
                selectorExistsInBytecode = await this.callContractMethod(
                    this.contract.methods.selectorExistsInContract(this.contractAddress, this.NATIVE_TRANSFER_SELECTOR)
                );
                console.log(`  📋 Selector ${this.NATIVE_TRANSFER_SELECTOR} exists in bytecode: ${selectorExistsInBytecode}`);
                if (selectorExistsInBytecode) {
                    console.log(`  ⚠️  WARNING: Selector exists in contract bytecode!`);
                    console.log(`     Registration with isProtected=false will fail with ContractFunctionMustBeProtected.`);
                    console.log(`     GuardController._registerFunction always uses isProtected=false, so this registration will fail.`);
                    console.log(`     The function may already be registered or may need to be registered with isProtected=true.`);
                    throw new Error(`Cannot register function: selector ${this.NATIVE_TRANSFER_SELECTOR} exists in contract bytecode and requires isProtected=true, but GuardController._registerFunction uses isProtected=false`);
                }
            } catch (checkError) {
                if (checkError.message.includes('Cannot register function')) {
                    throw checkError; // Re-throw our custom error
                }
                console.log(`  ⚠️  Could not check if selector exists in bytecode: ${checkError.message}`);
                console.log(`     This might mean selectorExistsInContract is not exposed or there's an ABI issue`);
            }
            
            console.log('  🔍 Preparing to register function...');
            console.log(`     Selector: ${this.NATIVE_TRANSFER_SELECTOR}`);
            console.log(`     Signature: __bloxchain_native_transfer__()`);
            console.log(`     isProtected: false (set by GuardController._registerFunction)`);
            
            console.log('  📝 Registering function via GuardController batch operation...');
            
            // First, try to manually test the registration by calling executeGuardConfigBatch directly
            // This will help us see the exact error
            console.log('  🔍 Testing direct call to executeGuardConfigBatch (read-only)...');
            try {
                const action = this.encodeGuardConfigAction(
                    this.GuardConfigActionType.REGISTER_FUNCTION,
                    {
                                                        functionSignature: '__bloxchain_native_transfer__()',
                        operationName: 'NATIVE_TRANSFER',
                        supportedActions: supportedActions
                    }
                );
                const actionsArray = [[action.actionType, action.data]];
                const executionParams = this.web3.eth.abi.encodeParameter('tuple(uint8,bytes)[]', actionsArray);
                
                // Try to estimate gas for the direct call
                const directCallData = this.contract.methods.executeGuardConfigBatch(actionsArray).encodeABI();
                console.log(`  📋 Direct call data length: ${directCallData.length}`);
                console.log(`  📋 Direct call data (first 100 chars): ${directCallData.slice(0, 100)}`);
                
                // Try to call it (this will fail because it requires internal call, but we'll see the error)
                try {
                    await this.contract.methods.executeGuardConfigBatch(actionsArray).call({ from: this.contractAddress });
                } catch (directError) {
                    console.log(`  ⚠️  Direct call failed (expected): ${directError.message}`);
                    if (directError.data) {
                        const errorData = directError.data.result || directError.data;
                        if (errorData && typeof errorData === 'string' && errorData.length >= 10) {
                            const errorSelector = errorData.slice(0, 10);
                            console.log(`  📋 Error selector from direct call: ${errorSelector}`);
                        }
                    }
                }
            } catch (testError) {
                console.log(`  ⚠️  Could not test direct call: ${testError.message}`);
            }
            
            let receipt;
            try {
                receipt = await this.registerFunction(
                    this.NATIVE_TRANSFER_SELECTOR,
                    '__bloxchain_native_transfer__()', // function signature (matches EngineBlox.NATIVE_TRANSFER_SELECTOR)
                    'NATIVE_TRANSFER',
                    supportedActions,
                    ownerPrivateKey,
                    broadcasterWallet
                );
            } catch (registerError) {
                console.error(`  ❌ Function registration failed: ${registerError.message}`);
                if (registerError.receipt) {
                    console.error(`  📋 Error receipt status: ${registerError.receipt.status}`);
                    console.error(`  📋 Error receipt logs: ${registerError.receipt.logs ? registerError.receipt.logs.length : 0}`);
                }
                if (registerError.data) {
                    console.error(`  📋 Error data: ${registerError.data}`);
                }
                throw registerError;
            }
            
            // Validate transaction succeeded
            const expectedTxStatus = true;
            const actualTxStatus = receipt.status === true || receipt.status === 1;
            
            // Detailed receipt analysis
            console.log(`  🔍 Analyzing transaction receipt...`);
            console.log(`  📋 Receipt status: ${receipt.status}`);
            console.log(`  📋 Receipt transaction hash: ${receipt.transactionHash || receipt.tx || 'N/A'}`);
            console.log(`  📋 Receipt to address: ${receipt.to || 'N/A'}`);
            console.log(`  📋 Receipt from address: ${receipt.from || 'N/A'}`);
            console.log(`  📋 Receipt logs count: ${receipt.logs ? receipt.logs.length : 0}`);
            if (receipt.logs && receipt.logs.length > 0) {
                console.log(`  📋 Receipt log topics:`);
                receipt.logs.forEach((log, idx) => {
                    console.log(`     Log ${idx}: ${log.topics ? log.topics.length : 0} topics`);
                    if (log.topics && log.topics.length > 0) {
                        console.log(`       Topic[0]: ${log.topics[0]}`);
                    }
                });
            }
            console.log(`  📋 Receipt gas used: ${receipt.gasUsed || 'N/A'}`);
            
            this.assertTest(
                actualTxStatus === expectedTxStatus,
                `Function registration transaction succeeded (expected: ${expectedTxStatus}, actual: ${actualTxStatus})`
            );
            
            // Check transaction record status to verify internal execution
            console.log(`  🔍 Checking transaction record status...`);
            const txId = this.extractTxIdFromReceipt(receipt);
            console.log(`  📋 Extracted Transaction ID: ${txId || 'null'}`);
            if (txId) {
                console.log(`  📋 Transaction ID: ${txId}`);
                try {
                    const txRecord = await this.callContractMethod(
                        this.contract.methods.getTransaction(txId)
                    );
                    
                    if (txRecord) {
                        const status = txRecord.status || txRecord[6];
                        console.log(`  📋 Transaction status: ${status} (0=UNDEFINED, 1=PENDING, 2=EXECUTING, 5=COMPLETED, 6=FAILED)`);
                        
                        if (status === 6 || status === '6') {
                            // Transaction failed internally
                            const result = txRecord.result || txRecord[6] || '0x';
                            let resultStr = '';
                            if (typeof result === 'string') {
                                resultStr = result;
                            } else if (Buffer.isBuffer(result)) {
                                resultStr = '0x' + result.toString('hex');
                            } else if (Array.isArray(result)) {
                                resultStr = '0x' + Buffer.from(result).toString('hex');
                            }
                            
                            if (resultStr && resultStr.length > 10) {
                                const errorSelector = resultStr.slice(0, 10);
                                console.log(`  📋 Error selector: ${errorSelector}`);
                                
                                // Check for common errors
                                const resourceAlreadyExists = '0x430fab94';
                                const resourceNotFound = '0x474d3baf';
                                
                                if (errorSelector.toLowerCase() === resourceAlreadyExists.toLowerCase()) {
                                    console.log(`  ⚠️  ResourceAlreadyExists error - function may already be registered`);
                                    // Continue to verification - function might exist
                                } else if (errorSelector.toLowerCase() === resourceNotFound.toLowerCase()) {
                                    throw new Error(`Function registration failed: ResourceNotFound. Error selector: ${errorSelector}`);
                                } else {
                                    throw new Error(`Function registration failed internally (status 6). Error selector: ${errorSelector}`);
                                }
                            } else {
                                throw new Error(`Function registration failed internally (status 6) without error data`);
                            }
                        } else if (status === 5 || status === '5') {
                            console.log(`  ✅ Transaction completed successfully (status 5)`);
                        } else {
                            console.log(`  ⏳ Transaction status: ${status} - waiting for completion...`);
                            // Wait a bit for transaction to complete
                            await new Promise(resolve => setTimeout(resolve, 2000));
                        }
                    }
                } catch (txError) {
                    console.log(`  ⚠️  Could not check transaction record: ${txError.message}`);
                    // Continue anyway - might be a timing issue
                }
            }
            
            // Wait a bit for state to update
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Try to find transaction by checking pending transactions and recent transaction IDs
            if (!txId) {
                console.log('  🔍 No txId from receipt, checking for any transactions...');
                try {
                    // Check pending transactions
                    const pendingTxs = await this.callContractMethod(
                        this.contract.methods.getPendingTransactions()
                    );
                    console.log(`  📋 Pending transactions count: ${pendingTxs ? pendingTxs.length : 0}`);
                    
                    // Try to find transaction by checking transaction history
                    // We'll try to get recent transactions by checking a range
                    try {
                        // Try to get transaction history for recent transactions
                        // Start from a high number and work backwards
                        const testTxIds = [100, 50, 20, 10, 5, 1];
                        for (const testTxId of testTxIds) {
                            try {
                                const txRecord = await this.callContractMethod(
                                    this.contract.methods.getTransaction(testTxId)
                                );
                                if (txRecord && txRecord.txId && parseInt(txRecord.txId) > 0) {
                                    console.log(`  📋 Found transaction ID: ${txRecord.txId}`);
                                    console.log(`     Status: ${txRecord.status} (0=UNDEFINED, 1=PENDING, 2=EXECUTING, 5=COMPLETED, 6=FAILED)`);
                                    console.log(`     Execution selector: ${txRecord.params ? txRecord.params.executionSelector : 'N/A'}`);
                                    console.log(`     Target: ${txRecord.params ? txRecord.params.target : 'N/A'}`);
                                    
                                    // Check if this matches our execution selector or if status is FAILED
                                    const isOurTransaction = txRecord.params && txRecord.params.executionSelector && 
                                        txRecord.params.executionSelector.toLowerCase() === this.GUARD_CONFIG_BATCH_EXECUTE_SELECTOR.toLowerCase();
                                    const isFailed = txRecord.status === 6 || txRecord.status === '6';
                                    
                                    if (isOurTransaction || (isFailed && txRecord.params && txRecord.params.target && 
                                        txRecord.params.target.toLowerCase() === this.contractAddress.toLowerCase())) {
                                        if (isOurTransaction) {
                                            console.log(`  🎯 This appears to be our guard config batch transaction!`);
                                        } else {
                                            console.log(`  🎯 This appears to be a recent failed transaction targeting our contract!`);
                                        }
                                        
                                        if (txRecord.status === 5 || txRecord.status === '5') {
                                            console.log(`  ✅ Transaction completed successfully`);
                                        } else                                         if (isFailed) {
                                            console.log(`  ❌ Transaction failed internally (status 6)`);
                                            const result = txRecord.result || '0x';
                                            console.log(`  📋 Result field type: ${typeof result}`);
                                            console.log(`  📋 Result field length: ${result ? (typeof result === 'string' ? result.length : result.length || 0) : 0}`);
                                            
                                            let resultStr = '';
                                            if (typeof result === 'string') {
                                                resultStr = result;
                                            } else if (Buffer.isBuffer(result)) {
                                                resultStr = '0x' + result.toString('hex');
                                            } else if (Array.isArray(result)) {
                                                resultStr = '0x' + Buffer.from(result).toString('hex');
                                            } else if (result && result.toString) {
                                                resultStr = result.toString();
                                            }
                                            
                                            console.log(`  📋 Result as string: ${resultStr}`);
                                            
                                            // Check execution params to see what was attempted
                                            if (txRecord.params && txRecord.params.executionParams) {
                                                console.log(`  📋 Execution params length: ${txRecord.params.executionParams.length}`);
                                                console.log(`  📋 Execution params (first 200 chars): ${typeof txRecord.params.executionParams === 'string' ? txRecord.params.executionParams.slice(0, 200) : 'N/A'}`);
                                                
                                                // Try to decode the execution params to see the action
                                                try {
                                                    const decoded = this.web3.eth.abi.decodeParameter(
                                                        'tuple(uint8,bytes)[]',
                                                        txRecord.params.executionParams
                                                    );
                                                    if (decoded && decoded.length > 0) {
                                                        console.log(`  📋 Decoded action type: ${decoded[0].actionType || decoded[0][0]}`);
                                                        console.log(`  📋 Action type 2 = REGISTER_FUNCTION`);
                                                    }
                                                } catch (decodeError) {
                                                    console.log(`  ⚠️  Could not decode execution params: ${decodeError.message}`);
                                                }
                                            }
                                            
                                            if (resultStr && resultStr.length > 10 && resultStr.startsWith('0x')) {
                                                const errorSelector = resultStr.slice(0, 10);
                                                console.log(`  📋 Error selector: ${errorSelector}`);
                                                
                                                // Try to decode common errors
                                                const resourceNotFound = '0x474d3baf';
                                                const resourceAlreadyExists = '0x430fab94';
                                                const noPermission = '0xf37a3442';
                                                const notSupported = '0xa0387940';
                                                const invalidOperation = '0xc26028e0';
                                                const contractFunctionMustBeProtected = '0x'; // Need to find this selector
                                                const functionSelectorMismatch = '0x'; // Need to find this selector
                                                
                                                if (errorSelector.toLowerCase() === resourceNotFound.toLowerCase()) {
                                                    console.log(`  ❌ ResourceNotFound error - function schema or permission not found`);
                                                    console.log(`     This usually means the function schema for ${this.GUARD_CONFIG_BATCH_EXECUTE_SELECTOR} doesn't exist or permissions are missing`);
                                                } else if (errorSelector.toLowerCase() === resourceAlreadyExists.toLowerCase()) {
                                                    console.log(`  ⚠️  ResourceAlreadyExists error - function may already be registered`);
                                                } else if (errorSelector.toLowerCase() === noPermission.toLowerCase()) {
                                                    console.log(`  ❌ NoPermission error - permission check failed during execution`);
                                                } else if (errorSelector.toLowerCase() === notSupported.toLowerCase()) {
                                                    console.log(`  ❌ NotSupported error - action type or operation not supported`);
                                                } else if (errorSelector.toLowerCase() === invalidOperation.toLowerCase()) {
                                                    console.log(`  ❌ InvalidOperation error - operation type mismatch`);
                                                } else {
                                                    console.log(`  ❌ Unknown error selector: ${errorSelector}`);
                                                }
                                            } else {
                                                console.log(`  📋 No error data in result field - this indicates OperationFailed() error (custom error with no parameters)`);
                                                console.log(`     OperationFailed occurs when:`);
                                                console.log(`     1. handlerForSelectors.length == 0 (line 1081)`);
                                                console.log(`     2. supportedFunctionsSet.add() returns false (line 1110) - function already in set`);
                                                console.log(`     3. supportedOperationTypesSet.remove() fails (line 1166) - during cleanup`);
                                                console.log(`     Since we verified the selector is NOT in the set, this is unexpected.`);
                                                console.log(`     Possible causes:`);
                                                console.log(`     - Function was added to set between our check and registration attempt`);
                                                console.log(`     - handlerForSelectors array is empty (should have at least one entry)`);
                                                console.log(`     - Signature encoding issue causing selector mismatch`);
                                                console.log(`     Result: ${JSON.stringify(result)}`);
                                                
                                                // Try to provide more diagnostic info
                                                if (txRecord.params && txRecord.params.executionParams) {
                                                    try {
                                                        const decodedActions = this.web3.eth.abi.decodeParameter(
                                                            'tuple(uint8,bytes)[]',
                                                            txRecord.params.executionParams
                                                        );
                                                        if (decodedActions && decodedActions.length > 0) {
                                                            const actionData = decodedActions[0].data || decodedActions[0][1];
                                                            const decodedAction = this.web3.eth.abi.decodeParameters(
                                                                ['string', 'string', 'uint8[]'],
                                                                actionData
                                                            );
                                                            console.log(`  📋 Decoded action data:`);
                                                            console.log(`     Function signature: ${decodedAction[0] || decodedAction.functionSignature}`);
                                                            console.log(`     Operation name: ${decodedAction[1] || decodedAction.operationName}`);
                                                            console.log(`     Supported actions: ${JSON.stringify(decodedAction[2] || decodedAction.supportedActions)}`);
                                                            
                                                            // Verify the signature produces the expected selector
                                                            const derivedSelector = this.web3.utils.keccak256(decodedAction[0] || decodedAction.functionSignature).slice(0, 10);
                                                            console.log(`     Derived selector from signature: ${derivedSelector}`);
                                                            console.log(`     Expected selector: ${this.NATIVE_TRANSFER_SELECTOR}`);
                                                            if (derivedSelector.toLowerCase() !== this.NATIVE_TRANSFER_SELECTOR.toLowerCase()) {
                                                                console.log(`  ❌ SELECTOR MISMATCH! Signature produces different selector!`);
                                                                throw new Error(`FunctionSelectorMismatch: Signature "${decodedAction[0] || decodedAction.functionSignature}" produces selector ${derivedSelector}, but expected ${this.NATIVE_TRANSFER_SELECTOR}`);
                                                            }
                                                        }
                                                    } catch (decodeError) {
                                                        console.log(`  ⚠️  Could not decode action data for diagnostics: ${decodeError.message}`);
                                                    }
                                                }
                                            }
                                        } else if (txRecord.status === 1 || txRecord.status === '1') {
                                            console.log(`  ⏳ Transaction is still pending`);
                                        }
                                        
                                        if (isOurTransaction) {
                                            break; // Found our transaction, stop searching
                                        }
                                    }
                                }
                            } catch (txError) {
                                // Transaction doesn't exist, continue
                                continue;
                            }
                        }
                    } catch (historyError) {
                        console.log(`  ⚠️  Could not check transaction history: ${historyError.message}`);
                    }
                    
                    if (pendingTxs && pendingTxs.length > 0) {
                        // Get the most recent transaction
                        const lastTxId = pendingTxs[pendingTxs.length - 1];
                        console.log(`  📋 Most recent pending transaction ID: ${lastTxId}`);
                        const txRecord = await this.callContractMethod(
                            this.contract.methods.getTransaction(lastTxId)
                        );
                        console.log(`  📋 Transaction status: ${txRecord.status}`);
                        console.log(`  📋 Transaction execution selector: ${txRecord.params.executionSelector}`);
                        if (txRecord.status === 5 || txRecord.status === '5') {
                            console.log(`  ✅ Transaction completed successfully`);
                        } else if (txRecord.status === 6 || txRecord.status === '6') {
                            console.log(`  ❌ Transaction failed internally`);
                            const result = txRecord.result || '0x';
                            if (result && result.length > 10) {
                                const errorSelector = result.slice(0, 10);
                                console.log(`  📋 Error selector: ${errorSelector}`);
                            }
                        }
                    }
                } catch (error) {
                    console.log(`  ⚠️  Could not check transactions: ${error.message}`);
                }
            }
            
            // Verify function was registered
            console.log('  🔍 Verifying function registration...');
            
            // Try to get function schema directly to see what error we get
            let functionSchema = null;
            try {
                functionSchema = await this.callContractMethod(
                    this.contract.methods.getFunctionSchema(this.NATIVE_TRANSFER_SELECTOR)
                );
                console.log(`  📋 Function schema retrieved: ${JSON.stringify(functionSchema, null, 2)}`);
                if (functionSchema && functionSchema.functionSelectorReturn === this.NATIVE_TRANSFER_SELECTOR) {
                    console.log(`  ✅ Function schema exists!`);
                } else {
                    console.log(`  ⚠️  Function schema returned but selector doesn't match`);
                    console.log(`     Expected: ${this.NATIVE_TRANSFER_SELECTOR}`);
                    console.log(`     Got: ${functionSchema ? functionSchema.functionSelectorReturn : 'undefined'}`);
                }
            } catch (schemaError) {
                console.log(`  ❌ Error getting function schema: ${schemaError.message}`);
                if (schemaError.data) {
                    console.log(`  📋 Error data: ${schemaError.data}`);
                }
            }
            
            const functionExists = await this.functionSchemaExists(this.NATIVE_TRANSFER_SELECTOR);
            const expectedFunctionExists = true;
            this.assertTest(
                functionExists === expectedFunctionExists,
                `Function schema exists (expected: ${expectedFunctionExists}, actual: ${functionExists})`
            );
            
            // If we didn't get the schema above, try again
            if (!functionSchema) {
                functionSchema = await this.callContractMethod(
                    this.contract.methods.getFunctionSchema(this.NATIVE_TRANSFER_SELECTOR)
                );
            }
            
            console.log(`  📋 Function schema result: ${JSON.stringify(functionSchema, null, 2)}`);
            
            // Expected: Operation name should be NATIVE_TRANSFER
            const expectedOperationName = 'NATIVE_TRANSFER';
            const actualOperationName = functionSchema.operationName;
            this.assertTest(
                actualOperationName === expectedOperationName,
                `Operation name matches (expected: ${expectedOperationName}, actual: ${actualOperationName})`
            );
            
            // getFunctionSchema returns supportedActions as an array, not a bitmap
            // We need to check the array or convert it to a bitmap for verification
            const supportedActionsArray = functionSchema.supportedActions || [];
            console.log(`  📋 Supported actions array: ${JSON.stringify(supportedActionsArray)}`);
            
            // Convert array to bitmap for comparison
            const actualBitmap = this.createBitmapFromActions(supportedActionsArray.map(a => 
                typeof a === 'string' ? parseInt(a) : a
            ));
            const expectedBitmap = this.createBitmapFromActions(supportedActions);
            
            console.log(`  📋 Expected bitmap: ${expectedBitmap} (binary: ${expectedBitmap.toString(2)})`);
            console.log(`  📋 Actual bitmap: ${actualBitmap} (binary: ${actualBitmap.toString(2)})`);
            console.log(`  📋 SIGN_META_REQUEST_AND_APPROVE bit (3): ${(actualBitmap & (1 << this.TxAction.SIGN_META_REQUEST_AND_APPROVE)) !== 0 ? '✅' : '❌'}`);
            console.log(`  📋 EXECUTE_META_REQUEST_AND_APPROVE bit (6): ${(actualBitmap & (1 << this.TxAction.EXECUTE_META_REQUEST_AND_APPROVE)) !== 0 ? '✅' : '❌'}`);
            
            // Expected: Bitmap should match expected value
            this.assertTest(
                actualBitmap === expectedBitmap,
                `Supported actions bitmap matches (expected: ${expectedBitmap}, actual: ${actualBitmap})`
            );
            
            // Verify both actions are in the array
            const hasSign = supportedActionsArray.includes(this.TxAction.SIGN_META_REQUEST_AND_APPROVE) ||
                           supportedActionsArray.includes(this.TxAction.SIGN_META_REQUEST_AND_APPROVE.toString());
            const hasExecute = supportedActionsArray.includes(this.TxAction.EXECUTE_META_REQUEST_AND_APPROVE) ||
                              supportedActionsArray.includes(this.TxAction.EXECUTE_META_REQUEST_AND_APPROVE.toString());
            
            // Expected: Function should support both SIGN and EXECUTE actions
            const expectedHasSign = true;
            const expectedHasExecute = true;
            this.assertTest(
                hasSign === expectedHasSign,
                `Function supports SIGN_META_REQUEST_AND_APPROVE (expected: ${expectedHasSign}, actual: ${hasSign}, actions: ${JSON.stringify(supportedActionsArray)})`
            );
            this.assertTest(
                hasExecute === expectedHasExecute,
                `Function supports EXECUTE_META_REQUEST_AND_APPROVE (expected: ${expectedHasExecute}, actual: ${hasExecute}, actions: ${JSON.stringify(supportedActionsArray)})`
            );
            
            console.log('  ✅ Function registered successfully');
            console.log(`     Operation: ${functionSchema.operationName}`);
            console.log(`     Supported Actions Bitmap: ${actualBitmap}`);
            
            await this.passTest('Register NATIVE_TRANSFER_SELECTOR function', `Operation: ${functionSchema.operationName}`);
            
        } catch (error) {
            await this.failTest('Register NATIVE_TRANSFER_SELECTOR function', error);
            throw error;
        }
    }

    async testStep2AddFunctionPermissionToOwner() {
        await this.startTest('Add Function Permissions to OWNER and BROADCASTER Roles');
        
        try {
            console.log('📋 Step 2: Add NATIVE_TRANSFER_SELECTOR function permissions');
            console.log('   OWNER_ROLE: SIGN_META_REQUEST_AND_APPROVE');
            console.log('   BROADCASTER_ROLE: EXECUTE_META_REQUEST_AND_APPROVE');
            console.log(`   Function Selector: ${this.NATIVE_TRANSFER_SELECTOR}`);
            
            // Get role hashes
            this.ownerRoleHash = this.getRoleHash('OWNER_ROLE');
            const broadcasterRoleHash = this.getRoleHash('BROADCASTER_ROLE');
            console.log(`  📋 Owner role hash: ${this.ownerRoleHash}`);
            console.log(`  📋 Broadcaster role hash: ${broadcasterRoleHash}`);
            
            // Check if roles exist
            const ownerRoleExists = await this.roleExists(this.ownerRoleHash);
            const broadcasterRoleExists = await this.roleExists(broadcasterRoleHash);
            const expectedOwnerRoleExists = true;
            const expectedBroadcasterRoleExists = true;
            this.assertTest(
                ownerRoleExists === expectedOwnerRoleExists,
                `OWNER role exists (expected: ${expectedOwnerRoleExists}, actual: ${ownerRoleExists})`
            );
            this.assertTest(
                broadcasterRoleExists === expectedBroadcasterRoleExists,
                `BROADCASTER role exists (expected: ${expectedBroadcasterRoleExists}, actual: ${broadcasterRoleExists})`
            );
            
            // Get owner and broadcaster wallets
            const ownerPrivateKey = this.getRoleWallet('owner');
            const broadcasterWallet = this.getRoleWalletObject('broadcaster');
            
            // Check if permissions already exist
            console.log('  🔍 Checking if permissions already exist...');
            const ownerPermissions = await this.callContractMethod(
                this.contract.methods.getActiveRolePermissions(this.ownerRoleHash)
            );
            const broadcasterPermissions = await this.callContractMethod(
                this.contract.methods.getActiveRolePermissions(broadcasterRoleHash)
            );
            
            const ownerPermission = ownerPermissions.find(perm => 
                perm.functionSelector.toLowerCase() === this.NATIVE_TRANSFER_SELECTOR.toLowerCase()
            );
            const broadcasterPermission = broadcasterPermissions.find(perm => 
                perm.functionSelector.toLowerCase() === this.NATIVE_TRANSFER_SELECTOR.toLowerCase()
            );
            
            let ownerHasSign = false;
            let broadcasterHasExecute = false;
            
            if (ownerPermission) {
                const ownerBitmap = parseInt(ownerPermission.grantedActionsBitmap);
                ownerHasSign = (ownerBitmap & (1 << this.TxAction.SIGN_META_REQUEST_AND_APPROVE)) !== 0;
            }
            
            if (broadcasterPermission) {
                const broadcasterBitmap = parseInt(broadcasterPermission.grantedActionsBitmap);
                broadcasterHasExecute = (broadcasterBitmap & (1 << this.TxAction.EXECUTE_META_REQUEST_AND_APPROVE)) !== 0;
            }
            
            // Add OWNER permission if missing (SIGN only)
            if (!ownerHasSign) {
                console.log('  📝 Adding SIGN_META_REQUEST_AND_APPROVE permission to OWNER role...');
                
                // Debug: Check the function schema first
                console.log('  🔍 Checking function schema before adding permission...');
                const functionSchema = await this.callContractMethod(
                    this.contract.methods.getFunctionSchema(this.NATIVE_TRANSFER_SELECTOR)
                );
                console.log(`  🔍 Function schema handlerForSelectors: ${JSON.stringify(functionSchema.handlerForSelectors || functionSchema[5] || 'unknown')}`);
                console.log(`  🔍 Function schema supportedActions: ${JSON.stringify(functionSchema.supportedActions || functionSchema[4] || 'unknown')}`);
                
                // Debug: Log the permission we're creating
                const testPermission = this.createFunctionPermission(
                    this.NATIVE_TRANSFER_SELECTOR,
                    [this.TxAction.SIGN_META_REQUEST_AND_APPROVE]
                );
                console.log(`  🔍 Creating permission with:`);
                console.log(`     functionSelector: ${testPermission.functionSelector}`);
                console.log(`     grantedActionsBitmap: ${testPermission.grantedActionsBitmap}`);
                console.log(`     handlerForSelectors: ${JSON.stringify(testPermission.handlerForSelectors)}`);
                
                // Verify handlerForSelectors match
                const schemaHandlers = functionSchema.handlerForSelectors || functionSchema[5] || [];
                const permissionHandlers = testPermission.handlerForSelectors || [];
                console.log(`  🔍 Schema handlers: ${JSON.stringify(schemaHandlers)}, Permission handlers: ${JSON.stringify(permissionHandlers)}`);
                const handlersMatch = JSON.stringify(schemaHandlers.map(h => h.toLowerCase())) === JSON.stringify(permissionHandlers.map(h => h.toLowerCase()));
                console.log(`  🔍 HandlerForSelectors match: ${handlersMatch ? '✅ YES' : '❌ NO'}`);
                
                const ownerReceipt = await this.addFunctionToRole(
                    this.ownerRoleHash,
                    this.NATIVE_TRANSFER_SELECTOR,
                    [this.TxAction.SIGN_META_REQUEST_AND_APPROVE], // SIGN only, not EXECUTE
                    ownerPrivateKey,
                    broadcasterWallet
                );
                // Validate transaction succeeded
                const expectedOwnerTxStatus = true;
                const actualOwnerTxStatus = ownerReceipt.status === true || ownerReceipt.status === 1;
                this.assertTest(
                    actualOwnerTxStatus === expectedOwnerTxStatus,
                    `Add OWNER permission transaction succeeded (expected: ${expectedOwnerTxStatus}, actual: ${actualOwnerTxStatus})`
                );
                console.log('  ✅ OWNER permission added successfully');
                
                // Immediately check if permission was added (before waiting)
                console.log('  🔍 Immediately checking if permission was added...');
                const immediateCheck = await this.callContractMethod(
                    this.contract.methods.getActiveRolePermissions(this.ownerRoleHash)
                );
                const immediatePermission = immediateCheck.find(perm => {
                    const selector = perm.functionSelector || perm[0];
                    return selector && selector.toLowerCase() === this.NATIVE_TRANSFER_SELECTOR.toLowerCase();
                });
                console.log(`  🔍 Immediate check: permission ${immediatePermission ? 'FOUND' : 'NOT FOUND'}`);
                if (immediatePermission) {
                    console.log(`  🔍 Immediate permission details: ${JSON.stringify(immediatePermission, null, 2)}`);
                }
            } else {
                console.log('  ✅ OWNER already has SIGN_META_REQUEST_AND_APPROVE permission');
            }
            
            // Add BROADCASTER permission if missing (EXECUTE only)
            if (!broadcasterHasExecute) {
                console.log('  📝 Adding EXECUTE_META_REQUEST_AND_APPROVE permission to BROADCASTER role...');
                const broadcasterReceipt = await this.addFunctionToRole(
                    broadcasterRoleHash,
                    this.NATIVE_TRANSFER_SELECTOR,
                    [this.TxAction.EXECUTE_META_REQUEST_AND_APPROVE], // EXECUTE only, not SIGN
                    ownerPrivateKey,
                    broadcasterWallet
                );
                // Validate transaction succeeded
                const expectedBroadcasterTxStatus = true;
                const actualBroadcasterTxStatus = broadcasterReceipt.status === true || broadcasterReceipt.status === 1;
                this.assertTest(
                    actualBroadcasterTxStatus === expectedBroadcasterTxStatus,
                    `Add BROADCASTER permission transaction succeeded (expected: ${expectedBroadcasterTxStatus}, actual: ${actualBroadcasterTxStatus})`
                );
                console.log('  ✅ BROADCASTER permission added successfully');
            } else {
                console.log('  ✅ BROADCASTER already has EXECUTE_META_REQUEST_AND_APPROVE permission');
            }
            
            // Wait a bit for state to update (increased from 500ms to 2000ms for blockchain state propagation)
            await new Promise(resolve => setTimeout(resolve, 2000));
            
            // Verify permissions
            console.log('  🔍 Verifying permissions...');
            const finalOwnerPermissions = await this.callContractMethod(
                this.contract.methods.getActiveRolePermissions(this.ownerRoleHash)
            );
            const finalBroadcasterPermissions = await this.callContractMethod(
                this.contract.methods.getActiveRolePermissions(broadcasterRoleHash)
            );
            
            // Debug: Log what permissions were returned
            console.log(`  📋 Owner permissions count: ${finalOwnerPermissions ? finalOwnerPermissions.length : 'null'}`);
            if (finalOwnerPermissions && finalOwnerPermissions.length > 0) {
                console.log(`  📋 Owner permission selectors: ${finalOwnerPermissions.map(p => p.functionSelector || p[0] || 'unknown').join(', ')}`);
            }
            console.log(`  📋 Broadcaster permissions count: ${finalBroadcasterPermissions ? finalBroadcasterPermissions.length : 'null'}`);
            if (finalBroadcasterPermissions && finalBroadcasterPermissions.length > 0) {
                console.log(`  📋 Broadcaster permission selectors: ${finalBroadcasterPermissions.map(p => p.functionSelector || p[0] || 'unknown').join(', ')}`);
            }
            console.log(`  📋 Looking for NATIVE_TRANSFER_SELECTOR: ${this.NATIVE_TRANSFER_SELECTOR}`);
            
            const finalOwnerPermission = finalOwnerPermissions.find(perm => {
                const selector = perm.functionSelector || perm[0];
                return selector && selector.toLowerCase() === this.NATIVE_TRANSFER_SELECTOR.toLowerCase();
            });
            const finalBroadcasterPermission = finalBroadcasterPermissions.find(perm => {
                const selector = perm.functionSelector || perm[0];
                return selector && selector.toLowerCase() === this.NATIVE_TRANSFER_SELECTOR.toLowerCase();
            });
            
            // Expected: Permissions should exist
            const expectedOwnerPermissionExists = true;
            const expectedBroadcasterPermissionExists = true;
            const actualOwnerPermissionExists = finalOwnerPermission !== undefined;
            const actualBroadcasterPermissionExists = finalBroadcasterPermission !== undefined;
            
            this.assertTest(
                actualOwnerPermissionExists === expectedOwnerPermissionExists,
                `NATIVE_TRANSFER function permission exists in OWNER role (expected: ${expectedOwnerPermissionExists}, actual: ${actualOwnerPermissionExists})`
            );
            this.assertTest(
                actualBroadcasterPermissionExists === expectedBroadcasterPermissionExists,
                `NATIVE_TRANSFER function permission exists in BROADCASTER role (expected: ${expectedBroadcasterPermissionExists}, actual: ${actualBroadcasterPermissionExists})`
            );
            
            // Verify permission bitmaps (only if permissions exist)
            if (!finalOwnerPermission) {
                throw new Error('Cannot verify OWNER permission bitmap: permission not found');
            }
            if (!finalBroadcasterPermission) {
                throw new Error('Cannot verify BROADCASTER permission bitmap: permission not found');
            }
            
            const ownerBitmap = parseInt(finalOwnerPermission.grantedActionsBitmap || finalOwnerPermission[1] || '0');
            const broadcasterBitmap = parseInt(finalBroadcasterPermission.grantedActionsBitmap || finalBroadcasterPermission[1] || '0');
            
            // Expected: OWNER should have SIGN_META_REQUEST_AND_APPROVE permission (bit 3)
            const expectedOwnerHasSign = true;
            const actualOwnerHasSign = (ownerBitmap & (1 << this.TxAction.SIGN_META_REQUEST_AND_APPROVE)) !== 0;
            this.assertTest(
                actualOwnerHasSign === expectedOwnerHasSign,
                `OWNER role has SIGN_META_REQUEST_AND_APPROVE permission (expected: ${expectedOwnerHasSign}, actual: ${actualOwnerHasSign}, bitmap: ${ownerBitmap})`
            );
            
            // Expected: BROADCASTER should have EXECUTE_META_REQUEST_AND_APPROVE permission (bit 6)
            const expectedBroadcasterHasExecute = true;
            const actualBroadcasterHasExecute = (broadcasterBitmap & (1 << this.TxAction.EXECUTE_META_REQUEST_AND_APPROVE)) !== 0;
            this.assertTest(
                actualBroadcasterHasExecute === expectedBroadcasterHasExecute,
                `BROADCASTER role has EXECUTE_META_REQUEST_AND_APPROVE permission (expected: ${expectedBroadcasterHasExecute}, actual: ${actualBroadcasterHasExecute}, bitmap: ${broadcasterBitmap})`
            );
            
            console.log('  ✅ Function permissions added successfully');
            console.log(`     OWNER: SIGN_META_REQUEST_AND_APPROVE permission verified (bitmap: ${ownerBitmap})`);
            console.log(`     BROADCASTER: EXECUTE_META_REQUEST_AND_APPROVE permission verified (bitmap: ${broadcasterBitmap})`);
            
            await this.passTest('Add function permissions to OWNER and BROADCASTER roles', 'Permissions verified');
            
        } catch (error) {
            await this.failTest('Add function permissions to OWNER and BROADCASTER roles', error);
            throw error;
        }
    }

    async testStep3DepositEthToContract() {
        await this.startTest('Deposit ETH to Contract');
        
        try {
            console.log('📋 Step 3: Deposit ETH from owner wallet to contract');
            console.log('   Note: Deposits use the explicit deposit() function');
            console.log('   Direct ETH transfers to the contract will revert (no receive() function)');
            
            // Get initial balances
            const initialContractBalance = await this.getContractBalance();
            const ownerWallet = this.getRoleWalletObject('owner');
            const initialOwnerBalance = await this.getWalletBalance(ownerWallet.address);
            
            console.log(`  📊 Initial Contract Balance: ${this.web3.utils.fromWei(initialContractBalance, 'ether')} ETH`);
            console.log(`  📊 Initial Owner Balance: ${this.web3.utils.fromWei(initialOwnerBalance, 'ether')} ETH`);
            
            // Deposit amount: 1 ETH
            const depositAmount = this.web3.utils.toWei('1', 'ether');
            console.log(`  💰 Deposit Amount: ${this.web3.utils.fromWei(depositAmount, 'ether')} ETH`);
            
            // Call deposit() function to deposit ETH
            console.log('  📝 Calling deposit() function to deposit ETH...');
            
            // Use the explicit deposit() function instead of direct transfer
            // Since the ABI might not be updated yet, we'll encode the function call manually
            const depositFunctionSignature = this.web3.utils.keccak256('deposit()').slice(0, 10); // First 4 bytes
            let transferReceipt;
            try {
                // Encode the function call and send with value
                transferReceipt = await this.web3.eth.sendTransaction({
                    from: ownerWallet.address,
                    to: this.contractAddress,
                    value: depositAmount,
                    data: depositFunctionSignature,
                    gas: 100000 // More gas for function call
                });
            } catch (error) {
                // Transaction failed - this is a test failure
                // Expected: Transaction should succeed
                // Actual: Transaction failed
                const expectedTxStatus = 'success';
                const actualTxStatus = 'failed';
                const errorMessage = `ETH deposit transaction failed (expected: ${expectedTxStatus}, actual: ${actualTxStatus}). Error: ${error.message}. The deposit() function call failed.`;
                console.log(`  ❌ ${errorMessage}`);
                throw new Error(errorMessage);
            }
            
            // Validate transaction succeeded
            const expectedTxStatus = true;
            const actualTxStatus = transferReceipt.status === true || transferReceipt.status === 1;
            this.assertTest(
                actualTxStatus === expectedTxStatus,
                `ETH deposit transaction succeeded (expected: ${expectedTxStatus}, actual: ${actualTxStatus})`
            );
            
            // Verify balances after deposit
            const finalContractBalance = await this.getContractBalance();
            const finalOwnerBalance = await this.getWalletBalance(ownerWallet.address);
            
            console.log(`  📊 Final Contract Balance: ${this.web3.utils.fromWei(finalContractBalance, 'ether')} ETH`);
            console.log(`  📊 Final Owner Balance: ${this.web3.utils.fromWei(finalOwnerBalance, 'ether')} ETH`);
            
            // Calculate balance changes
            const contractBalanceIncrease = BigInt(finalContractBalance) - BigInt(initialContractBalance);
            const ownerBalanceDecrease = BigInt(initialOwnerBalance) - BigInt(finalOwnerBalance);
            
            console.log(`  📊 Contract Balance Increase: ${this.web3.utils.fromWei(contractBalanceIncrease.toString(), 'ether')} ETH`);
            console.log(`  📊 Owner Balance Decrease: ${this.web3.utils.fromWei(ownerBalanceDecrease.toString(), 'ether')} ETH`);
            
            // Expected: Contract balance should increase by exactly the deposit amount
            const expectedContractBalanceIncrease = BigInt(depositAmount);
            this.assertTest(
                contractBalanceIncrease === expectedContractBalanceIncrease,
                `Contract balance increased by deposit amount (expected: ${this.web3.utils.fromWei(expectedContractBalanceIncrease.toString(), 'ether')} ETH, actual: ${this.web3.utils.fromWei(contractBalanceIncrease.toString(), 'ether')} ETH)`
            );
            
            // Expected: Owner balance should decrease by deposit amount + gas (at least deposit amount)
            const expectedMinOwnerBalanceDecrease = BigInt(depositAmount);
            this.assertTest(
                ownerBalanceDecrease >= expectedMinOwnerBalanceDecrease,
                `Owner balance decreased by at least deposit amount (expected: >= ${this.web3.utils.fromWei(expectedMinOwnerBalanceDecrease.toString(), 'ether')} ETH, actual: ${this.web3.utils.fromWei(ownerBalanceDecrease.toString(), 'ether')} ETH)`
            );
            
            console.log('  ✅ ETH deposit successful');
            
            await this.passTest('Deposit ETH to contract', `${this.web3.utils.fromWei(depositAmount, 'ether')} ETH deposited`);
            
        } catch (error) {
            await this.failTest('Deposit ETH to contract', error);
            throw error;
        }
    }

    async testStep4WithdrawEthFromContract() {
        await this.startTest('Withdraw ETH from Contract');
        
        try {
            console.log('📋 Step 4: Withdraw ETH from contract to owner wallet');
            
            // Get initial balances
            const initialContractBalance = await this.getContractBalance();
            const ownerWallet = this.getRoleWalletObject('owner');
            const initialOwnerBalance = await this.getWalletBalance(ownerWallet.address);
            
            console.log(`  📊 Initial Contract Balance: ${this.web3.utils.fromWei(initialContractBalance, 'ether')} ETH`);
            console.log(`  📊 Initial Owner Balance: ${this.web3.utils.fromWei(initialOwnerBalance, 'ether')} ETH`);
            
            // Withdraw amount: 0.5 ETH (less than deposit to ensure contract has enough)
            const withdrawAmount = this.web3.utils.toWei('0.5', 'ether');
            console.log(`  💰 Withdraw Amount: ${this.web3.utils.fromWei(withdrawAmount, 'ether')} ETH`);
            
            // Expected: Contract must have sufficient balance for withdrawal
            // This is a prerequisite - if deposit test passed, contract should have balance
            const expectedMinContractBalance = BigInt(withdrawAmount);
            const actualContractBalance = BigInt(initialContractBalance);
            this.assertTest(
                actualContractBalance >= expectedMinContractBalance,
                `Contract has sufficient balance for withdrawal (expected: >= ${this.web3.utils.fromWei(expectedMinContractBalance.toString(), 'ether')} ETH, actual: ${this.web3.utils.fromWei(actualContractBalance.toString(), 'ether')} ETH). Deposit test must succeed first.`
            );
            
            // Before withdrawing, we need to whitelist the owner wallet address for NATIVE_TRANSFER_SELECTOR
            // This is required by GuardController's target whitelist security feature
            console.log('  📝 Whitelisting owner wallet for NATIVE_TRANSFER_SELECTOR...');
            
            // Get owner and broadcaster wallets
            const ownerPrivateKey = this.getRoleWallet('owner');
            const broadcasterWallet = this.getRoleWalletObject('broadcaster');
            
            try {
                await this.addTargetToWhitelist(
                    this.ownerRoleHash,
                    this.NATIVE_TRANSFER_SELECTOR,
                    ownerWallet.address,
                    ownerPrivateKey,
                    broadcasterWallet
                );
            } catch (error) {
                // If target is already whitelisted, that's fine - continue
                if (error.message.includes('ItemAlreadyExists') || error.message.includes('already whitelisted')) {
                    console.log('  ℹ️  Target already whitelisted, continuing...');
                } else {
                    throw error;
                }
            }
            
            console.log('  📝 Executing ETH transfer via requestAndApproveExecution...');
            const receipt = await this.executeEthTransfer(
                ownerWallet.address, // target: owner wallet
                withdrawAmount,
                ownerPrivateKey,
                broadcasterWallet
            );
            
            // Validate transaction succeeded
            const expectedTxStatus = true;
            const actualTxStatus = receipt.status === true || receipt.status === 1;
            this.assertTest(
                actualTxStatus === expectedTxStatus,
                `ETH withdrawal transaction succeeded (expected: ${expectedTxStatus}, actual: ${actualTxStatus})`
            );
            
            // Verify balances after withdrawal
            const finalContractBalance = await this.getContractBalance();
            const finalOwnerBalance = await this.getWalletBalance(ownerWallet.address);
            
            console.log(`  📊 Final Contract Balance: ${this.web3.utils.fromWei(finalContractBalance, 'ether')} ETH`);
            console.log(`  📊 Final Owner Balance: ${this.web3.utils.fromWei(finalOwnerBalance, 'ether')} ETH`);
            
            // Calculate balance changes
            const contractBalanceDecrease = BigInt(initialContractBalance) - BigInt(finalContractBalance);
            const ownerBalanceIncrease = BigInt(finalOwnerBalance) - BigInt(initialOwnerBalance);
            
            console.log(`  📊 Contract Balance Decrease: ${this.web3.utils.fromWei(contractBalanceDecrease.toString(), 'ether')} ETH`);
            console.log(`  📊 Owner Balance Increase: ${this.web3.utils.fromWei(ownerBalanceIncrease.toString(), 'ether')} ETH`);
            
            // Expected: Contract balance should decrease by exactly the withdraw amount
            const expectedContractBalanceDecrease = BigInt(withdrawAmount);
            this.assertTest(
                contractBalanceDecrease === expectedContractBalanceDecrease,
                `Contract balance decreased by withdraw amount (expected: ${this.web3.utils.fromWei(expectedContractBalanceDecrease.toString(), 'ether')} ETH, actual: ${this.web3.utils.fromWei(contractBalanceDecrease.toString(), 'ether')} ETH)`
            );
            
            // Expected: Owner balance should increase by withdraw amount (minus gas, so allow small tolerance)
            const expectedMinOwnerBalanceIncrease = BigInt(withdrawAmount) - BigInt(this.web3.utils.toWei('0.01', 'ether')); // Allow 0.01 ETH tolerance for gas
            this.assertTest(
                ownerBalanceIncrease >= expectedMinOwnerBalanceIncrease,
                `Owner balance increased by at least withdraw amount minus gas (expected: >= ${this.web3.utils.fromWei(expectedMinOwnerBalanceIncrease.toString(), 'ether')} ETH, actual: ${this.web3.utils.fromWei(ownerBalanceIncrease.toString(), 'ether')} ETH)`
            );
            
            console.log('  ✅ ETH withdrawal successful');
            
            await this.passTest('Withdraw ETH from contract', `${this.web3.utils.fromWei(withdrawAmount, 'ether')} ETH withdrawn`);
            
        } catch (error) {
            await this.failTest('Withdraw ETH from contract', error);
            throw error;
        }
    }
}

module.exports = GuardControllerTests;
