# API Reference

Complete reference for all Guardian TypeScript SDK classes, methods, and types.

## 📚 **Core Classes**

### **SecureOwnable**

The `SecureOwnable` class provides type-safe access to SecureOwnable contracts.

#### **Constructor**

```typescript
constructor(
  client: PublicClient,
  walletClient?: WalletClient,
  contractAddress: Address,
  chain: Chain
)
```

**Parameters:**
- `client`: Viem public client for read operations
- `walletClient`: Optional wallet client for write operations
- `contractAddress`: Address of the deployed contract
- `chain`: Chain configuration

#### **Read Methods**

##### `owner(): Promise<Address>`
Returns the current owner of the contract.

```typescript
const owner = await secureOwnable.owner()
```

##### `getTimeLockPeriodSec(): Promise<bigint>`
Returns the time lock period in seconds.

```typescript
const period = await secureOwnable.getTimeLockPeriodSec()
```

##### `broadcaster(): Promise<Address>`
Returns the current broadcaster address.

```typescript
const broadcaster = await secureOwnable.broadcaster()
```

##### `recovery(): Promise<Address>`
Returns the current recovery address.

```typescript
const recovery = await secureOwnable.recovery()
```

##### `eventForwarder(): Promise<Address>`
Returns the current event forwarder address.

```typescript
const forwarder = await secureOwnable.eventForwarder()
```

##### `isInitialized(): Promise<boolean>`
Checks if the contract is initialized.

```typescript
const initialized = await secureOwnable.isInitialized()
```

#### **Write Methods**

##### `transferOwnershipRequest(newOwner: Address, options?: TransactionOptions): Promise<Hash>`
Requests a transfer of ownership.

```typescript
const txHash = await secureOwnable.transferOwnershipRequest(
  '0x...',
  { from: account.address }
)
```

##### `transferOwnershipDelayedApproval(txId: bigint, options?: TransactionOptions): Promise<Hash>`
Approves a delayed ownership transfer.

```typescript
const txHash = await secureOwnable.transferOwnershipDelayedApproval(
  1n,
  { from: account.address }
)
```

##### `updateBroadcasterRequest(newBroadcaster: Address, options?: TransactionOptions): Promise<Hash>`
Requests a broadcaster update.

```typescript
const txHash = await secureOwnable.updateBroadcasterRequest(
  '0x...',
  { from: account.address }
)
```

##### `updateRecoveryRequestAndApprove(newRecovery: Address, options?: TransactionOptions): Promise<Hash>`
Requests and approves a recovery update.

```typescript
const txHash = await secureOwnable.updateRecoveryRequestAndApprove(
  '0x...',
  { from: account.address }
)
```

##### `updateTimeLockRequestAndApprove(newPeriod: bigint, options?: TransactionOptions): Promise<Hash>`
Requests and approves a time lock period update.

```typescript
const txHash = await secureOwnable.updateTimeLockRequestAndApprove(
  3600n, // 1 hour
  { from: account.address }
)
```

### **RuntimeRBAC**

The `RuntimeRBAC` class provides type-safe access to RuntimeRBAC contracts. It extends `BaseStateMachine` and provides batch-based role configuration.

#### **Constructor**

```typescript
constructor(
  client: PublicClient,
  walletClient?: WalletClient,
  contractAddress: Address,
  chain: Chain
)
```

#### **Read Methods**

##### `getRole(roleHash: Hex): Promise<Role>`
Gets role information by hash.

```typescript
const role = await runtimeRBAC.getRole('0x...')
// Returns: { roleName, roleHashReturn, maxWallets, walletCount, isProtected }
```

##### `hasRole(roleHash: Hex, wallet: Address): Promise<boolean>`
Checks if a wallet has a specific role.

```typescript
const hasRole = await runtimeRBAC.hasRole('0x...', '0x...')
```

##### `getWalletsInRole(roleHash: Hex): Promise<Address[]>`
Gets all authorized wallets for a role.

```typescript
const wallets = await runtimeRBAC.getWalletsInRole('0x...')
```

