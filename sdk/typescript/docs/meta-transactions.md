# Meta-Transactions Guide

## Overview

The Meta-Transaction system provides a standardized way to create and sign meta-transactions for the Bloxchain system. This utility leverages the contract's own EIP-712 message hash generation to ensure signature compatibility and avoid JavaScript replication issues.

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
5. **Entrypoint binding**: On-chain verification requires `MetaTxParams.handlerSelector` to equal the selector of the **actual** public function used to submit the meta-transaction, and `handlerContract` to equal the verifying account address (same as the EIP-712 `verifyingContract`). Do not sign one handler and submit through a different sibling wrapper.
6. **Raw digest signing**: The contract’s `message` field is the final EIP-712 digest (`\x19\x01` ‖ domain ‖ structHash). Wallets must **not** use `personal_sign` on that 32-byte value—`personal_sign` wraps the payload with the EIP-191 “Ethereum signed message” prefix, so `ecrecover` on-chain will fail. Use Viem `signMessage({ message: { raw: digest } })`, `signTypedData` with the same domain/types as `EngineBlox` (see `signMetaTransactionWithWallet` in `metaTransaction.tsx`), or a local `sign({ hash })` for backend keys.

## Workflow Patterns

### **Pattern 1: Programmatic Signing (Backend/Node.js)**

```typescript
import { MetaTransactionSigner, MetaTransactionBuilder } from '../utils/metaTx/metaTransaction';
import type { Address, Hex } from 'viem';

// Option A — Wallet client (e.g. server HSM / browser wallet passed in): EIP-712 typed data via the SDK
const signerWithWallet = new MetaTransactionSigner(
  publicClient,
  walletClient,
  contractAddress,
  chain
);

const unsignedMetaTx = await signerWithWallet.createUnsignedMetaTransactionForNew(
  txParams,
  metaTxParams
);

const signedMetaTx = await signerWithWallet.signMetaTransactionWithWallet(unsignedMetaTx);

// Option B — Known private key: sign the contract digest directly (no EIP-191 prefix)
const signer = new MetaTransactionSigner(publicClient, undefined, contractAddress, chain);
const unsigned = await signer.createUnsignedMetaTransactionForNew(txParams, metaTxParams);
const signedWithKey = await signer.signMetaTransaction(
  unsigned,
  signerAddress as Address,
  privateKey as Hex
);

// Or one-shot with private key
const signedOneShot = await signer.createSignedMetaTransactionForNew(
  txParams,
  metaTxParams,
  signerAddress as Address,
  privateKey as Hex
);
```

### **Pattern 2: Frontend Wallet Integration**

Use a Viem wallet client and sign the **raw** contract digest. This matches on-chain `ecrecover` and mirrors [Guard Controller examples](./guard-controller.md) (`signMessage` with `message: { raw: metaTx.message }`).

```typescript
import { MetaTransactionSigner, MetaTransactionBuilder } from '../utils/metaTx/metaTransaction';
import { createWalletClient, custom, type Address, type Hex } from 'viem';

const signer = new MetaTransactionSigner(
  publicClient,
  undefined,
  contractAddress,
  chain
);

const unsignedMetaTx = await signer.createUnsignedMetaTransactionForNew(txParams, metaTxParams);

const walletClient = createWalletClient({
  account: userAddress as Address,
  chain,
  transport: custom(window.ethereum)
});

// Raw digest only — do not use personal_sign on unsignedMetaTx.message
const signature = await walletClient.signMessage({
  message: { raw: unsignedMetaTx.message as Hex },
  account: userAddress as Address
});

const signedMetaTx = await signer.createSignedMetaTransactionWithSignature(
  unsignedMetaTx,
  signature
);
```

### **Pattern 3: Hybrid Approach (Frontend + Backend)**

