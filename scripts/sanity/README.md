# Sanity Tests

Master test runner for direct (Web3/CJS) sanity tests of the Bloxchain protocol.

## Prerequisites

These packages are **not** listed in the root `package.json` (they are dev-only tooling, not part of the published `@bloxchain/contracts` / `@bloxchain/sdk` packages). Install them locally before running sanity or Hardhat deploy flows:

```bash
# Required to run scripts/sanity (direct Web3 tests)
npm install --save-dev web3@1.10.4

# Required for Hardhat deploy to remote_evm / viem networks
# (scripts/deployment/*, DEPLOY_ENV_FILE=.env.deployment.local)
npm install --save-dev @nomicfoundation/hardhat-toolbox-viem@5.0.6
```

Also ensure ABIs are current:

```bash
npm run compile:foundry:abi
```

For `remote_evm` (Nethermind), configure `.env` (see root `env.example`) or regenerate after deploy:

```bash
npm run generate:sanity-env -- --out .env
```

## Quick Start

```bash
# Run core tests (default: secure-ownable, runtime-rbac, guard-controller)
npm run test:sanity

# Run all tests (core + examples)
npm run test:sanity:all

# Run example tests only
npm run test:sanity:examples
```

## Direct Usage

```bash
# Run core tests (default)
node scripts/sanity/run-all-tests.cjs

# Run all tests
node scripts/sanity/run-all-tests.cjs --all

# Run specific test suite
node scripts/sanity/run-all-tests.cjs --secure-ownable
node scripts/sanity/run-all-tests.cjs --runtime-rbac
node scripts/sanity/run-all-tests.cjs --guard-controller
node scripts/sanity/run-all-tests.cjs --simple-vault
node scripts/sanity/run-all-tests.cjs --simple-rwa20
```

## Test Structure

### Core Tests (Required)
- **secure-ownable**: Ownership transfer, timelock, recovery, broadcaster tests
- **runtime-rbac**: Role-based access control tests
- **guard-controller**: Guard configuration and whitelist tests

### Example Tests (Optional)
- **simple-vault**: Vault withdrawal and deposit tests
- **simple-rwa20**: Token minting and burning tests

## Contract Configuration

All sanity tests use a **single account contract** (AccountBlox).

**Manual mode** (`TEST_MODE=manual`, recommended for `remote_evm`):

- Set `NETWORK_NAME=remote_evm`, `RPC_URL`, and wallet keys in `.env` (see `env.example`).
- `ACCOUNTBLOX_ADDRESS` is optional when `deployed-addresses.json` has `remote_evm.AccountBlox` (same key as `NETWORK_NAME`).

**Auto mode** (`TEST_MODE=auto`):

- Prefer `deployed-addresses.json` for the configured network, then fall back to Truffle artifacts at `build/contracts/AccountBlox.json`.

SDK-based sanity tests live under `scripts/sanity-sdk/` (`npm run test:sanity-sdk:core`).

## Individual Test Suites

Each test suite can also be run individually:

```bash
node scripts/sanity/secure-ownable/run-tests.cjs --all
node scripts/sanity/runtime-rbac/run-tests.cjs --all
node scripts/sanity/guard-controller/run-tests.cjs --all
```
