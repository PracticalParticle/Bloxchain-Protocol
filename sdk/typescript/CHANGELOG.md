# Changelog — @bloxchain/sdk

All notable changes to this package are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added — public-integrator surface (SPEC-2026-0117)

Additive only. Every item below closes a seam measured on a real outside build that
had only `npm i @bloxchain/sdk viem`; each replaces a file that builder had to write
by hand. See [`docs/integrator-checklist.md`](../../docs/integrator-checklist.md).

- **ABI subpath exports.** `exports` gains `./abi/*` (per-contract ES modules, e.g.
  `@bloxchain/sdk/abi/CopyBlox`), `./abi/*.json` (the raw files) and `./package.json`.
  The `./abi` barrel now covers every shipped contract plus a minimal ERC-20, and adds
  `ABIS` (keyed by contract name) and `ALL_ERROR_ABI` (every custom error, de-duplicated).
- **EIP-712 constants are public.** `META_TX_DOMAIN`, `META_TX_DOMAIN_NAME`,
  `META_TX_PRIMARY_TYPE`, `META_TX_TYPES`, `EIP712_DOMAIN_TYPE` and
  `buildTypedDataMessage` are exported from the package root, joined by
  `META_TX_TYPED_DATA_TYPES_AS_SIGNED` (the set including `EIP712Domain`, as a signer
  policy sees it) and `buildMetaTxTypedData(metaTx, verifyingContract, chainId?)`.
- **`readAs` sender for permissioned reads.** Core wrappers take an optional trailing
  `readAs?: Address` constructor argument; `setReadSender()` / `getReadSender()` and a
  per-call `readAs` argument on every role-gated view. A read-only client can now query
  `_validateAnyRole` views instead of being refused `NoPermission(0x0)`. The zero
  address is rejected with an explanatory error.
- **Structured error unwrap.** New `explainError`, `extractRevertData`, `decodeRevert`,
  `classifySignerError`, `errorTextChain`, `isRevertNamed`, `isAddressShapedHex`.
  `explainError` returns `{ kind, errorName, args, selector, raw, message, cause }` and
  never throws.
- **Signer-layer classification.** A signer refusal or fault is reported as
  `SignerDenied` / `SignerError` **before** any contract-revert decoding, so a policy
  violation is no longer presented as a chain revert.
- **`metaTxDeadlineFor(client, ttlSeconds)`.** Returns the *duration* to pass as
  `createMetaTxParams`'s `deadline`, corrected for latest-block drift on chains that
  mine on demand. The `deadline` parameter is renamed `deadlineDuration` and typed
  `MetaTxDeadlineDuration` with NatSpec saying so (same position, same `bigint`).
- **Inner transaction status.** `assertInnerSuccess`, `readInnerOutcomes`,
  `waitForTransactionAndAssertInner`, `InnerTransactionFailedError`,
  `ENGINE_BLOX_EVENTS_ABI`, `TX_STATUS_NAMES`, `txStatusName`; plus
  `BaseStateMachine.waitForTransactionAndAssertInner()` and `.readInnerOutcomes()`.
  A mined transaction is not a successful one: `EngineBlox` catches an inner revert,
  records `TxStatus.FAILED`, and the outer receipt still reports `success`.
- **`ERROR_SIGNATURES` completed** against every shipped ABI: `GrantNotRevocable`,
  `MetaTxPaymentMismatchStoredTx`, `MetaTxRecordMismatchStoredTx`,
  `SafeERC20FailedOperation`, and the OpenZeppelin `InvalidInitialization`,
  `NotInitializing`, `ReentrancyGuardReentrantCall`, `FailedDeployment`.

### Fixed

- `extractErrorData` no longer returns the first hex run found in an error message.
  On a write failure that was the `from` address, which then decoded as
  `ReadableText` garbage in place of the real error. Revert data is now located by
  walking `cause` / `originalError` / `errorData` / `raw` / `data.data` and accepting
  only selector-plus-whole-32-byte-word payloads — a 20-byte address can never match.
- `decodeRevertReason` refuses address-shaped input outright, and no longer falls back
  to reading ABI-shaped revert bytes as ASCII. Unnamed errors are reported as unknown
  with their bytes intact rather than as an invented message.

### Changed

- `EnhancedViemError` (thrown by the contract wrappers) carries additional structured
  fields — `kind`, `errorName`, `args`, `selector`, `raw`, `signerFailure` — alongside
  the existing `message` / `userMessage` / `contractError`. No field was removed, but
  the *text* of `message` and `userMessage` now differs for signer-layer failures and
  for reverts that previously decoded as `ReadableText`. Branch on `errorName`, not on
  message wording.

## [1.0.0] - 2026-06-03

### Added

- First **stable** documented release on npm (`latest`).
- TypeScript SDK for Bloxchain contract interaction (Viem).

### Note

Prior `1.0.0-alpha.N` publishes were experimental and are not listed in this changelog.

**Peer dependency:** `@bloxchain/contracts` `^1.0.0`.
