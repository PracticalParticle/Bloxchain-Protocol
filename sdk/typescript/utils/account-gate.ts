import { Address, PublicClient, getAddress, isAddress } from 'viem';
import { INTERFACE_IDS } from './interface-ids.js';

/**
 * The shape gate: "is this address an account I can load?"
 *
 * SPEC-2026-0118 R3. An integrator that adopts an address by name (a pasted address, a
 * recovered clone, a value out of a config file) needs a gate that cannot be fooled by
 * the other contracts in the same system. Measured behaviour of four real addresses:
 *
 * | address              | getCode | owner()  | initialized() | IBaseStateMachine | ISecureOwnable |
 * |----------------------|---------|----------|---------------|-------------------|----------------|
 * | an AccountBlox clone | 20,853 B| the owner| true          | true              | true           |
 * | an EOA               | none    | reverts  | reverts       | reverts           | reverts        |
 * | a plain ERC-20       | 2,771 B | reverts  | reverts       | false             | false          |
 * | the clone factory    | 11,227 B| reverts  | false         | **true**          | false          |
 *
 * The factory answers `IBaseStateMachine` because it is one, so a gate built on that
 * check alone adopts the factory as an account. `owner()` + `initialized()` + ERC-165
 * `ISecureOwnable` is the sharp edge.
 */

/** Why an address failed the gate. */
export type AccountBloxRejection =
  | 'invalid-address'
  | 'no-code'
  | 'no-owner'
  | 'not-initialized'
  | 'not-secure-ownable';

export interface AccountBloxInspection {
  /** True only when every check passed. */
  isAccount: boolean;
  /** Checksummed address, when the input parsed at all. */
  address: Address | null;
  /** First check that failed, or null when the address is an account. */
  rejection: AccountBloxRejection | null;
  /** Human-readable reason, or null when the address is an account. */
  reason: string | null;
  /** What each check saw. A check not reached is left undefined. */
  checks: {
    codeSize?: number;
    owner?: Address | null;
    initialized?: boolean | null;
    supportsSecureOwnable?: boolean | null;
    supportsBaseStateMachine?: boolean | null;
  };
}

const REJECTION_REASONS: Record<AccountBloxRejection, string> = {
  'invalid-address': 'not a valid address',
  'no-code': 'no contract code at this address (an EOA, or the wrong network)',
  'no-owner': 'owner() does not answer, so this is not an initialized account',
  'not-initialized': 'initialized() is false: the contract exists but was never initialized',
  'not-secure-ownable':
    'does not answer ERC-165 ISecureOwnable, so it is not an account (the clone factory lands here: it answers IBaseStateMachine but is not an account)',
};

/** A read that may legitimately revert; a revert is an answer, not an error. */
async function tryRead<T>(read: () => Promise<T>): Promise<T | null> {
  try {
    return await read();
  } catch {
    return null;
  }
}

const OWNER_ABI = [
  { type: 'function', name: 'owner', inputs: [], outputs: [{ type: 'address' }], stateMutability: 'view' },
] as const;

const INITIALIZED_ABI = [
  { type: 'function', name: 'initialized', inputs: [], outputs: [{ type: 'bool' }], stateMutability: 'view' },
] as const;

const SUPPORTS_INTERFACE_ABI = [
  {
    type: 'function',
    name: 'supportsInterface',
    inputs: [{ type: 'bytes4' }],
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
  },
] as const;

/**
 * Inspect an address against the account gate and report what each check saw.
 *
 * Use this when you need to tell a user *why* an address was refused; use
 * {@link isAccountBlox} when a boolean is enough.
 *
 * The checks run in cost order and stop at the first failure, so a bad address costs one
 * `eth_getCode` rather than four calls.
 *
 * @param client Public client on the network the address is supposed to live on
 * @param address Address to inspect
 */
