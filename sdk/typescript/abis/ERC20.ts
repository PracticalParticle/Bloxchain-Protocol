/**
 * ERC-20 ABI — the minimal surface an integrator needs to fund a Blox, read a
 * balance, and build an `executionParams` payload for a guarded transfer.
 *
 * ```ts
 * import { erc20Abi, erc20MinimalAbi } from '@bloxchain/sdk/abi/ERC20';
 * ```
 *
 * `erc20Abi` is the full ABI the SDK's own `ERC20Token` helper uses
 * (`utils/erc20/ERC20Token.abi.json`). `erc20MinimalAbi` is the hand-checked
 * standard subset, handy when you want a narrow, fully inferred viem type.
 */
import type { Abi } from 'viem';
import { parseAbi } from 'viem';
import abiJson from '../utils/erc20/ERC20Token.abi.json' with { type: 'json' };

/** Full ERC-20 ABI as published with the SDK. */
export const erc20Abi = abiJson as Abi;

/**
 * Minimal, strongly typed ERC-20 surface.
 *
 * Declared with `parseAbi` so viem infers exact argument and return types —
 * unlike the JSON import above, which is cast to `Abi` for call-site compatibility.
 */
export const erc20MinimalAbi = parseAbi([
  'function name() view returns (string)',
  'function symbol() view returns (string)',
  'function decimals() view returns (uint8)',
  'function totalSupply() view returns (uint256)',
  'function balanceOf(address account) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function transfer(address to, uint256 amount) returns (bool)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function transferFrom(address from, address to, uint256 amount) returns (bool)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'event Approval(address indexed owner, address indexed spender, uint256 value)',
]);

/** ERC-20 ABI entries for events only. */
export const erc20EventAbi = erc20Abi.filter(
  (item): item is Extract<Abi[number], { type: 'event' }> => item.type === 'event'
);

export default erc20Abi;
