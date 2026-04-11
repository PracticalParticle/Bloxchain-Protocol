# GuardController Contract Integration

The `GuardController` class provides type-safe access to Bloxchain GuardController contracts for execution control, target whitelisting, and function schema management.

## 🎯 **Overview**

GuardController extends BaseStateMachine with execution control features:
- **Generic contract delegation** with full EngineBlox workflows
- **Target whitelist management** via batch configuration
- **Function schema registration** for runtime function management
- **Time-locked execution** with approval workflows
- **Meta-transaction support** for all operations
- **Native token transfer** support

## 🚀 **Quick Start**

```typescript
import { GuardController } from '@bloxchain/sdk/typescript'
import { createPublicClient, createWalletClient, http } from 'viem'
import { mainnet } from 'viem/chains'

// Initialize clients
const publicClient = createPublicClient({
  chain: mainnet,
  transport: http()
})

const walletClient = createWalletClient({
  account: privateKeyToAccount('0x...'),
  chain: mainnet,
  transport: http()
})

// Create GuardController instance
const guardController = new GuardController(
  publicClient,
  walletClient,
  '0x...', // contract address
  mainnet
)
```

## 📖 **Core Features**

### **1. Execution Functions**

#### **Request Time-Locked Execution**
```typescript
const txHash = await guardController.executeWithTimeLock(
  targetAddress,
  0n, // value (recommended default for standard function calls)
  '0xa9059cbb', // function selector (transfer)
  executionParams, // encoded params
  500000n, // gas limit
  operationType,
  { from: ownerAddress }
)
```

#### **Approve Time-Locked Transaction**
```typescript
const txHash = await guardController.approveTimeLockExecution(
  txId,
  { from: approverAddress }
)
```

#### **Request and Approve in One Step (Meta-Transaction)**
```typescript
const txHash = await guardController.requestAndApproveExecution(
  metaTx,
  { from: broadcasterAddress }
)
```

### **2. Guard Configuration Batch**

GuardController uses batch configuration for whitelist management and function schema registration.

#### **Guard Configuration Actions**

```typescript
import { GuardConfigActionType } from '@bloxchain/sdk/typescript'

enum GuardConfigActionType {
  ADD_TARGET_TO_WHITELIST,
  REMOVE_TARGET_FROM_WHITELIST,
  REGISTER_FUNCTION,
  UNREGISTER_FUNCTION
}
```

#### **Register Function Schema**

```typescript
import { encodeAbiParameters } from 'viem'
import {
  GuardConfigActionType,
  TxAction,
  guardConfigBatchExecutionParams,
  GUARD_CONTROLLER_FUNCTION_SELECTORS,
  GUARD_CONTROLLER_OPERATION_TYPES
} from '@bloxchain/sdk/typescript'

const registerAction = {
  actionType: GuardConfigActionType.REGISTER_FUNCTION,
  data: encodeAbiParameters(
    ['string', 'string', 'uint8[]'],
    [
      'transfer(address,uint256)', // function signature
      'TOKEN_TRANSFER', // operation name
      [
        TxAction.EXECUTE_TIME_DELAY_REQUEST,
        TxAction.EXECUTE_TIME_DELAY_APPROVE,
        TxAction.EXECUTE_META_REQUEST_AND_APPROVE
      ]
    ]
  )
}

// Create execution params (call deployed GuardControllerDefinitions contract; use address from deployed-addresses.json for your chain)
const guardControllerDefinitionsAddress = '0x...' // e.g. deployedAddresses.sepolia.GuardControllerDefinitions.address
const executionParams = await guardConfigBatchExecutionParams(publicClient, guardControllerDefinitionsAddress, [registerAction])

// Create meta-transaction
const metaTxParams = await guardController.createMetaTxParams(
  contractAddress,
  GUARD_CONTROLLER_FUNCTION_SELECTORS.GUARD_CONFIG_BATCH_META_SELECTOR,
  TxAction.SIGN_META_REQUEST_AND_APPROVE,
  3600n, // 1 hour deadline
  0n, // no max gas price
  ownerAddress
)

const metaTx = await guardController.generateUnsignedMetaTransactionForNew(
  ownerAddress,
  contractAddress,
  0n, // value
  1000000n, // gas limit
  GUARD_CONTROLLER_OPERATION_TYPES.CONTROLLER_CONFIG_OPERATION,
  GUARD_CONTROLLER_FUNCTION_SELECTORS.GUARD_CONFIG_BATCH_EXECUTE_SELECTOR,
  executionParams,
  metaTxParams
)

// Sign meta-transaction
const signature = await walletClient.signMessage({
  message: { raw: metaTx.message },
  account: ownerAddress
})

// Execute via broadcaster
const txHash = await guardController.guardConfigBatchRequestAndApprove(
  { ...metaTx, signature },
  { from: broadcasterAddress }
)
```

