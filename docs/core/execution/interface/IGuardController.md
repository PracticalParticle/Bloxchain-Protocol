# Solidity API

# IGuardController

Interface for GuardController contract that GuardianSafeV3 and other contracts delegate to


**Notice:** This interface defines only GuardController-specific methods
Functions from BaseStateMachine (createMetaTxParams, generateUnsignedMetaTransaction*, getTransaction, functionSchemaExists, getFunctionSchema, owner, getBroadcaster, getRecovery) should be accessed via IBaseStateMachine
Functions from RuntimeRBAC (registerFunction, unregisterFunction, createNewRole, addWalletToRole, revokeWallet) should be accessed via IRuntimeRBAC

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

Requests a time-locked execution via EngineBlox workflow

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

### executeWithPayment

```solidity
function executeWithPayment(address target, uint256 value, bytes4 functionSelector, bytes params, uint256 gasLimit, bytes32 operationType, struct EngineBlox.PaymentDetails paymentDetails) external nonpayable returns (uint256)
```

Requests a time-locked execution with payment details attached (same permissions as executeWithTimeLock)

**Parameters:**
- `` (): The address of the target contract
- `` (): The ETH value to send (0 for standard function calls)
- `` (): The function selector to execute (NATIVE_TRANSFER_SELECTOR for simple native token transfers)
- `` (): The encoded parameters for the function (empty for simple native token transfers)
- `` (): The gas limit for execution
- `` (): The operation type hash
- `` (): The payment details to attach to the transaction

**Returns:**
- The transaction ID for the requested operation (use getTransaction(txId) for full record)


---

### approveTimeLockExecution

```solidity
function approveTimeLockExecution(uint256 txId) external nonpayable returns (uint256)
```

Approves and executes a time-locked transaction

**Parameters:**
- `` (): The transaction ID

**Returns:**
- txId The transaction ID (use getTransaction(txId) for full record and result)


---

### cancelTimeLockExecution

```solidity
function cancelTimeLockExecution(uint256 txId) external nonpayable returns (uint256)
```

Cancels a time-locked transaction

**Parameters:**
- `` (): The transaction ID

**Returns:**
- txId The transaction ID (use getTransaction(txId) for full record)


---

### approveTimeLockExecutionWithMetaTx

```solidity
function approveTimeLockExecutionWithMetaTx(struct EngineBlox.MetaTransaction metaTx) external nonpayable returns (uint256)
```

Approves a time-locked transaction using a meta-transaction

**Parameters:**
- `` (): The meta-transaction containing the transaction record and signature

**Returns:**
- The transaction ID (use getTransaction(txId) for full record)


---

### cancelTimeLockExecutionWithMetaTx

```solidity
function cancelTimeLockExecutionWithMetaTx(struct EngineBlox.MetaTransaction metaTx) external nonpayable returns (uint256)
```

Cancels a time-locked transaction using a meta-transaction

**Parameters:**
- `` (): The meta-transaction containing the transaction record and signature

**Returns:**
- The transaction ID (use getTransaction(txId) for full record)


---

### requestAndApproveExecution

```solidity
function requestAndApproveExecution(struct EngineBlox.MetaTransaction metaTx) external nonpayable returns (uint256)
```

Requests and approves a transaction in one step using a meta-transaction

**Parameters:**
- `` (): The meta-transaction containing the transaction record and signature

**Returns:**
- The transaction ID (use getTransaction(txId) for full record)


---


## Events


## Structs


## Enums


