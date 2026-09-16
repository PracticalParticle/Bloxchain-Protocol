/**
 * R3 / AC3 — a read-only wrapper sends a real `from`, never `address(0)`.
 * R6 — `createMetaTxParams` takes a duration, and `metaTxDeadlineFor` corrects
 *      for a chain whose latest block has gone stale.
 *
 * Both run against a recording stub client, so they assert what the SDK *sends*
 * rather than what a particular chain happens to answer. AC3's on-chain half —
 * a real permissioned view answering for a `readAs` sender — is covered by the
 * runtime-rbac suite against a live node.
 */

import type { Address, Hex } from 'viem';
import {
  RuntimeRBAC,
  metaTxDeadlineFor,
  MetaTransactionBuilder,
  TxAction,
} from '../../../sdk/typescript/index.js';
import type { SurfaceTestResult } from './package-exports-tests.ts';

const ACCOUNT = '0x000000000000000000000000000000000000ba51' as Address;
const ROLE_HOLDER = '0x00000000000000000000000000000000000000a7' as Address;
const OTHER_HOLDER = '0x00000000000000000000000000000000000000a8' as Address;
const WALLET = '0x00000000000000000000000000000000000000b9' as Address;
const ZERO = '0x0000000000000000000000000000000000000000' as Address;

/** Records every `readContract` call instead of making one. */
function recordingClient(blockTimestamp = 0n) {
  const calls: any[] = [];
  return {
    calls,
    client: {
      readContract: async (args: any) => {
        calls.push(args);
        return [];
      },
      getBlock: async () => ({ timestamp: blockTimestamp }),
    } as any,
  };
}

/** The `from` a viem call would carry: `account` may be an address or an account object. */
function sentFrom(call: any): string | undefined {
  const account = call?.account;
  if (account === undefined || account === null) return undefined;
  return typeof account === 'string' ? account : account.address;
}

export async function runReaderAndDeadlineTests(): Promise<SurfaceTestResult[]> {
  const results: SurfaceTestResult[] = [];
  const add = (name: string, passed: boolean, detail?: string) => {
    results.push({ name, passed, detail });
    console.log(`  ${passed ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
  };

  // --- R3: a read-only wrapper with no readAs sends no `from` — never 0x0 ---
  {
    const { client, calls } = recordingClient();
    const reader = new RuntimeRBAC(client, undefined, ACCOUNT, { id: 31337 } as any);
    await reader.getWalletRoles(WALLET);
    const from = sentFrom(calls[0]);
    add(
      'a wallet-less reader never sends address(0) as from',
      from === undefined || from.toLowerCase() !== ZERO,
      String(from)
    );
  }

  // --- R3: constructor readAs ---
  {
    const { client, calls } = recordingClient();
    const reader = new RuntimeRBAC(client, undefined, ACCOUNT, { id: 31337 } as any, ROLE_HOLDER);
    await reader.getWalletRoles(WALLET);
    add(
      'constructor readAs becomes the read sender',
      sentFrom(calls[0])?.toLowerCase() === ROLE_HOLDER.toLowerCase(),
      String(sentFrom(calls[0]))
    );
    add('getReadSender reports it', reader.getReadSender()?.toLowerCase() === ROLE_HOLDER.toLowerCase());
  }

  // --- R3: setReadSender, and a per-call override ---
  {
    const { client, calls } = recordingClient();
    const reader = new RuntimeRBAC(client, undefined, ACCOUNT, { id: 31337 } as any);
    reader.setReadSender(ROLE_HOLDER);
    await reader.getAuthorizedWallets(`0x${'11'.repeat(32)}` as Hex);
    add(
      'setReadSender becomes the read sender',
      sentFrom(calls[0])?.toLowerCase() === ROLE_HOLDER.toLowerCase(),
      String(sentFrom(calls[0]))
    );

    await reader.getAuthorizedWallets(`0x${'11'.repeat(32)}` as Hex, OTHER_HOLDER);
    add(
      'a per-call readAs overrides the wrapper default',
      sentFrom(calls[1])?.toLowerCase() === OTHER_HOLDER.toLowerCase(),
      String(sentFrom(calls[1]))
    );

    reader.setReadSender(undefined);
    await reader.getSupportedRoles();
    add('setReadSender(undefined) clears it', sentFrom(calls[2]) === undefined, String(sentFrom(calls[2])));
  }

  // --- R3: the zero address is refused, loudly ---
  {
    const { client } = recordingClient();
    let refusedCtor = false;
    try {
      new RuntimeRBAC(client, undefined, ACCOUNT, { id: 31337 } as any, ZERO);
    } catch {
      refusedCtor = true;
    }
    add('constructor refuses readAs = address(0)', refusedCtor);

    const reader = new RuntimeRBAC(client, undefined, ACCOUNT, { id: 31337 } as any);
    let refusedSetter = false;
    try {
      reader.setReadSender(ZERO);
    } catch {
      refusedSetter = true;
    }
    add('setReadSender refuses address(0)', refusedSetter);

    let refusedGarbage = false;
    try {
      reader.setReadSender('not-an-address' as Address);
    } catch {
      refusedGarbage = true;
    }
    add('setReadSender refuses a non-address', refusedGarbage);
  }

  // --- R3: a wallet client's account is still used when no readAs is set ---
  {
    const { client, calls } = recordingClient();
    const walletClient: any = { account: { address: ROLE_HOLDER, type: 'json-rpc' } };
    const reader = new RuntimeRBAC(client, walletClient, ACCOUNT, { id: 31337 } as any);
    await reader.getWalletRoles(WALLET);
    add(
      "a wallet client's account is still the default read sender",
      sentFrom(calls[0])?.toLowerCase() === ROLE_HOLDER.toLowerCase(),
      String(sentFrom(calls[0]))
    );
  }

  // --- R6: metaTxDeadlineFor corrects for a stale latest block ---
  {
    const nowSec = BigInt(Math.floor(Date.now() / 1000));
    const staleBy = 3600n;
    const { client } = recordingClient(nowSec - staleBy);
    const ttl = 600n;
    const duration = await metaTxDeadlineFor(client, ttl);
    // block.timestamp + duration must land at least `ttl` seconds past *now*.
    const effectiveExpiry = nowSec - staleBy + duration;
    add(
      'metaTxDeadlineFor adds the drift of a stale latest block',
      effectiveExpiry >= nowSec + ttl - 2n,
      `duration=${duration} (drift ${staleBy} + ttl ${ttl})`
    );
  }

  {
    // A chain whose head is current: the duration is just the TTL.
    const nowSec = BigInt(Math.floor(Date.now() / 1000));
    const { client } = recordingClient(nowSec);
    const duration = await metaTxDeadlineFor(client, 600n);
    add('metaTxDeadlineFor degrades to the TTL on a current chain', duration >= 600n && duration <= 602n, `${duration}`);
  }

  {
    const { client } = recordingClient(0n);
    let refused = false;
    try {
      await metaTxDeadlineFor(client, 0);
    } catch {
      refused = true;
    }
    add('metaTxDeadlineFor refuses a non-positive TTL', refused);
  }

  // --- R6: the builder passes the duration straight through ---
  {
    const params = MetaTransactionBuilder.createMetaTxParams(
      ACCOUNT,
      '0xdeadbeef' as Hex,
      TxAction.SIGN_META_REQUEST_AND_APPROVE,
      600n,
      100n,
      ROLE_HOLDER,
      31337n
    );
    add(
      'createMetaTxParams carries the duration, not a timestamp',
      params.deadline === 600n,
      `${params.deadline}`
    );
  }

  return results;
}
