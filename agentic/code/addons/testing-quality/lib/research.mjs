import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { artifact, addonRoot, digest, validateContract } from './contracts.mjs';
import { readBounded } from './workspace.mjs';

const LIMITS = Object.freeze({ roots: 16, entries: 4000, files: 1000, fileBytes: 131072, totalBytes: 2097152, matches: 20, snippetChars: 360, depth: 10 });
const SKIP = new Set(['node_modules', '.git', 'dist', 'build', 'coverage', '.venv', 'venv', 'target', 'bin', 'obj', '__pycache__']);
const inside = (root, candidate) => candidate === root || candidate.startsWith(root + path.sep);

async function observeManifest(root, recommendation) {
  if (!recommendation.installedManifest) return { installedVersion: null, status: 'not-verified', basis: 'No nonexecuting installed-manifest probe defined for this tool.' };
  try {
    const { data, hash } = await readBounded(root, recommendation.installedManifest, 131072);
    const pkg = JSON.parse(data.toString('utf8'));
    if (pkg.name !== recommendation.packageName || typeof pkg.version !== 'string' || !pkg.version.trim()) throw new Error('Installed package identity/version missing or mismatched');
    return { installedVersion: pkg.version, status: 'manifest-observed-not-executed', path: recommendation.installedManifest, hash };
  } catch (error) {
    return { installedVersion: null, status: error.code === 'ENOENT' ? 'not-installed-at-inspected-path' : 'not-verified', path: recommendation.installedManifest, reason: error.message };
  }
}

