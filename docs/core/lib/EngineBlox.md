# Solidity API

# EngineBlox

A library for implementing secure state abstraction with time-locks and meta-transactions

This library provides a comprehensive framework for creating secure operations that require
state management and multiple phases of approval before execution. It supports:

- Time-locked operations that can only be executed after a waiting period
- Meta-transactions for delegated approvals
- Role-based access control for different operation types
- Multiple execution types (standard function calls or raw transaction data)
- Payment handling for both native tokens and ERC20 tokens
- State machine-driven operation workflows

The library supports flexible configuration of operation types, function schemas, and role permissions
through direct function calls without requiring external definition files.

The library is designed to be used as a building block for secure smart contract systems
that require high levels of security and flexibility through state abstraction.




## Functions

### initialize

```solidity
function initialize(struct EngineBlox.SecureOperationState self, address _owner, address _broadcaster, address _recovery, uint256 _timeLockPeriodSec) public nonpayable
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
function updateTimeLockPeriod(struct EngineBlox.SecureOperationState self, uint256 periodSec) public nonpayable
```

Updates the time lock period for the SecureOperationState.

**Parameters:**
- `` (): The SecureOperationState to modify.
- `` (): The new time lock period in seconds.



---

### getTxRecord

```solidity
function getTxRecord(struct EngineBlox.SecureOperationState self, uint256 txId) public view returns (struct EngineBlox.TxRecord)
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
function txRequest(struct EngineBlox.SecureOperationState self, address requester, address target, uint256 value, uint256 gasLimit, bytes32 operationType, bytes4 handlerSelector, bytes4 executionSelector, bytes executionParams) public nonpayable returns (struct EngineBlox.TxRecord)
```

Requests a transaction with the specified parameters.

**Parameters:**
- `` (): The SecureOperationState to modify.
- `` (): The address of the requester.
- `` (): The target contract address for the transaction.
- `` (): The value to send with the transaction.
- `` (): The gas limit for the transaction.
- `` (): The type of operation.
- `` (): The function selector of the handler/request function.
- `` (): The function selector to execute (NATIVE_TRANSFER_SELECTOR for simple native token transfers).
- `` (): The encoded parameters for the function (empty for simple native token transfers).

**Returns:**
- The created TxRecord.


---

### txRequestWithPayment

```solidity
function txRequestWithPayment(struct EngineBlox.SecureOperationState self, address requester, address target, uint256 value, uint256 gasLimit, bytes32 operationType, bytes4 handlerSelector, bytes4 executionSelector, bytes executionParams, struct EngineBlox.PaymentDetails paymentDetails) public nonpayable returns (struct EngineBlox.TxRecord)
```

Requests a transaction with payment details attached from the start.

**Parameters:**
- `` (): The SecureOperationState to modify.
- `` (): The address of the requester.
- `` (): The target contract address for the transaction.
- `` (): The value to send with the transaction.
- `` (): The gas limit for the transaction.
- `` (): The type of operation.
- `` (): The function selector of the handler/request function.
- `` (): The function selector to execute (NATIVE_TRANSFER_SELECTOR for simple native token transfers).
- `` (): The encoded parameters for the function (empty for simple native token transfers).
- `` (): The payment details to attach to the transaction.

**Returns:**
- The created TxRecord with payment set.


---

### txDelayedApproval

```solidity
function txDelayedApproval(struct EngineBlox.SecureOperationState self, uint256 txId, bytes4 handlerSelector) public nonpayable returns (struct EngineBlox.TxRecord)
```

Approves a pending transaction after the release time.

**Parameters:**
- `` (): The SecureOperationState to modify.
- `` (): The ID of the transaction to approve.
- `` (): The function selector of the handler/approval function.

**Returns:**
- The updated TxRecord.


---

### txCancellation

```solidity
function txCancellation(struct EngineBlox.SecureOperationState self, uint256 txId, bytes4 handlerSelector) public nonpayable returns (struct EngineBlox.TxRecord)
```

Cancels a pending transaction.

**Parameters:**
- `` (): The SecureOperationState to modify.
- `` (): The ID of the transaction to cancel.
- `` (): The function selector of the handler/cancellation function.

**Returns:**
- The updated TxRecord.


