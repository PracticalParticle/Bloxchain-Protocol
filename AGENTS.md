## AGENTS.md – Bloxchain Protocol

This file is a **briefing document for AI agents** working on this repo. It complements `README.md` and the docs under `sdk/typescript/docs`.

Focus areas:
- Core Solidity contracts under `contracts/core`
- TypeScript SDK under `sdk/typescript`

---

## 1. Tech Stack & Targets

- **Language / Runtime**
  - Solidity `0.8.34` (upgradeable, OZ upgradable patterns)
  - TypeScript (Viem‑based SDK)
- **Core Domains**
  - `contracts/core` – source of truth for all protocol behavior
  - `sdk/typescript` – thin, type‑safe wrappers and helpers for the core contracts
- **Do not treat** `contracts/` and `sdk/typescript/` as independent systems: the SDK is an integration layer over the Solidity core.

When in doubt, **derive behavior from Solidity first**, then align the SDK and docs.

---

## 2. Project Structure (for Agents)

Key paths you should care about:

- `contracts/core/`
  - `lib/EngineBlox.sol` – central state machine library (`SecureOperationState`, tx lifecycle, RBAC, function schemas, meta‑tx, whitelists).
  - `base/BaseStateMachine.sol` – upgrade‑safe wrapper that owns `_secureState` and exposes shared queries and helpers.
  - `security/SecureOwnable.sol` – owner / broadcaster / recovery roles, timelock configuration.
  - `access/RuntimeRBAC.sol` – dynamic, non‑protected roles and function permissions, batch config.
  - `execution/GuardController.sol` – guarded execution, time‑lock workflows, target whitelists.
  - `pattern/Account.sol` – abstract pattern that **combines all three components**; basis for account‑style contracts (e.g. `AccountBlox`).
  - `lib/utils/SharedValidation.sol` – common validation helpers and custom errors.
  - `*/lib/definitions/*.sol` – definition libraries with function schemas, operation types, and default permissions.

- `sdk/typescript/`
  - `contracts/core/*.tsx` – class wrappers for core contracts (`SecureOwnable`, `RuntimeRBAC`, `GuardController`, `BaseStateMachine`).
  - `lib/EngineBlox.tsx` – TS mirror of `EngineBlox` pure helpers and constants.
  - `utils/metaTx/metaTransaction.tsx` – EIP‑712 + meta‑tx helpers that must match the Solidity domain / struct hashes.
  - `utils/*` – error handling, validation, interface IDs, ERC‑20 helpers.
  - `docs/` – SDK and architecture docs (up‑to‑date; treat as user‑facing source of truth).

---

## 3. Commands for Agents

When you need to **build, test, or regenerate docs**, prefer these:

```bash
# Compile & size‑check contracts (Truffle / Foundry flows may coexist)
npm run compile:foundry
npm run compile:truffle:size

# Run protocol & sanity tests
npm run test:foundry
npm run test:sanity-sdk:core

# Regenerate Solidity‑based docs (NatSpec)
npm run docgen
```

Always keep changes compatible with existing tests; if you modify core behavior, update the relevant sanity scripts under `scripts/sanity-sdk`.

---

## 4. Documentation & Alignment Rules

For **any change to core behavior**:

1. **Solidity first**
   - Update the relevant file under `contracts/core`.
   - Maintain or improve NatSpec; it is the canonical machine‑readable spec.
2. **SDK second**
   - Update the corresponding wrapper under `sdk/typescript/contracts/core`.
   - Ensure types in `sdk/typescript/types` and interfaces in `sdk/typescript/interfaces` stay consistent.
3. **Docs third**
   - Update or add markdown under `sdk/typescript/docs`, especially:
     - `api-reference.md`
     - Component guides: `secure-ownable.md`, `runtime-rbac.md`, `guard-controller.md`
     - Architecture docs: `bloxchain-architecture.md`, `state-machine-engine.md`, `core-contract-graph.md`, `account-pattern.md`, `getting-started.md`