#### **Add Target to Whitelist**

```typescript
const addWhitelistAction = {
  actionType: GuardConfigActionType.ADD_TARGET_TO_WHITELIST,
  data: encodeAbiParameters(
    ['bytes4', 'address'],
    [
      '0xa9059cbb', // function selector (transfer)
      targetContractAddress // whitelisted target
    ]
  )
}

// Create and execute batch (similar to register function example)
```

#### **Batch Multiple Operations**

```typescript
const actions = [
  // Register function
  {
    actionType: GuardConfigActionType.REGISTER_FUNCTION,
    data: encodeAbiParameters(
      ['string', 'string', 'uint8[]'],
      ['transfer(address,uint256)', 'TOKEN_TRANSFER', [6]]
    )
  },
  // Add target to whitelist
  {
    actionType: GuardConfigActionType.ADD_TARGET_TO_WHITELIST,
    data: encodeAbiParameters(
      ['bytes4', 'address'],
      ['0xa9059cbb', targetAddress]
    )
  }
]

// Execute batch atomically (publicClient and definitionAddress from your setup; see Quick Start)
const executionParams = await guardConfigBatchExecutionParams(publicClient, guardControllerDefinitionsAddress, actions)
// ... create and execute meta-transaction
```

### **3. Whitelist Management**

#### **Get Function Whitelist Targets**
```typescript
const targets = await guardController.getFunctionWhitelistTargets('0xa9059cbb') // function selector
console.log('Whitelisted targets:', targets)
```

**Note**: The whitelist is per-function-selector. Multiple functions can have different whitelists.

**Pending transactions and delisting:** The core engine re-validates the stored execution target against the whitelist when **cancelling** or **completing** a pending tx. If you **`REMOVE_TARGET_FROM_WHITELIST`** while matching txs are still **PENDING**, cancel and finalize paths revert until that target is whitelisted again. **Operational mitigation:** (1) clear or cancel pendings **before** delisting, or (2) temporarily **`ADD_TARGET_TO_WHITELIST`** the same target, cancel or run the approve/execute path to completion, then remove the target again.

**Pending transactions and `UNREGISTER_FUNCTION`:** Unregistering removes the execution selector from the supported-function set. Pending txs that still reference that selector then fail **`_validateTargetWhitelist`** with **`ResourceNotFound`** on cancel/complete until the function is **registered again** (`registerFunction`) and whitelist policy is restored as needed. Prefer **no pending txs** for that selector before unregister, or use **re-register → cancel/complete → unregister**.

### **4. Function Schema Management**

Function schema registration is now handled by GuardController (moved from RuntimeRBAC).

#### **Get Function Schema**
```typescript
const schema = await guardController.getFunctionSchema('0xa9059cbb')
// Reverts if the function is not registered. Check supported functions via getSupportedFunctions() if needed.
console.log('Function schema:', { ...schema })
```
```typescript
const schema = await guardController.getFunctionSchema('0xa9059cbb')
console.log('Function schema:', {
  signature: schema.functionSignature,
  functionSelector: schema.functionSelector,
  operationType: schema.operationType,
  operationName: schema.operationName,
  supportedActionsBitmap: schema.supportedActionsBitmap,
  isProtected: schema.isProtected,
  handlerForSelectors: schema.handlerForSelectors
})
// To get supported actions as an array, use EngineBlox.convertBitmapToActions(schema.supportedActionsBitmap)
```

## 🔄 **Complete Workflow Example**

### **Setup: Register Function and Whitelist Target**

