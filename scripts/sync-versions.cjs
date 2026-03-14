// sync-versions.cjs
// Syncs version from root package.json to all sub-packages and contract constants
// Usage: node sync-versions.cjs [--tag <tag>] or node sync-versions.cjs [-t <tag>]
// Example: node sync-versions.cjs --tag alpha

const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const rootPackageJsonPath = path.join(rootDir, 'package.json');
const contractsPackageJsonPath = path.join(rootDir, 'package', 'package.json');
const sdkPackageJsonPath = path.join(rootDir, 'sdk', 'typescript', 'package.json');
const engineBloxPath = path.join(rootDir, 'contracts', 'core', 'lib', 'EngineBlox.sol');
const sdkEngineBloxPath = path.join(rootDir, 'sdk', 'typescript', 'lib', 'EngineBlox.tsx');

// Parse command line arguments for tag
let preReleaseTag = null;
const args = process.argv.slice(2);
for (let i = 0; i < args.length; i++) {
  if ((args[i] === '--tag' || args[i] === '-t') && i + 1 < args.length) {
    preReleaseTag = args[i + 1];
    // Validate tag format (npm compatible)
    if (!/^[a-zA-Z0-9.-]+$/.test(preReleaseTag)) {
      console.error(`❌ Invalid pre-release tag: ${preReleaseTag}`);
      console.error('   Tag must contain only alphanumeric characters, dots, and hyphens');
      process.exit(1);
    }
    break;
  }
}

console.log('🔄 Syncing package versions...\n');

// Read root package.json
if (!fs.existsSync(rootPackageJsonPath)) {
  console.error('❌ Root package.json not found!');
  process.exit(1);
}

const rootPackageJson = JSON.parse(fs.readFileSync(rootPackageJsonPath, 'utf8'));
let rootVersion = rootPackageJson.version;

if (!rootVersion) {
  console.error('❌ No version found in root package.json!');
  process.exit(1);
}

// Parse version into components (supports pre-release tags like 1.0.0-alpha)
const versionMatch = rootVersion.match(/^(\d+)\.(\d+)\.(\d+)(?:-(.+))?$/);
if (!versionMatch) {
  console.error(`❌ Invalid version format: ${rootVersion}`);
  console.error('   Expected format: X.Y.Z or X.Y.Z-tag (e.g., 1.0.0 or 1.0.0-alpha)');
  process.exit(1);
}

const versionMajor = parseInt(versionMatch[1], 10);
const versionMinor = parseInt(versionMatch[2], 10);
const versionPatch = parseInt(versionMatch[3], 10);
const existingTag = versionMatch[4] || null;

// Validate version components (uint8 max is 255)
if (versionMajor > 255 || versionMinor > 255 || versionPatch > 255) {
  console.error(`❌ Version components exceed uint8 maximum (255)`);
  console.error(`   Version: ${rootVersion} (${versionMajor}.${versionMinor}.${versionPatch})`);
  process.exit(1);
}

// Base version without any pre-release tag (for contract constants)
const baseVersion = `${versionMajor}.${versionMinor}.${versionPatch}`;

// Determine final version for packages
// If tag is provided via command line, use it; otherwise use existing tag from package.json
const finalTag = preReleaseTag !== null ? preReleaseTag : existingTag;
const packageVersion = finalTag ? `${baseVersion}-${finalTag}` : baseVersion;

// Update root package.json if tag was provided via command line
if (preReleaseTag !== null && rootVersion !== packageVersion) {
  rootPackageJson.version = packageVersion;
  fs.writeFileSync(
    rootPackageJsonPath,
    JSON.stringify(rootPackageJson, null, 2) + '\n',
    'utf8'
  );
  console.log(`✅ Root package.json: ${rootVersion} → ${packageVersion}`);
  rootVersion = packageVersion;
}

// Display version information
if (finalTag) {
  console.log(`📦 Package version: ${packageVersion}`);
  console.log(`📝 Contract version (base, no tag): ${baseVersion}`);
  console.log(`📌 Pre-release tag: ${finalTag}\n`);
} else {
  console.log(`📦 Version: ${packageVersion}\n`);
}

