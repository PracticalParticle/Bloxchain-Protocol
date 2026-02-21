// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "../../../contracts/core/lib/EngineBlox.sol";
import "../../../contracts/core/lib/interfaces/IDefinition.sol";

/**
 * @title MaliciousDefinitions
 * @dev Mock malicious definition contracts for testing security vulnerabilities
 * These contracts demonstrate various attack vectors that should be rejected
 */

/**
 * @dev Malicious definition that omits protected flag for system functions
 */
library MaliciousDefinitions_MissingProtected {
    bytes4 public constant SYSTEM_FUNCTION_SELECTOR = bytes4(keccak256("transferOwnership(address)"));
    
    function getFunctionSchemas() public pure returns (EngineBlox.FunctionSchema[] memory) {
        EngineBlox.FunctionSchema[] memory schemas = new EngineBlox.FunctionSchema[](1);
        
        EngineBlox.TxAction[] memory actions = new EngineBlox.TxAction[](1);
        actions[0] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_APPROVE;
        
        bytes4[] memory handlerForSelectors = new bytes4[](1);
        handlerForSelectors[0] = SYSTEM_FUNCTION_SELECTOR;
        
        schemas[0] = EngineBlox.FunctionSchema({
            functionSignature: "transferOwnership(address)",
            functionSelector: SYSTEM_FUNCTION_SELECTOR,
            operationType: keccak256("OWNERSHIP_TRANSFER"),
            operationName: "OWNERSHIP_TRANSFER",
            supportedActionsBitmap: EngineBlox.createBitmapFromActions(actions),
            isProtected: false, // ❌ Should be true - function exists in contract bytecode
            handlerForSelectors: handlerForSelectors
        });
        
        return schemas;
    }
    
    function getRolePermissions() public pure returns (IDefinition.RolePermission memory) {
        return IDefinition.RolePermission({
            roleHashes: new bytes32[](0),
            functionPermissions: new EngineBlox.FunctionPermission[](0)
        });
    }
}

/**
 * @dev Malicious definition with mismatched function signature/selector
 */
library MaliciousDefinitions_MismatchedSignature {
    bytes4 public constant FUNCTION_SELECTOR = bytes4(keccak256("transferOwnership(address)"));
    
    function getFunctionSchemas() public pure returns (EngineBlox.FunctionSchema[] memory) {
        EngineBlox.FunctionSchema[] memory schemas = new EngineBlox.FunctionSchema[](1);
        
        EngineBlox.TxAction[] memory actions = new EngineBlox.TxAction[](1);
        actions[0] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_APPROVE;
        
        bytes4[] memory handlerForSelectors = new bytes4[](1);
        handlerForSelectors[0] = FUNCTION_SELECTOR;
        
        schemas[0] = EngineBlox.FunctionSchema({
            functionSignature: "wrongSignature()", // ❌ Doesn't match selector
            functionSelector: FUNCTION_SELECTOR,
            operationType: keccak256("OWNERSHIP_TRANSFER"),
            operationName: "OWNERSHIP_TRANSFER",
            supportedActionsBitmap: EngineBlox.createBitmapFromActions(actions),
            isProtected: true,
            handlerForSelectors: handlerForSelectors
        });
        
        return schemas;
    }
    
    function getRolePermissions() public pure returns (IDefinition.RolePermission memory) {
        return IDefinition.RolePermission({
            roleHashes: new bytes32[](0),
            functionPermissions: new EngineBlox.FunctionPermission[](0)
        });
    }
}

/**
 * @dev Malicious definition with invalid handler selector relationships
 */
