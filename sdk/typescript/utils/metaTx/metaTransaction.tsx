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
  TxParams,
  PaymentDetails,
  StandardExecutionOptions,
  RawExecutionOptions
} from '../../interfaces/lib.index';
import { TxAction, ExecutionType } from '../../types/lib.index';
import MetaTxABI from './MetaTx.abi.json';

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
    const { messageHash, txRecord } = await this.generateUnsignedMetaTransactionForNew(txParams, metaTxParams);
    
    return {
      txRecord,
      params: metaTxParams,
      message: messageHash,
      signature: '0x' as Hex,
      data: '0x' as Hex
    };
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
    const { messageHash, txRecord } = await this.generateUnsignedMetaTransactionForExisting(txId, metaTxParams);
    
    return {
      txRecord,
      params: metaTxParams,
      message: messageHash,
      signature: '0x' as Hex,
      data: '0x' as Hex
    };
  }

  /**
   * @dev Signs an unsigned meta-transaction using wallet client
   * @param unsignedMetaTx Unsigned meta-transaction
   * @param signerAddress Address of the signer
   * @returns Complete signed meta-transaction
   */
  async signMetaTransaction(
    unsignedMetaTx: MetaTransaction,
    signerAddress: Address
  ): Promise<MetaTransaction> {
    if (!this.walletClient) {
      throw new Error('Wallet client is required for signing meta-transactions');
    }

    // Sign the message hash
    const signature = await this.signMessageHash(
      unsignedMetaTx.message,
      signerAddress
    );

    // Verify signature
    await this.verifySignature(unsignedMetaTx.message, signature, unsignedMetaTx.params.signer);

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
   * @returns Complete signed meta-transaction
   */
  async createSignedMetaTransactionForNew(
    txParams: TxParams,
    metaTxParams: MetaTxParams,
    signerAddress: Address
  ): Promise<MetaTransaction> {
    const unsignedMetaTx = await this.createUnsignedMetaTransactionForNew(txParams, metaTxParams);
    return await this.signMetaTransaction(unsignedMetaTx, signerAddress);
  }

  /**
   * @dev Creates a signed meta-transaction for an existing transaction (convenience method)
   * @param txId Existing transaction ID
   * @param metaTxParams Meta-transaction parameters
   * @param signerAddress Address of the signer
   * @returns Complete signed meta-transaction
   */
  async createSignedMetaTransactionForExisting(
    txId: bigint,
    metaTxParams: MetaTxParams,
    signerAddress: Address
  ): Promise<MetaTransaction> {
    const unsignedMetaTx = await this.createUnsignedMetaTransactionForExisting(txId, metaTxParams);
    return await this.signMetaTransaction(unsignedMetaTx, signerAddress);
  }

  /**
   * @dev Generates unsigned meta-transaction for new operation using contract
   * @param txParams Transaction parameters
   * @param metaTxParams Meta-transaction parameters
   * @returns Message hash and transaction record from contract
   */
  private async generateUnsignedMetaTransactionForNew(
    txParams: TxParams,
    metaTxParams: MetaTxParams
  ): Promise<{ messageHash: Hex; txRecord: TxRecord }> {
    const result = await this.client.readContract({
      address: this.contractAddress,
      abi: this.getContractABI(),
      functionName: 'generateUnsignedForNewMetaTx',
      args: [
        txParams.requester,
        txParams.target,
        txParams.value,
        txParams.gasLimit,
        txParams.operationType,
        txParams.executionType,
        txParams.executionOptions,
        metaTxParams
      ],
      // Include account for permission checks if wallet client is available
      account: this.walletClient?.account
    });

    // Extract message hash and txRecord from contract result
    const messageHash = (result as any).message || (result as any)[2];
    const txRecord = (result as any).txRecord || (result as any)[0];
    
    if (!messageHash || messageHash === '0x0000000000000000000000000000000000000000000000000000000000000000') {
      throw new Error('Contract did not generate a valid message hash');
    }

    return { messageHash, txRecord };
  }

  /**
   * @dev Generates unsigned meta-transaction for existing operation using contract
   * @param txId Transaction ID
   * @param metaTxParams Meta-transaction parameters
   * @returns Message hash and transaction record from contract
   */
  private async generateUnsignedMetaTransactionForExisting(
    txId: bigint,
    metaTxParams: MetaTxParams
  ): Promise<{ messageHash: Hex; txRecord: TxRecord }> {
    const result = await this.client.readContract({
      address: this.contractAddress,
      abi: this.getContractABI(),
      functionName: 'generateUnsignedForExistingMetaTx',
      args: [txId, metaTxParams],
      // Include account for permission checks if wallet client is available
      account: this.walletClient?.account
    });

    // Extract message hash and txRecord from contract result
    const messageHash = (result as any).message || (result as any)[2];
    const txRecord = (result as any).txRecord || (result as any)[0];
    
    if (!messageHash || messageHash === '0x0000000000000000000000000000000000000000000000000000000000000000') {
      throw new Error('Contract did not generate a valid message hash');
    }

    return { messageHash, txRecord };
  }

  /**
   * @dev Signs a message hash using the wallet client
   * @param messageHash The message hash to sign
   * @param account The account to sign with
   * @returns The signature
   */
  private async signMessageHash(
    messageHash: Hex,
    account: Address
  ): Promise<Hex> {
    const signature = await this.walletClient!.signMessage({
      account,
      message: { raw: messageHash }
    });

    return signature;
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
   * @returns Contract ABI
   */
  private getContractABI(): any[] {
    return MetaTxABI as any[];
  }
}

/**
 * @dev Helper functions for creating meta-transaction parameters
 */
export class MetaTransactionBuilder {
  /**
   * @dev Creates standard execution options
   * @param functionSelector Function selector
   * @param params Encoded function parameters
   * @returns Encoded standard execution options
   */
  static createStandardExecutionOptions(
    functionSelector: Hex,
    params: Hex
  ): Hex {
    const options: StandardExecutionOptions = {
      functionSelector,
      params
    };
    
    // Encode as bytes (this would need proper ABI encoding in real implementation)
    return `0x${functionSelector.slice(2)}${params.slice(2)}` as Hex;
  }

  /**
   * @dev Creates raw execution options
   * @param rawTxData Raw transaction data
   * @returns Encoded raw execution options
   */
  static createRawExecutionOptions(rawTxData: Hex): Hex {
    const options: RawExecutionOptions = {
      rawTxData
    };
    
    // Return raw data as-is
    return rawTxData;
  }

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
    chainId?: bigint,
    nonce?: bigint
  ): MetaTxParams {
    return {
      chainId: chainId || BigInt(1), // Default to mainnet
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
   * @param executionType Execution type
   * @param executionOptions Execution options
   * @returns Transaction parameters
   */
  static createTxParams(
    requester: Address,
    target: Address,
    value: bigint,
    gasLimit: bigint,
    operationType: Hex,
    executionType: ExecutionType,
    executionOptions: Hex
  ): TxParams {
    return {
      requester,
      target,
      value,
      gasLimit,
      operationType,
      executionType,
      executionOptions
    };
  }
}
