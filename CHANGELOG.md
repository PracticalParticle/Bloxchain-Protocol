# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0](https://github.com/PracticalParticle/Bloxchain-Protocol/compare/bloxchain-protocol-v1.0.0...bloxchain-protocol-v2.0.0) (2026-02-02)


### ⚠ BREAKING CHANGES

* TransactionEvent signature updated
* Core library renamed from MultiPhaseSecureOperation to StateAbstraction

### Features

* add CannotModifyProtected error to ABI files ([38c7be9](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/38c7be97264784c1343c2685c18381c8417cf29d))
* Add contract analysis tools and enhance TypeScript SDK with analyzer module ([a1482e9](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/a1482e91dc74b2edd92f58bcf98210feb745c34e))
* Add DefinitionContract SDK integration with comprehensive workflow documentation ([da6a031](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/da6a031352a74f78735b24c0913df22faca27fc6))
* Add payment attachment functionality to MultiPhaseSecureOperation ([a169c49](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/a169c49a9e53a7669d1088690ad7677524acfe59))
* Add TXAction parameter to MetaTxParams for enhanced meta-transaction security ([284e724](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/284e724ab5050ef8cac5fae5dc08db68fe81c2df))
* allow protected schemas in function definitions ([bd072c4](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/bd072c44ec4182432f505cd9842ea780a046b25d))
* enhance ERC165 compliance in definition libraries ([22dadbc](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/22dadbcb832c4aed3c010a2792971a294e4d9b9e))
* implement centralized event forwarding system with IEventForwarder interface ([f7f83d7](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/f7f83d7b91f75355277b84ad346dc58559f33c5a))
* implement ERC165 support in definition libraries ([a0e313b](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/a0e313b4c2552c3e13b489eb2e0e4abf6100c3ee))
* implement privacy-aware transaction events ([de97b76](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/de97b767a5027ebf4c4d6ab29449c4eb6f6493aa))
* **sdk:** Complete TypeScript SDK overhaul with full contract compatibility ([4cdf122](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/4cdf122b1b0483b327cdc3c283c90c37842c5a90))


### Bug Fixes

* resolve contract initialization failures and definition loading issues ([8e020fa](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/8e020fab9feb1eeae8e8548427fccf95834c863e))


### Code Refactoring

* rename MultiPhaseSecureOperation to StateAbstraction across entire codebase ([7bdedb3](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/7bdedb37342930bd67171ccb52e386318d06ac9e))

## [Unreleased]

### Added
- Initial changelog automation with Release Please
- Automated release workflow via GitHub Actions

### Changed
- Version synchronization across monorepo packages

## [1.0.0] - 2025-01-26

### Added
- Initial release of Bloxchain Protocol
- Core state machine engine (EngineBlox)
- Base state machine contract (BaseStateMachine)
- Secure ownership implementation (SecureOwnable)
- Dynamic RBAC system (RuntimeRBAC)
- Guard controller for execution protection
- TypeScript SDK for contract interaction
- Comprehensive test suite with fuzzing and invariant testing
- Documentation and examples

### Security
- Multi-phase security operations with time-locks
- Reentrancy protection patterns
- Input validation with custom errors
- Comprehensive security testing

---

## Release Types

- **Major** (x.0.0): Breaking changes that require migration
- **Minor** (x.y.0): New features, backward compatible
- **Patch** (x.y.z): Bug fixes, backward compatible

## Commit Message Format

This project uses [Conventional Commits](https://www.conventionalcommits.org/) for automated changelog generation via [Release Please](https://github.com/googleapis/release-please).

**Version Bumps** (Release Please default behavior for `node` release type):
- `feat:` New features **[Minor]** - Triggers version bump
- `feat!:` Breaking changes **[Major]** - Triggers version bump
- `fix:` Bug fixes **[Patch]** - Triggers version bump
- `BREAKING CHANGE:` in commit footer **[Major]** - Triggers version bump

**No Version Bump** (appear in changelog but don't trigger releases):
- `docs:` Documentation changes
- `style:` Code style changes (formatting, etc.)
- `refactor:` Code refactoring
- `perf:` Performance improvements
- `test:` Test additions or changes
- `chore:` Maintenance tasks
- `ci:` CI/CD changes
- `build:` Build system changes
- `revert:` Revert previous commit

**Breaking Changes:**

Breaking changes can be indicated in two ways:
1. Use `!` after the type: `feat!: change API signature`
2. Include `BREAKING CHANGE:` in the commit footer:
   ```text
   feat(contracts): update interface
   
   BREAKING CHANGE: The transferOwnership function now requires an additional parameter
   ```

**Note:** This follows Release Please's default configuration for the `node` release type, which implements the [Conventional Commits](https://www.conventionalcommits.org/) specification. Releases are only created when there are commits that trigger version bumps (`feat`, `fix`, or breaking changes). Other commit types are included in the changelog but don't trigger new releases on their own.

Example: `feat(contracts): add PayBlox contract implementation`
