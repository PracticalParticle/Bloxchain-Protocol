/**
 * CopyBlox Test Runner
 * Runs CopyBlox sanity tests (clone AccountBlox and verify)
 */

const CloneAccountBloxTests = require('./clone-account-blox-tests.cjs');

class CopyBloxTestRunner {
    constructor() {
        this.testSuites = {
            'clone-account-blox': CloneAccountBloxTests
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
        console.log('🔧 CopyBlox Test Runner');
        console.log('='.repeat(50));
        console.log('Usage: node run-tests.cjs [options]');
        console.log();
        console.log('Options:');
        console.log('  --all                    Run all test suites');
        console.log('  --clone-account-blox     Run clone AccountBlox tests only');
        console.log('  --help                   Show this help message');
        console.log();
        console.log('Examples:');
        console.log('  node run-tests.cjs --all');
        console.log('  node run-tests.cjs --clone-account-blox');
        console.log();
        console.log('Environment Variables:');
        console.log('  TEST_MODE=auto|manual    Test mode (default: manual)');
        console.log('  COPYBLOX_ADDRESS         CopyBlox contract (manual mode)');
        console.log('  ACCOUNTBLOX_ADDRESS     AccountBlox to clone (manual mode)');
        console.log('  OWNER_PRIVATE_KEY       Owner key for clone roles (manual mode)');
        console.log('  BROADCASTER_PRIVATE_KEY Broadcaster key (manual mode)');
        console.log('  RECOVERY_PRIVATE_KEY    Recovery key (manual mode)');
        console.log('  Or TEST_WALLET_1/2/3_PRIVATE_KEY as fallback');
        console.log();
    }

    async runTestSuite(suiteName, TestClass) {
        console.log(`\n🚀 Running ${suiteName} tests...`);
        console.log('═'.repeat(60));

        const testSuite = new TestClass();
        await testSuite.runTests();
        // BaseCopyBloxTest.runTests() catches errors internally and never re-throws; check testResults
        const failedTests = testSuite.testResults?.failedTests ?? 0;
        if (failedTests > 0) {
            this.results.failedSuites++;
            console.error(`❌ ${suiteName} tests failed (${failedTests} failed test(s))`);
        } else {
            this.results.passedSuites++;
            console.log(`✅ ${suiteName} tests completed successfully`);
        }
    }

    async runAllTests() {
        console.log('🚀 Running ALL CopyBlox test suites...');
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
                this.results.totalSuites++;
                this.results.failedSuites++;
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
            const requestedSuites = args
                .filter(arg => arg !== '--help')
                .map(arg => arg.replace(/^--/, ''))
                .filter(Boolean);
            if (requestedSuites.length > 0) {
                await this.runSpecificTests(requestedSuites);
            } else {
                console.log('❌ No test suites specified');
                this.printUsage();
            }
        }
    }
}

if (require.main === module) {
    const runner = new CopyBloxTestRunner();
    runner.run()
        .then(() => {
            process.exit(runner.results.failedSuites > 0 ? 1 : 0);
        })
        .catch(error => {
            console.error('❌ Test runner failed:', error);
            process.exit(1);
        });
}

module.exports = CopyBloxTestRunner;
