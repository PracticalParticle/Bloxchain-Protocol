# Getting Started with Bloxchain TypeScript SDK

This guide helps you get up and running with the Bloxchain TypeScript SDK.

## 📋 **Prerequisites**

- Node.js 18+
- TypeScript 4.5+
- npm or yarn
- Basic knowledge of Ethereum and smart contracts

## 🚀 **Installation**

```bash
npm install @bloxchain/sdk

# Or with yarn
yarn add @bloxchain/sdk
```

## 🔧 **Basic Setup**

### 1. **Import Required Dependencies**

```typescript
import { SecureOwnable, RuntimeRBAC } from '@bloxchain/sdk'
import { createPublicClient, createWalletClient, http } from 'viem'
import { mainnet } from 'viem/chains'
import { privateKeyToAccount } from 'viem/accounts'
```

### 2. **Initialize Clients**

```typescript
// Public client for read operations
const publicClient = createPublicClient({
  chain: mainnet,
  transport: http('https://eth-mainnet.alchemyapi.io/v2/your-api-key')
})

// Wallet client for write operations (optional)
const account = privateKeyToAccount('0x...') // Your private key
const walletClient = createWalletClient({
  account,
  chain: mainnet,
  transport: http('https://eth-mainnet.alchemyapi.io/v2/your-api-key')
})
```

### 3. **Create Contract Instances**

```typescript
// SecureOwnable contract
const secureOwnable = new SecureOwnable(
  publicClient,
  walletClient, // optional
  '0x...', // contract address
  mainnet
)

// RuntimeRBAC contract
const runtimeRBAC = new RuntimeRBAC(
  publicClient,
  walletClient, // optional
  '0x...', // contract address
  mainnet
)
```

## 📖 **Basic Usage Examples**

### **Reading Contract State**

```typescript
// Get contract owner
const owner = await secureOwnable.owner()
console.log('Owner:', owner)

// Get time lock period
const timeLockPeriod = await secureOwnable.getTimeLockPeriodSec()
console.log('Time lock period:', timeLockPeriod)

// Get broadcaster addresses (array) and recovery
const broadcasters = await secureOwnable.getBroadcasters()
const recovery = await secureOwnable.getRecovery()
console.log('Broadcasters:', broadcasters, 'Recovery:', recovery)

// Check initialization
const isInit = await secureOwnable.initialized()
console.log('Initialized:', isInit)

// Get supported roles (RuntimeRBAC)
const supportedRoles = await runtimeRBAC.getSupportedRoles()
console.log('Supported roles:', supportedRoles)
```

### **Writing to Contracts**

```typescript
// Request ownership transfer (no arguments; new owner is set when the pending tx is approved and executed)
const txHash = await secureOwnable.transferOwnershipRequest(
  { from: account.address }
)
console.log('Transaction hash:', txHash)

// After time lock: approve the transfer (txId from getPendingTransactions / getTransaction)
const approveHash = await secureOwnable.transferOwnershipDelayedApproval(
  txId,
  { from: account.address }
)

// Wait for transaction confirmation
const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
console.log('Transaction confirmed:', receipt.status)
```

### **Event Monitoring**

Contracts emit a unified `ComponentEvent(bytes4 functionSelector, bytes data)`. Decode `data` based on `functionSelector` (the selector of the function that emitted). See [contract API docs](../../docs/) and NatSpec for payload layouts.

```typescript
// Listen for component events (decode data per functionSelector)
const unwatch = publicClient.watchContractEvent({
  address: '0x...', // contract address
  abi: secureOwnable.abi,
  eventName: 'ComponentEvent',
  onLogs: (logs) => {
    logs.forEach(log => {
      console.log('ComponentEvent:', log.args.functionSelector, log.args.data)
      // Decode log.args.data with abi.decode based on selector
    })
  }
})
unwatch()
```

## 🛠️ **Development Workflow**

### **1. Local Development**

```bash
# Clone the repository
git clone https://github.com/PracticalParticle/Bloxchain-Protocol.git
cd Bloxchain-Protocol

# Install dependencies
npm install

# Compile contracts (e.g. Foundry)
npm run compile:foundry

# Run tests
npm run test:foundry
```

### **2. Testing Your Integration**

```typescript
// Test with local network
const localClient = createPublicClient({
  chain: {
    id: 1337,
    name: 'local',
    nativeCurrency: { name: 'Ether', symbol: 'ETH', decimals: 18 },
    rpcUrls: {
      default: { http: ['http://127.0.0.1:8545'] }
    }
  },
  transport: http('http://127.0.0.1:8545')
})

const localSecureOwnable = new SecureOwnable(
  localClient,
  undefined,
  '0x...', // deployed contract address
  { id: 1337, name: 'local' }
)
```

## 🔒 **Security Best Practices**

### **1. Private Key Management**

```typescript
// Never hardcode private keys; use environment variables
const privateKey = process.env.PRIVATE_KEY
if (!privateKey) {
  throw new Error('PRIVATE_KEY environment variable is required')
}
const account = privateKeyToAccount(privateKey)
```

### **2. Input Validation**

```typescript
// Always validate addresses
function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}
if (!isValidAddress(newOwner)) {
  throw new Error('Invalid address provided')
}
```

### **3. Error Handling**

```typescript
try {
  const txHash = await secureOwnable.transferOwnershipRequest({ from: account.address })
  console.log('Transaction successful:', txHash)
} catch (error) {
  console.error('Transaction failed:', error instanceof Error ? error.message : error)
}
```

## 📚 **Next Steps**

1. [API Reference](./api-reference.md)
2. [SecureOwnable Guide](./secure-ownable.md)
3. [RuntimeRBAC Guide](./runtime-rbac.md)
4. [Basic Examples](./examples-basic.md)

## ❓ **Common Issues**

- **Contract not found:** Ensure the contract address and network are correct.
- **Insufficient funds:** Add ETH or use a testnet faucet.
- **Transaction reverted:** Check requirements (e.g. only owner can request transfer).
- **Network mismatch:** Ensure the client uses the correct chain.

## 🆘 **Getting Help**

- [API Reference](./api-reference.md)
- [Basic Examples](./examples-basic.md)
- [GitHub Issues](https://github.com/PracticalParticle/Bloxchain-Protocol/issues)

---

**Next:** [API Reference](./api-reference.md) for detailed SDK method documentation.
