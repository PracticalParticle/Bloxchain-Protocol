/**
 * Master Test Runner for Sanity Tests
 * Runs core tests (secure-ownable, runtime-rbac, guard-controller) and optionally example tests
 */

const { spawn } = require('child_process');
const path = require('path');

class SanityTestRunner {
    constructor() {
        // Use path.resolve to ensure absolute paths that work with spaces
        this.coreTests = {
            'secure-ownable': path.resolve(__dirname, 'secure-ownable', 'run-tests.cjs'),
            'runtime-rbac': path.resolve(__dirname, 'runtime-rbac', 'run-tests.cjs'),
            'guard-controller': path.resolve(__dirname, 'guard-controller', 'run-tests.cjs')
        };
        
        this.exampleTests = {
            'simple-vault': path.resolve(__dirname, 'simple-vault', 'run-tests.cjs'),
            'simple-rwa20': path.resolve(__dirname, 'simple-rwa20', 'run-tests.cjs')
        };
        
        this.results = {
            total: 0,
            passed: 0,
            failed: 0,
            startTime: null,
            endTime: null
        };
    }

    printUsage() {
        console.log('🧪 Sanity Test Master Runner');
        console.log('='.repeat(60));
        console.log('Usage: node run-all-tests.cjs [options]');
        console.log();
        console.log('Options:');
        console.log('  --all                    Run all tests (core + examples)');
        console.log('  --core                   Run core tests only (default)');
        console.log('  --examples               Run example tests only');
        console.log('  --secure-ownable         Run secure-ownable tests only');
        console.log('  --runtime-rbac           Run runtime-rbac tests only');
        console.log('  --guard-controller       Run guard-controller tests only');
        console.log('  --simple-vault           Run simple-vault tests only');
        console.log('  --simple-rwa20           Run simple-rwa20 tests only');
        console.log('  --help                   Show this help message');
        console.log();
        console.log('Examples:');
        console.log('  node run-all-tests.cjs                    # Run core tests (default)');
        console.log('  node run-all-tests.cjs --all              # Run all tests');
        console.log('  node run-all-tests.cjs --examples         # Run example tests only');
        console.log('  node run-all-tests.cjs --secure-ownable   # Run single test suite');
        console.log();
    }

    async runTest(testName, testPath) {
        return new Promise((resolve) => {
            console.log(`\n${'='.repeat(60)}`);
            console.log(`🚀 Running ${testName} tests...`);
            console.log('='.repeat(60));
            
            const startTime = Date.now();
            // testPath is already absolute from constructor, but ensure it's properly resolved
            const absolutePath = path.resolve(testPath);
            // Use shell: false to avoid path issues, but quote the path for safety
            const child = spawn('node', [absolutePath, '--all'], {
                stdio: 'inherit',
                shell: false
            });

            child.on('close', (code) => {
                const duration = ((Date.now() - startTime) / 1000).toFixed(2);
                this.results.total++;
                
                if (code === 0) {
                    console.log(`\n✅ ${testName} tests passed (${duration}s)`);
                    this.results.passed++;
                    resolve(true);
                } else {
                    console.log(`\n❌ ${testName} tests failed (${duration}s)`);
                    this.results.failed++;
                    resolve(false);
                }
            });

            child.on('error', (error) => {
                console.error(`\n❌ Error running ${testName} tests:`, error.message);
                this.results.total++;
                this.results.failed++;
                resolve(false);
            });
        });
    }

    async runTests(testsToRun) {
        this.results.startTime = Date.now();
        console.log('\n🧪 Starting Sanity Test Suite');
        console.log(`📋 Running ${Object.keys(testsToRun).length} test suite(s)\n`);

        for (const [testName, testPath] of Object.entries(testsToRun)) {
            await this.runTest(testName, testPath);
        }

        this.results.endTime = Date.now();
        this.printSummary();
    }

    printSummary() {
        const duration = ((this.results.endTime - this.results.startTime) / 1000).toFixed(2);
        
        console.log('\n' + '='.repeat(60));
        console.log('📊 Test Summary');
        console.log('='.repeat(60));
        console.log(`Total Test Suites: ${this.results.total}`);
        console.log(`✅ Passed: ${this.results.passed}`);
        console.log(`❌ Failed: ${this.results.failed}`);
        console.log(`⏱️  Duration: ${duration}s`);
        console.log('='.repeat(60));
        
        if (this.results.failed === 0) {
            console.log('\n🎉 All tests passed!');
            process.exit(0);
        } else {
            console.log('\n⚠️  Some tests failed. Please review the output above.');
            process.exit(1);
        }
    }

    parseArgs() {
        const args = process.argv.slice(2);
        
        if (args.includes('--help') || args.includes('-h')) {
            this.printUsage();
            process.exit(0);
        }

        const testsToRun = {};
        
        if (args.includes('--all')) {
            // Run everything
            Object.assign(testsToRun, this.coreTests, this.exampleTests);
        } else if (args.includes('--core')) {
            // Run core tests only
            Object.assign(testsToRun, this.coreTests);
        } else if (args.includes('--examples')) {
            // Run example tests only
            Object.assign(testsToRun, this.exampleTests);
        } else {
            // Run specific tests or default to core
            const allTests = { ...this.coreTests, ...this.exampleTests };
            let hasSpecificTests = false;
            
            for (const [testName, testPath] of Object.entries(allTests)) {
                const flag = `--${testName.replace(/_/g, '-')}`;
                if (args.includes(flag)) {
                    testsToRun[testName] = testPath;
                    hasSpecificTests = true;
                }
            }
            
            // If no specific tests requested, default to core
            if (!hasSpecificTests) {
                Object.assign(testsToRun, this.coreTests);
            }
        }

        return testsToRun;
    }

    async main() {
        const testsToRun = this.parseArgs();
        
        if (Object.keys(testsToRun).length === 0) {
            console.log('⚠️  No tests selected. Use --help for usage information.');
            process.exit(1);
        }

        await this.runTests(testsToRun);
    }
}

// Run if called directly
if (require.main === module) {
    const runner = new SanityTestRunner();
    runner.main().catch((error) => {
        console.error('❌ Fatal error:', error);
        process.exit(1);
    });
}

module.exports = SanityTestRunner;
