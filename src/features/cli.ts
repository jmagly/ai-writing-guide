/**
 * `aiwg features` CLI subcommands
 *
 * Native packages are installed into a user-owned feature root. Its generated
 * package manifest contains exact package-level allowScripts approvals, so the
 * operator does not need to weaken npm policy globally.
 */

import { FEATURE_CATALOG } from './catalog.js';
import { getFeatureStatus, getAllFeatureStatuses, formatStatusLine, type FeatureStatus } from './status.js';
import { installFeature } from './installer.js';

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
      await handleInstall(subArgs);
      break;

    case 'remove':
      console.error(`Error: \`aiwg features ${subcommand}\` not yet implemented (#1219 Cycle 3).`);
      console.error('');
      console.error('No files were changed. Feature removal must use a future AIWG CLI release.');
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
  console.log('  install <name> Install a feature with scoped lifecycle-script approval');
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
  console.log('  aiwg features install pty            # explicitly build node-pty');
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
          loadable: p.loadable,
          error: p.error,
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
        loadable: p.loadable,
        error: p.error,
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
    const mark = p.installed && p.loadable ? 'OK' : (p.installed ? '!' : '-');
    const version = p.version ? ` ${p.version}` : '';
    const error = p.error ? ` — ${p.error}` : '';
    console.log(`  ${mark} ${p.name}${version}${error}`);
  }
  console.log('');
  if (!status.available) {
    console.log('To install:');
    console.log(`  aiwg features install ${f.name}`);
  }
}

async function handleInstall(args: string[]): Promise<void> {
  const name = args.find(arg => !arg.startsWith('--'));
  if (!name) throw new Error('Feature name required. Run `aiwg features` to list features.');
  const feature = FEATURE_CATALOG.find(candidate => candidate.name === name);
  if (!feature) throw new Error(`Unknown feature '${name}'.`);

  console.log(`Installing optional feature: ${name}`);
  if ((feature.scriptPackages?.length ?? 0) > 0) {
    console.log(`Approved lifecycle scripts: ${feature.scriptPackages!.join(', ')}`);
    console.log('Approval is stored only in the AIWG user feature manifest.');
  }
  const root = await installFeature(name);
  const status = await getFeatureStatus(name);
  if (!status?.available) {
    throw new Error(`Feature ${name} was installed but failed its runtime load check. Run \`aiwg doctor\` for details.`);
  }
  console.log(`Feature ${name} is ready (${root}).`);
}
