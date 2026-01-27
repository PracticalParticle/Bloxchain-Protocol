# Definition Contracts Best Practices

**Purpose**: Guidelines for creating secure and correct definition contracts  
**Last Updated**: January 27, 2026  
**Status**: Active Documentation

---

## Overview

Definition contracts provide initialization data (function schemas and role permissions) for Bloxchain Protocol contracts. They implement the `IDefinition` interface and are loaded during contract initialization via `_loadDefinitions()`. This document provides best practices for creating secure definition contracts.

---

## Core Principles

### 1. Use Pure Functions Only

**Requirement**: All functions in definition contracts MUST be `pure`.

**Why**: Pure functions cannot access state, ensuring definitions are immutable and cannot be manipulated after deployment.

**Example**:
```solidity
// ✅ CORRECT
function getFunctionSchemas() public pure returns (EngineBlox.FunctionSchema[] memory) {
    // Implementation
}

// ❌ WRONG
function getFunctionSchemas() public returns (EngineBlox.FunctionSchema[] memory) {
    // Can access state - vulnerable to manipulation
}
```

### 2. Protect System Functions

**Requirement**: Functions that exist in the contract's bytecode MUST be marked as `isProtected: true`.

**Why**: The protection mechanism (`_validateContractFunctionProtection`) checks if a function selector exists in the contract bytecode. If it exists, it must be protected to prevent accidental removal.

**Example**:
```solidity
// ✅ CORRECT - System function is protected
schemas[0] = EngineBlox.FunctionSchema({
    functionSignature: "transferOwnership(address)",
    functionSelector: TRANSFER_OWNERSHIP_SELECTOR,
    isProtected: true, // Required - function exists in contract bytecode
    // ...
});

// ❌ WRONG - System function not protected
schemas[0] = EngineBlox.FunctionSchema({
    functionSignature: "transferOwnership(address)",
    functionSelector: TRANSFER_OWNERSHIP_SELECTOR,
    isProtected: false, // Will revert with ContractFunctionMustBeProtected
    // ...
});
```

### 3. Match Function Signatures and Selectors

**Requirement**: Function signatures MUST match their selectors exactly.

**Why**: Signature validation ensures the signature correctly represents the function selector.

**Example**:
```solidity
// ✅ CORRECT
bytes4 public constant FUNCTION_SELECTOR = bytes4(keccak256("transferOwnership(address)"));
schemas[0] = EngineBlox.FunctionSchema({
    functionSignature: "transferOwnership(address)", // Matches selector
    functionSelector: FUNCTION_SELECTOR,
    // ...
});

// ❌ WRONG
bytes4 public constant FUNCTION_SELECTOR = bytes4(keccak256("transferOwnership(address)"));
schemas[0] = EngineBlox.FunctionSchema({
    functionSignature: "wrongSignature()", // Doesn't match selector
    functionSelector: FUNCTION_SELECTOR, // Will revert with FunctionSelectorMismatch
    // ...
});
```

### 4. Validate Handler Selector Relationships

**Requirement**: Handler selectors MUST point to valid execution selectors that exist in schemas.

**Why**: Invalid handler relationships can bypass security checks or cause permission escalation.

**Example**:
```solidity
// ✅ CORRECT - Handler points to valid execution selector
bytes4[] memory handlerForSelectors = new bytes4[](1);
handlerForSelectors[0] = EXECUTION_SELECTOR; // Must exist in schemas

// ❌ WRONG - Handler points to non-existent selector
bytes4[] memory handlerForSelectors = new bytes4[](1);
handlerForSelectors[0] = NON_EXISTENT_SELECTOR; // Will revert with HandlerForSelectorMismatch
```

### 5. Never Use Empty Arrays

**Requirement**: `handlerForSelectors` arrays MUST NOT be empty.

**Why**: Empty arrays are no longer allowed. Execution selectors must self-reference, and handler selectors must point to valid execution selectors.

