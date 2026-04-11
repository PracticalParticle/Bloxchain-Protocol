# Bloxchain TypeScript SDK – Docs Index

Welcome to the Bloxchain TypeScript SDK documentation index. This page links to the current, maintained docs that match the core Solidity contracts under `contracts/core` and the TypeScript SDK under `sdk/typescript`.

## 📚 **Documentation Structure**

### **🚀 Getting Started**
- [**Main Documentation**](./README.md) – Overview and navigation
- [**Getting Started**](./getting-started.md) – Quick setup and basic usage
- [**API Reference**](./api-reference.md) – Core SDK classes and method reference

### **🏗️ Architecture & Concepts**
- [**Bloxchain Architecture**](./bloxchain-architecture.md) – Protocol overview and state machine concepts
- [**State Machine Engine**](./state-machine-engine.md) – `SecureOperationState` and EngineBlox internals
- [**Architecture Patterns**](./architecture-patterns.md) – Design patterns and best practices
- [**State Abstraction**](./state-abstraction.md) – State-machine driven security model
- [**State vs Account Abstraction**](./state-abstraction-vs-account-abstraction.md) – Conceptual comparison
- [**Core Contract Graph**](./core-contract-graph.md) – Graph of core contracts and how they relate

### **🔧 Core SDK Components**
- [**SecureOwnable**](./secure-ownable.md) – Ownership, broadcaster, and recovery workflows
- [**RuntimeRBAC**](./runtime-rbac.md) – Dynamic role-based access control
- [**GuardController**](./guard-controller.md) – Guarded execution and whitelisting
- [**Definitions / IDefinition**](./definition-contract.md) – Definition libraries and schemas
- [**Types & Interfaces**](./types-interfaces.md) – Shared TypeScript types and interfaces
- [**Meta-Transactions**](./meta-transactions.md) – Meta-tx params, signing, and execution

### **📖 Development Guides**
- [**Best Practices**](./best-practices.md) – Development guidelines and security patterns

### **💡 Examples & Tutorials**
- [**Basic Examples**](./examples-basic.md) – Simple usage and end‑to‑end flows

## 🎯 **Quick Navigation (By Use Case)**

**I want to…**
- **Get started quickly** → [Getting Started](./getting-started.md)
- **Deploy or clone an Account / initializer contract safely** → [Deployment and initialization](./getting-started.md#deployment-and-initialization)
- **Understand the on-chain architecture** → [Bloxchain Architecture](./bloxchain-architecture.md)
- **See how contracts relate** → [Core Contract Graph](./core-contract-graph.md)
- **Understand the state machine** → [State Machine Engine](./state-machine-engine.md)
- **Use SecureOwnable** → [SecureOwnable](./secure-ownable.md)
- **Configure roles at runtime** → [RuntimeRBAC](./runtime-rbac.md)
- **Configure guarded execution / whitelists** → [GuardController](./guard-controller.md)
- **Work with definitions and schemas** → [Definitions](./definition-contract.md)
- **Use meta-transactions safely** → [Meta-Transactions](./meta-transactions.md)
- **Explore SDK types** → [Types & Interfaces](./types-interfaces.md)
- **See working code** → [Basic Examples](./examples-basic.md)

## 📋 **Documentation Status (SDK Docs Folder)**

| Document | Status | Notes |
|----------|--------|-------|
| [README](./README.md) | ✅ Up to date | Entry point for SDK docs |
| [Getting Started](./getting-started.md) | ✅ Up to date | Basic setup and first calls |
| [API Reference](./api-reference.md) | ✅ Up to date | Core SDK classes and types |
| [SecureOwnable](./secure-ownable.md) | ✅ Up to date | Maps to `SecureOwnable.sol` and TS wrapper |
| [RuntimeRBAC](./runtime-rbac.md) | ✅ Up to date | Maps to `RuntimeRBAC.sol` and TS wrapper |
| [GuardController](./guard-controller.md) | ✅ Up to date | Maps to `GuardController.sol` and TS wrapper |
| [Definitions](./definition-contract.md) | ✅ Up to date | Definition libraries and `IDefinition` |
| [Meta-Transactions](./meta-transactions.md) | ✅ Up to date | EngineBlox meta‑tx flows |
| [Types & Interfaces](./types-interfaces.md) | ✅ Up to date | Shared TypeScript types |
| [Best Practices](./best-practices.md) | ✅ Up to date | Security and usage guidance |
| [Basic Examples](./examples-basic.md) | ✅ Up to date | Sanity‑style examples |
| [Bloxchain Architecture](./bloxchain-architecture.md) | ✅ Up to date | State machine overview |
| [State Machine Engine](./state-machine-engine.md) | ✅ Up to date | EngineBlox internals |
| [Core Contract Graph](./core-contract-graph.md) | ✅ New | Contract relationship graph |

Legend: **✅ Up to date** – in sync with current `contracts/core` and `sdk/typescript` behavior.

## 🔗 **External Resources**

- [Bloxchain Protocol README](../../../README.md) – Protocol overview and repo‑level docs  
- [Contract API (generated)](../../../docs/) – Solidity NatSpec output (`npm run docgen`)  
- [Codebase documentation process](../../../CODEBASE_DOCUMENTATION.md)

## 📝 **Contributing to Documentation**

- **Edit docs here:** `sdk/typescript/docs`  
- **Source of truth:** `contracts/core` and `sdk/typescript` (TS wrappers, helpers, and types)  
- **When updating contracts:**  
  - Update NatSpec in Solidity  
  - Regenerate contract docs if needed  
  - Sync the relevant markdown guides and the [Core Contract Graph](./core-contract-graph.md)

For larger changes, open a PR with a short summary of contract changes and how the docs were updated to match.
