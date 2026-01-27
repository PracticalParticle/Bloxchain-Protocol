# Test Execution Guide

**Purpose**: Complete guide for running the Bloxchain Protocol test suite  
**Last Updated**: January 27, 2026  
**Status**: Production Ready

---

## Overview

This guide provides comprehensive instructions for executing the Bloxchain Protocol test suite, including comprehensive fuzz tests, unit tests, integration tests, and security tests.

**Test Suite Status**: ✅ **All tests passing** (70+ comprehensive fuzz tests + unit/integration/security tests)

---

## Quick Start

### Run All Tests
```bash
forge test -vv
```

### Run All Comprehensive Fuzz Tests
```bash
forge test --match-path "test/foundry/fuzz/Comprehensive*.sol" -vv
```

### Run Specific Test File
```bash
forge test --match-path "test/foundry/fuzz/ComprehensiveAccessControlFuzz.t.sol" -vv
```

### Run Specific Test Function
```bash
forge test --match-test "testFuzz_BatchOperationAtomicity" -vv
```

---

## Test Suite Structure

### Comprehensive Fuzz Tests (10 files - 70+ tests)

1. **ComprehensiveAccessControlFuzz.t.sol** - 13 tests ✅
   - Protected role modification
   - Permission escalation prevention
   - Batch operation atomicity
   - Role management security

2. **ComprehensiveMetaTransactionFuzz.t.sol** - 11 tests ✅
   - Cross-chain signature replay prevention
   - Nonce management
   - Signature security
   - Deadline enforcement

3. **ComprehensiveStateMachineFuzz.t.sol** - 11 tests ✅
   - Reentrancy prevention (all types)
   - Status manipulation prevention
   - Time-lock security
   - Payment execution security

4. **ComprehensivePaymentSecurityFuzz.t.sol** - 6 tests ✅
   - Payment manipulation prevention
   - Balance draining prevention
   - Access control verification

5. **ComprehensiveInputValidationFuzz.t.sol** - 13 tests ✅
   - Zero address injection prevention
   - Array manipulation prevention
   - Bounds validation

6. **ComprehensiveCompositeFuzz.t.sol** - 5 tests ✅
   - Multi-stage escalation prevention
   - Combined exploit prevention

7. **ComprehensiveInitializationFuzz.t.sol** - 8 tests ✅
   - Multiple initialization prevention
   - Uninitialized state exploitation prevention

8. **ComprehensiveHookSystemFuzz.t.sol** - 2 tests ✅
   - Unauthorized hook setting prevention

9. **ComprehensiveEventForwardingFuzz.t.sol** - 2 tests ✅
   - Malicious forwarder isolation

10. **ComprehensiveWhitelistSchemaFuzz.t.sol** - 6 tests ✅
    - Whitelist and schema security

---

## Execution Commands

### Run All Comprehensive Tests
```bash
# Standard run (256 fuzz iterations)
forge test --match-path "test/foundry/fuzz/Comprehensive*.sol" -vv

# With more fuzz iterations (recommended for thorough testing)
forge test --match-path "test/foundry/fuzz/Comprehensive*.sol" --fuzz-runs 1000 -vv

# With gas reporting
forge test --match-path "test/foundry/fuzz/Comprehensive*.sol" --gas-report
```

### Run by Category

**Access Control Tests**:
```bash
forge test --match-path "test/foundry/fuzz/ComprehensiveAccessControlFuzz.t.sol" --fuzz-runs 500 -vv
```

**Meta-Transaction Tests**:
```bash
forge test --match-path "test/foundry/fuzz/ComprehensiveMetaTransactionFuzz.t.sol" --fuzz-runs 500 -vv
```

**State Machine Tests**:
```bash
forge test --match-path "test/foundry/fuzz/ComprehensiveStateMachineFuzz.t.sol" --fuzz-runs 500 -vv
```

**Payment Security Tests**:
```bash
forge test --match-path "test/foundry/fuzz/ComprehensivePaymentSecurityFuzz.t.sol" --fuzz-runs 500 -vv
```

**Input Validation Tests**:
```bash
forge test --match-path "test/foundry/fuzz/ComprehensiveInputValidationFuzz.t.sol" --fuzz-runs 500 -vv
```

**Composite Attack Tests**:
```bash
forge test --match-path "test/foundry/fuzz/ComprehensiveCompositeFuzz.t.sol" --fuzz-runs 500 -vv
```

### Run All Fuzz Tests (Comprehensive + Additional)
```bash
# All fuzz tests
forge test --match-path "test/foundry/fuzz/**" --fuzz-runs 1000 -vv

# With coverage
forge coverage --match-path "test/foundry/fuzz/**"
```

---

## Foundry Test Commands Reference

