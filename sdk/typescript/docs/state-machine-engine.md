# Bloxchain State Machine Engine

## Overview

The Bloxchain State Machine Engine (`SecureOperationState`) is the core component that powers all security operations in the Bloxchain Protocol. It implements a sophisticated state management system that handles transaction lifecycle, access control, and security validation in a unified, auditable manner.

## State Machine Design Principles

### 1. **Centralized State Management**
All contract state flows through a single `SecureOperationState` instance, ensuring:
- **Consistency**: All operations follow the same state transition rules
- **Auditability**: Complete state history and transition logs
- **Security**: Centralized validation and access control

### 2. **Immutable State Transitions**
State changes follow strict, predefined rules:
- **Validation**: All state changes are validated before execution
- **Atomicity**: State changes are atomic (all-or-nothing)
- **Reversibility**: Some operations support rollback mechanisms

### 3. **Event-Driven Architecture**
State changes trigger events that can be:
- **Monitored**: External systems can track state changes
- **Forwarded**: Events can be forwarded to external contracts
- **Audited**: Complete audit trail of all state changes

## Core State Components

### System State
```solidity
struct SystemState {
    bool initialized;           // State machine initialization status
    uint256 txCounter;         // Global transaction counter
    uint256 timeLockPeriodSec; // Default time lock period
}
```

**Purpose**: Tracks the overall state of the state machine and provides global configuration.

### Transaction Management
```solidity
struct TransactionManagement {
    mapping(uint256 => TxRecord) txRecords;           // Individual transaction records
    EnumerableSet.UintSet pendingTransactionsSet;     // Set of pending transaction IDs
}
```

**Purpose**: Manages the complete lifecycle of all transactions:
- **Creation**: New transactions are assigned unique IDs
- **Pending**: Transactions wait for time lock expiry
- **Approval**: Authorized users can approve transactions
- **Execution**: Approved transactions are executed
- **Completion**: Transaction results are recorded

### Role-Based Access Control
```solidity
struct RoleBasedAccessControl {
    mapping(bytes32 => Role) roles;                  // Role definitions
    EnumerableSet.Bytes32Set supportedRolesSet;      // Set of supported roles
}
```

**Purpose**: Implements dynamic, hierarchical access control:
- **Role Definition**: Define custom roles with specific permissions
- **Permission Management**: Grant/revoke permissions dynamically
- **Hierarchical Support**: Roles can inherit from other roles
- **Audit Trail**: All role changes are logged

### Function Management
```solidity
struct FunctionManagement {
    mapping(bytes4 => FunctionSchema) functions;      // Function definitions
    EnumerableSet.Bytes32Set supportedFunctionsSet; // Set of supported functions
}
```

**Purpose**: Manages function schemas and permissions:
- **Schema Definition**: Define function parameters and return types
- **Permission Mapping**: Map functions to required roles/permissions
- **Validation**: Validate function calls against schemas
- **Security**: Enforce access control on function calls

### Operation Type Management
```solidity
struct OperationTypeManagement {
    mapping(bytes32 => ReadableOperationType) supportedOperationTypes; // Operation definitions
    EnumerableSet.Bytes32Set supportedOperationTypesSet;              // Set of supported operations
}
```

**Purpose**: Standardizes and manages operation types:
- **Standard Operations**: Pre-defined operation types (OWNERSHIP_TRANSFER, etc.)
- **Custom Operations**: Support for custom operation types
- **Workflow Generation**: Generate valid operation workflows
- **Validation**: Ensure operations follow defined patterns

## State Transition Patterns

### 1. Transaction Lifecycle
```
UNDEFINED → PENDING → APPROVED → EXECUTED → COMPLETED
     ↓         ↓         ↓         ↓         ↓
   CREATE   TIMELOCK   APPROVE   EXECUTE   FINALIZE
```

**State Transitions**:
- **UNDEFINED → PENDING**: Transaction is created and validated
- **PENDING → APPROVED**: Time lock expires and transaction is approved
- **APPROVED → EXECUTED**: Transaction is executed
- **EXECUTED → COMPLETED**: Transaction results are finalized

### 2. Role Management
```
ROLE_DEFINED → PERMISSIONS_ASSIGNED → ACTIVE → MODIFIED → INACTIVE
```

**State Transitions**:
- **ROLE_DEFINED**: Role is created with basic definition
- **PERMISSIONS_ASSIGNED**: Permissions are granted to the role
- **ACTIVE**: Role is active and can be used
- **MODIFIED**: Role permissions are updated
- **INACTIVE**: Role is deactivated

### 3. Operation Type Lifecycle
```
OPERATION_DEFINED → SCHEMA_VALIDATED → ACTIVE → DEPRECATED
```

**State Transitions**:
- **OPERATION_DEFINED**: Operation type is defined
- **SCHEMA_VALIDATED**: Operation schema is validated
- **ACTIVE**: Operation type is available for use
- **DEPRECATED**: Operation type is marked as deprecated

## State Machine Operations

### 1. **State Initialization**
```solidity
function initializeStateMachine(
    uint256 _timeLockPeriod,
    address _eventForwarder
) external onlyInitializer {
    _secureState.initialized = true;
    _secureState.timeLockPeriodSec = _timeLockPeriod;
    _secureState.eventForwarder = _eventForwarder;
}
```

