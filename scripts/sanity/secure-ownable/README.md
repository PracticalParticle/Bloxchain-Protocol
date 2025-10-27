# SecureOwnable Test Suite

This folder contains a comprehensive test suite for the SecureOwnable contract, organized with proper dependency order to ensure realistic workflow testing.

## Structure

```
secure-ownable/
├── README.md                    # This file
├── run-tests.js                 # Main test runner
├── base-test.js                 # Base test class with common functionality
├── timelock-period-tests.js      # Timelock period update tests (foundation)
├── recovery-update-tests.js     # Recovery address update tests
├── broadcaster-update-tests.js  # Comprehensive broadcaster update tests
├── ownership-transfer-tests.js  # Comprehensive ownership transfer tests
└── eip712-signing-tests.js      # EIP-712 signing functionality tests
```

## Test Suites (Execution Order)

### 1. Timelock Period Tests (`timelock-period-tests.js`) - **FOUNDATION**
- **Purpose**: Sets up 1-minute timelock period for all subsequent tests
- **Method**: Meta-transaction request & approve
- **Dependencies**: None (first test)
- **Sets**: Timelock period to 60 seconds

### 2. Recovery Update Tests (`recovery-update-tests.js`)
- **Purpose**: Changes recovery address to unused wallet (wallet4)
- **Method**: Meta-transaction request & approve
- **Dependencies**: Timelock period set to 1 minute
- **Ensures**: Recovery ≠ Owner for ownership transfer tests

### 3. Broadcaster Update Tests (`broadcaster-update-tests.js`)
- **Purpose**: Tests all 4 broadcaster update workflows
- **Dependencies**: Timelock period set, recovery updated
- **Workflows**:
  1. **Meta-transaction Cancellation** (immediate)
  2. **Time Delay Cancellation** (requires 1 minute wait)
  3. **Meta-transaction Approval** (immediate)
  4. **Time Delay Approval** (requires 1 minute wait)
- **Tests**: Complete broadcaster address change cycle

### 4. Ownership Transfer Tests (`ownership-transfer-tests.js`)
- **Purpose**: Tests all 4 ownership transfer workflows
- **Dependencies**: All previous tests completed
- **Workflows**:
  1. **Owner Meta-transaction Cancellation** (immediate)
  2. **Recovery Time Delay Cancellation** (requires 1 minute wait)
  3. **Owner Meta-transaction Approval** (immediate)
  4. **Recovery Time Delay Approval** (requires 1 minute wait)
- **Tests**: Complete ownership transfer cycle with recovery restoration

### 5. EIP-712 Signing Tests (`eip712-signing-tests.js`)
- **Purpose**: Tests EIP-712 meta-transaction signing functionality
- **Dependencies**: None (can run independently)
- **Tests**: Signature generation, verification, and meta-transaction construction

## Usage

### Run All Tests
```bash
node run-tests.js --all
```

### Run Specific Test Suites
```bash
# Run only timelock period tests (foundation)
node run-tests.js --timelock

# Run only recovery update tests
node run-tests.js --recovery

# Run only broadcaster update tests
node run-tests.js --broadcaster

# Run only ownership transfer tests
node run-tests.js --ownership

# Run only EIP-712 signing tests
node run-tests.js --eip712
```

### Run Multiple Test Suites (Recommended Order)
```bash
# Run foundation tests (timelock + recovery)
node run-tests.js --timelock --recovery

# Run workflow tests (broadcaster + ownership)
node run-tests.js --broadcaster --ownership

# Run all workflow tests in proper order
node run-tests.js --timelock --recovery --broadcaster --ownership
```

### Show Help
```bash
node run-tests.js --help
```

## Features

### Dynamic Role Discovery
- Tests automatically discover current role assignments (Owner, Broadcaster, Recovery)
- No hardcoded wallet assumptions
- Tests adapt to contract state changes

### Permission Validation
- Each workflow validates required permissions before execution
- Helps understand the contract's access control model
- Prevents guesswork about role permissions

### Blockchain Clock Management
- Robust blockchain time advancement for timelock testing
- Uses transaction-based clock advancement instead of unreliable `evm_increaseTime`
- Handles remote blockchain environments

### Comprehensive Error Handling
- Detailed error reporting with stack traces
- Graceful handling of test failures
- Clear success/failure indicators

### Test Results Summary
- Individual test results with pass/fail counts
- Overall success rate calculation
- Duration tracking for performance monitoring
- Detailed suite-by-suite breakdown

## Environment Requirements

- Node.js with Web3.js
- Access to deployed SecureOwnable contract
- Environment variables configured in `.env` file:
  - `SECUREBLOX_ADDRESS`
  - `TEST_WALLET_1_PRIVATE_KEY` through `TEST_WALLET_5_PRIVATE_KEY`
  - `REMOTE_HOST` and `REMOTE_PORT` (if using remote blockchain)

## Test Philosophy

This test suite follows these principles:

1. **Dependency-Aware**: Tests run in proper order with realistic dependencies
2. **Comprehensive Coverage**: Tests all major workflows and edge cases
3. **Role-Aware**: Dynamically adapts to current role assignments
4. **Permission-First**: Validates permissions before attempting operations
5. **Realistic Scenarios**: Tests actual use cases with proper state transitions
6. **Maintainable**: Modular structure for easy updates and debugging
7. **Robust**: Handles blockchain timing and network issues gracefully

## Test Dependencies

The test suites are designed to run in a specific order to ensure realistic workflow testing:

1. **Timelock Period Tests** → Sets 1-minute timelock for all subsequent tests
2. **Recovery Update Tests** → Changes recovery to unused wallet (ensures recovery ≠ owner)
3. **Broadcaster Update Tests** → Tests all broadcaster workflows with proper timelock
4. **Ownership Transfer Tests** → Tests all ownership workflows with proper recovery setup
5. **EIP-712 Signing Tests** → Independent tests for signing functionality

**Important**: Running tests out of order may cause failures due to missing dependencies.

## Troubleshooting

### Common Issues

1. **Test Hanging**: Usually indicates blockchain clock issues. The test suite includes robust clock advancement.

2. **Permission Failures**: Check that roles are properly assigned and permissions are correctly configured.

3. **Meta-transaction Failures**: Verify EIP-712 signing is working and function selectors are correct.

4. **Dependency Failures**: Ensure tests are run in the correct order (timelock → recovery → broadcaster → ownership).

5. **Network Issues**: Ensure the blockchain connection is stable and the contract is deployed.

### Debug Mode

For detailed debugging, you can run individual test files directly:

```bash
# Run a specific test file
node timelock-period-tests.js
node recovery-update-tests.js
node broadcaster-update-tests.js
node ownership-transfer-tests.js
node eip712-signing-tests.js
```

This will provide more detailed output and help isolate issues.

### Test Order Validation

To ensure tests run in the correct order, use:

```bash
# Run all tests in proper dependency order
node run-tests.js --all

# Or run specific sequences
node run-tests.js --timelock --recovery  # Foundation setup
node run-tests.js --broadcaster --ownership  # Workflow tests
```
