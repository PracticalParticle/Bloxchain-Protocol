# Solidity API

# IOnActionHook

Minimal interface for external hook contracts attached to state machine actions.


**Notice:** This interface is intentionally small to keep overall contract size low.
The state machine calls this single hook after any transaction operation that
        produces a TxRecord, providing a centralized post-action entry point.


## Functions

### onAction

```solidity
function onAction(struct EngineBlox.TxRecord txRecord) external nonpayable
```

Called after any transaction operation that produces a TxRecord.
     This includes request, approve, cancel and meta-tx flows.

**Parameters:**
- `` (): The transaction record produced by the operation



---


## Events


## Structs


## Enums


