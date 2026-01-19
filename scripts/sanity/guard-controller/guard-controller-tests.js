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
            
            this.assertTest(receipt.status === true || receipt.status === 1, 'Function registration transaction succeeded');
            
            // Verify function was registered
            console.log('  🔍 Verifying function registration...');
            const functionExists = await this.functionSchemaExists(this.NATIVE_TRANSFER_SELECTOR);
            this.assertTest(functionExists, 'Function schema exists');
            
            // Get function schema details
            const functionSchema = await this.callContractMethod(
                this.contract.methods.getFunctionSchema(this.NATIVE_TRANSFER_SELECTOR)
            );
            
            console.log(`  📋 Function schema result: ${JSON.stringify(functionSchema, null, 2)}`);
            
            this.assertTest(
                functionSchema.operationName === 'NATIVE_TRANSFER',
                `Operation name is NATIVE_TRANSFER (got: ${functionSchema.operationName})`
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
            
            // Verify both actions are in the array
            const hasSign = supportedActionsArray.includes(this.TxAction.SIGN_META_REQUEST_AND_APPROVE) ||
                           supportedActionsArray.includes(this.TxAction.SIGN_META_REQUEST_AND_APPROVE.toString());
            const hasExecute = supportedActionsArray.includes(this.TxAction.EXECUTE_META_REQUEST_AND_APPROVE) ||
                              supportedActionsArray.includes(this.TxAction.EXECUTE_META_REQUEST_AND_APPROVE.toString());
            
            // Note: The function schema should support both SIGN and EXECUTE actions
            // This allows both OWNER (signer) and BROADCASTER (executor) to use this function
            this.assertTest(
                hasSign,
                `Function supports SIGN_META_REQUEST_AND_APPROVE (actions: ${JSON.stringify(supportedActionsArray)})`
            );
            this.assertTest(
                hasExecute,
                `Function supports EXECUTE_META_REQUEST_AND_APPROVE (actions: ${JSON.stringify(supportedActionsArray)})`
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
            this.assertTest(ownerRoleExists, 'OWNER role exists');
            this.assertTest(broadcasterRoleExists, 'BROADCASTER role exists');
            
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
                this.assertTest(ownerReceipt.status === true || ownerReceipt.status === 1, 'Add OWNER permission transaction succeeded');
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
                this.assertTest(broadcasterReceipt.status === true || broadcasterReceipt.status === 1, 'Add BROADCASTER permission transaction succeeded');
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
            
            this.assertTest(finalOwnerPermission !== undefined, 'NATIVE_TRANSFER function permission exists in OWNER role');
            this.assertTest(finalBroadcasterPermission !== undefined, 'NATIVE_TRANSFER function permission exists in BROADCASTER role');
            
            // Verify permission bitmaps
            const ownerBitmap = parseInt(finalOwnerPermission.grantedActionsBitmap);
            const broadcasterBitmap = parseInt(finalBroadcasterPermission.grantedActionsBitmap);
            
            this.assertTest(
                (ownerBitmap & (1 << this.TxAction.SIGN_META_REQUEST_AND_APPROVE)) !== 0,
                'OWNER role has SIGN_META_REQUEST_AND_APPROVE permission'
            );
            this.assertTest(
                (broadcasterBitmap & (1 << this.TxAction.EXECUTE_META_REQUEST_AND_APPROVE)) !== 0,
                'BROADCASTER role has EXECUTE_META_REQUEST_AND_APPROVE permission'
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
            console.log('   Note: Deposits are direct ETH transfers from owner to contract');
            console.log('   The contract is not responsible for handling deposits');
            
            // Get initial balances
            const initialContractBalance = await this.getContractBalance();
            const ownerWallet = this.getRoleWalletObject('owner');
            const initialOwnerBalance = await this.getWalletBalance(ownerWallet.address);
            
            console.log(`  📊 Initial Contract Balance: ${this.web3.utils.fromWei(initialContractBalance, 'ether')} ETH`);
            console.log(`  📊 Initial Owner Balance: ${this.web3.utils.fromWei(initialOwnerBalance, 'ether')} ETH`);
            
            // Deposit amount: 1 ETH
            const depositAmount = this.web3.utils.toWei('1', 'ether');
            console.log(`  💰 Deposit Amount: ${this.web3.utils.fromWei(depositAmount, 'ether')} ETH`);
            
            // Send ETH directly from owner to contract (regular transaction, not via GuardController)
            console.log('  📝 Sending ETH directly from owner wallet to contract...');
            
            // For a simple ETH transfer, we send ETH directly without calling any contract function
            // Use web3 to send a simple ETH transfer
            // The contract must have a receive() function to accept ETH
            const transferReceipt = await this.web3.eth.sendTransaction({
                from: ownerWallet.address,
                to: this.contractAddress,
                value: depositAmount,
                gas: 21000
            });
            
            this.assertTest(transferReceipt.status === true || transferReceipt.status === 1, 'ETH deposit transaction succeeded');
            
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
            
            // Verify contract balance increased by deposit amount (or close to it, accounting for gas)
            this.assertTest(
                contractBalanceIncrease >= BigInt(depositAmount),
                `Contract balance increased by at least deposit amount (${this.web3.utils.fromWei(contractBalanceIncrease.toString(), 'ether')} ETH >= ${this.web3.utils.fromWei(depositAmount, 'ether')} ETH)`
            );
            
            // Verify owner balance decreased (should be deposit amount + gas)
            this.assertTest(
                ownerBalanceDecrease >= BigInt(depositAmount),
                `Owner balance decreased by at least deposit amount (${this.web3.utils.fromWei(ownerBalanceDecrease.toString(), 'ether')} ETH >= ${this.web3.utils.fromWei(depositAmount, 'ether')} ETH)`
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
            
            // Verify contract has enough balance
            this.assertTest(
                BigInt(initialContractBalance) >= BigInt(withdrawAmount),
                `Contract has sufficient balance for withdrawal (${this.web3.utils.fromWei(initialContractBalance, 'ether')} ETH >= ${this.web3.utils.fromWei(withdrawAmount, 'ether')} ETH)`
            );
            
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
            
            this.assertTest(receipt.status === true || receipt.status === 1, 'ETH withdrawal transaction succeeded');
            
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
            
            // Verify contract balance decreased by withdraw amount
            this.assertTest(
                contractBalanceDecrease >= BigInt(withdrawAmount),
                `Contract balance decreased by at least withdraw amount (${this.web3.utils.fromWei(contractBalanceDecrease.toString(), 'ether')} ETH >= ${this.web3.utils.fromWei(withdrawAmount, 'ether')} ETH)`
            );
            
            // Verify owner balance increased by withdraw amount (or close to it, accounting for gas)
            this.assertTest(
                ownerBalanceIncrease >= BigInt(withdrawAmount) - BigInt(this.web3.utils.toWei('0.01', 'ether')), // Allow small difference for gas
                `Owner balance increased by approximately withdraw amount (${this.web3.utils.fromWei(ownerBalanceIncrease.toString(), 'ether')} ETH ≈ ${this.web3.utils.fromWei(withdrawAmount, 'ether')} ETH)`
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
