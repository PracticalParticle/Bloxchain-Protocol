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

At most one ownership-transfer or broadcaster-update request may be pending at a time:
a pending request of either type blocks new requests until it is approved or cancelled.

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
function transferOwnershipRequest() public nonpayable returns (uint256)
```

Requests a transfer of ownership


**Returns:**
- The transaction ID (use getTransaction(txId) for full record)


---

### transferOwnershipDelayedApproval

```solidity
function transferOwnershipDelayedApproval(uint256 txId) public nonpayable returns (uint256)
```

Approves a pending ownership transfer transaction after the release time

**Parameters:**
- `` (): The transaction ID

**Returns:**
- The transaction ID


---

### transferOwnershipApprovalWithMetaTx

```solidity
function transferOwnershipApprovalWithMetaTx(struct EngineBlox.MetaTransaction metaTx) public nonpayable returns (uint256)
```

Approves a pending ownership transfer transaction using a meta-transaction

**Parameters:**
- `` (): The meta-transaction

**Returns:**
- The transaction ID


---

### transferOwnershipCancellation

```solidity
function transferOwnershipCancellation(uint256 txId) public nonpayable returns (uint256)
```

Cancels a pending ownership transfer transaction

**Parameters:**
- `` (): The transaction ID

**Returns:**
- The transaction ID


---

### transferOwnershipCancellationWithMetaTx

```solidity
function transferOwnershipCancellationWithMetaTx(struct EngineBlox.MetaTransaction metaTx) public nonpayable returns (uint256)
```

Cancels a pending ownership transfer transaction using a meta-transaction

**Parameters:**
- `` (): The meta-transaction

**Returns:**
- The transaction ID


---

### updateBroadcasterRequest

```solidity
function updateBroadcasterRequest(address newBroadcaster, uint256 location) public nonpayable returns (uint256)
```

Requests an update to the broadcaster at a specific location (index).

**Parameters:**
- `` (): The new broadcaster address (zero address to revoke at location)
- `` (): The index in the broadcaster role&#x27;s authorized wallets set

**Returns:**
- The transaction ID for the pending request (use getTransaction(txId) for full record)


---

### updateBroadcasterDelayedApproval

```solidity
function updateBroadcasterDelayedApproval(uint256 txId) public nonpayable returns (uint256)
```

Approves a pending broadcaster update transaction after the release time

**Parameters:**
- `` (): The transaction ID

**Returns:**
- The transaction ID


---

### updateBroadcasterApprovalWithMetaTx

```solidity
function updateBroadcasterApprovalWithMetaTx(struct EngineBlox.MetaTransaction metaTx) public nonpayable returns (uint256)
```

Approves a pending broadcaster update transaction using a meta-transaction

**Parameters:**
- `` (): The meta-transaction

**Returns:**
- The transaction ID


---

### updateBroadcasterCancellation

```solidity
function updateBroadcasterCancellation(uint256 txId) public nonpayable returns (uint256)
```

Cancels a pending broadcaster update transaction

**Parameters:**
- `` (): The transaction ID

**Returns:**
- The transaction ID


---

### updateBroadcasterCancellationWithMetaTx

```solidity
function updateBroadcasterCancellationWithMetaTx(struct EngineBlox.MetaTransaction metaTx) public nonpayable returns (uint256)
```

Cancels a pending broadcaster update transaction using a meta-transaction

**Parameters:**
- `` (): The meta-transaction

**Returns:**
- The transaction ID


---

### updateRecoveryRequestAndApprove

```solidity
function updateRecoveryRequestAndApprove(struct EngineBlox.MetaTransaction metaTx) public nonpayable returns (uint256)
```

Requests and approves a recovery address update using a meta-transaction

**Parameters:**
- `` (): The meta-transaction

**Returns:**
- The transaction ID


---

### updateTimeLockRequestAndApprove

```solidity
function updateTimeLockRequestAndApprove(struct EngineBlox.MetaTransaction metaTx) public nonpayable returns (uint256)
```

Requests and approves a time lock period update using a meta-transaction

**Parameters:**
- `` (): The meta-transaction

**Returns:**
- The transaction ID


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
function executeBroadcasterUpdate(address newBroadcaster, uint256 location) external nonpayable
```

External function that can only be called by the contract itself to execute broadcaster update

**Parameters:**
- `` (): The new broadcaster address (zero address to revoke at location)
- `` (): The index in the broadcaster role&#x27;s authorized wallets set



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

### _requireNoPendingRequest

```solidity
function _requireNoPendingRequest() internal view
```

Reverts if an ownership-transfer or broadcaster-update request is already pending.




---

### _validateBroadcasterAndOwnerSigner

```solidity
function _validateBroadcasterAndOwnerSigner(struct EngineBlox.MetaTransaction metaTx) internal view
```

Validates that the caller is the broadcaster and that the meta-tx signer is the owner.

**Parameters:**
- `` (): The meta-transaction to validate



---

### _completeApprove

```solidity
function _completeApprove(struct EngineBlox.TxRecord updatedRecord) internal nonpayable returns (uint256)
```

Completes ownership/broadcaster flow after approval: resets flag and returns txId.

**Parameters:**
- `` (): The updated transaction record from approval

**Returns:**
- The transaction ID


---

### _completeCancel

```solidity
function _completeCancel(struct EngineBlox.TxRecord updatedRecord) internal nonpayable returns (uint256)
```

Completes ownership/broadcaster flow after cancellation: resets flag, logs txId, returns txId.

**Parameters:**
- `` (): The updated transaction record from cancellation

**Returns:**
- The transaction ID


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

### _logAddressPairEvent

```solidity
function _logAddressPairEvent(address a, address b) internal nonpayable
```

Emits ComponentEvent with ABI-encoded (address, address) payload. Reused to reduce contract size.

**Parameters:**
- `` (): First address
- `` (): Second address



---


## Events


## Structs


## Enums


