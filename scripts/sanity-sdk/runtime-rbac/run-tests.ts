/**
 * RuntimeRBAC SDK Test Runner
 * Main file to run all RuntimeRBAC SDK tests
 */

import { pathToFileURL } from 'url';
import { RuntimeRBACTests } from './rbac-tests.ts';

class RuntimeRBACSDKTestRunner {
  private results = {
    totalSuites: 0,
    passedSuites: 0,
    failedSuites: 0,
    startTime: null as number | null,
    endTime: null as number | null,
  };

  printUsage(): void {
    console.log('🔧 RuntimeRBAC SDK Test Runner');
    console.log('='.repeat(50));
    console.log('Usage: ts-node run-tests.ts [options]');
    console.log();
    console.log('Options:');
    console.log('  --all                    Run all test suites');
    console.log('  --rbac                    Run RBAC functionality tests');
    console.log('  --help                    Show this help message');
    console.log();
    console.log('Examples:');
    console.log('  ts-node run-tests.ts --all');
    console.log('  ts-node run-tests.ts --rbac');
    console.log();
  }

  parseArguments(): string[] | null {
    const args = process.argv.slice(2);

    if (args.length === 0 || args.includes('--help')) {
      this.printUsage();
      return null;
    }

    const selectedSuites: string[] = [];

    if (args.includes('--all')) {
      selectedSuites.push('rbac');
    } else {
      if (args.includes('--rbac')) selectedSuites.push('rbac');
    }

    if (selectedSuites.length === 0) {
      console.log('❌ No test suites selected. Use --help for usage information.');
      return null;
    }

    return selectedSuites;
  }

  async runTestSuite(suiteName: string): Promise<boolean> {
    console.log(`\n🚀 Running ${suiteName} test suite...`);
    console.log('='.repeat(60));

    try {
      // Add timeout protection (10 minutes per test suite)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Test suite '${suiteName}' timed out after 10 minutes`));
        }, 10 * 60 * 1000);
      });

      const testPromise = (async () => {
        const testInstance = new RuntimeRBACTests();
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

    console.log('🔧 RuntimeRBAC SDK Test Runner Starting...');
    console.log('='.repeat(60));
    console.log(`📋 Selected test suites: ${selectedSuites.join(', ')}`);
    console.log(`📊 Total suites to run: ${this.results.totalSuites}`);
    console.log();

    const suiteResults: Record<string, boolean> = {};

    for (const suiteName of selectedSuites) {
      if (suiteName === 'rbac') {
        const success = await this.runTestSuite('RBAC Functionality');
        suiteResults['rbac'] = success;
      } else {
        console.log(`❌ Unknown test suite: ${suiteName}`);
        continue;
      }

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
    console.log('📊 RUNTIMERBAC SDK TEST RUNNER FINAL RESULTS');
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
      console.log('🚀 RuntimeRBAC SDK is working perfectly!');
    } else {
      console.log('⚠️  SOME TEST SUITES FAILED');
      console.log('🔍 Please review the output above for details');
    }

    console.log('='.repeat(80));
  }

  async run(): Promise<void> {
    const selectedSuites = this.parseArguments();

    if (!selectedSuites) {
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

// Run the test runner if this file is executed directly
// Check if this module is being run directly (not imported)
const isExecutedDirectly = import.meta.url === pathToFileURL(process.argv[1]).href;
if (isExecutedDirectly) {
  const runner = new RuntimeRBACSDKTestRunner();
  runner.run();
}

export { RuntimeRBACSDKTestRunner };
