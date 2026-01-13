// SPDX-License-Identifier: MPL-2.0
pragma solidity ^0.8.25;

/**
 * @title SharedValidation
 * @dev Optimized shared library containing common validation functions using enhanced custom errors
 * 
 * This library is designed to reduce contract size by centralizing common validation logic
 * and using gas-efficient custom errors instead of string constants. This approach provides
 * significant gas savings and contract size reduction while maintaining clear error context.
 * 
 * Features:
 * - Enhanced custom errors with contextual parameters
 * - Address validation functions
 * - Time and deadline validation
 * - Signature validation utilities
 * - Permission and authorization checks
 * - Operation type validation
 * - Gas and transaction validation
 * 
 * This library follows the security rules defined in .cursorrules and implements
 * the Checks-Effects-Interactions pattern where applicable.
 * 
 * Gas Optimization Benefits:
 * - ~50% gas reduction compared to string-based errors
 * - Significant contract size reduction
 * - Enhanced error context with parameters
 * - Modern Solidity best practices (0.8.4+)
 */
library SharedValidation {
    
    // ============ ENHANCED CUSTOM ERRORS ============
    
    // Address validation errors with context
    error InvalidAddress(address provided);
    error NotNewAddress(address newAddress, address currentAddress);
    
    // Time and deadline errors with context
    error InvalidTimeLockPeriod(uint256 provided);
    error TimeLockPeriodZero(uint256 provided);
    error DeadlineInPast(uint256 deadline, uint256 currentTime);
    error MetaTxExpired(uint256 deadline, uint256 currentTime);
    error BeforeReleaseTime(uint256 releaseTime, uint256 currentTime);
    error NewTimelockSame(uint256 newPeriod, uint256 currentPeriod);
    
    // Permission and authorization errors with context
    error NoPermission(address caller);
    error RestrictedOwner(address caller, address owner);
    error RestrictedOwnerRecovery(address caller, address owner, address recovery);
    error RestrictedRecovery(address caller, address recovery);
    error RestrictedBroadcaster(address caller, address broadcaster);
    error SignerNotAuthorized(address signer);
    error OnlyCallableByContract(address caller, address contractAddress);
    
    // Transaction and operation errors with context
    error OperationNotSupported();
    error OperationTypeExists();
    error InvalidOperationType(bytes32 actualType, bytes32 expectedType);
    error ZeroOperationTypeNotAllowed();
    error TransactionNotFound(uint256 txId);
    error TransactionNotPending(uint8 currentStatus);
    error TransactionNotExecuting(uint8 currentStatus);
    error RequestAlreadyPending(uint256 txId);
    error AlreadyInitialized();
    error TransactionIdMismatch(uint256 expectedTxId, uint256 providedTxId);
    
    // Signature and meta-transaction errors with context
    error InvalidSignatureLength(uint256 providedLength, uint256 expectedLength);
    error InvalidSignature(bytes signature);
    error InvalidNonce(uint256 providedNonce, uint256 expectedNonce);
    error ChainIdMismatch(uint256 providedChainId, uint256 expectedChainId);
    error HandlerContractMismatch(address handlerContract, address target);
    error InvalidHandlerSelector(bytes4 selector);
    error InvalidSValue(bytes32 s);
    error InvalidVValue(uint8 v);
    error ECDSAInvalidSignature(address recoveredSigner);
    error GasPriceExceedsMax(uint256 currentGasPrice, uint256 maxGasPrice);
    
    // Role and function errors with context
    error RoleDoesNotExist();
    error RoleAlreadyExists();
    error FunctionError(bytes4 functionSelector);
    error CannotRemoveProtectedFunctionSchema(bytes4 functionSelector);
    error InternalFunctionNotAccessible(bytes4 functionSelector);
    error WalletError(address wallet);
    error RoleWalletLimitReached(uint256 currentCount, uint256 maxWallets);
    error RoleEmpty();
    error MaxWalletsZero(uint256 provided);
    error CannotModifyProtectedRoles();
    error CannotRemoveProtectedRole();
    error RoleEditingDisabled();
    error FunctionPermissionExists(bytes4 functionSelector);
    error ActionNotSupported();
    error ConflictingMetaTxPermissions(bytes4 functionSelector);
    error InvalidRange(uint256 from, uint256 to);
    
    // Payment and balance errors with context
    error InsufficientBalance(uint256 currentBalance, uint256 requiredAmount);
    error PaymentFailed(address recipient, uint256 amount, bytes reason);
    
    // Array validation errors with context
    error ArrayLengthMismatch(uint256 array1Length, uint256 array2Length);
    error IndexOutOfBounds(uint256 index, uint256 arrayLength);
    
    // ============ ADDRESS VALIDATION FUNCTIONS ============
    
    /**
     * @dev Validates that an address is not the zero address
     * @param addr The address to validate
     */
    function validateNotZeroAddress(address addr) internal pure {
        if (addr == address(0)) revert InvalidAddress(addr);
    }
    
    
    /**
     * @dev Validates that a new address is different from the current address
     * @param newAddress The proposed new address
     * @param currentAddress The current address to compare against
     */
    function validateNewAddress(address newAddress, address currentAddress) internal pure {
        if (newAddress == currentAddress) revert NotNewAddress(newAddress, currentAddress);
    }
    
    /**
     * @dev Validates that an address is not the zero address and is different from current
     * @param newAddress The proposed new address
     * @param currentAddress The current address to compare against
     */
    function validateAddressUpdate(
        address newAddress, 
        address currentAddress
    ) internal pure {
        validateNotZeroAddress(newAddress);
        validateNewAddress(newAddress, currentAddress);
    }
    
    /**
     * @dev Validates that a target address is not zero
     * @param target The target address to validate
     */
    function validateTargetAddress(address target) internal pure {
        if (target == address(0)) revert InvalidAddress(target);
    }
    
    /**
     * @dev Validates that a requester address is not zero
     * @param requester The requester address to validate
     */
    function validateRequesterAddress(address requester) internal pure {
        if (requester == address(0)) revert InvalidAddress(requester);
    }
    
    /**
     * @dev Validates that a handler contract address is not zero
     * @param handler The handler contract address to validate
     */
    function validateHandlerContract(address handler) internal pure {
        if (handler == address(0)) revert InvalidAddress(handler);
    }
    
    /**
     * @dev Validates that a signer address is not zero
     * @param signer The signer address to validate
     */
    function validateSignerAddress(address signer) internal pure {
        if (signer == address(0)) revert InvalidAddress(signer);
    }
    
    // ============ TIME AND DEADLINE VALIDATION FUNCTIONS ============
    
    /**
     * @dev Validates that a time lock period is greater than zero
     * @param timeLockPeriod The time lock period to validate
     */
    function validateTimeLockPeriod(uint256 timeLockPeriod) internal pure {
        if (timeLockPeriod == 0) revert TimeLockPeriodZero(timeLockPeriod);
    }
    
    /**
     * @dev Validates that a deadline is in the future
     * @param deadline The deadline timestamp to validate
     */
    function validateDeadline(uint256 deadline) internal view {
        if (deadline <= block.timestamp) revert DeadlineInPast(deadline, block.timestamp);
    }
    
    /**
     * @dev Validates that a new time lock period is different from the current one
     * @param newPeriod The new time lock period
     * @param currentPeriod The current time lock period
     */
    function validateTimeLockUpdate(uint256 newPeriod, uint256 currentPeriod) internal pure {
        validateTimeLockPeriod(newPeriod);
        if (newPeriod == currentPeriod) revert NewTimelockSame(newPeriod, currentPeriod);
    }
    
    /**
     * @dev Validates that the current time is after the release time
     * @param releaseTime The release time to check against
     */
    function validateReleaseTime(uint256 releaseTime) internal view {
        if (block.timestamp < releaseTime) revert BeforeReleaseTime(releaseTime, block.timestamp);
    }
    
    /**
     * @dev Validates that a meta-transaction has not expired
     * @param deadline The deadline of the meta-transaction
     */
    function validateMetaTxDeadline(uint256 deadline) internal view {
        if (block.timestamp > deadline) revert MetaTxExpired(deadline, block.timestamp);
    }
    
    // ============ SIGNATURE VALIDATION FUNCTIONS ============
    
    /**
     * @dev Validates that a signature has the correct length (65 bytes)
     * @param signature The signature to validate
     */
    function validateSignatureLength(bytes memory signature) internal pure {
        if (signature.length != 65) revert InvalidSignatureLength(signature.length, 65);
    }
    
    /**
     * @dev Validates ECDSA signature parameters
     * @param s The s parameter of the signature
     * @param v The v parameter of the signature
     */
    function validateSignatureParams(bytes32 s, uint8 v) internal pure {
        if (uint256(s) > 0x7FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF5D576E7357A4501DDFE92F46681B20A0) {
            revert InvalidSValue(s);
        }
        if (v != 27 && v != 28) revert InvalidVValue(v);
    }
    
    /**
     * @dev Validates that a recovered signer is not the zero address
     * @param signer The recovered signer address
     */
    function validateRecoveredSigner(address signer) internal pure {
        if (signer == address(0)) revert ECDSAInvalidSignature(signer);
    }
    
    /**
     * @dev Validates that a signature is not empty
     * @param signature The signature to validate
     */
    function validateSignature(bytes memory signature) internal pure {
        if (signature.length == 0) revert InvalidSignature(signature);
    }
    
    // ============ PERMISSION AND AUTHORIZATION FUNCTIONS ============
    
    /**
     * @dev Validates that the caller is the owner
     * @param owner The current owner address
     */
    function validateOwner(address owner) internal view {
        if (owner != msg.sender) revert RestrictedOwner(msg.sender, owner);
    }
    
    /**
     * @dev Validates that the caller is either the owner or recovery
     * @param owner The current owner address
     * @param recovery The current recovery address
     */
    function validateOwnerOrRecovery(address owner, address recovery) internal view {
        if (msg.sender != owner && msg.sender != recovery) {
            revert RestrictedOwnerRecovery(msg.sender, owner, recovery);
        }
    }
    
    /**
     * @dev Validates that the caller is the recovery address
     * @param recovery The current recovery address
     */
    function validateRecovery(address recovery) internal view {
        if (msg.sender != recovery) revert RestrictedRecovery(msg.sender, recovery);
    }
    
    /**
     * @dev Validates that the caller is the broadcaster
     * @param broadcaster The current broadcaster address
     */
    function validateBroadcaster(address broadcaster) internal view {
        if (msg.sender != broadcaster) revert RestrictedBroadcaster(msg.sender, broadcaster);
    }
    
    /**
     * @dev Validates that the function is being called internally by the contract itself
     * @param contractAddress The address of the contract
     */
    function validateInternalCall(address contractAddress) internal view {
        if (msg.sender != contractAddress) revert OnlyCallableByContract(msg.sender, contractAddress);
    }
    
    /**
     * @dev Validates that the caller has permission
     * @param caller The caller address
     */
    function validatePermission(address caller) internal pure {
        revert NoPermission(caller);
    }
    
    /**
     * @dev Validates that the caller has permission to execute a specific function
     * @param caller The caller address
     */
    function validatePermissionExecute(address caller) internal pure {
        revert NoPermission(caller);
    }
    
    /**
     * @dev Validates that a signer is authorized
     * @param signer The signer address to validate
     */
    function validateSignerAuthorized(address signer) internal pure {
        revert SignerNotAuthorized(signer);
    }
    
    // ============ TRANSACTION AND OPERATION VALIDATION FUNCTIONS ============
    
    /**
     * @dev Validates that an operation type is supported
     */
    function validateOperationSupported() internal pure {
        revert OperationNotSupported();
    }
    
    /**
     * @dev Validates that an operation type doesn't already exist
     */
    function validateOperationTypeNew() internal pure {
        revert OperationTypeExists();
    }
    
    /**
     * @dev Validates that an operation type is not zero
     * @param operationType The operation type to validate
     */
    function validateOperationTypeNotZero(bytes32 operationType) internal pure {
        if (operationType == bytes32(0)) revert ZeroOperationTypeNotAllowed();
    }
    
    /**
     * @dev Validates that an operation type matches the expected type
     * @param actualType The actual operation type
     * @param expectedType The expected operation type
     */
    function validateOperationType(bytes32 actualType, bytes32 expectedType) internal pure {
        if (actualType != expectedType) revert InvalidOperationType(actualType, expectedType);
    }
    
    
    /**
     * @dev Validates that a request is not already pending
     * @param txId The transaction ID to validate
     */
    function validateNoOpenRequest(uint256 txId) internal pure {
        if (txId > 0) revert RequestAlreadyPending(txId);
    }
    
    /**
     * @dev Validates that a transaction exists (has non-zero ID)
     * @param txId The transaction ID to validate
     */
    function validateTransactionExists(uint256 txId) internal pure {
        if (txId == 0) revert TransactionNotFound(txId);
    }
    
    /**
     * @dev Validates that a transaction ID matches the expected value
     * @param txId The transaction ID to validate
     * @param expectedTxId The expected transaction ID
     */
    function validateTransactionId(uint256 txId, uint256 expectedTxId) internal pure {
        if (txId != expectedTxId) revert TransactionIdMismatch(expectedTxId, txId);
    }
    
    /**
     * @dev Validates that a contract is not already initialized
     */
    function validateNotInitialized() internal pure {
        revert AlreadyInitialized();
    }
    
    // ============ META-TRANSACTION VALIDATION FUNCTIONS ============
    
    /**
     * @dev Validates chain ID matches the current chain
     * @param chainId The chain ID to validate
     */
    function validateChainId(uint256 chainId) internal view {
        if (chainId != block.chainid) revert ChainIdMismatch(chainId, block.chainid);
    }
    
    /**
     * @dev Validates that handler contract matches target
     * @param handlerContract The handler contract address
     * @param target The target contract address
     */
    function validateHandlerContractMatch(address handlerContract, address target) internal pure {
        if (handlerContract != target) revert HandlerContractMismatch(handlerContract, target);
    }
    
    /**
     * @dev Validates that a handler selector is not zero
     * @param selector The handler selector to validate
     */
    function validateHandlerSelector(bytes4 selector) internal pure {
        if (selector == bytes4(0)) revert InvalidHandlerSelector(selector);
    }

    /**
     * @dev Validates that a handler selector matches the expected selector
     * @param actualSelector The actual handler selector from the meta transaction
     * @param expectedSelector The expected handler selector to validate against
     */
    function validateHandlerSelectorMatch(bytes4 actualSelector, bytes4 expectedSelector) internal pure {
        if (actualSelector != expectedSelector) revert InvalidHandlerSelector(actualSelector);
    }
    
    /**
     * @dev Validates that a nonce matches the expected value
     * @param nonce The nonce to validate
     * @param expectedNonce The expected nonce value
     */
    function validateNonce(uint256 nonce, uint256 expectedNonce) internal pure {
        if (nonce != expectedNonce) revert InvalidNonce(nonce, expectedNonce);
    }
    
    /**
     * @dev Validates that the current transaction's gas price is within limits
     * @param maxGasPrice The maximum allowed gas price (in wei)
     */
    function validateGasPrice(uint256 maxGasPrice) internal view {
        if (maxGasPrice == 0) return; // No limit set
        
        uint256 currentGasPrice = tx.gasprice;
        if (currentGasPrice > maxGasPrice) {
            revert GasPriceExceedsMax(currentGasPrice, maxGasPrice);
        }
    }
    
    // ============ ROLE AND FUNCTION VALIDATION FUNCTIONS ============
    
    /**
     * @dev Validates that a role exists
     */
    function validateRoleExists() internal pure {
        revert RoleDoesNotExist();
    }
    
    /**
     * @dev Validates that a role doesn't already exist
     */
    function validateRoleNew() internal pure {
        revert RoleAlreadyExists();
    }
    
    /**
     * @dev Validates that a function doesn't already exist
     * @param functionSelector The function selector to check
     */
    function validateFunctionNew(bytes4 functionSelector) internal pure {
        revert FunctionError(functionSelector);
    }
    
    /**
     * @dev Validates that a function exists (has non-zero selector)
     * @param functionSelector The function selector to check
     */
    function validateFunctionExists(bytes4 functionSelector) internal pure {
        if (functionSelector == bytes4(0)) revert FunctionError(functionSelector);
    }
    
    /**
     * @dev Validates that a function schema exists in a mapping
     * @param actualSelector The actual function selector from the mapping
     * @param expectedSelector The expected function selector to validate against
     */
    function validateFunctionSchemaExists(bytes4 actualSelector, bytes4 expectedSelector) internal pure {
        if (actualSelector == bytes4(0)) revert FunctionError(expectedSelector);
    }
    
    /**
     * @dev Validates that a wallet is not already in a role
     * @param wallet The wallet address to validate
     */
    function validateWalletNotInRole(address wallet) internal pure {
        revert WalletError(wallet);
    }
    
    /**
     * @dev Validates that a role hasn't reached its wallet limit
     * @param currentCount The current number of wallets in the role
     * @param maxWallets The maximum number of wallets allowed
     */
    function validateWalletLimit(uint256 currentCount, uint256 maxWallets) internal pure {
        if (currentCount >= maxWallets) revert RoleWalletLimitReached(currentCount, maxWallets);
    }
    
    /**
     * @dev Validates that a function permission doesn't already exist
     * @param functionSelector The function selector
     */
    function validatePermissionNew(bytes4 functionSelector) internal pure {
        revert FunctionPermissionExists(functionSelector);
    }
    
    /**
     * @dev Validates that an action is supported by a function
     */
    function validateActionSupported() internal pure {
        revert ActionNotSupported();
    }
    
    /**
     * @dev Validates that a role name is not empty
     * @param roleName The role name to validate
     */
    function validateRoleNameNotEmpty(string memory roleName) internal pure {
        if (bytes(roleName).length == 0) revert RoleEmpty();
    }
    
    /**
     * @dev Validates that a role is not protected
     */
    function validateRoleNotProtected() internal pure {
        revert CannotModifyProtectedRoles();
    }
    
    /**
     * @dev Validates that role editing is enabled
     */
    function validateRoleEditingEnabled() internal pure {
        revert RoleEditingDisabled();
    }
    
    /**
     * @dev Validates that max wallets is greater than zero
     * @param maxWallets The maximum number of wallets
     */
    function validateMaxWalletsGreaterThanZero(uint256 maxWallets) internal pure {
        if (maxWallets == 0) revert MaxWalletsZero(maxWallets);
    }
    
    /**
     * @dev Validates that a wallet can be removed from a role
     * @param wallet The wallet address
     */
    function validateCanRemoveWallet(address wallet) internal pure {
        revert WalletError(wallet);
    }
    
    /**
     * @dev Validates that a wallet exists in a role
     * @param wallet The wallet address
     */
    function validateWalletInRole(address wallet) internal pure {
        revert WalletError(wallet);
    }
    
    /**
     * @dev Validates that a protected role cannot be removed
     */
    function validateCanRemoveProtectedRole() internal pure {
        revert CannotRemoveProtectedRole();
    }
    
    /**
     * @dev Validates that a protected function schema cannot be removed
     * @param functionSelector The function selector of the protected schema
     */
    function validateCanRemoveProtectedFunctionSchema(bytes4 functionSelector) internal pure {
        revert CannotRemoveProtectedFunctionSchema(functionSelector);
    }
    
    // ============ UTILITY FUNCTIONS ============
    
    /**
     * @dev Validates that a value is greater than zero
     * @param value The value to validate
     */
    function validateGreaterThanZero(uint256 value) internal pure {
        if (value == 0) revert TimeLockPeriodZero(value);
    }
    
    /**
     * @dev Validates that two values are equal
     * @param actual The actual value
     * @param expected The expected value
     */
    function validateEqual(uint256 actual, uint256 expected) internal pure {
        if (actual != expected) revert TransactionIdMismatch(expected, actual);
    }
    
    /**
     * @dev Validates that two bytes4 values are equal
     * @param actual The actual value
     * @param expected The expected value
     */
    function validateEqual(bytes4 actual, bytes4 expected) internal pure {
        if (actual != expected) revert InvalidHandlerSelector(actual);
    }
    
    /**
     * @dev Validates that two bytes32 values are equal
     * @param actual The actual value
     * @param expected The expected value
     */
    function validateEqual(bytes32 actual, bytes32 expected) internal pure {
        if (actual != expected) revert InvalidOperationType(actual, expected);
    }
    
    /**
     * @dev Validates that two address values are equal
     * @param actual The actual value
     * @param expected The expected value
     */
    function validateEqual(address actual, address expected) internal pure {
        if (actual != expected) revert HandlerContractMismatch(actual, expected);
    }
    
    /**
     * @dev Validates that a boolean condition is true
     * @param condition The condition to validate
     */
    function validateTrue(bool condition) internal pure {
        if (!condition) revert InvalidOperationType(bytes32(0), bytes32(0));
    }
    
    /**
     * @dev Validates that a boolean condition is false
     * @param condition The condition to validate
     */
    function validateFalse(bool condition) internal pure {
        if (condition) revert InvalidOperationType(bytes32(0), bytes32(0));
    }
    
    /**
     * @dev Validates that the first value is less than the second value
     * @param from The first value (should be less than 'to')
     * @param to The second value (should be greater than 'from')
     */
    function validateLessThan(uint256 from, uint256 to) internal pure {
        if (from >= to) revert InvalidRange(from, to);
    }
    
    /**
     * @dev Validates that a value is within a valid range
     * @param value The value to validate
     * @param min The minimum allowed value
     * @param max The maximum allowed value
     */
    function validateRange(uint256 value, uint256 min, uint256 max) internal pure {
        if (value < min || value > max) revert InvalidRange(value, max);
    }
    
    /**
     * @dev Validates that two arrays have the same length
     * @param array1Length The length of the first array
     * @param array2Length The length of the second array
     */
    function validateArrayLengthMatch(uint256 array1Length, uint256 array2Length) internal pure {
        if (array1Length != array2Length) revert ArrayLengthMismatch(array1Length, array2Length);
    }
     
    /**
     * @dev Validates that an index is within bounds of an array
     * @param index The index to validate
     * @param arrayLength The length of the array
     */
    function validateIndexInBounds(uint256 index, uint256 arrayLength) internal pure {
        if (index >= arrayLength) revert IndexOutOfBounds(index, arrayLength);
    }
    
    // ============ INTERNAL VALIDATION WRAPPER FUNCTIONS ============
    
    /**
     * @dev Internal function to validate operation type
     * @param operationType The operation type to validate
     * @param expectedType The expected operation type
     */
    function validateOperationTypeInternal(bytes32 operationType, bytes32 expectedType) internal pure {
        validateOperationType(operationType, expectedType);
    }

    /**
     * @dev Internal function to validate handler selector match
     * @param handlerSelector The handler selector to validate
     * @param expectedSelector The expected handler selector
     */
    function validateHandlerSelectorMatchInternal(bytes4 handlerSelector, bytes4 expectedSelector) internal pure {
        validateHandlerSelectorMatch(handlerSelector, expectedSelector);
    }

    /**
     * @dev Internal function to validate internal call
     * @param expectedCaller The expected caller address
     */
    function validateInternalCallInternal(address expectedCaller) internal view {
        validateInternalCall(expectedCaller);
    }
}
