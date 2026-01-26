# Meta-Transactions Guide

## Overview

The Meta-Transaction system provides a standardized way to create and sign meta-transactions for the Guardian system. This utility leverages the contract's own EIP-712 message hash generation to ensure signature compatibility and avoid JavaScript replication issues.

## Key Features

- **Contract-Based Message Hash Generation**: Uses the contract's `generateUnsignedMetaTransactionForNew/ForExisting` functions
- **Type-Safe Implementation**: Full TypeScript support with proper type definitions
- **Automatic Signature Verification**: Built-in signature verification and validation
- **Support for Multiple Actions**: Request, approve, and cancel operations
- **Comprehensive Error Handling**: Detailed error messages and validation
- **Flexible Workflows**: Support for programmatic, frontend wallet, and hybrid integration patterns

## Architecture

### **Three-Step Process**
1. **Create Unsigned Meta-Transaction**: Contract generates EIP-712 message hash
2. **Sign Message Hash**: Either programmatically or via external wallet
3. **Verify & Complete**: Verify signature and return complete meta-transaction

### Core Components

1. **MetaTransactionSigner**: Main class for creating and signing meta-transactions
2. **MetaTransactionBuilder**: Helper class for creating parameter structures
3. **Type Definitions**: Comprehensive TypeScript interfaces for all structures

### Security Model

The signing process follows these security principles:

1. **Contract-First Approach**: Message hash generation is delegated to the contract
2. **EIP-712 Compliance**: Full compliance with EIP-712 standard
3. **Signature Verification**: Automatic verification of generated signatures
4. **Permission Validation**: Contract-level permission checking

## Workflow Patterns

### **Pattern 1: Programmatic Signing (Backend/Node.js)**

```typescript
import { MetaTransactionSigner, MetaTransactionBuilder } from './utils/metaTx/metaTransactionSigner';

// Initialize with wallet client
const signer = new MetaTransactionSigner(
  publicClient,
  walletClient, // Required for programmatic signing
  contractAddress,
  chain
);

// Step 1: Create unsigned meta-transaction
const unsignedMetaTx = await signer.createUnsignedMetaTransactionForNew(
  txParams,
  metaTxParams
);

// Step 2: Sign programmatically
const signedMetaTx = await signer.signMetaTransaction(
  unsignedMetaTx,
  signerAddress
);

// Or use convenience method (combines steps 1 & 2)
const signedMetaTx = await signer.createSignedMetaTransactionForNew(
  txParams,
  metaTxParams,
  signerAddress
);
```

### **Pattern 2: Frontend Wallet Integration**

```typescript
import { MetaTransactionSigner, MetaTransactionBuilder } from './utils/metaTx/metaTransactionSigner';

// Initialize without wallet client (read-only)
const signer = new MetaTransactionSigner(
  publicClient,
  undefined, // No wallet client needed for unsigned creation
  contractAddress,
  chain
);

// Step 1: Create unsigned meta-transaction
const unsignedMetaTx = await signer.createUnsignedMetaTransactionForNew(
  txParams,
  metaTxParams
);

// Step 2: Sign with frontend wallet (e.g., MetaMask, WalletConnect)
const signature = await window.ethereum.request({
  method: 'personal_sign',
  params: [unsignedMetaTx.message, userAddress]
});

// Step 3: Create signed meta-transaction with external signature
const signedMetaTx = await signer.createSignedMetaTransactionWithSignature(
  unsignedMetaTx,
  signature
);
```

### **Pattern 3: Hybrid Approach (Frontend + Backend)**

```typescript
// Frontend: Create unsigned meta-transaction
const signer = new MetaTransactionSigner(publicClient, undefined, contractAddress, chain);
const unsignedMetaTx = await signer.createUnsignedMetaTransactionForNew(txParams, metaTxParams);

// Frontend: Sign with wallet
const signature = await window.ethereum.request({
  method: 'personal_sign',
  params: [unsignedMetaTx.message, userAddress]
});

// Frontend: Send to backend
const response = await fetch('/api/submit-meta-transaction', {
  method: 'POST',
  body: JSON.stringify({
    unsignedMetaTx,
    signature
  })
});

// Backend: Verify and submit to contract
const backendSigner = new MetaTransactionSigner(publicClient, undefined, contractAddress, chain);
const signedMetaTx = await backendSigner.createSignedMetaTransactionWithSignature(
  unsignedMetaTx,
  signature
);
```

