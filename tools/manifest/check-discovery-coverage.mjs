#!/usr/bin/env node
/**
 * Component-to-discovery-driver coverage gate.
 *
 * Joins shipped component manifests to operational artifacts in the same
 * component. A component may instead declare `discovery.exemption`, but the
 * exemption must include a rationale and a concrete public owning driver.
 *
 * Usage:
 *   node tools/manifest/check-discovery-coverage.mjs [root] [--json] [--report <path>]
 */

import fs from 'node:fs';
import path from 'node:path';
import { load as loadYaml } from 'js-yaml';

const OPERATIONAL_TYPES = new Map([
  ['skills', 'skill'],
  ['agents', 'agent'],
  ['commands', 'command'],
  ['flows', 'flow'],
  ['runbooks', 'runbook'],
  ['templates', 'template'],
  ['behaviors', 'behavior'],
]);
const COMPONENT_ROOTS = ['addons', 'frameworks', 'extensions'];
const PROVIDERS = [
  'claude', 'codex', 'copilot', 'cursor', 'factory', 'hermes',
  'openclaw', 'opencode', 'openhuman', 'warp', 'windsurf',
];

function parseArgs(argv) {
  const options = { root: process.cwd(), json: false, report: null };
  for (let i = 0; i < argv.length; i += 1) {
    if (argv[i] === '--json') options.json = true;
    else if (argv[i] === '--report' && argv[i + 1]) options.report = path.resolve(argv[++i]);
    else options.root = path.resolve(argv[i]);
  }
  return options;
}

function parseDocument(content) {
  const match = content.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/);
  if (!match) return { metadata: {}, body: content };
  try {
    return { metadata: loadYaml(match[1]) ?? {}, body: content.slice(match[0].length) };
  } catch {
    return { metadata: {}, body: content };
  }
}

function strings(value) {
  return Array.isArray(value)
    ? value.filter(item => typeof item === 'string' && item.trim()).map(item => item.trim())
    : [];
}

function walk(dir) {
  if (!fs.existsSync(dir)) return [];
  const files = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    else if (entry.isFile()) files.push(full);
  }
  return files;
}

function artifactType(componentDir, file) {
  if (path.basename(file) === 'manifest.json') return null;
  const relative = path.relative(componentDir, file).split(path.sep);
  for (const [directory, type] of OPERATIONAL_TYPES) {
    const index = relative.indexOf(directory);
    if (index < 0) continue;
    const after = relative.length - index - 1;
    const basename = path.basename(file);
    if (type === 'skill' && !(
      (after === 2 && /^SKILL\.md$/i.test(basename))
      || (after === 1 && /\.md$/i.test(basename))
    )) return null;
    if (['agent', 'command', 'runbook', 'behavior'].includes(type) && !/\.md$/i.test(basename)) {
      return null;
    }
    return type;
  }
  return null;
}

function artifactName(file, metadata) {
  if (typeof metadata.name === 'string' && metadata.name.trim()) return metadata.name.trim();
  const base = path.basename(file, path.extname(file));
  if (/^(SKILL|COMMAND|AGENT)$/i.test(base)) return path.basename(path.dirname(file));
  return base;
}

