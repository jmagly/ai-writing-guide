#!/usr/bin/env node
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const prebuiltDir = path.join(repoRoot, 'prebuilt', 'fortemi-core', 'framework');
const exportRel = 'prebuilt/fortemi-core/framework/aiwg-fortemi-index-v2.json';
const manifestRel = 'prebuilt/fortemi-core/framework/manifest.json';
const exportPath = path.join(repoRoot, exportRel);
const manifestPath = path.join(repoRoot, manifestRel);

function fail(message) {
  console.error(`✗ ${message}`);
  process.exit(1);
}

function sha256(text) {
  return createHash('sha256').update(text).digest('hex');
}

function parseNpmPackJson(stdout) {
  try {
    return JSON.parse(stdout);
  } catch {
    const start = stdout.lastIndexOf('\n[');
    if (start >= 0) return JSON.parse(stdout.slice(start + 1));
    const first = stdout.indexOf('[');
    if (first >= 0) return JSON.parse(stdout.slice(first));
    throw new Error('no JSON array found in npm pack output');
  }
}

const pack = spawnSync('npm', ['pack', '--dry-run', '--json'], {
  cwd: repoRoot,
  encoding: 'utf8',
  maxBuffer: 64 * 1024 * 1024,
});
if (pack.status !== 0) {
  console.error(pack.stdout);
  console.error(pack.stderr);
  fail(`npm pack --dry-run --json exited with status ${pack.status}`);
}

let packJson;
try {
  packJson = parseNpmPackJson(pack.stdout);
} catch (err) {
  fail(`could not parse npm pack JSON output: ${err.message}`);
}

const files = new Set(packJson?.[0]?.files?.map((file) => file.path) ?? []);
if (!files.has(exportRel)) fail(`${exportRel} is missing from npm package`);
if (!files.has(manifestRel)) fail(`${manifestRel} is missing from npm package`);

if (!existsSync(prebuiltDir)) {
  fail('prebuilt Fortemi Core framework directory is missing after npm pack prepack');
}
if (!existsSync(exportPath)) fail(`${exportRel} is missing`);
if (!existsSync(manifestPath)) fail(`${manifestRel} is missing`);

const exportText = readFileSync(exportPath, 'utf8');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const exported = JSON.parse(exportText);
// The optional graph-pattern capability and scoped Markdown-link edge metadata
// add discoverable corpus structure. Keep a tight, explicit package budget
// while accommodating reviewed index growth (#2126-#2134, #147).
const maxExportBytes = Number.parseInt(process.env.AIWG_FORTEMI_PREBUILT_MAX_BYTES ?? '12250000', 10);

if (manifest.schema_version !== 'aiwg.fortemi.prebuilt.v1') {
  fail(`manifest schema_version is ${manifest.schema_version}`);
}
if (Buffer.byteLength(exportText, 'utf8') > maxExportBytes) {
  fail(`${exportRel} is ${Buffer.byteLength(exportText, 'utf8')} bytes, above ${maxExportBytes}`);
}
if (manifest.backend !== 'fortemi-core') fail(`manifest backend is ${manifest.backend}`);
if (manifest.graph !== 'framework') fail(`manifest graph is ${manifest.graph}`);
if (manifest.export_schema_version !== 'aiwg.fortemi.index.export.v2') {
  fail(`manifest export_schema_version is ${manifest.export_schema_version}`);
}
if (manifest.export_checksum !== sha256(exportText)) {
  fail('manifest checksum does not match aiwg-fortemi-index-v2.json');
}
if (exported.schema_version !== 'aiwg.fortemi.index.export.v2') {
  fail(`export schema_version is ${exported.schema_version}`);
}
if (exported.source?.graph !== 'framework') fail(`export source.graph is ${exported.source?.graph}`);
if (!Array.isArray(exported.items) || exported.items.length === 0) {
  fail('export contains no items');
}
if (exported.items.some((item) => Array.isArray(item.chunks) && item.chunks.length > 0)) {
  fail('prebuilt framework export must not include chunk payloads; package fallback is metadata/capability-only');
}
const maxSearchBodyBytes = Number.parseInt(process.env.AIWG_FORTEMI_PREBUILT_MAX_BODY_BYTES ?? '4096', 10);
const oversizedBody = exported.items.find((item) =>
  Buffer.byteLength(item.search?.body ?? '', 'utf8') > maxSearchBodyBytes
);
if (oversizedBody) {
  fail(`prebuilt search body for ${oversizedBody.source?.path ?? oversizedBody.id} exceeds ${maxSearchBodyBytes} bytes`);
}
if (manifest.item_count !== exported.items.length) {
  fail(`manifest item_count ${manifest.item_count} does not match export item count ${exported.items.length}`);
}

