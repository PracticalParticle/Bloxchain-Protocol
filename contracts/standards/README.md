# Bloxchain Standards

Protocol-level **interfaces** that define optional behaviors and extension points for Blox contracts. These live outside `core/` so the engine stays minimal and stable.

## Structure

- **behavior/** – Optional behavior interfaces (e.g. cloneable blox). Implementations live in `components/` or `examples/`.
- **hooks/** – Hook and trigger interfaces used by the system to call into external contracts (e.g. post-action hooks).

## Usage

Contracts in `core/`, `components/`, and `examples/` may depend on these interfaces. New standards should be proposed and reviewed before addition.
