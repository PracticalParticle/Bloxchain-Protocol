# Solidity API

# StateAbstraction

A library for implementing secure state abstraction with time-locks and meta-transactions

This library provides a comprehensive framework for creating secure operations that require
state management and multiple phases of approval before execution. It supports:

- Time-locked operations that can only be executed after a waiting period
- Meta-transactions for delegated approvals
- Role-based access control for different operation types
- Multiple execution types (standard function calls or raw transaction data)
- Payment handling for both native tokens and ERC20 tokens
- State machine-driven operation workflows

The library uses StateAbstractionDefinitions for modular configuration,
allowing easy customization of operation types, function schemas, and role permissions
without modifying the core library code.

The library is designed to be used as a building block for secure smart contract systems
that require high levels of security and flexibility through state abstraction.




## Functions

### initialize

```solidity
function initialize(struct StateAbstraction.SecureOperationState self, address _owner, address _broadcaster, address _recovery, uint256 _timeLockPeriodSec) public nonpayable
```

Initializes the SecureOperationState with the specified time lock period and roles.

**Parameters:**
- `` (): The SecureOperationState to initialize.
- `` (): The time lock period in seconds.
- `` (): The address of the owner.
- `` (): The address of the broadcaster.
- `` (): The address of the recovery.



---

### updateTimeLockPeriod

```solidity
function updateTimeLockPeriod(struct StateAbstraction.SecureOperationState self, uint256 _newTimeLockPeriodSec) public nonpayable
```

Updates the time lock period for the SecureOperationState.

**Parameters:**
- `` (): The SecureOperationState to modify.
- `` (): The new time lock period in seconds.



---

### getTxRecord

```solidity
function getTxRecord(struct StateAbstraction.SecureOperationState self, uint256 txId) public view returns (struct StateAbstraction.TxRecord)
```

Gets the transaction record by its ID.

**Parameters:**
- `` (): The SecureOperationState to check.
- `` (): The ID of the transaction to check.

**Returns:**
- The TxRecord associated with the transaction ID.


---

### txRequest

```solidity
function txRequest(struct StateAbstraction.SecureOperationState self, address requester, address target, uint256 value, uint256 gasLimit, bytes32 operationType, enum StateAbstraction.ExecutionType executionType, bytes executionOptions) public nonpayable returns (struct StateAbstraction.TxRecord)
```

Requests a transaction with the specified parameters.

**Parameters:**
- `` (): The SecureOperationState to modify.
- `` (): The address of the requester.
- `` (): The target contract address for the transaction.
- `` (): The value to send with the transaction.
- `` (): The gas limit for the transaction.
- `` (): The type of operation.
- `` (): The type of execution (STANDARD or RAW).
- `` (): The execution options for the transaction.

**Returns:**
- The created TxRecord.


---

### txDelayedApproval

```solidity
function txDelayedApproval(struct StateAbstraction.SecureOperationState self, uint256 txId) public nonpayable returns (struct StateAbstraction.TxRecord)
```

Approves a pending transaction after the release time.

**Parameters:**
- `` (): The SecureOperationState to modify.
- `` (): The ID of the transaction to approve.

**Returns:**
- The updated TxRecord.


---

### txCancellation

```solidity
function txCancellation(struct StateAbstraction.SecureOperationState self, uint256 txId) public nonpayable returns (struct StateAbstraction.TxRecord)
```

Cancels a pending transaction.

**Parameters:**
- `` (): The SecureOperationState to modify.
- `` (): The ID of the transaction to cancel.

**Returns:**
- The updated TxRecord.


---

### txCancellationWithMetaTx

```solidity
function txCancellationWithMetaTx(struct StateAbstraction.SecureOperationState self, struct StateAbstraction.MetaTransaction metaTx) public nonpayable returns (struct StateAbstraction.TxRecord)
```

Cancels a pending transaction using a meta-transaction.

**Parameters:**
- `` (): The SecureOperationState to modify.
- `` (): The meta-transaction containing the signature and nonce.

**Returns:**
- The updated TxRecord.


---

### txApprovalWithMetaTx

