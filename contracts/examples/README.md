# Example contracts

Implementation samples for **education and local/lab learning**.

They are **not** ready products, are **outside** the Nethermind core audit (`contracts/core/` only), and **must not** be deployed or used to hold value on live networks. Treat them as patterns to study, fork, and harden — not as drop-in contracts.

**Production path:** [BasicFactory](../factory/BasicFactory.sol) → [BasicAccount](../account/BasicAccount.sol). See [Getting Started](../../docs/getting-started.md) and root [SECURITY.md](../../SECURITY.md).

## Layout

| Area | Examples | Notes |
|------|----------|--------|
| `templates/` | `AccountBlox` | 1-second time-lock floor; Sepolia developer toolkit |
| `applications/` | `CopyBlox`, `SimpleVault`, `PayBlox`, `SimpleRWA20` | Open factory and sample apps; not for live value |
| `integrations/` | `GuardianSafe` | Safe guard sample; not for live value |
| `extra/` | helpers (e.g. `BasicERC20`) | Test fixtures |

Sepolia publishes AccountBlox / CopyBlox addresses under `networks.sepolia.developerTools` in `official-deployed-addresses.json` for lab discovery only. Their ABI/bytecode are **not** shipped in `@bloxchain/contracts` — compile from this tree. Details: [Getting Started §10](../../docs/getting-started.md#10-experimental-copyblox--accountblox-on-sepolia).
