# Types & Interfaces

Complete reference for all TypeScript types and interfaces used in the Guardian SDK.

## 🎯 **Core Types**

### **Address Types**

```typescript
// Ethereum address type
type Address = `0x${string}`

// Transaction hash type
type Hash = `0x${string}`

// Contract address (branded type for additional safety)
type ContractAddress = Address & { __brand: 'ContractAddress' }

// User address (branded type for additional safety)
type UserAddress = Address & { __brand: 'UserAddress' }
```

### **Definition Types**

```typescript
// Contract definition types
type DefinitionType = 
  | 'SecureOwnable'
  | 'StateAbstraction'
  | 'DynamicRBAC'
  | 'Generic'

// Workflow classification types
type WorkflowType = 
  | 'TIME_DELAY_ONLY'     // Traditional two-phase: REQUEST → APPROVE (both time-delay)
  | 'META_TX_ONLY'        // Single meta-transaction: REQUEST_AND_APPROVE
  | 'HYBRID'              // Mixed patterns: REQUEST (time-delay) → APPROVE (meta-tx) OR both options available
  | 'BROKEN'              // Invalid workflow configuration

// Operation types
type OperationType = 
  | 'OWNERSHIP_TRANSFER'
  | 'BROADCASTER_UPDATE'
  | 'RECOVERY_UPDATE'
  | 'TIMELOCK_UPDATE'
  | 'ROLE_CONFIG_BATCH'
  | 'CUSTOM'

// Transaction actions
type TxAction = 
  | 'EXECUTE_TIME_DELAY_REQUEST'
  | 'EXECUTE_TIME_DELAY_APPROVE'
  | 'EXECUTE_META_REQUEST_AND_APPROVE'
  | 'EXECUTE_META_APPROVE'

// Transaction statuses
type TxStatus = 
  | 'UNDEFINED'
  | 'PENDING'
  | 'COMPLETED'
  | 'CANCELLED'

// Role types
type RoleType = 
  | 'ADMIN'
  | 'MODERATOR'
  | 'USER'
  | 'CUSTOM'
```

## 🔍 **Definitions Types**

### **Definition Contract Types**

```typescript
// Function permission structure
interface FunctionPermission {
  functionSelector: Hex;
  allowedRoles: Hex[];
  requiresSignature: boolean;
  isOffChain: boolean;
}

// Function schema structure
interface FunctionSchema {
  functionName: string;
  functionSelector: Hex;
  operationType: Hex;
  operationName: string;
  supportedActions: TxAction[];
  isProtected: boolean;
}

// Role permission structure containing role hashes and their function permissions
interface RolePermission {
  roleHashes: Hex[];
  functionPermissions: FunctionPermission[];
}

// Single step in a workflow
interface WorkflowStep {
  functionName: string;
  functionSelector: Hex;
  action: TxAction;
  roles: string[];
  description: string;
  isOffChain: boolean;
  phaseType: string;
}

// Complete workflow path
interface WorkflowPath {
  name: string;
  description: string;
  steps: WorkflowStep[];
  workflowType: number; // 0=TIME_DELAY_ONLY, 1=META_TX_ONLY, 2=HYBRID
  estimatedTimeSec: bigint;
  requiresSignature: boolean;
  hasOffChainPhase: boolean;
}

// Complete operation workflow
interface OperationWorkflow {
  operationType: Hex;
  operationName: string;
  paths: WorkflowPath[];
  supportedRoles: string[];
}

// Readable operation type (from StateAbstraction)
interface ReadableOperationType {
  operationType: Hex;
  name: string;
}
```

### **Definitions Interface**

```typescript
// Main interface for Definitions
interface IDefinition {
  getOperationTypes(): Promise<ReadableOperationType[]>;
  getFunctionSchemas(): Promise<FunctionSchema[]>;
  getRolePermissions(): Promise<RolePermission>;
  getOperationWorkflows(): Promise<OperationWorkflow[]>;
  getWorkflowForOperation(operationType: Hex): Promise<OperationWorkflow>;
  getWorkflowPaths(): Promise<WorkflowPath[]>;
}

// Configuration options for Definitions client
interface DefinitionsConfig {
  contractAddress: Address;
  chainId: number;
  rpcUrl?: string;
}

// Transaction options for contract interactions
interface TransactionOptions {
  from: Address;
  gasLimit?: bigint;
  gasPrice?: bigint;
  value?: bigint;
}

// Result of contract method calls
interface ContractResult<T> {
  data: T;
  blockNumber: bigint;
  transactionHash: Hex;
}
```

