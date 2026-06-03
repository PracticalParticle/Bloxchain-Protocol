# Security Policy

## Supported Versions

**⚠️ IMPORTANT: Bloxchain Protocol is not yet live on Ethereum mainnet.** Testnet validation continues; **mainnet deployment is planned soon.**

We actively maintain security updates for the following versions:

| Version | Supported          | Status |
| ------- | ------------------ | ------ |
| 1.0.x   | :white_check_mark: | Pre-mainnet; core audited by Nethermind (see below) |
| < 1.0   | :x:                | End of life |

**Core smart contracts (`contracts/core/`):** Independently audited by **Nethermind** ([audit index](audits/README.md), [report PDF](audits/nethermind/Nethermind-Bloxchain-Core-NM_0828.pdf), [core policy](contracts/core/AUDIT.md)). The audit applies to the commit recorded in [audits/nethermind/README.md](audits/nethermind/README.md) (see the report PDF for the exact SHA). Later changes to core are outside that report until a re-audit or addendum.

Examples, community contracts, and application code under `contracts/examples/` and `contracts/community/` are **not** covered by that engagement.

## Reporting a Vulnerability

**⚠️ IMPORTANT: Do NOT create public GitHub issues for security vulnerabilities.**

### How to Report

Please report security vulnerabilities through one of the following channels:

**Primary Contact:**
- **Email**: security@particlecs.com
- **Subject**: `[SECURITY] Bloxchain Protocol Vulnerability Report`

**Alternative Contact:**
- **Company Website**: https://particlecs.com/contact
- **Reference**: "Security Vulnerability Report - Bloxchain Protocol"

### What to Include

When reporting a security vulnerability, please include:

1. **Description** of the vulnerability
2. **Steps to reproduce** the issue
3. **Potential impact** assessment
4. **Suggested remediation** (if any)
5. **Your contact information** for follow-up

### Response Timeline

We take security seriously and commit to the following response times:

- **Initial Response**: Within 24 hours
- **Status Update**: Within 72 hours  
- **Resolution**: Within 7 days (for critical issues)
- **Public Disclosure**: Coordinated with reporter (typically 30-90 days)

## Security Features

### Bloxchain Protocol Security Model

Our State Abstraction framework implements multiple layers of security:

#### Multi-Phase Security
- **Time-locked operations** prevent immediate exploitation
- **Request/approval workflows** ensure proper authorization
- **Mandatory multi-signature** requirements eliminate single points of failure

#### Cryptographic Security
- **EIP-712 compliant** meta-transaction signatures
- **Nonce-based replay attack** prevention
- **Role separation** between signing and execution

#### Access Control Security
- **Dynamic RBAC** with runtime permission updates
- **Function-level granular control**
- **Protected system roles** that cannot be modified

### Security Best Practices

#### For Developers
- Always use the latest supported version of our contracts
- Implement proper access controls using our RBAC system
- Follow our secure development guidelines
- Test thoroughly using our provided test suites
- Pin releases and verify them against the [audited core commit](audits/nethermind/README.md) before production use

#### For Auditors
- Start with [contracts/core/AUDIT.md](contracts/core/AUDIT.md) and the [Nethermind report](audits/nethermind/)
- Review [TECHNICAL_OVERVIEW.md](TECHNICAL_OVERVIEW.md) and the EngineBlox library
- Verify multi-signature workflow implementations
- Check meta-transaction signature validation

## Security Audit Status

### Third-party audit (core)

| Item | Status |
|------|--------|
| **Auditor** | Nethermind |
| **Scope** | `contracts/core/` |
| **Report** | [audits/nethermind/Nethermind-Bloxchain-Core-NM_0828.pdf](audits/nethermind/Nethermind-Bloxchain-Core-NM_0828.pdf) (NM_0828) |
| **Engagement details** | [audits/nethermind/README.md](audits/nethermind/README.md) |

### Deployment and launch

| Item | Status |
|------|--------|
| **Mainnet** | Not live yet; deployment planned soon |
| **Development** | Testing and validation on testnets (e.g. Sepolia) |
| **Bug bounty** | Program details to be announced around mainnet launch |

### Completed reviews

- **Nethermind (core):** Completed — see [audits/nethermind/](audits/nethermind/)
- **Internal security review:** Ongoing with releases
- **Code review:** Ongoing with each release

## Bug Bounty Program

We are developing a bug bounty program for security researchers. Details will be announced in coordination with **mainnet deployment**.

### Scope
- Smart contract vulnerabilities in **audited core** (`contracts/core/`) at the published commit
- Protocol design flaws
- Implementation bugs
- Cryptographic weaknesses

### Out of Scope
- Social engineering attacks
- Physical security issues
- Issues in third-party dependencies
- Issues in experimental features
- Example and community contracts unless explicitly listed in a future program scope

## Security Updates

### How We Handle Security Updates

1. **Immediate Assessment**: Evaluate severity and impact
2. **Coordinated Response**: Work with reporter on timeline
3. **Patch Development**: Create and test security fixes
4. **Deployment**: Deploy updates to supported networks
5. **Communication**: Notify users of security updates
6. **Documentation**: Update security documentation

### Notification Methods

- **GitHub Security Advisories**: For public disclosure
- **Email Notifications**: For registered users
- **Documentation Updates**: In our security docs
- **Social Media**: For critical issues

## Contact Information

**Particle Crypto Security**
- **Website**: https://particlecs.com
- **Security Email**: security@particlecs.com
- **General Contact**: https://particlecs.com/contact

## Acknowledgments

We appreciate the security research community's efforts to help keep Bloxchain Protocol secure. All responsible disclosures will be acknowledged in our security advisories.

---

*This security policy is subject to updates. Please check back regularly for the latest information.*

**Last Updated**: June 2026
