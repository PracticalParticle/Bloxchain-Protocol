# Solidity API

# GuardController

Lightweight controller for generic contract delegation with full StateAbstraction workflows

This contract provides a complete solution for delegating control to external addresses.
It extends RuntimeRBAC for runtime function registration and supports all StateAbstraction
execution patterns including time-locked transactions, meta-transactions, and payment management.

Key Features:
- Runtime function schema registration via RuntimeRBAC
- Function selector to full signature mapping for interface tracking
- Full StateAbstraction workflow support (STANDARD, RAW, NONE execution types)
- Meta-transaction support for delegated approvals and cancellations
- Payment management for native tokens and ERC20 tokens
- Role-based access control with action-level permissions
- No target authorization list - relies on target contract's access control

Usage Flow:
1. Deploy GuardController
2. Register function schemas with full signatures via RuntimeRBAC
3. Create roles and assign function permissions with action bitmaps
4. Assign wallets to roles
5. Execute operations via time-lock workflows based on action permissions
6. Target contract validates access (ownership/role-based)

Workflows Available:
- Standard execution: function selector + params
- Time-locked approval: request + approve workflow
- Meta-transaction workflows: signed approvals/cancellations



**Security Contact:** security@particlecrypto.com

## Functions

### executeWithTimeLock

```solidity
function executeWithTimeLock(address target, bytes4 functionSelector, bytes params, uint256 gasLimit, bytes32 operationType) public nonpayable returns (uint256)
```

Requests a time-locked standard execution via StateAbstraction workflow

**Parameters:**
- `` (): The address of the target contract
- `` (): The function selector to execute
- `` (): The encoded parameters for the function
- `` (): The gas limit for execution
- `` (): The operation type hash

**Returns:**
- The transaction ID for the requested operation


---

### approveTimeLockExecution

```solidity
function approveTimeLockExecution(uint256 txId, bytes32 expectedOperationType) public nonpayable returns (bytes)
```

Approves and executes a time-locked transaction




---

### cancelTimeLockExecution

```solidity
function cancelTimeLockExecution(uint256 txId, bytes32 expectedOperationType) public nonpayable returns (struct StateAbstraction.TxRecord)
```

Cancels a time-locked transaction




---

### approveTimeLockExecutionWithMetaTx

```solidity
function approveTimeLockExecutionWithMetaTx(struct StateAbstraction.MetaTransaction metaTx, bytes32 expectedOperationType, bytes4 requiredSelector) public nonpayable returns (struct StateAbstraction.TxRecord)
```

Approves a time-locked transaction using a meta-transaction




---

### cancelTimeLockExecutionWithMetaTx

```solidity
function cancelTimeLockExecutionWithMetaTx(struct StateAbstraction.MetaTransaction metaTx, bytes32 expectedOperationType, bytes4 requiredSelector) public nonpayable returns (struct StateAbstraction.TxRecord)
```

Cancels a time-locked transaction using a meta-transaction




---

### requestAndApproveExecution

```solidity
function requestAndApproveExecution(struct StateAbstraction.MetaTransaction metaTx, bytes4 requiredSelector) public nonpayable returns (struct StateAbstraction.TxRecord)
```

Requests and approves a transaction in one step using a meta-transaction




---


## Events


## Structs


## Enums


