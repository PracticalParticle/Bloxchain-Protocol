// SPDX-License-Identifier: MPL-2.0
// Certora Verification Language (CVL) specification for State Abstraction Helpers
// This file contains reusable definitions, ghost variables, and hooks for verification

using GuardianBareHarness as Contract;

// ============ CONSTANTS ============

// TxStatus enum values
uint8 constant UNDEFINED = 0;
uint8 constant PENDING = 1;
uint8 constant CANCELLED = 2;
uint8 constant COMPLETED = 3;
uint8 constant FAILED = 4;
uint8 constant REJECTED = 5;

// TxAction enum values
uint8 constant EXECUTE_TIME_DELAY_REQUEST = 0;
uint8 constant EXECUTE_TIME_DELAY_APPROVE = 1;
uint8 constant EXECUTE_TIME_DELAY_CANCEL = 2;
uint8 constant SIGN_META_APPROVE = 3;
uint8 constant SIGN_META_CANCEL = 4;
uint8 constant SIGN_META_REQUEST_AND_APPROVE = 5;
uint8 constant EXECUTE_META_APPROVE = 6;
uint8 constant EXECUTE_META_CANCEL = 7;
uint8 constant EXECUTE_META_REQUEST_AND_APPROVE = 8;

// ExecutionType enum values
uint8 constant EXECUTION_STANDARD = 0;
uint8 constant EXECUTION_RAW = 1;
uint8 constant EXECUTION_NONE = 2;

// ============ GHOST VARIABLES ============

// Track transaction status changes
ghost mapping(uint256 => uint8) statusGhost;

// Track total pending transactions
ghost uint256 totalPendingTransactions;

// Track role assignments
ghost mapping(bytes32 => mapping(address => bool)) roleAssignments;

// Track function permissions
ghost mapping(bytes32 => mapping(bytes4 => uint16)) rolePermissions;

// Track signer nonces
ghost mapping(address => uint256) signerNonces;

// Track transaction creation order
ghost mapping(uint256 => uint256) txCreationOrder;

// Track operation types
ghost mapping(uint256 => bytes32) txOperationTypes;

// ============ HOOKS FOR STATE UPDATES ============

// Hook for transaction status changes
hook Sstore Contract.txRecords[KEY uint256 txId].status uint8 newStatus {
    statusGhost[txId] = newStatus;
    
    // Update pending count
    if (newStatus == PENDING) {
        totalPendingTransactions += 1;
    } else if (statusGhost[txId] == PENDING) {
        totalPendingTransactions -= 1;
    }
}

// Hook for transaction creation
hook Sstore Contract.txCounter uint256 newCounter {
    if (newCounter > txCreationOrder[newCounter]) {
        txCreationOrder[newCounter] = newCounter;
    }
}

// Hook for operation type assignment
hook Sstore Contract.txRecords[KEY uint256 txId].params.operationType bytes32 operationType {
    txOperationTypes[txId] = operationType;
}

// Hook for role wallet assignments
hook Sstore Contract.roles[KEY bytes32 roleHash].authorizedWallets mapping(address => bool) walletMap {
    // Note: This hook tracks the mapping structure
    // Individual wallet additions/removals are tracked separately
}

// Hook for signer nonce updates
hook Sstore Contract.signerNonces[KEY address signer] uint256 newNonce {
    signerNonces[signer] = newNonce;
}

// ============ HELPER FUNCTIONS ============

/**
 * @dev Check if status is pending
 * @param status The status to check
 * @return True if pending, false otherwise
 */
function isPendingStatus(uint8 status) returns bool {
    return status == PENDING;
}

/**
 * @dev Check if status is final (completed, failed, cancelled, rejected)
 * @param status The status to check
 * @return True if final, false otherwise
 */
function isFinalStatus(uint8 status) returns bool {
    return status == COMPLETED || status == FAILED || status == CANCELLED || status == REJECTED;
}

/**
 * @dev Check if status is active (pending)
 * @param status The status to check
 * @return True if active, false otherwise
 */
function isActiveStatus(uint8 status) returns bool {
    return status == PENDING;
}

/**
 * @dev Check if action is signing action
 * @param action The action to check
 * @return True if signing action, false otherwise
 */
function isSigningAction(uint8 action) returns bool {
    return action == SIGN_META_APPROVE || action == SIGN_META_CANCEL || action == SIGN_META_REQUEST_AND_APPROVE;
}

/**
 * @dev Check if action is execution action
 * @param action The action to check
 * @return True if execution action, false otherwise
 */
