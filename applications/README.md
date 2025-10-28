# Applications

This directory contains applications built on the Bloxchain Protocol framework. These applications are **NOT** part of the core framework and are **NOT** covered by the main repository's Mozilla Public License 2.0.

## Structure

```
applications/
├── community/          # Open source applications
│   ├── defi-vault/     # MIT License
│   ├── supply-chain/   # Apache 2.0 License
│   └── governance-dao/ # GPL v3 License
└── proprietary/        # Commercial/Enterprise applications
    ├── corporate-treasury/  # Proprietary License
    ├── enterprise-vault/    # Enterprise License
    └── custom-solution/     # Custom License
```

## License Types

### Community Applications (`community/`)
Open source applications that use OSI-approved licenses:

- **MIT License** - Maximum flexibility, commercial use allowed
- **Apache 2.0 License** - Patent protection, commercial friendly
- **Mozilla Public License 2.0 (MPL 2.0)** - Weak copyleft, allows proprietary integration
- **GPL v3 License** - Copyleft, requires open source derivatives
- **LGPL v3 License** - Lesser copyleft, allows proprietary linking
- **BSD 3-Clause License** - Permissive, minimal restrictions
- **BSD 2-Clause License** - Simplified BSD, very permissive
- **Eclipse Public License 2.0 (EPL 2.0)** - Weak copyleft, commercial friendly
- **Common Development and Distribution License (CDDL)** - Weak copyleft, Sun Microsystems

### Proprietary Applications (`proprietary/`)
Commercial and enterprise applications with restrictive licenses:

- **Proprietary License** - Closed source, commercial use only
- **Enterprise License** - Custom terms for enterprise use
- **Dual License** - Open source + commercial options
- **Custom License** - Tailored terms for specific needs

## Requirements

All applications must include:

1. **LICENSE file** - Clear license terms
2. **README.md** - Application documentation
3. **Audit report** - Security audit (if applicable)
4. **Documentation** - Usage instructions and examples
5. **Tests** - Comprehensive test suite
6. **Disclaimers** - Clear statements about unofficial support

## Audit Requirements

Applications must meet our [audit requirements](audit-requirements.md) to be included in this directory.

## Disclaimer

**IMPORTANT**: These applications are:

- ❌ **NOT officially supported** by Bloxchain Protocol
- ❌ **NOT part of the core framework**
- ❌ **NOT covered by Bloxchain Protocol's security audits**
- ❌ **NOT subject to MPL-2.0 license terms**
- ✅ **Used at your own risk**
- ✅ **Licensed separately** from the core framework

## Contributing

We recommend a **fork-first development approach** for applications:

### Phase 1: Fork Development
1. **Fork the repository** to your own GitHub account
2. **Develop your application** in your fork
3. **Maintain long-term** in your fork
4. **Iterate and improve** based on real-world usage

### Phase 2: Maturity & Validation
1. **Real-world usage** - Deploy and use in production
2. **Community feedback** - Gather user feedback and bug reports
3. **Security audits** - Complete professional audits
4. **Documentation** - Comprehensive docs and examples
5. **Testing** - Extensive test coverage and validation

### Phase 3: Official Integration
1. **Only when truly ready** - Production-ready applications only
2. **Choose appropriate subfolder** (`community/` or `proprietary/`)
3. **Create application directory** with descriptive name
4. **Include LICENSE file** with clear terms
5. **Provide comprehensive documentation**
6. **Include audit report** (if applicable)
7. **Follow audit requirements**
8. **Submit pull request** for review

### Benefits of Fork-First Development
- **Long-term maintenance** by application teams
- **Independent development** cycles and timelines
- **Quality control** - only mature, battle-tested applications
- **Team autonomy** and ownership of their applications
- **Professional workflow** suitable for enterprises

## Getting Started

### For Developers

#### Fork-First Development Workflow
```bash
# 1. Fork the repository
git clone https://github.com/YOUR_USERNAME/Bloxchain-Protocol.git
cd Bloxchain-Protocol

# 2. Create your application
mkdir applications/community/your-app
# or
mkdir applications/proprietary/your-app

# 3. Develop your application
# ... your development work ...

# 4. Compile and test using shared configuration
cd applications
truffle compile
truffle test

# 5. Commit to your fork
git add .
git commit -m "feat: add your-application v1.0"
git push origin main

# 6. When ready, submit PR to official repo
```

#### Using the Shared Truffle Configuration

All applications use a standardized Truffle configuration at `applications/truffle-config.js` with Guardian Protocol import remapping:

```bash
# Compile from applications directory
cd applications
truffle compile

# Compile from individual app directory
cd applications/community/your-app
truffle compile --config ../truffle-config.js
```

#### Import Guardian Contracts

```solidity
// Import Guardian core contracts
import "@core/access/SecureOwnable.sol";
import "@lib/StateAbstraction.sol";
import "@interfaces/IDefinition.sol";
import "@utils/SharedValidation.sol";
```

#### Using Existing Applications
- Browse applications for implementation examples
- Fork applications to your own repository for modifications
- Follow individual application documentation
- Respect individual application licenses

### For Enterprises
- Review proprietary applications for commercial use
- Contact application authors for licensing inquiries
- Ensure compliance with individual application licenses
- Consider custom development for specific needs
- Use fork-first approach for proprietary development

## Support

- **Core Framework**: See main repository documentation
- **Applications**: Contact individual application authors
- **General Questions**: https://particlecs.com/contact

---

*This directory is excluded from the main repository's Mozilla Public License 2.0. Each application maintains its own licensing terms.*