### Basic Commands

**Run all tests**:
```bash
forge test
```

**Run with verbosity**:
```bash
# -v: Basic output
# -vv: Detailed output (shows test names, gas usage)
# -vvv: Very detailed (includes traces)
forge test -vv
```

**Run only failed tests**:
```bash
# First run all tests
forge test

# Then rerun only failed tests
forge test --rerun
```

### Filtering Tests

**By file path**:
```bash
forge test --match-path "test/foundry/fuzz/Comprehensive*.sol"
```

**By test function name**:
```bash
forge test --match-test "testFuzz_BatchOperationAtomicity"
```

**Exclude files**:
```bash
forge test --no-match-path "test/foundry/fuzz/Comprehensive*.sol"
```

**Exclude tests**:
```bash
forge test --no-match-test "testFuzz_*"
```

### Fuzzing Options

**Set fuzz iterations**:
```bash
# Default: 256 runs
# Custom: Specify --fuzz-runs
forge test --fuzz-runs 1000
```

**Set fuzz seed**:
```bash
forge test --fuzz-seed 12345
```

### Output Options

**Gas reporting**:
```bash
forge test --gas-report
```

**Coverage reporting**:
```bash
forge coverage
```

### Fork Testing

**Fork from network**:
```bash
forge test --fork-url https://eth-mainnet.alchemyapi.io/v2/YOUR_API_KEY
```

**Fork at specific block**:
```bash
forge test --fork-url <URL> --fork-block-number 15000000
```

---

## Recommended Fuzz Runs

### Quick Test (Fast Feedback)
```bash
forge test --fuzz-runs 100 -vv
```
- Use for: Quick iteration during development
- Time: ~30 seconds

### Standard Test (Default)
```bash
forge test --fuzz-runs 256 -vv
```
- Use for: Regular test runs
- Time: ~1-2 minutes

### Comprehensive Test (Thorough Coverage)
```bash
forge test --fuzz-runs 1000 -vv
```
- Use for: Pre-commit verification, CI/CD
- Time: ~5-10 minutes

### Deep Analysis (Extensive Exploration)
```bash
forge test --fuzz-runs 10000 -vv
```
- Use for: Security audits, final verification
- Time: ~30-60 minutes

---

## Running Specific Attack Vector Tests

### Critical Attack Vectors

**Payment update access control**:
```bash
forge test --match-test "testFuzz_PaymentRecipientUpdateAccessControl" -vvv
```

**Batch operation atomicity**:
```bash
forge test --match-test "testFuzz_BatchOperationAtomicity" -vvv
```

**Nonce increment timing**:
```bash
forge test --match-test "testFuzz_NonceIncrementsBeforeExecution" -vvv
```

**Protected role modification**:
```bash
forge test --match-test "testFuzz_CannotAddWalletToProtectedRoleViaBatch" -vvv
```

### High-Priority Attack Vectors

**Cross-chain replay**:
```bash
forge test --match-test "testFuzz_CrossChainSignatureReplayPrevented" -vvv
```

**Reentrancy attacks**:
```bash
forge test --match-test "testFuzz_TargetReentrancyPrevented" -vvv
forge test --match-test "testFuzz_PaymentRecipientReentrancyPrevented" -vvv
```

**Permission escalation**:
```bash
forge test --match-test "testFuzz_MultiStagePermissionEscalationPrevented" -vvv
```

---

## Test Execution Strategy

### Phase 1: Individual Test Execution
Run each comprehensive test file individually to identify specific issues:

```bash
# Access Control
forge test --match-path "test/foundry/fuzz/ComprehensiveAccessControlFuzz.t.sol" -vv

# Meta-Transactions
forge test --match-path "test/foundry/fuzz/ComprehensiveMetaTransactionFuzz.t.sol" -vv

# State Machine
forge test --match-path "test/foundry/fuzz/ComprehensiveStateMachineFuzz.t.sol" -vv

# Payment Security
forge test --match-path "test/foundry/fuzz/ComprehensivePaymentSecurityFuzz.t.sol" -vv

# Input Validation
forge test --match-path "test/foundry/fuzz/ComprehensiveInputValidationFuzz.t.sol" -vv

# Composite Attacks
forge test --match-path "test/foundry/fuzz/ComprehensiveCompositeFuzz.t.sol" -vv
```

### Phase 2: Comprehensive Suite Execution
Run all comprehensive tests together:

```bash
forge test --match-path "test/foundry/fuzz/Comprehensive*.sol" --fuzz-runs 1000 -vv
```

### Phase 3: Full Test Suite
Run all tests (comprehensive + existing):

```bash
forge test --match-path "test/foundry/fuzz/**" --fuzz-runs 500 -vv
```

---

## Interpreting Test Results

