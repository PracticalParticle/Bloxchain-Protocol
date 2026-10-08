# Bloxchain Components

Official **components** built on top of `core/` that form a component library for building applications. These are maintained by the protocol team and sit outside the minimal engine.


## Structure

Subfolders will be added by domain as components are added.

## Official account and factory implementations

The canonical account and factory sources are **not** components and do not live here:

- `contracts/account/` – `BasicAccount`, the canonical Account-pattern implementation (1-day timelock floor).
- `contracts/factory/` – `BasicFactory`, the pinned factory that clones only the one `BasicAccount` fixed in its constructor.

The example contracts (`AccountBlox`, `CopyBlox`) stay under `contracts/examples/` for Sepolia experimentation (1-second AccountBlox floor; open CopyBlox factory). The integrator mint is BasicFactory → BasicAccount. Those addresses are in root `official-deployed-addresses.json` (shared catalog). The Sepolia experiment is under `networks.sepolia.developerTools`. See `docs/getting-started.md` and the README CreateX section.