Agents should **never** introduce new public methods or change signatures without:
- Updating NatSpec
- Updating TS types/wrappers
- Updating affected docs

---

## 5. Code Style & Safety Constraints

High‑level rules for agents:

- **Security first**
  - Preserve and extend reentrancy protections (`nonReentrant`, CEI).
  - Never weaken input validation or access control (`SharedValidation`, role checks, whitelist checks).
  - Do not bypass state‑machine entrypoints with “shortcut” external functions.
- **Upgradeability**
  - Core components use OZ upgradeable patterns – **no constructors** on upgradeable contracts.
  - Keep storage layout stable; use gaps as already defined.
- **Custom errors over strings**
  - Prefer existing custom errors in `SharedValidation` and related libraries.

TypeScript:
- Use existing helpers (e.g. `EngineBlox`, meta‑tx utils, validation helpers) before adding new ad‑hoc logic.
- Keep Viem types (`PublicClient`, `WalletClient`, `Address`, `Hex`) accurate and explicit.

---

## 6. Boundaries & Things Agents Must Not Do

Agents **must not**:

- Commit secrets or modify:
  - `.env`
  - Deployment keys or secret configs
- Hard‑code private keys, RPC URLs, or production contract addresses in source; use envs or `deployed-addresses.json`.
- Change CI / security enforcement to “work around” tests or linters (e.g. disabling checks, lowering coverage, skipping Slither/Semgrep).
- Remove or weaken timelock, RBAC, or whitelist checks to “simplify” flows.

If an operation requires touching live deployments or production infra, stop and request explicit instructions.

---

## 7. Guidance for Different Agent Types

- **AI audit agents**
  - Start from:
    - `contracts/core/lib/EngineBlox.sol`
    - `contracts/core/base/BaseStateMachine.sol`
    - `contracts/core/security/SecureOwnable.sol`
    - `contracts/core/access/RuntimeRBAC.sol`
    - `contracts/core/execution/GuardController.sol`
  - Cross‑reference:
    - `sdk/typescript/docs/core-contract-graph.md`
    - `sdk/typescript/docs/bloxchain-architecture.md`
    - `sdk/typescript/docs/state-machine-engine.md`
  - Focus on invariants: role separation, timelock enforcement, meta‑tx replay protection, whitelist enforcement, upgrade safety.

- **AI builder agents**
  - Prefer building on **Account‑based contracts** (`contracts/core/pattern/Account.sol` and its implementations).
  - Use SDK entrypoints:
    - `SecureOwnable`, `RuntimeRBAC`, `GuardController`, `BaseStateMachine` wrappers
    - `lib/EngineBlox.tsx` and `utils/metaTx/metaTransaction.tsx`
  - Follow examples from:
    - `scripts/sanity-sdk/*`
    - `sdk/typescript/docs/examples-basic.md`
    - `sdk/typescript/docs/getting-started.md`

- **AI operational agents**
  - When wiring flows (role config, guard config, meta‑tx ops), follow the same ordering and constraints as the definition libraries:
    - `contracts/core/access/lib/definitions/RuntimeRBACDefinitions.sol`
    - `contracts/core/execution/lib/definitions/GuardControllerDefinitions.sol`
  - Use `deployed-addresses.json` as the canonical source for contract addresses per network.

---

## 8. How to Ask the Repo for Help

When you need more context:

- Read:
  - `README.md`
  - `sdk/typescript/docs/index.md`
  - `sdk/typescript/docs/getting-started.md`
  - `sdk/typescript/docs/account-pattern.md`
- Look at:
  - Existing tests under `scripts/sanity-sdk`
  - NatSpec in the relevant Solidity files

Prefer **deriving intent from tests and NatSpec** over guessing new behaviors. If required behavior is unclear or ambiguous, surface a question to a human rather than inventing protocol‑level semantics.

