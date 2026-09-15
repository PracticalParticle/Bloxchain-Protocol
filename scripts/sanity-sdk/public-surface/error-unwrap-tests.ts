/**
 * R4 / R5 — error unwrap keeps the revert bytes, names the error, and never
 * reads an address as text.
 *
 * Every case here is a shape the SDK was actually handed during the ETHOnline
 * Branch Zero build, reconstructed offline: viem's nesting, the `from` address
 * sitting in the message where the old extractor found it first, and a signer
 * that refused before anything was broadcast.
 */

import { encodeAbiParameters, toFunctionSelector, type Address } from 'viem';
import {
  explainError,
  extractRevertData,
  decodeRevert,
  classifySignerError,
  isAddressShapedHex,
  ERROR_SIGNATURES,
  ERROR_DECODE_TYPES,
  decodeRevertReason,
  ALL_ERROR_ABI,
  ABIS,
} from '../../../sdk/typescript/index.js';
import { extractErrorData } from '../../../sdk/typescript/utils/viem-error-handler.js';
import type { SurfaceTestResult } from './package-exports-tests.ts';

const CALLER = '0x00000000000000000000000000000000000000ff' as Address;

/** `NoPermission(address)` revert bytes for `CALLER`. */
function noPermissionData(): `0x${string}` {
  const selector = toFunctionSelector('NoPermission(address)');
  const args = encodeAbiParameters([{ type: 'address' }], [CALLER]);
  return `${selector}${args.slice(2)}` as `0x${string}`;
}

/**
 * Viem's nesting for a failed write, with the `from` address in the outer
 * message exactly where the old extractor's `/0x[0-9a-fA-F]+/` found it first
 * and "decoded" it into `ReadableText`.
 */
function nestedViemError(revertData: `0x${string}`): Error {
  const inner: any = new Error('execution reverted');
  inner.name = 'RpcRequestError';
  inner.data = revertData;

  const middle: any = new Error(
    `The contract function "getWalletRoles" reverted.\n\nContract Call:\n  from:  ${CALLER}`
  );
  middle.name = 'ContractFunctionRevertedError';
  middle.cause = inner;

  const outer: any = new Error(
    `An unknown error occurred while executing the contract function.\n  from:  ${CALLER}`
  );
  outer.name = 'ContractFunctionExecutionError';
  outer.cause = middle;
  return outer;
}