library MaliciousDefinitions_InvalidHandler {
    bytes4 public constant HANDLER_SELECTOR = bytes4(keccak256("handlerFunction()"));
    bytes4 public constant INVALID_EXECUTION_SELECTOR = bytes4(uint32(0x12345678));
    
    function getFunctionSchemas() public pure returns (EngineBlox.FunctionSchema[] memory) {
        EngineBlox.FunctionSchema[] memory schemas = new EngineBlox.FunctionSchema[](1);
        
        EngineBlox.TxAction[] memory actions = new EngineBlox.TxAction[](1);
        actions[0] = EngineBlox.TxAction.EXECUTE_META_REQUEST_AND_APPROVE;
        
        bytes4[] memory handlerForSelectors = new bytes4[](1);
        handlerForSelectors[0] = INVALID_EXECUTION_SELECTOR; // ❌ Points to non-existent execution
        
        schemas[0] = EngineBlox.FunctionSchema({
            functionSignature: "handlerFunction()",
            functionSelector: HANDLER_SELECTOR,
            operationType: keccak256("TEST_OPERATION"),
            operationName: "TEST_OPERATION",
            supportedActionsBitmap: EngineBlox.createBitmapFromActions(actions),
            isProtected: false,
            handlerForSelectors: handlerForSelectors
        });
        
        return schemas;
    }
    
    function getRolePermissions() public pure returns (IDefinition.RolePermission memory) {
        return IDefinition.RolePermission({
            roleHashes: new bytes32[](0),
            functionPermissions: new EngineBlox.FunctionPermission[](0)
        });
    }
}

/**
 * @dev Malicious definition with empty handlerForSelectors array
 */
library MaliciousDefinitions_EmptyHandlerArray {
    bytes4 public constant FUNCTION_SELECTOR = bytes4(keccak256("testFunction()"));
    
    function getFunctionSchemas() public pure returns (EngineBlox.FunctionSchema[] memory) {
        EngineBlox.FunctionSchema[] memory schemas = new EngineBlox.FunctionSchema[](1);
        
        EngineBlox.TxAction[] memory actions = new EngineBlox.TxAction[](1);
        actions[0] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_APPROVE;
        
        bytes4[] memory handlerForSelectors = new bytes4[](0); // ❌ Empty array not allowed
        
        schemas[0] = EngineBlox.FunctionSchema({
            functionSignature: "testFunction()",
            functionSelector: FUNCTION_SELECTOR,
            operationType: keccak256("TEST_OPERATION"),
            operationName: "TEST_OPERATION",
            supportedActionsBitmap: EngineBlox.createBitmapFromActions(actions),
            isProtected: true, // Must be true if selector exists in contract bytecode
            handlerForSelectors: handlerForSelectors
        });
        
        return schemas;
    }
    
    function getRolePermissions() public pure returns (IDefinition.RolePermission memory) {
        return IDefinition.RolePermission({
            roleHashes: new bytes32[](0),
            functionPermissions: new EngineBlox.FunctionPermission[](0)
        });
    }
}

/**
 * @dev Malicious definition with permission for non-existent function
 */
library MaliciousDefinitions_NonExistentFunction {
    bytes4 public constant NON_EXISTENT_SELECTOR = bytes4(uint32(0xDEADBEEF));
    
    function getFunctionSchemas() public pure returns (EngineBlox.FunctionSchema[] memory) {
        // Return empty schemas - function not registered
        return new EngineBlox.FunctionSchema[](0);
    }
    
    function getRolePermissions() public pure returns (IDefinition.RolePermission memory) {
        bytes32[] memory roleHashes = new bytes32[](1);
        EngineBlox.FunctionPermission[] memory functionPermissions =
            new EngineBlox.FunctionPermission[](1);
        
        EngineBlox.TxAction[] memory actions = new EngineBlox.TxAction[](1);
        actions[0] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_APPROVE;
        
        bytes4[] memory handlerForSelectors = new bytes4[](1);
        handlerForSelectors[0] = NON_EXISTENT_SELECTOR;
        
        roleHashes[0] = EngineBlox.OWNER_ROLE;
        functionPermissions[0] = EngineBlox.FunctionPermission({
            functionSelector: NON_EXISTENT_SELECTOR, // ❌ Function schema not registered
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(actions),
            handlerForSelectors: handlerForSelectors
        });
        
        return IDefinition.RolePermission({
            roleHashes: roleHashes,
            functionPermissions: functionPermissions
        });
    }
}

/**
 * @dev Malicious definition with mismatched array lengths
 */
