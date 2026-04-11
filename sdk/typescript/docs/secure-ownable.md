# SecureOwnable Contract Integration

The `SecureOwnable` class provides type-safe access to Bloxchain SecureOwnable contracts with built-in security features and multi-phase operations.

## 🎯 **Overview**

SecureOwnable is a secure ownership management contract that implements:
- **Time-locked operations** for critical administrative functions
- **Multi-phase security** with request/approval workflows
- **Meta-transaction support** for gasless operations
- **Event forwarding** for external monitoring
- **Recovery mechanisms** for emergency situations

## 🚀 **Quick Start**

```typescript
import { SecureOwnable } from '@bloxchain/sdk/typescript'
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

// Create SecureOwnable instance
const secureOwnable = new SecureOwnable(
  publicClient,
  walletClient,
  '0x...', // contract address
  mainnet
)
```

## 📖 **Core Features**

### **1. Ownership Management**

#### **Get Current Owner**
```typescript
const owner = await secureOwnable.owner()
console.log('Current owner:', owner)
```

#### **Request Ownership Transfer**
```typescript
// No arguments: creates a time-locked request. On execution, the OWNER role is transferred to the **recovery
// address at request time** (snapshotted in the pending tx). Rotating recovery later does not change that payload.
const txHash = await secureOwnable.transferOwnershipRequest(
  { from: account.address }
)
console.log('Ownership transfer requested:', txHash)
// Use getPendingTransactions() / getTransaction(txId) to get txId for approval
```

#### **Approve Ownership Transfer**
```typescript
// After the time lock period, approve the transfer
const txHash = await secureOwnable.transferOwnershipDelayedApproval(
  txId, // transaction ID from getPendingTransactions / events
  { from: account.address }
)
console.log('Ownership transfer approved:', txHash)
```

### **2. Administrative Functions**

#### **Broadcaster Management**
```typescript
// Request broadcaster update (location = index in broadcaster role's wallet set)
const txHash = await secureOwnable.updateBroadcasterRequest(
  '0x...', // new broadcaster address (or zero to revoke at location)
  locationIndex, // bigint: index in getBroadcasters()
  { from: account.address }
)
```

#### **Recovery Management**
```typescript
// Update recovery address: requires a signed meta-transaction (owner signs, broadcaster executes)
const metaTx = await createSignedMetaTxForRecoveryUpdate(newRecovery) // build via generateUnsignedMetaTransactionForNew + sign
const txHash = await secureOwnable.updateRecoveryRequestAndApprove(
  metaTx,
  { from: broadcasterAddress }
)
```

#### **Time Lock Management**
```typescript
// Update time lock period: requires a signed meta-transaction (owner signs, broadcaster executes)
const metaTx = await createSignedMetaTxForTimeLockUpdate(newPeriodSec)
const txHash = await secureOwnable.updateTimeLockRequestAndApprove(
  metaTx,
  { from: broadcasterAddress }
)
```

### **3. State Queries**

#### **Check Initialization Status**
```typescript
const isInit = await secureOwnable.initialized()
console.log('Contract initialized:', isInit)
```

#### **Get Time Lock Period**
```typescript
const timeLockPeriod = await secureOwnable.getTimeLockPeriodSec()
console.log('Time lock period:', timeLockPeriod, 'seconds')
```

#### **Get Administrative Addresses**
```typescript
const broadcasters = await secureOwnable.getBroadcasters() // address[]
const recovery = await secureOwnable.getRecovery()
console.log('Broadcasters:', broadcasters, 'Recovery:', recovery)
```

## 🔄 **Workflow Patterns**

### **Time-Delay Workflow (Ownership Transfer)**

```typescript
// Step 1: Request ownership transfer — pending execution will assign OWNER to getRecovery() **at this moment**
const requestTx = await secureOwnable.transferOwnershipRequest(
  { from: currentOwner }
)

// Step 2: Wait for time lock period, then get txId from getPendingTransactions() / getTransaction

// Step 3: Approve the transfer (current owner OR current recovery; beneficiary is still the snapshotted address)
const approveTx = await secureOwnable.transferOwnershipDelayedApproval(
  txId,
  { from: currentOwner }
)
```

### **Meta-Transaction Workflow (Recovery Update)**

```typescript
// Owner signs a meta-tx for recovery update; broadcaster submits updateRecoveryRequestAndApprove(metaTx, { from: broadcaster })
const txHash = await secureOwnable.updateRecoveryRequestAndApprove(
  signedMetaTx,
  { from: broadcasterAddress }
)
```

### **Hybrid Workflow (Broadcaster Update)**

