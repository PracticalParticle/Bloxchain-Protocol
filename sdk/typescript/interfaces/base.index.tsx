import { Address, Hash, TransactionReceipt } from 'viem';

/**
 * Represents the result of a blockchain transaction, providing both immediate hash
 * and the ability to wait for confirmation
 */
export interface TransactionResult {
    /** The transaction hash returned immediately after submission */
    hash: Hash;
    /** Function to wait for transaction confirmation and get the receipt */
    wait: () => Promise<TransactionReceipt>;
  }
  
// Common transaction options interface used across all contracts
export interface TransactionOptions {
  from: Address;
  gas?: number;
  /** Max fee per gas (EIP-1559) in wei. Prefer bigint; string must be a non-negative integer. */
  gasPrice?: string | bigint;
  value?: string;
}