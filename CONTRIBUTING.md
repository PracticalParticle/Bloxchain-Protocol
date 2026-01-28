# Contributing to Bloxchain Protocol

Thank you for your interest in contributing to Bloxchain Protocol! This document provides guidelines and information for contributors.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Contributing Process](#contributing-process)
- [Code Standards](#code-standards)
- [Testing Requirements](#testing-requirements)
- [Documentation](#documentation)
- [Security Considerations](#security-considerations)
- [Pull Request Process](#pull-request-process)
- [Issue Reporting](#issue-reporting)
- [Community](#community)

## Code of Conduct

This project follows our [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold this code. Please report unacceptable behavior to conduct@particlecs.com.

## Getting Started

### Prerequisites

Before contributing, ensure you have:

- **Node.js** (v16 or higher)
- **npm** (v8 or higher)
- **Truffle** (v5.15 or higher)
- **Git** (latest version)
- **Solidity** knowledge (0.8.33)
- **TypeScript** knowledge (for SDK contributions)

### Development Environment

```bash
# Clone the repository
git clone https://github.com/PracticalParticle/Bloxchain-Protocol.git
cd Bloxchain-Protocol

# Install dependencies
npm install

# Install Truffle globally (if not already installed)
npm install -g truffle

# Start local blockchain (Ganache)
ganache --deterministic --networkId 1337

# Compile contracts
npm run compile:truffle

# Run tests
npm run test:truffle
```

## Development Setup

### Project Structure

```
Bloxchain-Protocol/
├── contracts/           # Smart contracts
│   ├── core/           # Core framework contracts
│   ├── examples/       # Example implementations
│   ├── interfaces/     # Interface definitions
│   ├── lib/            # Library contracts
│   └── utils/          # Utility contracts
├── docs/               # Generated documentation
├── sdk/                # TypeScript SDK
├── test/               # Test files
├── scripts/            # Deployment and utility scripts
└── migrations/         # Truffle migrations
```

### Key Components

- **EngineBlox Library**: Core state machine engine
- **BaseStateMachine**: Foundation contract for all implementations
- **SecureOwnable**: Multi-role security implementation
- **DynamicRBAC**: Role-based access control system
- **TypeScript SDK**: Client library for contract interaction

## Contributing Process

### 1. Fork and Clone

```bash
# Fork the repository on GitHub
# Clone your fork
git clone https://github.com/YOUR_USERNAME/Bloxchain-Protocol.git
cd Bloxchain-Protocol

# Add upstream remote
git remote add upstream https://github.com/PracticalParticle/Bloxchain-Protocol.git
```

### 2. Create a Branch

```bash
# Create a feature branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/issue-description
```

### 3. Make Changes

Follow our [Code Standards](#code-standards) and [Testing Requirements](#testing-requirements).

### 4. Test Your Changes

```bash
# Run all tests
npm run test:truffle
npm run test:hardhat

# Run specific test suites
npm run test:sanity:secure-ownable
npm run test:sanity:simple-vault

# Check contract sizes
npm run compile:truffle:size
```

### 5. Submit a Pull Request

See [Pull Request Process](#pull-request-process) for detailed guidelines.

## Code Standards

### Solidity Standards

#### Security Requirements
- **Follow Checks-Effects-Interactions pattern**
- **Use OpenZeppelin's ReentrancyGuard** for state-changing functions
- **Implement proper input validation** with custom errors
- **Use SafeMath operations** for arithmetic
- **Follow visibility modifiers** (private/internal for sensitive functions)

#### Code Style
```solidity
// Use custom errors instead of string messages
error InvalidAddress(address provided);
error InsufficientBalance(uint256 required, uint256 available);

// Use explicit visibility modifiers
contract ExampleContract {
    address private _owner;
    uint256 public totalSupply;
    
    function internalFunction() internal {
        // Implementation
    }
}

// Use NatSpec documentation
/**
 * @title Example Contract
 * @dev Brief description of the contract
 * @notice User-facing description
 * @author Your Name
 */
```

#### Contract Size Optimization
- **Keep contracts under 24KB** (Ethereum mainnet limit)
- **Use libraries** for reusable code
- **Pack structs** efficiently
- **Use events** instead of storage for historical data

### TypeScript Standards

#### SDK Development
```typescript
// Use proper type definitions
export interface TransactionOptions {
  from: Address;
  gasLimit?: bigint;
  gasPrice?: bigint;
}

// Implement comprehensive error handling
export class SecureOwnableError extends Error {
  constructor(message: string, public code: string) {
    super(message);
    this.name = 'SecureOwnableError';
  }
}

// Use JSDoc for documentation
/**
 * Creates a new secure operation request
 * @param operationType The type of operation to request
 * @param options Transaction options
 * @returns Promise resolving to transaction result
 */
async requestOperation(
  operationType: string,
  options: TransactionOptions
): Promise<TransactionResult> {
  // Implementation
}
```

## Testing Requirements

### Test Coverage
- **100% test coverage** required (immutable contracts require complete coverage)
- **All new features** must include comprehensive tests
- **Edge cases** must be tested
- **Integration tests** for complex workflows

### Test Types

#### Unit Tests
```javascript
// Test individual functions
contract('SecureOwnable', (accounts) => {
  it('should create ownership transfer request', async () => {
    const instance = await SecureOwnable.deployed();
    const tx = await instance.transferOwnershipRequest({ from: accounts[0] });
    assert.equal(tx.logs[0].event, 'OperationRequested');
  });
});
```

#### Integration Tests
```javascript
// Test complete workflows
contract('MetaTransaction Workflow', (accounts) => {
  it('should execute meta-transaction workflow', async () => {
    // Test complete meta-transaction flow
    // 1. Create request
    // 2. Sign meta-transaction
    // 3. Execute meta-transaction
    // 4. Verify state changes
  });
});
```

#### Fuzzing Tests
```javascript
// Test with random inputs
contract('Transfer Fuzzing', (accounts) => {
  it('should handle various transfer amounts', async () => {
    for (let i = 0; i < 100; i++) {
      const amount = Math.floor(Math.random() * 1000000);
      // Test with random amount
    }
  });
});
```

### Running Tests

```bash
# Run all Truffle tests
npm run test:truffle

# Run Hardhat tests
npm run test:hardhat

# Run specific test files
truffle test test/SecureOwnable.test.js

# Run with coverage
npm run test:coverage
```

## Documentation

### Contract Documentation
- **NatSpec comments** for all public functions
- **Security annotations** for sensitive operations
- **Usage examples** in comments
- **Parameter descriptions** for all inputs/outputs

### SDK Documentation
- **JSDoc comments** for all public methods
- **Type definitions** for all interfaces
- **Usage examples** in documentation
- **Error handling** documentation

### README Updates
- **Update README.md** for new features
- **Add examples** for new functionality
- **Update installation** instructions if needed
- **Document breaking changes**

## Security Considerations

### Security Review Process
1. **All smart contract changes** require security review
2. **Critical functions** need additional scrutiny
3. **External dependencies** must be audited
4. **Gas optimization** changes need verification

### Security Best Practices
- **Never commit private keys** or sensitive data
- **Use test networks** for development
- **Follow secure coding** practices
- **Report security issues** privately (see [Security Policy](SECURITY.md))

### Vulnerability Reporting
**⚠️ Do NOT create public issues for security vulnerabilities.**

Report security issues to: security@particlecs.com

## Pull Request Process

### Before Submitting

1. **Ensure all tests pass**
2. **Update documentation** as needed
3. **Follow code standards**
4. **Check contract sizes**
5. **Use conventional commit messages** (changelog is auto-generated)

### Pull Request Template

```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] All tests pass
- [ ] Contract size check passed

## Security
- [ ] Security review completed
- [ ] No sensitive data exposed
- [ ] Follows security best practices

## Documentation
- [ ] README updated
- [ ] Code comments added
- [ ] NatSpec documentation updated
```

### Review Process

1. **Automated checks** must pass
2. **Code review** by maintainers
3. **Security review** for smart contract changes
4. **Testing verification**
5. **Documentation review**

## Issue Reporting

### Bug Reports
Use the bug report template and include:
- **Description** of the issue
- **Steps to reproduce**
- **Expected behavior**
- **Actual behavior**
- **Environment details**
- **Screenshots** (if applicable)

### Feature Requests
Use the feature request template and include:
- **Problem description**
- **Proposed solution**
- **Alternatives considered**
- **Additional context**

### Issue Labels
- `bug`: Something isn't working
- `enhancement`: New feature or request
- `documentation`: Improvements to documentation
- `good first issue`: Good for newcomers
- `help wanted`: Extra attention needed
- `security`: Security-related issues

## Applications

### Contributing Applications

The `applications/` directory contains community and proprietary applications built on the Bloxchain Protocol framework. These applications are **NOT** part of the core framework and are **NOT** covered by the main repository's Mozilla Public License 2.0.

#### Fork-First Development Process

We recommend a **fork-first development approach** for applications to ensure quality and long-term maintainability:

##### Phase 1: Fork Development
1. **Fork the repository** to your own GitHub account
2. **Develop your application** in your fork
3. **Maintain long-term** in your fork
4. **Iterate and improve** based on real-world usage

##### Phase 2: Maturity & Validation
1. **Real-world usage** - Deploy and use in production
2. **Community feedback** - Gather user feedback and bug reports
3. **Security audits** - Complete professional audits
4. **Documentation** - Comprehensive docs and examples
5. **Testing** - Extensive test coverage and validation

##### Phase 3: Official Integration
1. **Only when truly ready** - Production-ready applications only
2. **Submit PR** to official repository
3. **Include audit reports** and documentation
4. **Demonstrate real-world usage** and success

#### Benefits of Fork-First Development

- **Long-term maintenance** by application teams
- **Independent development** cycles and timelines
- **Quality control** - only mature, battle-tested applications
- **Team autonomy** and ownership of their applications
- **Professional workflow** suitable for enterprises
- **Reduced risk** of premature inclusion in official repo

#### Application Structure

```
applications/
├── community/          # Open source applications
│   ├── defi-vault/     # MIT License
│   ├── supply-chain/   # Apache 2.0 License
│   └── governance-dao/ # GPL v3 License
└── proprietary/        # Commercial/Enterprise applications
    ├── corporate-treasury/  # Proprietary License
    ├── enterprise-vault/    # Enterprise License
    └── custom-solution/    # Custom License
```

#### License Requirements

Each application must include:

1. **LICENSE file** - Clear license terms
2. **README.md** - Application documentation
3. **Audit report** - Security audit (if applicable)
4. **Documentation** - Usage instructions and examples
5. **Tests** - Comprehensive test suite
6. **Disclaimers** - Clear statements about unofficial support

#### Audit Requirements

All applications must meet our [audit requirements](../applications/audit-requirements.md) to be included in this directory.

#### Submission Process

To add an application to the official repository:

1. **Fork the repository** and develop your application
2. **Complete Phase 1 & 2** (Fork Development & Maturity & Validation)
3. **Choose appropriate subfolder** (`community/` or `proprietary/`)
4. **Create application directory** with descriptive name
5. **Include LICENSE file** with clear terms
6. **Provide comprehensive documentation**
7. **Include audit report** (if applicable)
8. **Follow audit requirements**
9. **Submit pull request** for review

#### Development Setup

For working with applications in your fork:

```bash
# Fork the repository first
git clone https://github.com/YOUR_USERNAME/Bloxchain-Protocol.git
cd Bloxchain-Protocol

# Create your application
mkdir applications/community/your-app
# or
mkdir applications/proprietary/your-app

# Develop your application
# ... your development work ...

# Compile with Truffle
npm run compile:truffle

# Run tests
npm run test:truffle

# Commit and push to your fork
git add .
git commit -m "feat: add your-application v1.0"
git push origin main
```

#### License Types

##### Community Applications (`community/`)
- **MIT License** - Maximum flexibility, commercial use allowed
- **Apache 2.0 License** - Patent protection, commercial friendly
- **Mozilla Public License 2.0 (MPL 2.0)** - Weak copyleft, allows proprietary integration
- **GPL v3 License** - Copyleft, requires open source derivatives
- **LGPL v3 License** - Lesser copyleft, allows proprietary linking
- **BSD 3-Clause License** - Permissive, minimal restrictions
- **BSD 2-Clause License** - Simplified BSD, very permissive
- **Eclipse Public License 2.0 (EPL 2.0)** - Weak copyleft, commercial friendly
- **Common Development and Distribution License (CDDL)** - Weak copyleft, Sun Microsystems

##### Proprietary Applications (`proprietary/`)
- **Proprietary License** - Closed source, commercial use only
- **Enterprise License** - Custom terms for enterprise use
- **Dual License** - Open source + commercial options
- **Custom License** - Tailored terms for specific needs

#### Disclaimer

**IMPORTANT**: Applications are:
- ❌ **NOT officially supported** by Bloxchain Protocol
- ❌ **NOT part of the core framework**
- ❌ **NOT covered by Bloxchain Protocol's security audits**
- ❌ **NOT subject to MPL-2.0 license terms**
- ✅ **Used at your own risk**
- ✅ **Licensed separately** from the core framework

## Community

### Getting Help
- **GitHub Discussions**: For questions and ideas
- **GitHub Issues**: For bug reports and feature requests
- **Documentation**: Comprehensive guides in the repository
- **Contact**: https://particlecs.com/contact

### Contributing Guidelines
- **Be respectful** and constructive
- **Help others** learn and grow
- **Follow the code of conduct**
- **Ask questions** when unsure

### Recognition
- **Contributors** will be recognized in release notes
- **Significant contributions** may be highlighted
- **Security researchers** will be acknowledged in advisories

## Commit Message Guidelines

This project uses [Conventional Commits](https://www.conventionalcommits.org/) for automated changelog generation and version management. All commit messages must follow this format:

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Commit Types

- **`feat`**: A new feature
- **`fix`**: A bug fix
- **`docs`**: Documentation only changes
- **`style`**: Code style changes (formatting, missing semicolons, etc.)
- **`refactor`**: Code refactoring without feature changes or bug fixes
- **`perf`**: Performance improvements
- **`test`**: Adding or updating tests
- **`chore`**: Maintenance tasks, dependency updates
- **`ci`**: CI/CD configuration changes
- **`build`**: Build system or external dependencies changes
- **`revert`**: Revert a previous commit

### Scope (Optional)

The scope should be the name of the package or area affected:
- `contracts`: Smart contract changes
- `sdk`: TypeScript SDK changes
- `docs`: Documentation changes
- `ci`: CI/CD changes
- `scripts`: Script changes

### Examples

```bash
# Feature in contracts
git commit -m "feat(contracts): add PayBlox contract implementation"

# Bug fix in SDK
git commit -m "fix(sdk): correct transaction receipt parsing"

# Documentation update
git commit -m "docs: update installation instructions"

# Breaking change (use ! after type)
git commit -m "feat(contracts)!: change SecureOwnable interface"

# Multiple changes
git commit -m "feat(contracts): add new role management

- Add createRole function
- Add removeRole function
- Update access control logic"
```

### Breaking Changes

To indicate a breaking change, add a `!` after the type/scope:
```
feat(contracts)!: change API signature
```

Or include `BREAKING CHANGE:` in the footer:
```
feat(contracts): update interface

BREAKING CHANGE: The transferOwnership function now requires an additional parameter
```

### Benefits

- **Automatic changelog generation**: Your commits automatically populate the CHANGELOG.md
- **Semantic versioning**: Version bumps are determined by commit types
- **Better git history**: Clear, searchable commit history
- **Automated releases**: Release PRs are created automatically

## Development Workflow

### Daily Development
```bash
# Start development session
git checkout main
git pull upstream main
git checkout -b feature/new-feature

# Make changes and test
npm run compile:truffle:size
npm run test:truffle

# Commit changes
git add .
git commit -m "feat: add new feature"

# Push and create PR
git push origin feature/new-feature
```

### Release Process

Releases are **automated** using Release Please. The process works as follows:

1. **Merge PRs to main**: All PRs merged to `main` are analyzed for conventional commits
2. **Automatic release PR**: Release Please creates a release PR with:
   - Updated version numbers (semantic versioning based on commit types)
   - Generated changelog entries
   - All package versions synchronized
3. **Review and merge**: Review the release PR, ensure changelog is accurate
4. **Automatic tag and release**: When the release PR is merged:
   - A git tag is created
   - GitHub release is created
   - Package versions are synced across monorepo

#### Manual Release (if needed)

If you need to create a release manually:

```bash
# Ensure all changes are committed
git checkout main
git pull

# Run release-please locally (requires token)
npx release-please release-pr --repo-url=github.com/PracticalParticle/Bloxchain-Protocol --token=YOUR_TOKEN
```

#### Version Bumping Rules

- **Major** (x.0.0): Breaking changes (`feat!`, `fix!`, or `BREAKING CHANGE:`)
- **Minor** (x.y.0): New features (`feat:`)
- **Patch** (x.y.z): Bug fixes (`fix:`)

Other commit types (docs, style, refactor, etc.) don't trigger version bumps but are included in changelog.

## License

By contributing to Bloxchain Protocol, you agree that your contributions will be licensed under the Mozilla Public License 2.0 (MPL-2.0).

## Contact

**Particle Crypto Security**
- **Website**: https://particlecs.com
- **Email**: contact@particlecs.com
- **GitHub**: https://github.com/PracticalParticle/Bloxchain-Protocol

---

*Thank you for contributing to Bloxchain Protocol! Your contributions help make blockchain security more accessible and robust.*

**Last Updated**: October 2025
