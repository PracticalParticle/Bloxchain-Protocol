# Solidity API

# ISecureOwnable

Interface for SecureOwnable functionality


**Notice:** This interface defines SecureOwnable-specific operations
Note: owner(), getBroadcasters(), and getRecovery() are available through BaseStateMachine


## Functions

### transferOwnershipRequest

```solidity
function transferOwnershipRequest() external nonpayable returns (struct StateAbstraction.TxRecord)
```

Requests a transfer of ownership


**Returns:**
- The transaction record


---

### transferOwnershipDelayedApproval

```solidity
function transferOwnershipDelayedApproval(uint256 txId) external nonpayable returns (struct StateAbstraction.TxRecord)
```

Approves a pending ownership transfer transaction after the release time

**Parameters:**
- `` (): The transaction ID

**Returns:**
- The updated transaction record


---

### transferOwnershipApprovalWithMetaTx

```solidity
function transferOwnershipApprovalWithMetaTx(struct StateAbstraction.MetaTransaction metaTx) external nonpayable returns (struct StateAbstraction.TxRecord)
```

Approves a pending ownership transfer transaction using a meta-transaction

**Parameters:**
- `` (): The meta-transaction

**Returns:**
- The updated transaction record


---

### transferOwnershipCancellation

```solidity
function transferOwnershipCancellation(uint256 txId) external nonpayable returns (struct StateAbstraction.TxRecord)
```

Cancels a pending ownership transfer transaction

**Parameters:**
- `` (): The transaction ID

**Returns:**
- The updated transaction record


---

### transferOwnershipCancellationWithMetaTx

```solidity
function transferOwnershipCancellationWithMetaTx(struct StateAbstraction.MetaTransaction metaTx) external nonpayable returns (struct StateAbstraction.TxRecord)
```

Cancels a pending ownership transfer transaction using a meta-transaction

**Parameters:**
- `` (): The meta-transaction

**Returns:**
- The updated transaction record


---

### updateBroadcasterRequest

```solidity
function updateBroadcasterRequest(address newBroadcaster) external nonpayable returns (struct StateAbstraction.TxRecord)
```

Updates the broadcaster address

**Parameters:**
- `` (): The new broadcaster address

**Returns:**
- The transaction record


---

### updateBroadcasterDelayedApproval

```solidity
function updateBroadcasterDelayedApproval(uint256 txId) external nonpayable returns (struct StateAbstraction.TxRecord)
```

Approves a pending broadcaster update transaction after the release time

**Parameters:**
- `` (): The transaction ID

**Returns:**
- The updated transaction record


---

### updateBroadcasterApprovalWithMetaTx

```solidity
function updateBroadcasterApprovalWithMetaTx(struct StateAbstraction.MetaTransaction metaTx) external nonpayable returns (struct StateAbstraction.TxRecord)
```

Approves a pending broadcaster update transaction using a meta-transaction

**Parameters:**
- `` (): The meta-transaction

**Returns:**
- The updated transaction record


---

### updateBroadcasterCancellation

```solidity
function updateBroadcasterCancellation(uint256 txId) external nonpayable returns (struct StateAbstraction.TxRecord)
```

Cancels a pending broadcaster update transaction

**Parameters:**
- `` (): The transaction ID

**Returns:**
- The updated transaction record


---

### updateBroadcasterCancellationWithMetaTx

```solidity
function updateBroadcasterCancellationWithMetaTx(struct StateAbstraction.MetaTransaction metaTx) external nonpayable returns (struct StateAbstraction.TxRecord)
```

Cancels a pending broadcaster update transaction using a meta-transaction

**Parameters:**
- `` (): The meta-transaction

**Returns:**
- The updated transaction record


---

### updateRecoveryExecutionParams

```solidity
function updateRecoveryExecutionParams(address newRecoveryAddress) external view returns (bytes)
```

Creates execution params for updating the recovery address

**Parameters:**
- `` (): The new recovery address

**Returns:**
- The execution params


---

### updateRecoveryRequestAndApprove

```solidity
function updateRecoveryRequestAndApprove(struct StateAbstraction.MetaTransaction metaTx) external nonpayable returns (struct StateAbstraction.TxRecord)
```

Requests and approves a recovery address update using a meta-transaction

**Parameters:**
- `` (): The meta-transaction

**Returns:**
- The transaction record


---

### updateTimeLockExecutionParams

```solidity
function updateTimeLockExecutionParams(uint256 newTimeLockPeriodSec) external view returns (bytes)
```

Creates execution params for updating the time lock period

**Parameters:**
- `` (): The new time lock period in seconds

**Returns:**
- The execution params


---

### updateTimeLockRequestAndApprove

```solidity
function updateTimeLockRequestAndApprove(struct StateAbstraction.MetaTransaction metaTx) external nonpayable returns (struct StateAbstraction.TxRecord)
```

Requests and approves a time lock period update using a meta-transaction

**Parameters:**
- `` (): The meta-transaction

**Returns:**
- The transaction record


---


## Events


## Structs


## Enums


