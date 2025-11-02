# Solidity API

# StateAbstractionDefinitions

Library containing predefined definitions for StateAbstraction initialization
This library holds static data that can be used to initialize StateAbstraction contracts
without increasing the main contract size

This library implements the IDefinition interface from StateAbstraction
and provides a direct initialization function for StateAbstraction contracts




## Functions

### getFunctionSchemas

```solidity
function getFunctionSchemas() public pure returns (struct StateAbstraction.FunctionSchema[])
```

Returns predefined function schemas based on StateAbstraction.initializeBaseFunctionSchemas


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