## Usage Examples

### **Basic Setup**

```typescript
import { MetaTransactionSigner, MetaTransactionBuilder } from './utils/metaTx/metaTransactionSigner';
import { PublicClient, WalletClient, Chain } from 'viem';

// Initialize the signer
const signer = new MetaTransactionSigner(
  publicClient,
  walletClient,
  contractAddress,
  chain
);
```

### **Creating a New Meta-Transaction**

```typescript
// Create execution options for a function call
const executionOptions = MetaTransactionBuilder.createStandardExecutionOptions(
  '0xf2fde38b', // transferOwnership(address) selector
  '0x000000000000000000000000' + newOwnerAddress.slice(2)
);

// Create transaction parameters
const txParams = MetaTransactionBuilder.createTxParams(
  requesterAddress,
  contractAddress,
  0n, // value
  200000n, // gas limit
  operationType,
  ExecutionType.STANDARD,
  executionOptions
);

// Create meta-transaction parameters
const metaTxParams = MetaTransactionBuilder.createMetaTxParams(
  contractAddress,
  handlerSelector,
  TxAction.SIGN_META_REQUEST_AND_APPROVE,
  deadline,
  maxGasPrice,
  signerAddress
);

// Create and sign the meta-transaction
const signedMetaTx = await signer.createSignedMetaTransactionForNew(
  txParams,
  metaTxParams,
  { from: signerAddress }
);
```

### **Approving an Existing Transaction**

```typescript
// Create meta-transaction parameters for approval
const metaTxParams = MetaTransactionBuilder.createMetaTxParams(
  contractAddress,
  handlerSelector,
  TxAction.SIGN_META_APPROVE,
  deadline,
  maxGasPrice,
  signerAddress
);

// Create signed meta-transaction for existing transaction
const signedMetaTx = await signer.createSignedMetaTransactionForExisting(
  existingTxId,
  metaTxParams,
  { from: signerAddress }
);
```

### **Canceling a Transaction**

```typescript
// Create meta-transaction parameters for cancellation
const metaTxParams = MetaTransactionBuilder.createMetaTxParams(
  contractAddress,
  handlerSelector,
  TxAction.SIGN_META_CANCEL,
  deadline,
  maxGasPrice,
  signerAddress
);

// Create signed meta-transaction for cancellation
const signedMetaTx = await signer.createSignedMetaTransactionForExisting(
  txIdToCancel,
  metaTxParams,
  { from: signerAddress }
);
```

### **Frontend Wallet Integration Example**

```typescript
// React component example
const MetaTransactionComponent = () => {
  const [unsignedMetaTx, setUnsignedMetaTx] = useState(null);
  const [signedMetaTx, setSignedMetaTx] = useState(null);

  const createUnsignedTx = async () => {
    const signer = new MetaTransactionSigner(publicClient, undefined, contractAddress, chain);
    
    const txParams = MetaTransactionBuilder.createTxParams(
      userAddress,
      contractAddress,
      0n,
      200000n,
      operationType,
      ExecutionType.STANDARD,
      executionOptions
    );

    const metaTxParams = MetaTransactionBuilder.createMetaTxParams(
      contractAddress,
      handlerSelector,
      TxAction.SIGN_META_REQUEST_AND_APPROVE,
      deadline,
      maxGasPrice,
      userAddress
    );

    const unsigned = await signer.createUnsignedMetaTransactionForNew(txParams, metaTxParams);
    setUnsignedMetaTx(unsigned);
  };

  const signWithWallet = async () => {
    if (!unsignedMetaTx) return;

    try {
      const signature = await window.ethereum.request({
        method: 'personal_sign',
        params: [unsignedMetaTx.message, userAddress]
      });

      const signer = new MetaTransactionSigner(publicClient, undefined, contractAddress, chain);
      const signed = await signer.createSignedMetaTransactionWithSignature(
        unsignedMetaTx,
        signature
      );
      
      setSignedMetaTx(signed);
    } catch (error) {
      console.error('Signing failed:', error);
    }
  };

  return (
    <div>
      <button onClick={createUnsignedTx}>Create Unsigned Meta-Transaction</button>
      {unsignedMetaTx && (
        <button onClick={signWithWallet}>Sign with Wallet</button>
      )}
      {signedMetaTx && (
        <div>Meta-transaction ready for submission!</div>
      )}
    </div>
  );
};
```

