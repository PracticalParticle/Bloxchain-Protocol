# Core contracts — audit and change policy

The Bloxchain **core protocol** in this directory is the audited source of truth for protocol behavior.

## Audit status

| Item | Detail |
|------|--------|
| **Auditor** | [Nethermind](https://nethermind.io/) |
| **Report** | [NM_0828](../../audits/nethermind/README.md) — PDF: [`Nethermind-Bloxchain-Core-NM_0828.pdf`](../../audits/nethermind/Nethermind-Bloxchain-Core-NM_0828.pdf) |
| **Scope** | All Solidity in `contracts/core/` (see [engagement scope](../../audits/nethermind/README.md#scope-in-repo-paths)) |
| **Network** | Protocol is **pre-mainnet**; **mainnet deployment is planned soon**. An completed core audit does not by itself mean mainnet is live. |

Record the **audited git commit** from the report on the [Nethermind engagement page](../../audits/nethermind/README.md) when maintaining this documentation. Any change to files under `contracts/core/` after that commit is outside the published report until a new audit or addendum.

## What this audit does not cover

- [`contracts/examples/`](../../contracts/examples/) — sample apps and templates (separate licenses)
- [`contracts/community/`](../../contracts/community/) — not audited by maintainers
- [`contracts/components/`](../../contracts/components/) — outside NM_0828 unless a future report says otherwise
- [`contracts/standards/`](../../contracts/standards/)
- TypeScript SDK ([`sdk/typescript/`](../../sdk/typescript/)) — mirrors core; not a separate Solidity audit
- Your integrator contracts, proxies, or deployed bytecode on specific networks

## Who may change core

Aligned with [CONTRIBUTING.md](../../CONTRIBUTING.md#core-contracts-contractscore):

- **Only Particle Crypto Security** merges changes to `contracts/core/` (and closely coupled core semantics in `test/foundry/`).
- **External contributors must not** open pull requests that modify this tree.
- Propose non-security behavior via GitHub issues; security issues via [SECURITY.md](../../SECURITY.md) only — **not** public issues or PRs.

## Security reporting

**Do not** report undisclosed vulnerabilities in public GitHub issues or PRs.

- Email: **security@particlecs.com**
- Policy: [SECURITY.md](../../SECURITY.md)

## Related documentation

- [Audits index](../../audits/README.md)
- [TECHNICAL_OVERVIEW.md](../../TECHNICAL_OVERVIEW.md) — code map for reviewers
- [Attack Vectors Codex](../../test/foundry/docs/ATTACK_VECTORS_CODEX.md) — test-backed vectors (complements, does not replace, the Nethermind report)
- [CONTRIBUTING.md](../../CONTRIBUTING.md) · [SECURITY.md](../../SECURITY.md)
