// official-catalog.cjs
// Shape of official-deployed-addresses.json shared by promote and validate, so the two
// cannot drift (SPEC-2026-0118 R2, SPEC-2026-0137).
//
// A network has one of two postures:
//
//   legacy   The pre-CreateX shape: foundation libraries + AccountBlox + CopyBlox. This is
//            what historical Sepolia carried before SPEC-2026-0137.
//
//   createx  The CreateX same-address catalog: foundation libraries + BasicAccount +
//            BasicFactory, each deployed through CreateX `deployCreate2` with a permissioned
//            salt (deployer | 0x00 | entropy), so the address depends on the deployer, the
//            salt and the init code, never on the chain. BasicFactory -> BasicAccount is the
//            official mint. A network that used to be legacy keeps its AccountBlox / CopyBlox
//            rows (and the libraries they link against, as Legacy* rows) with status
//            "deprecated": they stay on chain for developers already pointed at them, and
//            are never the Platform default.
//
// The posture is read from `network.catalog.rail`; promote sets it from the CreateX metadata
// the Inventory deploy script writes into deployed-addresses.json.

const LIBRARIES = [
  'EngineBlox',
  'SecureOwnableDefinitions',
  'RuntimeRBACDefinitions',
  'GuardControllerDefinitions',
];

/** Every contract either posture can promote. */
const CONTRACTS = {
  EngineBlox: { kind: 'library', linkTime: true },
  SecureOwnableDefinitions: { kind: 'definition-library', linkTime: true },
  RuntimeRBACDefinitions: { kind: 'definition-library', linkTime: true },
  GuardControllerDefinitions: { kind: 'definition-library', linkTime: true },
  BasicAccount: { kind: 'template' },
  BasicFactory: { kind: 'factory' },
  AccountBlox: { kind: 'template' },
  CopyBlox: { kind: 'factory' },
};

const POSTURES = {
  legacy: {
    required: [...LIBRARIES, 'AccountBlox', 'CopyBlox'],
  },
  createx: {
    required: [...LIBRARIES, 'BasicAccount', 'BasicFactory'],
    /** Rows a formerly-legacy network keeps, all `deprecated`. */
    legacy: ['AccountBlox', 'CopyBlox'],
  },
};

/** Old libraries move to `Legacy<Name>` when the catalog replaces them on the same network. */
const LEGACY_LIBRARY_PREFIX = 'Legacy';

/**
 * CreateX, called and never vendored (AGPL). The runtime code hash is the pin published in
 * the CreateX README; the deploy script refuses a chain whose CreateX does not match it.
 */
const CREATEX = {
  address: '0xba5ed099633d3b313e4d5f7bdc1305d3c28ba5ed',
  runtimeCodeHash: '0xbd8a7ea8cfca7b4e5f5041d7d4b17bc317c5ce42cfbc42066a00cf26b43eb53f',
};

/** EIP-7825 per-transaction gas cap; every public network in the catalog enforces it. */
const MAX_TX_GAS = 16777216;

function postureOf(network) {
  return network && network.catalog && network.catalog.rail === 'createx' ? 'createx' : 'legacy';
}

function isBytes32(value) {
  return typeof value === 'string' && /^0x[0-9a-fA-F]{64}$/.test(value);
}

/**
 * Where CreateX `deployCreate2(salt, initCode)` puts a contract when `deployer` sends it.
 *
 * Only the permissioned, no-chainid salt shape is accepted: the first 20 bytes are the
 * deployer and the 21st byte is 0x00. CreateX then guards the salt as
 * `keccak256(abi.encode(deployer, salt))` and deploys with CREATE2 from its own address.
 * No `block.chainid` goes in, which is what makes the address match across networks.
 */
function predictCreateXAddress({ deployer, salt, initCodeHash }) {
  const { encodeAbiParameters, getContractAddress, keccak256 } = require('viem');
  const saltError = createXSaltError(salt, deployer);
  if (saltError) throw new Error(saltError);
  if (!isBytes32(initCodeHash)) throw new Error(`initCodeHash ${JSON.stringify(initCodeHash)} is not 32 bytes`);
  const guardedSalt = keccak256(
    encodeAbiParameters([{ type: 'address' }, { type: 'bytes32' }], [deployer, salt])
  );
  return getContractAddress({
    opcode: 'CREATE2',
    from: CREATEX.address,
    salt: guardedSalt,
    bytecodeHash: initCodeHash,
  }).toLowerCase();
}

/** Null when `salt` is a permissioned, no-chainid CreateX salt for `deployer`; else why not. */
function createXSaltError(salt, deployer) {
  if (!isBytes32(salt)) return `salt ${JSON.stringify(salt)} is not 32 bytes`;
  if (typeof deployer !== 'string' || !/^0x[0-9a-fA-F]{40}$/.test(deployer)) {
    return `deployer ${JSON.stringify(deployer)} is not an address`;
  }
  if (salt.slice(2, 42).toLowerCase() !== deployer.slice(2).toLowerCase()) {
    return `salt does not start with the deployer ${deployer} (permissioned salt required)`;
  }
  if (salt.slice(42, 44) !== '00') {
    return `salt byte 21 is 0x${salt.slice(42, 44)}, expected 0x00 (no chainid guard)`;
  }
  return null;
}

module.exports = {
  CONTRACTS,
  CREATEX,
  LEGACY_LIBRARY_PREFIX,
  LIBRARIES,
  MAX_TX_GAS,
  POSTURES,
  createXSaltError,
  isBytes32,
  postureOf,
  predictCreateXAddress,
};