const tmp = mkdtempSync(path.join(os.tmpdir(), 'aiwg-fortemi-prebuilt-gate-'));
try {
  const discover = spawnSync(
    process.execPath,
    [
      'bin/aiwg.mjs',
      'index',
      'discover',
      'campaign intake',
      '--graph',
      'framework',
      '--backend',
      'fortemi-core',
      '--limit',
      '3',
      '--json',
    ],
    {
      cwd: repoRoot,
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
      env: {
        ...process.env,
        XDG_DATA_HOME: path.join(tmp, 'xdg'),
        AIWG_ROOT: repoRoot,
      },
    },
  );
  if (discover.status !== 0) {
    console.error(discover.stdout);
    console.error(discover.stderr);
    fail(`Fortemi Core prebuilt fallback discovery exited with status ${discover.status}`);
  }
  const result = JSON.parse(discover.stdout);
  const metadataMatches = [];
  for (const entry of result.results ?? []) {
    if (entry.type !== 'skill' || typeof entry.id !== 'string') continue;
    const show = spawnSync(
      process.execPath,
      ['bin/aiwg.mjs', 'show', 'metadata', entry.id, '--graph', 'framework', '--backend', 'fortemi-core', '--json'],
      {
        cwd: repoRoot,
        encoding: 'utf8',
        maxBuffer: 16 * 1024 * 1024,
        env: {
          ...process.env,
          XDG_DATA_HOME: path.join(tmp, 'xdg'),
          AIWG_ROOT: repoRoot,
        },
      },
    );
    if (show.status !== 0) {
      console.error(show.stdout);
      console.error(show.stderr);
      fail(`Fortemi Core prebuilt fallback metadata lookup exited with status ${show.status}`);
    }
    metadataMatches.push(JSON.parse(show.stdout));
  }
  const hit = metadataMatches.some((entry) =>
    entry.paths?.indexed?.includes('agentic/code/frameworks/media-marketing-kit/skills/intake-start-campaign/SKILL.md') &&
    entry.type === 'skill'
  );
  if (!hit) {
    fail('Fortemi Core prebuilt fallback discovery did not return intake-start-campaign for "campaign intake"');
  }

  const packOut = spawnSync('npm', ['pack', '--json', '--pack-destination', tmp], {
    cwd: repoRoot,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (packOut.status !== 0) {
    console.error(packOut.stdout);
    console.error(packOut.stderr);
    fail(`npm pack --pack-destination exited with status ${packOut.status}`);
  }
  const packed = parseNpmPackJson(packOut.stdout)?.[0];
  const tarball = packed?.filename ? path.join(tmp, packed.filename) : undefined;
  if (!tarball || !existsSync(tarball)) fail('npm pack did not produce a tarball for packed-install smoke');

  const installDir = path.join(tmp, 'install');
  // @fortemi/core is a first-party runtime dependency for Fortemi discovery.
  // The release-age override is scoped to this packed-install smoke so the
  // gate verifies production packaging even while the dependency is inside
  // the normal seven-day freshness window.
  const install = spawnSync('npm', ['install', '--omit=dev', '--min-release-age=0', '--prefix', installDir, tarball], {
    cwd: tmp,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  });
  if (install.status !== 0) {
    console.error(install.stdout);
    console.error(install.stderr);
    fail(`packed production install exited with status ${install.status}`);
  }
  const installedCli = path.join(installDir, 'node_modules', 'aiwg', 'bin', 'aiwg.mjs');
  const installedDiscover = spawnSync(
    process.execPath,
    [installedCli, 'discover', 'test', '--limit', '1', '--json'],
    {
      cwd: tmp,
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
      env: {
        ...process.env,
        XDG_DATA_HOME: path.join(tmp, 'xdg-installed'),
        AIWG_ROOT: path.join(installDir, 'node_modules', 'aiwg'),
      },
    },
  );
  if (installedDiscover.status !== 0) {
    console.error(installedDiscover.stdout);
    console.error(installedDiscover.stderr);
    fail(`packed production install discover smoke exited with status ${installedDiscover.status}`);
  }
  if (installedDiscover.stderr.includes("Cannot find package '@fortemi/core'")) {
    fail('packed production install is missing @fortemi/core at runtime');
  }

  const installedRoot = path.join(installDir, 'node_modules', 'aiwg');
  const installedDoctor = spawnSync(
    process.execPath,
    [path.join(installedRoot, 'tools', 'cli', 'doctor.mjs'), '--no-budget-check'],
    {
      cwd: tmp,
      encoding: 'utf8',
      maxBuffer: 16 * 1024 * 1024,
      env: {
        ...process.env,
        XDG_DATA_HOME: path.join(tmp, 'xdg-doctor'),
        AIWG_ROOT: installedRoot,
      },
    },
  );
  const doctorOutput = `${installedDoctor.stdout}\n${installedDoctor.stderr}`;
  if (
    doctorOutput.includes('ERR_MODULE_NOT_FOUND') ||
    doctorOutput.includes('Cannot find module') ||
    doctorOutput.includes('Cannot find package')
  ) {
    console.error(installedDoctor.stdout);
    console.error(installedDoctor.stderr);
    fail(`packed production install doctor import smoke hit module resolution failure (status ${installedDoctor.status})`);
  }
} finally {
  rmSync(tmp, { recursive: true, force: true });
}

console.log(`✓ Fortemi Core prebuilt framework index package gate passed (${exported.items.length} items)`);
