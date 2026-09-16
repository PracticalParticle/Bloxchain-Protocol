/**
 * Public integrator surface — SDK sanity (SPEC-2026-0117).
 *
 * Everything an outside builder touches with only `npm i @bloxchain/sdk viem`:
 * reachable ABIs, exported EIP-712 constants, a read sender that is not
 * `address(0)`, honest error unwrapping, absolute Builder deadlines (duration
 * via `metaTxDeadlineFor`), and the inner-status check that separates "mined"
 * from "worked".
 *
 * **Offline.** No RPC, no deployed contracts, no `.env`. The package-exports
 * suite needs `sdk/typescript/dist` (run `npm run build` there first) because
 * it deliberately resolves through the published `exports` map rather than
 * through relative paths — a relative import would prove nothing about what
 * `npm i` actually ships, which is the whole of R1.
 */

import { runPackageExportTests } from './package-exports-tests.ts';
import { runEip712ExportTests } from './eip712-export-tests.ts';
import { runErrorUnwrapTests } from './error-unwrap-tests.ts';
import { runInnerStatusTests } from './inner-status-tests.ts';
import { runReaderAndDeadlineTests } from './reader-deadline-tests.ts';
import type { SurfaceTestResult } from './package-exports-tests.ts';

type Suite = { key: string; title: string; run: () => Promise<SurfaceTestResult[]> };

const SUITES: Suite[] = [
  { key: 'exports', title: 'R1 — ABI subpath exports', run: runPackageExportTests },
  { key: 'eip712', title: 'R2 — EIP-712 constants', run: runEip712ExportTests },
  { key: 'reader', title: 'R3 / R6 — read sender and absolute deadline', run: runReaderAndDeadlineTests },
  { key: 'errors', title: 'R4 / R5 — error unwrap and signer classification', run: runErrorUnwrapTests },
  { key: 'inner', title: 'R7 — inner transaction status', run: runInnerStatusTests },
];

function printUsage(): void {
  console.log('🔎 Public Integrator Surface SDK Test Runner (SPEC-2026-0117)');
  console.log('='.repeat(60));
  console.log('Usage: tsx run-tests.ts [options]');
  console.log();
  console.log('Options:');
  console.log('  --all        Run every suite (default)');
  for (const s of SUITES) {
    console.log(`  --${s.key.padEnd(10)} ${s.title}`);
  }
  console.log('  --help       Show this message');
  console.log();
  console.log('Runs offline. Requires `npm run build` in sdk/typescript for the exports suite.');
  console.log();
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  if (args.includes('--help') || args.includes('-h')) {
    printUsage();
    return;
  }

  const selected =
    args.length === 0 || args.includes('--all')
      ? SUITES
      : SUITES.filter((s) => args.includes(`--${s.key}`));

  if (selected.length === 0) {
    console.log('❌ No suites selected. Use --help for usage information.');
    process.exit(1);
  }

  console.log('\n🔎 Public Integrator Surface — SDK Sanity (SPEC-2026-0117)');
  console.log('='.repeat(60));

  const all: SurfaceTestResult[] = [];
  const started = Date.now();

  for (const suite of selected) {
    console.log(`\n▶ ${suite.title}`);
    try {
      const results = await suite.run();
      all.push(...results);
    } catch (e: any) {
      console.error(`  ❌ suite "${suite.key}" threw: ${e?.stack ?? e?.message ?? String(e)}`);
      all.push({ name: `${suite.key} suite`, passed: false, detail: e?.message ?? String(e) });
    }
  }

  const failed = all.filter((r) => !r.passed);
  const duration = ((Date.now() - started) / 1000).toFixed(2);

  console.log(`\n${'='.repeat(60)}`);
  console.log('📊 Public Surface Summary');
  console.log('='.repeat(60));
  console.log(`Checks:  ${all.length}`);
  console.log(`✅ Passed: ${all.length - failed.length}`);
  console.log(`❌ Failed: ${failed.length}`);
  console.log(`⏱️  Duration: ${duration}s`);

  if (failed.length > 0) {
    console.log('\nFailures:');
    for (const f of failed) {
      console.log(`  • ${f.name}${f.detail ? ` — ${f.detail}` : ''}`);
    }
    console.log('='.repeat(60));
    process.exit(1);
  }

  console.log('\n🎉 Public integrator surface intact.');
  console.log('='.repeat(60));
}

main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
