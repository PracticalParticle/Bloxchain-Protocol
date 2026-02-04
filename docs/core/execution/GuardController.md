# Solidity API

# GuardController

Lightweight controller for generic contract delegation with full EngineBlox workflows

This contract provides a complete solution for delegating control to external addresses.
It extends BaseStateMachine for core state machine functionality and supports all EngineBlox
execution patterns including time-locked transactions, meta-transactions, and payment management.

Key Features:
- Core state machine functionality from BaseStateMachine
- Function schema query support via BaseStateMachine (functionSchemaExists, getFunctionSchema)
- STANDARD execution type only (function selector + params)
- Meta-transaction support for delegated approvals and cancellations
- Payment management for native tokens and ERC20 tokens
- Role-based access control with action-level permissions
- Target address whitelist per function selector (defense-in-depth security layer)

Security Features:
- Target whitelist: Strict security - restricts which contract addresses can be called per function selector
- Prevents exploitation of global function selector permissions by limiting valid target contracts
- Strict enforcement: Target MUST be explicitly whitelisted for the function selector
- If whitelist is empty (no entries), no targets are allowed - explicit deny for security
- Target whitelist is ALWAYS checked - no backward compatibility fallback

Usage Flow:
1. Deploy GuardController (or combine with RuntimeRBAC/SecureOwnable for role management)
2. Function schemas should be registered via definitions or RuntimeRBAC if combined
3. Create roles and assign function permissions with action bitmaps (via RuntimeRBAC if combined)
4. Assign wallets to roles (via RuntimeRBAC if combined)
5. Configure target whitelists per function selector (REQUIRED for execution)
6. Execute operations via time-lock workflows based on action permissions
7. Target whitelist is ALWAYS validated before execution - target must be in whitelist
8. Target contract validates access (ownership/role-based)

Workflows Available:
- Standard execution: function selector + params
- Time-locked approval: request + approve workflow
- Meta-transaction workflows: signed approvals/cancellations

Whitelist Management:
- addTargetToWhitelist: Add a target address to whitelist (OWNER_ROLE only)
- removeTargetFromWhitelist: Remove a target address from whitelist (OWNER_ROLE only)
- getAllowedTargets: Query whitelisted targets for a role and function selector


**Notice:** This contract is modular and can be combined with RuntimeRBAC and SecureOwnable
Target whitelist is a GuardController-specific security feature, not part of EngineBlox library

**Security Contact:** security@particlecrypto.com

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

### executeWithTimeLock

```solidity
function executeWithTimeLock(address target, uint256 value, bytes4 functionSelector, bytes params, uint256 gasLimit, bytes32 operationType) public nonpayable returns (struct EngineBlox.TxRecord)
```

Requests a time-locked execution via EngineBlox workflow

**Parameters:**
- `` (): The address of the target contract
- `` (): The ETH value to send (0 for standard function calls)
- `` (): The function selector to execute (NATIVE_TRANSFER_SELECTOR for simple native token transfers)
- `` (): The encoded parameters for the function (empty for simple native token transfers)
- `` (): The gas limit for execution
- `` (): The operation type hash

**Returns:**
- txId The transaction ID for the requested operation


---

### approveTimeLockExecution

```solidity
function approveTimeLockExecution(uint256 txId) public nonpayable returns (struct EngineBlox.TxRecord)
```

Approves and executes a time-locked transaction

**Parameters:**
- `` (): The transaction ID

**Returns:**
- result The execution result


---

### cancelTimeLockExecution

```solidity
function cancelTimeLockExecution(uint256 txId) public nonpayable returns (struct EngineBlox.TxRecord)
```

Cancels a time-locked transaction

**Parameters:**
- `` (): The transaction ID

**Returns:**
- The updated transaction record


---

### approveTimeLockExecutionWithMetaTx

```solidity
function approveTimeLockExecutionWithMetaTx(struct EngineBlox.MetaTransaction metaTx) public nonpayable returns (struct EngineBlox.TxRecord)
```

