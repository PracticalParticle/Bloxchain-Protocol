# Changelog — @bloxchain/contracts

All notable changes to this package are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0](https://github.com/PracticalParticle/Bloxchain-Protocol/compare/contracts-v1.0.0...contracts-v1.1.0) (2026-09-16)


### Features

* **contracts:** publish compiled artifacts and official deployed addresses ([159513a](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/159513afcf06ac16ea6b6c4bcdd30bde391cdcd2))
* **sdk:** add flowReadiness probe and guard/RBAC public-builder docs ([c5a28b3](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/c5a28b3d0f20522b1a25b2b3302cd2297ddead26))
* **sdk:** public-integrator surface — exports, EIP-712, errors, deadline, inner status ([6d3213a](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/6d3213aa05804c751580f38ec7e375c9673a277f))


### Bug Fixes

* **sdk:** address SPEC-0118 review findings on provisioning surface ([b06002b](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/b06002bdb198cdf203feb36665fe0908cf85c2dc))

## [Unreleased]

### Added

- Publish compiled `artifacts/*.json` (ABI + bytecode + link refs + compiler settings) with `exports` map coverage for AccountBlox, CopyBlox, EngineBlox, and definition libraries (SPEC-2026-0118).
- Ship `official-deployed-addresses.json` as the official multi-network address SoT (Sepolia first); distinct from lab `deployed-addresses.json`.
- CI workflow `contracts-artifacts.yml` builds and verifies artifacts on `contracts-v*` tags and related PRs.

## [1.0.0](https://github.com/PracticalParticle/Bloxchain-Protocol/releases/tag/contracts-v1.0.0) - 2026-06-03

First **stable** documented release on npm (`latest`). Publishable Solidity artifacts: `core`, `abi`, `standards`, `components`.

### Added

- enhance package structure by including standards and components directories ([256461c](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/256461c33431abc088f8d11afd71bf3387807ca5))
- update deployment scripts and add new wallet creation functionality ([0e54b06](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/0e54b0635f794fd707ebff186c5ac7fc4beafafd))
- update environment configuration and deployment scripts for CopyBlox ([ed83a88](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/ed83a88748756e50a660f81236a3d6e35a49ddf2))

### Fixed

- update dotenv configuration for quieter environment variable loading ([0df11d5](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/0df11d54f83dd3c87a595afcc320dc98f7b49200))

### Note

Prior `1.0.0-alpha.N` publishes were experimental and are not listed in this changelog.
