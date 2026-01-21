# Solidity API

# SecureOwnable

Security-focused contract extending BaseStateMachine with ownership management

SecureOwnable provides security-specific functionality built on top of the base state machine:
- Multi-role security model with Owner, Broadcaster, and Recovery roles
- Secure ownership transfer with time-locked operations
- Broadcaster and recovery address management
- Time-lock period configuration

The contract implements four primary secure operation types:
1. OWNERSHIP_TRANSFER - For securely transferring contract ownership
2. BROADCASTER_UPDATE - For changing the broadcaster address
3. RECOVERY_UPDATE - For updating the recovery address
4. TIMELOCK_UPDATE - For modifying the time lock period

Each operation follows a request -> approval workflow with appropriate time locks
and authorization checks. Operations can be cancelled within specific time windows.

This contract focuses purely on security logic while leveraging the BaseStateMachine
for transaction management, meta-transactions, and state machine operations.




## Functions

### initialize

```solidity
function initialize(address initialOwner, address broadcaster, address recovery, uint256 timeLockPeriodSec, address eventForwarder) public nonpayable
```



**Parameters:**
- `` (): The initial owner address
- `` (): The broadcaster address
- `` (): The recovery address
- `` (): The timelock period in seconds
- `` (): The event forwarder address



---

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) public view returns (bool)
```

See {IERC165-supportsInterface}.




---

### transferOwnershipRequest

```solidity
function transferOwnershipRequest() public nonpayable returns (struct StateAbstraction.TxRecord)
```

Requests a transfer of ownership


**Returns:**
- The transaction record


---

### transferOwnershipDelayedApproval

```solidity
function transferOwnershipDelayedApproval(uint256 txId) public nonpayable returns (struct StateAbstraction.TxRecord)
```

Approves a pending ownership transfer transaction after the release time

**Parameters:**
- `` (): The transaction ID

**Returns:**
- The updated transaction record


---

### transferOwnershipApprovalWithMetaTx

```solidity
function transferOwnershipApprovalWithMetaTx(struct StateAbstraction.MetaTransaction metaTx) public nonpayable returns (struct StateAbstraction.TxRecord)
```

Approves a pending ownership transfer transaction using a meta-transaction

**Parameters:**
- `` (): The meta-transaction

**Returns:**
- The updated transaction record


---

### transferOwnershipCancellation

```solidity
function transferOwnershipCancellation(uint256 txId) public nonpayable returns (struct StateAbstraction.TxRecord)
```

Cancels a pending ownership transfer transaction

**Parameters:**
- `` (): The transaction ID

**Returns:**
- The updated transaction record


---

### transferOwnershipCancellationWithMetaTx

```solidity
function transferOwnershipCancellationWithMetaTx(struct StateAbstraction.MetaTransaction metaTx) public nonpayable returns (struct StateAbstraction.TxRecord)
```

Cancels a pending ownership transfer transaction using a meta-transaction

**Parameters:**
- `` (): The meta-transaction

**Returns:**
- The updated transaction record


---

### updateBroadcasterRequest

```solidity
function updateBroadcasterRequest(address newBroadcaster) public nonpayable returns (struct StateAbstraction.TxRecord)
```

Updates the broadcaster address

**Parameters:**
- `` (): The new broadcaster address

**Returns:**
- The execution options


---

### updateBroadcasterDelayedApproval

```solidity
function updateBroadcasterDelayedApproval(uint256 txId) public nonpayable returns (struct StateAbstraction.TxRecord)
```

Approves a pending broadcaster update transaction after the release time

**Parameters:**
- `` (): The transaction ID

**Returns:**
- The updated transaction record


---

### updateBroadcasterApprovalWithMetaTx

```solidity
function updateBroadcasterApprovalWithMetaTx(struct StateAbstraction.MetaTransaction metaTx) public nonpayable returns (struct StateAbstraction.TxRecord)
```

Approves a pending broadcaster update transaction using a meta-transaction

**Parameters:**
- `` (): The meta-transaction

**Returns:**
- The updated transaction record


---

### updateBroadcasterCancellation

```solidity
function updateBroadcasterCancellation(uint256 txId) public nonpayable returns (struct StateAbstraction.TxRecord)
```

Cancels a pending broadcaster update transaction

**Parameters:**
- `` (): The transaction ID

**Returns:**
- The updated transaction record


---

### updateBroadcasterCancellationWithMetaTx

```solidity
function updateBroadcasterCancellationWithMetaTx(struct StateAbstraction.MetaTransaction metaTx) public nonpayable returns (struct StateAbstraction.TxRecord)
```

Cancels a pending broadcaster update transaction using a meta-transaction

**Parameters:**
- `` (): The meta-transaction

**Returns:**
- The updated transaction record


---

### updateRecoveryExecutionParams

```solidity
function updateRecoveryExecutionParams(address newRecoveryAddress) public view returns (bytes)
```

Creates execution params for updating the recovery address

**Parameters:**
- `` (): The new recovery address

**Returns:**
- The execution params


---

### updateRecoveryRequestAndApprove

```solidity
function updateRecoveryRequestAndApprove(struct StateAbstraction.MetaTransaction metaTx) public nonpayable returns (struct StateAbstraction.TxRecord)
```

Requests and approves a recovery address update using a meta-transaction

**Parameters:**
- `` (): The meta-transaction

**Returns:**
- The transaction record


---

### updateTimeLockExecutionParams

```solidity
function updateTimeLockExecutionParams(uint256 newTimeLockPeriodSec) public view returns (bytes)
```

Creates execution params for updating the time lock period

**Parameters:**
- `` (): The new time lock period in seconds

**Returns:**
- The execution params


---

### updateTimeLockRequestAndApprove

```solidity
function updateTimeLockRequestAndApprove(struct StateAbstraction.MetaTransaction metaTx) public nonpayable returns (struct StateAbstraction.TxRecord)
```

Requests and approves a time lock period update using a meta-transaction

**Parameters:**
- `` (): The meta-transaction

**Returns:**
- The transaction record


---

### executeTransferOwnership

```solidity
function executeTransferOwnership(address newOwner) external nonpayable
```

External function that can only be called by the contract itself to execute ownership transfer

**Parameters:**
- `` (): The new owner address



---

### executeBroadcasterUpdate

```solidity
function executeBroadcasterUpdate(address newBroadcaster) external nonpayable
```

External function that can only be called by the contract itself to execute broadcaster update

**Parameters:**
- `` (): The new broadcaster address



---

### executeRecoveryUpdate

```solidity
function executeRecoveryUpdate(address newRecoveryAddress) external nonpayable
```

External function that can only be called by the contract itself to execute recovery update

**Parameters:**
- `` (): The new recovery address



---

### executeTimeLockUpdate

```solidity
function executeTimeLockUpdate(uint256 newTimeLockPeriodSec) external nonpayable
```

External function that can only be called by the contract itself to execute timelock update

**Parameters:**
- `` (): The new timelock period in seconds



---

### _transferOwnership

```solidity
function _transferOwnership(address newOwner) internal nonpayable
```

Transfers ownership of the contract

**Parameters:**
- `` (): The new owner of the contract



---

### _updateBroadcaster

```solidity
function _updateBroadcaster(address newBroadcaster, uint256 location) internal nonpayable
```

Updates the broadcaster role at a specific index (location)

**Parameters:**
- `` (): The new broadcaster address (zero address to revoke)
- `` (): The index in the broadcaster role&#x27;s authorized wallets set

Logic:
- If a broadcaster exists at &#x60;location&#x60; and &#x60;newBroadcaster&#x60; is non-zero,
  update that slot from old to new (role remains full).
- If no broadcaster exists at &#x60;location&#x60; and &#x60;newBroadcaster&#x60; is non-zero,
  assign &#x60;newBroadcaster&#x60; to the broadcaster role (respecting maxWallets).
- If &#x60;newBroadcaster&#x60; is the zero address and a broadcaster exists at &#x60;location&#x60;,
  revoke that broadcaster from the role.



---

### _updateRecoveryAddress

```solidity
function _updateRecoveryAddress(address newRecoveryAddress) internal nonpayable
```

Updates the recovery address

**Parameters:**
- `` (): The new recovery address



---

### _updateTimeLockPeriod

```solidity
function _updateTimeLockPeriod(uint256 newTimeLockPeriodSec) internal nonpayable
```

Updates the time lock period

**Parameters:**
- `` (): The new time lock period in seconds



---


## Events

### OwnershipTransferRequest

```solidity
event OwnershipTransferRequest(address currentOwner, address newOwner)
```




---

### OwnershipTransferCancelled

```solidity
event OwnershipTransferCancelled(uint256 txId)
```




---

### OwnershipTransferUpdated

```solidity
event OwnershipTransferUpdated(address oldOwner, address newOwner)
```




---

### BroadcasterUpdateRequest

```solidity
event BroadcasterUpdateRequest(address currentBroadcaster, address newBroadcaster)
```




---

### BroadcasterUpdateCancelled

```solidity
event BroadcasterUpdateCancelled(uint256 txId)
```




---

### BroadcasterUpdated

```solidity
event BroadcasterUpdated(address oldBroadcaster, address newBroadcaster)
```




---

### RecoveryAddressUpdated

```solidity
event RecoveryAddressUpdated(address oldRecovery, address newRecovery)
```




---

### TimeLockPeriodUpdated

```solidity
event TimeLockPeriodUpdated(uint256 oldPeriod, uint256 newPeriod)
```




---


## Structs


## Enums


