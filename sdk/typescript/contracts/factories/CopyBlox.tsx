import { Address, PublicClient, WalletClient, Chain, parseAbiItem, getAddress } from 'viem';
import { BaseStateMachine } from '../core/BaseStateMachine.js';
import { TransactionOptions, TransactionResult } from '../../interfaces/base.index.js';
import { GAS_ENVELOPE, MAX_TX_GAS, assertCloneGasEstimate } from '../../utils/gas.js';
import { isAccountBlox, inspectAccountBlox, isExpectedContractFailure } from '../../utils/account-gate.js';
import CopyBloxAbi from '../../abi/CopyBlox.abi.json' with { type: 'json' };

/**
 * @title CopyBlox
 * @notice TypeScript wrapper for the sanctioned clone factory.
 *
 * SPEC-2026-0118 R3/R4. `cloneBlox` deploys an EIP-1167 minimal proxy of an account
 * template and initializes it in **one** transaction, which is the supported way to get a
 * governed account from the published packages alone.
 *
 * Two things this wrapper exists to get right:
 *
 * 1. **Enumeration.** `clonesOf(owner)` returns *every* account created for an owner. On a
 *    factory that carries the on-chain owner index it reads the index; on an older
 *    deployment it falls back to `BloxCloned` logs. Taking "the latest `BloxCloned` log"
 *    strands every earlier account an owner holds, including ones with balances.
 * 2. **Gas.** The clone costs ~16.18 M against a per-transaction cap of 2^24 = 16,777,216
 *    (EIP-7825). The wrapper sends the measured limit by default instead of an estimate,
 *    because an estimate that returns the cap looks like a real number and a half-made
 *    account is one `+100k` away.
 */

/** `BloxCloned(address indexed original, address indexed clone, address indexed initialOwner, uint256 cloneNumber)` */
const BLOX_CLONED_EVENT = parseAbiItem(
  'event BloxCloned(address indexed original, address indexed clone, address indexed initialOwner, uint256 cloneNumber)'
);

export interface CloneAccountParams {
  /** Template to clone, e.g. the official `AccountBlox` address for this network. */
  template: Address;
  /** Owner the clone is initialized with. */
  initialOwner: Address;
  /** Broadcaster the clone is initialized with. */
  broadcaster: Address;
  /** Recovery address the clone is initialized with. */
  recovery: Address;
  /** Time lock period in seconds (`AccountBlox` bounds: 1 second to 90 days). */
  timeLockPeriodSec: bigint;
}

export interface CloneLogScanOptions {
  /**
   * Block to scan `BloxCloned` from. Default `'earliest'`, which many public RPC
   * providers refuse over a wide range: pass the factory's deployment block when you have
   * it, and keep it in your own config.
   */
  fromBlock?: bigint | 'earliest';
  /** Block to scan to. Default `'latest'`. */
  toBlock?: bigint | 'latest';
}

export interface CloneListResult {
  /** Clones created for the owner, in creation order. */
  clones: Address[];
  /** Where the list came from. */
  source: 'on-chain-index' | 'bloxcloned-logs';
}

/**
 * TypeScript wrapper for the CopyBlox-shaped clone factory.
 */
export class CopyBlox extends BaseStateMachine {
  constructor(
    client: PublicClient,
    walletClient: WalletClient | undefined,
    contractAddress: Address,
    chain: Chain
  ) {
    super(client, walletClient, contractAddress, chain, CopyBloxAbi);
  }

  // ============ PROVISIONING ============

  /**
   * Clone an account template and initialize it in one transaction.
   *
   * Sends `gas` at the EIP-7825 per-transaction cap by default. That is deliberate: a
   * bare `eth_estimateGas` against a public node either answers "insufficient funds"
   * (no state override) or returns the cap, and neither is a price.
   *
   * @param params Template and the roles the clone is initialized with
   * @param options Transaction options; `from` is the sender that pays for the clone
   * @returns The transaction result; read the new address with {@link cloneAddressFromReceipt}
   */
  async cloneBlox(params: CloneAccountParams, options: TransactionOptions): Promise<TransactionResult> {
    const { template, initialOwner, broadcaster, recovery, timeLockPeriodSec } = params;

    return this.executeWriteContract(
      'cloneBlox',
      [template, initialOwner, broadcaster, recovery, timeLockPeriodSec],
      { gas: GAS_ENVELOPE.cloneSendGasLimit, ...options }
    );
  }

