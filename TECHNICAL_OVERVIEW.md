# Bloxchain Protocol — Technical Overview

**Purpose**: Authoritative technical reference for AI-assisted and human security audits.  
**Audience**: Auditors, security reviewers, and automated analysis tools.  
**Last Updated**: 2026-03-07  
**Related**: [ATTACK_VECTORS_CODEX.md](test/foundry/docs/ATTACK_VECTORS_CODEX.md) (174+ documented vectors), [WHITEPAPER.md](WHITEPAPER.md)

---

## Table of Contents

1. [Document Scope and How to Use This](#1-document-scope-and-how-to-use-this)
2. [Repository and Core Code Map](#2-repository-and-core-code-map)
3. [State Model and Types](#3-state-model-and-types)
4. [Redundant Specifications and Dual Enforcement](#4-redundant-specifications-and-dual-enforcement)
5. [Operational Logic](#5-operational-logic)
6. [System Limits and Validation](#6-system-limits-and-validation-sharedvalidation--engineblox)
7. [Security Construction and Attack Vector Coverage](#7-security-construction-and-attack-vector-coverage)
8. [Definition Contracts and Schema Rules](#8-definition-contracts-and-schema-rules)
9. [EIP-712 and Meta-Transaction Encoding](#9-eip-712-and-meta-transaction-encoding)
10. [Audit Checklist](#10-audit-checklist-high-level)

---

## 1. Document Scope and How to Use This

This document provides:

- **Code map**: Exact locations of core logic, state, and entry points in `contracts/core/`.
- **Redundant specifications**: Where the same security rule is enforced in multiple places (handler vs execution, definitions, protected roles).
- **Operational logic**: How time-delay vs meta-transaction flows work and how dual-permission (sign vs execute) is enforced.
- **Restrictions and invariants**: System limits, validation rules, and custom errors (SharedValidation).
- **Security construction**: Layered controls and pointer to the Attack Vectors Codex for full threat coverage.

**For AI auditors**: Use this as the primary context document. Cross-reference each invariant and restriction with the Codex (section and vector ID) to confirm test coverage and protection status.

### Quick Reference: File → Primary Responsibility

| File | Responsibility |
|------|----------------|
| `lib/EngineBlox.sol` | State struct, tx lifecycle, RBAC, EIP-712, payments, hooks, target whitelist check, all permission checks |
| `base/BaseStateMachine.sol` | Single `_secureState`, wrappers for EngineBlox, definition loading, meta-tx helpers, queries |
| `security/SecureOwnable.sol` | Owner/broadcaster/recovery/timelock; time-delay + meta-tx for each; one pending ownership/broadcaster request |
| `access/RuntimeRBAC.sol` | `roleConfigBatchRequestAndApprove` → `executeRoleConfigBatch`; only non-protected roles |
| `execution/GuardController.sol` | `executeWithTimeLock`/`WithPayment`, approve/cancel (direct + meta-tx), guard config batch; target whitelist usage |
| `pattern/Account.sol` | Compose GuardController + RuntimeRBAC + SecureOwnable; single init |
| `lib/utils/SharedValidation.sol` | All custom errors and validation helpers |
| `*Definitions.sol` | Function schemas + role permissions for init; action encoders (Guard, Role) |

## 2. Repository and Core Code Map

### 2.1 Directory Layout (contracts/core)

| Path | Purpose |
|------|--------|
| `lib/EngineBlox.sol` | **Library**: Single source of state (`SecureOperationState`), transaction lifecycle, RBAC, EIP-712 meta-tx, payments, hooks. No standalone deployment. |
| `base/BaseStateMachine.sol` | **Base contract**: Holds `_secureState`, wraps EngineBlox, exposes `_requestTransaction`, `_approveTransaction`, `_approveTransactionWithMetaTx`, `_cancelTransaction`, meta-tx helpers, state/role queries, definition loading. Inherited by all components. |
| `security/SecureOwnable.sol` | **Component**: Owner/broadcaster/recovery and timelock management. Time-delay and meta-tx flows for ownership transfer, broadcaster update, recovery update, timelock update. Loads `SecureOwnableDefinitions`. |
| `access/RuntimeRBAC.sol` | **Component**: Dynamic (non-protected) role creation, wallet assign/revoke, function-per-role permissions. Single entry: `roleConfigBatchRequestAndApprove` (meta-tx) → `executeRoleConfigBatch`. Loads `RuntimeRBACDefinitions`. |
| `execution/GuardController.sol` | **Component**: Time-locked execution and meta-tx execution. `executeWithTimeLock`, `executeWithPayment`, `approveTimeLockExecution`, `cancelTimeLockExecution`, meta-tx variants, `guardConfigBatchRequestAndApprove` → `executeGuardConfigBatch`. Per-function **target whitelist** enforced in EngineBlox. Loads `GuardControllerDefinitions`. |
| `pattern/Account.sol` | **Composition**: Inherits GuardController, RuntimeRBAC, SecureOwnable. Single `initialize(...)` and ERC165 aggregation. |
| `lib/utils/SharedValidation.sol` | **Library**: All custom errors and shared validation helpers (address, time, nonce, chainId, signature, permissions, batch size, etc.). |
| `lib/interfaces/IDefinition.sol` | **Interface**: `getFunctionSchemas()`, `getRolePermissions()` for definition loading. |
| `lib/interfaces/IEventForwarder.sol` | **Interface**: Optional event forwarding. |
| `security/lib/definitions/SecureOwnableDefinitions.sol` | **Definitions**: Function schemas + role permissions for SecureOwnable (OWNER, BROADCASTER, RECOVERY). |
| `access/lib/definitions/RuntimeRBACDefinitions.sol` | **Definitions**: Function schemas + role permissions for RuntimeRBAC (role config batch only). |
| `execution/lib/definitions/GuardControllerDefinitions.sol` | **Definitions**: Function schemas + role permissions for GuardController; guard config action encoders. |

### 2.2 Data Flow Summary

- **State**: Lives only in `EngineBlox.SecureOperationState` (storage in BaseStateMachine).
- **Entry points**: All user-facing actions go through BaseStateMachine wrappers that call `EngineBlox.*` with `_getSecureState()`.
- **Definitions**: Loaded once at init via `_loadDefinitions(functionSchemas, roleHashes, functionPermissions, requireProtected)`. Each component (SecureOwnable, RuntimeRBAC, GuardController) has its own definition contract; Account calls each component’s `initialize` which in turn calls `_initializeBaseStateMachine` once and then loads that component’s definitions.

---

## 3. State Model and Types

### 3.1 SecureOperationState (EngineBlox.sol)

Central state struct; all mutations go through EngineBlox.

- **System**: `initialized`, `txCounter`, `timeLockPeriodSec`
- **Transactions**: `txRecords`, `pendingTransactionsSet`
- **RBAC**: `roles`, `supportedRolesSet`, `walletRoles` (reverse index: wallet → set of role hashes)
- **Functions**: `functions` (FunctionSchema per selector), `supportedFunctionsSet`, `supportedOperationTypesSet`
- **Meta-tx**: `signerNonces` (per signer)
- **Event**: `eventForwarder`
- **Guards**: `functionTargetWhitelist`, `functionTargetHooks`, `systemMacroSelectorsSet`

### 3.2 TxStatus and TxAction (EngineBlox.sol)

- **TxStatus**: UNDEFINED, PENDING, EXECUTING, PROCESSING_PAYMENT, CANCELLED, COMPLETED, FAILED, REJECTED.  
  Critical invariant: approval/execution/cancel only allowed when status is PENDING; status is set to EXECUTING (or CANCELLED) **before** any external call to prevent reentrancy-based bypass.
- **TxAction** (9 values): Distinguish **who** can do **what**:
  - Time-delay: `EXECUTE_TIME_DELAY_REQUEST`, `EXECUTE_TIME_DELAY_APPROVE`, `EXECUTE_TIME_DELAY_CANCEL`
  - Meta-tx sign: `SIGN_META_REQUEST_AND_APPROVE`, `SIGN_META_APPROVE`, `SIGN_META_CANCEL`
  - Meta-tx execute: `EXECUTE_META_REQUEST_AND_APPROVE`, `EXECUTE_META_APPROVE`, `EXECUTE_META_CANCEL`

### 3.3 Role and FunctionPermission (EngineBlox.sol)

- **Role**: `roleName`, `roleHash`, `authorizedWallets` (EnumerableSet), `functionPermissions` (mapping bytes4 → FunctionPermission), `functionSelectorsSet`, `maxWallets`, `walletCount`, `isProtected`.
- **FunctionPermission**: `functionSelector`, `grantedActionsBitmap` (uint16, TxAction bitmap), `handlerForSelectors` (bytes4[]).  
  If `handlerForSelectors` contains the same selector as `functionSelector`, this is an **execution** selector; otherwise handler selectors point to execution selectors.
- **FunctionSchema**: `functionSignature`, `functionSelector`, `operationType`, `operationName`, `supportedActionsBitmap`, `enforceHandlerRelations`, `isProtected`, `handlerForSelectors`.  
  Used to validate that a role’s FunctionPermission is consistent with the schema (handler relationships, no granting of both SIGN and EXECUTE for same selector — **ConflictingMetaTxPermissions**).

### 3.4 Protected Roles (System Constants)

- `OWNER_ROLE`, `BROADCASTER_ROLE`, `RECOVERY_ROLE` (keccak256 of "OWNER_ROLE", etc.).  
- Created at EngineBlox `initialize()`; cannot be removed or have last wallet revoked (RuntimeRBAC and EngineBlox enforce `isProtected`).

---

## 4. Redundant Specifications and Dual Enforcement

The protocol deliberately enforces the same security rules in multiple places. Auditors should treat each as a required layer.

### 4.1 Handler vs Execution Selector

- **Handler selector**: The function the user calls (e.g. `transferOwnershipApprovalWithMetaTx`). Checked via `msg.sig` at the BaseStateMachine boundary.
- **Execution selector**: The function that will be invoked on approval (e.g. `executeTransferOwnership`). Stored in `TxRecord.params.executionSelector` and checked in EngineBlox for both time-delay and meta-tx.
- **Dual-permission**: For meta-transactions, EngineBlox verifies permission for **both** `metaTx.params.handlerSelector` and `metaTx.txRecord.params.executionSelector` for the signer’s action. So one role cannot both sign and execute the same logical operation unless explicitly granted both (definitions avoid that for OWNER vs BROADCASTER).

### 4.2 Role Separation (Meta-Transaction)

- **ConflictingMetaTxPermissions**: When adding a function permission, EngineBlox disallows granting both SIGN_* and EXECUTE_* actions for the same function selector. So a single role cannot be both signer and executor for that selector.
- Definitions (SecureOwnableDefinitions, GuardControllerDefinitions, RuntimeRBACDefinitions) encode this by giving OWNER only SIGN_* and BROADCASTER only EXECUTE_* for the same handler/execution pair where intended.

### 4.3 Target Whitelist (GuardController / EngineBlox)

- Execution requests (time-delay or meta-tx) are only valid if `target` is either:
  - In `functionTargetWhitelist[executionSelector]`, or
  - Equal to `address(this)` and `executionSelector` is in `systemMacroSelectorsSet`.
- Empty whitelist means no targets allowed for that selector. No fallback.

### 4.4 Definition Loading and requireProtected

- `_loadDefinitions(..., requireProtected)` can require that every loaded function schema has `isProtected == true`. SecureOwnable, RuntimeRBAC, and GuardController all call with `requireProtected: true`, so no unprotected schemas are loaded at init from these definitions.

### 4.5 Initialization Once

- `EngineBlox.initialize` reverts if `self.initialized` is already true. BaseStateMachine’s `_initializeBaseStateMachine` only calls EngineBlox.initialize when `!_secureState.initialized`, so state is initialized once even when Account calls multiple component initializers.

---

## 5. Operational Logic

### 5.1 Time-Delay Workflow

1. **Request**: Caller must have permission for **handler** selector with action `EXECUTE_TIME_DELAY_REQUEST` and for **execution** selector with same action. EngineBlox creates TxRecord (status PENDING, `releaseTime = block.timestamp + timeLockPeriodSec`), stores it, adds to `pendingTransactionsSet`.
2. **Approve**: After `block.timestamp >= releaseTime`, caller must have permission for the **handler** (e.g. `approveTimeLockExecution`) with `EXECUTE_TIME_DELAY_APPROVE` and for the **execution** selector with same action. EngineBlox sets status to EXECUTING, then performs low-level call to `target` with `executionParams` (and optional payment). No external call is made before status change.
3. **Cancel**: Caller must have permission for handler with `EXECUTE_TIME_DELAY_CANCEL` and for execution selector with same. Status set to CANCELLED.

### 5.2 Meta-Transaction Workflow

1. **Sign**: Signer produces EIP-712 signature over `MetaTransaction` (TxRecord + MetaTxParams + data). Signer must have SIGN_* permission for both handler and execution selector.
2. **Execute**: Executor calls the handler (e.g. `approveTimeLockExecutionWithMetaTx(metaTx)`). Contract validates: signature length, tx status PENDING, requester non-zero, chainId, deadline, gas price, nonce; then **authorization** for both handler and execution selector for the **signer** and the given action; then EIP-712 hash and signature recovery. Nonce is incremented **before** execution. Role separation (signer ≠ executor in practice) is enforced by definitions and ConflictingMetaTxPermissions.

### 5.3 Request-and-Approve in One Call (Meta-Tx)

- For operations that do not need a time delay (e.g. recovery update, timelock update, role config batch, guard config batch), the flow is “request and approve” in one meta-tx: signer signs a meta-tx with action `SIGN_META_REQUEST_AND_APPROVE` / `EXECUTE_META_REQUEST_AND_APPROVE`, executor submits it; EngineBlox creates the TxRecord and immediately executes (after nonce increment and all validations).

### 5.4 Execution-Only Entry Points (SecureOwnable / GuardController / RuntimeRBAC)

- Functions like `executeTransferOwnership(address)`, `executeGuardConfigBatch(...)`, `executeRoleConfigBatch(...)` are intended to be called only by the contract itself after an approved transaction. BaseStateMachine exposes `_validateExecuteBySelf()` which reverts unless `msg.sender == address(this)`. So only the internal execution path (from EngineBlox’s execution step) can call these.

---

## 6. System Limits and Validation (SharedValidation + EngineBlox)

### 6.1 EngineBlox Constants

- `MAX_BATCH_SIZE = 200`
- `MAX_ROLES = 1000`
- `MAX_HOOKS_PER_SELECTOR = 100`
- `MAX_FUNCTIONS = 2000`

### 6.2 Custom Errors (SharedValidation.sol) — Canonical List

- **Address**: InvalidAddress, NotNewAddress, validateNotZeroAddress, validateAddressUpdate, validateTargetAddress, validateHandlerContract
- **Time / deadline**: InvalidTimeLockPeriod, TimeLockPeriodZero, DeadlineInPast, MetaTxExpired, BeforeReleaseTime, NewTimelockSame; validateReleaseTime, validateMetaTxDeadline
- **Permissions**: NoPermission, NoPermissionForFunction, RestrictedOwner, RestrictedOwnerRecovery, RestrictedRecovery, RestrictedBroadcaster, SignerNotAuthorized, OnlyCallableByContract
- **Transaction / state**: NotSupported, InvalidOperationType, ZeroOperationTypeNotAllowed, TransactionStatusMismatch, AlreadyInitialized, NotInitialized, TransactionIdMismatch, PendingSecureRequest
- **Signature / meta-tx**: InvalidSignatureLength, InvalidSignature, InvalidNonce, ChainIdMismatch, InvalidHandlerSelector, InvalidSValue, InvalidVValue, ECDSAInvalidSignature, GasPriceExceedsMax
- **Resources**: ResourceNotFound, ResourceAlreadyExists, CannotModifyProtected; ItemAlreadyExists, ItemNotFound, InvalidOperation; DefinitionNotIDefinition
- **Role / function**: RoleWalletLimitReached, MaxWalletsZero, ConflictingMetaTxPermissions, InternalFunctionNotAccessible, ContractFunctionMustBeProtected, TargetNotWhitelisted, FunctionSelectorMismatch, HandlerForSelectorMismatch
- **General**: InvalidRange, OperationFailed; InvalidPayment, InsufficientBalance, PaymentFailed; ArrayLengthMismatch, IndexOutOfBounds
- **System limits**: BatchSizeExceeded, MaxRolesExceeded, MaxHooksExceeded, MaxFunctionsExceeded, RangeSizeExceeded

All validation in EngineBlox and components uses these errors (via `SharedValidation.*`) for consistent revert reasons and gas efficiency.

---

## 7. Security Construction and Attack Vector Coverage

### 7.1 Layered Controls

1. **State machine**: TxStatus and single-writer (EngineBlox) ensure no double-execution or cancel-after-execute.
2. **Time**: `releaseTime` and `validateReleaseTime` prevent premature approval; deadline in meta-tx prevents late execution.
3. **Nonce**: Per-signer nonce prevents meta-tx replay; nonce incremented before execution.
4. **Chain**: chainId in EIP-712 domain and in MetaTxParams prevents cross-chain replay.
5. **Signature**: EIP-712 hash covers all meaningful fields; s-value check reduces malleability.
6. **RBAC**: Handler + execution dual-permission and ConflictingMetaTxPermissions enforce role separation.
7. **Target whitelist**: Restricts which contracts can be called per execution selector.
8. **Protected roles**: OWNER/BROADCASTER/RECOVERY cannot be removed or left with zero wallets via batch or direct calls.

### 7.2 Attack Vectors Codex

The file **test/foundry/docs/ATTACK_VECTORS_CODEX.md** is the authoritative list of threats and mitigations. It includes:

- **18 categories**: 1) Access Control & Authorization, 2) Meta-Transaction Security, 3) State Machine & Transaction Lifecycle, 4) Reentrancy, 5) Input Validation & Data Manipulation, 6) Payment & Economic Security, 7) Composite & Multi-Vector, 8) Cryptographic & Signature, 9) Time-Based, 10) Role Management, 11) Target Whitelist & Function Schema, 12) Initialization & Upgrade, 13) Hook System, 14) Event Forwarding & Monitoring, 15) Definition Contracts & Schema Security, 16) New Attack Vectors (2026), 17) Gas Exhaustion & System Limits, 18) Protocol-Vulnerabilities-Index Derived.
- **174+ vectors** with IDs (e.g. AC-001, MT-001, SM-001), severity, status (PROTECTED / INTENTIONAL / etc.), location (file:line), and related tests.

