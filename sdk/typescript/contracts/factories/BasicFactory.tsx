import {
  Address,
  Hex,
  PublicClient,
  WalletClient,
  Chain,
  Abi,
  concat,
  encodeAbiParameters,
  getAddress,
  getContractAddress,
  keccak256,
  parseGwei,
  toBytes,
  toFunctionSelector,
  zeroHash,
} from 'viem';
import { TransactionOptions, TransactionResult } from '../../interfaces/base.index.js';
import { GAS_ENVELOPE, MAX_TX_GAS } from '../../utils/gas.js';
import { isAccountBlox } from '../../utils/account-gate.js';
import { handleViemError } from '../../utils/viem-error-handler.js';
import BasicFactoryAbi from '../../abi/BasicFactory.abi.json' with { type: 'json' };

/**
 * @title BasicFactory
 * @notice Thin TypeScript wrapper for the **official** factory: BasicFactory → BasicAccount.
 *
 * This is the official mint path for `@bloxchain/sdk`.
 * Sepolia CopyBlox / AccountBlox are an experiment outside this package.
 *
 * `BasicFactory` clones exactly one implementation, fixed
 * in its constructor (a `BasicAccount`), and initializes the clone in the same transaction.
 * It is **not** an account: no owner, no roles, no timelock. Another account is another mint
 * from the same factory, so this wrapper has nothing to govern.
 *
 * - **Mint:** permissionless **for your own account**, no implementation argument.
 *   {@link cloneBlox} (a new address every call) and {@link cloneBloxDeterministic}
 *   (CREATE2) send with `options.gas` when the caller sets it, otherwise the
 *   `sendGasLimit` passed at construction (`basicFactorySendGasLimit(network)`),
 *   otherwise the EIP-7825 cap (`16777216`).
 * - **Gas, known limitation (M-1):** a mint *uses* about 16.14M gas but needs about 16.67M
 *   *available*, because `initialize` only receives 63/64 of the gas at each nested call. Under
 *   the EIP-7825 cap (Osaka) that leaves about 108k of limit headroom, so only a **direct EOA**
 *   call fits. A contract caller in front of the factory (Safe or another smart-contract wallet,
 *   ERC-4337, a forwarder, a multicall) needs more than `2^24` and fails on cap-enforcing
 *   networks. Never size the send from gas used. Glamsterdam is expected to relieve this where
 *   it is live; it is not fixed until then.
 * - **Self-owner:** the sender must be the owner, so `options.from` must equal
 *   `params.initialOwner`; otherwise the factory reverts `RestrictedOwner(caller, owner)`. The
 *   wrapper checks this before any RPC call and throws. Broadcaster and recovery may still be
 *   helper wallets. Minting for another owner is not available on this factory.
 * - **Predict:** {@link predictClone} reads the deterministic address from the factory;
 *   {@link BasicFactory.computeCloneAddress} derives it offline. The address binds the
 *   **minter** (the sender), the owner, an `index` and a `salt`, and nothing else (for a mint
 *   that can succeed, minter and owner are the same account): the
 *   broadcaster, recovery and timelock are not inputs, so they can differ per chain unless
 *   you pass the same values. A relayer or a different wallet gets a different address.
 *   Default convention: `salt = 0x00…00`, `index = 0n, 1n, 2n, …`.
 * - **Pin:** {@link implementation} reads the one address every mint clones.
 * - **Lineage:** {@link isClone} means "minted by this factory". It does not mean every copy
 *   of the implementation on the chain came from this factory.
 * - **The clone:** a `BasicAccount` is an Account-pattern blox. Operate it with the existing
 *   `SecureOwnable`, `RuntimeRBAC` and `GuardController` wrappers pointed at the clone address
 *   (ABI: `basicAccountAbi` from `@bloxchain/sdk/abi`); there is no separate account client.
 * - **Networks (I-1):** Cancun-level EVM (transient storage, `MCOPY`). `EngineBlox`, the
 *   definition libraries `BasicAccount` links, `BasicAccount` and `BasicFactory` must sit at the
 *   same addresses on every network, or predicted addresses differ.
 *
 * The account gate rejects the factory address because it has no `owner()`. Prefer
 * `getOfficialBasicMint(network)` from the shared CreateX catalog in
 * `official-deployed-addresses.json`. The Sepolia CopyBlox row is the experiment.
 */

