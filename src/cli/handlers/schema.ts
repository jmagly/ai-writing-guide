import { createHash } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, resolve } from 'node:path';
import { mkdirSync } from 'node:fs';
import { parse as parseYaml } from 'yaml';

import { analyzeBackwardCompatibility, loadSchemaCatalog, SchemaResolver, SchemaValidator, type CompiledSchemaEntry, type SchemaDiagnostic } from '../../schema/index.js';
import type { CommandHandler, HandlerContext, HandlerResult } from './types.js';

const ACTIONS = ['list', 'show', 'graph', 'policy', 'validate', 'lint', 'check-refs', 'diff', 'compatibility', 'generate', 'verify-projections'] as const;

function value(args: readonly string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  return index < 0 ? undefined : args[index + 1];
}

function positional(args: readonly string[]): string[] {
  const flagsWithValues = new Set(['--catalog', '--domain', '--lifecycle', '--format', '--direction', '--schema', '--against']);
  const result: string[] = [];
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    if (!arg) continue;
    if (flagsWithValues.has(arg)) { index += 1; continue; }
    if (!arg.startsWith('-')) result.push(arg);
  }
  return result;
}

function jsonResult(payload: unknown, exitCode = 0): HandlerResult {
  return { exitCode, rawOutput: true, message: `${JSON.stringify(payload, null, 2)}\n` };
}