```solidity
function txApprovalWithMetaTx(struct StateAbstraction.SecureOperationState self, struct StateAbstraction.MetaTransaction metaTx) public nonpayable returns (struct StateAbstraction.TxRecord)
```

Approves a pending transaction immediately using a meta-transaction.

**Parameters:**
- `` (): The SecureOperationState to modify.
- `` (): The meta-transaction containing the signature and nonce.

**Returns:**
- The updated TxRecord.


---

### requestAndApprove

```solidity
function requestAndApprove(struct StateAbstraction.SecureOperationState self, struct StateAbstraction.MetaTransaction metaTx) public nonpayable returns (struct StateAbstraction.TxRecord)
```

Requests and immediately approves a transaction.

**Parameters:**
- `` (): The SecureOperationState to modify.
- `` (): The meta-transaction containing the signature and nonce.

**Returns:**
- The updated TxRecord.


---

### createStandardExecutionOptions

```solidity
function createStandardExecutionOptions(bytes4 functionSelector, bytes params) public pure returns (bytes)
```

Creates StandardExecutionOptions with proper encoding

**Parameters:**
- `` (): The function selector to call
- `` (): The encoded parameters for the function

**Returns:**
- Encoded execution options ready for use in a transaction


---

### createRawExecutionOptions

```solidity
function createRawExecutionOptions(bytes rawTxData) public pure returns (bytes)
```

Creates RawExecutionOptions with proper encoding

**Parameters:**
- `` (): The raw transaction data

**Returns:**
- Encoded execution options ready for use in a transaction


---

### updatePaymentForTransaction

```solidity
function updatePaymentForTransaction(struct StateAbstraction.SecureOperationState self, uint256 txId, struct StateAbstraction.PaymentDetails paymentDetails) public nonpayable
```

Updates payment details for a pending transaction

**Parameters:**
- `` (): The SecureOperationState to modify
- `` (): The transaction ID to update payment for
- `` (): The new payment details



---

### getRole

```solidity
function getRole(struct StateAbstraction.SecureOperationState self, bytes32 role) public view returns (struct StateAbstraction.Role)
```

Gets the role by its hash.

**Parameters:**
- `` (): The SecureOperationState to check.
- `` (): The role to get the hash for.

**Returns:**
- The role associated with the hash, or Role(0) if the role doesn&#x27;t exist.


---

### createRole

```solidity
function createRole(struct StateAbstraction.SecureOperationState self, string roleName, uint256 maxWallets, bool isProtected) public nonpayable
```

Creates a role with specified function permissions.

**Parameters:**
- `` (): The SecureOperationState to check.
- `` (): Name of the role.
- `` (): Maximum number of wallets allowed for this role.
- `` (): Whether the role is protected from removal.



---

### removeRole

```solidity
function removeRole(struct StateAbstraction.SecureOperationState self, bytes32 roleHash) public nonpayable
```

Removes a role from the system.

**Parameters:**
- `` (): The SecureOperationState to modify.
- `` (): The hash of the role to remove.



---

### hasRole

```solidity
function hasRole(struct StateAbstraction.SecureOperationState self, bytes32 roleHash, address wallet) public view returns (bool)
```

Checks if a wallet is authorized for a role.

**Parameters:**
- `` (): The SecureOperationState to check.
- `` (): The hash of the role to check.
- `` (): The wallet address to check.

**Returns:**
- True if the wallet is authorized for the role, false otherwise.


---

### assignWallet

```solidity
function assignWallet(struct StateAbstraction.SecureOperationState self, bytes32 role, address wallet) public nonpayable
```

Adds a wallet address to a role in the roles mapping.

**Parameters:**
- `` (): The SecureOperationState to modify.
- `` (): The role hash to add the wallet to.
- `` (): The wallet address to add.



---

### updateAssignedWallet

```solidity
function updateAssignedWallet(struct StateAbstraction.SecureOperationState self, bytes32 role, address newWallet, address oldWallet) public nonpayable
```

Updates a role from an old address to a new address.

**Parameters:**
- `` (): The SecureOperationState to modify.
- `` (): The role to update.
- `` (): The new wallet address to assign the role to.
- `` (): The old wallet address to remove from the role.