```typescript
// Step 1: Register function schema via GuardController
const registerAction = {
  actionType: GuardConfigActionType.REGISTER_FUNCTION,
  data: encodeAbiParameters(
    ['string', 'string', 'uint8[]'],
    ['transfer(address,uint256)', 'TOKEN_TRANSFER', [6]] // EXECUTE_META_REQUEST_AND_APPROVE
  )
}

// Step 2: Whitelist target contract
const whitelistAction = {
  actionType: GuardConfigActionType.ADD_TARGET_TO_WHITELIST,
  data: encodeAbiParameters(
    ['bytes4', 'address'],
    ['0xa9059cbb', tokenContractAddress]
  )
}

// Execute batch
const actions = [registerAction, whitelistAction]
// ... create and execute meta-transaction as shown above
```

### **Execute: Call Whitelisted Function**

```typescript
// After function is registered and target is whitelisted, execute via GuardController
const transferParams = encodeAbiParameters(
  ['address', 'uint256'],
  [recipientAddress, amount]
)

// Option 1: Request and approve in one step (meta-transaction)
const metaTx = await guardController.generateUnsignedMetaTransactionForNew(
  signerAddress,
  tokenContractAddress, // target
  0n, // value
  200000n, // gas limit
  keccak256('TOKEN_TRANSFER'), // operation type
  '0xa9059cbb', // transfer selector
  transferParams,
  metaTxParams
)

const signature = await walletClient.signMessage({
  message: { raw: metaTx.message },
  account: signerAddress
})

const txHash = await guardController.requestAndApproveExecution(
  { ...metaTx, signature },
  { from: broadcasterAddress }
)
```

## 📡 **Event Monitoring**

### **Listen for Guard Configuration Events**

Contracts emit **`ComponentEvent(bytes4 functionSelector, bytes data)`**. For guard config, filter by the executeGuardConfigBatch selector and decode `data` as `(GuardConfigActionType, bytes4 functionSelector, address target)`. See [contract API](../../docs/).

```typescript
const unwatch = publicClient.watchContractEvent({
  address: contractAddress,
  abi: guardController.abi,
  eventName: 'ComponentEvent',
  onLogs: (logs) => {
    logs.forEach(log => {
      if (log.args.functionSelector === executeGuardConfigBatchSelector) {
        const decoded = decodeAbiParameters(/* ... */, log.args.data)
        console.log('Guard config:', decoded)
      }
    })
  }
})
unwatch()
```

## 🛡️ **Security Features**

### **1. Whitelist Validation**

For **external** contract targets, the address must be on the per-function-selector whitelist (unless the engine rule below applies):

```typescript
const targets = await guardController.getFunctionWhitelistTargets(functionSelector)
if (!targets.includes(targetAddress)) {
  throw new Error('Target not whitelisted for this function')
}
```

**`target == address(this)` (engine vs `GuardController`):**

- **`EngineBlox._validateTargetWhitelist`:** Once the **execution selector** is registered, **`TxParams.target == address(this)`** is **always allowed** and **does not** require `address(this)` to appear in `functionTargetWhitelist[executionSelector]`. That supports **internal / composed** execution (macros, vault logic on the same contract) without bloating every whitelist with the state machine’s own address. **RBAC** (who may request/approve/execute) still applies; the whitelist is not the only control plane.
- **Attached payouts:** Recipient and ERC20 token contracts are still validated under **`ATTACHED_PAYMENT_RECIPIENT_SELECTOR`** / **`ERC20_TRANSFER_SELECTOR`** when amounts are non-zero.
- **`GuardController` public entrypoints:** In addition to the engine, **`_validateNotInternalFunction`** blocks **`target == address(this)`** unless the **execution selector** is an allowed **system macro** selector (e.g. native transfer–class flows). So arbitrary “call any internal selector on self” is **not** exposed through the standard `GuardController` execute paths, while the engine’s whitelist rule remains as documented above for other integrations.

**Attached payments (`executeWithPayment`):** payout policy uses two extra whitelist keys (registered when GuardController definitions load—same `ADD_TARGET_TO_WHITELIST` batch flow). Base-only state machines that use attached payments without GuardController must register these schemas separately (see `PaymentTestHelper` in tests). The core engine reverts (`ResourceNotFound`) if whitelist validation runs for a selector that is not yet in the supported-function set—there is no silent skip.

