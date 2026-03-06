# Basic Examples

This guide provides practical examples using the Bloxchain TypeScript SDK. Contract API is defined by the Solidity source; see [docs/](../../docs/) for generated API.

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
import { SecureOwnable, RuntimeRBAC } from '@bloxchain/sdk'

// SecureOwnable contract
const secureOwnable = new SecureOwnable(
  publicClient,
  walletClient,
  '0x...', // contract address
  mainnet
)

// RuntimeRBAC contract
const runtimeRBAC = new RuntimeRBAC(
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

// Get administrative addresses (array for broadcasters)
const broadcasters = await secureOwnable.getBroadcasters()
const recovery = await secureOwnable.getRecovery()

console.log('Broadcasters:', broadcasters, 'Recovery:', recovery)

// Check initialization status
const isInit = await secureOwnable.initialized()
console.log('Contract initialized:', isInit)
```

### **Ownership Transfer Workflow**

```typescript
async function transferOwnership(txIdForApproval: bigint) {
  try {
    // Step 1: Request ownership transfer (no new-owner arg; set when tx is executed)
    const requestResult = await secureOwnable.transferOwnershipRequest(
      { from: account.address }
    )
    console.log('Request transaction:', requestResult)

    const receipt = await publicClient.waitForTransactionReceipt({ hash: requestResult.hash })
    const timeLockPeriod = await secureOwnable.getTimeLockPeriodSec()

    await new Promise(resolve => setTimeout(resolve, Number(timeLockPeriod) * 1000))

    // Step 4: Approve ownership transfer (txId from getPendingTransactions / events)
    const approveResult = await secureOwnable.transferOwnershipDelayedApproval(
      txIdForApproval,
      { from: account.address }
    )
    console.log('Approval transaction:', approveResult)

    const newOwnerAddress = await secureOwnable.owner()
    console.log('New owner:', newOwnerAddress)
  } catch (error) {
    console.error('Ownership transfer failed:', error instanceof Error ? error.message : error)
  }
}
```

### **Administrative Updates**

```typescript
// Update broadcaster (time-delay workflow): pass new address and index in broadcaster set
async function updateBroadcaster(newBroadcaster: Address, locationIndex: bigint) {
  try {
    const result = await secureOwnable.updateBroadcasterRequest(
      newBroadcaster,
      locationIndex,
      { from: account.address }
    )
    console.log('Broadcaster update requested:', result.hash)
    const receipt = await publicClient.waitForTransactionReceipt({ hash: result.hash })
    if (receipt.status === 'success') console.log('✅ Broadcaster update successful')
  } catch (error) {
    console.error('Broadcaster update failed:', error instanceof Error ? error.message : error)
  }
}

// Update recovery: requires signed meta-transaction (owner signs, broadcaster submits)
async function updateRecovery(signedMetaTx: MetaTransaction) {
  try {
    const result = await secureOwnable.updateRecoveryRequestAndApprove(
      signedMetaTx,
      { from: broadcasterAddress }
    )
    console.log('Recovery update completed:', result.hash)
  } catch (error) {
    console.error('Recovery update failed:', error instanceof Error ? error.message : error)
  }
}

// Update time lock period: requires signed meta-transaction
async function updateTimeLock(signedMetaTx: MetaTransaction) {
  try {
    const result = await secureOwnable.updateTimeLockRequestAndApprove(
      signedMetaTx,
      { from: broadcasterAddress }
    )
    console.log('Time lock update completed:', result.hash)
    const updatedPeriod = await secureOwnable.getTimeLockPeriodSec()
    console.log('New time lock period:', updatedPeriod, 'seconds')
  } catch (error) {
    console.error('Time lock update failed:', error instanceof Error ? error.message : error)
  }
}

## 🔐 **RuntimeRBAC Examples**

### **Role Management**

```typescript
// Get role information
async function getRoleInfo(roleHash: string) {
  try {
    const role = await runtimeRBAC.getRole(roleHash)
    console.log('Role information:', {
      name: role.roleName,
      hash: role.roleHashReturn,
      maxWallets: role.maxWallets,
      walletCount: role.walletCount,
      isProtected: role.isProtected
    })
    return role
  } catch (error) {
    console.error('Failed to get role info:', error.message)
  }
}

// Check role membership
async function checkRoleMembership(roleHash: string, account: Address) {
  try {
    const hasRole = await runtimeRBAC.hasRole(roleHash, account)
    console.log(`Account ${account} has role ${roleHash}:`, hasRole)
    return hasRole
  } catch (error) {
    console.error('Failed to check role membership:', error.message)
  }
}

// Get authorized wallets in a role
async function getAuthorizedWallets(roleHash: string) {
  try {
    const wallets = await runtimeRBAC.getAuthorizedWallets(roleHash)
    console.log(`Authorized wallets in role ${roleHash}:`, wallets)
    return wallets
  } catch (error) {
    console.error('Failed to get authorized wallets in role:', error.message)
  }
}

// Get roles for a wallet
async function getWalletRoles(wallet: Address) {
  try {
    const roles = await runtimeRBAC.getWalletRoles(wallet)
    console.log(`Roles for wallet ${wallet}:`, roles)
    return roles
  } catch (error) {
    console.error('Failed to get wallet roles:', error.message)
  }
}

// Get supported roles
async function getSupportedRoles() {
  try {
    const roles = await runtimeRBAC.getSupportedRoles()
    console.log('Supported roles:', roles)
    return roles
  } catch (error) {
    console.error('Failed to get supported roles:', error.message)
  }
}

// Usage
await getRoleInfo('0x...') // role hash
await checkRoleMembership('0x...', '0x...') // role hash, account
await getAuthorizedWallets('0x...') // role hash
await getWalletRoles('0x...') // wallet address
await getSupportedRoles()
```




```

## 🔍 **Definitions Examples**

### **Basic Setup**

```typescript
import { Definitions } from '@bloxchain/sdk/typescript'

// Initialize Definitions
const definitions = new Definitions(
  publicClient,
  walletClient,
  '0x1234...', // Definition contract address
  mainnet
)
```

### **Getting Function Schemas**

```typescript
const functionSchemas = await definitions.getFunctionSchemas()
console.log('Function schemas:', functionSchemas.length)
functionSchemas.forEach(schema => {
  console.log(`- ${schema.functionSignature}: ${schema.functionSelector}`)
})
```

### **Getting Role Permissions**

```typescript
const rolePermissions = await definitions.getRolePermissions()
console.log('Role hashes:', rolePermissions.roleHashes.length)
console.log('Function permissions:', rolePermissions.functionPermissions.length)
```

### **Utility Methods**

```typescript
// Find operation type by name
const operationType = await definitions.getOperationTypeByName('TRANSFER_OWNERSHIP')

// Get function schema by selector
const schema = await definitions.getFunctionSchemaBySelector('0xa9059cbb')

// Check if role has permission for function
const hasPermission = await definitions.hasRolePermission(roleHash, functionSelector)

// Get roles that can execute a function
const roles = await definitions.getRolesForFunction('0xa9059cbb')
```

### **Configuration**

```typescript
const config = definitions.getConfig()
definitions.updateConfig({ chainId: 137 })
```

## 📡 **Event Monitoring Examples**

Contracts emit **`ComponentEvent(bytes4 functionSelector, bytes data)`**. Decode `data` based on `functionSelector`. See [contract API](../../docs/) for payload layouts.

### **SecureOwnable / RuntimeRBAC Events**

```typescript
const unwatch = publicClient.watchContractEvent({
  address: contractAddress,
  abi: secureOwnable.abi,
  eventName: 'ComponentEvent',
  onLogs: (logs) => {
    logs.forEach(log => {
      console.log('ComponentEvent', log.args.functionSelector, log.args.data)
      // Decode log.args.data with abi.decode for the selector
    })
  }
})
unwatch()
```

## 🧪 **Complete Example: Contract Manager**

```typescript
class BloxchainContractManager {
  private secureOwnable: SecureOwnable
  private runtimeRBAC: RuntimeRBAC

  constructor(
    publicClient: PublicClient,
    walletClient: WalletClient | undefined,
    secureOwnableAddress: Address,
    runtimeRBACAddress: Address,
    chain: Chain
  ) {
    this.secureOwnable = new SecureOwnable(
      publicClient,
      walletClient,
      secureOwnableAddress,
      chain
    )
    this.runtimeRBAC = new RuntimeRBAC(
      publicClient,
      walletClient,
      runtimeRBACAddress,
      chain
    )
  }

  async getStatus() {
    const [owner, timeLock, supportedRoles] = await Promise.all([
      this.secureOwnable.owner(),
      this.secureOwnable.getTimeLockPeriodSec(),
      this.runtimeRBAC.getSupportedRoles()
    ])
    return {
      owner,
      timeLockPeriod: timeLock,
      supportedRolesCount: supportedRoles.length
    }
  }

  async transferOwnership() {
    const result = await this.secureOwnable.transferOwnershipRequest({ from: account.address })
    return result.hash
  }
}

const manager = new BloxchainContractManager(
  publicClient,
  walletClient,
  '0x...',
  '0x...',
  mainnet
)
const status = await manager.getStatus()
const txHash = await manager.transferOwnership()
```

---

**Next:** [runtime-rbac.md](./runtime-rbac.md) · [guard-controller.md](./guard-controller.md) · [CODEBASE_DOCUMENTATION.md](../../CODEBASE_DOCUMENTATION.md)
