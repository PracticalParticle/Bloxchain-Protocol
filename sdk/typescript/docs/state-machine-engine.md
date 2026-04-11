# Bloxchain State Machine Engine

## Overview

The Bloxchain State Machine Engine (`SecureOperationState`) is the core component that powers all security operations in the Bloxchain Protocol. It implements a sophisticated state management system that handles transaction lifecycle, access control, and security validation in a unified, auditable manner.

## State Machine Design Principles

### 1. **Centralized State Management**
All contract state flows through a single `SecureOperationState` instance, ensuring:
- **Consistency**: All operations follow the same state transition rules
- **Auditability**: Complete state history and transition logs
- **Security**: Centralized validation and access control

### 2. **Immutable State Transitions**
State changes follow strict, predefined rules:
- **Validation**: All state changes are validated before execution
- **Atomicity**: State changes are atomic (all-or-nothing)
- **Reversibility**: Some operations support rollback mechanisms

### 3. **Event-Driven Architecture**
State changes trigger events that can be:
- **Monitored**: External systems can track state changes
- **Forwarded**: Events can be forwarded to external contracts
- **Audited**: Complete audit trail of all state changes

## Core State Components

### `SecureOperationState` (canonical struct)

All state lives in a single `SecureOperationState` instance (see `contracts/core/lib/EngineBlox.sol`):

```solidity
struct SecureOperationState {
    // System state
    bool initialized;
    uint256 txCounter;
    uint256 timeLockPeriodSec;

    // Transaction management
    mapping(uint256 => TxRecord) txRecords;
    EnumerableSet.UintSet pendingTransactionsSet;

    // Role-based access control
    mapping(bytes32 => Role) roles;
    EnumerableSet.Bytes32Set supportedRolesSet;
    mapping(address => EnumerableSet.Bytes32Set) walletRoles;  // reverse index

    // Function management
    mapping(bytes4 => FunctionSchema) functions;
    EnumerableSet.Bytes32Set supportedFunctionsSet;
    EnumerableSet.Bytes32Set supportedOperationTypesSet;

    // Meta-transaction nonces
    mapping(address => uint256) signerNonces;

    // Event forwarding
    address eventForwarder;

    // Per-function target whitelist & hooks
    mapping(bytes4 => EnumerableSet.AddressSet) functionTargetWhitelist;
    mapping(bytes4 => EnumerableSet.AddressSet) functionTargetHooks;

    // System macro selectors (allowed to target address(this))
    EnumerableSet.Bytes32Set systemMacroSelectorsSet;
}
```

**Key sub-structures:**

- **`TxRecord`** — `txId`, `releaseTime`, `status` (`TxStatus` enum), `params` (`TxParams`), `message`, `result`, `payment` (`PaymentDetails`).
- **`Role`** — `roleName`, `roleHash`, `authorizedWallets` (enumerable set), per-selector `functionPermissions`, `maxWallets`, `walletCount`, `isProtected`.
- **`FunctionSchema`** — `functionSignature`, `functionSelector`, `operationType`, `operationName`, `supportedActionsBitmap`, `enforceHandlerRelations`, `isProtected`, `handlerForSelectors`.
- **`FunctionPermission`** — `functionSelector`, `grantedActionsBitmap` (9-bit `TxAction` bitmap), `handlerForSelectors`.

**Design notes:**
- **Flat RBAC** — Roles are independent; there is no role inheritance. A wallet may hold multiple roles, and permission checks union across all roles.
- **Operation types** are `bytes32` labels (e.g. `keccak256("OWNERSHIP_TRANSFER")`); the set tracks which types have registered function schemas.
- **Immutable safety limits** — `MAX_ROLES`, `MAX_FUNCTIONS`, `MAX_HOOKS_PER_SELECTOR`, `MAX_BATCH_SIZE` cap on-chain growth. Per-role `maxWallets` is operator-chosen.

## State Transition Patterns

### 1. Transaction Lifecycle (`TxStatus`)

The canonical status enum in `EngineBlox`:

```
UNDEFINED ─── (request) ───► PENDING ─┬── (delayed approve) ──► EXECUTING ──► COMPLETED
                                       │                              │
                                       ├── (meta approve) ────► EXECUTING ──► COMPLETED
                                       │                              │
                                       ├── (cancel) ──────────► CANCELLED    ├──► FAILED
                                       │                                      │
                                       │                              (payment)├──► PROCESSING_PAYMENT ──► COMPLETED
                                       │                                               │
                                       │                                               └──► revert (atomic rollback)
```

