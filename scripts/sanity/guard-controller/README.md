# GuardController Test Suite

This folder contains a comprehensive test suite for the GuardController contract, testing ETH transfer functionality through the AccountBlox contract. The tests verify the complete workflow of registering bytes4(0) function, setting permissions, and executing ETH deposits/withdrawals.

## Structure

```
guard-controller/
├── README.md                    # This file
├── run-tests.js                 # Main test runner
├── base-test.js                 # Base test class with common functionality
└── guard-controller-tests.js    # Main GuardController functionality tests
```

## Test Suites

### GuardController Functionality Tests (`guard-controller-tests.js`)

Comprehensive tests for the complete ETH transfer workflow:

1. **Register bytes4(0) Function** - Registers the bytes4(0) function selector with `ETH_TRANSFER` operation type and `SIGN_META_REQUEST_AND_APPROVE` and `EXECUTE_META_REQUEST_AND_APPROVE` permissions
2. **Add Function Permission to OWNER Role** - Grants OWNER role permission to use the bytes4(0) function for ETH transfers
3. **Deposit ETH to Contract** - Transfers 1 ETH from owner wallet to the contract using `requestAndApproveExecution`
4. **Withdraw ETH from Contract** - Transfers 0.5 ETH from the contract back to the owner wallet using `requestAndApproveExecution`

## Usage

### Run All Tests
```bash
node run-tests.js --all
```

### Run Specific Test Suites
```bash
# Run only GuardController functionality tests
node run-tests.js --guard-controller
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

### Function Registration
- Uses RuntimeRBAC's batch operations to register function schemas
- Supports empty function signature for bytes4(0) ETH transfers
- Validates operation type and supported actions

### Meta-Transaction Support
- All ETH transfers use meta-transactions via `requestAndApproveExecution`
- Owner signs, Broadcaster executes
- Proper EIP-712 signing implementation

### Balance Verification
- Verifies contract and wallet balances before and after operations
- Accounts for gas costs in balance calculations
- Validates exact transfer amounts

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
- Access to deployed AccountBlox contract
- Environment variables configured in `.env` file:
  - `ACCOUNTBLOX_ADDRESS` or `GUARD_CONTROLLER_ADDRESS` (manual mode)
  - `TEST_WALLET_1_PRIVATE_KEY` through `TEST_WALLET_5_PRIVATE_KEY`
  - `REMOTE_HOST` and `REMOTE_PORT` (if using remote blockchain)
  - `RPC_URL` (optional, defaults to localhost:8545)

## Test Mode

The test suite supports two modes:

### Auto Mode
- Automatically discovers contract address from Truffle artifacts
- Uses Ganache accounts with deterministic private keys
- Set `TEST_MODE=auto` in `.env` file

### Manual Mode (Default)
- Uses contract address from `ACCOUNTBLOX_ADDRESS` or `GUARD_CONTROLLER_ADDRESS` environment variable
- Uses private keys from `TEST_WALLET_*_PRIVATE_KEY` environment variables
- Set `TEST_MODE=manual` in `.env` file (or omit for default)

## Test Flow

The test suite follows a specific workflow to ensure proper ETH transfer functionality:

1. **Function Registration** - Registers bytes4(0) function with ETH_TRANSFER operation type
2. **Permission Setup** - Grants OWNER role permission to use the function
3. **ETH Deposit** - Transfers ETH from owner wallet to contract
4. **ETH Withdrawal** - Transfers ETH from contract back to owner wallet

## Key Technical Details

### Operation Type
- `ETH_TRANSFER = keccak256("ETH_TRANSFER")` - Operation type for ETH transfers

### Function Selector
- `bytes4(0) = 0x00000000` - Function selector for simple ETH transfers (no function call)

### Function Signature
- Empty string `""` - Used when registering bytes4(0) function (no actual function signature)

### TxAction Enum Values
- `SIGN_META_REQUEST_AND_APPROVE = 3` - Sign a meta-transaction request
- `EXECUTE_META_REQUEST_AND_APPROVE = 6` - Execute a meta-transaction request

### RoleConfigAction Types
- `REGISTER_FUNCTION = 4` - Register a new function schema
- `ADD_FUNCTION_TO_ROLE = 6` - Grant function permission to a role

### GuardController Functions
- `requestAndApproveExecution` - Request and approve a transaction in one step using a meta-transaction
- `executeWithTimeLock` - Request a time-locked execution (not used in these tests)
- `approveTimeLockExecution` - Approve a time-locked transaction (not used in these tests)

### Meta-Transaction Flow
1. Generate unsigned meta-transaction using contract's `generateUnsignedMetaTransactionForNew`
2. Sign with EIP-712 using signer's private key
3. Execute via `requestAndApproveExecution` (broadcaster calls)

## ETH Transfer Details

### Deposit Flow
- **Target**: Contract address (self)
- **Value**: 1 ETH (configurable)
- **Function Selector**: `0x00000000` (bytes4(0))
- **Params**: Empty (`0x`)
- **Operation Type**: `ETH_TRANSFER`

### Withdrawal Flow
- **Target**: Owner wallet address
- **Value**: 0.5 ETH (configurable, less than deposit)
- **Function Selector**: `0x00000000` (bytes4(0))
- **Params**: Empty (`0x`)
- **Operation Type**: `ETH_TRANSFER`

## Test Philosophy

This test suite follows these principles:

1. **Complete Workflow Testing** - Tests the full ETH transfer lifecycle from setup to execution
2. **Permission Validation** - Validates permissions at each step
3. **Balance Verification** - Verifies exact balance changes
4. **Role-Aware** - Dynamically adapts to current role assignments
5. **Realistic Scenarios** - Tests actual use cases with proper state transitions
6. **Maintainable** - Modular structure for easy updates and debugging
7. **Robust** - Handles blockchain timing and network issues gracefully

## Troubleshooting

### Common Issues

1. **Test Hanging**: Usually indicates blockchain clock issues or network connectivity problems.

2. **Permission Failures**: Check that:
   - Function is properly registered
   - OWNER role has the required permissions
   - Meta-transaction signing is working correctly

3. **Meta-transaction Failures**: Verify:
   - EIP-712 signing is working
   - Function selectors are correct
   - Operation type matches registered function schema

4. **Balance Mismatches**: 
   - Account for gas costs in balance calculations
   - Verify contract has sufficient balance for withdrawals
   - Check for pending transactions that might affect balances

5. **Network Issues**: Ensure the blockchain connection is stable and the contract is deployed.

6. **Contract Address Not Found**: 
   - In auto mode: Ensure Truffle artifacts exist in `build/contracts/`
   - In manual mode: Ensure `ACCOUNTBLOX_ADDRESS` or `GUARD_CONTROLLER_ADDRESS` is set in `.env`

### Debug Mode

For detailed debugging, you can run the test file directly:

```bash
# Run the test file directly
node guard-controller-tests.js
```

This will provide more detailed output and help isolate issues.

## Dependencies

- `web3` - Ethereum JavaScript API
- `dotenv` - Environment variable management
- `../utils/eip712-signing` - EIP-712 signing utilities

## Notes

- All function registrations must go through RuntimeRBAC's `roleConfigBatchRequestAndApprove` meta-transaction handler
- ETH transfers use `requestAndApproveExecution` which requires both SIGN and EXECUTE permissions for REQUEST_AND_APPROVE actions
- The bytes4(0) function selector is used for simple ETH transfers without function calls
- Contract must have sufficient balance for withdrawals (tests deposit 1 ETH and withdraw 0.5 ETH)
- Gas costs are accounted for in balance verification (owner balance decreases by deposit amount + gas)
