# SimpleVault Sanity Tests

This directory contains comprehensive sanity tests for the SimpleVault contract, which implements a secure vault with time-locked withdrawal functionality.

## Overview

SimpleVault is an example contract that demonstrates:
- ETH and token withdrawal with time-lock security
- Meta-transaction support for approvals
- Role-based access control (Owner, Broadcaster, Recovery)
- Integration with the Bloxchain protocol and BaseStateMachine
- Centralized state management through EngineBlox library

## Test Structure

### Test Files

- **`base-test.js`** - Base test class with common functionality
- **`withdrawal-tests.js`** - Tests for withdrawal functionality
- **`run-tests.js`** - Test runner and orchestration
- **`README.md`** - This documentation

### Test Categories

1. **Withdrawal Tests** (`--withdrawal`)
   - Initial state verification
   - ETH deposit functionality
   - ETH withdrawal request creation
   - Time-locked withdrawal approval
   - Token withdrawal (simulated)
   - Withdrawal cancellation
   - Meta-transaction approval

## Usage

### Prerequisites

1. Ensure the SimpleVault contract is deployed and initialized
2. Set up environment variables (see below)
3. Have Ganache running or configure manual mode

### Running Tests

```bash
# Run all tests
node run-tests.js --all

# Run specific test suite
node run-tests.js --withdrawal

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
SIMPLE_VAULT_ADDRESS=0x...
OWNER_PRIVATE_KEY=0x...
BROADCASTER_PRIVATE_KEY=0x...
RECOVERY_PRIVATE_KEY=0x...
```

### Test Flow

1. **Initialization**
   - Load contract ABI and address
   - Initialize test wallets
   - Load role assignments from contract

2. **Withdrawal Tests**
   - Verify initial contract state
   - Deposit ETH to vault
   - Create withdrawal requests
   - Test time-locked approvals
   - Test withdrawal cancellations
   - Test meta-transaction approvals

## Expected Behavior

### Successful Test Run
- All tests should pass with ✅ status (Current: 100% success rate)
- ETH deposits and withdrawals should work correctly
- Time-lock delays should be respected
- Meta-transactions should execute properly
- Role-based permissions should be enforced
- Function selectors should be computed from definitions library

### Common Issues

1. **Contract Not Deployed**
   - Ensure SimpleVault is deployed via migration 3
   - Check contract address in environment or artifacts

2. **Insufficient ETH**
   - Ensure test wallets have enough ETH for gas and deposits
   - Check Ganache account balances

3. **Time-lock Issues**
   - Tests wait 65 seconds for 1-minute timelock
   - Ensure system clock is accurate

4. **Permission Errors**
   - Verify role assignments match test wallet addresses
   - Check that correct wallet is used for each operation
   - Ensure function selectors match definitions library

5. **Meta-transaction Issues**
   - Verify EIP-712 signature generation
   - Check that signer has required permissions
   - Ensure meta-transaction uses correct function selector from definitions

## Contract Features Tested

### Core Functionality
- ✅ ETH balance tracking
- ✅ ETH deposit via receive function
- ✅ ETH withdrawal requests
- ✅ Token withdrawal requests
- ✅ Time-locked approvals
- ✅ Withdrawal cancellations

### Security Features
- ✅ Role-based access control
- ✅ Time-lock enforcement
- ✅ Meta-transaction support
- ✅ Input validation
- ✅ Permission checks

### Integration Features
- ✅ Bloxchain protocol integration
- ✅ BaseStateMachine centralized helpers
- ✅ EngineBlox library usage
- ✅ SimpleVaultDefinitions as source of truth
- ✅ EIP-712 signing with computed selectors
- ✅ Event emission

## Troubleshooting

### Debug Mode
Set `DEBUG=true` in environment for verbose logging.

### Manual Verification
Use the contract methods directly to verify state:
```javascript
// Check ETH balance
await contract.methods.getEthBalance().call()

// Check owner
await contract.methods.owner().call()

// Check pending transactions
await contract.methods.getPendingTransactions().call()
```

### Common Error Messages

- `"InvalidTimeLockPeriod"` - Timelock period validation failed
- `"OperationNotSupported"` - Insufficient balance or invalid operation
- `"NoPermission"` - Role-based access control violation
- `"InvalidAddress"` - Zero address validation failed
- `"SignerNotAuthorized"` - Meta-transaction signer lacks required permissions
- `"InvalidSignature"` - EIP-712 signature validation failed

## Architecture Notes

### Recent Updates
- **BaseStateMachine Integration**: SimpleVault now uses centralized helpers from BaseStateMachine instead of direct EngineBlox calls
- **Definitions as Source of Truth**: Function selectors are computed from SimpleVaultDefinitions library rather than hardcoded
- **Clean Test Output**: Removed diagnostic debugging code for cleaner test execution
- **Proper Error Handling**: Enhanced error messages for better debugging

### Key Design Principles
- Definitions contracts compute and provide function selectors
- Main contracts reference definitions rather than hardcoding values
- Centralized state management through BaseStateMachine
- Clean separation of concerns between contracts and libraries

## Contributing

When adding new tests:
1. Extend the base test class
2. Implement the `executeTests()` method
3. Use proper error handling and logging
4. Avoid diagnostic debugging code in production tests
5. Update this README with new test descriptions
6. Add the new test to the test runner

## Security Considerations

These tests are designed for development and testing environments. Do not use test private keys or addresses in production. Always verify contract deployments and configurations before running tests against mainnet or production contracts.