`TxStatus` also defines **`REJECTED`**, but **`EngineBlox` never assigns it** (there is no “reject” transition in the diagram above). The member is **intentionally unused** in the current engine: abandonment is **`CANCELLED`**; failed execution is **`FAILED`**. **`REJECTED`** stays in the enum for **ABI / layout stability** and **reserved** for possible future protocol or extension behavior — see NatSpec on `TxStatus` in `contracts/core/lib/EngineBlox.sol`.

| From | To | Trigger |
|------|----|---------|
| `UNDEFINED` | `PENDING` | `_txRequest` — creates a `TxRecord` with `txId = self.txCounter + 1`, stores it, increments `txCounter`, sets `releaseTime = block.timestamp + timeLockPeriodSec`, adds to `pendingTransactionsSet`. |
| `PENDING` | `EXECUTING` | **Delayed path:** `txDelayedApproval` (validates `releaseTime` has passed). **Meta path:** `txApprovalWithMetaTx` → `_txApprovalWithMetaTx` (timelock **not** enforced). **Request-and-approve:** `requestAndApprove` (combines request + meta approval in one call). |
| `EXECUTING` | `COMPLETED` | `executeTransaction` succeeds; `_completeTransaction` finalizes. |
| `EXECUTING` | `PROCESSING_PAYMENT` | Main call succeeded and a non-zero `PaymentDetails.recipient` is present — `executeAttachedPayment` runs. |
| `PROCESSING_PAYMENT` | `COMPLETED` | Payment succeeds. |
| `PROCESSING_PAYMENT` | (revert) | Payment fails → entire approval tx reverts (atomic rollback). |
| `EXECUTING` | `FAILED` | Main call returns `success == false`; `_completeTransaction` records the failure. |
| `PENDING` | `CANCELLED` | `txCancellation` (direct) or `txCancellationWithMetaTx` (meta; wrapper selector in `MetaTxParams.handlerSelector`). |

There is **no** `APPROVED` or `EXECUTED` status in the enum — the engine transitions directly from `PENDING` to `EXECUTING`. There is also **no** runtime use of **`TxStatus.REJECTED`** (see note under the diagram).

### 2. Role Management

Roles are created and configured via `EngineBlox` library functions (exposed through `RuntimeRBAC` batch operations). There is no separate "lifecycle state" enum for roles:

- **`createRole`** — registers a new role with `roleName`, `maxWallets`, `isProtected`.
- **`removeRole`** — deletes the role, revokes all wallets, removes all function permissions. Protected roles cannot be removed.
- **`assignWallet` / `revokeWallet` / `updateWallet`** — manage membership.
- **`addFunctionToRole` / `removeFunctionFromRole`** — grant or revoke per-selector `FunctionPermission` entries.

### 3. Operation Types

Operation types are `bytes32` labels registered alongside function schemas. They appear in `TxParams.operationType` and in `supportedOperationTypesSet`. When the last function schema with a given operation type is unregistered, the type is automatically removed from the set.

## Key `EngineBlox` Library Functions

The following are **real** function signatures in `contracts/core/lib/EngineBlox.sol`. Higher-level contracts (`SecureOwnable`, `GuardController`, `RuntimeRBAC`) call into these via `_secureState.<function>(...)`.

### 1. **Initialization**

`initialize(SecureOperationState, address owner, address broadcaster, address recovery, uint256 timeLockPeriodSec)` — creates the three protected roles, assigns wallets, registers default system macro selectors, sets the timelock. It does **not** configure the event forwarder.

`setEventForwarder(SecureOperationState, address eventForwarder)` — stores the optional `IEventForwarder` used by `logTxEvent` (separate call from `initialize`).

### 2. **Transaction request (public) and `_txRequest`**

Public request entrypoints take a **handler selector** (`bytes4 handlerSelector`) alongside **`executionSelector`** and **`executionParams`**: that value is the wrapper / external entrypoint selector used with `executionSelector` in `_validateExecutionAndHandlerPermissions` (RBAC and schema wiring). The internal request core does **not** repeat `handlerSelector` on its parameter list.

`txRequest(SecureOperationState, address requester, address target, uint256 value, uint256 gasLimit, bytes32 operationType, bytes4 handlerSelector, bytes4 executionSelector, bytes executionParams)` — validates permissions, then calls `_txRequest` with an empty `PaymentDetails` struct (no attached payment).

