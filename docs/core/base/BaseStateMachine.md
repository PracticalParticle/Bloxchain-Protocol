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
Implementing contracts can call StateAbstraction library functions directly for
transaction management operations.

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

### _requestStandardTransaction

```solidity
function _requestStandardTransaction(address requester, address target, uint256 gasLimit, bytes32 operationType, bytes4 functionSelector, bytes params) internal nonpayable returns (struct StateAbstraction.TxRecord)
```

Centralized function to request a standard transaction with common validation

**Parameters:**
- `` (): The address requesting the transaction
- `` (): The type of operation
- `` (): The function selector for execution options
- `` (): The encoded parameters for the function

**Returns:**
- The created transaction record


---

### _requestRawTransaction

```solidity
function _requestRawTransaction(address requester, address target, uint256 gasLimit, bytes32 operationType, bytes rawTxData) internal nonpayable returns (struct StateAbstraction.TxRecord)
```

Centralized function to request a raw transaction with RAW execution type

**Parameters:**
- `` (): The address requesting the transaction
- `` (): The target contract address
- `` (): The gas limit for execution
- `` (): The type of operation
- `` (): The raw transaction data

**Returns:**
- The created transaction record


---

### _requestSimpleTransaction

```solidity
function _requestSimpleTransaction(address requester, address target, uint256 value, uint256 gasLimit, bytes32 operationType) internal nonpayable returns (struct StateAbstraction.TxRecord)
```

Centralized function to request a simple transaction with NONE execution type

**Parameters:**
- `` (): The address requesting the transaction
- `` (): The target contract address
- `` (): The ETH value to send
- `` (): The gas limit for execution
- `` (): The type of operation

**Returns:**
- The created transaction record


---

### _approveTransaction

```solidity
function _approveTransaction(uint256 txId, bytes32 expectedOperationType) internal nonpayable returns (struct StateAbstraction.TxRecord)
```

Centralized function to approve a pending transaction after release time

**Parameters:**
- `` (): The transaction ID
- `` (): The expected operation type for validation

**Returns:**
- The updated transaction record


---

### _approveTransactionWithMetaTx

```solidity
function _approveTransactionWithMetaTx(struct StateAbstraction.MetaTransaction metaTx, bytes32 expectedOperationType, bytes4 requiredSelector, enum StateAbstraction.TxAction requiredAction) internal nonpayable returns (struct StateAbstraction.TxRecord)
```

Centralized function to approve a transaction using meta-transaction

**Parameters:**
- `` (): The meta-transaction
- `` (): The expected operation type for validation
- `` (): The required handler selector for validation
- `` (): The required action for permission checking

**Returns:**
- The updated transaction record


---

### _cancelTransaction

```solidity
function _cancelTransaction(uint256 txId, bytes32 expectedOperationType) internal nonpayable returns (struct StateAbstraction.TxRecord)
```

Centralized function to cancel a pending transaction

**Parameters:**
- `` (): The transaction ID
- `` (): The expected operation type for validation

**Returns:**
- The updated transaction record


---

### _cancelTransactionWithMetaTx

```solidity
function _cancelTransactionWithMetaTx(struct StateAbstraction.MetaTransaction metaTx, bytes32 expectedOperationType, bytes4 requiredSelector, enum StateAbstraction.TxAction requiredAction) internal nonpayable returns (struct StateAbstraction.TxRecord)
```

Centralized function to cancel a transaction using meta-transaction

**Parameters:**
- `` (): The meta-transaction
- `` (): The expected operation type for validation
- `` (): The required handler selector for validation
- `` (): The required action for permission checking

**Returns:**
- The updated transaction record


---

### _requestAndApproveTransaction

```solidity
function _requestAndApproveTransaction(struct StateAbstraction.MetaTransaction metaTx, bytes4 requiredSelector, enum StateAbstraction.TxAction requiredAction) internal nonpayable returns (struct StateAbstraction.TxRecord)
```

Centralized function to request and approve a transaction using meta-transaction

**Parameters:**
- `` (): The meta-transaction
- `` (): The required handler selector for validation
- `` (): The required action for permission checking

**Returns:**
- The transaction record


---

### createMetaTxParams

