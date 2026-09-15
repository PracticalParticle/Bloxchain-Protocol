import { Address, PublicClient, WalletClient, Chain, Hex } from 'viem';
import RuntimeRBACABIJson from '../../abi/RuntimeRBAC.abi.json' with { type: 'json' };
import { TransactionOptions, TransactionResult } from '../../interfaces/base.index.js';
import { IRuntimeRBAC } from '../../interfaces/core.access.index.js';
import { MetaTransaction } from '../../interfaces/lib.index.js';
import { BaseStateMachine } from './BaseStateMachine.js';
import { ComponentDetection } from '../../utils/interface-ids.js';

/**
 * @title RuntimeRBAC
 * @notice TypeScript wrapper for RuntimeRBAC smart contract
 * @dev Matches the actual Solidity contract implementation
 * @dev Extends BaseStateMachine directly for modular architecture
 */
export class RuntimeRBAC extends BaseStateMachine implements IRuntimeRBAC {
  /**
   * @param readAs Optional `from` address for role-gated **reads** — lets a read-only
   *        wrapper (no `walletClient`) query permissioned views such as
   *        `getWalletRoles` instead of being refused `NoPermission(0x0)`.
   *        See `BaseStateMachine.setReadSender`.
   */
  constructor(
    client: PublicClient,
    walletClient: WalletClient | undefined,
    contractAddress: Address,
    chain: Chain,
    readAs?: Address
  ) {
    super(client, walletClient, contractAddress, chain, RuntimeRBACABIJson, readAs);
  }

  // ============ ROLE CONFIGURATION BATCH ============

  /**
   * @dev Requests and approves a RBAC configuration batch using a meta-transaction
   * @param metaTx The meta-transaction
   * @param options Transaction options
   */
  async roleConfigBatchRequestAndApprove(
    metaTx: MetaTransaction,
    options: TransactionOptions
  ): Promise<TransactionResult> {
    return this.executeWriteContract('roleConfigBatchRequestAndApprove', [metaTx], options);
  }

  // ============ INTERFACE SUPPORT ============

  /**
   * @dev Check if this contract supports IRuntimeRBAC interface
   * @return Promise<boolean> indicating if IRuntimeRBAC is supported
   */
  async supportsRuntimeRBACInterface(): Promise<boolean> {
    return ComponentDetection.isRuntimeRBAC(this);
  }

}

export default RuntimeRBAC;
