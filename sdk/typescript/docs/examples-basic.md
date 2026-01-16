# Basic Examples

This guide provides practical examples of using the Guardian TypeScript SDK for common scenarios.

## 🚀 **Setup Examples**

### **Basic Client Setup**

```typescript
import { createPublicClient, createWalletClient, http } from 'viem'
import { mainnet, goerli } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'

// Public client for read operations
const publicClient = createPublicClient({
  chain: mainnet,
  transport: http('https://eth-mainnet.alchemyapi.io/v2/your-api-key')
})

// Wallet client for write operations
const account = privateKeyToAccount('0x...') // Your private key
const walletClient = createWalletClient({
  account,
  chain: mainnet,
  transport: http('https://eth-mainnet.alchemyapi.io/v2/your-api-key')
})

// Testnet setup
const testnetClient = createPublicClient({
  chain: goerli,
  transport: http('https://eth-goerli.alchemyapi.io/v2/your-api-key')
})
```

### **Contract Instance Creation**

```typescript
import { SecureOwnable, DynamicRBAC } from '@guardian/sdk/typescript'

// SecureOwnable contract
const secureOwnable = new SecureOwnable(
  publicClient,
  walletClient,
  '0x...', // contract address
  mainnet
)

// DynamicRBAC contract
const dynamicRBAC = new DynamicRBAC(
  publicClient,
  walletClient,
  '0x...', // contract address
  mainnet
)

// Read-only instance (no wallet client)
const readOnlySecureOwnable = new SecureOwnable(
  publicClient,
  undefined, // no wallet client
  '0x...',
  mainnet
)
```

## 📖 **SecureOwnable Examples**

### **Reading Contract State**

```typescript
// Get contract owner
const owner = await secureOwnable.owner()
console.log('Contract owner:', owner)

// Get time lock period
const timeLockPeriod = await secureOwnable.getTimeLockPeriodSec()
console.log('Time lock period:', timeLockPeriod, 'seconds')

// Get administrative addresses
const broadcaster = await secureOwnable.broadcaster()
const recovery = await secureOwnable.recovery()
const eventForwarder = await secureOwnable.eventForwarder()

console.log('Broadcaster:', broadcaster)
console.log('Recovery:', recovery)
console.log('Event forwarder:', eventForwarder)

// Check initialization status
const isInitialized = await secureOwnable.isInitialized()
console.log('Contract initialized:', isInitialized)
```

### **Ownership Transfer Workflow**

```typescript
async function transferOwnership(newOwner: Address) {
  try {
    console.log('Starting ownership transfer workflow...')
    
    // Step 1: Request ownership transfer
    console.log('Step 1: Requesting ownership transfer...')
    const requestTx = await secureOwnable.transferOwnershipRequest(
      newOwner,
      { from: account.address }
    )
    console.log('Request transaction:', requestTx)
    
    // Step 2: Wait for transaction confirmation
    console.log('Step 2: Waiting for confirmation...')
    const receipt = await publicClient.waitForTransactionReceipt({ 
      hash: requestTx 
    })
    console.log('Request confirmed:', receipt.status)
    
    // Step 3: Wait for time lock period
    console.log('Step 3: Waiting for time lock period...')
    const timeLockPeriod = await secureOwnable.getTimeLockPeriodSec()
    console.log(`Waiting ${timeLockPeriod} seconds...`)
    
    await new Promise(resolve => 
      setTimeout(resolve, Number(timeLockPeriod) * 1000)
    )
    
    // Step 4: Approve ownership transfer
    console.log('Step 4: Approving ownership transfer...')
    const approveTx = await secureOwnable.transferOwnershipDelayedApproval(
      1n, // transaction ID (get from events)
      { from: account.address }
    )
    console.log('Approval transaction:', approveTx)
    
    // Step 5: Verify new owner
    console.log('Step 5: Verifying new owner...')
    const newOwnerAddress = await secureOwnable.owner()
    console.log('New owner:', newOwnerAddress)
    
    if (newOwnerAddress.toLowerCase() === newOwner.toLowerCase()) {
      console.log('✅ Ownership transfer completed successfully!')
    } else {
      console.log('❌ Ownership transfer failed')
    }
    
  } catch (error) {
    console.error('Ownership transfer failed:', error.message)
  }
}

// Usage
await transferOwnership('0x...') // new owner address
```