function extractTriggers(metadata, body) {
  const triggers = strings(metadata.triggers);
  const match = body.match(
    /(?:^|\n)##\s+(?:(?:Natural\s+Language\s+)?Triggers|Activation\s+Phrases|When\s+to\s+invoke)\b[^\n]*\n([\s\S]*?)(?=\n##\s|$)/i,
  );
  if (!match) return [...new Set(triggers.map(value => value.toLowerCase()))];
  for (const rawLine of match[1].split('\n')) {
    const line = rawLine.trim();
    if (!/^[-*+]\s+/.test(line)) continue;
    let phrase = line.replace(/^[-*+]\s+/, '').replace(/^["“”'`]+/, '').trim();
    const separator = phrase.match(/^(.*?)\s*(?:→|—|--|\s-\s)/);
    if (separator) phrase = separator[1];
    phrase = phrase.replace(/["“”'`:.]+\s*$/, '').trim();
    if (phrase && phrase.length <= 200) triggers.push(phrase);
  }
  return [...new Set(triggers.map(value => value.toLowerCase()))];
}

function extractCapability(metadata, body) {
  if (typeof metadata.description === 'string' && metadata.description.trim()) {
    return metadata.description.trim().slice(0, 240);
  }
  if (typeof metadata.capability === 'string' && metadata.capability.trim()) {
    return metadata.capability.trim().slice(0, 240);
  }
  for (const block of body.split(/\n\s*\n/)) {
    const compact = block.trim();
    if (compact && !compact.startsWith('#')) return compact.replace(/\s+/g, ' ').slice(0, 240);
  }
  return '';
}

function discoverArtifacts(componentDir, repoRoot) {
  return walk(componentDir).flatMap(file => {
    const physicalType = artifactType(componentDir, file);
    if (!physicalType || !/\.(md|ya?ml|json|toml|jsonc|tmpl|j2|csv)$/i.test(file)) return [];
    const content = fs.readFileSync(file, 'utf8');
    const { metadata, body } = parseDocument(content);
    const declaredType = typeof metadata.type === 'string' ? metadata.type.trim() : '';
    if (declaredType && ![...OPERATIONAL_TYPES.values()].includes(declaredType)) return [];
    const type = declaredType || physicalType;
    const capability = extractCapability(metadata, body);
    const explicitTriggers = extractTriggers(metadata, body);
    const triggers = explicitTriggers.length > 0
      ? explicitTriggers
      : capability
        ? [capability]
        : [];
    const platforms = strings(metadata.platforms);
    return [{
      path: path.relative(repoRoot, file).split(path.sep).join('/'),
      relativePath: path.relative(componentDir, file).split(path.sep).join('/'),
      type,
      name: artifactName(file, metadata),
      triggers,
      triggerSource: explicitTriggers.length > 0 ? 'explicit' : 'capability',
      capability,
      providerSupport: platforms.includes('all') || platforms.length === 0 ? PROVIDERS : platforms,
    }];
  });
}

function validateExemption(discovery, repoRoot) {
  const exemption = discovery?.exemption;
  if (!exemption || typeof exemption !== 'object') return null;
  const rationale = typeof exemption.rationale === 'string' ? exemption.rationale.trim() : '';
  const owningDriver = typeof exemption.owningDriver === 'string' ? exemption.owningDriver.trim() : '';
  const target = owningDriver ? path.resolve(repoRoot, owningDriver) : '';
  return {
    valid: Boolean(rationale && owningDriver && target.startsWith(`${repoRoot}${path.sep}`) && fs.existsSync(target)),
    rationale,
    owningDriver,
  };
}

function selectAutomaticDriver(artifacts, componentName) {
  const typeRank = new Map([
    ['skill', 0], ['command', 1], ['flow', 2], ['agent', 3],
    ['runbook', 4], ['behavior', 5], ['template', 6],
  ]);
  return [...artifacts].sort((a, b) => {
    const aScore = (a.name === componentName ? 0 : 10)
      + (a.triggerSource === 'explicit' ? 0 : 4)
      + (typeRank.get(a.type) ?? 9);
    const bScore = (b.name === componentName ? 0 : 10)
      + (b.triggerSource === 'explicit' ? 0 : 4)
      + (typeRank.get(b.type) ?? 9);
    return aScore - bScore || a.path.localeCompare(b.path);
  }).slice(0, 1);
}

export function buildCoverageReport(repoRoot) {
  const components = [];
  for (const rootName of COMPONENT_ROOTS) {
    const base = path.join(repoRoot, 'agentic', 'code', rootName);
    if (!fs.existsSync(base)) continue;
    for (const entry of fs.readdirSync(base, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const componentDir = path.join(base, entry.name);
      const manifestPath = path.join(componentDir, 'manifest.json');
      if (!fs.existsSync(manifestPath)) continue;
      let manifest;
      try {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
      } catch (error) {
        components.push({
          component: entry.name,
          kind: rootName.replace(/s$/, ''),
          manifest: path.relative(repoRoot, manifestPath),
          status: 'invalid',
          reason: `manifest JSON is invalid: ${error.message}`,
          drivers: [],
        });
        continue;
      }

      const artifacts = discoverArtifacts(componentDir, repoRoot);
      const requested = strings(manifest.discovery?.drivers);
      const candidates = requested.length
        ? requested.map(driver => artifacts.find(item => item.relativePath === driver)).filter(Boolean)
        : selectAutomaticDriver(artifacts, manifest.id || manifest.name || entry.name);
      const drivers = candidates.filter(driver =>
        driver.triggers.length > 0 && driver.capability && driver.providerSupport.length > 0);
      const exemption = validateExemption(manifest.discovery, repoRoot);
      const status = drivers.length > 0 ? 'covered' : exemption?.valid ? 'exempt' : 'missing';
      const reason = status === 'covered'
        ? null
        : status === 'exempt'
          ? exemption.rationale
          : requested.length && candidates.length === 0
            ? 'declared discovery driver does not exist under the component'
            : 'no operational artifact has capability text, natural-language triggers, and provider support';

      components.push({
        component: manifest.id || manifest.name || entry.name,
        kind: manifest.type || rootName.replace(/s$/, ''),
        manifest: path.relative(repoRoot, manifestPath).split(path.sep).join('/'),
        status,
        reason,
        candidates: candidates.map(candidate => ({
          path: candidate.path,
          type: candidate.type,
          name: candidate.name,
          hasCapability: Boolean(candidate.capability),
          triggerCount: candidate.triggers.length,
          triggerSource: candidate.triggerSource,
          providerSupport: candidate.providerSupport,
        })),
        drivers: drivers.map(driver => ({
          path: driver.path,
          type: driver.type,
          name: driver.name,
          triggers: driver.triggers,
          triggerSource: driver.triggerSource,
          canonicalOperation: manifest.discovery?.canonicalOperation || driver.name,
          providerSupport: driver.providerSupport,
        })),
        ...(exemption ? { exemption } : {}),
      });
    }
  }
  components.sort((a, b) => `${a.kind}:${a.component}`.localeCompare(`${b.kind}:${b.component}`));
  const counts = {
    total: components.length,
    covered: components.filter(item => item.status === 'covered').length,
    exempt: components.filter(item => item.status === 'exempt').length,
    missing: components.filter(item => item.status === 'missing').length,
    invalid: components.filter(item => item.status === 'invalid').length,
  };
  return {
    schemaVersion: 'aiwg.discovery-component-coverage.v1',
    generatedAt: new Date().toISOString(),
    counts,
    ok: counts.missing === 0 && counts.invalid === 0,
    components,
  };
}

function main() {
  const options = parseArgs(process.argv.slice(2));
  const report = buildCoverageReport(options.root);
  const serialized = `${JSON.stringify(report, null, 2)}\n`;
  if (options.report) {
    fs.mkdirSync(path.dirname(options.report), { recursive: true });
    fs.writeFileSync(options.report, serialized, 'utf8');
  }
  if (options.json) {
    process.stdout.write(serialized);
  } else {
    console.log(`Discovery component coverage: ${report.counts.covered} covered, ${report.counts.exempt} exempt, ${report.counts.missing} missing, ${report.counts.invalid} invalid`);
    for (const item of report.components.filter(component => !['covered', 'exempt'].includes(component.status))) {
      console.log(`  ${item.status.toUpperCase()} ${item.kind}:${item.component} — ${item.reason}`);
    }
  }
  if (!report.ok) process.exitCode = 1;
}

if (import.meta.url === `file://${process.argv[1]}`) main();
