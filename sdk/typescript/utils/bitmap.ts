import { TxAction } from '../types/lib.index';

/**
 * Branded type for uint16 bitmap values (0-65535)
 * This ensures type safety and prevents invalid bitmap values
 */
export type Uint16Bitmap = number & { readonly __brand: 'Uint16Bitmap' };

/**
 * Maximum value for uint16 (65535)
 */
const UINT16_MAX = 65535;
const UINT16_MIN = 0;

/**
 * Validates and creates a Uint16Bitmap from a number
 * @param value The number to validate and convert
 * @returns A validated Uint16Bitmap
 * @throws Error if value is outside 0..65535
 */
export function createUint16Bitmap(value: number): Uint16Bitmap {
  if (!Number.isInteger(value)) {
    throw new Error(`Bitmap value must be an integer, got: ${value}`);
  }
  if (value < UINT16_MIN || value > UINT16_MAX) {
    throw new Error(`Bitmap value must be between ${UINT16_MIN} and ${UINT16_MAX}, got: ${value}`);
  }
  return value as Uint16Bitmap;
}

/**
 * Safely creates a Uint16Bitmap, clamping values outside the valid range
 * @param value The number to validate and convert
 * @returns A validated Uint16Bitmap (clamped to valid range)
 */
export function createUint16BitmapClamped(value: number): Uint16Bitmap {
  if (!Number.isInteger(value)) {
    throw new Error(`Bitmap value must be an integer, got: ${value}`);
  }
  const clamped = Math.max(UINT16_MIN, Math.min(UINT16_MAX, value));
  return clamped as Uint16Bitmap;
}

/**
 * Checks if a specific bit is set in the bitmap
 * @param bitmap The uint16 bitmap
 * @param bitIndex The bit index to check (0-15, corresponding to TxAction enum values)
 * @returns True if the bit is set, false otherwise
 */
export function isBitSet(bitmap: Uint16Bitmap, bitIndex: number): boolean {
  if (bitIndex < 0 || bitIndex > 15) {
    throw new Error(`Bit index must be between 0 and 15, got: ${bitIndex}`);
  }
  return (bitmap & (1 << bitIndex)) !== 0;
}

/**
 * Sets a specific bit in the bitmap
 * @param bitmap The uint16 bitmap
 * @param bitIndex The bit index to set (0-15, corresponding to TxAction enum values)
 * @returns A new Uint16Bitmap with the bit set
 */
export function setBit(bitmap: Uint16Bitmap, bitIndex: number): Uint16Bitmap {
  if (bitIndex < 0 || bitIndex > 15) {
    throw new Error(`Bit index must be between 0 and 15, got: ${bitIndex}`);
  }
  const newValue = bitmap | (1 << bitIndex);
  return createUint16Bitmap(newValue);
}

/**
 * Clears a specific bit in the bitmap
 * @param bitmap The uint16 bitmap
 * @param bitIndex The bit index to clear (0-15, corresponding to TxAction enum values)
 * @returns A new Uint16Bitmap with the bit cleared
 */
export function clearBit(bitmap: Uint16Bitmap, bitIndex: number): Uint16Bitmap {
  if (bitIndex < 0 || bitIndex > 15) {
    throw new Error(`Bit index must be between 0 and 15, got: ${bitIndex}`);
  }
  const newValue = bitmap & ~(1 << bitIndex);
  return createUint16Bitmap(newValue);
}

/**
 * Gets the numeric value of the bitmap
 * @param bitmap The uint16 bitmap
 * @returns The numeric value (0-65535)
 */
export function getBitValue(bitmap: Uint16Bitmap): number {
  return bitmap;
}

/**
 * Creates a bitmap from an array of TxAction values
 * @param actions Array of TxAction enum values to set in the bitmap
 * @returns A new Uint16Bitmap with the corresponding bits set
 */
export function createBitmapFromActions(actions: TxAction[]): Uint16Bitmap {
  let bitmap = createUint16Bitmap(0);
  for (const action of actions) {
    bitmap = setBit(bitmap, action);
  }
  return bitmap;
}

/**
 * Converts a bitmap to an array of TxAction values
 * @param bitmap The uint16 bitmap
 * @returns Array of TxAction enum values that are set in the bitmap
 */
export function getActionsFromBitmap(bitmap: Uint16Bitmap): TxAction[] {
  const actions: TxAction[] = [];
  for (let i = 0; i <= 15; i++) {
    if (isBitSet(bitmap, i)) {
      actions.push(i as TxAction);
    }
  }
  return actions;
}

/**
 * Converts a number to Uint16Bitmap if it's a valid raw value from contract
 * This is useful when receiving bitmap values from contract calls
 * @param value The raw number value from contract
 * @returns A validated Uint16Bitmap
 */
export function fromContractValue(value: number | bigint): Uint16Bitmap {
  const numValue = typeof value === 'bigint' ? Number(value) : value;
  return createUint16Bitmap(numValue);
}

/**
 * Converts a Uint16Bitmap to a plain number for contract calls
 * This is useful when passing bitmap values to contract methods
 * @param bitmap The Uint16Bitmap to convert
 * @returns The numeric value (0-65535)
 */
export function toContractValue(bitmap: Uint16Bitmap): number {
  return getBitValue(bitmap);
}