### **Administrative Updates**

```typescript
// Update broadcaster (time-delay workflow)
async function updateBroadcaster(newBroadcaster: Address) {
  try {
    console.log('Updating broadcaster...')
    
    const txHash = await secureOwnable.updateBroadcasterRequest(
      newBroadcaster,
      { from: account.address }
    )
    
    console.log('Broadcaster update requested:', txHash)
    
    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ 
      hash: txHash 
    })
    
    if (receipt.status === 'success') {
      console.log('✅ Broadcaster update successful')
    } else {
      console.log('❌ Broadcaster update failed')
    }
    
  } catch (error) {
    console.error('Broadcaster update failed:', error.message)
  }
}

// Update recovery (immediate approval)
async function updateRecovery(newRecovery: Address) {
  try {
    console.log('Updating recovery address...')
    
    const txHash = await secureOwnable.updateRecoveryRequestAndApprove(
      newRecovery,
      { from: account.address }
    )
    
    console.log('Recovery update completed:', txHash)
    
    // Wait for confirmation
    const receipt = await publicClient.waitForTransactionReceipt({ 
      hash: txHash 
    })
    
    if (receipt.status === 'success') {
      console.log('✅ Recovery update successful')
    } else {
      console.log('❌ Recovery update failed')
    }
    
  } catch (error) {
    console.error('Recovery update failed:', error.message)
  }
}

// Update time lock period (immediate approval)
async function updateTimeLock(newPeriod: bigint) {
  try {
    console.log('Updating time lock period...')
    
    const txHash = await secureOwnable.updateTimeLockRequestAndApprove(
      newPeriod,
      { from: account.address }
    )
    
    console.log('Time lock update completed:', txHash)
    
    // Verify update
    const updatedPeriod = await secureOwnable.getTimeLockPeriodSec()
    console.log('New time lock period:', updatedPeriod, 'seconds')
    
  } catch (error) {
    console.error('Time lock update failed:', error.message)
  }
}

// Usage
await updateBroadcaster('0x...') // new broadcaster
await updateRecovery('0x...')     // new recovery
await updateTimeLock(7200n)       // 2 hours
```

## 🔐 **DynamicRBAC Examples**

### **Role Management**

```typescript
// Check role editing status
async function checkRoleEditing() {
  const enabled = await dynamicRBAC.roleEditingEnabled()
  console.log('Role editing enabled:', enabled)
  return enabled
}

// Toggle role editing
async function toggleRoleEditing(enabled: boolean) {
  try {
    console.log(`${enabled ? 'Enabling' : 'Disabling'} role editing...`)
    
    const txHash = await dynamicRBAC.updateRoleEditingToggleRequestAndApprove(
      enabled,
      { from: account.address }
    )
    
    console.log('Role editing toggle completed:', txHash)
    
    // Verify change
    const newStatus = await dynamicRBAC.roleEditingEnabled()
    console.log('New role editing status:', newStatus)
    
  } catch (error) {
    console.error('Role editing toggle failed:', error.message)
  }
}

// Get role information
async function getRoleInfo(roleHash: string) {
  try {
    const role = await dynamicRBAC.getRole(roleHash)
    console.log('Role information:', {
      name: role.name,
      hash: role.hash,
      maxWallets: role.maxWallets,
      isProtected: role.isProtected
    })
    return role
  } catch (error) {
    console.error('Failed to get role info:', error.message)
  }
}

// Check role membership
async function checkRoleMembership(account: Address, roleHash: string) {
  try {
    const hasRole = await dynamicRBAC.hasRole(account, roleHash)
    console.log(`Account ${account} has role ${roleHash}:`, hasRole)
    return hasRole
  } catch (error) {
    console.error('Failed to check role membership:', error.message)
  }
}

// Get role count
async function getRoleCount() {
  try {
    const count = await dynamicRBAC.getRoleCount()
    console.log('Total roles:', count)
    return count
  } catch (error) {
    console.error('Failed to get role count:', error.message)
  }
}

// Usage
await checkRoleEditing()
await toggleRoleEditing(true)
await getRoleInfo('0x...') // role hash
await checkRoleMembership('0x...', '0x...') // account, role hash
await getRoleCount()
```




