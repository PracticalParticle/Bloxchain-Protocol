# Bloxchain Protocol Architecture

## Overview

The Bloxchain Protocol is a unique blockchain security framework built around a **state machine architecture** that provides comprehensive security, access control, and transaction management capabilities. Unlike traditional smart contract patterns, Bloxchain uses a centralized state management system called `SecureOperationState` that acts as the core engine for all security operations.

## Core Architecture Principles

### 1. State Machine Pattern
Bloxchain implements a **centralized state machine** where all security operations, access control, and transaction management flow through a single, well-defined state engine (`SecureOperationState`).

### 2. Unified Security Model
All Bloxchain contracts inherit from a common security foundation that provides:
- **Multi-phase transaction processing**
- **Role-based access control (RBAC)**
- **Time-locked operations**
- **Meta-transaction support**
- **Event forwarding**

### 3. Modular Design
The framework is built with modularity in mind:
- **Core libraries** provide foundational security
- **Definition libraries** standardize operation types and schemas
- **Contract implementations** inherit and extend core functionality

## SecureOperationState: The Core Engine

The `SecureOperationState` struct is the heart of the Bloxchain protocol, acting as a comprehensive state machine that manages all aspects of secure operations.

### State Machine Components

```solidity
struct SecureOperationState {
    // ============ SYSTEM STATE ============
    bool initialized;
    uint256 txCounter;
    uint256 timeLockPeriodSec;
    
    // ============ TRANSACTION MANAGEMENT ============
    mapping(uint256 => TxRecord) txRecords;
    EnumerableSet.UintSet pendingTransactionsSet;
    
    // ============ ROLE-BASED ACCESS CONTROL ============
    mapping(bytes32 => Role) roles;
    EnumerableSet.Bytes32Set supportedRolesSet;
    
    // ============ FUNCTION MANAGEMENT ============
    mapping(bytes4 => FunctionSchema) functions;
    EnumerableSet.Bytes32Set supportedFunctionsSet;
    
    // ============ OPERATION TYPES ============
    EnumerableSet.Bytes32Set supportedOperationTypesSet;
    
    // ============ FUNCTION TARGET MANAGEMENT ============
    mapping(bytes4 => EnumerableSet.AddressSet) functionTargetWhitelist;
    mapping(bytes4 => EnumerableSet.AddressSet) functionTargetHooks;
    
    // ============ META-TRANSACTION SUPPORT ============
    mapping(address => uint256) signerNonces;
    
    // ============ EVENT FORWARDING ============
    address eventForwarder;
}
```

### State Machine Responsibilities

#### 1. **Transaction Lifecycle Management**
- **Request Phase**: Transactions are submitted and validated
- **Pending Phase**: Time-locked transactions wait for approval
- **Approval Phase**: Authorized users can approve pending transactions
- **Execution Phase**: Approved transactions are executed
- **Completion Phase**: Transaction results are recorded and events emitted

#### 2. **Role-Based Access Control**
- **Role Definition**: Define custom roles with specific permissions and wallet limits
- **Permission Management**: Grant/revoke permissions for functions and operations via batch configuration
- **Dynamic Role Assignment**: Roles can be modified during contract lifecycle
- **Function-Level Permissions**: Action-level permissions (request, approve, cancel, meta-sign, meta-execute)
- **Handler Selectors**: Support for handler functions with execution selector permissions

#### 3. **Function Schema Management**
- **Function Registration**: Runtime function schema registration with action-level permissions
- **Function Schemas**: Define function signatures, operation types, and supported actions
- **Handler Functions**: Support for handler functions that manage execution selector permissions
- **Function Target Whitelisting**: Per-function selector target address restrictions for security
- **Function Hooks**: External hook contract attachment per function selector

#### 4. **Time-Lock Security**
- **Configurable Time Locks**: Set different time-lock periods for different operations
- **Multi-Phase Operations**: Support for operations requiring multiple phases
- **Emergency Overrides**: Built-in mechanisms for emergency situations
- **Audit Trail**: Complete history of all time-locked operations

## Architecture Layers

### Layer 1: Core Libraries
**Purpose**: Provide foundational security and state management

- **`EngineBlox.sol`**: Core state machine implementation
- **`SharedValidation.sol`**: Common validation functions
- **`BaseDefinitionLoader.sol`**: Base functionality for definition loading

### Layer 2: Definition Libraries
**Purpose**: Standardize operation types, function schemas, and role permissions

- **`SecureOwnableDefinitions.sol`**: Standard definitions for ownership operations
- **`RuntimeRBACDefinitions.sol`**: Standard definitions for RBAC operations
- **`GuardControllerDefinitions.sol`**: Standard definitions for execution workflows

### Layer 3: Base Contracts
**Purpose**: Provide foundational contract implementations

- **`BaseStateMachine.sol`**: Core state machine functionality with meta-transaction support
- **`SecureOwnable.sol`**: Multi-role security with Owner, Broadcaster, and Recovery roles
- **`RuntimeRBAC.sol`**: Runtime role-based access control with batch configuration
- **`GuardController.sol`**: Execution workflows and time-locked transaction management
- **`HookManager.sol`**: External hook contract attachment for state machine actions