  /**
   * Estimate the clone and check it against the per-transaction cap.
   *
   * Prefer sending {@link GAS_ENVELOPE.cloneSendGasLimit} over sending this estimate: the
   * value of this call is that it fails loudly when the estimator is not actually pricing
   * the clone.
   *
   * The AccountBlox-measured {@link GAS_ENVELOPE.cloneGasFloor} is applied only when
   * `options.floor` is set (pass `GAS_ENVELOPE.cloneGasFloor` for that template). Generic
   * `IBaseStateMachine` templates get cap validation only.
   *
   * @param params Same parameters the clone will be sent with
   * @param from Sender to estimate for
   * @param options Optional measured floor for the AccountBlox path
   * @throws {GasFloorNotMetError} when a floor is set and the estimate is implausibly low
   * @throws {MaxTxGasExceededError} when the estimate is at or over the per-transaction cap
   */
  async estimateCloneGas(
    params: CloneAccountParams,
    from: Address,
    options: { floor?: bigint } = {}
  ): Promise<bigint> {
    const estimate = await this.client.estimateContractGas({
      address: this.contractAddress,
      abi: this.abi,
      functionName: 'cloneBlox',
      args: [
        params.template,
        params.initialOwner,
        params.broadcaster,
        params.recovery,
        params.timeLockPeriodSec,
      ],
      account: from,
    });

    assertCloneGasEstimate(estimate, {
      floor: options.floor,
      label: 'CopyBlox.cloneBlox',
    });
    return estimate;
  }