| Selector (see `EngineBlox` SDK / Solidity) | What to whitelist |
|---------------------------------------------|-------------------|
| `ATTACHED_PAYMENT_RECIPIENT_SELECTOR` | `payment.recipient` for native and ERC20 attached payouts |
| `ERC20_TRANSFER_SELECTOR` (`transfer(address,uint256)`) | `payment.erc20TokenAddress` — token contracts the vault may pay out via `safeTransfer` |

**ERC20 token model (attached payouts):** The engine transfers the **nominal** `erc20TokenAmount` via `safeTransfer` and does **not** verify recipient **credits** against balance deltas. **Fee-on-transfer, deflationary, rebasing, or otherwise non-standard ERC20 tokens are not supported** for attached payments—use conventional tokens only, or you risk accounting mismatch and disputes.

Primary execution still uses `TxParams.target` whitelisted under the **execution** function selector (e.g. mint, `NATIVE_TRANSFER_SELECTOR`).

### **2. Function Schema Protection**

Protected function schemas cannot be unregistered:

```typescript
const schema = await guardController.getFunctionSchema(functionSelector)
if (schema.isProtected) {
  console.log('This function schema is protected')
}
// schema is the full FunctionSchema (functionSignature, functionSelector, operationType, operationName, supportedActionsBitmap, isProtected, handlerForSelectors)
```

### **3. Role-Based Permissions**

Combine with RuntimeRBAC for role-based access control:

```typescript
import { RuntimeRBAC } from '@bloxchain/sdk/typescript'

const runtimeRBAC = new RuntimeRBAC(publicClient, walletClient, rbacAddress, mainnet)

// Check if account has permission to execute
const hasPermission = await runtimeRBAC.hasActionPermission(
  accountAddress,
  functionSelector,
  TxAction.EXECUTE_META_REQUEST_AND_APPROVE
)

if (!hasPermission) {
  throw new Error('Account does not have permission')
}
```

## 🔧 **Advanced Usage**

### **Native Token Transfers**

GuardController supports native token (ETH) transfers:

```typescript
// Use special selector for native transfers
const NATIVE_TRANSFER_SELECTOR = '0x58e2cfdb' // __bloxchain_native_transfer__

const metaTx = await guardController.generateUnsignedMetaTransactionForNew(
  signerAddress,
  recipientAddress,
  ethAmount, // value to send
  100000n, // gas limit
  GUARD_CONTROLLER_OPERATION_TYPES.NATIVE_TRANSFER,
  NATIVE_TRANSFER_SELECTOR,
  '0x', // empty params for native transfer
  metaTxParams
)

// Sign and execute
```

> Design note: `NATIVE_TRANSFER_SELECTOR` is a convenience path for ETH-only transfers (empty params).
> Non-native selectors may still intentionally forward ETH to payable targets for edge-case workflows; default practice is to keep `value = 0` for standard function calls.

### **Time-Locked Operations**

For operations requiring additional security:

```typescript
// Step 1: Request time-locked execution
const txHash = await guardController.executeWithTimeLock(
  targetAddress,
  value,
  functionSelector,
  params,
  gasLimit,
  operationType,
  { from: requesterAddress }
)

// Extract transaction ID from receipt
const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash })
const txId = extractTxIdFromReceipt(receipt)

// Step 2: Wait for timelock period to expire
// ... wait ...

// Step 3: Approve execution
await guardController.approveTimeLockExecution(
  txId,
  { from: approverAddress }
)
```

## 🧪 **Testing**

### **Unit Testing**

```typescript
import { describe, it, expect } from 'vitest'

describe('GuardController', () => {
  it('should return whitelisted targets', async () => {
    const targets = await guardController.getFunctionWhitelistTargets(functionSelector)
    expect(Array.isArray(targets)).toBe(true)
  })

  it('should check function schema', async () => {
    const schema = await guardController.getFunctionSchema(functionSelector)
    expect(schema).toBeDefined()
  })
})
```

### **Integration Testing**

```typescript
describe('GuardController Integration', () => {
  it('should complete full execution workflow', async () => {
    // Register function
    const registerAction = {
      actionType: GuardConfigActionType.REGISTER_FUNCTION,
      data: encodeAbiParameters(/* ... */)
    }

    await guardController.guardConfigBatchRequestAndApprove(metaTx, { from: broadcaster })

    // Verify function registered
    const schema = await guardController.getFunctionSchema(functionSelector)
    expect(schema.functionSelector).toBe(functionSelector)

    // Add target to whitelist
    const whitelistAction = {
      actionType: GuardConfigActionType.ADD_TARGET_TO_WHITELIST,
      data: encodeAbiParameters(/* ... */)
    }

    await guardController.guardConfigBatchRequestAndApprove(metaTx, { from: broadcaster })

    // Execute function
    const txHash = await guardController.requestAndApproveExecution(executionMetaTx, { from: broadcaster })
    expect(txHash).toBeTruthy()
  })
})
```

