# Solidity API

# BaseStateMachine

Core state machine functionality for secure multi-phase operations

This contract provides the foundational state machine capabilities that can be extended
by security-specific contracts. It handles:
- State initialization and management
- Meta-transaction utilities and parameter creation
- State queries and transaction history
- Role-based access control queries
- System state information

The contract is designed to be inherited by security-specific contracts that implement
their own operation types and business logic while leveraging the core state machine.
All access to EngineBlox library functions is centralized through BaseStateMachine
wrapper functions to ensure consistency and maintainability.

Key Features:
- State initialization with role and permission setup
- Meta-transaction parameter creation and generation
- Comprehensive state queries and transaction history
- Role and permission validation utilities
- System configuration queries
- Event forwarding for external monitoring




## Functions

### _initializeBaseStateMachine

```solidity
function _initializeBaseStateMachine(address initialOwner, address broadcaster, address recovery, uint256 timeLockPeriodSec, address eventForwarder) internal nonpayable
```



**Parameters:**
- `` (): The initial owner address
- `` (): The broadcaster address
- `` (): The recovery address
- `` (): The timelock period in seconds
- `` (): The event forwarder address



---

### owner

```solidity
function owner() public view returns (address)
```

Returns the owner of the contract


**Returns:**
- The owner of the contract


---

### getBroadcasters

```solidity
function getBroadcasters() public view returns (address[])
```

Returns all broadcaster addresses for the BROADCASTER_ROLE


**Returns:**
- Array of broadcaster addresses


---

### getRecovery

```solidity
function getRecovery() public view returns (address)
```

Returns the recovery address


**Returns:**
- The recovery address