// Update contracts package.json (with tag if present)
if (fs.existsSync(contractsPackageJsonPath)) {
  const contractsPackageJson = JSON.parse(fs.readFileSync(contractsPackageJsonPath, 'utf8'));
  const oldVersion = contractsPackageJson.version;
  
  if (contractsPackageJson.version !== packageVersion) {
    contractsPackageJson.version = packageVersion;
    fs.writeFileSync(
      contractsPackageJsonPath,
      JSON.stringify(contractsPackageJson, null, 2) + '\n',
      'utf8'
    );
    console.log(`✅ @bloxchain/contracts: ${oldVersion} → ${packageVersion}`);
  } else {
    console.log(`✓  @bloxchain/contracts: ${packageVersion} (already synced)`);
  }
} else {
  console.warn('⚠️  Contracts package.json not found');
}

// Update SDK package.json (with tag if present)
if (fs.existsSync(sdkPackageJsonPath)) {
  const sdkPackageJson = JSON.parse(fs.readFileSync(sdkPackageJsonPath, 'utf8'));
  const oldVersion = sdkPackageJson.version;
  
  if (sdkPackageJson.version !== packageVersion) {
    sdkPackageJson.version = packageVersion;
    fs.writeFileSync(
      sdkPackageJsonPath,
      JSON.stringify(sdkPackageJson, null, 2) + '\n',
      'utf8'
    );
    console.log(`✅ @bloxchain/sdk: ${oldVersion} → ${packageVersion}`);
  } else {
    console.log(`✓  @bloxchain/sdk: ${packageVersion} (already synced)`);
  }
} else {
  console.warn('⚠️  SDK package.json not found');
}

// Update EngineBlox.sol version constants
// IMPORTANT: Contract constants use base version WITHOUT pre-release tags
// This ensures contracts always reference the semantic version, not pre-release tags
if (fs.existsSync(engineBloxPath)) {
  let engineBloxContent = fs.readFileSync(engineBloxPath, 'utf8');
  let updated = false;
  
  // Update VERSION string (uses base version, no pre-release tag)
  const versionRegex = /(string\s+public\s+constant\s+VERSION\s*=\s*)"([^"]*)"/;
  const versionMatch = engineBloxContent.match(versionRegex);
  if (versionMatch) {
    const oldVersion = versionMatch[2];
    if (oldVersion !== baseVersion) {
      engineBloxContent = engineBloxContent.replace(versionRegex, `$1"${baseVersion}"`);
      updated = true;
      console.log(`✅ EngineBlox.sol VERSION: "${oldVersion}" → "${baseVersion}" (base version, no pre-release tag)`);
    } else {
      console.log(`✓  EngineBlox.sol VERSION: "${baseVersion}" (already synced)`);
    }
  } else {
    console.warn('⚠️  Could not find VERSION constant in EngineBlox.sol');
  }
  
  if (updated) {
    fs.writeFileSync(engineBloxPath, engineBloxContent, 'utf8');
  }
  
  if (finalTag) {
    console.log(`\n📌 Note: Contract constants use base version ${baseVersion} (pre-release tag ${finalTag} excluded)`);
  }
} else {
  console.warn('⚠️  EngineBlox.sol not found');
}

// Update SDK EngineBlox.tsx VERSION string (same as contract, base version only)
if (fs.existsSync(sdkEngineBloxPath)) {
  let sdkContent = fs.readFileSync(sdkEngineBloxPath, 'utf8');
  const sdkVersionRegex = /(static readonly VERSION: string = )"([^"]*)"/;
  const sdkMatch = sdkContent.match(sdkVersionRegex);
  if (sdkMatch && sdkMatch[2] !== baseVersion) {
    sdkContent = sdkContent.replace(sdkVersionRegex, `$1"${baseVersion}"`);
    fs.writeFileSync(sdkEngineBloxPath, sdkContent, 'utf8');
    console.log(`✅ SDK EngineBlox.tsx VERSION: "${sdkMatch[2]}" → "${baseVersion}"`);
  } else if (sdkMatch) {
    console.log(`✓  SDK EngineBlox.tsx VERSION: "${baseVersion}" (already synced)`);
  } else {
    console.warn('⚠️  Could not find VERSION in SDK EngineBlox.tsx');
  }
} else {
  console.warn('⚠️  SDK EngineBlox.tsx not found');
}

console.log('\n✅ Version sync complete!');