```solidity
function createMetaTxParams(address handlerContract, bytes4 handlerSelector, enum StateAbstraction.TxAction action, uint256 deadline, uint256 maxGasPrice, address signer) public view returns (struct StateAbstraction.MetaTxParams)
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
function generateUnsignedMetaTransactionForNew(address requester, address target, uint256 value, uint256 gasLimit, bytes32 operationType, enum StateAbstraction.ExecutionType executionType, bytes executionOptions, struct StateAbstraction.MetaTxParams metaTxParams) public view returns (struct StateAbstraction.MetaTransaction)
```

Generates an unsigned meta-transaction for a new operation

**Parameters:**
- `` (): The address requesting the operation
- `` (): The target contract address
- `` (): The ETH value to send
- `` (): The gas limit for execution
- `` (): The type of operation
- `` (): The type of execution (STANDARD or RAW)
- `` (): The encoded execution options
- `` (): The meta-transaction parameters

**Returns:**
- The unsigned meta-transaction


---

### generateUnsignedMetaTransactionForExisting

```solidity
function generateUnsignedMetaTransactionForExisting(uint256 txId, struct StateAbstraction.MetaTxParams metaTxParams) public view returns (struct StateAbstraction.MetaTransaction)
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
function getTransactionHistory(uint256 fromTxId, uint256 toTxId) public view returns (struct StateAbstraction.TxRecord[])
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
function getTransaction(uint256 txId) public view returns (struct StateAbstraction.TxRecord)
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

### isActionSupportedByFunction

```solidity
function isActionSupportedByFunction(bytes4 functionSelector, enum StateAbstraction.TxAction action) public view returns (bool)
```

Returns if an action is supported by a function

**Parameters:**
- `` (): The function selector to check
- `` (): The action to check

**Returns:**
- True if the action is supported by the function, false otherwise


---

### getActiveRolePermissions

```solidity
function getActiveRolePermissions(bytes32 roleHash) public view returns (struct StateAbstraction.FunctionPermission[])
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

### _updateAssignedWallet

```solidity
function _updateAssignedWallet(bytes32 roleHash, address newWallet, address oldWallet) internal nonpayable
```

Centralized function to update assigned wallet for a role

**Parameters:**
- `` (): The role hash
- `` (): The new wallet address
- `` (): The old wallet address



---

### _updateTimeLockPeriod

```solidity
function _updateTimeLockPeriod(uint256 newTimeLockPeriodSec) internal nonpayable
```

Centralized function to update time lock period

**Parameters:**
- `` (): The new time lock period in seconds



---

### _createStandardExecutionOptions

```solidity
function _createStandardExecutionOptions(bytes4 functionSelector, bytes params) internal pure returns (bytes)
```

Centralized function to create standard execution options

**Parameters:**
- `` (): The function selector
- `` (): The encoded parameters

**Returns:**
- The execution options


---

### _createRawExecutionOptions

```solidity
function _createRawExecutionOptions(bytes rawTxData) internal pure returns (bytes)
```

Centralized function to create raw execution options

**Parameters:**
- `` (): The raw transaction data

**Returns:**
- The execution options


---

### _loadDefinitions

```solidity
function _loadDefinitions(struct StateAbstraction.FunctionSchema[] functionSchemas, bytes32[] roleHashes, struct StateAbstraction.FunctionPermission[] functionPermissions) internal nonpayable
```

Loads definitions directly into the secure state
This function initializes the secure state with all predefined definitions

**Parameters:**
- `` (): Array of function schema definitions
- `` (): Array of role hashes
- `` (): Array of function permissions (parallel to roleHashes)



---

### _getSecureState

```solidity
function _getSecureState() internal view returns (struct StateAbstraction.SecureOperationState)
```

Internal function to get the secure state


**Returns:**
- secureState The secure state


---

### _hasActionPermission

```solidity
function _hasActionPermission(address caller, bytes4 functionSelector, enum StateAbstraction.TxAction action) internal view returns (bool)
```

Internal function to check if an address has action permission

**Parameters:**
- `` (): The address to check
- `` (): The function selector
- `` (): The action to check

**Returns:**
- True if the caller has permission, false otherwise


---


## Events

### TransactionRequested

```solidity
event TransactionRequested(uint256 txId, address requester, bytes32 operationType, uint256 releaseTime)
```




---

### TransactionApproved

```solidity
event TransactionApproved(uint256 txId, bytes32 operationType, address approver)
```




---

### TransactionCancelled

```solidity
event TransactionCancelled(uint256 txId, bytes32 operationType, address canceller)
```




---

### TransactionExecuted

```solidity
event TransactionExecuted(uint256 txId, bytes32 operationType, bool success)
```




---


## Structs


## Enums


