# Solidity API

# SecureOwnableWorkflows

Library containing predefined workflow definitions for SecureOwnable operations
This library holds static workflow data that can be used to understand and execute
SecureOwnable operations without increasing the main contract size

This library implements the IWorkflow interface and provides comprehensive
workflow information for all SecureOwnable operations




## Functions

### getOperationWorkflows

```solidity
function getOperationWorkflows() public pure returns (struct IWorkflow.OperationWorkflow[])
```

Returns complete workflow information for all SecureOwnable operations


**Returns:**
- Array of operation workflows with all possible paths


---

### getWorkflowForOperation

```solidity
function getWorkflowForOperation(bytes32 operationType) public pure returns (struct IWorkflow.OperationWorkflow)
```

Returns workflow information for a specific operation type

**Parameters:**
- `` (): The operation type to get workflow for

**Returns:**
- Complete workflow information for the operation


---

### getWorkflowPaths

```solidity
function getWorkflowPaths(bytes32 operationType) public pure returns (struct IWorkflow.WorkflowPath[])
```

Returns all available workflow paths for an operation type

**Parameters:**
- `` (): The operation type to get paths for

**Returns:**
- Array of workflow paths


---

### getWorkflowPaths

```solidity
function getWorkflowPaths() public pure returns (struct IWorkflow.WorkflowPath[])
```

Returns all available workflow paths (flattened from all operations)


**Returns:**
- Array of workflow path definitions


---


## Events


## Structs


## Enums


