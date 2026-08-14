#!/usr/bin/env node

/**
 * Verify that the npm tarball keeps authoritative distribution licensing
 * separate from illustrative license-policy content.
 *
 * Package metadata, the root LICENSE, and SPDX file headers are authoritative.
 * Legal templates may contain example license names and identifiers only when
 * they explicitly declare their own license and mark the example-data region.
 */

import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const packageJson = JSON.parse(readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
const expectedLicense = 'MIT';
const illustrativeTemplatePattern = /\/legal\/templates\/license(?:[-\w]*)?\.md$/i;

function fail(message) {
  console.error(`package-license-boundary: FAILED\n  ${message}`);
  process.exit(1);
}

function parsePackJson(stdout) {
  try {
    return JSON.parse(stdout);
  } catch {
    const arrayStart = stdout.lastIndexOf('\n[');
    if (arrayStart >= 0) return JSON.parse(stdout.slice(arrayStart + 1));
    throw new Error('no JSON array found in npm pack output');
  }
}

if (packageJson.license !== expectedLicense) {
  fail(`package.json must declare ${expectedLicense}; found ${JSON.stringify(packageJson.license)}`);
}

const pack = spawnSync('npm', ['pack', '--dry-run', '--json'], {
  cwd: repoRoot,
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024,
});

if (pack.status !== 0) {
  fail(`npm pack --dry-run --json exited with status ${pack.status}\n${pack.stderr}`);
}

let result;
try {
  result = parsePackJson(pack.stdout);
} catch (error) {
  fail(`could not parse npm pack output: ${error.message}`);
}

const packagedFiles = new Set(result?.[0]?.files?.map((entry) => entry.path) ?? []);
if (!packagedFiles.has('LICENSE')) {
  fail('npm tarball does not contain the authoritative root LICENSE');
}

const illustrativeTemplates = [...packagedFiles]
  .filter((file) => illustrativeTemplatePattern.test(file))
  .sort();

if (illustrativeTemplates.length === 0) {
  fail('npm tarball contains no declared legal license-policy template');
}

for (const file of illustrativeTemplates) {
  const source = readFileSync(path.join(repoRoot, file), 'utf8');
  const header = source.slice(0, 1_500);
  if (!header.includes(`SPDX-License-Identifier: ${expectedLicense}`)) {
    fail(`${file} lacks an authoritative ${expectedLicense} SPDX file header`);
  }
  if (!header.includes('AIWG-License-Role: illustrative-policy-template')) {
    fail(`${file} does not declare its illustrative license-policy role`);
  }

  const start = source.indexOf('<!-- AIWG-Illustrative-License-Data:start -->');
  const end = source.indexOf('<!-- AIWG-Illustrative-License-Data:end -->');
  if (start < 0 || end <= start) {
    fail(`${file} must delimit its illustrative license-data region`);
  }
}

console.log(
  `✓ Package license boundary: ${expectedLicense} metadata + root LICENSE; ` +
  `${illustrativeTemplates.length} illustrative template(s) explicitly classified`,
);
