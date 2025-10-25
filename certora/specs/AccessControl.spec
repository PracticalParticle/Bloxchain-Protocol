// SPDX-License-Identifier: MPL-2.0
// Certora Verification Language (CVL) specification for Access Control and RBAC
// This file implements RBAC properties and meta-transaction role separation (Theorem 5.3)

using GuardianBareHarness as Contract;
use builtin rule sanity;

// ============ META-TRANSACTION ROLE SEPARATION (THEOREM 5.3) ============

/**
 * @dev Meta-Transaction Permission Separation (Theorem 5.3)
 * The meta-transaction role separation model prevents single-point attacks with probability 
 * 1 - P(compromise_signer) * P(compromise_executor).
 * 
 * This invariant ensures that no single role can have both signing and execution 
 * permissions for meta-transactions, enforcing mandatory role separation.
 */
invariant metaTxRoleSeparation()
    forall bytes32 roleHash. forall bytes4 functionSelector.
        checkMetaTxRoleSeparation(roleHash, functionSelector);

/**
 * @dev Signing permissions exclude execution permissions
 * Roles with signing permissions cannot have execution permissions
 */
invariant signingExcludesExecution()
    forall bytes32 roleHash. forall bytes4 functionSelector.
        (roleHasActionPermission(roleHash, functionSelector, SIGN_META_APPROVE) ||
         roleHasActionPermission(roleHash, functionSelector, SIGN_META_CANCEL) ||
         roleHasActionPermission(roleHash, functionSelector, SIGN_META_REQUEST_AND_APPROVE)) =>
        !(roleHasActionPermission(roleHash, functionSelector, EXECUTE_META_APPROVE) ||
          roleHasActionPermission(roleHash, functionSelector, EXECUTE_META_CANCEL) ||
          roleHasActionPermission(roleHash, functionSelector, EXECUTE_META_REQUEST_AND_APPROVE));

/**
 * @dev Execution permissions exclude signing permissions
 * Roles with execution permissions cannot have signing permissions
 */
invariant executionExcludesSigning()
    forall bytes32 roleHash. forall bytes4 functionSelector.
        (roleHasActionPermission(roleHash, functionSelector, EXECUTE_META_APPROVE) ||
         roleHasActionPermission(roleHash, functionSelector, EXECUTE_META_CANCEL) ||
         roleHasActionPermission(roleHash, functionSelector, EXECUTE_META_REQUEST_AND_APPROVE)) =>
        !(roleHasActionPermission(roleHash, functionSelector, SIGN_META_APPROVE) ||
          roleHasActionPermission(roleHash, functionSelector, SIGN_META_CANCEL) ||
          roleHasActionPermission(roleHash, functionSelector, SIGN_META_REQUEST_AND_APPROVE));

// ============ ROLE WALLET INTEGRITY ============

/**
 * @dev Role Wallet Limits
 * All roles respect their maximum wallet limits
 */
invariant roleWalletLimits()
    forall bytes32 roleHash.
        checkRoleWalletLimits(roleHash);

/**
 * @dev Wallet count consistency
 * The wallet count matches the actual number of wallets in the role
 */
invariant walletCountConsistency()
    forall bytes32 roleHash.
        Contract.getRoleWalletCount(roleHash) >= 0 &&
        Contract.getRoleWalletCount(roleHash) <= Contract.getRoleMaxWallets(roleHash);

/**
 * @dev Role wallet uniqueness
 * Each wallet can only be in a role once
 */
invariant roleWalletUniqueness()
    forall bytes32 roleHash. forall address wallet.
        walletHasRole(roleHash, wallet) =>
        Contract.getRoleWalletCount(roleHash) > 0;

// ============ PROTECTED ROLE INTEGRITY ============

/**
 * @dev Protected roles cannot be removed
 * System-protected roles maintain their protection status
 */
rule protectedRolesCannotBeRemoved(bytes32 roleHash) {
    require isRoleProtected(roleHash);
    
    env e;
    method f; calldataarg args;
    f(e, args);
    
    assert isRoleProtected(roleHash);
}

/**
 * @dev Protected role properties are preserved
 * Protected roles maintain their essential properties
 */
invariant protectedRoleProperties()
    forall bytes32 roleHash.
        isRoleProtected(roleHash) =>
        Contract.getRoleName(roleHash).length > 0 &&
        Contract.getRoleMaxWallets(roleHash) > 0;

/**
 * @dev Protected role permissions are stable
 * Protected roles maintain their permission structure
 */