---

### revokeWallet

```solidity
function revokeWallet(struct StateAbstraction.SecureOperationState self, bytes32 role, address wallet) public nonpayable
```

Removes a wallet from a role.

**Parameters:**
- `` (): The SecureOperationState to modify.
- `` (): The role to remove the wallet from.
- `` (): The wallet address to remove.



---

### addFunctionToRole

```solidity
function addFunctionToRole(struct StateAbstraction.SecureOperationState self, bytes32 roleHash, struct StateAbstraction.FunctionPermission functionPermission) public nonpayable
```

Adds a function permission to an existing role.

**Parameters:**
- `` (): The SecureOperationState to modify.
- `` (): The role hash to add the function permission to.
- `` (): The function permission to add.



---

### removeFunctionFromRole

```solidity
function removeFunctionFromRole(struct StateAbstraction.SecureOperationState self, bytes32 roleHash, bytes4 functionSelector) public nonpayable
```

Removes a function permission from an existing role.

**Parameters:**
- `` (): The SecureOperationState to modify.
- `` (): The role hash to remove the function permission from.
- `` (): The function selector to remove from the role.



---

### hasActionPermission

```solidity
function hasActionPermission(struct StateAbstraction.SecureOperationState self, address wallet, bytes4 functionSelector, enum StateAbstraction.TxAction requestedAction) public view returns (bool)
```

Checks if a wallet has permission for a specific function and action.

**Parameters:**
- `` (): The SecureOperationState to check.
- `` (): The wallet address to check.
- `` (): The function selector to check permissions for.
- `` (): The specific action being requested.

**Returns:**
- True if the wallet has permission for the function and action, false otherwise.


---

### hasAnyRole

```solidity
function hasAnyRole(struct StateAbstraction.SecureOperationState self, address wallet) public view returns (bool)
```

Checks if a wallet has view permission for any role (privacy function access)

**Parameters:**
- `` (): The SecureOperationState to check.
- `` (): The wallet address to check.

**Returns:**
- True if the wallet has view permission, false otherwise.


---

### roleHasActionPermission

```solidity
function roleHasActionPermission(struct StateAbstraction.SecureOperationState self, bytes32 roleHash, bytes4 functionSelector, enum StateAbstraction.TxAction requestedAction) public view returns (bool)
```

Checks if a specific role has permission for a function and action.

**Parameters:**
- `` (): The SecureOperationState to check.
- `` (): The role hash to check.
- `` (): The function selector to check permissions for.
- `` (): The specific action being requested.

**Returns:**
- True if the role has permission for the function and action, false otherwise.


---

### createFunctionSchema

```solidity
function createFunctionSchema(struct StateAbstraction.SecureOperationState self, string functionName, bytes4 functionSelector, bytes32 operationType, string operationName, uint16 supportedActionsBitmap, bool isProtected) public nonpayable
```

Creates a function access control with specified permissions.

**Parameters:**
- `` (): The SecureOperationState to check.
- `` (): Name of the function.
- `` (): Hash identifier for the function.
- `` (): The operation type this function belongs to.
- `` (): The name of the operation type.
- `` (): Bitmap of permissions required to execute this function.
- `` (): Whether the function schema is protected from removal.



---

### removeFunctionSchema

```solidity
function removeFunctionSchema(struct StateAbstraction.SecureOperationState self, bytes4 functionSelector) public nonpayable
```

Removes a function schema from the system.

**Parameters:**
- `` (): The SecureOperationState to modify.
- `` (): The function selector to remove.



---

### isActionSupportedByFunction

```solidity
function isActionSupportedByFunction(struct StateAbstraction.SecureOperationState self, bytes4 functionSelector, enum StateAbstraction.TxAction action) public view returns (bool)
```

Checks if a specific action is supported by a function.

**Parameters:**
- `` (): The SecureOperationState to check.
- `` (): The function selector to check.
- `` (): The action to check for support.

**Returns:**
- True if the action is supported by the function, false otherwise.


---

### getFunctionsByOperationType

```solidity
function getFunctionsByOperationType(struct StateAbstraction.SecureOperationState self, bytes32 operationType) public view returns (bytes4[])
```

