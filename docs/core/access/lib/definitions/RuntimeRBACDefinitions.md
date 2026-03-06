# Solidity API

# RuntimeRBACDefinitions

Library containing predefined definitions for RuntimeRBAC initialization
This library holds static data that can be used to initialize RuntimeRBAC contracts
without increasing the main contract size

This library implements the IDefinition interface from EngineBlox
and provides a direct initialization function for RuntimeRBAC contracts




## Functions

### getFunctionSchemas

```solidity
function getFunctionSchemas() public pure returns (struct EngineBlox.FunctionSchema[])
```

Returns predefined function schemas


**Returns:**
- Array of function schema definitions

Registers the meta-transaction handler for RBAC configuration batches.
All runtime RBAC changes must go through this single time-locked workflow.

Function schemas include:
- Handler function (roleConfigBatchRequestAndApprove): checked via msg.sig
- Execution function (executeRoleConfigBatch): checked in EngineBlox for dual-permission model


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
  - Execution selector (ROLE_CONFIG_BATCH_EXECUTE_SELECTOR) - checked in EngineBlox


---

### getRoleConfigActionSpecs

```solidity
function getRoleConfigActionSpecs() public pure returns (string[], string[])
```

Returns all available RoleConfig action types and their decode formats for discovery.


**Returns:**
- Human-readable action names (same order as RoleConfigActionType enum)
- ABI decode format for each action&#x27;s data, e.g. &quot;(string roleName, uint256 maxWallets)&quot;


---

### encodeCreateRole

```solidity
function encodeCreateRole(string roleName, uint256 maxWallets) public pure returns (bytes)
```

Encodes data for CREATE_ROLE. Use with RoleConfigActionType.CREATE_ROLE.

**Parameters:**
- `` (): Name of the role to create
- `` (): Maximum number of wallets that can be assigned to this role



---

### encodeRemoveRole

```solidity
function encodeRemoveRole(bytes32 roleHash) public pure returns (bytes)
```

Encodes data for REMOVE_ROLE. Use with RoleConfigActionType.REMOVE_ROLE.

**Parameters:**
- `` (): keccak256 hash of the role name



---

### encodeAddWallet

```solidity
function encodeAddWallet(bytes32 roleHash, address wallet) public pure returns (bytes)
```

Encodes data for ADD_WALLET. Use with RoleConfigActionType.ADD_WALLET.

**Parameters:**
- `` (): Role to add the wallet to
- `` (): Address to assign to the role



---

### encodeRevokeWallet

```solidity
function encodeRevokeWallet(bytes32 roleHash, address wallet) public pure returns (bytes)
```

Encodes data for REVOKE_WALLET. Use with RoleConfigActionType.REVOKE_WALLET.

**Parameters:**
- `` (): Role to revoke the wallet from
- `` (): Address to revoke



---

### encodeAddFunctionToRole

```solidity
function encodeAddFunctionToRole(bytes32 roleHash, struct EngineBlox.FunctionPermission functionPermission) public pure returns (bytes)
```

Encodes data for ADD_FUNCTION_TO_ROLE. Use with RoleConfigActionType.ADD_FUNCTION_TO_ROLE.

**Parameters:**
- `` (): Role to grant the function permission to
- `` (): FunctionPermission (functionSelector, grantedActionsBitmap, handlerForSelectors)



---

### encodeRemoveFunctionFromRole

```solidity
function encodeRemoveFunctionFromRole(bytes32 roleHash, bytes4 functionSelector) public pure returns (bytes)
```

Encodes data for REMOVE_FUNCTION_FROM_ROLE. Use with RoleConfigActionType.REMOVE_FUNCTION_FROM_ROLE.

**Parameters:**
- `` (): Role to remove the function from
- `` (): Selector of the function to remove



---

### roleConfigBatchExecutionParams

```solidity
function roleConfigBatchExecutionParams(struct IRuntimeRBAC.RoleConfigAction[] actions) public pure returns (bytes)
```

Creates execution params for a RBAC configuration batch (pure helper for EngineBlox).

**Parameters:**
- `` (): Encoded role configuration actions (IRuntimeRBAC.RoleConfigAction[] layout)

**Returns:**
- The execution params for EngineBlox


---

### roleConfigBatchExecutionParams

```solidity
function roleConfigBatchExecutionParams(bytes preEncoded) public pure returns (bytes)
```

Creates execution params from pre-encoded actions (e.g. abi.encode(RuntimeRBAC.RoleConfigAction[])).
Use when callers have RuntimeRBAC.RoleConfigAction[] and same encoding applies.

**Parameters:**
- `` (): ABI-encoded role config actions array

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


