# SimpleRWA20 Sanity Tests

This directory contains comprehensive sanity tests for the SimpleRWA20 contract, which implements a secure ERC20 token for real-world assets with enhanced security via Guardian.

## Overview

SimpleRWA20 is an example contract that demonstrates:
- ERC20 token functionality with minting and burning
- Meta-transaction support for secure operations
- Role-based access control (Owner, Broadcaster, Recovery)
- Integration with the Bloxchain protocol
- ERC20Burnable functionality for secure token destruction

## Test Structure

### Test Files

- **`base-test.js`** - Base test class with common functionality
- **`token-tests.js`** - Tests for token operations (mint/burn/transfer)
- **`run-tests.js`** - Test runner and orchestration
- **`README.md`** - This documentation

### Test Categories

1. **Token Operation Tests** (`--token`)
   - Initial state verification
   - Token minting via meta-transactions
   - Token burning via meta-transactions
   - Meta-transaction parameter variations
   - Standard ERC20 transfers
   - ERC20Burnable functionality

## Usage

### Prerequisites

1. Ensure the SimpleRWA20 contract is deployed and initialized
2. Set up environment variables (see below)
3. Have Ganache running or configure manual mode

### Running Tests

```bash
# Run all tests
node run-tests.js --all

# Run specific test suite
node run-tests.js --token

# Show help
node run-tests.js --help
```

### Environment Variables

#### Auto Mode (Recommended)
```bash
TEST_MODE=auto
# Tests will automatically fetch contract addresses from Truffle artifacts
# and use Ganache accounts
```

#### Manual Mode
```bash
TEST_MODE=manual
SIMPLE_RWA20_ADDRESS=0x...
OWNER_PRIVATE_KEY=0x...
BROADCASTER_PRIVATE_KEY=0x...
RECOVERY_PRIVATE_KEY=0x...
```

### Test Flow

1. **Initialization**
   - Load contract ABI and address
   - Initialize test wallets
   - Load role assignments from contract
   - Verify token metadata (name, symbol, decimals)

2. **Token Operation Tests**
   - Verify initial token state
   - Test minting via meta-transactions
   - Test burning via meta-transactions
   - Test different meta-transaction parameters
   - Test standard ERC20 transfers
   - Test ERC20Burnable functionality

## Expected Behavior

### Successful Test Run
- All tests should pass with ✅ status
- Token minting and burning should work correctly
- Meta-transactions should execute properly
- Standard ERC20 transfers should function normally
- Role-based permissions should be enforced
- Total supply should update correctly

### Common Issues

1. **Contract Not Deployed**
   - Ensure SimpleRWA20 is deployed via migration 3
   - Check contract address in environment or artifacts

2. **Insufficient Token Balance**
   - Tests may skip burning operations if insufficient balance
   - Mint tokens first to ensure adequate balance for testing

3. **Permission Errors**
   - Verify role assignments match test wallet addresses
   - Check that broadcaster wallet is used for meta-transactions

4. **Meta-transaction Issues**
   - Ensure EIP-712 signing is working correctly
   - Check deadline and gas price parameters

## Contract Features Tested

### Core Functionality
- ✅ Token metadata (name, symbol, decimals)
- ✅ Token balances and total supply
- ✅ Token minting via meta-transactions
- ✅ Token burning via meta-transactions
- ✅ Standard ERC20 transfers
- ✅ ERC20Burnable functionality

### Security Features
- ✅ Role-based access control
- ✅ Meta-transaction support
- ✅ Input validation
- ✅ Permission checks
- ✅ Allowance-based burning

### Integration Features
- ✅ Bloxchain protocol integration
- ✅ EngineBlox usage
- ✅ EIP-712 signing
- ✅ Event emission
- ✅ Upgradeable contract support

## Troubleshooting

### Debug Mode
Set `DEBUG=true` in environment for verbose logging.

### Manual Verification
Use the contract methods directly to verify state:
```javascript
// Check token balance
await contract.methods.balanceOf(address).call()

// Check total supply
await contract.methods.totalSupply().call()

// Check token metadata
await contract.methods.name().call()
await contract.methods.symbol().call()
await contract.methods.decimals().call()
```

### Common Error Messages

- `"OperationNotSupported"` - Insufficient balance or invalid operation
- `"NoPermission"` - Role-based access control violation
- `"InvalidAddress"` - Zero address validation failed
- `"ERC20InsufficientBalance"` - Insufficient token balance for operation
- `"ERC20InsufficientAllowance"` - Insufficient allowance for burning

## Token Operations

### Minting
- Only broadcaster can execute minting meta-transactions
- Owner must sign meta-transactions
- Tokens are minted to specified recipient
- Total supply increases accordingly

### Burning
- Only broadcaster can execute burning meta-transactions
- Owner must sign meta-transactions
- Tokens are burned from specified account
- Total supply decreases accordingly
- Uses ERC20Burnable for allowance checks

### Transfers
- Standard ERC20 transfer functionality
- No special permissions required
- Standard balance and allowance checks

## Contributing

When adding new tests:
1. Extend the base test class
2. Implement the `executeTests()` method
3. Use proper error handling and logging
4. Update this README with new test descriptions
5. Add the new test to the test runner

## Security Considerations

These tests are designed for development and testing environments. Do not use test private keys or addresses in production. Always verify contract deployments and configurations before running tests against mainnet or production contracts.

The SimpleRWA20 contract implements military-grade security patterns and should be thoroughly audited before production deployment.
