# Certora Formal Verification for State Abstraction

This directory contains the formal verification setup for the State Abstraction library using Certora Prover. The verification framework validates the theoretical guarantees from the scientific paper, particularly the security properties outlined in Section 5.

## Overview

The State Abstraction framework implements a novel blockchain security architecture with:
- **Multi-phase security operations** with time-locks and meta-transactions
- **Dynamic role-based access control** with mandatory role separation
- **Cryptographic meta-transaction protocols** with EIP-712 compliance
- **Centralized state machine management** through functional programming principles

## Directory Structure

```
certora/
├── specs/                    # CVL specification files
│   ├── StateAbstraction.spec    # Core invariants (Section 5.1.1)
│   ├── StateTransitions.spec    # Safety properties (Section 5.1.2)
│   ├── AccessControl.spec       # RBAC and role separation (Section 4.2)
│   ├── MetaTransactions.spec    # Cryptographic security (Section 5.2)
│   └── Helpers.spec             # Reusable definitions and helpers
├── harness/                  # Test harness contracts
│   ├── GuardianBareHarness.sol  # Main harness extending GuardianBare
│   └── MockERC20.sol            # Mock ERC20 for payment testing
├── conf/                     # Certora configuration files
│   ├── StateAbstraction.conf    # Core invariants config
│   ├── StateTransitions.conf    # State transitions config
│   ├── AccessControl.conf       # RBAC config
│   └── MetaTransactions.conf    # Meta-transactions config
├── scripts/                  # Verification scripts
│   ├── setup-env.sh            # Environment setup
│   ├── verify-all.sh           # Run all verifications locally
│   ├── verify-cloud.sh         # Run all verifications on cloud
│   ├── verify-core.sh          # Core invariants only
│   ├── verify-security.sh      # Security properties only
│   └── verify-watch.sh         # Monitor cloud jobs
├── output/                   # Local verification output (gitignored)
├── .certora_config          # Certora API configuration (gitignored)
├── .last/                   # Certora cache (gitignored)
└── README.md                # This file
```

## Setup Instructions

### 1. Install Certora CLI

```bash
# Install Certora CLI
npm run certora:install
# or manually:
pip3 install certora-cli
```

### 2. Configure API Key

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Add your Certora API key to `.env`:
   ```bash
   CERTORA_KEY=your_certora_api_key_here
   ```

3. Run the setup script to create the Certora configuration:
   ```bash
   bash certora/scripts/setup-env.sh
   ```

### 3. Verify Installation

Test the setup with a quick verification:
```bash
npm run certora:core
```

## Running Verifications

### Local Verification

Run all verifications locally:
```bash
npm run certora:verify
```

Run specific verification suites:
```bash
# Core invariants only (Section 5.1.1)
npm run certora:core

# Security properties only (Sections 4.2, 5.2)
npm run certora:security
```

### Cloud Verification

Run all verifications on Certora cloud prover:
```bash
npm run certora:cloud
```

Monitor cloud jobs:
```bash
bash certora/scripts/verify-watch.sh
```

