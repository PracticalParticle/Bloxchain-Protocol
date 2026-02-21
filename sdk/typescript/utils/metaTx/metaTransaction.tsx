import { 
  Address, 
  Hex, 
  PublicClient, 
  WalletClient, 
  Chain
} from 'viem';
import { 
  MetaTransaction, 
  TxRecord, 
  MetaTxParams, 
  TxParams
} from '../../interfaces/lib.index';
import { TxAction } from '../../types/lib.index';
import BaseStateMachineABI from '../../abi/BaseStateMachine.abi.json';

/**
 * @title MetaTransactionSigner
 * @dev Standardized utility for creating and signing meta-transactions
 * 
 * This utility leverages the contract's own EIP-712 message hash generation
 * to avoid JavaScript replication issues and ensure signature compatibility.
 * 
 * Architecture:
 * - Step 1: Create unsigned meta-transaction (contract generates message hash)
 * - Step 2: Sign the message hash (programmatic or external wallet)
 * - Step 3: Verify signature and return complete meta-transaction
 * 
 * Key Features:
 * - Contract-based message hash generation
 * - Separated unsigned creation and signing steps
 * - Support for programmatic and frontend wallet signing
 * - Type-safe meta-transaction creation
 * - Automatic signature verification
 * - Support for both new and existing transactions
 * 
 * Security: Uses the contract's generateUnsignedForNewMetaTx/generateUnsignedForExistingMetaTx
 * functions to ensure exact EIP-712 compliance with the on-chain implementation.
 */
export class MetaTransactionSigner {
  private client: PublicClient;
  private walletClient?: WalletClient;
  private contractAddress: Address;
  private chain: Chain;

  constructor(
    client: PublicClient,
    walletClient: WalletClient | undefined,
    contractAddress: Address,
    chain: Chain
  ) {
    this.client = client;
    this.walletClient = walletClient;
    this.contractAddress = contractAddress;
    this.chain = chain;
  }

  /**
   * @dev Creates an unsigned meta-transaction for a new operation
   * @param txParams Transaction parameters
   * @param metaTxParams Meta-transaction parameters
   * @returns Unsigned meta-transaction ready for signing
   */
  async createUnsignedMetaTransactionForNew(
    txParams: TxParams,
    metaTxParams: MetaTxParams
  ): Promise<MetaTransaction> {
    // Call the private method which handles the contract call
    return await this.generateUnsignedMetaTransactionForNew(txParams, metaTxParams);
  }

  /**
   * @dev Creates an unsigned meta-transaction for an existing operation
   * @param txId Existing transaction ID
   * @param metaTxParams Meta-transaction parameters
   * @returns Unsigned meta-transaction ready for signing
   */
  async createUnsignedMetaTransactionForExisting(
    txId: bigint,
    metaTxParams: MetaTxParams
  ): Promise<MetaTransaction> {
    const result = await this.generateUnsignedMetaTransactionForExisting(txId, metaTxParams);
    
    // The contract returns a complete MetaTransaction with data field populated
    return {
      txRecord: result.txRecord,
      params: result.params,
      message: result.message,
      signature: result.signature as Hex,
      data: (result.data != null ? result.data : '0x') as Hex
    };
  }

  /**
   * @dev Signs an unsigned meta-transaction using private key (for remote Ganache compatibility)
   * @param unsignedMetaTx Unsigned meta-transaction
   * @param signerAddress Address of the signer
   * @param privateKey Private key for signing (required for remote Ganache)
   * @returns Complete signed meta-transaction
   */
  async signMetaTransaction(
    unsignedMetaTx: MetaTransaction,
    signerAddress: Address,
    privateKey: Hex
  ): Promise<MetaTransaction> {
    // Use private key signing directly (matches sanity test pattern)
    const { privateKeyToAccount } = await import('viem/accounts');
    const account = privateKeyToAccount(privateKey);
    
    // Sign the message hash using the account
    const signature = await account.signMessage({
      message: { raw: unsignedMetaTx.message }
    });

    // Verify signature matches expected signer
    const recoveredAddress = await this.client.verifyMessage({
      address: signerAddress,
      message: { raw: unsignedMetaTx.message },
      signature
    });

    if (!recoveredAddress) {
      throw new Error('Signature verification failed');
    }

    // Return complete signed meta-transaction
    return {
      ...unsignedMetaTx,
      signature
    };
  }

