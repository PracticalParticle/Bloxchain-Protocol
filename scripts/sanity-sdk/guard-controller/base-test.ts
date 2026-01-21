/**
 * Base Test Class for GuardController SDK Tests
 * Provides GuardController-specific functionality
 */

import { Address, Hex } from 'viem';
import { GuardController } from '../../../sdk/typescript/contracts/GuardController';
import { BaseSDKTest, TestWallet } from '../base/BaseSDKTest';
import { getContractAddressFromArtifacts } from '../base/test-helpers';
import { getTestConfig } from '../base/test-config';
import { MetaTransactionSigner } from '../../../sdk/typescript/utils/metaTx/metaTransaction';
import { MetaTransaction, MetaTxParams } from '../../../sdk/typescript/interfaces/lib.index';
import { TxAction } from '../../../sdk/typescript/types/lib.index';
import { keccak256 } from 'viem';

export interface GuardControllerRoles {
  owner: Address;
  broadcaster: Address;
  recovery: Address;
}

export abstract class BaseGuardControllerTest extends BaseSDKTest {
  protected guardController: GuardController | null = null;
  protected roles: GuardControllerRoles = {
    owner: '0x' as Address,
    broadcaster: '0x' as Address,
    recovery: '0x' as Address,
  };
  protected roleWallets: Record<string, TestWallet> = {};
  protected metaTxSigner: MetaTransactionSigner | null = null;

  // GuardController constants
  protected readonly CONTROLLER_OPERATION_TYPE: Hex = keccak256(new TextEncoder().encode('CONTROLLER_OPERATION')) as Hex;
  protected readonly UPDATE_TARGET_WHITELIST_META_SELECTOR: Hex = keccak256(
    new TextEncoder().encode('updateTargetWhitelistRequestAndApprove(((uint256,uint256,uint8,(address,address,uint256,uint256,bytes32,bytes4,bytes),bytes32,bytes,(address,uint256,address,uint256)),(uint256,uint256,address,bytes4,uint8,uint256,uint256,address),bytes32,bytes,bytes))')
  ).slice(0, 10) as Hex;
  protected readonly UPDATE_TARGET_WHITELIST_EXECUTE_SELECTOR: Hex = keccak256(
    new TextEncoder().encode('executeUpdateTargetWhitelist(bytes4,address,bool)')
  ).slice(0, 10) as Hex;
  protected readonly NATIVE_TRANSFER_SELECTOR: Hex = '0x58e2cfdb' as Hex; // bytes4(keccak256("__bloxchain_native_transfer__(address,uint256)"))

  constructor(testName: string) {
    super(testName);
  }

  /**
   * Get contract address from artifacts
   */
  protected async getContractAddress(): Promise<Address | null> {
    return getContractAddressFromArtifacts('ControlBlox');
  }

  /**
   * Get contract address from environment
   */
  protected getContractAddressFromEnv(): Address | null {
    const address = getTestConfig().contractAddresses.guardController || 
                    process.env.CONTROLBLOX_ADDRESS;
    if (!address) {
      throw new Error('GUARDCONTROLLER_ADDRESS or CONTROLBLOX_ADDRESS not set in environment variables');
    }
    return address as Address;
  }

  /**
   * Initialize GuardController SDK instance
   */
  protected async initializeSDK(): Promise<void> {
    if (!this.contractAddress) {
      throw new Error('Contract address not set');
    }

    // Create a wallet client for the owner (default)
    const walletClient = this.createWalletClient('wallet1');

    this.guardController = new GuardController(
      this.publicClient,
      walletClient,
      this.contractAddress,
      this.chain
    );

    console.log('✅ GuardController SDK initialized');
  }