  /**
   * Pull the new clone's address out of a `cloneBlox` receipt.
   *
   * @param receipt Receipt from awaiting the clone transaction
   * @returns The clone address, or null when the receipt carries no `BloxCloned` log
   */
  cloneAddressFromReceipt(receipt: { logs: readonly { address: string; topics: readonly string[] }[] }): Address | null {
    const factory = this.contractAddress.toLowerCase();
    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== factory) continue;
      // topics: [eventSig, original, clone, initialOwner]
      if (log.topics.length < 4) continue;
      const cloneTopic = log.topics[2];
      if (!cloneTopic) continue;
      return getAddress(`0x${cloneTopic.slice(-40)}`);
    }
    return null;
  }

  // ============ R3: ENUMERATION ============

  /**
   * Every account this factory created for an owner, in creation order.
   *
   * Reads the on-chain owner index when the factory has one, and falls back to a
   * `BloxCloned` log scan when it does not (factories deployed before the index exist on
   * official networks; `official-deployed-addresses.json` records which).
   *
   * @param initialOwner Owner to look up
   * @param options Log-scan range, used only on the fallback path
   */
  async clonesOf(initialOwner: Address, options: CloneLogScanOptions = {}): Promise<CloneListResult> {
    try {
      const clones = await this.executeReadContract<readonly Address[]>('clonesOf', [initialOwner]);
      return { clones: [...clones], source: 'on-chain-index' };
    } catch (error) {
      // Older factory: no owner index in its ABI or its code.
      if (!isExpectedContractFailure(error)) throw error;
      return {
        clones: await this.clonesOfFromLogs(initialOwner, options),
        source: 'bloxcloned-logs',
      };
    }
  }

  /**
   * Every account this factory created for an owner, from `BloxCloned` logs.
   *
   * Works against any CopyBlox-shaped factory, including ones deployed before the
   * on-chain owner index. `initialOwner` is an indexed topic, so this is a cheap filter,
   * but the block range is not: pass `fromBlock` when the provider limits range.
   *
   * @param initialOwner Owner to look up
   * @param options Block range to scan
   */
  async clonesOfFromLogs(
    initialOwner: Address,
    options: CloneLogScanOptions = {}
  ): Promise<Address[]> {
    const logs = await this.client.getLogs({
      address: this.contractAddress,
      event: BLOX_CLONED_EVENT,
      args: { initialOwner },
      fromBlock: options.fromBlock ?? 'earliest',
      toBlock: options.toBlock ?? 'latest',
    });

    const seen = new Set<string>();
    const clones: Address[] = [];
    for (const log of logs) {
      const clone = log.args?.clone;
      if (!clone) continue;
      const key = clone.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      clones.push(getAddress(clone));
    }
    return clones;
  }

  /**
   * True when this deployment carries the on-chain owner index.
   *
   * Probes with a zero-address lookup, which is free and cannot revert on a factory that
   * has the function.
   */
  async supportsClonesOf(): Promise<boolean> {
    try {
      await this.executeReadContract<readonly Address[]>('clonesOf', [
        '0x0000000000000000000000000000000000000000' as Address,
      ]);
      return true;
    } catch (error) {
      if (!isExpectedContractFailure(error)) throw error;
      return false;
    }
  }

  /**
   * Accounts created for an owner that still pass the account gate and are still owned by
   * them.
   *
   * The owner index is keyed by the owner a clone was *initialized* with and is not
   * re-keyed when ownership transfers, so this is the list to show a user.
   *
   * @param initialOwner Owner to look up
   * @param options Log-scan range, used only on the fallback path
   */
  async ownedClonesOf(
    initialOwner: Address,
    options: CloneLogScanOptions = {}
  ): Promise<Address[]> {
    const { clones } = await this.clonesOf(initialOwner, options);
    const owned: Address[] = [];
    for (const clone of clones) {
      const inspection = await inspectAccountBlox(this.client, clone);
      if (
        inspection.isAccount &&
        (inspection.checks.owner as string | undefined)?.toLowerCase() === initialOwner.toLowerCase()
      ) {
        owned.push(clone);
      }
    }
    return owned;
  }

  /** Number of accounts created for an owner (on-chain index only). */
  async clonesOfCount(initialOwner: Address): Promise<bigint> {
    return this.executeReadContract<bigint>('clonesOfCount', [initialOwner]);
  }

  /** One account created for an owner, by index (on-chain index only). */
  async cloneOfOwnerAt(initialOwner: Address, index: bigint): Promise<Address> {
    return this.executeReadContract<Address>('cloneOfOwnerAt', [initialOwner, index]);
  }

  /** Total clones this factory has created, across all owners. */
  async getCloneCount(): Promise<bigint> {
    return this.executeReadContract<bigint>('getCloneCount', []);
  }

  /** One clone from the flat list, by index. */
  async getCloneAtIndex(index: bigint): Promise<Address> {
    return this.executeReadContract<Address>('getCloneAtIndex', [index]);
  }

  /**
   * True when this factory created the address.
   *
   * This is provenance, not shape: it says the factory made it, not that it is a usable
   * account. Use {@link isAccountBlox} for that, and both when you need both.
   */
  async isClone(cloneAddress: Address): Promise<boolean> {
    return this.executeReadContract<boolean>('isClone', [cloneAddress]);
  }

  // ============ R3: THE GATE ============

  /**
   * True when the address is a governed account, false for anything else, including this
   * factory.
   *
   * Re-exported here so the gate is reachable from the object an integrator already
   * holds. The factory answers ERC-165 `IBaseStateMachine` because it is one, so this
   * check must never be reduced to that.
   *
   * @param address Address to check
   */
  async isAccountBlox(address: string): Promise<boolean> {
    return isAccountBlox(this.client, address);
  }

  /** The per-transaction gas cap this wrapper sizes clones against (EIP-7825). */
  static readonly MAX_TX_GAS = MAX_TX_GAS;

  /** Operation type / selector helpers are inherited from BaseStateMachine. */
  get address(): Address {
    return this.contractAddress;
  }
}

export default CopyBlox;