### **Backend Service Example**

```typescript
// Backend service for meta-transaction processing
class MetaTransactionService {
  private signer: MetaTransactionSigner;

  constructor(publicClient: PublicClient, walletClient: WalletClient, contractAddress: Address, chain: Chain) {
    this.signer = new MetaTransactionSigner(publicClient, walletClient, contractAddress, chain);
  }

  async processMetaTransactionRequest(request: MetaTransactionRequest) {
    // Create and sign meta-transaction programmatically
    const signedMetaTx = await this.signer.createSignedMetaTransactionForNew(
      request.txParams,
      request.metaTxParams,
      request.signerAddress
    );

    // Submit to contract
    return await this.submitToContract(signedMetaTx);
  }

  async verifyExternalSignature(unsignedMetaTx: MetaTransaction, signature: Hex) {
    // Verify external signature from frontend
    return await this.signer.createSignedMetaTransactionWithSignature(
      unsignedMetaTx,
      signature
    );
  }
}
```

## Transaction Actions

The system supports the following transaction actions:

| Action | Description | Use Case |
|--------|-------------|----------|
| `SIGN_META_REQUEST_AND_APPROVE` | Request and immediately approve a new transaction | Single-step operations |
| `SIGN_META_APPROVE` | Approve an existing pending transaction | Multi-step approval process |
| `SIGN_META_CANCEL` | Cancel an existing pending transaction | Emergency cancellation |

## Execution Types

### Standard Execution

For standard function calls with encoded parameters:

```typescript
const executionOptions = MetaTransactionBuilder.createStandardExecutionOptions(
  functionSelector,
  encodedParameters
);
```

### Raw Execution

For custom transaction data:

```typescript
const executionOptions = MetaTransactionBuilder.createRawExecutionOptions(
  rawTransactionData
);
```

## API Reference

### **Core Methods**

#### `createUnsignedMetaTransactionForNew(txParams, metaTxParams)`
Creates an unsigned meta-transaction for a new operation.
- **No wallet client required**
- **Returns**: `MetaTransaction` with contract-generated message hash
- **Use case**: Frontend wallet integration, hybrid workflows

#### `createUnsignedMetaTransactionForExisting(txId, metaTxParams)`
Creates an unsigned meta-transaction for an existing operation.
- **No wallet client required**
- **Returns**: `MetaTransaction` with contract-generated message hash
- **Use case**: Approving/canceling existing transactions

#### `signMetaTransaction(unsignedMetaTx, signerAddress)`
Signs an unsigned meta-transaction using the wallet client.
- **Requires wallet client**
- **Returns**: Complete signed `MetaTransaction`
- **Use case**: Programmatic signing

#### `createSignedMetaTransactionWithSignature(unsignedMetaTx, signature)`
Creates a signed meta-transaction with an external signature.
- **No wallet client required**
- **Returns**: Complete signed `MetaTransaction`
- **Use case**: Frontend wallet integration

### **Convenience Methods**

#### `createSignedMetaTransactionForNew(txParams, metaTxParams, signerAddress)`
Combines unsigned creation and programmatic signing for new operations.

#### `createSignedMetaTransactionForExisting(txId, metaTxParams, signerAddress)`
Combines unsigned creation and programmatic signing for existing operations.

### MetaTransactionSigner Class

#### Constructor

```typescript
constructor(
  client: PublicClient,
  walletClient: WalletClient | undefined,
  contractAddress: Address,
  chain: Chain
)
```

#### Methods

- `createSignedMetaTransactionForNew(txParams, metaTxParams, options): Promise<MetaTransaction>`
- `createSignedMetaTransactionForExisting(txId, metaTxParams, options): Promise<MetaTransaction>`

