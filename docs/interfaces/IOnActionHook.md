# Solidity API

# IOnActionHook

Minimal interface for external hook contracts attached to state machine actions


**Notice:** This interface is intentionally small to keep overall contract size low.
Implementations can choose which functions to support; unneeded ones can revert.


## Functions

### onRequest

```solidity
function onRequest(struct EngineBlox.TxRecord txRecord, address caller) external nonpayable
```

Called after a transaction request is created

**Parameters:**
- `` (): The created transaction record
- `` (): The address that initiated the request



---

### onApprove

```solidity
function onApprove(struct EngineBlox.TxRecord txRecord, address caller) external nonpayable
```

Called after a pending transaction is approved (time-lock flow)

**Parameters:**
- `` (): The updated transaction record
- `` (): The address that approved the transaction



---

### onCancel

```solidity
function onCancel(struct EngineBlox.TxRecord txRecord, address caller) external nonpayable
```

Called after a pending transaction is cancelled

**Parameters:**
- `` (): The updated transaction record
- `` (): The address that cancelled the transaction



---

### onMetaApprove

```solidity
function onMetaApprove(struct EngineBlox.TxRecord txRecord, struct EngineBlox.MetaTransaction metaTx, address caller) external nonpayable
```

Called after a transaction is approved via meta-transaction

**Parameters:**
- `` (): The updated transaction record
- `` (): The meta-transaction used for approval
- `` (): The address executing the meta-transaction



---

### onMetaCancel

```solidity
function onMetaCancel(struct EngineBlox.TxRecord txRecord, struct EngineBlox.MetaTransaction metaTx, address caller) external nonpayable
```

Called after a transaction is cancelled via meta-transaction

**Parameters:**
- `` (): The updated transaction record
- `` (): The meta-transaction used for cancellation
- `` (): The address executing the meta-transaction



---

### onRequestAndApprove

```solidity
function onRequestAndApprove(struct EngineBlox.TxRecord txRecord, struct EngineBlox.MetaTransaction metaTx, address caller) external nonpayable
```

Called after a transaction is requested and approved in one step via meta-transaction

**Parameters:**
- `` (): The created + approved transaction record
- `` (): The meta-transaction used for the operation
- `` (): The address executing the meta-transaction



---


## Events


## Structs


## Enums


