# RuntimeRBAC Contract Integration

The `RuntimeRBAC` class provides type-safe access to Bloxchain RuntimeRBAC contracts with dynamic role-based access control and flexible permission management.

## 🎯 **Overview**

RuntimeRBAC extends BaseStateMachine with advanced role management:
- **Dynamic role creation** and management via batch configuration
- **Flexible permission system** with function-level access control
- **Meta-transaction support** for role operations
- **Event-driven role updates** for external monitoring

**Note**: Function schema registration has been moved to GuardController for better architectural separation. RuntimeRBAC focuses on role and permission management, while GuardController handles execution control and function schema management.

## 🚀 **Quick Start**

```typescript
import { RuntimeRBAC } from '@bloxchain/sdk/typescript'
import { createPublicClient, createWalletClient, http } from 'viem'
import { mainnet } from 'viem/chains'

// Initialize clients
const publicClient = createPublicClient({
  chain: mainnet,
  transport: http()
})

const walletClient = createWalletClient({
  account: privateKeyToAccount('0x...'),
  chain: mainnet,
  transport: http()
})

// Create RuntimeRBAC instance
const runtimeRBAC = new RuntimeRBAC(
  publicClient,
  walletClient,
  '0x...', // contract address
  mainnet
)
```

## 📖 **Core Features**

### **1. Role Management**

#### **Get Role Information**
```typescript
const role = await runtimeRBAC.getRole('0x...') // role hash
console.log('Role info:', {
  name: role.roleName,
  hash: role.roleHash,
  maxWallets: role.maxWallets,
  walletCount: role.walletCount,
  isProtected: role.isProtected
})
```

#### **Check Account Role**
```typescript
const hasRole = await runtimeRBAC.hasRole(
  '0x...', // role hash
  '0x...'  // account address
)
console.log('Account has role:', hasRole)
```

#### **Get Wallets in Role**
```typescript
const wallets = await runtimeRBAC.getWalletsInRole('0x...') // role hash
console.log('Wallets in role:', wallets)
```

#### **Get Roles for Wallet**
```typescript
const roles = await runtimeRBAC.getWalletRoles('0x...') // wallet address
console.log('Roles for wallet:', roles)
// Returns array of role hashes assigned to the wallet
// Uses reverse index for efficient O(n) lookup where n = wallet's role count
```

#### **Get Supported Roles**
```typescript
const roles = await runtimeRBAC.getSupportedRoles()
console.log('Supported roles:', roles)
```

### **2. Function Schema Management**

#### **Get Function Schema**
```typescript
const schema = await runtimeRBAC.getFunctionSchema('0xa9059cbb') // function selector
console.log('Function schema:', {
  signature: schema.functionSignature,
  selector: schema.functionSelector,
  operationType: schema.operationType,
  operationName: schema.operationName,
  supportedActionsBitmap: schema.supportedActionsBitmap,
  isProtected: schema.isProtected,
  handlerForSelectors: schema.handlerForSelectors
})
// Supported actions as array: EngineBlox.convertBitmapToActions(schema.supportedActionsBitmap)
```

#### **Check Function Schema Exists**
```typescript
const exists = await runtimeRBAC.functionSchemaExists('0xa9059cbb')
console.log('Function schema exists:', exists)
```

#### **Get Supported Functions**
```typescript
const functions = await runtimeRBAC.getSupportedFunctions()
console.log('Supported functions:', functions)
```

### **3. Permission Management**

#### **Get Active Role Permissions**
```typescript
const permissions = await runtimeRBAC.getActiveRolePermissions('0x...') // role hash
permissions.forEach(permission => {
  console.log('Permission:', {
    functionSelector: permission.functionSelector,
    grantedActionsBitmap: permission.grantedActionsBitmap,
    handlerForSelectors: permission.handlerForSelectors
  })
})
```

#### **Check Action Permission**
```typescript
const hasPermission = await runtimeRBAC.hasActionPermission(
  '0x...', // account address
  '0xa9059cbb', // function selector
  TxAction.EXECUTE_TIME_DELAY_REQUEST
)
console.log('Has action permission:', hasPermission)
```

#### **Check Action Supported by Function**
```typescript
const isSupported = await runtimeRBAC.isActionSupportedByFunction(
  '0xa9059cbb', // function selector
  TxAction.EXECUTE_TIME_DELAY_REQUEST
)
console.log('Action supported:', isSupported)
```

## 🔄 **Batch Configuration Workflow**

RuntimeRBAC uses batch configuration for all role and function management operations. This allows multiple changes to be applied atomically via meta-transactions.

### **Role Configuration Actions**

The batch system supports the following action types:

```typescript
enum RoleConfigActionType {
  CREATE_ROLE,
  REMOVE_ROLE,
  ADD_WALLET,
  REVOKE_WALLET,
  ADD_FUNCTION_TO_ROLE,
  REMOVE_FUNCTION_FROM_ROLE
}
```

**Note**: Function schema registration (REGISTER_FUNCTION/UNREGISTER_FUNCTION) has been moved to GuardController. See [GuardController documentation](./guard-controller.md) for function schema management.

