# Protocol README assets

Visual system for **Protocol README IA + Visual System Reset** — Particle monochrome figure with soft atmosphere; colorful OSS badges stay as industry-standard trust chips.

**Dark plates only.** No light variants and no `#gh-*-mode-only` / `<picture>` theme switching in `README.md`.

| File | README placement | Purpose |
|------|------------------|---------|
| `logo-lockup-dark.svg` | Hero (header only) | Full-width hero strip + mark/wordmark |
| `protocol-composition-dark.svg` | `## Architecture` only | Composition figure + plain-language labels |
| `logo-bloxchain-dark.svg` | Not embedded | `[Bx]` mark alone (reuse / OG source) |
| `badge-audit-nethermind.svg` | Badge row | Shields-style `audit \| Nethermind NM_0828` → PDF |
| `social-preview.svg` | Not in body | Source for OG card |

## README IA

1. **Hero** — dark lockup only (brand).
2. **Architecture** — one composition SVG for humans; Mermaid lives in a `<details>` block for agents / raw markdown.
3. Do not embed the composition figure in the hero (avoids duplicate topology).

## Social preview

Raster: [`.github/social-preview.png`](../../.github/social-preview.png) (1280×640).

## Rules

- Logo lockup SVG carries large **Bloxchain** wordmark + soft wash/gradient; outer plate uses card radius (`rx="20"`)
- Composition figure: same outer plate radius; Title Case names; plain-language subtitles; soft plate/glow — no side rails
- No ALL-CAPS node titles; hierarchy via weight and stroke, not case
- OG image is not embedded in the README body
- Do not reintroduce light/dark dual embedding in `README.md`
