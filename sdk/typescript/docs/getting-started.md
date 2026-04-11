# Getting Started with Bloxchain – Account Pattern

This guide shows the **simplest way** to start using the Bloxchain protocol: by connecting to an **Account‑based contract** that already combines all core components (`SecureOwnable`, `RuntimeRBAC`, `GuardController`) behind a single address.

For a deeper explanation of the pattern itself, see the [Account Pattern doc](./account-pattern.md).

## 📋 **Prerequisites**

- Node.js 18+
- TypeScript 4.5+
- npm or yarn
- Basic knowledge of Ethereum and smart contracts

## 🚀 **Installation**

```bash
npm install @bloxchain/sdk

# Or with yarn
yarn add @bloxchain/sdk
```

## 🔧 **Basic Setup (Account-Based Contract)**

### 1. **Import Required Dependencies**

```typescript
import {
  SecureOwnable,
  RuntimeRBAC,
  GuardController,
} from '@bloxchain/sdk';
import { createPublicClient, createWalletClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
```

### 2. **Initialize Clients**

```typescript
const rpcUrl = process.env.RPC_URL!;           // e.g. https://sepolia.infura.io/v3/...
const privateKey = process.env.PRIVATE_KEY!;   // never hardcode; use env vars

const account = privateKeyToAccount(privateKey);

// Public client for reads
const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(rpcUrl),
});

// Wallet client for writes
const walletClient = createWalletClient({
  account,
  chain: sepolia,
  transport: http(rpcUrl),
});
```

### 3. **Connect to an Account-Based Contract**

Use a deployed Account implementation (for example `AccountBlox`) from `deployed-addresses.json`:

```typescript
// Example shape – adjust to your deployed-addresses.json
import deployed from '../../deployed-addresses.json';

const network = 'sepolia' as const;
const accountAddress = deployed[network].AccountBlox.address as `0x${string}`;

// All three wrappers point to the SAME address
const secureOwnable = new SecureOwnable(publicClient, walletClient, accountAddress, sepolia);
const runtimeRBAC = new RuntimeRBAC(publicClient, walletClient, accountAddress, sepolia);
const guardController = new GuardController(publicClient, walletClient, accountAddress, sepolia);
```

---

## 📖 **Common Tasks with an Account**

### 1. **Inspect Ownership & Security State**

```typescript
// SecureOwnable – core security state
const owner = await secureOwnable.owner();
const broadcasters = await secureOwnable.getBroadcasters();
const recovery = await secureOwnable.getRecovery();
const timeLockPeriod = await secureOwnable.getTimeLockPeriodSec();

console.log({ owner, broadcasters, recovery, timeLockPeriod });

// RuntimeRBAC – roles and permissions
const supportedRoles = await runtimeRBAC.getSupportedRoles();
const firstRole = supportedRoles[0];
const roleInfo = await runtimeRBAC.getRole(firstRole);

console.log('First role info:', roleInfo);
```

### 2. **Perform a Secure Ownership Transfer**

```typescript
// 1) Owner (or recovery) requests a transfer (new owner is encoded in the state machine)
const txRequest = await secureOwnable.transferOwnershipRequest({
  from: account.address,
});

await publicClient.waitForTransactionReceipt({ hash: txRequest.hash });

// 2) After the timelock expires, approve the pending transaction (txId from BaseStateMachine.getPendingTransactions / getTransaction)
const baseStateMachine = new BaseStateMachine(publicClient, walletClient, accountAddress, sepolia);
const pendingTxIds = await baseStateMachine.getPendingTransactions();
const txId = pendingTxIds[0];

const txApprove = await secureOwnable.transferOwnershipDelayedApproval(txId, {
  from: account.address,
});

await publicClient.waitForTransactionReceipt({ hash: txApprove.hash });
```

### 3. **Guarded Call via GuardController**

Use the GuardController wrapper to execute a time‑locked call to a whitelisted target:

