import { spawnSync } from 'node:child_process';
import { chmodSync, existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { parseDocument, stringify } from 'yaml';
import type { CommandHandler, HandlerContext, HandlerResult } from './types.js';
import { findPackageRoot } from '../find-package-root.js';

type Severity = 'error' | 'warning';

export interface SetupValidationFinding {
  severity: Severity;
  path: string;
  rule: string;
  message: string;
}

interface SetupManifest {
  apiVersion: string;
  kind: string;
  metadata: {
    name: string;
    description?: string;
    version?: string;
    install_type?: 'user' | 'developer' | 'ci';
    execution_mode?: 'deterministic' | 'provider-orchestrated';
  };
  spec: {
    platforms: Array<{ os: string; distros?: string[]; arch?: string[]; shell?: string }>;
    params?: SetupParam[];
    prerequisites?: Array<{ name: string; detect: string; required?: boolean; install_hint?: string }>;
    os_config?: Array<{
      id: string;
      description: string;
      check: string;
      apply: string;
      requires_relogin?: boolean;
      interactive?: boolean;
      platforms?: string[];
    }>;
    steps: SetupStep[];
    recovery?: Array<{ id: string; steps: SetupStep[] }>;
    briefing?: { success?: string; next_steps?: string[] };
  };
}

interface SetupParam {
  name: string;
  type: 'string' | 'path' | 'bool' | 'int' | 'choice';
  default?: unknown;
  required?: boolean;
  description?: string;
  choices?: string[];
  interactive_required?: boolean;
}

interface SetupStep {
  id: string;
  type: 'script' | 'detect' | 'ask' | 'verify' | 'agentic' | 'platform-route' | 'chain' | 'os-config';
  platform?: string | string[];
  config_id?: string;
  script?: string;
  params?: string[];
  verify?: string | string[];
  commands?: string[];
  message?: string;
  on_deny?: 'abort' | 'skip';
  on_fail?: string;
  instruction?: string;
  manifest?: string;
  depends_on?: string[];
  when?: string;
  routes?: Array<{ platform: string; steps: SetupStep[] }>;
}

interface LoadedManifest {
  manifest: SetupManifest | null;
  raw: unknown;
  manifestPath: string;
  manifestDir: string;
  schemaPath: string;
  findings: SetupValidationFinding[];
}

interface ValidationOptions {
  cwd: string;
  frameworkRoot: string;
  manifestPath?: string;
  schemaPath?: string;
  strict?: boolean;
}

interface RunOptions {
  cwd: string;
  frameworkRoot: string;
  manifestPath?: string;
  dryRun?: boolean;
  platform?: string;
  distro?: string;
  paramsFile?: string;
  paramValues: Record<string, string>;
  step?: string;
  skip: Set<string>;
  type?: string;
  yes?: boolean;
}

interface GenerateOptions {
  cwd: string;
  output?: string;
  name?: string;
  type?: 'user' | 'developer' | 'ci';
  platform?: string;
  force?: boolean;
  json?: boolean;
}

const SETUP_SCHEMA_REL = 'agentic/code/addons/agentic-installer/schemas/v1/setup-manifest.schema.json';

const GENERATE_HELP = `aiwg setup-generate - generate a starter setup.aiwg.io/v1 SetupManifest

Usage:
  aiwg setup-generate [--output PATH] [--name NAME] [--type user|developer|ci]
                      [--platform OS] [--force] [--json]

Options:
  --output PATH   Manifest path to create. Defaults to ./setup.manifest.yaml.
  --name NAME     Manifest metadata.name. Defaults to package name or directory name.
  --type TYPE     Install type: user, developer, or ci. Defaults to developer.
  --platform OS   Platform target: linux, macos, windows, docker. Defaults to current OS.
  --force         Overwrite existing generated files.
  --json          Emit machine-readable generation result.
  --help, -h      Show this help.
`;

const VALIDATE_HELP = `aiwg setup-validate - validate a setup.aiwg.io/v1 SetupManifest

Usage:
  aiwg setup-validate [manifest-path] [--schema PATH] [--strict] [--fix] [--json]
  aiwg setup-validate --manifest PATH [--json]

Options:
  --manifest PATH   Manifest path. Defaults to ./setup.manifest.yaml.
  --schema PATH     Override canonical schema path.
  --strict          Treat warnings as failures.
  --fix             Reserved for future safe autofixes; currently validates only.
  --json            Emit machine-readable validation results.
  --help, -h        Show this help.
`;

const RUN_HELP = `aiwg setup-run - execute a setup.aiwg.io/v1 SetupManifest

Usage:
  aiwg setup-run [manifest-path] [--manifest PATH] [--dry-run] [--platform OS]
                 [--distro NAME] [--params-file PATH] [--param KEY=VALUE]
                 [--step STEP_ID] [--skip A,B] [--type user|developer|ci]
                 [--yes|--confirm]

Options:
  --manifest PATH      Manifest path. Defaults to ./setup.manifest.yaml.
  --dry-run            Validate and print the execution plan without running steps.
  --platform OS        Override platform detection: linux, macos, windows, docker.
  --distro NAME        Override Linux distro detection.
  --params-file PATH   YAML object containing parameter values.
  --param KEY=VALUE    Parameter override. Repeatable; --set is also accepted.
  --step STEP_ID       Run only one step, useful after a failed setup.
  --skip A,B           Comma-separated step IDs to skip.
  --type TYPE          Select default manifest by install type when no path is given.
  --yes, --confirm     Explicitly authorize mutating step execution and recovery.
  --help, -h           Show this help.

Safety:
  setup-run always runs setup-validate before platform detection or execution.
  Mutating execution refuses to run without explicit confirmation.
`;

function flagValue(args: readonly string[], name: string): string | undefined {
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] === name) {
      const value = args[i + 1];
      return value && !value.startsWith('--') ? value : undefined;
    }
  }
  return undefined;
}

