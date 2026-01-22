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
// This creates a time-locked request
const txHash = await secureOwnable.transferOwnershipRequest(
  '0x...', // new owner address
  { from: account.address }
)

console.log('Ownership transfer requested:', txHash)
```

#### **Approve Ownership Transfer**
```typescript
// After the time lock period, approve the transfer
const txHash = await secureOwnable.transferOwnershipDelayedApproval(
  1n, // transaction ID
  { from: account.address }
)

console.log('Ownership transfer approved:', txHash)
```

### **2. Administrative Functions**

#### **Broadcaster Management**
```typescript
// Request broadcaster update
const txHash = await secureOwnable.updateBroadcasterRequest(
  '0x...', // new broadcaster address
  { from: account.address }
)
```

#### **Recovery Management**
```typescript
// Update recovery address (immediate approval)
const txHash = await secureOwnable.updateRecoveryRequestAndApprove(
  '0x...', // new recovery address
  { from: account.address }
)
```

#### **Time Lock Management**
```typescript
// Update time lock period (immediate approval)
const txHash = await secureOwnable.updateTimeLockRequestAndApprove(
  3600n, // new period in seconds (1 hour)
  { from: account.address }
)
```

### **3. State Queries**

#### **Check Initialization Status**
```typescript
const isInitialized = await secureOwnable.isInitialized()
console.log('Contract initialized:', isInitialized)
```

#### **Get Time Lock Period**
```typescript
const timeLockPeriod = await secureOwnable.getTimeLockPeriodSec()
console.log('Time lock period:', timeLockPeriod, 'seconds')
```

#### **Get Administrative Addresses**
```typescript
const broadcaster = await secureOwnable.broadcaster()
const recovery = await secureOwnable.recovery()
const eventForwarder = await secureOwnable.eventForwarder()

console.log('Broadcaster:', broadcaster)
console.log('Recovery:', recovery)
console.log('Event forwarder:', eventForwarder)
```

## 🔄 **Workflow Patterns**

### **Time-Delay Workflow (Ownership Transfer)**

```typescript
// Step 1: Request ownership transfer
const requestTx = await secureOwnable.transferOwnershipRequest(
  newOwner,
  { from: currentOwner }
)

// Step 2: Wait for time lock period
await new Promise(resolve => setTimeout(resolve, timeLockPeriod * 1000))

// Step 3: Approve the transfer
const approveTx = await secureOwnable.transferOwnershipDelayedApproval(
  txId,
  { from: currentOwner }
)
```

### **Meta-Transaction Workflow (Recovery Update)**

```typescript
// Single transaction with immediate approval
const txHash = await secureOwnable.updateRecoveryRequestAndApprove(
  newRecovery,
  { from: account.address }
)
```

### **Hybrid Workflow (Broadcaster Update)**

```typescript
// Option 1: Time-delay request
const requestTx = await secureOwnable.updateBroadcasterRequest(
  newBroadcaster,
  { from: account.address }
)

// Option 2: Meta-transaction (if supported)
const metaTx = await secureOwnable.updateBroadcasterRequestAndApprove(
  newBroadcaster,
  { from: account.address }
)
```

## 📡 **Event Monitoring**

### **Listen for Ownership Events**

```typescript
// Ownership transfer requested
const unwatchRequest = publicClient.watchContractEvent({
  address: contractAddress,
  abi: secureOwnable.abi,
  eventName: 'OwnershipTransferRequested',
  onLogs: (logs) => {
    logs.forEach(log => {
      console.log('Ownership transfer requested:', {
        from: log.args.from,
        to: log.args.to,
        txId: log.args.txId,
        releaseTime: log.args.releaseTime
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
      console.log('Ownership transfer approved:', {
        txId: log.args.txId,
        newOwner: log.args.newOwner
      })
    })
  }
})

// Stop watching
unwatchRequest()
unwatchApproval()
```

### **Listen for Administrative Events**

```typescript
// Broadcaster updated
const unwatchBroadcaster = publicClient.watchContractEvent({
  address: contractAddress,
  abi: secureOwnable.abi,
  eventName: 'BroadcasterUpdated',
  onLogs: (logs) => {
    logs.forEach(log => {
      console.log('Broadcaster updated:', {
        oldBroadcaster: log.args.oldBroadcaster,
        newBroadcaster: log.args.newBroadcaster
      })
    })
  }
})
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
const requestTx = await secureOwnable.transferOwnershipRequest(newOwner)

// Phase 2: Approval (after time lock)
const approveTx = await secureOwnable.transferOwnershipDelayedApproval(txId)
```

### **3. Meta-Transaction Support**

Some operations support immediate execution:

```typescript
// Immediate approval for non-critical operations
const txHash = await secureOwnable.updateRecoveryRequestAndApprove(newRecovery)
```

## 🔧 **Advanced Usage**

### **Batch Operations**

```typescript
// Update multiple administrative functions
const operations = [
  secureOwnable.updateRecoveryRequestAndApprove(newRecovery),
  secureOwnable.updateTimeLockRequestAndApprove(newTimeLock)
]

const results = await Promise.allSettled(operations)
results.forEach((result, index) => {
  if (result.status === 'fulfilled') {
    console.log(`Operation ${index} successful:`, result.value)
  } else {
    console.error(`Operation ${index} failed:`, result.reason)
  }
})
```

### **Error Handling**

```typescript
try {
  const txHash = await secureOwnable.transferOwnershipRequest(newOwner)
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
  args: [newOwner],
  account: account.address
})

console.log('Estimated gas:', gasEstimate)

// Use gas estimate in transaction
const txHash = await secureOwnable.transferOwnershipRequest(
  newOwner,
  { 
    from: account.address,
    gas: gasEstimate * 120n / 100n // Add 20% buffer
  }
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
    const txHash = await secureOwnable.transferOwnershipRequest(newOwner)
    expect(txHash).toMatch(/^0x[a-fA-F0-9]{64}$/)
  })
})
```

### **Integration Testing**

```typescript
describe('SecureOwnable Integration', () => {
  it('should complete ownership transfer workflow', async () => {
    // Request transfer
    const requestTx = await secureOwnable.transferOwnershipRequest(newOwner)
    
    // Wait for time lock
    await new Promise(resolve => setTimeout(resolve, timeLockPeriod * 1000))
    
    // Approve transfer
    const approveTx = await secureOwnable.transferOwnershipDelayedApproval(txId)
    
    // Verify new owner
    const currentOwner = await secureOwnable.owner()
    expect(currentOwner).toBe(newOwner)
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
- [Workflow Analysis](./workflow-generation.md) - Analyzing SecureOwnable workflows
- [Best Practices](./best-practices.md) - Development guidelines

---

**Ready to explore RuntimeRBAC?** Check out the [RuntimeRBAC Guide](./dynamic-rbac.md) for role-based access control.