**Audit usage**: For every invariant or restriction in this overview, search the Codex for the corresponding vector(s) and confirm protection status and test coverage.

---

## 8. Definition Contracts and Schema Rules

### 8.1 IDefinition Interface

- `getFunctionSchemas()` → `EngineBlox.FunctionSchema[]`
- `getRolePermissions()` → `RolePermission { roleHashes[], functionPermissions[] }` (parallel arrays)

### 8.2 Handler–Execution Consistency

- **FunctionSchema.handlerForSelectors**: For execution selectors, must include self-reference (selector itself). For handler selectors, must point only to valid execution selectors (and optionally self if it is also an execution path).
- **FunctionPermission.handlerForSelectors**: When `FunctionSchema.enforceHandlerRelations` is true, permission’s `handlerForSelectors` must match schema’s (with self-reference allowed for execution selectors). EngineBlox validates this in `addFunctionToRole` / definition loading.

### 8.3 SecureOwnable-Specific Constraints

- At most one pending ownership-transfer or broadcaster-update request at a time (`_hasOpenRequest` in SecureOwnable). Recovery can request/cancel ownership; owner/recovery can approve; broadcaster executes meta-tx approvals.

### 8.4 RuntimeRBAC Batch

- Only non-protected roles can be created or modified via `executeRoleConfigBatch`. Protected role modification reverts with CannotModifyProtected.

