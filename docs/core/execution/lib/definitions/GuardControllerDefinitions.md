# Solidity API

# GuardControllerDefinitions

Library containing predefined definitions for GuardController initialization
This library holds static data that can be used to initialize GuardController contracts
without increasing the main contract size

This library implements the IDefinition interface and provides both function schema definitions
and role permissions for GuardController's public execution functions.

Key Features:
- Registers all 6 GuardController public execution functions
- Defines role permissions for OWNER_ROLE and BROADCASTER_ROLE
- Supports time-delay and meta-transaction workflows
- Matches EngineBloxDefinitions pattern for consistency

Role Permissions:
- OWNER_ROLE: Can sign/request time-delay and meta-transaction operations (8 permissions)
- BROADCASTER_ROLE: Can execute meta-transaction operations (5 permissions)


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
- What operation types they belong to (`CONTROLLER_OPERATION` for execution paths, `CONTROLLER_CONFIG_OPERATION` for guard config batch)
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

Total: 13 role permission entries matching EngineBloxDefinitions pattern


---

### getGuardConfigActionSpecs

```solidity
function getGuardConfigActionSpecs() public pure returns (string[], string[])
```

Returns all available GuardConfig action types and their decode formats for discovery.


**Returns:**
- Human-readable action names (same order as GuardConfigActionType enum)
- ABI decode format for each action&#x27;s data, e.g. &quot;(bytes4 functionSelector, address target)&quot;


---

### encodeAddTargetToWhitelist

```solidity
function encodeAddTargetToWhitelist(bytes4 functionSelector, address target) public pure returns (bytes)
```

Encodes data for ADD_TARGET_TO_WHITELIST. Use with GuardConfigActionType.ADD_TARGET_TO_WHITELIST.

**Parameters:**
- `` (): Function whose whitelist is updated
- `` (): Address to add to the whitelist



---

### encodeRemoveTargetFromWhitelist

```solidity
function encodeRemoveTargetFromWhitelist(bytes4 functionSelector, address target) public pure returns (bytes)
```

Encodes data for REMOVE_TARGET_FROM_WHITELIST. Use with GuardConfigActionType.REMOVE_TARGET_FROM_WHITELIST.

**Parameters:**
- `` (): Function whose whitelist is updated
- `` (): Address to remove from the whitelist



---

### encodeRegisterFunction

```solidity
function encodeRegisterFunction(string functionSignature, string operationName, enum EngineBlox.TxAction[] supportedActions) public pure returns (bytes)
```

Encodes data for REGISTER_FUNCTION. Use with GuardConfigActionType.REGISTER_FUNCTION.

**Parameters:**
- `` (): Full function signature string (e.g. &quot;executeWithTimeLock(address,bytes4,bytes,uint256,bytes32)&quot;)
- `` (): Human-readable operation name
- `` (): TxActions supported by this function (e.g. EXECUTE_TIME_DELAY_REQUEST)



---

### encodeUnregisterFunction

```solidity
function encodeUnregisterFunction(bytes4 functionSelector, bool safeRemoval) public pure returns (bytes)
```

Encodes data for UNREGISTER_FUNCTION. Use with GuardConfigActionType.UNREGISTER_FUNCTION.

**Parameters:**
- `` (): Selector of the function to unregister
- `` (): If true, reverts when the function has whitelisted targets



---

### guardConfigBatchExecutionParams

```solidity
function guardConfigBatchExecutionParams(struct IGuardController.GuardConfigAction[] actions) public pure returns (bytes)
```

Creates execution params for a Guard configuration batch (pure helper for EngineBlox).

**Parameters:**
- `` (): Encoded guard configuration actions (same layout as IGuardController.GuardConfigAction[])

**Returns:**
- The execution params for EngineBlox


---

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) external pure returns (bool)
```

ERC165: report support for IDefinition and IERC165 when this library is used at an address.
IDefinition extends IERC165; both interface IDs must be reported for ERC165 compliance.




---


## Events


## Structs


## Enums