---

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) public view returns (bool)
```

See {IERC165-supportsInterface}.




---

### _requestTransaction

```solidity
function _requestTransaction(address requester, address target, uint256 value, uint256 gasLimit, bytes32 operationType, bytes4 functionSelector, bytes params) internal nonpayable returns (struct EngineBlox.TxRecord)
```

Centralized function to request a transaction with common validation

**Parameters:**
- `` (): The address requesting the transaction
- `` (): The target contract address
- `` (): The ETH value to send (0 for standard function calls)
- `` (): The gas limit for execution
- `` (): The type of operation
- `` (): The function selector for execution (NATIVE_TRANSFER_SELECTOR for simple native token transfers)
- `` (): The encoded parameters for the function (empty for simple native token transfers)

**Returns:**
- The created transaction record


---

### _requestTransactionWithPayment

```solidity
function _requestTransactionWithPayment(address requester, address target, uint256 value, uint256 gasLimit, bytes32 operationType, bytes4 functionSelector, bytes params, struct EngineBlox.PaymentDetails paymentDetails) internal nonpayable returns (struct EngineBlox.TxRecord)
```

Centralized function to request a transaction with payment details attached from the start

**Parameters:**
- `` (): The address requesting the transaction
- `` (): The target contract address
- `` (): The ETH value to send (0 for standard function calls)
- `` (): The gas limit for execution
- `` (): The type of operation
- `` (): The function selector for execution (NATIVE_TRANSFER_SELECTOR for simple native token transfers)
- `` (): The encoded parameters for the function (empty for simple native token transfers)
- `` (): The payment details to attach to the transaction

**Returns:**
- The created transaction record with payment set


---

### _approveTransaction

```solidity
function _approveTransaction(uint256 txId) internal nonpayable returns (struct EngineBlox.TxRecord)
```

Centralized function to approve a pending transaction after release time

**Parameters:**
- `` (): The transaction ID

**Returns:**
- The updated transaction record


---

### _approveTransactionWithMetaTx

```solidity
function _approveTransactionWithMetaTx(struct EngineBlox.MetaTransaction metaTx) internal nonpayable returns (struct EngineBlox.TxRecord)
```

Centralized function to approve a transaction using meta-transaction

**Parameters:**
- `` (): The meta-transaction

**Returns:**
- The updated transaction record


---

### _cancelTransaction

```solidity
function _cancelTransaction(uint256 txId) internal nonpayable returns (struct EngineBlox.TxRecord)
```

Centralized function to cancel a pending transaction

**Parameters:**
- `` (): The transaction ID

**Returns:**
- The updated transaction record


---

### _cancelTransactionWithMetaTx

```solidity
function _cancelTransactionWithMetaTx(struct EngineBlox.MetaTransaction metaTx) internal nonpayable returns (struct EngineBlox.TxRecord)
```

Centralized function to cancel a transaction using meta-transaction

**Parameters:**
- `` (): The meta-transaction

**Returns:**
- The updated transaction record


---

### _requestAndApproveTransaction

```solidity
function _requestAndApproveTransaction(struct EngineBlox.MetaTransaction metaTx) internal nonpayable returns (struct EngineBlox.TxRecord)
```

Centralized function to request and approve a transaction using meta-transaction

**Parameters:**
- `` (): The meta-transaction

**Returns:**
- The transaction record


---

### _postActionHook

```solidity
function _postActionHook(struct EngineBlox.TxRecord txRecord) internal nonpayable
```

Post-action hook invoked after any transaction operation that produces a TxRecord.
     Override in derived contracts to add centralized post-tx logic (e.g. notifications, side effects).

**Parameters:**
- `` (): The transaction record produced by the operation



---

### _setHook

```solidity
function _setHook(bytes4 functionSelector, address hook) internal nonpayable
```

Sets the hook contract for a function selector (internal; no access control).
     Extensions (e.g. HookManager) may expose an external setHook with owner check.

**Parameters:**
- `` (): The function selector
- `` (): The hook contract address (must not be zero)



---

### _clearHook

```solidity
function _clearHook(bytes4 functionSelector, address hook) internal nonpayable
```

Clears the hook contract for a function selector (internal; no access control).
     Extensions may expose an external clearHook with owner check.

**Parameters:**
- `` (): The function selector
- `` (): The hook contract address to remove (must not be zero)



---

### getHooks

```solidity
function getHooks(bytes4 functionSelector) public view returns (address[])
```

Returns all configured hooks for a function selector

**Parameters:**
- `` (): The function selector

**Returns:**
- Array of hook contract addresses


---

### createMetaTxParams

```solidity
function createMetaTxParams(address handlerContract, bytes4 handlerSelector, enum EngineBlox.TxAction action, uint256 deadline, uint256 maxGasPrice, address signer) public view returns (struct EngineBlox.MetaTxParams)
```

Creates meta-transaction parameters with specified values

**Parameters:**
- `` (): The contract that will handle the meta-transaction
- `` (): The function selector for the handler
- `` (): The transaction action type
- `` (): The timestamp after which the meta-transaction expires
- `` (): The maximum gas price allowed for execution
- `` (): The address that will sign the meta-transaction

**Returns:**
- The formatted meta-transaction parameters


---

### generateUnsignedMetaTransactionForNew

```solidity
function generateUnsignedMetaTransactionForNew(address requester, address target, uint256 value, uint256 gasLimit, bytes32 operationType, bytes4 executionSelector, bytes executionParams, struct EngineBlox.MetaTxParams metaTxParams) public view returns (struct EngineBlox.MetaTransaction)
```

Generates an unsigned meta-transaction for a new operation

**Parameters:**
- `` (): The address requesting the operation
- `` (): The target contract address
- `` (): The ETH value to send
- `` (): The gas limit for execution
- `` (): The type of operation
- `` (): The function selector to execute (NATIVE_TRANSFER_SELECTOR for simple native token transfers)
- `` (): The encoded parameters for the function (empty for simple native token transfers)
- `` (): The meta-transaction parameters

**Returns:**
- The unsigned meta-transaction


---

### generateUnsignedMetaTransactionForExisting

```solidity
function generateUnsignedMetaTransactionForExisting(uint256 txId, struct EngineBlox.MetaTxParams metaTxParams) public view returns (struct EngineBlox.MetaTransaction)
```

Generates an unsigned meta-transaction for an existing transaction

**Parameters:**
- `` (): The ID of the existing transaction
- `` (): The meta-transaction parameters

**Returns:**
- The unsigned meta-transaction


---

### getTransactionHistory

```solidity
function getTransactionHistory(uint256 fromTxId, uint256 toTxId) public view returns (struct EngineBlox.TxRecord[])
```

Gets transaction history within a specified range

**Parameters:**
- `` (): The starting transaction ID (inclusive)
- `` (): The ending transaction ID (inclusive)

**Returns:**
- The transaction history within the specified range


---

### getTransaction

```solidity
function getTransaction(uint256 txId) public view returns (struct EngineBlox.TxRecord)
```

Gets a transaction by ID

**Parameters:**
- `` (): The transaction ID

**Returns:**
- The transaction record


---

### getPendingTransactions

```solidity
function getPendingTransactions() public view returns (uint256[])
```

Gets all pending transaction IDs


**Returns:**
- Array of pending transaction IDs


---

### getRole

```solidity
function getRole(bytes32 roleHash) public view returns (string, bytes32, uint256, uint256, bool)
```

Gets the basic role information by its hash

**Parameters:**
- `` (): The hash of the role to get

**Returns:**
- The name of the role
- The hash of the role
- The maximum number of wallets allowed for this role
- The current number of wallets assigned to this role
- Whether the role is protected from removal


---

### hasRole

```solidity
function hasRole(bytes32 roleHash, address wallet) public view returns (bool)
```

Returns if a wallet is authorized for a role

**Parameters:**
- `` (): The hash of the role to check
- `` (): The wallet address to check

**Returns:**
- True if the wallet is authorized for the role, false otherwise


---

### getWalletRoles

```solidity
function getWalletRoles(address wallet) public view returns (bytes32[])
```

Gets all roles assigned to a wallet

**Parameters:**
- `` (): The wallet address to get roles for

**Returns:**
- Array of role hashes assigned to the wallet


---

### getAuthorizedWallets

```solidity
function getAuthorizedWallets(bytes32 roleHash) public view returns (address[])
```

Gets all authorized wallets for a role

**Parameters:**
- `` (): The role hash to get wallets for

**Returns:**
- Array of authorized wallet addresses


---

### getFunctionSchema

```solidity
function getFunctionSchema(bytes4 functionSelector) external view returns (struct EngineBlox.FunctionSchema)
```

Gets function schema information

**Parameters:**
- `` (): The function selector to get information for

**Returns:**
- The full FunctionSchema struct (functionSignature, functionSelector, operationType, operationName, supportedActionsBitmap, enforceHandlerRelations, isProtected, handlerForSelectors)


---

### getActiveRolePermissions

```solidity
function getActiveRolePermissions(bytes32 roleHash) public view returns (struct EngineBlox.FunctionPermission[])
```

Gets the function permissions for a specific role

**Parameters:**
- `` (): The hash of the role to get permissions for

**Returns:**
- The function permissions array for the role


---

### getSignerNonce

```solidity
function getSignerNonce(address signer) public view returns (uint256)
```

Gets the current nonce for a specific signer

**Parameters:**
- `` (): The address of the signer

**Returns:**
- The current nonce for the signer


---

### getSupportedOperationTypes

```solidity
function getSupportedOperationTypes() public view returns (bytes32[])
```

Returns the supported operation types


**Returns:**
- The supported operation types


---

### getSupportedRoles

```solidity
function getSupportedRoles() public view returns (bytes32[])
```

Returns the supported roles list


**Returns:**
- The supported roles list


---

### getSupportedFunctions

```solidity
function getSupportedFunctions() public view returns (bytes4[])
```

Returns the supported functions list


**Returns:**
- The supported functions list


---

### getTimeLockPeriodSec

```solidity
function getTimeLockPeriodSec() public view returns (uint256)
```

Returns the time lock period


**Returns:**
- The time lock period in seconds


---

### initialized

```solidity
function initialized() public view returns (bool)
```

Returns whether the contract is initialized


**Returns:**
- bool True if the contract is initialized, false otherwise


---

### _getAuthorizedWalletAt

```solidity
function _getAuthorizedWalletAt(bytes32 roleHash, uint256 index) internal view returns (address)
```

Centralized function to get authorized wallet at specific index

**Parameters:**
- `` (): The role hash
- `` (): The wallet index

**Returns:**
- The authorized wallet address


---

### _getAuthorizedWallets

```solidity
function _getAuthorizedWallets(bytes32 roleHash) internal view returns (address[])
```

Centralized function to get all authorized wallets for a role

**Parameters:**
- `` (): The role hash

**Returns:**
- Array of authorized wallet addresses


---

### _createRole

```solidity
function _createRole(string roleName, uint256 maxWallets, bool isProtected) internal nonpayable returns (bytes32)
```

Centralized function to create a new role

**Parameters:**
- `` (): The name of the role
- `` (): The maximum number of wallets allowed for this role
- `` (): Whether the role is protected from removal

**Returns:**
- roleHash The hash of the created role


---

### _removeRole

```solidity
function _removeRole(bytes32 roleHash) internal nonpayable
```

Centralized function to remove a role

**Parameters:**
- `` (): The hash of the role to remove



---

### _assignWallet

```solidity
function _assignWallet(bytes32 roleHash, address wallet) internal nonpayable
```

Centralized function to assign a wallet to a role

**Parameters:**
- `` (): The role hash
- `` (): The wallet address to assign



---

### _revokeWallet

```solidity
function _revokeWallet(bytes32 roleHash, address wallet) internal nonpayable
```

Centralized function to revoke a wallet from a role

**Parameters:**
- `` (): The role hash
- `` (): The wallet address to revoke



---

### _updateWallet

```solidity
function _updateWallet(bytes32 roleHash, address newWallet, address oldWallet) internal nonpayable
```

Centralized function to update wallet for a role (replaces oldWallet with newWallet).

**Parameters:**
- `` (): The role hash
- `` (): The new wallet address
- `` (): The old wallet address



---

### _updateTimeLockPeriod

```solidity
function _updateTimeLockPeriod(uint256 newTimeLockPeriodSec) internal nonpayable
```

Centralized function to update the time lock period

**Parameters:**
- `` (): The new time lock period in seconds



---

### _registerFunction

```solidity
function _registerFunction(string functionSignature, bytes4 functionSelector, string operationName, uint16 supportedActionsBitmap, bool enforceHandlerRelations, bool isProtected, bytes4[] handlerForSelectors) internal nonpayable
```

Centralized function to register a function schema

**Parameters:**
- `` (): The function signature
- `` (): The function selector
- `` (): The operation name
- `` (): The bitmap of supported actions
- `` (): Whether to enforce strict handler/schema alignment
- `` (): Whether the function schema is protected
- `` (): Array of handler selectors



---

### _unregisterFunction

```solidity
function _unregisterFunction(bytes4 functionSelector, bool safeRemoval) internal nonpayable
```

Centralized function to unregister a function schema

**Parameters:**
- `` (): The function selector to unregister
- `` (): Whether to perform safe removal (check for role references)



---

### _addFunctionToRole

```solidity
function _addFunctionToRole(bytes32 roleHash, struct EngineBlox.FunctionPermission functionPermission) internal nonpayable
```

Centralized function to add a function permission to a role

**Parameters:**
- `` (): The role hash
- `` (): The function permission to add



---

### _removeFunctionFromRole

```solidity
function _removeFunctionFromRole(bytes32 roleHash, bytes4 functionSelector) internal nonpayable
```

Centralized function to remove a function permission from a role

**Parameters:**
- `` (): The role hash
- `` (): The function selector to remove



---

### _validateAnyRole

```solidity
function _validateAnyRole() internal view
```

Centralized function to validate that the caller has any role




---

### _validateRoleExists

```solidity
function _validateRoleExists(bytes32 roleHash) internal view
```

Centralized function to validate that a role exists

**Parameters:**
- `` (): The role hash to validate



---

### _validateExecuteBySelf

```solidity
function _validateExecuteBySelf() internal view
```

Centralized function to validate that the caller is the contract itself (for execution-only entry points).




---

### _validateBatchSize

```solidity
function _validateBatchSize(uint256 length) internal pure
```

Centralized function to validate batch size against EngineBlox.MAX_BATCH_SIZE.

**Parameters:**
- `` (): The batch length to validate



---

### _addMacroSelector

```solidity
function _addMacroSelector(bytes4 functionSelector) internal nonpayable
```

Adds a function selector to the system macro selectors set.
     Macro selectors are allowed to target address(this) for system-level operations.

**Parameters:**
- `` (): The function selector to add (e.g. NATIVE_TRANSFER_SELECTOR).



---

### _isMacroSelector

```solidity
function _isMacroSelector(bytes4 functionSelector) internal view returns (bool)
```

Returns true if the given function selector is in the system macro selectors set.

**Parameters:**
- `` (): The function selector to check.



---

### _convertBitmapToActions

```solidity
function _convertBitmapToActions(uint16 bitmap) internal pure returns (enum EngineBlox.TxAction[])
```

Centralized function to convert a bitmap to an array of actions

**Parameters:**
- `` (): The bitmap to convert

**Returns:**
- Array of TxAction values


---

### _createBitmapFromActions

```solidity
function _createBitmapFromActions(enum EngineBlox.TxAction[] actions) internal pure returns (uint16)
```

Centralized function to create a bitmap from an array of actions

**Parameters:**
- `` (): Array of TxAction values

**Returns:**
- The bitmap representation


---

### _addTargetToWhitelist

```solidity
function _addTargetToWhitelist(bytes4 functionSelector, address target) internal nonpayable
```

Centralized function to add a target address to the whitelist for a function selector

**Parameters:**
- `` (): The function selector
- `` (): The target address to whitelist



---

### _removeTargetFromWhitelist

```solidity
function _removeTargetFromWhitelist(bytes4 functionSelector, address target) internal nonpayable
```

Centralized function to remove a target address from the whitelist for a function selector

**Parameters:**
- `` (): The function selector
- `` (): The target address to remove



---

### getFunctionWhitelistTargets

```solidity
function getFunctionWhitelistTargets(bytes4 functionSelector) public view returns (address[])
```

Gets all whitelisted targets for a function selector

**Parameters:**
- `` (): The function selector

**Returns:**
- Array of whitelisted target addresses


---

### _loadDefinitions

```solidity
function _loadDefinitions(struct EngineBlox.FunctionSchema[] functionSchemas, bytes32[] roleHashes, struct EngineBlox.FunctionPermission[] functionPermissions, bool requireProtected) internal nonpayable
```

Loads definitions directly into the secure state
This function initializes the secure state with all predefined definitions

**Parameters:**
- `` (): Array of function schema definitions
- `` (): Array of role hashes
- `` (): Array of function permissions (parallel to roleHashes)
- `` (): When true, all function schemas must be protected; reverts if any is not



---

### _getSecureState

```solidity
function _getSecureState() internal view returns (struct EngineBlox.SecureOperationState)
```

Internal function to get the secure state


**Returns:**
- secureState The secure state


---

### _hasActionPermission

```solidity
function _hasActionPermission(address caller, bytes4 functionSelector, enum EngineBlox.TxAction action) internal view returns (bool)
```

Internal function to check if an address has action permission

**Parameters:**
- `` (): The address to check
- `` (): The function selector
- `` (): The action to check

**Returns:**
- True if the caller has permission, false otherwise


---

### _validateBroadcaster

```solidity
function _validateBroadcaster(address caller) internal view
```

Internal helper to validate that a caller has the BROADCASTER_ROLE

**Parameters:**
- `` (): The address to validate



---

### _logComponentEvent

```solidity
function _logComponentEvent(bytes data) internal nonpayable
```

Centralized component event logging for SecureOwnable, GuardController, RuntimeRBAC.
Uses msg.sig as the event index so callers only pass encoded data.

**Parameters:**
- `` (): abi.encode of event parameters



---


## Events

### ComponentEvent

```solidity
event ComponentEvent(bytes4 functionSelector, bytes data)
```

Unified component event for SecureOwnable, GuardController, RuntimeRBAC.
Indexers filter by functionSelector (msg.sig at emit site) and decode data (abi-encoded payload).

**Parameters:**
- `` (): The function selector (msg.sig) at the emit site; used by indexers to filter
- `` (): ABI-encoded payload associated with the event

---


## Structs


## Enums


