/**
 * Master Test Runner for Sanity SDK Tests
 * Runs core tests (secure-ownable, runtime-rbac, guard-controller) and optionally example tests
 */

import { spawn, exec } from 'child_process';
import fs from 'fs';
import { join, resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { promisify } from 'util';
import { createPublicClient, http } from 'viem';
import type { Address } from 'viem';
import { getTestConfig } from './base/test-config.ts';

const execAsync = promisify(exec);

// ES module equivalent of __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface TestConfig {
  [key: string]: string;
}

class SanitySDKTestRunner {
  /** Core test order: run secure-ownable, then runtime-rbac, and guard-controller last. */
  private coreTests: TestConfig = {
    'secure-ownable': resolve(__dirname, 'secure-ownable', 'run-tests.ts'),
    'runtime-rbac': resolve(__dirname, 'runtime-rbac', 'run-tests.ts'),
    'guard-controller': resolve(__dirname, 'guard-controller', 'run-tests.ts')
  };

  private exampleTests: TestConfig = {};

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
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🚀 Running ${testName} tests...`);
    console.log('='.repeat(60));

    const startTime = Date.now();
    const absolutePath = resolve(testPath);
    const tsconfigPath = join(__dirname, 'tsconfig.json');
    
    // Use exec for better Windows compatibility with shell commands
    // Quote paths to handle spaces correctly
    const quotedTsconfig = `"${tsconfigPath}"`;
    const quotedPath = `"${absolutePath}"`;
    const command = `npx tsx --tsconfig ${quotedTsconfig} ${quotedPath} --all`;
    
    try {
      const { stdout, stderr } = await execAsync(command, {
        cwd: process.cwd(),
        env: { ...process.env },
        maxBuffer: 10 * 1024 * 1024 // 10MB buffer
      });
      
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      const durationNum = parseFloat(duration);
      this.results.total++;
      
      // Check if process exited too quickly
      if (durationNum < 0.1) {
        console.error(`\n⚠️  ${testName} tests exited too quickly (${duration}s) - tests may not have run`);
        if (stderr) {
          console.error(`   Stderr: ${stderr}`);
        }
        this.results.failed++;
        return false;
      }
      
      // Check stderr for actual errors (ignore dotenv messages)
      if (stderr && !stderr.includes('injecting env') && !stderr.trim().match(/^\[dotenv@[\d.]+\]/)) {
        console.error(`\n⚠️  ${testName} tests produced warnings:`, stderr);
      }
      
      console.log(`\n✅ ${testName} tests passed (${duration}s)`);
      this.results.passed++;
      return true;
    } catch (error: any) {
      const duration = ((Date.now() - startTime) / 1000).toFixed(2);
      this.results.total++;
      this.results.failed++;
      console.error(`\n❌ ${testName} tests failed (${duration}s)`);
      if (error.message) {
        console.error(`   Error: ${error.message}`);
      }
      // Print child stdout so we see the suite's own assertions and revert reasons
      if (error.stdout && String(error.stdout).trim()) {
        console.error('\n--- Failed suite output (stdout) ---');
        console.error(String(error.stdout).trim());
        console.error('--- End failed suite output ---\n');
      }
      if (error.stderr && String(error.stderr).trim()) {
        const stderr = String(error.stderr).trim();
        if (!stderr.includes('injecting env') && !stderr.match(/^\[dotenv@[\d.]+\]/)) {
          console.error('   Stderr:', stderr);
        }
      }
      return false;
    }
  }

  async runTests(testsToRun: TestConfig): Promise<void> {
    this.results.startTime = Date.now();
    console.log('\n🧪 Starting Sanity SDK Test Suite');
    console.log(`📋 Running ${Object.keys(testsToRun).length} test suite(s)\n`);

    for (const [testName, testPath] of Object.entries(testsToRun)) {
      await this.runTest(testName, testPath);
    }

    this.results.endTime = Date.now();
    await this.printSummary(testsToRun);
  }

  async printSummary(testsToRun: TestConfig): Promise<void> {
    const duration = ((this.results.endTime! - this.results.startTime!) / 1000).toFixed(2);

    console.log('\n' + '='.repeat(60));
    console.log('📊 Test Summary');
    console.log('='.repeat(60));
    console.log(`Total Test Suites: ${this.results.total}`);
    console.log(`✅ Passed: ${this.results.passed}`);
    console.log(`❌ Failed: ${this.results.failed}`);
    console.log(`⏱️  Duration: ${duration}s`);
    console.log('='.repeat(60));

    const allPassed = this.results.failed === 0;

    if (allPassed) {
      console.log('\n🎉 All tests passed!');
    } else {
      console.log('\n⚠️  Some tests failed. Please review the output above.');
    }

    // Post-sanity system state summary (only when all tests passed)
    try {
      await this.printPostSanitySystemStateSummary(testsToRun);
    } catch (e: any) {
      console.warn(
        `\n⚠️  Post-sanity system state summary failed: ${e?.message ?? String(e)}`
      );
    }

    process.exit(allPassed ? 0 : 1);
  }

  /**
   * Print a concise, top-level system state summary after sanity tests.
   * Shows core contract addresses and BASIC token state for the current network.
   */
  private async printPostSanitySystemStateSummary(testsToRun: TestConfig): Promise<void> {
    // Only run when guard-controller suite ran (core flow), so we know AccountBlox / BasicERC20 are deployed.
    const ranGuardController = Object.keys(testsToRun).includes('guard-controller');
    if (!ranGuardController) return;

    console.log('\n' + '='.repeat(60));
    console.log('📊 Post-Sanity System State Summary');
    console.log('='.repeat(60));

    const config = getTestConfig();
    const rpcUrl = config.rpcUrl;
    const network = process.env.NETWORK_NAME || 'development';

    console.log(`Network: ${network}`);
    console.log(`RPC URL: ${rpcUrl}`);

    // Load deployed-addresses.json
    const addressesPath = resolve(__dirname, '../../deployed-addresses.json');
    if (!fs.existsSync(addressesPath)) {
      console.log('⚠️  deployed-addresses.json not found; skipping address/state summary');
      return;
    }

    const raw = fs.readFileSync(addressesPath, 'utf8');
    const json = JSON.parse(raw) as any;
    const netInfo = json[network];
    if (!netInfo) {
      console.log(`⚠️  No deployed-addresses entry for network "${network}"`);
      return;
    }

    const engineBlox = netInfo.EngineBlox?.address as Address | undefined;
    const accountBlox = netInfo.AccountBlox?.address as Address | undefined;
    const basicErc20 = netInfo.BasicERC20?.address as Address | undefined;

    console.log('Contracts:');
    console.log(`  EngineBlox:   ${engineBlox ?? 'n/a'}`);
    console.log(`  AccountBlox:  ${accountBlox ?? 'n/a'}`);
    console.log(`  BasicERC20:   ${basicErc20 ?? 'n/a'}`);

    if (!basicErc20 || !accountBlox) {
      console.log('⚠️  BasicERC20 or AccountBlox address missing; skipping token state summary');
      return;
    }

    // Minimal ERC20 read ABI (balanceOf, totalSupply)
    const ERC20_READ_ABI = [
      {
        name: 'balanceOf',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'account', type: 'address' }],
        outputs: [{ type: 'uint256' }],
      },
      {
        name: 'totalSupply',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ type: 'uint256' }],
      },
    ] as const;

    try {
      const transport = http(rpcUrl, {
        timeout: config.rpcTimeoutMs ?? 30_000,
      });
      const publicClient: any = createPublicClient({ transport });

      const totalSupply: bigint = await publicClient.readContract({
        address: basicErc20,
        abi: ERC20_READ_ABI as any,
        functionName: 'totalSupply',
      });
      const accountBloxBalance: bigint = await publicClient.readContract({
        address: basicErc20,
        abi: ERC20_READ_ABI as any,
        functionName: 'balanceOf',
        args: [accountBlox],
      });

      console.log('\nBASIC Token State (on-chain):');
      console.log(`  totalSupply:         ${totalSupply.toString()}`);
      console.log(`  AccountBlox balance: ${accountBloxBalance.toString()}`);
    } catch (e: any) {
      console.log(
        `⚠️  Failed to read BASIC token state from chain: ${e?.message ?? String(e)}`
      );
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
