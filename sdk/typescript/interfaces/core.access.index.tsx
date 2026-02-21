import { Address, Hex } from 'viem';
import { TransactionResult, TransactionOptions } from './base.index';
import { MetaTransaction } from './lib.index';
import { TxAction } from '../types/lib.index';
import type { RoleConfigAction } from '../types/core.access.index';

/**
 * Interface for RuntimeRBAC contract methods
 * Note: This interface matches the actual contract methods. Some convenience methods
 * may be provided but are not part of the core contract interface.
 */
export interface IRuntimeRBAC {
  /**
   * @dev Requests and approves a RBAC configuration batch using a meta-transaction
   */
  roleConfigBatchRequestAndApprove(
    metaTx: MetaTransaction,
    options: TransactionOptions
  ): Promise<TransactionResult>;

  /**
   * @dev Gets all authorized wallets for a role (inherited from BaseStateMachine)
   * @param roleHash The role hash to get wallets for
   * @return Array of authorized wallet addresses
   */
  getWalletsInRole(roleHash: Hex): Promise<Address[]>;
}