```typescript
import { MetaTransactionSigner } from '../utils/metaTx/metaTransaction';
import { createWalletClient, custom, type Address, type Hex } from 'viem';

// Frontend: Create unsigned meta-transaction
const signer = new MetaTransactionSigner(publicClient, undefined, contractAddress, chain);
const unsignedMetaTx = await signer.createUnsignedMetaTransactionForNew(txParams, metaTxParams);

const walletClient = createWalletClient({
  account: userAddress as Address,
  chain,
  transport: custom(window.ethereum)
});

const signature = await walletClient.signMessage({
  message: { raw: unsignedMetaTx.message as Hex },
  account: userAddress as Address
});

const response = await fetch('/api/submit-meta-transaction', {
  method: 'POST',
  body: JSON.stringify({ unsignedMetaTx, signature })
});

// Backend: Verify digest + signature, then submit
const backendSigner = new MetaTransactionSigner(publicClient, undefined, contractAddress, chain);
const signedMetaTx = await backendSigner.createSignedMetaTransactionWithSignature(
  unsignedMetaTx,
  signature as Hex
);
```

## Usage Examples

### **Basic Setup**

```typescript
import { MetaTransactionSigner, MetaTransactionBuilder } from '../utils/metaTx/metaTransaction';
import { PublicClient, WalletClient, Chain, type Address, type Hex } from 'viem';

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

// Create and sign (private key path) — or use signMetaTransactionWithWallet if signer was constructed with walletClient
const signedMetaTx = await signer.createSignedMetaTransactionForNew(
  txParams,
  metaTxParams,
  signerAddress as Address,
  privateKey as Hex
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

const signedMetaTx = await signer.createSignedMetaTransactionForExisting(
  existingTxId,
  metaTxParams,
  signerAddress as Address,
  privateKey as Hex
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

const signedMetaTx = await signer.createSignedMetaTransactionForExisting(
  txIdToCancel,
  metaTxParams,
  signerAddress as Address,
  privateKey as Hex
);
```

### **Frontend Wallet Integration Example**

See also [Guard Controller](./guard-controller.md) for the same `signMessage({ message: { raw } })` pattern on a full config flow.

