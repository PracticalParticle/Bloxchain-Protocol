# Best Practices

This guide covers best practices for developing with the Guardian TypeScript SDK, including security, performance, and maintainability guidelines.

## 🔒 **Security Best Practices**

### **1. Private Key Management**

❌ **Don't:**
```typescript
// Never hardcode private keys
const privateKey = '0x1234567890abcdef...'
```

✅ **Do:**
```typescript
// Use environment variables
const privateKey = process.env.PRIVATE_KEY
if (!privateKey) {
  throw new Error('PRIVATE_KEY environment variable is required')
}

// Use secure key management services
import { getSecret } from '@aws-sdk/client-secrets-manager'
const privateKey = await getSecret('guardian-private-key')
```

### **2. Input Validation**

❌ **Don't:**
```typescript
// No validation
const txHash = await secureOwnable.transferOwnershipRequest(newOwner)
```

✅ **Do:**
```typescript
// Always validate inputs
function isValidAddress(address: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(address)
}

function isValidTimeLock(period: bigint): boolean {
  return period > 0n && period <= 86400n // Max 24 hours
}

if (!isValidAddress(newOwner)) {
  throw new Error('Invalid address provided')
}

if (!isValidTimeLock(timeLockPeriod)) {
  throw new Error('Invalid time lock period')
}

const txHash = await secureOwnable.transferOwnershipRequest(newOwner)
```

### **3. Error Handling**

❌ **Don't:**
```typescript
// Silent failures
try {
  await secureOwnable.transferOwnershipRequest(newOwner)
} catch (error) {
  // Ignore error
}
```

✅ **Do:**
```typescript
// Comprehensive error handling
try {
  const txHash = await secureOwnable.transferOwnershipRequest(newOwner)
  console.log('Transaction successful:', txHash)
  
  // Wait for confirmation
  const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
  if (receipt.status === 'reverted') {
    throw new Error('Transaction reverted')
  }
} catch (error) {
  console.error('Transaction failed:', error.message)
  
  // Handle specific error types
  if (error.message.includes('insufficient funds')) {
    console.log('Please add more ETH to your account')
  } else if (error.message.includes('Only owner')) {
    console.log('Only the contract owner can perform this action')
  } else if (error.message.includes('Invalid address')) {
    console.log('Please provide a valid Ethereum address')
  }
  
  // Re-throw if critical
  if (error.message.includes('CRITICAL')) {
    throw error
  }
}
```

### **4. Access Control**

❌ **Don't:**
```typescript
// No access control checks
const txHash = await secureOwnable.transferOwnershipRequest(newOwner)
```

✅ **Do:**
```typescript
// Check permissions before operations
async function transferOwnershipWithChecks(newOwner: string) {
  // Check if caller is owner
  const currentOwner = await secureOwnable.owner()
  if (account.address !== currentOwner) {
    throw new Error('Only the contract owner can transfer ownership')
  }
  
  // Check if new owner is valid
  if (!isValidAddress(newOwner)) {
    throw new Error('Invalid new owner address')
  }
  
  // Check if new owner is different
  if (newOwner.toLowerCase() === currentOwner.toLowerCase()) {
    throw new Error('New owner must be different from current owner')
  }
  
  return await secureOwnable.transferOwnershipRequest(newOwner)
}
```

## ⚡ **Performance Best Practices**

### **1. Client Reuse**

❌ **Don't:**
```typescript
// Creating new clients for each operation
function createClient() {
  return createPublicClient({
    chain: mainnet,
    transport: http()
  })
}

const client1 = createClient()
const client2 = createClient()
```

✅ **Do:**
```typescript
// Reuse clients
const publicClient = createPublicClient({
  chain: mainnet,
  transport: http()
})

const walletClient = createWalletClient({
  account: privateKeyToAccount(privateKey),
  chain: mainnet,
  transport: http()
})

// Use the same clients throughout your application
```

### **2. Batch Operations**

❌ **Don't:**
```typescript
// Sequential operations
const result1 = await secureOwnable.updateRecoveryRequestAndApprove(newRecovery1)
const result2 = await secureOwnable.updateRecoveryRequestAndApprove(newRecovery2)
const result3 = await secureOwnable.updateRecoveryRequestAndApprove(newRecovery3)
```

