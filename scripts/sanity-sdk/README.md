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

## Individual Test Suites

Each test suite can also be run individually:

```bash
npx tsx --tsconfig scripts/sanity-sdk/tsconfig.json scripts/sanity-sdk/secure-ownable/run-tests.ts --all
npx tsx --tsconfig scripts/sanity-sdk/tsconfig.json scripts/sanity-sdk/runtime-rbac/run-tests.ts --all
npx tsx --tsconfig scripts/sanity-sdk/tsconfig.json scripts/sanity-sdk/guard-controller/run-tests.ts --all
```
