# Solidity API

# RuntimeRBAC

Minimal Runtime Role-Based Access Control system based on EngineBlox

This contract provides essential runtime RBAC functionality:
- Creation of non-protected roles
- Basic wallet assignment to roles
- Function permission management per role
- Integration with EngineBlox for secure operations

Key Features:
- Only non-protected roles can be created dynamically
- Protected roles (OWNER, BROADCASTER, RECOVERY) are managed by SecureOwnable
- Minimal interface for core RBAC operations
- Essential role management functions only




## Functions

### initialize

```solidity
function initialize(address initialOwner, address broadcaster, address recovery, uint256 timeLockPeriodSec, address eventForwarder) public nonpayable
```



**Parameters:**
- `` (): The initial owner address
- `` (): The broadcaster address
- `` (): The recovery address
- `` (): The timelock period in seconds
- `` (): The event forwarder address



---

### supportsInterface

```solidity
function supportsInterface(bytes4 interfaceId) public view returns (bool)
```

See {IERC165-supportsInterface}.




---

### roleConfigBatchExecutionParams

```solidity
function roleConfigBatchExecutionParams(struct RuntimeRBAC.RoleConfigAction[] actions) public pure returns (bytes)
```

Creates execution params for a RBAC configuration batch

**Parameters:**
- `` (): Encoded role configuration actions

**Returns:**
- The execution params for EngineBlox


---

### roleConfigBatchRequestAndApprove

```solidity
function roleConfigBatchRequestAndApprove(struct EngineBlox.MetaTransaction metaTx) public nonpayable returns (struct EngineBlox.TxRecord)
```

Requests and approves a RBAC configuration batch using a meta-transaction

**Parameters:**
- `` (): The meta-transaction

**Returns:**
- The transaction record


---

### executeRoleConfigBatch

```solidity
function executeRoleConfigBatch(struct RuntimeRBAC.RoleConfigAction[] actions) external nonpayable
```

External function that can only be called by the contract itself to execute a RBAC configuration batch

**Parameters:**
- `` (): Encoded role configuration actions



---

### getFunctionSchema

```solidity
function getFunctionSchema(bytes4 functionSelector) external view returns (string, bytes4, bytes32, string, enum EngineBlox.TxAction[], bool)
```

Gets function schema information

**Parameters:**
- `` (): The function selector to get information for

**Returns:**
- The function signature or name
- The function selector
- The operation type
- The operation name
- The supported actions
- Whether the function schema is protected


---

### getWalletsInRole

```solidity
function getWalletsInRole(bytes32 roleHash) public view returns (address[])
```

Gets all authorized wallets for a role

**Parameters:**
- `` (): The role hash to get wallets for

**Returns:**
- Array of authorized wallet addresses


---

### _executeRoleConfigBatch

```solidity
function _executeRoleConfigBatch(struct RuntimeRBAC.RoleConfigAction[] actions) internal nonpayable
```

Internal helper to execute a RBAC configuration batch

**Parameters:**
- `` (): Encoded role configuration actions



---

### _createNewRole

```solidity
function _createNewRole(string roleName, uint256 maxWallets, struct EngineBlox.FunctionPermission[] functionPermissions) internal nonpayable returns (bytes32)
```






---

### _removeRole

```solidity
function _removeRole(bytes32 roleHash) internal nonpayable
```






---

### _addWalletToRole

```solidity
function _addWalletToRole(bytes32 roleHash, address wallet) internal nonpayable
```






---

### _revokeWallet

```solidity
function _revokeWallet(bytes32 roleHash, address wallet) internal nonpayable
```






---

### _ensureRoleNotProtected

```solidity
function _ensureRoleNotProtected(bytes32 roleHash) internal view
```

Validates that a role is not protected




---

### _registerFunction

```solidity
function _registerFunction(string functionSignature, string operationName, enum EngineBlox.TxAction[] supportedActions) internal nonpayable returns (bytes4)
```






---

### _unregisterFunction

```solidity
function _unregisterFunction(bytes4 functionSelector, bool safeRemoval) internal nonpayable
```






---

### _addFunctionToRole

```solidity
function _addFunctionToRole(bytes32 roleHash, struct EngineBlox.FunctionPermission functionPermission) internal nonpayable
```

Adds a function permission to an existing role

**Parameters:**
- `` (): The role hash to add the function permission to
- `` (): The function permission to add



---

### _removeFunctionFromRole

```solidity
function _removeFunctionFromRole(bytes32 roleHash, bytes4 functionSelector) internal nonpayable
```

Removes a function permission from an existing role

**Parameters:**
- `` (): The role hash to remove the function permission from
- `` (): The function selector to remove from the role



---


## Events

### RoleConfigApplied

```solidity
event RoleConfigApplied(enum RuntimeRBAC.RoleConfigActionType actionType, bytes32 roleHash, bytes4 functionSelector, bytes data)
```

Unified event for all RBAC configuration changes applied via batches

- actionType: the high-level type of configuration action
- roleHash: affected role hash (if applicable, otherwise 0)
- functionSelector: affected function selector (if applicable, otherwise 0)
- data: optional action-specific payload (kept minimal for size; decoded off-chain if needed)


---


## Structs


## Enums


