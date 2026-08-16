# Protocol README assets

Visual system for **Protocol README IA + Visual System Reset** — Particle monochrome figure with soft atmosphere; colorful OSS badges stay as industry-standard trust chips.

**README embeds dark plates only** (single image each). Dual light/dark `#gh-*-mode-only` / `<picture>` switching is avoided — GitHub often stacked both variants.

| File | Purpose |
|------|---------|
| `logo-bloxchain-dark.svg` | `[Bx]` mark alone (dark) |
| `logo-lockup-dark.svg` | Full-width hero strip + centered mark/wordmark (README header) |
| `protocol-composition-dark.svg` | Soft-field composition figure + plain-language labels (README body) |
| `badge-audit-nethermind.svg` | Shields-style `audit \| Nethermind NM_0828` → PDF |
| `social-preview.svg` | Source for OG card |

## Social preview

Raster: [`.github/social-preview.png`](../../.github/social-preview.png) (1280×640).

## Rules

- Logo lockup SVG carries large **Bloxchain** wordmark + soft wash/gradient; outer plate uses card radius (`rx="20"`)
- Composition figure: same outer plate radius; Title Case names; plain-language subtitles; soft plate/glow — no side rails
- No ALL-CAPS node titles; hierarchy via weight and stroke, not case
- OG image is not embedded in the README body
- Do not reintroduce light/dark dual embedding in `README.md`
