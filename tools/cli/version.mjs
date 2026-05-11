#!/usr/bin/env node
/**
 * AIWG Version Script
 *
 * Outputs version and channel information.
 * Called by `aiwg sync` (step 2) to record the current version before updating.
 *
 * @issue #685
 */

// Import from dist/ (see tools/cli/doctor.mjs for the rationale — npm
// package ships dist/, not src/).
import { getVersionInfo } from '../../dist/src/channel/manager.mjs';

const args = process.argv.slice(2);
const json = args.includes('--json');

try {
  const info = await getVersionInfo();
  const channelLabel = info.channel !== 'stable' ? ` [${info.channel}]` : '';

  if (json) {
    console.log(JSON.stringify({
      version: info.version,
      channel: info.channel,
      packageRoot: info.packageRoot,
      devMode: info.devMode,
    }));
  } else {
    console.log(`  ${info.version}${channelLabel}`);
    console.log(`  path: ${info.packageRoot}`);
  }
} catch (err) {
  if (json) {
    console.log(JSON.stringify({ error: err.message }));
  } else {
    console.error(`Version check failed: ${err.message}`);
  }
  process.exit(1);
}
