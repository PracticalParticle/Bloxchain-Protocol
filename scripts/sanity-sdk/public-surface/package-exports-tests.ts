/**
 * R1 — ABI subpath exports.
 *
 * Resolves the package the way an outside integrator does: through the
 * `exports` map of the built package, not through a relative path into the
 * source tree. A relative import proves nothing about what `npm i` ships — the
 * whole point of R1 is that `sdk/typescript/abi/CopyBlox.abi.json` existed on
 * disk all along and was still unreachable.
 *
 * Needs `npm run build` in `sdk/typescript` first; the suite says so if `dist`
 * is missing rather than reporting a false failure.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SDK_ROOT = path.resolve(__dirname, '../../../sdk/typescript');

export interface SurfaceTestResult {
  name: string;
  passed: boolean;
  detail?: string;
}

/**
 * Build a throwaway consumer package whose `node_modules/@bloxchain/sdk` points
 * at the built SDK, plus a probe module that lives *inside* it.
 *
 * The probe matters: bare specifiers resolve relative to the importing module's
 * own location, so the imports have to happen from a file in the consumer
 * directory. Doing it from here would resolve against this repo instead and
 * prove nothing. The probe is ESM and uses dynamic `import()`, which is how an
 * integrator reaches an ESM-only package — `createRequire().resolve` would fail
 * on any `exports` entry that declares only an `import` condition, which is a
 * fact about CommonJS, not about whether the subpath is reachable.
 *
 * The consumer is created **beside the SDK**, not in the OS temp directory: on
 * Windows the temp directory is usually on `C:` while a checkout may be on
 * another drive, and a cross-volume junction is a reparse point Node's `lstat`
 * refuses with `UNKNOWN`. Same volume, and the link behaves like the one npm
 * itself creates.
 */
function makeConsumer(): { dir: string; probeUrl: string; cleanup: () => void } {
  const dir = fs.mkdtempSync(path.join(path.dirname(SDK_ROOT), '.sdk-export-probe-'));
  const scope = path.join(dir, 'node_modules', '@bloxchain');
  fs.mkdirSync(scope, { recursive: true });
  const link = path.join(scope, 'sdk');
  // 'junction' works on Windows without elevation and behaves like a dir symlink.
  fs.symlinkSync(SDK_ROOT, link, 'junction');
  fs.writeFileSync(
    path.join(dir, 'package.json'),
    JSON.stringify({ name: 'sdk-export-probe', private: true, type: 'module' }, null, 2)
  );

  const probePath = path.join(dir, 'probe.mjs');
  fs.writeFileSync(
    probePath,
    [
      '// Resolves bare specifiers from this directory, through the SDK exports map.',
      'export async function load(specifier) {',
      '  return import(specifier);',
      '}',
      'export async function loadJson(specifier) {',
      "  return (await import(specifier, { with: { type: 'json' } })).default;",
      '}',
      '',
    ].join('\n')
  );

  return {
    dir,
    probeUrl: pathToFileURL(probePath).href,
    cleanup: () => {
      // Remove the junction itself first: a recursive delete would otherwise
      // walk into the real SDK directory.
      try {
        fs.unlinkSync(link);
      } catch {
        try {
          fs.rmdirSync(link);
        } catch {
          /* already gone */
        }
      }
      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch {
        /* a leftover probe dir is not a test failure */
      }
    },
  };
}

