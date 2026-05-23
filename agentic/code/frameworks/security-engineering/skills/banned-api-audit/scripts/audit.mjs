#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const root = process.cwd();
const skillRoot = path.resolve(new URL('..', import.meta.url).pathname);
const banlistDir = path.join(skillRoot, 'banlists');
const outDir = path.join(root, '.aiwg', 'security', 'banned-api-audit');

const typeMap = {
  c: ['c', 'h'],
  cpp: ['cc', 'cpp', 'cxx', 'hpp', 'hh', 'hxx'],
  python: ['py'],
  node: ['js', 'jsx', 'ts', 'tsx', 'mjs', 'cjs'],
  go: ['go'],
  rust: ['rs'],
};

const defaultExclusions = [
  'test/**', 'tests/**', '**/*_test.*', '**/*.test.*',
  'vendor/**', 'node_modules/**', 'target/**', 'dist/**', 'build/**',
  '.git/**', '.aiwg/**', '.claude/**', '.codex/**', '.factory/**',
];

function parseArgs(argv) {
  const args = {
    starters: [],
    failOnViolation: false,
    format: 'both',
    paths: [],
    sarif: false,
  };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--starter' && argv[i + 1]) args.starters.push(argv[++i]);
    else if (a === '--fail-on-violation') args.failOnViolation = true;
    else if (a === '--format' && argv[i + 1]) {
      args.format = argv[++i];
      if (args.format === 'sarif') args.sarif = true;
    } else if (a === '--paths' && argv[i + 1]) {
      while (argv[i + 1] && !argv[i + 1].startsWith('--')) args.paths.push(argv[++i]);
    } else if (a === '--sarif') args.sarif = true;
    else if (a === '--help' || a === '-h') {
      console.log('Usage: audit.sh [--starter c|cpp|python|node|go|rust] [--fail-on-violation] [--paths <path>...] [--format text|json|both|sarif] [--sarif]');
      process.exit(0);
    }
  }
  return args;
}

function rgAvailable() {
  return spawnSync('rg', ['--version'], { encoding: 'utf8' }).status === 0;
}

function readYamlBanlist(file) {
  const text = fs.readFileSync(file, 'utf8');
  const entries = [];
  let currentLang = null;
  let current = null;
  let inLanguages = false;
  let inExclusions = false;
  const exclusions = [];

  const flush = () => {
    if (current && current.pattern) entries.push(current);
    current = null;
  };

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.replace(/\t/g, '  ');
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    if (/^languages:\s*$/.test(trimmed)) {
      inLanguages = true;
      inExclusions = false;
      continue;
    }
    if (/^exclusions:\s*$/.test(trimmed)) {
      flush();
      inLanguages = false;
      inExclusions = true;
      continue;
    }
    if (inLanguages) {
      const lang = /^ {2}([A-Za-z0-9_-]+):\s*$/.exec(line);
      if (lang) {
        flush();
        currentLang = lang[1];
        continue;
      }
      const item = /^ {4}-\s+pattern:\s*(.+?)\s*$/.exec(line);
      if (item) {
        flush();
        current = { language: currentLang, pattern: unquote(item[1]), source: file };
        continue;
      }
      const field = /^ {6}([A-Za-z0-9_-]+):\s*(.+?)\s*$/.exec(line);
      if (field && current) current[field[1]] = unquote(field[2]);
    } else if (inExclusions) {
      const item = /^ {4}-\s+(.+?)\s*$/.exec(line);
      if (item) exclusions.push(unquote(item[1]));
    }
  }
  flush();
  return { entries, exclusions };
}

