#!/usr/bin/env node

import { resolve } from 'node:path';
import { parseArgs } from 'node:util';
import {
  loadAffectedPackagesCsv,
  parseAffectedPackagesCsv,
  resolveAffectedPackagesSource,
  scanAffectedLockfile,
  scanAffectedManifest,
} from './lib/affected-packages.js';

const { values: args } = parseArgs({
  options: {
    'affected-packages-csv': { type: 'string' },
    manifest: { type: 'string', default: 'package.json' },
    lockfile: { type: 'string', default: 'package-lock.json' },
    quiet: { type: 'boolean', default: false },
    help: { type: 'boolean', default: false },
  },
});

if (args.help) {
  console.log(`Usage: node tools/lint/affected-packages.mjs [options]

Options:
  --affected-packages-csv <path|url>  Local CSV path or raw URL source
  --manifest <path>                   Path to package.json (default: package.json)
  --lockfile <path>                   Path to package-lock.json (default: package-lock.json)
  --quiet                             Suppress success output (failures still print)
  --help                              Show this help

Environment:
  AIWG_AFFECTED_PACKAGES_CSV          Alternate source for the CSV feed

The scanner accepts the canonical local path
  /mnt/ops/users/roctinam/Downloads/22-packages.csv
and raw gist URLs intended for CI automation.
`);
  process.exit(0);
}

async function main() {
  const cwd = process.cwd();
  const manifestPath = resolve(cwd, args.manifest);
  const lockfilePath = resolve(cwd, args.lockfile);
  const source = resolveAffectedPackagesSource(
    args['affected-packages-csv'],
    process.env.AIWG_AFFECTED_PACKAGES_CSV,
  );

  if (!source) {
    console.error('✗ No affected-package CSV source configured');
    console.error('  Set --affected-packages-csv <path|url> or AIWG_AFFECTED_PACKAGES_CSV.');
    process.exit(2);
  }

  let csvPayload;
  let feed;
  try {
    csvPayload = await loadAffectedPackagesCsv(source);
    feed = parseAffectedPackagesCsv(csvPayload.text, csvPayload.sourceLabel);
  } catch (err) {
    console.error(`✗ ${err.message}`);
    process.exit(2);
  }

  let manifestResult;
  let lockfileResult;
  try {
    manifestResult = scanAffectedManifest(manifestPath, feed);
    lockfileResult = scanAffectedLockfile(lockfilePath, feed);
  } catch (err) {
    console.error(`✗ Scan failed: ${err.message}`);
    process.exit(2);
  }

  const allMatches = [...manifestResult.matches, ...lockfileResult.matches];
  if (allMatches.length > 0) {
    console.error(`✗ Known affected package match: ${allMatches.length} hit${allMatches.length === 1 ? '' : 's'}`);
    console.error('');
    for (const match of allMatches) {
      console.error(`  ${match.location}`);
      console.error(`    package: ${match.name}@${match.version}`);
      console.error(`    feed source: ${csvPayload.sourceLabel}`);
      console.error(`    published: ${renderIsoRange(match.record.firstPublished, match.record.lastPublished)}`);
      console.error(`    detected: ${renderIsoRange(match.record.firstDetected, match.record.lastDetected)}`);
      console.error(`    csv rows: ${match.record.rowNumbers.join(', ')}`);
      console.error('    fix: remove or upgrade the package, then rotate any secrets exposed where it ran');
      console.error('');
    }
    reportSkipped(feed.skippedEcosystems);
    process.exit(1);
  }

  if (!args.quiet) {
    const lockNote = lockfileResult.present
      ? `, ${args.lockfile} (${lockfileResult.scanned} locked entries)`
      : `, ${args.lockfile} (not present, skipped)`;
    console.log('✓ Known affected package scan: 0 hits');
    console.log(
      `  scanned: ${args.manifest} (${manifestResult.scanned} manifest entries)${lockNote}`,
    );
    console.log(
      `  feed: ${csvPayload.sourceLabel} (${feed.records.size} deduped npm rows, ${feed.duplicateRows} duplicate row${feed.duplicateRows === 1 ? '' : 's'})`,
    );
    reportSkipped(feed.skippedEcosystems, console.log);
  }
}

function renderIsoRange(first, last) {
  return first === last ? first : `${first} .. ${last}`;
}

function reportSkipped(skippedEcosystems, writer = console.error) {
  if (skippedEcosystems.size === 0) return;
  const summary = Array.from(skippedEcosystems.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([ecosystem, count]) => `${ecosystem}=${count}`)
    .join(', ');
  writer(`  skipped non-npm rows: ${summary}`);
}

await main();
