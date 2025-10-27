# Workflow Framework Tests

This directory contains comprehensive tests for the SecureOwnable workflow framework. These tests validate both the workflow information system and actual workflow execution.

## Overview

The workflow framework provides a complete system for understanding and executing SecureOwnable operations programmatically. It includes:

- **Workflow Information System**: On-chain functions that return structured workflow data
- **Role-based Permissions**: Multi-role support with arrays (e.g., `["OWNER", "RECOVERY"]`)
- **Off-chain/On-chain Phases**: Clear distinction between signing and execution phases
- **Programmatic Analysis**: Ability to determine next available actions based on user roles

## Test Structure

### Base Classes

- **`base-workflow-test.js`**: Base class providing common functionality for all workflow tests
  - Contract connection and wallet management
  - Workflow information retrieval
  - Role initialization and mapping
  - Test execution helpers

### Test Suites

- **`workflow-information-tests.js`**: Tests the workflow information system
  - `getAllWorkflows()` function validation
  - `getWorkflowForOperation()` function validation
  - `getWorkflowPaths()` function validation
  - Workflow data structure validation
  - Role array functionality testing
  - Off-chain phase detection
  - Programmatic workflow analysis

- **`workflow-execution-tests.js`**: Tests actual workflow execution
  - Ownership transfer workflow execution
  - Broadcaster update workflow execution
  - Recovery update workflow execution
  - Timelock update workflow execution
  - Workflow step permission validation
  - Workflow state transition analysis

### Test Runner

- **`run-workflow-tests.js`**: Comprehensive test runner
  - Executes all test suites
  - Provides detailed reporting
  - Calculates success rates
  - Shows failed test details

## Running Tests

### Prerequisites

1. **Environment Setup**: Ensure `.env` file is configured with:
   - `SECUREBLOX_ADDRESS`: Deployed contract address
   - `TEST_WALLET_*_PRIVATE_KEY`: Test wallet private keys
   - `REMOTE_HOST` and `REMOTE_PORT`: Network connection details

2. **Contract Deployment**: Ensure the SecureOwnable contract is deployed and accessible

3. **Dependencies**: Install required packages:
   ```bash
   npm install web3 dotenv
   ```

### Running All Tests

```bash
node scripts/workflow/run-workflow-tests.js
```

### Running Individual Test Suites

```bash
# Test workflow information system
node scripts/workflow/workflow-information-tests.js

# Test workflow execution
node scripts/workflow/workflow-execution-tests.js
```

## Test Coverage

### Workflow Information System

- ✅ **Function Availability**: All workflow functions are accessible
- ✅ **Data Structure**: Workflow data is properly structured
- ✅ **Operation Coverage**: All 4 operation types are covered
- ✅ **Path Validation**: All workflow paths are valid
- ✅ **Step Validation**: All workflow steps are properly defined

### Role Array Functionality

- ✅ **Single Role Steps**: Steps requiring one specific role
- ✅ **Multi-Role Steps**: Steps requiring multiple roles (e.g., `OWNER or RECOVERY`)
- ✅ **Role Validation**: All roles are valid (`OWNER`, `BROADCASTER`, `RECOVERY`)
- ✅ **Permission Checking**: Can determine user permissions programmatically

### Off-chain/On-chain Phases

- ✅ **Phase Detection**: Correctly identifies off-chain vs on-chain steps
- ✅ **Phase Properties**: Off-chain steps have `isOffChain: true` and `phaseType: "SIGNING"`
- ✅ **Function Selectors**: Off-chain steps have `functionSelector: "0x00000000"`
- ✅ **Meta-transaction Paths**: Correctly identifies paths with off-chain phases

### Programmatic Analysis

- ✅ **Next Action Determination**: Can find next available actions for any user role
- ✅ **Permission Validation**: Can validate if user can perform specific actions
- ✅ **Workflow State**: Can analyze current workflow state and transitions
- ✅ **Role-based Filtering**: Can filter workflows by user permissions

