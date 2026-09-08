import fs from 'node:fs/promises';
import path from 'node:path';
import { addonRoot, API_VERSION, validateContract } from './contracts.mjs';
import { readBounded } from './workspace.mjs';

const IDS = ['javascript-vitest', 'javascript-jest', 'javascript-node', 'python-pytest', 'go', 'rust-cargo', 'java-junit', 'dotnet-vstest', 'generic'];
const SKIP = new Set(['node_modules', '.git', '.aiwg', 'dist', 'build', 'coverage', '.venv', 'venv', 'target', 'bin', 'obj', '__pycache__']);
const MAX_ENTRIES = 20000;
const MAX_DEPTH = 8;

/** Shipped data only. A profile is a researched scaffold, never compatibility proof. */
export async function listProfiles() {
  const profiles = [];
  for (const id of IDS) {
    const profile = JSON.parse(await fs.readFile(path.join(addonRoot, 'profiles', `${id}.json`), 'utf8'));
    if (profile.id !== id || profile.schemaVersion !== 1) throw new Error(`Invalid bundled profile: ${id}`);
    await validateContract({ apiVersion: API_VERSION, kind: 'TestConformanceProtocol', metadata: { name: id }, spec: profile.protocolSpec }, 'conformance-protocol.v1');
    profiles.push(profile);
  }
  return profiles;
}

/** Static manifest/config inspection only: no imports, subprocesses, plugin loading or installs. */
export async function detectProfiles(root) {
  root = await fs.realpath(root);
  const candidates = [];
  const add = (profileId, manifestPath, reason) => {
    if (!candidates.some(c => c.profileId === profileId && c.manifestPath === manifestPath)) candidates.push({ profileId, manifestPath, reason, authority: 'static-manifest-candidate', compatibility: 'not-verified' });
  };
  const queue = [{ dir: '', depth: 0 }];
  let inspected = 0;
  while (queue.length) {
    const { dir, depth } = queue.shift();
    const handle = await fs.opendir(path.join(root, dir));
    for await (const entry of handle) {
      if (++inspected > MAX_ENTRIES) throw new Error(`Platform detection exceeds ${MAX_ENTRIES} entries; select a narrower target root or explicit platform`);
      if (entry.isSymbolicLink()) continue;
      const relative = dir ? `${dir}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        if (!SKIP.has(entry.name)) {
          if (depth >= MAX_DEPTH) throw new Error(`Platform detection exceeds depth ${MAX_DEPTH}; select a narrower root or explicit platform`);
          queue.push({ dir: relative, depth: depth + 1 });
        }
        continue;
      }
      if (!entry.isFile()) continue;
      const name = entry.name;
      if (/^vitest\.config\.[cm]?[jt]s$/.test(name)) add('javascript-vitest', relative, 'Vitest-named configuration; content was not evaluated');
      if (/^jest\.config\.[cm]?[jt]s$/.test(name)) add('javascript-jest', relative, 'Jest-named configuration; content was not evaluated');
      if (name === 'go.mod') add('go', relative, 'Go module manifest; test discovery and toolchain compatibility are unverified');
      if (name === 'Cargo.toml') add('rust-cargo', relative, 'Cargo manifest; targets, features and test harness are unverified');
      if (name === 'pom.xml') add('java-junit', relative, 'Maven manifest; actual JUnit engines and report routing must be verified');
      if (!['package.json', 'pyproject.toml', 'pytest.ini', 'setup.cfg', 'tox.ini'].includes(name) && !/^requirements[^/]*\.txt$/.test(name) && !name.endsWith('.csproj')) continue;
      const { data } = await readBounded(root, relative, 1024 * 1024);
      const text = data.toString('utf8');
      if (name === 'package.json') {
        let pkg;
        try { pkg = JSON.parse(text); } catch { throw new Error(`Cannot inspect malformed manifest: ${relative}`); }
        const deps = { ...pkg.dependencies, ...pkg.devDependencies, ...pkg.optionalDependencies };
        const scripts = Object.values(pkg.scripts || {}).filter(s => typeof s === 'string').join('\n');
        if (deps.vitest || /(?:^|[\s/])vitest(?:\s|$)/m.test(scripts)) add('javascript-vitest', relative, 'Vitest dependency or script declaration; installed version not verified');
        if (deps.jest || pkg.jest || /(?:^|[\s/])jest(?:\s|$)/m.test(scripts)) add('javascript-jest', relative, 'Jest dependency, configuration or script declaration; installed version not verified');
        if (/\bnode\b[^\n;&|]*\s--test(?:\s|=|$)/m.test(scripts)) add('javascript-node', relative, 'Script declares node --test; source API and actual selected files unverified');
      } else if (name.endsWith('.csproj')) {
        if (/Microsoft\.NET\.Test\.Sdk|xunit\.runner\.visualstudio|MSTest\.TestAdapter|NUnit3TestAdapter/.test(text)) add('dotnet-vstest', relative, 'VSTest adapter/test-SDK reference; verify runner and target frameworks');
        // MTP-only projects deliberately do not imply VSTest compatibility.
      } else if (name === 'pytest.ini' || /\bpytest\b/.test(text)) add('python-pytest', relative, 'pytest configuration/dependency reference; selected Python environment unverified');
    }
  }
  return candidates.sort((a, b) => a.profileId.localeCompare(b.profileId) || a.manifestPath.localeCompare(b.manifestPath));
}

export async function createProtocol(root, { platform = 'auto', system, name } = {}) {
  const profiles = await listProfiles();
  root = await fs.realpath(root);
  let selected = platform;
  if (platform === 'auto') {
    const candidates = await detectProfiles(root);
    const ids = [...new Set(candidates.map(c => c.profileId))];
    if (ids.length > 1) {
      const error = new Error(`Ambiguous platforms: ${ids.join(', ')}. Select an explicit platform and review its scope.`);
      error.code = 'AMBIGUOUS_PLATFORM'; error.candidates = candidates; throw error;
    }
    selected = ids[0] || 'generic';
  }
  const profile = profiles.find(p => p.id === selected);
  if (!profile) throw new Error(`Unknown platform ${String(selected)}; choose one of ${IDS.join(', ')}`);
  const spec = structuredClone(profile.protocolSpec);
  const runnerPackage = { 'javascript-vitest': 'vitest', 'javascript-jest': 'jest' }[selected];
  if (runnerPackage) {
    const manifestPath = `node_modules/${runnerPackage}/package.json`;
    try {
      const { data } = await readBounded(root, manifestPath, 131072);
      const installed = JSON.parse(data.toString('utf8'));
      if (installed.name === runnerPackage && typeof installed.version === 'string' && installed.version.trim()) {
        spec.configFiles = [...new Set([...(spec.configFiles || []), manifestPath])];
      }
    } catch { /* Missing, external symlink or malformed installed metadata is not a verified version. */ }
  }

  if (system !== undefined) spec.system = system;
  const protocol = { apiVersion: API_VERSION, kind: 'TestConformanceProtocol', metadata: { name: name ?? `${path.basename(root)}-test-conformance`, description: `Unqualified scaffold. ${profile.assumptions.join(' ')}` }, spec };
  return validateContract(protocol, 'conformance-protocol.v1');
}
