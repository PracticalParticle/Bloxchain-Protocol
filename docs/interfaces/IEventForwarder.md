# Solidity API

# IEventForwarder

Interface for the event forwarder contract

This interface defines the contract for forwarding events from deployed instances
to a centralized event monitoring system. It uses function selectors for efficient
event identification and categorization.




## Functions

### forwardTxEvent

```solidity
function forwardTxEvent(uint256 txId, bytes4 functionSelector, enum EngineBlox.TxStatus status, address requester, address target, bytes32 operationType) external nonpayable
```

Forward a transaction event from a deployed instance

**Parameters:**
- `` (): The transaction ID
- `` (): The function selector for the event (bytes4)
- `` (): The transaction status
- `` (): The address of the requester
- `` (): The target contract address
- `` (): The type of operation



---


## Events


## Structs


## Enums


