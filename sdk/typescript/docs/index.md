# Bloxchain TypeScript SDK Documentation Index

Welcome to the comprehensive documentation for the Bloxchain TypeScript SDK. This index provides quick access to all documentation resources.

## 📚 **Documentation Structure**

### **🚀 Getting Started**
- [**Main Documentation**](./README.md) - Overview and navigation
- [**Getting Started**](./getting-started.md) - Quick setup and basic usage
- [**API Reference**](./api-reference.md) - Complete API documentation

### **🏗️ Bloxchain Architecture**
- [**Protocol Architecture**](./bloxchain-architecture.md) - Bloxchain protocol overview and design principles
- [**State Machine Engine**](./state-machine-engine.md) - SecureOperationState engine and state management
- [**Architecture Patterns**](./architecture-patterns.md) - Design patterns and best practices

### **🔧 Core SDK Components**
- [**SecureOwnable**](./secure-ownable.md) - SecureOwnable contract integration
- [**RuntimeRBAC**](./dynamic-rbac.md) - RuntimeRBAC contract integration (dynamic role-based access control)
- [**Definitions**](./definition-contract.md) - Dynamic definition library interaction
- [**Types & Interfaces**](./types-interfaces.md) - TypeScript type definitions


### **📖 Development Guides**
- [**Best Practices**](./best-practices.md) - Development guidelines and patterns
- [**Error Handling**](./error-handling.md) - Error management and debugging
- [**Performance Optimization**](./performance.md) - Optimization techniques
- [**Testing Guide**](./testing.md) - Testing strategies and examples

### **💡 Examples & Tutorials**
- [**Basic Examples**](./examples-basic.md) - Simple usage examples
- [**Advanced Examples**](./examples-advanced.md) - Complex scenarios
- [**Integration Examples**](./examples-integration.md) - Real-world integrations

### **🚀 Deployment & Configuration**
- [**Deployment Guide**](./deployment.md) - Contract deployment
- [**Network Configuration**](./network-config.md) - Network setup
- [**Migration Guide**](./migration.md) - Upgrading and migrations

## 🎯 **Quick Navigation**

### **By Use Case**

**I want to...**
- **Get started quickly** → [Getting Started](./getting-started.md)
- **Understand Bloxchain architecture** → [Protocol Architecture](./bloxchain-architecture.md)
- **Learn about the state machine** → [State Machine Engine](./state-machine-engine.md)
- **Understand the API** → [API Reference](./api-reference.md)
- **Use SecureOwnable** → [SecureOwnable Guide](./secure-ownable.md)
- **Use RuntimeRBAC** → [RuntimeRBAC Guide](./dynamic-rbac.md)
- **Use Definitions** → [Definitions Guide](./definition-contract.md)
- **See examples** → [Basic Examples](./examples-basic.md)
- **Follow best practices** → [Best Practices](./best-practices.md)
- **Deploy contracts** → [Deployment Guide](./deployment.md)

### **By Component**

**Core SDK:**
- [SecureOwnable](./secure-ownable.md) - Ownership management
- [RuntimeRBAC](./dynamic-rbac.md) - Role-based access control
- [Definitions](./definition-contract.md) - Dynamic definition library interaction
- [Types & Interfaces](./types-interfaces.md) - Type definitions


**Development:**
- [Best Practices](./best-practices.md) - Development guidelines
- [Error Handling](./error-handling.md) - Error management
- [Performance](./performance.md) - Optimization
- [Testing](./testing.md) - Testing strategies

**Examples:**
- [Basic Examples](./examples-basic.md) - Simple scenarios
- [Advanced Examples](./examples-advanced.md) - Complex scenarios
- [Integration Examples](./examples-integration.md) - Real-world usage

## 📋 **Documentation Status**

| Document | Status | Last Updated |
|----------|--------|--------------|
| [README](./README.md) | ✅ Complete | Sep 2025 |
| [Getting Started](./getting-started.md) | ✅ Complete | Sep 2025 |
| [API Reference](./api-reference.md) | ✅ Complete | Sep 2025 |
| [SecureOwnable](./secure-ownable.md) | ✅ Complete | Sep 2025 |
| [RuntimeRBAC](./dynamic-rbac.md) | ✅ Complete | Sep 2025 |
| [Definitions](./definition-contract.md) | ✅ Complete | Sep 2025 |
| [Types & Interfaces](./types-interfaces.md) | ✅ Complete | Sep 2025 |
| [Best Practices](./best-practices.md) | ✅ Complete | Sep 2025 |
| [Error Handling](./error-handling.md) | 🚧 Planned | - |
| [Performance](./performance.md) | 🚧 Planned | - |
| [Testing](./testing.md) | 🚧 Planned | - |
| [Basic Examples](./examples-basic.md) | ✅ Complete | Sep 2025 |
| [Advanced Examples](./examples-advanced.md) | 🚧 Planned | - |
| [Integration Examples](./examples-integration.md) | 🚧 Planned | - |
| [Deployment Guide](./deployment.md) | 🚧 Planned | - |
| [Network Configuration](./network-config.md) | 🚧 Planned | - |
| [Migration Guide](./migration.md) | 🚧 Planned | - |

**Legend:**
- ✅ Complete - Ready for use
- 🚧 Planned - In development
- ❌ Missing - Not yet started

## 🔗 **External Resources**

### **Guardian Protocol**
- [Main Repository](https://github.com/PracticalParticle/Guardian)
- [Contract ABIs](../../abi/)
- [Migration Scripts](../../../migrations/)
- [Test Examples](../../../test/)

### **Dependencies**
- [Viem Documentation](https://viem.sh/) - Ethereum library
- [TypeScript Documentation](https://www.typescriptlang.org/) - Type system
- [Jest Documentation](https://jestjs.io/) - Testing framework

### **Support**
- [GitHub Issues](https://github.com/PracticalParticle/Guardian/issues) - Bug reports and feature requests
- [Discord Community](https://discord.gg/guardian) - Community support
- [Security Reports](mailto:security@particlecrypto.com) - Security issues

## 📝 **Contributing to Documentation**

### **How to Contribute**
1. **Fork the repository**
2. **Create a documentation branch**
3. **Make your changes**
4. **Submit a pull request**

### **Documentation Standards**
- Use clear, concise language
- Include code examples
- Follow the existing structure
- Test all code examples
- Update the status table

### **Documentation Types**
- **Guides** - Step-by-step instructions
- **References** - Complete API documentation
- **Examples** - Practical code samples
- **Tutorials** - Learning-focused content

## 🎯 **Quick Start Examples**

### **Basic Setup**
```typescript
import { SecureOwnable } from '@guardian/sdk/typescript'
import { createPublicClient, http } from 'viem'
import { mainnet } from 'viem/chains'

const client = createPublicClient({
  chain: mainnet,
  transport: http()
})

const secureOwnable = new SecureOwnable(
  client,
  undefined,
  '0x...',
  mainnet
)

const owner = await secureOwnable.owner()
console.log('Owner:', owner)
```


## 📊 **Documentation Metrics**

- **Total Documents**: 15
- **Completed**: 8 (53%)
- **In Progress**: 7 (47%)
- **Total Words**: ~50,000
- **Code Examples**: 100+

## 🔄 **Update Schedule**

- **Weekly**: Review and update existing documentation
- **Monthly**: Add new documentation for features
- **Quarterly**: Major documentation restructuring
- **As Needed**: Bug fixes and improvements

---

**Need help?** Check out the [Getting Started Guide](./getting-started.md) or [Basic Examples](./examples-basic.md) to begin your journey with the Guardian TypeScript SDK.
