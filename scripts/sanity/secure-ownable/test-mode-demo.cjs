/**
 * Test Mode Demo Script
 * Demonstrates the new TEST_MODE functionality in BaseSecureOwnableTest
 */

const BaseSecureOwnableTest = require('./base-test.cjs');

class TestModeDemo extends BaseSecureOwnableTest {
    constructor() {
        super('Test Mode Demo');
    }

    async executeTests() {
        console.log('🧪 TESTING TEST MODE FUNCTIONALITY');
        console.log('='.repeat(50));

        // Test 1: Verify test mode detection
        this.assertTest(
            this.testMode === 'auto' || this.testMode === 'manual',
            `Test mode correctly detected: ${this.testMode}`
        );

        // Test 2: Verify contract address is set
        this.assertTest(
            this.contractAddress && this.contractAddress !== '0x0000000000000000000000000000000000000000',
            `Contract address is set: ${this.contractAddress}`
        );

        // Test 3: Verify wallets are initialized
        this.assertTest(
            Object.keys(this.wallets).length >= 5,
            `Wallets initialized: ${Object.keys(this.wallets).length} wallets`
        );

        // Test 4: Verify contract instance is created
        this.assertTest(
            this.contract !== null,
            'Contract instance created successfully'
        );

        // Test 5: Verify EIP712 signer is initialized
        this.assertTest(
            this.eip712Signer !== null,
            'EIP712 signer initialized successfully'
        );

        // Test 6: Display wallet information
        console.log('\n📋 WALLET INFORMATION:');
        for (const [walletName, wallet] of Object.entries(this.wallets)) {
            console.log(`  ${walletName}: ${wallet.address}`);
        }

        // Test 7: Display role assignments
        console.log('\n👑 ROLE ASSIGNMENTS:');
        console.log(`  Owner: ${this.roles.owner}`);
        console.log(`  Broadcaster: ${this.roles.broadcaster}`);
        console.log(`  Recovery: ${this.roles.recovery}`);

        // Test 8: Test contract connection
        try {
            const owner = await this.contract.methods.owner().call();
            this.assertTest(
                owner === this.roles.owner,
                `Contract connection verified - Owner matches: ${owner}`
            );
        } catch (error) {
            this.assertTest(false, `Contract connection failed: ${error.message}`);
        }

        console.log('\n✅ All test mode functionality verified!');
    }
}

// Run the demo
async function runDemo() {
    const demo = new TestModeDemo();
    const success = await demo.runTest();
    
    if (success) {
        console.log('\n🎉 Test Mode Demo completed successfully!');
        console.log('\n📋 NEXT STEPS:');
        console.log('1. Try switching TEST_MODE between "auto" and "manual" in your .env file');
        console.log('2. For auto mode: Start Ganache and run "npm run deploy:truffle"');
        console.log('3. For manual mode: Update contract addresses and private keys in .env');
        console.log('4. Run other sanity tests to verify full functionality');
    } else {
        console.log('\n❌ Test Mode Demo failed. Check the output above for details.');
        process.exit(1);
    }
}

// Run if called directly
if (require.main === module) {
    runDemo().catch(error => {
        console.error('❌ Demo failed:', error.message);
        process.exit(1);
    });
}

module.exports = TestModeDemo;
