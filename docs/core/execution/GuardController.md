# GuardController

GuardController is a lightweight, role-driven execution controller that layers on top of BaseStateMachine, SecureOwnable and DynamicRBAC to provide:

- Selector-level authorization (function-by-function control)
- Time-locked execution (request → approve/cancel)
- Meta-transaction workflows (sign/execute with EIP-712)
- Minimal bytecode footprint and clear separation of concerns
- Built-in security for critical operations and recovery workflows

It is intended to be used directly (via inheritance) or through a deployable facade (see `contracts/GuardBlox.sol`).

---

## Design Overview

- BaseStateMachine (engine)
  - Transaction lifecycle (request, approve, cancel) with time-locks
  - Meta-transaction primitives (EIP-712 verification, nonces)
  - State queries and event forwarding
- SecureOwnable (security)
  - Ownership, Broadcaster, and Recovery roles managed via the state machine
  - Security workflows for ownership transfer, broadcaster/recovery updates, and timelock updates
  - Initialization of security context and EIP-712 domain
- DynamicRBAC (authorization)
  - Roles and wallet assignment/limits
  - Function permissions per selector via action bitmaps
- GuardController (policy)
  - Public workflows that enforce selector-based RBAC
  - Runtime registration/unregistration of function schemas
  - Optional safe-removal guard for schema deletion

This layering keeps the policy (RBAC + selector checks) distinct from the core state machine logic.

---

## Ownership and Initialization (SecureOwnable)

GuardController sits above `DynamicRBAC`, which itself builds on `SecureOwnable` (security layer) and `BaseStateMachine` (engine). `SecureOwnable` provides:

- Role-backed security model: Owner, Broadcaster, Recovery
- Modifiers validated through `SharedValidation`: `onlyOwner`, `onlyBroadcaster`, `onlyRecovery`, and combinations
- Initialization entrypoint to set the security context and EIP-712 domain:
  - `initialize(address initialOwner, address broadcaster, address recovery, uint256 timeLockPeriodSec, address eventForwarder)`
- Built-in secure workflows (implemented using BaseStateMachine):
  - Ownership transfer (request/approve/cancel + meta variants)
  - Broadcaster and recovery address updates
  - Timelock period updates

Deployment pattern:
- The deployable wrapper `GuardBlox` calls `initialize(...)` in its constructor to configure Owner/Broadcaster/Recovery, timelock, and event forwarder.
- For upgradeable deployments, ensure `initialize(...)` is called exactly once.

---

## Function Registration

```solidity
function registerFunctionWithSignature(
  string functionSignature,                     // e.g., "transfer(address,uint256)"
  string operationName,                         // e.g., "ERC20_TRANSFER"
  StateAbstraction.TxAction[] supportedActions  // include ALL actions you want to expose for this selector
) external onlyOwner
```

- Derives selector: `bytes4(keccak256(bytes(functionSignature)))`
- Derives `operationType = keccak256(bytes(operationName))`
- Converts `supportedActions` → `supportedActionsBitmap` using `StateAbstraction.createBitmapFromActions`
- Creates and loads a `FunctionSchema` with `functionName = functionSignature` for UX discoverability
- Does not modify roles; grant function permissions via DynamicRBAC

Notes
- Signatures must be canonical ABI strings (no spaces), e.g. `approve(address,uint256)` or `do((uint256,address))`.
- If a schema already exists for the selector, the call reverts.
- Include every `TxAction` you intend to enable for this selector in `supportedActions` (e.g., REQUEST, APPROVE, CANCEL, and/or META actions). Roles will later grant a subset of these as needed.

### Attach to a Role (DynamicRBAC)

Registering a function schema is not sufficient for access. You must attach the selector to a role with an action bitmap before it can be used.

```solidity
// Choose all actions you want the schema to support
StateAbstraction.TxAction[] memory actionsArray = new StateAbstraction.TxAction[](5);
actionsArray[0] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_REQUEST;
actionsArray[1] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_APPROVE;
actionsArray[2] = StateAbstraction.TxAction.EXECUTE_TIME_DELAY_CANCEL;
actionsArray[3] = StateAbstraction.TxAction.SIGN_META_APPROVE;
actionsArray[4] = StateAbstraction.TxAction.EXECUTE_META_APPROVE;

StateAbstraction.FunctionPermission[] memory perms = new StateAbstraction.FunctionPermission[](1);
perms[0] = StateAbstraction.FunctionPermission({
  functionSelector: bytes4(keccak256("transfer(address,uint256)")),
  grantedActionsBitmap: StateAbstraction.createBitmapFromActions(actionsArray)
});

bytes32 roleHash = controller.createNewRole("TOKEN_OPERATOR", 3, perms); // onlyOwner

// Add an operator wallet to the role so it can use the permissions
controller.addWalletToRole(roleHash, operatorWallet); // onlyOwner
```

---

## Unregistration

