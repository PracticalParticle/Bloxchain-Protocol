# Solidity API

# HookManager

Simple hook manager component for BaseStateMachine workflows

This component allows attaching external hook contracts per function selector.
It uses EngineBlox's functionTargetHooks for storage, keeping the contract minimal:

- Multiple hooks per function selector (via EngineBlox.functionTargetHooks)
- OWNER role can set/clear hooks
- Hooks are executed AFTER the core state machine operation completes
- Hooks are best-effort: if no hook is configured, nothing happens

Supported hook points (via IOnActionHook):
- onRequest            : after _requestTransaction
- onApprove            : after _approveTransaction
- onCancel             : after _cancelTransaction
- onMetaApprove        : after _approveTransactionWithMetaTx
- onMetaCancel         : after _cancelTransactionWithMetaTx
- onRequestAndApprove  : after _requestAndApproveTransaction

Security model:
- Core state transitions and permissions are enforced by EngineBlox
- Overrides call super first (Checks/Effects) then invoke external hooks (Interactions)
- Approve/meta-approve overrides remain protected by ReentrancyGuard via BaseStateMachine




## Functions

### setHook

```solidity
function setHook(bytes4 functionSelector, address hook) external nonpayable
```

Sets the hook contract for a function selector

**Parameters:**
- `` (): The function selector
- `` (): The hook contract address



---

### clearHook

```solidity
function clearHook(bytes4 functionSelector, address hook) external nonpayable
```

Clears the hook contract for a function selector

**Parameters:**
- `` (): The function selector
- `` (): The hook contract address to remove



---

### getHook

```solidity
function getHook(bytes4 functionSelector) external view returns (address[])
```

Returns all configured hooks for a function selector

**Parameters:**
- `` (): The function selector

**Returns:**
- Array of hook contract addresses


---

### _executeOnRequestHooks

```solidity
function _executeOnRequestHooks(bytes4 functionSelector, struct EngineBlox.TxRecord txRecord, address caller) internal nonpayable
```

Executes all hooks for a function selector with onRequest callback




---

### _executeOnApproveHooks

```solidity
function _executeOnApproveHooks(bytes4 functionSelector, struct EngineBlox.TxRecord txRecord, address caller) internal nonpayable
```

Executes all hooks for a function selector with onApprove callback




---

### _executeOnCancelHooks

```solidity
function _executeOnCancelHooks(bytes4 functionSelector, struct EngineBlox.TxRecord txRecord, address caller) internal nonpayable
```

Executes all hooks for a function selector with onCancel callback




---

### _executeOnMetaApproveHooks

```solidity
function _executeOnMetaApproveHooks(bytes4 functionSelector, struct EngineBlox.TxRecord txRecord, struct EngineBlox.MetaTransaction metaTx, address caller) internal nonpayable
```

Executes all hooks for a function selector with onMetaApprove callback




---

### _executeOnMetaCancelHooks

```solidity
function _executeOnMetaCancelHooks(bytes4 functionSelector, struct EngineBlox.TxRecord txRecord, struct EngineBlox.MetaTransaction metaTx, address caller) internal nonpayable
```

Executes all hooks for a function selector with onMetaCancel callback




---

### _executeOnRequestAndApproveHooks

```solidity
function _executeOnRequestAndApproveHooks(bytes4 functionSelector, struct EngineBlox.TxRecord txRecord, struct EngineBlox.MetaTransaction metaTx, address caller) internal nonpayable
```

Executes all hooks for a function selector with onRequestAndApprove callback




---

### _requestTransaction

```solidity
function _requestTransaction(address requester, address target, uint256 value, uint256 gasLimit, bytes32 operationType, bytes4 functionSelector, bytes params) internal nonpayable returns (struct EngineBlox.TxRecord)
```

Override to add onRequest hook execution




---

### _approveTransaction

```solidity
function _approveTransaction(uint256 txId) internal nonpayable returns (struct EngineBlox.TxRecord)
```

Override to add onApprove hook execution




---

### _approveTransactionWithMetaTx

```solidity
function _approveTransactionWithMetaTx(struct EngineBlox.MetaTransaction metaTx) internal nonpayable returns (struct EngineBlox.TxRecord)
```

Override to add onMetaApprove hook execution




---

### _cancelTransaction

```solidity
function _cancelTransaction(uint256 txId) internal nonpayable returns (struct EngineBlox.TxRecord)
```

Override to add onCancel hook execution




---

### _cancelTransactionWithMetaTx

```solidity
function _cancelTransactionWithMetaTx(struct EngineBlox.MetaTransaction metaTx) internal nonpayable returns (struct EngineBlox.TxRecord)
```

Override to add onMetaCancel hook execution




---

### _requestAndApproveTransaction

```solidity
function _requestAndApproveTransaction(struct EngineBlox.MetaTransaction metaTx) internal nonpayable returns (struct EngineBlox.TxRecord)
```

Override to add onRequestAndApprove hook execution




---


## Events

### HookSet

```solidity
event HookSet(bytes4 functionSelector, address hook)
```




---

### HookCleared

```solidity
event HookCleared(bytes4 functionSelector, address hook)
```




---


## Structs


## Enums


