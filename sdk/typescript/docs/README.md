# Bloxchain TypeScript SDK Documentation

Welcome to the Bloxchain TypeScript SDK documentation. This guide covers SDK usage, from basic setup to advanced workflows. **Contract behavior and API are defined by the Solidity source; see `contracts/core` and [CODEBASE_DOCUMENTATION.md](../../CODEBASE_DOCUMENTATION.md) for the documentation process.**

## 📚 **Documentation Structure**

### **Core SDK**
- [**Getting Started**](./getting-started.md) – Quick setup and basic usage
- [**API Reference**](./api-reference.md) – Core SDK classes and types
- [**SecureOwnable**](./secure-ownable.md) – SecureOwnable contract integration
- [**RuntimeRBAC**](./runtime-rbac.md) – RuntimeRBAC contract integration
- [**GuardController**](./guard-controller.md) – Guarded execution and whitelists
- [**Definitions**](./definition-contract.md) – Definition library interaction (`IDefinition`)
- [**Meta-Transactions**](./meta-transactions.md) – Meta‑transaction workflows and signing
- [**Types & Interfaces**](./types-interfaces.md) – TypeScript type definitions

### **Architecture & Concepts**
- [**Bloxchain Architecture**](./bloxchain-architecture.md) – Protocol and state machine
- [**State Machine Engine**](./state-machine-engine.md) – `SecureOperationState` and EngineBlox
- [**Core Contract Graph**](./core-contract-graph.md) – Graph of core contracts and SDK wrappers

### **Advanced Topics**
- [**Best Practices**](./best-practices.md) – Development guidelines and patterns

### **Examples & Tutorials**
- [**Basic Examples**](./examples-basic.md) – Simple usage examples

## 🚀 **Quick Start**

```typescript
import { SecureOwnable } from '@bloxchain/sdk'
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
9. [Basic Examples](./examples-basic.md)
10. [Bloxchain Architecture](./bloxchain-architecture.md)
11. [State Machine Engine](./state-machine-engine.md)

## 🔗 **External Resources**

- [Bloxchain Protocol README](../../README.md)
- [Contract API (generated)](../../docs/) – from Solidity NatSpec via `npm run docgen`
- [Codebase documentation process](../../CODEBASE_DOCUMENTATION.md)

## 📞 **Support**

- **Issues:** [GitHub Issues](https://github.com/PracticalParticle/Bloxchain-Protocol/issues)
- **Security:** [Report security issues](mailto:security@particlecrypto.com)

---

**Version**: 1.0.0-alpha.16 (see [package.json](../package.json))  
**License**: MPL-2.0
