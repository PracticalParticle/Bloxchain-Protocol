# Solidity API

# IGuardController

Interface for GuardController contract that GuardianSafeV3 and other contracts delegate to


**Notice:** This interface defines only GuardController-specific methods
Functions from BaseStateMachine (createMetaTxParams, generateUnsignedMetaTransaction*, getTransaction, functionSchemaExists, owner, getBroadcaster, getRecovery) should be accessed via IBaseStateMachine
Functions from RuntimeRBAC (registerFunction, unregisterFunction, getFunctionSchema, createNewRole, addWalletToRole, revokeWallet) should be accessed via IRuntimeRBAC

**Security Contact:** security@particlecrypto.com

## Functions

### initialize

```solidity
function initialize(address initialOwner, address broadcaster, address recovery, uint256 timeLockPeriodSec, address eventForwarder) external nonpayable
```



**Parameters:**
- `` (): The initial owner address
- `` (): The broadcaster address
- `` (): The recovery address
- `` (): The timelock period in seconds
- `` (): The event forwarder address



---

### executeWithTimeLock

```solidity
function executeWithTimeLock(address target, uint256 value, bytes4 functionSelector, bytes params, uint256 gasLimit, bytes32 operationType) external nonpayable returns (uint256)
```

Requests a time-locked execution via StateAbstraction workflow

**Parameters:**
- `` (): The address of the target contract
- `` (): The ETH value to send (0 for standard function calls)
- `` (): The function selector to execute (0x00000000 for simple ETH transfers)
- `` (): The encoded parameters for the function (empty for simple ETH transfers)
- `` (): The gas limit for execution
- `` (): The operation type hash

**Returns:**
- The transaction ID for the requested operation


---

### approveTimeLockExecution

```solidity
function approveTimeLockExecution(uint256 txId, bytes32 expectedOperationType) external nonpayable returns (bytes)
```

Approves and executes a time-locked transaction

**Parameters:**
- `` (): The transaction ID
- `` (): The expected operation type for validation

**Returns:**
- The execution result


---

### cancelTimeLockExecution

```solidity
function cancelTimeLockExecution(uint256 txId, bytes32 expectedOperationType) external nonpayable returns (struct StateAbstraction.TxRecord)
```

Cancels a time-locked transaction

**Parameters:**
- `` (): The transaction ID
- `` (): The expected operation type for validation

**Returns:**
- The updated transaction record


---

### approveTimeLockExecutionWithMetaTx

```solidity
function approveTimeLockExecutionWithMetaTx(struct StateAbstraction.MetaTransaction metaTx, bytes32 expectedOperationType, bytes4 requiredSelector) external nonpayable returns (struct StateAbstraction.TxRecord)
```

Approves a time-locked transaction using a meta-transaction

**Parameters:**
- `` (): The meta-transaction containing the transaction record and signature
- `` (): The expected operation type for validation
- `` (): The handler selector for validation

**Returns:**
- The updated transaction record


---

### cancelTimeLockExecutionWithMetaTx

```solidity
function cancelTimeLockExecutionWithMetaTx(struct StateAbstraction.MetaTransaction metaTx, bytes32 expectedOperationType, bytes4 requiredSelector) external nonpayable returns (struct StateAbstraction.TxRecord)
```

Cancels a time-locked transaction using a meta-transaction

**Parameters:**
- `` (): The meta-transaction containing the transaction record and signature
- `` (): The expected operation type for validation
- `` (): The handler selector for validation

**Returns:**
- The updated transaction record


---

### requestAndApproveExecution

```solidity
function requestAndApproveExecution(struct StateAbstraction.MetaTransaction metaTx, bytes4 requiredSelector) external nonpayable returns (struct StateAbstraction.TxRecord)
```

Requests and approves a transaction in one step using a meta-transaction

**Parameters:**
- `` (): The meta-transaction containing the transaction record and signature
- `` (): The handler selector for validation

**Returns:**
- The transaction record after request and approval


---


## Events


## Structs


## Enums


