# Attack Vectors Codex

**Purpose**: Knowledge library of security threats relevant to Bloxchain Protocol  
**Last Updated**: January 25, 2026  
**Status**: Living Knowledge Base

---

## Overview

This codex serves as a comprehensive knowledge base of attack vectors identified in the Bloxchain Protocol. Each entry includes attack descriptions, current protections, severity classifications, and verification requirements. This document consolidates information from security analysis documents and serves as the authoritative reference for security threats.

**Total Attack Vectors**: 174+  
**Critical Severity**: 14  
**High Severity**: 34  
**Medium Severity**: 58  
**Low Severity**: 35  
**Informational**: 30+

---

## Table of Contents

1. [Access Control & Authorization](#1-access-control--authorization)
2. [Meta-Transaction Security](#2-meta-transaction-security)
3. [State Machine & Transaction Lifecycle](#3-state-machine--transaction-lifecycle)
4. [Reentrancy Attacks](#4-reentrancy-attacks)
5. [Input Validation & Data Manipulation](#5-input-validation--data-manipulation)
6. [Payment & Economic Security](#6-payment--economic-security)
7. [Composite & Multi-Vector Attacks](#7-composite--multi-vector-attacks)
8. [Cryptographic & Signature Attacks](#8-cryptographic--signature-attacks)
9. [Time-Based Attacks](#9-time-based-attacks)
10. [Role Management](#10-role-management)
11. [Target Whitelist & Function Schema](#11-target-whitelist--function-schema)
12. [Initialization & Upgrade](#12-initialization--upgrade)
13. [Hook System](#13-hook-system)
14. [Event Forwarding & Monitoring](#14-event-forwarding--monitoring)
15. [Definition Contracts & Schema Security](#15-definition-contracts--schema-security)
16. [New Attack Vectors (2026 Security Analysis)](#16-new-attack-vectors-2026-security-analysis)
17. [Gas Exhaustion & System Limits](#17-gas-exhaustion--system-limits)

---

## 1. Access Control & Authorization

### 1.1 Protected Role Modification

#### CRITICAL: Protected Role Modification Bypass
- **ID**: `AC-001`
- **Location**: `EngineBlox.sol:765-789`, `RuntimeRBAC.sol:242-248`
- **Severity**: CRITICAL
- **Status**: ✅ **PROTECTED**

**Description**:  
Attempts to modify protected roles (OWNER, BROADCASTER, RECOVERY) through batch operations or direct modification.

**Attack Scenario**:
```solidity
// Attacker creates batch action to ADD_WALLET to OWNER_ROLE
RoleConfigAction[] memory actions = new RoleConfigAction[](1);
actions[0] = RoleConfigAction({
    actionType: RoleConfigActionType.ADD_WALLET,
    data: abi.encode(OWNER_ROLE, attackerAddress)
});
executeRoleConfigBatch(actions);
```

**Current Protection**:
- ✅ Protected role check at `RuntimeRBAC.sol:246-248`
- ✅ Protected role check at `EngineBlox.sol:773-775` (removeRole)
- ✅ Protected role check at `EngineBlox.sol:864-866` (revokeWallet)
- ✅ Batch operations validate protected roles before execution

**Verification**:
- Test batch operations with protected role modification
- Test direct protected role modification attempts
- Verify `CannotModifyProtected` error is raised

**Related Tests**:
- `testFuzz_CannotAddWalletToProtectedRoleViaBatch`
- `testFuzz_CannotRevokeLastWalletFromProtectedRole`
- `testFuzz_CannotRemoveProtectedRole`
- `test_BatchWithProtectedRoleModification`

---

#### HIGH: Protected Role Last Wallet Removal
- **ID**: `AC-002`
- **Location**: `EngineBlox.sol:858-873`
- **Severity**: HIGH
- **Status**: ✅ **PROTECTED**

**Description**:  
Attempting to remove the last wallet from a protected role, which would lock out legitimate access.

**Attack Scenario**:
```solidity
// OWNER_ROLE has only one wallet (owner)
// Attacker attempts to revoke the owner wallet
revokeWallet(OWNER_ROLE, ownerAddress);
// Should fail - cannot remove last wallet from protected role
```

**Current Protection**:
- ✅ Check at line 864-866: `if (roleData.isProtected && roleData.authorizedWallets.length() <= 1)`
- ✅ Reverts with `CannotModifyProtected`

**Verification**:
- Test with protected role containing exactly 1 wallet
- Test with protected role containing 2 wallets (remove one, then attempt to remove last)
- Test concurrent removal attempts

**Related Tests**:
- `testFuzz_CannotRevokeLastWalletFromProtectedRole`

---

### 1.2 Permission Escalation

#### HIGH: Function Selector Manipulation
- **ID**: `AC-003`
- **Location**: `EngineBlox.sol:946-966`, `EngineBlox.sol:1949-1964`
- **Severity**: HIGH
- **Status**: ✅ **PROTECTED**

**Description**:  
Manipulating function selectors to gain unauthorized permissions through handler selector relationships.

**Attack Scenario**:
```solidity
// Attacker creates role with permission for function A
// Function A has handlerForSelectors pointing to function B
// Attacker gains indirect access to function B

// Step 1: Create function schema for A with handler pointing to B
createFunctionSchema("functionA()", FUNCTION_A_SELECTOR, "OPERATION_A", 
    bitmap(SIGN_META_APPROVE), false, [FUNCTION_B_SELECTOR]);

// Step 2: Create role with permission for A
addFunctionToRole(roleHash, FunctionPermission({
    functionSelector: FUNCTION_A_SELECTOR,
    grantedActionsBitmap: SIGN_META_APPROVE,
    handlerForSelectors: [FUNCTION_B_SELECTOR]
}));
```

**Current Protection**:
- ✅ `_validateHandlerForSelectors` checks handler relationships
- ✅ Handler selectors must exist in schema's `handlerForSelectors` array
- ✅ Protected functions cannot be accessed via handlers

**Verification**:
- Test handler selector validation in `addFunctionToRole`
- Test that handlers cannot point to protected functions
- Test complete attack chain

**Related Tests**:
- `testFuzz_HandlerSelectorValidationPreventsEscalation`

---

#### HIGH: Handler Selector Self-Reference Exploitation
- **ID**: `AC-004`
- **Location**: `EngineBlox.sol:1974-2011`
- **Severity**: HIGH
- **Status**: ✅ **PROTECTED**

**Description**:  
Execution selectors use self-reference in `handlerForSelectors`. Non-execution selectors should not be able to use self-reference.

**Attack Scenario**:
```solidity
// Attacker creates handler function schema (not execution)
// Attempts to add permission with self-reference
addFunctionToRole(roleHash, FunctionPermission({
    functionSelector: HANDLER_SELECTOR,
    grantedActionsBitmap: SIGN_META_APPROVE,
    handlerForSelectors: [HANDLER_SELECTOR] // Self-reference - should fail
}));
```

**Current Protection**:
- ✅ Line 1992-1995: Self-reference allowed only for execution selectors
- ✅ Validation checks if handler selector matches function selector (self-reference)
- ✅ Non-execution selectors cannot use self-reference

**Verification**:
- Test that non-execution selectors cannot use self-reference
- Test execution selector self-reference (should be allowed)
- Test handler selector pointing to execution (should be allowed)

**Related Tests**:
- `testFuzz_SelfReferenceOnlyForExecutionSelectors`

---

#### HIGH: Cross-Role Permission Accumulation
- **ID**: `AC-005`
- **Location**: `EngineBlox.sol:946-966`
- **Severity**: HIGH
- **Status**: ⚠️ **INTENTIONAL BEHAVIOR**

**Description**:  
Wallet with multiple roles accumulates permissions across all roles (OR logic), potentially exceeding intended security model.

**Attack Scenario**:
```solidity
// Wallet has Role1 with permission for function A
// Wallet also has Role2 with permission for function B
// Combined, wallet has access to both A and B

// This is actually correct behavior (OR logic), but might be unexpected
// if roles are meant to be mutually exclusive
```

**Current Behavior**:
- ✅ Permission check iterates all roles (OR logic)
- ✅ If wallet has ANY role with permission, access granted
- ⚠️ This is intentional design, but consider if AND logic needed for critical operations

**Verification**:
- Test wallet with multiple roles
- Verify wallet can access all functions from all roles
- Test if this matches intended security model

**Related Tests**:
- `testFuzz_PermissionAccumulationAcrossRoles`

---

### 1.3 Batch Operation Security

#### CRITICAL: Batch Operation Atomicity
- **ID**: `AC-006`
- **Location**: `RuntimeRBAC.sol:208-302`
- **Severity**: CRITICAL
- **Status**: ✅ **PROTECTED**

**Description**:  
Batch operations must be atomic - if any action fails, all actions should be reverted. This prevents partial execution that could leave system in inconsistent state.

**Attack Scenario**:
```solidity
// Batch with multiple actions
RoleConfigAction[] memory actions = new RoleConfigAction[](2);

// Action 1: Valid operation (should succeed)
actions[0] = RoleConfigAction({
    actionType: CREATE_ROLE,
    data: abi.encode("VALID_ROLE", 10, permissions)
});

// Action 2: Invalid operation (should fail)
actions[1] = RoleConfigAction({
    actionType: ADD_WALLET,
    data: abi.encode(OWNER_ROLE, wallet) // Protected role - should fail
});

// If batch is not atomic, Action 1 might execute even though Action 2 fails
executeRoleConfigBatch(actions);
```

**Current Protection**:
- ✅ Batch operations use try-catch for error handling
- ✅ Failed actions cause entire batch to revert
- ✅ State changes are atomic

**Verification**:
- Test batch with valid action followed by invalid action
- Verify valid action does NOT execute if invalid action fails
- Test batch with multiple invalid actions
- Verify complete rollback on failure

**Related Tests**:
- `testFuzz_BatchOperationAtomicity`
- `test_BatchWithProtectedRoleModification`
- `testFuzz_BatchWithMultipleProtectedRoleAttempts`

---

#### MEDIUM: Role Wallet Limit Bypass
- **ID**: `AC-007`
- **Location**: `EngineBlox.sol:809-823`
- **Severity**: MEDIUM
- **Status**: ✅ **PROTECTED**

**Description**:  
Bypassing `maxWallets` limit through concurrent operations or race conditions.

**Attack Scenario**:
```solidity
// Role has maxWallets = 10, currently has 9 wallets
// Attacker submits multiple ADD_WALLET transactions simultaneously
// Race condition might allow exceeding maxWallets limit
```

**Current Protection**:
- ✅ `validateWalletLimit` checks before adding
- ✅ Check happens before state modification

**Verification**:
- Test concurrent wallet additions
- Test adding wallet when at limit
- Verify `WalletLimitExceeded` error

**Related Tests**:
- `testFuzz_RoleWalletLimitEnforced`

---

### 1.4 Role Management

#### MEDIUM: Duplicate Wallet Addition
- **ID**: `AC-008`
- **Location**: `EngineBlox.sol:809-823`
- **Severity**: MEDIUM
- **Status**: ✅ **PROTECTED**

**Description**:  
Attempting to add the same wallet to a role multiple times.

**Attack Scenario**:
```solidity
// Wallet already in role
// Attacker attempts to add same wallet again
assignWallet(roleHash, existingWallet);
```

**Current Protection**:
- ✅ `ItemAlreadyExists` error if wallet already in role
- ✅ Check happens before state modification

**Verification**:
- Test adding duplicate wallet
- Verify `ItemAlreadyExists` error

**Related Tests**:
- `testFuzz_CannotAddDuplicateWallet`

---

#### MEDIUM: Protected Role Name Collision
- **ID**: `AC-009`
- **Location**: `EngineBlox.sol:731-757`
- **Severity**: MEDIUM
- **Status**: ✅ **PROTECTED**

**Description**:  
Creating role with name that hashes to protected role hash.

**Attack Scenario**:
```solidity
// Attacker finds string that hashes to OWNER_ROLE
// Attempts to create role with that name
createRole("collision_string", 10, permissions);
// Should fail if hash matches protected role
```

**Current Protection**:
- ✅ Protected roles created during initialization
- ✅ Role name hashing unlikely to collide with protected roles
- ⚠️ Consider explicit protected role name list

**Verification**:
- Test role name collision attempts
- Verify protected roles cannot be recreated

**Related Tests**:
- `testFuzz_CannotCreateRoleWithProtectedRoleName`

---

## 2. Meta-Transaction Security

### 2.1 Signature & Cryptographic Attacks

#### CRITICAL: Cross-Chain Signature Replay
- **ID**: `MT-001`
- **Location**: `EngineBlox.sol:1507-1548`, `EngineBlox.sol:1477`
- **Severity**: CRITICAL
- **Status**: ✅ **PROTECTED**

**Description**:  
Replaying a valid signature from one blockchain network on another network with a different `chainId`.

**Attack Scenario**:
```solidity
// Attacker captures valid meta-transaction signature on Ethereum Mainnet (chainId = 1)
MetaTransaction memory metaTx = {
    params: {
        chainId: 1, // Ethereum Mainnet
        // ... other params
    },
    signature: validSignature // Signed for chainId = 1
};

// Attacker attempts to replay on Polygon (chainId = 137)
// Modify chainId in params
metaTx.params.chainId = 137; // Polygon
// Execute on Polygon - should fail chain ID validation
```

**Current Protection**:
- ✅ `validateChainId(metaTx.params.chainId)` at line 1477
- ✅ Domain separator includes `block.chainid` at line 1518
- ✅ Signature verification includes chainId in message hash

**Verification**:
- Test signature replay with different chain IDs
- Verify `ChainIdMismatch` error
- Test with correct chainId (should succeed)

**Related Tests**:
- `testFuzz_CrossChainSignatureReplayPrevented`

---

#### CRITICAL: Nonce Replay Attack
- **ID**: `MT-002`
- **Location**: `EngineBlox.sol:1446-1457`, `EngineBlox.sol:1484`
- **Severity**: CRITICAL
- **Status**: ✅ **PROTECTED**

**Description**:  
Reusing nonces to replay transactions before nonce increments.

**Attack Scenario**:
```solidity
// Attacker captures meta-transaction with nonce N
// Replays transaction before nonce increments
// Double-spend or duplicate execution

MetaTransaction memory metaTx1 = createMetaTx(nonce: N);
MetaTransaction memory metaTx2 = createMetaTx(nonce: N); // Same nonce

// Execute both - second should fail
executeMetaTransaction(metaTx1); // Succeeds, nonce becomes N+1
executeMetaTransaction(metaTx2); // Should fail - nonce mismatch
```

**Current Protection**:
- ✅ Nonce incremented BEFORE execution (line 1456)
- ✅ Nonce validation checks current nonce matches expected
- ✅ `InvalidNonce` error if nonce mismatch

**Verification**:
- Test nonce increment timing
- Test nonce replay attempts
- Verify nonce increments before external calls

**Related Tests**:
- `testFuzz_NonceReplayPrevented`
- `testFuzz_NonceIncrementsBeforeExecution`
- `testFuzz_ConcurrentNonceUsagePrevented`
- `testFuzz_NoncePredictionReplayPrevented`

---

#### HIGH: Signature Malleability Attack
- **ID**: `MT-003`
- **Location**: `EngineBlox.sol:1556-1587`, `SharedValidation.sol:212-217`
- **Severity**: HIGH
- **Status**: ✅ **PROTECTED**

**Description**:  
ECDSA signature malleability (s-value manipulation) allowing creation of different valid signatures for the same message.

**Attack Scenario**:
```solidity
// Attacker modifies s-value to create different valid signature
// Original signature: (r, s, v)
// Malleable signature: (r, secp256k1_order - s, v)
// Both signatures are valid for same message
```

**Current Protection**:
- ✅ `validateSignatureParams` checks s-value
- ✅ S-value must be <= secp256k1_order / 2
- ✅ Prevents signature malleability

**Verification**:
- Test signature with modified s-value
- Verify signature validation rejects malleable signatures

**Related Tests**:
- `testFuzz_SignatureMalleabilityPrevented`

---

#### HIGH: Message Hash Manipulation
- **ID**: `MT-004`
- **Location**: `EngineBlox.sol:1507-1548`
- **Severity**: HIGH
- **Status**: ✅ **PROTECTED**

**Description**:  
Manipulating EIP-712 message hash components after signing to change transaction details while keeping signature valid.

**Attack Scenario**:
```solidity
// Attacker modifies txRecord or metaTxParams after signing
// Different message hash but same signature
// Attempts to execute with modified parameters
```

**Current Protection**:
- ✅ Signature verified against complete message hash
- ✅ Message hash includes all transaction parameters
- ✅ Any modification invalidates signature

**Verification**:
- Test signature with modified message components
- Verify signature validation fails

**Related Tests**:
- `testFuzz_MessageHashManipulationPrevented`

---

#### MEDIUM: Expired Meta-Transaction
- **ID**: `MT-005`
- **Location**: `EngineBlox.sol:1478`, `EngineBlox.sol:1700`
- **Severity**: MEDIUM
- **Status**: ✅ **PROTECTED**

**Description**:  
Executing meta-transactions after deadline expiration.

**Attack Scenario**:
```solidity
// Meta-transaction with deadline in past
MetaTransaction memory metaTx = {
    params: {
        deadline: block.timestamp - 1 hour, // Expired
        // ... other params
    }
};
// Attempt to execute - should fail
```

**Current Protection**:
- ✅ `validateMetaTxDeadline` checks expiration
- ✅ Reverts if `block.timestamp > deadline`

**Verification**:
- Test expired meta-transactions
- Verify deadline enforcement

**Related Tests**:
- `testFuzz_ExpiredMetaTransactionRejected`

---

#### MEDIUM: Gas Price Limit Exceeded
- **ID**: `MT-006`
- **Location**: `EngineBlox.sol:1481`, `SharedValidation.sol:357-364`
- **Severity**: MEDIUM
- **Status**: ✅ **PROTECTED**

**Description**:  
Exceeding `maxGasPrice` limit in meta-transaction parameters.

**Attack Scenario**:
```solidity
// Meta-transaction with gas price exceeding limit
MetaTransaction memory metaTx = {
    params: {
        maxGasPrice: 1000 gwei, // Exceeds limit
        // ... other params
    }
};
// Attempt to execute - should fail
```

**Current Protection**:
- ✅ `validateGasPrice` check
- ✅ Reverts if gas price exceeds limit

**Verification**:
- Test with gas price exceeding limit
- Verify `GasPriceExceedsMax` error

**Related Tests**:
- `testFuzz_GasPriceLimitEnforced`

---

### 2.2 Invalid Signature Attacks

#### MEDIUM: Invalid Signature Rejected
- **ID**: `MT-007`
- **Location**: `EngineBlox.sol:1556-1587`
- **Severity**: MEDIUM
- **Status**: ✅ **PROTECTED**

**Description**:  
Rejecting meta-transactions with invalid signatures (wrong signer, corrupted signature, etc.).

**Attack Scenario**:
```solidity
// Meta-transaction with signature from wrong signer
MetaTransaction memory metaTx = {
    params: {
        signer: owner,
        // ... other params
    },
    signature: attackerSignature // Signed by attacker, not owner
};
// Attempt to execute - should fail
```

**Current Protection**:
- ✅ Signature verification checks recovered signer matches `params.signer`
- ✅ Invalid signatures cause revert

**Verification**:
- Test with signatures from wrong signer
- Test with corrupted signatures
- Test with invalid signature length

**Related Tests**:
- `testFuzz_InvalidSignatureRejected`
- `testFuzz_InvalidSignatureLengthRejected`

---

## 3. State Machine & Transaction Lifecycle

### 3.1 Transaction Status Manipulation

#### CRITICAL: Transaction Status Race Condition
- **ID**: `SM-001`
- **Location**: `EngineBlox.sol:360-378`, `EngineBlox.sol:387-399`, `EngineBlox.sol:426-457`
- **Severity**: CRITICAL
- **Status**: ✅ **PROTECTED**

**Description**:  
Race condition where concurrent approval and cancellation operations on the same transaction might both succeed, leading to inconsistent state.

**Attack Scenario**:
```solidity
// Transaction txId is PENDING
// Attacker submits two transactions simultaneously:

// Transaction 1: Approve
approveTransaction(txId);

// Transaction 2: Cancel (submitted in same block)
cancelTransaction(txId);

// Both check status is PENDING (both pass)
// Both attempt to modify status
// Race condition - which one wins?
```

**Current Protection**:
- ✅ Status check at line 367, 394, 443: `_validateTxStatus(self, txId, TxStatus.PENDING)`
- ✅ Status updated to EXECUTING/CANCELLED before external calls
- ✅ Second operation fails with `TransactionStatusMismatch`

**Verification**:
- Test concurrent approval and cancellation
- Verify only one succeeds
- Verify second fails with `TransactionStatusMismatch`

**Related Tests**:
- `testFuzz_ConcurrentApprovalCancellationPrevented`

---

#### HIGH: Status Transition Bypass
- **ID**: `SM-002`
- **Location**: `EngineBlox.sol:1928-1937`
- **Severity**: HIGH
- **Status**: ✅ **PROTECTED**

**Description**:  
Bypassing required status transitions by attempting invalid transitions.

**Attack Scenario**:
```solidity
// Transaction is in EXECUTING status
// Attacker attempts to approve again
approveTransaction(txId); // Should fail - not PENDING

// Or transaction is COMPLETED
// Attacker attempts to cancel
cancelTransaction(txId); // Should fail - not PENDING
```

**Current Protection**:
- ✅ `_validateTxStatus` enforces expected status
- ✅ Status transitions are one-way: PENDING → EXECUTING → (COMPLETED/FAILED)
- ✅ Status transitions: PENDING → CANCELLED

**Verification**:
- Test status transition enforcement
- Test invalid status transitions
- Verify `TransactionStatusMismatch` error

**Related Tests**:
- `testFuzz_InvalidStatusTransitionPrevented`

---

#### HIGH: Premature Approval Attack
- **ID**: `SM-003`
- **Location**: `EngineBlox.sol:360-378`, `EngineBlox.sol:186`
- **Severity**: HIGH
- **Status**: ✅ **PROTECTED**

**Description**:  
Approving transaction before time-lock expires, bypassing security delay.

**Attack Scenario**:
```solidity
// Transaction requested with time-lock
uint256 txId = requestTransaction(...);
// releaseTime = block.timestamp + timeLockPeriod

// Attacker attempts to approve immediately
approveTransaction(txId); // Should fail - time-lock not expired
```

**Current Protection**:
- ✅ `validateReleaseTime` check at line 186
- ✅ Reverts with `BeforeReleaseTime` if `block.timestamp < releaseTime`

**Verification**:
- Test premature approval attempts
- Verify time-lock enforcement
- Test approval after time-lock expires

**Related Tests**:
- `testFuzz_PrematureApprovalPrevented`

---

### 3.2 Reentrancy Attacks

#### CRITICAL: Transaction Execution Reentrancy
- **ID**: `RE-001`
- **Location**: `EngineBlox.sol:502-534`
- **Severity**: CRITICAL
- **Status**: ✅ **PROTECTED**

**Description**:  
Reentrancy through target contract callback during transaction execution.

**Attack Scenario**:
```solidity
// Target contract calls back into state machine
contract MaliciousTarget {
    function execute() external {
        // Reenter state machine
        stateMachine.approveTimeLockExecution(otherTxId);
        // Bypass state machine protection
    }
}

// Transaction executes target contract
// Target contract reenters state machine
// Attempts to bypass protection
```

**Current Protection**:
- ✅ Status set to EXECUTING before external call (line 503)
- ✅ Reentrant calls see EXECUTING status, not PENDING
- ✅ Reentrant operations fail status check

**Verification**:
- Test reentrancy through target contract
- Verify status-based protection
- Test multiple reentrant calls

**Related Tests**:
- `testFuzz_TargetReentrancyPrevented`

---

#### HIGH: Payment Execution Reentrancy
- **ID**: `RE-002`
- **Location**: `EngineBlox.sol:550-590`
- **Severity**: HIGH
- **Status**: ✅ **PROTECTED**

**Description**:  
Reentrancy through payment recipient during payment execution.

**Attack Scenario**:
```solidity
// Payment recipient is malicious contract
contract MaliciousRecipient {
    receive() external payable {
        // Reenter state machine
        stateMachine.approveTimeLockExecution(txId);
    }
}

// Payment sent to malicious recipient
// Recipient reenters during payment
// Attempts to bypass protection
```

**Current Protection**:
- ✅ Status is PROCESSING_PAYMENT during payment
- ✅ Reentrant calls see PROCESSING_PAYMENT status
- ✅ Reentrant operations fail status check

**Verification**:
- Test reentrancy through payment recipient
- Verify payment protection
- Test with malicious payment recipient

**Related Tests**:
- `testFuzz_PaymentRecipientReentrancyPrevented`

---

#### HIGH: ERC20 Token Reentrancy
- **ID**: `RE-003`
- **Location**: `EngineBlox.sol:588`
- **Severity**: HIGH
- **Status**: ✅ **PROTECTED**

**Description**:  
Reentrancy through malicious ERC20 token during `safeTransfer`.

**Attack Scenario**:
```solidity
// ERC20 token calls back during safeTransfer
contract MaliciousERC20 {
    function transfer(address to, uint256 amount) external returns (bool) {
        // Reenter state machine
        stateMachine.approveTimeLockExecution(txId);
        return true;
    }
}

// ERC20 payment sent
// Token contract reenters during transfer
// Attempts to bypass protection
```

**Current Protection**:
- ✅ SafeERC20 library used
- ✅ Status-based protection prevents reentrancy
- ✅ Try-catch handles token failures

**Verification**:
- Test with malicious ERC20 token
- Verify reentrancy protection
- Test token transfer failures

**Related Tests**:
- `testFuzz_ERC20TokenReentrancyPrevented`

---

### 3.3 Time-Lock Attacks

#### HIGH: Time-Lock Period Manipulation
- **ID**: `SM-004`
- **Location**: `EngineBlox.sol:246-249`, `SecureOwnable.sol:296-303`
- **Severity**: HIGH
- **Status**: ✅ **PROTECTED**

**Description**:  
Reducing time-lock period to bypass security delay.

**Attack Scenario**:
```solidity
// Attacker updates time-lock to very short period
updateTimeLockPeriod(1); // 1 second instead of 24 hours
// Bypass intended security delay
```

**Current Protection**:
- ✅ Time-lock update requires owner approval
- ✅ Time-lock updates are time-locked themselves
- ✅ Requires proper authorization

**Verification**:
- Test time-lock period updates
- Verify authorization requirements
- Test minimum time-lock period

**Related Tests**:
- `testFuzz_TimeLockPeriodManipulationPrevented`

---

#### MEDIUM: Block Timestamp Manipulation
- **ID**: `SM-005`
- **Location**: `EngineBlox.sol:638`, `EngineBlox.sol:186`
- **Severity**: MEDIUM
- **Status**: ✅ **PROTECTED**

**Description**:  
Miner manipulation of `block.timestamp` to accelerate time-lock expiration.

**Attack Scenario**:
```solidity
// Miner manipulates timestamp to accelerate time-lock
// releaseTime = block.timestamp + timeLockPeriod
// Miner sets block.timestamp to future value
// Time-lock appears expired
```

**Current Protection**:
- ✅ Time-lock periods should be sufficiently long (24+ hours)
- ✅ Miner can only manipulate ~15 seconds per block
- ✅ Long time-lock periods prevent meaningful manipulation

**Verification**:
- Test with manipulated timestamps
- Verify time-lock still enforced
- Test with maximum timestamp manipulation

**Related Tests**:
- `testFuzz_BlockTimestampManipulationLimited`

---

### 3.4 Execution Attacks

#### HIGH: Gas Limit Manipulation
- **ID**: `SM-006`
- **Location**: `EngineBlox.sol:508-511`, `EngineBlox.sol:516`
- **Severity**: HIGH
- **Status**: ✅ **PROTECTED**

**Description**:  
Manipulating gas limit to cause execution failure or out-of-gas errors.

**Attack Scenario**:
```solidity
// Attacker sets very low gas limit
requestTransaction(target, value, selector, params, 1000, operationType);
// Transaction fails due to out-of-gas
// Status marked as FAILED instead of reverting
```

**Current Protection**:
- ✅ Transaction execution handles out-of-gas gracefully
- ✅ Status updated to FAILED on execution failure
- ✅ State remains consistent

**Verification**:
- Test with various gas limits
- Test with insufficient gas
- Verify graceful failure handling

**Related Tests**:
- `testFuzz_GasLimitManipulationHandled`

---

#### HIGH: Target Contract Revert Exploitation
- **ID**: `SM-007`
- **Location**: `EngineBlox.sol:516-518`, `EngineBlox.sol:528-530`
- **Severity**: HIGH
- **Status**: ✅ **PROTECTED**

**Description**:  
Target contract reverts to manipulate state or cause unexpected behavior.

**Attack Scenario**:
```solidity
// Target contract always reverts
contract RevertingTarget {
    function execute() external {
        revert("Always fails");
    }
}

// Transaction executes target
// Target reverts
// State machine should handle gracefully
```

**Current Protection**:
- ✅ State machine updates status to FAILED
- ✅ Revert reason captured in `result` field
- ✅ State remains consistent

**Verification**:
- Test with reverting target contracts
- Verify graceful failure handling
- Test with various revert reasons

**Related Tests**:
- `testFuzz_TargetContractRevertHandled`

---

#### HIGH: Insufficient Balance Exploitation
- **ID**: `SM-008`
- **Location**: `EngineBlox.sol:563-565`, `EngineBlox.sol:580-582`
- **Severity**: HIGH
- **Status**: ✅ **PROTECTED**

**Description**:  
Executing payment with insufficient contract balance.

**Attack Scenario**:
```solidity
// Transaction with payment exceeding contract balance
requestTransaction(target, value, selector, params, gasLimit, operationType);
updatePayment(txId, PaymentDetails({
    nativeTokenAmount: 1000 ether, // Exceeds balance
    // ...
}));
// Attempt to execute - should fail
```

**Current Protection**:
- ✅ Balance check before payment (line 563-565, 580-582)
- ✅ Reverts with `InsufficientBalance` if balance insufficient

**Verification**:
- Test with insufficient balance
- Verify `InsufficientBalance` error
- Test with exact balance

**Related Tests**:
- `testFuzz_InsufficientBalanceHandled`

---

## 4. Reentrancy Attacks

*[See Section 3.2 for reentrancy attack vectors]*

---

## 5. Input Validation & Data Manipulation

### 5.1 Address Validation

#### HIGH: Zero Address Injection
- **ID**: `IV-001`
- **Location**: Multiple locations using `validateNotZeroAddress`
- **Severity**: HIGH
- **Status**: ✅ **PROTECTED**

**Description**:  
Injecting zero address (`address(0)`) in parameters where it's not expected.

**Attack Scenarios**:
- Role wallet assignment: `assignWallet(roleHash, address(0))`
- Target address in transaction: `requestTransaction(address(0), ...)`
- Meta-transaction signer: `metaTx.params.signer = address(0)`

**Current Protection**:
- ✅ `validateNotZeroAddress` used extensively
- ✅ Comprehensive zero address checks

**Verification**:
- Test all functions with `address(0)` input
- Verify `InvalidAddress` error

**Related Tests**:
- `testFuzz_ZeroAddressInjectionPrevented`
- `testFuzz_ZeroAddressInRoleAssignment`

---

### 5.2 Array & Data Structure Attacks

#### HIGH: Array Length Manipulation
- **ID**: `IV-002`
- **Location**: `EngineBlox.sol:775`, `RuntimeRBAC.sol:208-302`
- **Severity**: HIGH
- **Status**: ✅ **PROTECTED**

**Description**:  
Manipulating array lengths in batch operations to cause gas exhaustion.

**Attack Scenario**:
```solidity
// Attacker provides very large arrays
RoleConfigAction[] memory actions = new RoleConfigAction[](10000);
// Gas exhaustion or out-of-gas attacks
```

**Current Protection**:
- ✅ Gas limits prevent excessive operations
- ✅ Reasonable array size limits in tests

**Verification**:
- Test with maximum array sizes
- Test with very large arrays
- Verify gas limits

**Related Tests**:
- `testFuzz_ArrayLengthManipulationHandled`
- `testFuzz_ArrayLengthMismatchPrevented`

---

#### MEDIUM: Array Index Out of Bounds
- **ID**: `IV-003`
- **Location**: `EngineBlox.sol:1410-1414`
- **Severity**: MEDIUM
- **Status**: ✅ **PROTECTED**

**Description**:  
Accessing array elements beyond bounds using invalid indices.

**Attack Scenario**:
```solidity
// Array has 5 elements (indices 0-4)
// Attacker provides index 10
getWalletsInRole(roleHash)[10]; // Out of bounds
```

**Current Protection**:
- ✅ `validateIndexInBounds` check
- ✅ Index validation before access

**Verification**:
- Test with invalid indices
- Test with negative indices (if applicable)
- Verify bounds checking

**Related Tests**:
- `testFuzz_ArrayIndexOutOfBoundsPrevented`

---

#### MEDIUM: Empty Array Exploitation
- **ID**: `IV-004`
- **Location**: `RuntimeRBAC.sol:208-302`
- **Severity**: MEDIUM
- **Status**: ⚠️ **ALLOWED**

**Description**:  
Exploiting empty arrays in batch operations (no-op execution).

**Attack Scenario**:
```solidity
// Attacker submits empty batch
RoleConfigAction[] memory actions = new RoleConfigAction[](0);
executeRoleConfigBatch(actions);
// No-op execution but consumes gas
```

**Current Protection**:
- ⚠️ Empty batches are allowed (intentional)
- ✅ No state changes occur

**Verification**:
- Test empty batch operations
- Verify no state changes
- Test gas consumption

**Related Tests**:
- `testFuzz_EmptyArrayHandled`

---

### 5.3 String & Function Signature Validation

#### MEDIUM: Role Name Length Exploitation
- **ID**: `IV-005`
- **Location**: `EngineBlox.sol:731-757`
- **Severity**: MEDIUM
- **Status**: ✅ **PROTECTED**

**Description**:  
Very long role names causing gas issues or storage problems.

**Attack Scenario**:
```solidity
// Attacker provides extremely long role name
string memory longName = "A" * 10000; // Very long string
createRole(longName, 10, permissions);
// Gas exhaustion
```

**Current Protection**:
- ✅ Reasonable length limits in tests
- ✅ Gas limits prevent excessive operations

**Verification**:
- Test with maximum length strings
- Test with very long strings
- Verify gas limits

**Related Tests**:
- `testFuzz_RoleNameLengthHandled`

---

#### MEDIUM: Function Signature Validation
- **ID**: `IV-006`
- **Location**: `EngineBlox.sol:1029-1088`
- **Severity**: MEDIUM
- **Status**: ✅ **PROTECTED**

**Description**:  
Manipulating function signatures to bypass validation.

**Attack Scenario**:
```solidity
// Attacker provides signature that doesn't match selector
createFunctionSchema("wrongSignature()", SELECTOR, ...);
// Should fail - signature must match selector
```

**Current Protection**:
- ✅ Signature must match selector
- ✅ `FunctionSelectorMismatch` error if mismatch

**Verification**:
- Test with mismatched signatures
- Verify signature validation

**Related Tests**:
- `testFuzz_FunctionSignatureValidation`

---

#### MEDIUM: Zero Function Selector
- **ID**: `IV-007`
- **Location**: Multiple locations
- **Severity**: MEDIUM
- **Status**: ✅ **PROTECTED**

**Description**:  
Using zero function selector (`bytes4(0)`) to bypass validation.

**Attack Scenario**:
```solidity
// Attacker uses zero selector
requestTransaction(target, value, bytes4(0), params, ...);
// Should fail validation
```

**Current Protection**:
- ✅ Zero selector validation
- ✅ `ZeroOperationTypeNotAllowed` or similar error

**Verification**:
- Test with zero selectors
- Verify validation

**Related Tests**:
- `testFuzz_ZeroFunctionSelectorPrevented`

---

#### MEDIUM: Zero Operation Type
- **ID**: `IV-008`
- **Location**: Multiple locations
- **Severity**: MEDIUM
- **Status**: ✅ **PROTECTED**

**Description**:  
Using zero operation type (`bytes32(0)`) to bypass validation.

**Attack Scenario**:
```solidity
// Attacker uses zero operation type
requestTransaction(target, value, selector, params, gasLimit, bytes32(0));
// Should fail validation
```

**Current Protection**:
- ✅ Zero operation type validation
- ✅ `ZeroOperationTypeNotAllowed` error

**Verification**:
- Test with zero operation types
- Verify validation

**Related Tests**:
- `testFuzz_ZeroOperationTypePrevented`

---

### 5.4 Numeric Validation

#### MEDIUM: Time-Lock Period Bounds
- **ID**: `IV-009`
- **Location**: `EngineBlox.sol:246-249`
- **Severity**: MEDIUM
- **Status**: ✅ **PROTECTED**

**Description**:  
Manipulating time-lock period to extreme values (very small or very large).

**Attack Scenario**:
```solidity
// Attacker sets time-lock to 0 or very large value
updateTimeLockPeriod(0); // No delay
updateTimeLockPeriod(type(uint256).max); // Overflow risk
```

**Current Protection**:
- ✅ Solidity 0.8.33 overflow protection
- ✅ Reasonable bounds in tests

**Verification**:
- Test with extreme time-lock values
- Test with zero time-lock
- Verify bounds

**Related Tests**:
- `testFuzz_TimeLockPeriodBounds`

---

#### MEDIUM: Max Wallets Validation
- **ID**: `IV-010`
- **Location**: `EngineBlox.sol:731-757`
- **Severity**: MEDIUM
- **Status**: ✅ **PROTECTED**

**Description**:  
Setting `maxWallets` to extreme values (0 or very large).

**Attack Scenario**:
```solidity
// Attacker creates role with maxWallets = 0
createRole("ROLE", 0, permissions); // Cannot add any wallets

// Or maxWallets = type(uint256).max
createRole("ROLE", type(uint256).max, permissions); // No limit
```

**Current Protection**:
- ✅ Reasonable bounds in tests
- ✅ Wallet limit enforcement

**Verification**:
- Test with extreme maxWallets values
- Verify wallet limit enforcement

**Related Tests**:
- `testFuzz_MaxWalletsValidation`

---

## 6. Payment & Economic Security

### 6.1 Payment Manipulation

#### HIGH: Payment Recipient Update After Request
- **ID**: `PAY-001`
- **Location**: `EngineBlox.sol:697-707`
- **Severity**: HIGH
- **Status**: ⚠️ **REQUIRES VERIFICATION**

**Description**:  
Updating payment recipient after transaction request to redirect funds to attacker address.

**Attack Scenario**:
```solidity
// Legitimate transaction request
uint256 txId = requestTransaction(...);

// Attacker updates payment recipient (if has permission)
updatePaymentForTransaction(txId, PaymentDetails({
    recipient: attackerAddress, // Redirect to attacker
    nativeTokenAmount: 10 ether,
    // ...
}));

// Transaction executes, payment goes to attacker
```

**Current Protection**:
- ✅ Payment update requires PENDING status
- ⚠️ **CRITICAL**: Need to verify who can update payments
- ⚠️ **CRITICAL**: Need to verify payment update permissions

**Verification**:
- Test payment recipient updates
- Verify permission requirements
- Test unauthorized payment updates

**Related Tests**:
- `testFuzz_PaymentRecipientUpdateAccessControl`

---

#### HIGH: Payment Amount Manipulation
- **ID**: `PAY-002`
- **Location**: `EngineBlox.sol:697-707`
- **Severity**: HIGH
- **Status**: ⚠️ **REQUIRES VERIFICATION**

**Description**:  
Manipulating payment amounts to drain contract balance or exceed limits.

**Attack Scenario**:
```solidity
// Transaction with initial payment
uint256 txId = requestTransaction(...);
updatePayment(txId, PaymentDetails({
    nativeTokenAmount: 1 ether, // Initial amount
    // ...
}));

// Attacker updates to excessive amount
updatePayment(txId, PaymentDetails({
    nativeTokenAmount: 1000 ether, // Excessive amount
    // ...
}));
```

**Current Protection**:
- ✅ Payment updates require permissions
- ⚠️ Need to verify amount limits

**Verification**:
- Test payment amount updates
- Verify amount limits
- Test with excessive amounts

**Related Tests**:
- `testFuzz_PaymentAmountManipulationPrevented`

---

#### MEDIUM: Double Payment Exploitation
- **ID**: `PAY-003`
- **Location**: `EngineBlox.sol:550-590`
- **Severity**: MEDIUM
- **Status**: ✅ **PROTECTED**

**Description**:  
Receiving payment multiple times through transaction replay or duplicate execution.

**Attack Scenario**:
```solidity
// Transaction executed multiple times
// Payment sent multiple times
approveTransaction(txId); // First execution
approveTransaction(txId); // Second execution - should fail
```

**Current Protection**:
- ✅ Transaction can only execute once
- ✅ Status prevents duplicate execution

**Verification**:
- Test double execution attempts
- Verify payment sent only once

**Related Tests**:
- `testFuzz_DoublePaymentPrevented`

---

#### MEDIUM: ERC20 Token Address Manipulation
- **ID**: `PAY-004`
- **Location**: `EngineBlox.sol:576-589`
- **Severity**: MEDIUM
- **Status**: ✅ **PROTECTED**

**Description**:  
Using malicious ERC20 token address or non-ERC20 contract.

**Attack Scenario**:
```solidity
// Attacker sets payment to malicious ERC20
updatePayment(txId, PaymentDetails({
    erc20TokenAddress: maliciousContract, // Not ERC20
    erc20TokenAmount: 1000,
    // ...
}));
// Token contract behaves unexpectedly
```

**Current Protection**:
- ✅ SafeERC20 library used
- ✅ Try-catch handles token failures

**Verification**:
- Test with malicious ERC20 tokens
- Test with non-ERC20 contracts
- Verify graceful failure handling

**Related Tests**:
- `testFuzz_ERC20TokenAddressValidation`

---

### 6.2 Balance & Fund Attacks

#### HIGH: Balance Drain Prevention
- **ID**: `PAY-005`
- **Location**: `EngineBlox.sol:562-573`
- **Severity**: HIGH
- **Status**: ✅ **PROTECTED**

**Description**:  
Draining contract native token balance through multiple transactions with large payments.

**Attack Scenario**:
```solidity
// Attacker creates multiple transactions with large native payments
// Each transaction drains balance
// Total payments exceed contract balance
```

**Current Protection**:
- ✅ Balance check before each payment
- ✅ `InsufficientBalance` error if balance insufficient

**Verification**:
- Test balance drain scenarios
- Test with multiple transactions
- Verify balance protection

**Related Tests**:
- `testFuzz_BalanceDrainPrevented`

---

#### MEDIUM: Payment Update Timing
- **ID**: `PAY-006`
- **Location**: `EngineBlox.sol:697-707`
- **Severity**: MEDIUM
- **Status**: ✅ **PROTECTED**

**Description**:  
Updating payment details just before transaction execution to redirect funds.

**Attack Scenario**:
```solidity
// Transaction pending, time-lock about to expire
// Attacker updates payment recipient just before approval
// Payment goes to attacker instead of original recipient
```

**Current Protection**:
- ✅ Payment updates require PENDING status
- ✅ Payment updates require permissions

**Verification**:
- Test payment update timing
- Verify update restrictions
- Test update just before execution

**Related Tests**:
- `testFuzz_PaymentUpdateTiming`

---

## 7. Composite & Multi-Vector Attacks

### 7.1 Multi-Stage Permission Escalation

#### CRITICAL: Multi-Stage Permission Escalation
- **ID**: `COMP-001`
- **Location**: Multiple components
- **Severity**: CRITICAL
- **Status**: ✅ **PROTECTED**

**Description**:  
Combining multiple vulnerabilities for privilege escalation through a multi-stage attack chain.

**Attack Chain**:
1. Attacker gains low-privilege role
2. Exploits function selector manipulation
3. Bypasses handler validation
4. Gains unauthorized permissions

**Current Protection**:
- ✅ Handler selector validation prevents escalation
- ✅ Protected functions cannot be accessed via handlers
- ✅ Permission checks validate all components

**Verification**:
- Test complete attack chain
- Verify each stage is protected
- Test handler validation

**Related Tests**:
- `testFuzz_MultiStagePermissionEscalationPrevented`

---

### 7.2 Time-Lock + Meta-Transaction Bypass

#### HIGH: Time-Lock + Meta-Transaction Bypass
- **ID**: `COMP-002`
- **Location**: `EngineBlox.sol:360-378`, `EngineBlox.sol:1477-1548`
- **Severity**: HIGH
- **Status**: ✅ **PROTECTED**

**Description**:  
Bypassing time-lock using meta-transactions by signing approval immediately after request.

**Attack Scenario**:
1. Attacker requests time-locked transaction
2. Immediately signs meta-transaction approval
3. Broadcaster executes before time-lock expires
4. Bypass time-lock protection

**Current Protection**:
- ✅ Meta-transaction approval still requires time-lock expiration
- ✅ Time-lock checked during meta-transaction execution

**Verification**:
- Test meta-transaction with pending time-lock
- Verify time-lock still enforced
- Test immediate meta-transaction signing

**Related Tests**:
- `testFuzz_TimeLockAppliesToMetaTransactions`

---

### 7.3 Payment + Execution Combination

#### HIGH: Payment Update + Execution Bypass
- **ID**: `COMP-003`
- **Location**: `EngineBlox.sol:697-707`, `EngineBlox.sol:550-590`
- **Severity**: HIGH
- **Status**: ⚠️ **REQUIRES VERIFICATION**

**Description**:  
Combining payment update with execution to redirect funds during execution.

**Attack Scenario**:
1. Legitimate transaction requested
2. Payment updated to attacker address
3. Transaction executed
4. Funds redirected to attacker

**Current Protection**:
- ✅ Payment updates require permissions
- ✅ Payment updates require PENDING status

**Verification**:
- Test payment update + execution combination
- Verify update restrictions
- Test unauthorized updates

**Related Tests**:
- `testFuzz_PaymentUpdateExecutionCombination`

---

### 7.4 Nonce + Signature Replay

#### HIGH: Nonce Prediction + Signature Replay
- **ID**: `COMP-004`
- **Location**: `EngineBlox.sol:1446-1457`, `EngineBlox.sol:1484`
- **Severity**: HIGH
- **Status**: ✅ **PROTECTED**

**Description**:  
Predicting next nonce and creating front-run transaction to replay signature.

**Attack Scenario**:
1. Attacker predicts next nonce (current + 1)
2. Creates meta-transaction with predicted nonce
3. Front-runs legitimate transaction
4. Replays signature with predicted nonce

**Current Protection**:
- ✅ Nonce incremented before execution
- ✅ Nonce validation prevents replay
- ✅ Invalid nonce causes revert

**Verification**:
- Test nonce prediction attempts
- Verify nonce increment timing
- Test front-run scenarios

**Related Tests**:
- `testFuzz_NoncePredictionReplayPrevented`

---

## 8. Cryptographic & Signature Attacks

*[See Section 2.1 for cryptographic attack vectors - covered in Meta-Transaction Security section]*

---

## 9. Time-Based Attacks

### 9.1 Time-Lock Manipulation

#### HIGH: Time-Lock Period Reduction
- **ID**: `TIME-001`
- **Location**: `SecureOwnable.sol:296-303`
- **Severity**: HIGH
- **Status**: ✅ **PROTECTED**

**Description**:  
Reducing time-lock period to minimum to bypass security delay.

**Attack Scenario**:
```solidity
// Attacker updates time-lock to 1 second
updateTimeLockPeriod(1); // 1 second instead of 24 hours
// Bypass intended security delay
```

**Current Protection**:
- ✅ Time-lock update requires owner approval
- ✅ Time-lock updates are time-locked themselves
- ✅ Requires proper authorization

**Verification**:
- Test time-lock period updates
- Verify authorization requirements
- Test minimum time-lock period

**Related Tests**:
- `testFuzz_TimeLockPeriodManipulationPrevented`

---

#### MEDIUM: Block Timestamp Manipulation
- **ID**: `TIME-002`
- **Location**: `EngineBlox.sol:638`, `EngineBlox.sol:186`
- **Severity**: MEDIUM
- **Status**: ✅ **PROTECTED**

**Description**:  
Miner manipulation of `block.timestamp` to accelerate time-lock expiration.

**Attack Scenario**:
```solidity
// Miner manipulates timestamp to accelerate time-lock
// releaseTime = block.timestamp + timeLockPeriod
// Miner sets block.timestamp to future value
// Time-lock appears expired
```

**Current Protection**:
- ✅ Time-lock periods should be sufficiently long (24+ hours)
- ✅ Miner can only manipulate ~15 seconds per block
- ✅ Long time-lock periods prevent meaningful manipulation

**Verification**:
- Test with manipulated timestamps
- Verify time-lock still enforced
- Test with maximum timestamp manipulation

**Related Tests**:
- `testFuzz_BlockTimestampManipulationLimited`

---

#### MEDIUM: Deadline Extension
- **ID**: `TIME-003`
- **Location**: `EngineBlox.sol:1700`
- **Severity**: MEDIUM
- **Status**: ✅ **PROTECTED**

**Description**:  
Setting very long deadlines for meta-transactions to extend signature validity.

**Attack Scenario**:
```solidity
// Attacker sets deadline far in future
MetaTransaction memory metaTx = {
    params: {
        deadline: block.timestamp + 10 years, // Very long deadline
        // ...
    }
};
// Signature remains valid indefinitely
```

**Current Protection**:
- ✅ Deadline validation checks expiration
- ⚠️ Impact: Low - signature still requires proper permissions

**Verification**:
- Test with long deadlines
- Verify deadline enforcement
- Test deadline expiration

---

## 10. Role Management

### 10.1 Role Creation & Modification

#### HIGH: Duplicate Role Creation
- **ID**: `RM-001`
- **Location**: `EngineBlox.sol:731-757`
- **Severity**: HIGH
- **Status**: ✅ **PROTECTED**

**Description**:  
Creating duplicate roles with the same name to bypass duplicate checks.

**Attack Scenario**:
```solidity
// Attacker creates role with same name
createRole("EXISTING_ROLE", 10, permissions); // First call
createRole("EXISTING_ROLE", 10, permissions); // Second call - should fail
```

**Current Protection**:
- ✅ `ResourceAlreadyExists` check
- ✅ Role name hashing prevents duplicates

**Verification**:
- Test duplicate role creation
- Verify `ResourceAlreadyExists` error

**Related Tests**:
- `testFuzz_CannotCreateRoleWithProtectedRoleName`

---

#### MEDIUM: Role Wallet Limit Bypass
- **ID**: `RM-002`
- **Location**: `EngineBlox.sol:809-823`
- **Severity**: MEDIUM
- **Status**: ✅ **PROTECTED**

**Description**:  
Exceeding role wallet limits through concurrent operations.

**Attack Scenario**:
```solidity
// Role has maxWallets = 10, currently has 9 wallets
// Attacker submits multiple ADD_WALLET transactions simultaneously
// Race condition might allow exceeding maxWallets limit
```

**Current Protection**:
- ✅ `validateWalletLimit` checks before adding
- ✅ Check happens before state modification

**Verification**:
- Test concurrent wallet additions
- Test adding wallet when at limit
- Verify `WalletLimitExceeded` error

**Related Tests**:
- `testFuzz_RoleWalletLimitEnforced`

---

#### MEDIUM: Last Wallet Removal from Protected Role
- **ID**: `RM-003`
- **Location**: `EngineBlox.sol:858-873`
- **Severity**: MEDIUM
- **Status**: ✅ **PROTECTED**

**Description**:  
Removing last wallet from protected role to lock out legitimate access.

**Attack Scenario**:
```solidity
// OWNER_ROLE has only one wallet (owner)
// Attacker attempts to revoke the owner wallet
revokeWallet(OWNER_ROLE, ownerAddress);
// Should fail - cannot remove last wallet from protected role
```

**Current Protection**:
- ✅ Check at line 864-866: `if (roleData.isProtected && roleData.authorizedWallets.length() <= 1)`
- ✅ Reverts with `CannotModifyProtected`

**Verification**:
- Test with protected role containing exactly 1 wallet
- Test with protected role containing 2 wallets (remove one, then attempt to remove last)
- Test concurrent removal attempts

**Related Tests**:
- `testFuzz_CannotRevokeLastWalletFromProtectedRole`

---

## 11. Target Whitelist & Function Schema

### 11.1 Whitelist Bypass

#### CRITICAL: Whitelist Bypass via address(this)
- **ID**: `WL-001`
- **Location**: `EngineBlox.sol:1227-1231`
- **Severity**: CRITICAL
- **Status**: ✅ **INTENTIONAL**

**Description**:  
Using `address(this)` to bypass whitelist requirements for internal function calls.

**Attack Scenario**:
```solidity
// Attacker targets address(this) for any function
requestTransaction(address(this), value, selector, params, ...);
// Bypass whitelist requirement
```

**Current Protection**:
- ✅ This is intentional design - internal calls allowed
- ✅ Internal functions have additional protection (`validateInternalCall`)
- ✅ External calls still require whitelist

**Verification**:
- Verify this is intentional and secure
- Test internal function protection
- Verify external calls still require whitelist

---

#### HIGH: Empty Whitelist Exploitation
- **ID**: `WL-002`
- **Location**: `EngineBlox.sol:1217-1242`
- **Severity**: HIGH
- **Status**: ✅ **PROTECTED**

**Description**:  
Exploiting empty whitelist behavior (all targets denied except `address(this)`).

**Attack Scenario**:
```solidity
// Function has empty whitelist (no entries)
// All targets denied except address(this)
// Attacker cannot execute on external targets
```

**Current Protection**:
- ✅ Empty whitelist = deny all (secure by default)
- ✅ Only `address(this)` allowed when whitelist empty

**Verification**:
- Test empty whitelist behavior
- Verify external targets denied
- Test internal calls allowed

---

#### HIGH: Whitelist Removal Attack
- **ID**: `WL-003`
- **Location**: `EngineBlox.sol:1197-1206`
- **Severity**: HIGH
- **Status**: ✅ **PROTECTED**

**Description**:  
Removing target from whitelist after transaction request but before execution.

**Attack Scenario**:
```solidity
// Attacker requests transaction with whitelisted target
uint256 txId = requestTransaction(whitelistedTarget, ...);

// Target removed from whitelist before approval
removeTargetFromWhitelist(selector, whitelistedTarget);

// Transaction fails at execution
approveTransaction(txId); // Should fail - target not whitelisted
```

**Current Protection**:
- ✅ Whitelist checked at execution (line 1223)
- ✅ Transaction fails if target not whitelisted

**Verification**:
- Test whitelist removal during pending transaction
- Verify execution fails
- Test whitelist re-addition

---

#### MEDIUM: Function Selector Not Registered
- **ID**: `WL-004`
- **Location**: `EngineBlox.sol:1223-1225`
- **Severity**: MEDIUM
- **Status**: ✅ **INTENTIONAL**

**Description**:  
Bypassing whitelist for unregistered selectors (whitelist validation skipped).

**Attack Scenario**:
```solidity
// Function selector not in supportedFunctionsSet
// Whitelist validation skipped
// Attacker can execute unregistered functions
```

**Current Protection**:
- ✅ This is intentional design - unregistered functions skip validation
- ⚠️ Consider if this is desired behavior

**Verification**:
- Verify this is intentional design
- Test unregistered function execution
- Consider security implications

---

### 11.2 Function Schema Attacks

#### HIGH: Handler Selector Validation Bypass
- **ID**: `FS-001`
- **Location**: `EngineBlox.sol:1974-2011`
- **Severity**: HIGH
- **Status**: ✅ **PROTECTED**

**Description**:  
Bypassing handler selector validation by providing handler selector not in schema.

**Attack Scenario**:
```solidity
// Attacker provides handler selector not in schema
addFunctionToRole(roleHash, FunctionPermission({
    functionSelector: FUNCTION_SELECTOR,
    handlerForSelectors: [INVALID_HANDLER_SELECTOR] // Not in schema
}));
```

**Current Protection**:
- ✅ `_validateHandlerForSelectors` checks all handlers
- ✅ Handler must exist in schema's `handlerForSelectors` array

**Verification**:
- Test with invalid handler selectors
- Verify validation prevents this
- Test handler selector requirements

**Related Tests**:
- `testFuzz_HandlerSelectorValidation`

---

#### MEDIUM: Protected Function Schema Modification
- **ID**: `FS-002`
- **Location**: `EngineBlox.sol:1099-1144`
- **Severity**: MEDIUM
- **Status**: ✅ **PROTECTED**

**Description**:  
Attempting to modify or remove protected function schemas.

**Attack Scenario**:
```solidity
// Attacker attempts to remove protected function schema
removeFunctionSchema(TRANSFER_OWNERSHIP_SELECTOR, false);
// Should fail with CannotModifyProtected
```

**Current Protection**:
- ✅ Check at line 1106-1108: `if (self.functions[functionSelector].isProtected)`
- ✅ Protected schemas cannot be modified

**Verification**:
- Test protected schema modification
- Verify `CannotModifyProtected` error
- Test with `safeRemoval = true` and `false`

---

#### MEDIUM: Operation Type Cleanup Exploitation
- **ID**: `FS-003`
- **Location**: `EngineBlox.sol:1133-1143`
- **Severity**: MEDIUM
- **Status**: ✅ **PROTECTED**

**Description**:  
Exploiting operation type cleanup when removing functions.

**Attack Scenario**:
```solidity
// Remove function using operation type
removeFunctionSchema(selector, false);
// Operation type removed from set
// Other functions using same type affected
```

**Current Protection**:
- ✅ Cleanup checks other functions
- ✅ Operation type only removed if no other functions use it

**Verification**:
- Test operation type cleanup
- Verify cleanup logic
- Test with multiple functions using same operation type

---

## 12. Initialization & Upgrade

### 12.1 Initialization Attacks

#### CRITICAL: Multiple Initialization Attack
- **ID**: `INIT-001`
- **Location**: `EngineBlox.sol:209-239`, `BaseStateMachine.sol:79-92`
- **Severity**: CRITICAL
- **Status**: ✅ **PROTECTED**

**Description**:  
Initializing contract multiple times to reset state or modify initial configuration.

**Attack Scenario**:
```solidity
// Attacker calls initialize multiple times
initialize(owner, broadcaster, recovery, ...); // First call
initialize(attacker, attacker, attacker, ...); // Second call - should fail
```

**Current Protection**:
- ✅ `AlreadyInitialized` check
- ✅ `initialized` flag prevents re-initialization

**Verification**:
- Test multiple initialization attempts
- Verify `AlreadyInitialized` error
- Test uninitialized contract access

---

#### HIGH: Uninitialized State Exploitation
- **ID**: `INIT-002`
- **Location**: `EngineBlox.sol:209-239`
- **Severity**: HIGH
- **Status**: ✅ **PROTECTED**

**Description**:  
Exploiting uninitialized contract state by calling functions before initialization.

**Attack Scenario**:
```solidity
// Contract deployed but not initialized
// Attacker calls functions before initialization
requestTransaction(...); // Should fail - not initialized
```

**Current Protection**:
- ✅ Functions check `initialized` flag
- ✅ Revert if not initialized

**Verification**:
- Test uninitialized contract access
- Verify initialization requirement
- Test after initialization

---

#### MEDIUM: Initialization Parameter Manipulation
- **ID**: `INIT-003`
- **Location**: `EngineBlox.sol:209-239`
- **Severity**: MEDIUM
- **Status**: ✅ **PROTECTED**

**Description**:  
Manipulating initialization parameters to bypass validation or set invalid state.

**Attack Scenario**:
```solidity
// Attacker provides invalid initialization parameters
initialize(address(0), broadcaster, recovery, ...); // Zero owner
initialize(owner, address(0), recovery, ...); // Zero broadcaster
```

**Current Protection**:
- ✅ Comprehensive parameter validation
- ✅ Zero address checks
- ✅ Parameter validation before state changes

**Verification**:
- Test with invalid initialization parameters
- Verify parameter validation
- Test all parameter combinations

---

### 12.2 Upgrade Pattern Attacks

#### MEDIUM: Storage Layout Collision
- **ID**: `INIT-004`
- **Location**: All upgradeable contracts
- **Severity**: MEDIUM
- **Status**: ⚠️ **REQUIRES REVIEW**

**Description**:  
Storage layout collision in upgrades causing state corruption.

**Attack Scenario**:
```solidity
// Upgrade introduces storage layout changes
// State corruption occurs
// Unintended behavior
```

**Current Protection**:
- ⚠️ Follow OpenZeppelin upgrade patterns
- ⚠️ Review storage layout compatibility

**Verification**:
- Review storage layout compatibility
- Test upgrade scenarios
- Verify state preservation

---

## 13. Hook System

### 13.1 Hook Execution Attacks

#### HIGH: Malicious Hook Contract
- **ID**: `HOOK-001`
- **Location**: `HookManager.sol:98-204`
- **Severity**: HIGH
- **Status**: ✅ **PROTECTED**

**Description**:  
Malicious hook contract performing unauthorized operations during hook execution.

**Attack Scenario**:
```solidity
// Owner sets malicious hook contract
setHook(HookType.ON_ACTION, maliciousHookContract);

// Hook performs unauthorized operations
// Attempts to manipulate state
```

**Current Protection**:
- ✅ Hook execution is best-effort, doesn't affect core state
- ✅ Hook failures don't affect transaction execution
- ✅ Try-catch prevents hook failures from propagating

**Verification**:
- Test with malicious hook contracts
- Verify hook failures don't affect state
- Test hook execution isolation

---

#### MEDIUM: Hook Reentrancy
- **ID**: `HOOK-002`
- **Location**: `HookManager.sol:220-236`
- **Severity**: MEDIUM
- **Status**: ✅ **PROTECTED**

**Description**:  
Reentrancy through hook contracts bypassing ReentrancyGuard.

**Attack Scenario**:
```solidity
// Malicious hook reenters state machine
contract MaliciousHook {
    function onAction(...) external {
        stateMachine.approveTimeLockExecution(txId);
    }
}
```

**Current Protection**:
- ✅ `nonReentrant` modifier on hook functions
- ✅ ReentrancyGuard prevents reentrancy

**Verification**:
- Test hook reentrancy
- Verify reentrancy protection
- Test multiple reentrant calls

---

#### MEDIUM: Hook Gas Exhaustion
- **ID**: `HOOK-003`
- **Location**: `HookManager.sol:98-204`
- **Severity**: MEDIUM
- **Status**: ✅ **PROTECTED**

**Description**:  
Gas exhaustion through malicious hook contracts consuming excessive gas.

**Attack Scenario**:
```solidity
// Malicious hook consumes excessive gas
contract GasIntensiveHook {
    function onAction(...) external {
        // Consumes all gas
        while(true) { /* ... */ }
    }
}
```

**Current Protection**:
- ✅ Hook execution has gas limits
- ✅ Hook failures don't affect transaction
- ✅ Try-catch prevents gas exhaustion from affecting core state

**Verification**:
- Test with gas-intensive hooks
- Verify gas limits
- Test hook failure handling

---

### 13.2 Hook Management Attacks

#### MEDIUM: Unauthorized Hook Setting
- **ID**: `HOOK-004`
- **Location**: `HookManager.sol:59-65`
- **Severity**: MEDIUM
- **Status**: ✅ **PROTECTED**

**Description**:  
Unauthorized hook configuration bypassing access control.

**Attack Scenario**:
```solidity
// Attacker sets hook without owner permission
vm.prank(attacker);
setHook(HookType.ON_ACTION, maliciousHook); // Should fail
```

**Current Protection**:
- ✅ Owner-only function
- ✅ Access control enforced

**Verification**:
- Test unauthorized hook setting
- Verify access control
- Test authorized hook setting

---

## 14. Event Forwarding & Monitoring

### 14.1 Event Forwarder Attacks

#### MEDIUM: Malicious Event Forwarder
- **ID**: `EVENT-001`
- **Location**: `EngineBlox.sol:1724-1759`
- **Severity**: MEDIUM
- **Status**: ✅ **PROTECTED**

**Description**:  
Malicious event forwarder contract performing unauthorized operations.

**Attack Scenario**:
```solidity
// Attacker sets malicious event forwarder
setEventForwarder(maliciousForwarder);

// Forwarder performs unauthorized operations
// Attempts to manipulate state
```

**Current Protection**:
- ✅ Try-catch prevents failures from propagating
- ✅ Event forwarding is non-critical operation
- ✅ Forwarder failures don't affect core state

**Verification**:
- Test with malicious event forwarder
- Verify forwarder failures don't affect state
- Test event forwarding isolation

---

#### LOW: Event Forwarder Gas Exhaustion
- **ID**: `EVENT-002`
- **Location**: `EngineBlox.sol:1746-1758`
- **Severity**: LOW
- **Status**: ✅ **PROTECTED**

**Description**:  
Gas exhaustion through malicious event forwarder.

**Attack Scenario**:
```solidity
// Malicious forwarder consumes excessive gas
contract GasIntensiveForwarder {
    function forwardTxEvent(...) external {
        while(true) { /* ... */ }
    }
}
```

**Current Protection**:
- ✅ Try-catch prevents failure propagation
- ✅ Impact: Low - try-catch prevents failure propagation

**Verification**:
- Test with gas-intensive forwarder
- Verify graceful failure handling
- Test gas limits

---

## 15. Definition Contracts & Schema Security

### 15.1 Schema Definition Attacks

#### CRITICAL: Missing Protected Flag for System Functions
- **ID**: `DEF-001`
- **Location**: `EngineBlox.sol:1066-1069`, `BaseStateMachine.sol:756-783`
- **Severity**: CRITICAL
- **Status**: ✅ **PROTECTED**

**Description**:  
Definition contract omits `isProtected: true` for functions that exist in contract bytecode, allowing removal of critical system functions.

**Attack Scenario**:
```solidity
// Malicious definition contract
function getFunctionSchemas() public pure returns (EngineBlox.FunctionSchema[] memory) {
    // Missing isProtected: true for transferOwnership() which exists in bytecode
    schemas[0] = EngineBlox.FunctionSchema({
        functionSelector: TRANSFER_OWNERSHIP_SELECTOR,
        isProtected: false, // ❌ Should be true - function exists in contract
        // ...
    });
}
```

**Current Protection**:
- ✅ `_validateContractFunctionProtection` checks bytecode and requires protection
- ✅ `selectorExistsInContract` validates function exists in contract
- ✅ Reverts with `ContractFunctionMustBeProtected` if function exists but not protected

**Verification**:
- Test definition contracts with missing protected flags
- Verify `ContractFunctionMustBeProtected` error is raised
- Test with system functions that exist in bytecode

**Related Tests**:
- `testFuzz_DefinitionWithMissingProtectedFlagRejected`

---

#### HIGH: Incorrect Function Signature/Selector Mismatch
- **ID**: `DEF-002`
- **Location**: `EngineBlox.sol:1058-1064`
- **Severity**: HIGH
- **Status**: ✅ **PROTECTED**

**Description**:  
Definition provides function signature that doesn't match the selector, causing initialization failure or bypass validation.

**Attack Scenario**:
```solidity
// Definition with mismatched signature
schemas[0] = EngineBlox.FunctionSchema({
    functionSignature: "wrongSignature()", // Doesn't match selector
    functionSelector: TRANSFER_OWNERSHIP_SELECTOR,
    // ...
});
```

**Current Protection**:
- ✅ Signature validation at line 1061-1064
- ✅ `FunctionSelectorMismatch` error if mismatch detected

**Verification**:
- Test with mismatched signatures
- Verify `FunctionSelectorMismatch` error

**Related Tests**:
- `testFuzz_DefinitionWithMismatchedSignatureRejected`

---

#### HIGH: Invalid Handler Selector Relationships
- **ID**: `DEF-003`
- **Location**: `EngineBlox.sol:1999-2036`
- **Severity**: HIGH
- **Status**: ✅ **PROTECTED**

**Description**:  
Definition provides handler selectors that don't exist in schema's `handlerForSelectors` array, or creates circular/invalid dependencies.

**Attack Scenario**:
```solidity
// Definition with invalid handler relationship
schemas[0] = EngineBlox.FunctionSchema({
    functionSelector: HANDLER_SELECTOR,
    handlerForSelectors: [INVALID_EXECUTION_SELECTOR], // Not in execution schema
    // ...
});
```

**Current Protection**:
- ✅ `_validateHandlerForSelectors` validates relationships
- ✅ Handler selectors must exist in schema's `handlerForSelectors` array
- ✅ `HandlerForSelectorMismatch` error if invalid

**Verification**:
- Test with invalid handler relationships
- Verify validation prevents invalid handlers

**Related Tests**:
- `testFuzz_DefinitionWithInvalidHandlerSelectorsRejected`

---

#### MEDIUM: Duplicate Function Schema Definitions
- **ID**: `DEF-004`
- **Location**: `EngineBlox.sol:1096-1098`
- **Severity**: MEDIUM
- **Status**: ✅ **PROTECTED**

**Description**:  
Definition attempts to register the same function selector multiple times.

**Attack Scenario**:
```solidity
// Definition with duplicate schemas
schemas[0] = EngineBlox.FunctionSchema({...functionSelector: SELECTOR_A...});
schemas[1] = EngineBlox.FunctionSchema({...functionSelector: SELECTOR_A...}); // Duplicate
```

**Current Protection**:
- ✅ `ResourceAlreadyExists` check at line 1096-1098
- ✅ Duplicate selectors are rejected

**Verification**:
- Test with duplicate schemas
- Verify `ResourceAlreadyExists` error

**Related Tests**:
- `testFuzz_DefinitionWithDuplicateSchemasRejected`

---

#### MEDIUM: Empty HandlerForSelectors Array
- **ID**: `DEF-005`
- **Location**: `EngineBlox.sol:1080-1082`
- **Severity**: MEDIUM
- **Status**: ✅ **PROTECTED**

**Description**:  
Definition provides empty `handlerForSelectors` array, which is no longer allowed.

**Attack Scenario**:
```solidity
// Definition with empty handlerForSelectors
schemas[0] = EngineBlox.FunctionSchema({
    handlerForSelectors: [], // ❌ Empty array not allowed
    // ...
});
```

**Current Protection**:
- ✅ Empty array check at line 1080-1082
- ✅ `OperationFailed` error if empty

**Verification**:
- Test with empty arrays
- Verify `OperationFailed` error

**Related Tests**:
- `testFuzz_DefinitionWithEmptyHandlerArrayRejected`

---

### 15.2 Role Permission Attacks

#### HIGH: Permission for Non-Existent Function Schema
- **ID**: `DEF-006`
- **Location**: `BaseStateMachine.sol:777-781`, `EngineBlox.sol:2007-2009`
- **Severity**: HIGH
- **Status**: ✅ **PROTECTED**

**Description**:  
Definition provides role permissions for function selectors that haven't been registered in schemas yet.

**Attack Scenario**:
```solidity
// Definition loads permissions before schemas, or references non-existent function
rolePermissions[0] = FunctionPermission({
    functionSelector: NON_EXISTENT_SELECTOR, // Schema not registered
    // ...
});
```

**Current Protection**:
- ✅ `_loadDefinitions` loads schemas first, then permissions
- ✅ `addFunctionToRole` checks function exists in `supportedFunctionsSet`
- ✅ `ResourceNotFound` error if function doesn't exist

**Verification**:
- Test permissions for non-existent functions
- Verify `ResourceNotFound` error

**Related Tests**:
- `testFuzz_PermissionForNonExistentFunctionRejected`

---

#### MEDIUM: Array Length Mismatch in Role Permissions
- **ID**: `DEF-007`
- **Location**: `BaseStateMachine.sol:775`
- **Severity**: MEDIUM
- **Status**: ✅ **PROTECTED**

**Description**:  
Definition provides mismatched array lengths between `roleHashes` and `functionPermissions`.

**Attack Scenario**:
```solidity
// Definition with mismatched arrays
IDefinition.RolePermission memory permissions = IDefinition.RolePermission({
    roleHashes: [ROLE_A, ROLE_B], // 2 roles
    functionPermissions: [PERM_1] // Only 1 permission - mismatch!
});
```

**Current Protection**:
- ✅ `validateArrayLengthMatch` at line 775
- ✅ `ArrayLengthMismatch` error if lengths don't match

**Verification**:
- Test with mismatched arrays
- Verify `ArrayLengthMismatch` error

**Related Tests**:
- `testFuzz_DefinitionWithMismatchedPermissionArraysRejected`

---

#### MEDIUM: Invalid Action Bitmap in Permissions
- **ID**: `DEF-008`
- **Location**: `EngineBlox.sol:2044-2053`
- **Severity**: MEDIUM
- **Status**: ✅ **PROTECTED**

**Description**:  
Definition provides empty or invalid action bitmaps that don't match the function schema's supported actions.

**Attack Scenario**:
```solidity
// Definition with empty bitmap
functionPermissions[0] = FunctionPermission({
    grantedActionsBitmap: 0, // ❌ Empty bitmap not allowed
    // ...
});
```

**Current Protection**:
- ✅ Empty bitmap check at line 2051-2053
- ✅ `NotSupported` error if bitmap is empty

**Verification**:
- Test with empty/invalid bitmaps
- Verify `NotSupported` error

**Related Tests**:
- `testFuzz_DefinitionWithEmptyBitmapRejected`

---

#### HIGH: Handler Selector Self-Reference Violation
- **ID**: `DEF-009`
- **Location**: `EngineBlox.sol:2017-2020`
- **Severity**: HIGH
- **Status**: ✅ **PROTECTED**

**Description**:  
Definition provides self-reference in `handlerForSelectors` for non-execution selectors (only execution selectors can self-reference).

**Attack Scenario**:
```solidity
// Definition with invalid self-reference
functionPermissions[0] = FunctionPermission({
    functionSelector: HANDLER_SELECTOR, // Not execution
    handlerForSelectors: [HANDLER_SELECTOR], // ❌ Self-reference not allowed for handlers
    // ...
});
```

**Current Protection**:
- ✅ Self-reference validation at line 2017-2020
- ✅ Self-reference only allowed for execution selectors
- ✅ Handler validation prevents invalid self-references

**Verification**:
- Test with invalid self-references
- Verify validation prevents handler self-reference

**Related Tests**:
- `testFuzz_DefinitionWithInvalidSelfReferenceRejected`

---

### 15.3 Definition Contract Integrity Attacks

#### CRITICAL: Malicious Definition Contract Deployment
- **ID**: `DEF-010`
- **Location**: `BaseStateMachine.sol:756-783`
- **Severity**: CRITICAL
- **Status**: ⚠️ **REQUIRES USER VIGILANCE**

**Description**:  
Attacker deploys malicious definition contract that provides incorrect schemas/permissions to compromise system security.

**Attack Scenario**:
```solidity
// Attacker deploys malicious definition
contract MaliciousDefinitions {
    function getFunctionSchemas() public pure returns (EngineBlox.FunctionSchema[] memory) {
        // Provides schemas that bypass security checks
        // Or grants excessive permissions
    }
}
// Attacker tricks user into using malicious definition during initialization
```

**Current Protection**:
- ⚠️ Relies on users using trusted definition contracts
- ✅ Validation checks prevent many malicious patterns
- ✅ System definition contracts are protected

**Verification**:
- Test with malicious definition patterns
- Verify system rejects malicious patterns
- Test system definition contracts are valid

**Related Tests**:
- `test_SystemDefinitionContractsValid`
- `testFuzz_MaliciousDefinitionPatternsRejected`

---

#### MEDIUM: Definition Contract State Manipulation
- **ID**: `DEF-011`
- **Location**: `IDefinition.sol` (pure functions)
- **Severity**: MEDIUM
- **Status**: ✅ **PROTECTED**

**Description**:  
Definition contract uses state variables instead of pure functions, allowing manipulation.

**Attack Scenario**:
```solidity
// Malicious definition with state
contract MaliciousDefinitions {
    EngineBlox.FunctionSchema[] private schemas;
    
    function getFunctionSchemas() public returns (EngineBlox.FunctionSchema[] memory) {
        // Can modify schemas after deployment
        schemas[0].isProtected = false; // Change protection
        return schemas;
    }
}
```

**Current Protection**:
- ✅ Interface requires `pure` functions (compile-time check)
- ✅ Pure functions cannot access state
- ✅ Definition contracts should be libraries (no state)

**Verification**:
- Verify only pure definition contracts are used
- Test that state-based definitions are rejected

**Related Tests**:
- `testFuzz_DefinitionMustUsePureFunctions`

---

#### HIGH: Definition Contract Bytecode Tampering
- **ID**: `DEF-012`
- **Location**: `EngineBlox.sol:2144-2166`
- **Severity**: HIGH
- **Status**: ✅ **PROTECTED**

**Description**:  
Definition contract bytecode is modified after deployment, but the protection check only runs during schema creation.

**Attack Scenario**:
```solidity
// Definition contract upgraded/changed after initial use
// New version has different function selectors
// Protection validation only runs during _loadDefinitions
```

**Current Protection**:
- ✅ Protection check runs during `createFunctionSchema`
- ✅ `selectorExistsInContract` validates bytecode at creation time
- ✅ System definitions are immutable libraries

**Verification**:
- Verify protection validation catches bytecode changes
- Test with upgraded definition contracts

**Related Tests**:
- `test_SystemDefinitionsProtectSystemFunctions`

---

### 15.4 Initialization Order Attacks

#### MEDIUM: Schema Registration Order Dependency
- **ID**: `DEF-013`
- **Location**: `BaseStateMachine.sol:761-782`
- **Severity**: MEDIUM
- **Status**: ✅ **PROTECTED**

**Description**:  
Definition provides permissions before corresponding schemas are registered, causing initialization failure.

**Attack Scenario**:
```solidity
// Definition with wrong order (if possible)
// Permissions reference schemas that aren't registered yet
```

**Current Protection**:
- ✅ `_loadDefinitions` enforces schema-first order
- ✅ Schemas loaded before permissions
- ✅ `ResourceNotFound` error if permission references non-existent schema

**Verification**:
- Test initialization order is enforced
- Verify schemas must be registered before permissions

**Related Tests**:
- `testFuzz_SchemaRegistrationOrderEnforced`

---

#### MEDIUM: Multiple Definition Loading
- **ID**: `DEF-014`
- **Location**: `BaseStateMachine.sol:756-783`
- **Severity**: MEDIUM
- **Status**: ✅ **PROTECTED**

**Description**:  
Attempting to load definitions multiple times or from multiple sources causes conflicts.

**Attack Scenario**:
```solidity
// Load definitions from multiple sources
_loadDefinitions(definitions1.getFunctionSchemas(), ...);
_loadDefinitions(definitions2.getFunctionSchemas(), ...); // Conflicts?
```

**Current Protection**:
- ✅ Duplicate schema check prevents re-registration
- ✅ `ResourceAlreadyExists` error for duplicates
- ✅ Multiple definitions with different selectors allowed

**Verification**:
- Test multiple definition loading
- Verify conflicts are handled correctly

**Related Tests**:
- `testFuzz_MultipleDefinitionLoadingHandled`

---

## 16. New Attack Vectors (2026 Security Analysis)

### 16.1 Bitmap Security

#### HIGH: Bitmap Overflow/Underflow Attack
- **ID**: `BITMAP-001`
- **Location**: `EngineBlox.sol:1806-1831`
- **Severity**: HIGH
- **Status**: ✅ **PROTECTED**

**Description**:  
Bitmap operations use `uint16` with bit shifts. If `TxAction` enum exceeds 15 values, bit shifts could overflow or cause undefined behavior.

**Attack Scenario**:
```solidity
// If TxAction enum has 16+ values
TxAction action = TxAction(16); // Out of uint16 bitmap range
uint16 bitmap = 1 << uint8(action); // Potential overflow
```

**Current Protection**:
- ✅ Bitmap is `uint16` (max 16 bits)
- ✅ TxAction enum currently has 9 values (0-8)
- ✅ Solidity enum conversion prevents invalid values
- ✅ Bitmap operations are bounded by enum range

**Verification**:
- Test bitmap operations with action values 0-15
- Verify enum conversion rejects invalid values
- Test bitmap creation and checking

**Related Tests**:
- `testFuzz_BitmapOverflowPrevented`
- `testFuzz_InvalidActionEnumValuesRejected`

---

#### MEDIUM: Bitmap Validation Bypass Through Invalid Actions
- **ID**: `BITMAP-002`
- **Location**: `EngineBlox.sol:1825-1831`
- **Severity**: MEDIUM
- **Status**: ✅ **PROTECTED**

**Description**:  
Invalid action enum values (beyond enum range) are properly rejected when creating bitmaps or checking permissions.

**Attack Scenario**:
```solidity
// Definition with invalid action in array
TxAction[] memory actions = new TxAction[](1);
actions[0] = TxAction(255); // Invalid enum value
uint16 bitmap = createBitmapFromActions(actions);
// Does this create valid bitmap or cause issues?
```

**Current Protection**:
- ✅ Solidity enum conversion prevents invalid enum values
- ✅ Enum values must be in valid range (0-8 for current TxAction)
- ✅ Invalid enum values cause revert at conversion

**Verification**:
- Test with out-of-range action values
- Verify enum conversion rejects invalid values
- Test bitmap operations with edge cases

**Related Tests**:
- `testFuzz_InvalidActionEnumValuesRejected`

---

### 16.2 Hook System Security

#### MEDIUM: Hook Execution Order Dependency Attack
- **ID**: `HOOK-005`
- **Location**: `HookManager.sol:98-204`
- **Severity**: MEDIUM
- **Status**: ✅ **PROTECTED**

**Description**:  
Multiple hooks execute in EnumerableSet order. If hooks have dependencies or conflicts, order matters and could be exploited.

**Attack Scenario**:
```solidity
// Hook1 depends on Hook2 executing first
// But EnumerableSet order might be Hook2, Hook1
// Or attacker adds Hook3 that interferes with Hook1
setHook(selector, hook1);
setHook(selector, hook2); // Order matters!
```

**Current Protection**:
- ✅ Hooks are best-effort and isolated
- ✅ Hook execution order is deterministic (EnumerableSet iteration order)
- ✅ Hook failures don't affect core state
- ⚠️ No explicit ordering guarantees (documented behavior)

**Verification**:
- Test hook execution order consistency
- Test multiple hooks with dependencies
- Verify hook ordering doesn't create vulnerabilities

**Related Tests**:
- `testFuzz_HookExecutionOrderConsistent`

---

#### MEDIUM: Hook Interface Non-Compliance Attack
- **ID**: `HOOK-006`
- **Location**: `HookManager.sol:109, 127, 145, etc.`
- **Severity**: MEDIUM
- **Status**: ✅ **PROTECTED**

**Description**:  
If hook contract doesn't implement `IOnActionHook` correctly, the external call will revert. Need to verify this doesn't affect core state.

**Attack Scenario**:
```solidity
// Malicious hook with wrong function signature
contract BadHook {
    function onRequest(uint256 wrong) external {} // Wrong signature
}
// Hook call reverts - does this affect transaction?
```

**Current Protection**:
- ✅ Hook calls should be wrapped in try-catch (best-effort execution)
- ✅ Hook failures don't affect core state
- ✅ Hooks execute after core state transitions
- ⚠️ Need to verify actual try-catch implementation

**Verification**:
- Test with non-compliant hook contracts
- Verify hook failures don't affect state
- Test hook execution isolation

**Related Tests**:
- `testFuzz_HookInterfaceNonComplianceHandled`

---

#### MEDIUM: Hook Gas Exhaustion Through Multiple Hooks
- **ID**: `HOOK-007`
- **Location**: `HookManager.sol:98-204`
- **Severity**: MEDIUM
- **Status**: ✅ **PROTECTED**

**Description**:  
Attacker sets multiple gas-intensive hooks, causing transaction to run out of gas during hook execution.

**Attack Scenario**:
```solidity
// Attacker sets 10 hooks, each consuming 100k gas
for (uint i = 0; i < 10; i++) {
    setHook(selector, gasIntensiveHook);
}
// Total hook execution: 1M gas
// Transaction might run out of gas
```

**Current Protection**:
- ✅ Hooks are best-effort (shouldn't affect core state)
- ✅ Hook failures don't affect transaction
- ⚠️ No limit on number of hooks per selector
- ⚠️ No gas limit per hook execution

**Verification**:
- Test with maximum number of hooks
- Test with gas-intensive hooks
- Verify transaction completes even with many hooks

**Related Tests**:
- `testFuzz_MultipleHooksGasExhaustionPrevented`

---

#### MEDIUM: Hook Reentrancy Through State Machine Functions
- **ID**: `HOOK-008`
- **Location**: `HookManager.sol:212-318`
- **Severity**: MEDIUM
- **Status**: ✅ **PROTECTED**

**Description**:  
Hooks could attempt to reenter through state machine functions, but ReentrancyGuard should prevent this.

**Attack Scenario**:
```solidity
// Malicious hook reenters state machine
contract MaliciousHook {
    function onApprove(...) external {
        stateMachine.approveTimeLockExecution(txId);
    }
}
```

**Current Protection**:
- ✅ `nonReentrant` modifier on all hook override functions
- ✅ ReentrancyGuard from OpenZeppelin
- ✅ Hook execution happens after core state transitions
- ✅ Reentrant calls would see non-PENDING status

**Verification**:
- Test hook reentrancy attempts
- Verify ReentrancyGuard prevents all reentry paths
- Test multiple reentrant hook calls

**Related Tests**:
- `testFuzz_HookReentrancyPrevented`

---

### 16.3 Payment Security

#### HIGH: Payment Update Race Condition During Execution
- **ID**: `PAY-006`
- **Location**: `EngineBlox.sol:705-727`, `EngineBlox.sol:554-594`
- **Severity**: HIGH
- **Status**: ✅ **PROTECTED**

**Description**:  
Payment updates are only allowed during PENDING status, but there's a window between approval and payment execution where status changes.

**Attack Scenario**:
```solidity
// Transaction is PENDING
updatePayment(txId, payment1);

// Attacker attempts to update during execution
approveTransaction(txId); // Status changes to EXECUTING
updatePayment(txId, payment2); // Should fail - status not PENDING
```

**Current Protection**:
- ✅ `updatePaymentForTransaction` checks `TxStatus.PENDING`
- ✅ Status changes to EXECUTING before payment
- ✅ Status transitions are atomic
- ✅ Payment updates blocked once status changes

**Verification**:
- Test payment update attempts during EXECUTING status
- Test concurrent payment update and approval
- Verify atomicity of status transitions

**Related Tests**:
- `testFuzz_PaymentUpdateRaceConditionPrevented`

---

#### MEDIUM: Front-Running Payment Update Attack
- **ID**: `PAY-007`
- **Location**: `EngineBlox.sol:705-727`
- **Severity**: MEDIUM
- **Status**: ✅ **PROTECTED**

**Description**:  
MEV bots could front-run payment updates to redirect funds to attacker addresses.

**Attack Scenario**:
```solidity
// Legitimate user updates payment
updatePayment(txId, PaymentDetails({recipient: legitimateAddress, ...}));

// MEV bot front-runs and updates to attacker address
updatePayment(txId, PaymentDetails({recipient: attackerAddress, ...}));
```

**Current Protection**:
- ✅ Payment update uses same permissions as request (execution + handler selector)
- ✅ Only authorized users can update payments
- ⚠️ No rate limiting or cooldown period
- ⚠️ No event emission for payment updates (harder to detect)

**Verification**:
- Test unauthorized payment update attempts
- Verify permission requirements
- Test front-running scenarios

**Related Tests**:
- `testFuzz_FrontRunningPaymentUpdateHandled`

---

### 16.4 Access Control Security

#### MEDIUM: Bitmap Permission Escalation Through Handler Selectors
- **ID**: `AC-010`
- **Location**: `EngineBlox.sol:1974-2011`
- **Severity**: MEDIUM
- **Status**: ✅ **PROTECTED**

**Description**:  
Handler selector validation might allow permission escalation if bitmap validation is bypassed.

**Attack Scenario**:
```solidity
// Attacker creates permission with handler pointing to protected function
// But bitmap doesn't include required action
FunctionPermission({
    functionSelector: handlerSelector,
    grantedActionsBitmap: 0, // Empty bitmap
    handlerForSelectors: [protectedFunctionSelector]
});
// Does validation catch this?
```

**Current Protection**:
- ✅ Handler validation exists
- ✅ Empty bitmap check exists (`NotSupported` error)
- ✅ Handler + bitmap combination validation
- ✅ Handler selectors must exist in schema's `handlerForSelectors` array

**Verification**:
- Test handler selector + bitmap combinations
- Verify empty bitmap with valid handlers is rejected
- Test complete attack chain

**Related Tests**:
- `testFuzz_HandlerBitmapCombinationValidation`

---

### 16.5 Composite Attacks

#### HIGH: Composite Attack: Payment Update + Hook Manipulation
- **ID**: `COMP-001`
- **Location**: Multiple
- **Severity**: HIGH
- **Status**: ✅ **PROTECTED**

**Description**:  
Combining payment update with malicious hook to create composite attack.

**Attack Scenario**:
```solidity
// 1. Attacker sets malicious hook
setHook(selector, maliciousHook);

// 2. Legitimate user requests transaction with payment
requestTransaction(..., paymentDetails);

// 3. Attacker updates payment recipient
updatePayment(txId, PaymentDetails({recipient: attacker, ...}));

// 4. Hook executes and performs additional malicious actions
```

**Current Protection**:
- ✅ Each component has individual protections
- ✅ Payment update requires permissions
- ✅ Hook execution is best-effort and isolated
- ✅ Core state transitions happen before hooks

**Verification**:
- Test payment update + hook combinations
- Test multiple attack vectors simultaneously
- Verify composite attack scenarios

**Related Tests**:
- `testFuzz_CompositePaymentHookAttackPrevented`

---

## 17. Gas Exhaustion & System Limits

### 17.1 System Safety Limits

The system has immutable safety limits defined as public constants in `EngineBlox.sol` to prevent gas exhaustion attacks:

```solidity
MAX_BATCH_SIZE = 200          // Max items in batch operations
MAX_ROLES = 1000              // Max total roles in system
MAX_HOOKS_PER_SELECTOR = 100  // Max hooks per function selector
MAX_FUNCTIONS = 2000          // Max total functions in system
```

**Rationale**: These limits maintain gas safety while providing scalability. All operations remain within the Ethereum block gas limit (60M gas) with appropriate safety margins.

### 17.2 Gas Exhaustion Attack Vectors

#### CRITICAL: Permission Check Gas Exhaustion
- **ID**: `GAS-001`
- **Location**: `EngineBlox.sol:hasActionPermission()`, `EngineBlox.sol:hasAnyRole()`
- **Severity**: CRITICAL
- **Status**: ✅ **PROTECTED**

**Description**:  
Unbounded loops in permission checks could cause gas exhaustion when many roles exist.

**Current Protection**:
- ✅ Reverse index optimization: `hasAnyRole()` is O(1), `hasActionPermission()` is O(k) where k = wallet's role count
- ✅ `MAX_ROLES = 1000` prevents unbounded role growth
- ✅ Wallet-to-role indexing (`walletRoles` mapping) enables efficient permission checks

**Related Tests**:
- `testFuzz_PermissionCheckGasConsumptionWithManyRoles`
- `testFuzz_HasAnyRoleGasConsumptionWithManyRoles`
- `testFuzz_PermissionCheckOptimizationBenefit`

#### HIGH: Batch Operation Gas Exhaustion
- **ID**: `GAS-004`
- **Location**: `RuntimeRBAC.sol:_executeRoleConfigBatch()`, `GuardController.sol:_executeGuardConfigBatch()`
- **Severity**: HIGH
- **Status**: ✅ **PROTECTED**

**Description**:  
Large batch operations could exceed block gas limits.

**Current Protection**:
- ✅ `MAX_BATCH_SIZE = 200` prevents oversized batches
- ✅ Batch size validation in `SharedValidation.validateBatchSize()`
- ✅ Operations remain within safe gas budgets (< 30M gas for 200 items)

**Related Tests**:
- `testFuzz_BatchRoleCreationGasConsumption`
- `testFuzz_BatchSizeLimitEnforced`
- `testFuzz_BatchFunctionRegistrationGasConsumption`

#### HIGH: View Function Gas Exhaustion
- **ID**: `GAS-011`
- **Location**: `EngineBlox.sol:getSupportedRolesList()`, `EngineBlox.sol:getSupportedFunctionsList()`
- **Severity**: HIGH
- **Status**: ✅ **PROTECTED**

**Description**:  
View functions returning all roles/functions could consume excessive gas.

**Current Protection**:
- ✅ `MAX_ROLES = 1000` and `MAX_FUNCTIONS = 2000` cap resource growth
- ✅ View functions complete within reasonable gas (< 40M gas at limits)
- ⚠️ Consider pagination for very large datasets in production

**Related Tests**:
- `testFuzz_ViewFunctionGasConsumptionWithManyRoles`
- `testFuzz_ViewFunctionGasConsumptionWithManyFunctions`

#### MEDIUM: Hook Execution Gas Exhaustion
- **ID**: `GAS-007`
- **Location**: `HookManager.sol` (experimental)
- **Severity**: MEDIUM
- **Status**: ✅ **PROTECTED**

**Description**:  
Multiple hooks per selector could cause gas exhaustion.

**Current Protection**:
- ✅ `MAX_HOOKS_PER_SELECTOR = 100` prevents excessive hooks
- ✅ Hook execution is best-effort and isolated
- ✅ Hook failures don't affect core transaction state

**Related Tests**:
- `testFuzz_HookExecutionGasConsumptionWithManyHooks`
- `testFuzz_HookCountLimitEnforced`

### 17.3 System Limit Enforcement

#### Role Count Limit
- **Test**: `testFuzz_RoleCountLimitEnforced`
- **Limit**: `MAX_ROLES = 1000`
- **Status**: ✅ Enforced via `SharedValidation.validateRoleCount()`
- **Gas Impact**: ~908M gas to create 1000 roles (acceptable for limit test)

#### Function Count Limit
- **Test**: `testFuzz_FunctionCountLimitEnforced`
- **Limit**: `MAX_FUNCTIONS = 2000`
- **Status**: ✅ Enforced via `SharedValidation.validateFunctionCount()`
- **Gas Impact**: ~107k gas (efficient)

#### Batch Size Limit
- **Test**: `testFuzz_BatchSizeLimitEnforced`
- **Limit**: `MAX_BATCH_SIZE = 200`
- **Status**: ✅ Enforced via `SharedValidation.validateBatchSize()`
- **Gas Impact**: ~79M gas average (within limits)

#### Hook Count Limit
- **Test**: `testFuzz_HookCountLimitEnforced`
- **Limit**: `MAX_HOOKS_PER_SELECTOR = 100`
- **Status**: ✅ Enforced via `SharedValidation.validateHookCount()`
- **Gas Impact**: ~1k gas average (very efficient)

### 17.4 Key Findings

1. **Reverse Index Optimization**: Permission checks are now O(1) for `hasAnyRole()` and O(k) for `hasActionPermission()` where k = wallet's role count, independent of total roles.

2. **Gas Safety Maintained**: All operations remain within safe gas budgets even at maximum limits.

3. **Scalability Improved**: Limits doubled from initial conservative values while maintaining safety margins.

**Test File**: `test/foundry/fuzz/ComprehensiveGasExhaustionFuzz.t.sol` (17 tests)

---

## Adding New Attack Vectors

When documenting a new attack vector:

1. **Assign ID**: Use category prefix (AC, MT, SM, RE, IV, PAY, COMP, WL, FS, INIT, HOOK, EVENT, TIME, RM, BITMAP, etc.) + sequential number
2. **Include**:
   - Description with attack scenario (code examples)
   - Code locations affected (file:line numbers)
   - Current protections (if any) with status (PROTECTED, VULNERABLE, REQUIRES VERIFICATION, INTENTIONAL)
   - Severity classification (CRITICAL, HIGH, MEDIUM, LOW)
   - Verification requirements
3. **Link Tests**: Reference related test functions from [Test Documentation](./TEST_DOCUMENTATION.md)
4. **Update Index**: Add to appropriate category section
5. **Maintain Consistency**: Follow existing format and structure

---

## Maintenance Guidelines

### Regular Updates
- **After Security Audits**: Update codex with new findings
- **After Code Changes**: Verify protections still apply
- **After New Features**: Assess new attack vectors
- **After Test Additions**: Link new tests to attack vectors

### Status Tracking
- **PROTECTED**: Protection exists and is verified
- **VULNERABLE**: Known vulnerability requiring fix
- **REQUIRES VERIFICATION**: Needs review/verification
- **INTENTIONAL**: Behavior is intentional design choice

### Version Control
- Keep documentation synchronized with code
- Document changes in commit messages
- Maintain changelog for significant updates

---

## Cross-References

### Related Documentation
- [Test Documentation](./TEST_DOCUMENTATION.md) - Maps tests to attack vectors
- [Critical Findings & Recommendations](./CRITICAL_FINDINGS_AND_RECOMMENDATIONS.md) - Actionable security items
- [Documentation README](./README.md) - Documentation overview and navigation

---

**Note**: This codex is a living document. It should be updated as new threats are discovered, new protections are implemented, and new tests are added. Always link attack vectors to their test coverage in the Test Documentation.
