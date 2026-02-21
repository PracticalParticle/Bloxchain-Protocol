import { keccak256 as k256, toHex, Address, Hex, PublicClient, recoverAddress, bytesToHex } from 'viem';
import { TxAction } from '../types/lib.index';
import { Uint16Bitmap, createUint16Bitmap } from '../utils/bitmap';

/**
 * Helper function to compute keccak256 of a string
 */
const keccak256 = (str: string): Hex => {
  return k256(new TextEncoder().encode(str)) as Hex;
};

/**
 * @title EngineBlox Library SDK
 * @dev Provides access to public library constants and pure functions from EngineBlox.sol
 * 
 * This module exposes all accessible constants and pure/view functions from the EngineBlox library
 * that don't require storage access (no `self` parameter). Functions meant for delegatecall
 * (those using `self`) are excluded.
 * 
 * @example
 * ```typescript
 * import { EngineBlox } from '@bloxchain/sdk/lib/EngineBlox';
 * 
 * // Access constants
 * const protocolName = EngineBlox.PROTOCOL_NAME_HASH;
 * const version = `${EngineBlox.VERSION_MAJOR}.${EngineBlox.VERSION_MINOR}.${EngineBlox.VERSION_PATCH}`;
 * 
 * // Use pure functions
 * const signer = EngineBlox.recoverSigner(messageHash, signature);
 * 
 * // Use bitmap helpers
 * const hasAction = EngineBlox.hasActionInBitmap(bitmap, TxAction.EXECUTE_TIME_DELAY_REQUEST);
 * ```
 */
export class EngineBlox {
  // ============ VERSION INFORMATION ============
  
  /**
   * Protocol name hash (keccak256("Bloxchain"))
   */
  static readonly PROTOCOL_NAME_HASH: Hex = keccak256("Bloxchain");
  
  /**
   * Major version number
   */
  static readonly VERSION_MAJOR: number = 1;
  
  /**
   * Minor version number
   */
  static readonly VERSION_MINOR: number = 0;
  
  /**
   * Patch version number
   */
  static readonly VERSION_PATCH: number = 0;

  // ============ FUNCTION SELECTORS ============
  
  /**
   * Native token transfer selector (reserved signature for simple ETH transfers)
   * Computed as bytes4(keccak256("__bloxchain_native_transfer__()"))
   */
  static readonly NATIVE_TRANSFER_SELECTOR: Hex = (
    '0x' + k256(new TextEncoder().encode("__bloxchain_native_transfer__()")).slice(2, 10)
  ) as Hex;
  
  /**
   * Native token transfer operation type hash
   */
  static readonly NATIVE_TRANSFER_OPERATION: Hex = keccak256("NATIVE_TRANSFER");
  
  // ============ ROLE CONSTANTS ============
  
  /**
   * Owner role hash
   */
  static readonly OWNER_ROLE: Hex = keccak256("OWNER_ROLE");
  
  /**
   * Broadcaster role hash
   */
  static readonly BROADCASTER_ROLE: Hex = keccak256("BROADCASTER_ROLE");
  
  /**
   * Recovery role hash
   */
  static readonly RECOVERY_ROLE: Hex = keccak256("RECOVERY_ROLE");

  // ============ PURE FUNCTIONS ============

