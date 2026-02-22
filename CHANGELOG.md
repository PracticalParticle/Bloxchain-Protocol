# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [2.0.0](https://github.com/PracticalParticle/Bloxchain-Protocol/compare/bloxchain-protocol-v1.0.0...bloxchain-protocol-v2.0.0) (2026-02-22)


### ⚠ BREAKING CHANGES

* TransactionEvent signature updated
* Core library renamed from MultiPhaseSecureOperation to StateAbstraction

### Features

* add CannotModifyProtected error to ABI files ([38c7be9](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/38c7be97264784c1343c2685c18381c8417cf29d))
* Add contract analysis tools and enhance TypeScript SDK with analyzer module ([a1482e9](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/a1482e91dc74b2edd92f58bcf98210feb745c34e))
* Add DefinitionContract SDK integration with comprehensive workflow documentation ([da6a031](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/da6a031352a74f78735b24c0913df22faca27fc6))
* add DefinitionNotIDefinition error handling to TypeScript utilities ([31aeca5](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/31aeca54b1cabc76741f4ccb18141b97fef24405))
* add DefinitionNotIDefinition error to SharedValidation library ([7661a28](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/7661a28aabeeddc8f45c8538969cdab40253838b))
* add deployment configurations ([2fd432b](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/2fd432bd4dbfdda3fcadcc0c6b544f759e729de8))
* add EthReceived event to ABI for logging ETH transfers ([bffa510](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/bffa5101238f55afd6899f373de84b03922e3c57))
* add executeWithPayment function selector to GuardControllerDefinitions ([9a7af59](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/9a7af5951f6bed211aad3e4b3a55331f7e4146dd))
* add getHooks function to multiple contracts for enhanced hook management ([1453fbe](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/1453fbe4dd21613aa6f40f19cadeae40eb281cb2))
* add getWalletsInRole method to BaseStateMachine for role-based wallet retrieval ([5333fac](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/5333fac91c0ebbe25967ea349f3cd89ea0f61a5b))
* add InvalidPayment error to SharedValidation and update related TypeScript interfaces ([313411c](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/313411c06cba851feb38b6428e3b6d3ce2041e33))
* add new encoding functions for role and guard management in ABI files ([55f59cf](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/55f59cf388813f3175964ec01d4dfe9e64a6dbb2))
* add NotInitialized error handling to SharedValidation and TypeScript SDK ([0065907](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/0065907bf160b2a2c19fbbc9fd4dd79d1e096b4b))
* add README files for community, components, and standards directories ([41de4e2](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/41de4e2cb0cda9a03d7686e2e2edbf862c2c4cd9))
* add role and guard configuration action data encoders ([6db31fd](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/6db31fd99bdbf8372cd6a47c430a237035012adc))
* add transaction request functionality with payment details in base and controller ([e4f9fff](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/e4f9fff3a52f5270e00ef618cd94c2daa62464fe))
* allow protected schemas in function definitions ([bd072c4](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/bd072c44ec4182432f505cd9842ea780a046b25d))
* enhance encodeAddFunctionToRole to use flat parameters for ABI decoding ([2cd7e59](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/2cd7e5924a33aad3b831d167bd1767d6bb8d23f5))
* enhance ERC165 compliance in definition libraries ([22dadbc](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/22dadbcb832c4aed3c010a2792971a294e4d9b9e))
* enhance error handling and test coverage in guard-controller and fuzz testing ([8754d2f](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/8754d2ff0ec8485fdce6303eea7b418ce4995c7b))
* enhance error handling and validation in CopyBlox test scripts ([d61b931](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/d61b931163ae750f5cbf46afa9629ece1ea67abc))
* enhance error handling in contract-errors.ts and update documentation ([dba5165](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/dba5165a054a189408a9d3d10d95f6b38fd1a394))
* enhance fuzz testing framework and documentation for comprehensive coverage ([7862455](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/78624556e9f274eaa927e20921b9c41eb6a15e04))
* enhance guard-controller and RBAC tests with improved schema handling and error reporting ([e7369e1](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/e7369e1aa3474cef19a7f70fe9851bc4927de8ef))
* enhance guard-controller tests with schema pre-checks and improved error handling ([b298043](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/b298043b14de723dfdb9266ffade47891810c271))
* enhance package structure by including standards and components directories ([256461c](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/256461c33431abc088f8d11afd71bf3387807ca5))
* enhance README and test configurations for improved clarity and consistency ([4dca1db](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/4dca1db4c2834b5acce747f5d815f366ad801f8c))
* enhance receive function in Account contract to log incoming ETH ([95f66a9](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/95f66a9c0169e70f25abfbcc4ddd47e7d2b5bb2b))
* expand error handling in contract-errors.ts with new error types ([ffc93ea](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/ffc93ead69a5633f20adaca9ac3e5136f9d14ea5))
* implement centralized post-action hook for transaction operations ([647ec5b](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/647ec5bf7bef2bb7c7ab1be5c06af6fefc194647))
* implement ERC165 support in definition libraries ([a0e313b](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/a0e313b4c2552c3e13b489eb2e0e4abf6100c3ee))
* implement EthReceived event for ETH transfers in Account contract ([5f015b5](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/5f015b58eb6553956cdc8088ececdf6e5ecd5c81))
* implement privacy-aware transaction events ([de97b76](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/de97b767a5027ebf4c4d6ab29449c4eb6f6493aa))
* integrate definition contract calls for execution parameters ([cba4efe](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/cba4efe85d33b1ecd3a957720df5b9ecad96aa8d))
* introduce ContractFunctionMustBeProtected error for enhanced function protection ([e04a672](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/e04a6723ccebe499a23715432510032a447aa5db))
* introduce deployment configuration and update Hardhat setup ([f90b63c](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/f90b63c597d3182130fe76b21956292d77657ba7))
* introduce executeWithPayment function for enhanced transaction handling ([719c9f1](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/719c9f1d97a8a53c73db9b7f15a52050dfb5fc44))
* refactor clone creation logic in CopyBlox ([baa016c](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/baa016cb88f1002d2447860a19483c8fb8d86b86))
* update deployment scripts and add new wallet creation functionality ([0e54b06](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/0e54b0635f794fd707ebff186c5ac7fc4beafafd))
* update environment configuration and deployment scripts for CopyBlox ([ed83a88](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/ed83a88748756e50a660f81236a3d6e35a49ddf2))
* update transaction handling to return txId across multiple contracts ([9fb529f](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/9fb529f192bc93c3b61bf034570e76cf5152ee14))
* update transaction handling to return txId instead of TxRecord ([ba5ea7d](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/ba5ea7dceaa02e974c6d5f1d342ef7d1879ed8c5))


### Bug Fixes

* correct function signature for executeWithTimeLock in GuardControllerDefinitions ([d157d1d](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/d157d1d718350d8c12a87e0855aa723725d26ee2))
* enhance environment variable loading and improve test suite error reporting ([5e95622](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/5e956227144054e365a0552d4466b35788d9f0cf))
* improve error handling and logging in deployment scripts ([0c20207](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/0c2020721ed9ba0371fd97ae5ee491d5e2d6d261))
* resolve contract initialization failures and definition loading issues ([8e020fa](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/8e020fab9feb1eeae8e8548427fccf95834c863e))
* update dotenv configuration for quieter environment variable loading ([0df11d5](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/0df11d54f83dd3c87a595afcc320dc98f7b49200))


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
