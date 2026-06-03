# Versioning — Bloxchain Protocol

Guide for **npm packages**, **on-chain protocol version**, and **release automation** in this monorepo.

## Three version layers

These numbers are **not** required to match.

| Layer | Where | Example | Bumped when |
|-------|--------|---------|-------------|
| **A. On-chain protocol** | `contracts/core/lib/EngineBlox.sol` → `VERSION`; mirrored in `sdk/typescript/lib/EngineBlox.tsx` | `"1.0.0"` | EIP-712 / meta-tx domain break, incompatible EngineBlox semantics |
| **B. npm `@bloxchain/contracts`** | `package/package.json` | `1.0.0`, `1.0.1`, `1.1.0` | Publishable Solidity artifact changes (ABI, packaged sources) |
| **C. npm `@bloxchain/sdk`** | `sdk/typescript/package.json` | `1.0.0`, `1.0.1`, `1.2.0` | TypeScript SDK fixes and features |

**Example:** npm `@bloxchain/sdk@1.0.5` does **not** mean on-chain `EngineBlox.VERSION` became `1.0.5`. Protocol bumps are rare and manual.

## Compatibility matrix

| On-chain `VERSION` | `@bloxchain/contracts` | `@bloxchain/sdk` | Notes |
|--------------------|-------------------------|------------------|--------|
| `1.0.0` | `1.0.x` | `1.0.x` – `1.x.x` | SDK declares peer `@bloxchain/contracts` `^1.0.0` |

Update this table when **A** or supported **B/C** ranges change.

## npm packages

- **`@bloxchain/contracts`** and **`@bloxchain/sdk`** use **independent semver** within major **1** (they do not share a single version number).
- Changelogs: [package/CHANGELOG.md](../package/CHANGELOG.md), [sdk/typescript/CHANGELOG.md](../sdk/typescript/CHANGELOG.md).
- Repo root is **not** published (`package.json` is `private`).

### Experimental alpha line (sunset)

Earlier test publishes used `1.0.0-alpha.N` on dist-tag `alpha.24`. Those releases were **experimental** and are **not** documented in the per-package changelogs.

The first documented **stable** line is **`1.0.0`** on dist-tag **`latest`**.

### When to upgrade npm pins

| You need… | Pin / action |
|-----------|----------------|
| SDK bugfix or TS API change | Bump `@bloxchain/sdk` only |
| New ABI or packaged contract layout | Bump `@bloxchain/contracts`; check SDK release notes and peer range |
| Protocol signing / meta-tx domain change | Follow **protocol** migration notes; bump SDK when a release includes the mirror; may require wallet/client updates |

## Publishing to npm (maintainers)

From the repo root, after release versions are on **`main`**:

```bash
npm login
npm run release:prepare
npm run publish:contracts
npm run publish:sdk
```

Optional live SDK gate before publish:

```powershell
$env:RUN_SANITY_SDK_TESTS="1"; npm run release:prepare
```

`release:prepare` checks that `EngineBlox.VERSION` matches in Solidity and the SDK, builds artifacts, and runs tests. You do not need separate verify scripts before prepare.

Publish uses dist-tag **`latest`** (override with `NPM_PUBLISH_TAG` if needed).

## On-chain `EngineBlox.VERSION`

**Locations:**

- Solidity: `contracts/core/lib/EngineBlox.sol` (`VERSION` constant)
- SDK mirror: `sdk/typescript/lib/EngineBlox.tsx` (`EngineBlox.VERSION`)

Included in `release:prepare` / publish. For a **manual protocol bump** (after editing `.sol` first):

```bash
node scripts/sync-versions.cjs --sync-protocol
node scripts/sync-versions.cjs --verify
```

### Bump on-chain `VERSION` when

- EIP-712 or meta-tx domain changes for integrators
- EngineBlox behavior breaks existing client assumptions

Same change set should update the SDK mirror, this matrix, and a note in [CHANGELOG.md](../CHANGELOG.md) (repo narrative).

### Do **not** bump on-chain `VERSION` when

- SDK-only patch (wrappers, ESM, docs)
- Contracts republish without protocol semantic change
- Documentation-only changes

EIP-712 today uses `keccak256(bytes(VERSION))`. Treat a `VERSION` string change as a **wallet/signature migration** for clients.

## Release automation (Release Please)

Release Please manages **only** the two npm packages. Configuration: [release-please-config.json](../release-please-config.json).

| Path prefix | Package | Changelog |
|-------------|---------|-----------|
| `package/` (and contract sources that feed the npm artifact) | `@bloxchain/contracts` | `package/CHANGELOG.md` |
| `sdk/typescript/` | `@bloxchain/sdk` | `sdk/typescript/CHANGELOG.md` |

Commits are attributed primarily by **files changed**. Use conventional commit scopes `contracts` and `sdk` so history stays clear — see [CONTRIBUTING.md](../CONTRIBUTING.md#release-attribution-release-please).

- `feat` / `fix` with breaking footer → semver bump per package
- `docs`, `chore`, `ci`, etc. → changelog only when included; no bump alone

## First stable `1.0.0` on npm

1. Merge the versioning PR into **`main`**.
2. Let **Release Please** on `main` open release PR(s), or publish manually if versions are already `1.0.0` in tree.
3. Review per-package changelogs; merge release PR(s) when using automation.
4. Run the [publish commands](#publishing-to-npm-maintainers) above.

Do not overwrite existing `alpha` tarballs; publish `1.0.0` as a new stable version on **`latest`**.

**Release Please locally (optional):** `npm run release:please-pr` (requires GitHub token).

## Changelogs

| File | Role |
|------|------|
| [package/CHANGELOG.md](../package/CHANGELOG.md) | npm `@bloxchain/contracts` — Release Please |
| [sdk/typescript/CHANGELOG.md](../sdk/typescript/CHANGELOG.md) | npm `@bloxchain/sdk` — Release Please |
| [CHANGELOG.md](../CHANGELOG.md) | Repo / protocol narrative — **not** Release Please |

## Related

- [CONTRIBUTING.md](../CONTRIBUTING.md) — commit scopes and release process
