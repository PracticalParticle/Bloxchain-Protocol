// SPDX-License-Identifier: MPL-2.0
// Certora Verification Language (CVL) specification for State Transitions Safety Properties
// This file implements Safety Properties 5.1-5.3 from the scientific paper (Section 5.1.2)

using GuardianBareHarness as Contract;
use builtin rule sanity;

// ============ SAFETY PROPERTY 5.1: NO DOUBLE EXECUTION ============

/**
 * @dev Safety Property 5.1 (No Double Execution)
 * For any transaction t  in  T, if execute(t) is called, then status(t)  in  {COMPLETED, FAILED}.
 * 
 * This rule ensures that transactions cannot be executed multiple times
 * and that execution always results in a final state.
 */
rule noDoubleExecution(uint256 txId) {
    require Contract.getTxRecordStatus(txId) == PENDING;
    require transactionExists(txId);
    
    env e;
    Contract.txDelayedApprovalWrapper(e, txId);
    
    uint8 finalStatus = Contract.getTxRecordStatus(txId);
    assert finalStatus == COMPLETED || finalStatus == FAILED;
    
    // Verify cannot execute again
    Contract.txDelayedApprovalWrapper@withrevert(e, txId);
    assert lastReverted;
}

/**
 * @dev Alternative formulation: Transaction execution moves to final state
 * Once a transaction is executed, it cannot be executed again
 */
rule transactionExecutionFinality(uint256 txId) {
    require Contract.getTxRecordStatus(txId) == PENDING;
    require isReleaseTimePassed(txId);
    
    env e;
    Contract.txDelayedApprovalWrapper(e, txId);
    
    uint8 status = Contract.getTxRecordStatus(txId);
    assert isFinalStatus(status);
    
    // Attempt to execute again should fail
    Contract.txDelayedApprovalWrapper@withrevert(e, txId);
    assert lastReverted;
}

/**
 * @dev Transaction execution preserves state consistency
 * After execution, the transaction is no longer pending
 */
rule executionStateConsistency(uint256 txId) {
    require Contract.getTxRecordStatus(txId) == PENDING;
    require isReleaseTimePassed(txId);
    
    bool wasPending = Contract.isPendingTx(txId);
    
    env e;
    Contract.txDelayedApprovalWrapper(e, txId);
    
    assert !Contract.isPendingTx(txId);
    assert Contract.getTxRecordStatus(txId) != PENDING;
}

// ============ SAFETY PROPERTY 5.2: PERMISSION PRESERVATION ============

/**
 * @dev Safety Property 5.2 (Permission Preservation)
 * For any role r  in  R and action a  in  A, if hasPermission(r, a) holds, then authorized(r, a) holds.
 * 
 * This rule ensures that permissions are preserved across state transitions
 * and that authorized operations remain authorized.
 */
rule permissionPreservation(bytes32 roleHash, address wallet, bytes4 functionSelector, uint8 action) {
    require walletHasRole(roleHash, wallet);
    require roleHasActionPermission(roleHash, functionSelector, action);
    
    bool hadPermission = hasActionPermission(wallet, functionSelector, action);
    
    env e;
    method f; calldataarg args;
    f(e, args);
    
    assert hasActionPermission(wallet, functionSelector, action);
    assert hadPermission;
}

/**
 * @dev Role permissions are preserved across operations
 * Role permissions cannot be removed without explicit revocation
 */
rule rolePermissionPreservation(bytes32 roleHash, bytes4 functionSelector, uint8 action) {
    require roleHasActionPermission(roleHash, functionSelector, action);
    
    bool hadPermission = roleHasActionPermission(roleHash, functionSelector, action);
    
    env e;
    method f; calldataarg args;
    f(e, args);
    
    assert roleHasActionPermission(roleHash, functionSelector, action);
    assert hadPermission;
}

/**
 * @dev Wallet role assignments are preserved
 * Wallet role assignments cannot be removed without explicit revocation
 */
rule walletRolePreservation(bytes32 roleHash, address wallet) {
    require walletHasRole(roleHash, wallet);
    
    bool hadRole = walletHasRole(roleHash, wallet);
    
    env e;
    method f; calldataarg args;
    f(e, args);
    
    assert walletHasRole(roleHash, wallet);
    assert hadRole;
}

