# Solidity API

# DynamicRBACWorkflows

Library containing predefined workflow definitions for DynamicRBAC operations
This library holds static workflow data that can be used to understand and execute
DynamicRBAC operations without increasing the main contract size

This library implements the IWorkflow interface and provides comprehensive
workflow information for all DynamicRBAC operations




## Functions

### getOperationWorkflows

```solidity
function getOperationWorkflows() public pure returns (struct IWorkflow.OperationWorkflow[])
```

Returns all operation workflows


**Returns:**
- Array of operation workflow definitions


---

### getWorkflowForOperation

```solidity
function getWorkflowForOperation(bytes32 operationType) public pure returns (struct IWorkflow.OperationWorkflow)
```

Returns workflow information for a specific operation type

**Parameters:**
- `` (): The operation type hash to get workflow for

**Returns:**
- OperationWorkflow struct containing workflow information for the operation


---

### getWorkflowPaths

```solidity
function getWorkflowPaths() public pure returns (struct IWorkflow.WorkflowPath[])
```

Returns all available workflow paths


**Returns:**
- Array of workflow path definitions


---


## Events


## Structs


## Enums


