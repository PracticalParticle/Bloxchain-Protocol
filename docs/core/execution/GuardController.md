# Solidity API

# GuardController

Lightweight controller for generic contract delegation with full EngineBlox workflows

This contract provides a complete solution for delegating control to external addresses.
It extends BaseStateMachine for core state machine functionality and supports all EngineBlox
execution patterns including time-locked transactions, meta-transactions, and payment management.

Key Features:
- Core state machine functionality from BaseStateMachine
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
- executeGuardConfigBatch: Batch execution for adding/removing targets from whitelist (OWNER_ROLE only)
- getAllowedTargets: Query whitelisted targets for a function selector


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
function executeWithTimeLock(address target, uint256 value, bytes4 functionSelector, bytes params, uint256 gasLimit, bytes32 operationType) public nonpayable returns (uint256)
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
- The transaction ID for the requested operation


---

### executeWithPayment

```solidity
function executeWithPayment(address target, uint256 value, bytes4 functionSelector, bytes params, uint256 gasLimit, bytes32 operationType, struct EngineBlox.PaymentDetails paymentDetails) public nonpayable returns (uint256)
```

Requests a time-locked execution with payment details attached (same permissions as executeWithTimeLock)

**Parameters:**
- `` (): The address of the target contract
- `` (): The ETH value to send (0 for standard function calls)
- `` (): The function selector to execute (NATIVE_TRANSFER_SELECTOR for simple native token transfers)
- `` (): The encoded parameters for the function (empty for simple native token transfers)
- `` (): The gas limit for execution
- `` (): The operation type hash
- `` (): The payment details to attach to the transaction

**Returns:**
- The transaction ID for the requested operation (use getTransaction(txId) for full record)


---

### approveTimeLockExecution

```solidity
function approveTimeLockExecution(uint256 txId) public nonpayable returns (uint256)
```

Approves and executes a time-locked transaction

**Parameters:**
- `` (): The transaction ID

**Returns:**
- result The execution result


---

### cancelTimeLockExecution

```solidity
function cancelTimeLockExecution(uint256 txId) public nonpayable returns (uint256)
```

Cancels a time-locked transaction

**Parameters:**
- `` (): The transaction ID

**Returns:**
- The updated transaction record


---

### approveTimeLockExecutionWithMetaTx

```solidity
function approveTimeLockExecutionWithMetaTx(struct EngineBlox.MetaTransaction metaTx) public nonpayable returns (uint256)
```

Approves a time-locked transaction using a meta-transaction

**Parameters:**
- `` (): The meta-transaction containing the transaction record and signature

**Returns:**
- The updated transaction record


---

### cancelTimeLockExecutionWithMetaTx

```solidity
function cancelTimeLockExecutionWithMetaTx(struct EngineBlox.MetaTransaction metaTx) public nonpayable returns (uint256)
```

Cancels a time-locked transaction using a meta-transaction

**Parameters:**
- `` (): The meta-transaction containing the transaction record and signature

**Returns:**
- The updated transaction record


---

### requestAndApproveExecution

```solidity
function requestAndApproveExecution(struct EngineBlox.MetaTransaction metaTx) public nonpayable returns (uint256)
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

### guardConfigBatchRequestAndApprove

```solidity
function guardConfigBatchRequestAndApprove(struct EngineBlox.MetaTransaction metaTx) public nonpayable returns (uint256)
```

Requests and approves a Guard configuration batch using a meta-transaction

**Parameters:**
- `` (): The meta-transaction

**Returns:**
- The transaction record


---

### executeGuardConfigBatch

```solidity
function executeGuardConfigBatch(struct IGuardController.GuardConfigAction[] actions) external nonpayable
```

External function that can only be called by the contract itself to execute a Guard configuration batch

**Parameters:**
- `` (): Encoded guard configuration actions



---

### _executeGuardConfigBatch

```solidity
function _executeGuardConfigBatch(struct IGuardController.GuardConfigAction[] actions) internal nonpayable
```

Internal helper to execute a Guard configuration batch

**Parameters:**
- `` (): Encoded guard configuration actions



---

### _executeAddTargetToWhitelist

```solidity
function _executeAddTargetToWhitelist(bytes data) internal nonpayable
```

Executes ADD_TARGET_TO_WHITELIST: adds a target address to a function's call whitelist

**Parameters:**
- `` (): ABI-encoded (bytes4 functionSelector, address target)



---

### _executeRemoveTargetFromWhitelist

```solidity
function _executeRemoveTargetFromWhitelist(bytes data) internal nonpayable
```

Executes REMOVE_TARGET_FROM_WHITELIST: removes a target address from a function's call whitelist

**Parameters:**
- `` (): ABI-encoded (bytes4 functionSelector, address target)



---

### _executeRegisterFunction

```solidity
function _executeRegisterFunction(bytes data) internal nonpayable
```

Executes REGISTER_FUNCTION: registers a new function schema with signature, operation name, and supported actions

**Parameters:**
- `` (): ABI-encoded (string functionSignature, string operationName, TxAction[] supportedActions)



---

### _executeUnregisterFunction

```solidity
function _executeUnregisterFunction(bytes data) internal nonpayable
```

Executes UNREGISTER_FUNCTION: unregisters a function schema by selector

**Parameters:**
- `` (): ABI-encoded (bytes4 functionSelector, bool safeRemoval)



---

### _logGuardConfigEvent

```solidity
function _logGuardConfigEvent(enum IGuardController.GuardConfigActionType actionType, bytes4 functionSelector, address target) internal nonpayable
```

Encodes and logs a guard config event via ComponentEvent. Payload decodes as (GuardConfigActionType, bytes4 functionSelector, address target).

**Parameters:**
- `` (): The guard config action type
- `` (): The function selector (or zero for N/A)
- `` (): The target address (or zero for N/A)



---

### _registerGuardedFunction

```solidity
function _registerGuardedFunction(string functionSignature, string operationName, enum EngineBlox.TxAction[] supportedActions) internal nonpayable returns (bytes4)
```

Internal helper to register a new function schema

**Parameters:**
- `` (): The function signature
- `` (): The operation name
- `` (): Array of supported actions

**Returns:**
- The derived function selector


---


## Events


## Structs


## Enums


