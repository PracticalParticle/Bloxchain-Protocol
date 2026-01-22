# Solidity API

# RuntimeRBACDefinitions

Library containing predefined definitions for RuntimeRBAC initialization
This library holds static data that can be used to initialize RuntimeRBAC contracts
without increasing the main contract size

This library implements the IDefinition interface from StateAbstraction
and provides a direct initialization function for RuntimeRBAC contracts




## Functions

### getFunctionSchemas

```solidity
function getFunctionSchemas() public pure returns (struct StateAbstraction.FunctionSchema[])
```

Returns predefined function schemas


**Returns:**
- Array of function schema definitions

Registers the meta-transaction handler for RBAC configuration batches.
All runtime RBAC changes must go through this single time-locked workflow.

Function schemas include:
- Handler function (roleConfigBatchRequestAndApprove): checked via msg.sig
- Execution function (executeRoleConfigBatch): checked in StateAbstraction for dual-permission model


---

### getRolePermissions

```solidity
function getRolePermissions() public pure returns (struct IDefinition.RolePermission)
```

Returns predefined role hashes and their corresponding function permissions


**Returns:**
- RolePermission struct containing roleHashes and functionPermissions arrays

OWNER: allowed to SIGN_META_REQUEST_AND_APPROVE for the batch handler
BROADCASTER: allowed to EXECUTE_META_REQUEST_AND_APPROVE for both:
  - Handler selector (ROLE_CONFIG_BATCH_META_SELECTOR) - checked via msg.sig
  - Execution selector (ROLE_CONFIG_BATCH_EXECUTE_SELECTOR) - checked in StateAbstraction


---


## Events


## Structs


## Enums


