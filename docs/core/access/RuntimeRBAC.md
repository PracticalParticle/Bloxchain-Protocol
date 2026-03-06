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

### roleConfigBatchRequestAndApprove

```solidity
function roleConfigBatchRequestAndApprove(struct EngineBlox.MetaTransaction metaTx) public nonpayable returns (uint256)
```

Requests and approves a RBAC configuration batch using a meta-transaction

**Parameters:**
- `` (): The meta-transaction

**Returns:**
- The transaction record


---

### executeRoleConfigBatch

```solidity
function executeRoleConfigBatch(struct IRuntimeRBAC.RoleConfigAction[] actions) external nonpayable
```

External function that can only be called by the contract itself to execute a RBAC configuration batch

**Parameters:**
- `` (): Encoded role configuration actions



---

### _requireRoleNotProtected

```solidity
function _requireRoleNotProtected(bytes32 roleHash) internal view
```

Reverts if the role is protected (prevents editing OWNER, BROADCASTER, RECOVERY via batch).

**Parameters:**
- `` (): The role hash to check



---

### _executeRoleConfigBatch

```solidity
function _executeRoleConfigBatch(struct IRuntimeRBAC.RoleConfigAction[] actions) internal nonpayable
```

Internal helper to execute a RBAC configuration batch

**Parameters:**
- `` (): Encoded role configuration actions



---

### _executeCreateRole

```solidity
function _executeCreateRole(bytes data) internal nonpayable
```

Executes CREATE_ROLE: creates a new non-protected role

**Parameters:**
- `` (): ABI-encoded (string roleName, uint256 maxWallets)



---

### _executeRemoveRole

```solidity
function _executeRemoveRole(bytes data) internal nonpayable
```

Executes REMOVE_ROLE: removes a role by hash

**Parameters:**
- `` (): ABI-encoded (bytes32 roleHash)



---

### _executeAddWallet

```solidity
function _executeAddWallet(bytes data) internal nonpayable
```

Executes ADD_WALLET: assigns a wallet to a role (role must not be protected)

**Parameters:**
- `` (): ABI-encoded (bytes32 roleHash, address wallet)



---

### _executeRevokeWallet

```solidity
function _executeRevokeWallet(bytes data) internal nonpayable
```

Executes REVOKE_WALLET: revokes a wallet from a role (role must not be protected)

**Parameters:**
- `` (): ABI-encoded (bytes32 roleHash, address wallet)



---

### _executeAddFunctionToRole

```solidity
function _executeAddFunctionToRole(bytes data) internal nonpayable
```

Executes ADD_FUNCTION_TO_ROLE: adds a function permission to a role

**Parameters:**
- `` (): ABI-encoded (bytes32 roleHash, FunctionPermission functionPermission)



---

### _executeRemoveFunctionFromRole

```solidity
function _executeRemoveFunctionFromRole(bytes data) internal nonpayable
```

Executes REMOVE_FUNCTION_FROM_ROLE: removes a function permission from a role

**Parameters:**
- `` (): ABI-encoded (bytes32 roleHash, bytes4 functionSelector)



---

### _logRoleConfigEvent

```solidity
function _logRoleConfigEvent(enum IRuntimeRBAC.RoleConfigActionType action, bytes32 roleHash, bytes4 selector, address wallet) internal nonpayable
```

Encodes and logs a role config event via ComponentEvent. Payload decodes as (RoleConfigActionType, bytes32 roleHash, bytes4 functionSelector, address wallet).

**Parameters:**
- `` (): The role config action type
- `` (): The role hash
- `` (): The function selector (or zero for N/A)
- `` (): The wallet address (or zero for actions that do not apply to a wallet)



---


## Events


## Structs


## Enums


