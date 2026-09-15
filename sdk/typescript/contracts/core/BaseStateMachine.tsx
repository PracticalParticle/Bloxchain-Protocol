import { Address, PublicClient, WalletClient, Chain, Hex, TransactionReceipt, parseGwei } from 'viem';
import { TransactionOptions, TransactionResult } from '../../interfaces/base.index.js';
import { IBaseStateMachine } from '../../interfaces/base.state.machine.index.js';
import { TxRecord, MetaTransaction, MetaTxParams } from '../../interfaces/lib.index.js';
import { TxAction } from '../../types/lib.index.js';
import { FunctionSchema } from '../../types/definition.index.js';
import { handleViemError } from '../../utils/viem-error-handler.js';
import type { MetaTxDeadlineDuration } from '../../utils/metaTx/metaTransaction.js';
import {
  assertInnerSuccess,
  readInnerOutcomes,
  type InnerStatusAssertOptions,
  type InnerTxOutcome
} from '../../utils/tx-inner-status.js';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

/**
 * @title BaseStateMachine
 * @notice TypeScript wrapper for BaseStateMachine smart contract with common utilities
 */
export abstract class BaseStateMachine implements IBaseStateMachine {
  /**
   * @param client Public client for reads
   * @param walletClient Wallet client for writes; omit for a read-only wrapper
   * @param contractAddress Address of the deployed contract
   * @param chain Chain the contract lives on
   * @param abi Contract ABI
   * @param readAs Optional `from` address to use for **reads** (see {@link setReadSender}).
   *        Many registry and permission views are role-gated (`_validateAnyRole`), so a
   *        read-only wrapper built without a wallet client sends no sender and the
   *        contract sees `address(0)` — which reverts `NoPermission(0x0)`. Pass an
   *        address that holds a role here to read those views without a signer.
   */
  constructor(
    protected client: PublicClient,
    protected walletClient: WalletClient | undefined,
    protected contractAddress: Address,
    protected chain: Chain,
    protected abi: any,
    protected readAs?: Address
  ) {
    if (readAs !== undefined) {
      BaseStateMachine.assertUsableReadSender(readAs);
    }
  }

  // ============ COMMON UTILITY METHODS ============

  /**
   * Validates that wallet client is available for write operations
   */
  protected validateWalletClient(): void {
    if (!this.walletClient) {
      throw new Error('Wallet client is required for this operation');
    }
  }

  // ============ READ SENDER (`readAs`) ============

  /** Rejects a read sender that would reproduce the `NoPermission(0x0)` failure it exists to prevent. */
  private static assertUsableReadSender(address: Address): void {
    if (typeof address !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(address)) {
      throw new Error(`readAs: expected a 20-byte address, got "${String(address)}"`);
    }
    if (address.toLowerCase() === ZERO_ADDRESS) {
      throw new Error(
        'readAs: the zero address is not a usable read sender — role-gated views revert ' +
          'NoPermission(0x0) for it. Pass an address that holds a role, or omit readAs.'
      );
    }
  }

  /**
   * Sets the `from` address used for **read** calls (`eth_call`), without needing a wallet client.
   *
   * Registry and permission views on a Blox are role-gated for privacy
   * (`getWalletRoles`, `getAuthorizedWallets`, `getActiveRolePermissions`, …).
   * A read-only wrapper has no account to send, so the contract sees `address(0)`
   * and reverts `NoPermission(0x0)` — a confusing failure for something that
   * reads nothing but public-by-role state.
   *
   * ```ts
   * const reader = new RuntimeRBAC(publicClient, undefined, account, chain);
   * reader.setReadSender(ownerAddress);
   * await reader.getWalletRoles(someWallet); // now answers
   * ```
   *
   * @param address Address to send as `from`, or `undefined` to clear
   * @returns `this`, for chaining
   */
  setReadSender(address?: Address): this {
    if (address !== undefined) {
      BaseStateMachine.assertUsableReadSender(address);
    }
    this.readAs = address;
    return this;
  }