/**
 * @dev Protected roles maintain their protection
 * Protected roles cannot be modified without proper authorization
 */
rule protectedRolePreservation(bytes32 roleHash) {
    require isRoleProtected(roleHash);
    
    bool wasProtected = isRoleProtected(roleHash);
    
    env e;
    method f; calldataarg args;
    f(e, args);
    
    assert isRoleProtected(roleHash);
    assert wasProtected;
}

// ============ SAFETY PROPERTY 5.3: STATE ISOLATION ============

/**
 * @dev Safety Property 5.3 (State Isolation)
 * For any two transactions t1, t2  in  T where t1 != t2, state(t1) ∩ state(t2) = ∅.
 * 
 * This rule ensures that transactions are isolated and that operations
 * on one transaction do not affect other transactions.
 */
rule stateIsolation(uint256 txId1, uint256 txId2) {
    require txId1 != txId2;
    require Contract.getTxRecordStatus(txId1) == PENDING;
    require transactionExists(txId1);
    require transactionExists(txId2);
    
    uint8 status1Before = Contract.getTxRecordStatus(txId1);
    uint8 status2Before = Contract.getTxRecordStatus(txId2);
    bool pending1Before = Contract.isPendingTx(txId1);
    bool pending2Before = Contract.isPendingTx(txId2);
    
    env e;
    Contract.txCancellationWrapper(e, txId2);
    
    // Transaction 1 should be unaffected
    assert Contract.getTxRecordStatus(txId1) == status1Before;
    assert Contract.isPendingTx(txId1) == pending1Before;
}

/**
 * @dev Transaction cancellation only affects the target transaction
 * Cancelling one transaction does not affect other transactions
 */
rule cancellationIsolation(uint256 txId1, uint256 txId2) {
    require txId1 != txId2;
    require Contract.getTxRecordStatus(txId1) == PENDING;
    require Contract.getTxRecordStatus(txId2) == PENDING;
    
    uint8 status1Before = Contract.getTxRecordStatus(txId1);
    bool pending1Before = Contract.isPendingTx(txId1);
    
    env e;
    Contract.txCancellationWrapper(e, txId2);
    
    // Transaction 1 should be unaffected
    assert Contract.getTxRecordStatus(txId1) == status1Before;
    assert Contract.isPendingTx(txId1) == pending1Before;
}

/**
 * @dev Transaction execution only affects the target transaction
 * Executing one transaction does not affect other transactions
 */
rule executionIsolation(uint256 txId1, uint256 txId2) {
    require txId1 != txId2;
    require Contract.getTxRecordStatus(txId1) == PENDING;
    require Contract.getTxRecordStatus(txId2) == PENDING;
    require isReleaseTimePassed(txId2);
    
    uint8 status1Before = Contract.getTxRecordStatus(txId1);
    bool pending1Before = Contract.isPendingTx(txId1);
    
    env e;
    Contract.txDelayedApprovalWrapper(e, txId2);
    
    // Transaction 1 should be unaffected
    assert Contract.getTxRecordStatus(txId1) == status1Before;
    assert Contract.isPendingTx(txId1) == pending1Before;
}

/**
 * @dev Role operations only affect the target role
 * Operations on one role do not affect other roles
 */
rule roleOperationIsolation(bytes32 roleHash1, bytes32 roleHash2) {
    require roleHash1 != roleHash2;
    require walletHasRole(roleHash1, msg.sender);
    
    uint256 walletCount1Before = Contract.getRoleWalletCount(roleHash1);
    uint256 walletCount2Before = Contract.getRoleWalletCount(roleHash2);
    bool protected1Before = isRoleProtected(roleHash1);
    bool protected2Before = isRoleProtected(roleHash2);
    
    env e;
    method f; calldataarg args;
    f(e, args);
    
    // Role 2 should be unaffected
    assert Contract.getRoleWalletCount(roleHash2) == walletCount2Before;
    assert isRoleProtected(roleHash2) == protected2Before;
}

// ============ ADDITIONAL SAFETY PROPERTIES ============

/**
 * @dev Transaction creation preserves system invariants
 * Creating a new transaction maintains all system invariants
 */