function hasFlag(args: readonly string[], ...names: string[]): boolean {
  return args.some((arg) => names.includes(arg));
}

function positionalManifest(args: readonly string[]): string | undefined {
  const valueFlags = new Set([
    '--manifest',
    '--schema',
    '--platform',
    '--distro',
    '--params-file',
    '--param',
    '--set',
    '--step',
    '--skip',
    '--type',
    '--output',
    '--name',
  ]);
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (valueFlags.has(arg)) {
      i += 1;
      continue;
    }
    if (!arg.startsWith('-')) return arg;
  }
  return undefined;
}

function resolveSchemaPath(frameworkRoot: string, cwd: string, override?: string): string {
  if (override) return path.resolve(cwd, override);
  const candidates = [
    path.join(frameworkRoot, SETUP_SCHEMA_REL),
    path.join(cwd, SETUP_SCHEMA_REL),
  ];
  const packageRoot = findPackageRoot(path.dirname(new URL(import.meta.url).pathname));
  if (packageRoot) candidates.push(path.join(packageRoot, SETUP_SCHEMA_REL));
  const found = candidates.find((candidate) => existsSync(candidate));
  if (!found) {
    throw new Error(`setup schema not found; expected ${SETUP_SCHEMA_REL}`);
  }
  return found;
}

function parseYamlFile(filePath: string): { value: unknown; errors: SetupValidationFinding[] } {
  const text = readFileSync(filePath, 'utf8');
  const doc = parseDocument(text, { prettyErrors: false });
  const errors: SetupValidationFinding[] = doc.errors.map((error) => ({
    severity: 'error',
    path: '/',
    rule: 'yaml',
    message: error.message,
  }));
  return { value: errors.length ? null : doc.toJSON(), errors };
}

function jsonPointer(parent: string, segment: string | number): string {
  const safe = String(segment).replace(/~/g, '~0').replace(/\//g, '~1');
  return parent === '/' ? `/${safe}` : `${parent}/${safe}`;
}

function typeName(value: unknown): string {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';
  return typeof value;
}

function schemaTypeMatches(value: unknown, expected: string): boolean {
  if (expected === 'array') return Array.isArray(value);
  if (expected === 'object') return !!value && typeof value === 'object' && !Array.isArray(value);
  if (expected === 'integer') return Number.isInteger(value);
  if (expected === 'boolean') return typeof value === 'boolean';
  if (expected === 'string') return typeof value === 'string';
  return true;
}

function resolveRef(rootSchema: any, ref: string): any {
  if (!ref.startsWith('#/')) throw new Error(`unsupported schema ref: ${ref}`);
  return ref.slice(2).split('/').reduce((current, part) => current?.[part], rootSchema);
}

function validateAgainstSchema(value: unknown, schema: any, rootSchema: any, pointer = '/'): SetupValidationFinding[] {
  const findings: SetupValidationFinding[] = [];
  if (schema.$ref) return validateAgainstSchema(value, resolveRef(rootSchema, schema.$ref), rootSchema, pointer);
  if (schema.oneOf) {
    const matches = schema.oneOf.filter((candidate: any) => validateAgainstSchema(value, candidate, rootSchema, pointer).length === 0);
    if (matches.length !== 1) {
      findings.push({ severity: 'error', path: pointer, rule: 'oneOf', message: `must match exactly one allowed schema shape; matched ${matches.length}` });
    }
    return findings;
  }
  if (schema.type && !schemaTypeMatches(value, schema.type)) {
    findings.push({ severity: 'error', path: pointer, rule: 'type', message: `expected ${schema.type}, got ${typeName(value)}` });
    return findings;
  }
  if (schema.const !== undefined && value !== schema.const) {
    findings.push({ severity: 'error', path: pointer, rule: 'const', message: `expected ${JSON.stringify(schema.const)}` });
  }
  if (schema.enum && !schema.enum.includes(value)) {
    findings.push({ severity: 'error', path: pointer, rule: 'enum', message: `must be one of: ${schema.enum.join(', ')}` });
  }
  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      findings.push({ severity: 'error', path: pointer, rule: 'minItems', message: `must contain at least ${schema.minItems} item(s)` });
    }
    if (schema.items) {
      value.forEach((item, index) => findings.push(...validateAgainstSchema(item, schema.items, rootSchema, jsonPointer(pointer, index))));
    }
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    for (const required of schema.required ?? []) {
      if (!(required in obj)) {
        findings.push({ severity: 'error', path: pointer, rule: 'required', message: `missing required property '${required}'` });
      }
    }
    if (schema.additionalProperties === false && schema.properties) {
      const allowed = new Set(Object.keys(schema.properties));
      for (const key of Object.keys(obj)) {
        if (!allowed.has(key)) {
          findings.push({ severity: 'error', path: jsonPointer(pointer, key), rule: 'additionalProperties', message: 'unknown property' });
        }
      }
    }
    for (const [key, childSchema] of Object.entries(schema.properties ?? {})) {
      if (key in obj) findings.push(...validateAgainstSchema(obj[key], childSchema, rootSchema, jsonPointer(pointer, key)));
    }
  }
  return findings;
}

