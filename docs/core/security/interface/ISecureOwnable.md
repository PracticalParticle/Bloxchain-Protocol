# Solidity API

# ISecureOwnable

Interface for SecureOwnable functionality


**Notice:** This interface defines SecureOwnable-specific operations
Note: owner(), getBroadcasters(), and getRecovery() are available through BaseStateMachine


## Functions

### transferOwnershipRequest

```solidity
function transferOwnershipRequest() external nonpayable returns (uint256)
```

Requests a transfer of ownership


**Returns:**
- The transaction ID (use getTransaction(txId) for full record)


---

### transferOwnershipDelayedApproval

```solidity
function transferOwnershipDelayedApproval(uint256 txId) external nonpayable returns (uint256)
```

Approves a pending ownership transfer transaction after the release time

**Parameters:**
- `` (): The transaction ID

**Returns:**
- The transaction ID (use getTransaction(txId) for full record)


---

### transferOwnershipApprovalWithMetaTx

```solidity
function transferOwnershipApprovalWithMetaTx(struct EngineBlox.MetaTransaction metaTx) external nonpayable returns (uint256)
```

Approves a pending ownership transfer transaction using a meta-transaction

**Parameters:**
- `` (): The meta-transaction

**Returns:**
- The transaction ID (use getTransaction(txId) for full record)


---

### transferOwnershipCancellation

```solidity
function transferOwnershipCancellation(uint256 txId) external nonpayable returns (uint256)
```

Cancels a pending ownership transfer transaction

**Parameters:**
- `` (): The transaction ID

**Returns:**
- The transaction ID (use getTransaction(txId) for full record)


---

### transferOwnershipCancellationWithMetaTx

```solidity
function transferOwnershipCancellationWithMetaTx(struct EngineBlox.MetaTransaction metaTx) external nonpayable returns (uint256)
```

Cancels a pending ownership transfer transaction using a meta-transaction

**Parameters:**
- `` (): The meta-transaction

**Returns:**
- The transaction ID (use getTransaction(txId) for full record)


---

### updateBroadcasterRequest

```solidity
function updateBroadcasterRequest(address newBroadcaster, uint256 location) external nonpayable returns (uint256)
```

Requests an update to the broadcaster at a specific location (index).

**Parameters:**
- `` (): The new broadcaster address (zero address to revoke at location)
- `` (): The index in the broadcaster role&#x27;s authorized wallets set

**Returns:**
- The transaction ID (use getTransaction(txId) for full record)


---

### updateBroadcasterDelayedApproval

```solidity
function updateBroadcasterDelayedApproval(uint256 txId) external nonpayable returns (uint256)
```

Approves a pending broadcaster update transaction after the release time

**Parameters:**
- `` (): The transaction ID

**Returns:**
- The transaction ID (use getTransaction(txId) for full record)


---

### updateBroadcasterApprovalWithMetaTx

```solidity
function updateBroadcasterApprovalWithMetaTx(struct EngineBlox.MetaTransaction metaTx) external nonpayable returns (uint256)
```

Approves a pending broadcaster update transaction using a meta-transaction

**Parameters:**
- `` (): The meta-transaction

**Returns:**
- The transaction ID (use getTransaction(txId) for full record)


---

### updateBroadcasterCancellation

```solidity
function updateBroadcasterCancellation(uint256 txId) external nonpayable returns (uint256)
```

Cancels a pending broadcaster update transaction

**Parameters:**
- `` (): The transaction ID

**Returns:**
- The transaction ID (use getTransaction(txId) for full record)


---

### updateBroadcasterCancellationWithMetaTx

```solidity
function updateBroadcasterCancellationWithMetaTx(struct EngineBlox.MetaTransaction metaTx) external nonpayable returns (uint256)
```

Cancels a pending broadcaster update transaction using a meta-transaction

**Parameters:**
- `` (): The meta-transaction

**Returns:**
- The transaction ID (use getTransaction(txId) for full record)


---

### updateRecoveryRequestAndApprove

```solidity
function updateRecoveryRequestAndApprove(struct EngineBlox.MetaTransaction metaTx) external nonpayable returns (uint256)
```

Requests and approves a recovery address update using a meta-transaction

**Parameters:**
- `` (): The meta-transaction

**Returns:**
- The transaction ID (use getTransaction(txId) for full record)


---

### updateTimeLockRequestAndApprove

```solidity
function updateTimeLockRequestAndApprove(struct EngineBlox.MetaTransaction metaTx) external nonpayable returns (uint256)
```

Requests and approves a time lock period update using a meta-transaction

**Parameters:**
- `` (): The meta-transaction

**Returns:**
- The transaction ID (use getTransaction(txId) for full record)


---


## Events


## Structs


## Enums


