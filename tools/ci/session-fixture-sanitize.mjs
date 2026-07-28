#!/usr/bin/env node

import {
  lstatSync, readFileSync, readdirSync,
} from 'node:fs';
import { createHash } from 'node:crypto';
import {
  dirname, relative, resolve, sep,
} from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
export const SESSION_REGRESSION_CORPUS = resolve(
  root,
  'test/fixtures/sessions/regression-v1',
);

const RULES = [
  ['PRIVATE_KEY', /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g],
  ['AWS_ACCESS_KEY', /\bAKIA[0-9A-Z]{16}\b/g],
  ['GITHUB_TOKEN', /\bgh[pousr]_[A-Za-z0-9]{36,}\b/g],
  ['GITLAB_TOKEN', /\bglpat-[A-Za-z0-9_-]{20,}\b/g],
  ['OPENAI_TOKEN', /\bsk-[A-Za-z0-9_-]{20,}\b/g],
  ['SLACK_TOKEN', /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/g],
  ['BEARER_TOKEN', /\bBearer\s+[A-Za-z0-9._~+/-]{20,}={0,2}\b/g],
  ['JWT', /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g],
  [
    'SECRET_ASSIGNMENT',
    /\b(?:password|passwd|secret|api[_-]?key|access[_-]?token|refresh[_-]?token)\b\s*[:=]\s*["']?[A-Za-z0-9._~+/-]{8,}/gi,
  ],
  ['POSIX_PERSONAL_PATH', /\/(?:home|Users)\/(?!synthetic(?:\/|$))[^/\s"']+/g],
  ['WINDOWS_PERSONAL_PATH', /\b[A-Za-z]:\\Users\\(?!synthetic(?:\\|$))[^\\\s"']+/g],
  ['HOST_IDENTIFIER', /"(?:hostId|host_id|machineId|machine_id|deviceId|device_id)"\s*:/gi],
  ['LOCAL_OPERATOR_ID', /\broctinam\b/gi],
];

export function scanSessionFixtureText(file, content) {
  const findings = [];
  for (const [ruleId, expression] of RULES) {
    expression.lastIndex = 0;
    for (let match = expression.exec(content); match; match = expression.exec(content)) {
      findings.push(finding(file, ruleId, content, match.index));
      if (match[0].length === 0) expression.lastIndex += 1;
    }
  }
  const emails = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi;
  for (let match = emails.exec(content); match; match = emails.exec(content)) {
    if (!match[0].toLowerCase().endsWith('@example.test')) {
      findings.push(finding(file, 'NON_RESERVED_EMAIL', content, match.index));
    }
  }
  return findings;
}

export function scanSessionRegressionCorpus(corpusRoot = SESSION_REGRESSION_CORPUS) {
  const manifestPath = resolve(corpusRoot, 'manifest.json');
  const findings = [];
  let manifest;
  try {
    manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
  } catch {
    return {
      corpusId: null,
      filesScanned: 0,
      findings: [{ file: 'manifest.json', ruleId: 'MANIFEST_INVALID', line: 1, column: 1 }],
    };
  }

  const entries = allFiles(corpusRoot);
  for (const path of entries) {
    const file = relative(corpusRoot, path).split(sep).join('/');
    const stat = lstatSync(path);
    if (stat.isSymbolicLink() || !stat.isFile()) {
      findings.push({ file, ruleId: 'NON_REGULAR_FILE', line: 1, column: 1 });
      continue;
    }
    findings.push(...scanSessionFixtureText(file, readFileSync(path, 'utf8')));
  }
  findings.push(...validateManifest(corpusRoot, manifest, entries));
  return {
    corpusId: typeof manifest.corpusId === 'string' ? manifest.corpusId : null,
    filesScanned: entries.length,
    findings: findings.sort((left, right) =>
      left.file.localeCompare(right.file)
      || left.line - right.line
      || left.column - right.column
      || left.ruleId.localeCompare(right.ruleId)),
  };
}

function validateManifest(corpusRoot, manifest, entries) {
  const findings = [];
  const invalid = (ruleId) => findings.push({
    file: 'manifest.json', ruleId, line: 1, column: 1,
  });
  if (manifest.schemaVersion !== '1.0.0'
    || manifest.corpusId !== 'aiwg-session-regression-v1'
    || manifest.classification !== 'synthetic-structural') {
    invalid('MANIFEST_CONTRACT');
  }
  const provenance = manifest.provenance ?? {};
  for (const field of [
    'containsPrivateHistory',
    'containsPromptContent',
    'containsCredentials',
    'containsHostIdentifiers',
    'containsPersonalPaths',
  ]) {
    if (provenance[field] !== false) invalid('PROVENANCE_BOUNDARY');
  }

  const declared = [
    ...(Array.isArray(manifest.files) ? manifest.files : []),
    ...(Array.isArray(manifest.documents) ? manifest.documents : []),
  ];
  const declaredPaths = new Set();
  const providers = new Map();
  for (const entry of declared) {
    if (!entry || typeof entry.path !== 'string'
      || entry.path.startsWith('/')
      || entry.path.split('/').includes('..')) {
      invalid('MANIFEST_PATH');
      continue;
    }
    const path = resolve(corpusRoot, entry.path);
    if (!within(corpusRoot, path)) {
      invalid('MANIFEST_PATH');
      continue;
    }
    declaredPaths.add(entry.path);
    try {
      const stat = lstatSync(path);
      if (!stat.isFile() || stat.isSymbolicLink()) {
        findings.push({ file: entry.path, ruleId: 'NON_REGULAR_FILE', line: 1, column: 1 });
        continue;
      }
      const digest = createHash('sha256').update(readFileSync(path)).digest('hex');
      if (digest !== entry.sha256) {
        findings.push({ file: entry.path, ruleId: 'DIGEST_MISMATCH', line: 1, column: 1 });
      }
    } catch {
      findings.push({ file: entry.path, ruleId: 'DECLARED_FILE_MISSING', line: 1, column: 1 });
    }
    if (entry.provider) {
      if (!entry.schemaFamily || !entry.schemaVersion || !entry.providerVersion
        || !Array.isArray(entry.regressions) || entry.regressions.length === 0) {
        findings.push({ file: entry.path, ruleId: 'PROVENANCE_INCOMPLETE', line: 1, column: 1 });
      }
      const cases = providers.get(entry.provider) ?? new Set();
      cases.add(entry.case);
      providers.set(entry.provider, cases);
    }
  }

  for (const path of entries) {
    const file = relative(corpusRoot, path).split(sep).join('/');
    if (file !== 'manifest.json' && !declaredPaths.has(file)) {
      findings.push({ file, ruleId: 'UNDECLARED_CORPUS_FILE', line: 1, column: 1 });
    }
  }
  for (const provider of ['claude', 'codex', 'cursor', 'factory']) {
    const cases = providers.get(provider);
    if (!cases?.has('positive') || !cases.has('malformed')) {
      invalid('PROVIDER_CASE_INCOMPLETE');
    }
  }
  const regressionIssues = new Set(
    (Array.isArray(manifest.regressions) ? manifest.regressions : [])
      .map((entry) => entry.issue),
  );
  if (![1944, 1945, 1946, 1947].every((issue) => regressionIssues.has(issue))) {
    invalid('REGRESSION_MAP_INCOMPLETE');
  }
  for (const scenario of Array.isArray(manifest.executionScenarios)
    ? manifest.executionScenarios : []) {
    const path = resolve(root, String(scenario.test ?? ''));
    if (!within(root, path)) {
      invalid('SCENARIO_PATH');
      continue;
    }
    try {
      if (!lstatSync(path).isFile()) invalid('SCENARIO_TEST_MISSING');
    } catch {
      invalid('SCENARIO_TEST_MISSING');
    }
  }
  return findings;
}

function allFiles(directory) {
  const output = [];
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = resolve(directory, entry.name);
    if (entry.isSymbolicLink()) {
      output.push(path);
    } else if (entry.isDirectory()) {
      output.push(...allFiles(path));
    } else {
      output.push(path);
    }
  }
  return output.sort();
}

function finding(file, ruleId, content, index) {
  const prefix = content.slice(0, index);
  const line = prefix.split('\n').length;
  const lastBreak = prefix.lastIndexOf('\n');
  return {
    file,
    ruleId,
    line,
    column: index - lastBreak,
  };
}

function within(parent, child) {
  const path = relative(parent, child);
  return path === '' || (!path.startsWith(`..${sep}`) && path !== '..');
}

function main() {
  const result = scanSessionRegressionCorpus();
  const output = {
    gate: 'session-regression-corpus-sanitization',
    corpusId: result.corpusId,
    filesScanned: result.filesScanned,
    status: result.findings.length === 0 ? 'pass' : 'fail',
    findings: result.findings,
  };
  const stream = result.findings.length === 0 ? process.stdout : process.stderr;
  stream.write(`${JSON.stringify(output, null, 2)}\n`);
  process.exitCode = result.findings.length === 0 ? 0 : 1;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  main();
}
