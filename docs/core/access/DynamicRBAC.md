# Solidity API

# DynamicRBAC

Minimal Dynamic Role-Based Access Control system based on StateAbstraction

This contract provides essential dynamic RBAC functionality:
- Creation of non-protected roles
- Basic wallet assignment to roles
- Function permission management per role
- Integration with StateAbstraction for secure operations

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

### updateRoleEditingToggleExecutionOptions

```solidity
function updateRoleEditingToggleExecutionOptions(bool enabled) public pure returns (bytes)
```

Creates execution options for updating the role editing flag

**Parameters:**
- `` (): True to enable role editing, false to disable

**Returns:**
- The execution options


---

### updateRoleEditingToggleRequestAndApprove

```solidity
function updateRoleEditingToggleRequestAndApprove(struct StateAbstraction.MetaTransaction metaTx) public nonpayable returns (struct StateAbstraction.TxRecord)
```

Requests and approves a role editing toggle using a meta-transaction

**Parameters:**
- `` (): The meta-transaction

**Returns:**
- The transaction record


---

### executeRoleEditingToggle

```solidity
function executeRoleEditingToggle(bool enabled) external nonpayable
```

External function that can only be called by the contract itself to execute role editing toggle

**Parameters:**
- `` (): True to enable role editing, false to disable



---

### createNewRole

```solidity
function createNewRole(string roleName, uint256 maxWallets, struct StateAbstraction.FunctionPermission[] functionPermissions) external nonpayable returns (bytes32)
```

Creates a new dynamic role with function permissions (always non-protected)

**Parameters:**
- `` (): The name of the role to create
- `` (): Maximum number of wallets allowed for this role
- `` (): Array of function permissions to grant to the role

**Returns:**
- The hash of the created role


---

### removeRole

```solidity
function removeRole(bytes32 roleHash) external nonpayable
```

Removes a role from the system

**Parameters:**
- `` (): The hash of the role to remove



---

### addWalletToRole

```solidity
function addWalletToRole(bytes32 roleHash, address wallet) external nonpayable
```

Adds a wallet to a role

**Parameters:**
- `` (): The hash of the role
- `` (): The wallet address to add



---

### revokeWallet

```solidity
function revokeWallet(bytes32 roleHash, address wallet) external nonpayable
```

Removes a wallet from a role

**Parameters:**
- `` (): The hash of the role
- `` (): The wallet address to remove



---

### roleExists

```solidity
function roleExists(bytes32 roleHash) external view returns (bool)
```

Checks if a role exists

**Parameters:**
- `` (): The hash of the role

**Returns:**
- True if the role exists, false otherwise


---

### functionSchemaExists

```solidity
function functionSchemaExists(bytes4 functionSelector) external view returns (bool)
```

Checks if a function schema exists

**Parameters:**
- `` (): The function selector to check

**Returns:**
- True if the function schema exists, false otherwise


---

### getFunctionSchema

```solidity
function getFunctionSchema(bytes4 functionSelector) external view returns (string, bytes4, bytes32, string, enum StateAbstraction.TxAction[], bool)
```

Gets function schema information

**Parameters:**
- `` (): The function selector to get information for

**Returns:**
- The name of the function
- The function selector
- The operation type
- The operation name
- The supported actions
- Whether the function schema is protected


---

### registerFunction

```solidity
function registerFunction(string functionSignature, string operationName, enum StateAbstraction.TxAction[] supportedActions) external nonpayable
```

Registers a function schema with its full signature

**Parameters:**
- `` (): The full function signature (e.g., &quot;transfer(address,uint256)&quot;)
- `` (): The operation name (hashed to operationType)
- `` (): Array of supported actions (converted to bitmap internally)



---

### unregisterFunction

```solidity
function unregisterFunction(bytes4 functionSelector, bool safeRemoval) external nonpayable
```

Unregisters a function schema and removes its signature

**Parameters:**
- `` (): The function selector to remove
- `` (): If true, ensures no role currently references this function



---

### loadDefinitions

```solidity
function loadDefinitions(struct StateAbstraction.FunctionSchema[] functionSchemas, bytes32[] roleHashes, struct StateAbstraction.FunctionPermission[] functionPermissions) external nonpayable
```

Public function to load function schemas and role permissions dynamically at runtime

**Parameters:**
- `` (): Array of function schema definitions to load
- `` (): Array of role hashes to add permissions to
- `` (): Array of function permissions (parallel to roleHashes)



---

### _toggleRoleEditing

```solidity
function _toggleRoleEditing(bool enabled) internal nonpayable
```

Internal function to toggle role editing

**Parameters:**
- `` (): True to enable role editing, false to disable



---

### _loadDynamicDefinitions

```solidity
function _loadDynamicDefinitions(struct StateAbstraction.FunctionSchema[] functionSchemas, bytes32[] roleHashes, struct StateAbstraction.FunctionPermission[] functionPermissions) internal nonpayable
```

Loads function schemas and role permissions dynamically at runtime

**Parameters:**
- `` (): Array of function schema definitions to load
- `` (): Array of role hashes to add permissions to
- `` (): Array of function permissions (parallel to roleHashes)



---

### _convertBitmapToActions

```solidity
function _convertBitmapToActions(uint16 bitmap) internal pure returns (enum StateAbstraction.TxAction[])
```

Converts a bitmap to an array of TxActions

**Parameters:**
- `` (): The bitmap to convert

**Returns:**
- Array of TxActions represented by the bitmap


---

### _createBitmapFromActions

```solidity
function _createBitmapFromActions(enum StateAbstraction.TxAction[] actions) internal pure returns (uint16)
```

Converts an array of TxActions to a bitmap

**Parameters:**
- `` (): Array of TxActions to convert

**Returns:**
- Bitmap representation of the actions


---


## Events

### RoleEditingToggled

```solidity
event RoleEditingToggled(bool enabled)
```




---

### FunctionRegistered

```solidity
event FunctionRegistered(bytes4 functionSelector, string functionSignature, bytes32 operationType)
```




---

### FunctionUnregistered

```solidity
event FunctionUnregistered(bytes4 functionSelector)
```




---

### RoleCreated

```solidity
event RoleCreated(bytes32 roleHash, string roleName, uint256 maxWallets, bool isProtected)
```




---

### RoleRemoved

```solidity
event RoleRemoved(bytes32 roleHash)
```




---

### WalletAddedToRole

```solidity
event WalletAddedToRole(bytes32 roleHash, address wallet)
```




---

### WalletRemovedFromRole

```solidity
event WalletRemovedFromRole(bytes32 roleHash, address wallet)
```




---

### DefinitionsLoaded

```solidity
event DefinitionsLoaded(uint256 functionSchemaCount, uint256 rolePermissionCount)
```




---


## Structs


## Enums