function asManifest(value: unknown): SetupManifest | null {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as SetupManifest : null;
}

function allSteps(manifest: SetupManifest): Array<{ step: SetupStep; pointer: string }> {
  const out: Array<{ step: SetupStep; pointer: string }> = [];
  const visit = (steps: SetupStep[] | undefined, base: string) => {
    steps?.forEach((step, index) => {
      const pointer = jsonPointer(base, index);
      out.push({ step, pointer });
      step.routes?.forEach((route, routeIndex) => visit(route.steps, `${pointer}/routes/${routeIndex}/steps`));
    });
  };
  visit(manifest.spec.steps, '/spec/steps');
  manifest.spec.recovery?.forEach((recovery, index) => visit(recovery.steps, `/spec/recovery/${index}/steps`));
  return out;
}

function existingRelative(manifestDir: string, rel: string | undefined): boolean {
  return !!rel && existsSync(path.resolve(manifestDir, rel));
}

function installerConsistencyChecks(manifest: SetupManifest | null, manifestDir: string): SetupValidationFinding[] {
  if (!manifest) return [];
  const findings: SetupValidationFinding[] = [];
  const topStepIds = new Set(manifest.spec.steps.map((step) => step.id));
  const allStepIds = new Set<string>();
  const recoveryIds = new Set((manifest.spec.recovery ?? []).map((recovery) => recovery.id));
  const osConfigIds = new Set((manifest.spec.os_config ?? []).map((entry) => entry.id));
  const installType = manifest.metadata.install_type ?? 'user';
  const executionMode = manifest.metadata.execution_mode ?? 'deterministic';

  for (const [index, step] of manifest.spec.steps.entries()) {
    if (allStepIds.has(step.id)) {
      findings.push({ severity: 'error', path: `/spec/steps/${index}/id`, rule: 'uniqueStepId', message: `duplicate step id '${step.id}'` });
    }
    allStepIds.add(step.id);
    for (const dep of step.depends_on ?? []) {
      if (!topStepIds.has(dep)) {
        findings.push({ severity: 'error', path: `/spec/steps/${index}/depends_on`, rule: 'depends_on', message: `unresolved step id '${dep}'` });
      }
    }
    if (step.on_fail && !recoveryIds.has(step.on_fail) && step.on_fail !== 'recover') {
      findings.push({ severity: 'error', path: `/spec/steps/${index}/on_fail`, rule: 'on_fail', message: `unresolved recovery '${step.on_fail}'` });
    }
  }

  for (const { step, pointer } of allSteps(manifest)) {
    if (step.type === 'script' && !existingRelative(manifestDir, step.script)) {
      findings.push({ severity: 'error', path: `${pointer}/script`, rule: 'scriptExists', message: `script not found: ${step.script ?? '(missing)'}` });
    }
    if (step.type === 'chain' && !existingRelative(manifestDir, step.manifest)) {
      findings.push({ severity: 'error', path: `${pointer}/manifest`, rule: 'chainManifestExists', message: `chain manifest not found: ${step.manifest ?? '(missing)'}` });
    }
    if (step.type === 'os-config' && (!step.config_id || !osConfigIds.has(step.config_id))) {
      findings.push({ severity: 'error', path: `${pointer}/config_id`, rule: 'osConfigReference', message: `config_id '${step.config_id ?? '(missing)'}' not found in spec.os_config` });
    }
    if (step.type === 'agentic') {
      if (!step.instruction) {
        findings.push({ severity: 'error', path: `${pointer}/instruction`, rule: 'agenticInstruction', message: 'agentic step requires instruction' });
      } else if (executionMode !== 'provider-orchestrated') {
        findings.push({ severity: 'warning', path: pointer, rule: 'agenticStep', message: 'agentic steps are exception handling only and require manual intervention during setup-run' });
      }
    }
    if (step.type === 'platform-route') {
      for (const [routeIndex, route] of (step.routes ?? []).entries()) {
        if (!route.steps?.length) {
          findings.push({ severity: 'error', path: `${pointer}/routes/${routeIndex}/steps`, rule: 'platformRouteSteps', message: 'platform-route must contain route steps' });
        }
      }
    }
  }

  for (const [index, param] of (manifest.spec.params ?? []).entries()) {
    if (installType === 'developer' && param.interactive_required && param.default !== undefined) {
      findings.push({ severity: 'error', path: `/spec/params/${index}/default`, rule: 'interactiveDefault', message: 'interactive_required params must not define a default in developer manifests' });
    }
    if (param.interactive_required && param.required) {
      findings.push({ severity: 'warning', path: `/spec/params/${index}/required`, rule: 'redundantRequired', message: 'required is redundant when interactive_required is true' });
    }
  }

  if (installType === 'developer') {
    if (!(manifest.spec.os_config ?? []).length && !/no os configuration/i.test(manifest.metadata.description ?? '')) {
      findings.push({ severity: 'warning', path: '/spec/os_config', rule: 'developerOsConfig', message: 'developer manifest has no os_config block' });
    }
    const applied = new Set(manifest.spec.steps.filter((step) => step.type === 'os-config').map((step) => step.config_id));
    for (const [index, entry] of (manifest.spec.os_config ?? []).entries()) {
      if (entry.requires_relogin && !applied.has(entry.id)) {
        findings.push({ severity: 'warning', path: `/spec/os_config/${index}`, rule: 'unusedReloginOsConfig', message: `os_config '${entry.id}' requires relogin but no step applies it` });
      }
      if (entry.interactive && !entry.description.trim()) {
        findings.push({ severity: 'warning', path: `/spec/os_config/${index}/description`, rule: 'interactiveDescription', message: 'interactive os_config entries need a user-facing description' });
      }
    }
  }

  for (const [index, prereq] of (manifest.spec.prerequisites ?? []).entries()) {
    if (prereq.required !== false && !prereq.install_hint) {
      findings.push({ severity: 'warning', path: `/spec/prerequisites/${index}/install_hint`, rule: 'installHint', message: `required prerequisite '${prereq.name}' has no install_hint` });
    }
  }
  return findings;
}

