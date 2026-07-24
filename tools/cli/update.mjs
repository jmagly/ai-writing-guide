#!/usr/bin/env node
/**
 * AIWG Update Command
 *
 * Handles channel-aware package updates invoked by `aiwg sync --channel <name>`.
 *
 * Supported channels: latest/stable, next, and nightly. With no explicit
 * channel, the service preserves the configured channel.
 *
 * @issue #669
 */

import { importImpl } from '../_resolve-impl.mjs';

const {
  loadConfig,
} = await importImpl(import.meta.url, 'channel/manager.mjs');
const { updateInstallation } = await importImpl(import.meta.url, 'update/service.mjs');

// Parse --channel <value> from argv
function parseChannel(args) {
  const idx = args.indexOf('--channel');
  if (idx === -1 || idx + 1 >= args.length) return null;
  return args[idx + 1];
}

async function runUpdate() {
  const channel = parseChannel(process.argv.slice(2));
  const config = await loadConfig();
  if (channel && !['latest', 'stable', 'next', 'nightly'].includes(channel)) {
    console.error(`Unknown channel: ${channel}`);
    console.error('Valid channels: latest, stable, next, nightly');
    process.exit(1);
  }
  const result = await updateInstallation({
    config,
    channel: channel === 'latest' ? 'stable' : channel ?? config.channel,
    offline: process.argv.includes('--offline'),
  });
  console.log(result.message);
  if (result.status === 'unsupported-offline') process.exitCode = 2;
}

runUpdate().catch((err) => {
  console.error('Update error:', err.message);
  process.exit(1);
});