```

## 🔍 **Definitions Examples**

### **Basic Setup**

```typescript
import { Definitions } from '@guardian/sdk/typescript'

// Initialize Definitions
const definitions = new Definitions(
  publicClient,
  walletClient,
  '0x1234...', // Definition contract address
  mainnet
)
```

### **Getting Operation Types**

```typescript
// Get all available operation types
async function getOperationTypes() {
  try {
    const operationTypes = await definitions.getOperationTypes()
    
    console.log('Available operations:')
    operationTypes.forEach(op => {
      console.log(`- ${op.name}: ${op.operationType}`)
    })
    
    return operationTypes
  } catch (error) {
    console.error('Failed to get operation types:', error)
    throw error
  }
}

// Usage
const operations = await getOperationTypes()
```

### **Getting Function Schemas**

```typescript
// Get all function schemas
async function getFunctionSchemas() {
  try {
    const functionSchemas = await definitions.getFunctionSchemas()
    
    console.log('Function schemas:')
    functionSchemas.forEach(schema => {
      console.log(`- ${schema.functionSignature}: ${schema.functionSelector}`)
      console.log(`  Parameters: ${schema.parameters.join(', ')}`)
      console.log(`  Returns: ${schema.returnTypes.join(', ')}`)
      console.log(`  Description: ${schema.description}`)
    })
    
    return functionSchemas
  } catch (error) {
    console.error('Failed to get function schemas:', error)
    throw error
  }
}

// Usage
const schemas = await getFunctionSchemas()
```

### **Getting Role Permissions**

```typescript
// Get role permissions
async function getRolePermissions() {
  try {
    const rolePermissions = await definitions.getRolePermissions()
    
    console.log('Role permissions:')
    console.log(`Total roles: ${rolePermissions.roleHashes.length}`)
    console.log(`Total function permissions: ${rolePermissions.functionPermissions.length}`)
    
    rolePermissions.functionPermissions.forEach(permission => {
      console.log(`Function: ${permission.functionSelector}`)
      console.log(`Allowed roles: ${permission.allowedRoles.length}`)
      console.log(`Requires signature: ${permission.requiresSignature}`)
      console.log(`Off-chain: ${permission.isOffChain}`)
    })
    
    return rolePermissions
  } catch (error) {
    console.error('Failed to get role permissions:', error)
    throw error
  }
}

// Usage
const permissions = await getRolePermissions()
```

### **Getting Workflows**

```typescript
// Get all operation workflows
async function getOperationWorkflows() {
  try {
    const workflows = await definitions.getOperationWorkflows()
    
    console.log('Operation workflows:')
    workflows.forEach(workflow => {
      console.log(`- ${workflow.operationName}: ${workflow.paths.length} paths`)
      workflow.paths.forEach(path => {
        console.log(`  - ${path.name}: ${path.steps.length} steps`)
        console.log(`    Estimated time: ${path.estimatedTimeSec}s`)
        console.log(`    Requires signature: ${path.requiresSignature}`)
        console.log(`    Has off-chain phase: ${path.hasOffChainPhase}`)
      })
    })
    
    return workflows
  } catch (error) {
    console.error('Failed to get operation workflows:', error)
    throw error
  }
}

// Usage
const workflows = await getOperationWorkflows()
```

### **Getting Workflow for Specific Operation**

```typescript
// Get workflow for specific operation
async function getWorkflowForOperation(operationType: Hex) {
  try {
    const workflow = await definitions.getWorkflowForOperation(operationType)
    
    console.log(`Workflow for operation: ${workflow.operationName}`)
    console.log(`Operation type: ${workflow.operationType}`)
    console.log(`Supported roles: ${workflow.supportedRoles.join(', ')}`)
    console.log(`Available paths: ${workflow.paths.length}`)
    
    workflow.paths.forEach((path, index) => {
      console.log(`\nPath ${index + 1}: ${path.name}`)
      console.log(`Description: ${path.description}`)
      console.log(`Workflow type: ${path.workflowType}`)
      console.log(`Steps: ${path.steps.length}`)
      
      path.steps.forEach((step, stepIndex) => {
        console.log(`  ${stepIndex + 1}. ${step.functionName}`)
        console.log(`     Action: ${step.action}`)
        console.log(`     Roles: ${step.roles.join(', ')}`)
        console.log(`     Off-chain: ${step.isOffChain}`)
        console.log(`     Phase: ${step.phaseType}`)
      })
    })
    
    return workflow
  } catch (error) {
    console.error('Failed to get workflow for operation:', error)
    throw error
  }
}