---

### txCancellationWithMetaTx

```solidity
function txCancellationWithMetaTx(struct EngineBlox.SecureOperationState self, struct EngineBlox.MetaTransaction metaTx) public nonpayable returns (struct EngineBlox.TxRecord)
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
function txApprovalWithMetaTx(struct EngineBlox.SecureOperationState self, struct EngineBlox.MetaTransaction metaTx) public nonpayable returns (struct EngineBlox.TxRecord)
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
function requestAndApprove(struct EngineBlox.SecureOperationState self, struct EngineBlox.MetaTransaction metaTx) public nonpayable returns (struct EngineBlox.TxRecord)
```

Requests and immediately approves a transaction.

**Parameters:**
- `` (): The SecureOperationState to modify.
- `` (): The meta-transaction containing the signature and nonce.

**Returns:**
- The updated TxRecord.


---

### getRole

```solidity
function getRole(struct EngineBlox.SecureOperationState self, bytes32 role) public view returns (struct EngineBlox.Role)
```

Gets the role by its hash.

**Parameters:**
- `` (): The SecureOperationState to check.
- `` (): The role to get the hash for.

**Returns:**
- The role associated with the hash, or Role(0) if the role doesn&#x27;t exist.


---

### getFunctionSchema

```solidity
function getFunctionSchema(struct EngineBlox.SecureOperationState self, bytes4 functionSelector) public view returns (struct EngineBlox.FunctionSchema)
```

Gets the function schema by selector.

**Parameters:**
- `` (): The SecureOperationState to read from.
- `` (): The function selector to get the schema for.

**Returns:**
- The FunctionSchema struct (memory copy).


---

### createRole

```solidity
function createRole(struct EngineBlox.SecureOperationState self, string roleName, uint256 maxWallets, bool isProtected) public nonpayable
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
function removeRole(struct EngineBlox.SecureOperationState self, bytes32 roleHash) public nonpayable
```

Removes a role from the system.

**Parameters:**
- `` (): The SecureOperationState to modify.
- `` (): The hash of the role to remove.



---

### hasRole

```solidity
function hasRole(struct EngineBlox.SecureOperationState self, bytes32 roleHash, address wallet) public view returns (bool)
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
function assignWallet(struct EngineBlox.SecureOperationState self, bytes32 role, address wallet) public nonpayable
```

Adds a wallet address to a role in the roles mapping.

**Parameters:**
- `` (): The SecureOperationState to modify.
- `` (): The role hash to add the wallet to.
- `` (): The wallet address to add.



---

### updateWallet

```solidity
function updateWallet(struct EngineBlox.SecureOperationState self, bytes32 role, address newWallet, address oldWallet) public nonpayable
```

Updates a wallet in a role (replaces oldWallet with newWallet).

**Parameters:**
- `` (): The SecureOperationState to modify.
- `` (): The role to update.
- `` (): The new wallet address to assign the role to.
- `` (): The old wallet address to remove from the role.



---

### revokeWallet

```solidity
function revokeWallet(struct EngineBlox.SecureOperationState self, bytes32 role, address wallet) public nonpayable
```

Removes a wallet from a role.

**Parameters:**
- `` (): The SecureOperationState to modify.
- `` (): The role to remove the wallet from.
- `` (): The wallet address to remove.



---

### addFunctionToRole

```solidity
function addFunctionToRole(struct EngineBlox.SecureOperationState self, bytes32 roleHash, struct EngineBlox.FunctionPermission functionPermission) public nonpayable
```

Adds a function permission to an existing role.

**Parameters:**
- `` (): The SecureOperationState to modify.
- `` (): The role hash to add the function permission to.
- `` (): The function permission to add.



---

### removeFunctionFromRole

```solidity
function removeFunctionFromRole(struct EngineBlox.SecureOperationState self, bytes32 roleHash, bytes4 functionSelector) public nonpayable
```

Removes a function permission from an existing role.

**Parameters:**
- `` (): The SecureOperationState to modify.
- `` (): The role hash to remove the function permission from.
- `` (): The function selector to remove from the role.



---

### hasActionPermission