**Example**:
```solidity
// ✅ CORRECT
bytes4[] memory handlerForSelectors = new bytes4[](1);
handlerForSelectors[0] = EXECUTION_SELECTOR; // At least one element

// ❌ WRONG
bytes4[] memory handlerForSelectors = new bytes4[](0); // Will revert with OperationFailed
```

### 6. Match Array Lengths

**Requirement**: `roleHashes` and `functionPermissions` arrays MUST have the same length.

**Why**: These arrays are parallel - each role hash corresponds to a function permission at the same index.

**Example**:
```solidity
// ✅ CORRECT
bytes32[] memory roleHashes = new bytes32[](2);
EngineBlox.FunctionPermission[] memory functionPermissions = new EngineBlox.FunctionPermission[](2);
// Both arrays have length 2

// ❌ WRONG
bytes32[] memory roleHashes = new bytes32[](2);
EngineBlox.FunctionPermission[] memory functionPermissions = new EngineBlox.FunctionPermission[](1);
// Mismatch - will revert with ArrayLengthMismatch
```

### 7. Register Schemas Before Permissions

**Requirement**: Function schemas MUST be registered before role permissions that reference them.

**Why**: Permissions reference function selectors that must exist in the `supportedFunctionsSet`.

**Example**:
```solidity
// ✅ CORRECT - _loadDefinitions enforces this order
_loadDefinitions(
    functionSchemas,  // Load schemas first
    roleHashes,
    functionPermissions // Then permissions
);

// ❌ WRONG - Permissions reference non-existent functions
// This is prevented by _loadDefinitions which loads schemas first
```

### 8. Use Non-Zero Action Bitmaps

**Requirement**: `grantedActionsBitmap` MUST NOT be zero.

**Why**: Empty bitmaps indicate no permissions, which is invalid.

**Example**:
```solidity
// ✅ CORRECT
EngineBlox.TxAction[] memory actions = new EngineBlox.TxAction[](1);
actions[0] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_APPROVE;
grantedActionsBitmap: EngineBlox.createBitmapFromActions(actions) // Non-zero

// ❌ WRONG
grantedActionsBitmap: 0 // Will revert with NotSupported
```

### 9. Avoid Duplicate Schemas

**Requirement**: Each function selector MUST appear only once in schemas.

**Why**: Duplicate schemas cause conflicts and are rejected.

**Example**:
```solidity
// ✅ CORRECT
schemas[0] = EngineBlox.FunctionSchema({...functionSelector: SELECTOR_A...});
schemas[1] = EngineBlox.FunctionSchema({...functionSelector: SELECTOR_B...}); // Different selector

// ❌ WRONG
schemas[0] = EngineBlox.FunctionSchema({...functionSelector: SELECTOR_A...});
schemas[1] = EngineBlox.FunctionSchema({...functionSelector: SELECTOR_A...}); // Duplicate - will revert with ResourceAlreadyExists
```

### 10. Validate Self-Reference Rules

**Requirement**: Only execution selectors can use self-reference in `handlerForSelectors`.

**Why**: Handler selectors must point to execution selectors, not themselves.

**Example**:
```solidity
// ✅ CORRECT - Execution selector self-reference
bytes4[] memory handlerForSelectors = new bytes4[](1);
handlerForSelectors[0] = EXECUTION_SELECTOR; // Self-reference allowed for execution

// ❌ WRONG - Handler selector self-reference
bytes4[] memory handlerForSelectors = new bytes4[](1);
handlerForSelectors[0] = HANDLER_SELECTOR; // Self-reference not allowed for handlers
```

---

## Security Checklist

When creating a definition contract, verify:

