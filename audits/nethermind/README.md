# Nethermind audit — Bloxchain core (`contracts/core/`)

| Field | Value |
|-------|--------|
| **Auditor** | [Nethermind](https://nethermind.io/) |
| **Report ID** | NM_0828 |
| **Scope** | All Solidity under [`contracts/core/`](../../contracts/core/) |
| **Full report** | [`Nethermind-Bloxchain-Core-NM_0828.pdf`](./Nethermind-Bloxchain-Core-NM_0828.pdf) |

## Status

- **Audit:** Completed by Nethermind for the in-scope core tree.
- **Report in repository:** [`Nethermind-Bloxchain-Core-NM_0828.pdf`](./Nethermind-Bloxchain-Core-NM_0828.pdf)
- **Audited commit:** _Record the git commit SHA from the report here when maintaining this page._

## Scope (in-repo paths)

| Path | Role |
|------|------|
| `lib/EngineBlox.sol` | State machine, RBAC, meta-tx, payments |
| `base/BaseStateMachine.sol` | `_secureState`, EngineBlox wrappers |
| `security/SecureOwnable.sol` | Owner, broadcaster, recovery, timelock |
| `access/RuntimeRBAC.sol` | Dynamic roles and batch config |
| `execution/GuardController.sol` | Guarded execution and config |
| `pattern/Account.sol` | Composition of core components |
| `lib/utils/SharedValidation.sol` | Shared errors and validation |
| `*/lib/definitions/*Definitions.sol` | Function schemas and default permissions |
| `*/interface/*.sol` | Core interfaces |

## Out of scope

Examples, community contracts, components, standards, SDK, and deployment tooling — see [`../README.md`](../README.md).

## Using this audit

1. Read [`Nethermind-Bloxchain-Core-NM_0828.pdf`](./Nethermind-Bloxchain-Core-NM_0828.pdf) for findings, severities, and the **exact commit** audited.
2. Update the **Audited commit** line above with that SHA.
3. Compare your deployment or fork to that commit; changes to `contracts/core/` after that commit are **outside** the report until a re-audit or addendum.
4. For maintainer change policy and vulnerability reporting, see [`../../contracts/core/AUDIT.md`](../../contracts/core/AUDIT.md) and [`../../SECURITY.md`](../../SECURITY.md).

## Related documentation

- [`../../contracts/core/AUDIT.md`](../../contracts/core/AUDIT.md) — core audit notice and contribution alignment
- [`../../TECHNICAL_OVERVIEW.md`](../../TECHNICAL_OVERVIEW.md) — technical map for reviewers
- [`../../test/foundry/docs/ATTACK_VECTORS_CODEX.md`](../../test/foundry/docs/ATTACK_VECTORS_CODEX.md) — internal test-backed threat catalog (separate from this third-party report)
