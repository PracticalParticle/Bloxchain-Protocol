import { Address, PublicClient, WalletClient, Chain, Hex } from 'viem';
import SecureOwnableABIJson from '../../abi/SecureOwnable.abi.json';
import { TransactionOptions, TransactionResult } from '../../interfaces/base.index';
import { ISecureOwnable } from '../../interfaces/core.security.index';
import { MetaTransaction } from '../../interfaces/lib.index';
import { TxAction } from '../../types/lib.index';
import { BaseStateMachine } from './BaseStateMachine';
import { INTERFACE_IDS } from '../../utils/interface-ids';
import { updateRecoveryExecutionParams as defUpdateRecoveryExecutionParams, updateTimeLockExecutionParams as defUpdateTimeLockExecutionParams } from '../../lib/definitions/SecureOwnableDefinitions';

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
  async updateBroadcasterRequest(newBroadcaster: Address, location: bigint, options: TransactionOptions): Promise<TransactionResult> {
    return this.executeWriteContract('updateBroadcasterRequest', [newBroadcaster, location], options);
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
  /**
   * @dev Wrapper matching ISecureOwnable interface; delegates to definition helper (no contract call)
   */
  async updateRecoveryExecutionOptions(newRecoveryAddress: Address): Promise<Hex> {
    return this.updateRecoveryExecutionParams(newRecoveryAddress);
  }

  async updateRecoveryExecutionParams(newRecoveryAddress: Address): Promise<Hex> {
    return Promise.resolve(defUpdateRecoveryExecutionParams(newRecoveryAddress));
  }

  async updateRecoveryRequestAndApprove(metaTx: MetaTransaction, options: TransactionOptions): Promise<TransactionResult> {
    return this.executeWriteContract('updateRecoveryRequestAndApprove', [metaTx], options);
  }

  // TimeLock Management
  /**
   * @dev Wrapper matching ISecureOwnable interface; delegates to definition helper (no contract call)
   */
  async updateTimeLockExecutionOptions(newTimeLockPeriodSec: bigint): Promise<Hex> {
    return this.updateTimeLockExecutionParams(newTimeLockPeriodSec);
  }

  async updateTimeLockExecutionParams(newTimeLockPeriodSec: bigint): Promise<Hex> {
    return Promise.resolve(defUpdateTimeLockExecutionParams(newTimeLockPeriodSec));
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
  // - getBroadcasters()
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
