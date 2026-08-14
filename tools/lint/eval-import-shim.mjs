#!/usr/bin/env node

/**
 * Reject code-generation shims used only to reach dynamic import().
 *
 * Native import() supports both package specifiers and file URLs. Wrapping it
 * in eval()/Function() adds an avoidable code-generation primitive and causes
 * supply-chain scanners to report executable evaluation. This guard scans the
 * executable source trees and, when present, their build outputs.
 */

import { existsSync, readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const roots = [
  'src',
  'tools/ralph-external',
  'apps/web/src',
  'packages',
  'dist',
  'apps/web/dist',
];
const codeExtensions = new Set(['.js', '.mjs', '.cjs', '.ts', '.tsx', '.jsx']);
const forbidden = [
  {
    name: 'Function-constructor import shim',
    pattern: /\b(?:new\s+)?Function\s*\([^\r\n]{0,320}\bimport\s*\(/g,
  },
  {
    name: 'eval import shim',
    pattern: /\beval\s*\([^\r\n]{0,320}\bimport\s*\(/g,
  },
];

function* walk(directory) {
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== 'node_modules') yield* walk(absolute);
    } else if (entry.isFile() && codeExtensions.has(path.extname(entry.name))) {
      yield absolute;
    }
  }
}

const findings = [];
let filesScanned = 0;

for (const relativeRoot of roots) {
  const absoluteRoot = path.join(repoRoot, relativeRoot);
  if (!existsSync(absoluteRoot)) continue;

  for (const file of walk(absoluteRoot)) {
    filesScanned += 1;
    const source = readFileSync(file, 'utf8');
    for (const rule of forbidden) {
      rule.pattern.lastIndex = 0;
      for (const match of source.matchAll(rule.pattern)) {
        const line = source.slice(0, match.index).split('\n').length;
        findings.push({
          rule: rule.name,
          file: path.relative(repoRoot, file),
          line,
        });
      }
    }
  }
}

if (findings.length > 0) {
  console.error('eval-import-shim: FAILED');
  for (const finding of findings) {
    console.error(`  ${finding.file}:${finding.line} — ${finding.rule}`);
  }
  console.error('Use native import() with a literal, resolved file URL, or reviewed bundler annotation.');
  process.exit(1);
}

console.log(`✓ No eval-backed module imports (${filesScanned} executable files scanned)`);