export async function runErrorUnwrapTests(): Promise<SurfaceTestResult[]> {
  const results: SurfaceTestResult[] = [];
  const add = (name: string, passed: boolean, detail?: string) => {
    results.push({ name, passed, detail });
    console.log(`  ${passed ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
  };

  const revertData = noPermissionData();

  // --- AC4: a forced NoPermission through nested viem errors ---
  const err = nestedViemError(revertData);

  add(
    'extractRevertData walks cause chain to the revert bytes',
    extractRevertData(err) === revertData,
    extractRevertData(err) ?? '(none)'
  );
  add(
    'extractErrorData (legacy entry point) returns the same bytes, not the from address',
    extractErrorData(err) === revertData,
    String(extractErrorData(err))
  );

  const explained = explainError(err, { abi: ALL_ERROR_ABI });
  add('explainError names the revert', explained.errorName === 'NoPermission', explained.errorName);
  add('explainError reports kind "revert"', explained.kind === 'revert', explained.kind);
  add('explainError keeps the raw bytes', explained.raw === revertData);
  add(
    'explainError decodes the caller argument',
    String(Object.values(explained.args)[0] ?? '').toLowerCase() === CALLER.toLowerCase(),
    JSON.stringify(explained.args)
  );
  add(
    'explainError never yields ReadableText',
    explained.errorName !== 'ReadableText',
    explained.errorName
  );

  // --- The specific bug: a 20-byte address must never become text ---
  add('isAddressShapedHex identifies a 20-byte address', isAddressShapedHex(CALLER));
  add(
    'decodeRevertReason refuses a 20-byte address',
    decodeRevertReason(CALLER) === null,
    JSON.stringify(decodeRevertReason(CALLER))
  );
  add('decodeRevert refuses a 20-byte address', decodeRevert(CALLER) === undefined);
  add(
    'extractRevertData never returns an address',
    (() => {
      const addressOnly: any = new Error(`reverted. from: ${CALLER}`);
      addressOnly.data = CALLER;
      return extractRevertData(addressOnly) === undefined;
    })()
  );

  // --- Decoding without an ABI still names the error (curated table) ---
  const noAbi = decodeRevert(revertData);
  add(
    'decodeRevert names NoPermission from the curated table with no ABI',
    noAbi?.errorName === 'NoPermission',
    noAbi?.errorName ?? '(undecoded)'
  );
  add('decodeRevert reports its source', noAbi?.source === 'signatures', noAbi?.source);

  // --- Error(string) and Panic(uint256) ---
  const errorString = `0x08c379a0${encodeAbiParameters([{ type: 'string' }], ['boom']).slice(2)}` as `0x${string}`;
  const decodedErrorString = decodeRevert(errorString);
  add(
    'decodeRevert handles Error(string)',
    decodedErrorString?.errorName === 'Error' && decodedErrorString?.args.reason === 'boom',
    decodedErrorString?.message
  );
  const panic = `0x4e487b71${encodeAbiParameters([{ type: 'uint256' }], [0x11n]).slice(2)}` as `0x${string}`;
  const decodedPanic = decodeRevert(panic);
  add(
    'decodeRevert handles Panic(uint256)',
    decodedPanic?.errorName === 'Panic',
    decodedPanic?.message
  );

  // --- Request calldata must not be mistaken for a revert ---
  const calldataSelector = toFunctionSelector('transfer(address,uint256)');
  const calldata = `${calldataSelector}${encodeAbiParameters(
    [{ type: 'address' }, { type: 'uint256' }],
    [CALLER, 1n]
  ).slice(2)}` as `0x${string}`;
  const withCalldata: any = new Error('write failed');
  withCalldata.data = calldata;
  add(
    'extractRevertData skips outgoing calldata when told the selector',
    extractRevertData(withCalldata, { ignoreSelectors: [calldataSelector] }) === undefined
  );

  // --- R5: the signer answered, not the chain ---
  const policyDenial: any = new Error('An unknown error occurred while executing the contract function.');
  policyDenial.name = 'ContractFunctionExecutionError';
  const denialCause: any = new Error('Bad Request');
  denialCause.name = 'BadRequestError';
  denialCause.status = 400;
  denialCause.error = { error: 'transaction denied by policy rule', code: 'policy_violation' };
  policyDenial.cause = denialCause;

  const denial = classifySignerError(policyDenial);
  add('classifySignerError flags a policy violation as SignerDenied', denial?.code === 'SignerDenied', denial?.code);
  const explainedDenial = explainError(policyDenial, { abi: ALL_ERROR_ABI });
  add(
    'explainError classifies the signer before guessing a revert',
    explainedDenial.kind === 'signer' && explainedDenial.errorName === 'SignerDenied',
    `${explainedDenial.kind}/${explainedDenial.errorName}`
  );

  const userRejection: any = new Error('User rejected the request.');
  userRejection.code = 4001;
  add(
    'classifySignerError flags an EIP-1193 user rejection',
    classifySignerError(userRejection)?.code === 'SignerDenied'
  );

  const signerOutage: any = new Error('signer request failed');
  const outageCause: any = new Error('Unauthorized');
  outageCause.status = 401;
  outageCause.error = { error: 'invalid api key' };
  signerOutage.cause = outageCause;
  add(
    'classifySignerError separates a signer fault from a denial',
    classifySignerError(signerOutage)?.code === 'SignerError',
    classifySignerError(signerOutage)?.code
  );

  // A real contract revert must NOT be claimed by the signer classifier.
  add('classifySignerError leaves a contract revert alone', classifySignerError(err) === undefined);

  // The sharp edge: a revert whose *reason string* reads like a signer refusal.
  // The chain answered, so it must stay a revert.
  const unauthorizedRevert: any = new Error(
    'execution reverted: Unauthorized — user rejected by policy'
  );
  unauthorizedRevert.data = `0x08c379a0${encodeAbiParameters(
    [{ type: 'string' }],
    ['Unauthorized']
  ).slice(2)}` as `0x${string}`;
  add(
    "a revert reading 'Unauthorized' is not misread as a signer failure",
    classifySignerError(unauthorizedRevert) === undefined
  );
  add(
    'that revert still explains as a revert',
    explainError(unauthorizedRevert).kind === 'revert',
    explainError(unauthorizedRevert).errorName
  );

  // --- Transport ---
  const rpcDown: any = new Error('HTTP request failed. Status: 503');
  add(
    'explainError classifies a transport failure as RpcError',
    explainError(rpcDown).errorName === 'RpcError',
    explainError(rpcDown).errorName
  );

  // --- ERROR_SIGNATURES completeness against every shipped ABI ---
  const missing: string[] = [];
  const missingTypes: string[] = [];
  for (const [contract, abi] of Object.entries(ABIS)) {
    for (const item of abi as Array<{ type?: string; name?: string; inputs?: Array<{ type?: string }> }>) {
      if (item.type !== 'error') continue;
      const selector = toFunctionSelector(
        `${item.name}(${(item.inputs ?? []).map((i) => i.type).join(',')})`
      ).toLowerCase();
      if (!ERROR_SIGNATURES[selector]) missing.push(`${item.name} (${contract})`);
      else if (ERROR_DECODE_TYPES[selector] === undefined) missingTypes.push(`${item.name} (${contract})`);
    }
  }
  add(
    'ERROR_SIGNATURES covers every custom error in every shipped ABI',
    missing.length === 0,
    missing.length ? `missing: ${[...new Set(missing)].join(', ')}` : `${Object.keys(ERROR_SIGNATURES).length} selectors`
  );
  add(
    'ERROR_DECODE_TYPES covers every curated selector used by the ABIs',
    missingTypes.length === 0,
    missingTypes.length ? `missing: ${[...new Set(missingTypes)].join(', ')}` : undefined
  );

  // TargetNotWhitelisted specifically — the one Branch Zero reported missing.
  const targetNotWhitelisted = toFunctionSelector('TargetNotWhitelisted(address,bytes4)').toLowerCase();
  add(
    'TargetNotWhitelisted is on the curated path',
    ERROR_SIGNATURES[targetNotWhitelisted]?.name === 'TargetNotWhitelisted',
    ERROR_SIGNATURES[targetNotWhitelisted]?.name
  );

  return results;
}
