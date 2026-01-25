/**
 * Master Test Runner for Sanity SDK Tests
 * Runs core tests (secure-ownable, runtime-rbac, guard-controller) and optionally example tests
 */

import { spawn } from 'child_process';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface TestConfig {
  [key: string]: string;
}

class SanitySDKTestRunner {
  private coreTests: TestConfig = {
    'secure-ownable': resolve(__dirname, 'secure-ownable', 'run-tests.ts'),
    'runtime-rbac': resolve(__dirname, 'runtime-rbac', 'run-tests.ts'),
    'guard-controller': resolve(__dirname, 'guard-controller', 'run-tests.ts')
  };

  private exampleTests: TestConfig = {
    'workflow': resolve(__dirname, 'workflow', 'run-tests.ts')
  };

  private results = {
    total: 0,
    passed: 0,
    failed: 0,
    startTime: null as number | null,
    endTime: null as number | null
  };

  printUsage(): void {
    console.log('🧪 Sanity SDK Test Master Runner');
    console.log('='.repeat(60));
    console.log('Usage: tsx run-all-tests.ts [options]');
    console.log();
    console.log('Options:');
    console.log('  --all                    Run all tests (core + examples)');
    console.log('  --core                   Run core tests only (default)');
    console.log('  --examples               Run example tests only');
    console.log('  --secure-ownable         Run secure-ownable tests only');
    console.log('  --runtime-rbac           Run runtime-rbac tests only');
    console.log('  --guard-controller       Run guard-controller tests only');
    console.log('  --workflow               Run workflow tests only');
    console.log('  --help                   Show this help message');
    console.log();
    console.log('Examples:');
    console.log('  tsx run-all-tests.ts                    # Run core tests (default)');
    console.log('  tsx run-all-tests.ts --all              # Run all tests');
    console.log('  tsx run-all-tests.ts --examples         # Run example tests only');
    console.log('  tsx run-all-tests.ts --secure-ownable   # Run single test suite');
    console.log();
  }

  async runTest(testName: string, testPath: string): Promise<boolean> {
    return new Promise((resolve) => {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`🚀 Running ${testName} tests...`);
      console.log('='.repeat(60));

      const startTime = Date.now();
      // testPath is already absolute from constructor, but ensure it's properly resolved
      const absolutePath = resolve(testPath);
      // Use shell: true on Windows to handle paths with spaces properly
      const isWindows = process.platform === 'win32';
      const child = spawn('npx', ['tsx', '--tsconfig', join(__dirname, 'tsconfig.json'), absolutePath, '--all'], {
        stdio: 'inherit',
        shell: isWindows,
        cwd: process.cwd()
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

  async runTests(testsToRun: TestConfig): Promise<void> {
    this.results.startTime = Date.now();
    console.log('\n🧪 Starting Sanity SDK Test Suite');
    console.log(`📋 Running ${Object.keys(testsToRun).length} test suite(s)\n`);

    for (const [testName, testPath] of Object.entries(testsToRun)) {
      await this.runTest(testName, testPath);
    }

    this.results.endTime = Date.now();
    this.printSummary();
  }

  printSummary(): void {
    const duration = ((this.results.endTime! - this.results.startTime!) / 1000).toFixed(2);

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

  parseArgs(): TestConfig {
    const args = process.argv.slice(2);

    if (args.includes('--help') || args.includes('-h')) {
      this.printUsage();
      process.exit(0);
    }

    const testsToRun: TestConfig = {};

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

  async main(): Promise<void> {
    const testsToRun = this.parseArgs();

    if (Object.keys(testsToRun).length === 0) {
      console.log('⚠️  No tests selected. Use --help for usage information.');
      process.exit(1);
    }

    await this.runTests(testsToRun);
  }
}

// Run if called directly
// For ES modules, always run when this file is executed
const runner = new SanitySDKTestRunner();
runner.main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});

export default SanitySDKTestRunner;
