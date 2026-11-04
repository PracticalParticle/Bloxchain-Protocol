# Bloxchain Components

Official **components** built on top of `core/` that form a component library for building applications. These are maintained by the protocol team and sit outside the minimal engine.


## Structure

Subfolders will be added by domain as components are added.

## Official account and factory implementations

The canonical account and factory sources are **not** components and do not live here:

- `contracts/account/` – `BasicAccount`, the canonical Account-pattern implementation (1-day timelock floor).
- `contracts/factory/` – `BasicFactory`, the pinned factory that clones only the one `BasicAccount` fixed in its constructor.

Everything under `contracts/examples/` (including AccountBlox, CopyBlox, and the sample apps/integrations) is **education / lab only** — not for live value. See [`contracts/examples/README.md`](../examples/README.md). The integrator mint is BasicFactory → BasicAccount. Sepolia publishes AccountBlox / CopyBlox under `networks.sepolia.developerTools` for experiments only. See `docs/getting-started.md` §10 and the README CreateX section.
