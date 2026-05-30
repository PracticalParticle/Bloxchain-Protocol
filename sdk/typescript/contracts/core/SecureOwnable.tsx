import { Address, PublicClient, WalletClient, Chain, Hex } from 'viem';
import SecureOwnableABIJson from '../../abi/SecureOwnable.abi.json' with { type: 'json' };
import { TransactionOptions, TransactionResult } from '../../interfaces/base.index.js';
import { ISecureOwnable } from '../../interfaces/core.security.index.js';
import { MetaTransaction } from '../../interfaces/lib.index.js';
import { BaseStateMachine } from './BaseStateMachine.js';
import { INTERFACE_IDS } from '../../utils/interface-ids.js';

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
  async updateBroadcasterRequest(newBroadcaster: Address, currentBroadcaster: Address, options: TransactionOptions): Promise<TransactionResult> {
    return this.executeWriteContract('updateBroadcasterRequest', [newBroadcaster, currentBroadcaster], options);
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
  async updateRecoveryRequestAndApprove(metaTx: MetaTransaction, options: TransactionOptions): Promise<TransactionResult> {
    return this.executeWriteContract('updateRecoveryRequestAndApprove', [metaTx], options);
  }

  /** Broadcaster-only: execute approved recovery update (see SecureOwnableDefinitions). */
  async executeRecoveryUpdate(newRecovery: Address, options: TransactionOptions): Promise<TransactionResult> {
    return this.executeWriteContract('executeRecoveryUpdate', [newRecovery], options);
  }

  // TimeLock Management
  async updateTimeLockRequestAndApprove(metaTx: MetaTransaction, options: TransactionOptions): Promise<TransactionResult> {
    return this.executeWriteContract('updateTimeLockRequestAndApprove', [metaTx], options);
  }

  /** Broadcaster-only: execute approved timelock period update. */
  async executeTimeLockUpdate(newPeriodSec: bigint, options: TransactionOptions): Promise<TransactionResult> {
    return this.executeWriteContract('executeTimeLockUpdate', [newPeriodSec], options);
  }

  /** Broadcaster-only: execute approved ownership transfer. */
  async executeTransferOwnership(newOwner: Address, options: TransactionOptions): Promise<TransactionResult> {
    return this.executeWriteContract('executeTransferOwnership', [newOwner], options);
  }

  /** Broadcaster-only: execute approved broadcaster rotation. */
  async executeBroadcasterUpdate(
    newBroadcaster: Address,
    currentBroadcaster: Address,
    options: TransactionOptions
  ): Promise<TransactionResult> {
    return this.executeWriteContract('executeBroadcasterUpdate', [newBroadcaster, currentBroadcaster], options);
  }

  // ============ INTERFACE SUPPORT ============

  /**
   * @dev Check if this contract supports ISecureOwnable interface
   * @return Promise<boolean> indicating if ISecureOwnable is supported
   */
  async supportsSecureOwnableInterface(): Promise<boolean> {
    return this.supportsInterface(INTERFACE_IDS.ISecureOwnable);
  }
}

export default SecureOwnable;
