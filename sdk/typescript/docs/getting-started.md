# Getting Started with Guardian TypeScript SDK

This guide will help you get up and running with the Guardian TypeScript SDK quickly.

## 📋 **Prerequisites**

- Node.js 16+ 
- TypeScript 4.5+
- npm or yarn
- Basic knowledge of Ethereum and smart contracts

## 🚀 **Installation**

```bash
# Install the SDK
npm install @bloxchain/sdk

# Or with yarn
yarn add @bloxchain/sdk
```

## 🔧 **Basic Setup**

### 1. **Import Required Dependencies**

```typescript
import { SecureOwnable, RuntimeRBAC } from '@bloxchain/sdk/typescript'
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

// Get supported roles
const supportedRoles = await runtimeRBAC.getSupportedRoles()
console.log('Supported roles:', supportedRoles)
```

### **Writing to Contracts**

```typescript
// Request ownership transfer (requires wallet client)
const txHash = await secureOwnable.transferOwnershipRequest(
  '0x...', // new owner address
  { from: account.address }
)

console.log('Transaction hash:', txHash)

// Wait for transaction confirmation
const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
console.log('Transaction confirmed:', receipt.status)
```

### **Event Monitoring**

```typescript
// Listen for ownership transfer events
const unwatch = publicClient.watchContractEvent({
  address: '0x...', // contract address
  abi: secureOwnable.abi,
  eventName: 'OwnershipTransferRequested',
  onLogs: (logs) => {
    console.log('Ownership transfer requested:', logs)
  }
})

// Stop watching
unwatch()
```

## 🔍 **Workflow Analysis**

### **Basic Contract Analysis**


## 🛠️ **Development Workflow**

### **1. Local Development**

```bash
# Clone the repository
git clone https://github.com/PracticalParticle/Guardian.git
cd guardian

# Install dependencies
npm install

# Compile contracts
npm run compile:truffle

# Run tests
npm run test:truffle
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

// Deploy and test locally
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
// Never hardcode private keys
// Use environment variables
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

// Validate before making transactions
if (!isValidAddress(newOwner)) {
  throw new Error('Invalid address provided')
}
```

### **3. Error Handling**

```typescript
try {
  const txHash = await secureOwnable.transferOwnershipRequest(newOwner)
  console.log('Transaction successful:', txHash)
} catch (error) {
  console.error('Transaction failed:', error.message)
  // Handle specific error types
  if (error.message.includes('insufficient funds')) {
    console.log('Please add more ETH to your account')
  }
}
```

## 📚 **Next Steps**

1. **Read the API Reference**: [API Reference](./api-reference.md)
2. **Explore SecureOwnable**: [SecureOwnable Guide](./secure-ownable.md)
3. **Learn about RuntimeRBAC**: [RuntimeRBAC Guide](./runtime-rbac.md)
5. **Check Examples**: [Basic Examples](./examples-basic.md)

## ❓ **Common Issues**

### **Issue: "Contract not found"**
**Solution**: Ensure the contract address is correct and the contract is deployed on the network you're using.

### **Issue: "Insufficient funds"**
**Solution**: Add more ETH to your account or use a testnet with faucet.

### **Issue: "Transaction reverted"**
**Solution**: Check the contract's requirements (e.g., only owner can call certain functions).

### **Issue: "Network mismatch"**
**Solution**: Ensure your client is configured for the correct network.

## 🆘 **Getting Help**

- **Documentation**: Check the [API Reference](./api-reference.md)
- **Examples**: See [Basic Examples](./examples-basic.md)
- **Issues**: [GitHub Issues](https://github.com/PracticalParticle/Guardian/issues)
- **Discord**: [Join our Discord](https://discord.gg/guardian)

---

**Ready to dive deeper?** Check out the [API Reference](./api-reference.md) for detailed documentation of all SDK methods.