function digest(bytes: string | Buffer): string {
  return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

function readData(path: string): unknown {
  const source = readFileSync(path, 'utf8');
  return ['.yaml', '.yml'].includes(extname(path).toLowerCase()) ? parseYaml(source) : JSON.parse(source) as unknown;
}

function diagnostic(code: string, message: string, entry?: CompiledSchemaEntry, path?: string): SchemaDiagnostic {
  return { code, severity: 'error', message, ...(entry ? { artifactId: entry.artifact.id } : {}), ...(path ? { path } : {}) };
}

function load(ctx: HandlerContext): { resolver?: SchemaResolver; diagnostics: SchemaDiagnostic[] } {
  const catalogPath = value(ctx.args, '--catalog');
  const result = loadSchemaCatalog({ rootDir: ctx.cwd, ...(catalogPath ? { catalogPath } : {}) });
  return {
    ...(result.catalog ? { resolver: new SchemaResolver(result.catalog, { rootDir: ctx.cwd }) } : {}),
    diagnostics: result.diagnostics,
  };
}

function authorityPath(ctx: HandlerContext, entry: CompiledSchemaEntry): string {
  const path = entry.artifact.authority.path;
  if (!path) throw new Error(`${entry.artifact.id} has no local canonical authority`);
  return resolve(ctx.cwd, path);
}

function schemaRefs(node: unknown, refs: string[] = []): string[] {
  if (Array.isArray(node)) for (const child of node) schemaRefs(child, refs);
  else if (typeof node === 'object' && node !== null) {
    for (const [key, child] of Object.entries(node)) {
      if (key === '$ref' && typeof child === 'string') refs.push(child);
      else schemaRefs(child, refs);
    }
  }
  return refs;
}

function resolveBaseline(ctx: HandlerContext, resolver: SchemaResolver, query: string): unknown {
  const entry = resolver.resolve(query);
  return readData(entry ? authorityPath(ctx, entry) : resolve(ctx.cwd, query));
}

async function execute(ctx: HandlerContext): Promise<HandlerResult> {
  const [action = 'list', ...terms] = positional(ctx.args);
  if (!ACTIONS.includes(action as typeof ACTIONS[number])) return { exitCode: 1, message: `Unknown schema action '${action}'.` };
  const loaded = load(ctx);
  if (!loaded.resolver) return jsonResult({ schema: 'aiwg.schema.diagnostics.v1', valid: false, diagnostics: loaded.diagnostics }, 1);
  const resolver = loaded.resolver;
  const query = terms[0];

  if (action === 'list') {
    const entries = resolver.list({ domain: value(ctx.args, '--domain'), lifecycle: value(ctx.args, '--lifecycle'), format: value(ctx.args, '--format') });
    return jsonResult({ schema: 'aiwg.schema.list.v1', entries: entries.map(({ artifact, domain, digest: hash }) => ({ id: artifact.id, logicalName: artifact.logicalName, version: artifact.version, domain, format: artifact.format, lifecycle: artifact.lifecycle, digest: hash })) });
  }
  if (action === 'show') {
    if (!query) return { exitCode: 1, message: 'Usage: aiwg schema show <id|name@version|path>' };
    const entry = resolver.require(query);
    return jsonResult({ schema: 'aiwg.schema.show.v1', ...entry });
  }
  if (action === 'graph') {
    const direction = value(ctx.args, '--direction');
    if (direction && !['dependencies', 'dependents', 'both'].includes(direction)) throw new Error(`Invalid graph direction '${direction}'`);
    return jsonResult({ schema: 'aiwg.schema.graph.v1', ...resolver.graph(query, { direction: direction as 'dependencies' | 'dependents' | 'both' | undefined }) });
  }
  if (action === 'policy') {
    const effective = ctx.args.includes('--effective');
    if (!effective || !query) return { exitCode: 1, message: 'Usage: aiwg schema policy --effective <id>' };
    return jsonResult({ schema: 'aiwg.schema.policy.v1', id: resolver.require(query).artifact.id, effective: resolver.policy(query) });
  }
  if (action === 'validate') {
    const schemaQuery = value(ctx.args, '--schema');
    const instance = schemaQuery ? query : terms[1];
    const selected = schemaQuery ?? query;
    if (!selected || !instance) return { exitCode: 1, message: 'Usage: aiwg schema validate --schema <id> <instance>' };
    const entry = resolver.require(selected);
    if (entry.artifact.format !== 'json-schema') throw new Error(`Validation currently requires a JSON Schema artifact; got ${entry.artifact.format}`);
    const data = readData(resolve(ctx.cwd, instance));
    const result = new SchemaValidator(resolver, { rootDir: ctx.cwd }).validate(entry.artifact.id, data);
    return jsonResult({ schema: 'aiwg.schema.validation.v1', ...result, instance }, result.valid ? 0 : 1);
  }
  if (action === 'lint') {
    const diagnostics = [...loaded.diagnostics];
    const entries = resolver.list();
    for (const entry of entries) {
      if (entry.artifact.format !== 'json-schema') continue;
      try {
        new SchemaValidator(resolver, { rootDir: ctx.cwd }).compile(entry.artifact.id);
      } catch (error) {
        diagnostics.push(diagnostic('SCHEMA_COMPILE_FAILED', error instanceof Error ? error.message : String(error), entry, entry.artifact.authority.path));
      }
    }
    const valid = !diagnostics.some(item => item.severity === 'error');
    return jsonResult({ schema: 'aiwg.schema.diagnostics.v1', valid, diagnostics }, valid ? 0 : 1);
  }
  if (action === 'check-refs') {
    const diagnostics: SchemaDiagnostic[] = [];
    for (const entry of resolver.list()) {
      for (const dependency of entry.artifact.dependencies ?? []) if (!resolver.resolve(dependency.id) && !dependency.optional) diagnostics.push(diagnostic('SCHEMA_DEPENDENCY_UNRESOLVED', `Unresolved dependency ${dependency.id}`, entry));
      if (entry.artifact.format !== 'json-schema' || !entry.artifact.authority.path) continue;
      for (const ref of schemaRefs(readData(authorityPath(ctx, entry)))) {
        if (ref.startsWith('#')) continue;
        const base = ref.split('#')[0];
        if (!base) continue;
        const local = resolve(dirname(authorityPath(ctx, entry)), base);
        if (!resolver.resolve(base) && !resolver.resolve(ref) && !existsSync(local)) diagnostics.push(diagnostic('SCHEMA_REFERENCE_UNRESOLVED', `Unresolved $ref ${ref}`, entry, entry.artifact.authority.path));
      }
    }
    return jsonResult({ schema: 'aiwg.schema.references.v1', valid: diagnostics.length === 0, diagnostics }, diagnostics.length ? 1 : 0);
  }
  if (action === 'diff' || action === 'compatibility') {
    const against = value(ctx.args, '--against');
    if (!query || !against) return { exitCode: 1, message: `Usage: aiwg schema ${action} <id|path> --against <id|path>` };
    const current = resolveBaseline(ctx, resolver, query);
    const baseline = resolveBaseline(ctx, resolver, against);
    const result = analyzeBackwardCompatibility(baseline, current);
    return jsonResult({ schema: action === 'diff' ? 'aiwg.schema.diff.v1' : 'aiwg.schema.compatibility.v1', current: query, baseline: against, ...result }, result.status === 'breaking' ? 1 : 0);
  }
  if (action === 'verify-projections') {
    const entries = query ? [resolver.require(query)] : resolver.list();
    const diagnostics: SchemaDiagnostic[] = [];
    for (const entry of entries) for (const projection of entry.artifact.projections ?? []) {
      const path = resolve(ctx.cwd, projection.path);
      if (!existsSync(path)) { diagnostics.push(diagnostic('SCHEMA_PROJECTION_MISSING', `Projection does not exist: ${projection.path}`, entry, projection.path)); continue; }
      const actual = digest(readFileSync(path));
      if (projection.digest && projection.digest !== actual) diagnostics.push(diagnostic('SCHEMA_PROJECTION_DRIFT', `Projection digest does not match: ${projection.path}`, entry, projection.path));
      if (projection.kind === 'mirror' && readFileSync(path).compare(readFileSync(authorityPath(ctx, entry))) !== 0) diagnostics.push(diagnostic('SCHEMA_PROJECTION_DRIFT', `Mirror differs from canonical authority: ${projection.path}`, entry, projection.path));
    }
    return jsonResult({ schema: 'aiwg.schema.projections.v1', valid: diagnostics.length === 0, diagnostics }, diagnostics.length ? 1 : 0);
  }

  const entries = query ? [resolver.require(query)] : resolver.list();
  const projections = entries.flatMap(entry => (entry.artifact.projections ?? []).map(projection => ({ artifactId: entry.artifact.id, source: entry.artifact.authority.path, ...projection })));
  if (ctx.args.includes('--write')) for (const item of projections) {
    if (item.kind !== 'mirror' || !item.source) continue;
    const target = resolve(ctx.cwd, item.path);
    mkdirSync(dirname(target), { recursive: true });
    writeFileSync(target, readFileSync(resolve(ctx.cwd, item.source)));
  }
  return jsonResult({ schema: 'aiwg.schema.generation-plan.v1', write: ctx.args.includes('--write'), projections });
}

export const schemaHandler: CommandHandler = {
  id: 'schema',
  name: 'Schema Control Plane',
  description: 'Discover, validate, compare, and verify governed schema artifacts',
  category: 'utility',
  aliases: ['schemas'],
  async help() {
    return { exitCode: 0, rawOutput: true, message: [
      'Usage: aiwg schema <action> [options]',
      '',
      'Discovery: list, show <id>, graph [id], policy --effective <id>',
      'Quality: lint, check-refs, validate --schema <id> <instance>',
      'Evolution: diff <id|path> --against <id|path>, compatibility <id|path> --against <id|path>',
      'Projections: generate [id] [--write], verify-projections [id]',
      '',
      'Common options: --catalog <path>, --domain <id>, --lifecycle <state>, --format <format>',
      'All command results use stable versioned JSON envelopes.',
    ].join('\n') };
  },
  async execute(ctx) {
    try { return await execute(ctx); }
    catch (error) { return jsonResult({ schema: 'aiwg.schema.error.v1', error: error instanceof Error ? error.message : String(error) }, 1); }
  },
};
