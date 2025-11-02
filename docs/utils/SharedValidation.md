# Solidity API

# SharedValidation

Optimized shared library containing common validation functions using enhanced custom errors

This library is designed to reduce contract size by centralizing common validation logic
and using gas-efficient custom errors instead of string constants. This approach provides
significant gas savings and contract size reduction while maintaining clear error context.

Features:
- Enhanced custom errors with contextual parameters
- Address validation functions
- Time and deadline validation
- Signature validation utilities
- Permission and authorization checks
- Operation type validation
- Gas and transaction validation

This library follows the security rules defined in .cursorrules and implements
the Checks-Effects-Interactions pattern where applicable.

Gas Optimization Benefits:
- ~50% gas reduction compared to string-based errors
- Significant contract size reduction
- Enhanced error context with parameters
- Modern Solidity best practices (0.8.4+)




## Functions

### validateNotZeroAddress

```solidity
function validateNotZeroAddress(address addr) internal pure
```

Validates that an address is not the zero address

**Parameters:**
- `` (): The address to validate



---

### validateNewAddress

```solidity
function validateNewAddress(address newAddress, address currentAddress) internal pure
```

Validates that a new address is different from the current address

**Parameters:**
- `` (): The proposed new address
- `` (): The current address to compare against



---

### validateAddressUpdate

```solidity
function validateAddressUpdate(address newAddress, address currentAddress) internal pure
```

Validates that an address is not the zero address and is different from current

**Parameters:**
- `` (): The proposed new address
- `` (): The current address to compare against



---

### validateTargetAddress

```solidity
function validateTargetAddress(address target) internal pure
```

Validates that a target address is not zero

**Parameters:**
- `` (): The target address to validate



---

### validateRequesterAddress

```solidity
function validateRequesterAddress(address requester) internal pure
```

Validates that a requester address is not zero

**Parameters:**
- `` (): The requester address to validate



---

### validateHandlerContract

```solidity
function validateHandlerContract(address handler) internal pure
```

Validates that a handler contract address is not zero

**Parameters:**
- `` (): The handler contract address to validate



---

### validateSignerAddress

```solidity
function validateSignerAddress(address signer) internal pure
```

Validates that a signer address is not zero

**Parameters:**
- `` (): The signer address to validate



---

### validateTimeLockPeriod

```solidity
function validateTimeLockPeriod(uint256 timeLockPeriod) internal pure
```

Validates that a time lock period is greater than zero

**Parameters:**
- `` (): The time lock period to validate



---

### validateDeadline

```solidity
function validateDeadline(uint256 deadline) internal view
```

Validates that a deadline is in the future

**Parameters:**
- `` (): The deadline timestamp to validate



---

### validateTimeLockUpdate

```solidity
function validateTimeLockUpdate(uint256 newPeriod, uint256 currentPeriod) internal pure
```

Validates that a new time lock period is different from the current one

**Parameters:**
- `` (): The new time lock period
- `` (): The current time lock period



---

### validateReleaseTime

```solidity
function validateReleaseTime(uint256 releaseTime) internal view
```

Validates that the current time is after the release time

**Parameters:**
- `` (): The release time to check against



---

### validateMetaTxDeadline

```solidity
function validateMetaTxDeadline(uint256 deadline) internal view
```

Validates that a meta-transaction has not expired

**Parameters:**
- `` (): The deadline of the meta-transaction



---

### validateSignatureLength

```solidity
function validateSignatureLength(bytes signature) internal pure
```

Validates that a signature has the correct length (65 bytes)

**Parameters:**
- `` (): The signature to validate



---

### validateSignatureParams

```solidity
function validateSignatureParams(bytes32 s, uint8 v) internal pure
```

Validates ECDSA signature parameters

**Parameters:**
- `` (): The s parameter of the signature
- `` (): The v parameter of the signature



---

### validateRecoveredSigner

```solidity
function validateRecoveredSigner(address signer) internal pure
```

Validates that a recovered signer is not the zero address

**Parameters:**
- `` (): The recovered signer address



---

### validateSignature

```solidity
function validateSignature(bytes signature) internal pure
```

Validates that a signature is not empty

**Parameters:**
- `` (): The signature to validate



---

### validateOwner

```solidity
function validateOwner(address owner) internal view
```

Validates that the caller is the owner

**Parameters:**
- `` (): The current owner address



---

### validateOwnerOrRecovery

```solidity
function validateOwnerOrRecovery(address owner, address recovery) internal view
```

Validates that the caller is either the owner or recovery

**Parameters:**
- `` (): The current owner address
- `` (): The current recovery address



---

### validateRecovery

```solidity
function validateRecovery(address recovery) internal view
```

Validates that the caller is the recovery address

**Parameters:**
- `` (): The current recovery address



---

### validateBroadcaster

```solidity
function validateBroadcaster(address broadcaster) internal view
```

Validates that the caller is the broadcaster

**Parameters:**
- `` (): The current broadcaster address



---

### validateInternalCall

```solidity
function validateInternalCall(address contractAddress) internal view
```

