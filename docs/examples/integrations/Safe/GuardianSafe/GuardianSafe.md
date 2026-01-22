# Solidity API

# ISafe






## Functions

### execTransaction

```solidity
function execTransaction(address to, uint256 value, bytes data, uint8 operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address payable refundReceiver, bytes signatures) external payable returns (bool)
```






---


## Events


## Structs


## Enums


# ITransactionGuard






## Functions

### checkTransaction

```solidity
function checkTransaction(address to, uint256 value, bytes data, enum ITransactionGuard.Operation operation, uint256 safeTxGas, uint256 baseGas, uint256 gasPrice, address gasToken, address payable refundReceiver, bytes signatures, address msgSender) external nonpayable
```






---

### checkAfterExecution

```solidity
function checkAfterExecution(bytes32 hash, bool success) external nonpayable
```






---


## Events


## Structs


## Enums


# GuardianSafe

A secure wrapper for Safe wallet functionality using SecureOwnable security framework.
Implements time-locked operations and meta-transaction support for enhanced security.




## Functions

### initialize

```solidity
function initialize(address _safe, address initialOwner, address broadcaster, address recovery, uint256 timeLockPeriodSec, address eventForwarder) public nonpayable
```



**Parameters:**
- `` (): The Safe contract address
- `` (): The initial owner address
- `` (): The broadcaster address for meta-transactions
- `` (): The recovery address
- `` (): The timelock period for operations in seconds
- `` (): The event forwarder address



---

### getSafeAddress

```solidity
function getSafeAddress() external view returns (address)
```




**Returns:**
- The address of the Safe contract


---

### setDelegatedCallEnabled

```solidity
function setDelegatedCallEnabled(bool enabled) external nonpayable
```



**Parameters:**
- `` (): True to enable delegated calls, false to disable



---

### requestTransaction

```solidity
function requestTransaction(struct GuardianSafe.SafeTx safeTx) external nonpayable returns (struct StateAbstraction.TxRecord)
```



**Parameters:**
- `` (): The Safe transaction parameters



---

### approveTransactionAfterDelay

```solidity
function approveTransactionAfterDelay(uint256 txId) external nonpayable returns (struct StateAbstraction.TxRecord)
```



**Parameters:**
- `` (): The transaction ID to approve



---

### approveTransactionWithMetaTx

```solidity
function approveTransactionWithMetaTx(struct StateAbstraction.MetaTransaction metaTx) external nonpayable returns (struct StateAbstraction.TxRecord)
```



**Parameters:**
- `` (): Meta transaction data



---

### cancelTransaction

```solidity
function cancelTransaction(uint256 txId) external nonpayable returns (struct StateAbstraction.TxRecord)
```



**Parameters:**
- `` (): The transaction ID to cancel



---

### cancelTransactionWithMetaTx

```solidity
function cancelTransactionWithMetaTx(struct StateAbstraction.MetaTransaction metaTx) external nonpayable returns (struct StateAbstraction.TxRecord)
```



**Parameters:**
- `` (): Meta transaction data



---

### requestAndApproveTransactionWithMetaTx

```solidity
function requestAndApproveTransactionWithMetaTx(struct StateAbstraction.MetaTransaction metaTx) public nonpayable returns (struct StateAbstraction.TxRecord)
```



**Parameters:**
- `` (): Meta transaction data

**Returns:**
- The transaction record


---

### executeTransaction

```solidity
function executeTransaction(struct GuardianSafe.SafeTx safeTx) external nonpayable
```



**Parameters:**
- `` (): The Safe transaction parameters



---

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) public view returns (bool)
```

Returns whether the module supports a given interface

**Parameters:**
- `` (): The interface identifier

**Returns:**
- bool True if the interface is supported


---

### receive

```solidity
function receive() external payable
```

Receive function to accept ETH




---

### generateUnsignedSafeMetaTxForNew

```solidity
function generateUnsignedSafeMetaTxForNew(struct GuardianSafe.SafeTx safeTx, struct GuardianSafe.SafeMetaTxParams params) public view returns (struct StateAbstraction.MetaTransaction)
```



**Parameters:**
- `` (): The Safe transaction parameters
- `` (): Meta transaction parameters

**Returns:**
- The unsigned meta-transaction


---

### generateUnsignedSafeMetaTxForExisting

```solidity
function generateUnsignedSafeMetaTxForExisting(uint256 txId, struct GuardianSafe.SafeMetaTxParams params, bool isApproval) public view returns (struct StateAbstraction.MetaTransaction)
```



**Parameters:**
- `` (): The ID of the existing transaction
- `` (): Meta transaction parameters
- `` (): Whether this is for approval (true) or cancellation (false)

**Returns:**
- The unsigned meta-transaction


---

### createTransactionExecutionParams

```solidity
function createTransactionExecutionParams(struct GuardianSafe.SafeTx safeTx) public pure returns (bytes)
```



**Parameters:**
- `` (): The Safe transaction parameters

**Returns:**
- The execution params bytes


---

### checkTransaction

```solidity
function checkTransaction(address to, uint256 , bytes data, enum ITransactionGuard.Operation operation, uint256 , uint256 , uint256 , address , address payable , bytes , address ) external view
```






---

### checkAfterExecution

```solidity
function checkAfterExecution(bytes32 hash, bool success) external nonpayable
```






---

### _validateDelegation

```solidity
function _validateDelegation() internal view
```

Reverts if delegated calls are not enabled




---


## Events

### TransactionRequested

```solidity
event TransactionRequested(struct GuardianSafe.SafeTx safeTx)
```




---

### TransactionExecuted

```solidity
event TransactionExecuted(bytes32 operationType, bytes executionData)
```




---

### TransactionCancelled

```solidity
event TransactionCancelled(uint256 txId)
```




---

### DelegatedCallStatusChanged

```solidity
event DelegatedCallStatusChanged(bool enabled)
```




---


## Structs


## Enums


