/**
 * SPEC-2026-0130 R7 — the account gate rejects the canonical factory.
 *
 * The pinned `BasicFactory` is not an account: it has code and answers ERC-165
 * `IEventForwarder`, but has no `owner()`, no `initialized()`, and never answers
 * `ISecureOwnable`. The gate refuses it at `no-owner`. This suite also drives the thin
 * `BasicFactory` client's reads (pin, lineage, deterministic predict) against the same fake.
 *
 * SPEC-2026-0138: the offline CREATE2 helper is pinned to vectors computed with Foundry `cast`
 * (`keccak256(abi.encode(deployer, owner, index, salt))` over the EIP-1167 init code), not viem,
 * so the TS formula and the Solidity formula are checked against an independent tool.
 *
 * **Offline.** A fake `PublicClient` answers `getCode` / `readContract` from a table, so
 * the cases below are the shapes measured in Foundry (`test/foundry/unit/BasicFactory.t.sol`),
 * not a live chain.
 */

import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { type Address, type Chain, type Hex, type PublicClient, zeroHash } from 'viem';
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
const MINTER = '0x00000000000000000000000000000000000000a1' as Address;

/** `cast`-computed deterministic clones of IMPLEMENTATION from FACTORY for (MINTER, OWNER, index, 0x0). */
const CAST_VECTORS = [
  {
    index: 0n,
    salt: '0x53ff14b52aa8528d92cde3bdbd4b4417f41118ab3232ae051eed105d04963b84' as Hex,
    clone: '0x111fFd70a9b237df2CD494Dd5eF0E8351E2444DA' as Address,
  },
  {
    index: 1n,
    salt: '0xa0ef10b7cda7d601c28d23ba88418f455f2276d6e36e157ced99c19537730dac' as Hex,
    clone: '0x18BD724Dbd5828bf350008D015c27805AE0A68a8' as Address,
  },
] as const;

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
      if (c.pinned && functionName === 'predictClone') {
        // Answers only the exact argument tuple the factory would see: (deployer, owner, index, salt).
        const [deployer, owner, index, salt] = (args ?? []) as [string, string, bigint, string];
        const hit = CAST_VECTORS.find(
          (v) =>
            deployer.toLowerCase() === MINTER.toLowerCase() &&
            owner.toLowerCase() === OWNER.toLowerCase() &&
            index === v.index &&
            salt.toLowerCase() === zeroHash
        );
        if (!hit) throw zero();
        return hit.clone;
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

  // --- SPEC-2026-0138 deterministic mint: selectors, salt formula, predict ---
  add(
    'cloneBloxDeterministic selector is (address,address,address,uint256,uint256,bytes32)',
    BASIC_FACTORY_SELECTORS.CLONE_BLOX_DETERMINISTIC === '0x38c1cb58'
  );
  add(
    'predictClone selector is (address,address,uint256,bytes32)',
    BASIC_FACTORY_SELECTORS.PREDICT_CLONE === '0x21d268a3'
  );
  for (const v of CAST_VECTORS) {
    const inputs = { deployer: MINTER, initialOwner: OWNER, index: v.index };
    add(`create2Salt matches cast (index ${v.index})`, BasicFactory.create2Salt(inputs) === v.salt);
    add(
      `computeCloneAddress matches cast (index ${v.index})`,
      BasicFactory.computeCloneAddress(FACTORY, IMPLEMENTATION, inputs) === v.clone,
      BasicFactory.computeCloneAddress(FACTORY, IMPLEMENTATION, inputs)
    );
    add(
      `client predictClone reads the factory with salt defaulting to 0x0 (index ${v.index})`,
      (await wrapper.predictClone(inputs)) === v.clone
    );
  }
  const base = { deployer: MINTER, initialOwner: OWNER, index: 0n };
  const at = (i: typeof base & { salt?: Hex }) => BasicFactory.computeCloneAddress(FACTORY, IMPLEMENTATION, i);
  add(
    'explicit zero salt equals the default',
    at({ ...base, salt: zeroHash }) === at(base)
  );
  add(
    'minter, owner, index and salt each move the address',
    new Set([
      at(base),
      at({ ...base, deployer: OWNER }),
      at({ ...base, initialOwner: MINTER }),
      at({ ...base, index: 1n }),
      at({ ...base, salt: `0x${'00'.repeat(31)}01` as Hex }),
    ]).size === 5
  );
  let noWalletDet: unknown = null;
  try {
    await wrapper.cloneBloxDeterministic(
      { initialOwner: OWNER, broadcaster: OWNER, recovery: OWNER, timeLockPeriodSec: 86_400n, index: 0n },
      { from: MINTER }
    );
  } catch (e) {
    noWalletDet = e;
  }
  add('client cloneBloxDeterministic refuses without a wallet client', noWalletDet instanceof Error);
  add('isAccountBlox(factory) is still false', (await isAccountBlox(client, FACTORY)) === false);

  return results;
}
