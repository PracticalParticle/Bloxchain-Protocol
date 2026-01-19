/**
 * GuardController Functionality Tests
 * Comprehensive tests for GuardController ETH transfer functionality
 * Tests complete workflow: function registration, permission setup, ETH deposit, and ETH withdrawal
 */

const BaseGuardControllerTest = require('./base-test');

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
            console.log('   Function Signature: __bloxchain_native_transfer__(address,uint256)');
            console.log('   Operation Name: NATIVE_TRANSFER');
            console.log('   Supported Actions: SIGN_META_REQUEST_AND_APPROVE, EXECUTE_META_REQUEST_AND_APPROVE');
            
            // Check if function already exists
            const alreadyExists = await this.functionSchemaExists(this.NATIVE_TRANSFER_SELECTOR);
            if (alreadyExists) {
                console.log('  ⚠️  Function already registered, skipping registration');
                await this.passTest('Function already registered');
                return;
            }
            
            // Get owner and broadcaster wallets
            const ownerPrivateKey = this.getRoleWallet('owner');
            const broadcasterWallet = this.getRoleWalletObject('broadcaster');
            
            // Register function with SIGN and EXECUTE permissions for REQUEST_AND_APPROVE
            const supportedActions = [
                this.TxAction.SIGN_META_REQUEST_AND_APPROVE,
                this.TxAction.EXECUTE_META_REQUEST_AND_APPROVE
            ];
            
            console.log('  📝 Registering function via RuntimeRBAC batch operation...');
            const receipt = await this.registerFunction(
                this.NATIVE_TRANSFER_SELECTOR,
                '__bloxchain_native_transfer__(address,uint256)', // function signature
                'NATIVE_TRANSFER',
                supportedActions,
                ownerPrivateKey,
                broadcasterWallet
            );
            
            // Validate transaction succeeded
            const expectedTxStatus = true;
            const actualTxStatus = receipt.status === true || receipt.status === 1;
            this.assertTest(
                actualTxStatus === expectedTxStatus,
                `Function registration transaction succeeded (expected: ${expectedTxStatus}, actual: ${actualTxStatus})`
            );
            
            // Verify function was registered
            console.log('  🔍 Verifying function registration...');
            const functionExists = await this.functionSchemaExists(this.NATIVE_TRANSFER_SELECTOR);
            const expectedFunctionExists = true;
            this.assertTest(
                functionExists === expectedFunctionExists,
                `Function schema exists (expected: ${expectedFunctionExists}, actual: ${functionExists})`
            );
            
            // Get function schema details
            const functionSchema = await this.callContractMethod(
                this.contract.methods.getFunctionSchema(this.NATIVE_TRANSFER_SELECTOR)
            );
            
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
            
            // Wait a bit for state to update
            await new Promise(resolve => setTimeout(resolve, 500));
            
            // Verify permissions
            console.log('  🔍 Verifying permissions...');
            const finalOwnerPermissions = await this.callContractMethod(
                this.contract.methods.getActiveRolePermissions(this.ownerRoleHash)
            );
            const finalBroadcasterPermissions = await this.callContractMethod(
                this.contract.methods.getActiveRolePermissions(broadcasterRoleHash)
            );
            
            const finalOwnerPermission = finalOwnerPermissions.find(perm => 
                perm.functionSelector.toLowerCase() === this.NATIVE_TRANSFER_SELECTOR.toLowerCase()
            );
            const finalBroadcasterPermission = finalBroadcasterPermissions.find(perm => 
                perm.functionSelector.toLowerCase() === this.NATIVE_TRANSFER_SELECTOR.toLowerCase()
            );
            
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
            
            // Verify permission bitmaps
            const ownerBitmap = parseInt(finalOwnerPermission.grantedActionsBitmap);
            const broadcasterBitmap = parseInt(finalBroadcasterPermission.grantedActionsBitmap);
            
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
            const ownerWalletForWhitelist = this.getRoleWalletObject('owner');
            try {
                await this.addTargetToWhitelist(
                    this.ownerRoleHash,
                    this.NATIVE_TRANSFER_SELECTOR,
                    ownerWallet.address,
                    ownerWalletForWhitelist
                );
            } catch (error) {
                // If target is already whitelisted, that's fine - continue
                if (error.message.includes('ItemAlreadyExists')) {
                    console.log('  ℹ️  Target already whitelisted, continuing...');
                } else {
                    throw error;
                }
            }
            
            // Get owner and broadcaster wallets
            const ownerPrivateKey = this.getRoleWallet('owner');
            const broadcasterWallet = this.getRoleWalletObject('broadcaster');
            
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