View results at: [Certora Dashboard](https://prover.certora.com/)

## Specification Files

### StateAbstraction.spec - Core Invariants (Section 5.1.1)

Implements the fundamental invariants from the scientific paper:

- **Invariant 5.1 (Transaction Uniqueness)**: Each transaction has a unique identifier
- **Invariant 5.2 (State Consistency)**: State transitions follow the defined transition function
- **Invariant 5.3 (Permission Integrity)**: Only authorized users can initiate operations
- **Invariant 5.4 (Time Lock Validity)**: Time-locked operations cannot execute before release time

Additional invariants:
- Transaction counter consistency
- State initialization consistency
- Operation type consistency
- Role consistency
- Wallet limit consistency

### StateTransitions.spec - Safety Properties (Section 5.1.2)

Implements safety properties ensuring correct state transitions:

- **Safety Property 5.1 (No Double Execution)**: Transactions cannot be executed multiple times
- **Safety Property 5.2 (Permission Preservation)**: Permissions are preserved across state transitions
- **Safety Property 5.3 (State Isolation)**: Operations on one transaction don't affect others

Additional safety properties:
- Transaction creation safety
- Time lock enforcement
- Permission enforcement
- Role limit enforcement
- Protected role enforcement

### AccessControl.spec - RBAC Properties (Section 4.2)

Implements role-based access control and meta-transaction role separation:

- **Meta-Transaction Role Separation (Theorem 5.3)**: Mandatory separation between signing and execution roles
- **Role Wallet Integrity**: Roles respect their wallet limits
- **Protected Role Integrity**: System-protected roles cannot be removed
- **Permission Inheritance**: Wallets inherit permissions from their roles

Additional RBAC properties:
- Role assignment enforcement
- Permission modification enforcement
- Role management safety
- Permission bitmap integrity
- System role integrity

### MetaTransactions.spec - Cryptographic Security (Section 5.2)

Implements cryptographic security properties:

- **Replay Protection (Theorem 5.2)**: Nonce-based protection prevents replay attacks
- **Signature Validation**: Meta-transactions require valid signatures
- **Chain ID Protection**: Meta-transactions must use correct chain ID
- **Deadline Validation**: Expired meta-transactions are rejected

Additional cryptographic properties:
- Signature malleability protection
- Message hash integrity
- Domain separator integrity
- Meta-transaction workflow integrity

### Helpers.spec - Reusable Definitions

Contains common definitions, ghost variables, and helper functions:

- **Constants**: TxStatus, TxAction, ExecutionType enums
- **Ghost Variables**: Status tracking, pending count, role assignments
- **Hooks**: State update tracking for verification
- **Helper Functions**: Status checking, permission validation, invariant helpers

## Configuration Files

Each `.conf` file specifies:
- **Files**: Contract files to verify
- **Verify**: Harness contract and specification file
- **Solc**: Solidity compiler version
- **Cloud**: Use cloud prover (true/false)
- **Wait for Results**: Block until completion
- **Prover Args**: Timeout and optimization settings

## Interpretation of Results

### Verification Success

When verification succeeds:
- ✅ **PASSED**: All rules and invariants are satisfied
- ✅ **NO COUNTEREXAMPLES**: No violations found
- ✅ **COMPLETE**: All properties verified

### Verification Failures

When verification fails:
- ❌ **FAILED**: Counterexample found
- ❌ **TIMEOUT**: Verification exceeded time limits
- ❌ **ERROR**: Configuration or specification error

### Understanding Counterexamples

Counterexamples show:
- **State**: Contract state when violation occurs
- **Transaction**: The transaction that causes the violation
- **Trace**: Step-by-step execution leading to violation

### Fixing Violations

1. **Analyze the counterexample** to understand the violation
2. **Check the specification** for logical errors
3. **Verify the contract** for implementation bugs
4. **Update the specification** if the contract behavior is correct
5. **Re-run verification** to confirm the fix

## Mapping to Scientific Paper

| Section | Specification File | Description |
|---------|-------------------|-------------|
| 5.1.1 | StateAbstraction.spec | Core invariants (Invariants 5.1-5.4) |
| 5.1.2 | StateTransitions.spec | Safety properties (Properties 5.1-5.3) |
| 4.2 | AccessControl.spec | RBAC and role separation (Theorem 5.3) |
| 5.2 | MetaTransactions.spec | Cryptographic security (Theorem 5.2) |

## Local vs Cloud Verification

### Local Verification
- **Pros**: Fast iteration, no API key required, offline
- **Cons**: Limited resources, may timeout on complex properties
- **Use When**: Development, debugging, simple properties

### Cloud Verification
- **Pros**: More resources, better performance, shared results
- **Cons**: Requires API key, internet connection, slower iteration
- **Use When**: Final verification, complex properties, CI/CD

## Performance Considerations

### Optimization Settings
- **Optimistic Loop**: Assumes loops terminate quickly
- **Loop Iter**: Maximum loop iterations to consider
- **SMT Timeout**: Maximum time for SMT solver
- **Hashing Length Bound**: Maximum hash length to consider

### Common Issues
- **Timeouts**: Increase timeout settings or simplify specifications
- **Memory Issues**: Reduce loop iterations or hash bounds
- **False Positives**: Add more specific preconditions

## CI/CD Integration

### GitHub Actions

Add to `.github/workflows/certora.yml`:
```yaml
name: Certora Verification

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.9'
      - name: Install Certora CLI
        run: pip3 install certora-cli
      - name: Run Certora Verification
        env:
          CERTORA_KEY: ${{ secrets.CERTORA_KEY }}
        run: |
          export CERTORA_KEY
          bash certora/scripts/verify-cloud.sh
```

### Adding Secrets

1. Go to repository Settings → Secrets and variables → Actions
2. Add `CERTORA_KEY` with your API key
3. The workflow will automatically use the secret

## Troubleshooting

### Common Issues

1. **API Key Not Set**
   ```bash
   Error: CERTORA_KEY not set in .env file
   ```
   **Solution**: Add your API key to `.env` file

2. **Contract Compilation Errors**
   ```bash
   Error: Contract compilation failed
   ```
   **Solution**: Check contract syntax and dependencies

3. **Specification Errors**
   ```bash
   Error: CVL syntax error
   ```
   **Solution**: Check CVL syntax and function signatures

4. **Timeout Issues**
   ```bash
   Error: Verification timeout
   ```
   **Solution**: Increase timeout settings or simplify specifications

### Getting Help

- **Certora Documentation**: [docs.certora.com](https://docs.certora.com/)
- **CVL Reference**: [docs.certora.com/en/latest/cvl/](https://docs.certora.com/en/latest/cvl/)
- **Community Forum**: [forum.certora.com](https://forum.certora.com/)

## Future Expansion

The framework supports easy extension to:

- **SecureOwnable.sol**: Ownership transfer security verification
- **DynamicRBAC.sol**: Dynamic role management verification
- **Payment Processing**: PaymentDetails integration verification
- **Cross-Contract**: Guardian.sol and example contracts verification
- **Advanced Properties**: Zero-knowledge integration, quantum resistance

## Contributing

When adding new specifications:

1. **Follow the naming convention**: `[Component].spec`
2. **Import Helpers.spec**: Use common definitions
3. **Add configuration**: Create corresponding `.conf` file
4. **Update scripts**: Add to verification scripts
5. **Document**: Update this README

## License

This verification framework is part of the Bloxchain protocol and follows the same MPL-2.0 license.