## Expected Results

### Successful Test Run

```
🚀 WORKFLOW FRAMEWORK TEST SUITE
================================

🧪 Running Test Suite: Workflow Information Tests
==================================================
✅ Test passed: Test getAllWorkflows
✅ Test passed: Test getWorkflowForOperation
✅ Test passed: Test getWorkflowPaths
✅ Test passed: Validate workflow data structure
✅ Test passed: Test role array functionality
✅ Test passed: Test off-chain phase detection
✅ Test passed: Test programmatic workflow analysis

📊 TEST RESULTS SUMMARY
=======================
Total Tests: 7
Passed: 7
Failed: 0
Success Rate: 100.0%

✅ Test Suite PASSED: Workflow Information Tests

🧪 Running Test Suite: Workflow Execution Tests
===============================================
✅ Test passed: Test ownership transfer workflow
✅ Test passed: Test broadcaster update workflow
✅ Test passed: Test recovery update workflow
✅ Test passed: Test timelock update workflow
✅ Test passed: Validate workflow step permissions
✅ Test passed: Test workflow state transitions

📊 TEST RESULTS SUMMARY
=======================
Total Tests: 6
Passed: 6
Failed: 0
Success Rate: 100.0%

✅ Test Suite PASSED: Workflow Execution Tests

📊 OVERALL TEST RESULTS
=======================
Total Test Suites: 2
Passed Suites: 2
Failed Suites: 0
Suite Success Rate: 100.0%

Total Tests: 13
Passed Tests: 13
Failed Tests: 0
Test Success Rate: 100.0%

Total Duration: 15.23 seconds

🎉 ALL TESTS PASSED!
✅ Workflow framework is working correctly
✅ All workflow information is accurate
✅ Role-based permissions are properly implemented
✅ Off-chain/on-chain phases are correctly detected
✅ Programmatic workflow analysis is functional
```

## Use Cases Validated

### Frontend Applications

- ✅ Can retrieve all available workflows
- ✅ Can determine user permissions for specific operations
- ✅ Can show only available actions for current user
- ✅ Can display workflow progress and next steps

### SDK Development

- ✅ Can validate user permissions before making calls
- ✅ Can generate proper function calls based on workflow steps
- ✅ Can handle both on-chain and off-chain operations
- ✅ Can provide workflow guidance to developers

### Testing Frameworks

- ✅ Can generate dynamic test cases based on available workflows
- ✅ Can validate workflow completeness and consistency
- ✅ Can test all possible workflow paths
- ✅ Can verify role-based permission enforcement

### Documentation Generation

- ✅ Can auto-generate workflow documentation
- ✅ Can create role-based user guides
- ✅ Can generate API references
- ✅ Can maintain up-to-date workflow information

## Troubleshooting

### Common Issues

1. **Contract Not Deployed**: Ensure `SECUREBLOX_ADDRESS` is set correctly
2. **Network Connection**: Verify `REMOTE_HOST` and `REMOTE_PORT` are accessible
3. **Wallet Configuration**: Ensure test wallet private keys are valid
4. **ABI Files**: Ensure ABI files exist in the `abi/` directory

### Debug Mode

To enable detailed logging, set environment variable:
```bash
export DEBUG=workflow-tests
```

### Test Isolation

Each test suite runs independently and can be executed separately for debugging specific functionality.

## Contributing

When adding new tests:

1. Follow the existing test structure
2. Use the base test class for common functionality
3. Include comprehensive error handling
4. Add detailed logging for debugging
5. Update this README with new test coverage

## Future Enhancements

- **Performance Testing**: Test workflow information retrieval performance
- **Stress Testing**: Test with multiple concurrent workflow operations
- **Integration Testing**: Test with actual frontend applications
- **Security Testing**: Validate workflow permission enforcement
- **Load Testing**: Test workflow system under high load
