# Guardian TypeScript SDK Documentation

Welcome to the Guardian TypeScript SDK documentation. This comprehensive guide covers all aspects of the SDK, from basic usage to advanced workflow analysis.

## 📚 **Documentation Structure**

### **Core SDK**
- [**Getting Started**](./getting-started.md) - Quick setup and basic usage
- [**API Reference**](./api-reference.md) - Complete API documentation
- [**SecureOwnable**](./secure-ownable.md) - SecureOwnable contract integration
- [**RuntimeRBAC**](./runtime-rbac.md) - RuntimeRBAC contract integration
- [**Definitions**](./definition-contract.md) - Dynamic definition library interaction
- [**Meta-Transactions**](./meta-transactions.md) - Meta-transaction workflows and signing
- [**Types & Interfaces**](./types-interfaces.md) - TypeScript type definitions


### **Advanced Topics**
- [**Best Practices**](./best-practices.md) - Development guidelines and patterns
- [**Error Handling**](./error-handling.md) - Error management and debugging
- [**Performance Optimization**](./performance.md) - Optimization techniques
- [**Testing Guide**](./testing.md) - Testing strategies and examples

### **Examples & Tutorials**
- [**Basic Examples**](./examples-basic.md) - Simple usage examples
- [**Advanced Examples**](./examples-advanced.md) - Complex scenarios
- [**Integration Examples**](./examples-integration.md) - Real-world integrations

### **Deployment & Configuration**
- [**Deployment Guide**](./deployment.md) - Contract deployment
- [**Network Configuration**](./network-config.md) - Network setup
- [**Migration Guide**](./migration.md) - Upgrading and migrations

## 🚀 **Quick Start**

```typescript
import { SecureOwnable } from '@bloxchain/sdk/typescript'
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'

// Initialize client
const client = createPublicClient({
  chain: mainnet,
  transport: http()
})

// Create SecureOwnable instance
const secureOwnable = new SecureOwnable(
  client,
  undefined, // walletClient (optional)
  '0x...', // contract address
  mainnet
)

// Use the contract
const owner = await secureOwnable.owner()
console.log('Contract owner:', owner)
```

## 📋 **Table of Contents**

1. [Getting Started](./getting-started.md)
2. [API Reference](./api-reference.md)
3. [SecureOwnable](./secure-ownable.md)
4. [RuntimeRBAC](./runtime-rbac.md)
5. [Definitions](./definition-contract.md)
6. [Meta-Transactions](./meta-transactions.md)
7. [Types & Interfaces](./types-interfaces.md)
8. [Best Practices](./best-practices.md)
9. [Error Handling](./error-handling.md)
10. [Performance Optimization](./performance.md)
11. [Testing Guide](./testing.md)
12. [Basic Examples](./examples-basic.md)
13. [Advanced Examples](./examples-advanced.md)
14. [Integration Examples](./examples-integration.md)
15. [Deployment Guide](./deployment.md)
16. [Network Configuration](./network-config.md)
17. [Migration Guide](./migration.md)

## 🔗 **External Resources**

- [Guardian Protocol Documentation](../README.md)
- [Contract ABIs](../../abi/)
- [Migration Scripts](../../../migrations/)
- [Test Examples](../../../test/)

## 📞 **Support**

For questions, issues, or contributions:
- GitHub Issues: [Create an issue](https://github.com/PracticalParticle/Guardian/issues)
- Documentation: [Improve docs](https://github.com/PracticalParticle/Guardian/tree/main/sdk/typescript/docs)
- Security: [Report security issues](mailto:security@particlecrypto.com)

---

**Version**: 1.0.0  
**Last Updated**: September 2025  
**License**: MPL-2.0