### **Workflow Type Constants**

```typescript
// Workflow type constants
const WorkflowType = {
  TIME_DELAY_ONLY: 0,
  META_TX_ONLY: 1,
  HYBRID: 2
} as const;

export type WorkflowType = typeof WorkflowType[keyof typeof WorkflowType];

// Phase type constants
const PhaseType = {
  SIGNING: "SIGNING",
  EXECUTION: "EXECUTION"
} as const;

export type PhaseType = typeof PhaseType[keyof typeof PhaseType];
```

### **Definitions Class**

```typescript
// Definitions class implementation
class Definitions implements IDefinition {
  protected client: PublicClient;
  protected walletClient: WalletClient | undefined;
  protected contractAddress: Address;
  protected chain: Chain;
  protected config: DefinitionsConfig;

  constructor(
    client: PublicClient,
    walletClient: WalletClient | undefined,
    contractAddress: Address,
    chain: Chain,
    config?: Partial<DefinitionsConfig>
  );

  // Core methods
  async getOperationTypes(): Promise<ReadableOperationType[]>;
  async getFunctionSchemas(): Promise<FunctionSchema[]>;
  async getRolePermissions(): Promise<RolePermission>;
  async getOperationWorkflows(): Promise<OperationWorkflow[]>;
  async getWorkflowForOperation(operationType: Hex): Promise<OperationWorkflow>;
  async getWorkflowPaths(): Promise<WorkflowPath[]>;

  // Utility methods
  async getOperationTypeByName(operationName: string): Promise<Hex | undefined>;
  async getFunctionSchemaBySelector(functionSelector: Hex): Promise<FunctionSchema | undefined>;
  async hasRolePermission(roleHash: Hex, functionSelector: Hex): Promise<boolean>;
  async getRolesForFunction(functionSelector: Hex): Promise<Hex[]>;

  // Configuration methods
  getConfig(): DefinitionsConfig;
  updateConfig(config: Partial<DefinitionsConfig>): void;
}
```

## 📊 **Contract Analysis Types**

### **ContractAnalysis Interface**

```typescript
interface ContractAnalysis {
  contractAddress: Address
  definitionType: DefinitionType
  operationTypes: OperationTypeDefinition[]
  functionSchemas: FunctionSchemaDefinition[]
  rolePermissions: RolePermissionDefinition[]
  workflows: Workflow[]
  complianceScore: number
  analysisTimestamp: number
}
```

### **OperationTypeDefinition Interface**

```typescript
interface OperationTypeDefinition {
  name: string
  description: string
  supportedActions: TxAction[]
  requiredRoles: string[]
}
```

**Example:**
```typescript
const ownershipTransfer: OperationTypeDefinition = {
  name: 'OWNERSHIP_TRANSFER',
  description: 'Transfer contract ownership to a new address',
  supportedActions: [
    'EXECUTE_TIME_DELAY_REQUEST',
    'EXECUTE_TIME_DELAY_APPROVE',
    'EXECUTE_META_REQUEST_AND_APPROVE'
  ],
  requiredRoles: ['OWNER']
}
```

### **FunctionSchemaDefinition Interface**

```typescript
interface FunctionSchemaDefinition {
  functionName: string
  functionSelector: string
  operationType: OperationType
  operationName: string
  supportedActions: TxAction[]
  isProtected: boolean
  parameters: Parameter[]
}
```

**Example:**
```typescript
const transferOwnershipSchema: FunctionSchemaDefinition = {
  functionName: 'transferOwnershipRequest',
  functionSelector: '0x12345678',
  operationType: 'OWNERSHIP_TRANSFER',
  operationName: 'OWNERSHIP_TRANSFER',
  supportedActions: ['EXECUTE_TIME_DELAY_REQUEST'],
  isProtected: true,
  parameters: [
    {
      name: 'newOwner',
      type: 'address',
      indexed: false
    }
  ]
}
```

### **RolePermissionDefinition Interface**

```typescript
interface RolePermissionDefinition {
  roleHash: string
  functionSelector: string
  grantedActions: TxAction[]
  conditions: string[]
}
```

