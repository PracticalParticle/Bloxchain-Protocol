/**
 * Base Test Class for SDK Tests
 * Provides common functionality for all SDK test sections
 */

import { Address, Hex, Account } from 'viem';
import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { TransactionResult } from '../../../sdk/typescript/interfaces/base.index';
import { getTestConfig, GANACHE_PRIVATE_KEYS } from './test-config';
import {
  getContractAddressFromArtifacts,
  advanceBlockchainTime,
  getOperationName,
  getStatusName,
} from './test-helpers';

export interface TestWallet {
  address: Address;
  account: Account;
  privateKey: Hex;
}

export interface TestResults {
  totalTests: number;
  passedTests: number;
  failedTests: number;
  startTime: number | null;
  endTime: number | null;
}

export abstract class BaseSDKTest {
  protected testName: string;
  protected config = getTestConfig();
  protected publicClient: any; // Use any to avoid Viem type inference issues
  protected chain: any; // Use any to avoid complex Chain type issues
  protected wallets: Record<string, TestWallet> = {};
  protected contractAddress: Address | null = null;
  protected testResults: TestResults = {
    totalTests: 0,
    passedTests: 0,
    failedTests: 0,
    startTime: null,
    endTime: null,
  };

  constructor(testName: string) {
    this.testName = testName;
    console.log(`🔧 Test Mode: ${this.config.testMode.toUpperCase()}`);

    // Simple chain definition (minimal object to avoid type issues)
    // Ensure chainId is a number, not NaN
    const chainId = Number(this.config.chainId) || 1337;
    this.chain = {
      id: chainId,
      name: 'local',
      nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
      rpcUrls: { default: { http: [this.config.rpcUrl] } }
    };
    console.log(`  📋 Chain ID: ${chainId}`);

    // Initialize public client (no chain needed in createPublicClient to avoid type issues)
    this.publicClient = createPublicClient({
      transport: http(this.config.rpcUrl),
    }) as any;
  }

  /**
   * Initialize test environment
   */
  async initialize(): Promise<void> {
    console.log(`🔧 Initializing ${this.testName}...`);

    if (this.config.testMode === 'auto') {
      await this.initializeAutoMode();
    } else {
      await this.initializeManualMode();
    }

    console.log(`✅ ${this.testName} initialized successfully\n`);
  }

  /**
   * Initialize in auto mode (fetch from Truffle artifacts and Ganache)
   */
  async initializeAutoMode(): Promise<void> {
    console.log('🤖 AUTO MODE: Fetching contract addresses and Ganache accounts...');

    try {
      // Get contract address from artifacts
      this.contractAddress = await this.getContractAddress();
      if (!this.contractAddress) {
        throw new Error('Could not find contract address in Truffle artifacts');
      }
      console.log(`📋 Contract Address: ${this.contractAddress}`);

      // Initialize Ganache wallets
      await this.initializeGanacheWallets();

      console.log('✅ Auto mode initialization completed');
    } catch (error: any) {
      console.error('❌ Auto mode initialization failed:', error.message);
      throw new Error(`Auto mode failed: ${error.message}`);
    }
  }

  /**
   * Initialize in manual mode (use provided addresses and keys)
   */
  async initializeManualMode(): Promise<void> {
    console.log('👤 MANUAL MODE: Using provided contract addresses and private keys...');

    try {
      // Get contract address from environment
      this.contractAddress = this.getContractAddressFromEnv();
      if (!this.contractAddress) {
        throw new Error('Contract address not set in environment variables');
      }
      console.log(`📋 Contract Address: ${this.contractAddress}`);

      // Initialize wallets from environment variables
      this.initializeWalletsFromEnv();

      console.log('✅ Manual mode initialization completed');
    } catch (error: any) {
      console.error('❌ Manual mode initialization failed:', error.message);
      throw new Error(`Manual mode failed: ${error.message}`);
    }
  }

  /**
   * Get contract address (to be implemented by subclasses)
   */
  protected abstract getContractAddress(): Promise<Address | null>;

  /**
   * Get contract address from environment (to be implemented by subclasses)
   */
  protected abstract getContractAddressFromEnv(): Address | null;

  /**
   * Initialize Ganache wallets
   */
  protected async initializeGanacheWallets(): Promise<void> {
    console.log('🔑 Initializing Ganache wallets...');

    try {
      // Verify connection by checking if we can read from the chain
      try {
        const blockNumber = await this.publicClient.getBlockNumber();
        console.log(`  📋 Connected to chain at block: ${blockNumber}`);
        
        // Verify test account exists by checking balance (like sanity tests verify accounts)
        const testAccount = privateKeyToAccount(GANACHE_PRIVATE_KEYS[0] as Hex);
        const balance = await this.publicClient.getBalance({ address: testAccount.address });
        console.log(`  📋 Verified test account balance: ${balance.toString()}`);
      } catch (error: any) {
        throw new Error(`Cannot connect to chain: ${error.message}`);
      }

      // Initialize wallets with Ganache deterministic private keys (matches sanity tests)
      for (let i = 0; i < 5; i++) {
        const walletName = `wallet${i + 1}`;
        const privateKey = GANACHE_PRIVATE_KEYS[i] as Hex;
        const account = privateKeyToAccount(privateKey);

        this.wallets[walletName] = {
          address: account.address,
          account,
          privateKey,
        };
        console.log(`  🔑 ${walletName}: ${account.address}`);
      }

      console.log('✅ Ganache wallets initialized');
    } catch (error: any) {
      console.error('❌ Error initializing Ganache wallets:', error.message);
      throw error;
    }
  }

