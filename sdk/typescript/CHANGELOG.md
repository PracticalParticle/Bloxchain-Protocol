# Changelog

## [2.0.0](https://github.com/PracticalParticle/Bloxchain-Protocol/compare/sdk-v1.0.0...sdk-v2.0.0) (2026-02-14)


### ⚠ BREAKING CHANGES

* Core library renamed from MultiPhaseSecureOperation to StateAbstraction

### Features

* add CannotModifyProtected error to ABI files ([38c7be9](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/38c7be97264784c1343c2685c18381c8417cf29d))
* Add contract analysis tools and enhance TypeScript SDK with analyzer module ([a1482e9](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/a1482e91dc74b2edd92f58bcf98210feb745c34e))
* Add DefinitionContract SDK integration with comprehensive workflow documentation ([da6a031](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/da6a031352a74f78735b24c0913df22faca27fc6))
* add DefinitionNotIDefinition error handling to TypeScript utilities ([31aeca5](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/31aeca54b1cabc76741f4ccb18141b97fef24405))
* add EthReceived event to ABI for logging ETH transfers ([bffa510](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/bffa5101238f55afd6899f373de84b03922e3c57))
* add getHooks function to multiple contracts for enhanced hook management ([1453fbe](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/1453fbe4dd21613aa6f40f19cadeae40eb281cb2))
* add getWalletsInRole method to BaseStateMachine for role-based wallet retrieval ([5333fac](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/5333fac91c0ebbe25967ea349f3cd89ea0f61a5b))
* add InvalidPayment error to SharedValidation and update related TypeScript interfaces ([313411c](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/313411c06cba851feb38b6428e3b6d3ce2041e33))
* add new encoding functions for role and guard management in ABI files ([55f59cf](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/55f59cf388813f3175964ec01d4dfe9e64a6dbb2))
* add NotInitialized error handling to SharedValidation and TypeScript SDK ([0065907](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/0065907bf160b2a2c19fbbc9fd4dd79d1e096b4b))
* add role and guard configuration action data encoders ([6db31fd](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/6db31fd99bdbf8372cd6a47c430a237035012adc))
* Add TXAction parameter to MetaTxParams for enhanced meta-transaction security ([284e724](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/284e724ab5050ef8cac5fae5dc08db68fe81c2df))
* enhance encodeAddFunctionToRole to use flat parameters for ABI decoding ([2cd7e59](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/2cd7e5924a33aad3b831d167bd1767d6bb8d23f5))
* introduce executeWithPayment function for enhanced transaction handling ([719c9f1](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/719c9f1d97a8a53c73db9b7f15a52050dfb5fc44))
* **sdk:** Complete TypeScript SDK overhaul with full contract compatibility ([4cdf122](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/4cdf122b1b0483b327cdc3c283c90c37842c5a90))
* update transaction handling to return txId across multiple contracts ([9fb529f](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/9fb529f192bc93c3b61bf034570e76cf5152ee14))


### Code Refactoring

* rename MultiPhaseSecureOperation to StateAbstraction across entire codebase ([7bdedb3](https://github.com/PracticalParticle/Bloxchain-Protocol/commit/7bdedb37342930bd67171ccb52e386318d06ac9e))
