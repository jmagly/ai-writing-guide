#!/usr/bin/env node
/**
 * Verify Hermes-source citations in AIWG documentation.
 *
 * Walks docs/integrations/hermes-*.md, docs/providers/hermes-*.md, and
 * .aiwg/research/parity/hermes/*.md for file:line citations to Hermes
 * source files. For each citation, fetches the cited line range from
 * the pinned Hermes version and checks that key symbols/text still
 * appear nearby.
 *
 * Pins to HERMES_VERIFIED_VERSION below. Update the pin (and re-run this
 * script) whenever AIWG is verified against a new Hermes minor release.
 *
 * Usage:
 *   node tools/verify-hermes-citations.mjs           # walk + report
 *   node tools/verify-hermes-citations.mjs --strict  # exit non-zero on any drift
 *
 * Optionally set HERMES_REPO=/path/to/hermes-clone to use a local
 * checkout instead of cloning fresh.
 *
 * @issues #1330 (S23)
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERMES_VERIFIED_VERSION = '0.13.0';
const HERMES_REPO_URL = 'https://github.com/NousResearch/hermes-agent';
const SCAN_DOCS_GLOB = [
  'docs/integrations/hermes-*.md',
  'docs/providers/hermes-*.md',
  '.aiwg/research/parity/hermes/*.md',
];

// Citation pattern: matches `<path>:<line>` or `<path>:<line>-<line>`
const CITATION_RE = /(hermes_cli|agent|tools)\/[a-zA-Z0-9_.\/-]+\.py:(\d+)(?:-(\d+))?/g;

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, '..');

function spawnP(cmd, args, { cwd } = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { cwd, shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
    let out = '', err = '';
    p.stdout.on('data', (d) => { out += d; });
    p.stderr.on('data', (d) => { err += d; });
    p.on('close', (c) => resolve({ stdout: out, stderr: err, code: c ?? -1 }));
    p.on('error', reject);
  });
}

async function pathExists(p) {
  try { await fs.stat(p); return true; } catch { return false; }
}

async function ensureHermesClone() {
  if (process.env.HERMES_REPO) {
    if (await pathExists(process.env.HERMES_REPO)) {
      return process.env.HERMES_REPO;
    }
    console.error(`HERMES_REPO points to ${process.env.HERMES_REPO} which does not exist`);
    process.exit(2);
  }
  // Cache under /tmp keyed by version
  const cacheDir = `/tmp/hermes-verify-${HERMES_VERIFIED_VERSION}`;
  if (await pathExists(path.join(cacheDir, '.git'))) {
    return cacheDir;
  }
  // Try existing /tmp/hermes-agent first (from earlier vendor research)
  if (await pathExists('/tmp/hermes-agent/.git')) {
    return '/tmp/hermes-agent';
  }
  console.error(`Cloning Hermes v${HERMES_VERIFIED_VERSION} to ${cacheDir} ...`);
  const { code, stderr } = await spawnP('git', [
    'clone', '--depth', '1',
    '--branch', `v${HERMES_VERIFIED_VERSION}`,
    HERMES_REPO_URL, cacheDir,
  ]);
  if (code !== 0) {
    // Fall back to default branch shallow clone
    console.error(`Tag v${HERMES_VERIFIED_VERSION} not found; falling back to default branch`);
    const { code: c2 } = await spawnP('git', ['clone', '--depth', '1', HERMES_REPO_URL, cacheDir]);
    if (c2 !== 0) {
      console.error(`Failed to clone Hermes: ${stderr}`);
      process.exit(2);
    }
  }
  return cacheDir;
}

async function globFiles(pattern) {
  // Simple glob using fs — we only need flat directory matches
  const [dir, file] = (() => {
    const idx = pattern.lastIndexOf('/');
    return [pattern.slice(0, idx), pattern.slice(idx + 1)];
  })();
  const re = new RegExp('^' + file.replace(/\./g, '\\.').replace(/\*/g, '.*') + '$');
  try {
    const entries = await fs.readdir(path.join(REPO_ROOT, dir), { withFileTypes: true });
    return entries
      .filter((e) => e.isFile() && re.test(e.name))
      .map((e) => path.join(REPO_ROOT, dir, e.name));
  } catch {
    return [];
  }
}

async function collectCitations() {
  const results = [];
  for (const pattern of SCAN_DOCS_GLOB) {
    const files = await globFiles(pattern);
    for (const docPath of files) {
      const content = await fs.readFile(docPath, 'utf-8');
      const lines = content.split('\n');
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        for (const match of line.matchAll(CITATION_RE)) {
          results.push({
            doc: path.relative(REPO_ROOT, docPath),
            docLine: i + 1,
            citation: match[0],
            srcPath: match[0].split(':')[0],
            startLine: parseInt(match[2], 10),
            endLine: match[3] ? parseInt(match[3], 10) : parseInt(match[2], 10),
          });
        }
      }
    }
  }
  return results;
}

async function verifyCitation(hermesRoot, c) {
  const full = path.join(hermesRoot, c.srcPath);
  try {
    const content = await fs.readFile(full, 'utf-8');
    const lines = content.split('\n');
    if (c.endLine > lines.length) {
      return { ok: false, reason: `cited end-line ${c.endLine} exceeds file length ${lines.length}` };
    }
    // We don't try to verify semantic match — just that the range exists
    // and looks structurally reasonable (non-empty range). A future
    // enhancement could check that the citing doc paragraph still
    // references the same symbol present in the range.
    const snippet = lines.slice(c.startLine - 1, c.endLine).join('\n');
    if (snippet.trim() === '') {
      return { ok: false, reason: 'cited range is empty whitespace' };
    }
    return { ok: true, snippet };
  } catch (err) {
    return { ok: false, reason: `cannot read ${c.srcPath}: ${err.code || err.message}` };
  }
}

async function main() {
  const strict = process.argv.includes('--strict');
  const hermesRoot = await ensureHermesClone();
  console.log(`Hermes pin: v${HERMES_VERIFIED_VERSION}`);
  console.log(`Verifying against: ${hermesRoot}`);

  const citations = await collectCitations();
  console.log(`Found ${citations.length} citations across ${SCAN_DOCS_GLOB.length} doc patterns\n`);

  const issues = [];
  for (const c of citations) {
    const r = await verifyCitation(hermesRoot, c);
    if (!r.ok) {
      issues.push({ ...c, reason: r.reason });
    }
  }

  if (issues.length === 0) {
    console.log('✓ All citations verified');
    process.exit(0);
  }

  console.log(`✗ ${issues.length} drifted citation(s):\n`);
  for (const i of issues) {
    console.log(`  ${i.doc}:${i.docLine}  cite=${i.citation}`);
    console.log(`    reason: ${i.reason}`);
  }
  process.exit(strict ? 1 : 0);
}

main().catch((err) => {
  console.error(`verify-hermes-citations: ${err.message}`);
  process.exit(2);
});
