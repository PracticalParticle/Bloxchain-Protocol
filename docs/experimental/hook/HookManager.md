# Solidity API

# HookManager

Simple hook manager component for BaseStateMachine workflows

This component allows attaching external hook contracts per function selector.
It uses EngineBlox's functionTargetHooks for storage, keeping the contract minimal:

- Multiple hooks per function selector (via EngineBlox.functionTargetHooks)
- OWNER role can set/clear hooks
- Hooks are executed AFTER the core state machine operation completes
- If no hook is configured for a selector, nothing runs for that selector
- Hooks are mandatory for the transaction: if any registered hook reverts (e.g. bug, OOG, or
  malicious behavior), the entire parent transaction (request/approve/cancel) will revert.
  Only register trusted, non-reverting hook contracts.

Hook integration:
- BaseStateMachine provides a single _postActionHook entry point that is called
  after any transaction operation that produces a TxRecord
- HookManager overrides _postActionHook and forwards TxRecord to all configured
  IOnActionHook implementations for the transaction's execution selector

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

### _executeActionHooks

```solidity
function _executeActionHooks(struct EngineBlox.TxRecord txRecord) internal nonpayable
```

Executes all hooks for the transaction's execution selector using the unified
     onAction callback. If any hook reverts, the entire parent transaction reverts;
     only register trusted, non-reverting hook contracts.

**Parameters:**
- `` (): The transaction record produced by the operation



---

### _postActionHook

```solidity
function _postActionHook(struct EngineBlox.TxRecord txRecord) internal nonpayable
```

Centralized post-action hook implementation.
     Called by BaseStateMachine after any transaction operation that produces a TxRecord.
     Forwards the TxRecord to all configured IOnActionHook implementations for the
     transaction's execution selector.




---


## Events


## Structs


## Enums