  /**
   * The address reads are currently sent as, or `undefined` when none is set and
   * no wallet client account is available.
   *
   * Resolution order: an explicit per-call `readAs` → the wrapper's
   * {@link setReadSender} value → the wallet client's account. Never `address(0)`.
   */
  getReadSender(): Address | undefined {
    return this.readAs ?? (this.walletClient?.account?.address as Address | undefined);
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

    // Determine how strictly to enforce pre-flight simulation.
    const simulationMode = options.simulationMode ?? 'strict';

    try {
      // Simulate the contract call first for better error messages (no gas params for eth_call).
      if (simulationMode !== 'skip') {
        try {
          await this.client.simulateContract({
            ...writeContractParams,
            account: writeContractParams.account || this.walletClient!.account
          });
        } catch (simulateError: any) {
          if (simulationMode === 'strict') {
            throw simulateError;
          }

          const msg =
            simulateError?.shortMessage ??
            simulateError?.message ??
            simulateError?.cause?.shortMessage ??
            simulateError?.cause?.message ??
            String(simulateError);
          // eslint-disable-next-line no-console
          console.warn(
            `[BaseStateMachine] Pre-flight simulation failed for ${functionName} (mode=${simulationMode}); continuing to send tx: ${msg}`
          );
        }
      }

      // Forward explicit gas limit when provided so callers can bypass eth_estimateGas.
      if (options.gas !== undefined) {
        const rawGas = options.gas;
        let gasLimit: bigint;
        if (typeof rawGas === 'bigint') {
          gasLimit = rawGas;
        } else if (typeof rawGas === 'number') {
          if (!Number.isSafeInteger(rawGas) || rawGas < 0) {
            throw new Error(
              `Invalid gas: number inputs must be non-negative safe integers (got "${rawGas}"). ` +
              'Use a bigint or decimal string for larger values.'
            );
          }
          gasLimit = BigInt(rawGas);
        } else {
          const s = String(rawGas).trim();
          if (!/^\d+$/.test(s)) {
            throw new Error(
              `Invalid gas: must be a non-negative integer (got "${options.gas}"). Use a number-like value, decimal string, or bigint.`
            );
          }
          gasLimit = BigInt(s);
        }
        if (gasLimit < 0n) {
          throw new Error(`Invalid gas: must be non-negative (got ${gasLimit.toString()})`);
        }
        writeContractParams.gas = gasLimit;
      }

      // Add gas price override for write only (EIP-1559); viem rejects mixing gasPrice with maxFeePerGas.
      if (options.gasPrice !== undefined && options.gasPrice !== '') {
        const raw = options.gasPrice;
        let gasPriceWei: bigint;
        if (typeof raw === 'bigint') {
          gasPriceWei = raw;
        } else {
          const s = String(raw).trim();
          if (!/^\d+$/.test(s)) {
            throw new Error(`Invalid gas price: must be a non-negative integer (got "${options.gasPrice}"). Use wei as a string or bigint.`);
          }
          gasPriceWei = BigInt(s);
        }
        writeContractParams.maxFeePerGas = gasPriceWei;
        // Use a separate priority fee so when base fee is high the tip does not go to zero (avoids tx stalling).
        const oneGwei = parseGwei('1');
        writeContractParams.maxPriorityFeePerGas = gasPriceWei <= oneGwei ? gasPriceWei : oneGwei;
      }

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
   *
   * @param functionName View / pure function to call
   * @param args Call arguments
   * @param readAs Optional `from` address for this call only; overrides
   *        {@link setReadSender} and the wallet client's account. Role-gated views
   *        need a sender that holds a role — see the `readAs` constructor note.
   */
  protected async executeReadContract<T>(
    functionName: string,
    args: any[] = [],
    readAs?: Address
  ): Promise<T> {
    if (readAs !== undefined) {
      BaseStateMachine.assertUsableReadSender(readAs);
    }
    // Resolution order: explicit per-call sender → wrapper `readAs` → wallet client account.
    // `undefined` means "send no `from`" — never the zero address.
    const account = readAs ?? this.readAs ?? this.walletClient?.account;
    try {
    const result = await this.client.readContract({
      address: this.contractAddress,
      abi: this.abi,
      functionName,
      args,
      // Include account for permission checks on role-gated views
      account: account as any
    });

    return result as T;
    } catch (error: any) {
      // Try to decode the error if it's a contract revert
      if (error.data || error.cause?.data) {
        const errorData = error.data || error.cause?.data;
        if (errorData && typeof errorData === 'string' && errorData.startsWith('0x')) {
          try {
            const { decodeErrorResult } = await import('viem');
            const decoded = decodeErrorResult({
              abi: this.abi,
              data: errorData as `0x${string}`
            });
            throw new Error(`${decoded.errorName}(${JSON.stringify(decoded.args)})`);
          } catch (decodeError) {
            // If decoding fails, throw the original error
            throw error;
          }
        }
      }
      throw error;
    }
  }

  // ============ INNER TRANSACTION STATUS ============

  /**
   * Wait for a transaction and assert the work **inside** it succeeded.
   *
   * A mined transaction is not a successful one. When a guarded inner call
   * reverts, `EngineBlox._completeTransaction` catches it: the record is written
   * `TxStatus.FAILED`, the revert bytes are emitted on `TxExecutionResult`, and
   * the outer transaction still mines with `status: 'success'` — having charged
   * for all the gas it burned. A role-configuration batch can cost two million
   * gas, report success, and grant nothing.
   *
   * Use this instead of `result.wait()` after any guarded write or config batch:
   *
   * ```ts
   * const res = await account.roleConfigBatchRequestAndApprove(metaTx, { from: broadcaster });
   * const receipt = await account.waitForTransactionAndAssertInner(res);
   * // past this line the roles really were granted
   * ```
   *
   * @param hashOrResult Transaction hash, or the `TransactionResult` from a write
   * @param options `abi` to decode the inner revert against (pass the **target's**
   *        ABI, or `ALL_ERROR_ABI` from `@bloxchain/sdk/abi`); `failOnCancelled`
   *        to treat a cancellation as a failure. Scoped to this wrapper's
   *        contract address unless `address` says otherwise.
   * @throws InnerTransactionFailedError when the outer receipt succeeded but a record failed
   */
  async waitForTransactionAndAssertInner(
    hashOrResult: Hex | TransactionResult,
    options: InnerStatusAssertOptions & { confirmations?: number; timeout?: number } = {}
  ): Promise<TransactionReceipt> {
    const hash = typeof hashOrResult === 'string' ? hashOrResult : (hashOrResult.hash as Hex);
    const receipt = await this.client.waitForTransactionReceipt({
      hash,
      ...(options.confirmations !== undefined ? { confirmations: options.confirmations } : {}),
      ...(options.timeout !== undefined ? { timeout: options.timeout } : {})
    });

    if (receipt.status !== 'success') {
      throw new Error(`Transaction ${hash} reverted (receipt status "${receipt.status}")`);
    }

    assertInnerSuccess(receipt, {
      address: this.contractAddress,
      abi: this.abi as readonly unknown[],
      ...options
    });
    return receipt;
  }

  /**
   * Every record in this receipt that reached a terminal state
   * (`COMPLETED` / `FAILED` / `CANCELLED`), with any failure decoded.
   *
   * The non-throwing half of {@link waitForTransactionAndAssertInner} — for when
   * you want to report what happened rather than stop on it.
   */
  readInnerOutcomes(
    receipt: TransactionReceipt,
    options: InnerStatusAssertOptions = {}
  ): InnerTxOutcome[] {
    return readInnerOutcomes(receipt, {
      address: this.contractAddress,
      abi: this.abi as readonly unknown[],
      ...options
    });
  }

  // ============ META-TRANSACTION UTILITIES ============

  /**
   * @dev Builds `MetaTxParams` on chain (nonce and chain id come from the contract).
   * @param handlerContract Verifying account address (EIP-712 `verifyingContract`)
   * @param handlerSelector Selector of the exact external function that will submit this meta-tx
   * @param action Transaction action
   * @param deadlineDuration Validity window in **seconds from chain time**, not an
   *        absolute timestamp — the contract stores `block.timestamp + deadlineDuration`.
   *        Use {@link metaTxDeadlineFor} to compute it; on a chain that mines on
   *        demand the latest block's timestamp can lag wall clock, and a duration
   *        computed without that correction produces a meta-tx that is born expired.
   * @param maxGasPrice Maximum gas price
   * @param signer Signer address
   */
  async createMetaTxParams(
    handlerContract: Address,
    handlerSelector: Hex,
    action: TxAction,
    deadlineDuration: MetaTxDeadlineDuration,
    maxGasPrice: bigint,
    signer: Address
  ): Promise<MetaTxParams> {
    return this.executeReadContract<MetaTxParams>('createMetaTxParams', [
      handlerContract,
      handlerSelector,
      action,
      deadlineDuration,
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

  /** Returns `[]` when there are no txs yet or the clamped id range does not overlap `1..txCounter`. */
  async getTransactionHistory(fromTxId: bigint, toTxId: bigint, readAs?: Address): Promise<TxRecord[]> {
    return this.executeReadContract<TxRecord[]>('getTransactionHistory', [fromTxId, toTxId], readAs);
  }

  async getTransaction(txId: bigint, readAs?: Address): Promise<TxRecord> {
    return this.executeReadContract<TxRecord>('getTransaction', [txId], readAs);
  }

  async getPendingTransactions(readAs?: Address): Promise<bigint[]> {
    return this.executeReadContract<bigint[]>('getPendingTransactions', [], readAs);
  }

  // ============ ROLE AND PERMISSION QUERIES ============

  async getRole(roleHash: Hex, readAs?: Address): Promise<{
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
    }>('getRole', [roleHash], readAs);
  }

  async hasRole(roleHash: Hex, wallet: Address): Promise<boolean> {
    return this.executeReadContract<boolean>('hasRole', [roleHash, wallet]);
  }

  /**
   * Gets all roles assigned to a wallet
   * @param wallet The wallet address to get roles for
   * @returns Array of role hashes assigned to the wallet
   * @notice Requires caller to have any role for privacy protection
   * @notice This function uses the reverse index for efficient lookup
   */
  async getWalletRoles(wallet: Address, readAs?: Address): Promise<Hex[]> {
    return this.executeReadContract<Hex[]>('getWalletRoles', [wallet], readAs);
  }

  /**
   * Gets all authorized wallets for a role
   * @param roleHash The role hash to get wallets for
   * @returns Array of authorized wallet addresses
   * @notice Requires caller to have any role for privacy protection
   */
  async getAuthorizedWallets(roleHash: Hex, readAs?: Address): Promise<Address[]> {
    return this.executeReadContract<Address[]>('getAuthorizedWallets', [roleHash], readAs);
  }

  async getActiveRolePermissions(roleHash: Hex, readAs?: Address): Promise<any[]> {
    return this.executeReadContract<any[]>('getActiveRolePermissions', [roleHash], readAs);
  }

  async getFunctionSchema(functionSelector: Hex, readAs?: Address): Promise<FunctionSchema> {
    return this.executeReadContract<FunctionSchema>('getFunctionSchema', [functionSelector], readAs);
  }

  async getSignerNonce(signer: Address, readAs?: Address): Promise<bigint> {
    return this.executeReadContract<bigint>('getSignerNonce', [signer], readAs);
  }

  // ============ SYSTEM STATE QUERIES ============

  async getSupportedOperationTypes(readAs?: Address): Promise<Hex[]> {
    return this.executeReadContract<Hex[]>('getSupportedOperationTypes', [], readAs);
  }

  async getSupportedRoles(readAs?: Address): Promise<Hex[]> {
    return this.executeReadContract<Hex[]>('getSupportedRoles', [], readAs);
  }

  async getSupportedFunctions(readAs?: Address): Promise<Hex[]> {
    return this.executeReadContract<Hex[]>('getSupportedFunctions', [], readAs);
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
   * @dev Returns all broadcaster addresses
   * @return Array of broadcaster addresses
   */
  async getBroadcasters(): Promise<Address[]> {
    return this.executeReadContract<Address[]>('getBroadcasters');
  }

  /**
   * @dev Returns the recovery address
   * @return The recovery address
   */
  async getRecovery(): Promise<Address> {
    return this.executeReadContract<Address>('getRecovery');
  }

  /**
   * @dev Returns all hook contracts registered for a function selector
   * @param functionSelector The function selector to query hooks for
   * @return Array of hook contract addresses
   */
  async getHooks(functionSelector: Hex, readAs?: Address): Promise<Address[]> {
    return this.executeReadContract<Address[]>('getHooks', [functionSelector], readAs);
  }

  // ============ INTERFACE SUPPORT ============

  async supportsInterface(interfaceId: Hex): Promise<boolean> {
    return this.executeReadContract<boolean>('supportsInterface', [interfaceId]);
  }

  /**
   * @dev Check if this contract supports IBaseStateMachine interface
   * @return Promise<boolean> indicating if IBaseStateMachine is supported
   */
  async supportsBaseStateMachineInterface(): Promise<boolean> {
    // Import dynamically to avoid circular dependencies
    const { INTERFACE_IDS } = await import('../../utils/interface-ids.js');
    return this.supportsInterface(INTERFACE_IDS.IBaseStateMachine);
  }
}

export default BaseStateMachine;
