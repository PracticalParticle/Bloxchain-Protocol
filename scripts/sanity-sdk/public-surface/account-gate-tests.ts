/**
 * SPEC-2026-0130 R7 — the account gate rejects the canonical factory.
 *
 * The pinned `BasicFactory` is not an account: it has code and answers ERC-165
 * `IEventForwarder`, but has no `owner()`, no `initialized()`, and never answers
 * `ISecureOwnable`. The gate refuses it at `no-owner`. This suite also drives the thin
 * `BasicFactory` client's reads (pin, lineage) against the same fake.
 *
 * **Offline.** A fake `PublicClient` answers `getCode` / `readContract` from a table, so
 * the cases below are the shapes measured in Foundry (`test/foundry/unit/BasicFactory.t.sol`),
 * not a live chain.
 */

import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { type Address, type Chain, type Hex, type PublicClient } from 'viem';
import {
  INTERFACE_IDS,
  inspectAccountBlox,
  isAccountBlox,
  assertOwnedAccount,
  NotAnAccountError,
  BasicFactory,
  BASIC_FACTORY_SELECTORS,
} from '../../../sdk/typescript/index.js';
import type { SurfaceTestResult } from './package-exports-tests.ts';

const OWNER = '0x00000000000000000000000000000000000000aa' as Address;
const FACTORY = '0x00000000000000000000000000000000000000f1' as Address;
const CLONE = '0x00000000000000000000000000000000000000c1' as Address;
const COPYBLOX = '0x00000000000000000000000000000000000000c0' as Address;
const NO_CODE_ACCOUNT = '0x00000000000000000000000000000000000000d1' as Address;
const IMPLEMENTATION = '0x00000000000000000000000000000000000000b1' as Address;

/** What one address answers. `undefined` in `interfaces` means "supportsInterface reverts". */
interface FakeContract {
  code: Hex;
  owner?: Address;
  initialized?: boolean;
  interfaces?: Partial<Record<Hex, boolean>> | undefined;
  /** Pinned-factory views, when the address is a BasicFactory. */
  pinned?: { implementation: Address; clones: Address[] };
}

const RUNTIME_CODE = `0x${'60'.repeat(64)}` as Hex;

const ACCOUNT_IDS = {
  [INTERFACE_IDS.IBaseStateMachine]: true,
  [INTERFACE_IDS.ISecureOwnable]: true,
  [INTERFACE_IDS.IRuntimeRBAC]: true,
  [INTERFACE_IDS.IGuardController]: true,
} as const;

const TABLE: Record<string, FakeContract> = {
  // Pinned BasicFactory: no owner(), no initialized(), not an account.
  [FACTORY.toLowerCase()]: {
    code: RUNTIME_CODE,
    interfaces: {
      [INTERFACE_IDS.ISecureOwnable]: false,
      [INTERFACE_IDS.IBaseStateMachine]: false,
    },
    pinned: { implementation: IMPLEMENTATION, clones: [CLONE] },
  },
  // BasicAccount clone minted by the factory.
  [CLONE.toLowerCase()]: {
    code: RUNTIME_CODE,
    owner: OWNER,
    initialized: true,
    interfaces: { ...ACCOUNT_IDS },
  },
  // Uninitialized CopyBlox: IBaseStateMachine only, owner() reverts.
  [COPYBLOX.toLowerCase()]: {
    code: RUNTIME_CODE,
    initialized: false,
    interfaces: { [INTERFACE_IDS.IBaseStateMachine]: true, [INTERFACE_IDS.ISecureOwnable]: false },
  },
  // An account whose supportsInterface reverts on unknown ids (a revert is an answer: "no").
  [NO_CODE_ACCOUNT.toLowerCase()]: {
    code: RUNTIME_CODE,
    owner: OWNER,
    initialized: true,
    interfaces: { [INTERFACE_IDS.ISecureOwnable]: true },
  },
};

type ZeroDataErrorCtor = new (args: { functionName: string }) => Error;

/**
 * The gate classifies reverts by viem error *class* (`instanceof`), so the fake must throw
 * the class from the viem instance the SDK itself resolves. When `sdk/typescript` has its
 * own `node_modules`, that is a different copy from the one this script would import.
 */
async function sdkZeroDataError(): Promise<ZeroDataErrorCtor> {
  const sdkRequire = createRequire(new URL('../../../sdk/typescript/package.json', import.meta.url));
  const viemDir = dirname(sdkRequire.resolve('viem/package.json'));
  const mod = await import(pathToFileURL(join(viemDir, '_esm', 'errors', 'contract.js')).href);
  return mod.ContractFunctionZeroDataError as ZeroDataErrorCtor;
}

