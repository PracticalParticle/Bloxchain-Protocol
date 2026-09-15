## Account Pattern – Composing Core Components

The `Account` pattern (`contracts/core/pattern/Account.sol`) is the **easiest way to start with the Bloxchain protocol**. It combines all core security components into a single upgrade‑safe contract:

- `SecureOwnable` – owner / broadcaster / recovery roles and secure ownership flows  
- `RuntimeRBAC` – dynamic roles and function permissions  
- `GuardController` – time‑locked, meta‑tx‑aware execution with target whitelists  

```12:75:contracts/core/pattern/Account.sol
abstract contract Account is GuardController, RuntimeRBAC, SecureOwnable {
    // initialize(...) wires all three components
    // supportsInterface(...) joins all component interfaces
    // receive() accepts ETH, fallback() rejects unsupported calls
}
```

Concrete implementations (for example `AccountBlox`) inherit from `Account` and add application‑specific logic while reusing the shared state machine and security model.

---

## On‑Chain Responsibilities

- **Initialization**
  - Single `initialize(initialOwner, broadcaster, recovery, timeLockPeriodSec, eventForwarder)` call that:
    - Initializes the shared `SecureOperationState` via each component.
    - Loads definition libraries for:
      - Secure ownership operations (`SecureOwnableDefinitions`)
      - Runtime role configuration (`RuntimeRBACDefinitions`)
      - Guarded execution and whitelists (`GuardControllerDefinitions`)
  - **Operational recommendation:** For many deployed instances, use a **factory / cloner** that deploys the proxy (or minimal proxy) and invokes `initialize` in the **same transaction** so initialization cannot be skipped by mistake. Reference implementation: **`CopyBlox`** (`contracts/examples/applications/CopyBlox/CopyBlox.sol`) — validates `IBaseStateMachine`, clones, calls `initialize`, reverts on failure. Manual transparent/UUPS deploys should follow an explicit runbook; see [Getting Started — Deployment and initialization](./getting-started.md#deployment-and-initialization).

- **Security Model**
  - Protected roles (`OWNER_ROLE`, `BROADCASTER_ROLE`, `RECOVERY_ROLE`) are controlled only by `SecureOwnable`.
  - Non‑protected roles and function permissions are configured via `RuntimeRBAC` role config batches.
  - Execution of arbitrary calls (including ERC‑20, application contracts, etc.) is mediated by `GuardController`:
    - Time‑locked request / approve / cancel flows.
    - Meta‑transaction based approvals (owner signs, broadcaster executes).
    - Strict per‑function **target whitelists**.

- **ETH Handling**
  - `receive()` accepts plain ETH and emits `EthReceived(sender, value)`.
  - `fallback()` always reverts – all non‑ETH‑transfer calls must go through known selectors coordinated by the state machine.

---

## SDK View of an Account

From the SDK’s perspective, an Account is **one contract address** that simultaneously exposes all three component interfaces.

You typically create three wrappers pointing to the same address:

```typescript
import {
  SecureOwnable,
  RuntimeRBAC,
  GuardController,
} from '@bloxchain/sdk';
import { createPublicClient, createWalletClient, http } from 'viem';
import { sepolia } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';

// 1) Create clients
const rpcUrl = process.env.RPC_URL!;
const privateKey = process.env.PRIVATE_KEY!;

const account = privateKeyToAccount(privateKey);

const publicClient = createPublicClient({
  chain: sepolia,
  transport: http(rpcUrl),
});

const walletClient = createWalletClient({
  account,
  chain: sepolia,
  transport: http(rpcUrl),
});

// 2) Use a deployed Account-based contract (e.g. AccountBlox)
const accountAddress = '0x...' as `0x${string}`; // from deployed-addresses.json

const secureOwnable = new SecureOwnable(publicClient, walletClient, accountAddress, sepolia);
const runtimeRBAC = new RuntimeRBAC(publicClient, walletClient, accountAddress, sepolia);
const guardController = new GuardController(publicClient, walletClient, accountAddress, sepolia);
```

Once instantiated:

- Use `secureOwnable` to:
  - Inspect and change owner / broadcaster / recovery (via secure, time‑locked flows).
  - Update global time‑lock configuration.
- Use `runtimeRBAC` to:
  - Inspect roles and their permissions.
  - Apply **role config batches** using the same definition contracts used on‑chain.
- Use `guardController` to:
  - Submit guarded executions via `executeWithTimeLock` or `executeWithPayment`.
  - Approve / cancel via time‑lock or meta‑transactions.
  - Configure whitelists and function schemas using guard config batches.

---

## Getting an Account, and Recognising One

### A fresh account is a vault

`initialize` gives an account its owner, broadcaster, recovery address and time lock. It
does **not** give it the ability to do anything. A newly initialized account refuses every
execution until two more things are configured:

1. a **guard batch** that whitelists the execution target for its selector, and
2. a **role batch** that grants a role an action on the execution selector and its handler.

The second one is the one that catches people. `initialize` registers the
`transfer(address,uint256)` schema with all nine actions *supported*, so the schema read
looks complete, while `getActiveRolePermissions` shows no role actually *holding* an
action on that selector. Whitelisting a token and stopping there reverts
`NoPermission(caller)`. **A supported action is not a granted action, and a whitelist is
not a permission.** The full recipe is in
[Getting Started, three locks](./getting-started.md#5-the-three-locks).

### Creating one: the clone factory

The sanctioned way to create an account is a **CopyBlox-shaped clone factory**:
`cloneBlox` deploys an EIP-1167 minimal proxy of an account template and calls
`initialize` on it in the **same transaction**, so no uninitialized account is ever live
at a public address. The factory also indexes clones by their initial owner
(`clonesOf(owner)`), because an owner can hold several accounts and picking the most
recent one strands the others.

The factory is an *example application* of the protocol that is supported as the public
provisioning surface. It is deliberately **not** in `contracts/core`, and an account never
depends on it at runtime.

### Recognising one: the shape gate

An account and a factory are both `BaseStateMachine`s, so ERC-165 `IBaseStateMachine` does
**not** distinguish them. Gate on all four of:

| Check | An account | The factory |
|---|---|---|
| `getCode` non-empty | yes | yes |
| `owner()` answers | yes | **reverts** while uninitialized |
| `initialized()` | `true` | `false` |
| ERC-165 `ISecureOwnable` | `true` | **`false`** |

`ISecureOwnable` is the sharp edge: the account components (`SecureOwnable`,
`RuntimeRBAC`, `GuardController`, composed by `Account`) answer it, and a bare
`BaseStateMachine` such as the factory does not. The SDK ships this as `isAccountBlox` /
`inspectAccountBlox`, and `assertOwnedAccount` adds the owner match you need before
adopting an address a user named.

---

## When to Use the Account Pattern

Use `Account` (or an `Account`‑based implementation) when you want:

- A **single address** that:
  - Can receive ETH.
  - Can own / guard other contracts and tokens.
  - Has auditable, time‑locked, role‑based approvals for critical operations.
- The **full Bloxchain security model** without wiring each component by hand.

For a step‑by‑step walkthrough that uses an Account‑based contract as the entry point, see the updated [Getting Started guide](./getting-started.md).