export async function runPackageExportTests(): Promise<SurfaceTestResult[]> {
  const results: SurfaceTestResult[] = [];
  const add = (name: string, passed: boolean, detail?: string) => {
    results.push({ name, passed, detail });
    console.log(`  ${passed ? '✅' : '❌'} ${name}${detail ? ` — ${detail}` : ''}`);
  };

  if (!fs.existsSync(path.join(SDK_ROOT, 'dist', 'index.js'))) {
    add('sdk is built', false, 'sdk/typescript/dist missing — run `npm run build` in sdk/typescript');
    return results;
  }

  const consumer = makeConsumer();
  const probe = await import(consumer.probeUrl);
  const importAsConsumer = (specifier: string) => probe.load(specifier);

  try {
    // AC1 — the per-contract subpath an integrator reaches for first.
    try {
      const mod = await importAsConsumer('@bloxchain/sdk/abi/CopyBlox');
      const abi = mod.copyBloxAbi as Array<{ type?: string; name?: string }>;
      const hasCloneBlox = abi.some((i) => i.type === 'function' && i.name === 'cloneBlox');
      add(
        "import '@bloxchain/sdk/abi/CopyBlox' resolves",
        Array.isArray(abi) && abi.length > 0,
        `${abi.length} ABI entries`
      );
      add('CopyBlox ABI exposes cloneBlox (the fragment Branch Zero transcribed)', hasCloneBlox);
    } catch (e: any) {
      add("import '@bloxchain/sdk/abi/CopyBlox' resolves", false, e?.message ?? String(e));
    }

    // The other two names R1 calls out by name.
    for (const [specifier, named] of [
      ['@bloxchain/sdk/abi/AccountBlox', 'accountBloxAbi'],
      ['@bloxchain/sdk/abi/ERC20', 'erc20MinimalAbi'],
    ] as const) {
      try {
        const mod = await importAsConsumer(specifier);
        const val = mod[named];
        add(`import '${specifier}' exposes ${named}`, Array.isArray(val) && val.length > 0);
      } catch (e: any) {
        add(`import '${specifier}' exposes ${named}`, false, e?.message ?? String(e));
      }
    }

    // The typed barrel, and the runtime-keyed record.
    try {
      const barrel = await importAsConsumer('@bloxchain/sdk/abi');
      const names = Object.keys(barrel.ABIS ?? {});
      const wanted = ['CopyBlox', 'AccountBlox', 'ERC20', 'GuardController', 'RuntimeRBAC', 'SecureOwnable'];
      const missing = wanted.filter((n) => !names.includes(n));
      add(
        "barrel '@bloxchain/sdk/abi' exposes ABIS",
        missing.length === 0,
        missing.length ? `missing ${missing.join(', ')}` : `${names.length} contracts`
      );
      add(
        'ALL_ERROR_ABI collects every custom error',
        Array.isArray(barrel.ALL_ERROR_ABI) && barrel.ALL_ERROR_ABI.length >= 60,
        `${barrel.ALL_ERROR_ABI?.length ?? 0} error entries`
      );
    } catch (e: any) {
      add("barrel '@bloxchain/sdk/abi' exposes ABIS", false, e?.message ?? String(e));
    }

    // Raw JSON subpath — the literal form the retrospective reported as blocked.
    try {
      const json = await probe.loadJson('@bloxchain/sdk/abi/CopyBlox.abi.json');
      add(
        "import '@bloxchain/sdk/abi/CopyBlox.abi.json' resolves",
        Array.isArray(json) && json.length > 0,
        `${json.length} entries`
      );
    } catch (e: any) {
      add("import '@bloxchain/sdk/abi/CopyBlox.abi.json' resolves", false, e?.message ?? String(e));
    }

    // R2 — the EIP-712 constants must be reachable from the package root.
    try {
      const root = await importAsConsumer('@bloxchain/sdk');
      const wanted = [
        'META_TX_DOMAIN',
        'META_TX_TYPES',
        'META_TX_TYPED_DATA_TYPES_AS_SIGNED',
        'buildTypedDataMessage',
        'buildMetaTxTypedData',
        'metaTxDeadlineFor',
        'explainError',
        'assertInnerSuccess',
        'waitForTransactionAndAssertInner',
      ];
      const missing = wanted.filter((n) => root[n] === undefined);
      add(
        'package root exports the integrator surface',
        missing.length === 0,
        missing.length ? `missing ${missing.join(', ')}` : `${wanted.length} names`
      );
    } catch (e: any) {
      add('package root exports the integrator surface', false, e?.message ?? String(e));
    }
  } finally {
    consumer.cleanup();
  }

  return results;
}