**Example:**
```typescript
const adminPermission: RolePermissionDefinition = {
  roleHash: '0x...',
  functionSelector: '0x12345678',
  grantedActions: [
    'EXECUTE_TIME_DELAY_REQUEST',
    'EXECUTE_TIME_DELAY_APPROVE'
  ],
  conditions: ['onlyOwner']
}
```

## 🔄 **Workflow Types**

### **Workflow Interface**

```typescript
interface Workflow {
  id: string
  name: string
  type: WorkflowType
  isValid: boolean
  validationErrors: string[]
  operations: Operation[]
  stateTransitions: StateTransition[]
  description: string
}
```

**Example:**
```typescript
const ownershipWorkflow: Workflow = {
  id: 'ownership-transfer-1',
  name: 'Ownership Transfer Workflow',
  type: 'HYBRID',
  isValid: true,
  validationErrors: [],
  operations: [
    {
      type: 'OWNERSHIP_TRANSFER',
      name: 'Transfer Ownership',
      description: 'Transfer contract ownership',
      functions: [transferOwnershipSchema],
      roles: [adminPermission],
      requiredActions: ['EXECUTE_TIME_DELAY_REQUEST', 'EXECUTE_TIME_DELAY_APPROVE'],
      status: 'UNDEFINED'
    }
  ],
  stateTransitions: [
    {
      from: 'UNDEFINED',
      to: 'PENDING',
      conditions: ['hasPermission'],
      requiredActions: ['EXECUTE_TIME_DELAY_REQUEST']
    },
    {
      from: 'PENDING',
      to: 'COMPLETED',
      conditions: ['timeLockExpired'],
      requiredActions: ['EXECUTE_TIME_DELAY_APPROVE']
    }
  ],
  description: 'Two-phase ownership transfer with time lock'
}
```

### **Operation Interface**

```typescript
interface Operation {
  type: OperationType
  name: string
  description: string
  functions: FunctionSchema[]
  roles: RolePermission[]
  requiredActions: TxAction[]
  status: TxStatus
}
```

### **StateTransition Interface**

```typescript
interface StateTransition {
  from: TxStatus
  to: TxStatus
  conditions: string[]
  requiredActions: TxAction[]
}
```

### **FunctionSchema Interface**

```typescript
interface FunctionSchema {
  name: string
  selector: string
  inputs: Parameter[]
  outputs: Parameter[]
}
```

### **RolePermission Interface**

```typescript
interface RolePermission {
  roleName: string
  roleHash: string
  permissions: string[]
}
```

### **Parameter Interface**

```typescript
interface Parameter {
  name: string
  type: string
  indexed?: boolean
}
```

## ✅ **Validation Types**

### **ValidationResult Interface**

```typescript
interface ValidationResult {
  isValid: boolean
  score: number
  errors: string[]
  warnings: string[]
}
```

**Example:**
```typescript
const validationResult: ValidationResult = {
  isValid: true,
  score: 95,
  errors: [],
  warnings: ['Consider adding more validation checks']
}
```

### **ComplianceResult Interface**

```typescript
interface ComplianceResult {
  isCompliant: boolean
  score: number
  violations: ComplianceViolation[]
  recommendations: string[]
}
```

**Example:**
```typescript
const complianceResult: ComplianceResult = {
  isCompliant: true,
  score: 92,
  violations: [],
  recommendations: [
    'Consider implementing additional security checks',
    'Add more comprehensive error handling'
  ]
}
```

### **ComplianceViolation Interface**

```typescript
interface ComplianceViolation {
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
  description: string
  recommendation: string
  code: string
}
```

**Example:**
```typescript
const violation: ComplianceViolation = {
  severity: 'MEDIUM',
  description: 'Missing input validation for address parameters',
  recommendation: 'Add address validation before processing transactions',
  code: 'MISSING_VALIDATION'
}
```

## 📈 **Statistics Types**

### **WorkflowStatistics Interface**

```typescript
interface WorkflowStatistics {
  totalWorkflows: number
  validWorkflows: number
  brokenWorkflows: number
  totalOperations: number
  totalStateTransitions: number
  averageOperationsPerWorkflow: number
  averageStateTransitionsPerWorkflow: number
  workflowTypes: Record<WorkflowType, number>
}
```

