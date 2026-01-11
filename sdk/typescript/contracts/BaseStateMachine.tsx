import { Address, PublicClient, WalletClient, Chain, Hex } from 'viem';
// import BaseStateMachineABIJson from '../../../abi/BaseStateMachine.abi.json';
import { TransactionOptions, TransactionResult } from '../interfaces/base.index';
import { IBaseStateMachine } from '../interfaces/base.state.machine.index';
import { TxRecord, MetaTransaction, MetaTxParams } from '../interfaces/lib.index';
import { TxAction } from '../types/lib.index';
import { handleViemError } from '../utils/viem-error-handler';

/**
 * @title BaseStateMachine
 * @notice TypeScript wrapper for BaseStateMachine smart contract with common utilities
 */
export abstract class BaseStateMachine implements IBaseStateMachine {
  constructor(
    protected client: PublicClient,
    protected walletClient: WalletClient | undefined,
    protected contractAddress: Address,
    protected chain: Chain,
    protected abi: any
  ) {}

  // ============ COMMON UTILITY METHODS ============

  /**
   * Validates that wallet client is available for write operations
   */
  protected validateWalletClient(): void {
    if (!this.walletClient) {
      throw new Error('Wallet client is required for this operation');
    }
  }

  /**
   * Common method to execute write contract operations
   */
  protected async executeWriteContract(
    functionName: string,
    args: any[],
    options: TransactionOptions
  ): Promise<TransactionResult> {
    this.validateWalletClient();
    
    // Viem's writeContract will use the WalletClient's account if available
    // Only pass account explicitly if it differs from WalletClient's account
    // Otherwise, let Viem use the WalletClient's account automatically
    const walletClientAccount = this.walletClient!.account?.address;
    const requestedAccount = options.from.toLowerCase();
    
    const writeContractParams: any = {
      chain: this.chain,
      address: this.contractAddress,
      abi: this.abi,
      functionName,
      args,
    };
    
    // Only set account if it differs from WalletClient's account
    // This ensures consistency and avoids potential conflicts
    if (!walletClientAccount || walletClientAccount.toLowerCase() !== requestedAccount) {
      writeContractParams.account = options.from;
    }
    
    try {
      const hash = await this.walletClient!.writeContract(writeContractParams);

      return {
        hash,
        wait: () => this.client.waitForTransactionReceipt({ hash })
      };
    } catch (error: any) {
      // Use utility to handle and enhance error with contract error decoding
      // handleViemError returns Promise<never> and always throws, so this will never return
      // TypeScript doesn't recognize Promise<never> in control flow, so we explicitly throw
      throw await handleViemError(error, this.abi);
    }
  }

  /**
   * Common method to execute read contract operations
   */
  protected async executeReadContract<T>(
    functionName: string,
    args: any[] = []
  ): Promise<T> {
    const result = await this.client.readContract({
      address: this.contractAddress,
      abi: this.abi,
      functionName,
      args,
      // Include account for permission checks if wallet client is available
      account: this.walletClient?.account
    });

    return result as T;
  }

  // ============ META-TRANSACTION UTILITIES ============

  async createMetaTxParams(
    handlerContract: Address,
    handlerSelector: Hex,
    action: TxAction,
    deadline: bigint,
    maxGasPrice: bigint,
    signer: Address
  ): Promise<MetaTxParams> {
    return this.executeReadContract<MetaTxParams>('createMetaTxParams', [
      handlerContract,
      handlerSelector,
      action,
      deadline,
      maxGasPrice,
      signer
    ]);
  }

  async generateUnsignedMetaTransactionForNew(
    requester: Address,
    target: Address,
    value: bigint,
    gasLimit: bigint,
    operationType: Hex,
    executionSelector: Hex,
    executionParams: Hex,
    metaTxParams: MetaTxParams
  ): Promise<MetaTransaction> {
    return this.executeReadContract<MetaTransaction>('generateUnsignedMetaTransactionForNew', [
      requester,
      target,
      value,
      gasLimit,
      operationType,
      executionSelector,
      executionParams,
      metaTxParams
    ]);
  }

