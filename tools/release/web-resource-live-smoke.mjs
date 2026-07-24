#!/usr/bin/env node

import { spawn } from 'node:child_process';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..');
const liveEnabled = process.env.AIWG_WEB_RESOURCE_LIVE === '1';
const required = process.env.AIWG_WEB_RESOURCE_LIVE_REQUIRED === '1';

function parseArgs(argv) {
  const out = {
    query: 'architecture evolution',
    selector: 'stable',
    expectName: 'architecture-evolution',
  };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--query' && argv[i + 1]) {
      out.query = argv[++i];
    } else if (arg === '--selector' && argv[i + 1]) {
      out.selector = argv[++i];
    } else if (arg === '--expect-name' && argv[i + 1]) {
      out.expectName = argv[++i];
    } else {
      throw new Error(`Unknown or incomplete argument: ${arg}`);
    }
  }
  return out;
}

function runCli(args, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(repoRoot, 'bin', 'aiwg.mjs'), ...args], {
      cwd: repoRoot,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    child.stdout.setEncoding('utf8');
    child.stderr.setEncoding('utf8');
    child.stdout.on('data', (chunk) => { stdout += chunk; });
    child.stderr.on('data', (chunk) => { stderr += chunk; });
    child.once('error', reject);
    child.once('close', (code) => resolve({ code, stdout, stderr }));
  });
}

function expect(condition, message) {
  if (!condition) throw new Error(message);
}

async function main() {
  if (!liveEnabled) {
    const message = 'web-resource live smoke skipped; set AIWG_WEB_RESOURCE_LIVE=1 to run against releases.aiwg.io';
    if (required) throw new Error(message);
    console.log(message);
    return;
  }

  const options = parseArgs(process.argv.slice(2));
  const tempRoot = await mkdtemp(path.join(os.tmpdir(), 'aiwg-web-resource-live-'));
  const cacheRoot = path.join(tempRoot, 'cache');
  const home = path.join(tempRoot, 'home');
  const env = {
    ...process.env,
    HOME: home,
    USERPROFILE: home,
    XDG_CACHE_HOME: path.join(home, '.cache'),
    XDG_CONFIG_HOME: path.join(home, '.config'),
    XDG_DATA_HOME: path.join(home, '.local', 'share'),
    AIWG_ROOT: repoRoot,
    AIWG_RESOURCE_CACHE_ROOT: cacheRoot,
    AIWG_LOG_LEVEL: 'silent',
    NO_UPDATE_NOTIFIER: '1',
  };

  try {
    const baseDiscover = [
      'discover', options.query,
      '--graph', 'framework',
      '--backend', 'fortemi-core',
      '--resource-source', 'web',
      '--aiwg-version', options.selector,
      '--json',
      '--compact',
    ];
    const onlineDiscover = await runCli(baseDiscover, env);
    expect(onlineDiscover.code === 0, `online discover failed:\n${onlineDiscover.stderr || onlineDiscover.stdout}`);
    const online = JSON.parse(onlineDiscover.stdout);
    const first = online.results?.[0];
    expect(online.query?.resource_source === 'web', 'online discover did not use web resource source');
    expect(online.query?.manifest_sha256, 'online discover did not report a manifest digest');
    expect(online.query?.manifest_url?.startsWith('https://releases.aiwg.io/resources/'), 'online discover did not use releases.aiwg.io');
    expect(first?.name === options.expectName, `expected first result ${options.expectName}, got ${first?.name ?? '<none>'}`);

    const offlineDiscover = await runCli([...baseDiscover, '--offline'], env);
    expect(offlineDiscover.code === 0, `offline discover failed:\n${offlineDiscover.stderr || offlineDiscover.stdout}`);
    const offline = JSON.parse(offlineDiscover.stdout);
    expect(offline.query?.resource_source === 'web', 'offline discover did not use web resource source');
    expect(offline.results?.[0]?.id === first.id, 'offline discover first result changed');
    expect(offline.query?.manifest_sha256 === online.query.manifest_sha256, 'offline discover manifest digest changed');

    const baseShow = [
      'show', 'skill', first.id,
      '--graph', 'framework',
      '--backend', 'fortemi-core',
      '--resource-source', 'web',
      '--aiwg-version', options.selector,
    ];
    const onlineShow = await runCli(baseShow, env);
    expect(onlineShow.code === 0, `online show failed:\n${onlineShow.stderr || onlineShow.stdout}`);
    const offlineShow = await runCli([...baseShow, '--offline'], env);
    expect(offlineShow.code === 0, `offline show failed:\n${offlineShow.stderr || offlineShow.stdout}`);
    expect(offlineShow.stdout === onlineShow.stdout, 'offline show output differed from online show output');

    console.log(JSON.stringify({
      status: 'pass',
      selector: options.selector,
      resolvedVersion: online.query.aiwg_version,
      manifestSha256: online.query.manifest_sha256,
      manifestUrl: online.query.manifest_url,
      firstResult: { id: first.id, name: first.name, type: first.type },
      showBytes: Buffer.byteLength(onlineShow.stdout),
    }, null, 2));
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