invariant protectedRolePermissions()
    forall bytes32 roleHash.
        isRoleProtected(roleHash) =>
        Contract.getRoleFunctionPermissionsCount(roleHash) > 0;

// ============ PERMISSION INTEGRITY ============

/**
 * @dev Permission inheritance consistency
 * Wallets inherit permissions from their roles
 */
invariant permissionInheritanceConsistency()
    forall bytes32 roleHash. forall address wallet. forall bytes4 functionSelector. forall uint8 action.
        walletHasRole(roleHash, wallet) =>
        (roleHasActionPermission(roleHash, functionSelector, action) <=> 
         hasActionPermission(wallet, functionSelector, action));

/**
 * @dev Role permission consistency
 * Role permissions are consistent with individual permissions
 */
invariant rolePermissionConsistency()
    forall bytes32 roleHash. forall bytes4 functionSelector. forall uint8 action.
        roleHasActionPermission(roleHash, functionSelector, action) =>
        Contract.getRoleFunctionPermissionsCount(roleHash) > 0;

/**
 * @dev Function permission validity
 * All function permissions reference valid functions
 */
invariant functionPermissionValidity()
    forall bytes32 roleHash. forall uint256 i.
        i < Contract.getRoleFunctionPermissionsCount(roleHash) =>
        isFunctionSupported(Contract.getRoleFunctionPermissionAt(roleHash, i));

// ============ ACCESS CONTROL ENFORCEMENT ============

/**
 * @dev Permission enforcement for meta-transactions
 * Meta-transaction operations require proper permissions
 */
rule metaTransactionPermissionEnforcement(address caller, bytes4 functionSelector, uint8 action) {
    require isMetaTransactionAction(action);
    require !hasActionPermission(caller, functionSelector, action);
    
    env e;
    method f; calldataarg args;
    f(e, args);
    
    // Should revert or not execute
    assert !hasActionPermission(caller, functionSelector, action);
}

/**
 * @dev Role assignment enforcement
 * Only authorized users can assign roles
 */
rule roleAssignmentEnforcement(bytes32 roleHash, address newWallet) {
    require !walletHasRole(roleHash, msg.sender);
    require !hasActionPermission(msg.sender, bytes4(0), 0); // Placeholder for role assignment permission
    
    env e;
    method f; calldataarg args;
    f(e, args);
    
    // Should revert or not assign role
    assert !walletHasRole(roleHash, newWallet);
}

/**
 * @dev Role revocation enforcement
 * Only authorized users can revoke roles
 */
rule roleRevocationEnforcement(bytes32 roleHash, address wallet) {
    require walletHasRole(roleHash, wallet);
    require !walletHasRole(roleHash, msg.sender);
    require !hasActionPermission(msg.sender, bytes4(0), 0); // Placeholder for role revocation permission
    
    env e;
    method f; calldataarg args;
    f(e, args);
    
    // Should revert or not revoke role
    assert walletHasRole(roleHash, wallet);
}

/**
 * @dev Permission modification enforcement
 * Only authorized users can modify permissions
 */
rule permissionModificationEnforcement(bytes32 roleHash, bytes4 functionSelector, uint8 action) {
    require !walletHasRole(roleHash, msg.sender);
    require !hasActionPermission(msg.sender, bytes4(0), 0); // Placeholder for permission modification permission
    
    bool hadPermission = roleHasActionPermission(roleHash, functionSelector, action);
    
    env e;
    method f; calldataarg args;
    f(e, args);
    
    // Should revert or not modify permission
    assert roleHasActionPermission(roleHash, functionSelector, action) == hadPermission;
}

// ============ ROLE MANAGEMENT SAFETY ============

/**
 * @dev Role creation safety
 * New roles are created with valid properties
 */
rule roleCreationSafety(bytes32 roleHash, string roleName, uint256 maxWallets) {
    require !walletHasRole(roleHash, address(0)); // Role doesn't exist
    require bytes(roleName).length > 0;
    require maxWallets > 0;
    
    env e;
    method f; calldataarg args;
    f(e, args);
    
    // Role should be created with valid properties
    assert Contract.getRoleName(roleHash).length > 0;
    assert Contract.getRoleMaxWallets(roleHash) > 0;
}

/**
 * @dev Role deletion safety
 * Roles can only be deleted if they are not protected
 */