  async generateUnsignedMetaTransactionForExisting(
    txId: bigint,
    metaTxParams: MetaTxParams
  ): Promise<MetaTransaction> {
    return this.executeReadContract<MetaTransaction>('generateUnsignedMetaTransactionForExisting', [
      txId,
      metaTxParams
    ]);
  }

  // ============ STATE QUERIES ============

  async getTransactionHistory(fromTxId: bigint, toTxId: bigint): Promise<TxRecord[]> {
    return this.executeReadContract<TxRecord[]>('getTransactionHistory', [fromTxId, toTxId]);
  }

  async getTransaction(txId: bigint): Promise<TxRecord> {
    return this.executeReadContract<TxRecord>('getTransaction', [txId]);
  }

  async getPendingTransactions(): Promise<bigint[]> {
    return this.executeReadContract<bigint[]>('getPendingTransactions');
  }

  // ============ ROLE AND PERMISSION QUERIES ============

  async getRole(roleHash: Hex): Promise<{
    roleName: string;
    roleHashReturn: Hex;
    maxWallets: bigint;
    walletCount: bigint;
    isProtected: boolean;
  }> {
    return this.executeReadContract<{
      roleName: string;
      roleHashReturn: Hex;
      maxWallets: bigint;
      walletCount: bigint;
      isProtected: boolean;
    }>('getRole', [roleHash]);
  }

  async hasRole(roleHash: Hex, wallet: Address): Promise<boolean> {
    return this.executeReadContract<boolean>('hasRole', [roleHash, wallet]);
  }

  async isActionSupportedByFunction(functionSelector: Hex, action: TxAction): Promise<boolean> {
    return this.executeReadContract<boolean>('isActionSupportedByFunction', [functionSelector, action]);
  }

  async getActiveRolePermissions(roleHash: Hex): Promise<any[]> {
    return this.executeReadContract<any[]>('getActiveRolePermissions', [roleHash]);
  }

  async functionSchemaExists(functionSelector: Hex): Promise<boolean> {
    return this.executeReadContract<boolean>('functionSchemaExists', [functionSelector]);
  }

  async getSignerNonce(signer: Address): Promise<bigint> {
    return this.executeReadContract<bigint>('getSignerNonce', [signer]);
  }

  // ============ SYSTEM STATE QUERIES ============

  async getSupportedOperationTypes(): Promise<Hex[]> {
    return this.executeReadContract<Hex[]>('getSupportedOperationTypes');
  }

  async getSupportedRoles(): Promise<Hex[]> {
    return this.executeReadContract<Hex[]>('getSupportedRoles');
  }

  async getSupportedFunctions(): Promise<Hex[]> {
    return this.executeReadContract<Hex[]>('getSupportedFunctions');
  }

  async getTimeLockPeriodSec(): Promise<bigint> {
    return this.executeReadContract<bigint>('getTimeLockPeriodSec');
  }

  async initialized(): Promise<boolean> {
    return this.executeReadContract<boolean>('initialized');
  }

  // ============ SYSTEM ROLE QUERY FUNCTIONS ============

  /**
   * @dev Returns the owner of the contract
   * @return The owner of the contract
   */
  async owner(): Promise<Address> {
    return this.executeReadContract<Address>('owner');
  }

  /**
   * @dev Returns the broadcaster address
   * @return The broadcaster address
   */
  async getBroadcaster(): Promise<Address> {
    return this.executeReadContract<Address>('getBroadcaster');
  }

  /**
   * @dev Returns the recovery address
   * @return The recovery address
   */
  async getRecovery(): Promise<Address> {
    return this.executeReadContract<Address>('getRecovery');
  }

  // ============ INTERFACE SUPPORT ============

  async supportsInterface(interfaceId: Hex): Promise<boolean> {
    return this.executeReadContract<boolean>('supportsInterface', [interfaceId]);
  }
}

export default BaseStateMachine;
