# Sanity SDK Tests

Master test runner for TypeScript SDK sanity tests of the Bloxchain protocol.

## Quick Start

```bash
# Run core tests (default: secure-ownable, runtime-rbac, guard-controller)
npm run test:sanity-sdk

# Run all tests (core + examples)
npm run test:sanity-sdk:all

# Run example tests only
npm run test:sanity-sdk:examples
```

## Direct Usage

```bash
# Run core tests (default)
npx tsx --tsconfig scripts/sanity-sdk/tsconfig.json scripts/sanity-sdk/run-all-tests.ts

# Run all tests
npx tsx --tsconfig scripts/sanity-sdk/tsconfig.json scripts/sanity-sdk/run-all-tests.ts --all

# Run specific test suite
npx tsx --tsconfig scripts/sanity-sdk/tsconfig.json scripts/sanity-sdk/run-all-tests.ts --secure-ownable
npx tsx --tsconfig scripts/sanity-sdk/tsconfig.json scripts/sanity-sdk/run-all-tests.ts --runtime-rbac
npx tsx --tsconfig scripts/sanity-sdk/tsconfig.json scripts/sanity-sdk/run-all-tests.ts --guard-controller
npx tsx --tsconfig scripts/sanity-sdk/tsconfig.json scripts/sanity-sdk/run-all-tests.ts --workflow
```

## Test Structure

### Core Tests (Required)
- **secure-ownable**: Ownership transfer, timelock, recovery, broadcaster SDK tests
- **runtime-rbac**: Role-based access control SDK tests
- **guard-controller**: Guard configuration and whitelist SDK tests

### Example Tests (Optional)
- **workflow**: Workflow integration tests

## Connection and .env

Connection uses **only `.env`** (same as `scripts/sanity`): no RPC override from code. Each `run-tests.ts` imports `load-env` first so `.env` is loaded before any other module.

- **RPC**: Set `RPC_URL` (full URL) or `REMOTE_HOST` in `.env`; optional `REMOTE_PROTOCOL` (default `https`) and `REMOTE_PORT` (default `8545`, same as other sanity scripts; use `REMOTE_PORT=443` for remote HTTPS). No localhost fallback—connection is from .env only.
- **Chain ID**: `REMOTE_NETWORK_ID` or `CHAIN_ID` (default 1337).
- **Timeout**: Remote Ganache uses 30s RPC timeout by default. Override with `SANITY_SDK_RPC_TIMEOUT_MS` if needed.
- **Gas**: If you see "transaction underpriced", set `SANITY_SDK_GAS_PRICE_GWEI` (e.g. `10`).
- **Runtime RBAC**: If role creation fails on your chain with TxStatus 6, you can skip the RBAC workflow and still get a green run by setting `SANITY_SDK_RBAC_SKIP_IF_CREATE_FAILED=1` in `.env` or the shell.

## Contract Configuration

All sanity tests use a **single account contract** (AccountBlox). Set `ACCOUNTBLOX_ADDRESS` in `.env` for manual mode; in auto mode the address is read from Truffle artifacts.

## Individual Test Suites

Each test suite can also be run individually:

```bash
npx tsx --tsconfig scripts/sanity-sdk/tsconfig.json scripts/sanity-sdk/secure-ownable/run-tests.ts --all
npx tsx --tsconfig scripts/sanity-sdk/tsconfig.json scripts/sanity-sdk/secure-ownable/run-tests.ts --meta-tx-exec
npx tsx --tsconfig scripts/sanity-sdk/tsconfig.json scripts/sanity-sdk/runtime-rbac/run-tests.ts --all
npx tsx --tsconfig scripts/sanity-sdk/tsconfig.json scripts/sanity-sdk/guard-controller/run-tests.ts --all
```

**Meta-tx execution (no UI):** `--meta-tx-exec` runs the full meta-transaction flow: request → off-chain sign → broadcaster executes → assert on-chain state. Use this to verify meta-tx execution without any UI.
