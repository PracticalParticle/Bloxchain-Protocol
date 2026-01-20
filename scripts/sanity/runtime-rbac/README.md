# RuntimeRBAC Test Suite

This folder contains a comprehensive test suite for the RuntimeRBAC contract, testing the complete RBAC lifecycle: role creation, wallet assignment, function registration, permission management, and cleanup.

## Structure

```
runtime-rbac/
├── README.md                    # This file
├── run-tests.js                 # Main test runner
├── base-test.js                 # Base test class with common functionality
└── rbac-tests.js                # Main RBAC functionality tests
```

## Test Suites

### RBAC Functionality Tests (`rbac-tests.js`)

Comprehensive tests for the complete RBAC workflow:

1. **Create REGISTRY_ADMIN Role** - Creates a new role with `SIGN_META_REQUEST_AND_APPROVE` permission for `roleConfigBatchRequestAndApprove`
2. **Add Wallet to REGISTRY_ADMIN** - Adds a wallet (not owner or broadcaster) to the REGISTRY_ADMIN role
3. **Register ERC20 Mint Function** - Registers the `mint(address,uint256)` function with meta-transaction support
4. **Add Mint Function to REGISTRY_ADMIN Role** - Grants REGISTRY_ADMIN permission to use the mint function
5. **Remove Mint Function from REGISTRY_ADMIN Role** - Removes the mint function permission from REGISTRY_ADMIN
6. **Unregister Mint Function** - Removes the mint function from the function schema registry
7. **Revoke Wallet from REGISTRY_ADMIN** - Revokes the wallet from REGISTRY_ADMIN role (switches back to owner)
8. **Remove REGISTRY_ADMIN Role** - Completely removes the REGISTRY_ADMIN role

## Usage

### Run All Tests
```bash
node run-tests.js --all
```

### Run Specific Test Suites
```bash
# Run only RBAC functionality tests
node run-tests.js --rbac
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

### Meta-Transaction Support
- All RBAC configuration changes use meta-transactions
- Owner/REGISTRY_ADMIN signs, Broadcaster executes
- Proper EIP-712 signing implementation

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
- Access to deployed RuntimeRBAC contract
- Environment variables configured in `.env` file:
  - `RUNTIME_RBAC_ADDRESS` (manual mode)
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
- Uses contract address from `RUNTIME_RBAC_ADDRESS` environment variable
- Uses private keys from `TEST_WALLET_*_PRIVATE_KEY` environment variables
- Set `TEST_MODE=manual` in `.env` file (or omit for default)

## Test Flow

The test suite follows a specific workflow to ensure proper RBAC lifecycle testing:

1. **Role Creation** - Creates REGISTRY_ADMIN role with appropriate permissions
2. **Wallet Assignment** - Assigns a wallet to the new role
3. **Function Registration** - Registers a new function (ERC20 mint) in the schema
4. **Permission Granting** - Grants the role permission to use the function
5. **Permission Revocation** - Removes the function permission from the role
6. **Function Unregistration** - Removes the function from the schema
7. **Wallet Revocation** - Removes the wallet from the role
8. **Role Removal** - Completely removes the role

## Key Technical Details

### RoleConfigAction Types
- `CREATE_ROLE = 0` - Create a new role
- `REMOVE_ROLE = 1` - Remove an existing role
- `ADD_WALLET = 2` - Add a wallet to a role
- `REVOKE_WALLET = 3` - Remove a wallet from a role
- `REGISTER_FUNCTION = 4` - Register a new function schema
- `UNREGISTER_FUNCTION = 5` - Remove a function schema
- `ADD_FUNCTION_TO_ROLE = 6` - Grant function permission to a role
- `REMOVE_FUNCTION_FROM_ROLE = 7` - Revoke function permission from a role
- `LOAD_DEFINITIONS = 8` - Load multiple definitions at once

### TxAction Enum Values
- `SIGN_META_REQUEST_AND_APPROVE = 3` - Sign a meta-transaction request
- `EXECUTE_META_REQUEST_AND_APPROVE = 6` - Execute a meta-transaction request

### Function Selectors
- `roleConfigBatchRequestAndApprove`: Meta-transaction handler for RBAC batches
- `executeRoleConfigBatch`: Internal execution entrypoint for RBAC batches
- ERC20 `mint(address,uint256)`: `0x40c10f19` (keccak256("mint(address,uint256)"))

### Meta-Transaction Flow
1. Generate unsigned meta-transaction using contract's `generateUnsignedMetaTransactionForNew`
2. Sign with EIP-712 using signer's private key
3. Execute via `roleConfigBatchRequestAndApprove` (broadcaster calls)

## Test Philosophy

This test suite follows these principles:

1. **Complete Lifecycle Testing** - Tests the full RBAC lifecycle from creation to removal
2. **Permission Validation** - Validates permissions at each step
3. **Role-Aware** - Dynamically adapts to current role assignments
4. **Realistic Scenarios** - Tests actual use cases with proper state transitions
5. **Maintainable** - Modular structure for easy updates and debugging
6. **Robust** - Handles blockchain timing and network issues gracefully

## Troubleshooting

### Common Issues

1. **Test Hanging**: Usually indicates blockchain clock issues or network connectivity problems.

2. **Permission Failures**: Check that roles are properly assigned and permissions are correctly configured.

3. **Meta-transaction Failures**: Verify EIP-712 signing is working and function selectors are correct.

4. **Network Issues**: Ensure the blockchain connection is stable and the contract is deployed.

5. **Contract Address Not Found**: 
   - In auto mode: Ensure Truffle artifacts exist in `build/contracts/`
   - In manual mode: Ensure `RUNTIME_RBAC_ADDRESS` is set in `.env`

### Debug Mode

For detailed debugging, you can run the test file directly:

```bash
# Run the test file directly
node rbac-tests.js
```

This will provide more detailed output and help isolate issues.

## Dependencies

- `web3` - Ethereum JavaScript API
- `dotenv` - Environment variable management
- `../utils/eip712-signing` - EIP-712 signing utilities

## Notes

- All RBAC configuration changes must go through the `roleConfigBatchRequestAndApprove` meta-transaction handler
- Only non-protected roles can be created and removed dynamically
- Protected roles (OWNER, BROADCASTER, RECOVERY) are managed by SecureOwnable
- Function schemas can only be unregistered if they are not protected and no roles reference them (with safeRemoval=true)
