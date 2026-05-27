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

Pending secure requests use separate flags for ownership transfer and broadcaster update.
A new ownership-transfer request is allowed if no ownership transfer is already pending
(a broadcaster update may still be pending). A new broadcaster-update request is allowed only
when neither type has a pending request.

**Ownership transfer vs recovery (threat model):**
- `transferOwnershipRequest` snapshots `getRecovery()` into the pending tx `executionParams`. On execution,
  `executeTransferOwnership` receives that snapshotted address as the new owner. Rotating recovery after
  the request does **not** rewrite the pending payload; the beneficiary remains the recovery address
  at request time.
- `transferOwnershipDelayedApproval` authorizes the **current** owner or **current** recovery (`getRecovery()`
  at approval time). It does **not** require the approver to match the snapshotted beneficiary. Integrators
  must treat approval as consent to execute the **stored** transfer, not “transfer to whoever is recovery now.”
- `transferOwnershipCancellation` allows only the **current** recovery to cancel. If owner and broadcaster
  rotate recovery via `updateRecoveryRequestAndApprove` while a transfer is pending, the **previous**
  recovery loses cancel rights immediately; the pending tx still targets the old address until approved,
  cancelled by the new recovery, or superseded operationally.
- Recovery and timelock updates use a request-and-approve meta-tx path without an additional timelock and
  are **not** blocked when an ownership transfer is pending (unlike broadcaster update requests). This is
  intentional: fast recovery rotation when owner and broadcaster still cooperate; operators who need a
  strict “recovery cannot change during pending ownership transfer” invariant must enforce it off-chain or
  extend this contract.

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

Requests a time-delayed transfer of the OWNER role to the **recovery address at request time**.


**Returns:**
- The transaction ID (use getTransaction(txId) for full record)


---

### transferOwnershipDelayedApproval

```solidity
function transferOwnershipDelayedApproval(uint256 txId) public nonpayable returns (uint256)
```

Approves a pending ownership transfer after `releaseTime` (timelock on the direct path).

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

Cancels a pending ownership transfer transaction.

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
function updateBroadcasterRequest(address newBroadcaster, address currentBroadcaster) public nonpayable returns (uint256)
```

Requests a broadcaster role change identified by addresses.

**Parameters:**
- `` (): New broadcaster (&#x60;address(0)&#x60; to revoke &#x60;currentBroadcaster&#x60;)
- `` (): Existing broadcaster to replace or revoke; &#x60;address(0)&#x60; to add &#x60;newBroadcaster&#x60;

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

Requests and approves a recovery address update using a meta-transaction (owner signs, broadcaster submits).

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

External function that can only be called by the contract itself to execute ownership transfer.

**Parameters:**
- `` (): The new owner; for the OWNERSHIP_TRANSFER flow this is the recovery address encoded at
       request time (see &#x60;transferOwnershipRequest&#x60;), not necessarily &#x60;getRecovery()&#x60; at execution time.



---

### executeBroadcasterUpdate

```solidity
function executeBroadcasterUpdate(address newBroadcaster, address currentBroadcaster) external nonpayable
```

External function that can only be called by the contract itself to execute broadcaster update

**Parameters:**
- `` (): New broadcaster (&#x60;address(0)&#x60; to revoke &#x60;currentBroadcaster&#x60;)
- `` (): Existing broadcaster to replace or revoke; &#x60;address(0)&#x60; to add &#x60;newBroadcaster&#x60;



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

Completes ownership/broadcaster flow after approval: clears the matching pending flag and returns txId.

**Parameters:**
- `` (): The updated transaction record from approval

**Returns:**
- The transaction ID


---

### _completeCancel

```solidity
function _completeCancel(struct EngineBlox.TxRecord updatedRecord) internal nonpayable returns (uint256)
```

Completes ownership/broadcaster flow after cancellation: clears the matching pending flag and returns txId.

**Parameters:**
- `` (): The updated transaction record from cancellation

**Returns:**
- The transaction ID


---

### _requireNoPendingRequest

```solidity
function _requireNoPendingRequest(bytes32 requestOperationType) internal view
```

Reverts if the pending flag for `requestOperationType` is already set (one lane per call).
     `OWNERSHIP_TRANSFER` checks only `_hasOpenOwnershipRequest` (a broadcaster update may still be pending).
     `BROADCASTER_UPDATE` checks only `_hasOpenBroadcasterRequest`. Callers that need both lanes idle
     (e.g. `updateBroadcasterRequest`) invoke this once per operation type.

**Parameters:**
- `` (): Lane to validate (&#x60;OWNERSHIP_TRANSFER&#x60; or &#x60;BROADCASTER_UPDATE&#x60;).



---

### _transferOwnership

```solidity
function _transferOwnership(address newOwner) internal nonpayable
```

Transfers ownership of the contract

**Parameters:**
- `` (): The new owner of the contract



---

### _validateBroadcasterUpdatePair

```solidity
function _validateBroadcasterUpdatePair(address newBroadcaster, address currentBroadcaster) internal view
```

Validates broadcaster update pair at request time.

**Parameters:**
- `` (): New broadcaster (&#x60;address(0)&#x60; to revoke)
- `` (): Existing broadcaster; &#x60;address(0)&#x60; to add &#x60;newBroadcaster&#x60;



---

### _updateBroadcaster

```solidity
function _updateBroadcaster(address newBroadcaster, address currentBroadcaster) internal nonpayable
```

Updates the broadcaster role by address pair (revoke, replace, or add).

**Parameters:**
- `` (): New broadcaster (&#x60;address(0)&#x60; to revoke &#x60;currentBroadcaster&#x60;)
- `` (): Existing broadcaster; &#x60;address(0)&#x60; to add &#x60;newBroadcaster&#x60;



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