Returns all function schemas that use a specific operation type.

**Parameters:**
- `` (): The SecureOperationState to check.
- `` (): The operation type to search for.

**Returns:**
- Array of function selectors that use the specified operation type.


---

### getPendingTransactionsList

```solidity
function getPendingTransactionsList(struct StateAbstraction.SecureOperationState self) public view returns (uint256[])
```

Gets all pending transaction IDs as an array for backward compatibility

**Parameters:**
- `` (): The SecureOperationState to check

**Returns:**
- Array of pending transaction IDs


---

### getSupportedRolesList

```solidity
function getSupportedRolesList(struct StateAbstraction.SecureOperationState self) public view returns (bytes32[])
```

Gets all supported roles as an array for backward compatibility

**Parameters:**
- `` (): The SecureOperationState to check

**Returns:**
- Array of supported role hashes


---

### getSupportedFunctionsList

```solidity
function getSupportedFunctionsList(struct StateAbstraction.SecureOperationState self) public view returns (bytes4[])
```

Gets all supported function selectors as an array for backward compatibility

**Parameters:**
- `` (): The SecureOperationState to check

**Returns:**
- Array of supported function selectors


---

### getSupportedOperationTypesList

```solidity
function getSupportedOperationTypesList(struct StateAbstraction.SecureOperationState self) public view returns (bytes32[])
```

Gets all supported operation types as an array for backward compatibility

**Parameters:**
- `` (): The SecureOperationState to check

**Returns:**
- Array of supported operation type hashes


---

### getAuthorizedWalletAt

```solidity
function getAuthorizedWalletAt(struct StateAbstraction.SecureOperationState self, bytes32 roleHash, uint256 index) public view returns (address)
```

Gets the authorized wallet at a specific index from a role

**Parameters:**
- `` (): The SecureOperationState to check
- `` (): The role hash to get the wallet from
- `` (): The index position of the wallet to retrieve

**Returns:**
- The authorized wallet address at the specified index


---

### getRoleFunctionPermissions

```solidity
function getRoleFunctionPermissions(struct StateAbstraction.SecureOperationState self, bytes32 roleHash) public view returns (struct StateAbstraction.FunctionPermission[])
```

Gets all function permissions for a role as an array for backward compatibility

**Parameters:**
- `` (): The SecureOperationState to check
- `` (): The role hash to get function permissions from

**Returns:**
- Array of function permissions with arrays (for external API)


---

### getSignerNonce

```solidity
function getSignerNonce(struct StateAbstraction.SecureOperationState self, address signer) public view returns (uint256)
```

Gets the current nonce for a specific signer.

**Parameters:**
- `` (): The SecureOperationState to check.
- `` (): The address of the signer.

**Returns:**
- The current nonce for the signer.


---

### recoverSigner

```solidity
function recoverSigner(bytes32 messageHash, bytes signature) public pure returns (address)
```

Recovers the signer address from a message hash and signature.

**Parameters:**
- `` (): The hash of the message that was signed.
- `` (): The signature to recover the address from.

**Returns:**
- The address of the signer.


---

### generateUnsignedForNewMetaTx

```solidity
function generateUnsignedForNewMetaTx(struct StateAbstraction.SecureOperationState self, struct StateAbstraction.TxParams txParams, struct StateAbstraction.MetaTxParams metaTxParams) public view returns (struct StateAbstraction.MetaTransaction)
```

Creates a meta-transaction for a new operation




---

### generateUnsignedForExistingMetaTx

```solidity
function generateUnsignedForExistingMetaTx(struct StateAbstraction.SecureOperationState self, uint256 txId, struct StateAbstraction.MetaTxParams metaTxParams) public view returns (struct StateAbstraction.MetaTransaction)
```

Creates a meta-transaction for an existing transaction




---

### createMetaTxParams

```solidity
function createMetaTxParams(address handlerContract, bytes4 handlerSelector, enum StateAbstraction.TxAction action, uint256 deadline, uint256 maxGasPrice, address signer) public view returns (struct StateAbstraction.MetaTxParams)
```

Helper function to create properly formatted MetaTxParams

