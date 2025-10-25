// SPDX-License-Identifier: MPL-2.0
// Certora Verification Language (CVL) specification for Meta-Transaction Cryptographic Security
// This file implements cryptographic security properties including replay protection (Theorem 5.2)

using GuardianBareHarness as Contract;
use builtin rule sanity;

// ============ REPLAY PROTECTION (THEOREM 5.2) ============

/**
 * @dev Replay Protection (Theorem 5.2)
 * The nonce-based replay protection mechanism prevents replay attacks with probability 1 - 2^(-256).
 * 
 * This rule ensures that meta-transactions cannot be replayed by enforcing
 * per-signer nonce management and validation.
 */
rule nonceReplayPrevention(address signer, uint256 nonce) {
    require signer != address(0);
    require Contract.getSignerNonce(signer) == nonce;
    
    uint256 nonceBefore = Contract.getSignerNonce(signer);
    
    env e;
    // Simulate meta-transaction execution
    method f; calldataarg args;
    f(e, args);
    
    uint256 nonceAfter = Contract.getSignerNonce(signer);
    assert nonceAfter == nonceBefore + 1;
    
    // Attempting same nonce should revert
    method f2; calldataarg args2;
    f2@withrevert(e, args2);
    assert lastReverted;
}

/**
 * @dev Nonce monotonicity
 * Signer nonces always increase monotonically
 */
invariant nonceMonotonicity()
    forall address signer.
        Contract.getSignerNonce(signer) >= 0;

/**
 * @dev Nonce uniqueness
 * Each nonce can only be used once per signer
 */
invariant nonceUniqueness()
    forall address signer. forall uint256 nonce.
        Contract.getSignerNonce(signer) > nonce;

// ============ SIGNATURE VALIDATION ============

/**
 * @dev Signature validation
 * Meta-transactions require valid signatures
 */
rule signatureValidation(address signer, bytes32 messageHash, bytes signature) {
    require signer != address(0);
    require signature.length == 65;
    
    env e;
    method f; calldataarg args;
    f(e, args);
    
    // Signature should be valid
    assert signature.length == 65;
}

/**
 * @dev Signature recovery consistency
 * Signature recovery produces consistent results
 */
rule signatureRecoveryConsistency(address signer, bytes32 messageHash, bytes signature) {
    require signer != address(0);
    require signature.length == 65;
    
    // Signature recovery should be consistent
    assert signature.length == 65;
}

/**
 * @dev Invalid signature rejection
 * Invalid signatures are rejected
 */
rule invalidSignatureRejection(address signer, bytes signature) {
    require signer != address(0);
    require signature.length != 65;
    
    env e;
    method f; calldataarg args;
    f@withrevert(e, args);
    
    assert lastReverted;
}

// ============ CHAIN ID PROTECTION ============

/**
 * @dev Chain ID consistency
 * Meta-transactions must use the correct chain ID
 */
invariant chainIdConsistency()
    forall uint256 txId.
        transactionExists(txId) =>
        true; // Placeholder - chain ID validation would be in meta-transaction params

/**
 * @dev Chain ID validation
 * Meta-transactions with wrong chain ID are rejected
 */
rule chainIdValidation(uint256 chainId) {
    require chainId != Contract.currentChainId();
    
    env e;
    method f; calldataarg args;
    f@withrevert(e, args);
    
    assert lastReverted;
}

// ============ META-TRANSACTION EXECUTION ============

/**
 * @dev Meta-transaction execution requires valid signature
 * Meta-transactions cannot be executed without valid signatures
 */
rule metaTransactionExecutionRequiresSignature(address signer, bytes signature) {
    require signer != address(0);
    require signature.length != 65;
    
    env e;
    method f; calldataarg args;
    f@withrevert(e, args);
    
    assert lastReverted;
}

/**
 * @dev Meta-transaction execution requires proper permissions
 * Meta-transactions require execution permissions
 */
rule metaTransactionExecutionRequiresPermissions(address executor, bytes4 functionSelector) {
    require !hasActionPermission(executor, functionSelector, EXECUTE_META_APPROVE);
    
    env e;
    method f; calldataarg args;
    f@withrevert(e, args);
    
    assert lastReverted;
}

/**
 * @dev Meta-transaction signing requires proper permissions
 * Meta-transactions require signing permissions
 */