// Usage
const workflow = await getWorkflowForOperation('0x1234...')
```

### **Utility Functions**

```typescript
// Find operation type by name
async function findOperationByName(operationName: string) {
  try {
    const operationType = await definitions.getOperationTypeByName(operationName)
    
    if (operationType) {
      console.log(`Found operation: ${operationName} -> ${operationType}`)
      return operationType
    } else {
      console.log(`Operation not found: ${operationName}`)
      return undefined
    }
  } catch (error) {
    console.error('Failed to find operation by name:', error)
    throw error
  }
}

// Get function schema by selector
async function getFunctionBySelector(functionSelector: Hex) {
  try {
    const schema = await definitions.getFunctionSchemaBySelector(functionSelector)
    
    if (schema) {
        console.log(`Found function: ${schema.functionSignature}`)
      console.log(`Parameters: ${schema.parameters.join(', ')}`)
      console.log(`Returns: ${schema.returnTypes.join(', ')}`)
      return schema
    } else {
      console.log(`Function not found: ${functionSelector}`)
      return undefined
    }
  } catch (error) {
    console.error('Failed to get function by selector:', error)
    throw error
  }
}

// Check role permission
async function checkRolePermission(roleHash: Hex, functionSelector: Hex) {
  try {
    const hasPermission = await definitions.hasRolePermission(roleHash, functionSelector)
    
    console.log(`Role ${roleHash} has permission for function ${functionSelector}: ${hasPermission}`)
    return hasPermission
  } catch (error) {
    console.error('Failed to check role permission:', error)
    throw error
  }
}

// Get roles for function
async function getRolesForFunction(functionSelector: Hex) {
  try {
    const allowedRoles = await definitions.getRolesForFunction(functionSelector)
    
    console.log(`Function ${functionSelector} can be executed by ${allowedRoles.length} roles:`)
    allowedRoles.forEach(roleHash => {
      console.log(`- ${roleHash}`)
    })
    
    return allowedRoles
  } catch (error) {
    console.error('Failed to get roles for function:', error)
    throw error
  }
}

// Usage examples
const operationType = await findOperationByName('TRANSFER_OWNERSHIP')
const schema = await getFunctionBySelector('0xabcd...')
const hasPermission = await checkRolePermission('0xefgh...', '0xabcd...')
const allowedRoles = await getRolesForFunction('0xabcd...')
```

### **Configuration Management**

```typescript
// Get current configuration
function getCurrentConfig() {
  const config = definitions.getConfig()
  console.log('Current configuration:', config)
  return config
}

// Update configuration
function updateConfig() {
  definitions.updateConfig({
    chainId: 137, // Polygon
    rpcUrl: 'https://polygon-rpc.com'
  })
  
  console.log('Configuration updated')
}

// Usage
const currentConfig = getCurrentConfig()
updateConfig()
```

### **Complete Workflow Analysis**

```typescript
// Analyze complete workflow
async function analyzeWorkflow(operationType: Hex) {
  try {
    const workflow = await definitions.getWorkflowForOperation(operationType)
    
    const analysis = {
      operationName: workflow.operationName,
      operationType: workflow.operationType,
      totalPaths: workflow.paths.length,
      totalSteps: workflow.paths.reduce((sum, path) => sum + path.steps.length, 0),
      averageStepsPerPath: 0,
      hasOffChainSteps: workflow.paths.some(path => path.hasOffChainPhase),
      requiresSignature: workflow.paths.some(path => path.requiresSignature),
      supportedRoles: workflow.supportedRoles.length
    }
    
    analysis.averageStepsPerPath = analysis.totalSteps / analysis.totalPaths
    
    console.log('Workflow Analysis:', analysis)
    return analysis
  } catch (error) {
    console.error('Failed to analyze workflow:', error)
    throw error
  }
}

