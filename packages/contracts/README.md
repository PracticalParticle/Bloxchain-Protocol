# @bloxchain/contracts

Bloxchain Protocol Smart Contracts - State Abstraction for Blockchain Security

## Installation

```bash
npm install @bloxchain/contracts
```

## Usage

Import contracts in your Solidity files:

```solidity
import "@bloxchain/contracts/core/base/BaseStateMachine.sol";
import "@bloxchain/contracts/core/security/SecureOwnable.sol";
import "@bloxchain/contracts/core/access/RuntimeRBAC.sol";
import "@bloxchain/contracts/core/execution/GuardController.sol";
```

## Contracts

### Core Contracts
- `BaseStateMachine` - Foundation state machine contract
- `SecureOwnable` - Multi-role security with time-locked operations
- `RuntimeRBAC` - Dynamic role-based access control
- `GuardController` - Execution workflows and time-locked transactions

### Template Contracts
- `BareBlox` - Minimal base state machine
- `SecureBlox` - Basic secure ownership
- `RoleBlox` - Secure ownership + RBAC
- `ControlBlox` - Complete execution workflows
- `MachineBlox` - Full-featured with hooks

### Example Contracts
- `SimpleVault` - Secure asset management
- `SimpleRWA20` - Tokenized real-world assets

## Dependencies

This package requires:
- `@openzeppelin/contracts`: ^5.4.0
- `@openzeppelin/contracts-upgradeable`: ^5.4.0

## License

MPL-2.0