export function validateSetupManifest(options: ValidationOptions): LoadedManifest {
  const manifestPath = path.resolve(options.cwd, options.manifestPath ?? 'setup.manifest.yaml');
  const schemaPath = resolveSchemaPath(options.frameworkRoot, options.cwd, options.schemaPath);
  const findings: SetupValidationFinding[] = [];
  if (!existsSync(manifestPath)) {
    findings.push({ severity: 'error', path: manifestPath, rule: 'manifestExists', message: `manifest not found: ${manifestPath}` });
    return { manifest: null, raw: null, manifestPath, manifestDir: path.dirname(manifestPath), schemaPath, findings };
  }
  const parsed = parseYamlFile(manifestPath);
  findings.push(...parsed.errors);
  let manifest = asManifest(parsed.value);
  if (!parsed.errors.length) {
    const schema = JSON.parse(readFileSync(schemaPath, 'utf8'));
    findings.push(...validateAgainstSchema(parsed.value, schema, schema));
    manifest = findings.some((finding) => finding.severity === 'error') ? null : asManifest(parsed.value);
    findings.push(...installerConsistencyChecks(manifest, path.dirname(manifestPath)));
  }
  if (options.strict) {
    for (const finding of findings) {
      if (finding.severity === 'warning') finding.severity = 'error';
    }
  }
  return { manifest, raw: parsed.value, manifestPath, manifestDir: path.dirname(manifestPath), schemaPath, findings };
}

function renderValidationText(result: LoadedManifest): string {
  const errors = result.findings.filter((finding) => finding.severity === 'error');
  const warnings = result.findings.filter((finding) => finding.severity === 'warning');
  const manifest = result.manifest;
  const lines = [
    `Validating: ${result.manifestPath}`,
    '',
    `  Schema:        ${errors.length ? 'invalid' : 'valid'} (${result.schemaPath})`,
  ];
  if (manifest) {
    lines.push(`  Install type:  ${manifest.metadata.install_type ?? 'user'}`);
    lines.push(`  Metadata:      name=${manifest.metadata.name}${manifest.metadata.version ? ` version=${manifest.metadata.version}` : ''}`);
    lines.push(`  Platform:      ${manifest.spec.platforms.map((p) => p.os).join(', ')}`);
    lines.push(`  Params:        ${(manifest.spec.params ?? []).length}`);
    lines.push(`  Prerequisites: ${(manifest.spec.prerequisites ?? []).length}`);
    lines.push(`  OS Config:     ${(manifest.spec.os_config ?? []).length}`);
    lines.push(`  Steps:         ${manifest.spec.steps.length}`);
    lines.push(`  Recovery:      ${(manifest.spec.recovery ?? []).length}`);
  }
  if (errors.length) {
    lines.push('', `  Errors (${errors.length}):`);
    errors.forEach((finding) => lines.push(`    x ${finding.path}: ${finding.rule} - ${finding.message}`));
  }
  if (warnings.length) {
    lines.push('', `  Warnings (${warnings.length}):`);
    warnings.forEach((finding) => lines.push(`    ! ${finding.path}: ${finding.rule} - ${finding.message}`));
  }
  lines.push('', `Result: ${errors.length ? 'INVALID' : 'VALID'}${warnings.length ? ` (${warnings.length} warning${warnings.length === 1 ? '' : 's'})` : ''}`);
  return lines.join('\n') + '\n';
}

