# SDK Testing Framework

A comprehensive testing framework for the Bloxchain Protocol TypeScript SDK. This framework tests the SDK itself using only SDK methods, not direct contract calls.

## Overview

The SDK testing framework is similar to the `scripts/sanity/` contract tests but operates at a higher abstraction level:

- **Uses SDK classes** instead of direct Web3 contract calls
- **Built on Viem** instead of Web3.js
- **TypeScript native** with full type safety
- **Tests SDK functionality** to ensure the abstraction layer works correctly

## Directory Structure

```
scripts/sanity-sdk/
├── base/
│   ├── BaseSDKTest.ts          # Base test class with SDK initialization
│   ├── test-config.ts          # Configuration and environment setup
│   └── test-helpers.ts         # Helper utilities (time advancement, assertions, etc.)
├── secure-ownable/
│   ├── base-test.ts            # SecureOwnable-specific base class
│   ├── ownership-transfer-tests.ts
│   ├── broadcaster-update-tests.ts (coming soon)
│   ├── recovery-update-tests.ts (coming soon)
│   ├── timelock-period-tests.ts (coming soon)
│   ├── eip712-signing-tests.ts (coming soon)
│   └── run-tests.ts            # Test runner
├── dynamic-rbac/
│   └── (coming soon)
├── workflow/
│   └── (coming soon)
└── README.md
```

## Prerequisites

1. **Node.js 16+** and npm
2. **TypeScript** and **ts-node** (for running TypeScript tests)
3. **Ganache** or local blockchain for testing
4. **Deployed contracts** (via Truffle migrations)

## Installation

Install required dependencies:

```bash
npm install
```

If `ts-node` is not installed, add it:

```bash
npm install --save-dev ts-node @types/node typescript
```

## Configuration

### Environment Variables

Create a `.env` file in the project root (copy from `env.example`):

```bash
# Test Mode: 'auto' (uses Ganache + artifacts) or 'manual' (uses env vars)
TEST_MODE=auto

# RPC URL (or use REMOTE_HOST/REMOTE_PORT/REMOTE_PROTOCOL)
RPC_URL=http://localhost:8545

# Contract Addresses (for manual mode)
SECUREBLOX_ADDRESS=0x...
DYNAMICRBAC_ADDRESS=0x...

# Private Keys (for manual mode)
TEST_WALLET_1_PRIVATE_KEY=0x...
TEST_WALLET_2_PRIVATE_KEY=0x...
TEST_WALLET_3_PRIVATE_KEY=0x...
TEST_WALLET_4_PRIVATE_KEY=0x...
TEST_WALLET_5_PRIVATE_KEY=0x...
```

### Test Modes

#### Auto Mode (`TEST_MODE=auto`)
- Automatically discovers contract addresses from Truffle build artifacts
- Uses Ganache's deterministic private keys
- Best for local development
- Requires: Ganache running on localhost:8545
- Requires: Contracts deployed via Truffle migrations

#### Manual Mode (`TEST_MODE=manual`)
- Uses contract addresses and private keys from environment variables
- Works with any Ethereum network (local or remote)
- Best for remote testing or custom networks
- Requires: All addresses and keys configured in `.env`

## Usage

### Run All SecureOwnable Tests

```bash
npm run test:sanity-sdk:secure-ownable -- --all
```

### Run Specific Test Suite

```bash
npm run test:sanity-sdk:secure-ownable -- --ownership
```

### Direct Execution

```bash
ts-node scripts/sanity-sdk/secure-ownable/run-tests.ts --all
ts-node scripts/sanity-sdk/secure-ownable/run-tests.ts --ownership
```

## Available Test Suites

### SecureOwnable Tests

- `--ownership`: Tests ownership transfer workflows (request, cancel, approve)
- `--broadcaster`: Tests broadcaster update workflows (coming soon)
- `--recovery`: Tests recovery update workflows (coming soon)
- `--timelock`: Tests timelock period updates (coming soon)
- `--eip712`: Tests EIP-712 signing and meta-transactions (coming soon)

## Test Framework Architecture

### BaseSDKTest

The base class provides:

- Viem client initialization (PublicClient, WalletClient)
- Wallet management (auto/manual mode)
- Contract address discovery
- Transaction result handling
- Time advancement utilities
- Assertion helpers

### SecureOwnable Base Test

Extends `BaseSDKTest` with:

- SecureOwnable SDK initialization
- Role discovery (owner, broadcaster, recovery)
- Role-based wallet mapping
- Timelock waiting utilities

## Writing Tests

### Example Test Class

```typescript
import { BaseSecureOwnableTest } from './base-test';

export class MyTest extends BaseSecureOwnableTest {
  constructor() {
    super('My Test Suite');
  }

  async executeTests(): Promise<void> {
    console.log('Running my tests...');
    
    // Use SDK methods
    if (!this.secureOwnable) {
      throw new Error('SDK not initialized');
    }

    // Test ownership transfer request
    const recoveryWallet = this.getRoleWallet('recovery');
    const secureOwnableRecovery = this.createSecureOwnableWithWallet('wallet1');
    
    const result = await secureOwnableRecovery.transferOwnershipRequest({
      from: recoveryWallet.address,
    });

    this.assertTest(!!result.hash, 'Transaction created');
    await result.wait();
    
    // Verify transaction
    const pendingTxs = await this.secureOwnable.getPendingTransactions();
    this.assertTest(pendingTxs.length > 0, 'Pending transaction found');
  }
}
```

## Key Differences from Sanity Tests

| Feature | Sanity Tests | SDK Tests |
|---------|-------------|-----------|
| **Library** | Web3.js | Viem |
| **Language** | JavaScript | TypeScript |
| **Abstraction** | Direct contract calls | SDK classes |
| **ABI Loading** | Manual | Automatic (via SDK) |
| **Type Safety** | Runtime checks | Compile-time types |
| **Transaction Handling** | Web3 receipt | TransactionResult |

## Troubleshooting

### "Contract address not found"

- **Auto mode**: Ensure contracts are deployed via Truffle and artifacts exist in `build/contracts/`
- **Manual mode**: Verify `SECUREBLOX_ADDRESS` is set in `.env`

### "Wallet not found"

- **Auto mode**: Ensure Ganache is running and has at least 5 accounts
- **Manual mode**: Verify all `TEST_WALLET_*_PRIVATE_KEY` are set in `.env`

### "RPC URL not accessible"

- Verify RPC URL is correct in `.env`
- Ensure Ganache/blockchain node is running
- Check network connectivity

### "Transaction failed"

- Check gas limits and gas prices
- Verify wallet has sufficient balance
- Ensure contract is deployed and initialized correctly

## Contributing

When adding new test suites:

1. Create test class extending appropriate base class
2. Add test suite to runner's `testSuites` object
3. Add command-line argument parsing
4. Update this README

## License

Part of the Bloxchain Protocol - follows the same licensing terms.

