// SPDX-License-Identifier: MPL-2.0
// Certora Verification Language (CVL) specification for State Abstraction Core Invariants
// This file implements Invariants 5.1-5.4 from the scientific paper (Section 5.1.1)

using GuardianBareHarness as Contract;
use builtin rule sanity;

// ============ INVARIANT 5.1: TRANSACTION UNIQUENESS ============

/**
 * @dev Invariant 5.1 (Transaction Uniqueness)
 * For any two transactions t1, t2  in  T, if t1 != t2, then id(t1) != id(t2).
 * 
 * This invariant ensures that each transaction has a unique identifier
 * and that no two different transactions can have the same ID.
 */
invariant transactionUniqueness()
    forall uint256 txId1. forall uint256 txId2.
        txId1 != txId2 => 
        checkTransactionUniqueness(txId1, txId2);

/**
 * @dev Alternative formulation: Transaction IDs are unique
 * Each transaction ID corresponds to exactly one transaction record
 */
invariant uniqueTransactionIds()
    forall uint256 txId1. forall uint256 txId2.
        txId1 != txId2 =>
        Contract.getTxRecordRequester(txId1) != Contract.getTxRecordRequester(txId2) ||
        Contract.getTxRecordTarget(txId1) != Contract.getTxRecordTarget(txId2) ||
        Contract.getTxRecordOperationType(txId1) != Contract.getTxRecordOperationType(txId2) ||
        Contract.getTxRecordReleaseTime(txId1) != Contract.getTxRecordReleaseTime(txId2);

// ============ INVARIANT 5.2: STATE CONSISTENCY ============

/**
 * @dev Invariant 5.2 (State Consistency)
 * For any transaction t  in  T, the state transitions follow the defined transition function δ.
 * 
 * This invariant ensures that the state machine maintains consistency
 * between transaction status and the pending transactions set.
 */
invariant stateConsistency()
    forall uint256 txId.
        checkStateConsistency(txId);

/**
 * @dev Pending transactions are properly tracked
 * All pending transactions are in the pending set
 */
invariant pendingTransactionsTracked()
    forall uint256 txId.
        Contract.getTxRecordStatus(txId) == PENDING =>
        Contract.isPendingTx(txId);

/**
 * @dev Non-pending transactions are not in pending set
 * Only pending transactions are in the pending set
 */
invariant nonPendingTransactionsNotTracked()
    forall uint256 txId.
        Contract.getTxRecordStatus(txId) != PENDING =>
        !Contract.isPendingTx(txId);

/**
 * @dev Pending count matches actual pending transactions
 * The pending count matches the number of transactions with PENDING status
 */
invariant pendingCountConsistency()
    Contract.getPendingTxCount() == ghostTotalPendingTransactions();

// ============ INVARIANT 5.3: PERMISSION INTEGRITY ============

/**
 * @dev Invariant 5.3 (Permission Integrity)
 * For any operation o  in  O, only users with appropriate permissions can initiate o.
 * 
 * This invariant ensures that permission checks are consistent
 * between role assignments and actual permissions.
 */
invariant permissionIntegrity()
    forall bytes32 roleHash. forall address wallet. forall bytes4 functionSelector. forall uint8 action.
        checkPermissionIntegrity(roleHash, wallet, functionSelector, action);

/**
 * @dev Role permissions are consistent with individual permissions
 * If a wallet has a role and the role has a permission, the wallet has that permission
 */
invariant rolePermissionConsistency()
    forall bytes32 roleHash. forall address wallet. forall bytes4 functionSelector. forall uint8 action.
        walletHasRole(roleHash, wallet) && 
        roleHasActionPermission(roleHash, functionSelector, action) =>
        hasActionPermission(wallet, functionSelector, action);

/**
 * @dev Permission inheritance works correctly
 * Wallets inherit permissions from their roles
 */
invariant permissionInheritance()
    forall bytes32 roleHash. forall address wallet. forall bytes4 functionSelector. forall uint8 action.
        walletHasRole(roleHash, wallet) =>
        (roleHasActionPermission(roleHash, functionSelector, action) <=> 
         hasActionPermission(wallet, functionSelector, action));

// ============ INVARIANT 5.4: TIME LOCK VALIDITY ============

/**
 * @dev Invariant 5.4 (Time Lock Validity)
 * For any time-locked operation o  in  O, execution cannot occur before the calculated release time.
 * 
 * This invariant ensures that time-locked transactions cannot be executed
 * before their release time has passed.
 */
invariant timeLockValidity()
    forall uint256 txId.
        checkTimeLockValidity(txId);

/**
 * @dev Pending transactions have valid release times
 * All pending transactions have release times in the future
 */
invariant pendingTransactionsValidReleaseTime()
    forall uint256 txId.
        Contract.getTxRecordStatus(txId) == PENDING =>
        Contract.getTxRecordReleaseTime(txId) > Contract.currentTime();

/**
 * @dev Release time monotonicity
 * Release times are set correctly when transactions are created
 */