function parseParamValues(args: readonly string[]): Record<string, string> {
  const values: Record<string, string> = {};
  for (let i = 0; i < args.length; i += 1) {
    if (args[i] !== '--param' && args[i] !== '--set') continue;
    const raw = args[i + 1] ?? '';
    const eq = raw.indexOf('=');
    if (eq <= 0) throw new Error(`${args[i]} requires KEY=VALUE`);
    values[raw.slice(0, eq)] = raw.slice(eq + 1);
    i += 1;
  }
  return values;
}

function parseRunOptions(ctx: HandlerContext): RunOptions {
  const args = ctx.args;
  const type = flagValue(args, '--type');
  let manifest = flagValue(args, '--manifest') ?? positionalManifest(args);
  if (!manifest && type === 'developer' && existsSync(path.join(ctx.cwd, 'installer/setup.dev.manifest.yaml'))) {
    manifest = 'installer/setup.dev.manifest.yaml';
  }
  if (!manifest && type === 'user' && existsSync(path.join(ctx.cwd, 'installer/setup.user.manifest.yaml'))) {
    manifest = 'installer/setup.user.manifest.yaml';
  }
  return {
    cwd: ctx.cwd,
    frameworkRoot: ctx.frameworkRoot,
    manifestPath: manifest,
    dryRun: hasFlag(args, '--dry-run') || ctx.dryRun,
    platform: flagValue(args, '--platform'),
    distro: flagValue(args, '--distro'),
    paramsFile: flagValue(args, '--params-file'),
    paramValues: parseParamValues(args),
    step: flagValue(args, '--step'),
    skip: new Set((flagValue(args, '--skip') ?? '').split(',').map((s) => s.trim()).filter(Boolean)),
    type,
    yes: hasFlag(args, '--yes', '--confirm'),
  };
}

function detectPlatform(options: RunOptions): { os: string; distro?: string; arch: string; shell: string } {
  const mappedOs = process.platform === 'darwin' ? 'macos' : process.platform === 'win32' ? 'windows' : 'linux';
  let distro = options.distro;
  if (!distro && mappedOs === 'linux' && existsSync('/etc/os-release')) {
    const match = readFileSync('/etc/os-release', 'utf8').match(/^ID=(.+)$/m);
    distro = match?.[1]?.replace(/^"|"$/g, '');
  }
  return {
    os: options.platform ?? mappedOs,
    distro,
    arch: os.arch() === 'arm64' ? 'arm64' : os.arch(),
    shell: process.env.SHELL ? path.basename(process.env.SHELL) : (mappedOs === 'windows' ? 'native' : 'sh'),
  };
}

function currentSetupOs(): 'linux' | 'macos' | 'windows' {
  if (process.platform === 'darwin') return 'macos';
  if (process.platform === 'win32') return 'windows';
  return 'linux';
}

function defaultManifestName(cwd: string): string {
  const packagePath = path.join(cwd, 'package.json');
  if (existsSync(packagePath)) {
    try {
      const pkg = JSON.parse(readFileSync(packagePath, 'utf8')) as Record<string, unknown>;
      if (typeof pkg.name === 'string' && pkg.name.trim()) return pkg.name.trim();
    } catch {
      // Fall back to directory name.
    }
  }
  return path.basename(cwd);
}

function parseGenerateOptions(ctx: HandlerContext): GenerateOptions {
  const type = flagValue(ctx.args, '--type') as GenerateOptions['type'] | undefined;
  if (type && !['user', 'developer', 'ci'].includes(type)) {
    throw new Error(`setup-generate: unsupported --type '${type}'`);
  }
  return {
    cwd: ctx.cwd,
    output: flagValue(ctx.args, '--output') ?? flagValue(ctx.args, '--manifest') ?? positionalManifest(ctx.args),
    name: flagValue(ctx.args, '--name'),
    type: type ?? 'developer',
    platform: flagValue(ctx.args, '--platform') ?? currentSetupOs(),
    force: hasFlag(ctx.args, '--force'),
    json: hasFlag(ctx.args, '--json'),
  };
}