✅ **Do:**
```typescript
// Batch operations
const operations = [
  secureOwnable.updateRecoveryRequestAndApprove(newRecovery1),
  secureOwnable.updateRecoveryRequestAndApprove(newRecovery2),
  secureOwnable.updateRecoveryRequestAndApprove(newRecovery3)
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

### **3. Gas Optimization**

❌ **Don't:**
```typescript
// No gas estimation
const txHash = await secureOwnable.transferOwnershipRequest(newOwner)
```

✅ **Do:**
```typescript
// Estimate gas and optimize
const gasEstimate = await publicClient.estimateContractGas({
  address: contractAddress,
  abi: secureOwnable.abi,
  functionName: 'transferOwnershipRequest',
  args: [newOwner],
  account: account.address
})

const txHash = await secureOwnable.transferOwnershipRequest(
  newOwner,
  { 
    from: account.address,
    gas: gasEstimate * 120n / 100n // Add 20% buffer
  }
)
```

### **4. Caching**

❌ **Don't:**
```typescript
// No caching
async function getOwner() {
  return await secureOwnable.owner() // Always makes RPC call
}
```

✅ **Do:**
```typescript
// Implement caching
class CachedSecureOwnable {
  private cache = new Map<string, { value: any; timestamp: number }>()
  private cacheTimeout = 30000 // 30 seconds

  async getOwner(): Promise<Address> {
    const cacheKey = 'owner'
    const cached = this.cache.get(cacheKey)
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.value
    }
    
    const owner = await this.secureOwnable.owner()
    this.cache.set(cacheKey, { value: owner, timestamp: Date.now() })
    return owner
  }
}
```

## 🏗️ **Code Organization**

### **1. Modular Architecture**

❌ **Don't:**
```typescript
// Monolithic file
class GuardianManager {
  // 1000+ lines of mixed functionality
  async doEverything() { /* ... */ }
}
```

✅ **Do:**
```typescript
// Modular architecture
class GuardianManager {
  constructor(
    private secureOwnable: SecureOwnable,
    private runtimeRBAC: RuntimeRBAC,
  ) {}

  // Delegate to specific modules
  async transferOwnership(newOwner: Address) {
    return await this.secureOwnable.transferOwnershipRequest(newOwner)
  }

  async manageRoles(roleHash: Hex, account: Address) {
    // Role management is done via batch operations
    // See runtime-rbac.md for batch configuration examples
    const actions = [{
      actionType: 2, // ADD_WALLET
      data: encodeAbiParameters(['bytes32', 'address'], [roleHash, account])
    }]
    const executionParams = await this.runtimeRBAC.roleConfigBatchExecutionParams(actions)
    // Then use meta-transaction to execute
  }

}
```

### **2. Type Safety**

❌ **Don't:**
```typescript
// No type safety
function processContract(address: string) {
  // address could be anything
}
```

✅ **Do:**
```typescript
// Strong typing
import { Address } from '@bloxchain/sdk/typescript'

function processContract(address: Address) {
  // address is guaranteed to be a valid Ethereum address
}

// Use branded types for additional safety
type ContractAddress = Address & { __brand: 'ContractAddress' }
type UserAddress = Address & { __brand: 'UserAddress' }

function transferOwnership(
  contract: ContractAddress,
  newOwner: UserAddress
) {
  // Type system prevents mixing contract and user addresses
}
```

### **3. Configuration Management**

❌ **Don't:**
```typescript
// Hardcoded configuration
const config = {
  rpcUrl: 'https://eth-mainnet.alchemyapi.io/v2/hardcoded-key',
  contractAddress: '0x1234567890abcdef...'
}
```

✅ **Do:**
```typescript
// Environment-based configuration
interface Config {
  rpcUrl: string
  contractAddress: Address
  chainId: number
  gasLimit?: bigint
}

function loadConfig(): Config {
  return {
    rpcUrl: process.env.RPC_URL || 'http://127.0.0.1:8545',
    contractAddress: process.env.CONTRACT_ADDRESS as Address,
    chainId: parseInt(process.env.CHAIN_ID || '1'),
    gasLimit: process.env.GAS_LIMIT ? BigInt(process.env.GAS_LIMIT) : undefined
  }
}

