/**
 * SecureOwnable SDK Test Runner
 * Main file to run all or selective tests of the SecureOwnable SDK
 */

import { OwnershipTransferTests } from './ownership-transfer-tests.ts';
import { BroadcasterUpdateTests } from './broadcaster-update-tests.ts';
import { RecoveryUpdateTests } from './recovery-update-tests.ts';
import { TimelockPeriodTests } from './timelock-period-tests.ts';
import { EIP712SigningTests } from './eip712-signing-tests.ts';

type TestClass = typeof OwnershipTransferTests | typeof BroadcasterUpdateTests | typeof RecoveryUpdateTests | typeof TimelockPeriodTests | typeof EIP712SigningTests;

class SecureOwnableSDKTestRunner {
  private testSuites: Record<string, TestClass> = {
    ownership: OwnershipTransferTests,
    broadcaster: BroadcasterUpdateTests,
    recovery: RecoveryUpdateTests,
    timelock: TimelockPeriodTests,
    eip712: EIP712SigningTests,
  };

  private results = {
    totalSuites: 0,
    passedSuites: 0,
    failedSuites: 0,
    startTime: null as number | null,
    endTime: null as number | null,
  };

  printUsage(): void {
    console.log('🔧 SecureOwnable SDK Test Runner');
    console.log('='.repeat(50));
    console.log('Usage: ts-node run-tests.ts [options]');
    console.log();
    console.log('Options:');
    console.log('  --all                    Run all test suites (recommended order)');
    console.log('  --ownership              Run ownership transfer tests only');
    console.log('  --broadcaster           Run broadcaster update tests only');
    console.log('  --recovery              Run recovery update tests only');
    console.log('  --timelock              Run timelock period tests only');
    console.log('  --eip712                Run EIP-712 signing tests only');
    console.log('  --help                   Show this help message');
    console.log();
    console.log('Examples:');
    console.log('  ts-node run-tests.ts --all');
    console.log('  ts-node run-tests.ts --ownership');
    console.log('  ts-node run-tests.ts --broadcaster');
    console.log();
  }

  parseArguments(): string[] | null {
    const args = process.argv.slice(2);

    if (args.includes('--help')) {
      this.printUsage();
      return null;
    }

    const selectedSuites: string[] = [];

    // Default to --all if no arguments provided (for master runner compatibility)
    if (args.length === 0 || args.includes('--all')) {
      // Run all test suites in proper order (recovery first, then timelock, etc.)
      const orderedSuites = ['recovery', 'timelock', 'broadcaster', 'ownership', 'eip712'];
      selectedSuites.push(...orderedSuites);
    } else {
      if (args.includes('--ownership')) selectedSuites.push('ownership');
      if (args.includes('--broadcaster')) selectedSuites.push('broadcaster');
      if (args.includes('--recovery')) selectedSuites.push('recovery');
      if (args.includes('--timelock')) selectedSuites.push('timelock');
      if (args.includes('--eip712')) selectedSuites.push('eip712');
    }

    if (selectedSuites.length === 0) {
      console.log('❌ No test suites selected. Use --help for usage information.');
      return null;
    }

    return selectedSuites;
  }

  async runTestSuite(suiteName: string, TestClass: TestClass): Promise<boolean> {
    console.log(`\n🚀 Running ${suiteName} test suite...`);
    console.log('='.repeat(60));

    try {
      // Add timeout protection (5 minutes per test suite)
      const timeoutPromise = new Promise<never>((_, reject) => {
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
    } catch (error: any) {
      console.log(`💥 ${suiteName} test suite ERROR: ${error.message}`);
      this.results.failedSuites++;
      return false;
    }
  }

  async runTests(selectedSuites: string[]): Promise<boolean> {
    this.results.startTime = Date.now();
    this.results.totalSuites = selectedSuites.length;

    console.log('🔧 SecureOwnable SDK Test Runner Starting...');
    console.log('='.repeat(60));
    console.log(`📋 Selected test suites: ${selectedSuites.join(', ')}`);
    console.log(`📊 Total suites to run: ${this.results.totalSuites}`);
    console.log();

    const suiteResults: Record<string, boolean> = {};

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
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }
    }

    this.results.endTime = Date.now();
    this.printFinalResults(suiteResults);

    return this.results.failedSuites === 0;
  }

  printFinalResults(suiteResults: Record<string, boolean>): void {
    const duration =
      this.results.startTime && this.results.endTime
        ? this.results.endTime - this.results.startTime
        : 0;
    const successRate =
      this.results.totalSuites > 0
        ? ((this.results.passedSuites / this.results.totalSuites) * 100).toFixed(2)
        : '0.00';

    console.log('\n' + '='.repeat(80));
    console.log('📊 SECUREOWNABLE SDK TEST RUNNER FINAL RESULTS');
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
      console.log('🚀 SecureOwnable SDK is working perfectly!');
    } else {
      console.log('⚠️  SOME TEST SUITES FAILED');
      console.log('🔍 Please review the output above for details');
    }

    console.log('='.repeat(80));
  }

  async run(): Promise<void> {
    const selectedSuites = this.parseArguments();

    if (!selectedSuites) {
      // Only exit early for --help, otherwise this shouldn't happen
      process.exit(0);
      return;
    }

    try {
      const success = await this.runTests(selectedSuites);
      process.exit(success ? 0 : 1);
    } catch (error: any) {
      console.error('💥 Test runner error:', error.message);
      process.exit(1);
    }
  }
}

// Always run the test runner when this file is executed
// This ensures it works whether called directly or via spawn/tsx
const runner = new SecureOwnableSDKTestRunner();
runner.run();

export { SecureOwnableSDKTestRunner };

