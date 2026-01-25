# Documentation Generation Workspace

This directory contains a separate npm workspace for generating documentation using `solidity-docgen`.

## Why a separate workspace?

`solidity-docgen@0.6.0-beta.36` requires Hardhat 2.x, while the main project uses Hardhat 3.x. This isolated workspace allows us to use the documentation tool without dependency conflicts.

## Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Generate documentation:
   ```bash
   npm run docgen
   ```

   Or from the project root:
   ```bash
   npm run docgen
   ```

## Configuration

- Hardhat config: `hardhat.config.cjs`
- Templates: `templates/contract.hbs`
- Output: `../docs/` (parent directory)