**Example:**
```typescript
const stats: WorkflowStatistics = {
  totalWorkflows: 10,
  validWorkflows: 8,
  brokenWorkflows: 2,
  totalOperations: 25,
  totalStateTransitions: 30,
  averageOperationsPerWorkflow: 2.5,
  averageStateTransitionsPerWorkflow: 3.0,
  workflowTypes: {
    'TIME_DELAY_ONLY': 4,
    'META_TX_ONLY': 3,
    'HYBRID': 1,
    'BROKEN': 2
  }
}
```

## 🔧 **Transaction Types**

### **TransactionOptions Interface**

```typescript
interface TransactionOptions {
  from?: Address
  value?: bigint
  gas?: bigint
  gasPrice?: bigint
  maxFeePerGas?: bigint
  maxPriorityFeePerGas?: bigint
  nonce?: number
}
```

**Example:**
```typescript
const txOptions: TransactionOptions = {
  from: '0x...',
  gas: 200000n,
  maxFeePerGas: 20000000000n, // 20 gwei
  maxPriorityFeePerGas: 2000000000n // 2 gwei
}
```

### **ExecutionParams Interface**

```typescript
interface ExecutionParams {
  contractAddress: Address
  functionName: string
  args: any[]
  options?: TransactionOptions
}
```

### **MetaTransactionData Interface**

```typescript
interface MetaTransactionData {
  from: Address
  to: Address
  value: bigint
  gas: bigint
  nonce: number
  data: string
  signature: string
}
```

### **ExecutionResult Interface**

```typescript
interface ExecutionResult {
  success: boolean
  txHash?: Hash
  error?: string
  gasUsed?: bigint
  blockNumber?: bigint
}
```

## 🧪 **Testing Types**

### **TestResult Interface**

```typescript
interface TestResult {
  name: string
  passed: boolean
  duration: number
  error?: string
  data?: any
}
```

### **FuzzResult Interface**

```typescript
interface FuzzResult {
  input: any
  output: any
  error?: string
  gasUsed?: bigint
}
```

### **EdgeCaseResult Interface**

```typescript
interface EdgeCaseResult {
  case: string
  input: any
  expected: any
  actual: any
  passed: boolean
}
```

### **BoundaryResult Interface**

```typescript
interface BoundaryResult {
  boundary: string
  value: any
  behavior: 'PASS' | 'FAIL' | 'ERROR'
  message: string
}
```

## 🚨 **Error Types**

### **GuardianError Class**

```typescript
class GuardianError extends Error {
  code: string
  details?: any

  constructor(message: string, code: string, details?: any) {
    super(message)
    this.name = 'GuardianError'
    this.code = code
    this.details = details
  }
}
```

### **ContractError Class**

```typescript
class ContractError extends GuardianError {
  contractAddress: Address
  method: string

  constructor(
    message: string,
    contractAddress: Address,
    method: string,
    details?: any
  ) {
    super(message, 'CONTRACT_ERROR', details)
    this.name = 'ContractError'
    this.contractAddress = contractAddress
    this.method = method
  }
}
```

### **ValidationError Class**

```typescript
class ValidationError extends GuardianError {
  field: string
  value: any

  constructor(field: string, value: any, message: string) {
    super(message, 'VALIDATION_ERROR', { field, value })
    this.name = 'ValidationError'
    this.field = field
    this.value = value
  }
}
```

### **ComplianceError Class**

```typescript
class ComplianceError extends GuardianError {
  violation: ComplianceViolation

  constructor(violation: ComplianceViolation) {
    super(
      violation.description,
      'COMPLIANCE_ERROR',
      violation
    )
    this.name = 'ComplianceError'
    this.violation = violation
  }
}
```

## 🎯 **Utility Types**

### **Branded Types**

```typescript
// Create branded types for additional type safety
type Brand<T, B> = T & { __brand: B }

type ContractAddress = Brand<Address, 'ContractAddress'>
type UserAddress = Brand<Address, 'UserAddress'>
type RoleHash = Brand<string, 'RoleHash'>
type FunctionSelector = Brand<string, 'FunctionSelector'>
```

### **Conditional Types**

```typescript
// Conditional types for better type inference
type IsAddress<T> = T extends Address ? true : false
type IsWorkflowType<T> = T extends WorkflowType ? true : false
type IsOperationType<T> = T extends OperationType ? true : false
```

### **Mapped Types**

```typescript
// Mapped types for transforming interfaces
type PartialWorkflow = Partial<Workflow>
type RequiredWorkflow = Required<Workflow>
type WorkflowKeys = keyof Workflow
type WorkflowValues = Workflow[keyof Workflow]
```