Approves a time-locked transaction using a meta-transaction

**Parameters:**
- `` (): The meta-transaction containing the transaction record and signature

**Returns:**
- The updated transaction record


---

### cancelTimeLockExecutionWithMetaTx

```solidity
function cancelTimeLockExecutionWithMetaTx(struct EngineBlox.MetaTransaction metaTx) public nonpayable returns (struct EngineBlox.TxRecord)
```

Cancels a time-locked transaction using a meta-transaction

**Parameters:**
- `` (): The meta-transaction containing the transaction record and signature

**Returns:**
- The updated transaction record


---

### requestAndApproveExecution

```solidity
function requestAndApproveExecution(struct EngineBlox.MetaTransaction metaTx) public nonpayable returns (struct EngineBlox.TxRecord)
```

Requests and approves a transaction in one step using a meta-transaction

**Parameters:**
- `` (): The meta-transaction containing the transaction record and signature

**Returns:**
- The transaction record after request and approval


---

### _validateNotInternalFunction

```solidity
function _validateNotInternalFunction(address target, bytes4 functionSelector) internal view
```

Validates that GuardController is not attempting to access internal execution functions

**Parameters:**
- `` (): The target contract address
- `` (): The function selector to validate



---

### _addTargetToWhitelist

```solidity
function _addTargetToWhitelist(bytes4 functionSelector, address target) internal nonpayable
```

Internal helper to add a target address to the whitelist for a function selector

**Parameters:**
- `` (): The function selector
- `` (): The target address to whitelist



---

### _removeTargetFromWhitelist

```solidity
function _removeTargetFromWhitelist(bytes4 functionSelector, address target) internal nonpayable
```

Internal helper to remove a target address from the whitelist

**Parameters:**
- `` (): The function selector
- `` (): The target address to remove



---

### updateTargetWhitelistExecutionParams

```solidity
function updateTargetWhitelistExecutionParams(bytes4 functionSelector, address target, bool isAdd) public pure returns (bytes)
```

Creates execution params for updating the target whitelist for a function selector

**Parameters:**
- `` (): The function selector
- `` (): The target address to add or remove
- `` (): True to add the target, false to remove

**Returns:**
- The execution params to be used in a meta-transaction


---

### updateTargetWhitelistRequestAndApprove

```solidity
function updateTargetWhitelistRequestAndApprove(struct EngineBlox.MetaTransaction metaTx) public nonpayable returns (struct EngineBlox.TxRecord)
```

Requests and approves a whitelist update using a meta-transaction

**Parameters:**
- `` (): The meta-transaction describing the whitelist update

**Returns:**
- The transaction record


---

### executeUpdateTargetWhitelist

```solidity
function executeUpdateTargetWhitelist(bytes4 functionSelector, address target, bool isAdd) external nonpayable
```

External execution entrypoint for whitelist updates.
     Can only be called by the contract itself during protected EngineBlox workflows.

**Parameters:**
- `` (): The function selector
- `` (): The target address to add or remove
- `` (): True to add the target, false to remove



---

### getAllowedTargets

```solidity
function getAllowedTargets(bytes4 functionSelector) external view returns (address[])
```

Gets all whitelisted targets for a function selector

**Parameters:**
- `` (): The function selector

**Returns:**
- Array of whitelisted target addresses


---


## Events

### TargetAddedToWhitelist

```solidity
event TargetAddedToWhitelist(bytes4 functionSelector, address target)
```

Emitted when a target address is added to the whitelist

**Parameters:**
- `` (): The function selector
- `` (): The target address that was whitelisted

---

### TargetRemovedFromWhitelist

```solidity
event TargetRemovedFromWhitelist(bytes4 functionSelector, address target)
```

Emitted when a target address is removed from the whitelist

**Parameters:**
- `` (): The function selector
- `` (): The target address that was removed

---


## Structs


## Enums


