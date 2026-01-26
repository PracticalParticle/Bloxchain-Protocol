# Solidity API

# GuardControllerDefinitions

Library containing predefined definitions for GuardController initialization
This library holds static data that can be used to initialize GuardController contracts
without increasing the main contract size

This library implements the IDefinition interface and provides both function schema definitions
and role permissions for GuardController's public execution functions.

Key Features:
- Registers all 6 GuardController public execution functions
- Defines role permissions for OWNER_ROLE, BROADCASTER_ROLE, and RECOVERY_ROLE
- Supports time-delay and meta-transaction workflows
- Matches EngineBloxDefinitions pattern for consistency

Role Permissions:
- OWNER_ROLE: Can sign/request time-delay and meta-transaction operations (6 permissions)
- BROADCASTER_ROLE: Can execute meta-transaction operations (3 permissions)
- RECOVERY_ROLE: Can execute time-delay operations for recovery scenarios (3 permissions)


**Notice:** This definition provides complete initialization data including both function schemas
and role permissions, matching the EngineBloxDefinitions pattern.

**Security Contact:** security@particlecrypto.com

## Functions

### getFunctionSchemas

```solidity
function getFunctionSchemas() public pure returns (struct EngineBlox.FunctionSchema[])
```

Returns predefined function schemas for GuardController execution functions


**Returns:**
- Array of function schema definitions

Function schemas define:
- GuardController public execution functions
- What operation types they belong to (CONTROLLER_OPERATION)
- What actions are supported (time-delay request/approve/cancel, meta-tx approve/cancel/request-and-approve)
- Whether they are protected

Permission System:
- These schemas enable EngineBlox._checkExecutionPermissions to validate
  if callers have permission to call these GuardController functions
- Role permissions are defined in getRolePermissions() matching EngineBloxDefinitions pattern


---

### getRolePermissions

```solidity
function getRolePermissions() public pure returns (struct IDefinition.RolePermission)
```

Returns predefined role hashes and their corresponding function permissions


**Returns:**
- RolePermission struct containing roleHashes and functionPermissions arrays

Role Permissions:
- OWNER_ROLE: Can sign/request time-delay and meta-transaction operations (8 permissions)
- BROADCASTER_ROLE: Can execute meta-transaction operations (5 permissions)
- RECOVERY_ROLE: Can execute time-delay operations for recovery scenarios (3 permissions)

Total: 16 role permission entries matching EngineBloxDefinitions pattern


---


## Events


## Structs


## Enums


