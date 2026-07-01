#!/usr/bin/env node
import { execFileSync } from 'node:child_process';

const forbiddenPrefixes = [
  'coverage/',
  'dist/',
  'build/',
  'node_modules/',
  'test-output/',
  'test-results/',
  '.agents/',
  '.claude/',
  '.codex/',
  '.cursor/',
  '.factory/',
  '.opencode/',
  '.warp/',
  '.windsurf/',
  '.hermes/',
  '.devin/',
  '.aiwg/.index/',
  '.aiwg/.storage-cache/',
  '.rlm-prep/',
];

const forbiddenFiles = new Set([
  'opencode.json',
  '.hermes.md',
  'tenants.json',
]);

const allowPrefixes = [
  // Tracked static docs assets. See docs/generated-output-policy.md.
  'docs/.public/',
];

function gitLsFiles() {
  return execFileSync('git', ['ls-files'], { encoding: 'utf8' })
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

const violations = gitLsFiles().filter((file) => {
  if (allowPrefixes.some((prefix) => file.startsWith(prefix))) return false;
  if (forbiddenFiles.has(file)) return true;
  return forbiddenPrefixes.some((prefix) => file === prefix.slice(0, -1) || file.startsWith(prefix));
});

if (violations.length) {
  console.error('[tracked-generated-artifacts] Generated/cache/provider outputs are tracked:');
  for (const file of violations) console.error(`  - ${file}`);
  console.error('\nMove the file to canonical source, add a documented allowlist entry, or stop tracking it.');
  process.exit(1);
}

console.log('[tracked-generated-artifacts] OK — no tracked generated/cache/provider output paths found');
