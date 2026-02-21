import { Address, PublicClient, WalletClient, Chain, Hex } from 'viem';
import RuntimeRBACABIJson from '../../abi/RuntimeRBAC.abi.json';
import { TransactionOptions, TransactionResult } from '../../interfaces/base.index';
import { IRuntimeRBAC } from '../../interfaces/core.access.index';
import { MetaTransaction } from '../../interfaces/lib.index';
import { BaseStateMachine } from './BaseStateMachine';
import { INTERFACE_IDS } from '../../utils/interface-ids';

/**
 * @title RuntimeRBAC
 * @notice TypeScript wrapper for RuntimeRBAC smart contract
 * @dev Matches the actual Solidity contract implementation
 * @dev Extends BaseStateMachine directly for modular architecture
 */
export class RuntimeRBAC extends BaseStateMachine implements IRuntimeRBAC {
  constructor(
    client: PublicClient,
    walletClient: WalletClient | undefined,
    contractAddress: Address,
    chain: Chain
  ) {
    super(client, walletClient, contractAddress, chain, RuntimeRBACABIJson);
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
    return this.supportsInterface(INTERFACE_IDS.IRuntimeRBAC);
  }

}

export default RuntimeRBAC;
