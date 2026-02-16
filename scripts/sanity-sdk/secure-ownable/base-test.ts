/**
 * Base Test Class for SecureOwnable SDK Tests
 * Provides SecureOwnable-specific functionality
 */

import { Address, Hex } from 'viem';
import { SecureOwnable } from '../../../sdk/typescript/contracts/core/SecureOwnable.tsx';
import { BaseSDKTest, TestWallet } from '../base/BaseSDKTest.ts';
import { getContractAddressFromArtifacts } from '../base/test-helpers.ts';
import { getTestConfig } from '../base/test-config.ts';
import { MetaTransactionSigner } from '../../../sdk/typescript/utils/metaTx/metaTransaction.tsx';
import { MetaTransaction, MetaTxParams } from '../../../sdk/typescript/interfaces/lib.index.tsx';
import { TxAction } from '../../../sdk/typescript/types/lib.index.tsx';
import { FUNCTION_SELECTORS } from '../../../sdk/typescript/types/core.access.index.tsx';

export interface SecureOwnableRoles {
  owner: Address;
  broadcaster: Address;
  recovery: Address;
}

export abstract class BaseSecureOwnableTest extends BaseSDKTest {
  protected secureOwnable: SecureOwnable | null = null;
  protected roles: SecureOwnableRoles = {
    owner: '0x' as Address,
    broadcaster: '0x' as Address,
    recovery: '0x' as Address,
  };
  protected roleWallets: Record<string, TestWallet> = {};
  protected metaTxSigner: MetaTransactionSigner | null = null;

  constructor(testName: string) {
    super(testName);
  }

  /**
   * Get contract address from artifacts (AccountBlox is the single account contract)
   */
  protected async getContractAddress(): Promise<Address | null> {
    return getContractAddressFromArtifacts('AccountBlox');
  }

  /**
   * Get contract address from environment
   */
  protected getContractAddressFromEnv(): Address | null {
    const address = getTestConfig().contractAddresses.accountBlox;
    if (!address) {
      throw new Error('ACCOUNTBLOX_ADDRESS not set in environment variables');
    }
    return address as Address;
  }

  /**
   * Initialize SecureOwnable SDK instance
   */
  protected async initializeSDK(): Promise<void> {
    if (!this.contractAddress) {
      throw new Error('Contract address not set');
    }

    // Create a wallet client for the owner (default)
    const walletClient = this.createWalletClient('wallet1');

    this.secureOwnable = new SecureOwnable(
      this.publicClient,
      walletClient,
      this.contractAddress,
      this.chain
    );

    console.log('✅ SecureOwnable SDK initialized');
  }

  /**
   * Discover role assignments from contract
   */
  protected async discoverRoleAssignments(): Promise<void> {
    if (!this.secureOwnable) {
      throw new Error('SecureOwnable SDK not initialized');
    }

    try {
      this.roles.owner = await this.secureOwnable.owner();
      const broadcasters = await this.secureOwnable.getBroadcasters();
      if (!broadcasters || broadcasters.length === 0) {
        throw new Error('No broadcasters configured on contract');
      }
      this.roles.broadcaster = broadcasters[0]; // Use primary broadcaster
      this.roles.recovery = await this.secureOwnable.getRecovery();

      console.log('📋 DISCOVERED ROLE ASSIGNMENTS:');
      console.log(`  👑 Owner: ${this.roles.owner}`);
      console.log(`  📡 Broadcaster: ${this.roles.broadcaster}`);
      console.log(`  🛡️ Recovery: ${this.roles.recovery}`);

      // Map roles to available wallets
      for (const [walletName, wallet] of Object.entries(this.wallets)) {
        if (wallet.address.toLowerCase() === this.roles.owner.toLowerCase()) {
          this.roleWallets.owner = wallet;
          console.log(`  🔑 Owner role served by: ${walletName} (${wallet.address})`);
        }
        if (wallet.address.toLowerCase() === this.roles.broadcaster.toLowerCase()) {
          this.roleWallets.broadcaster = wallet;
          console.log(`  🔑 Broadcaster role served by: ${walletName} (${wallet.address})`);
        }
        if (wallet.address.toLowerCase() === this.roles.recovery.toLowerCase()) {
          this.roleWallets.recovery = wallet;
          console.log(`  🔑 Recovery role served by: ${walletName} (${wallet.address})`);
        }
      }
    } catch (error: any) {
      console.error('❌ Failed to discover role assignments:', error.message);
      throw new Error(`Role discovery failed: ${error.message}`);
    }
  }