### **Template Literal Types**

```typescript
// Template literal types for string manipulation
type EventName<T extends string> = `${T}Event`
type FunctionName<T extends string> = `${T}Function`
type ErrorCode<T extends string> = `ERROR_${T}`
```

## 📝 **Type Guards**

### **Type Guard Functions**

```typescript
// Type guard functions for runtime type checking
function isAddress(value: unknown): value is Address {
  return typeof value === 'string' && /^0x[a-fA-F0-9]{40}$/.test(value)
}

function isWorkflowType(value: unknown): value is WorkflowType {
  return typeof value === 'string' && [
    'TIME_DELAY_ONLY',
    'META_TX_ONLY',
    'HYBRID',
    'BROKEN'
  ].includes(value)
}

function isOperationType(value: unknown): value is OperationType {
  return typeof value === 'string' && [
    'OWNERSHIP_TRANSFER',
    'BROADCASTER_UPDATE',
    'RECOVERY_UPDATE',
    'TIMELOCK_UPDATE',
    'ROLE_CONFIG_BATCH',
    'CUSTOM'
  ].includes(value)
}

function isTxAction(value: unknown): value is TxAction {
  return typeof value === 'string' && [
    'EXECUTE_TIME_DELAY_REQUEST',
    'EXECUTE_TIME_DELAY_APPROVE',
    'EXECUTE_META_REQUEST_AND_APPROVE',
    'EXECUTE_META_APPROVE'
  ].includes(value)
}

function isTxStatus(value: unknown): value is TxStatus {
  return typeof value === 'string' && [
    'UNDEFINED',
    'PENDING',
    'COMPLETED',
    'CANCELLED'
  ].includes(value)
}
```

## 🔄 **Type Conversion Utilities**

### **Conversion Functions**

```typescript
// Utility functions for type conversions
function toAddress(value: string): Address {
  if (!isAddress(value)) {
    throw new Error(`Invalid address: ${value}`)
  }
  return value as Address
}

function toHash(value: string): Hash {
  if (!/^0x[a-fA-F0-9]{64}$/.test(value)) {
    throw new Error(`Invalid hash: ${value}`)
  }
  return value as Hash
}

function toContractAddress(value: string): ContractAddress {
  return toAddress(value) as ContractAddress
}

function toUserAddress(value: string): UserAddress {
  return toAddress(value) as UserAddress
}
```

## 📚 **Usage Examples**

### **Type-Safe Contract Interaction**

```typescript
import { Address, ContractAddress, UserAddress } from '@guardian/sdk/typescript'

function transferOwnership(
  contract: ContractAddress,
  newOwner: UserAddress
): Promise<Hash> {
  // Type system prevents mixing contract and user addresses
  return secureOwnable.transferOwnershipRequest(newOwner)
}

// Usage
const contractAddr = toContractAddress('0x...')
const userAddr = toUserAddress('0x...')
const txHash = await transferOwnership(contractAddr, userAddr)
```

### **Workflow Type Safety**

```typescript
import { Workflow, WorkflowType } from '@guardian/sdk/typescript'

function processWorkflow(workflow: Workflow): void {
  switch (workflow.type) {
    case 'TIME_DELAY_ONLY':
      console.log('Processing time-delay workflow')
      break
    case 'META_TX_ONLY':
      console.log('Processing meta-transaction workflow')
      break
    case 'HYBRID':
      console.log('Processing hybrid workflow')
      break
    case 'BROKEN':
      console.log('Workflow is broken:', workflow.validationErrors)
      break
    default:
      // TypeScript will catch this at compile time
      const _exhaustive: never = workflow.type
  }
}
```

### **Error Handling with Types**

```typescript
import { GuardianError, ContractError, ValidationError } from '@guardian/sdk/typescript'

function handleError(error: unknown): void {
  if (error instanceof ContractError) {
    console.error('Contract error:', {
      contract: error.contractAddress,
      method: error.method,
      message: error.message
    })
  } else if (error instanceof ValidationError) {
    console.error('Validation error:', {
      field: error.field,
      value: error.value,
      message: error.message
    })
  } else if (error instanceof GuardianError) {
    console.error('Guardian error:', {
      code: error.code,
      message: error.message,
      details: error.details
    })
  } else {
    console.error('Unknown error:', error)
  }
}
```

---

**Need more details?** Check out the [API Reference](./api-reference.md) for complete method documentation.
