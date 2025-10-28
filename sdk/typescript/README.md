# Bloxchain Protocol TypeScript SDK

A comprehensive TypeScript SDK for interacting with the Bloxchain Protocol smart contracts, providing type-safe interfaces for secure multi-phase operations, dynamic role-based access control, and state abstraction.

## 🏗️ **Unique Architecture**

Bloxchain Protocol implements a **state machine architecture** with `SecureOperationState` as the core engine, providing:

- **Centralized State Management**: All security operations flow through a unified state machine
- **Multi-Phase Transaction Processing**: Time-locked operations with request/approval workflows
- **Dynamic Role-Based Access Control**: Flexible, hierarchical permission system
- **Meta-Transaction Support**: Gasless transactions and delegated execution
- **Event-Driven Architecture**: Comprehensive audit trails and external monitoring

## Features

- **SecureOwnable**: Multi-phase ownership management with time-locked operations
- **DynamicRBAC**: Dynamic role-based access control system
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
- **[DynamicRBAC Guide](./docs/dynamic-rbac.md)** - Role-based access control

### **🔍 Development Tools**
- **[Best Practices](./docs/best-practices.md)** - Development guidelines
- **[Examples](./docs/examples-basic.md)** - Practical code samples
- **[Types & Interfaces](./docs/types-interfaces.md)** - Type definitions

**📖 [View All Documentation](./docs/README.md)**

## Installation

```bash
npm install viem
```

## Quick Start

```typescript
import { 
  SecureOwnable, 
  DynamicRBAC,
  Definitions,
  type Address,
  type PublicClient,
  type WalletClient,
  type Chain
} from './index';

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

const dynamicRBAC = new DynamicRBAC(
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

## DynamicRBAC Usage

### Role Management

```typescript
// Create a new role
const createResult = await dynamicRBAC.createRole(
  "ADMIN_ROLE",
  5n, // max 5 wallets
  { from: ownerAddress }
);

// Update role properties
const updateResult = await dynamicRBAC.updateRole(
  roleHash,
  "UPDATED_ADMIN_ROLE",
  10n, // new max wallets
  { from: ownerAddress }
);

// Delete a role
const deleteResult = await dynamicRBAC.deleteRole(
  roleHash,
  { from: ownerAddress }
);
```

### Wallet Management

```typescript
// Add wallet to role
const addResult = await dynamicRBAC.addWalletToRole(
  roleHash,
  walletAddress,
  { from: ownerAddress }
);

// Remove wallet from role
const revokeResult = await dynamicRBAC.revokeWallet(
  roleHash,
  walletAddress,
  { from: ownerAddress }
);

// Replace wallet in role
const replaceResult = await dynamicRBAC.replaceWalletInRole(
  roleHash,
  newWalletAddress,
  oldWalletAddress,
  { from: ownerAddress }
);
```

### Permission Management

```typescript
// Add function permission to role
const addPermissionResult = await dynamicRBAC.addFunctionPermissionToRole(
  roleHash,
  functionSelector,
  TxAction.EXECUTE_TIME_DELAY_APPROVE,
  { from: ownerAddress }
);

// Remove function permission from role
const removePermissionResult = await dynamicRBAC.removeFunctionPermissionFromRole(
  roleHash,
  functionSelector,
  { from: ownerAddress }
);
```

### Query Functions

```typescript
// Get all dynamic roles
const dynamicRoles = await dynamicRBAC.getDynamicRoles();

// Get role information
const roleInfo = await dynamicRBAC.getRoleInfo(roleHash);
console.log(roleInfo.roleName, roleInfo.maxWallets, roleInfo.isProtected);

// Check if wallet has role
const hasRole = await dynamicRBAC.hasRole(roleHash, walletAddress);

// Get wallets in role
const wallets = await dynamicRBAC.getWalletsInRole(roleHash);

// Get role permissions
const permissions = await dynamicRBAC.getRolePermissions(roleHash);
```

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
import { TxAction } from './types/lib.index';

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
import { ExecutionType } from './types/lib.index';

ExecutionType.NONE
ExecutionType.STANDARD
ExecutionType.RAW
```

### Transaction Status

```typescript
import { TxStatus } from './types/lib.index';

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
- Implement proper access control using DynamicRBAC
- Monitor transaction status and handle failures appropriately
- Keep private keys secure and never expose them in client-side code

## Contributing

When contributing to the SDK:

1. Follow TypeScript best practices
2. Add comprehensive type definitions
3. Include JSDoc comments for all public methods
4. Test all new functionality thoroughly
5. Update this README with new features

## License

This SDK is part of the Bloxchain Protocol and follows the same licensing terms.