/** Bounded data search. Never invokes a target runner, package manager, shell or web request. */
export async function researchRecommendations(root, protocol, { query = 'test discovery coverage mutation oracle isolation' } = {}) {
  await validateContract(protocol, 'conformance-protocol.v1');
  root = await fs.realpath(root);
  if (typeof query !== 'string' || !query.trim() || query.length > 512) throw new Error('Research query must be a nonempty string of at most 512 characters');
  const terms = [...new Set(query.toLowerCase().match(/[\p{L}\p{N}_-]{2,}/gu) || [])].slice(0, 24);
  if (!terms.length) throw new Error('Research query needs searchable words');
  const registry = JSON.parse(await fs.readFile(path.join(addonRoot, 'research/tool-recommendations.json'), 'utf8'));
  const principles = JSON.parse(await fs.readFile(path.join(addonRoot, 'research/principles.json'), 'utf8')).principles;
  const selected = registry.recommendations.filter(r => r.platform === protocol.spec.platform);
  if (!selected.length) throw new Error(`Unknown research platform: ${protocol.spec.platform}`);
  const recommendations = [];
  for (const r of selected) recommendations.push({ ...r, observation: await observeManifest(root, r) });
  const configured = protocol.spec.research.paths;
  const diagnostics = [], searches = [], matches = [];
  const counts = { entries: 0, files: 0, bytes: 0 };
  const visitedFiles = new Set();
  let bounded = false;
  if (configured.length > LIMITS.roots) { diagnostics.push({ code: 'ROOT_LIMIT', message: `Only first ${LIMITS.roots} configured roots searched` }); bounded = true; }
  for (const configuredPath of configured.slice(0, LIMITS.roots)) {
    const expanded = configuredPath === '~' ? os.homedir() : configuredPath.startsWith('~/') ? path.join(os.homedir(), configuredPath.slice(2)) : configuredPath;
    const resolved = path.resolve(root, expanded);
    const search = { configuredPath, resolvedPath: resolved, status: 'complete', matched: 0 };
    searches.push(search);
    if (counts.entries >= LIMITS.entries || counts.files >= LIMITS.files || counts.bytes >= LIMITS.totalBytes) { search.status = 'bounded'; bounded = true; continue; }
    try {
      const info = await fs.lstat(resolved);
      if (info.isSymbolicLink()) throw new Error('Configured corpus symlinks are not followed');
      if (!info.isDirectory() && !info.isFile()) throw new Error('Corpus root is not a regular directory or file');
      const base = info.isDirectory() ? await fs.realpath(resolved) : path.dirname(await fs.realpath(resolved));
      const queue = [{ file: resolved, depth: 0 }];
      while (queue.length) {
        if (counts.entries >= LIMITS.entries || counts.files >= LIMITS.files || counts.bytes >= LIMITS.totalBytes) { bounded = true; search.status = 'bounded'; break; }
        const item = queue.shift(); counts.entries++;
        const info = await fs.lstat(item.file);
        if (info.isSymbolicLink()) { diagnostics.push({ code: 'SYMLINK_SKIPPED', path: item.file }); continue; }
        const actual = await fs.realpath(item.file);
        if (!inside(base, actual)) { diagnostics.push({ code: 'OUTSIDE_CORPUS', path: item.file }); continue; }
        if (info.isDirectory()) {
          if (item.depth >= LIMITS.depth) { bounded = true; search.status = 'bounded'; continue; }
          const handle = await fs.opendir(actual);
          for await (const entry of handle) {
            if (SKIP.has(entry.name) || entry.isSymbolicLink()) continue;
            if (counts.entries + queue.length >= LIMITS.entries) { bounded = true; search.status = 'bounded'; break; }
            queue.push({ file: path.join(actual, entry.name), depth: item.depth + 1 });
          }
          continue;
        }
        if (!info.isFile() || !/\.(?:md|txt|json)$/i.test(actual) || visitedFiles.has(actual)) continue;
        visitedFiles.add(actual); counts.files++;
        if (info.size > LIMITS.fileBytes || counts.bytes + info.size > LIMITS.totalBytes) { diagnostics.push({ code: 'FILE_LIMIT', path: actual, bytes: info.size }); bounded = true; search.status = 'bounded'; continue; }
        const file = await fs.open(actual, 'r');
        let data;
        try {
          const buffer = Buffer.alloc(LIMITS.fileBytes + 1);
          const { bytesRead } = await file.read(buffer, 0, buffer.length, 0);
          if (bytesRead > LIMITS.fileBytes || counts.bytes + bytesRead > LIMITS.totalBytes) { bounded = true; search.status = 'bounded'; continue; }
          data = buffer.subarray(0, bytesRead);
        } finally { await file.close(); }
        counts.bytes += data.length;
        let text;
        try { text = new TextDecoder('utf-8', { fatal: true }).decode(data); } catch { diagnostics.push({ code: 'NON_UTF8', path: actual }); continue; }
        const lower = text.toLowerCase();
        const matchedTerms = terms.filter(t => lower.includes(t));
        if (!matchedTerms.length) continue;
        const at = Math.min(...matchedTerms.map(t => lower.indexOf(t)));
        const start = Math.max(0, at - 60);
        const snippet = text.slice(start, start + LIMITS.snippetChars);
        search.matched++;
        matches.push({ path: actual, hash: digest(data), matchedTerms, score: matchedTerms.length, line: text.slice(0, at).split('\n').length, snippet, authority: 'retrieved-content-unreviewed' });
        matches.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path));
        if (matches.length > LIMITS.matches) matches.pop();
      }
    } catch (error) {
      search.status = 'unavailable'; search.reason = error.message;
      diagnostics.push({ code: error.code === 'ENOENT' ? 'CORPUS_MISSING' : 'CORPUS_UNAVAILABLE', path: resolved, message: error.message });
    }
  }
  return artifact('TestConformanceResearch', { platform: protocol.spec.platform, query, terms, searches, matches, limits: LIMITS, counts, bounded, diagnostics, recommendations, principles, web: { allowedByProtocol: protocol.spec.research.allowWeb, performed: false, status: 'suggested-primary-links-only' }, executedCommands: [], installedDependencies: [], status: 'recommendations-not-conformance-proof' }, { name: `${protocol.metadata.name}-research` });
}