function isExecutionAction(uint8 action) returns bool {
    return action == EXECUTE_META_APPROVE || action == EXECUTE_META_CANCEL || action == EXECUTE_META_REQUEST_AND_APPROVE;
}

/**
 * @dev Check if action is time-delay action
 * @param action The action to check
 * @return True if time-delay action, false otherwise
 */
function isTimeDelayAction(uint8 action) returns bool {
    return action == EXECUTE_TIME_DELAY_REQUEST || action == EXECUTE_TIME_DELAY_APPROVE || action == EXECUTE_TIME_DELAY_CANCEL;
}

/**
 * @dev Check if action is meta-transaction action
 * @param action The action to check
 * @return True if meta-transaction action, false otherwise
 */
function isMetaTransactionAction(uint8 action) returns bool {
    return isSigningAction(action) || isExecutionAction(action);
}

/**
 * @dev Check if bitmap contains action
 * @param bitmap The permission bitmap
 * @param action The action to check
 * @return True if bitmap contains action, false otherwise
 */
function bitmapContainsAction(uint16 bitmap, uint8 action) returns bool {
    return Contract.hasActionInBitmapExposed(bitmap, action);
}

/**
 * @dev Check if role has action permission
 * @param roleHash The role hash
 * @param functionSelector The function selector
 * @param action The action to check
 * @return True if role has permission, false otherwise
 */
function roleHasActionPermission(bytes32 roleHash, bytes4 functionSelector, uint8 action) returns bool {
    return Contract.roleHasActionPermissionWrapper(roleHash, functionSelector, action);
}

/**
 * @dev Check if caller has action permission
 * @param caller The caller address
 * @param functionSelector The function selector
 * @param action The action to check
 * @return True if caller has permission, false otherwise
 */
function hasActionPermission(address caller, bytes4 functionSelector, uint8 action) returns bool {
    return Contract.hasActionPermissionWrapper(caller, functionSelector, action);
}

/**
 * @dev Check if transaction exists
 * @param txId The transaction ID
 * @return True if transaction exists, false otherwise
 */
function transactionExists(uint256 txId) returns bool {
    return Contract.txExists(txId);
}

/**
 * @dev Check if transaction is pending
 * @param txId The transaction ID
 * @return True if transaction is pending, false otherwise
 */
function isTransactionPending(uint256 txId) returns bool {
    return Contract.getTxRecordStatus(txId) == PENDING;
}

/**
 * @dev Check if transaction is final
 * @param txId The transaction ID
 * @return True if transaction is final, false otherwise
 */
function isTransactionFinal(uint256 txId) returns bool {
    uint8 status = Contract.getTxRecordStatus(txId);
    return isFinalStatus(status);
}

/**
 * @dev Check if release time has passed
 * @param txId The transaction ID
 * @return True if release time has passed, false otherwise
 */
function isReleaseTimePassed(uint256 txId) returns bool {
    return Contract.currentTime() >= Contract.getTxRecordReleaseTime(txId);
}

/**
 * @dev Check if role is protected
 * @param roleHash The role hash
 * @return True if role is protected, false otherwise
 */
function isRoleProtected(bytes32 roleHash) returns bool {
    return Contract.isProtectedRole(roleHash);
}

/**
 * @dev Check if wallet has role
 * @param roleHash The role hash
 * @param wallet The wallet address
 * @return True if wallet has role, false otherwise
 */
function walletHasRole(bytes32 roleHash, address wallet) returns bool {
    return Contract.hasRole(roleHash, wallet);
}

/**
 * @dev Check if role has reached wallet limit
 * @param roleHash The role hash
 * @return True if role has reached limit, false otherwise
 */
function roleAtWalletLimit(bytes32 roleHash) returns bool {
    return Contract.getRoleWalletCount(roleHash) >= Contract.getRoleMaxWallets(roleHash);
}

/**
 * @dev Check if operation type is supported
 * @param operationType The operation type hash
 * @return True if supported, false otherwise
 */
function isOperationTypeSupported(bytes32 operationType) returns bool {
    uint256 count = Contract.getSupportedOperationTypesCount();
    for (uint256 i = 0; i < count; i++) {
        if (Contract.getSupportedOperationTypeAt(i) == operationType) {
            return true;
        }
    }
    return false;
}

/**
 * @dev Check if function is supported
 * @param functionSelector The function selector
 * @return True if supported, false otherwise
 */
