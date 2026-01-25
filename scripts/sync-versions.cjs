// sync-versions.cjs
// Syncs version from root package.json to all sub-packages

const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..');
const rootPackageJsonPath = path.join(rootDir, 'package.json');
const contractsPackageJsonPath = path.join(rootDir, 'package', 'package.json');
const sdkPackageJsonPath = path.join(rootDir, 'sdk', 'typescript', 'package.json');

console.log('🔄 Syncing package versions...\n');

// Read root package.json
if (!fs.existsSync(rootPackageJsonPath)) {
  console.error('❌ Root package.json not found!');
  process.exit(1);
}

const rootPackageJson = JSON.parse(fs.readFileSync(rootPackageJsonPath, 'utf8'));
const rootVersion = rootPackageJson.version;

if (!rootVersion) {
  console.error('❌ No version found in root package.json!');
  process.exit(1);
}

console.log(`📦 Root version: ${rootVersion}\n`);

// Update contracts package.json
if (fs.existsSync(contractsPackageJsonPath)) {
  const contractsPackageJson = JSON.parse(fs.readFileSync(contractsPackageJsonPath, 'utf8'));
  const oldVersion = contractsPackageJson.version;
  
  if (contractsPackageJson.version !== rootVersion) {
    contractsPackageJson.version = rootVersion;
    fs.writeFileSync(
      contractsPackageJsonPath,
      JSON.stringify(contractsPackageJson, null, 2) + '\n',
      'utf8'
    );
    console.log(`✅ @bloxchain/contracts: ${oldVersion} → ${rootVersion}`);
  } else {
    console.log(`✓  @bloxchain/contracts: ${rootVersion} (already synced)`);
  }
} else {
  console.warn('⚠️  Contracts package.json not found');
}

// Update SDK package.json
if (fs.existsSync(sdkPackageJsonPath)) {
  const sdkPackageJson = JSON.parse(fs.readFileSync(sdkPackageJsonPath, 'utf8'));
  const oldVersion = sdkPackageJson.version;
  
  if (sdkPackageJson.version !== rootVersion) {
    sdkPackageJson.version = rootVersion;
    fs.writeFileSync(
      sdkPackageJsonPath,
      JSON.stringify(sdkPackageJson, null, 2) + '\n',
      'utf8'
    );
    console.log(`✅ @bloxchain/sdk: ${oldVersion} → ${rootVersion}`);
  } else {
    console.log(`✓  @bloxchain/sdk: ${rootVersion} (already synced)`);
  }
} else {
  console.warn('⚠️  SDK package.json not found');
}

console.log('\n✅ Version sync complete!');