Validates that the function is being called internally by the contract itself

**Parameters:**
- `` (): The address of the contract



---

### validatePermission

```solidity
function validatePermission(address caller) internal pure
```

Validates that the caller has permission

**Parameters:**
- `` (): The caller address



---

### validatePermissionExecute

```solidity
function validatePermissionExecute(address caller) internal pure
```

Validates that the caller has permission to execute a specific function

**Parameters:**
- `` (): The caller address



---

### validateSignerAuthorized

```solidity
function validateSignerAuthorized(address signer) internal pure
```

Validates that a signer is authorized

**Parameters:**
- `` (): The signer address to validate



---

### validateOperationSupported

```solidity
function validateOperationSupported() internal pure
```

Validates that an operation type is supported




---

### validateOperationTypeNew

```solidity
function validateOperationTypeNew() internal pure
```

Validates that an operation type doesn't already exist




---

### validateOperationTypeNotZero

```solidity
function validateOperationTypeNotZero(bytes32 operationType) internal pure
```

Validates that an operation type is not zero

**Parameters:**
- `` (): The operation type to validate



---

### validateOperationType

```solidity
function validateOperationType(bytes32 actualType, bytes32 expectedType) internal pure
```

Validates that an operation type matches the expected type

**Parameters:**
- `` (): The actual operation type
- `` (): The expected operation type



---

### validateNoOpenRequest

```solidity
function validateNoOpenRequest(uint256 txId) internal pure
```

Validates that a request is not already pending

**Parameters:**
- `` (): The transaction ID to validate



---

### validateTransactionExists

```solidity
function validateTransactionExists(uint256 txId) internal pure
```

Validates that a transaction exists (has non-zero ID)

**Parameters:**
- `` (): The transaction ID to validate



---

### validateTransactionId

```solidity
function validateTransactionId(uint256 txId, uint256 expectedTxId) internal pure
```

Validates that a transaction ID matches the expected value

**Parameters:**
- `` (): The transaction ID to validate
- `` (): The expected transaction ID



---

### validateNotInitialized

```solidity
function validateNotInitialized() internal pure
```

Validates that a contract is not already initialized




---

### validateChainId

```solidity
function validateChainId(uint256 chainId) internal view
```

Validates chain ID matches the current chain

**Parameters:**
- `` (): The chain ID to validate



---

### validateHandlerContractMatch

```solidity
function validateHandlerContractMatch(address handlerContract, address target) internal pure
```

Validates that handler contract matches target

**Parameters:**
- `` (): The handler contract address
- `` (): The target contract address



---

### validateHandlerSelector

```solidity
function validateHandlerSelector(bytes4 selector) internal pure
```

Validates that a handler selector is not zero

**Parameters:**
- `` (): The handler selector to validate



---

### validateHandlerSelectorMatch

```solidity
function validateHandlerSelectorMatch(bytes4 actualSelector, bytes4 expectedSelector) internal pure
```

Validates that a handler selector matches the expected selector

**Parameters:**
- `` (): The actual handler selector from the meta transaction
- `` (): The expected handler selector to validate against



---

### validateNonce

```solidity
function validateNonce(uint256 nonce, uint256 expectedNonce) internal pure
```

Validates that a nonce matches the expected value

**Parameters:**
- `` (): The nonce to validate
- `` (): The expected nonce value



---

### validateGasPrice

```solidity
function validateGasPrice(uint256 maxGasPrice) internal view
```

Validates that the current transaction's gas price is within limits

**Parameters:**
- `` (): The maximum allowed gas price (in wei)



---

### validateRoleExists

```solidity
function validateRoleExists() internal pure
```

Validates that a role exists




---

### validateRoleNew

```solidity
function validateRoleNew() internal pure
```

Validates that a role doesn't already exist




---

### validateFunctionNew

```solidity
function validateFunctionNew(bytes4 functionSelector) internal pure
```

Validates that a function doesn't already exist

**Parameters:**
- `` (): The function selector to check



---

### validateFunctionExists

```solidity
function validateFunctionExists(bytes4 functionSelector) internal pure
```

Validates that a function exists (has non-zero selector)

**Parameters:**
- `` (): The function selector to check



---

### validateFunctionSchemaExists

```solidity
function validateFunctionSchemaExists(bytes4 actualSelector, bytes4 expectedSelector) internal pure
```

Validates that a function schema exists in a mapping

**Parameters:**
- `` (): The actual function selector from the mapping
- `` (): The expected function selector to validate against



---

### validateWalletNotInRole

```solidity
function validateWalletNotInRole(address wallet) internal pure
```

Validates that a wallet is not already in a role

**Parameters:**
- `` (): The wallet address to validate



---

### validateWalletLimit

```solidity
function validateWalletLimit(uint256 currentCount, uint256 maxWallets) internal pure
```

Validates that a role hasn't reached its wallet limit

**Parameters:**
- `` (): The current number of wallets in the role
- `` (): The maximum number of wallets allowed



---

### validatePermissionNew

