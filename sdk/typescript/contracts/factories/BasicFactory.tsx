import {
  Address,
  PublicClient,
  WalletClient,
  Chain,
  Abi,
  getAddress,
  keccak256,
  parseGwei,
  toBytes,
  toFunctionSelector,
} from 'viem';
import { TransactionOptions, TransactionResult } from '../../interfaces/base.index.js';
import { GAS_ENVELOPE, MAX_TX_GAS } from '../../utils/gas.js';
import { isAccountBlox } from '../../utils/account-gate.js';
import { handleViemError } from '../../utils/viem-error-handler.js';
import BasicFactoryAbi from '../../abi/BasicFactory.abi.json' with { type: 'json' };

/**
 * @title BasicFactory
 * @notice Thin TypeScript wrapper for the canonical pinned factory.
 *
 * SPEC-2026-0130 (pinned follow-up). `BasicFactory` clones exactly one implementation, fixed
 * in its constructor (a `BasicAccount`), and initializes the clone in the same transaction.
 * It is **not** an account: no owner, no roles, no timelock, no catalog. A new official
 * account means a new factory, so this wrapper has nothing to govern.
 *
 * - **Mint:** permissionless, four arguments, no implementation argument.
 *   {@link cloneBlox} sends at the EIP-7825 cap (`16777216`), like CopyBlox.
 * - **Pin:** {@link implementation} reads the one address every mint clones.
 * - **Lineage:** {@link isClone} means "minted by this factory". It does not mean every copy
 *   of the implementation on the chain came from this factory.
 *
 * The account gate rejects the factory address because it has no `owner()`. No official
 * `BasicFactory` deployment is declared; pass the address you deployed.
 */

/** Selectors on the pinned factory. */
export const BASIC_FACTORY_SELECTORS = {
  CLONE_BLOX: toFunctionSelector('cloneBlox(address,address,address,uint256)'),
  IMPLEMENTATION: toFunctionSelector('implementation()'),
} as const;

/** Roles and timelock a clone is initialized with (`BasicAccount`: 1 day to 90 days). */
export interface BasicCloneParams {
  initialOwner: Address;
  broadcaster: Address;
  recovery: Address;
  timeLockPeriodSec: bigint;
}

const BLOX_CLONED_TOPIC = keccak256(toBytes('BloxCloned(address,address,address)')).toLowerCase();

/**
 * TypeScript wrapper for `BasicFactory` (pinned, one implementation).
 */
export class BasicFactory {
  protected readonly abi: Abi = BasicFactoryAbi as Abi;

  constructor(
    protected readonly client: PublicClient,
    protected readonly walletClient: WalletClient | undefined,
    protected readonly contractAddress: Address,
    protected readonly chain: Chain
  ) {}

  get address(): Address {
    return this.contractAddress;
  }

  // ============ MINT ============

  /**
   * Clone the pinned implementation and initialize it in one transaction.
   *
   * Sends `gas` at the EIP-7825 per-transaction cap (`16777216`) by default, never a bare
   * estimate. Pass `options.gas` only to override deliberately.
   *
   * @param params Roles and timelock the clone is initialized with
   * @param options Transaction options; `from` is the sender that pays for the clone
   */
  async cloneBlox(params: BasicCloneParams, options: TransactionOptions): Promise<TransactionResult> {
    if (!this.walletClient) {
      throw new Error('BasicFactory.cloneBlox needs a wallet client');
    }
    const request: any = {
      chain: this.chain,
      address: this.contractAddress,
      abi: this.abi,
      functionName: 'cloneBlox',
      args: [params.initialOwner, params.broadcaster, params.recovery, params.timeLockPeriodSec],
    };
    const walletAccount = this.walletClient.account?.address;
    if (!walletAccount || walletAccount.toLowerCase() !== options.from.toLowerCase()) {
      request.account = options.from;
    }

    try {
      const simulationMode = options.simulationMode ?? 'strict';
      if (simulationMode !== 'skip') {
        try {
          await this.client.simulateContract({ ...request, account: request.account ?? this.walletClient.account });
        } catch (simulateError) {
          if (simulationMode === 'strict') throw simulateError;
          // eslint-disable-next-line no-console
          console.warn(`[BasicFactory] Pre-flight simulation failed for cloneBlox; continuing (mode=${simulationMode})`);
        }
      }

      request.gas = options.gas !== undefined ? BigInt(String(options.gas)) : GAS_ENVELOPE.cloneSendGasLimit;
      if (options.gasPrice !== undefined && options.gasPrice !== '') {
        const maxFee = BigInt(String(options.gasPrice));
        const oneGwei = parseGwei('1');
        request.maxFeePerGas = maxFee;
        request.maxPriorityFeePerGas = maxFee <= oneGwei ? maxFee : oneGwei;
      }

      const hash = await this.walletClient.writeContract(request);
      return { hash, wait: () => this.client.waitForTransactionReceipt({ hash }) };
    } catch (error) {
      throw await handleViemError(error, this.abi as unknown as any[]);
    }
  }

  /**
   * Pull the new clone's address out of a `cloneBlox` receipt (`BloxCloned` from this factory).
   *
   * @returns The clone address, or null when the receipt carries no `BloxCloned` log
   */
  cloneAddressFromReceipt(receipt: { logs: readonly { address: string; topics: readonly string[] }[] }): Address | null {
    const factory = this.contractAddress.toLowerCase();
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== factory) continue;
      if (log.topics.length < 4 || log.topics[0]?.toLowerCase() !== BLOX_CLONED_TOPIC) continue;
      const cloneTopic = log.topics[2];
      if (!cloneTopic) continue;
      return getAddress(`0x${cloneTopic.slice(-40)}`);
    }
    return null;
  }

  // ============ PIN AND LINEAGE ============

  /** The one implementation this factory clones, fixed at construction. */
  async implementation(): Promise<Address> {
    return this.read<Address>('implementation');
  }

  /**
   * True when this factory minted the address.
   *
   * Lineage of this factory only: other copies of the same implementation (deployed or cloned
   * by another path) are not `isClone` here. Combine with {@link isAccountBlox} for shape.
   */
  async   isClone(cloneAddress: Address): Promise<boolean> {
    return this.read<boolean>('isClone', [cloneAddress]);
  }

  // ============ GATE ============

  /**
   * True when the address is a governed user account. False for this factory.
   */
  async isAccountBlox(address: string): Promise<boolean> {
    return isAccountBlox(this.client, address);
  }

  /** The per-transaction gas cap this wrapper sizes clones against (EIP-7825). */
  static readonly MAX_TX_GAS = MAX_TX_GAS;

  private async read<T>(functionName: string, args: readonly unknown[] = []): Promise<T> {
    try {
      return (await this.client.readContract({
        address: this.contractAddress,
        abi: this.abi,
        functionName,
        args,
      } as any)) as T;
    } catch (error) {
      throw await handleViemError(error, this.abi as unknown as any[]);
    }
  }
}

export default BasicFactory;