library MaliciousDefinitions_MismatchedArrays {
    bytes4 public constant FUNCTION_SELECTOR = bytes4(keccak256("testFunction()"));
    
    function getFunctionSchemas() public pure returns (EngineBlox.FunctionSchema[] memory) {
        EngineBlox.FunctionSchema[] memory schemas = new EngineBlox.FunctionSchema[](1);
        
        EngineBlox.TxAction[] memory actions = new EngineBlox.TxAction[](1);
        actions[0] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_APPROVE;
        
        bytes4[] memory handlerForSelectors = new bytes4[](1);
        handlerForSelectors[0] = FUNCTION_SELECTOR;
        
        schemas[0] = EngineBlox.FunctionSchema({
            functionSignature: "testFunction()",
            functionSelector: FUNCTION_SELECTOR,
            operationType: keccak256("TEST_OPERATION"),
            operationName: "TEST_OPERATION",
            supportedActionsBitmap: EngineBlox.createBitmapFromActions(actions),
            isProtected: true, // Must be true if selector exists in contract bytecode
            handlerForSelectors: handlerForSelectors
        });
        
        return schemas;
    }
    
    function getRolePermissions() public pure returns (IDefinition.RolePermission memory) {
        bytes32[] memory roleHashes = new bytes32[](2); // 2 roles
        EngineBlox.FunctionPermission[] memory functionPermissions =
            new EngineBlox.FunctionPermission[](1); // ❌ Only 1 permission - mismatch!
        
        EngineBlox.TxAction[] memory actions = new EngineBlox.TxAction[](1);
        actions[0] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_APPROVE;
        
        bytes4[] memory handlerForSelectors = new bytes4[](1);
        handlerForSelectors[0] = FUNCTION_SELECTOR;
        
        roleHashes[0] = EngineBlox.OWNER_ROLE;
        roleHashes[1] = EngineBlox.BROADCASTER_ROLE;
        
        functionPermissions[0] = EngineBlox.FunctionPermission({
            functionSelector: FUNCTION_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(actions),
            handlerForSelectors: handlerForSelectors
        });
        
        return IDefinition.RolePermission({
            roleHashes: roleHashes,
            functionPermissions: functionPermissions
        });
    }
}

/**
 * @dev Malicious definition with empty action bitmap
 */
library MaliciousDefinitions_EmptyBitmap {
    bytes4 public constant FUNCTION_SELECTOR = bytes4(keccak256("testFunction()"));
    
    function getFunctionSchemas() public pure returns (EngineBlox.FunctionSchema[] memory) {
        EngineBlox.FunctionSchema[] memory schemas = new EngineBlox.FunctionSchema[](1);
        
        EngineBlox.TxAction[] memory actions = new EngineBlox.TxAction[](1);
        actions[0] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_APPROVE;
        
        bytes4[] memory handlerForSelectors = new bytes4[](1);
        handlerForSelectors[0] = FUNCTION_SELECTOR;
        
        schemas[0] = EngineBlox.FunctionSchema({
            functionSignature: "testFunction()",
            functionSelector: FUNCTION_SELECTOR,
            operationType: keccak256("TEST_OPERATION"),
            operationName: "TEST_OPERATION",
            supportedActionsBitmap: EngineBlox.createBitmapFromActions(actions),
            isProtected: true, // Must be true if selector exists in contract bytecode
            handlerForSelectors: handlerForSelectors
        });
        
        return schemas;
    }
    
    function getRolePermissions() public pure returns (IDefinition.RolePermission memory) {
        bytes32[] memory roleHashes = new bytes32[](1);
        EngineBlox.FunctionPermission[] memory functionPermissions =
            new EngineBlox.FunctionPermission[](1);
        
        bytes4[] memory handlerForSelectors = new bytes4[](1);
        handlerForSelectors[0] = FUNCTION_SELECTOR;
        
        roleHashes[0] = EngineBlox.OWNER_ROLE;
        functionPermissions[0] = EngineBlox.FunctionPermission({
            functionSelector: FUNCTION_SELECTOR,
            grantedActionsBitmap: 0, // ❌ Empty bitmap not allowed
            handlerForSelectors: handlerForSelectors
        });
        
        return IDefinition.RolePermission({
            roleHashes: roleHashes,
            functionPermissions: functionPermissions
        });
    }
}

/**
 * @dev Malicious definition with invalid self-reference for handler
 */
