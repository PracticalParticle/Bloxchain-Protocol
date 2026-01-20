# GuardController SDK Tests

TypeScript SDK tests for GuardController contract functionality, specifically testing the secure whitelist management workflow using meta-transactions.

## Overview

These tests verify that the GuardController SDK correctly implements the secure whitelist update workflow:
- **Owner signs** meta-transactions for whitelist updates
- **Broadcaster executes** the meta-transactions
- All operations are protected by StateAbstraction's workflow system

## Test Suites

### Whitelist Management Tests (`whitelist-tests.ts`)

Tests the complete whitelist management lifecycle:
1. **Add Target to Whitelist** - Uses `updateTargetWhitelistRequestAndApprove` via meta-transaction
2. **Verify Target is Whitelisted** - Queries whitelist using `getAllowedTargets`
3. **Query All Allowed Targets** - Tests the query functionality
4. **Remove Target from Whitelist** - Uses `updateTargetWhitelistRequestAndApprove` with `isAdd=false`
5. **Verify Target is Removed** - Confirms target is no longer in whitelist

## Running Tests

### Prerequisites

1. Contracts must be deployed (run `npm run deploy:truffle`)
2. ControlBlox contract must be initialized with proper roles
3. Function schemas must be registered (if testing with custom function selectors)

### Run All Tests

```bash
npm run test:sanity-sdk:guard-controller -- --all
```

### Run Specific Test Suite

```bash
npm run test:sanity-sdk:guard-controller -- --whitelist
```

### Test Modes

The tests support two modes (set via `TEST_MODE` environment variable):

- **Auto Mode** (`TEST_MODE=auto`): 
  - Automatically fetches contract address from Truffle artifacts
  - Uses Ganache deterministic accounts
  
- **Manual Mode** (`TEST_MODE=manual`):
  - Uses `GUARDCONTROLLER_ADDRESS` or `CONTROLBLOX_ADDRESS` from environment
  - Uses `TEST_WALLET_*_PRIVATE_KEY` environment variables

## Environment Variables

For manual mode, set these in your `.env` file:

```bash
# Contract Address
GUARDCONTROLLER_ADDRESS=0x...
# or
CONTROLBLOX_ADDRESS=0x...

# Test Wallets (for manual mode)
TEST_WALLET_1_PRIVATE_KEY=0x...
TEST_WALLET_2_PRIVATE_KEY=0x...
TEST_WALLET_3_PRIVATE_KEY=0x...
TEST_WALLET_4_PRIVATE_KEY=0x...
TEST_WALLET_5_PRIVATE_KEY=0x...

# RPC Configuration
RPC_URL=http://localhost:8545
# or
REMOTE_HOST=your-host
REMOTE_PORT=8545
REMOTE_PROTOCOL=https
```

## Test Structure

```
guard-controller/
├── base-test.ts          # Base test class with GuardController-specific helpers
├── whitelist-tests.ts    # Whitelist management test suite
├── run-tests.ts          # Test runner
└── README.md            # This file
```

## Key Features Tested

### Meta-Transaction Workflow

The tests verify the complete meta-transaction workflow:
1. Owner creates execution params using `updateTargetWhitelistExecutionParams`
2. Owner signs meta-transaction using EIP-712
3. Broadcaster executes meta-transaction via `updateTargetWhitelistRequestAndApprove`
4. Contract validates permissions and executes `executeUpdateTargetWhitelist` internally

### Security Features

- ✅ Owner must sign meta-transactions
- ✅ Broadcaster must execute meta-transactions
- ✅ All operations go through StateAbstraction workflow
- ✅ Role and function selector validation
- ✅ Target address validation

## Example Usage

```typescript
import { GuardController } from '@bloxchain/sdk';
import { createPublicClient, createWalletClient } from 'viem';

// Initialize GuardController SDK
const guardController = new GuardController(
  publicClient,
  walletClient,
  contractAddress,
  chain
);

// Get execution params
const executionParams = await guardController.updateTargetWhitelistExecutionParams(
  roleHash,
  functionSelector,
  targetAddress,
  true // isAdd
);

// Create and sign meta-transaction (see base-test.ts for full example)
// ...

// Execute via broadcaster
const result = await guardController.updateTargetWhitelistRequestAndApprove(
  signedMetaTx,
  { from: broadcasterAddress }
);

// Query whitelisted targets
const allowedTargets = await guardController.getAllowedTargets(
  roleHash,
  functionSelector
);
```

## Notes

- The tests use `NATIVE_TRANSFER_SELECTOR` as the test function selector
- The role must have permission for the function selector before adding targets
- The whitelist is role-specific and function-selector-specific
- Empty whitelist means no targets are allowed (explicit deny)
