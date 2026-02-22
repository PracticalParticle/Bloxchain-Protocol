# CopyBlox Sanity Tests

Sanity tests for the **CopyBlox** example contract: clone a blox (EIP-1167) and initialize it with owner/broadcaster/recovery.

## Overview

CopyBlox provides:

- Clone any blox that implements `IBaseStateMachine` via EIP-1167 minimal proxy
- Initialize the clone with `initialOwner`, `broadcaster`, `recovery`, and `timeLockPeriodSec`
- Set the clone’s event forwarder to the CopyBlox instance
- Registry: `getCloneCount`, `getCloneAtIndex`, `isClone`

These tests use CopyBlox to **clone AccountBlox** and assert clone address, registry, and clone state (owner, broadcaster, recovery).

## Test Structure

- **`base-test.cjs`** – Base class: RPC URL, TEST_MODE (auto/manual), CopyBlox + AccountBlox addresses, wallets
- **`clone-account-blox-tests.cjs`** – Clone AccountBlox and verify clone count, registry, and clone roles
- **`run-tests.cjs`** – Runner for `--all` or `--clone-account-blox`
- **`README.md`** – This file

## Usage

### Prerequisites

1. CopyBlox and AccountBlox deployed (e.g. migration 3 with `DEPLOY_COPYBLOX=true`).
2. `.env` (or env) set as below for the mode you use.
3. For **auto**: Ganache (or compatible chain) on the RPC URL; Truffle artifacts in `build/contracts`.
4. For **manual**: RPC URL and all addresses/keys set in env.

### Running tests

```bash
# From repo root
node scripts/sanity/copy-blox/run-tests.cjs --all

# Only clone-account-blox suite
node scripts/sanity/copy-blox/run-tests.cjs --clone-account-blox

# Help
node scripts/sanity/copy-blox/run-tests.cjs --help
```

### Environment variables

#### Auto mode (Ganache + Truffle artifacts)

- `TEST_MODE=auto`
- RPC: `RPC_URL` or `REMOTE_HOST`/`REMOTE_PORT`/`REMOTE_PROTOCOL`, or default `http://localhost:8545`
- CopyBlox and AccountBlox addresses are read from `build/contracts/CopyBlox.json` and `AccountBlox.json` for the current network ID.
- Wallets: Ganache deterministic keys (no extra env).

#### Manual mode (remote or custom chain)

- `TEST_MODE=manual`
- `COPYBLOX_ADDRESS` – CopyBlox contract address
- `ACCOUNTBLOX_ADDRESS` – AccountBlox implementation to clone
- RPC: same as above (`RPC_URL` or `REMOTE_*` or default localhost)
- Wallets (used as clone’s owner/broadcaster/recovery):
  - `OWNER_PRIVATE_KEY`, `BROADCASTER_PRIVATE_KEY`, `RECOVERY_PRIVATE_KEY`
  - Or `TEST_WALLET_1_PRIVATE_KEY`, `TEST_WALLET_2_PRIVATE_KEY`, `TEST_WALLET_3_PRIVATE_KEY`

Example `.env` (manual):

```bash
TEST_MODE=manual
COPYBLOX_ADDRESS=0x...
ACCOUNTBLOX_ADDRESS=0x...
OWNER_PRIVATE_KEY=0x...
BROADCASTER_PRIVATE_KEY=0x...
RECOVERY_PRIVATE_KEY=0x...

# Optional: remote chain
REMOTE_HOST=your-remote-host.com
REMOTE_PORT=8545
REMOTE_PROTOCOL=https
# Or: RPC_URL=https://...
```

## Test flow

1. **Initial clone count** – `getCloneCount()` (0 or existing).
2. **Clone AccountBlox** – `cloneBlox(accountBlox, owner, broadcaster, recovery, timeLockPeriodSec)`; capture clone address from events or `getCloneAtIndex(0)`.
3. **Clone state and registry** – `isClone(clone)`, `getCloneAtIndex(0)`, then on the clone contract: `owner()`, `getBroadcaster()`, `getRecovery()` match the passed addresses.
4. **Second clone** – Call `cloneBlox` again; assert `getCloneCount()` increases by 1 and `getCloneAtIndex(previousCount)` is the new clone.

## Contract features covered

- Clone creation via CopyBlox
- Clone registry: `getCloneCount`, `getCloneAtIndex`, `isClone`
- Clone initialization: owner, broadcaster, recovery on the cloned AccountBlox

## Integration with master runner

From the sanity root:

```bash
node scripts/sanity/run-all-tests.cjs --copy-blox
node scripts/sanity/run-all-tests.cjs --examples   # includes copy-blox
```

## Troubleshooting

- **CopyBlox ABI not found**  
  Run `npm run compile:truffle` and, if needed, `npm run extract-abi` so `abi/CopyBlox.abi.json` exists (or ensure `build/contracts/CopyBlox.json` exists).

- **AccountBlox / CopyBlox address not found (auto)**  
  Ensure CopyBlox and AccountBlox are deployed on the same network as the RPC (e.g. run migrations with `DEPLOY_COPYBLOX=true`) and `build/contracts` is up to date.

- **Manual: "COPYBLOX_ADDRESS / ACCOUNTBLOX_ADDRESS not set"**  
  Set both in `.env` when using `TEST_MODE=manual`.

- **Remote chain**  
  Use `RPC_URL` or `REMOTE_HOST`/`REMOTE_PORT`/`REMOTE_PROTOCOL` and ensure the node is reachable and network ID matches your deployments.