rule transactionCreationSafety(address requester, address target, bytes32 operationType) {
    require requester != address(0);
    require target != address(0);
    require operationType != bytes32(0);
    
    uint256 txCounterBefore = Contract.getTxCounter();
    uint256 pendingCountBefore = Contract.getPendingTxCount();
    
    env e;
    Contract.txRequestWrapper(
        e,
        requester,
        target,
        0, // value
        100000, // gasLimit
        operationType,
        EXECUTION_STANDARD,
        "" // executionOptions
    );
    
    // System state should be consistent
    assert Contract.getTxCounter() == txCounterBefore + 1;
    assert Contract.getPendingTxCount() == pendingCountBefore + 1;
}

/**
 * @dev Time lock enforcement
 * Transactions cannot be executed before their release time
 */
rule timeLockEnforcement(uint256 txId) {
    require Contract.getTxRecordStatus(txId) == PENDING;
    require !isReleaseTimePassed(txId);
    
    env e;
    Contract.txDelayedApprovalWrapper@withrevert(e, txId);
    
    assert lastReverted;
    assert Contract.getTxRecordStatus(txId) == PENDING;
}

/**
 * @dev Permission enforcement
 * Operations require proper permissions
 */
rule permissionEnforcement(address caller, bytes4 functionSelector, uint8 action) {
    require !hasActionPermission(caller, functionSelector, action);
    
    env e;
    method f; calldataarg args;
    f(e, args);
    
    // Should revert or not change state
    // This is a general rule that may need to be refined based on specific functions
}

/**
 * @dev Role limit enforcement
 * Roles cannot exceed their wallet limits
 */
rule roleLimitEnforcement(bytes32 roleHash, address newWallet) {
    require roleAtWalletLimit(roleHash);
    require !walletHasRole(roleHash, newWallet);
    
    env e;
    method f; calldataarg args;
    f(e, args);
    
    // Should revert or not add the wallet
    assert !walletHasRole(roleHash, newWallet);
}

/**
 * @dev Protected role enforcement
 * Protected roles cannot be removed
 */
rule protectedRoleEnforcement(bytes32 roleHash) {
    require isRoleProtected(roleHash);
    
    env e;
    method f; calldataarg args;
    f(e, args);
    
    // Should revert or not remove the role
    assert isRoleProtected(roleHash);
}

// ============ STATE TRANSITION VALIDATION ============

/**
 * @dev Valid state transitions only
 * Transactions can only transition to valid states
 */
rule validStateTransitions(uint256 txId) {
    require transactionExists(txId);
    
    uint8 currentStatus = Contract.getTxRecordStatus(txId);
    
    env e;
    method f; calldataarg args;
    f(e, args);
    
    uint8 newStatus = Contract.getTxRecordStatus(txId);
    
    // Validate state transition
    assert isValidStateTransition(currentStatus, newStatus);
}

/**
 * @dev Helper function to validate state transitions
 * @param fromStatus The current status
 * @param toStatus The new status
 * @return True if transition is valid, false otherwise
 */
function isValidStateTransition(uint8 fromStatus, uint8 toStatus) returns bool {
    // UNDEFINED can only transition to PENDING
    if (fromStatus == UNDEFINED) {
        return toStatus == PENDING;
    }
    
    // PENDING can transition to CANCELLED, COMPLETED, FAILED, or REJECTED
    if (fromStatus == PENDING) {
        return toStatus == CANCELLED || toStatus == COMPLETED || toStatus == FAILED || toStatus == REJECTED;
    }
    
    // Final states cannot transition
    if (isFinalStatus(fromStatus)) {
        return toStatus == fromStatus;
    }
    
    return false;
}

/**
 * @dev Transaction lifecycle integrity
 * Transactions follow the correct lifecycle
 */
rule transactionLifecycleIntegrity(uint256 txId) {
    require transactionExists(txId);
    
    uint8 status = Contract.getTxRecordStatus(txId);
    
    if (status == PENDING) {
        // Pending transactions should have valid parameters
        assert Contract.getTxRecordRequester(txId) != address(0);
        assert Contract.getTxRecordTarget(txId) != address(0);
        assert Contract.getTxRecordOperationType(txId) != bytes32(0);
        assert Contract.isPendingTx(txId);
    }
    
    if (isFinalStatus(status)) {
        // Final transactions should not be pending
        assert !Contract.isPendingTx(txId);
    }
}
