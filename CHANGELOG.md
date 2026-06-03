# Repository changelog (monorepo)

This file is **not** an npm product changelog. Release history for published packages:

- [@bloxchain/contracts](./package/CHANGELOG.md)
- [@bloxchain/sdk](./sdk/typescript/CHANGELOG.md)

See [docs/VERSIONING.md](./docs/VERSIONING.md) for the full versioning model.

## Experimental alpha line (not documented here)

Prior npm publishes used `1.0.0-alpha.N` with dist-tag `alpha.24` for development and testing only. That line is **not** listed in the per-package changelogs.

## Stable line

The first documented stable releases are **`1.0.0`** on dist-tag **`latest`** for both packages. On-chain `EngineBlox.VERSION` remains **`"1.0.0"`** for the v1 protocol line until a deliberate protocol version change.

## Protocol version (`EngineBlox.VERSION`)

On-chain / EIP-712 protocol version bumps are **manual** and rare. Document them here when they occur (in addition to updating `contracts/core/lib/EngineBlox.sol` and `sdk/typescript/lib/EngineBlox.tsx`).