/** Selectors on the pinned factory. */
export const BASIC_FACTORY_SELECTORS = {
  CLONE_BLOX: toFunctionSelector('cloneBlox(address,address,address,uint256)'),
  CLONE_BLOX_DETERMINISTIC: toFunctionSelector(
    'cloneBloxDeterministic(address,address,address,uint256,uint256,bytes32)'
  ),
  PREDICT_CLONE: toFunctionSelector('predictClone(address,address,uint256,bytes32)'),
  IMPLEMENTATION: toFunctionSelector('implementation()'),
} as const;

/** Roles and timelock a clone is initialized with (`BasicAccount`: 1 day to 90 days). */
export interface BasicCloneParams {
  initialOwner: Address;
  broadcaster: Address;
  recovery: Address;
  timeLockPeriodSec: bigint;
}

/**
 * Deterministic mint parameters. Only `initialOwner`, `index` and `salt` (with the sender)
 * pick the address; the roles and timelock are applied to the clone but are not hashed.
 */
export interface BasicDeterministicCloneParams extends BasicCloneParams {
  /** Slot for this minter and owner: `0n, 1n, 2n, …` by convention. */
  index: bigint;
  /** User salt. Defaults to `bytes32(0)`. */
  salt?: Hex;
}

/** Inputs to the deterministic address, mirroring `predictClone(deployer, initialOwner, index, salt)`. */
export interface BasicCloneAddressInputs {
  /** The account that sends the mint (`msg.sender`). Must equal `initialOwner` for a mint that can succeed. */
  deployer: Address;
  initialOwner: Address;
  index: bigint;
  /** Defaults to `bytes32(0)`. */
  salt?: Hex;
}

const BLOX_CLONED_TOPIC = keccak256(toBytes('BloxCloned(address,address,address)')).toLowerCase();

/**
 * TypeScript wrapper for `BasicFactory` (pinned, one implementation).
 */
export class BasicFactory {
  protected readonly abi: Abi = BasicFactoryAbi as Abi;
  private readonly defaultSendGasLimit: bigint;

  /**
   * @param sendGasLimit Network mint limit from `basicFactorySendGasLimit`. Omitted
   *   values fall back to {@link GAS_ENVELOPE.cloneSendGasLimit}. `options.gas` on a
   *   mint still wins.
   */
  constructor(
    protected readonly client: PublicClient,
    protected readonly walletClient: WalletClient | undefined,
    protected readonly contractAddress: Address,
    protected readonly chain: Chain,
    sendGasLimit?: bigint
  ) {
    if (sendGasLimit !== undefined && sendGasLimit <= 0n) {
      throw new Error('BasicFactory sendGasLimit must be a positive gas limit');
    }
    this.defaultSendGasLimit = sendGasLimit ?? GAS_ENVELOPE.cloneSendGasLimit;
  }

  get address(): Address {
    return this.contractAddress;
  }

  // ============ MINT ============

  /**
   * Clone the pinned implementation and initialize it in one transaction (nonce path).
   *
   * Sends `options.gas` when set, otherwise the constructor `sendGasLimit`, otherwise
   * the EIP-7825 per-transaction cap (`16777216`). Never a bare estimate.
   *
   * @param params Roles and timelock the clone is initialized with; `initialOwner` must be `options.from`
   * @param options Transaction options; `from` is the sender that pays for the clone and becomes its owner
   * @throws Error before any RPC call when `options.from` is not `params.initialOwner`
   *   (the factory would revert `RestrictedOwner(caller, owner)`)
   */
  async cloneBlox(params: BasicCloneParams, options: TransactionOptions): Promise<TransactionResult> {
    BasicFactory.assertSelfOwner('cloneBlox', params.initialOwner, options.from);
    return this.sendMint(
      'cloneBlox',
      [params.initialOwner, params.broadcaster, params.recovery, params.timeLockPeriodSec],
      options
    );
  }

