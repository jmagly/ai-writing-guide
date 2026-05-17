#!/usr/bin/env node
/**
 * AIWG Update Command
 *
 * Handles channel-aware package updates invoked by `aiwg sync --channel <name>`.
 *
 * Supported channels:
 *   latest   — stable npm release   (npm install -g aiwg)
 *   next     — alpha/beta/RC        (npm install -g aiwg@next)
 *   nightly  — nightly snapshots    (npm install -g aiwg@nightly)
 *   (none)   — stays on current channel, updates in place
 *
 * @issue #669
 */

import { execSync } from 'child_process';
import { importImpl } from '../_resolve-impl.mjs';

const {
  loadConfig,
  switchToNext,
  switchToNightly,
  switchToStable,
} = await importImpl(import.meta.url, 'channel/manager.mjs');

// Parse --channel <value> from argv
function parseChannel(args) {
  const idx = args.indexOf('--channel');
  if (idx === -1 || idx + 1 >= args.length) return null;
  return args[idx + 1];
}

async function runUpdate() {
  const channel = parseChannel(process.argv.slice(2));
  const config = await loadConfig();
  const currentChannel = config.channel || 'stable';

  if (channel) {
    // Channel switch requested
    switch (channel) {
      case 'next':
        await switchToNext();
        break;
      case 'nightly':
        await switchToNightly();
        break;
      case 'latest':
      case 'stable':
        await switchToStable();
        break;
      default:
        console.error(`Unknown channel: ${channel}`);
        console.error('Valid channels: latest, next, nightly');
        process.exit(1);
    }
  } else {
    // In-place update on current channel
    switch (currentChannel) {
      case 'next':
        console.log('Updating aiwg on next channel...');
        try {
          execSync('npm install -g aiwg@next', { stdio: 'inherit' });
          console.log('Update complete.');
        } catch {
          console.error('Update failed. Try: npm install -g aiwg@next');
          process.exit(1);
        }
        break;
      case 'nightly':
        console.log('Updating aiwg on nightly channel...');
        try {
          execSync('npm install -g aiwg@nightly', { stdio: 'inherit' });
          console.log('Update complete.');
        } catch {
          console.error('Update failed. Try: npm install -g aiwg@nightly');
          process.exit(1);
        }
        break;
      case 'stable':
      default:
        console.log('Updating aiwg on stable channel...');
        try {
          execSync('npm update -g aiwg', { stdio: 'inherit' });
          console.log('Update complete.');
        } catch {
          console.error('Update failed. Try: npm update -g aiwg');
          process.exit(1);
        }
        break;
    }
  }
}

runUpdate().catch((err) => {
  console.error('Update error:', err.message);
  process.exit(1);
});