**Parameters:**
- `` (): The contract that will handle the meta-transaction
- `` (): The function selector for the handler
- `` (): The transaction action type
- `` (): The timestamp after which the meta-transaction expires
- `` (): The maximum gas price allowed for execution
- `` (): The address that will sign the meta-transaction

**Returns:**
- MetaTxParams The formatted meta-transaction parameters


---

### logTxEvent

```solidity
function logTxEvent(struct StateAbstraction.SecureOperationState self, uint256 txId, bytes4 functionSelector) public nonpayable
```

Logs an event by emitting TransactionEvent and forwarding to event forwarder

**Parameters:**
- `` (): The SecureOperationState
- `` (): The transaction ID
- `` (): The function selector to emit in the event



---

### setEventForwarder

```solidity
function setEventForwarder(struct StateAbstraction.SecureOperationState self, address forwarder) public nonpayable
```

Set the event forwarder for this specific instance

**Parameters:**
- `` (): The SecureOperationState
- `` (): The event forwarder address



---

### hasActionInBitmap

```solidity
function hasActionInBitmap(uint16 bitmap, enum StateAbstraction.TxAction action) internal pure returns (bool)
```

Checks if a TxAction is present in a bitmap

**Parameters:**
- `` (): The bitmap to check
- `` (): The TxAction to check for

**Returns:**
- True if the action is present in the bitmap


---

### addActionToBitmap

```solidity
function addActionToBitmap(uint16 bitmap, enum StateAbstraction.TxAction action) internal pure returns (uint16)
```

Adds a TxAction to a bitmap

**Parameters:**
- `` (): The original bitmap
- `` (): The TxAction to add

**Returns:**
- The updated bitmap with the action added


---

### createBitmapFromActions

```solidity
function createBitmapFromActions(enum StateAbstraction.TxAction[] actions) internal pure returns (uint16)
```

Creates a bitmap from an array of TxActions

**Parameters:**
- `` (): Array of TxActions to convert to bitmap

**Returns:**
- Bitmap representation of the actions


---

### _validateAnyRole

```solidity
function _validateAnyRole(struct StateAbstraction.SecureOperationState self) internal view
```

Validates that the caller has any role permission

**Parameters:**
- `` (): The SecureOperationState to check



---

### _validateRoleExists

```solidity
function _validateRoleExists(struct StateAbstraction.SecureOperationState self, bytes32 roleHash) internal view
```

Validates that a role exists by checking if its hash is not zero

**Parameters:**
- `` (): The SecureOperationState to check
- `` (): The role hash to validate



---

### _validateTxPending

```solidity
function _validateTxPending(struct StateAbstraction.SecureOperationState self, uint256 txId) internal view
```

Validates that a transaction is in pending status

**Parameters:**
- `` (): The SecureOperationState to check
- `` (): The transaction ID to validate



---

### _validateMetaTxPermissions

```solidity
function _validateMetaTxPermissions(struct StateAbstraction.SecureOperationState self, struct StateAbstraction.FunctionPermission functionPermission) internal view
```

Validates meta-transaction permissions for a function permission

**Parameters:**
- `` (): The secure operation state
- `` (): The function permission to validate


**Security:** This function prevents conflicting meta-sign and meta-execute permissions

---

### _convertUintSetToArray

```solidity
function _convertUintSetToArray(struct EnumerableSet.UintSet set) internal view returns (uint256[])
```

Generic helper to convert UintSet to array

**Parameters:**
- `` (): The EnumerableSet.UintSet to convert

**Returns:**
- Array of uint256 values


---

### _convertBytes32SetToArray

```solidity
function _convertBytes32SetToArray(struct EnumerableSet.Bytes32Set set) internal view returns (bytes32[])
```

Generic helper to convert Bytes32Set to array

**Parameters:**
- `` (): The EnumerableSet.Bytes32Set to convert

**Returns:**
- Array of bytes32 values


---


## Events

### TransactionEvent

```solidity
event TransactionEvent(uint256 txId, bytes4 functionHash, enum StateAbstraction.TxStatus status, address requester, address target, bytes32 operationType)
```




---


## Structs


## Enums