### **Create Role via Batch**

```typescript
import { encodeAbiParameters } from 'viem'

// Define function permissions for the role
const functionPermissions = [
  {
    functionSelector: '0xa9059cbb', // transfer(address,uint256)
    grantedActionsBitmap: 0b000000111, // EXECUTE_TIME_DELAY_REQUEST, APPROVE, CANCEL
    handlerForSelectors: ['0x00000000'] // bytes4(0) for execution selector
  }
]

// Create batch action
const createRoleAction = {
  actionType: 'CREATE_ROLE',
  data: encodeAbiParameters(
    ['string', 'uint256', 'tuple[]'],
    [
      'TreasuryManager',
      5, // maxWallets
      functionPermissions
    ]
  )
}

// Create meta-transaction for batch
const metaTxParams = await runtimeRBAC.createMetaTxParams(
  contractAddress,
  '0x...', // roleConfigBatchRequestAndApprove selector
  TxAction.SIGN_META_REQUEST_AND_APPROVE,
  24n * 60n * 60n, // 24 hour deadline
  BigInt('50000000000'), // max gas price
  ownerAddress
)

const metaTx = await runtimeRBAC.generateUnsignedMetaTransactionForNew(
  ownerAddress,
  contractAddress,
  0n, // value
  0n, // gas limit
  keccak256('ROLE_CONFIG_BATCH'), // operation type
  '0x...', // executeRoleConfigBatch selector
  encodeAbiParameters(
    ['tuple[]'],
    [[createRoleAction]]
  ),
  metaTxParams
)

// Sign the meta-transaction
const signature = await walletClient.signMessage({
  message: { raw: metaTx.message },
  account: ownerAddress
})

// Execute via broadcaster
const txHash = await runtimeRBAC.roleConfigBatchRequestAndApprove(
  { ...metaTx, signature },
  { from: broadcasterAddress }
)
```

### **Add Wallet to Role via Batch**

```typescript
const addWalletAction = {
  actionType: RoleConfigActionType.ADD_WALLET,
  data: encodeAbiParameters(
    ['bytes32', 'address'],
    [roleHash, walletAddress]
  )
}

// Create and execute batch (similar to create role example)
```

### **Add Function Permission to Role via Batch**

**Note**: The function schema must be registered via GuardController before adding permissions.

```typescript
const addFunctionToRoleAction = {
  actionType: RoleConfigActionType.ADD_FUNCTION_TO_ROLE,
  data: encodeAbiParameters(
    ['bytes32', 'tuple'],
    [
      roleHash,
      {
        functionSelector: '0xa9059cbb',
        grantedActionsBitmap: 0b000000111,
        handlerForSelectors: ['0x00000000']
      }
    ]
  )
}

// Create and execute batch (similar to create role example)
```

## 📡 **Event Monitoring**

### **Listen for Role Configuration Events**

```typescript
// Role configuration applied
const unwatchRoleConfig = publicClient.watchContractEvent({
  address: contractAddress,
  abi: runtimeRBAC.abi,
  eventName: 'RoleConfigApplied',
  onLogs: (logs) => {
    logs.forEach(log => {
      console.log('Role config applied:', {
        actionType: log.args.actionType,
        roleHash: log.args.roleHash,
        functionSelector: log.args.functionSelector,
        data: log.args.data
      })
    })
  }
})

// Stop watching
unwatchRoleConfig()
```

## 🛡️ **Security Features**

### **1. Role Protection**

Protected roles (OWNER_ROLE, BROADCASTER_ROLE, RECOVERY_ROLE) cannot be removed:

```typescript
const role = await runtimeRBAC.getRole(roleHash)
if (role.isProtected) {
  console.log('This role is protected and cannot be removed')
}
```

### **2. Wallet Limits**

Roles have maximum wallet limits:

```typescript
const role = await runtimeRBAC.getRole(roleHash)
const wallets = await runtimeRBAC.getWalletsInRole(roleHash)

if (wallets.length >= role.maxWallets) {
  throw new Error('Role has reached maximum wallet limit')
}
```

### **3. Function-Level Permissions**

Fine-grained permission control with action-level permissions:

```typescript
// Check specific action permission
const canRequest = await runtimeRBAC.hasActionPermission(
  account,
  '0xa9059cbb', // transfer function selector
  TxAction.EXECUTE_TIME_DELAY_REQUEST
)

if (!canRequest) {
  throw new Error('Account does not have request permission')
}
```

### **4. Function Schema Protection**

Protected function schemas cannot be unregistered:

```typescript
const schema = await runtimeRBAC.getFunctionSchema(functionSelector)
if (schema.isProtected) {
  console.log('This function schema is protected and cannot be unregistered')
}
```

## 🔧 **Advanced Usage**

### **Batch Role Operations**

