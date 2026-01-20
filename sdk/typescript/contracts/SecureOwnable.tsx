import { Address, PublicClient, WalletClient, Chain, Hex } from 'viem';
import SecureOwnableABIJson from '../../../abi/SecureOwnable.abi.json';
import { TransactionOptions, TransactionResult } from '../interfaces/base.index';
import { ISecureOwnable } from '../interfaces/core.security.index';
import { MetaTransaction } from '../interfaces/lib.index';
import { TxAction } from '../types/lib.index';
import { BaseStateMachine } from './BaseStateMachine';
import { INTERFACE_IDS } from '../utils/interface-ids';

/**
 * @title SecureOwnable
 * @notice TypeScript wrapper for SecureOwnable smart contract
 */
export class SecureOwnable extends BaseStateMachine implements ISecureOwnable {
  constructor(
    client: PublicClient,
    walletClient: WalletClient | undefined,
    contractAddress: Address,
    chain: Chain
  ) {
    super(client, walletClient, contractAddress, chain, SecureOwnableABIJson);
  }

  // Ownership Management
  async transferOwnershipRequest(options: TransactionOptions): Promise<TransactionResult> {
    return this.executeWriteContract('transferOwnershipRequest', [], options);
  }

  async transferOwnershipDelayedApproval(txId: bigint, options: TransactionOptions): Promise<TransactionResult> {
    return this.executeWriteContract('transferOwnershipDelayedApproval', [txId], options);
  }

  async transferOwnershipApprovalWithMetaTx(metaTx: MetaTransaction, options: TransactionOptions): Promise<TransactionResult> {
    return this.executeWriteContract('transferOwnershipApprovalWithMetaTx', [metaTx], options);
  }

  async transferOwnershipCancellation(txId: bigint, options: TransactionOptions): Promise<TransactionResult> {
    return this.executeWriteContract('transferOwnershipCancellation', [txId], options);
  }

  async transferOwnershipCancellationWithMetaTx(metaTx: MetaTransaction, options: TransactionOptions): Promise<TransactionResult> {
    return this.executeWriteContract('transferOwnershipCancellationWithMetaTx', [metaTx], options);
  }

  // Broadcaster Management
  async updateBroadcasterRequest(newBroadcaster: Address, options: TransactionOptions): Promise<TransactionResult> {
    return this.executeWriteContract('updateBroadcasterRequest', [newBroadcaster], options);
  }

  async updateBroadcasterDelayedApproval(txId: bigint, options: TransactionOptions): Promise<TransactionResult> {
    return this.executeWriteContract('updateBroadcasterDelayedApproval', [txId], options);
  }

  async updateBroadcasterApprovalWithMetaTx(metaTx: MetaTransaction, options: TransactionOptions): Promise<TransactionResult> {
    return this.executeWriteContract('updateBroadcasterApprovalWithMetaTx', [metaTx], options);
  }

  async updateBroadcasterCancellation(txId: bigint, options: TransactionOptions): Promise<TransactionResult> {
    return this.executeWriteContract('updateBroadcasterCancellation', [txId], options);
  }

  async updateBroadcasterCancellationWithMetaTx(metaTx: MetaTransaction, options: TransactionOptions): Promise<TransactionResult> {
    return this.executeWriteContract('updateBroadcasterCancellationWithMetaTx', [metaTx], options);
  }

  // Recovery Management
  async updateRecoveryExecutionParams(newRecoveryAddress: Address): Promise<Hex> {
    const result = await this.executeReadContract<Hex>('updateRecoveryExecutionParams', [newRecoveryAddress]);
    // Ensure result is a Hex string (viem should return this, but ensure it's properly formatted)
    if (typeof result === 'string' && result.startsWith('0x')) {
      return result as Hex;
    }
    // If result is Uint8Array or other format, convert to Hex
    if (result instanceof Uint8Array) {
      return `0x${Array.from(result).map(b => b.toString(16).padStart(2, '0')).join('')}` as Hex;
    }
    throw new Error(`Unexpected return type from updateRecoveryExecutionParams: ${typeof result}`);
  }

  async updateRecoveryRequestAndApprove(metaTx: MetaTransaction, options: TransactionOptions): Promise<TransactionResult> {
    return this.executeWriteContract('updateRecoveryRequestAndApprove', [metaTx], options);
  }

  // TimeLock Management
  async updateTimeLockExecutionParams(newTimeLockPeriodSec: bigint): Promise<Hex> {
    const result = await this.executeReadContract<any>('updateTimeLockExecutionParams', [newTimeLockPeriodSec]);
    
    // viem returns bytes as Hex string, but ensure it's properly formatted
    if (result === null || result === undefined) {
      throw new Error('updateTimeLockExecutionParams returned null or undefined');
    }
    
    // Convert to Hex if needed
    if (typeof result === 'string' && result.startsWith('0x')) {
      return result as Hex;
    }
    
    // If result is Uint8Array, convert to Hex
    if (result instanceof Uint8Array) {
      const { toHex } = await import('viem');
      return toHex(result) as Hex;
    }
    
    // If result is already a Hex type from viem
    if (typeof result === 'string') {
      return `0x${result.replace(/^0x/, '')}` as Hex;
    }
    
    throw new Error(`Unexpected return type from updateTimeLockExecutionParams: ${typeof result}, value: ${result}`);
  }

  async updateTimeLockRequestAndApprove(metaTx: MetaTransaction, options: TransactionOptions): Promise<TransactionResult> {
    return this.executeWriteContract('updateTimeLockRequestAndApprove', [metaTx], options);
  }

  // ============ INTERFACE SUPPORT ============

  /**
   * @dev Check if this contract supports ISecureOwnable interface
   * @return Promise<boolean> indicating if ISecureOwnable is supported
   */
  async supportsSecureOwnableInterface(): Promise<boolean> {
    return this.supportsInterface(INTERFACE_IDS.ISecureOwnable);
  }

  // Note: The following methods are available through BaseStateMachine inheritance:
  // - owner()
  // - getBroadcaster()
  // - getRecovery()
  // - getTimeLockPeriodSec()
  // - getSupportedOperationTypes()
  // - getSupportedRoles()
  // - getSupportedFunctions()
  // - hasRole()
  // - isActionSupportedByFunction()
  // - getSignerNonce()
  // - getActiveRolePermissions()
  // - initialized()
  // - supportsInterface(interfaceId)
  // - functionSchemaExists()
}

export default SecureOwnable;
