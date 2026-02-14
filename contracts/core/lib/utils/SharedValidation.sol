// SPDX-License-Identifier: MPL-2.0
pragma solidity 0.8.33;

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
    error NoPermissionForFunction(address caller, bytes4 functionSelector);
    error RestrictedOwner(address caller, address owner);
    error RestrictedOwnerRecovery(address caller, address owner, address recovery);
    error RestrictedRecovery(address caller, address recovery);
    error RestrictedBroadcaster(address caller, address broadcaster);
    error SignerNotAuthorized(address signer);
    error OnlyCallableByContract(address caller, address contractAddress);
    
    // Transaction and operation errors with context
    error NotSupported();
    error InvalidOperationType(bytes32 actualType, bytes32 expectedType);
    error ZeroOperationTypeNotAllowed();
    error TransactionStatusMismatch(uint8 expectedStatus, uint8 currentStatus);
    error AlreadyInitialized();
    error TransactionIdMismatch(uint256 expectedTxId, uint256 providedTxId);
    error PendingSecureRequest();
    
    // Signature and meta-transaction errors with context
    error InvalidSignatureLength(uint256 providedLength, uint256 expectedLength);
    error InvalidSignature(bytes signature);
    error InvalidNonce(uint256 providedNonce, uint256 expectedNonce);
    error ChainIdMismatch(uint256 providedChainId, uint256 expectedChainId);
    error InvalidHandlerSelector(bytes4 selector);
    error InvalidSValue(bytes32 s);
    error InvalidVValue(uint8 v);
    error ECDSAInvalidSignature(address recoveredSigner);
    error GasPriceExceedsMax(uint256 currentGasPrice, uint256 maxGasPrice);
    
    // Consolidated resource errors
    error ResourceNotFound(bytes32 resourceId);
    error ResourceAlreadyExists(bytes32 resourceId);
    error CannotModifyProtected(bytes32 resourceId);
    
    // Consolidated item errors (for addresses: wallets, policies, etc.)
    error ItemAlreadyExists(address item);
    error ItemNotFound(address item);
    error InvalidOperation(address item);
    error DefinitionNotIDefinition(address definition);
    
    // Role and function errors with context
    error RoleWalletLimitReached(uint256 currentCount, uint256 maxWallets);
    error MaxWalletsZero(uint256 provided);
    error ConflictingMetaTxPermissions(bytes4 functionSelector);
    error InternalFunctionNotAccessible(bytes4 functionSelector);
    error ContractFunctionMustBeProtected(bytes4 functionSelector);
    error TargetNotWhitelisted(address target, bytes4 functionSelector);
    error FunctionSelectorMismatch(bytes4 providedSelector, bytes4 derivedSelector);
    error HandlerForSelectorMismatch(bytes4 schemaHandlerForSelector, bytes4 permissionHandlerForSelector);
    error InvalidRange(uint256 from, uint256 to);
    error OperationFailed();
    
    // Payment and balance errors with context
    error InvalidPayment();
    error InsufficientBalance(uint256 currentBalance, uint256 requiredAmount);
    error PaymentFailed(address recipient, uint256 amount, bytes reason);
    
    // Array validation errors with context
    error ArrayLengthMismatch(uint256 array1Length, uint256 array2Length);
    error IndexOutOfBounds(uint256 index, uint256 arrayLength);
    
    // System limit errors
    error BatchSizeExceeded(uint256 currentSize, uint256 maxSize);
    error MaxRolesExceeded(uint256 currentCount, uint256 maxRoles);
    error MaxHooksExceeded(uint256 currentCount, uint256 maxHooks);
    error MaxFunctionsExceeded(uint256 currentCount, uint256 maxFunctions);
    error RangeSizeExceeded(uint256 rangeSize, uint256 maxRangeSize);
    
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
     * @dev Validates that a handler contract address is not zero
     * @param handler The handler contract address to validate
     */
    function validateHandlerContract(address handler) internal pure {
        if (handler == address(0)) revert InvalidAddress(handler);
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
     * @dev Validates that the signer of a meta-transaction is the owner
     * @param signer The signer address from the meta-transaction
     * @param owner The current owner address
     */
    function validateOwnerIsSigner(address signer, address owner) internal pure {
        if (signer != owner) revert NoPermission(signer);
    }
    
    /**
     * @dev Validates that the function is being called internally by the contract itself
     * @param contractAddress The address of the contract
     */
    function validateInternalCall(address contractAddress) internal view {
        if (msg.sender != contractAddress) revert OnlyCallableByContract(msg.sender, contractAddress);
    }
    
    // ============ TRANSACTION AND OPERATION VALIDATION FUNCTIONS ============
    
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
     * @dev Validates that a transaction exists (has non-zero ID)
     * @param txId The transaction ID to validate
     */
    function validateTransactionExists(uint256 txId) internal pure {
        if (txId == 0) revert ResourceNotFound(bytes32(uint256(txId)));
    }
    
    /**
     * @dev Validates that a transaction ID matches the expected value
     * @param txId The transaction ID to validate
     * @param expectedTxId The expected transaction ID
     */
    function validateTransactionId(uint256 txId, uint256 expectedTxId) internal pure {
        if (txId != expectedTxId) revert TransactionIdMismatch(expectedTxId, txId);
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
     * @dev Validates that a role hasn't reached its wallet limit
     * @param currentCount The current number of wallets in the role
     * @param maxWallets The maximum number of wallets allowed
     */
    function validateWalletLimit(uint256 currentCount, uint256 maxWallets) internal pure {
        if (currentCount >= maxWallets) revert RoleWalletLimitReached(currentCount, maxWallets);
    }
    
    /**
     * @dev Validates that max wallets is greater than zero
     * @param maxWallets The maximum number of wallets
     */
    function validateMaxWalletsGreaterThanZero(uint256 maxWallets) internal pure {
        if (maxWallets == 0) revert MaxWalletsZero(maxWallets);
    }
    
    /**
     * @dev Validates that a role name is not empty
     * @param roleName The role name to validate
     */
    function validateRoleNameNotEmpty(string memory roleName) internal pure {
        if (bytes(roleName).length == 0) revert ResourceNotFound(keccak256(bytes(roleName)));
    }
    
    // ============ UTILITY FUNCTIONS ============
    
    /**
     * @dev Validates that the first value is less than the second value
     * @param from The first value (should be less than 'to')
     * @param to The second value (should be greater than 'from')
     */
    function validateLessThan(uint256 from, uint256 to) internal pure {
        if (from >= to) revert InvalidRange(from, to);
    }
    
    /**
     * @dev Validates that two arrays have the same length
     * @param array1Length The length of the first array
     * @param array2Length The length of the second array
     */
    function validateArrayLengthMatch(uint256 array1Length, uint256 array2Length) internal pure {
        if (array1Length != array2Length) revert ArrayLengthMismatch(array1Length, array2Length);
    }
    
    // ============ SYSTEM LIMIT VALIDATION FUNCTIONS ============
    
    /**
     * @dev Validates that batch size doesn't exceed limit
     * @param batchSize The current batch size
     * @param maxBatchSize The maximum allowed batch size (0 = unlimited)
     */
    function validateBatchSize(uint256 batchSize, uint256 maxBatchSize) internal pure {
        if (maxBatchSize > 0 && batchSize > maxBatchSize) {
            revert BatchSizeExceeded(batchSize, maxBatchSize);
        }
    }
    
    /**
     * @dev Validates that role count doesn't exceed limit
     * @param currentCount The current role count
     * @param maxRoles The maximum allowed roles (0 = unlimited)
     */
    function validateRoleCount(uint256 currentCount, uint256 maxRoles) internal pure {
        if (maxRoles > 0 && currentCount >= maxRoles) {
            revert MaxRolesExceeded(currentCount, maxRoles);
        }
    }
    
    /**
     * @dev Validates that hook count doesn't exceed limit
     * @param currentCount The current hook count
     * @param maxHooks The maximum allowed hooks (0 = unlimited)
     */
    function validateHookCount(uint256 currentCount, uint256 maxHooks) internal pure {
        if (maxHooks > 0 && currentCount >= maxHooks) {
            revert MaxHooksExceeded(currentCount, maxHooks);
        }
    }
    
    /**
     * @dev Validates that function count doesn't exceed limit
     * @param currentCount The current function count
     * @param maxFunctions The maximum allowed functions (0 = unlimited)
     */
    function validateFunctionCount(uint256 currentCount, uint256 maxFunctions) internal pure {
        if (maxFunctions > 0 && currentCount >= maxFunctions) {
            revert MaxFunctionsExceeded(currentCount, maxFunctions);
        }
    }
    
    /**
     * @dev Validates that range size doesn't exceed limit
     * @param rangeSize The range size
     * @param maxRangeSize The maximum allowed range size (0 = unlimited)
     */
    function validateRangeSize(uint256 rangeSize, uint256 maxRangeSize) internal pure {
        if (maxRangeSize > 0 && rangeSize > maxRangeSize) {
            revert RangeSizeExceeded(rangeSize, maxRangeSize);
        }
    }
     
    /**
     * @dev Validates that an index is within bounds of an array
     * @param index The index to validate
     * @param arrayLength The length of the array
     */
    function validateIndexInBounds(uint256 index, uint256 arrayLength) internal pure {
        if (index >= arrayLength) revert IndexOutOfBounds(index, arrayLength);
    }
}