##### `getWalletRoles(wallet: Address): Promise<Hex[]>`
Gets all roles assigned to a wallet.

```typescript
const roles = await runtimeRBAC.getWalletRoles('0x...')
```

##### `getSupportedRoles(): Promise<Hex[]>`
Returns the list of supported roles.

```typescript
const roles = await runtimeRBAC.getSupportedRoles()
```

##### `getFunctionSchema(functionSelector: Hex): Promise<FunctionSchema>`
Gets function schema information.

```typescript
const schema = await runtimeRBAC.getFunctionSchema('0xa9059cbb')
```

#### **Write Methods**

##### `roleConfigBatchRequestAndApprove(metaTx: MetaTransaction, options?: TransactionOptions): Promise<TransactionResult>`
Requests and approves a RBAC configuration batch using a meta-transaction.

```typescript
const txHash = await runtimeRBAC.roleConfigBatchRequestAndApprove(
  metaTx,
  { from: account.address }
)
```

##### `roleConfigBatchExecutionParams(definitionAddress: Address, actions: RoleConfigAction[]): Promise<Hex>`
Calls the deployed RuntimeRBACDefinitions contract to build execution params (single source of truth with Solidity).

```typescript
const definitionAddress = deployedAddresses.sepolia.RuntimeRBACDefinitions.address; // from deployed-addresses.json for your chain
const executionParams = await runtimeRBAC.roleConfigBatchExecutionParams(definitionAddress, actions);
// Or use definition helper: import { roleConfigBatchExecutionParams } from '@bloxchain/sdk'; const executionParams = await roleConfigBatchExecutionParams(client, definitionAddress, actions);
```



## 📝 **Types & Interfaces**

### **Core Types**

```typescript
type Address = `0x${string}`
type Hash = `0x${string}`


type OperationType = 
  | 'OWNERSHIP_TRANSFER'
  | 'BROADCASTER_UPDATE'
  | 'RECOVERY_UPDATE'
  | 'TIMELOCK_UPDATE'
  | 'ROLE_EDITING_TOGGLE'
  | 'CUSTOM'

type TxAction = 
  | 'EXECUTE_TIME_DELAY_REQUEST'
  | 'EXECUTE_TIME_DELAY_APPROVE'
  | 'EXECUTE_TIME_DELAY_CANCEL'
  | 'SIGN_META_REQUEST_AND_APPROVE'
  | 'SIGN_META_APPROVE'
  | 'SIGN_META_CANCEL'
  | 'EXECUTE_META_REQUEST_AND_APPROVE'
  | 'EXECUTE_META_APPROVE'
  | 'EXECUTE_META_CANCEL'

type TxStatus = 
  | 'UNDEFINED'
  | 'PENDING'
  | 'COMPLETED'
  | 'CANCELLED'
```



## 🔧 **Transaction Options**

```typescript
interface TransactionOptions {
  from?: Address
  value?: bigint
  gas?: bigint
  gasPrice?: bigint
  maxFeePerGas?: bigint
  maxPriorityFeePerGas?: bigint
  nonce?: number
}
```

## 📊 **Error Types**

```typescript
class GuardianError extends Error {
  code: string
  details?: any
}

class ContractError extends GuardianError {
  contractAddress: Address
  method: string
}

class ValidationError extends GuardianError {
  field: string
  value: any
}

class ComplianceError extends GuardianError {
  violation: ComplianceViolation
}
```

## 🎯 **Usage Examples**

### **Basic Contract Interaction**

```typescript
import { SecureOwnable } from '@bloxchain/sdk/typescript'
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'

const client = createPublicClient({
  chain: mainnet,
  transport: http()
})

const secureOwnable = new SecureOwnable(
  client,
  undefined,
  '0x...',
  mainnet
)

// Read operations
const owner = await secureOwnable.owner()
const timeLock = await secureOwnable.getTimeLockPeriodSec()

console.log('Owner:', owner)
console.log('Time lock period:', timeLock)
```

---

**Need more details?** Check out the specific guides:
- [SecureOwnable Guide](./secure-ownable.md)
- [RuntimeRBAC Guide](./runtime-rbac.md)