// Validate configuration
function validateConfig(config: Config): void {
  if (!config.rpcUrl) throw new Error('RPC_URL is required')
  if (!config.contractAddress) throw new Error('CONTRACT_ADDRESS is required')
  if (!config.chainId) throw new Error('CHAIN_ID is required')
}
```

## 🧪 **Testing Best Practices**

### **1. Test Structure**

❌ **Don't:**
```typescript
// Unclear test structure
it('should work', async () => {
  // Mixed setup, execution, and assertions
  const client = createPublicClient({...})
  const secureOwnable = new SecureOwnable(client, ...)
  const result = await secureOwnable.owner()
  expect(result).toBe('0x...')
})
```

✅ **Do:**
```typescript
// Clear test structure
describe('SecureOwnable', () => {
  let client: PublicClient
  let secureOwnable: SecureOwnable
  let contractAddress: Address

  beforeEach(() => {
    // Setup
    client = createPublicClient({...})
    contractAddress = '0x...' as Address
    secureOwnable = new SecureOwnable(client, undefined, contractAddress, mainnet)
  })

  describe('owner()', () => {
    it('should return the contract owner', async () => {
      // Given
      const expectedOwner = '0x...' as Address

      // When
      const actualOwner = await secureOwnable.owner()

      // Then
      expect(actualOwner).toBe(expectedOwner)
    })
  })
})
```

### **2. Mocking**

❌ **Don't:**
```typescript
// No mocking, always hits real network
it('should transfer ownership', async () => {
  const txHash = await secureOwnable.transferOwnershipRequest('0x...')
  expect(txHash).toBeDefined()
})
```

✅ **Do:**
```typescript
// Mock external dependencies
import { vi } from 'vitest'

describe('SecureOwnable', () => {
  let mockClient: PublicClient

  beforeEach(() => {
    mockClient = {
      readContract: vi.fn(),
      writeContract: vi.fn(),
      waitForTransactionReceipt: vi.fn()
    } as any
  })

  it('should transfer ownership', async () => {
    // Given
    const expectedTxHash = '0x123...' as Hash
    vi.mocked(mockClient.writeContract).mockResolvedValue(expectedTxHash)

    // When
    const txHash = await secureOwnable.transferOwnershipRequest('0x...')

    // Then
    expect(txHash).toBe(expectedTxHash)
    expect(mockClient.writeContract).toHaveBeenCalledWith({
      address: contractAddress,
      abi: expect.any(Array),
      functionName: 'transferOwnershipRequest',
      args: ['0x...']
    })
  })
})
```

### **3. Integration Testing**

❌ **Don't:**
```typescript
// No integration tests
// Only unit tests with mocks
```

✅ **Do:**
```typescript
// Include integration tests
describe('Integration Tests', () => {
  it('should complete ownership transfer workflow', async () => {
    // Use real contracts on testnet
    const testnetClient = createPublicClient({
      chain: goerli,
      transport: http()
    })

    const secureOwnable = new SecureOwnable(
      testnetClient,
      walletClient,
      testnetContractAddress,
      goerli
    )

    // Test complete workflow
    const requestTx = await secureOwnable.transferOwnershipRequest(newOwner)
    expect(requestTx).toBeDefined()

    // Wait for time lock
    await new Promise(resolve => setTimeout(resolve, timeLockPeriod * 1000))

    const approveTx = await secureOwnable.transferOwnershipDelayedApproval(txId)
    expect(approveTx).toBeDefined()

    // Verify final state
    const finalOwner = await secureOwnable.owner()
    expect(finalOwner.toLowerCase()).toBe(newOwner.toLowerCase())
  })
})
```

## 📊 **Monitoring & Logging**

### **1. Structured Logging**

❌ **Don't:**
```typescript
// Unstructured logging
console.log('Transaction successful')
console.log('Error occurred')
```

✅ **Do:**
```typescript
// Structured logging
import { createLogger } from 'winston'

const logger = createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({ filename: 'guardian.log' })
  ]
})

// Use structured logging
logger.info('Transaction successful', {
  txHash,
  contractAddress,
  functionName: 'transferOwnershipRequest',
  newOwner,
  timestamp: Date.now()
})

logger.error('Transaction failed', {
  error: error.message,
  contractAddress,
  functionName: 'transferOwnershipRequest',
  newOwner,
  timestamp: Date.now()
})
```

### **2. Metrics Collection**

❌ **Don't:**
```typescript
// No metrics
const txHash = await secureOwnable.transferOwnershipRequest(newOwner)
```

✅ **Do:**
```typescript
// Collect metrics
class MetricsCollector {
  private metrics = {
    transactions: 0,
    errors: 0,
    gasUsed: 0n,
    responseTime: 0
  }