```typescript
// Option 1: Time-delay request (newBroadcaster + location index)
const requestTx = await secureOwnable.updateBroadcasterRequest(
  newBroadcaster,
  locationIndex,
  { from: account.address }
)

// Option 2: Meta-transaction approval (signer = owner, executor = broadcaster)
const metaTx = await createSignedMetaTxForBroadcasterApproval(txId)
await secureOwnable.updateBroadcasterApprovalWithMetaTx(metaTx, { from: broadcasterAddress })
```

## 📡 **Event Monitoring**

Contracts emit a unified **`ComponentEvent(bytes4 functionSelector, bytes data)`**. Decode `data` according to the emitting function (use `functionSelector` to identify). See generated [contract API](../../docs/) and NatSpec for payload layouts.

### **Listen for ComponentEvent**

```typescript
const unwatch = publicClient.watchContractEvent({
  address: contractAddress,
  abi: secureOwnable.abi,
  eventName: 'ComponentEvent',
  onLogs: (logs) => {
    logs.forEach(log => {
      // log.args.functionSelector identifies the emitting function
      // log.args.data is ABI-encoded; decode with abi.decode based on selector
      console.log('ComponentEvent', log.args.functionSelector, log.args.data)
    })
  }
})
unwatch()
```

## 🛡️ **Security Features**

### **1. Time-Locked Operations**

Critical operations like ownership transfer require a time delay:

```typescript
// Check if enough time has passed
const requestTime = await getRequestTime(txId)
const currentTime = Math.floor(Date.now() / 1000)
const timePassed = currentTime - requestTime

if (timePassed < timeLockPeriod) {
  throw new Error(`Time lock not expired. ${timeLockPeriod - timePassed} seconds remaining`)
}
```

### **2. Multi-Phase Security**

Operations are split into request and approval phases:

```typescript
// Phase 1: Request
const requestTx = await secureOwnable.transferOwnershipRequest({ from: account.address })

// Phase 2a: Delayed approval (after time lock; use txId from getPendingTransactions / getTransaction)
const approveTx = await secureOwnable.transferOwnershipDelayedApproval(txId, { from: account.address })

// Phase 2b: Meta-tx approval (owner signs, broadcaster submits — timelock NOT enforced)
const metaTxApproval = await secureOwnable.transferOwnershipApprovalWithMetaTx(signedMetaTx, { from: broadcasterAddress })
```

**Important:** The **delayed** path (`transferOwnershipDelayedApproval`) enforces `releaseTime` (timelock). The **meta-tx** path (`transferOwnershipApprovalWithMetaTx`) does **not** enforce timelock — the signed meta-transaction itself is the authorization, enabling time-flexible delegated approval. This applies to all meta-tx approval paths across the protocol.

### **3. Meta-Transaction Support**

Some operations support immediate execution:

```typescript
// Immediate approval for recovery/time-lock uses meta-tx: owner signs, broadcaster calls updateRecoveryRequestAndApprove(metaTx) or updateTimeLockRequestAndApprove(metaTx)
const txHash = await secureOwnable.updateRecoveryRequestAndApprove(signedMetaTx, { from: broadcasterAddress })
```

### **4. Ownership transfer vs recovery (role model)**

SecureOwnable splits power across **owner**, **broadcaster**, and **recovery**, and uses **different timing** per lane. These rules are intentional; misreading them causes false expectations during audits or operations.

| Topic | Behavior |
|--------|----------|
| **Who becomes owner** | `transferOwnershipRequest()` stores the **recovery address at request time** in the pending transaction. Execution calls `executeTransferOwnership` with that snapshotted address. |
| **Recovery rotated while pending** | The pending payload is **not** updated. A new recovery address does **not** automatically become the beneficiary of an old pending transfer. |
| **Who may approve (delayed path)** | `transferOwnershipDelayedApproval` allows the **current** owner or **current** recovery. The approver may therefore differ from the snapshotted beneficiary—approval means “execute the stored transfer,” not “transfer to current recovery.” |
| **Who may cancel** | `transferOwnershipCancellation` is only callable by **current** recovery. If recovery is rotated, the **previous** recovery immediately loses cancel rights. |
| **Broadcaster update vs pending ownership** | Starting a broadcaster update requires **no** pending ownership transfer (and vice versa for the broadcaster lane). Internal pending flags apply only to these **delayed** lanes; recovery and timelock meta flows do not use them, and flags are cleared in the same transaction as successful approve or cancel. |
| **Recovery update vs pending ownership** | `updateRecoveryRequestAndApprove` does **not** check for a pending ownership transfer. Owner + broadcaster can still rotate recovery in one meta-tx step while a transfer is pending—fast operational recovery, but prior recovery loses veto via cancel. |