`txRequestWithPayment(SecureOperationState, address requester, address target, uint256 value, uint256 gasLimit, bytes32 operationType, bytes4 handlerSelector, bytes4 executionSelector, bytes executionParams, PaymentDetails paymentDetails)` — same permission path as `txRequest`, plus `_validateAttachedPaymentPolicy`, then `_txRequest` with the supplied `paymentDetails`. This is the **payment-specific** request entrypoint.

`_txRequest(SecureOperationState, address requester, address target, uint256 value, uint256 gasLimit, bytes32 operationType, bytes4 executionSelector, bytes executionParams, PaymentDetails payment)` — private: target whitelist, builds the `TxRecord` (`txId = self.txCounter + 1` at creation time, then `txCounter` increments), `status = PENDING`, `releaseTime = block.timestamp + timeLockPeriodSec`, pending set membership, event log.

### 3. **Transaction approval (delayed)**

`txDelayedApproval(SecureOperationState, uint256 txId, bytes4 handlerSelector)` — validates `PENDING`, checks permissions for `executionSelector` from the stored record **and** `handlerSelector`, enforces `releaseTime` (timelock), sets `EXECUTING`, runs `executeTransaction`, finalizes via `_completeTransaction`.

### 4. **Transaction approval (meta-tx)**

`txApprovalWithMetaTx(SecureOperationState, MetaTransaction metaTx)` — public entrypoint: validates `SIGN_META_APPROVE`, checks permissions using `metaTx.txRecord.params.executionSelector` and **`metaTx.params.handlerSelector`** (wrapper selector in the typed-data payload), then returns `_txApprovalWithMetaTx(self, metaTx)`.

`_txApprovalWithMetaTx(SecureOperationState, MetaTransaction metaTx)` — private: verifies EIP-712 (including `handlerSelector` / handler contract binding where applicable), increments signer nonce, sets `EXECUTING`, executes. **`validateReleaseTime` is not used** — timelock is **not** enforced on meta approval (by design).

### 5. **Request and approve (one-step meta-tx)**

`requestAndApprove(SecureOperationState, MetaTransaction metaTx)` — validates `SIGN_META_REQUEST_AND_APPROVE`, execution + **`metaTx.params.handlerSelector`** permissions, attached payment policy, then runs `_txRequest` from fields in `metaTx.txRecord` (the new record’s `txId` is `self.txCounter + 1` at creation, matching `createTxRecord`). It assigns `metaTx.txRecord` to that returned `TxRecord` and calls `_txApprovalWithMetaTx` so execution proceeds in the same transaction. Like other meta approvals, **timelock is not enforced** on this combined path.

### 6. **Cancellation**

`txCancellation(SecureOperationState, uint256 txId, bytes4 handlerSelector)` — validates `PENDING`, checks permissions for the stored `executionSelector` and `handlerSelector`, then cancels and removes from `pendingTransactionsSet`.

`txCancellationWithMetaTx(SecureOperationState, MetaTransaction metaTx)` — validates `SIGN_META_CANCEL`, permissions using **`metaTx.params.handlerSelector`**, record match, signature, then cancels the pending tx.

## Security Features

### 1. **Access Control Validation**

Permission checks use `hasActionPermission(SecureOperationState, address, bytes4 functionSelector, TxAction)` which unions across all roles the wallet holds. The check returns true if **any** of the wallet's roles include the `functionSelector` with the requested `TxAction` bit set in `grantedActionsBitmap`. Dual-selector paths (`_validateExecutionAndHandlerPermissions`) require `hasActionPermission` for both execution and handler selectors, plus a schema-level wiring check when `enforceHandlerRelations` is enabled.

### 2. **Time Lock Enforcement**

`SharedValidation.validateReleaseTime(releaseTime)` reverts if `block.timestamp < releaseTime`. This is called by `txDelayedApproval` (the direct approval path). Meta-tx approval paths (`txApprovalWithMetaTx` / `_txApprovalWithMetaTx`, including the approval half of `requestAndApprove`) intentionally **skip** timelock enforcement — the signed meta-tx itself serves as the authorization, enabling time-flexible delegated approval.

### 3. **State Validation**

`_validateTxStatus(SecureOperationState, txId, expectedStatus)` reverts if the stored status does not match. This enforces that each entrypoint only operates on transactions in the expected state (e.g. approval requires `PENDING`, execution requires `EXECUTING`). There is no general transition-matrix function; valid transitions are enforced structurally by which functions set which statuses.

