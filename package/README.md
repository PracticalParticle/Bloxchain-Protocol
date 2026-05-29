# @bloxchain/contracts

[![npm version](https://img.shields.io/npm/v/@bloxchain/contracts.svg)](https://www.npmjs.com/package/@bloxchain/contracts)
[![License: MPL-2.0](https://img.shields.io/badge/License-MPL--2.0-blue.svg)](https://opensource.org/licenses/MPL-2.0)
[![Solidity](https://img.shields.io/badge/Solidity-0.8.34-blue.svg)](https://soliditylang.org/)

Bloxchain Protocol smart contracts – state abstraction and core components for building on the Bloxchain Protocol.

The core protocol has completed an independent security audit and is being prepared for production deployment. Review release notes and pin an exact version for production integrations.

## Requirements

- **Node.js**: >= 18.0.0 (for tooling; Solidity has no runtime dependency)
- **Solidity**: 0.8.x (0.8.34 recommended)
- **Compilers**: Foundry, Hardhat, or Truffle

## Installation

```bash
npm install @bloxchain/contracts
```

## Usage

Import contracts in your Solidity files. All contracts live under `@bloxchain/contracts/core/`:

```solidity
import "@bloxchain/contracts/core/base/BaseStateMachine.sol";
import "@bloxchain/contracts/core/security/SecureOwnable.sol";
import "@bloxchain/contracts/core/access/RuntimeRBAC.sol";
import "@bloxchain/contracts/core/execution/GuardController.sol";
import "@bloxchain/contracts/core/lib/utils/SharedValidation.sol";
import "@bloxchain/contracts/core/lib/interfaces/IDefinition.sol";
```

**Foundry**: No remapping needed; the package exposes `core/` at root (lib, base, access, execution, security live inside it).  
**Hardhat / Truffle**: Resolve `@bloxchain/contracts` from `node_modules` as usual.

## Contracts

### Core contracts

| Contract | Description |
|----------|-------------|
| `BaseStateMachine` | Foundation state machine for all blox contracts |
| `SecureOwnable` | Multi-role security with time-locked operations |
| `RuntimeRBAC` | Dynamic role-based access control |
| `GuardController` | Execution workflows and time-locked transactions |

### Templates and examples

Templates (e.g. AccountBlox, CopyBlox) and example applications (SimpleVault, SimpleRWA20) live in the main repository under `contracts/examples/`. They are not included in this npm package. See the [main repo](https://github.com/PracticalParticle/Bloxchain-Protocol) for full documentation and examples.

## Dependencies

This package declares:

- `@openzeppelin/contracts`: 5.6.1
- `@openzeppelin/contracts-upgradeable`: 5.6.1

Install them in your project if your tooling does not resolve transitive dependencies.

## Versioning and stability

This package follows [Semantic Versioning](https://semver.org/). Published versions use the **alpha** channel (`1.0.0-alpha.x`) while we finalize the 1.0.0 release line. Pin the exact version in production and review release notes before upgrading.

## Security

- **Vulnerability reporting**: Do not open public GitHub issues for security vulnerabilities. See the [Security Policy](https://github.com/PracticalParticle/Bloxchain-Protocol/blob/main/SECURITY.md) for reporting instructions (e.g. security@particlecs.com).
- **Audit status**: Core protocol smart contracts have completed an independent security audit. Follow your own deployment, upgrade, and operational review processes before production use.

## Support and links

- **Documentation**: [Bloxchain Protocol README](https://github.com/PracticalParticle/Bloxchain-Protocol#readme)
- **Issues and feature requests**: [GitHub Issues](https://github.com/PracticalParticle/Bloxchain-Protocol/issues)
- **Homepage**: [bloxchain.app](https://bloxchain.app/)
- **Author**: [Particle Crypto Security](https://particlecs.com/)

## Repository

Part of [Bloxchain Protocol](https://github.com/PracticalParticle/Bloxchain-Protocol). For full documentation, architecture, and examples, see the main repository.

## License

MPL-2.0 (Mozilla Public License 2.0). See the [LICENSE](https://github.com/PracticalParticle/Bloxchain-Protocol/blob/main/LICENSE) file in the main repository.
