# Solidity API

# IBaseStateMachine

Interface for BaseStateMachine functionality




## Functions

### createMetaTxParams

```solidity
function createMetaTxParams(address handlerContract, bytes4 handlerSelector, enum StateAbstraction.TxAction action, uint256 deadline, uint256 maxGasPrice, address signer) external view returns (struct StateAbstraction.MetaTxParams)
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
function generateUnsignedMetaTransactionForNew(address requester, address target, uint256 value, uint256 gasLimit, bytes32 operationType, enum StateAbstraction.ExecutionType executionType, bytes executionOptions, struct StateAbstraction.MetaTxParams metaTxParams) external view returns (struct StateAbstraction.MetaTransaction)
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
function generateUnsignedMetaTransactionForExisting(uint256 txId, struct StateAbstraction.MetaTxParams metaTxParams) external view returns (struct StateAbstraction.MetaTransaction)
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
function getTransactionHistory(uint256 fromTxId, uint256 toTxId) external view returns (struct StateAbstraction.TxRecord[])
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
function getTransaction(uint256 txId) external view returns (struct StateAbstraction.TxRecord)
```

Gets a transaction by ID

**Parameters:**
- `` (): The transaction ID

**Returns:**
- The transaction record


---

### getPendingTransactions

```solidity
function getPendingTransactions() external view returns (uint256[])
```

Gets all pending transaction IDs


**Returns:**
- Array of pending transaction IDs


---

### hasRole

```solidity
function hasRole(bytes32 roleHash, address wallet) external view returns (bool)
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
function isActionSupportedByFunction(bytes4 functionSelector, enum StateAbstraction.TxAction action) external view returns (bool)
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
function getActiveRolePermissions(bytes32 roleHash) external view returns (struct StateAbstraction.FunctionPermission[])
```

Gets the function permissions for a specific role

**Parameters:**
- `` (): The hash of the role to get permissions for

**Returns:**
- The function permissions array for the role


---

### getSignerNonce

```solidity
function getSignerNonce(address signer) external view returns (uint256)
```

Gets the current nonce for a specific signer

**Parameters:**
- `` (): The address of the signer

**Returns:**
- The current nonce for the signer


---

### getSupportedOperationTypes

```solidity
function getSupportedOperationTypes() external view returns (bytes32[])
```

Returns the supported operation types


**Returns:**
- The supported operation types


---

### getSupportedRoles

```solidity
function getSupportedRoles() external view returns (bytes32[])
```

Returns the supported roles list


**Returns:**
- The supported roles list


---

### getSupportedFunctions

```solidity
function getSupportedFunctions() external view returns (bytes4[])
```

Returns the supported functions list


**Returns:**
- The supported functions list


---

### getTimeLockPeriodSec

```solidity
function getTimeLockPeriodSec() external view returns (uint256)
```

Returns the time lock period


**Returns:**
- The time lock period in seconds


---

### initialized

```solidity
function initialized() external view returns (bool)
```

Returns whether the contract is initialized


**Returns:**
- bool True if the contract is initialized, false otherwise


---


## Events


## Structs


## Enums