  async trackTransaction<T>(
    operation: () => Promise<T>,
    operationName: string
  ): Promise<T> {
    const startTime = Date.now()
    
    try {
      const result = await operation()
      this.metrics.transactions++
      this.metrics.responseTime = Date.now() - startTime
      
      logger.info('Transaction completed', {
        operation: operationName,
        duration: this.metrics.responseTime,
        success: true
      })
      
      return result
    } catch (error) {
      this.metrics.errors++
      this.metrics.responseTime = Date.now() - startTime
      
      logger.error('Transaction failed', {
        operation: operationName,
        duration: this.metrics.responseTime,
        error: error.message
      })
      
      throw error
    }
  }
}
```

## 🚀 **Deployment Best Practices**

### **1. Environment Separation**

❌ **Don't:**
```typescript
// Same configuration for all environments
const config = {
  rpcUrl: 'https://eth-mainnet.alchemyapi.io/v2/production-key',
  contractAddress: '0x...'
}
```

✅ **Do:**
```typescript
// Environment-specific configuration
const environments = {
  development: {
    rpcUrl: 'http://127.0.0.1:8545',
    contractAddress: '0x...' as Address,
    chainId: 1337
  },
  testnet: {
    rpcUrl: 'https://eth-goerli.alchemyapi.io/v2/test-key',
    contractAddress: '0x...' as Address,
    chainId: 5
  },
  production: {
    rpcUrl: 'https://eth-mainnet.alchemyapi.io/v2/prod-key',
    contractAddress: '0x...' as Address,
    chainId: 1
  }
}

const config = environments[process.env.NODE_ENV || 'development']
```

### **2. Health Checks**

❌ **Don't:**
```typescript
// No health monitoring
app.listen(3000)
```

✅ **Do:**
```typescript
// Implement health checks
app.get('/health', async (req, res) => {
  try {
    // Check RPC connection
    const blockNumber = await publicClient.getBlockNumber()
    
    // Check contract accessibility
    const owner = await secureOwnable.owner()
    
    res.json({
      status: 'healthy',
      blockNumber: blockNumber.toString(),
      contractOwner: owner,
      timestamp: Date.now()
    })
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: Date.now()
    })
  }
})
```

## 📚 **Documentation Best Practices**

### **1. Code Documentation**

❌ **Don't:**
```typescript
// No documentation
function transferOwnership(newOwner: string) {
  return secureOwnable.transferOwnershipRequest(newOwner)
}
```

✅ **Do:**
```typescript
/**
 * Transfers ownership of the contract to a new owner
 * 
 * @param newOwner - The address of the new owner
 * @param options - Optional transaction parameters
 * @returns Promise resolving to the transaction hash
 * 
 * @throws {Error} If the caller is not the current owner
 * @throws {Error} If the new owner address is invalid
 * @throws {Error} If the transaction fails
 * 
 * @example
 * ```typescript
 * const txHash = await transferOwnership('0x...')
 * console.log('Ownership transfer requested:', txHash)
 * ```
 */
async function transferOwnership(
  newOwner: Address,
  options?: TransactionOptions
): Promise<Hash> {
  // Implementation
}
```

### **2. README Documentation**

❌ **Don't:**
```markdown
# My Project
This is my project.
```

✅ **Do:**
```markdown
# Guardian TypeScript SDK Integration

A comprehensive integration with Guardian protocol contracts.

## Features
- ✅ SecureOwnable contract integration
- ✅ RuntimeRBAC role management
- ✅ Workflow analysis and validation
- ✅ Protocol compliance checking

## Quick Start
```typescript
import { SecureOwnable } from '@bloxchain/sdk/typescript'

const secureOwnable = new SecureOwnable(client, walletClient, address, chain)
const owner = await secureOwnable.owner()
```

## API Reference
See [API Documentation](./docs/api-reference.md) for complete reference.

## Contributing
See [Contributing Guide](./CONTRIBUTING.md) for development guidelines.
```

---

**Ready to implement these practices?** Check out the [Examples](./examples-basic.md) for practical implementations.
