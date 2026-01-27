# Definitions Documentation

The `Definitions` class provides dynamic interaction with any definition library that implements the `IDefinition` interface. This enables flexible, runtime discovery of contract configurations, operation types, function schemas, role permissions, and workflow definitions.

## 📋 **Table of Contents**

- [Overview](#overview)
- [Architecture](#architecture)
- [Installation & Setup](#installation--setup)
- [Basic Usage](#basic-usage)
- [API Reference](#api-reference)
- [Advanced Features](#advanced-features)
- [Error Handling](#error-handling)
- [Best Practices](#best-practices)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)

## 🎯 **Overview**

The `Definitions` class is designed to interact with definition libraries that implement the `IDefinition` Solidity interface. These libraries provide:

- **Operation Type Definitions**: What operations are supported
- **Function Schema Definitions**: How functions are structured
- **Role Permission Definitions**: Who can do what
- **Workflow Definitions**: How operations are executed

### **Key Benefits**

- **Dynamic Discovery**: Runtime discovery of contract capabilities
- **Type Safety**: Full TypeScript support with comprehensive type definitions
- **Flexible Integration**: Works with any compatible definition library
- **Workflow Management**: Query and analyze operation workflows
- **Permission Checking**: Dynamic role-based permission validation

## 🏗️ **Architecture**

### **Core Components**

```typescript
Definitions
├── Configuration Management
│   ├── Contract Address
│   ├── Chain Configuration
│   └── RPC Settings
├── Data Retrieval
│   ├── Operation Types
│   ├── Function Schemas
│   ├── Role Permissions
│   └── Workflow Definitions
└── Utility Functions
    ├── Permission Checking
    ├── Schema Lookup
    └── Operation Discovery
```

### **Interface Compliance**

The class implements the `IDefinition` TypeScript interface, which mirrors the Solidity `IDefinition` interface:

```typescript
interface IDefinition {
  getOperationTypes(): Promise<ReadableOperationType[]>;
  getFunctionSchemas(): Promise<FunctionSchema[]>;
  getRolePermissions(): Promise<RolePermission>;
  getOperationWorkflows(): Promise<OperationWorkflow[]>;
  getWorkflowForOperation(operationType: Hex): Promise<OperationWorkflow>;
  getWorkflowPaths(): Promise<WorkflowPath[]>;
}
```

## 🚀 **Installation & Setup**

### **Prerequisites**

```bash
npm install viem
```

### **Basic Setup**

```typescript
import { Definitions } from '@guardian/sdk/typescript';
import { createPublicClient, createWalletClient, http } from 'viem';
import { mainnet } from 'viem/chains';

// Initialize clients
const publicClient = createPublicClient({
  chain: mainnet,
  transport: http()
});

const walletClient = createWalletClient({
  chain: mainnet,
  transport: http(),
  account: '0x...' // Your account
});

// Initialize Definitions
const definitions = new Definitions(
  publicClient,
  walletClient,
  '0x1234...', // Definition contract address
  mainnet
);
```

### **Configuration Options**

```typescript
const definitions = new Definitions(
  publicClient,
  walletClient,
  contractAddress,
  chain,
  {
    chainId: 1,
    rpcUrl: 'https://eth-mainnet.g.alchemy.com/v2/your-api-key'
  }
);
```

## 📖 **Basic Usage**

### **Getting Operation Types**

```typescript
// Get all available operation types
const operationTypes = await definitions.getOperationTypes();

console.log('Available operations:');
operationTypes.forEach(op => {
  console.log(`- ${op.name}: ${op.operationType}`);
});
```

### **Getting Function Schemas**

```typescript
// Get all function schemas
const functionSchemas = await definitions.getFunctionSchemas();

console.log('Function schemas:');
functionSchemas.forEach(schema => {
  console.log(`- ${schema.functionSignature}: ${schema.functionSelector}`);
  console.log(`  Parameters: ${schema.parameters.join(', ')}`);
  console.log(`  Returns: ${schema.returnTypes.join(', ')}`);
});
```

### **Getting Role Permissions**

```typescript
// Get role permissions
const rolePermissions = await definitions.getRolePermissions();

console.log('Role permissions:');
rolePermissions.functionPermissions.forEach(permission => {
  console.log(`Function: ${permission.functionSelector}`);
  console.log(`Allowed roles: ${permission.allowedRoles.length}`);
  console.log(`Requires signature: ${permission.requiresSignature}`);
  console.log(`Off-chain: ${permission.isOffChain}`);
});
```

### **Getting Workflows**

```typescript
// Get all operation workflows
const workflows = await definitions.getOperationWorkflows();

console.log('Operation workflows:');
workflows.forEach(workflow => {
  console.log(`- ${workflow.operationName}: ${workflow.paths.length} paths`);
  workflow.paths.forEach(path => {
    console.log(`  - ${path.name}: ${path.steps.length} steps`);
  });
});
```

## 📚 **API Reference**

### **Constructor**

```typescript
constructor(
  client: PublicClient,
  walletClient: WalletClient | undefined,
  contractAddress: Address,
  chain: Chain,
  config?: Partial<DefinitionsConfig>
)
```

**Parameters:**
- `client`: Viem public client for read operations
- `walletClient`: Viem wallet client for write operations (optional)
- `contractAddress`: Address of the definition contract
- `chain`: Target blockchain chain
- `config`: Optional configuration object

### **Core Methods**

#### **getOperationTypes()**

```typescript
async getOperationTypes(): Promise<ReadableOperationType[]>
```

Returns all operation type definitions from the contract.

**Returns:** Array of operation type objects with `operationType` (Hex) and `name` (string).

**Example:**
```typescript
const operationTypes = await definitions.getOperationTypes();
// Returns: [{ operationType: '0x1234...', name: 'TRANSFER_OWNERSHIP' }, ...]
```

#### **getFunctionSchemas()**

```typescript
async getFunctionSchemas(): Promise<FunctionSchema[]>
```

Returns all function schema definitions from the contract.

**Returns:** Array of function schema objects.

**Example:**
```typescript
const schemas = await definitions.getFunctionSchemas();
// Returns: [{ functionSignature: 'transferOwnership', functionSelector: '0xabcd...', ... }, ...]
```

#### **getRolePermissions()**

```typescript
async getRolePermissions(): Promise<RolePermission>
```

Returns all role hashes and their corresponding function permissions.

**Returns:** RolePermission object with `roleHashes` and `functionPermissions` arrays.

**Example:**
```typescript
const permissions = await definitions.getRolePermissions();
// Returns: { roleHashes: ['0x1234...'], functionPermissions: [...] }
```

#### **getOperationWorkflows()**

```typescript
async getOperationWorkflows(): Promise<OperationWorkflow[]>
```

Returns all operation workflow definitions.

**Returns:** Array of operation workflow objects.

**Example:**
```typescript
const workflows = await definitions.getOperationWorkflows();
// Returns: [{ operationType: '0x1234...', operationName: 'TRANSFER_OWNERSHIP', paths: [...] }, ...]
```

#### **getWorkflowForOperation()**

```typescript
async getWorkflowForOperation(operationType: Hex): Promise<OperationWorkflow>
```

Returns workflow information for a specific operation type.

**Parameters:**
- `operationType`: The operation type hash to get workflow for

**Returns:** OperationWorkflow object for the specified operation.

**Example:**
```typescript
const workflow = await definitions.getWorkflowForOperation('0x1234...');
// Returns: { operationType: '0x1234...', operationName: 'TRANSFER_OWNERSHIP', paths: [...] }
```

#### **getWorkflowPaths()**

```typescript
async getWorkflowPaths(): Promise<WorkflowPath[]>
```

Returns all available workflow paths.

**Returns:** Array of workflow path objects.

**Example:**
```typescript
const paths = await definitions.getWorkflowPaths();
// Returns: [{ name: 'Time Delay Path', description: '...', steps: [...] }, ...]
```

### **Utility Methods**

#### **getOperationTypeByName()**

```typescript
async getOperationTypeByName(operationName: string): Promise<Hex | undefined>
```

Finds an operation type by its name.

**Parameters:**
- `operationName`: The name of the operation to find

**Returns:** The operation type hash if found, undefined otherwise.

**Example:**
```typescript
const operationType = await definitions.getOperationTypeByName('TRANSFER_OWNERSHIP');
// Returns: '0x1234...' or undefined
```

#### **getFunctionSchemaBySelector()**

```typescript
async getFunctionSchemaBySelector(functionSelector: Hex): Promise<FunctionSchema | undefined>
```

Gets function schema by its selector.

**Parameters:**
- `functionSelector`: The function selector to find

**Returns:** The function schema if found, undefined otherwise.

**Example:**
```typescript
const schema = await definitions.getFunctionSchemaBySelector('0xabcd...');
// Returns: { functionSignature: 'transferOwnership', ... } or undefined
```

#### **hasRolePermission()**

```typescript
async hasRolePermission(roleHash: Hex, functionSelector: Hex): Promise<boolean>
```

Checks if a role has permission for a function.

**Parameters:**
- `roleHash`: The role hash to check
- `functionSelector`: The function selector to check permission for

**Returns:** True if the role has permission, false otherwise.

**Example:**
```typescript
const hasPermission = await definitions.hasRolePermission('0xefgh...', '0xabcd...');
// Returns: true or false
```

#### **getRolesForFunction()**

```typescript
async getRolesForFunction(functionSelector: Hex): Promise<Hex[]>
```

Gets all roles that can execute a specific function.

**Parameters:**
- `functionSelector`: The function selector to check

**Returns:** Array of role hashes that can execute the function.

**Example:**
```typescript
const allowedRoles = await definitions.getRolesForFunction('0xabcd...');
// Returns: ['0x1234...', '0x5678...']
```

### **Configuration Methods**

#### **getConfig()**

```typescript
getConfig(): DefinitionsConfig
```

Gets the current contract configuration.

**Returns:** Current configuration object.

**Example:**
```typescript
const config = definitions.getConfig();
// Returns: { contractAddress: '0x1234...', chainId: 1, rpcUrl: '...' }
```

#### **updateConfig()**

```typescript
updateConfig(config: Partial<DefinitionsConfig>): void
```

Updates the contract configuration.

**Parameters:**
- `config`: Partial configuration object to update

**Example:**
```typescript
definitions.updateConfig({
  chainId: 137, // Polygon
  rpcUrl: 'https://polygon-rpc.com'
});
```

## 🔧 **Advanced Features**

### **Workflow Analysis**

```typescript
// Analyze workflow complexity
async analyzeWorkflowComplexity(operationType: Hex) {
  const workflow = await definitions.getWorkflowForOperation(operationType);
  
  const analysis = {
    operationName: workflow.operationName,
    totalPaths: workflow.paths.length,
    totalSteps: workflow.paths.reduce((sum, path) => sum + path.steps.length, 0),
    averageStepsPerPath: 0,
    hasOffChainSteps: workflow.paths.some(path => path.hasOffChainPhase),
    requiresSignature: workflow.paths.some(path => path.requiresSignature)
  };
  
  analysis.averageStepsPerPath = analysis.totalSteps / analysis.totalPaths;
  
  return analysis;
}

// Usage
const analysis = await analyzeWorkflowComplexity('0x1234...');
console.log('Workflow Analysis:', analysis);
```

### **Permission Matrix**

```typescript
// Build permission matrix
async buildPermissionMatrix() {
  const rolePermissions = await definitions.getRolePermissions();
  const functionSchemas = await definitions.getFunctionSchemas();
  
  const matrix = new Map<string, Map<string, boolean>>();
  
  // Initialize matrix
  rolePermissions.roleHashes.forEach(roleHash => {
    matrix.set(roleHash, new Map());
    functionSchemas.forEach(schema => {
      matrix.get(roleHash)!.set(schema.functionSelector, false);
    });
  });
  
  // Fill matrix
  rolePermissions.functionPermissions.forEach(permission => {
    permission.allowedRoles.forEach(roleHash => {
      matrix.get(roleHash)?.set(permission.functionSelector, true);
    });
  });
  
  return matrix;
}

// Usage
const permissionMatrix = await buildPermissionMatrix();
console.log('Permission Matrix:', permissionMatrix);
```

### **Dynamic Function Discovery**

```typescript
// Discover functions by role
async discoverFunctionsByRole(roleHash: Hex) {
  const allowedRoles = await definitions.getRolesForFunction('0x00000000'); // Placeholder
  const functionSchemas = await definitions.getFunctionSchemas();
  
  const roleFunctions = [];
  
  for (const schema of functionSchemas) {
    const hasPermission = await definitions.hasRolePermission(roleHash, schema.functionSelector);
    if (hasPermission) {
      roleFunctions.push(schema);
    }
  }
  
  return roleFunctions;
}

// Usage
const roleFunctions = await discoverFunctionsByRole('0x1234...');
console.log('Functions for role:', roleFunctions);
```

## ⚠️ **Error Handling**

### **Common Error Types**

```typescript
try {
  const operationTypes = await definitions.getOperationTypes();
} catch (error) {
  if (error instanceof Error) {
    // Handle specific error types
    if (error.message.includes('Failed to get operation types')) {
      console.error('Contract read failed:', error.message);
    } else if (error.message.includes('Unknown error')) {
      console.error('Unexpected error:', error.message);
    }
  }
}
```

### **Error Recovery**

```typescript
// Retry mechanism
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * (i + 1)));
    }
  }
  throw new Error('Max retries exceeded');
}

// Usage
const operationTypes = await retryOperation(
  () => definitions.getOperationTypes()
);
```

### **Validation**

```typescript
// Validate contract response
function validateOperationTypes(operationTypes: ReadableOperationType[]): boolean {
  return operationTypes.every(op => 
    op.operationType && 
    op.name && 
    typeof op.operationType === 'string' &&
    typeof op.name === 'string'
  );
}

// Usage
const operationTypes = await definitions.getOperationTypes();
if (!validateOperationTypes(operationTypes)) {
  throw new Error('Invalid operation types received');
}
```

## 🎯 **Best Practices**

### **1. Error Handling**

```typescript
// Always wrap contract calls in try-catch
try {
  const data = await definitions.getOperationTypes();
  // Process data
} catch (error) {
  console.error('Contract interaction failed:', error);
  // Handle error appropriately
}
```

### **2. Caching**

```typescript
// Cache frequently accessed data
class CachedDefinitions extends Definitions {
  private cache = new Map<string, any>();
  
  async getOperationTypes(): Promise<ReadableOperationType[]> {
    const cacheKey = 'operationTypes';
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }
    
    const result = await super.getOperationTypes();
    this.cache.set(cacheKey, result);
    return result;
  }
}
```

### **3. Type Safety**

```typescript
// Use proper type assertions
const operationTypes = await definitions.getOperationTypes();
const validTypes = operationTypes.filter(op => 
  op.operationType && op.name
) as ReadableOperationType[];
```

### **4. Configuration Management**

```typescript
// Centralize configuration
const config = {
  contractAddress: '0x1234...',
  chainId: 1,
  rpcUrl: process.env.RPC_URL
};

const definitions = new Definitions(
  publicClient,
  walletClient,
  config.contractAddress,
  chain,
  config
);
```

### **5. Performance Optimization**

```typescript
// Batch operations when possible
async function batchOperations() {
  const [operationTypes, functionSchemas, rolePermissions] = await Promise.all([
    definitions.getOperationTypes(),
    definitions.getFunctionSchemas(),
    definitions.getRolePermissions()
  ]);
  
  return { operationTypes, functionSchemas, rolePermissions };
}
```

## 💡 **Examples**

### **Complete Workflow Analysis**

```typescript
async function analyzeCompleteWorkflow(operationType: Hex) {
  const workflow = await definitions.getWorkflowForOperation(operationType);
  
  console.log(`\n=== Workflow Analysis: ${workflow.operationName} ===`);
  console.log(`Operation Type: ${workflow.operationType}`);
  console.log(`Supported Roles: ${workflow.supportedRoles.join(', ')}`);
  console.log(`Total Paths: ${workflow.paths.length}`);
  
  workflow.paths.forEach((path, index) => {
    console.log(`\n--- Path ${index + 1}: ${path.name} ---`);
    console.log(`Description: ${path.description}`);
    console.log(`Workflow Type: ${path.workflowType}`);
    console.log(`Estimated Time: ${path.estimatedTimeSec}s`);
    console.log(`Requires Signature: ${path.requiresSignature}`);
    console.log(`Has Off-Chain Phase: ${path.hasOffChainPhase}`);
    console.log(`Steps: ${path.steps.length}`);
    
    path.steps.forEach((step, stepIndex) => {
      console.log(`  ${stepIndex + 1}. ${step.functionName}`);
      console.log(`     Action: ${step.action}`);
      console.log(`     Roles: ${step.roles.join(', ')}`);
      console.log(`     Off-Chain: ${step.isOffChain}`);
      console.log(`     Phase: ${step.phaseType}`);
    });
  });
}

// Usage
await analyzeCompleteWorkflow('0x1234...');
```

### **Permission Audit**

```typescript
async function auditPermissions() {
  const rolePermissions = await definitions.getRolePermissions();
  const functionSchemas = await definitions.getFunctionSchemas();
  
  console.log('\n=== Permission Audit ===');
  
  // Check for functions without permissions
  const functionsWithoutPermissions = functionSchemas.filter(schema => {
    return !rolePermissions.functionPermissions.some(perm => 
      perm.functionSelector === schema.functionSelector
    );
  });
  
  if (functionsWithoutPermissions.length > 0) {
    console.log('\n⚠️  Functions without permissions:');
    functionsWithoutPermissions.forEach(func => {
      console.log(`- ${func.functionSignature} (${func.functionSelector})`);
    });
  }
  
  // Check for roles without functions
  const rolesWithoutFunctions = rolePermissions.roleHashes.filter(roleHash => {
    return !rolePermissions.functionPermissions.some(perm => 
      perm.allowedRoles.includes(roleHash)
    );
  });
  
  if (rolesWithoutFunctions.length > 0) {
    console.log('\n⚠️  Roles without function permissions:');
    rolesWithoutFunctions.forEach(roleHash => {
      console.log(`- ${roleHash}`);
    });
  }
  
  // Summary
  console.log('\n=== Summary ===');
  console.log(`Total Functions: ${functionSchemas.length}`);
  console.log(`Total Roles: ${rolePermissions.roleHashes.length}`);
  console.log(`Functions with Permissions: ${rolePermissions.functionPermissions.length}`);
}

// Usage
await auditPermissions();
```

### **Dynamic UI Generation**

```typescript
async function generateDynamicUI() {
  const operationTypes = await definitions.getOperationTypes();
  const workflows = await definitions.getOperationWorkflows();
  
  const uiConfig = {
    operations: operationTypes.map(op => ({
      id: op.operationType,
      name: op.name,
      displayName: op.name.replace(/_/g, ' ').toLowerCase()
        .replace(/\b\w/g, l => l.toUpperCase())
    })),
    workflows: workflows.map(workflow => ({
      operationType: workflow.operationType,
      operationName: workflow.operationName,
      paths: workflow.paths.map(path => ({
        name: path.name,
        description: path.description,
        estimatedTime: path.estimatedTimeSec,
        steps: path.steps.length
      }))
    }))
  };
  
  return uiConfig;
}

// Usage
const uiConfig = await generateDynamicUI();
console.log('UI Configuration:', JSON.stringify(uiConfig, null, 2));
```

## 🔍 **Troubleshooting**

### **Common Issues**

#### **1. Contract Not Found**

```typescript
// Error: Contract not found at address
// Solution: Verify contract address and network
const isValidAddress = await publicClient.getCode({
  address: contractAddress
});

if (!isValidAddress) {
  throw new Error('Contract not found at specified address');
}
```

#### **2. Network Mismatch**

```typescript
// Error: Network mismatch
// Solution: Verify chain configuration
const chainId = await publicClient.getChainId();
if (chainId !== expectedChainId) {
  throw new Error(`Expected chain ID ${expectedChainId}, got ${chainId}`);
}
```

#### **3. RPC Rate Limiting**

```typescript
// Error: RPC rate limiting
// Solution: Implement retry with exponential backoff
async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  maxRetries: number = 5
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      
      const delay = Math.pow(2, i) * 1000; // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Max retries exceeded');
}
```

### **Debug Mode**

```typescript
// Enable debug logging
class DebugDefinitions extends Definitions {
  private debug = true;
  
  async getOperationTypes(): Promise<ReadableOperationType[]> {
    if (this.debug) {
      console.log('🔍 Getting operation types from:', this.contractAddress);
    }
    
    try {
      const result = await super.getOperationTypes();
      
      if (this.debug) {
        console.log('✅ Operation types retrieved:', result.length);
      }
      
      return result;
    } catch (error) {
      if (this.debug) {
        console.error('❌ Failed to get operation types:', error);
      }
      throw error;
    }
  }
}
```

### **Performance Monitoring**

```typescript
// Monitor performance
async function monitorPerformance<T>(
  operation: () => Promise<T>,
  operationName: string
): Promise<T> {
  const startTime = Date.now();
  
  try {
    const result = await operation();
    const duration = Date.now() - startTime;
    
    console.log(`⏱️  ${operationName} completed in ${duration}ms`);
    return result;
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`❌ ${operationName} failed after ${duration}ms:`, error);
    throw error;
  }
}

// Usage
const operationTypes = await monitorPerformance(
  () => definitions.getOperationTypes(),
  'getOperationTypes'
);
```

---

## 📚 **Related Documentation**

- [Types & Interfaces](./types-interfaces.md) - TypeScript type definitions
- [API Reference](./api-reference.md) - Complete API documentation
- [Best Practices](./best-practices.md) - Development guidelines
- [Examples](./examples-basic.md) - Practical code samples

## 🔗 **External Resources**

- [Viem Documentation](https://viem.sh/) - Ethereum library
- [TypeScript Documentation](https://www.typescriptlang.org/) - Type system
- [Ethereum Documentation](https://ethereum.org/developers/) - Blockchain development

---

**Version**: 1.0.0  
**Last Updated**: September 2025  
**License**: MPL-2.0