```solidity
function unregisterFunction(bytes4 functionSelector, bool safeRemoval) external onlyOwner
```

- Validates schema existence and non-protection
- If `safeRemoval == true`, scans all roles via BaseStateMachine views and reverts if any role still references the selector
- If `false`, removes the schema immediately; role entries become inert (cannot be executed without a schema)

Recommended usage
- For emergency revocation, set `safeRemoval = false`
- For planned deprecation, use `true` to ensure no roles reference the selector before deletion

---

## Execution Workflows

All workflows enforce selector-level RBAC checks, then delegate to BaseStateMachine.

### Request (STANDARD)
```solidity
function executeWithTimeLock(
  address target,
  bytes4 functionSelector,
  bytes memory params,
  uint256 gasLimit,
  bytes32 operationType
) public returns (uint256 txId)
```
- Requires `EXECUTE_TIME_DELAY_REQUEST` for the selector
- Uses `_requestStandardTransaction`

### Approve
```solidity
function approveTimeLockExecution(uint256 txId, bytes32 expectedOperationType)
  public returns (bytes memory result)
```
- Uses `_approveTransaction`
- Optional `expectedOperationType` validation adds defense-in-depth

### Cancel
```solidity
function cancelTimeLockExecution(uint256 txId, bytes32 expectedOperationType)
  public returns (StateAbstraction.TxRecord memory)
```
- Uses `_cancelTransaction` and validates operation type

### Meta-transaction Variants
```solidity
approveTimeLockExecutionWithMetaTx(metaTx, expectedOperationType, requiredSelector)
cancelTimeLockExecutionWithMetaTx(metaTx, expectedOperationType, requiredSelector)
requestAndApproveExecution(metaTx, requiredSelector)
```
- Require `EXECUTE_META_*` permissions
- BaseStateMachine verifies EIP-712 signature, deadline, and nonce

---

## Roles and Permissions

- Roles and function permissions are managed with DynamicRBAC
- GuardController checks permissions via BaseStateMachine's `_hasActionPermission(caller, selector, action)`
- Typical set for standard flows:
  - `EXECUTE_TIME_DELAY_REQUEST` to request
  - `EXECUTE_TIME_DELAY_APPROVE` to approve
  - `EXECUTE_TIME_DELAY_CANCEL` to cancel (optional)

---

## Security Considerations

- Canonical ABI signatures only (no spaces) for reliable selector derivation
- No RAW/NONE execution entry points: reduces attack surface and enforces selector-based RBAC
- Removing a schema immediately disables new requests for that selector; use `safeRemoval` to prevent accidental deletion while referenced
- Optional `expectedOperationType` validation protects against mismatched workflow approvals

---

## Gas and Size Notes

- Action permissions are stored as a `uint16` bitmap for compactness
- `functionName` stores the full signature only within the schema; no separate on-chain mapping is kept
- GuardController reuses BaseStateMachine helpers to minimize duplicate bytecode

---

## Examples

### 1) Register ERC20 transfer
```solidity
controller.registerFunctionWithSignature(
  "transfer(address,uint256)",
  "ERC20_TRANSFER",
  new StateAbstraction.TxAction[](5) // provide the full list when constructing
);
// Populate the actions array with REQUEST, APPROVE, CANCEL, and desired META actions as shown above
```

### 2) Attach selector to role and add wallet
```solidity
// Using the role creation and wallet assignment snippet above
// roleHash = controller.createNewRole(...)
// controller.addWalletToRole(roleHash, operatorWallet)
```

### 3) Request a transfer (by a wallet that has REQUEST on the selector)
```solidity
bytes memory params = abi.encode(recipient, amount);
uint256 txId = controller.executeWithTimeLock(
  token,
  bytes4(keccak256("transfer(address,uint256)")),
  params,
  gasLimit,
  keccak256(bytes("ERC20_TRANSFER"))
);
```

### 4) Approve after timelock (by a wallet that has APPROVE on the selector)
```solidity
bytes memory result = controller.approveTimeLockExecution(
  txId,
  keccak256(bytes("ERC20_TRANSFER"))
);
```

---

## Public API Summary

- Registration
  - `registerFunctionWithSignature(string, string, TxAction[])`
  - `unregisterFunction(bytes4, bool)`
- Execution
  - `executeWithTimeLock(address, bytes4, bytes, uint256, bytes32)`
  - `approveTimeLockExecution(uint256, bytes32)`
  - `cancelTimeLockExecution(uint256, bytes32)`
- Meta
  - `approveTimeLockExecutionWithMetaTx(MetaTransaction, bytes32, bytes4)`
  - `cancelTimeLockExecutionWithMetaTx(MetaTransaction, bytes32, bytes4)`
  - `requestAndApproveExecution(MetaTransaction, bytes4)`

For a ready-to-deploy contract, see `contracts/GuardBlox.sol`, which extends `GuardController` with an initializer aligned to `BareBlox`, `RoleBlox`, and `SecureBlox`.