### 4. **Meta-transaction entrypoint binding**
On-chain verification requires `MetaTxParams.handlerSelector` to match `msg.sig` (the external function the relayer called) and `handlerContract` to match `address(this)`. That ties the EIP-712 payload to the real wrapper so a signature cannot be executed through a different sibling entrypoint. See [Meta-Transactions](./meta-transactions.md).

## Event System

### 1. **`TransactionEvent`**

The canonical on-chain event emitted by `logTxEvent`:

```solidity
event TransactionEvent(
    uint256 indexed txId,
    bytes4 indexed functionSelector,
    TxStatus status,
    address requester,
    address target,
    bytes32 operationType
);
```

This is the **authoritative** audit trail for all transaction state changes. Components also emit **`ComponentEvent(bytes4, bytes)`** for config changes (guard config, RBAC config).

### 2. **`logTxEvent` and optional `eventForwarder` (production behavior)**

In **`contracts/core/lib/EngineBlox.sol`**, `logTxEvent` always emits **`TransactionEvent`** on the state-machine contract, then optionally calls **`IEventForwarder.forwardTxEvent`** on the configured **`eventForwarder`** address.

- **Trusted forwarder:** The forwarder is **operator-configured** (initializer / `setEventForwarder`). It should be a **trusted** indexer or integration contract—not an untrusted user-supplied address in adversarial settings.
- **Silent failure:** The forwarder call is wrapped in **`try` / `catch`**. If the forwarder **reverts** or panics, the Bloxchain contract **continues**; core state updates that already ran are **not** rolled back for that reason alone. **Off-chain** consumers must not assume forwarding succeeded; use **`TransactionEvent`** logs as the **canonical** on-chain audit signal.
- **Gas tradeoff:** There is **no explicit `{gas: N}` stipend** on the forwarder subcall; gas follows normal **EIP-150** rules (the callee receives a **bounded fraction** of remaining gas, not the entire transaction). A heavy or malicious forwarder can still **increase** the gas cost of the outer transaction. Optional future hardening: stipend + explicit failure event.

## Read-heavy queries and protocol limits

Several **view** helpers on the engine materialize full `EnumerableSet` contents into memory (for example supported roles, supported functions, pending transaction IDs, per‑role wallet lists). **`eth_call` cost and JSON-RPC response size** scale with how much is stored on that contract—plan pagination or off‑chain indexing for large deployments.

**Execution paths differ:** target whitelist checks use **set membership** (`contains`), which does **not** linearly scan the whole whitelist for each execution in the way a naive “iterate all whitelisted targets” check would.

On-chain growth of key dimensions is also bounded by **immutable constants** in `EngineBlox` (for example `MAX_ROLES`, `MAX_FUNCTIONS`, `MAX_HOOKS_PER_SELECTOR`, `MAX_BATCH_SIZE`). Per‑role `maxWallets` is chosen at role creation and is **not** capped by those globals—very large values increase gas for role removal and for helpers that list all wallets on a role. See NatSpec on `contracts/core/lib/EngineBlox.sol` for the authoritative gas model.

## Integration with TypeScript SDK


## Best Practices

### 1. **State Machine Design**
- **Clear State Definitions**: Define clear, unambiguous states
- **Valid Transitions**: Ensure all state transitions are valid and documented
- **Error Handling**: Implement proper error handling for invalid transitions
- **Recovery Mechanisms**: Provide mechanisms for recovering from invalid states

### 2. **Security Implementation**
- **Access Control**: Implement comprehensive access control for all state changes
- **Validation**: Validate all inputs and state changes
- **Audit Trails**: Maintain complete audit trails of all state changes
- **Time Locks**: Use appropriate time locks for sensitive operations

### 3. **Performance Optimization**
- **Efficient Storage**: Use efficient storage patterns for state data
- **Batch Operations**: Support batch operations where possible
- **Gas Optimization**: Optimize gas usage for common operations
- **Caching**: Implement caching for frequently accessed state data

## Conclusion

The Bloxchain State Machine Engine provides a robust, secure, and efficient foundation for managing complex blockchain operations. By centralizing state management in `SecureOperationState` and implementing strict status-driven transition rules, the engine ensures consistent, auditable, and secure operation of all Bloxchain contracts.

The TypeScript SDK provides comprehensive tools for analyzing, validating, and interacting with the state machine, making it easy for developers to leverage the full power of the Bloxchain architecture.
