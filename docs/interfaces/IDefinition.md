# Solidity API

# IDefinition

Interface for definition contracts that provide operation types, function schemas, and role permissions

This interface allows contracts to dynamically load their configuration from external
definition contracts, enabling modular and extensible contract initialization.

Definition contracts should implement this interface to provide:
- Operation type definitions (what operations are supported)
- Function schema definitions (how functions are structured)
- Role permission definitions (who can do what)




## Functions

### getFunctionSchemas

```solidity
function getFunctionSchemas() external pure returns (struct EngineBlox.FunctionSchema[])
```

Returns all function schema definitions


**Returns:**
- Array of function schema definitions


---

### getRolePermissions

```solidity
function getRolePermissions() external pure returns (struct IDefinition.RolePermission)
```

Returns all role hashes and their corresponding function permissions


**Returns:**
- RolePermission struct containing roleHashes and functionPermissions arrays


---


## Events


## Structs


## Enums


