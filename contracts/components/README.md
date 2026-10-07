# Bloxchain Components

Official **components** built on top of `core/` that form a component library for building applications. These are maintained by the protocol team and sit outside the minimal engine.


## Structure

Subfolders will be added by domain as components are added.

## Official account and factory implementations

The canonical account and factory sources are **not** components and do not live here:

- `contracts/account/` – `BasicAccount`, the canonical Account-pattern implementation (1-day timelock floor).
- `contracts/factory/` – `BasicFactory`, the pinned factory that clones only the one `BasicAccount` fixed in its constructor.

The MIT developer toolkit (`AccountBlox`, `CopyBlox`) stays under `contracts/examples/` — official for fast experimentation (1s AccountBlox floor; open CopyBlox factory), not the Platform CreateX mint. Platform addresses for `BasicAccount` / `BasicFactory` are in root `official-deployed-addresses.json` (shared catalog); Sepolia developer toolkit addresses are under `networks.sepolia.developerTools`. See `docs/getting-started.md` and the README CreateX section.