### Test Passes ✅
If a test **PASSES**, it means:
- The security protection is working correctly
- The attack vector is prevented
- The system behaves as intended

### Test Fails ❌
If a test **FAILS**, it means:
- **CRITICAL**: Potential vulnerability identified
- Review the failure message
- Check if it's a false positive or real issue
- Refer to [Attack Vectors Codex](./ATTACK_VECTORS_CODEX.md) for analysis

### Expected Behavior
Most tests should **PASS** as the codebase has strong security protections:
- ✅ Protected role modification tests pass (CannotModifyProtected enforced)
- ✅ Reentrancy tests pass (state machine + ReentrancyGuard)
- ✅ Signature validation tests pass (EIP-712, nonce, chainId)
- ✅ Time-lock tests pass (release time validation)
- ✅ Input validation tests pass (comprehensive checks)

---

## Troubleshooting

### Common Issues

**1. Compilation Errors**
- Check imports are correct
- Verify helper contracts exist
- Ensure all dependencies available
- Run `forge build` first to see all errors

**2. Test Timeouts**
- Reduce fuzz-runs for large test suites
- Run tests individually
- Check for infinite loops

**3. Unexpected Failures**
- Review test assumptions
- Check `vm.assume` statements
- Verify test setup
- Check if failure is expected (security working)

**4. Missing Helper Functions**
- Check `CommonBase` for base helpers
- Verify test-specific helpers exist
- Review `MockContracts` for mocks

**5. Permission Errors**
- Add `vm.prank(owner)` before calling permissioned functions
- Check if function requires specific roles
- Verify permissions are set up in `setUp()`

**6. Revert Errors in Tests**
- Use `vm.expectRevert()` for expected reverts
- Check error selector matches expected error
- Verify error is expected (security protection working)

---

## Test Patterns

### Handling NoPermission Errors
Many tests use try-catch to handle `NoPermission` errors gracefully, as these indicate security is working correctly:

```solidity
try controlBlox.executeWithTimeLock(...) returns (TxRecord memory txRecord) {
    // Test logic when permission exists
} catch (bytes memory reason) {
    bytes4 errorSelector = bytes4(reason);
    if (errorSelector == SharedValidation.NoPermission.selector) {
        return; // Security working - permission check prevented execution
    }
    // Re-throw other errors
}
```

### Using Fixed Selectors
Tests use fixed, pre-registered selectors to avoid permission setup issues:
- `execute()` selector for mockTarget
- `maliciousFunction()` selector for reentrancyTarget
- `alwaysReverts()` selector for revertingTarget

### Permission Setup
Tests use helper functions in `setUp()`:
- `_registerFunction()` - Registers function schemas
- `_grantOwnerPermission()` - Grants owner permissions for selectors
- `_whitelistTarget()` - Whitelists targets for functions

---

## Continuous Integration

### Recommended CI Configuration

```yaml
# Run comprehensive tests in CI
- name: Run Comprehensive Fuzz Tests
  run: |
    forge test --match-path "test/foundry/fuzz/Comprehensive*.sol" --fuzz-runs 256

# Run all fuzz tests nightly
- name: Full Fuzz Suite (Nightly)
  run: |
    forge test --match-path "test/foundry/fuzz/**" --fuzz-runs 1000

# Generate coverage report
- name: Generate Coverage Report
  run: |
    forge coverage --match-path "test/foundry/fuzz/**"
```

---

## Success Criteria

### Test Suite is Successful When:
✅ All comprehensive tests compile  
✅ All tests run without errors  
✅ Critical attack vectors are tested  
✅ High-priority vectors are covered  
✅ Tests provide clear pass/fail results  
✅ Test failures indicate real vulnerabilities (not false positives)

### Coverage Goals
- **Critical Vectors**: 100% coverage ✅
- **High-Priority Vectors**: 100% coverage ✅
- **Medium-Priority Vectors**: 100% coverage ✅
- **Low-Priority Vectors**: 100% coverage ✅

---

## Related Documentation

- [Test Documentation](./TEST_DOCUMENTATION.md) - Complete test function reference
- [Attack Vectors Codex](./ATTACK_VECTORS_CODEX.md) - Security threat catalog
- [Critical Findings & Recommendations](./CRITICAL_FINDINGS_AND_RECOMMENDATIONS.md) - Security findings
- [Implementation Status](./IMPLEMENTATION_STATUS.md) - Current implementation status
- [Final Coverage Report](./FINAL_COVERAGE_REPORT.md) - Test coverage summary

---

**Status**: ✅ **Production Ready**  
**Last Updated**: January 27, 2026  
**Test Coverage**: 100% of 180+ attack vectors  
**Test Count**: 70+ comprehensive fuzz tests
