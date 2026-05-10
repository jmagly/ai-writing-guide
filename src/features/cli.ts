/**
 * `aiwg features` CLI subcommands
 *
 * Cycle 1 scope (#1219): status / info only. Install / remove deferred
 * to Cycle 3 because the install path needs install-mode detection
 * (repo dev vs global npm vs plugin marketplace) which has its own
 * design surface.
 */

import { FEATURE_CATALOG } from './catalog.js';
import { getFeatureStatus, getAllFeatureStatuses, formatStatusLine, type FeatureStatus } from './status.js';

export async function main(args: string[]): Promise<void> {
  // If the first arg is a flag (e.g. `--json`), treat the implicit
  // subcommand as `status` and pass everything through. This makes
  // `aiwg features --json` Just Work.
  const firstIsFlag = args[0]?.startsWith('--');
  const subcommand = firstIsFlag ? 'status' : (args[0] ?? 'status');
  const subArgs = firstIsFlag ? args : args.slice(1);

  switch (subcommand) {
    case 'status':
    case 'list':
      await handleStatus(subArgs);
      break;

    case 'info':
      await handleInfo(subArgs);
      break;

    case 'install':
    case 'remove':
      console.error(`Error: \`aiwg features ${subcommand}\` not yet implemented (#1219 Cycle 3).`);
      console.error('');
      console.error('To install manually for now:');
      console.error('  cd <aiwg install root>');
      console.error('  npm install <packages>     # see `aiwg features info <name>` for the package list');
      process.exit(1);
      break;

    case 'help':
    case '--help':
    case '-h':
      printHelp();
      break;

    default:
      console.error(`Error: unknown subcommand '${subcommand}'`);
      console.error('');
      printHelp();
      process.exit(1);
  }
}

function printHelp(): void {
  console.log('Usage: aiwg features [subcommand] [options]');
  console.log('');
  console.log('Subcommands:');
  console.log('  status        Show install status of every optional feature (default)');
  console.log('  info <name>   Show detailed info on one feature');
  console.log('  install       Not yet implemented (#1219 Cycle 3)');
  console.log('  remove        Not yet implemented (#1219 Cycle 3)');
  console.log('  help          Show this help');
  console.log('');
  console.log('Options:');
  console.log('  --json        Emit machine-readable output');
  console.log('');
  console.log('Examples:');
  console.log('  aiwg features                       # status table');
  console.log('  aiwg features --json                # JSON status');
  console.log('  aiwg features info embeddings       # what does this feature enable');
  console.log('');
  console.log('Available features:');
  for (const f of FEATURE_CATALOG) {
    console.log(`  ${f.name.padEnd(12)} — ${f.description}`);
  }
}

async function handleStatus(args: string[]): Promise<void> {
  const json = args.includes('--json');
  const statuses = await getAllFeatureStatuses();

  if (json) {
    console.log(JSON.stringify({
      features: statuses.map(s => ({
        name: s.feature.name,
        available: s.available,
        missing: s.missing,
        packages: s.packages.map(p => ({
          name: p.name,
          installed: p.installed,
          version: p.version,
        })),
      })),
      total: statuses.length,
      available: statuses.filter(s => s.available).length,
      missing: statuses.filter(s => !s.available).length,
    }, null, 2));
    return;
  }

  console.log('AIWG Optional Features');
  console.log('======================');
  console.log('');
  for (const status of statuses) {
    console.log(formatStatusLine(status));
  }
  console.log('');
  const available = statuses.filter(s => s.available).length;
  console.log(`Total: ${statuses.length}  Available: ${available}  Missing: ${statuses.length - available}`);
  console.log('');
  console.log('Run `aiwg features info <name>` for details on any feature.');
}

async function handleInfo(args: string[]): Promise<void> {
  const json = args.includes('--json');
  const positional = args.filter(a => !a.startsWith('--'));
  const name = positional[0];

  if (!name) {
    console.error('Error: feature name required.');
    console.error('');
    console.error('Available features:');
    for (const f of FEATURE_CATALOG) {
      console.error(`  ${f.name}`);
    }
    process.exit(1);
  }

  const status = await getFeatureStatus(name);
  if (!status) {
    console.error(`Error: unknown feature '${name}'.`);
    console.error('');
    console.error('Available features:');
    for (const f of FEATURE_CATALOG) {
      console.error(`  ${f.name}`);
    }
    process.exit(1);
  }

  if (json) {
    console.log(JSON.stringify({
      name: status.feature.name,
      description: status.feature.description,
      enables: status.feature.enables,
      cost: status.feature.cost,
      available: status.available,
      missing: status.missing,
      packages: status.packages.map(p => ({
        name: p.name,
        installed: p.installed,
        version: p.version,
      })),
    }, null, 2));
    return;
  }

  printFeatureInfo(status);
}

function printFeatureInfo(status: FeatureStatus): void {
  const f = status.feature;
  console.log(`Feature: ${f.name}`);
  console.log(`Status:  ${status.available ? 'INSTALLED' : 'NOT INSTALLED'}`);
  console.log('');
  console.log(`Description: ${f.description}`);
  console.log('');
  console.log('Enables:');
  for (const cap of f.enables) {
    console.log(`  - ${cap}`);
  }
  console.log('');
  console.log(`Install cost: ${f.cost}`);
  console.log('');
  console.log('Packages:');
  for (const p of status.packages) {
    const mark = p.installed ? 'OK' : '-';
    const version = p.version ? ` ${p.version}` : '';
    console.log(`  ${mark} ${p.name}${version}`);
  }
  console.log('');
  if (!status.available) {
    console.log('To install:');
    console.log(`  aiwg features install ${f.name}    # not yet implemented (#1219 Cycle 3)`);
    console.log('');
    console.log('Manual install:');
    const pkgList = f.packages.join(' ');
    console.log(`  cd <aiwg install root> && npm install ${pkgList}`);
  }
}