library MaliciousDefinitions_InvalidSelfReference {
    bytes4 public constant HANDLER_SELECTOR = bytes4(keccak256("handlerFunction()"));
    
    function getFunctionSchemas() public pure returns (EngineBlox.FunctionSchema[] memory) {
        EngineBlox.FunctionSchema[] memory schemas = new EngineBlox.FunctionSchema[](1);
        
        EngineBlox.TxAction[] memory actions = new EngineBlox.TxAction[](1);
        actions[0] = EngineBlox.TxAction.EXECUTE_META_REQUEST_AND_APPROVE;
        
        bytes4[] memory handlerForSelectors = new bytes4[](1);
        handlerForSelectors[0] = bytes4(uint32(0x12345678)); // Points to execution
        
        schemas[0] = EngineBlox.FunctionSchema({
            functionSignature: "handlerFunction()",
            functionSelector: HANDLER_SELECTOR,
            operationType: keccak256("TEST_OPERATION"),
            operationName: "TEST_OPERATION",
            supportedActionsBitmap: EngineBlox.createBitmapFromActions(actions),
            isProtected: true, // Must be true if selector exists in contract bytecode
            handlerForSelectors: handlerForSelectors
        });
        
        return schemas;
    }
    
    function getRolePermissions() public pure returns (IDefinition.RolePermission memory) {
        bytes32[] memory roleHashes = new bytes32[](1);
        EngineBlox.FunctionPermission[] memory functionPermissions =
            new EngineBlox.FunctionPermission[](1);
        
        EngineBlox.TxAction[] memory actions = new EngineBlox.TxAction[](1);
        actions[0] = EngineBlox.TxAction.EXECUTE_META_REQUEST_AND_APPROVE;
        
        bytes4[] memory handlerForSelectors = new bytes4[](1);
        handlerForSelectors[0] = HANDLER_SELECTOR; // ❌ Self-reference not allowed for handlers
        
        roleHashes[0] = EngineBlox.OWNER_ROLE;
        functionPermissions[0] = EngineBlox.FunctionPermission({
            functionSelector: HANDLER_SELECTOR,
            grantedActionsBitmap: EngineBlox.createBitmapFromActions(actions),
            handlerForSelectors: handlerForSelectors
        });
        
        return IDefinition.RolePermission({
            roleHashes: roleHashes,
            functionPermissions: functionPermissions
        });
    }
}

/**
 * @dev Malicious definition with duplicate function schemas
 */
library MaliciousDefinitions_DuplicateSchemas {
    bytes4 public constant FUNCTION_SELECTOR = bytes4(keccak256("testFunction()"));
    
    function getFunctionSchemas() public pure returns (EngineBlox.FunctionSchema[] memory) {
        EngineBlox.FunctionSchema[] memory schemas = new EngineBlox.FunctionSchema[](2);
        
        EngineBlox.TxAction[] memory actions = new EngineBlox.TxAction[](1);
        actions[0] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_APPROVE;
        
        bytes4[] memory handlerForSelectors = new bytes4[](1);
        handlerForSelectors[0] = FUNCTION_SELECTOR;
        
        // First schema
        schemas[0] = EngineBlox.FunctionSchema({
            functionSignature: "testFunction()",
            functionSelector: FUNCTION_SELECTOR,
            operationType: keccak256("TEST_OPERATION"),
            operationName: "TEST_OPERATION",
            supportedActionsBitmap: EngineBlox.createBitmapFromActions(actions),
            isProtected: true, // Must be true if selector exists in contract bytecode
            handlerForSelectors: handlerForSelectors
        });
        
        // Duplicate schema with same selector
        schemas[1] = EngineBlox.FunctionSchema({
            functionSignature: "testFunction()",
            functionSelector: FUNCTION_SELECTOR, // ❌ Duplicate
            operationType: keccak256("TEST_OPERATION"),
            operationName: "TEST_OPERATION",
            supportedActionsBitmap: EngineBlox.createBitmapFromActions(actions),
            isProtected: false,
            handlerForSelectors: handlerForSelectors
        });
        
        return schemas;
    }
    
    function getRolePermissions() public pure returns (IDefinition.RolePermission memory) {
        return IDefinition.RolePermission({
            roleHashes: new bytes32[](0),
            functionPermissions: new EngineBlox.FunctionPermission[](0)
        });
    }
}
