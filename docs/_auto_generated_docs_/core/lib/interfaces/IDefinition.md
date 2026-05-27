# Solidity API

# IDefinition

Interface for definition contracts that provide operation types, function schemas, and role permissions

This interface allows contracts to dynamically load their configuration from external
definition contracts, enabling modular and extensible contract initialization.

Definition contracts (or deployed definition libraries) used by address should implement
ERC165 and return true for type(IDefinition).interfaceId so consumers can validate
before calling getFunctionSchemas() / getRolePermissions().

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

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) external view returns (bool)
```

ERC165: return true for type(IDefinition).interfaceId




---


## Events


## Structs


## Enums