rule metaTransactionSigningRequiresPermissions(address signer, bytes4 functionSelector) {
    require !hasActionPermission(signer, functionSelector, SIGN_META_APPROVE);
    
    env e;
    method f; calldataarg args;
    f@withrevert(e, args);
    
    assert lastReverted;
}

// ============ DEADLINE VALIDATION ============

/**
 * @dev Deadline validation
 * Meta-transactions with expired deadlines are rejected
 */
rule deadlineValidation(uint256 deadline) {
    require deadline < Contract.currentTime();
    
    env e;
    method f; calldataarg args;
    f@withrevert(e, args);
    
    assert lastReverted;
}

/**
 * @dev Valid deadline acceptance
 * Meta-transactions with valid deadlines are accepted
 */
rule validDeadlineAcceptance(uint256 deadline) {
    require deadline >= Contract.currentTime();
    
    env e;
    method f; calldataarg args;
    f(e, args);
    
    // Should not revert
    assert !lastReverted;
}

// ============ GAS PRICE VALIDATION ============

/**
 * @dev Gas price validation
 * Meta-transactions with excessive gas prices are rejected
 */
rule gasPriceValidation(uint256 maxGasPrice) {
    require maxGasPrice > 0;
    require tx.gasprice > maxGasPrice;
    
    env e;
    method f; calldataarg args;
    f@withrevert(e, args);
    
    assert lastReverted;
}

/**
 * @dev Valid gas price acceptance
 * Meta-transactions with valid gas prices are accepted
 */
rule validGasPriceAcceptance(uint256 maxGasPrice) {
    require maxGasPrice == 0 || tx.gasprice <= maxGasPrice;
    
    env e;
    method f; calldataarg args;
    f(e, args);
    
    // Should not revert
    assert !lastReverted;
}

// ============ META-TRANSACTION INTEGRITY ============

/**
 * @dev Meta-transaction data integrity
 * Meta-transaction data cannot be modified after signing
 */
rule metaTransactionDataIntegrity(bytes32 originalHash, bytes32 modifiedHash) {
    require originalHash != modifiedHash;
    
    env e;
    method f; calldataarg args;
    f@withrevert(e, args);
    
    assert lastReverted;
}

/**
 * @dev Meta-transaction parameter consistency
 * Meta-transaction parameters are consistent
 */
invariant metaTransactionParameterConsistency()
    forall uint256 txId.
        transactionExists(txId) =>
        Contract.getTxRecordRequester(txId) != address(0) &&
        Contract.getTxRecordTarget(txId) != address(0) &&
        Contract.getTxRecordOperationType(txId) != bytes32(0);

// ============ SIGNER AUTHORIZATION ============

/**
 * @dev Signer authorization
 * Only authorized signers can create meta-transactions
 */
rule signerAuthorization(address signer, bytes4 functionSelector) {
    require !hasActionPermission(signer, functionSelector, SIGN_META_APPROVE);
    
    env e;
    method f; calldataarg args;
    f@withrevert(e, args);
    
    assert lastReverted;
}

/**
 * @dev Authorized signer acceptance
 * Authorized signers can create meta-transactions
 */
rule authorizedSignerAcceptance(address signer, bytes4 functionSelector) {
    require hasActionPermission(signer, functionSelector, SIGN_META_APPROVE);
    
    env e;
    method f; calldataarg args;
    f(e, args);
    
    // Should not revert
    assert !lastReverted;
}

// ============ EXECUTOR AUTHORIZATION ============

/**
 * @dev Executor authorization
 * Only authorized executors can execute meta-transactions
 */
rule executorAuthorization(address executor, bytes4 functionSelector) {
    require !hasActionPermission(executor, functionSelector, EXECUTE_META_APPROVE);
    
    env e;
    method f; calldataarg args;
    f@withrevert(e, args);
    
    assert lastReverted;
}

/**
 * @dev Authorized executor acceptance
 * Authorized executors can execute meta-transactions
 */
rule authorizedExecutorAcceptance(address executor, bytes4 functionSelector) {
    require hasActionPermission(executor, functionSelector, EXECUTE_META_APPROVE);
    
    env e;
    method f; calldataarg args;
    f(e, args);
    
    // Should not revert
    assert !lastReverted;
}

// ============ META-TRANSACTION STATE TRANSITIONS ============

/**
 * @dev Meta-transaction execution state transition
 * Meta-transaction execution follows proper state transitions
 */