// Usage
const analysis = await analyzeWorkflow('0x1234...')
```

### **Permission Matrix**

```typescript
// Build permission matrix
async function buildPermissionMatrix() {
  try {
    const rolePermissions = await definitions.getRolePermissions()
    const functionSchemas = await definitions.getFunctionSchemas()
    
    const matrix = new Map<string, Map<string, boolean>>()
    
    // Initialize matrix
    rolePermissions.roleHashes.forEach(roleHash => {
      matrix.set(roleHash, new Map())
      functionSchemas.forEach(schema => {
        matrix.get(roleHash)!.set(schema.functionSelector, false)
      })
    })
    
    // Fill matrix
    rolePermissions.functionPermissions.forEach(permission => {
      permission.allowedRoles.forEach(roleHash => {
        matrix.get(roleHash)?.set(permission.functionSelector, true)
      })
    })
    
    console.log('Permission Matrix:')
    matrix.forEach((rolePermissions, roleHash) => {
      console.log(`Role: ${roleHash}`)
      rolePermissions.forEach((hasPermission, functionSelector) => {
        console.log(`  ${functionSelector}: ${hasPermission}`)
      })
    })
    
    return matrix
  } catch (error) {
    console.error('Failed to build permission matrix:', error)
    throw error
  }
}

// Usage
const permissionMatrix = await buildPermissionMatrix()
```

## 📡 **Event Monitoring Examples**

### **SecureOwnable Events**

```typescript
// Monitor ownership transfer events
async function monitorOwnershipEvents(contractAddress: Address) {
  console.log('Monitoring ownership transfer events...')
  
  // Ownership transfer requested
  const unwatchRequest = publicClient.watchContractEvent({
    address: contractAddress,
    abi: secureOwnable.abi,
    eventName: 'OwnershipTransferRequested',
    onLogs: (logs) => {
      logs.forEach(log => {
        console.log('Ownership Transfer Requested:', {
          from: log.args.from,
          to: log.args.to,
          txId: log.args.txId,
          releaseTime: new Date(Number(log.args.releaseTime) * 1000)
        })
      })
    }
  })
  
  // Ownership transfer approved
  const unwatchApproval = publicClient.watchContractEvent({
    address: contractAddress,
    abi: secureOwnable.abi,
    eventName: 'OwnershipTransferApproved',
    onLogs: (logs) => {
      logs.forEach(log => {
        console.log('Ownership Transfer Approved:', {
          txId: log.args.txId,
          newOwner: log.args.newOwner
        })
      })
    }
  })
  
  // Return cleanup function
  return () => {
    unwatchRequest()
    unwatchApproval()
  }
}

// Monitor administrative events
async function monitorAdminEvents(contractAddress: Address) {
  console.log('Monitoring administrative events...')
  
  // Broadcaster updated
  const unwatchBroadcaster = publicClient.watchContractEvent({
    address: contractAddress,
    abi: secureOwnable.abi,
    eventName: 'BroadcasterUpdated',
    onLogs: (logs) => {
      logs.forEach(log => {
        console.log('Broadcaster Updated:', {
          oldBroadcaster: log.args.oldBroadcaster,
          newBroadcaster: log.args.newBroadcaster
        })
      })
    }
  })
  
  // Recovery updated
  const unwatchRecovery = publicClient.watchContractEvent({
    address: contractAddress,
    abi: secureOwnable.abi,
    eventName: 'RecoveryUpdated',
    onLogs: (logs) => {
      logs.forEach(log => {
        console.log('Recovery Updated:', {
          oldRecovery: log.args.oldRecovery,
          newRecovery: log.args.newRecovery
        })
      })
    }
  })
  
  // Time lock updated
  const unwatchTimeLock = publicClient.watchContractEvent({
    address: contractAddress,
    abi: secureOwnable.abi,
    eventName: 'TimeLockUpdated',
    onLogs: (logs) => {
      logs.forEach(log => {
        console.log('Time Lock Updated:', {
          oldPeriod: log.args.oldPeriod,
          newPeriod: log.args.newPeriod
        })
      })
    }
  })
  
  return () => {
    unwatchBroadcaster()
    unwatchRecovery()
    unwatchTimeLock()
  }
}