  /**
   * Discover role assignments from contract
   */
  protected async discoverRoleAssignments(): Promise<void> {
    if (!this.guardController) {
      throw new Error('GuardController SDK not initialized');
    }

    try {
      this.roles.owner = await this.guardController.owner();
      this.roles.broadcaster = await this.guardController.getBroadcaster();
      this.roles.recovery = await this.guardController.getRecovery();

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
   * Create GuardController instance with specific wallet
   */
  protected createGuardControllerWithWallet(walletName: string): GuardController {
    if (!this.contractAddress) {
      throw new Error('Contract address not set');
    }

    const walletClient = this.createWalletClient(walletName);
    return new GuardController(
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
   */
  protected async createMetaTxParams(
    handlerSelector: Hex,
    action: TxAction,
    signerAddress: Address,
    deadlineSeconds: number = 3600
  ): Promise<MetaTxParams> {
    if (!this.guardController) {
      throw new Error('GuardController SDK not initialized');
    }

    const deadline = BigInt(deadlineSeconds);
    const maxGasPrice = BigInt(0);

    return await this.guardController.createMetaTxParams(
      this.contractAddress!,
      handlerSelector,
      action,
      deadline,
      maxGasPrice,
      signerAddress
    );
  }

  /**
   * Create and sign a meta-transaction for whitelist update
   */
  protected async createSignedMetaTxForWhitelistUpdate(
    functionSelector: Hex,
    target: Address,
    isAdd: boolean,
    signerWalletName: string
  ): Promise<MetaTransaction> {
    if (!this.metaTxSigner || !this.guardController) {
      throw new Error('MetaTransactionSigner or GuardController not initialized');
    }

    const signerWallet = this.wallets[signerWalletName];
    if (!signerWallet) {
      throw new Error(`Wallet not found: ${signerWalletName}`);
    }

    // Get execution params
    console.log(`    📋 Getting execution params for whitelist update...`);
    const executionParams = await this.guardController.updateTargetWhitelistExecutionParams(
      functionSelector,
      target,
      isAdd
    );
    console.log(`    ✅ Execution params obtained`);

    // Create meta-tx params
    console.log(`    📋 Creating meta-transaction parameters...`);
    console.log(`       Handler Selector: ${this.UPDATE_TARGET_WHITELIST_META_SELECTOR}`);
    console.log(`       Action: ${TxAction.SIGN_META_REQUEST_AND_APPROVE}`);
    console.log(`       Signer: ${signerWallet.address}`);
    
    const metaTxParams = await this.createMetaTxParams(
      this.UPDATE_TARGET_WHITELIST_META_SELECTOR,
      TxAction.SIGN_META_REQUEST_AND_APPROVE,
      signerWallet.address
    );
    
    console.log(`    ✅ Meta-transaction parameters created:`);
    console.log(`       Nonce: ${metaTxParams.nonce}`);
    console.log(`       Chain ID: ${metaTxParams.chainId}`);
    console.log(`       Deadline: ${metaTxParams.deadline}`);

    // Create TxParams for the new transaction
    const txParams = {
      requester: signerWallet.address,
      target: this.contractAddress!,
      value: BigInt(0),
      gasLimit: BigInt(200000),
      operationType: this.CONTROLLER_OPERATION_TYPE,
      executionSelector: this.UPDATE_TARGET_WHITELIST_EXECUTE_SELECTOR,
      executionParams: executionParams
    };

    // Generate unsigned meta-transaction
    console.log(`    📋 Generating unsigned meta-transaction for whitelist update...`);
    const unsignedMetaTx = await this.metaTxSigner.createUnsignedMetaTransactionForNew(
      txParams,
      metaTxParams
    );
    console.log(`    ✅ Unsigned meta-transaction generated`);

    // Sign the meta-transaction
    const signedMetaTx = await this.metaTxSigner.signMetaTransaction(
      unsignedMetaTx,
      signerWallet.address,
      signerWallet.privateKey
    );

    return signedMetaTx;
  }

  /**
   * Get role hash from role name
   */
  protected getRoleHash(roleName: string): Hex {
    return keccak256(new TextEncoder().encode(roleName)) as Hex;
  }
}
