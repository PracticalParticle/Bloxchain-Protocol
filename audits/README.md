# Security audits

Third-party and published security reviews for Bloxchain Protocol.

## Published audits

| Auditor | Report ID | Scope | Summary | Report |
|---------|-----------|-------|---------|--------|
| [Nethermind](https://nethermind.io/) | NM_0828 | [`contracts/core/`](../contracts/core/) | Independent review of the core protocol library | [Engagement page](./nethermind/README.md) · [PDF](./nethermind/Nethermind-Bloxchain-Core-NM_0828.pdf) |

## Not covered by the Nethermind engagement

- [`contracts/examples/`](../contracts/examples/) — per-file licenses; not core MPL assurance
- [`contracts/community/`](../contracts/community/) — community-maintained; not maintainer-audited
- [`contracts/components/`](../contracts/components/) — official components; outside NM_0828 scope unless a future report states otherwise
- TypeScript SDK, deployment scripts, and example applications

For core-specific policy and change rules, see [`contracts/core/AUDIT.md`](../contracts/core/AUDIT.md).

## Security contact

Report vulnerabilities per [`SECURITY.md`](../SECURITY.md) — **security@particlecs.com** (do not use public issues for undisclosed flaws).
