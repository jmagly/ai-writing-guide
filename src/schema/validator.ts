import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import Ajv, { type ErrorObject, type ValidateFunction } from 'ajv'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'

import type { CompiledSchemaEntry, SchemaDiagnostic } from './types.js'
import { SchemaResolver } from './resolver.js'

export interface SchemaValidationLimits {
  maxBytes?: number
  maxDepth?: number
}

export interface SchemaValidationResult {
  valid: boolean
  artifactId: string
  diagnostics: SchemaDiagnostic[]
}

function depth(value: unknown, seen = new Set<object>()): number {
  if (typeof value !== 'object' || value === null) return 0
  if (seen.has(value)) return 0
  seen.add(value)
  const children = Array.isArray(value) ? value : Object.values(value)
  return children.length === 0 ? 1 : 1 + Math.max(...children.map(item => depth(item, seen)))
}

function errorDiagnostic(artifactId: string, error: ErrorObject): SchemaDiagnostic {
  return {
    code: 'SCHEMA_INSTANCE_INVALID',
    severity: 'error',
    message: error.message ?? 'validation failed',
    artifactId,
    path: error.instancePath,
    details: { schemaPath: error.schemaPath, keyword: error.keyword, params: error.params },
  }
}

/** Offline, catalog-backed validator with bounded inputs and compiled-schema caching. */
export class SchemaValidator {
  private readonly cache = new Map<string, ValidateFunction>()

  constructor(
    readonly resolver: SchemaResolver,
    readonly options: { rootDir: string; limits?: SchemaValidationLimits },
  ) {}

  compile(query: string): ValidateFunction {
    const entry = this.resolver.require(query)
    if (entry.artifact.format !== 'json-schema') {
      throw new Error(`Validation requires a JSON Schema artifact; got ${entry.artifact.format}`)
    }
    const key = `${entry.artifact.id}\0${entry.digest ?? entry.artifact.version}`
    const cached = this.cache.get(key)
    if (cached) return cached
    const draft2020 = entry.artifact.dialect?.includes('2020-12') ?? false
    const ajv: Ajv = draft2020
      ? new Ajv2020({ strict: entry.effectivePolicy.strict, allErrors: true, loadSchema: undefined })
      : new Ajv({ strict: entry.effectivePolicy.strict, allErrors: true, loadSchema: undefined })
    addFormats(ajv)
    for (const candidate of this.resolver.list()) this.addCompatibleSchema(ajv, candidate, draft2020)
    const compiled = ajv.getSchema(entry.artifact.id)
    if (!compiled) throw new Error(`Could not compile schema ${entry.artifact.id}`)
    this.cache.set(key, compiled)
    return compiled
  }

  validate(query: string, instance: unknown): SchemaValidationResult {
    const entry = this.resolver.require(query)
    const diagnostics: SchemaDiagnostic[] = []
    const serialized = JSON.stringify(instance)
    const maxBytes = this.options.limits?.maxBytes ?? 10 * 1024 * 1024
    const maxDepth = this.options.limits?.maxDepth ?? 128
    if (Buffer.byteLength(serialized) > maxBytes) diagnostics.push({ code: 'SCHEMA_RESOURCE_LIMIT', severity: 'error', message: `Instance exceeds ${maxBytes} byte limit`, artifactId: entry.artifact.id })
    if (depth(instance) > maxDepth) diagnostics.push({ code: 'SCHEMA_RESOURCE_LIMIT', severity: 'error', message: `Instance exceeds depth limit ${maxDepth}`, artifactId: entry.artifact.id })
    if (diagnostics.length) return { valid: false, artifactId: entry.artifact.id, diagnostics }
    const check = this.compile(query)
    const valid = check(instance)
    return { valid, artifactId: entry.artifact.id, diagnostics: (check.errors ?? []).map(error => errorDiagnostic(entry.artifact.id, error)) }
  }

  private addCompatibleSchema(ajv: Ajv, entry: CompiledSchemaEntry, draft2020: boolean): void {
    if (entry.artifact.format !== 'json-schema' || !entry.artifact.authority.path) return
    if ((entry.artifact.dialect?.includes('2020-12') ?? false) !== draft2020) return
    const path = resolve(this.options.rootDir, entry.artifact.authority.path)
    const schema = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>
    ajv.addSchema(schema, entry.artifact.id)
  }
}
