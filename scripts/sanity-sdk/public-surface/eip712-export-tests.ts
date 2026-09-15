/**
 * R2 / AC2 — the exported EIP-712 constants are the ones the SDK actually signs.
 *
 * Branch Zero could not import `META_TX_TYPES`, so it transcribed the list and
 * then cross-checked the transcription at runtime by capturing what
 * `MetaTransactionSigner` handed to `signTypedData`. This suite keeps that
 * cross-check and removes the transcription: the captured payload is compared
 * against the *exported* constants, so the two can never drift apart unnoticed.
 */

import type { Address, Hex } from 'viem';
import {
  META_TX_DOMAIN,
  META_TX_DOMAIN_NAME,
  META_TX_PRIMARY_TYPE,
  META_TX_TYPES,
  META_TX_TYPED_DATA_TYPES_AS_SIGNED,
  EIP712_DOMAIN_TYPE,
  buildTypedDataMessage,
  buildMetaTxTypedData,
  MetaTransactionSigner,
} from '../../../sdk/typescript/index.js';
import type { MetaTransaction } from '../../../sdk/typescript/index.js';
import type { SurfaceTestResult } from './package-exports-tests.ts';

const VERIFYING_CONTRACT = '0x00000000000000000000000000000000000000a1' as Address;
const SIGNER = '0x00000000000000000000000000000000000000b2' as Address;

/** A complete, syntactically valid unsigned meta-transaction. No chain needed. */
function fixtureMetaTx(): MetaTransaction {
  return {
    txRecord: {
      txId: 7n,
      releaseTime: 0n,
      status: 1,
      params: {
        requester: SIGNER,
        target: '0x00000000000000000000000000000000000000c3' as Address,
        value: 0n,
        gasLimit: 200000n,
        operationType: `0x${'11'.repeat(32)}` as Hex,
        executionSelector: '0xa9059cbb' as Hex,
        executionParams: '0x1234' as Hex,
      },
      message: `0x${'22'.repeat(32)}` as Hex,
      resultHash: `0x${'00'.repeat(32)}` as Hex,
      payment: {
        recipient: '0x00000000000000000000000000000000000000d4' as Address,
        nativeTokenAmount: 0n,
        erc20TokenAddress: '0x0000000000000000000000000000000000000000' as Address,
        erc20TokenAmount: 0n,
      },
    },
    params: {
      chainId: 31337n,
      nonce: 3n,
      handlerContract: VERIFYING_CONTRACT,
      handlerSelector: '0xdeadbeef' as Hex,
      action: 3,
      deadline: 600n,
      maxGasPrice: 100n,
      signer: SIGNER,
    },
    message: `0x${'22'.repeat(32)}` as Hex,
    signature: '0x' as Hex,
    data: '0x' as Hex,
  };
}

/** A sentinel the recording wallet throws so we get the payload without signing. */
class CapturedTypedData extends Error {
  constructor(public payload: any) {
    super('captured');
  }
}

function stable(value: unknown): string {
  return JSON.stringify(value, (_k, v) => (typeof v === 'bigint' ? `${v.toString()}n` : v));
}

export async function runEip712ExportTests(): Promise<SurfaceTestResult[]> {
  const results: SurfaceTestResult[] = [];
  const add = (name: string, passed: boolean, detail?: string) => {
    results.push({ name, passed, detail });
    console.log(`  ${passed ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
  };

  const metaTx = fixtureMetaTx();

  // --- AC2: capture what the SDK signs, compare to the exported constants ---
  let captured: any;
  const recordingWallet: any = {
    account: { address: SIGNER, type: 'json-rpc' },
    signTypedData: async (payload: any) => {
      throw new CapturedTypedData(payload);
    },
  };
  const signer = new MetaTransactionSigner(
    {} as any, // no reads happen on this path
    recordingWallet,
    VERIFYING_CONTRACT,
    { id: 31337 } as any
  );

  try {
    await signer.signMetaTransactionWithWallet(metaTx);
    add('signMetaTransactionWithWallet reaches the wallet', false, 'it returned without signing');
  } catch (e: any) {
    if (e instanceof CapturedTypedData) {
      captured = e.payload;
      add('signMetaTransactionWithWallet reaches the wallet', true);
    } else {
      add('signMetaTransactionWithWallet reaches the wallet', false, e?.message ?? String(e));
    }
  }

  if (captured) {
    add(
      'exported META_TX_TYPES is the type list the SDK signs',
      stable(captured.types) === stable(META_TX_TYPES),
      stable(captured.types) === stable(META_TX_TYPES) ? undefined : 'captured types differ from the export'
    );
    add('signed primaryType matches META_TX_PRIMARY_TYPE', captured.primaryType === META_TX_PRIMARY_TYPE);
    add('signed domain name matches META_TX_DOMAIN_NAME', captured.domain?.name === META_TX_DOMAIN_NAME);
    add(
      'signed domain version matches META_TX_DOMAIN.version',
      captured.domain?.version === META_TX_DOMAIN.version,
      `${captured.domain?.version}`
    );
    add(
      'signed domain verifyingContract is the account contract',
      String(captured.domain?.verifyingContract).toLowerCase() === VERIFYING_CONTRACT.toLowerCase()
    );
    add(
      'exported buildTypedDataMessage is the message the SDK signs',
      stable(captured.message) === stable(buildTypedDataMessage(metaTx))
    );
  }

  // --- AS_SIGNED: the set as a signer policy sees it ---
  const asSignedKeys = Object.keys(META_TX_TYPED_DATA_TYPES_AS_SIGNED);
  add(
    'META_TX_TYPED_DATA_TYPES_AS_SIGNED prepends EIP712Domain',
    asSignedKeys[0] === 'EIP712Domain',
    asSignedKeys.join(', ')
  );
  add(
    'AS_SIGNED is EIP712Domain + META_TX_TYPES, nothing else',
    stable({ EIP712Domain: EIP712_DOMAIN_TYPE, ...META_TX_TYPES }) ===
      stable(META_TX_TYPED_DATA_TYPES_AS_SIGNED)
  );
  add(
    'EIP712_DOMAIN_TYPE covers exactly the four domain fields Bloxchain sets',
    stable(EIP712_DOMAIN_TYPE.map((f) => f.name)) === stable(['name', 'version', 'chainId', 'verifyingContract'])
  );

  // --- buildMetaTxTypedData: the whole payload in one call ---
  const typedData = buildMetaTxTypedData(metaTx, VERIFYING_CONTRACT);
  add(
    'buildMetaTxTypedData carries the as-signed type set',
    stable(typedData.types) === stable(META_TX_TYPED_DATA_TYPES_AS_SIGNED)
  );
  add('buildMetaTxTypedData takes chainId from the meta-tx params', typedData.domain.chainId === 31337);
  add(
    'buildMetaTxTypedData message equals buildTypedDataMessage',
    stable(typedData.message) === stable(buildTypedDataMessage(metaTx))
  );

  return results;
}