function fakeClient(ContractFunctionZeroDataError: ZeroDataErrorCtor): PublicClient {
  const lookup = (address: string): FakeContract | undefined => TABLE[address.toLowerCase()];
  const client = {
    async getCode({ address }: { address: Address }): Promise<Hex | undefined> {
      return lookup(address)?.code;
    },
    async readContract({
      address,
      functionName,
      args,
    }: {
      address: Address;
      functionName: string;
      args?: readonly unknown[];
    }): Promise<unknown> {
      const c = lookup(address);
      const zero = () => new ContractFunctionZeroDataError({ functionName });
      if (!c) throw zero();
      if (functionName === 'owner') {
        if (!c.owner) throw zero();
        return c.owner;
      }
      if (functionName === 'initialized') {
        if (c.initialized === undefined) throw zero();
        return c.initialized;
      }
      if (functionName === 'supportsInterface') {
        const id = String(args?.[0]).toLowerCase() as Hex;
        const answer = c.interfaces?.[id];
        if (answer === undefined) throw zero();
        return answer;
      }
      if (c.pinned && functionName === 'implementation') return c.pinned.implementation;
      if (c.pinned && functionName === 'isClone') {
        return c.pinned.clones.some((a) => a.toLowerCase() === String(args?.[0]).toLowerCase());
      }
      throw zero();
    },
  };
  return client as unknown as PublicClient;
}

export async function runAccountGateTests(): Promise<SurfaceTestResult[]> {
  const results: SurfaceTestResult[] = [];
  const add = (name: string, passed: boolean, detail?: string) => {
    results.push({ name, passed, detail });
    console.log(`  ${passed ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
  };

  const client = fakeClient(await sdkZeroDataError());

  // --- the pinned factory is refused: it has no owner() ---
  const factory = await inspectAccountBlox(client, FACTORY);
  add('factory is not an account', factory.isAccount === false);
  add('factory rejection is no-owner', factory.rejection === 'no-owner', String(factory.rejection));
  add('isAccountBlox(factory) is false', (await isAccountBlox(client, FACTORY)) === false);

  let threw: unknown = null;
  try {
    await assertOwnedAccount(client, FACTORY, OWNER);
  } catch (e) {
    threw = e;
  }
  add(
    'assertOwnedAccount(factory, anyone) throws NotAnAccountError',
    threw instanceof NotAnAccountError && threw.rejection === 'no-owner'
  );

  // --- a BasicAccount clone still passes ---
  const clone = await inspectAccountBlox(client, CLONE);
  add('BasicAccount clone is an account', clone.isAccount === true, String(clone.rejection));

  // --- regression: CopyBlox stays out because owner() does not answer ---
  const copy = await inspectAccountBlox(client, COPYBLOX);
  add('CopyBlox is still rejected', copy.isAccount === false && copy.rejection === 'no-owner', String(copy.rejection));

  // --- an account that answers ISecureOwnable still passes ---
  const probe = await inspectAccountBlox(client, NO_CODE_ACCOUNT);
  add('account that answers ISecureOwnable passes', probe.isAccount === true, String(probe.rejection));

  // --- the thin client: four-argument mint, pinned implementation, lineage ---
  const wrapper = new BasicFactory(client, undefined, FACTORY, { id: 1 } as Chain);
  add('client reads the pinned implementation', (await wrapper.implementation()) === IMPLEMENTATION);
  add('client isClone(clone) is true', (await wrapper.isClone(CLONE)) === true);
  add('client isClone(stranger) is false', (await wrapper.isClone(IMPLEMENTATION)) === false);
  add('client isAccountBlox(factory) is false', (await wrapper.isAccountBlox(FACTORY)) === false);
  add(
    'cloneBlox selector is cloneBlox(address,address,address,uint256) (no implementation argument)',
    BASIC_FACTORY_SELECTORS.CLONE_BLOX === '0x361d9982'
  );
  let noWallet: unknown = null;
  try {
    await wrapper.cloneBlox(
      { initialOwner: OWNER, broadcaster: OWNER, recovery: OWNER, timeLockPeriodSec: 86_400n },
      { from: OWNER }
    );
  } catch (e) {
    noWallet = e;
  }
  add('client cloneBlox refuses without a wallet client', noWallet instanceof Error);

  return results;
}