```typescript
import { useState } from 'react';
import { MetaTransactionSigner, MetaTransactionBuilder } from '../utils/metaTx/metaTransaction';
import { createWalletClient, custom, type Address, type Hex } from 'viem';

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
      const walletClient = createWalletClient({
        account: userAddress as Address,
        chain,
        transport: custom(window.ethereum)
      });
      const signature = await walletClient.signMessage({
        message: { raw: unsignedMetaTx.message as Hex },
        account: userAddress as Address
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
    const signedMetaTx = await this.signer.createSignedMetaTransactionForNew(
      request.txParams,
      request.metaTxParams,
      request.signerAddress,
      request.privateKey
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

#### `signMetaTransactionWithWallet(unsignedMetaTx)`
Signs using the configured `walletClient` and `signTypedData` with the SDK’s `META_TX_DOMAIN` / `META_TX_TYPES` (must match `EngineBlox` on-chain).
- **Requires** `walletClient` with an active account
- **Returns**: Complete signed `MetaTransaction`
- **Use case**: Browser or server wallet without exporting the private key

#### `signMetaTransaction(unsignedMetaTx, signerAddress, privateKey)`
Signs the contract-returned digest with `account.sign({ hash })` (raw digest; no EIP-191 prefix).
- **Requires** the signer’s private key
- **Returns**: Complete signed `MetaTransaction`
- **Use case**: Backend automation, tests, custodial signers

#### `createSignedMetaTransactionWithSignature(unsignedMetaTx, signature)`
Creates a signed meta-transaction with an external signature.
- **No wallet client required**
- **Returns**: Complete signed `MetaTransaction`
- **Use case**: Frontend wallet integration

### **Convenience Methods**

#### `createSignedMetaTransactionForNew(txParams, metaTxParams, signerAddress, privateKey)`
Combines unsigned creation and private-key signing for new operations.

#### `createSignedMetaTransactionForExisting(txId, metaTxParams, signerAddress, privateKey)`
Combines unsigned creation and private-key signing for existing operations.

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

- `signMetaTransactionWithWallet(unsignedMetaTx): Promise<MetaTransaction>`
- `signMetaTransaction(unsignedMetaTx, signerAddress, privateKey): Promise<MetaTransaction>`
- `createSignedMetaTransactionForNew(txParams, metaTxParams, signerAddress, privateKey): Promise<MetaTransaction>`
- `createSignedMetaTransactionForExisting(txId, metaTxParams, signerAddress, privateKey): Promise<MetaTransaction>`

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
1. Contract generates the EIP-712 digest (`message`) using its own implementation.
2. The client signs that digest **without** an extra EIP-191 wrapper: e.g. Viem `signMessage({ message: { raw: message } })`, SDK `signMetaTransactionWithWallet` (typed data matching the contract), or `sign({ hash })` for local keys.
3. The SDK verifies locally in `createSignedMetaTransactionWithSignature` / `signMetaTransaction` paths before returning.
4. The contract recovers the signer from the same digest during execution.

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
    signerAddress as Address,
    privateKey as Hex
  );
} catch (error) {
  if (error.message.includes('walletClient is required')) {
    // Use signMessage({ raw }) + createSignedMetaTransactionWithSignature, or pass walletClient
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
    signerAddress as Address,
    privateKey as Hex
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

### Invalid signature / wrong signer (EIP-191 vs raw digest)

If the SDK throws **Signature verification failed** or the contract reverts on meta-tx submit:

- **Wrong:** `personal_sign` (or any API that applies the EIP-191 “Ethereum signed message” prefix) on `unsignedMetaTx.message`. The contract hashes `\x19\x01` ‖ domain ‖ structHash **once**; adding the text-message prefix produces a different digest.
- **Right:** Viem `walletClient.signMessage({ message: { raw: unsignedMetaTx.message }, account })`, or SDK `signMetaTransactionWithWallet(unsignedMetaTx)` with a wallet client, or `signMetaTransaction` / `sign({ hash })` with the raw digest for local keys.

Full flow examples: [Guard Controller](./guard-controller.md) (raw digest signing).

### Common Issues

1. **Wallet client missing**: Required for `signMetaTransactionWithWallet`; use `signMessage` + `createSignedMetaTransactionWithSignature` if you only have an EIP-1193 provider and build `createWalletClient` yourself.
2. **Contract address invalid**: Verify the contract address is correct
3. **Signature verification failed**: Confirm the signing API above; confirm `params.signer` matches the account that signed
4. **Permission denied**: Verify the signer has appropriate roles
5. **Deadline expired**: Ensure the deadline is in the future

### Debug Information

Enable debug logging:

```typescript
// The utility provides detailed console logging
console.log('🔐 Creating signed meta-transaction...');
console.log('📝 Contract-generated message hash:', messageHash);
console.log('✍️ Signature created:', signature);
console.log('✅ Signature verified successfully');
```

## Integration with Bloxchain System

### Contract Integration

The utility integrates with the Bloxchain system through:

1. **SecureOwnable Contract**: Uses the contract's meta-transaction functions
2. **EngineBlox Library**: Leverages the library's EIP-712 implementation
3. **Dynamic RBAC**: Integrates with the role-based access control system

### Workflow Integration

Meta-transactions integrate into the Bloxchain workflow:

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
// Older docs used { from: signerAddress } — the API requires an explicit private key for
// createSignedMetaTransactionForNew / signMetaTransaction, or a wallet client for signMetaTransactionWithWallet.

// Private key path (unchanged shape; parameters were clarified in docs)
const signedPk = await signer.createSignedMetaTransactionForNew(
  txParams,
  metaTxParams,
  signerAddress as Address,
  privateKey as Hex
);

// Separated workflow (private key)
const unsignedMetaTx = await signer.createUnsignedMetaTransactionForNew(txParams, metaTxParams);
const signedSeparated = await signer.signMetaTransaction(
  unsignedMetaTx,
  signerAddress as Address,
  privateKey as Hex
);

// Wallet client: typed data via SDK (no private key)
const signedWallet = await signerWithWallet.signMetaTransactionWithWallet(unsignedMetaTx);
```

## File Structure

The meta-transaction utilities are organized in a dedicated folder:

```
sdk/typescript/utils/metaTx/
├── metaTransaction.tsx   # MetaTransactionSigner, EIP-712 helpers, BaseStateMachine ABI usage
└── (ABI imported from ../../abi/BaseStateMachine.abi.json)
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

The Meta-Transaction system provides a robust, secure, and easy-to-use solution for creating and signing meta-transactions in the Bloxchain system. By leveraging the contract's own EIP-712 implementation, it ensures perfect compatibility and eliminates common JavaScript replication issues.

The new architecture provides the same functionality while enabling new integration patterns for frontend wallets and hybrid workflows, making it suitable for both backend automation and frontend user interactions.