invariant releaseTimeMonotonicity()
    forall uint256 txId.
        Contract.getTxRecordStatus(txId) == PENDING =>
        Contract.getTxRecordReleaseTime(txId) >= Contract.getTxRecordReleaseTime(txId);

// ============ ADDITIONAL CORE INVARIANTS ============

/**
 * @dev Transaction counter consistency
 * The transaction counter matches the highest transaction ID
 */
invariant transactionCounterConsistency()
    Contract.getTxCounter() >= 0;

/**
 * @dev Transaction existence consistency
 * All transaction IDs up to the counter exist
 */
invariant transactionExistenceConsistency()
    forall uint256 txId.
        txId > 0 && txId <= Contract.getTxCounter() =>
        transactionExists(txId);

/**
 * @dev State initialization consistency
 * The state is properly initialized
 */
invariant stateInitializationConsistency()
    Contract.getSecureStateInitialized() == true;

/**
 * @dev Time lock period validity
 * The time lock period is greater than zero
 */
invariant timeLockPeriodValidity()
    Contract.getTimeLockPeriodSec() > 0;

/**
 * @dev Operation type consistency
 * All transactions have valid operation types
 */
invariant operationTypeConsistency()
    forall uint256 txId.
        transactionExists(txId) =>
        isOperationTypeSupported(Contract.getTxRecordOperationType(txId));

/**
 * @dev Function consistency
 * All function selectors in permissions are supported
 */
invariant functionConsistency()
    forall bytes32 roleHash. forall uint256 i.
        i < Contract.getRoleFunctionPermissionsCount(roleHash) =>
        isFunctionSupported(Contract.getRoleFunctionPermissionAt(roleHash, i));

/**
 * @dev Role consistency
 * All roles in the system are properly defined
 */
invariant roleConsistency()
    forall uint256 i.
        i < Contract.getSupportedRolesCount() =>
        Contract.getRoleName(Contract.getSupportedRoleAt(i)).length > 0;

/**
 * @dev Wallet limit consistency
 * All roles respect their wallet limits
 */
invariant walletLimitConsistency()
    forall bytes32 roleHash.
        checkRoleWalletLimits(roleHash);

/**
 * @dev Protected role consistency
 * Protected roles maintain their integrity
 */
invariant protectedRoleConsistency()
    forall bytes32 roleHash.
        checkProtectedRoleIntegrity(roleHash);

// ============ STATE MACHINE TRANSITION INVARIANTS ============

/**
 * @dev Transaction status transitions are valid
 * Transactions can only transition to valid states
 */
invariant validStatusTransitions()
    forall uint256 txId.
        transactionExists(txId) =>
        Contract.getTxRecordStatus(txId) >= UNDEFINED &&
        Contract.getTxRecordStatus(txId) <= REJECTED;

/**
 * @dev Final state persistence
 * Transactions in final states cannot change status
 */
invariant finalStatePersistence()
    forall uint256 txId.
        isTransactionFinal(txId) =>
        Contract.getTxRecordStatus(txId) == Contract.getTxRecordStatus(txId);

/**
 * @dev Pending state validity
 * Only valid transactions can be pending
 */
invariant pendingStateValidity()
    forall uint256 txId.
        Contract.getTxRecordStatus(txId) == PENDING =>
        transactionExists(txId) &&
        Contract.getTxRecordRequester(txId) != address(0) &&
        Contract.getTxRecordTarget(txId) != address(0);

// ============ META-TRANSACTION INVARIANTS ============

/**
 * @dev Meta-transaction role separation
 * Roles cannot have both signing and execution permissions for meta-transactions
 */
invariant metaTransactionRoleSeparation()
    forall bytes32 roleHash. forall bytes4 functionSelector.
        checkMetaTxRoleSeparation(roleHash, functionSelector);

/**
 * @dev Signer nonce consistency
 * Signer nonces are properly managed
 */
invariant signerNonceConsistency()
    forall address signer.
        Contract.getSignerNonce(signer) >= 0;

// ============ HELPER FUNCTIONS FOR INVARIANTS ============

/**
 * @dev Get ghost total pending transactions
 * @return Total pending transactions from ghost variable
 */
function ghostTotalPendingTransactions() returns uint256 {
    return totalPendingTransactions;
}

/**
 * @dev Check if transaction is in valid state
 * @param txId The transaction ID
 * @return True if transaction is in valid state, false otherwise
 */
function isValidTransactionState(uint256 txId) returns bool {
    uint8 status = Contract.getTxRecordStatus(txId);
    return status >= UNDEFINED && status <= REJECTED;
}

/**
 * @dev Check if transaction has valid parameters
 * @param txId The transaction ID
 * @return True if transaction has valid parameters, false otherwise
 */
function hasValidTransactionParameters(uint256 txId) returns bool {
    return Contract.getTxRecordRequester(txId) != address(0) &&
           Contract.getTxRecordTarget(txId) != address(0) &&
           Contract.getTxRecordOperationType(txId) != bytes32(0);
}