  /**
   * @dev Recovers the signer address from a message hash and signature
   * @param messageHash The hash of the message that was signed (bytes32)
   * @param signature The signature to recover the address from (65 bytes)
   * @returns Promise that resolves to the address of the signer
   * @throws Error if signature is invalid or recovery fails
   * 
   * @notice This matches the contract's recoverSigner function which uses
   *         messageHash.toEthSignedMessageHash() to convert to EIP-191 format
   * 
   * @example
   * ```typescript
   * const messageHash = "0x1234...";
   * const signature = "0xabcd...";
   * const signer = await EngineBlox.recoverSigner(messageHash, signature);
   * ```
   */
  static async recoverSigner(messageHash: Hex, signature: Hex): Promise<Address> {
    // Validate signature length (65 bytes = 130 hex chars + '0x' prefix)
    if (signature.length !== 132) {
      throw new Error(`Invalid signature length: expected 65 bytes (132 hex chars), got ${signature.length - 2} bytes`);
    }

    try {
      // The contract uses messageHash.toEthSignedMessageHash() which converts to EIP-191 format
      // EIP-191 format for 32-byte hash: keccak256("\x19Ethereum Signed Message:\n32" + messageHash)
      // We need to create the EIP-191 formatted hash and then recover from it
      const prefix = '\x19Ethereum Signed Message:\n32';
      const messageHashBytes = Buffer.from(messageHash.slice(2), 'hex');
      
      // Concatenate prefix and hash
      const eip191Message = Buffer.concat([
        Buffer.from(prefix, 'utf8'),
        messageHashBytes
      ]);
      
      // Convert Buffer to Uint8Array for viem
      const eip191MessageBytes = new Uint8Array(eip191Message);
      
      // Hash the EIP-191 formatted message
      const eip191Hash = (await k256(eip191MessageBytes)) as Hex;

      // Recover address from the EIP-191 formatted hash
      // Note: recoverAddress is async in viem
      const recovered: Address = await recoverAddress({
        hash: eip191Hash,
        signature: signature
      });
      
      return recovered;
    } catch (error) {
      throw new Error(`Failed to recover signer: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // ============ VIEW FUNCTIONS (No storage access) ============

  // ============ BITMAP HELPER FUNCTIONS ============

  /**
   * @dev Checks if a TxAction is present in a bitmap
   * @param bitmap The bitmap to check
   * @param action The TxAction to check for
   * @returns True if the action is present in the bitmap
   * 
   * @example
   * ```typescript
   * const hasAction = EngineBlox.hasActionInBitmap(bitmap, TxAction.EXECUTE_TIME_DELAY_REQUEST);
   * ```
   */
  static hasActionInBitmap(bitmap: Uint16Bitmap, action: TxAction): boolean {
    return (bitmap & (1 << action)) !== 0;
  }

  /**
   * @dev Adds a TxAction to a bitmap
   * @param bitmap The original bitmap
   * @param action The TxAction to add
   * @returns The updated bitmap with the action added
   * 
   * @example
   * ```typescript
   * const newBitmap = EngineBlox.addActionToBitmap(bitmap, TxAction.EXECUTE_TIME_DELAY_REQUEST);
   * ```
   */
  static addActionToBitmap(bitmap: Uint16Bitmap, action: TxAction): Uint16Bitmap {
    return createUint16Bitmap(bitmap | (1 << action));
  }

  /**
   * @dev Creates a bitmap from an array of TxActions
   * @param actions Array of TxActions to convert to bitmap
   * @returns Bitmap representation of the actions
   * 
   * @example
   * ```typescript
   * const bitmap = EngineBlox.createBitmapFromActions([
   *   TxAction.EXECUTE_TIME_DELAY_REQUEST,
   *   TxAction.EXECUTE_TIME_DELAY_APPROVE
   * ]);
   * ```
   */
  static createBitmapFromActions(actions: TxAction[]): Uint16Bitmap {
    let bitmap = createUint16Bitmap(0);
    for (const action of actions) {
      bitmap = this.addActionToBitmap(bitmap, action);
    }
    return bitmap;
  }

  /**
   * @dev Converts a bitmap to an array of TxActions
   * @param bitmap The bitmap to convert
   * @returns Array of TxActions represented by the bitmap
   * 
   * @example
   * ```typescript
   * const actions = EngineBlox.convertBitmapToActions(bitmap);
   * // Returns [TxAction.EXECUTE_TIME_DELAY_REQUEST, TxAction.EXECUTE_TIME_DELAY_APPROVE]
   * ```
   */
  static convertBitmapToActions(bitmap: Uint16Bitmap): TxAction[] {
    // Count how many actions are set
    const actions: TxAction[] = [];
    
    for (let i = 0; i < 16; i++) {
      if ((bitmap & (1 << i)) !== 0) {
        actions.push(i as TxAction);
      }
    }
    
    return actions;
  }
}

/**
 * Default export for convenience
 */
export default EngineBlox;
