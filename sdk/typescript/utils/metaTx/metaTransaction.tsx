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
  PaymentDetails
} from '../../interfaces/lib.index';
import { TxAction } from '../../types/lib.index';
import BaseStateMachineABI from '../../abi/BaseStateMachine.abi.json';

/** EIP-712 domain and types matching EngineBlox (selective MetaTxRecord: txId, params, payment only) */
export const META_TX_DOMAIN = {
  name: 'Bloxchain' as const,
  version: '1.0.0' as const,
  chainId: 0, // set per sign
  verifyingContract: '0x' as Address // set per sign
};

export const META_TX_TYPES = {
  MetaTransaction: [
    { name: 'txRecord', type: 'MetaTxRecord' },
    { name: 'params', type: 'MetaTxParams' },
    { name: 'data', type: 'bytes' }
  ],
  MetaTxRecord: [
    { name: 'txId', type: 'uint256' },
    { name: 'params', type: 'TxParams' },
    { name: 'payment', type: 'PaymentDetails' }
  ],
  TxParams: [
    { name: 'requester', type: 'address' },
    { name: 'target', type: 'address' },
    { name: 'value', type: 'uint256' },
    { name: 'gasLimit', type: 'uint256' },
    { name: 'operationType', type: 'bytes32' },
    { name: 'executionSelector', type: 'bytes4' },
    { name: 'executionParams', type: 'bytes' }
  ],
  MetaTxParams: [
    { name: 'chainId', type: 'uint256' },
    { name: 'nonce', type: 'uint256' },
    { name: 'handlerContract', type: 'address' },
    { name: 'handlerSelector', type: 'bytes4' },
    { name: 'action', type: 'uint8' },
    { name: 'deadline', type: 'uint256' },
    { name: 'maxGasPrice', type: 'uint256' },
    { name: 'signer', type: 'address' }
  ],
  PaymentDetails: [
    { name: 'recipient', type: 'address' },
    { name: 'nativeTokenAmount', type: 'uint256' },
    { name: 'erc20TokenAddress', type: 'address' },
    { name: 'erc20TokenAmount', type: 'uint256' }
  ]
} as const;

/** EIP-712 message shape for MetaTransaction (for typed-data signing) */
export function buildTypedDataMessage(metaTx: MetaTransaction): Record<string, unknown> {
  const params = metaTx.txRecord.params;
  const payment = metaTx.txRecord.payment;
  const metaParams = metaTx.params;
  return {
    txRecord: {
      txId: metaTx.txRecord.txId,
      params: {
        requester: params.requester,
        target: params.target,
        value: params.value,
        gasLimit: params.gasLimit,
        operationType: params.operationType,
        executionSelector: params.executionSelector,
        executionParams: params.executionParams
      },
      payment: {
        recipient: payment.recipient,
        nativeTokenAmount: payment.nativeTokenAmount,
        erc20TokenAddress: payment.erc20TokenAddress,
        erc20TokenAmount: payment.erc20TokenAmount
      }
    },
    params: {
      chainId: metaParams.chainId,
      nonce: metaParams.nonce,
      handlerContract: metaParams.handlerContract,
      handlerSelector: metaParams.handlerSelector,
      action: Number(metaParams.action),
      deadline: metaParams.deadline,
      maxGasPrice: metaParams.maxGasPrice,
      signer: metaParams.signer
    },
    data: metaTx.data ?? ('0x' as Hex)
  };
}

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
   * @dev Signs an unsigned meta-transaction using a walletClient via EIP-712 typed data (eth_signTypedData_v4).
   *      Uses the canonical EIP-712 domain + types so the wallet-computed digest matches EngineBlox.generateMessageHash.
   * @param unsignedMetaTx Unsigned meta-transaction
   * @returns Complete signed meta-transaction
   */
  async signMetaTransactionWithWallet(unsignedMetaTx: MetaTransaction): Promise<MetaTransaction> {
    if (!this.walletClient) {
      throw new Error('MetaTransactionSigner: walletClient is required for typed-data signing');
    }

    const account = this.walletClient.account;
    if (!account) {
      throw new Error('MetaTransactionSigner: walletClient must have an active account for typed-data signing');
    }

    const domain = {
      ...META_TX_DOMAIN,
      chainId: this.chain.id,
      verifyingContract: this.contractAddress
    };

    const message = buildTypedDataMessage(unsignedMetaTx);

    const signature = await this.walletClient.signTypedData({
      account,
      domain,
      primaryType: 'MetaTransaction',
      types: META_TX_TYPES,
      message
    } as any);

    // Verify signature matches expected signer using the same raw digest path as the contract
    await this.verifySignature(unsignedMetaTx.message as Hex, signature as Hex, unsignedMetaTx.params.signer);

    return {
      ...unsignedMetaTx,
      signature: signature as Hex
    };
  }

  /**
   * @dev Signs an unsigned meta-transaction using private key (standard EIP-712 digest; no personal_sign prefix).
   *      Uses the contract's message hash as the digest, so we sign the digest returned by the contract directly.
   * @param unsignedMetaTx Unsigned meta-transaction (message = EIP-712 digest from contract)
   * @param signerAddress Address of the signer
   * @param privateKey Private key for signing (required for remote Ganache)
   * @returns Complete signed meta-transaction
   */
  async signMetaTransaction(
    unsignedMetaTx: MetaTransaction,
    signerAddress: Address,
    privateKey: Hex
  ): Promise<MetaTransaction> {
    const { privateKeyToAccount } = await import('viem/accounts');
    const account = privateKeyToAccount(privateKey);

    const contractDigest = (typeof unsignedMetaTx.message === 'string'
      ? unsignedMetaTx.message
      : unsignedMetaTx.message) as Hex;

    const signature = await account.sign({ hash: contractDigest });

    const { recoverAddress } = await import('viem');
    const recoveredAddress = await recoverAddress({
      hash: contractDigest,
      signature
    });

    if (recoveredAddress.toLowerCase() !== signerAddress.toLowerCase()) {
      throw new Error('Signature verification failed');
    }

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
   * @dev Verifies a signature against the EIP-712 message hash and expected signer (contract uses raw digest recovery).
   */
  private async verifySignature(
    messageHash: Hex,
    signature: Hex,
    expectedSigner: Address
  ): Promise<void> {
    const { recoverAddress } = await import('viem');
    const recoveredAddress = await recoverAddress({
      hash: messageHash,
      signature
    });

    if (recoveredAddress.toLowerCase() !== expectedSigner.toLowerCase()) {
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
