# Security Policy

## Supported Versions

**⚠️ IMPORTANT: Bloxchain Protocol is currently in testing phase and not yet live on mainnet.**

We actively maintain security updates for the following versions:

| Version | Supported          | Status |
| ------- | ------------------ | ------ |
| 1.0.x   | :white_check_mark: | Testing phase (pre-audit) |
| < 1.0   | :x:                | End of life |

**Note**: This security policy will become effective after completion of formal verification and external audit in Q1 2026, which will mark the official launch of version 1.0.0.

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
- Always use the latest version of our contracts
- Implement proper access controls using our RBAC system
- Follow our secure development guidelines
- Test thoroughly using our provided test suites

#### For Auditors
- Review our security architecture documentation
- Focus on the StateAbstraction library core functions
- Verify multi-signature workflow implementations
- Check meta-transaction signature validation

## Security Audit Status

### Current Status
- **Development Phase**: Testing and validation ongoing
- **Formal Verification**: Planned for Q1 2026
- **External Security Audit**: Planned for Q1 2026
- **Official Launch**: Q1 2026 (post-audit)

### Completed Audits
- **Internal Security Review**: Completed (v1.0.0)
- **Code Review**: Ongoing with each release

### Planned Audits
- **Third-Party Security Audit**: Q1 2026
- **Formal Verification**: Q1 2026

## Bug Bounty Program

We are developing a bug bounty program for security researchers. Details will be announced after the official launch.

### Scope
- Smart contract vulnerabilities
- Protocol design flaws
- Implementation bugs
- Cryptographic weaknesses

### Out of Scope
- Social engineering attacks
- Physical security issues
- Issues in third-party dependencies
- Issues in experimental features

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

**Last Updated**: October 2025
