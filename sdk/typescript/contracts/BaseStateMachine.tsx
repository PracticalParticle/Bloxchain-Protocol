import { Address, PublicClient, WalletClient, Chain, Hex } from 'viem';
// import BaseStateMachineABIJson from '../../../abi/BaseStateMachine.abi.json';
import { TransactionOptions, TransactionResult } from '../interfaces/base.index';
import { IBaseStateMachine } from '../interfaces/base.state.machine.index';
import { TxRecord, MetaTransaction, MetaTxParams } from '../interfaces/lib.index';
import { ExecutionType, TxAction } from '../types/lib.index';

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
    
    const hash = await this.walletClient!.writeContract({
      chain: this.chain,
      address: this.contractAddress,
      abi: this.abi,
      functionName,
      args,
      account: options.from
    });

    return {
      hash,
      wait: () => this.client.waitForTransactionReceipt({ hash })
    };
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
    executionType: ExecutionType,
    executionOptions: Hex,
    metaTxParams: MetaTxParams
  ): Promise<MetaTransaction> {
    return this.executeReadContract<MetaTransaction>('generateUnsignedMetaTransactionForNew', [
      requester,
      target,
      value,
      gasLimit,
      operationType,
      executionType,
      executionOptions,
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

  // ============ INTERFACE SUPPORT ============

  async supportsInterface(interfaceId: Hex): Promise<boolean> {
    return this.executeReadContract<boolean>('supportsInterface', [interfaceId]);
  }
}

export default BaseStateMachine;