### MetaTransactionBuilder Class

#### Static Methods

- `createStandardExecutionOptions(functionSelector, params): Hex`
- `createRawExecutionOptions(rawTxData): Hex`
- `createMetaTxParams(handlerContract, handlerSelector, action, deadline, maxGasPrice, signer, chainId?, nonce?): MetaTxParams`
- `createTxParams(requester, target, value, gasLimit, operationType, executionType, executionOptions): TxParams`

## Contract Integration Points

### **EngineBlox.sol Functions Used**
1. `generateUnsignedForNewMetaTx()` - Creates unsigned meta-transaction for new operations
2. `generateUnsignedForExistingMetaTx()` - Creates unsigned meta-transaction for existing operations
3. `generateMessageHash()` - Generates EIP-712 message hash (called internally by above functions)
4. `createMetaTxParams()` - Helper function for creating meta-transaction parameters

### **EIP-712 Implementation**
The contract implements EIP-712 with:
- **Domain**: `EngineBlox`, version `1`
- **Chain ID**: Current blockchain chain ID
- **Verifying Contract**: The contract address
- **Type Hash**: Complex nested structure for MetaTransaction

### **Signature Verification Flow**
1. Contract generates message hash using its own EIP-712 implementation
2. SDK signs the message hash using wallet client
3. SDK verifies signature locally for immediate feedback
4. Contract verifies signature again during execution

## Security Considerations

### Message Hash Generation

The utility uses the contract's own EIP-712 message hash generation to ensure:

1. **Exact Compliance**: Perfect alignment with on-chain implementation
2. **No Replication Issues**: Avoids JavaScript implementation differences
3. **Future Compatibility**: Automatically adapts to contract updates

### Signature Verification

All signatures are automatically verified:

1. **Message Hash Validation**: Ensures the message hash is valid
2. **Signer Recovery**: Recovers the signer address from the signature
3. **Address Matching**: Verifies the recovered address matches the expected signer

### Permission Validation

The contract performs additional validation:

1. **Role-Based Access**: Checks if the signer has appropriate roles
2. **Function Permissions**: Validates function-specific permissions
3. **Action Authorization**: Ensures the action is allowed for the function

## Error Handling

The utility provides comprehensive error handling:

```typescript
try {
  const signedMetaTx = await signer.createSignedMetaTransactionForNew(
    txParams,
    metaTxParams,
    options
  );
} catch (error) {
  if (error.message.includes('Wallet client is required')) {
    // Handle missing wallet client
  } else if (error.message.includes('Contract call failed')) {
    // Handle contract interaction errors
  } else if (error.message.includes('Signature verification failed')) {
    // Handle signature verification errors
  }
}
```

## Best Practices

### Parameter Validation

Always validate parameters before creating meta-transactions:

```typescript
// Validate addresses
if (!isAddress(requesterAddress)) {
  throw new Error('Invalid requester address');
}

// Validate deadlines
if (deadline <= BigInt(Math.floor(Date.now() / 1000))) {
  throw new Error('Deadline must be in the future');
}

// Validate gas limits
if (gasLimit <= 0n) {
  throw new Error('Gas limit must be positive');
}
```

### Error Handling

Implement comprehensive error handling:

```typescript
try {
  const signedMetaTx = await signer.createSignedMetaTransactionForNew(
    txParams,
    metaTxParams,
    options
  );
  
  // Success handling
  console.log('Meta-transaction created successfully');
  
} catch (error) {
  // Error handling
  console.error('Meta-transaction creation failed:', error.message);
  
  // Retry logic or user notification
  if (error.message.includes('nonce')) {
    // Handle nonce issues
  }
}
```

### Gas Optimization

Optimize gas usage:

```typescript
// Use appropriate gas limits
const gasLimit = await estimateGasForOperation();

// Set reasonable max gas prices
const maxGasPrice = parseEther('0.0001'); // 100 gwei

// Use standard execution when possible
const executionType = ExecutionType.STANDARD;
```

## Troubleshooting

### Common Issues