  /**
   * Get wallet for a specific role
   */
  protected getRoleWallet(roleName: 'owner' | 'broadcaster' | 'recovery'): TestWallet {
    const wallet = this.roleWallets[roleName.toLowerCase()];
    if (!wallet) {
      throw new Error(`No wallet found for role: ${roleName}`);
    }
    return wallet;
  }

  /**
   * Create SecureOwnable instance with specific wallet
   */
  protected createSecureOwnableWithWallet(walletName: string): SecureOwnable {
    if (!this.contractAddress) {
      throw new Error('Contract address not set');
    }

    const walletClient = this.createWalletClient(walletName);
    return new SecureOwnable(
      this.publicClient,
      walletClient,
      this.contractAddress,
      this.chain
    );
  }

  /**
   * Override initialize to include SDK initialization
   */
  async initialize(): Promise<void> {
    await super.initialize();
    await this.initializeSDK();
    await this.discoverRoleAssignments();
    await this.initializeMetaTxSigner();
  }

  /**
   * Initialize MetaTransactionSigner for EIP-712 signing
   */
  protected async initializeMetaTxSigner(): Promise<void> {
    if (!this.contractAddress) {
      throw new Error('Contract address not set');
    }

    // Use a wallet client for signing (owner wallet by default)
    const ownerWallet = this.getRoleWallet('owner');
    const ownerWalletName = Object.keys(this.wallets).find(
      (k) => this.wallets[k].address.toLowerCase() === ownerWallet.address.toLowerCase()
    ) || 'wallet1';
    
    const walletClient = this.createWalletClient(ownerWalletName);
    this.metaTxSigner = new MetaTransactionSigner(
      this.publicClient,
      walletClient,
      this.contractAddress,
      this.chain
    );
  }

  /**
   * Create meta-transaction parameters for a function
   * The contract's createMetaTxParams method handles nonce and chainId automatically
   */
  protected async createMetaTxParams(
    handlerSelector: Hex,
    action: TxAction,
    signerAddress: Address,
    deadlineSeconds: number = 3600
  ): Promise<MetaTxParams> {
    if (!this.secureOwnable) {
      throw new Error('SecureOwnable SDK not initialized');
    }

    // Contract expects deadline as seconds to add to current timestamp, not absolute timestamp
    const deadline = BigInt(deadlineSeconds);
    const maxGasPrice = BigInt(0);

    // The contract's createMetaTxParams method automatically handles nonce, chainId, and deadline calculation
    return await this.secureOwnable.createMetaTxParams(
      this.contractAddress!,
      handlerSelector,
      action,
      deadline,
      maxGasPrice,
      signerAddress
    );
  }

