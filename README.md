# Bloxchain Protocol

**A composable framework for secure Ethereum applications.**

Open-source (MPL-2.0) **state abstraction** via EngineBlox — a shared state machine plus optional core components. Compose vaults, tokens, payment flows, factories, and governed accounts with two-party authorization, RBAC, timelocks, and guarded execution enforced on-chain.

[![License: MPL-2.0](https://img.shields.io/badge/License-MPL--2.0-blue.svg)](https://opensource.org/licenses/MPL-2.0)
[![OpenSSF Scorecard](https://api.scorecard.dev/projects/github.com/PracticalParticle/Bloxchain-Protocol/badge)](https://scorecard.dev/viewer/?uri=github.com/PracticalParticle/Bloxchain-Protocol)
[![npm](https://img.shields.io/npm/v/@bloxchain/sdk.svg)](https://www.npmjs.com/package/@bloxchain/sdk)
[![CI](https://github.com/PracticalParticle/Bloxchain-Protocol/actions/workflows/particle-ci.yml/badge.svg)](https://github.com/PracticalParticle/Bloxchain-Protocol/actions/workflows/particle-ci.yml)
[![Docs](https://img.shields.io/badge/docs-bloxchain.app-yellow)](https://docs.bloxchain.app)
[![Sepolia](https://img.shields.io/badge/Sepolia-Official_deployments-purple.svg)](https://sepolia.etherscan.io/)

<!-- Brand logo (optional): uncomment when docs/assets/bloxchain-logo.svg is available
<img src="./docs/assets/bloxchain-logo.svg" alt="Bloxchain" width="48" align="left">
-->

<picture>
  <source media="(prefers-color-scheme: dark)" srcset="./docs/assets/hero-composition-framework.svg">
  <img src="./docs/assets/hero-composition-framework.svg" alt="Bloxchain composition diagram: EngineBlox, BaseStateMachine, optional SecureOwnable, RuntimeRBAC, and GuardController, Account pattern, and example applications" width="920">
</picture>

> [!IMPORTANT]
> **Audited core:** [`contracts/core/`](./contracts/core/) — [Nethermind NM_0828](./audits/nethermind/Nethermind-Bloxchain-Core-NM_0828.pdf) ([policy](./contracts/core/AUDIT.md)). Example apps under `contracts/examples/` are **out of scope**.  
> **Official deployments:** **Sepolia** today; **Ethereum mainnet official deployments coming soon**.  
> **Security:** [SECURITY.md](./SECURITY.md) · Hosted [bloxchain.app](https://bloxchain.app) is alpha/testnet-first ([docs](https://docs.bloxchain.app)).

## Quick start

**npm consumers:** Node.js **>=18.20.5** (see `sdk/typescript/package.json`).

```bash
npm install @bloxchain/sdk @bloxchain/contracts
```

**Deploy a governed account on Sepolia** (AccountBlox — SecureOwnable + RuntimeRBAC + GuardController):

```bash
npm run create-wallet
```

See [Account pattern](./docs/account-pattern.md) · [Sepolia addresses](#sepolia--deployed-addresses) (collapsed below).

<details>
<summary><strong>SDK integration example</strong></summary>

```typescript
import { SecureOwnable } from '@bloxchain/sdk';

const secureOwnable = new SecureOwnable(publicClient, walletClient, contractAddress, chain);
const owner = await secureOwnable.owner();

await secureOwnable.transferOwnershipRequest({ from: ownerAddress });
await secureOwnable.transferOwnershipDelayedApproval(txId, { from: ownerAddress });
```

Meta-transactions (EIP-712; optional relay): [SDK docs](./docs/meta-transactions.md) · [examples](./docs/examples-basic.md).

</details>

<details>
<summary><strong>Build from source</strong></summary>

Node.js **>=22.12.0** for this monorepo:

```bash
git clone https://github.com/PracticalParticle/Bloxchain-Protocol.git
cd Bloxchain-Protocol
npm install
npm run compile:foundry
npm run test:foundry
```

</details>

## What you can build

The **[Account pattern](./docs/account-pattern.md)** combines SecureOwnable, RuntimeRBAC, and GuardController. Most applications compose a **subset** of the core.

| I want to build… | Compose | Example in repo |
|------------------|---------|-----------------|
| Governed smart account / treasury | **Account** (all three components) | [`AccountBlox`](./contracts/examples/templates/AccountBlox.sol) · `npm run create-wallet` |
| Asset vault (ETH / ERC-20) | **SecureOwnable** | [`SimpleVault`](./contracts/examples/applications/SimpleVault/) |
| Scheduled payments | **SecureOwnable** + payment APIs | [`PayBlox`](./contracts/examples/applications/PayBlox/) |
| RWA / governed token | **SecureOwnable** + ERC-20 | [`SimpleRWA20`](./contracts/examples/applications/SimpleRWA20/) |
| Clone factory for many instances | **BaseStateMachine** | [`CopyBlox`](./contracts/examples/applications/CopyBlox/) |
| Safe + extra policy | **SecureOwnable** + guard integration | [`GuardianSafe`](./contracts/examples/integrations/Safe/GuardianSafe/) |

More: [`contracts/examples/`](./contracts/examples/) · [Getting started](./docs/getting-started.md) · [State abstraction vs account abstraction](./docs/state-abstraction-vs-account-abstraction.md)

## Framework guarantees

The audited core (`contracts/core/`) is a **library architecture**, not a single monolithic app:

1. **Single mutation surface** — `SecureOperationState` mutated only by **EngineBlox** (linked via `DELEGATECALL`).
2. **Mandatory two-party authorization** — time-delay (request → approve) or meta-transaction (sign → execute; signer ≠ executor), enforced in architecture.
3. **Defense in depth** — redundant gates on handler vs execution selectors, permissions, and tx status before external calls.

[Protocol architecture](./docs/bloxchain-architecture.md) · [State machine engine](./docs/state-machine-engine.md) · [Technical overview](./TECHNICAL_OVERVIEW.md)

## Architecture at a glance

```mermaid
%%{init: {'theme': 'base', 'themeVariables': {'primaryTextColor': '#111827', 'lineColor': '#374151'}}}%%
graph TB
  EB["EngineBlox (library)"]
  BSM["BaseStateMachine"]
  SO["SecureOwnable"]
  RBAC["RuntimeRBAC"]
  GC["GuardController"]
  ACC["Account pattern"]
  EB --> BSM
  BSM --> SO
  BSM --> RBAC
  BSM --> GC
  SO --> ACC
  RBAC --> ACC
  GC --> ACC
```

Full diagrams: [Architecture](./docs/bloxchain-architecture.md) · [State machine](./docs/state-machine-engine.md).

## Documentation

| Topic | Link |
|-------|------|
| Public docs (Platform + SDK + Protocol) | [docs.bloxchain.app](https://docs.bloxchain.app) |
| Account pattern | [docs/account-pattern.md](./docs/account-pattern.md) |
| Getting started | [docs/getting-started.md](./docs/getting-started.md) |
| API reference | [docs/api-reference.md](./docs/api-reference.md) |
| Core audit policy | [contracts/core/AUDIT.md](./contracts/core/AUDIT.md) |

<details>
<summary><strong>FAQ</strong></summary>

**Is this only for smart accounts?**  
No. See the table above — the Account pattern wires all three components together; vaults, tokens, factories, and Safe integrations compose subsets. Examples: [`contracts/examples/`](./contracts/examples/).

**How is this different from ERC-4337 / smart wallets?**  
Operation-level state abstraction (time-locks, RBAC, guarded execution on-chain) — not wallet UX or bundler infrastructure. [State abstraction vs account abstraction](./docs/state-abstraction-vs-account-abstraction.md).

**How is this different from OpenZeppelin AccessControl + Timelock?**  
Unified transaction lifecycle (request → approve, meta-tx sign → execute), guarded external execution, function schemas, and a single audited **EngineBlox** state machine — not separate modules wired by convention.

**What did Nethermind audit?**  
Full [`contracts/core/`](./contracts/core/): EngineBlox, BaseStateMachine, SecureOwnable, RuntimeRBAC, GuardController, Account pattern, and definition libraries. [NM_0828 report](./audits/nethermind/) · [AUDIT.md](./contracts/core/AUDIT.md).

**Can I use this on mainnet today?**  
Official Protocol deployments on **Sepolia** today. **Ethereum mainnet official deployments coming soon** — audit does not imply mainnet live. [bloxchain.app](https://bloxchain.app) is alpha/testnet-first; hosted mainnet GA is on the Platform roadmap separately.

**Can I contribute to `contracts/core/`?**  
No public PRs — audited core is maintained by Particle CS. See [CONTRIBUTING.md](./CONTRIBUTING.md) for docs, SDK, tooling, and examples.

**Relationship to bloxchain.app?**  
Same on-chain rules. The hosted Console is a separate product surface — [docs.bloxchain.app](https://docs.bloxchain.app).

</details>

<details id="sepolia--deployed-addresses">
<summary><strong>Sepolia & deployed addresses</strong></summary>

### Try on Sepolia

```bash
npm run create-wallet
```

Interactive: choose network, **AccountBlox** or custom blox, set owner / broadcaster / recovery and time-lock. Uses `.env.deployment` and prints the clone address.

Non-interactive: `CREATE_WALLET_USE_DEFAULTS=1 node scripts/deployment/create-wallet-copyblox.js`

### Deployment

1. Copy `env.deployment.example` to `.env.deployment` — set `DEPLOY_RPC_URL`, `DEPLOY_PRIVATE_KEY`; Sepolia: `DEPLOY_CHAIN_ID=11155111`.
2. **Foundation:** `npm run deploy:hardhat:foundation`
3. **Example (CopyBlox):** `npx hardhat run scripts/deployment/deploy-example-copyblox.js --network sepolia`

Addresses are written to **`deployed-addresses.json`**.

### Official Sepolia addresses

| Contract | Address |
|----------|---------|
| EngineBlox | [`0x726d78c9683a96d66196d2b8350923e8ca0d8597`](https://sepolia.etherscan.io/address/0x726d78c9683a96d66196d2b8350923e8ca0d8597) |
| SecureOwnableDefinitions | [`0xcb8834e55c2c7b012e5643de98a1bf5fda22191c`](https://sepolia.etherscan.io/address/0xcb8834e55c2c7b012e5643de98a1bf5fda22191c) |
| RuntimeRBACDefinitions | [`0x27c103b2b1a1e7dc345aeff766aa3656b4825653`](https://sepolia.etherscan.io/address/0x27c103b2b1a1e7dc345aeff766aa3656b4825653) |
| GuardControllerDefinitions | [`0x6ce6f314fa35d34782f2743db4d0c1f824639938`](https://sepolia.etherscan.io/address/0x6ce6f314fa35d34782f2743db4d0c1f824639938) |
| AccountBlox | [`0x783eb64d7d5de55f6913f9cb42ef5a4c402884c0`](https://sepolia.etherscan.io/address/0x783eb64d7d5de55f6913f9cb42ef5a4c402884c0) |
| CopyBlox (example) | [`0x928a2bd6c13e4f48a0850d2171a8d79b29959fc7`](https://sepolia.etherscan.io/address/0x928a2bd6c13e4f48a0850d2171a8d79b29959fc7) |

</details>

<details>
<summary><strong>Development & testing</strong></summary>

```bash
npm run compile:foundry          # add :size for 24KB check
npm run test:foundry
npm run test:foundry:fuzz        # 37 suites, 309 tests — see test/foundry/docs/
npm run test:e2e                 # SDK sanity on remote_evm
npm run docgen
```

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full command matrix.

</details>

## Contributing

Selective contributions welcome (docs, SDK aligned with core, tooling, examples) — **not** public PRs to **`contracts/core/`** (audited; Particle CS only). Security: [SECURITY.md](./SECURITY.md) only. DCO sign-off required (`git commit -s`). [Code of Conduct](./CODE_OF_CONDUCT.md).

## License

**MPL-2.0** — [LICENSE](./LICENSE). **`contracts/examples/`** use per-file licenses (typically MIT).

## Support

[GitHub Issues](https://github.com/PracticalParticle/Bloxchain-Protocol/issues) · [Discussions](https://github.com/PracticalParticle/Bloxchain-Protocol/discussions)

<details>
<summary><strong>Star History</strong></summary>

[![Star History Chart](https://api.star-history.com/svg?repos=PracticalParticle/Bloxchain-Protocol&type=Date)](https://star-history.com/#PracticalParticle/Bloxchain-Protocol&Date)

</details>

---

Created by [Particle Crypto Security](https://particlecs.com/) · Copyright © 2025 Particle Crypto Security