## 🚨 **Common Issues**

### **Issue: "Target not whitelisted"**
**Solution**: Add the target to the whitelist using `ADD_TARGET_TO_WHITELIST` action in a guard config batch.

### **Issue: "Function schema not found"**
**Solution**: Register the function schema using `REGISTER_FUNCTION` action via GuardController (not RuntimeRBAC).

### **Issue: "Transaction execution failed"**
**Solution**: Ensure:
1. Function schema is registered
2. Target is whitelisted for the function
3. Caller has appropriate role permissions (via RuntimeRBAC)
4. Gas limit is sufficient (a `gasLimit` of **0** in `TxParams` means "forward all remaining gas" — equivalent to `gasleft()`. Set a positive value for a strict upper bound.)

### **Issue: "Handler selector mismatch"**
**Solution**: Ensure the function selector in the execution params matches the registered function schema.

### **Issue: OWNER cannot call `executeWithPayment`**
**Solution**: Default `GuardControllerDefinitions` registers the **schema** for `executeWithPayment` (`EXECUTE_WITH_PAYMENT_SELECTOR` in `contracts/core/execution/lib/definitions/GuardControllerDefinitions.sol`) but intentionally **does not** grant an `OWNER_ROLE` `FunctionPermission` for it—the permission surface is kept minimal out of the box.

**You cannot fix this with guard-config:** `getGuardConfigActionSpecs()` / `GuardConfigActionType` only cover whitelist add/remove, `REGISTER_FUNCTION`, and `UNREGISTER_FUNCTION`—there is no guard-config action to attach a selector to a role.

**Add the grant via RBAC (role-config) after init:** use `roleConfigBatchRequestAndApprove` → `executeRoleConfigBatch` with `RoleConfigActionType.ADD_FUNCTION_TO_ROLE`, following the encoders and **batch ordering constraints** in `contracts/core/access/lib/definitions/RuntimeRBACDefinitions.sol`, and satisfy **schema / handler rules** from `GuardControllerDefinitions.sol` (e.g. `handlerForSelectors` for `executeWithPayment` must match what `addFunctionToRole` enforces against that schema).

### **Issue: `NATIVE_TRANSFER_SELECTOR` not found / native ETH flows revert**
**Solution**: `GuardControllerDefinitions` already registers the `NATIVE_TRANSFER_SELECTOR` pseudo-schema (plus `ATTACHED_PAYMENT_RECIPIENT_SELECTOR` and `ERC20_TRANSFER_SELECTOR`). If your contract inherits from a **base-only** state machine **without** loading `GuardControllerDefinitions`, you must register these schemas manually via a guard-config or definition bundle.

### **Issue: Unregistered function still has whitelist entries / hooks**
**Solution**: `EngineBlox.unregisterFunction` removes the schema and supported-function membership but does **not** sweep `functionTargetWhitelist` or `functionTargetHooks` for that selector. Stale rows are inert while the selector is absent (whitelist checks revert `ResourceNotFound`), but they **reappear** if the selector is re-registered. Clear them explicitly with `REMOVE_TARGET_FROM_WHITELIST` / `clearHook` before or after unregistering.

### **Issue: Payment failure rolls back the entire execution**
**Solution**: This is **intentional all-or-nothing** atomicity. If the main call succeeds but `executeAttachedPayment` reverts (e.g. insufficient balance, whitelist mismatch), the whole approval/execute transaction reverts including the main effect. Ensure payment prerequisites (balance, whitelist) are met before submitting.

## 📚 **Related Documentation**

- [RuntimeRBAC Guide](./runtime-rbac.md) - Role and permission management
- [API Reference](./api-reference.md) - Complete API documentation
- [State Machine Engine](./state-machine-engine.md) - State machine architecture
- [Best Practices](./best-practices.md) - Development guidelines

---