export function generateSetupManifest(options: GenerateOptions): HandlerResult {
  const manifestPath = path.resolve(options.cwd, options.output ?? 'setup.manifest.yaml');
  const manifestDir = path.dirname(manifestPath);
  const scriptRel = 'scripts/setup.sh';
  const scriptPath = path.join(manifestDir, scriptRel);
  const conflicts = [manifestPath, scriptPath].filter((candidate) => existsSync(candidate));
  if (conflicts.length && !options.force) {
    return {
      exitCode: 1,
      message: `setup-generate: refusing to overwrite existing files without --force: ${conflicts.join(', ')}`,
    };
  }

  const manifest = {
    apiVersion: 'setup.aiwg.io/v1',
    kind: 'SetupManifest',
    metadata: {
      name: options.name ?? defaultManifestName(options.cwd),
      description: 'Generated starter manifest; no os configuration required.',
      install_type: options.type ?? 'developer',
    },
    spec: {
      platforms: [
        { os: options.platform ?? currentSetupOs() },
      ],
      steps: [
        {
          id: 'setup',
          type: 'script',
          script: scriptRel,
        },
      ],
      briefing: {
        success: 'Setup completed.',
        next_steps: [
          'Review generated script bodies before running against a real environment.',
        ],
      },
    },
  };

  mkdirSync(path.dirname(scriptPath), { recursive: true });
  mkdirSync(manifestDir, { recursive: true });
  writeFileSync(scriptPath, [
    '#!/usr/bin/env sh',
    'set -eu',
    `echo "Setup placeholder for ${manifest.metadata.name}"`,
    '',
  ].join('\n'), 'utf8');
  chmodSync(scriptPath, 0o755);
  writeFileSync(manifestPath, stringify(manifest), 'utf8');

  const payload = { manifestPath, scriptPath, manifest };
  if (options.json) process.stdout.write(JSON.stringify(payload, null, 2) + '\n');
  else {
    process.stdout.write([
      `Generated: ${manifestPath}`,
      `Script:    ${scriptPath}`,
      'Next:      aiwg setup-validate --manifest ' + manifestPath,
      '',
    ].join('\n'));
  }
  return { exitCode: 0 };
}

function platformMatches(target: { os: string; distro?: string; arch: string; shell: string }, candidate: SetupManifest['spec']['platforms'][number]): boolean {
  if (candidate.os !== target.os) return false;
  if (candidate.distros?.length && (!target.distro || !candidate.distros.includes(target.distro))) return false;
  if (candidate.arch?.length && !candidate.arch.includes(target.arch)) return false;
  if (candidate.shell && candidate.shell !== target.shell) return false;
  return true;
}

function stepPlatformMatches(target: string, step: SetupStep): boolean {
  if (!step.platform) return true;
  return Array.isArray(step.platform) ? step.platform.includes(target) : step.platform === target;
}

function loadParamsFile(cwd: string, paramsFile?: string): Record<string, string> {
  if (!paramsFile) return {};
  const full = path.resolve(cwd, paramsFile);
  const parsed = parseYamlFile(full);
  if (parsed.errors.length) throw new Error(`params file is invalid YAML: ${parsed.errors[0].message}`);
  if (!parsed.value || typeof parsed.value !== 'object' || Array.isArray(parsed.value)) {
    throw new Error('params file must be a YAML object');
  }
  return Object.fromEntries(Object.entries(parsed.value as Record<string, unknown>).map(([key, value]) => [key, String(value)]));
}

function expandPathValue(value: string): string {
  if (value === '~') return os.homedir();
  if (value.startsWith('~/')) return path.join(os.homedir(), value.slice(2));
  return value.replace(/\$HOME\b/g, os.homedir());
}

function resolveParams(manifest: SetupManifest, options: RunOptions): { values: Record<string, string>; missing: string[] } {
  const fileValues = loadParamsFile(options.cwd, options.paramsFile);
  const values: Record<string, string> = {};
  const missing: string[] = [];
  for (const param of manifest.spec.params ?? []) {
    let value = options.paramValues[param.name] ?? fileValues[param.name] ?? process.env[param.name];
    if (value === undefined && !param.interactive_required && param.default !== undefined) value = String(param.default);
    if ((param.required || param.interactive_required) && value === undefined) {
      missing.push(param.name);
      continue;
    }
    if (value !== undefined) {
      if (param.type === 'choice' && param.choices?.length && !param.choices.includes(value)) {
        missing.push(`${param.name} (must be one of: ${param.choices.join(', ')})`);
        continue;
      }
      values[param.name] = param.type === 'path' ? expandPathValue(value) : value;
    }
  }
  return { values, missing };
}

function selectedSteps(manifest: SetupManifest, options: RunOptions): SetupStep[] {
  let steps = manifest.spec.steps;
  if (options.step) steps = steps.filter((step) => step.id === options.step);
  return steps.filter((step) => !options.skip.has(step.id));
}

function planLines(manifest: SetupManifest, manifestPath: string, target: ReturnType<typeof detectPlatform>, params: Record<string, string>, steps: SetupStep[]): string {
  const lines = [
    `[setup:dry-run] Would execute: ${manifestPath}`,
    `  Platform: ${target.os}${target.distro ? `/${target.distro}` : ''}/${target.arch}`,
    `  Install type: ${manifest.metadata.install_type ?? 'user'}`,
    '',
    `  Params (${Object.keys(params).length}):`,
    ...Object.keys(params).sort().map((key) => `    ${key}=${params[key]}`),
    '',
    `  Steps (${steps.length}):`,
  ];
  steps.forEach((step, index) => {
    lines.push(`    ${index + 1}. ${step.id} (${step.type})${step.script ? ` script=${step.script}` : ''}${step.config_id ? ` config_id=${step.config_id}` : ''}${step.manifest ? ` manifest=${step.manifest}` : ''}`);
  });
  return lines.join('\n') + '\n';
}