### Layer 4: Template Contracts
**Purpose**: Provide ready-to-use template implementations

- **`BareBlox.sol`**: Minimal implementation using only BaseStateMachine
- **`SecureBlox.sol`**: Basic implementation using SecureOwnable
- **`RoleBlox.sol`**: Implementation combining SecureOwnable and RuntimeRBAC
- **`AccountBlox.sol`**: Complete implementation with GuardController, RuntimeRBAC, and SecureOwnable
- **`MachineBlox.sol`**: Full-featured implementation with GuardController, RuntimeRBAC, SecureOwnable, and HookManager

### Layer 5: Application Contracts
**Purpose**: DApp-specific implementations using Bloxchain security

- **`SimpleVault.sol`**: Example vault implementation using SecureOwnable
- **`SimpleRWA20.sol`**: Example RWA token implementation using SecureOwnable

## State Machine Flow

### 1. Initialization Phase
```
Contract Deployment → State Machine Initialization → Role Setup → Operation Type Configuration
```

### 2. Operation Request Phase
```
User Request → Validation → State Machine Check → Transaction Record Creation → Time Lock Application
```

### 3. Approval Phase
```
Time Lock Expiry → Authorization Check → State Machine Validation → Transaction Approval → Execution Preparation
```

### 4. Execution Phase
```
Approved Transaction → State Machine Execution → Function Call → State Update → Event Emission
```

## Key Benefits of State Machine Architecture

### 1. **Centralized Security**
- All security logic flows through a single, audited state machine
- Consistent security policies across all operations
- Reduced attack surface through centralized validation

### 2. **Predictable Behavior**
- Well-defined state transitions
- Clear operation lifecycle
- Deterministic security outcomes

### 3. **Auditability**
- Complete transaction history
- Clear state transitions
- Comprehensive event logging

### 4. **Flexibility**
- Configurable time locks
- Dynamic role management
- Custom operation types
- Extensible permission system

### 5. **Gas Efficiency**
- Optimized state management
- Batch operations support
- Efficient storage patterns

## Integration with TypeScript SDK

The TypeScript SDK provides comprehensive interfaces to interact with Bloxchain contracts:

### **SecureOwnable Integration**
```typescript
import { SecureOwnable } from '@bloxchain/sdk'

const secureOwnable = new SecureOwnable(client, walletClient, contractAddress, chain)

// Access ownership information
const owner = await secureOwnable.owner()
const broadcasters = await secureOwnable.getBroadcasters() // Returns array (up to 3 wallets)
const recovery = await secureOwnable.getRecovery()
```

### **RuntimeRBAC Integration**
```typescript
import { RuntimeRBAC } from '@bloxchain/sdk'

const runtimeRBAC = new RuntimeRBAC(client, walletClient, contractAddress, chain)

// Access role information
const roles = await runtimeRBAC.getSupportedRoles()
const roleInfo = await runtimeRBAC.getRole(roleHash)
const hasRole = await runtimeRBAC.hasRole(roleHash, walletAddress)
const wallets = await runtimeRBAC.getWalletsInRole(roleHash)
const walletRoles = await runtimeRBAC.getWalletRoles(walletAddress) // Get all roles for a wallet

// Access function schema information
const schema = await runtimeRBAC.getFunctionSchema(functionSelector)
const functions = await runtimeRBAC.getSupportedFunctions()
```

## State Machine Security Features

### 1. **Reentrancy Protection**
- State machine prevents reentrancy through centralized state management
- All operations flow through validated state transitions

### 2. **Access Control**
- Role-based permissions enforced at state machine level
- Dynamic role management with audit trails

### 3. **Time-Lock Security**
- Configurable time locks for different operation types
- Multi-phase operation support

### 4. **Meta-Transaction Support**
- Built-in support for meta-transactions
- Nonce management for replay protection

### 5. **Event Forwarding**
- Centralized event management
- Comprehensive audit trails

## Best Practices

### 1. **State Machine Initialization**
- Always initialize the state machine after deployment
- Configure appropriate time locks for your use case
- Set up required roles and permissions

### 2. **Operation Design**
- Design operations to follow state machine patterns
- Use standardized operation types when possible
- Implement proper validation for custom operations

### 3. **Role Management**
- Follow principle of least privilege
- Use role hierarchies for complex permission structures
- Regularly audit role assignments

### 4. **Time Lock Configuration**
- Set appropriate time locks for different operation types
- Consider emergency override mechanisms
- Document time lock policies

## Conclusion

The Bloxchain Protocol's state machine architecture provides a robust, secure, and flexible foundation for blockchain applications. By centralizing security logic in the `SecureOperationState` engine, Bloxchain ensures consistent, auditable, and efficient security operations across all contract implementations.

The TypeScript SDK provides comprehensive tools for analyzing, validating, and interacting with Bloxchain contracts, making it easy for developers to leverage the full power of the Bloxchain state machine architecture.
