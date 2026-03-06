# Solidity API

# CopyBlox

A simple blox that can clone other blox contracts and initialize them with user values

This contract provides functionality to:
- Clone any blox contract using EIP-1167 minimal proxy pattern
- Initialize the cloned contract with user-provided values
- Centralize events from clones by setting eventForwarder to CopyBlox address
- Implement IEventForwarder to receive and forward events from all clones
- Ensure all clones implement at least IBaseStateMachine interface




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
- `` (): The event forwarder address (optional)



---

### cloneBlox

```solidity
function cloneBlox(address bloxAddress, address initialOwner, address broadcaster, address recovery, uint256 timeLockPeriodSec) external nonpayable returns (address)
```



**Parameters:**
- `` (): The address of the blox contract to clone
- `` (): The initial owner address for the cloned blox
- `` (): The broadcaster address for the cloned blox
- `` (): The recovery address for the cloned blox
- `` (): The timelock period in seconds for the cloned blox

**Returns:**
- The address of the newly cloned blox contract


---

### _validateBloxImplementation

```solidity
function _validateBloxImplementation(address bloxAddress) internal view
```

Validates that an address is not zero, not this contract, has code, and implements IBaseStateMachine.




---

### getCloneCount

```solidity
function getCloneCount() external view returns (uint256)
```




**Returns:**
- The total number of clones created by this CopyBlox instance


---

### getCloneAtIndex

```solidity
function getCloneAtIndex(uint256 index) external view returns (address)
```



**Parameters:**
- `` (): The index of the clone to retrieve

**Returns:**
- The clone address at the specified index


---

### isClone

```solidity
function isClone(address cloneAddress) external view returns (bool)
```



**Parameters:**
- `` (): The address to check

**Returns:**
- True if the address is a clone, false otherwise


---

### forwardTxEvent

```solidity
function forwardTxEvent(uint256 txId, bytes4 functionSelector, enum EngineBlox.TxStatus status, address requester, address target, bytes32 operationType) external nonpayable
```

This function is called by clones to forward their events to CopyBlox
Only clones created by this CopyBlox can forward events

**Parameters:**
- `` (): The transaction ID
- `` (): The function selector for the event (bytes4)
- `` (): The transaction status
- `` (): The address of the requester
- `` (): The target contract address
- `` (): The type of operation



---

### fallback

```solidity
function fallback() external payable
```

Fallback function to reject accidental calls




---

### receive

```solidity
function receive() external payable
```






---


## Events

### BloxCloned

```solidity
event BloxCloned(address original, address clone, address initialOwner, uint256 cloneNumber)
```

Event emitted when a blox is cloned

**Parameters:**
- `` (): The address of the original blox contract
- `` (): The address of the cloned blox contract
- `` (): The initial owner of the cloned blox
- `` (): The sequential number of this clone

---

### CloneEventForwarded

```solidity
event CloneEventForwarded(address cloneAddress, uint256 txId, bytes4 functionSelector, enum EngineBlox.TxStatus status, address requester, address target, bytes32 operationType)
```

Event emitted when a transaction event is forwarded from a clone

**Parameters:**
- `` (): The address of the clone that emitted the event
- `` (): The transaction ID
- `` (): The function selector for the event
- `` (): The transaction status
- `` (): The address of the requester
- `` (): The target contract address
- `` (): The type of operation

---


## Structs


## Enums