**Purpose**: Initialize the state machine with required configuration.

### 2. **Transaction Creation**
```solidity
function createTransaction(
    bytes32 operationType,
    bytes calldata data
) external returns (uint256 txId) {
    // Validate operation type
    require(_secureState.supportedOperationTypesSet.contains(operationType), "Unsupported operation");
    
    // Create transaction record
    txId = _secureState.txCounter++;
    _secureState.txRecords[txId] = TxRecord({
        id: txId,
        operationType: operationType,
        data: data,
        status: TransactionStatus.PENDING,
        createdAt: block.timestamp
    });
    
    // Add to pending set
    _secureState.pendingTransactionsSet.add(txId);
}
```

**Purpose**: Create new transactions and add them to the state machine.

### 3. **Transaction Approval**
```solidity
function approveTransaction(uint256 txId) external {
    // Validate authorization
    require(_hasPermission(msg.sender, txId, "APPROVE"), "Unauthorized");
    
    // Update transaction status
    _secureState.txRecords[txId].status = TransactionStatus.APPROVED;
    _secureState.pendingTransactionsSet.remove(txId);
}
```

**Purpose**: Approve pending transactions after time lock expiry.

### 4. **Transaction Execution**
```solidity
function executeTransaction(uint256 txId) external {
    TxRecord storage txRecord = _secureState.txRecords[txId];
    
    // Validate status
    require(txRecord.status == TransactionStatus.APPROVED, "Transaction not approved");
    
    // Execute transaction
    _executeTransaction(txRecord);
    
    // Update status
    txRecord.status = TransactionStatus.COMPLETED;
}
```

**Purpose**: Execute approved transactions and update state.

## Security Features

### 1. **Access Control Validation**
```solidity
function _hasPermission(
    address user,
    uint256 txId,
    string memory action
) internal view returns (bool) {
    // Check user roles
    bytes32[] memory userRoles = _getUserRoles(user);
    
    // Check operation type permissions
    bytes32 operationType = _secureState.txRecords[txId].operationType;
    
    // Validate permissions
    return _validatePermissions(userRoles, operationType, action);
}
```

**Purpose**: Validate user permissions before allowing state changes.

### 2. **Time Lock Enforcement**
```solidity
function _validateTimeLock(uint256 txId) internal view returns (bool) {
    TxRecord storage txRecord = _secureState.txRecords[txId];
    uint256 timeElapsed = block.timestamp - txRecord.createdAt;
    uint256 requiredTime = _secureState.timeLockPeriodSec;
    
    return timeElapsed >= requiredTime;
}
```

**Purpose**: Enforce time locks before allowing transaction approval.

### 3. **State Validation**
```solidity
function _validateStateTransition(
    TransactionStatus from,
    TransactionStatus to
) internal pure returns (bool) {
    // Define valid state transitions
    if (from == TransactionStatus.UNDEFINED && to == TransactionStatus.PENDING) return true;
    if (from == TransactionStatus.PENDING && to == TransactionStatus.APPROVED) return true;
    if (from == TransactionStatus.APPROVED && to == TransactionStatus.EXECUTED) return true;
    if (from == TransactionStatus.EXECUTED && to == TransactionStatus.COMPLETED) return true;
    
    return false;
}
```

**Purpose**: Ensure state transitions follow valid patterns.

## Event System

### 1. **State Change Events**
```solidity
event StateChanged(
    uint256 indexed txId,
    TransactionStatus indexed from,
    TransactionStatus indexed to,
    address indexed actor,
    uint256 timestamp
);
```

**Purpose**: Emit events for all state changes for external monitoring.

### 2. **Event Forwarding**
```solidity
function _forwardEvent(bytes memory eventData) internal {
    if (_secureState.eventForwarder != address(0)) {
        IEventForwarder(_secureState.eventForwarder).forwardEvent(eventData);
    }
}
```

**Purpose**: Forward events to external systems for monitoring and analysis.

## Integration with TypeScript SDK


## Best Practices

### 1. **State Machine Design**
- **Clear State Definitions**: Define clear, unambiguous states
- **Valid Transitions**: Ensure all state transitions are valid and documented
- **Error Handling**: Implement proper error handling for invalid transitions
- **Recovery Mechanisms**: Provide mechanisms for recovering from invalid states

### 2. **Security Implementation**
- **Access Control**: Implement comprehensive access control for all state changes
- **Validation**: Validate all inputs and state changes
- **Audit Trails**: Maintain complete audit trails of all state changes
- **Time Locks**: Use appropriate time locks for sensitive operations

### 3. **Performance Optimization**
- **Efficient Storage**: Use efficient storage patterns for state data
- **Batch Operations**: Support batch operations where possible
- **Gas Optimization**: Optimize gas usage for common operations
- **Caching**: Implement caching for frequently accessed state data

## Conclusion

The Guardian State Machine Engine provides a robust, secure, and efficient foundation for managing complex blockchain operations. By centralizing state management and implementing strict state transition rules, the engine ensures consistent, auditable, and secure operation of all Guardian contracts.

The TypeScript SDK provides comprehensive tools for analyzing, validating, and interacting with the state machine, making it easy for developers to leverage the full power of the Guardian architecture.
