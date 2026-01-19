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
        console.log('\n🔄 TESTING COMPLETE GUARDCONTROLLER ETH TRANSFER WORKFLOW');
        console.log('==================================================');
        console.log('📋 This workflow tests the complete ETH transfer lifecycle:');
        console.log('   1. Register bytes4(0) function with ETH_TRANSFER operation');
        console.log('   2. Add function permission to OWNER role');
        console.log('   3. Deposit ETH from owner wallet to contract');
        console.log('   4. Withdraw ETH from contract to owner wallet');

        await this.testStep1RegisterEthTransferFunction();
        await this.testStep2AddFunctionPermissionToOwner();
        await this.testStep3DepositEthToContract();
        await this.testStep4WithdrawEthFromContract();
    }

    async testStep1RegisterEthTransferFunction() {
        await this.startTest('Register bytes4(0) Function for ETH Transfers');
        
        try {
            console.log('📋 Step 1: Register bytes4(0) function with ETH_TRANSFER operation');
            console.log('   Function Selector: 0x00000000');
            console.log('   Function Signature: "" (empty string)');
            console.log('   Operation Name: ETH_TRANSFER');
            console.log('   Supported Actions: SIGN_META_REQUEST_AND_APPROVE, EXECUTE_META_REQUEST_AND_APPROVE');
            
            // Check if function already exists
            const alreadyExists = await this.functionSchemaExists(this.ETH_TRANSFER_SELECTOR);
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
                this.ETH_TRANSFER_SELECTOR,
                '', // empty string for bytes4(0)
                'ETH_TRANSFER',
                supportedActions,
                ownerPrivateKey,
                broadcasterWallet
            );
            
            this.assertTest(receipt.status === true || receipt.status === 1, 'Function registration transaction succeeded');
            
            // Verify function was registered
            console.log('  🔍 Verifying function registration...');
            const functionExists = await this.functionSchemaExists(this.ETH_TRANSFER_SELECTOR);
            this.assertTest(functionExists, 'Function schema exists');
            
            // Get function schema details
            const functionSchema = await this.callContractMethod(
                this.contract.methods.getFunctionSchema(this.ETH_TRANSFER_SELECTOR)
            );
            
            this.assertTest(
                functionSchema.operationName === 'ETH_TRANSFER',
                `Operation name is ETH_TRANSFER (got: ${functionSchema.operationName})`
            );
            
            // Verify supported actions bitmap includes both SIGN and EXECUTE for REQUEST_AND_APPROVE
            const expectedBitmap = this.createBitmapFromActions(supportedActions);
            const actualBitmap = parseInt(functionSchema.supportedActionsBitmap);
            this.assertTest(
                (actualBitmap & (1 << this.TxAction.SIGN_META_REQUEST_AND_APPROVE)) !== 0,
                'Function supports SIGN_META_REQUEST_AND_APPROVE'
            );
            this.assertTest(
                (actualBitmap & (1 << this.TxAction.EXECUTE_META_REQUEST_AND_APPROVE)) !== 0,
                'Function supports EXECUTE_META_REQUEST_AND_APPROVE'
            );
            
            console.log('  ✅ Function registered successfully');
            console.log(`     Operation: ${functionSchema.operationName}`);
            console.log(`     Supported Actions Bitmap: ${actualBitmap}`);
            
            await this.passTest('Register bytes4(0) function', `Operation: ${functionSchema.operationName}`);
            
        } catch (error) {
            await this.failTest('Register bytes4(0) function', error);
            throw error;
        }
    }

    async testStep2AddFunctionPermissionToOwner() {
        await this.startTest('Add Function Permission to OWNER Role');
        
        try {
            console.log('📋 Step 2: Add bytes4(0) function permission to OWNER role');
            console.log('   Role: OWNER_ROLE');
            console.log('   Function Selector: 0x00000000');
            console.log('   Permissions: SIGN_META_REQUEST_AND_APPROVE, EXECUTE_META_REQUEST_AND_APPROVE');
            
            // Get owner role hash
            this.ownerRoleHash = this.getRoleHash('OWNER_ROLE');
            console.log(`  📋 Owner role hash: ${this.ownerRoleHash}`);
            
            // Check if owner role exists
            const ownerRoleExists = await this.roleExists(this.ownerRoleHash);
            this.assertTest(ownerRoleExists, 'OWNER role exists');
            
            // Check if permission already exists
            console.log('  🔍 Checking if permission already exists...');
            const rolePermissions = await this.callContractMethod(
                this.contract.methods.getActiveRolePermissions(this.ownerRoleHash)
            );
            
            const existingPermission = rolePermissions.find(perm => 
                perm.functionSelector.toLowerCase() === this.ETH_TRANSFER_SELECTOR.toLowerCase()
            );
            
            if (existingPermission) {
                const grantedBitmap = parseInt(existingPermission.grantedActionsBitmap);
                const hasSign = (grantedBitmap & (1 << this.TxAction.SIGN_META_REQUEST_AND_APPROVE)) !== 0;
                const hasExecute = (grantedBitmap & (1 << this.TxAction.EXECUTE_META_REQUEST_AND_APPROVE)) !== 0;
                
                if (hasSign && hasExecute) {
                    console.log('  ⚠️  Permission already exists with required actions, skipping');
                    await this.passTest('Permission already exists', `Bitmap: ${grantedBitmap}`);
                    return;
                } else {
                    console.log('  ⚠️  Permission exists but missing required actions, will add...');
                }
            }
            
            // Get owner and broadcaster wallets
            const ownerPrivateKey = this.getRoleWallet('owner');
            const broadcasterWallet = this.getRoleWalletObject('broadcaster');
            
            // Add function permission with SIGN and EXECUTE for REQUEST_AND_APPROVE
            const actions = [
                this.TxAction.SIGN_META_REQUEST_AND_APPROVE,
                this.TxAction.EXECUTE_META_REQUEST_AND_APPROVE
            ];
            
            console.log('  📝 Adding function permission via RuntimeRBAC batch operation...');
            const receipt = await this.addFunctionToRole(
                this.ownerRoleHash,
                this.ETH_TRANSFER_SELECTOR,
                actions,
                ownerPrivateKey,
                broadcasterWallet
            );
            
            this.assertTest(receipt.status === true || receipt.status === 1, 'Add function permission transaction succeeded');
            
            // Verify permission was added
            console.log('  🔍 Verifying function permission...');
            const finalRolePermissions = await this.callContractMethod(
                this.contract.methods.getActiveRolePermissions(this.ownerRoleHash)
            );
            
            // Find the ETH_TRANSFER function permission
            const ethTransferPermission = finalRolePermissions.find(perm => 
                perm.functionSelector.toLowerCase() === this.ETH_TRANSFER_SELECTOR.toLowerCase()
            );
            
            this.assertTest(ethTransferPermission !== undefined, 'ETH_TRANSFER function permission exists in OWNER role');
            
            // Verify permission bitmap includes both required actions
            const grantedBitmap = parseInt(ethTransferPermission.grantedActionsBitmap);
            this.assertTest(
                (grantedBitmap & (1 << this.TxAction.SIGN_META_REQUEST_AND_APPROVE)) !== 0,
                'OWNER role has SIGN_META_REQUEST_AND_APPROVE permission'
            );
            this.assertTest(
                (grantedBitmap & (1 << this.TxAction.EXECUTE_META_REQUEST_AND_APPROVE)) !== 0,
                'OWNER role has EXECUTE_META_REQUEST_AND_APPROVE permission'
            );
            
            console.log('  ✅ Function permission added successfully');
            console.log(`     Granted Actions Bitmap: ${grantedBitmap}`);
            
            await this.passTest('Add function permission to OWNER role', `Bitmap: ${grantedBitmap}`);
            
        } catch (error) {
            await this.failTest('Add function permission to OWNER role', error);
            throw error;
        }
    }

    async testStep3DepositEthToContract() {
        await this.startTest('Deposit ETH to Contract');
        
        try {
            console.log('📋 Step 3: Deposit ETH from owner wallet to contract');
            
            // Get initial balances
            const initialContractBalance = await this.getContractBalance();
            const ownerWallet = this.getRoleWalletObject('owner');
            const initialOwnerBalance = await this.getWalletBalance(ownerWallet.address);
            
            console.log(`  📊 Initial Contract Balance: ${this.web3.utils.fromWei(initialContractBalance, 'ether')} ETH`);
            console.log(`  📊 Initial Owner Balance: ${this.web3.utils.fromWei(initialOwnerBalance, 'ether')} ETH`);
            
            // Deposit amount: 1 ETH
            const depositAmount = this.web3.utils.toWei('1', 'ether');
            console.log(`  💰 Deposit Amount: ${this.web3.utils.fromWei(depositAmount, 'ether')} ETH`);
            
            // Get owner and broadcaster wallets
            const ownerPrivateKey = this.getRoleWallet('owner');
            const broadcasterWallet = this.getRoleWalletObject('broadcaster');
            
            console.log('  📝 Executing ETH transfer via requestAndApproveExecution...');
            const receipt = await this.executeEthTransfer(
                this.contractAddress, // target: contract itself
                depositAmount,
                ownerPrivateKey,
                broadcasterWallet
            );
            
            this.assertTest(receipt.status === true || receipt.status === 1, 'ETH deposit transaction succeeded');
            
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
