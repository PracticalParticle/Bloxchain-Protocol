# Solidity API

# IRuntimeRBAC

Interface for Runtime Role-Based Access Control system

This interface defines the functions for managing runtime roles through batch operations.
All role management operations are performed via the batch interface for atomic execution.

Key Features:
- Batch-based role configuration (atomic operations)
- Runtime function schema registration
- Integration with EngineBlox for secure operations
- Query functions for role and permission inspection

Note: This contract inherits from BaseStateMachine which provides additional query functions
such as getRole(), hasRole(), getActiveRolePermissions(), getSupportedRoles(), etc.




## Functions

### roleConfigBatchRequestAndApprove

```solidity
function roleConfigBatchRequestAndApprove(struct EngineBlox.MetaTransaction metaTx) external nonpayable returns (uint256)
```

Requests and approves a RBAC configuration batch using a meta-transaction

**Parameters:**
- `` (): The meta-transaction

**Returns:**
- The transaction record


---


## Events


## Structs


## Enums