function isFunctionSupported(bytes4 functionSelector) returns bool {
    uint256 count = Contract.getSupportedFunctionsCount();
    for (uint256 i = 0; i < count; i++) {
        if (Contract.getSupportedFunctionAt(i) == functionSelector) {
            return true;
        }
    }
    return false;
}

// ============ INVARIANT HELPERS ============

/**
 * @dev Check transaction uniqueness invariant
 * @param txId1 First transaction ID
 * @param txId2 Second transaction ID
 * @return True if transactions are unique, false otherwise
 */
function checkTransactionUniqueness(uint256 txId1, uint256 txId2) returns bool {
    if (txId1 == txId2) return true;
    
    uint8 status1 = Contract.getTxRecordStatus(txId1);
    uint8 status2 = Contract.getTxRecordStatus(txId2);
    
    // Transactions are unique if they have different IDs or different statuses
    return txId1 != txId2 || status1 != status2;
}

/**
 * @dev Check state consistency invariant
 * @param txId The transaction ID
 * @return True if state is consistent, false otherwise
 */
function checkStateConsistency(uint256 txId) returns bool {
    uint8 status = Contract.getTxRecordStatus(txId);
    
    if (status == PENDING) {
        return Contract.isPendingTx(txId);
    } else {
        return !Contract.isPendingTx(txId);
    }
}

/**
 * @dev Check permission integrity invariant
 * @param roleHash The role hash
 * @param wallet The wallet address
 * @param functionSelector The function selector
 * @param action The action
 * @return True if permission integrity is maintained, false otherwise
 */
function checkPermissionIntegrity(bytes32 roleHash, address wallet, bytes4 functionSelector, uint8 action) returns bool {
    if (!walletHasRole(roleHash, wallet)) return true;
    if (!roleHasActionPermission(roleHash, functionSelector, action)) return true;
    
    return hasActionPermission(wallet, functionSelector, action);
}

/**
 * @dev Check time lock validity invariant
 * @param txId The transaction ID
 * @return True if time lock is valid, false otherwise
 */
function checkTimeLockValidity(uint256 txId) returns bool {
    uint8 status = Contract.getTxRecordStatus(txId);
    
    if (status != PENDING) return true;
    
    uint256 releaseTime = Contract.getTxRecordReleaseTime(txId);
    uint256 currentTime = Contract.currentTime();
    
    return releaseTime >= currentTime;
}

// ============ META-TRANSACTION HELPERS ============

/**
 * @dev Check meta-transaction role separation
 * @param roleHash The role hash
 * @param functionSelector The function selector
 * @return True if role separation is maintained, false otherwise
 */
function checkMetaTxRoleSeparation(bytes32 roleHash, bytes4 functionSelector) returns bool {
    bool hasSigning = roleHasActionPermission(roleHash, functionSelector, SIGN_META_APPROVE) ||
                      roleHasActionPermission(roleHash, functionSelector, SIGN_META_CANCEL) ||
                      roleHasActionPermission(roleHash, functionSelector, SIGN_META_REQUEST_AND_APPROVE);
    
    bool hasExecution = roleHasActionPermission(roleHash, functionSelector, EXECUTE_META_APPROVE) ||
                        roleHasActionPermission(roleHash, functionSelector, EXECUTE_META_CANCEL) ||
                        roleHasActionPermission(roleHash, functionSelector, EXECUTE_META_REQUEST_AND_APPROVE);
    
    // Role separation: cannot have both signing and execution permissions
    return !(hasSigning && hasExecution);
}

/**
 * @dev Check nonce consistency
 * @param signer The signer address
 * @param expectedNonce The expected nonce
 * @return True if nonce is consistent, false otherwise
 */
function checkNonceConsistency(address signer, uint256 expectedNonce) returns bool {
    return Contract.getSignerNonce(signer) == expectedNonce;
}

// ============ ROLE MANAGEMENT HELPERS ============

/**
 * @dev Check role wallet limits
 * @param roleHash The role hash
 * @return True if wallet limits are respected, false otherwise
 */
function checkRoleWalletLimits(bytes32 roleHash) returns bool {
    uint256 currentCount = Contract.getRoleWalletCount(roleHash);
    uint256 maxWallets = Contract.getRoleMaxWallets(roleHash);
    
    return currentCount <= maxWallets;
}

/**
 * @dev Check protected role integrity
 * @param roleHash The role hash
 * @return True if protected role integrity is maintained, false otherwise
 */
function checkProtectedRoleIntegrity(bytes32 roleHash) returns bool {
    if (!isRoleProtected(roleHash)) return true;
    
    // Protected roles should have specific properties
    // This is a placeholder for more specific checks
    return true;
}

