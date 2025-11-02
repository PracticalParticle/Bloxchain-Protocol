// SPDX-License-Identifier: MPL-2.0
pragma solidity ^0.8.25;

// OpenZeppelin imports
import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";

// Contract imports
import "../base/lib/StateAbstraction.sol";
import "../../utils/SharedValidation.sol";
import "./lib/definitions/DynamicRBACDefinitions.sol";
import "../../interfaces/IDefinition.sol";
import "./SecureOwnable.sol";

/**
 * @title DynamicRBAC
 * @dev Minimal Dynamic Role-Based Access Control system based on StateAbstraction
 * 
 * This contract provides essential dynamic RBAC functionality:
 * - Creation of non-protected roles
 * - Basic wallet assignment to roles
 * - Function permission management per role
 * - Integration with StateAbstraction for secure operations
 * 
 * Key Features:
 * - Only non-protected roles can be created dynamically
 * - Protected roles (OWNER, BROADCASTER, RECOVERY) are managed by SecureOwnable
 * - Minimal interface for core RBAC operations
 * - Essential role management functions only
 */
abstract contract DynamicRBAC is Initializable, SecureOwnable {
    using StateAbstraction for StateAbstraction.SecureOperationState;
    using SharedValidation for *;
    
    // State variables
    bool public roleEditingEnabled;
    
    // Events
    event RoleEditingToggled(bool enabled);
    event FunctionRegistered(bytes4 indexed functionSelector, string functionSignature, bytes32 operationType);
    event FunctionUnregistered(bytes4 indexed functionSelector);
    event RoleCreated(bytes32 indexed roleHash, string roleName, uint256 maxWallets, bool isProtected);
    event RoleRemoved(bytes32 indexed roleHash);
    event WalletAddedToRole(bytes32 indexed roleHash, address indexed wallet);
    event WalletRemovedFromRole(bytes32 indexed roleHash, address indexed wallet);
    event DefinitionsLoaded(uint256 functionSchemaCount, uint256 rolePermissionCount);

    /**
     * @notice Initializer to initialize DynamicRBAC
     * @param initialOwner The initial owner address
     * @param broadcaster The broadcaster address
     * @param recovery The recovery address
     * @param timeLockPeriodSec The timelock period in seconds
     * @param eventForwarder The event forwarder address 
     */
    function initialize(
        address initialOwner,
        address broadcaster,
        address recovery,
        uint256 timeLockPeriodSec,
        address eventForwarder
    ) public virtual override onlyInitializing {
        // Initialize SecureOwnable
        SecureOwnable.initialize(initialOwner, broadcaster, recovery, timeLockPeriodSec, eventForwarder);
        
        // Load DynamicRBAC-specific definitions
        IDefinition.RolePermission memory permissions = DynamicRBACDefinitions.getRolePermissions();
        _loadDefinitions(
            DynamicRBACDefinitions.getFunctionSchemas(),
            permissions.roleHashes,
            permissions.functionPermissions
        );
        
        // Initialize role editing as enabled by default
        roleEditingEnabled = true;
    }

    // Role Editing Control Functions
    /**
     * @dev Creates execution options for updating the role editing flag
     * @param enabled True to enable role editing, false to disable
     * @return The execution options
     */
    function updateRoleEditingToggleExecutionOptions(
        bool enabled
    ) public pure returns (bytes memory) {
        return _createStandardExecutionOptions(
            DynamicRBACDefinitions.ROLE_EDITING_TOGGLE_SELECTOR,
            abi.encode(enabled)
        );
    }

    /**
     * @dev Requests and approves a role editing toggle using a meta-transaction
     * @param metaTx The meta-transaction
     * @return The transaction record
     */
    function updateRoleEditingToggleRequestAndApprove(
        StateAbstraction.MetaTransaction memory metaTx
    ) public onlyBroadcaster returns (StateAbstraction.TxRecord memory) {
        return _requestAndApproveTransaction(
            metaTx,
            DynamicRBACDefinitions.ROLE_EDITING_TOGGLE_META_SELECTOR,
            StateAbstraction.TxAction.EXECUTE_META_REQUEST_AND_APPROVE
        );
    }

    /**
     * @dev External function that can only be called by the contract itself to execute role editing toggle
     * @param enabled True to enable role editing, false to disable
     */
    function executeRoleEditingToggle(bool enabled) external {
        SharedValidation.validateInternalCall(address(this));
        _toggleRoleEditing(enabled);
    }

    // Core Role Management Functions
    /**
     * @dev Creates a new dynamic role with function permissions (always non-protected)
     * @param roleName The name of the role to create
     * @param maxWallets Maximum number of wallets allowed for this role
     * @param functionPermissions Array of function permissions to grant to the role
     * @return The hash of the created role
     * @notice Role becomes uneditable after creation - all permissions must be set at creation time
     */
    function createNewRole(
        string memory roleName,
        uint256 maxWallets,
        StateAbstraction.FunctionPermission[] memory functionPermissions
    ) external onlyOwner returns (bytes32) {
        // Validate that role editing is enabled
        if (!roleEditingEnabled) revert SharedValidation.RoleEditingDisabled();
        
        SharedValidation.validateRoleNameNotEmpty(roleName);
        SharedValidation.validateMaxWalletsGreaterThanZero(maxWallets);
        
        bytes32 roleHash = keccak256(bytes(roleName));
        
        // Create the role in the secure state with isProtected = false
        // StateAbstraction.createRole already validates role doesn't exist
        StateAbstraction.createRole(_getSecureState(), roleName, maxWallets, false);
        
        // Add all function permissions to the role
        for (uint i = 0; i < functionPermissions.length; i++) {
            StateAbstraction.addFunctionToRole(
                _getSecureState(), 
                roleHash, 
                functionPermissions[i]
            );
        }
        
        emit RoleCreated(roleHash, roleName, maxWallets, false);
        return roleHash;
    }

      /**
     * @dev Removes a role from the system
     * @param roleHash The hash of the role to remove
     * @notice Security: Cannot remove protected roles
     * @notice Role editing must be enabled to remove roles
     * @notice This will remove the role even if it has wallets assigned
     */
    function removeRole(bytes32 roleHash) external onlyOwner {
        // Validate that role editing is enabled
        if (!roleEditingEnabled) revert SharedValidation.RoleEditingDisabled();
        
        // Validate that the role is not protected (early check)
        if (_getSecureState().getRole(roleHash).isProtected) revert SharedValidation.CannotModifyProtectedRoles();
        
        // StateAbstraction.removeRole already validates:
        // - role exists
        // - role is not protected
        StateAbstraction.removeRole(_getSecureState(), roleHash);
        emit RoleRemoved(roleHash);
    }

    /**
     * @dev Adds a wallet to a role
     * @param roleHash The hash of the role
     * @param wallet The wallet address to add
     */
    function addWalletToRole(bytes32 roleHash, address wallet) external onlyOwner {
        // Validate that role editing is enabled
        if (!roleEditingEnabled) revert SharedValidation.RoleEditingDisabled();
        
        // Validate that the role is not protected
        if (_getSecureState().getRole(roleHash).isProtected) revert SharedValidation.CannotModifyProtectedRoles();
        
        // StateAbstraction.assignWallet already validates:
        // - wallet is not zero address
        // - role exists
        // - role has capacity
        // - wallet is not already in role
        StateAbstraction.assignWallet(_getSecureState(), roleHash, wallet);
        emit WalletAddedToRole(roleHash, wallet);
    }

    /**
     * @dev Removes a wallet from a role
     * @param roleHash The hash of the role
     * @param wallet The wallet address to remove
     * @notice Security: Cannot remove the last wallet from a role to prevent empty roles
     */
    function revokeWallet(bytes32 roleHash, address wallet) external onlyOwner {
        // Validate that role editing is enabled
        if (!roleEditingEnabled) revert SharedValidation.RoleEditingDisabled();
        
        // Validate that the role is not protected
        if (_getSecureState().getRole(roleHash).isProtected) revert SharedValidation.CannotModifyProtectedRoles();
        
        // StateAbstraction.revokeWallet already validates:
        // - role exists
        // - wallet exists in role
        StateAbstraction.revokeWallet(_getSecureState(), roleHash, wallet);
        emit WalletRemovedFromRole(roleHash, wallet);
    }

    // Essential Query Functions Only
    /**
     * @dev Checks if a role exists
     * @param roleHash The hash of the role
     * @return True if the role exists, false otherwise
     */
    function roleExists(bytes32 roleHash) external view returns (bool) {
        return _getSecureState().getRole(roleHash).roleHash != bytes32(0);
    }

    /**
     * @dev Checks if a function schema exists
     * @param functionSelector The function selector to check
     * @return True if the function schema exists, false otherwise
     */
    function functionSchemaExists(bytes4 functionSelector) external view returns (bool) {
        return _getSecureState().functions[functionSelector].functionSelector == functionSelector;
    }

    /**
     * @dev Gets function schema information
     * @param functionSelector The function selector to get information for
     * @return functionName The name of the function
     * @return functionSelectorReturn The function selector
     * @return operationType The operation type
     * @return operationName The operation name
     * @return supportedActions The supported actions
     * @return isProtected Whether the function schema is protected
     */
    function getFunctionSchema(bytes4 functionSelector) external view returns (
        string memory functionName,
        bytes4 functionSelectorReturn,
        bytes32 operationType,
        string memory operationName,
        StateAbstraction.TxAction[] memory supportedActions,
        bool isProtected
    ) {
        StateAbstraction.FunctionSchema storage schema = _getSecureState().functions[functionSelector];
        if (schema.functionSelector != functionSelector) {
            revert SharedValidation.FunctionError(functionSelector);
        }
        
        // Convert bitmap to array
        supportedActions = _convertBitmapToActions(schema.supportedActionsBitmap);
        
        return (
            schema.functionName,
            schema.functionSelector,
            schema.operationType,
            schema.operationName,
            supportedActions,
            schema.isProtected
        );
    }

    // ============ FUNCTION REGISTRATION ============

    /**
     * @dev Registers a function schema with its full signature
     * @param functionSignature The full function signature (e.g., "transfer(address,uint256)")
     * @param operationName The operation name (hashed to operationType)
     * @param supportedActions Array of supported actions (converted to bitmap internally)
     * @notice Function selector is automatically derived from the signature
     * @notice Only callable by the owner
     * @notice Role editing must be enabled to register functions
     * @notice Only non-protected function schemas can be registered
     */
    function registerFunction(
        string memory functionSignature,
        string memory operationName,
        StateAbstraction.TxAction[] memory supportedActions
    ) external onlyOwner {
        // Validate that role editing is enabled
        if (!roleEditingEnabled) revert SharedValidation.RoleEditingDisabled();
        
        // Derive function selector from signature
        bytes4 functionSelector = bytes4(keccak256(bytes(functionSignature)));
        
        // Validate that function schema doesn't already exist
        if (this.functionSchemaExists(functionSelector)) {
            revert SharedValidation.FunctionError(functionSelector);
        }
        
        // Derive operation type from name
        bytes32 operationType = keccak256(bytes(operationName));
        
        // Convert actions array to bitmap
        uint16 supportedActionsBitmap = _createBitmapFromActions(supportedActions);
        
        // Create function schema directly (always non-protected)
        StateAbstraction.createFunctionSchema(
            _getSecureState(),
            functionSignature,
            functionSelector,
            operationType,
            operationName,
            supportedActionsBitmap,
            false // isProtected = false for dynamically registered functions
        );
        
        emit FunctionRegistered(functionSelector, functionSignature, operationType);
    }

    /**
     * @dev Unregisters a function schema and removes its signature
     * @param functionSelector The function selector to remove
     * @param safeRemoval If true, ensures no role currently references this function
     * @notice Only callable by the owner
     * @notice Role editing must be enabled to unregister functions
     * @notice Role permissions should be removed separately via DynamicRBAC
     */
    function unregisterFunction(bytes4 functionSelector, bool safeRemoval) external onlyOwner {
        // Validate that role editing is enabled
        if (!roleEditingEnabled) revert SharedValidation.RoleEditingDisabled();
        
        // Validate function exists
        if (!this.functionSchemaExists(functionSelector)) {
            revert SharedValidation.FunctionError(functionSelector);
        }
        
        // Ensure not protected
        StateAbstraction.FunctionSchema storage schema = _getSecureState().functions[functionSelector];
        if (schema.isProtected) {
            revert SharedValidation.CannotModifyProtectedRoles();
        }

        // If safeRemoval is requested, ensure no role currently references this function
        if (safeRemoval) {
            bytes32[] memory roles = _getSecureState().getSupportedRolesList();
            for (uint256 i = 0; i < roles.length; i++) {
                StateAbstraction.FunctionPermission[] memory perms = _getSecureState().getRoleFunctionPermissions(roles[i]);
                for (uint256 j = 0; j < perms.length; j++) {
                    if (perms[j].functionSelector == functionSelector) {
                        revert SharedValidation.FunctionError(functionSelector);
                    }
                }
            }
        }
        
        // Remove function schema directly
        StateAbstraction.removeFunctionSchema(_getSecureState(), functionSelector);
        
        emit FunctionUnregistered(functionSelector);
    }

    // ============ PUBLIC DEFINITION MANAGEMENT ============

    /**
     * @dev Public function to load function schemas and role permissions dynamically at runtime
     * @param functionSchemas Array of function schema definitions to load
     * @param roleHashes Array of role hashes to add permissions to
     * @param functionPermissions Array of function permissions (parallel to roleHashes)
     * @notice Only non-protected function schemas can be loaded dynamically
     * @notice Role editing must be enabled to load definitions
     * @notice Only the owner can call this function
     * @notice To unload definitions, use unregisterFunction and removeRole individually
     */
    function loadDefinitions(
        StateAbstraction.FunctionSchema[] memory functionSchemas,
        bytes32[] memory roleHashes,
        StateAbstraction.FunctionPermission[] memory functionPermissions
    ) external onlyOwner {
        _loadDynamicDefinitions(functionSchemas, roleHashes, functionPermissions);
    }

    // ============ HELPER FUNCTIONS ============

    /**
     * @dev Internal function to toggle role editing
     * @param enabled True to enable role editing, false to disable
     */
    function _toggleRoleEditing(bool enabled) internal {
        roleEditingEnabled = enabled;
        emit RoleEditingToggled(enabled);
    }

     /**
     * @dev Loads function schemas and role permissions dynamically at runtime
     * @param functionSchemas Array of function schema definitions to load
     * @param roleHashes Array of role hashes to add permissions to
     * @param functionPermissions Array of function permissions (parallel to roleHashes)
     * @notice Only non-protected function schemas can be loaded dynamically
     * @notice Role editing must be enabled to load definitions
     */
    function _loadDynamicDefinitions(
        StateAbstraction.FunctionSchema[] memory functionSchemas,
        bytes32[] memory roleHashes,
        StateAbstraction.FunctionPermission[] memory functionPermissions
    ) internal {
        // Validate that role editing is enabled
        if (!roleEditingEnabled) revert SharedValidation.RoleEditingDisabled();
        
        // Validate array lengths match
        SharedValidation.validateArrayLengthMatch(roleHashes.length, functionPermissions.length);
        
        // Validate that all function schemas are non-protected
        // Convert supportedActions arrays to bitmaps
        for (uint256 i = 0; i < functionSchemas.length; i++) {
            if (functionSchemas[i].isProtected) {
                revert SharedValidation.CannotModifyProtectedRoles();
            }
            // Convert supportedActions array to bitmap
            // Note: functionSchemas[i].supportedActions is passed as array but we need bitmap
            // This will be handled in _loadDefinitions via createFunctionSchema
        }
        
        // Validate that all target roles exist and are non-protected
        for (uint256 i = 0; i < roleHashes.length; i++) {
            StateAbstraction.Role storage role = _getSecureState().getRole(roleHashes[i]);
            if (role.roleHash == bytes32(0)) {
                revert SharedValidation.RoleEmpty();
            }
            if (role.isProtected) {
                revert SharedValidation.CannotModifyProtectedRoles();
            }
        }
        
        // Call the base implementation
        _loadDefinitions(functionSchemas, roleHashes, functionPermissions);
        
        // Emit event for successful loading
        emit DefinitionsLoaded(functionSchemas.length, roleHashes.length);
    }

    /**
     * @dev Converts a bitmap to an array of TxActions
     * @param bitmap The bitmap to convert
     * @return Array of TxActions represented by the bitmap
     */
    function _convertBitmapToActions(uint16 bitmap) internal pure returns (StateAbstraction.TxAction[] memory) {
        // Count how many actions are set
        uint256 count = 0;
        for (uint8 i = 0; i < 16; i++) {
            if ((bitmap & (1 << i)) != 0) {
                count++;
            }
        }
        
        // Create array and populate it
        StateAbstraction.TxAction[] memory actions = new StateAbstraction.TxAction[](count);
        uint256 index = 0;
        for (uint8 i = 0; i < 16; i++) {
            if ((bitmap & (1 << i)) != 0) {
                actions[index] = StateAbstraction.TxAction(i);
                index++;
            }
        }
        
        return actions;
    }

    /**
     * @dev Converts an array of TxActions to a bitmap
     * @param actions Array of TxActions to convert
     * @return Bitmap representation of the actions
     */
    function _createBitmapFromActions(StateAbstraction.TxAction[] memory actions) internal pure returns (uint16) {
        uint16 bitmap = 0;
        for (uint256 i = 0; i < actions.length; i++) {
            bitmap = uint16(bitmap | (1 << uint8(actions[i])));
        }
        return bitmap;
    }

}
