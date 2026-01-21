/**
 * SimpleVault Test Runner
 * Main file to run all or selective tests of the SimpleVault contract
 */

const SimpleVaultWithdrawalTests = require('./withdrawal-tests.cjs');

class SimpleVaultTestRunner {
    constructor() {
        this.testSuites = {
            'withdrawal': SimpleVaultWithdrawalTests,  // Test withdrawal functionality
        };
        
        this.results = {
            totalSuites: 0,
            passedSuites: 0,
            failedSuites: 0,
            startTime: null,
            endTime: null
        };
    }

    printUsage() {
        console.log('🔧 SimpleVault Test Runner');
        console.log('='.repeat(50));
        console.log('Usage: node run-tests.js [options]');
        console.log();
        console.log('Options:');
        console.log('  --all                    Run all test suites');
        console.log('  --withdrawal             Run withdrawal tests only');
        console.log('  --help                   Show this help message');
        console.log();
        console.log('Examples:');
        console.log('  node run-tests.js --all');
        console.log('  node run-tests.js --withdrawal');
        console.log();
        console.log('Environment Variables:');
        console.log('  TEST_MODE=auto|manual    Test mode (default: manual)');
        console.log('  SIMPLE_VAULT_ADDRESS     Contract address (manual mode)');
        console.log('  OWNER_PRIVATE_KEY        Owner private key (manual mode)');
        console.log('  BROADCASTER_PRIVATE_KEY  Broadcaster private key (manual mode)');
        console.log('  RECOVERY_PRIVATE_KEY     Recovery private key (manual mode)');
        console.log();
    }

    async runTestSuite(suiteName, TestClass) {
        console.log(`\n🚀 Running ${suiteName} tests...`);
        console.log('═'.repeat(60));
        
        try {
            const testSuite = new TestClass();
            await testSuite.runTests();
            
            this.results.passedSuites++;
            console.log(`✅ ${suiteName} tests completed successfully`);
            
        } catch (error) {
            this.results.failedSuites++;
            console.error(`❌ ${suiteName} tests failed:`, error.message);
        }
    }

    async runAllTests() {
        console.log('🚀 Running ALL SimpleVault test suites...');
        console.log('═'.repeat(60));
        
        this.results.startTime = Date.now();
        
        for (const [suiteName, TestClass] of Object.entries(this.testSuites)) {
            this.results.totalSuites++;
            await this.runTestSuite(suiteName, TestClass);
        }
        
        this.results.endTime = Date.now();
        this.printResults();
    }

    async runSpecificTests(requestedSuites) {
        console.log(`🚀 Running specific test suites: ${requestedSuites.join(', ')}`);
        console.log('═'.repeat(60));
        
        this.results.startTime = Date.now();
        
        for (const suiteName of requestedSuites) {
            if (this.testSuites[suiteName]) {
                this.results.totalSuites++;
                await this.runTestSuite(suiteName, this.testSuites[suiteName]);
            } else {
                console.error(`❌ Unknown test suite: ${suiteName}`);
                console.log(`Available suites: ${Object.keys(this.testSuites).join(', ')}`);
            }
        }
        
        this.results.endTime = Date.now();
        this.printResults();
    }

    printResults() {
        console.log('\n📊 Overall Test Results');
        console.log('═'.repeat(60));
        console.log(`Total Test Suites: ${this.results.totalSuites}`);
        console.log(`Passed Suites: ${this.results.passedSuites}`);
        console.log(`Failed Suites: ${this.results.failedSuites}`);
        
        if (this.results.totalSuites > 0) {
            const successRate = (this.results.passedSuites / this.results.totalSuites) * 100;
            console.log(`Success Rate: ${successRate.toFixed(1)}%`);
        }
        
        if (this.results.startTime && this.results.endTime) {
            const duration = (this.results.endTime - this.results.startTime) / 1000;
            console.log(`Total Duration: ${duration.toFixed(2)} seconds`);
        }
        
        console.log('═'.repeat(60));
        
        if (this.results.failedSuites === 0) {
            console.log('🎉 All test suites passed successfully!');
        } else {
            console.log('⚠️  Some test suites failed. Check the logs above for details.');
        }
    }

    async run() {
        const args = process.argv.slice(2);
        
        if (args.length === 0 || args.includes('--help')) {
            this.printUsage();
            return;
        }
        
        if (args.includes('--all')) {
            await this.runAllTests();
        } else {
            const requestedSuites = args.filter(arg => !arg.startsWith('--'));
            if (requestedSuites.length > 0) {
                await this.runSpecificTests(requestedSuites);
            } else {
                console.log('❌ No test suites specified');
                this.printUsage();
            }
        }
    }
}

// Run the test runner if this file is executed directly
if (require.main === module) {
    const runner = new SimpleVaultTestRunner();
    runner.run().catch(error => {
        console.error('❌ Test runner failed:', error);
        process.exit(1);
    });
}

module.exports = SimpleVaultTestRunner;