```solidity
function hasActionPermission(struct EngineBlox.SecureOperationState self, address wallet, bytes4 functionSelector, enum EngineBlox.TxAction requestedAction) public view returns (bool)
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
function hasAnyRole(struct EngineBlox.SecureOperationState self, address wallet) public view returns (bool)
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
function roleHasActionPermission(struct EngineBlox.SecureOperationState self, bytes32 roleHash, bytes4 functionSelector, enum EngineBlox.TxAction requestedAction) public view returns (bool)
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

### registerFunction

```solidity
function registerFunction(struct EngineBlox.SecureOperationState self, string functionSignature, bytes4 functionSelector, string operationName, uint16 supportedActionsBitmap, bool enforceHandlerRelations, bool isProtected, bytes4[] handlerForSelectors) public nonpayable
```

Registers a function access control with specified permissions.

**Parameters:**
- `` (): The SecureOperationState to check.
- `` (): Function signature (e.g., &quot;transfer(address,uint256)&quot;) or function name.
- `` (): Hash identifier for the function.
- `` (): The name of the operation type.
- `` (): Bitmap of permissions required to execute this function.
- `` (): When true, handlerForSelectors in permissions must match schema.handlerForSelectors (except self-reference).
- `` (): Whether the function schema is protected from removal.
- `` (): Non-empty array required - execution selectors must contain self-reference, handler selectors must point to execution selectors



---

### unregisterFunction

```solidity
function unregisterFunction(struct EngineBlox.SecureOperationState self, bytes4 functionSelector, bool safeRemoval) public nonpayable
```

Unregisters a function schema from the system.

**Parameters:**
- `` (): The SecureOperationState to modify.
- `` (): The function selector to unregister.
- `` (): If true, reverts with ResourceAlreadyExists when any role still references this function.
       The safeRemoval check is done inside this function (iterating supportedRolesSet directly) for efficiency.



---

### addTargetToWhitelist

```solidity
function addTargetToWhitelist(struct EngineBlox.SecureOperationState self, bytes4 functionSelector, address target) public nonpayable
```

Adds a target address to the whitelist for a function selector.

**Parameters:**
- `` (): The SecureOperationState to modify.
- `` (): The function selector whose whitelist will be updated.
- `` (): The target address to add to the whitelist.



---

### removeTargetFromWhitelist

```solidity
function removeTargetFromWhitelist(struct EngineBlox.SecureOperationState self, bytes4 functionSelector, address target) public nonpayable
```

Removes a target address from the whitelist for a function selector.

**Parameters:**
- `` (): The SecureOperationState to modify.
- `` (): The function selector whose whitelist will be updated.
- `` (): The target address to remove from the whitelist.



---

### _validateTargetWhitelist

```solidity
function _validateTargetWhitelist(struct EngineBlox.SecureOperationState self, bytes4 functionSelector, address target) internal view
```

Validates that the target address is whitelisted for the given function selector.
     Internal contract calls (address(this)) are always allowed.

**Parameters:**
- `` (): The SecureOperationState to check.
- `` (): The function selector being executed.
- `` (): The target contract address.



---

### getFunctionWhitelistTargets

```solidity
function getFunctionWhitelistTargets(struct EngineBlox.SecureOperationState self, bytes4 functionSelector) public view returns (address[])
```

Returns all whitelisted target addresses for a function selector.

**Parameters:**
- `` (): The SecureOperationState to check.
- `` (): The function selector to query.

**Returns:**
- Array of whitelisted target addresses.


---

### addMacroSelector

```solidity
function addMacroSelector(struct EngineBlox.SecureOperationState self, bytes4 functionSelector) public nonpayable
```

Adds a function selector to the system macro selectors set.
     Macro selectors are allowed to target address(this) for system-level operations (e.g. native transfer).

**Parameters:**
- `` (): The SecureOperationState to modify.
- `` (): The function selector to add (e.g. NATIVE_TRANSFER_SELECTOR).



---

### isMacroSelector

```solidity
function isMacroSelector(struct EngineBlox.SecureOperationState self, bytes4 functionSelector) public view returns (bool)
```

Returns true if the given function selector is in the system macro selectors set.

**Parameters:**
- `` (): The SecureOperationState to check.
- `` (): The function selector to check.



---

### setHook

```solidity
function setHook(struct EngineBlox.SecureOperationState self, bytes4 functionSelector, address hook) public nonpayable
```

Sets (adds) a hook contract for a function selector.

**Parameters:**
- `` (): The SecureOperationState to modify.
- `` (): The function selector whose hooks will be updated.
- `` (): The hook contract address to add (must not be zero).



---

### clearHook

```solidity
function clearHook(struct EngineBlox.SecureOperationState self, bytes4 functionSelector, address hook) public nonpayable
```

Clears (removes) a hook contract for a function selector.

**Parameters:**
- `` (): The SecureOperationState to modify.
- `` (): The function selector whose hooks will be updated.
- `` (): The hook contract address to remove (must not be zero).



---

### getHooks

```solidity
function getHooks(struct EngineBlox.SecureOperationState self, bytes4 functionSelector) public view returns (address[])
```

Returns all configured hooks for a function selector.

**Parameters:**
- `` (): The SecureOperationState to check.
- `` (): The function selector to query.

**Returns:**
- Array of hook contract addresses.


---

### getFunctionsByOperationType

```solidity
function getFunctionsByOperationType(struct EngineBlox.SecureOperationState self, bytes32 operationType) public view returns (bytes4[])
```

Returns all function schemas that use a specific operation type.

**Parameters:**
- `` (): The SecureOperationState to check.
- `` (): The operation type to search for.

**Returns:**
- Array of function selectors that use the specified operation type.


---

### _getFunctionsByOperationType

```solidity
function _getFunctionsByOperationType(struct EngineBlox.SecureOperationState self, bytes32 operationType) internal view returns (bytes4[])
```

Internal: Returns all function schemas that use a specific operation type.
Used by unregisterFunction and getFunctionsByOperationType.




---

### getPendingTransactions

```solidity
function getPendingTransactions(struct EngineBlox.SecureOperationState self) public view returns (uint256[])
```

Gets all pending transaction IDs

**Parameters:**
- `` (): The SecureOperationState to check

**Returns:**
- Array of pending transaction IDs


---

### getSupportedRoles

```solidity
function getSupportedRoles(struct EngineBlox.SecureOperationState self) public view returns (bytes32[])
```

Gets all supported roles as an array

**Parameters:**
- `` (): The SecureOperationState to check

**Returns:**
- Array of supported role hashes


---

### getSupportedFunctions

```solidity
function getSupportedFunctions(struct EngineBlox.SecureOperationState self) public view returns (bytes4[])
```

Gets all supported function selectors as an array

**Parameters:**
- `` (): The SecureOperationState to check

**Returns:**
- Array of supported function selectors


---

### getSupportedOperationTypes

```solidity
function getSupportedOperationTypes(struct EngineBlox.SecureOperationState self) public view returns (bytes32[])
```

Gets all supported operation types as an array

**Parameters:**
- `` (): The SecureOperationState to check

**Returns:**
- Array of supported operation type hashes


---

### getAuthorizedWalletAt

```solidity
function getAuthorizedWalletAt(struct EngineBlox.SecureOperationState self, bytes32 roleHash, uint256 index) public view returns (address)
```

Gets the authorized wallet at a specific index from a role

**Parameters:**
- `` (): The SecureOperationState to check
- `` (): The role hash to get the wallet from
- `` (): The index position of the wallet to retrieve

**Returns:**
- The authorized wallet address at the specified index


---

### getAuthorizedWallets

```solidity
function getAuthorizedWallets(struct EngineBlox.SecureOperationState self, bytes32 roleHash) public view returns (address[])
```

Gets all authorized wallets for a role

**Parameters:**
- `` (): The SecureOperationState to check
- `` (): The role hash

**Returns:**
- Array of authorized wallet addresses


---

### getRoleFunctionPermissions

```solidity
function getRoleFunctionPermissions(struct EngineBlox.SecureOperationState self, bytes32 roleHash) public view returns (struct EngineBlox.FunctionPermission[])
```

Gets all function permissions for a role as an array for backward compatibility

**Parameters:**
- `` (): The SecureOperationState to check
- `` (): The role hash to get function permissions from

**Returns:**
- Array of function permissions with arrays (for external API)


---

### getWalletRoles

```solidity
function getWalletRoles(struct EngineBlox.SecureOperationState self, address wallet) public view returns (bytes32[])
```

Gets all roles assigned to a wallet using the reverse index

**Parameters:**
- `` (): The SecureOperationState to check
- `` (): The wallet address to get roles for

**Returns:**
- Array of role hashes assigned to the wallet


---

### getSignerNonce

```solidity
function getSignerNonce(struct EngineBlox.SecureOperationState self, address signer) public view returns (uint256)
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
function generateUnsignedForNewMetaTx(struct EngineBlox.SecureOperationState self, struct EngineBlox.TxParams txParams, struct EngineBlox.MetaTxParams metaTxParams) public view returns (struct EngineBlox.MetaTransaction)
```

Creates a meta-transaction for a new operation




---

### generateUnsignedForExistingMetaTx

```solidity
function generateUnsignedForExistingMetaTx(struct EngineBlox.SecureOperationState self, uint256 txId, struct EngineBlox.MetaTxParams metaTxParams) public view returns (struct EngineBlox.MetaTransaction)
```

Creates a meta-transaction for an existing transaction




---

### createMetaTxParams

```solidity
function createMetaTxParams(address handlerContract, bytes4 handlerSelector, enum EngineBlox.TxAction action, uint256 deadline, uint256 maxGasPrice, address signer) public view returns (struct EngineBlox.MetaTxParams)
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
function logTxEvent(struct EngineBlox.SecureOperationState self, uint256 txId, bytes4 functionSelector) public nonpayable
```

Logs an event by emitting TransactionEvent and forwarding to event forwarder

**Parameters:**
- `` (): The SecureOperationState
- `` (): The transaction ID
- `` (): The function selector to emit in the event


**Security:** REENTRANCY PROTECTION: This function is safe from reentrancy because:
        1. It is called AFTER all state changes are complete (in _completeTransaction,
           _cancelTransaction, and txRequest)
        2. It only reads state and emits events - no critical state modifications
        3. The external call to eventForwarder is wrapped in try-catch, so failures
           don&#x27;t affect contract state
        4. Even if eventForwarder is malicious and tries to reenter, all entry functions
           require PENDING status, but transactions are already in COMPLETED/CANCELLED
           status at this point, preventing reentry
        This is a false positive from static analysis - the function is reentrancy-safe.

---

### setEventForwarder

```solidity
function setEventForwarder(struct EngineBlox.SecureOperationState self, address forwarder) public nonpayable
```

Set the event forwarder for this specific instance

**Parameters:**
- `` (): The SecureOperationState
- `` (): The event forwarder address



---

### hasActionInBitmap

```solidity
function hasActionInBitmap(uint16 bitmap, enum EngineBlox.TxAction action) internal pure returns (bool)
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
function addActionToBitmap(uint16 bitmap, enum EngineBlox.TxAction action) internal pure returns (uint16)
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
function createBitmapFromActions(enum EngineBlox.TxAction[] actions) internal pure returns (uint16)
```

Creates a bitmap from an array of TxActions

**Parameters:**
- `` (): Array of TxActions to convert to bitmap

**Returns:**
- Bitmap representation of the actions


---

### convertBitmapToActions

```solidity
function convertBitmapToActions(uint16 bitmap) internal pure returns (enum EngineBlox.TxAction[])
```

Converts a bitmap to an array of TxActions

**Parameters:**
- `` (): The bitmap to convert

**Returns:**
- Array of TxActions represented by the bitmap


---

### _validateAnyRole

```solidity
function _validateAnyRole(struct EngineBlox.SecureOperationState self) internal view
```

Validates that the caller has any role permission

**Parameters:**
- `` (): The SecureOperationState to check



---

### _validateRoleExists

```solidity
function _validateRoleExists(struct EngineBlox.SecureOperationState self, bytes32 roleHash) internal view
```

Validates that a role exists by checking if its hash is not zero

**Parameters:**
- `` (): The SecureOperationState to check
- `` (): The role hash to validate



---

### _validateFunctionSchemaExists

```solidity
function _validateFunctionSchemaExists(struct EngineBlox.SecureOperationState self, bytes4 functionSelector) internal view
```

Validates that a function schema exists for the given selector.

**Parameters:**
- `` (): The SecureOperationState to check.
- `` (): The function selector to validate.



---

### _validateTxStatus

```solidity
function _validateTxStatus(struct EngineBlox.SecureOperationState self, uint256 txId, enum EngineBlox.TxStatus expectedStatus) internal view
```

Validates that a transaction is in the expected status

**Parameters:**
- `` (): The SecureOperationState to check
- `` (): The transaction ID to validate
- `` (): The expected transaction status



---

### _validateExecutionAndHandlerPermissions

```solidity
function _validateExecutionAndHandlerPermissions(struct EngineBlox.SecureOperationState self, address wallet, bytes4 executionSelector, bytes4 handlerSelector, enum EngineBlox.TxAction action) internal view
```

Validates that a wallet has permission for both execution selector and handler selector for a given action

**Parameters:**
- `` (): The SecureOperationState to check
- `` (): The wallet address to check permissions for
- `` (): The execution function selector (underlying operation)
- `` (): The handler/calling function selector
- `` (): The action to validate permissions for



---

### _validateHandlerForSelectors

```solidity
function _validateHandlerForSelectors(struct EngineBlox.SecureOperationState self, bytes4 functionSelector, bytes4[] handlerForSelectors) internal view
```

Validates that all handlerForSelectors are present in the schema's handlerForSelectors array

**Parameters:**
- `` (): The SecureOperationState to validate against
- `` (): The function selector for which the permission is defined
- `` (): The handlerForSelectors array from the permission to validate



---

### _validateMetaTxPermissions

```solidity
function _validateMetaTxPermissions(struct EngineBlox.SecureOperationState self, struct EngineBlox.FunctionPermission functionPermission) internal view
```

Validates meta-transaction permissions for a function permission

**Parameters:**
- `` (): The secure operation state
- `` (): The function permission to validate


**Security:** This function prevents conflicting meta-sign and meta-execute permissions

---

### _validateMetaTxAction

```solidity
function _validateMetaTxAction(struct EngineBlox.MetaTransaction metaTx, enum EngineBlox.TxAction expectedAction) internal pure
```

Validates that the meta-transaction uses the expected signer action for the current workflow.

**Parameters:**
- `` (): The meta-transaction to validate.
- `` (): The TxAction that must be used as the signer action.


**Security:** Enforces strict separation between SIGN_META_REQUEST_AND_APPROVE,
                 SIGN_META_APPROVE and SIGN_META_CANCEL workflows.

---

### _validateActionsSupportedByFunction

```solidity
function _validateActionsSupportedByFunction(struct EngineBlox.SecureOperationState self, bytes4 functionSelector, uint16 bitmap) internal view
```

Validates that all actions present in the bitmap are supported by the function schema.

**Parameters:**
- `` (): The SecureOperationState to check.
- `` (): The function selector to check.
- `` (): The granted actions bitmap to validate.



---

### _convertAddressSetToArray

```solidity
function _convertAddressSetToArray(struct EnumerableSet.AddressSet set) internal view returns (address[])
```

Generic helper to convert AddressSet to array

**Parameters:**
- `` (): The EnumerableSet.AddressSet to convert

**Returns:**
- Array of address values


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

### _convertBytes4SetToArray

```solidity
function _convertBytes4SetToArray(struct EnumerableSet.Bytes32Set set) internal view returns (bytes4[])
```

Generic helper to convert Bytes32Set (containing bytes4 selectors) to bytes4 array

**Parameters:**
- `` (): The EnumerableSet.Bytes32Set to convert (stores bytes4 selectors as bytes32)

**Returns:**
- Array of bytes4 function selectors


---

### _emptyPayment

```solidity
function _emptyPayment() internal pure returns (struct EngineBlox.PaymentDetails)
```

Returns an empty PaymentDetails struct for use when no payment is attached.


**Returns:**
- Empty payment details (recipient and amounts zero).


---


## Events

### TransactionEvent

```solidity
event TransactionEvent(uint256 txId, bytes4 functionHash, enum EngineBlox.TxStatus status, address requester, address target, bytes32 operationType)
```




---


## Structs


## Enums