  /**
   * @dev Creates a signed meta-transaction with external signature (for frontend wallets)
   * @param unsignedMetaTx Unsigned meta-transaction
   * @param signature External signature from wallet
   * @returns Complete signed meta-transaction
   */
  async createSignedMetaTransactionWithSignature(
    unsignedMetaTx: MetaTransaction,
    signature: Hex
  ): Promise<MetaTransaction> {
    // Verify signature
    await this.verifySignature(unsignedMetaTx.message, signature, unsignedMetaTx.params.signer);

    // Return complete signed meta-transaction
    return {
      ...unsignedMetaTx,
      signature
    };
  }

  /**
   * @dev Creates a signed meta-transaction for a new operation (convenience method)
   * @param txParams Transaction parameters
   * @param metaTxParams Meta-transaction parameters
   * @param signerAddress Address of the signer
   * @param privateKey Private key for signing (required for remote Ganache)
   * @returns Complete signed meta-transaction
   */
  async createSignedMetaTransactionForNew(
    txParams: TxParams,
    metaTxParams: MetaTxParams,
    signerAddress: Address,
    privateKey: Hex
  ): Promise<MetaTransaction> {
    const unsignedMetaTx = await this.createUnsignedMetaTransactionForNew(txParams, metaTxParams);
    return await this.signMetaTransaction(unsignedMetaTx, signerAddress, privateKey);
  }

  /**
   * @dev Creates a signed meta-transaction for an existing transaction (convenience method)
   * @param txId Existing transaction ID
   * @param metaTxParams Meta-transaction parameters
   * @param signerAddress Address of the signer
   * @param privateKey Private key for signing (required for remote Ganache)
   * @returns Complete signed meta-transaction
   */
  async createSignedMetaTransactionForExisting(
    txId: bigint,
    metaTxParams: MetaTxParams,
    signerAddress: Address,
    privateKey: Hex
  ): Promise<MetaTransaction> {
    const unsignedMetaTx = await this.createUnsignedMetaTransactionForExisting(txId, metaTxParams);
    return await this.signMetaTransaction(unsignedMetaTx, signerAddress, privateKey);
  }

  /**
   * @dev Generates unsigned meta-transaction for new operation using contract
   * @param txParams Transaction parameters
   * @param metaTxParams Meta-transaction parameters
   * @returns Complete MetaTransaction from contract (with data field populated)
   */
  private async generateUnsignedMetaTransactionForNew(
    txParams: TxParams,
    metaTxParams: MetaTxParams
  ): Promise<MetaTransaction> {
    const result = await this.client.readContract({
      address: this.contractAddress,
      abi: this.getContractABI(),
      functionName: 'generateUnsignedMetaTransactionForNew',
      args: [
        txParams.requester,
        txParams.target,
        txParams.value,
        txParams.gasLimit,
        txParams.operationType,
        txParams.executionSelector,
        txParams.executionParams,
        metaTxParams
      ],
      // Include account for permission checks if wallet client is available
      account: this.walletClient?.account
    });

    // The contract returns a complete MetaTransaction struct
    // Extract all fields including data which is computed by prepareTransactionData
    const metaTx = result as any;
    
    if (!metaTx.message || metaTx.message === '0x0000000000000000000000000000000000000000000000000000000000000000') {
      throw new Error('Contract did not generate a valid message hash');
    }

    return {
      txRecord: metaTx.txRecord,
      params: metaTx.params,
      message: metaTx.message,
      signature: metaTx.signature as Hex,
      data: (metaTx.data != null ? metaTx.data : '0x') as Hex
    };
  }

