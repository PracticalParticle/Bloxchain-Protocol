# Solidity API

# SimpleVaultDefinitions

Library containing predefined definitions for SimpleVault initialization
This library holds static data that can be used to initialize SimpleVault contracts
without increasing the main contract size

This library implements the IDefinition interface from EngineBlox
and provides a direct initialization function for SimpleVault contracts




## Functions

### getFunctionSchemas

```solidity
function getFunctionSchemas() public pure returns (struct EngineBlox.FunctionSchema[])
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