// Usage
const stopOwnershipMonitoring = await monitorOwnershipEvents('0x...')
const stopAdminMonitoring = await monitorAdminEvents('0x...')

// Stop monitoring after 5 minutes
setTimeout(() => {
  stopOwnershipMonitoring()
  stopAdminMonitoring()
  console.log('Event monitoring stopped')
}, 5 * 60 * 1000)
```

### **DynamicRBAC Events**

```typescript
// Monitor role events
async function monitorRoleEvents(contractAddress: Address) {
  console.log('Monitoring role events...')
  
  // Role created
  const unwatchRoleCreated = publicClient.watchContractEvent({
    address: contractAddress,
    abi: dynamicRBAC.abi,
    eventName: 'RoleCreated',
    onLogs: (logs) => {
      logs.forEach(log => {
        console.log('Role Created:', {
          roleHash: log.args.roleHash,
          roleName: log.args.roleName,
          maxWallets: log.args.maxWallets
        })
      })
    }
  })
  
  // Role granted
  const unwatchRoleGranted = publicClient.watchContractEvent({
    address: contractAddress,
    abi: dynamicRBAC.abi,
    eventName: 'RoleGranted',
    onLogs: (logs) => {
      logs.forEach(log => {
        console.log('Role Granted:', {
          roleHash: log.args.roleHash,
          account: log.args.account,
          granter: log.args.granter
        })
      })
    }
  })
  
  // Role revoked
  const unwatchRoleRevoked = publicClient.watchContractEvent({
    address: contractAddress,
    abi: dynamicRBAC.abi,
    eventName: 'RoleRevoked',
    onLogs: (logs) => {
      logs.forEach(log => {
        console.log('Role Revoked:', {
          roleHash: log.args.roleHash,
          account: log.args.account,
          revoker: log.args.revoker
        })
      })
    }
  })
  
  return () => {
    unwatchRoleCreated()
    unwatchRoleGranted()
    unwatchRoleRevoked()
  }
}

// Usage
const stopRoleMonitoring = await monitorRoleEvents('0x...')
```

## 🧪 **Complete Example: Contract Manager**

```typescript
class GuardianContractManager {
  private secureOwnable: SecureOwnable
  private dynamicRBAC: DynamicRBAC

  constructor(
    publicClient: PublicClient,
    walletClient: WalletClient | undefined,
    secureOwnableAddress: Address,
    dynamicRBACAddress: Address,
    chain: Chain
  ) {
    this.secureOwnable = new SecureOwnable(
      publicClient,
      walletClient,
      secureOwnableAddress,
      chain
    )
    
    this.dynamicRBAC = new DynamicRBAC(
      publicClient,
      walletClient,
      dynamicRBACAddress,
      chain
    )
    
  }

  // Get contract status
  async getStatus() {
    const [owner, timeLock, roleEditing] = await Promise.all([
      this.secureOwnable.owner(),
      this.secureOwnable.getTimeLockPeriodSec(),
      this.dynamicRBAC.roleEditingEnabled()
    ])

    return {
      owner,
      timeLockPeriod: timeLock,
      roleEditingEnabled: roleEditing
    }
  }


  // Transfer ownership
  async transferOwnership(newOwner: Address) {
    console.log('Starting ownership transfer...')
    
    const txHash = await this.secureOwnable.transferOwnershipRequest(newOwner)
    console.log('Ownership transfer requested:', txHash)
    
    return txHash
  }
}

// Usage
const manager = new GuardianContractManager(
  publicClient,
  walletClient,
  '0x...', // SecureOwnable address
  '0x...', // DynamicRBAC address
  mainnet
)

// Get status
const status = await manager.getStatus()
console.log('Contract Status:', status)

// Analyze contracts
const analyses = await manager.analyzeContracts()
console.log('Contract Analyses:', analyses)

// Transfer ownership
const txHash = await manager.transferOwnershipWithAnalysis('0x...')
console.log('Transfer completed:', txHash)
```

---

**Ready for advanced examples?** Check out [Advanced Examples](./examples-advanced.md) for complex scenarios and integrations.
