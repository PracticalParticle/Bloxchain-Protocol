# Solidity API

# DynamicRBACDefinitions

Library containing predefined definitions for DynamicRBAC initialization
This library holds static data that can be used to initialize DynamicRBAC contracts
without increasing the main contract size

This library implements the IDefinition interface from StateAbstraction
and provides a direct initialization function for DynamicRBAC contracts




## Functions

### getFunctionSchemas

```solidity
function getFunctionSchemas() public pure returns (struct StateAbstraction.FunctionSchema[])
```

Returns predefined function schemas


**Returns:**
- Array of function schema definitions


---

### getRolePermissions

```solidity
function getRolePermissions() public pure returns (struct IDefinition.RolePermission)
```

Returns predefined role hashes and their corresponding function permissions


**Returns:**
- RolePermission struct containing roleHashes and functionPermissions arrays


---


## Events


## Structs


## Enums


