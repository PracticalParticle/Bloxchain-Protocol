# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