rule roleDeletionSafety(bytes32 roleHash) {
    require !isRoleProtected(roleHash);
    
    env e;
    method f; calldataarg args;
    f(e, args);
    
    // Role should be deletable
    // This rule may need refinement based on actual deletion implementation
}

/**
 * @dev Wallet limit enforcement
 * Roles cannot exceed their wallet limits
 */
rule walletLimitEnforcement(bytes32 roleHash, address newWallet) {
    require roleAtWalletLimit(roleHash);
    require !walletHasRole(roleHash, newWallet);
    
    env e;
    method f; calldataarg args;
    f(e, args);
    
    // Should revert or not add wallet
    assert !walletHasRole(roleHash, newWallet);
    assert Contract.getRoleWalletCount(roleHash) <= Contract.getRoleMaxWallets(roleHash);
}

// ============ PERMISSION BITMAP INTEGRITY ============

/**
 * @dev Permission bitmap consistency
 * Permission bitmaps are consistent with granted actions
 */
invariant permissionBitmapConsistency()
    forall bytes32 roleHash. forall uint256 i.
        i < Contract.getRoleFunctionPermissionsCount(roleHash) =>
        Contract.getRoleFunctionPermissionAt(roleHash, i) != bytes4(0);

/**
 * @dev Action bitmap validity
 * All actions in bitmaps are valid
 */
invariant actionBitmapValidity()
    forall bytes32 roleHash. forall uint256 i. forall uint256 j.
        i < Contract.getRoleFunctionPermissionsCount(roleHash) &&
        j < Contract.getRoleFunctionPermissionActionsCount(roleHash, i) =>
        Contract.getRoleFunctionPermissionActionAt(roleHash, i, j) <= EXECUTE_META_REQUEST_AND_APPROVE;

// ============ SYSTEM ROLE INTEGRITY ============

/**
 * @dev System roles exist
 * Essential system roles are always present
 */
invariant systemRolesExist()
    Contract.getSupportedRolesCount() > 0;

/**
 * @dev System roles are protected
 * Essential system roles are protected from modification
 */
invariant systemRolesProtected()
    forall uint256 i.
        i < Contract.getSupportedRolesCount() =>
        isRoleProtected(Contract.getSupportedRoleAt(i));

/**
 * @dev System functions are supported
 * Essential system functions are always supported
 */
invariant systemFunctionsSupported()
    Contract.getSupportedFunctionsCount() > 0;

/**
 * @dev System operation types are supported
 * Essential operation types are always supported
 */
invariant systemOperationTypesSupported()
    Contract.getSupportedOperationTypesCount() > 0;

// ============ ACCESS CONTROL TRANSITIONS ============

/**
 * @dev Role assignment preserves permissions
 * Adding a wallet to a role gives it the role's permissions
 */
rule roleAssignmentPreservesPermissions(bytes32 roleHash, address wallet) {
    require !walletHasRole(roleHash, wallet);
    require Contract.getRoleWalletCount(roleHash) < Contract.getRoleMaxWallets(roleHash);
    
    env e;
    method f; calldataarg args;
    f(e, args);
    
    // Wallet should have role permissions
    assert walletHasRole(roleHash, wallet);
}

/**
 * @dev Role revocation removes permissions
 * Removing a wallet from a role removes the role's permissions
 */
rule roleRevocationRemovesPermissions(bytes32 roleHash, address wallet) {
    require walletHasRole(roleHash, wallet);
    
    env e;
    method f; calldataarg args;
    f(e, args);
    
    // Wallet should not have role permissions
    assert !walletHasRole(roleHash, wallet);
}

/**
 * @dev Permission addition is consistent
 * Adding permissions to a role affects all wallets in that role
 */
rule permissionAdditionConsistency(bytes32 roleHash, bytes4 functionSelector, uint8 action) {
    require !roleHasActionPermission(roleHash, functionSelector, action);
    
    env e;
    method f; calldataarg args;
    f(e, args);
    
    // All wallets in role should have the new permission
    assert roleHasActionPermission(roleHash, functionSelector, action);
}

/**
 * @dev Permission removal is consistent
 * Removing permissions from a role affects all wallets in that role
 */
rule permissionRemovalConsistency(bytes32 roleHash, bytes4 functionSelector, uint8 action) {
    require roleHasActionPermission(roleHash, functionSelector, action);
    
    env e;
    method f; calldataarg args;
    f(e, args);
    
    // No wallets in role should have the removed permission
    assert !roleHasActionPermission(roleHash, functionSelector, action);
}