  /**
   * Clone the pinned implementation at a deterministic address (CREATE2) and initialize it.
   *
   * The clone lands on `predictClone(options.from, initialOwner, index, salt)`, where
   * `options.from` must equal `initialOwner`. A repeat on the same chain reverts
   * `ItemAlreadyExists`. Same gas rule as {@link cloneBlox}.
   *
   * @param params Roles, timelock, `index` and optional `salt` (default `bytes32(0)`); `initialOwner` must be `options.from`
   * @param options Transaction options; `from` is the minter and owner, and it is part of the address
   * @throws Error before any RPC call when `options.from` is not `params.initialOwner`
   *   (the factory would revert `RestrictedOwner(caller, owner)`)
   */
  async cloneBloxDeterministic(
    params: BasicDeterministicCloneParams,
    options: TransactionOptions
  ): Promise<TransactionResult> {
    BasicFactory.assertSelfOwner('cloneBloxDeterministic', params.initialOwner, options.from);
    return this.sendMint(
      'cloneBloxDeterministic',
      [
        params.initialOwner,
        params.broadcaster,
        params.recovery,
        params.timeLockPeriodSec,
        params.index,
        params.salt ?? zeroHash,
      ],
      options
    );
  }

  /**
   * The factory reverts `RestrictedOwner(caller, owner)` unless the sender is the
   * owner. Fail here, with that reason, instead of after a simulation or a sent transaction.
   */
  private static assertSelfOwner(
    functionName: 'cloneBlox' | 'cloneBloxDeterministic',
    initialOwner: Address,
    from: Address
  ): void {
    if (initialOwner.toLowerCase() !== from.toLowerCase()) {
      throw new Error(
        `BasicFactory.${functionName}: the sender must be the initial owner (from ${from}, initialOwner ${initialOwner}); ` +
          'this factory reverts RestrictedOwner for any other owner'
      );
    }
  }

  private async sendMint(
    functionName: 'cloneBlox' | 'cloneBloxDeterministic',
    args: readonly unknown[],
    options: TransactionOptions
  ): Promise<TransactionResult> {
    if (!this.walletClient) {
      throw new Error(`BasicFactory.${functionName} needs a wallet client`);
    }
    const request: any = {
      chain: this.chain,
      address: this.contractAddress,
      abi: this.abi,
      functionName,
      args,
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
          console.warn(`[BasicFactory] Pre-flight simulation failed for ${functionName}; continuing (mode=${simulationMode})`);
        }
      }

      request.gas =
        options.gas !== undefined ? BigInt(String(options.gas)) : this.defaultSendGasLimit;
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
   * Pull the new clone's address out of a mint receipt (`BloxCloned` from this factory), either path.
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
  async isClone(cloneAddress: Address): Promise<boolean> {
    return this.read<boolean>('isClone', [cloneAddress]);
  }

  // ============ DETERMINISTIC ADDRESS ============

  /**
   * The address {@link cloneBloxDeterministic} mints when `deployer` sends it with these inputs.
   *
   * For a mint that can succeed, `deployer` must equal `initialOwner`; any
   * other pair predicts an address the factory will never mint. Read from the factory. It does not say whether the address is already minted; use
   * {@link isClone}. The same inputs give the same address on another chain only when the
   * factory and its pinned implementation sit at the same addresses there.
   */
  async predictClone(inputs: BasicCloneAddressInputs): Promise<Address> {
    return this.read<Address>('predictClone', [
      inputs.deployer,
      inputs.initialOwner,
      inputs.index,
      inputs.salt ?? zeroHash,
    ]);
  }

  /**
   * The CREATE2 salt the factory uses: `keccak256(abi.encode(deployer, initialOwner, index, salt))`.
   * Nothing else is hashed (no roles, timelock, chain id, factory address or version tag).
   */
  static create2Salt(inputs: BasicCloneAddressInputs): Hex {
    return keccak256(
      encodeAbiParameters(
        [{ type: 'address' }, { type: 'address' }, { type: 'uint256' }, { type: 'bytes32' }],
        [inputs.deployer, inputs.initialOwner, inputs.index, inputs.salt ?? zeroHash]
      )
    );
  }

  /**
   * Offline twin of {@link predictClone}: CREATE2 over the EIP-1167 init code of `implementation`,
   * deployed by `factory`. No RPC.
   */
  static computeCloneAddress(
    factory: Address,
    implementation: Address,
    inputs: BasicCloneAddressInputs
  ): Address {
    const initCode = concat([
      '0x3d602d80600a3d3981f3363d3d373d3d3d363d73',
      implementation,
      '0x5af43d82803e903d91602b57fd5bf3',
    ]);
    return getContractAddress({
      opcode: 'CREATE2',
      from: factory,
      salt: BasicFactory.create2Salt(inputs),
      bytecode: initCode,
    });
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
