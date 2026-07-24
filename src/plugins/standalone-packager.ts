// @ts-nocheck
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const NAME = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const PROVIDERS = new Set(['claude', 'codex']);

function inside(parent, candidate) {
  const rel = path.relative(path.resolve(parent), path.resolve(candidate));
  return rel === '' || (rel.length > 0 && !rel.startsWith('..') && !path.isAbsolute(rel));
}

async function validateManifest(wrapperRoot, expectedName, projectRoot) {
  const manifestPath = path.join(wrapperRoot, 'manifest.json');
  const { loadAndValidateManifest } = await import('../extensions/project-local-discovery.js');
  const validation = await loadAndValidateManifest(manifestPath, 'plugin', projectRoot);
  if (!validation.bundle) {
    const details = validation.errors.map(error => {
      const hint = error.hint ? `; ${error.hint}` : '';
      return `${error.field}: expected ${error.expected}, got ${String(error.actual)}${hint}`;
    }).join('\n  - ');
    throw new Error(`Standalone plugin manifest validation failed:\n  - ${details}`);
  }
  const manifest = validation.bundle.manifest;
  if (manifest.id !== expectedName) throw new Error(`Wrapper manifest id '${manifest.id ?? '<missing>'}' does not match requested plugin '${expectedName}'`);
  return { manifest, payloadRoot: validation.bundle.artifactPath };
}

function copyTree(source, destination) {
  fs.mkdirSync(destination, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    const from = path.join(source, entry.name);
    const to = path.join(destination, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Refusing symbolic link in plugin source: ${from}`);
    if (entry.isDirectory()) copyTree(from, to);
    else if (entry.isFile()) fs.copyFileSync(from, to);
  }
}

function writeProviderMetadata(root, provider, manifest) {
  const version = manifest.version ?? '0.0.0';
  const description = manifest.description ?? manifest.name ?? manifest.id;
  if (provider === 'claude') {
    const dir = path.join(root, '.claude-plugin');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'plugin.json'), `${JSON.stringify({
      name: manifest.id,
      version,
      description,
    }, null, 2)}\n`);
  } else {
    const dir = path.join(root, '.codex-plugin');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'plugin.json'), `${JSON.stringify({
      name: manifest.id,
      version,
      description,
    }, null, 2)}\n`);
    fs.writeFileSync(path.join(root, 'marketplace.json'), `${JSON.stringify({
      name: manifest.id,
      plugins: [{ name: manifest.id, source: { source: 'local', path: '.' } }],
    }, null, 2)}\n`);
  }
}

function createDeterministicArchive(sourceDir, archivePath) {
  const result = spawnSync('tar', [
    '--sort=name',
    '--mtime=@0',
    '--owner=0',
    '--group=0',
    '--numeric-owner',
    '-czf',
    archivePath,
    '-C',
    path.dirname(sourceDir),
    path.basename(sourceDir),
  ], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`Could not create deterministic archive: ${result.stderr || 'tar failed'}`);
}

export function resolveStandalonePluginSource({ cwd, name, source }) {
  const projectRoot = path.resolve(cwd);
  const candidate = path.resolve(projectRoot, source ?? path.join('.aiwg', 'plugins', name));
  if (!inside(projectRoot, candidate)) throw new Error('Plugin --source must stay inside the current project');
  if (!fs.existsSync(candidate) || !fs.statSync(candidate).isDirectory()) return null;
  const real = fs.realpathSync(candidate);
  if (!inside(fs.realpathSync(projectRoot), real)) throw new Error('Plugin --source resolves outside the current project through a symlink');
  return real;
}

export async function packageStandalonePlugin(options) {
  const { cwd, name, source, output, dryRun = false, clean = false } = options;
  if (!NAME.test(name)) throw new Error(`Plugin name '${name}' must be kebab-case`);
  const sourceRoot = resolveStandalonePluginSource({ cwd, name, source });
  if (!sourceRoot) return null;
  const { manifest, payloadRoot } = await validateManifest(sourceRoot, name, path.resolve(cwd));
  const providers = options.provider === 'all'
    ? ['claude', 'codex']
    : [options.provider ?? 'claude'];
  for (const provider of providers) {
    if (!PROVIDERS.has(provider)) {
      throw new Error(`Standalone plugin provider '${provider}' is not supported; use claude, codex, or all`);
    }
    const support = manifest.platforms?.[provider];
    if (support === undefined || support === false || support === 'none') {
      throw new Error(`Wrapper manifest does not declare compatible '${provider}' platform support`);
    }
  }
  const outputRoot = path.resolve(cwd, output ?? path.join('dist', 'plugins'));
  const version = manifest.version ?? '0.0.0';
  const plans = providers.map(provider => ({
    provider,
    archivePath: path.join(outputRoot, `${name}-${version}-${provider}.tar.gz`),
  }));
  if (dryRun) return { sourceRoot, payloadRoot, plans, dryRun: true };

  fs.mkdirSync(outputRoot, { recursive: true });
  for (const plan of plans) {
    if (fs.existsSync(plan.archivePath) && !clean) {
      throw new Error(`Package output already exists: ${plan.archivePath}; use --clean or choose another --output`);
    }
    if (clean) fs.rmSync(plan.archivePath, { force: true });
    const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-plugin-package-'));
    try {
      const staged = path.join(tempRoot, name);
      copyTree(sourceRoot, staged);
      writeProviderMetadata(staged, plan.provider, manifest);
      createDeterministicArchive(staged, plan.archivePath);
    } finally {
      fs.rmSync(tempRoot, { recursive: true, force: true });
    }
  }
  return { sourceRoot, payloadRoot, plans, dryRun: false };
}
