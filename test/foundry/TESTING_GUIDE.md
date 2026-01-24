# Foundry Testing Guide for Bloxchain Protocol

## Quick Reference

### Common Patterns

#### 1. Testing Role-Protected Query Functions

Many query functions require the caller to have any role (privacy protection). Always use `vm.prank`:

```solidity
// ✅ CORRECT
vm.prank(owner);
StateAbstraction.TxRecord memory tx = secureBlox.getTransaction(txId);

vm.prank(owner);
bytes32[] memory roles = secureBlox.getSupportedRoles();

vm.prank(owner);
uint256[] memory pending = secureBlox.getPendingTransactions();
```

```solidity
// ❌ WRONG - Will fail with NoPermission
StateAbstraction.TxRecord memory tx = secureBlox.getTransaction(txId);
```

**Functions requiring roles:**
- `getTransaction(uint256)`
- `getTransactionHistory(uint256, uint256)`
- `getPendingTransactions()`
- `getSupportedRoles()`
- `getSupportedFunctions()`
- `getSupportedOperationTypes()`
- `getActiveRolePermissions(bytes32)`
- `getSignerNonce(address)`
- `hasRole(bytes32, address)`
- `getRole(bytes32)` - Returns tuple, not struct

#### 2. Testing Access Control

```solidity
// Test unauthorized access
vm.prank(attacker);
vm.expectRevert(abi.encodeWithSelector(SharedValidation.NoPermission.selector, attacker));
secureBlox.someProtectedFunction();

// Test role-specific access (recovery-only function)
vm.prank(attacker);
vm.expectRevert(abi.encodeWithSelector(SharedValidation.RestrictedRecovery.selector, attacker, recovery));
secureBlox.transferOwnershipRequest();
```

#### 3. Testing State Machine Workflows

```solidity
// Request
vm.prank(recovery);
StateAbstraction.TxRecord memory requestTx = secureBlox.transferOwnershipRequest();
uint256 txId = requestTx.txId;

// Verify pending status
vm.prank(owner);
StateAbstraction.TxRecord memory pendingTx = secureBlox.getTransaction(txId);
assertEq(uint8(pendingTx.status), uint8(StateAbstraction.TxStatus.PENDING));

// Advance time
advanceTime(DEFAULT_TIMELOCK_PERIOD + 1);

// Approve
vm.prank(recovery);
secureBlox.transferOwnershipDelayedApproval(txId);

// Verify completion
vm.prank(owner);
StateAbstraction.TxRecord memory completedTx = secureBlox.getTransaction(txId);
assertEq(uint8(completedTx.status), uint8(StateAbstraction.TxStatus.COMPLETED));
```

#### 4. Invariant Tests

**Important**: Invariant tests cannot use `vm.prank` in `view` functions.

```solidity
// ✅ CORRECT - No view modifier
function invariant_SomeProperty() public {
    vm.prank(owner);
    bytes32[] memory roles = secureBlox.getSupportedRoles();
    // ... assertions
}

// ❌ WRONG - Cannot use vm.prank in view
function invariant_SomeProperty() public view {
    vm.prank(owner);  // This will fail!
    bytes32[] memory roles = secureBlox.getSupportedRoles();
}
```

#### 5. Fuzz Testing

```solidity
function testFuzz_SomeFunction(uint256 value) public {
    // Constrain inputs
    vm.assume(value > 0);
    vm.assume(value < type(uint256).max / 2);
    
    // Test with fuzzed value
    // ...
}
```

#### 6. Testing Meta-Transactions

**Note**: EIP-712 signing helpers are available via `MetaTxSigner` contract in `CommonBase`.

```solidity
// Create meta-transaction params (deadline is duration in seconds, not absolute timestamp)
StateAbstraction.MetaTxParams memory params = secureBlox.createMetaTxParams(
    handlerContract,
    handlerSelector,
    action,
    deadlineDuration,  // Duration in seconds
    maxGasPrice,
    signer
);

// Sign meta-transaction using MetaTxSigner helper
bytes memory signature = metaTxSigner.signMetaTransaction(
    metaTx,
    signerPrivateKey,
    address(secureBlox)
);

// Note: nonce is set to 0 in createMetaTxParams, populated in generateMetaTransaction
// Deadline is calculated as block.timestamp + deadlineDuration
```

## Test Accounts

Available in `CommonBase`:
- `owner` - Owner wallet
- `broadcaster` - Broadcaster wallet
- `recovery` - Recovery wallet
- `user1`, `user2`, `user3` - Test users
- `attacker` - Unauthorized user

## Helper Functions

### CommonBase
- `advanceTime(uint256 seconds)` - Advance block timestamp
- `getRoleHash(string memory roleName)` - Get role hash from name

### TestHelpers
- `getRoleHash(string memory roleName)` - Get role hash
- `getFunctionSelector(string memory signature)` - Get function selector

## Constants

Available in `CommonBase`:
- `OWNER_ROLE` - Owner role hash
- `BROADCASTER_ROLE` - Broadcaster role hash
- `RECOVERY_ROLE` - Recovery role hash
- `DEFAULT_TIMELOCK_PERIOD` - Default timelock period (3600 seconds)

## Mock Contracts

Available in `CommonBase`:
- `mockERC20` - Mock ERC20 token
- `mockTarget` - Mock target contract
- `mockEventForwarder` - Mock event forwarder

## Common Pitfalls

1. **Forgetting `vm.prank` for role-protected queries**
   - Always check if function requires role
   - Use `vm.prank(owner)` before calling

2. **Using `view` with `vm.prank` in invariants**
   - Remove `view` modifier if using `vm.prank`

3. **Incorrect transaction history range**
   - Use valid transaction IDs
   - Check if transactions exist before querying

4. **Meta-transaction nonce assumptions**
   - Nonce is set automatically by `StateAbstraction`
   - Don't assume nonce value, query it from contract

5. **Empty array encoding**
   - Empty arrays encode to 64 bytes (offset + length)
   - Not 32 bytes

## Running Tests

```bash
# All tests
npm run test:foundry

# Specific file
forge test --match-path test/foundry/unit/SecureOwnable.t.sol

# Specific test
forge test --match-test test_Initialize_WithValidParameters

# Verbose output
npm run test:foundry:verbose

# Coverage
npm run test:foundry:coverage
```

## Best Practices

1. **Always test both success and failure paths**
2. **Use descriptive test names**: `test_Action_ExpectedResult`
3. **Group related tests** with comments
4. **Test edge cases**: zero values, max values, empty arrays
5. **Verify state changes** after operations
6. **Use fuzz testing** for input validation
7. **Use invariant tests** for system properties
8. **Document complex test setups** with comments

## Example Test Structure

```solidity
contract MyTest is CommonBase {
    function setUp() public override {
        super.setUp();
        // Additional setup if needed
    }

    // ============ SUCCESS TESTS ============
    
    function test_SomeFunction_Success() public {
        // Arrange
        vm.prank(owner);
        
        // Act
        // ...
        
        // Assert
        // ...
    }

    // ============ REVERT TESTS ============
    
    function test_SomeFunction_Revert_Unauthorized() public {
        vm.prank(attacker);
        vm.expectRevert(/* ... */);
        // ...
    }

    // ============ EDGE CASES ============
    
    function test_SomeFunction_EdgeCase_ZeroValue() public {
        // ...
    }
}
```
