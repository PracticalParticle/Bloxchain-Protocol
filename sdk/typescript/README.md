# Bloxchain Protocol TypeScript SDK

[![npm version](https://img.shields.io/npm/v/@bloxchain/sdk.svg)](https://www.npmjs.com/package/@bloxchain/sdk)
[![License: MPL-2.0](https://img.shields.io/badge/License-MPL--2.0-blue.svg)](https://opensource.org/licenses/MPL-2.0)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/badge/Node-%3E%3D18.0.0-green.svg)](https://nodejs.org/)

A comprehensive TypeScript SDK for interacting with the Bloxchain Protocol smart contracts, providing type-safe interfaces for secure multi-phase operations, dynamic role-based access control, and state abstraction.

> **⚠️ EXPERIMENTAL SOFTWARE WARNING**  
> This package contains experimental smart contract code and SDK support. While the framework is feature-complete and tested, it is not yet audited for production use. Use at your own risk and do not deploy with real assets without proper security review.

## Requirements

- **Node.js**: >= 18.0.0
- **TypeScript**: 5.x (recommended)
- **Peer dependency**: `viem` ^2.0.0 (required for all SDK usage)
- **Optional peer**: `@bloxchain/contracts` ^1.0.0-alpha (for Solidity/ABI alignment when building apps that use both)

## 🏗️ **Unique Architecture**

Bloxchain Protocol implements a **state machine architecture** with `SecureOperationState` as the core engine, providing:

- **Centralized State Management**: All security operations flow through a unified state machine
- **Multi-Phase Transaction Processing**: Time-locked operations with request/approval workflows
- **Dynamic Role-Based Access Control**: Flexible, hierarchical permission system
- **Meta-Transaction Support**: Gasless transactions and delegated execution
- **Event-Driven Architecture**: Comprehensive audit trails and external monitoring

## Features

- **SecureOwnable**: Multi-phase ownership management with time-locked operations
- **RuntimeRBAC**: Runtime role-based access control system with batch configuration
- **Definitions**: Dynamic interaction with any definition library implementing IDefinition
- **Guardian**: State abstraction with secure operations
- **Type Safety**: Full TypeScript support with comprehensive type definitions
- **Viem Integration**: Built on top of Viem for modern Ethereum development

## 📚 Documentation

Comprehensive documentation is available in the [`docs/`](./docs/) directory:

### **🏗️ Architecture & Design**
- **[Protocol Architecture](./docs/bloxchain-architecture.md)** - Bloxchain protocol overview and design principles
- **[State Machine Engine](./docs/state-machine-engine.md)** - SecureOperationState engine and state management
- **[Architecture Patterns](./docs/architecture-patterns.md)** - Design patterns and best practices

### **🚀 Getting Started**
- **[Getting Started](./docs/getting-started.md)** - Quick setup and basic usage
- **[API Reference](./docs/api-reference.md)** - Complete API documentation
- **[SecureOwnable Guide](./docs/secure-ownable.md)** - Ownership management
- **[RuntimeRBAC Guide](./docs/runtime-rbac.md)** - Role-based access control

### **🔍 Development Tools**
- **[Best Practices](./docs/best-practices.md)** - Development guidelines
- **[Examples](./docs/examples-basic.md)** - Practical code samples
- **[Types & Interfaces](./docs/types-interfaces.md)** - Type definitions

**📖 [View All Documentation](./docs/README.md)**

## Installation

```bash
# Install the SDK and its required peer dependency
npm install @bloxchain/sdk viem

# Optional: install contracts package when building apps that use both SDK and Solidity
npm install @bloxchain/contracts
```

To install from the repository (e.g. for development):

```bash
npm install https://github.com/PracticalParticle/Bloxchain-Protocol.git#main --save
```

## Quick Start

```typescript
import { 
  SecureOwnable, 
  RuntimeRBAC,
  GuardController,
  Definitions,
  type Address,
  type PublicClient,
  type WalletClient,
  type Chain
} from '@bloxchain/sdk';

// Initialize clients (using your preferred provider)
const publicClient: PublicClient = createPublicClient({...});
const walletClient: WalletClient = createWalletClient({...});
const chain: Chain = mainnet; // or your target chain

// Initialize SDK classes
const secureOwnable = new SecureOwnable(
  publicClient,
  walletClient,
  contractAddress,
  chain
);

const runtimeRBAC = new RuntimeRBAC(
  publicClient,
  walletClient,
  contractAddress,
  chain
);

const definitions = new Definitions(
  publicClient,
  walletClient,
  definitionsAddress,
  chain
);
```

## SecureOwnable Usage

### Ownership Management

```typescript
// Request ownership transfer
const txResult = await secureOwnable.transferOwnershipRequest({
  from: ownerAddress
});

// Approve after time lock period
const approvalResult = await secureOwnable.transferOwnershipDelayedApproval(
  txId,
  { from: ownerAddress }
);

// Cancel ownership transfer
const cancelResult = await secureOwnable.transferOwnershipCancellation(
  txId,
  { from: ownerAddress }
);
```

### Meta Transactions

```typescript
// Create meta transaction parameters
const metaTxParams = await secureOwnable.createMetaTxParams(
  handlerContract,
  handlerSelector,
  deadline,
  maxGasPrice,
  signer
);

// Generate unsigned meta transaction
const metaTx = await secureOwnable.generateUnsignedMetaTransactionForNew(
  requester,
  target,
  value,
  gasLimit,
  operationType,
  executionType,
  executionOptions,
  metaTxParams
);
```

## RuntimeRBAC Usage

RuntimeRBAC uses batch-based configuration for all role management operations. See the [RuntimeRBAC Guide](./docs/runtime-rbac.md) for complete examples.

### Query Functions

```typescript
// Get role information
const role = await runtimeRBAC.getRole(roleHash);
console.log(role.roleName, role.maxWallets, role.isProtected);

// Check if wallet has role
const hasRole = await runtimeRBAC.hasRole(roleHash, walletAddress);

// Get wallets in role
const wallets = await runtimeRBAC.getWalletsInRole(roleHash);

// Get roles for a wallet
const walletRoles = await runtimeRBAC.getWalletRoles(walletAddress);

// Get supported roles
const supportedRoles = await runtimeRBAC.getSupportedRoles();

// Get active role permissions
const permissions = await runtimeRBAC.getActiveRolePermissions(roleHash);
```

### Batch Configuration

All role management (create role, add wallet, add permissions, etc.) is done via batch operations. See the [RuntimeRBAC Guide](./docs/runtime-rbac.md) for detailed batch configuration examples.

## Definitions Usage

The `Definitions` class provides dynamic interaction with any definition library that implements the `IDefinition` interface. This allows you to query operation types, function schemas, role permissions, and workflow definitions from any compatible contract.

### Basic Usage

```typescript
// Initialize Definitions
const definitions = new Definitions(
  publicClient,
  walletClient,
  definitionsAddress,
  chain
);

// Get all operation types
const operationTypes = await definitions.getOperationTypes();
console.log('Available operations:', operationTypes);

// Get all function schemas
const functionSchemas = await definitions.getFunctionSchemas();
console.log('Function schemas:', functionSchemas);

// Get role permissions
const rolePermissions = await definitions.getRolePermissions();
console.log('Role permissions:', rolePermissions);
```

### Workflow Management

```typescript
// Get all operation workflows
const workflows = await definitions.getOperationWorkflows();
console.log('Available workflows:', workflows);

// Get workflow for specific operation
const operationType = '0x1234...'; // operation type hash
const workflow = await definitions.getWorkflowForOperation(operationType);
console.log('Workflow for operation:', workflow);

// Get all workflow paths
const paths = await definitions.getWorkflowPaths();
console.log('Available paths:', paths);
```

### Utility Functions

```typescript
// Find operation type by name
const operationType = await definitions.getOperationTypeByName('TRANSFER_OWNERSHIP');
console.log('Operation type hash:', operationType);

// Get function schema by selector
const functionSelector = '0xabcd...';
const schema = await definitions.getFunctionSchemaBySelector(functionSelector);
console.log('Function schema:', schema);

// Check role permission for function
const roleHash = '0xefgh...';
const hasPermission = await definitions.hasRolePermission(roleHash, functionSelector);
console.log('Has permission:', hasPermission);

// Get all roles that can execute a function
const allowedRoles = await definitions.getRolesForFunction(functionSelector);
console.log('Allowed roles:', allowedRoles);
```

### Configuration Management

```typescript
// Get current configuration
const config = definitions.getConfig();
console.log('Current config:', config);

// Update configuration
definitions.updateConfig({
  chainId: 137, // Polygon
  rpcUrl: 'https://polygon-rpc.com'
});
```

## Types and Constants

### Transaction Actions

```typescript
import { TxAction } from '@bloxchain/sdk';

// Available transaction actions
TxAction.EXECUTE_TIME_DELAY_REQUEST
TxAction.EXECUTE_TIME_DELAY_APPROVE
TxAction.EXECUTE_TIME_DELAY_CANCEL
TxAction.SIGN_META_REQUEST_AND_APPROVE
TxAction.SIGN_META_APPROVE
TxAction.SIGN_META_CANCEL
TxAction.EXECUTE_META_REQUEST_AND_APPROVE
TxAction.EXECUTE_META_APPROVE
TxAction.EXECUTE_META_CANCEL
```

### Execution Types

```typescript
import { ExecutionType } from '@bloxchain/sdk';

ExecutionType.NONE
ExecutionType.STANDARD
ExecutionType.RAW
```

### Transaction Status

```typescript
import { TxStatus } from '@bloxchain/sdk';

TxStatus.UNDEFINED
TxStatus.PENDING
TxStatus.CANCELLED
TxStatus.COMPLETED
TxStatus.FAILED
TxStatus.REJECTED
```

## Error Handling

All SDK methods throw errors for failed operations. Always wrap SDK calls in try-catch blocks:

```typescript
try {
  const result = await secureOwnable.transferOwnershipRequest({
    from: ownerAddress
  });
  console.log('Transaction successful:', result.hash);
} catch (error) {
  console.error('Transaction failed:', error);
}
```

## Security Considerations

- Always validate addresses and parameters before making transactions
- Use proper time-lock periods for critical operations
- Implement proper access control using RuntimeRBAC
- Monitor transaction status and handle failures appropriately
- Keep private keys secure and never expose them in client-side code

## Versioning and stability

This package follows [Semantic Versioning](https://semver.org/). Current versions are **alpha** (`1.0.0-alpha.x`). Pre-1.0 releases may introduce breaking changes; we recommend pinning the exact version until the protocol is audited and stable.

## Security

- **Vulnerability reporting**: Do not open public GitHub issues for security vulnerabilities. See the [Security Policy](https://github.com/PracticalParticle/Bloxchain-Protocol/blob/main/SECURITY.md) for reporting instructions (e.g. security@particlecs.com).
- **Audit status**: The underlying protocol is not yet audited. Do not use with mainnet assets without an independent security review.

## Support and links

- **Documentation**: [SDK docs](./docs/) in this package; [Bloxchain Protocol README](https://github.com/PracticalParticle/Bloxchain-Protocol#readme) for protocol details
- **Issues and feature requests**: [GitHub Issues](https://github.com/PracticalParticle/Bloxchain-Protocol/issues)
- **Homepage**: [bloxchain.app](https://bloxchain.app/)
- **Author**: [Particle Crypto Security](https://particlecs.com/)

## Repository

Part of [Bloxchain Protocol](https://github.com/PracticalParticle/Bloxchain-Protocol). For protocol architecture and contract documentation, see the main repository README.

## Contributing

When contributing to the SDK:

1. Follow TypeScript best practices
2. Add comprehensive type definitions
3. Include JSDoc comments for all public methods
4. Test all new functionality thoroughly
5. Update this README with new features

## License

MPL-2.0 (Mozilla Public License 2.0). This SDK is part of the Bloxchain Protocol. See the [LICENSE](https://github.com/PracticalParticle/Bloxchain-Protocol/blob/main/LICENSE) file in the main repository.
