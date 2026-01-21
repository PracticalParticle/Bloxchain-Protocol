# Solidity API

# IRuntimeRBAC

Interface for Runtime Role-Based Access Control system

This interface defines the functions for managing runtime roles through batch operations.
All role management operations are performed via the batch interface for atomic execution.

Key Features:
- Batch-based role configuration (atomic operations)
- Runtime function schema registration
- Integration with StateAbstraction for secure operations
- Query functions for role and permission inspection

Note: This contract inherits from BaseStateMachine which provides additional query functions
such as getRole(), hasRole(), getActiveRolePermissions(), getSupportedRoles(), etc.




## Functions

### roleConfigBatchExecutionParams

```solidity
function roleConfigBatchExecutionParams(struct IRuntimeRBAC.RoleConfigAction[] actions) external pure returns (bytes)
```

Creates execution params for a RBAC configuration batch

**Parameters:**
- `` (): Encoded role configuration actions

**Returns:**
- The execution params for StateAbstraction


---

### roleConfigBatchRequestAndApprove

```solidity
function roleConfigBatchRequestAndApprove(struct StateAbstraction.MetaTransaction metaTx) external nonpayable returns (struct StateAbstraction.TxRecord)
```

Requests and approves a RBAC configuration batch using a meta-transaction

**Parameters:**
- `` (): The meta-transaction

**Returns:**
- The transaction record


---

### getFunctionSchema

```solidity
function getFunctionSchema(bytes4 functionSelector) external view returns (string, bytes4, bytes32, string, enum StateAbstraction.TxAction[], bool)
```

Gets function schema information

**Parameters:**
- `` (): The function selector to get information for

**Returns:**
- The function signature or name
- The function selector
- The operation type
- The operation name
- The supported actions
- Whether the function schema is protected


---

### getWalletsInRole

```solidity
function getWalletsInRole(bytes32 roleHash) external view returns (address[])
```

Gets all authorized wallets for a role

**Parameters:**
- `` (): The role hash to get wallets for

**Returns:**
- Array of authorized wallet addresses


---


## Events

### RoleConfigApplied

```solidity
event RoleConfigApplied(enum IRuntimeRBAC.RoleConfigActionType actionType, bytes32 roleHash, bytes4 functionSelector, bytes data)
```

Unified event for all RBAC configuration changes applied via batches

**Parameters:**
- `` (): The type of configuration action
- `` (): Affected role hash (if applicable, otherwise 0)
- `` (): Affected function selector (if applicable, otherwise 0)
- `` (): Optional action-specific payload

---


## Structs


## Enums