export async function inspectAccountBlox(
  client: PublicClient,
  address: string
): Promise<AccountBloxInspection> {
  const reject = (
    rejection: AccountBloxRejection,
    checks: AccountBloxInspection['checks'],
    resolved: Address | null
  ): AccountBloxInspection => ({
    isAccount: false,
    address: resolved,
    rejection,
    reason: REJECTION_REASONS[rejection],
    checks,
  });

  if (typeof address !== 'string' || !isAddress(address)) {
    return reject('invalid-address', {}, null);
  }
  const resolved = getAddress(address);

  const code = await client.getCode({ address: resolved });
  const codeSize = code ? (code.length - 2) / 2 : 0;
  if (codeSize === 0) {
    return reject('no-code', { codeSize }, resolved);
  }

  const owner = await tryRead(() =>
    client.readContract({ address: resolved, abi: OWNER_ABI, functionName: 'owner' })
  );
  if (!owner) {
    return reject('no-owner', { codeSize, owner: null }, resolved);
  }

  const initialized = await tryRead(() =>
    client.readContract({ address: resolved, abi: INITIALIZED_ABI, functionName: 'initialized' })
  );
  if (initialized !== true) {
    return reject('not-initialized', { codeSize, owner, initialized }, resolved);
  }

  const supportsSecureOwnable = await tryRead(() =>
    client.readContract({
      address: resolved,
      abi: SUPPORTS_INTERFACE_ABI,
      functionName: 'supportsInterface',
      args: [INTERFACE_IDS.ISecureOwnable],
    })
  );
  if (supportsSecureOwnable !== true) {
    return reject(
      'not-secure-ownable',
      { codeSize, owner, initialized, supportsSecureOwnable },
      resolved
    );
  }

  return {
    isAccount: true,
    address: resolved,
    rejection: null,
    reason: null,
    checks: { codeSize, owner, initialized, supportsSecureOwnable },
  };
}

/**
 * True when the address is a governed account (an initialized `AccountBlox`-shaped
 * contract), false for an EOA, an unrelated contract, an uninitialized deployment, or
 * the clone factory.
 *
 * @param client Public client on the network the address is supposed to live on
 * @param address Address to check
 */
export async function isAccountBlox(client: PublicClient, address: string): Promise<boolean> {
  return (await inspectAccountBlox(client, address)).isAccount;
}

export class AccountNotOwnedError extends Error {
  readonly account: Address;
  readonly expectedOwner: Address;
  readonly actualOwner: Address;

  constructor(account: Address, expectedOwner: Address, actualOwner: Address) {
    super(
      `${account} is an account, but its owner is ${actualOwner}, not ${expectedOwner}. ` +
        'Refusing to load an account the caller does not own.'
    );
    this.name = 'AccountNotOwnedError';
    this.account = account;
    this.expectedOwner = expectedOwner;
    this.actualOwner = actualOwner;
  }
}

export class NotAnAccountError extends Error {
  readonly rejection: AccountBloxRejection;
  readonly inspection: AccountBloxInspection;

  constructor(inspection: AccountBloxInspection) {
    super(`${inspection.address ?? 'address'} is not a Bloxchain account: ${inspection.reason}`);
    this.name = 'NotAnAccountError';
    this.rejection = inspection.rejection as AccountBloxRejection;
    this.inspection = inspection;
  }
}

/**
 * Assert that an address is an account **and** that it is owned by `expectedOwner`.
 *
 * This is the gate to run before pointing a session, a policy or a signer at an address
 * a user named. Passing the gate without the owner check loads somebody else's account.
 *
 * @param client Public client on the network the address lives on
 * @param address Address to adopt
 * @param expectedOwner Address that must come back from `owner()`
 * @returns The checksummed account address
 * @throws {NotAnAccountError} when the address fails the shape gate
 * @throws {AccountNotOwnedError} when the address is an account owned by somebody else
 */
export async function assertOwnedAccount(
  client: PublicClient,
  address: string,
  expectedOwner: Address
): Promise<Address> {
  const inspection = await inspectAccountBlox(client, address);
  if (!inspection.isAccount || !inspection.address) {
    throw new NotAnAccountError(inspection);
  }

  const actualOwner = inspection.checks.owner as Address;
  if (actualOwner.toLowerCase() !== expectedOwner.toLowerCase()) {
    throw new AccountNotOwnedError(inspection.address, getAddress(expectedOwner), getAddress(actualOwner));
  }

  return inspection.address;
}