  /**
   * @dev Generates unsigned meta-transaction for existing operation using contract
   * @param txId Transaction ID
   * @param metaTxParams Meta-transaction parameters
   * @returns Complete MetaTransaction from contract (with data field populated)
   */
  private async generateUnsignedMetaTransactionForExisting(
    txId: bigint,
    metaTxParams: MetaTxParams
  ): Promise<MetaTransaction> {
    const result = await this.client.readContract({
      address: this.contractAddress,
      abi: this.getContractABI(),
      functionName: 'generateUnsignedMetaTransactionForExisting',
      args: [txId, metaTxParams],
      // Include account for permission checks if wallet client is available
      account: this.walletClient?.account
    });

    // The contract returns a complete MetaTransaction struct
    // Extract all fields including data which is computed by prepareTransactionData
    const metaTx = result as any;
    
    if (!metaTx.message || metaTx.message === '0x0000000000000000000000000000000000000000000000000000000000000000') {
      throw new Error('Contract did not generate a valid message hash');
    }

    return {
      txRecord: metaTx.txRecord,
      params: metaTx.params,
      message: metaTx.message,
      signature: metaTx.signature as Hex,
      data: (metaTx.data != null ? metaTx.data : '0x') as Hex
    };
  }


  /**
   * @dev Verifies a signature against a message hash and expected signer
   * @param messageHash The message hash
   * @param signature The signature to verify
   * @param expectedSigner The expected signer address
   */
  private async verifySignature(
    messageHash: Hex,
    signature: Hex,
    expectedSigner: Address
  ): Promise<void> {
    const recoveredAddress = await this.client.verifyMessage({
      address: expectedSigner,
      message: { raw: messageHash },
      signature
    });

    if (!recoveredAddress) {
      throw new Error('Signature verification failed');
    }
  }


  /**
   * @dev Gets the contract ABI for meta-transaction functions
   * Uses BaseStateMachine ABI to match the actual deployed contract
   * @returns Contract ABI
   */
  private getContractABI(): any[] {
    return BaseStateMachineABI as any[];
  }
}

/**
 * @dev Helper functions for creating meta-transaction parameters
 */
export class MetaTransactionBuilder {

  /**
   * @dev Creates meta-transaction parameters
   * @param handlerContract Handler contract address
   * @param handlerSelector Handler function selector
   * @param action Transaction action
   * @param deadline Deadline timestamp
   * @param maxGasPrice Maximum gas price
   * @param signer Signer address
   * @param chainId Chain ID (optional, defaults to current chain)
   * @param nonce Nonce (optional, will be fetched from contract)
   * @returns Meta-transaction parameters
   */
  static createMetaTxParams(
    handlerContract: Address,
    handlerSelector: Hex,
    action: TxAction,
    deadline: bigint,
    maxGasPrice: bigint,
    signer: Address,
    chainId: bigint,
    nonce?: bigint
  ): MetaTxParams {
    return {
      chainId: chainId, // Default to mainnet
      nonce: nonce || 0n,
      handlerContract,
      handlerSelector,
      action,
      deadline,
      maxGasPrice,
      signer
    };
  }

  /**
   * @dev Creates transaction parameters
   * @param requester Requester address
   * @param target Target contract address
   * @param value Value to send
   * @param gasLimit Gas limit
   * @param operationType Operation type
   * @param executionSelector Execution selector (bytes4)
   * @param executionParams Execution parameters
   * @returns Transaction parameters
   */
  static createTxParams(
    requester: Address,
    target: Address,
    value: bigint,
    gasLimit: bigint,
    operationType: Hex,
    executionSelector: Hex,
    executionParams: Hex
  ): TxParams {
    return {
      requester,
      target,
      value,
      gasLimit,
      operationType,
      executionSelector,
      executionParams
    };
  }
}