**Threat model:** If **owner and broadcaster** are both compromised, they can rotate recovery and control cancellation/approval paths regardless of timelocks on ownership transfer. Treat that pair as a high-trust escalation path. If you need a hard on-chain rule such as “no recovery rotation while ownership transfer is pending,” enforce it with a contract extension or off-chain policy; the core `SecureOwnable` contract does not encode that invariant.

**Timelock bounds:** `SecureOwnable` validates `timeLockPeriodSec > 0` but enforces **no upper bound**. An extremely large value (e.g. `type(uint256).max`) makes delayed operations practically unexecutable for the deployment's lifetime. Operators should validate the timelock range in deployment scripts or governance checks before calling `updateTimeLockRequestAndApprove`.

**Role separation:** The contract does **not** prevent the same EOA from holding **OWNER**, **BROADCASTER**, and **RECOVERY** roles simultaneously. Collapsing roles is a valid deployment choice (e.g. single multisig controls all), but it **removes** separation-of-duties guarantees that documentation and timelocks otherwise provide. Enforce distinct keys **off-chain** when separation is required.

## 🔧 **Advanced Usage**

### **Batch Operations**

```typescript
// Run multiple meta-tx flows (e.g. recovery + time lock updates)
const results = await Promise.allSettled([
  secureOwnable.updateRecoveryRequestAndApprove(metaTxRecovery, { from: broadcaster }),
  secureOwnable.updateTimeLockRequestAndApprove(metaTxTimeLock, { from: broadcaster })
])
```

### **Error Handling**

```typescript
try {
  const txHash = await secureOwnable.transferOwnershipRequest({ from: account.address })
  console.log('Transaction successful:', txHash)
} catch (error) {
  if (error.message.includes('Only owner')) {
    console.error('Only the contract owner can request ownership transfer')
  } else if (error.message.includes('Invalid address')) {
    console.error('Invalid new owner address provided')
  } else {
    console.error('Transaction failed:', error.message)
  }
}
```

### **Gas Optimization**

```typescript
// Estimate gas before transaction
const gasEstimate = await publicClient.estimateContractGas({
  address: contractAddress,
  abi: secureOwnable.abi,
  functionName: 'transferOwnershipRequest',
  args: [],
  account: account.address
})

console.log('Estimated gas:', gasEstimate)

// Use gas estimate in transaction
const txHash = await secureOwnable.transferOwnershipRequest(
  { from: account.address, gas: gasEstimate * 120n / 100n }
)
```


## 🧪 **Testing**

### **Unit Testing**

```typescript
import { describe, it, expect } from 'vitest'

describe('SecureOwnable', () => {
  it('should return correct owner', async () => {
    const owner = await secureOwnable.owner()
    expect(owner).toBe(expectedOwner)
  })

  it('should request ownership transfer', async () => {
    const txHash = await secureOwnable.transferOwnershipRequest({ from: account.address })
    expect(txHash.hash).toBeDefined()
  })
})
```

### **Integration Testing**

```typescript
describe('SecureOwnable Integration', () => {
  it('should complete ownership transfer workflow', async () => {
    // Request transfer (beneficiary = recovery address at request time)
    await secureOwnable.transferOwnershipRequest({ from: currentOwner })
    
    // Wait for time lock, then get txId from getPendingTransactions()
    await new Promise(resolve => setTimeout(resolve, timeLockPeriod * 1000))
    
    const approveTx = await secureOwnable.transferOwnershipDelayedApproval(txId, { from: currentOwner })
    
    const currentOwnerAfter = await secureOwnable.owner()
    // After execution, owner should equal recovery-at-request-time (not an arbitrary newOwner argument)
    expect(currentOwnerAfter).toBe(recoveryAtRequestTime)
  })
})
```

## 🚨 **Common Issues**

### **Issue: "Only owner can call this function"**
**Solution**: Ensure you're calling from the contract owner's account.

### **Issue: "Time lock not expired"**
**Solution**: Wait for the time lock period to pass before approving.

### **Issue: "Invalid address"**
**Solution**: Ensure the address is a valid Ethereum address (42 characters, starts with 0x).

### **Issue: "Transaction reverted"**
**Solution**: Check contract requirements and ensure sufficient gas.

## 📚 **Related Documentation**

- [API Reference](./api-reference.md) - Complete API documentation
- [Getting Started](./getting-started.md) - Basic setup guide
- [Best Practices](./best-practices.md) - Development guidelines

---

**Next:** [RuntimeRBAC Guide](./runtime-rbac.md) for role-based access control.