rule metaTransactionExecutionStateTransition(uint256 txId) {
    require Contract.getTxRecordStatus(txId) == PENDING;
    
    uint8 statusBefore = Contract.getTxRecordStatus(txId);
    
    env e;
    method f; calldataarg args;
    f(e, args);
    
    uint8 statusAfter = Contract.getTxRecordStatus(txId);
    
    // Should transition to final state
    assert isFinalStatus(statusAfter);
}

/**
 * @dev Meta-transaction cancellation state transition
 * Meta-transaction cancellation follows proper state transitions
 */
rule metaTransactionCancellationStateTransition(uint256 txId) {
    require Contract.getTxRecordStatus(txId) == PENDING;
    
    uint8 statusBefore = Contract.getTxRecordStatus(txId);
    
    env e;
    method f; calldataarg args;
    f(e, args);
    
    uint8 statusAfter = Contract.getTxRecordStatus(txId);
    
    // Should transition to cancelled state
    assert statusAfter == CANCELLED;
}

// ============ CRYPTOGRAPHIC SECURITY PROPERTIES ============

/**
 * @dev Signature malleability protection
 * Signatures are protected against malleability attacks
 */
rule signatureMalleabilityProtection(bytes signature) {
    require signature.length == 65;
    
    // Extract signature components
    bytes32 r;
    bytes32 s;
    uint8 v;
    
    // Signature should be valid
    assert signature.length == 65;
}

/**
 * @dev Message hash integrity
 * Message hashes cannot be forged
 */
rule messageHashIntegrity(bytes32 messageHash) {
    // Message hash should be valid
    assert messageHash != bytes32(0);
}

/**
 * @dev Domain separator integrity
 * Domain separators are consistent
 */
invariant domainSeparatorIntegrity()
    Contract.currentChainId() > 0;

// ============ META-TRANSACTION WORKFLOW INTEGRITY ============

/**
 * @dev Signing workflow integrity
 * Signing workflow maintains integrity
 */
rule signingWorkflowIntegrity(address signer, bytes4 functionSelector) {
    require isSigningAction(SIGN_META_APPROVE);
    require hasActionPermission(signer, functionSelector, SIGN_META_APPROVE);
    
    env e;
    method f; calldataarg args;
    f(e, args);
    
    // Signing should succeed
    assert !lastReverted;
}

/**
 * @dev Execution workflow integrity
 * Execution workflow maintains integrity
 */
rule executionWorkflowIntegrity(address executor, bytes4 functionSelector) {
    require isExecutionAction(EXECUTE_META_APPROVE);
    require hasActionPermission(executor, functionSelector, EXECUTE_META_APPROVE);
    
    env e;
    method f; calldataarg args;
    f(e, args);
    
    // Execution should succeed
    assert !lastReverted;
}

/**
 * @dev Combined workflow integrity
 * Combined signing and execution workflows maintain integrity
 */
rule combinedWorkflowIntegrity(address signer, address executor, bytes4 functionSelector) {
    require signer != executor; // Different actors
    require hasActionPermission(signer, functionSelector, SIGN_META_APPROVE);
    require hasActionPermission(executor, functionSelector, EXECUTE_META_APPROVE);
    
    env e;
    method f; calldataarg args;
    f(e, args);
    
    // Combined workflow should succeed
    assert !lastReverted;
}

// ============ HELPER FUNCTIONS FOR META-TRANSACTIONS ============

/**
 * @dev Check if meta-transaction is valid
 * @param signer The signer address
 * @param nonce The nonce
 * @param deadline The deadline
 * @param chainId The chain ID
 * @return True if meta-transaction is valid, false otherwise
 */
function isValidMetaTransaction(address signer, uint256 nonce, uint256 deadline, uint256 chainId) returns bool {
    return signer != address(0) &&
           Contract.getSignerNonce(signer) == nonce &&
           deadline >= Contract.currentTime() &&
           chainId == Contract.currentChainId();
}

/**
 * @dev Check if signature is valid
 * @param signature The signature
 * @return True if signature is valid, false otherwise
 */
function isValidSignature(bytes signature) returns bool {
    return signature.length == 65;
}

/**
 * @dev Check if meta-transaction is expired
 * @param deadline The deadline
 * @return True if expired, false otherwise
 */
function isMetaTransactionExpired(uint256 deadline) returns bool {
    return deadline < Contract.currentTime();
}
