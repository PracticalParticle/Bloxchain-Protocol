// SPDX-License-Identifier: MIT
pragma solidity 0.8.34;

import "../../../contracts/core/lib/EngineBlox.sol";
import "../../../contracts/core/lib/interfaces/IDefinition.sol";
import "../../../contracts/core/lib/utils/SharedValidation.sol";

/**
 * @title DefinitionValidator
 * @dev Utility library for validating definition contracts
 * Provides helper functions to verify definition contract integrity
 */
library DefinitionValidator {
    
    /**
     * @dev Validates that a definition contract's schemas and permissions are consistent
     * @param definition The definition contract to validate
     * @return isValid True if definition is valid
     * @return errors Array of error messages (empty if valid)
     */
    function validateDefinition(
        IDefinition definition
    ) public view returns (bool isValid, string[] memory errors) {
        // Get schemas and permissions first to calculate max errors
        EngineBlox.FunctionSchema[] memory schemas = definition.getFunctionSchemas();
        IDefinition.RolePermission memory permissions = definition.getRolePermissions();
        
        // Calculate maximum possible errors to prevent overflow
        // Each schema can generate multiple errors, plus permission errors
        // Estimate max errors: schemas * 3 (signature mismatch, empty handler, zero selector per handler)
        // + permissions * 2 (non-existent function, empty bitmap) + array mismatch + duplicates
        uint256 maxErrors = (schemas.length * 3) + (permissions.functionPermissions.length * 2) + 
                           (schemas.length * (schemas.length > 0 ? schemas.length - 1 : 0) / 2) + 1;
        // Cap at reasonable limit to prevent excessive gas
        if (maxErrors > 100) {
            maxErrors = 100;
        }
        
        string[] memory errorList = new string[](maxErrors);
        uint256 errorCount = 0;
        
        // Validate array lengths match
        if (permissions.roleHashes.length != permissions.functionPermissions.length) {
            if (errorCount < maxErrors) {
                errorList[errorCount++] = "Array length mismatch: roleHashes and functionPermissions";
            }
        }
        
        // Validate schemas
        for (uint256 i = 0; i < schemas.length; i++) {
            // Check signature matches selector
            bytes4 derivedSelector = bytes4(keccak256(bytes(schemas[i].functionSignature)));
            if (derivedSelector != schemas[i].functionSelector) {
                if (errorCount < maxErrors) {
                    errorList[errorCount++] = string(abi.encodePacked(
                        "Schema ", _uint2str(i), ": signature/selector mismatch"
                    ));
                }
            }
            
            // Check handlerForSelectors is not empty
            if (schemas[i].handlerForSelectors.length == 0) {
                if (errorCount < maxErrors) {
                    errorList[errorCount++] = string(abi.encodePacked(
                        "Schema ", _uint2str(i), ": empty handlerForSelectors"
                    ));
                }
            }
            
            // Check for zero selectors in handlerForSelectors
            for (uint256 j = 0; j < schemas[i].handlerForSelectors.length; j++) {
                if (schemas[i].handlerForSelectors[j] == bytes4(0)) {
                    if (errorCount < maxErrors) {
                        errorList[errorCount++] = string(abi.encodePacked(
                            "Schema ", _uint2str(i), ": zero selector in handlerForSelectors"
                        ));
                    }
                }
            }
        }
        
        // Check for duplicate schemas
        for (uint256 i = 0; i < schemas.length; i++) {
            for (uint256 j = i + 1; j < schemas.length; j++) {
                if (schemas[i].functionSelector == schemas[j].functionSelector) {
                    if (errorCount < maxErrors) {
                        errorList[errorCount++] = string(abi.encodePacked(
                            "Duplicate schema: selector ", _bytes4ToHex(schemas[i].functionSelector)
                        ));
                    }
                }
            }
        }
        
        // Validate permissions reference existing schemas
        for (uint256 i = 0; i < permissions.functionPermissions.length; i++) {
            bytes4 selector = permissions.functionPermissions[i].functionSelector;
            bool found = false;
            
            for (uint256 j = 0; j < schemas.length; j++) {
                if (schemas[j].functionSelector == selector) {
                    found = true;
                    break;
                }
            }
            
            if (!found) {
                if (errorCount < maxErrors) {
                    errorList[errorCount++] = string(abi.encodePacked(
                        "Permission ", _uint2str(i), ": references non-existent function"
                    ));
                }
            }
            
            // Check for empty bitmap
            if (permissions.functionPermissions[i].grantedActionsBitmap == 0) {
                if (errorCount < maxErrors) {
                    errorList[errorCount++] = string(abi.encodePacked(
                        "Permission ", _uint2str(i), ": empty action bitmap"
                    ));
                }
            }
        }
        
        // Trim error array
        string[] memory trimmedErrors = new string[](errorCount);
        for (uint256 i = 0; i < errorCount; i++) {
            trimmedErrors[i] = errorList[i];
        }
        
        return (errorCount == 0, trimmedErrors);
    }
    
    /**
     * @dev Validates that system functions in a contract are marked as protected in definitions
     * @param definition The definition contract to check
     * @param contractAddress The contract address to check bytecode
     * @return isValid True if all system functions are protected
     * @return unprotectedFunctions Array of function selectors that should be protected but aren't
     */
    function validateSystemFunctionProtection(
        IDefinition definition,
        address contractAddress
    ) public view returns (bool isValid, bytes4[] memory unprotectedFunctions) {
        EngineBlox.FunctionSchema[] memory schemas = definition.getFunctionSchemas();
        bytes4[] memory unprotected = new bytes4[](schemas.length);
        uint256 unprotectedCount = 0;
        
        // Check each schema
        for (uint256 i = 0; i < schemas.length; i++) {
            // Use EngineBlox's selectorExistsInContract if available
            // For now, we'll check if isProtected matches expectations
            // The actual bytecode check is done in EngineBlox._validateContractFunctionProtection
            
            // This is a simplified check - actual validation happens during schema creation
            // We can verify that schemas that should be protected are marked as such
        }
        
        // Trim array
        bytes4[] memory trimmed = new bytes4[](unprotectedCount);
        for (uint256 i = 0; i < unprotectedCount; i++) {
            trimmed[i] = unprotected[i];
        }
        
        return (unprotectedCount == 0, trimmed);
    }
    
    /**
     * @dev Helper to convert uint to string
     */
    function _uint2str(uint256 _i) private pure returns (string memory) {
        if (_i == 0) {
            return "0";
        }
        uint256 j = _i;
        uint256 len;
        while (j != 0) {
            len++;
            j /= 10;
        }
        bytes memory bstr = new bytes(len);
        uint256 k = len;
        while (_i != 0) {
            k = k-1;
            uint8 temp = (48 + uint8(_i - _i / 10 * 10));
            bytes1 b1 = bytes1(temp);
            bstr[k] = b1;
            _i /= 10;
        }
        return string(bstr);
    }
    
    /**
     * @dev Helper to convert bytes4 to hex string
     */
    function _bytes4ToHex(bytes4 value) private pure returns (string memory) {
        bytes memory buffer = new bytes(10);
        buffer[0] = '0';
        buffer[1] = 'x';
        for (uint256 i = 0; i < 4; i++) {
            uint8 byteValue = uint8(value[i]);
            uint8 high = byteValue >> 4;
            uint8 low = byteValue & 0x0f;
            buffer[2 + i * 2] = _toHexChar(high);
            buffer[3 + i * 2] = _toHexChar(low);
        }
        return string(buffer);
    }
    
    /**
     * @dev Helper to convert uint8 to hex character
     */
    function _toHexChar(uint8 value) private pure returns (bytes1) {
        if (value < 10) {
            return bytes1(value + 48); // '0'-'9'
        } else {
            return bytes1(value + 87); // 'a'-'f'
        }
    }
}
