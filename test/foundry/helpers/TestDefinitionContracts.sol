// SPDX-License-Identifier: MIT
pragma solidity 0.8.33;

import "../../../contracts/core/lib/EngineBlox.sol";
import "../../../contracts/interfaces/IDefinition.sol";

/**
 * @title TestDefinitionContracts
 * @dev Test definition contracts for testing definition security
 * These contracts provide definitions for functions that exist in TestStateMachine
 */

/**
 * @dev Test definition with a function that exists in TestStateMachine
 */
library TestDefinitions_Valid {
    // Function that will exist in TestStateMachine
    bytes4 public constant TEST_FUNCTION_SELECTOR = bytes4(keccak256("testFunction()"));
    
    function getFunctionSchemas() public pure returns (EngineBlox.FunctionSchema[] memory) {
        EngineBlox.FunctionSchema[] memory schemas = new EngineBlox.FunctionSchema[](1);
        
        EngineBlox.TxAction[] memory actions = new EngineBlox.TxAction[](1);
        actions[0] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_APPROVE;
        
        bytes4[] memory handlerForSelectors = new bytes4[](1);
        handlerForSelectors[0] = TEST_FUNCTION_SELECTOR;
        
        schemas[0] = EngineBlox.FunctionSchema({
            functionSignature: "testFunction()",
            functionSelector: TEST_FUNCTION_SELECTOR,
            operationType: keccak256("TEST_OPERATION"),
            operationName: "TEST_OPERATION",
            supportedActionsBitmap: EngineBlox.createBitmapFromActions(actions),
            isProtected: true, // Protected because function exists in contract
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
 * @dev Test definition with missing protected flag for function that exists in contract
 */
library TestDefinitions_MissingProtected {
    bytes4 public constant TEST_FUNCTION_SELECTOR = bytes4(keccak256("testFunction()"));
    
    function getFunctionSchemas() public pure returns (EngineBlox.FunctionSchema[] memory) {
        EngineBlox.FunctionSchema[] memory schemas = new EngineBlox.FunctionSchema[](1);
        
        EngineBlox.TxAction[] memory actions = new EngineBlox.TxAction[](1);
        actions[0] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_APPROVE;
        
        bytes4[] memory handlerForSelectors = new bytes4[](1);
        handlerForSelectors[0] = TEST_FUNCTION_SELECTOR;
        
        schemas[0] = EngineBlox.FunctionSchema({
            functionSignature: "testFunction()",
            functionSelector: TEST_FUNCTION_SELECTOR,
            operationType: keccak256("TEST_OPERATION"),
            operationName: "TEST_OPERATION",
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
 * @dev Test definition with mismatched signature
 */
library TestDefinitions_MismatchedSignature {
    bytes4 public constant TEST_FUNCTION_SELECTOR = bytes4(keccak256("testFunction()"));
    
    function getFunctionSchemas() public pure returns (EngineBlox.FunctionSchema[] memory) {
        EngineBlox.FunctionSchema[] memory schemas = new EngineBlox.FunctionSchema[](1);
        
        EngineBlox.TxAction[] memory actions = new EngineBlox.TxAction[](1);
        actions[0] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_APPROVE;
        
        bytes4[] memory handlerForSelectors = new bytes4[](1);
        handlerForSelectors[0] = TEST_FUNCTION_SELECTOR;
        
        schemas[0] = EngineBlox.FunctionSchema({
            functionSignature: "wrongSignature()", // ❌ Doesn't match selector
            functionSelector: TEST_FUNCTION_SELECTOR,
            operationType: keccak256("TEST_OPERATION"),
            operationName: "TEST_OPERATION",
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
 * @dev Test definition with duplicate schemas
 */
library TestDefinitions_Duplicate {
    bytes4 public constant TEST_FUNCTION_SELECTOR = bytes4(keccak256("testFunction()"));
    
    function getFunctionSchemas() public pure returns (EngineBlox.FunctionSchema[] memory) {
        EngineBlox.FunctionSchema[] memory schemas = new EngineBlox.FunctionSchema[](2);
        
        EngineBlox.TxAction[] memory actions = new EngineBlox.TxAction[](1);
        actions[0] = EngineBlox.TxAction.EXECUTE_TIME_DELAY_APPROVE;
        
        bytes4[] memory handlerForSelectors = new bytes4[](1);
        handlerForSelectors[0] = TEST_FUNCTION_SELECTOR;
        
        // First schema
        schemas[0] = EngineBlox.FunctionSchema({
            functionSignature: "testFunction()",
            functionSelector: TEST_FUNCTION_SELECTOR,
            operationType: keccak256("TEST_OPERATION"),
            operationName: "TEST_OPERATION",
            supportedActionsBitmap: EngineBlox.createBitmapFromActions(actions),
            isProtected: true,
            handlerForSelectors: handlerForSelectors
        });
        
        // Duplicate schema
        schemas[1] = EngineBlox.FunctionSchema({
            functionSignature: "testFunction()",
            functionSelector: TEST_FUNCTION_SELECTOR, // ❌ Duplicate
            operationType: keccak256("TEST_OPERATION"),
            operationName: "TEST_OPERATION",
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
 * @dev Test definition with permission for non-existent function
 */
library TestDefinitions_NonExistentPermission {
    bytes4 public constant NON_EXISTENT_SELECTOR = bytes4(uint32(0xDEADBEEF));
    
    function getFunctionSchemas() public pure returns (EngineBlox.FunctionSchema[] memory) {
        // Return empty - function not registered
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