function commandResult(status: number | null): { ok: boolean; status: number } {
  const code = status === null ? 1 : status;
  return { ok: code === 0, status: code };
}

function runShell(command: string, cwd: string, env: NodeJS.ProcessEnv): { ok: boolean; status: number } {
  const result = spawnSync(command, { cwd, env, shell: true, stdio: 'inherit' });
  return commandResult(result.status);
}

function isDestructiveScript(filePath: string): boolean {
  const name = path.basename(filePath);
  if (/reset/i.test(name)) return true;
  if (!existsSync(filePath) || !statSync(filePath).isFile()) return false;
  const text = readFileSync(filePath, 'utf8');
  return /\brm\s+-rf\b|\b(cp|mv)\s+-f\b|>\s*\S+/.test(text);
}

function runStep(step: SetupStep, manifest: SetupManifest, manifestDir: string, params: Record<string, string>, targetOs: string, confirmed: boolean, recovery = false): { ok: boolean; status: number; failedStep?: string } {
  if (!stepPlatformMatches(targetOs, step)) return { ok: true, status: 0 };
  const env = { ...process.env, ...params };
  console.log(`[setup] Step ${step.id} (${step.type})`);
  if (step.type === 'script') {
    const scriptPath = path.resolve(manifestDir, step.script!);
    console.log(`  script: ${scriptPath}`);
    console.log(`  env: ${Object.keys(params).sort().join(', ') || '(none)'}`);
    if (step.verify) console.log(`  verify: ${Array.isArray(step.verify) ? step.verify.join(' && ') : step.verify}`);
    if ((recovery || isDestructiveScript(scriptPath)) && !confirmed) {
      console.error(`setup-run: refusing destructive step '${step.id}' without --yes/--confirm`);
      return { ok: false, status: 2, failedStep: step.id };
    }
    const result = spawnSync(scriptPath, [], { cwd: manifestDir, env, stdio: 'inherit' });
    const ran = commandResult(result.status);
    if (!ran.ok) return { ...ran, failedStep: step.id };
    const verifies = Array.isArray(step.verify) ? step.verify : step.verify ? [step.verify] : [];
    for (const verify of verifies) {
      const verified = runShell(verify, manifestDir, env);
      if (!verified.ok) return { ...verified, failedStep: step.id };
    }
    return ran;
  }
  if (step.type === 'verify' || step.type === 'detect') {
    const commands = step.commands ?? (Array.isArray(step.verify) ? step.verify : step.verify ? [step.verify] : []);
    for (const command of commands) {
      console.log(`  command: ${command}`);
      const result = runShell(command, manifestDir, env);
      if (!result.ok) return { ...result, failedStep: step.id };
    }
    return { ok: true, status: 0 };
  }
  if (step.type === 'os-config') {
    const entry = manifest.spec.os_config?.find((item) => item.id === step.config_id)!;
    console.log(`  os_config: ${entry.id} - ${entry.description}`);
    const check = runShell(entry.check, manifestDir, env);
    if (check.ok) return { ok: true, status: 0 };
    if (!confirmed) {
      console.error(`setup-run: refusing OS configuration '${entry.id}' without --yes/--confirm`);
      return { ok: false, status: 2, failedStep: step.id };
    }
    return runShell(entry.apply, manifestDir, env);
  }
  if (step.type === 'agentic') {
    console.error(`setup-run: agentic step '${step.id}' requires manual installer-agent handling; aborting deterministic CLI execution`);
    return { ok: false, status: 2, failedStep: step.id };
  }
  if (step.type === 'chain') {
    console.error(`setup-run: chain step '${step.id}' validated manifest existence but deterministic nested execution is not supported yet`);
    return { ok: false, status: 2, failedStep: step.id };
  }
  if (step.type === 'ask') {
    console.error(`setup-run: ask step '${step.id}' requires interactive input; use params before execution`);
    return { ok: false, status: 2, failedStep: step.id };
  }
  if (step.type === 'platform-route') {
    const route = step.routes?.find((item) => item.platform === targetOs);
    for (const nested of route?.steps ?? []) {
      const result = runStep(nested, manifest, manifestDir, params, targetOs, confirmed);
      if (!result.ok) return result;
    }
    return { ok: true, status: 0 };
  }
  return { ok: true, status: 0 };
}