  /**
   * Initialize wallets from environment variables
   */
  protected initializeWalletsFromEnv(): void {
    const privateKeys = this.config.privateKeys;

    for (let i = 1; i <= 5; i++) {
      const walletName = `wallet${i}`;
      const privateKey = (privateKeys as any)[walletName] as string | undefined;

      if (!privateKey) {
        throw new Error(`${walletName.toUpperCase()} private key not set in environment`);
      }

      const account = privateKeyToAccount(privateKey as Hex);
      this.wallets[walletName] = {
        address: account.address,
        account,
        privateKey: privateKey as Hex,
      };
      console.log(`  🔑 ${walletName}: ${account.address}`);
    }
  }

  /**
   * Create wallet client for a specific wallet
   */
  protected createWalletClient(walletName: string): any {
    const wallet = this.wallets[walletName];
    if (!wallet) {
      throw new Error(`Wallet not found: ${walletName}`);
    }

    return createWalletClient({
      account: wallet.account,
      chain: this.chain,
      transport: http(this.config.rpcUrl),
    }) as any;
  }

  /**
   * Get wallet by name
   */
  protected getWallet(walletName: string): TestWallet {
    const wallet = this.wallets[walletName];
    if (!wallet) {
      throw new Error(`Wallet not found: ${walletName}`);
    }
    return wallet;
  }

  /**
   * Assert test condition
   */
  protected assertTest(condition: boolean, message: string): void {
    this.testResults.totalTests++;

    if (condition) {
      this.testResults.passedTests++;
      console.log(`  ✅ ${message}`);
    } else {
      this.testResults.failedTests++;
      console.log(`  ❌ ${message}`);
      const err = new Error(`Test assertion failed: ${message}`);
      (err as any).__counted = true;
      throw err;
    }
  }

  /**
   * Assert transaction success
   */
  protected async assertTransactionSuccess(
    result: TransactionResult,
    message: string
  ): Promise<void> {
    this.assertTest(!!result.hash, `${message}: Transaction hash exists`);
    const receipt = await result.wait();
    // Viem returns status as 'success' or 'reverted', or as number 1/0
    const status = receipt.status as any;
    const isSuccess = status === 'success' || status === 1 || String(status) === '1';
    this.assertTest(isSuccess, `${message}: Transaction succeeded (status: ${status})`);
  }

  /**
   * Handle test error
   */
  protected handleTestError(testName: string, error: any): void {
    if (!(error as any).__counted) {
      this.testResults.failedTests++;
    }
    console.log(`❌ ${testName} failed: ${error.message}`);
    if (error.stack) {
      console.log(`   Stack: ${error.stack}`);
    }
  }

  /**
   * Advance blockchain time
   */
  protected async advanceBlockchainTime(seconds: number): Promise<boolean> {
    return advanceBlockchainTime(this.publicClient, seconds);
  }

  /**
   * Wait for timelock to expire
   */
  protected async waitForTimelock(txId: bigint): Promise<boolean> {
    console.log(`⏳ WAITING FOR TIMELOCK: Transaction ${txId}`);
    console.log('-'.repeat(40));

    try {
      // Get transaction details (this needs to be implemented by subclasses)
      // For now, just advance time by a fixed amount
      const success = await this.advanceBlockchainTime(65); // Default 1 minute + buffer
      return success;
    } catch (error: any) {
      console.log(`  ❌ Error waiting for timelock: ${error.message}`);
      return false;
    }
  }

  /**
   * Get operation name from operation type
   */
  protected getOperationName(operationType: Hex): string {
    return getOperationName(operationType);
  }

  /**
   * Get status name from status number
   */
  protected getStatusName(status: number): string {
    return getStatusName(status);
  }

  /**
   * Print test results
   */
  protected printTestResults(): void {
    const duration =
      this.testResults.startTime && this.testResults.endTime
        ? this.testResults.endTime - this.testResults.startTime
        : 0;
    const successRate =
      this.testResults.totalTests > 0
        ? ((this.testResults.passedTests / this.testResults.totalTests) * 100).toFixed(2)
        : '0.00';

    console.log('\n' + '='.repeat(60));
    console.log(`📊 ${this.testName.toUpperCase()} TEST RESULTS`);
    console.log('='.repeat(60));
    console.log(`📋 Total Tests: ${this.testResults.totalTests}`);
    console.log(`✅ Passed: ${this.testResults.passedTests}`);
    console.log(`❌ Failed: ${this.testResults.failedTests}`);
    console.log(`📈 Success Rate: ${successRate}%`);
    console.log(`⏱️  Duration: ${(duration / 1000).toFixed(2)} seconds`);
    console.log('='.repeat(60));

    if (this.testResults.failedTests === 0) {
      console.log('🎉 All tests passed successfully!');
    } else {
      console.log('⚠️  Some tests failed. Please review the output above.');
    }
  }

  /**
   * Run test suite
   */
  async runTest(): Promise<boolean> {
    this.testResults.startTime = Date.now();
    console.log(`🚀 Starting ${this.testName}...`);

    try {
      await this.initialize();
      await this.executeTests();

      this.testResults.endTime = Date.now();
      this.printTestResults();

      return this.testResults.failedTests === 0;
    } catch (error: any) {
      this.testResults.endTime = Date.now();
      this.handleTestError(this.testName, error);
      this.printTestResults();
      return false;
    }
  }

  /**
   * Abstract method - must be implemented by subclasses
   */
  protected abstract executeTests(): Promise<void>;
}