1. **Wallet Client Missing**: Ensure wallet client is properly initialized
2. **Contract Address Invalid**: Verify the contract address is correct
3. **Signature Verification Failed**: Check that the signer address matches
4. **Permission Denied**: Verify the signer has appropriate roles
5. **Deadline Expired**: Ensure the deadline is in the future

### Debug Information

Enable debug logging:

```typescript
// The utility provides detailed console logging
console.log('🔐 Creating signed meta-transaction...');
console.log('📝 Contract-generated message hash:', messageHash);
console.log('✍️ Signature created:', signature);
console.log('✅ Signature verified successfully');
```

## Integration with Guardian System

### Contract Integration

The utility integrates with the Guardian system through:

1. **SecureOwnable Contract**: Uses the contract's meta-transaction functions
2. **EngineBlox Library**: Leverages the library's EIP-712 implementation
3. **Dynamic RBAC**: Integrates with the role-based access control system

### Workflow Integration

Meta-transactions integrate into the Guardian workflow:

1. **Request Phase**: Create and sign meta-transaction for new operations
2. **Approval Phase**: Sign meta-transactions to approve pending operations
3. **Execution Phase**: Contract executes the operation after verification
4. **Completion Phase**: Transaction status is updated based on execution result

## Benefits of Separated Workflow

### **Flexibility**
- **Frontend Integration**: Support for MetaMask, WalletConnect, etc.
- **Backend Processing**: Programmatic signing for automated flows
- **Hybrid Approaches**: Combine frontend UX with backend security

### **Security**
- **Contract-First**: Message hash generation always uses contract
- **Signature Verification**: Automatic verification before completion
- **Type Safety**: Full TypeScript support throughout

### **Developer Experience**
- **Simple API**: Clear separation of concerns
- **Multiple Patterns**: Support for different integration needs
- **Error Handling**: Clean error propagation and handling

## Migration Guide

### **From Previous Version**

```typescript
// Old: Single method with wallet client requirement
const signedMetaTx = await signer.createSignedMetaTransactionForNew(
  txParams,
  metaTxParams,
  { from: signerAddress }
);

// New: Separated workflow
const unsignedMetaTx = await signer.createUnsignedMetaTransactionForNew(txParams, metaTxParams);
const signedMetaTx = await signer.signMetaTransaction(unsignedMetaTx, signerAddress);

// Or use convenience method (same as before)
const signedMetaTx = await signer.createSignedMetaTransactionForNew(
  txParams,
  metaTxParams,
  signerAddress
);
```

## File Structure

The meta-transaction utilities are organized in a dedicated folder:

```
sdk/typescript/utils/metaTx/
├── metaTransactionSigner.tsx    # Main utility class
├── MetaTx.abi.json             # Stripped-down ABI
└── README.md                   # Documentation
```

### Benefits of This Structure

1. **Clean Separation**: Meta-transaction utilities are isolated
2. **External ABI**: ABI is separate from code logic
3. **Focused Scope**: Only meta-transaction related functionality
4. **Maintainability**: Easy to update ABI without touching code
5. **Reusable ABI**: ABI can be used by other tools/utilities

## Production Readiness

### ✅ **Code Quality**
- [x] No console logs or debug output
- [x] Clean error handling
- [x] Proper TypeScript types
- [x] No linting errors
- [x] Minimal API surface

### ✅ **Security**
- [x] Contract-based message hash generation
- [x] Automatic signature verification
- [x] Type-safe parameter validation
- [x] EIP-712 compliance

### ✅ **Compatibility**
- [x] Function names match contract
- [x] ABI definitions correct
- [x] Data structures aligned
- [x] Parameter types compatible

### ✅ **Usability**
- [x] Simple API for common use cases
- [x] Builder pattern for parameter creation
- [x] Support for both new and existing transactions
- [x] Clear error messages

## Conclusion

The Meta-Transaction system provides a robust, secure, and easy-to-use solution for creating and signing meta-transactions in the Guardian system. By leveraging the contract's own EIP-712 implementation, it ensures perfect compatibility and eliminates common JavaScript replication issues.

The new architecture provides the same functionality while enabling new integration patterns for frontend wallets and hybrid workflows, making it suitable for both backend automation and frontend user interactions.