### 8.5 GuardController Guard Config Batch

- Actions: ADD_TARGET_TO_WHITELIST, REMOVE_TARGET_FROM_WHITELIST, REGISTER_FUNCTION, UNREGISTER_FUNCTION. Encoders and specs in GuardControllerDefinitions.

---

## 9. EIP-712 and Meta-Transaction Encoding

- **Domain**: name (Bloxchain hash), version (semver), chainId, verifyingContract.
- **Types**: MetaTransaction(TxRecord, MetaTxParams, data); TxRecord(…); TxParams(…); MetaTxParams(…); PaymentDetails(…).  
  TxParams includes `executionSelector` and `executionParams` so the executed operation is bound in the signed message.
- **Hashing**: Full struct hash is used for signature verification; any change to TxRecord or MetaTxParams invalidates the signature.

---

## 10. Audit Checklist (High Level)

- [ ] **State**: All mutations to SecureOperationState occur only inside EngineBlox; BaseStateMachine and components only pass storage reference.
- [ ] **Status**: No external call before status transition from PENDING to EXECUTING or CANCELLED; reentrancy tests (RE-001, RE-002, RE-003) in Codex.
- [ ] **Time**: Premature approval (SM-003), time-lock manipulation (SM-004); releaseTime and deadline enforced.
- [ ] **Meta-tx**: Replay (MT-001, MT-002), malleability (MT-003), message hash (MT-004), expiry (MT-005), gas price (MT-006), invalid signature (MT-007).
- [ ] **Access**: Protected roles (AC-001, AC-002), function selector/handler escalation (AC-003, AC-004), batch atomicity (AC-006), wallet limit (AC-007), duplicate wallet (AC-008).
- [ ] **Target whitelist**: TargetNotWhitelisted when target not in list; empty list means deny (Codex section 11).
- [ ] **Definitions**: requireProtected and schema consistency; no ConflictingMetaTxPermissions in loaded permissions.
- [ ] **Initialization**: Single init; AlreadyInitialized if repeated.
- [ ] **System limits**: Batch size, role count, hook count, function count enforced (Codex section 17).

Use **ATTACK_VECTORS_CODEX.md** for the full list of vector IDs, locations, and related tests.

---

*This technical overview is the single source of context for the Bloxchain core protocol. For threat coverage and test references, always cross-check with the Attack Vectors Codex.*