  /**
   * Create and sign a meta-transaction for an existing transaction
   */
  protected async createSignedMetaTxForExisting(
    txId: bigint,
    handlerSelector: Hex,
    action: TxAction,
    signerWalletName: string
  ): Promise<MetaTransaction> {
    if (!this.metaTxSigner) {
      throw new Error('MetaTransactionSigner not initialized');
    }

    const signerWallet = this.wallets[signerWalletName];
    if (!signerWallet) {
      throw new Error(`Wallet not found: ${signerWalletName}`);
    }

    // Verify transaction exists and is pending before generating meta-transaction
    console.log(`    🔍 Verifying transaction ${txId} is still pending before generating meta-transaction...`);
    try {
      const txBeforeMeta = await this.secureOwnable!.getTransaction(txId);
      console.log(`    📋 Transaction ${txId} status: ${txBeforeMeta.status} (${Number(txBeforeMeta.status) === 1 ? 'PENDING' : 'NOT PENDING'})`);
      if (Number(txBeforeMeta.status) !== 1) {
        throw new Error(`Transaction ${txId} is no longer pending (status: ${txBeforeMeta.status}). Cannot generate meta-transaction.`);
      }
      console.log(`    ✅ Transaction ${txId} confirmed as pending`);
    } catch (verifyError: any) {
      console.log(`    ❌ Transaction verification failed: ${verifyError.message}`);
      throw new Error(`Cannot generate meta-transaction: Transaction ${txId} verification failed: ${verifyError.message}`);
    }

    // Create meta-tx params
    console.log(`    📋 Creating meta-transaction parameters...`);
    console.log(`       Handler Selector: ${handlerSelector}`);
    console.log(`       Action: ${action}`);
    console.log(`       Signer: ${signerWallet.address}`);
    
    const metaTxParams = await this.createMetaTxParams(
      handlerSelector,
      action,
      signerWallet.address
    );
    
    console.log(`    ✅ Meta-transaction parameters created:`);
    console.log(`       Nonce: ${metaTxParams.nonce}`);
    console.log(`       Chain ID: ${metaTxParams.chainId}`);
    console.log(`       Deadline: ${metaTxParams.deadline}`);

    // Generate unsigned meta-transaction
    console.log(`    📋 Generating unsigned meta-transaction for transaction ${txId}...`);
    const unsignedMetaTx = await this.metaTxSigner.createUnsignedMetaTransactionForExisting(
      txId,
      metaTxParams
    );
    console.log(`    ✅ Unsigned meta-transaction generated`);

    // Sign the meta-transaction using private key (for remote Ganache compatibility)
    const signedMetaTx = await this.metaTxSigner.signMetaTransaction(
      unsignedMetaTx,
      signerWallet.address,
      signerWallet.privateKey
    );

    // Create fullMetaTx object matching sanity test structure
    const fullMetaTx = {
      txRecord: signedMetaTx.txRecord,
      params: signedMetaTx.params,
      message: signedMetaTx.message,
      signature: signedMetaTx.signature,
      data: signedMetaTx.data
    };

    return fullMetaTx;
  }

  /**
   * Wait for timelock with transaction ID
   */
  protected async waitForTimelockWithTxId(txId: bigint): Promise<boolean> {
    console.log(`⏳ WAITING FOR TIMELOCK: Transaction ${txId}`);
    console.log('-'.repeat(40));

    try {
      if (!this.secureOwnable) {
        throw new Error('SecureOwnable SDK not initialized');
      }

      // Get transaction details
      const tx = await this.secureOwnable.getTransaction(txId);
      const releaseTime = Number(tx.releaseTime);
      const currentBlock = await this.publicClient.getBlock({ blockTag: 'latest' });
      const currentBlockchainTime = Number(currentBlock.timestamp);

      console.log(`  📋 Transaction ID: ${txId}`);
      console.log(`  🕐 Release time: ${new Date(releaseTime * 1000).toLocaleString()}`);
      console.log(`  🕐 Current blockchain time: ${new Date(currentBlockchainTime * 1000).toLocaleString()}`);

      const waitTime = releaseTime - currentBlockchainTime;

      if (waitTime <= 0) {
        console.log(`  ✅ Timelock already expired!`);
        return true;
      }

      console.log(`  ⏰ Need to wait ${waitTime} seconds for timelock to expire`);
      const success = await this.advanceBlockchainTime(waitTime + 2); // Add 2 seconds buffer

      if (success) {
        // Verify timelock has expired
        const newBlock = await this.publicClient.getBlock({ blockTag: 'latest' });
        const newBlockchainTime = Number(newBlock.timestamp);
        console.log(`  🕐 New blockchain time: ${new Date(newBlockchainTime * 1000).toLocaleString()}`);

        if (newBlockchainTime >= releaseTime) {
          console.log(`  ✅ Timelock has expired!`);
          return true;
        }
      }

      return false;
    } catch (error: any) {
      console.log(`  ❌ Error waiting for timelock: ${error.message}`);
      return false;
    }
  }
}