function unquote(value) {
  return String(value).trim().replace(/^['"]|['"]$/g, '');
}

function validate(entries) {
  const errors = [];
  for (const entry of entries) {
    if (!entry.language) errors.push(`entry ${entry.pattern || '(unknown)'} missing language`);
    if (!entry.pattern) errors.push(`entry in ${entry.language || '(unknown)'} missing pattern`);
    if (!entry.reason) errors.push(`${entry.language}.${entry.pattern} missing reason`);
    if (!entry.replacement) errors.push(`${entry.language}.${entry.pattern} missing replacement`);
  }
  return errors;
}

function loadBanlists(args) {
  const files = [];
  const project = path.join(root, '.aiwg', 'security', 'banned-apis.yaml');
  if (fs.existsSync(project)) files.push(project);
  for (const starter of args.starters) {
    const candidate = path.join(banlistDir, `${starter}.yaml`);
    if (!fs.existsSync(candidate)) throw Object.assign(new Error(`Unknown starter banlist: ${starter}`), { exitCode: 1 });
    files.push(candidate);
  }
  if (files.length === 0) throw Object.assign(new Error('No banlist found. Seed .aiwg/security/banned-apis.yaml or pass --starter <language>.'), { exitCode: 1 });

  const merged = new Map();
  const exclusions = [...defaultExclusions];
  for (const file of files) {
    const parsed = readYamlBanlist(file);
    for (const entry of parsed.entries) {
      merged.set(`${entry.language}:${entry.pattern}`, entry);
    }
    exclusions.push(...parsed.exclusions);
  }
  const entries = Array.from(merged.values());
  const errors = validate(entries);
  if (errors.length) throw Object.assign(new Error(`Banlist validation failed:\n- ${errors.join('\n- ')}`), { exitCode: 1 });
  return { entries, files, exclusions: Array.from(new Set(exclusions)) };
}

function rgArgsFor(entry, scanPaths, exclusions) {
  const isRegex = entry.pattern.startsWith('re:');
  const pattern = isRegex ? entry.pattern.slice(3) : `\\b${escapeRegex(entry.pattern)}\\b`;
  const args = ['-n', '--column', '--no-heading', '--color', 'never'];
  for (const ext of typeMap[entry.language] || []) args.push('-g', `*.${ext}`);
  for (const ex of exclusions) args.push('-g', `!${ex}`);
  args.push(pattern, ...scanPaths);
  return args;
}

function escapeRegex(s) {
  return s.replace(/[|\\{}()[\]^$+*?.]/g, '\\$&');
}

function hasAllowAnnotation(file, lineNo) {
  try {
    const lines = fs.readFileSync(path.join(root, file), 'utf8').split(/\r?\n/);
    const start = Math.max(0, lineNo - 3);
    const end = Math.min(lines.length, lineNo);
    const block = lines.slice(start, end).join('\n');
    const m = /AIWG-allow:banned-apis\s+reason=["']([^"']+)["']/.exec(block);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

function scan(entries, scanPaths, exclusions) {
  const violations = [];
  const exceptions = [];
  for (const entry of entries) {
    const proc = spawnSync('rg', rgArgsFor(entry, scanPaths, exclusions), { cwd: root, encoding: 'utf8' });
    if (proc.status !== 0 && proc.status !== 1) {
      throw Object.assign(new Error(proc.stderr || `rg failed for ${entry.language}:${entry.pattern}`), { exitCode: 3 });
    }
    for (const line of proc.stdout.split(/\r?\n/).filter(Boolean)) {
      const parts = line.split(':');
      if (parts.length < 4) continue;
      const file = parts[0];
      const lineNo = Number(parts[1]);
      const column = Number(parts[2]);
      const match = parts.slice(3).join(':');
      const item = {
        file, line: lineNo, column, match,
        pattern: entry.pattern,
        language: entry.language,
        reason: entry.reason,
        replacement: entry.replacement,
        severity: entry.severity || 'HIGH',
      };
      const exceptionReason = hasAllowAnnotation(file, lineNo);
      if (exceptionReason) exceptions.push({ ...item, exceptionReason });
      else violations.push(item);
    }
  }
  return { violations, exceptions };
}

function toSarif(report) {
  const rules = new Map();
  for (const v of report.violations) {
    rules.set(`${v.language}:${v.pattern}`, {
      id: `${v.language}:${v.pattern}`,
      name: v.pattern,
      shortDescription: { text: v.reason },
      help: { text: `Replacement: ${v.replacement}` },
      defaultConfiguration: { level: 'error' },
    });
  }
  return {
    version: '2.1.0',
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    runs: [{
      tool: { driver: { name: 'AIWG banned-api-audit', rules: Array.from(rules.values()) } },
      results: report.violations.map((v) => ({
        ruleId: `${v.language}:${v.pattern}`,
        level: 'error',
        message: { text: `${v.reason}; use ${v.replacement}` },
        locations: [{
          physicalLocation: {
            artifactLocation: { uri: v.file },
            region: { startLine: v.line, startColumn: v.column },
          },
        }],
      })),
    }],
  };
}

function printText(report) {
  console.log(`Banned API Audit - ${report.auditedAt}`);
  console.log(`Banlist: ${report.banlistPath}`);
  console.log(`Patterns: ${report.patterns}`);
  console.log('');
  console.log(`VIOLATIONS (${report.violations.length})`);
  for (const v of report.violations) {
    console.log(`${v.file}:${v.line}:${v.column}: ${v.match.trim()}`);
    console.log(`  pattern: ${v.pattern} (${v.language})`);
    console.log(`  reason: ${v.reason}`);
    console.log(`  replacement: ${v.replacement}`);
  }
  console.log('');
  console.log(`EXCEPTIONS (${report.exceptions.length})`);
  for (const e of report.exceptions) console.log(`${e.file}:${e.line}: ${e.pattern} allowed - ${e.exceptionReason}`);
  console.log('');
  console.log(`SUMMARY violations=${report.violations.length} exceptions=${report.exceptions.length}`);
}

try {
  const args = parseArgs(process.argv.slice(2));
  if (!rgAvailable()) throw Object.assign(new Error('ripgrep (rg) is required for banned-api-audit'), { exitCode: 3 });
  const banlist = loadBanlists(args);
  const scanPaths = args.paths.length ? args.paths : ['.'];
  const findings = scan(banlist.entries, scanPaths, banlist.exclusions);
  const report = {
    schemaVersion: '1',
    auditedAt: new Date().toISOString(),
    banlistPath: banlist.files.map((p) => path.relative(root, p)).join(', '),
    patterns: banlist.entries.length,
    filesScanned: null,
    ...findings,
  };
  fs.mkdirSync(outDir, { recursive: true });
  const stamp = report.auditedAt.replace(/[:.]/g, '-');
  if (args.format === 'text' || args.format === 'both') printText(report);
  if (args.format === 'json' || args.format === 'both') {
    fs.writeFileSync(path.join(outDir, `${stamp}.json`), JSON.stringify(report, null, 2));
  }
  if (args.sarif) fs.writeFileSync(path.join(outDir, `${stamp}.sarif`), JSON.stringify(toSarif(report), null, 2));
  process.exit(report.violations.length && args.failOnViolation ? 2 : 0);
} catch (err) {
  console.error(err.message);
  process.exit(err.exitCode || 1);
}