- [ ] All functions are `pure`
- [ ] System functions (existing in bytecode) are marked `isProtected: true`
- [ ] Function signatures match selectors exactly
- [ ] Handler selectors point to valid execution selectors
- [ ] No empty `handlerForSelectors` arrays
- [ ] `roleHashes` and `functionPermissions` arrays have matching lengths
- [ ] All action bitmaps are non-zero
- [ ] No duplicate function selectors in schemas
- [ ] Self-references only used for execution selectors
- [ ] All referenced function selectors exist in schemas

---

## Testing Your Definition Contract

### 1. Use the Definition Validator

```solidity
import "../helpers/DefinitionValidator.sol";

function test_MyDefinitionIsValid() public {
    (bool isValid, string[] memory errors) = DefinitionValidator.validateDefinition(
        MyDefinitions
    );
    
    assertTrue(isValid, "Definition should be valid");
    assertEq(errors.length, 0, "No errors expected");
}
```

### 2. Test with Real Contracts

```solidity
function test_MyDefinitionLoadsSuccessfully() public {
    MyContract contract = new MyContract();
    contract.initialize(
        owner,
        broadcaster,
        recovery,
        timeLockPeriod,
        eventForwarder
    );
    
    // Verify initialization succeeded
    assertTrue(contract.initialized());
}
```

### 3. Test Protection Validation

```solidity
function test_SystemFunctionsAreProtected() public {
    EngineBlox.FunctionSchema[] memory schemas = MyDefinitions.getFunctionSchemas();
    
    // Verify system functions are protected
    for (uint256 i = 0; i < schemas.length; i++) {
        if (schemas[i].functionSelector == SYSTEM_FUNCTION_SELECTOR) {
            assertTrue(schemas[i].isProtected, "System function must be protected");
        }
    }
}
```

---

## Common Mistakes to Avoid

### 1. Forgetting Protected Flag

```solidity
// ❌ WRONG
isProtected: false, // For system function

// ✅ CORRECT
isProtected: true, // For system function
```

### 2. Signature Mismatch

```solidity
// ❌ WRONG
functionSignature: "transfer(address,uint256)", // Wrong signature
functionSelector: TRANSFER_OWNERSHIP_SELECTOR,

// ✅ CORRECT
functionSignature: "transferOwnership(address)", // Matches selector
functionSelector: TRANSFER_OWNERSHIP_SELECTOR,
```

### 3. Array Length Mismatch

```solidity
// ❌ WRONG
bytes32[] memory roleHashes = new bytes32[](2);
EngineBlox.FunctionPermission[] memory permissions = new EngineBlox.FunctionPermission[](1);

// ✅ CORRECT
bytes32[] memory roleHashes = new bytes32[](2);
EngineBlox.FunctionPermission[] memory permissions = new EngineBlox.FunctionPermission[](2);
```

### 4. Empty Handler Array

```solidity
// ❌ WRONG
bytes4[] memory handlerForSelectors = new bytes4[](0);

// ✅ CORRECT
bytes4[] memory handlerForSelectors = new bytes4[](1);
handlerForSelectors[0] = EXECUTION_SELECTOR;
```

---

## Reference Implementation

See the following system definition contracts for reference:

- `RuntimeRBACDefinitions.sol` - Runtime RBAC definitions
- `GuardControllerDefinitions.sol` - Guard controller definitions
- `SecureOwnableDefinitions.sol` - Secure ownable definitions

These contracts follow all best practices and can be used as templates.

---

## Additional Resources

- [IDefinition Interface](../contracts/interfaces/IDefinition.sol)
- [EngineBlox Library](../contracts/core/lib/EngineBlox.sol)
- [Attack Vectors Codex](../test/foundry/docs/ATTACK_VECTORS_CODEX.md#15-definition-contracts--schema-security)
- [Test Documentation](../test/foundry/docs/TEST_DOCUMENTATION.md#comprehensivedefinitionsecurityfuzztsol)

---

**Note**: Always test your definition contracts thoroughly before deploying. Use the provided test utilities and follow the security checklist to ensure your definitions are secure and correct.
