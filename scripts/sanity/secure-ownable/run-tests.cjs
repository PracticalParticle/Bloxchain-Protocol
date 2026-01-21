/**
 * SecureOwnable Test Runner
 * Main file to run all or selective tests of the SecureOwnable contract
 */

const TimelockPeriodTests = require('./timelock-period-tests.cjs');
const RecoveryUpdateTests = require('./recovery-update-tests.cjs');
const BroadcasterUpdateTests = require('./broadcaster-update-tests.cjs');
const OwnershipTransferTests = require('./ownership-transfer-tests.cjs');
const EIP712SigningTests = require('./eip712-signing-tests.cjs');

class SecureOwnableTestRunner {
    constructor() {
        this.testSuites = {
            'timelock': TimelockPeriodTests,      // Foundation: Set 1-minute timelock
            'recovery': RecoveryUpdateTests,      // Change recovery to unused wallet
            'broadcaster': BroadcasterUpdateTests, // Test all broadcaster workflows
            'ownership': OwnershipTransferTests,   // Test all ownership workflows
            'eip712': EIP712SigningTests          // Independent EIP-712 tests
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
        console.log('🔧 SecureOwnable Test Runner');
        console.log('='.repeat(50));
        console.log('Usage: node run-tests.js [options]');
        console.log();
        console.log('Options:');
        console.log('  --all                    Run all test suites (recommended order)');
        console.log('  --timelock               Run timelock period tests only (foundation)');
        console.log('  --recovery               Run recovery update tests only');
        console.log('  --broadcaster            Run broadcaster update tests only');
        console.log('  --ownership              Run ownership transfer tests only');
        console.log('  --eip712                 Run EIP-712 signing tests only');
        console.log('  --help                   Show this help message');
        console.log();
        console.log('Examples:');
        console.log('  node run-tests.js --all');
        console.log('  node run-tests.js --timelock --recovery --broadcaster --ownership');
        console.log('  node run-tests.js --eip712');
        console.log();
    }

    parseArguments() {
        const args = process.argv.slice(2);
        
        if (args.length === 0 || args.includes('--help')) {
            this.printUsage();
            return null;
        }
        
        const selectedSuites = [];
        
        if (args.includes('--all')) {
            selectedSuites.push('timelock', 'recovery', 'broadcaster', 'ownership', 'eip712');
        } else {
            if (args.includes('--timelock')) selectedSuites.push('timelock');
            if (args.includes('--recovery')) selectedSuites.push('recovery');
            if (args.includes('--broadcaster')) selectedSuites.push('broadcaster');
            if (args.includes('--ownership')) selectedSuites.push('ownership');
            if (args.includes('--eip712')) selectedSuites.push('eip712');
        }
        
        if (selectedSuites.length === 0) {
            console.log('❌ No test suites selected. Use --help for usage information.');
            return null;
        }
        
        return selectedSuites;
    }

    async runTestSuite(suiteName, TestClass) {
        console.log(`\n🚀 Running ${suiteName} test suite...`);
        console.log('='.repeat(60));
        
        try {
            // Add timeout protection (5 minutes per test suite)
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => {
                    reject(new Error(`Test suite '${suiteName}' timed out after 5 minutes`));
                }, 5 * 60 * 1000);
            });
            
            const testPromise = (async () => {
                const testInstance = new TestClass();
                return await testInstance.runTest();
            })();
            
            const success = await Promise.race([testPromise, timeoutPromise]);
            
            if (success) {
                console.log(`✅ ${suiteName} test suite PASSED`);
                this.results.passedSuites++;
            } else {
                console.log(`❌ ${suiteName} test suite FAILED`);
                this.results.failedSuites++;
            }
            
            return success;
            
        } catch (error) {
            console.log(`💥 ${suiteName} test suite ERROR: ${error.message}`);
            this.results.failedSuites++;
            return false;
        }
    }

    async runTests(selectedSuites) {
        this.results.startTime = Date.now();
        this.results.totalSuites = selectedSuites.length;
        
        console.log('🔧 SecureOwnable Test Runner Starting...');
        console.log('='.repeat(60));
        console.log(`📋 Selected test suites: ${selectedSuites.join(', ')}`);
        console.log(`📊 Total suites to run: ${this.results.totalSuites}`);
        console.log();
        
        const suiteResults = {};
        
        for (const suiteName of selectedSuites) {
            const TestClass = this.testSuites[suiteName];
            if (!TestClass) {
                console.log(`❌ Unknown test suite: ${suiteName}`);
                continue;
            }
            
            const success = await this.runTestSuite(suiteName, TestClass);
            suiteResults[suiteName] = success;
            
            // Add a small delay between test suites
            if (selectedSuites.indexOf(suiteName) < selectedSuites.length - 1) {
                console.log('\n⏳ Waiting 2 seconds before next test suite...');
                await new Promise(resolve => setTimeout(resolve, 2000));
            }
        }
        
        this.results.endTime = Date.now();
        this.printFinalResults(suiteResults);
        
        return this.results.failedSuites === 0;
    }

    printFinalResults(suiteResults) {
        const duration = this.results.endTime - this.results.startTime;
        const successRate = ((this.results.passedSuites / this.results.totalSuites) * 100).toFixed(2);
        
        console.log('\n' + '='.repeat(80));
        console.log('📊 SECUREOWNABLE TEST RUNNER FINAL RESULTS');
        console.log('='.repeat(80));
        console.log(`📋 Total Test Suites: ${this.results.totalSuites}`);
        console.log(`✅ Passed Suites: ${this.results.passedSuites}`);
        console.log(`❌ Failed Suites: ${this.results.failedSuites}`);
        console.log(`📈 Success Rate: ${successRate}%`);
        console.log(`⏱️  Total Duration: ${(duration / 1000).toFixed(2)} seconds`);
        console.log();
        
        console.log('📋 Individual Suite Results:');
        console.log('-'.repeat(40));
        for (const [suiteName, success] of Object.entries(suiteResults)) {
            const status = success ? '✅ PASSED' : '❌ FAILED';
            console.log(`  ${suiteName.padEnd(15)} ${status}`);
        }
        
        console.log('='.repeat(80));
        
        if (this.results.failedSuites === 0) {
            console.log('🎉 ALL TEST SUITES PASSED SUCCESSFULLY!');
            console.log('🚀 SecureOwnable contract is working perfectly!');
        } else {
            console.log('⚠️  SOME TEST SUITES FAILED');
            console.log('🔍 Please review the output above for details');
        }
        
        console.log('='.repeat(80));
    }

    async run() {
        const selectedSuites = this.parseArguments();
        
        if (!selectedSuites) {
            return;
        }
        
        try {
            const success = await this.runTests(selectedSuites);
            process.exit(success ? 0 : 1);
        } catch (error) {
            console.error('💥 Test runner error:', error.message);
            process.exit(1);
        }
    }
}

// Run the test runner if this file is executed directly
if (require.main === module) {
    const runner = new SecureOwnableTestRunner();
    runner.run();
}

module.exports = SecureOwnableTestRunner;
