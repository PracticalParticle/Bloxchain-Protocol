# Sanity Tests

Master test runner for sanity tests of the Bloxchain protocol.

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

All sanity tests use a **single account contract** (AccountBlox). In manual mode set `ACCOUNTBLOX_ADDRESS` in `.env`. In auto mode, the address is read from **Truffle build artifacts** at `build/contracts/` (e.g. `build/contracts/AccountBlox.json`), which is separate from Hardhat deployment artifacts at `artifacts/contracts/`. Ensure Truffle has been run (`npm run compile:truffle` / migrations) so `build/contracts/` is populated, or use manual mode with addresses from Hardhat deployment.

## Individual Test Suites

Each test suite can also be run individually:

```bash
node scripts/sanity/secure-ownable/run-tests.cjs --all
node scripts/sanity/runtime-rbac/run-tests.cjs --all
node scripts/sanity/guard-controller/run-tests.cjs --all
```