export function runSetupManifest(options: RunOptions): HandlerResult {
  const validation = validateSetupManifest({
    cwd: options.cwd,
    frameworkRoot: options.frameworkRoot,
    manifestPath: options.manifestPath,
  });
  const errors = validation.findings.filter((finding) => finding.severity === 'error');
  if (errors.length || !validation.manifest) {
    process.stdout.write(renderValidationText(validation));
    return { exitCode: 1, message: 'setup-run: manifest validation failed before execution' };
  }
  const manifest = validation.manifest;
  if (manifest.metadata.execution_mode === 'provider-orchestrated') {
    return {
      exitCode: 2,
      message: 'setup-run: this manifest is provider-orchestrated; give its URL or contents to a supported AI provider instead of executing it as a deterministic CLI manifest',
    };
  }
  const target = detectPlatform(options);
  if (!manifest.spec.platforms.some((candidate) => platformMatches(target, candidate))) {
    return { exitCode: 1, message: `setup-run: platform ${target.os}${target.distro ? `/${target.distro}` : ''}/${target.arch}/${target.shell} is not declared in the manifest` };
  }
  const params = resolveParams(manifest, options);
  if (params.missing.length) {
    return { exitCode: 1, message: `setup-run: required params missing before execution: ${params.missing.join(', ')}` };
  }
  const steps = selectedSteps(manifest, options);
  if (options.step && steps.length === 0) return { exitCode: 1, message: `setup-run: step '${options.step}' not found` };
  if (options.dryRun) {
    process.stdout.write(planLines(manifest, validation.manifestPath, target, params.values, steps));
    return { exitCode: 0 };
  }
  if (!options.yes) {
    return { exitCode: 2, message: 'setup-run: mutating execution requires --yes or --confirm after reviewing the plan with --dry-run' };
  }
  for (const step of steps) {
    const result = runStep(step, manifest, validation.manifestDir, params.values, target.os, options.yes);
    if (!result.ok) {
      if (result.failedStep && step.on_fail) {
        const recovery = manifest.spec.recovery?.find((item) => item.id === step.on_fail);
        if (recovery) {
          console.error(`[setup] recovery '${recovery.id}' available for failed step '${result.failedStep}'`);
          for (const recoveryStep of recovery.steps) {
            const recoveryResult = runStep(recoveryStep, manifest, validation.manifestDir, params.values, target.os, options.yes, true);
            if (!recoveryResult.ok) return { exitCode: recoveryResult.status || 1, message: `setup-run: recovery '${recovery.id}' failed` };
          }
        }
      }
      return { exitCode: result.status || 1, message: `setup-run: step '${result.failedStep ?? step.id}' failed` };
    }
  }
  console.log('[setup] Installation complete');
  if (manifest.spec.briefing?.success) console.log(manifest.spec.briefing.success);
  for (const next of manifest.spec.briefing?.next_steps ?? []) console.log(`  - ${next}`);
  return { exitCode: 0 };
}

export const setupValidateHandler: CommandHandler = {
  id: 'setup-validate',
  name: 'Setup Manifest Validate',
  description: 'Validate setup.aiwg.io/v1 manifests against the canonical schema and consistency checks',
  category: 'project',
  aliases: [],
  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    if (hasFlag(ctx.args, '--help', '-h')) {
      process.stdout.write(VALIDATE_HELP);
      return { exitCode: 0 };
    }
    const strict = hasFlag(ctx.args, '--strict');
    const result = validateSetupManifest({
      cwd: ctx.cwd,
      frameworkRoot: ctx.frameworkRoot,
      manifestPath: flagValue(ctx.args, '--manifest') ?? positionalManifest(ctx.args),
      schemaPath: flagValue(ctx.args, '--schema'),
      strict,
    });
    const payload = {
      valid: !result.findings.some((finding) => finding.severity === 'error'),
      manifestPath: result.manifestPath,
      schemaPath: result.schemaPath,
      findings: result.findings,
    };
    if (hasFlag(ctx.args, '--json')) process.stdout.write(JSON.stringify(payload, null, 2) + '\n');
    else process.stdout.write(renderValidationText(result));
    return { exitCode: payload.valid ? 0 : 1 };
  },
};

export const setupGenerateHandler: CommandHandler = {
  id: 'setup-generate',
  name: 'Setup Manifest Generate',
  description: 'Generate starter setup.aiwg.io/v1 manifests for agentic installer automation',
  category: 'project',
  aliases: [],
  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    if (hasFlag(ctx.args, '--help', '-h')) {
      process.stdout.write(GENERATE_HELP);
      return { exitCode: 0 };
    }
    try {
      return generateSetupManifest(parseGenerateOptions(ctx));
    } catch (error) {
      return {
        exitCode: 1,
        message: error instanceof Error ? error.message : String(error),
      };
    }
  },
};

export const setupRunHandler: CommandHandler = {
  id: 'setup-run',
  name: 'Setup Manifest Run',
  description: 'Validate and execute setup.aiwg.io/v1 manifests with installer safety gates',
  category: 'project',
  aliases: [],
  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    if (hasFlag(ctx.args, '--help', '-h')) {
      process.stdout.write(RUN_HELP);
      return { exitCode: 0 };
    }
    return runSetupManifest(parseRunOptions(ctx));
  },
};