```solidity
function validatePermissionNew(bytes4 functionSelector) internal pure
```

Validates that a function permission doesn't already exist

**Parameters:**
- `` (): The function selector



---

### validateActionSupported

```solidity
function validateActionSupported() internal pure
```

Validates that an action is supported by a function




---

### validateRoleNameNotEmpty

```solidity
function validateRoleNameNotEmpty(string roleName) internal pure
```

Validates that a role name is not empty

**Parameters:**
- `` (): The role name to validate



---

### validateRoleNotProtected

```solidity
function validateRoleNotProtected() internal pure
```

Validates that a role is not protected




---

### validateRoleEditingEnabled

```solidity
function validateRoleEditingEnabled() internal pure
```

Validates that role editing is enabled




---

### validateMaxWalletsGreaterThanZero

```solidity
function validateMaxWalletsGreaterThanZero(uint256 maxWallets) internal pure
```

Validates that max wallets is greater than zero

**Parameters:**
- `` (): The maximum number of wallets



---

### validateCanRemoveWallet

```solidity
function validateCanRemoveWallet(address wallet) internal pure
```

Validates that a wallet can be removed from a role

**Parameters:**
- `` (): The wallet address



---

### validateWalletInRole

```solidity
function validateWalletInRole(address wallet) internal pure
```

Validates that a wallet exists in a role

**Parameters:**
- `` (): The wallet address



---

### validateCanRemoveProtectedRole

```solidity
function validateCanRemoveProtectedRole() internal pure
```

Validates that a protected role cannot be removed




---

### validateCanRemoveProtectedFunctionSchema

```solidity
function validateCanRemoveProtectedFunctionSchema(bytes4 functionSelector) internal pure
```

Validates that a protected function schema cannot be removed

**Parameters:**
- `` (): The function selector of the protected schema



---

### validateGreaterThanZero

```solidity
function validateGreaterThanZero(uint256 value) internal pure
```

Validates that a value is greater than zero

**Parameters:**
- `` (): The value to validate



---

### validateEqual

```solidity
function validateEqual(uint256 actual, uint256 expected) internal pure
```

Validates that two values are equal

**Parameters:**
- `` (): The actual value
- `` (): The expected value



---

### validateEqual

```solidity
function validateEqual(bytes4 actual, bytes4 expected) internal pure
```

Validates that two bytes4 values are equal

**Parameters:**
- `` (): The actual value
- `` (): The expected value



---

### validateEqual

```solidity
function validateEqual(bytes32 actual, bytes32 expected) internal pure
```

Validates that two bytes32 values are equal

**Parameters:**
- `` (): The actual value
- `` (): The expected value



---

### validateEqual

```solidity
function validateEqual(address actual, address expected) internal pure
```

Validates that two address values are equal

**Parameters:**
- `` (): The actual value
- `` (): The expected value



---

### validateTrue

```solidity
function validateTrue(bool condition) internal pure
```

Validates that a boolean condition is true

**Parameters:**
- `` (): The condition to validate



---

### validateFalse

```solidity
function validateFalse(bool condition) internal pure
```

Validates that a boolean condition is false

**Parameters:**
- `` (): The condition to validate



---

### validateLessThan

```solidity
function validateLessThan(uint256 from, uint256 to) internal pure
```

Validates that the first value is less than the second value

**Parameters:**
- `` (): The first value (should be less than &#x27;to&#x27;)
- `` (): The second value (should be greater than &#x27;from&#x27;)



---

### validateRange

```solidity
function validateRange(uint256 value, uint256 min, uint256 max) internal pure
```

Validates that a value is within a valid range

**Parameters:**
- `` (): The value to validate
- `` (): The minimum allowed value
- `` (): The maximum allowed value



---

### validateArrayLengthMatch

```solidity
function validateArrayLengthMatch(uint256 array1Length, uint256 array2Length) internal pure
```

Validates that two arrays have the same length

**Parameters:**
- `` (): The length of the first array
- `` (): The length of the second array



---

### validateIndexInBounds

```solidity
function validateIndexInBounds(uint256 index, uint256 arrayLength) internal pure
```

Validates that an index is within bounds of an array

**Parameters:**
- `` (): The index to validate
- `` (): The length of the array



---

### validateOperationTypeInternal

```solidity
function validateOperationTypeInternal(bytes32 operationType, bytes32 expectedType) internal pure
```

Internal function to validate operation type

**Parameters:**
- `` (): The operation type to validate
- `` (): The expected operation type



---

### validateHandlerSelectorMatchInternal

```solidity
function validateHandlerSelectorMatchInternal(bytes4 handlerSelector, bytes4 expectedSelector) internal pure
```

Internal function to validate handler selector match

**Parameters:**
- `` (): The handler selector to validate
- `` (): The expected handler selector



---

### validateInternalCallInternal

```solidity
function validateInternalCallInternal(address expectedCaller) internal view
```

Internal function to validate internal call

**Parameters:**
- `` (): The expected caller address



---


## Events


## Structs


## Enums