```typescript
// Create multiple roles in a single batch
const actions = [
  {
    actionType: 'CREATE_ROLE',
    data: encodeAbiParameters(
      ['string', 'uint256', 'tuple[]'],
      ['ADMIN_ROLE', 3, adminPermissions]
    )
  },
  {
    actionType: 'CREATE_ROLE',
    data: encodeAbiParameters(
      ['string', 'uint256', 'tuple[]'],
      ['MODERATOR_ROLE', 10, moderatorPermissions]
    )
  },
  {
    actionType: 'ADD_WALLET',
    data: encodeAbiParameters(
      ['bytes32', 'address'],
      [adminRoleHash, adminAddress]
    )
  }
]

// Execute batch via meta-transaction
```

### **Function Registration Workflow**

**Note**: Function schema registration is now handled by GuardController. Use GuardController's `guardConfigBatchRequestAndApprove` with the `REGISTER_FUNCTION` action.

```typescript
import { GuardController, GuardConfigActionType } from '@bloxchain/sdk/typescript'

// Step 1: Register function schema via GuardController
const registerAction = {
  actionType: GuardConfigActionType.REGISTER_FUNCTION,
  data: encodeAbiParameters(
    ['string', 'string', 'uint8[]'],
    [
      'withdraw(address,uint256)',
      'WITHDRAW_OPERATION',
      [TxAction.EXECUTE_TIME_DELAY_REQUEST, TxAction.EXECUTE_TIME_DELAY_APPROVE]
    ]
  )
}

// Execute via GuardController
await guardController.guardConfigBatchRequestAndApprove(metaTx, { from: broadcasterAddress })

// Step 2: Add function permission to role via RuntimeRBAC
const addPermissionAction = {
  actionType: RoleConfigActionType.ADD_FUNCTION_TO_ROLE,
  data: encodeAbiParameters(
    ['bytes32', 'tuple'],
    [
      roleHash,
      {
        functionSelector: '0x...', // withdraw selector
        grantedActionsBitmap: 0b000000011,
        handlerForSelectors: ['0x00000000']
      }
    ]
  )
}

// Execute via RuntimeRBAC
await runtimeRBAC.roleConfigBatchRequestAndApprove(metaTx, { from: broadcasterAddress })
```

## 🧪 **Testing**

### **Unit Testing**

```typescript
import { describe, it, expect } from 'vitest'

describe('RuntimeRBAC', () => {
  it('should return correct role information', async () => {
    const role = await runtimeRBAC.getRole(roleHash)
    expect(role.roleHash).toBe(roleHash)
    expect(role.maxWallets).toBeGreaterThan(0)
  })

  it('should check role membership', async () => {
    const hasRole = await runtimeRBAC.hasRole(roleHash, account)
    expect(typeof hasRole).toBe('boolean')
  })

  it('should get roles for wallet', async () => {
    const walletRoles = await runtimeRBAC.getWalletRoles(account)
    expect(Array.isArray(walletRoles)).toBe(true)
  })

  it('should get wallets in role', async () => {
    const wallets = await runtimeRBAC.getWalletsInRole(roleHash)
    expect(Array.isArray(wallets)).toBe(true)
  })
})
```

### **Integration Testing**

```typescript
describe('RuntimeRBAC Integration', () => {
  it('should complete role creation workflow', async () => {
    // Create role via batch
    const createAction = {
      actionType: 'CREATE_ROLE',
      data: encodeAbiParameters(
        ['string', 'uint256', 'tuple[]'],
        ['TEST_ROLE', 5, []]
      )
    }

    // Execute batch via meta-transaction
    const txHash = await runtimeRBAC.roleConfigBatchRequestAndApprove(
      metaTx,
      { from: broadcasterAddress }
    )

    // Verify role exists
    const role = await runtimeRBAC.getRole(roleHash)
    expect(role.roleName).toBe('TEST_ROLE')
  })
})
```

## 🚨 **Common Issues**

### **Issue: "Role is protected"**
**Solution**: Protected roles (OWNER_ROLE, BROADCASTER_ROLE, RECOVERY_ROLE) cannot be removed. Use a different role or create a new one.

### **Issue: "Role has reached maximum wallet limit"**
**Solution**: Increase the role's wallet limit or revoke roles from other accounts before adding new ones.

### **Issue: "Function schema not found"**
**Solution**: Register the function schema via GuardController before adding it to a role. Use GuardController's `guardConfigBatchRequestAndApprove` with `REGISTER_FUNCTION` action.

### **Issue: "Insufficient permissions"**
**Solution**: Ensure the account has the required role and function permissions. Check with `hasActionPermission`.

### **Issue: "Invalid role hash"**
**Solution**: Use the correct role hash. Generate it using `keccak256(abi.encodePacked(roleName))`.

### **Issue: "Handler selector mismatch"**
**Solution**: Ensure `handlerForSelectors` array in function permission matches the function schema's `handlerForSelectors` array. Use `bytes4(0)` for execution selectors.

## 📚 **Related Documentation**

- [API Reference](./api-reference.md) - Complete API documentation
- [SecureOwnable Guide](./secure-ownable.md) - Base contract functionality
- [State Machine Engine](./state-machine-engine.md) - State machine architecture
- [Best Practices](./best-practices.md) - Development guidelines

---
