# Contributing to Bloxchain Protocol

Thank you for your interest in contributing to Bloxchain Protocol! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Contribution Policy](#contribution-policy)
- [Core Contracts (`contracts/core/`)](#core-contracts-contractscore)
- [Intellectual Property and Licensing](#intellectual-property-and-licensing)
- [Developer Certificate of Origin (DCO)](#developer-certificate-of-origin-dco)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Contributing Process](#contributing-process)
- [Code Standards](#code-standards)
- [Testing Requirements](#testing-requirements)
- [Documentation](#documentation)
- [Security Considerations](#security-considerations)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)
- [Examples and applications](#examples-and-applications)
- [Community](#community)
- [Commit Message Guidelines](#commit-message-guidelines)
- [Development Workflow](#development-workflow)
- [Contact](#contact)

## Code of Conduct

This project follows our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold this code. Please report unacceptable behavior to conduct@particlecs.com.

## Contribution Policy

Bloxchain Protocol welcomes **focused, selective** contributions. We do not operate a large open-contribution program; maintainers may close or decline pull requests without detailed review when they are out of scope.

### What we typically accept (pull requests)

- **Documentation** under `docs/` (hand-written guides; do not edit NatSpec-generated output in `docs/_auto_generated_docs_/` by hand)
- **Tooling, CI, and scripts** outside `contracts/core/`
- **TypeScript SDK** changes (`sdk/typescript/`) that align with existing core behavior — **not** changes that require modifying audited core contracts
- **Tests** for non-core areas, or test fixes that do not change `contracts/core/` semantics
- **Examples** under `contracts/examples/` (subject to per-example license terms)

### What we do not accept via public pull request

- **Any change to `contracts/core/`** — see [Core Contracts](#core-contracts-contractscore) below
- **Security fixes** submitted as public PRs or public issues — use [SECURITY.md](SECURITY.md) only
- Drive-by refactors, dependency bumps, or broad “cleanup” PRs without a prior agreed issue
- Contributions that include secrets, deployment keys, or production addresses hard-coded in source

### Before you open a pull request

1. **Search existing issues** and open a **GitHub issue** first for non-trivial work (especially behavior changes), unless the change is a clear typo or doc fix.
2. For **core protocol behavior** (including perceived bugs in `contracts/core/`), open an issue for discussion — do not open a PR against core.
3. Ensure every commit includes a **DCO sign-off** — see [Developer Certificate of Origin](#developer-certificate-of-origin-dco).
4. Use the [pull request template](.github/pull_request_template.md) and complete all checkboxes.

Maintainers merge contributions at their discretion. Opening a PR does not create an obligation to review or merge.

## Core Contracts (`contracts/core/`)

The core protocol library under `contracts/core/` is the **audited source of truth** for Bloxchain behavior. It has undergone **external security review**; changes affect deployed security assumptions and require controlled release management.

### Who may change core

- **Only the Particle Crypto Security team** merges changes to `contracts/core/` (and closely coupled core tests under `test/foundry/` that define core semantics).
- **External contributors must not** open pull requests that modify files under `contracts/core/`.

### Security issues in core

- **Do not** open public GitHub issues or pull requests for vulnerabilities.
- Follow **[SECURITY.md](SECURITY.md)** and report to **security@particlecs.com** only.
- Security remediations are handled internally by Particle CS according to the security policy (coordinated disclosure, audit alignment, and release process).

### Non-security feedback and requests (core)

For **non-security** topics related to core (design questions, feature ideas, documentation gaps, suspected non-security bugs):

1. Open a **GitHub issue** with a clear description, reproduction steps (if applicable), and impact.
2. Do **not** submit a PR against `contracts/core/`; the team will triage and implement fixes or enhancements internally if accepted.
3. You may build on core in your **own fork** (examples, integrations) under MPL-2.0; upstream core changes remain maintainer-only.

### SDK and docs relative to core

Changes to `sdk/typescript/` that **require** altering `contracts/core/` behavior will not be merged via external PR. Propose the behavior via a GitHub issue; if accepted, Particle CS will implement core and SDK changes together.

## Intellectual Property and Licensing

### Project license

Bloxchain Protocol is licensed under the **[Mozilla Public License 2.0 (MPL-2.0)](LICENSE)**. Core contracts (`contracts/core/`), the TypeScript SDK (`sdk/typescript/`), documentation, tests, and tooling are Covered Software unless explicitly excluded in `LICENSE` (for example `contracts/examples/`).

### Your contributions

By submitting a pull request or otherwise contributing material intended for inclusion in this repository, you agree that:

1. **License** — Your contribution is licensed under **MPL-2.0**, and you grant the rights necessary for maintainers to merge, distribute, and sublicense your contribution under that license (consistent with MPL-2.0 Section 2).
2. **Original work** — The contribution is your original work, or you have sufficient rights to submit it under these terms (including employer or client authorization where applicable).
3. **No incompatible third-party code** — You have not included code whose license is incompatible with MPL-2.0 (for example GPL- or AGPL-licensed code) without explicit, written maintainer approval and proper license notices.
4. **No copyright assignment** — Particle Crypto Security does **not** take copyright assignment through GitHub contribution. You retain copyright in your contribution except as licensed under MPL-2.0.
5. **Developer Certificate of Origin** — You certify the statements in the [DCO](DCO) via `Signed-off-by` on each commit (see below).

We do **not** use a separate Contributor License Agreement (CLA). The combination of MPL-2.0, this section, and DCO sign-off defines inbound contribution terms.

### Maintainer discretion

Maintainers may reject any contribution that raises licensing, provenance, or security concerns, or that falls outside the [contribution policy](#contribution-policy), without obligation to provide a detailed rationale.

## Developer Certificate of Origin (DCO)

This project uses the **[Developer Certificate of Origin (DCO) version 1.1](https://developercertificate.org/)**. The full text is in [DCO](DCO).

Every commit in a pull request **must** include a sign-off line:

```text
Signed-off-by: Jane Contributor <jane@example.com>
```

Use your **real name** and an email address you are comfortable associating with the contribution (often the same email as your GitHub account).

### How to sign commits

After `npm install`, **Husky** runs [`.husky/prepare-commit-msg`](.husky/prepare-commit-msg) and adds `Signed-off-by` automatically from `git user.name` / `git user.email` (same as `git commit -s`). [`.husky/commit-msg`](.husky/commit-msg) rejects commits that still lack a sign-off line.

```bash
# Sign a single commit (optional if hooks are installed — sign-off is added for you)
git commit -s -m "docs: clarify guard controller setup"

# Amend the last commit if you forgot sign-off before pushing
git commit --amend -s --no-edit
git push --force-with-lease
```

For multi-commit PRs, **each commit** must contain `Signed-off-by`.

### Automated check (required)

Pull requests run the **[DCO / Signed-off-by](.github/workflows/dco-signoff.yml)** GitHub Actions workflow. The PR cannot be merged while this check fails.

Repository admins should mark **DCO / Signed-off-by** as a **required status check** on protected branches (`dev`, `main`) under **Settings → Branches → Branch protection rules**.

```bash
# Re-sign all commits on your branch after rebasing onto latest base
git rebase --signoff origin/dev
```

By signing off, you certify the DCO terms (original work or right to submit, permission to contribute under the project license, and good-faith belief in the above).

## Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Node.js** (v16 or higher)
- **npm** (v8 or higher)
- **Truffle** (v5.15 or higher)
- **Git** (latest version)
- **Solidity** knowledge (0.8.34)
- **TypeScript** knowledge (for SDK contributions)

### Development Environment

```bash
# Clone the repository
git clone https://github.com/PracticalParticle/Bloxchain-Protocol.git
cd Bloxchain-Protocol

# Install dependencies
npm install

# Install Truffle globally (if not already installed)
npm install -g truffle

# Start local blockchain (Ganache)
ganache --deterministic --networkId 1337

# Compile contracts
npm run compile:truffle

# Run tests
npm run test:truffle
```

## Development Setup

### Project Structure

```
Bloxchain-Protocol/
├── contracts/           # Smart contracts
│   ├── core/           # Core framework contracts
│   ├── examples/       # Example implementations
│   ├── interfaces/     # Interface definitions
│   ├── lib/            # Library contracts
│   └── utils/          # Utility contracts
├── docs/               # Generated documentation
├── sdk/                # TypeScript SDK
├── test/               # Test files
├── scripts/            # Deployment and utility scripts
└── migrations/         # Truffle migrations
```

### Key Components

- **EngineBlox Library**: Core state machine engine
- **BaseStateMachine**: Foundation contract for all implementations
- **SecureOwnable**: Multi-role security implementation
- **RuntimeRBAC**: Role-based access control system
- **TypeScript SDK**: Client library for contract interaction

## Contributing Process

Read [Contribution Policy](#contribution-policy) and [Core Contracts](#core-contracts-contractscore) first. The steps below apply only to **in-scope** contributions (not `contracts/core/`).

### 1. Discuss (recommended)

Open a **GitHub issue** for non-trivial changes. For core-related **non-security** feedback, use an issue only — no core PR.

### 2. Fork and clone

```bash
git clone https://github.com/YOUR_USERNAME/Bloxchain-Protocol.git
cd Bloxchain-Protocol
git remote add upstream https://github.com/PracticalParticle/Bloxchain-Protocol.git
```

### 3. Branch, change, and sign commits

```bash
git checkout -b docs/your-topic
# Make changes; every commit must use -s for DCO
git commit -s -m "docs: describe your change"
```

Follow [Code Standards](#code-standards), [Testing Requirements](#testing-requirements), and [DCO](#developer-certificate-of-origin-dco).

### 4. Test your changes

```bash
npm run compile:foundry
npm run test:foundry
npm run test:sanity-sdk:core   # when touching SDK integration paths
```

See `package.json` and [AGENTS.md](AGENTS.md) for the canonical command list.

### 5. Submit a pull request

Use the [pull request template](.github/pull_request_template.md). See [Pull Request Process](#pull-request-process).

## Code Standards

### Solidity Standards

#### Security Requirements
- **Follow Checks-Effects-Interactions pattern**
- **Use OpenZeppelin's ReentrancyGuard** for state-changing functions
- **Implement proper input validation** with custom errors
- **Use SafeMath operations** for arithmetic
- **Follow visibility modifiers** (private/internal for sensitive functions)

#### Code Style
```solidity
// Use custom errors instead of string messages
error InvalidAddress(address provided);
error InsufficientBalance(uint256 required, uint256 available);

// Use explicit visibility modifiers
contract ExampleContract {
    address private _owner;
    uint256 public totalSupply;
    
    function internalFunction() internal {
        // Implementation
    }
}

// Use NatSpec documentation
/**
 * @title Example Contract
 * @dev Brief description of the contract
 * @notice User-facing description
 * @author Your Name
 */
```

#### Contract Size Optimization
- **Keep contracts under 24KB** (Ethereum mainnet limit)
- **Use libraries** for reusable code
- **Pack structs** efficiently
- **Use events** instead of storage for historical data

### TypeScript Standards

#### SDK Development
```typescript
// Use proper type definitions
export interface TransactionOptions {
  from: Address;
  gasLimit?: bigint;
  gasPrice?: bigint;
}

// Implement comprehensive error handling
export class SecureOwnableError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'SecureOwnableError';
  }
}

// Use JSDoc for documentation
/**
 * Creates a new secure operation request
 * @param operationType The type of operation to request
 * @param options Transaction options
 * @returns Promise resolving to transaction result
 */
async requestOperation(
  operationType: string,
  options: TransactionOptions
): Promise<TransactionResult> {
  // Implementation
}
```

## Testing Requirements

### Test Coverage
- **100% test coverage** required (immutable contracts require complete coverage)
- **All new features** must include comprehensive tests
- **Edge cases** must be tested
- **Integration tests** for complex workflows

### Test Types

#### Unit Tests
```javascript
// Test individual functions
contract('SecureOwnable', (accounts) => {
  it('should create ownership transfer request', async () => {
    const instance = await SecureOwnable.deployed();
    const tx = await instance.transferOwnershipRequest({ from: accounts[0] });
    assert.equal(tx.logs[0].event, 'OperationRequested');
  });
});
```

#### Integration Tests
```javascript
// Test complete workflows
contract('MetaTransaction Workflow', (accounts) => {
  it('should execute meta-transaction workflow', async () => {
    // Test complete meta-transaction flow
    // 1. Create request
    // 2. Sign meta-transaction
    // 3. Execute meta-transaction
    // 4. Verify state changes
  });
});
```

#### Fuzzing Tests
```javascript
// Test with random inputs
contract('Transfer Fuzzing', (accounts) => {
  it('should handle various transfer amounts', async () => {
    for (let i = 0; i < 100; i++) {
      const amount = Math.floor(Math.random() * 1000000);
      // Test with random amount
    }
  });
});
```

### Running Tests

```bash
# Run all Truffle tests
npm run test:truffle

# Run Hardhat tests
npm run test:hardhat

# Run specific test files
truffle test test/SecureOwnable.test.js

# Run with coverage
npm run test:coverage
```

## Documentation

**Source of truth:** Solidity contracts are the source of truth for protocol API and behavior. The `docs/` directory is generated from contract NatSpec; do not edit those generated files by hand. For the full documentation map, updating process, and audit checklist, see **[CODEBASE_DOCUMENTATION.md](CODEBASE_DOCUMENTATION.md)**.

### Contract Documentation
- **NatSpec comments** for all public functions
- **Security annotations** for sensitive operations
- **Usage examples** in comments
- **Parameter descriptions** for all inputs/outputs
- **Regenerate API docs** after contract changes: `npm run docgen` (see [docgen/README.md](docgen/README.md))

### SDK Documentation
- **JSDoc comments** for all public methods
- **Type definitions** for all interfaces
- **Usage examples** in documentation
- **Error handling** documentation

### README Updates
- **Update README.md** for new features
- **Add examples** for new functionality
- **Update installation** instructions if needed
- **Document breaking changes**

## Security Considerations

### Security Review Process
1. **All smart contract changes** require security review
2. **Critical functions** need additional scrutiny
3. **External dependencies** must be audited
4. **Gas optimization** changes need verification

### Security Best Practices
- **Never commit private keys** or sensitive data
- **Use test networks** for development
- **Follow secure coding** practices
- **Report security issues** privately (see [Security Policy](SECURITY.md))

### Vulnerability Reporting
**⚠️ Do NOT create public issues for security vulnerabilities.**

Report security issues to: security@particlecs.com

## Pull Request Process

### Before submitting

1. Confirm your change is **in scope** per [Contribution Policy](#contribution-policy) (no `contracts/core/` changes from external contributors).
2. **DCO**: Every commit has `Signed-off-by` (`git commit -s`); the **DCO / Signed-off-by** CI check must pass.
3. **Tests** pass for the areas you changed.
4. **Documentation** updated where applicable (not hand-editing generated NatSpec output).
5. **Conventional commits** for changelog automation (see [Commit Message Guidelines](#commit-message-guidelines)).
6. Complete the [pull request template](.github/pull_request_template.md) checkboxes.

### Review process

1. Automated checks must pass (where enabled for the branch).
2. Maintainer review; we may request changes or close out-of-scope PRs without merge.
3. Smart contract changes **outside** `contracts/core/` may still require additional scrutiny.
4. PRs touching `contracts/core/` from non-maintainers will be **closed** unless explicitly authorized in writing by Particle CS.

Use GitHub’s PR template at [`.github/pull_request_template.md`](.github/pull_request_template.md) — do not paste a duplicate template in the PR body.

## Issue Reporting

### Bug Reports
Use the bug report template and include:
- **Description** of the issue
- **Steps to reproduce**
- **Expected behavior**
- **Actual behavior**
- **Environment details**
- **Screenshots** (if applicable)

### Feature Requests
Use the feature request template and include:
- **Problem description**
- **Proposed solution**
- **Alternatives considered**
- **Additional context**

### Issue labels

- `bug`: Something isn't working (non-security; for core security concerns use [SECURITY.md](SECURITY.md))
- `enhancement`: New feature or request
- `documentation`: Improvements to documentation

Do **not** use public issues for **undisclosed security vulnerabilities** — email **security@particlecs.com** per [SECURITY.md](SECURITY.md).

For **core protocol** non-security topics, prefer a detailed issue over a pull request to `contracts/core/`.

## Examples and applications

### What lives in this repository

Example and sample code is under **`contracts/examples/`**, not a top-level `applications/` directory. Per [LICENSE](LICENSE), **`contracts/examples/` is excluded from MPL-2.0**; each file declares its own license (today’s in-repo examples use **`SPDX-License-Identifier: MIT`**).

```text
contracts/examples/
├── applications/          # Sample apps (PayBlox, SimpleVault, SimpleRWA20, CopyBlox, …)
├── templates/             # AccountBlox — full Account-pattern reference implementation
├── integrations/          # Third-party integrations (e.g. GuardianSafe under Safe/)
└── extra/                 # Small helpers (e.g. BasicERC20)
```

**Core protocol** (`contracts/core/`) remains MPL-2.0 and is maintained only by Particle CS — see [Core Contracts](#core-contracts-contractscore). Examples **import** core; they do not change it.

Guides: [docs/examples-basic.md](docs/examples-basic.md), [docs/getting-started.md](docs/getting-started.md), [docs/account-pattern.md](docs/account-pattern.md).

### Where to build your solution

| Goal | Recommended approach |
|------|----------------------|
| **Client / proprietary product** | **Separate repository** — depend on Bloxchain (submodule, Foundry `lib/`, or published package). License client-specific contracts under your commercial terms; comply with MPL for `contracts/core/` you distribute. |
| **Open example for upstream** | Fork this repo or work on a branch; add under `contracts/examples/applications/<YourApp>/` and open a PR when mature. |
| **Experiment locally** | Copy patterns from `contracts/examples/templates/AccountBlox.sol` and existing applications. |

### Fork-first development (recommended)

For products you maintain long-term (especially outside this repo):

1. **Phase 1 — Build in your fork or private repo** on top of a **pinned** Bloxchain release; do not modify `contracts/core/` unless you accept MPL obligations for those files.
2. **Phase 2 — Validate** — production or testnet usage, tests, documentation, and security review appropriate to your risk.
3. **Phase 3 — Upstream example (optional)** — when production-ready, propose addition under `contracts/examples/` via PR (maintainer discretion).

### Adding an example to this repository

1. Open a **GitHub issue** describing the example and maintenance plan.
2. Add a directory under `contracts/examples/applications/<Name>/` (or `integrations/` / `templates/` if that fits better).
3. Include:
   - **`SPDX-License-Identifier`** on every Solidity file (match shipped examples: MIT unless maintainers agree otherwise).
   - **NatSpec** and a short **README** in the app folder (or section in `docs/examples-basic.md`).
   - **Tests** — Foundry tests under `test/foundry/` and/or a sanity runner under `scripts/sanity/` (see existing `simple-vault`, `copy-blox`, `simple-rwa20`).
4. **DCO sign-off** on all commits (`git commit -s`).
5. Submit a PR — examples are in scope for community contribution; **core is not**.

Security-sensitive findings in examples still follow [SECURITY.md](SECURITY.md) for core vulnerabilities; example-only bugs can use public issues.

### Development setup

**In-repo example** (after forking and cloning):

```bash
git clone https://github.com/YOUR_USERNAME/Bloxchain-Protocol.git
cd Bloxchain-Protocol
npm install

# New application next to PayBlox, SimpleVault, etc.
mkdir -p contracts/examples/applications/YourApp
# Add YourApp.sol, *Definitions.sol if needed — import from contracts/core/

npm run compile:foundry
npm run test:foundry
npm run test:sanity:examples      # JS sanity suites for select examples
npm run test:sanity-sdk:examples  # SDK sanity against examples (when applicable)

git add contracts/examples/applications/YourApp
git commit -s -m "feat(examples): add YourApp sample application"
git push origin your-branch
```

Use **`contracts/examples/templates/AccountBlox.sol`** when you need the full **Account** pattern (SecureOwnable + RuntimeRBAC + GuardController). Use **`CopyBlox`** as a reference for factory + `initialize` in one transaction ([getting-started.md](docs/getting-started.md)).

**Private / client repo** — same compile/test commands if you vendor this repository; keep Bloxchain core as a **read-only dependency** and put custom logic in your own paths.

### License notes

- **Core** (`contracts/core/`, SDK, main tooling): **MPL-2.0**.
- **Examples** (`contracts/examples/`): **excluded** from root MPL; follow the **SPDX license** on each file (in-repo samples are **MIT**).
- **Proprietary client work** does not belong in this public tree unless explicitly agreed with maintainers; use a separate repo and your own license.

### Disclaimer

**Examples and applications in `contracts/examples/`:**

- Are **not** the audited core protocol and are **not** covered by the same security assurances as `contracts/core/`.
- Are **not** officially supported unless called out in release notes or a support agreement.
- Are provided **as-is** under their stated SPDX license (typically MIT for current samples).
- **Core** remains MPL-2.0; combining examples with core in deployments is your responsibility (notices, source for MPL files you distribute, etc.).

## Community

### Getting Help
- **GitHub Discussions**: For questions and ideas
- **GitHub Issues**: For bug reports and feature requests
- **Documentation**: Comprehensive guides in the repository
- **Contact**: https://particlecs.com/contact

### Contributing Guidelines
- **Be respectful** and constructive
- **Help others** learn and grow
- **Follow the code of conduct**
- **Ask questions** when unsure

### Recognition
- **Contributors** will be recognized in release notes
- **Significant contributions** may be highlighted
- **Security researchers** will be acknowledged in advisories

## Commit Message Guidelines

This project uses [Conventional Commits](https://www.conventionalcommits.org/) for automated changelog generation and version management. All commit messages must follow this format:

### Commit Message Format

```text
<type>(<scope>): <subject>

<body>

<footer>
```

### Commit Types

- **`feat`**: A new feature
- **`fix`**: A bug fix
- **`docs`**: Documentation only changes
- **`style`**: Code style changes (formatting, missing semicolons, etc.)
- **`refactor`**: Code refactoring without feature changes or bug fixes
- **`perf`**: Performance improvements
- **`test`**: Adding or updating tests
- **`chore`**: Maintenance tasks, dependency updates
- **`ci`**: CI/CD configuration changes
- **`build`**: Build system or external dependencies changes
- **`revert`**: Revert a previous commit

### Scope (recommended for publishable changes)

Use a **scope** on every commit that affects a release-managed npm package so history and Release Please attribution stay clear. Allowed scopes (enforced by commitlint): `contracts`, `sdk`, `examples`, `docs`, `ci`, `scripts`, `deps`, `release`.

| Scope | Use when you change… | Release Please package |
|-------|-------------------|-------------------------|
| **`contracts`** | `contracts/`, `package/`, Foundry tests for core Solidity, ABI extract affecting the contracts npm artifact | `@bloxchain/contracts` → [package/CHANGELOG.md](./package/CHANGELOG.md) |
| **`sdk`** | `sdk/typescript/` (sources, build, SDK tests) | `@bloxchain/sdk` → [sdk/typescript/CHANGELOG.md](./sdk/typescript/CHANGELOG.md) |
| **`examples`** | `contracts/examples/` (sample apps, templates, example tests) | — (not an npm package; no Release Please bump alone) |
| **`docs`** | `docs/`, root or package README (no semver bump alone) | — |
| **`ci`** | `.github/workflows/`, CI config | — |
| **`scripts`** | `scripts/` (release, deploy, sanity runners) | — |
| **`deps`** | Dependency version bumps at root or in packages | Usually no release unless combined with `feat`/`fix` on a package path |
| **`release`** | Version manifests, release-please config, changelog policy | — |

Release Please also uses **changed file paths**. If a single commit touches both `package/` and `sdk/typescript/`, both packages may receive changelog entries when their release PRs are cut. Prefer **focused commits** per package when possible.

**Avoid** unscoped `feat:` / `fix:` on publishable paths — use `feat(contracts):` or `feat(sdk):` instead.

### Release attribution (Release Please)

- **Independent semver:** `@bloxchain/contracts` and `@bloxchain/sdk` version separately within major `1` ([docs/VERSIONING.md](./docs/VERSIONING.md)).
- **On-chain protocol** `EngineBlox.VERSION` is **not** bumped by npm patch releases; it is updated only for deliberate protocol releases.
- **Changelogs:** npm consumers should read package changelogs, not the repo root [CHANGELOG.md](./CHANGELOG.md).

### Examples

```bash
# Feature in contracts
git commit -m "feat(contracts): add PayBlox contract implementation"

# Bug fix in SDK
git commit -m "fix(sdk): correct transaction receipt parsing"

# Documentation update
git commit -m "docs: update installation instructions"

# Breaking change (use ! after type)
git commit -m "feat(contracts)!: change SecureOwnable interface"

# Multiple changes
git commit -m "feat(contracts): add new role management

- Add createRole function
- Add removeRole function
- Update access control logic"
```

### Breaking Changes

To indicate a breaking change, add a `!` after the type/scope:
```text
feat(contracts)!: change API signature
```

Or include `BREAKING CHANGE:` in the footer:
```text
feat(contracts): update interface

BREAKING CHANGE: The transferOwnership function now requires an additional parameter
```

### Benefits

- **Automatic changelog generation**: Release Please updates [package/CHANGELOG.md](./package/CHANGELOG.md) and [sdk/typescript/CHANGELOG.md](./sdk/typescript/CHANGELOG.md) per publishable package (use scopes like `feat(contracts):` or `feat(sdk):`)
- **Semantic versioning**: Version bumps are determined by commit types
- **Better git history**: Clear, searchable commit history
- **Automated releases**: Release PRs are created automatically

## Development Workflow

### Daily Development
```bash
# Start development session
git checkout main
git pull upstream main
git checkout -b feature/new-feature

# Make changes and test
npm run compile:truffle:size
npm run test:truffle

# Commit changes
git add .
git commit -m "feat(sdk): add new feature"

# Push and create PR
git push origin feature/new-feature
```

### Release Process

Releases use **Release Please** on `main`, then **human npm publish** after the release line is on `main`.

1. **Merge feature/fix PRs to `main`** using scoped conventional commits (`feat(contracts):`, `fix(sdk):`, etc.).
2. **Release Please** opens one or two release PRs (`@bloxchain/contracts`, `@bloxchain/sdk`) with updated versions and per-package changelogs.
3. **Review and merge** the release PR(s) on `main`. Tags/GitHub releases are created per package.
4. **Publish to npm** (maintainers, after `main` contains the release versions) — three commands only:

   ```bash
   npm run release:prepare      # gate: protocol VERSION, build, tests
   npm run publish:contracts    # @bloxchain/contracts @ latest
   npm run publish:sdk          # @bloxchain/sdk @ latest
   ```

   The first stable **`1.0.0`** npm publish happens **after** the versioning baseline PR is on `main`, not from long-lived feature branches. See [docs/VERSIONING.md](./docs/VERSIONING.md#publishing-stable-100-to-npm).

#### Manual Release (if needed)

If you need to create a release manually:

```bash
# Ensure all changes are committed
git checkout main
git pull

# Preview Release Please release PR locally (requires token)
npm run release:please-pr
# or: npx release-please release-pr --repo-url=github.com/PracticalParticle/Bloxchain-Protocol --token=YOUR_TOKEN
```

#### Version Bumping Rules

- **Major** (x.0.0): Breaking changes (`feat!`, `fix!`, or `BREAKING CHANGE:`)
- **Minor** (x.y.0): New features (`feat:`)
- **Patch** (x.y.z): Bug fixes (`fix:`)

Other commit types (docs, style, refactor, etc.) don't trigger version bumps but are included in changelog.

## License

Inbound contribution terms are defined in [Intellectual Property and Licensing](#intellectual-property-and-licensing) and [DCO](#developer-certificate-of-origin-dco). The project license is [MPL-2.0](LICENSE).

## Contact

**Particle Crypto Security**
- **Website**: https://particlecs.com
- **Email**: contact@particlecs.com
- **GitHub**: https://github.com/PracticalParticle/Bloxchain-Protocol

---

*Thank you for contributing to Bloxchain Protocol! Your contributions help make blockchain security more accessible and robust.*

**Last Updated**: June 2026
