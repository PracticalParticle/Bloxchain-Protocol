# Solidity API

# SecureOwnableDefinitions

Library containing predefined definitions for SecureOwnable initialization
This library holds static data that can be used to initialize SecureOwnable contracts
without increasing the main contract size

This library implements the IDefinition interface from EngineBlox
and provides a direct initialization function for SecureOwnable contracts

Permission Model:
- Handler Functions (triggering functions): Permissions checked via msg.sig in BaseStateMachine
  - Time-delay handler functions: Checked with EXECUTE_TIME_DELAY_* actions
  - Meta-transaction handler functions: Checked with EXECUTE_META_* actions
- Execution Functions (target functions): Permissions checked in EngineBlox library
  - For time-delay: EXECUTE_TIME_DELAY_APPROVE/CANCEL actions
  - For meta-transactions: EXECUTE_META_* and SIGN_META_* actions (both handler and execution)




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

### _addBroadcasterPermissions

```solidity
function _addBroadcasterPermissions(bytes32[] roleHashes, struct EngineBlox.FunctionPermission[] functionPermissions, uint256 startIndex) internal pure returns (uint256)
```

Adds broadcaster role permissions

**Parameters:**
- `` (): Array to populate with role hashes
- `` (): Array to populate with function permissions
- `` (): Starting index in arrays

**Returns:**
- Next available index after adding permissions


---

### _addOwnerPermissions

```solidity
function _addOwnerPermissions(bytes32[] roleHashes, struct EngineBlox.FunctionPermission[] functionPermissions, uint256 startIndex) internal pure returns (uint256)
```

Adds owner role permissions

**Parameters:**
- `` (): Array to populate with role hashes
- `` (): Array to populate with function permissions
- `` (): Starting index in arrays

**Returns:**
- Next available index after adding permissions


---

### _addRecoveryPermissions

```solidity
function _addRecoveryPermissions(bytes32[] roleHashes, struct EngineBlox.FunctionPermission[] functionPermissions, uint256 startIndex) internal pure returns (uint256)
```

Adds recovery role permissions

**Parameters:**
- `` (): Array to populate with role hashes
- `` (): Array to populate with function permissions
- `` (): Starting index in arrays

**Returns:**
- Next available index after adding permissions


---

### updateRecoveryExecutionParams

```solidity
function updateRecoveryExecutionParams(address newRecoveryAddress) public pure returns (bytes)
```

Creates execution params for updating the recovery address (pure helper for EngineBlox).

**Parameters:**
- `` (): The new recovery address

**Returns:**
- The execution params for executeRecoveryUpdate


---

### updateTimeLockExecutionParams

```solidity
function updateTimeLockExecutionParams(uint256 newTimeLockPeriodSec) public pure returns (bytes)
```

Creates execution params for updating the time lock period (pure helper for EngineBlox).

**Parameters:**
- `` (): The new time lock period in seconds

**Returns:**
- The execution params for executeTimeLockUpdate


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


