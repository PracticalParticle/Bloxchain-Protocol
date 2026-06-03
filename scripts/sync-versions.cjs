// sync-versions.cjs — verify (or sync) EngineBlox.VERSION between Solidity and SDK
//
// Default: verify EngineBlox.VERSION matches between Solidity and SDK (no npm sync).
//   node scripts/sync-versions.cjs
//   node scripts/sync-versions.cjs --verify
//
// Optional: copy protocol VERSION from .sol → .tsx after a manual protocol bump
//   node scripts/sync-versions.cjs --sync-protocol

const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const engineBloxPath = path.join(rootDir, 'contracts', 'core', 'lib', 'EngineBlox.sol');
const sdkEngineBloxPath = path.join(rootDir, 'sdk', 'typescript', 'lib', 'EngineBlox.tsx');

const args = process.argv.slice(2);
const syncProtocol = args.includes('--sync-protocol');
const verifyOnly = args.includes('--verify') || args.length === 0 || (!syncProtocol && !args.includes('--help'));

if (args.includes('--help') || args.includes('-h')) {
  console.log(`Usage:
  node scripts/sync-versions.cjs [--verify]     Verify sol/tsx VERSION match (default)
  node scripts/sync-versions.cjs --sync-protocol  Copy VERSION from EngineBlox.sol → EngineBlox.tsx

npm versions are managed by release-please per package; root package.json is not a version driver.
`);
  process.exit(0);
}

const VERSION_SOL_REGEX = /string\s+public\s+constant\s+VERSION\s*=\s*"([^"]*)"/;
const VERSION_TSX_REGEX = /static readonly VERSION: string = "([^"]*)"/;

function readProtocolVersions() {
  if (!fs.existsSync(engineBloxPath)) {
    console.error('❌ EngineBlox.sol not found');
    process.exit(1);
  }
  if (!fs.existsSync(sdkEngineBloxPath)) {
    console.error('❌ SDK EngineBlox.tsx not found');
    process.exit(1);
  }

  const solContent = fs.readFileSync(engineBloxPath, 'utf8');
  const tsxContent = fs.readFileSync(sdkEngineBloxPath, 'utf8');
  const solMatch = solContent.match(VERSION_SOL_REGEX);
  const tsxMatch = tsxContent.match(VERSION_TSX_REGEX);

  if (!solMatch) {
    console.error('❌ Could not parse VERSION in EngineBlox.sol');
    process.exit(1);
  }
  if (!tsxMatch) {
    console.error('❌ Could not parse VERSION in EngineBlox.tsx');
    process.exit(1);
  }

  return {
    sol: solMatch[1],
    tsx: tsxMatch[1],
    solContent,
    tsxContent,
  };
}

function verifyProtocolVersion() {
  console.log('🔍 Verifying protocol version mirror (EngineBlox.VERSION)...\n');
  const { sol, tsx } = readProtocolVersions();

  console.log(`   contracts/core/lib/EngineBlox.sol: "${sol}"`);
  console.log(`   sdk/typescript/lib/EngineBlox.tsx:  "${tsx}"`);

  if (sol !== tsx) {
    console.error('\n❌ Protocol VERSION mismatch. Fix manually or run:');
    console.error('   node scripts/sync-versions.cjs --sync-protocol');
    process.exit(1);
  }

  console.log('\n✅ Protocol VERSION matches.');
}

function syncProtocolVersion() {
  console.log('🔄 Syncing protocol VERSION: EngineBlox.sol → EngineBlox.tsx...\n');
  const { sol, tsx, tsxContent } = readProtocolVersions();

  if (sol === tsx) {
    console.log(`✓  Already in sync: "${sol}"`);
    return;
  }

  const updated = tsxContent.replace(VERSION_TSX_REGEX, `static readonly VERSION: string = "${sol}"`);
  fs.writeFileSync(sdkEngineBloxPath, updated, 'utf8');
  console.log(`✅ SDK EngineBlox.tsx VERSION: "${tsx}" → "${sol}"`);
  console.log('\n✅ Protocol mirror updated. Commit both files if this was intentional.');
}

if (syncProtocol) {
  syncProtocolVersion();
  verifyProtocolVersion();
} else if (verifyOnly) {
  verifyProtocolVersion();
} else {
  console.error('❌ Unknown options. Use --help for usage.');
  process.exit(1);
}