```typescript
import { EngineBlox } from '@bloxchain/sdk/lib/EngineBlox';

// Assume target is a whitelisted contract for a registered function selector
const target = '0x...'; // e.g. ERC20 token
const functionSelector = '0xa9059cbb' as `0x${string}`; // transfer(address,uint256)
const params = '0x...' as `0x${string}`; // abi-encoded params

const gasLimit = 300_000n;
const operationType = EngineBlox.NATIVE_TRANSFER_OPERATION; // or custom op type

const txResult = await guardController.executeWithTimeLock(
  target,
  0n,                    // value
  functionSelector,
  params,
  gasLimit,
  operationType,
  { from: account.address },
);

console.log('Requested guarded execution tx hash:', txResult.hash);
```

(Approvals, cancellations, and meta‑tx flows use the same patterns as described in the component‑specific docs.)

---

## Deployment and initialization

Account‑style contracts use OpenZeppelin **Initializable** semantics: there is **no constructor state** on the implementation; a single correct **`initialize(...)`** (or your product’s chained initializer) must run on the **proxy** (or minimal proxy) **before** you rely on ownership, RBAC, or guards.

### **1. Recommended: factory / cloner pattern**

To avoid “forgot to call `initialize`” or wrong ordering when spinning up many instances, prefer a **factory** that creates the proxy and calls `initialize` **in the same transaction**. The repo includes **`CopyBlox`** as a reference pattern (`contracts/examples/applications/CopyBlox/CopyBlox.sol`):

- Validates the implementation implements **`IBaseStateMachine`**.
- **`Clones.clone`** (EIP‑1167) then **`call`s** `initialize(address,address,address,uint256,address)` on the new clone.
- If initialization **reverts**, the whole transaction **reverts**—you do not end up with a live, uninitialized clone from that path.

Use the same **initializer arity and argument order** your concrete contract exposes (often the same five parameters as `CopyBlox` / `BaseStateMachine`).

### **2. Manual proxy deploy checklist**

If you deploy transparent / UUPS proxies by hand, keep an explicit runbook:

1. Deploy **implementation** (never call user‑facing `initialize` on the implementation in production unless you mean to brick or document a pattern—follow OZ guidance).
2. Deploy **proxy** pointing at the implementation; run **`initialize`** exactly **once** on the **proxy** with owner, broadcaster, recovery, timelock, and `eventForwarder`.
3. Smoke‑read on‑chain state (`owner()`, `getRecovery()`, `getTimeLockPeriodSec()`, or your product’s equivalents) before funding or granting roles.

More detail: [Best Practices — Deployment](./best-practices.md) (initializer subsection under Deployment) and [Account Pattern](./account-pattern.md).

---

## 🔒 **Security Basics**

Keep these minimum practices in your integration:

```typescript
// 1) Environment-based secrets
const PRIVATE_KEY = process.env.PRIVATE_KEY;
if (!PRIVATE_KEY) throw new Error('PRIVATE_KEY env var is required');

// 2) Simple address validation
const isAddress = (value: string) => /^0x[a-fA-F0-9]{40}$/.test(value);

// 3) Error handling around writes
try {
  const result = await secureOwnable.transferOwnershipRequest({ from: account.address });
  console.log('Tx hash:', result.hash);
} catch (error) {
  console.error('Tx failed:', error);
}
```

For a full set of recommendations, see [Best Practices](./best-practices.md).

---

## 📚 **Next Steps**

1. Learn more about the [Account Pattern](./account-pattern.md) and how it composes the core components.
2. Explore component‑level docs:
   - [SecureOwnable](./secure-ownable.md)
   - [RuntimeRBAC](./runtime-rbac.md)
   - [GuardController](./guard-controller.md)
3. Dive into architecture:
   - [Bloxchain Architecture](./bloxchain-architecture.md)
   - [State Machine Engine](./state-machine-engine.md)
   - [Core Contract Graph](./core-contract-graph.md)
4. Look at end‑to‑end flows in [Basic Examples](./examples-basic.md).

For detailed API signatures, see the [API Reference](./api-reference.md).

