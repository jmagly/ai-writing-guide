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

function readJson(filename, label) {
  try {
    return JSON.parse(fs.readFileSync(filename, 'utf8'));
  } catch (error) {
    throw new Error(`${label} is missing or malformed at ${filename}: ${error.message}`);
  }
}

function validateManifest(wrapperRoot, expectedName) {
  const manifest = readJson(path.join(wrapperRoot, 'manifest.json'), 'Wrapper manifest');
  if (manifest.type !== 'plugin') throw new Error(`Wrapper manifest type must be 'plugin' (got '${manifest.type ?? '<missing>'}')`);
  if (manifest.id !== expectedName) throw new Error(`Wrapper manifest id '${manifest.id ?? '<missing>'}' does not match requested plugin '${expectedName}'`);
  if (!NAME.test(manifest.id)) throw new Error(`Plugin id '${manifest.id}' must be kebab-case`);
  const plugin = manifest.pluginConfig;
  if (!plugin || !['addon', 'extension', 'framework'].includes(plugin.payloadType)) {
    throw new Error('Wrapper manifest pluginConfig.payloadType must be addon, extension, or framework');
  }
  if (typeof plugin.payloadPath !== 'string' || path.isAbsolute(plugin.payloadPath) || plugin.payloadPath.split(/[\\/]/).includes('..')) {
    throw new Error('Wrapper manifest pluginConfig.payloadPath must be a traversal-safe relative path');
  }
  const payloadRoot = path.resolve(wrapperRoot, plugin.payloadPath);
  if (!inside(wrapperRoot, payloadRoot)) throw new Error('pluginConfig.payloadPath escapes the wrapper root');
  const wrapperReal = fs.realpathSync(wrapperRoot);
  let payloadReal;
  try {
    payloadReal = fs.realpathSync(payloadRoot);
  } catch {
    throw new Error(`Plugin payload path does not exist: ${plugin.payloadPath}`);
  }
  if (!inside(wrapperReal, payloadReal)) throw new Error('pluginConfig.payloadPath resolves outside the wrapper through a symlink');
  if (!fs.statSync(payloadReal).isDirectory()) throw new Error('pluginConfig.payloadPath must resolve to a directory');
  const payload = readJson(path.join(payloadReal, 'manifest.json'), 'Payload manifest');
  if (payload.type !== plugin.payloadType) {
    throw new Error(`Payload manifest type '${payload.type ?? '<missing>'}' does not match pluginConfig.payloadType '${plugin.payloadType}'`);
  }
  if (typeof payload.id !== 'string' || !NAME.test(payload.id)) throw new Error('Payload manifest requires a kebab-case id');
  return { manifest, payloadRoot: payloadReal };
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

export function packageStandalonePlugin(options) {
  const { cwd, name, source, output, dryRun = false, clean = false } = options;
  if (!NAME.test(name)) throw new Error(`Plugin name '${name}' must be kebab-case`);
  const sourceRoot = resolveStandalonePluginSource({ cwd, name, source });
  if (!sourceRoot) return null;
  const { manifest, payloadRoot } = validateManifest(sourceRoot, name);
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
