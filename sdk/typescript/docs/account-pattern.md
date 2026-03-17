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
const accountAddress = '0x...'; // from deployed-addresses.json

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

## When to Use the Account Pattern

Use `Account` (or an `Account`‑based implementation) when you want:

- A **single address** that:
  - Can receive ETH.
  - Can own / guard other contracts and tokens.
  - Has auditable, time‑locked, role‑based approvals for critical operations.
- The **full Bloxchain security model** without wiring each component by hand.

For a step‑by‑step walkthrough that uses an Account‑based contract as the entry point, see the updated [Getting Started guide](./getting-started.md).

