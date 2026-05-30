import { 
  Address, 
  PublicClient, 
  WalletClient,
  Chain,
  Abi 
} from 'viem';
import ERC20ABI from './ERC20Token.abi.json' with { type: 'json' };

// Parse and type the ABI
const ERC20TokenABI = ERC20ABI as Abi;

import { TransactionOptions, TransactionResult } from '../../interfaces/base.index.js';

/**
 * @title ERC20TokenContract
 * @notice A contract for interacting with ERC20 tokens
 * @dev Implements standard ERC20 token functionality according to EIP-20
 */
class ERC20Token {
  protected client: PublicClient;
  protected walletClient?: WalletClient;
  protected tokenAddress: Address;
  protected chain: Chain;

  /**
   * @notice Creates a new ERC20TokenContract instance
   * @param client The viem PublicClient instance for blockchain interactions
   * @param walletClient Optional WalletClient for signing transactions
   * @param tokenAddress The address of the ERC20 token contract
   * @param chain The chain object for the network
   */
  constructor(
    client: PublicClient, 
    walletClient: WalletClient | undefined, 
    tokenAddress: Address, 
    chain: Chain
  ) {
    this.client = client;
    this.walletClient = walletClient;
    this.tokenAddress = tokenAddress;
    this.chain = chain;
  }

  /**
   * @notice Gets the token balance of an account
   * @param account The address to check the balance of
   * @return The token balance of the account as a string
   */
  async balanceOf(account: Address): Promise<string> {
    const result = await this.client.readContract({
      address: this.tokenAddress,
      abi: ERC20TokenABI,
      functionName: 'balanceOf',
      args: [account]
    }) as bigint;
    return result.toString();
  }

  /**
   * @notice Transfers tokens to a specified address
   * @param to The address to transfer tokens to
   * @param amount The amount of tokens to transfer
   * @param options Transaction options including the sender address
   * @return TransactionResult containing hash and wait function
   */
  async transfer(
    to: Address,
    amount: string,
    options: TransactionOptions
  ): Promise<TransactionResult> {
    if (!this.walletClient) throw new Error('Wallet client is required');
    const hash = await this.walletClient.writeContract({
      chain: this.chain,
      address: this.tokenAddress,
      abi: ERC20TokenABI,
      functionName: 'transfer',
      args: [to, amount],
      account: options.from as Address
    });

    return {
      hash,
      wait: () => this.client.waitForTransactionReceipt({ hash })
    };
  }

  /**
   * @notice Approves a spender to spend tokens on behalf of the owner
   * @dev Overrides any existing allowance and emits Approval event
   * @param spender The address authorized to spend tokens
   * @param amount The amount of tokens the spender is approved to use
   * @param options Transaction options including the sender address
   * @return TransactionResult containing hash and wait function
   */
  async approve(
    spender: Address,
    amount: string,
    options: TransactionOptions
  ): Promise<TransactionResult> {
    if (!this.walletClient) throw new Error('Wallet client is required');
    const hash = await this.walletClient.writeContract({
      chain: this.chain,
      address: this.tokenAddress,
      abi: ERC20TokenABI,
      functionName: 'approve',
      args: [spender, amount],
      account: options.from as Address
    });

    return {
      hash,
      wait: () => this.client.waitForTransactionReceipt({ hash })
    };
  }

  /**
   * @notice Transfers tokens from one address to another using the allowance mechanism
   * @dev Requires sufficient allowance and emits Transfer event
   * @param from The address to transfer tokens from
   * @param to The address to transfer tokens to
   * @param amount The amount of tokens to transfer
   * @param options Transaction options including the sender address
   * @return TransactionResult containing hash and wait function
   */
  async transferFrom(
    from: Address,
    to: Address,
    amount: string,
    options: TransactionOptions
  ): Promise<TransactionResult> {
    if (!this.walletClient) throw new Error('Wallet client is required');
    const hash = await this.walletClient.writeContract({
      chain: this.chain,
      address: this.tokenAddress,
      abi: ERC20TokenABI,
      functionName: 'transferFrom',
      args: [from, to, amount],
      account: options.from as Address
    });

    return {
      hash,
      wait: () => this.client.waitForTransactionReceipt({ hash })
    };
  }

  /**
   * @notice Gets the total supply of the token
   * @return The total token supply as a string
   */
  async totalSupply(): Promise<string> {
    const result = await this.client.readContract({
      address: this.tokenAddress,
      abi: ERC20TokenABI,
      functionName: 'totalSupply'
    }) as bigint;
    return result.toString();
  }

  /**
   * @notice Gets the amount of tokens that a spender is allowed to spend on behalf of an owner
   * @param owner The address that owns the tokens
   * @param spender The address authorized to spend tokens
   * @return The remaining number of tokens that spender is allowed to spend
   */
  async allowance(owner: Address, spender: Address): Promise<string> {
    const result = await this.client.readContract({
      address: this.tokenAddress,
      abi: ERC20TokenABI,
      functionName: 'allowance',
      args: [owner, spender]
    }) as bigint;
    return result.toString();
  }

  /**
   * @notice Gets the token symbol
   * @return The symbol of the token
   */
  async symbol(): Promise<string> {
    return await this.client.readContract({
      address: this.tokenAddress,
      abi: ERC20TokenABI,
      functionName: 'symbol'
    }) as string;
  }

  /**
   * @notice Gets the number of decimals used by the token
   * @return The number of decimals
   */
  async decimals(): Promise<number> {
    const result = await this.client.readContract({
      address: this.tokenAddress,
      abi: ERC20TokenABI,
      functionName: 'decimals'
    });
    return Number(result);
  }

  /**
   * @notice Gets the name of the token
   * @return The name of the token
   */
  async name(): Promise<string> {
    const result = await this.client.readContract({
      address: this.tokenAddress,
      abi: ERC20TokenABI,
      functionName: 'name'
    });
    return result as string;
  }
}

export default ERC20Token; 