import { describe, expect, it, vi } from 'vitest'
import { loadSchemaCatalog, SchemaResolver, SchemaValidator } from '../../../src/schema/index.js'

const rootDir = process.cwd()

describe('SchemaValidator', () => {
  it('validates through catalog identity and returns stable diagnostics', () => {
    const loaded = loadSchemaCatalog({ rootDir })
    expect(loaded.valid).toBe(true)
    const validator = new SchemaValidator(new SchemaResolver(loaded.catalog!, { rootDir }), { rootDir })
    expect(validator.validate('catalog.root', { schemaVersion: '1', domains: [] }).valid).toBe(true)
    const invalid = validator.validate('catalog.root', {})
    expect(invalid.valid).toBe(false)
    expect(invalid.diagnostics[0]?.code).toBe('SCHEMA_INSTANCE_INVALID')
  })

  it('rejects oversized inputs before compilation with a byte-limit diagnostic', () => {
    const loaded = loadSchemaCatalog({ rootDir })
    expect(loaded.valid).toBe(true)
    const validator = new SchemaValidator(new SchemaResolver(loaded.catalog!, { rootDir }), { rootDir, limits: { maxBytes: 4, maxDepth: 128 } })
    const compile = vi.spyOn(validator, 'compile')
    const result = validator.validate('catalog.root', { schemaVersion: '1', domains: [] })
    expect(result.valid).toBe(false)
    expect(result.diagnostics).toEqual([
      expect.objectContaining({ code: 'SCHEMA_RESOURCE_LIMIT', message: 'Instance exceeds 4 byte limit' }),
    ])
    expect(compile).not.toHaveBeenCalled()
  })

  it('rejects excessive depth independently of bytes before compilation', () => {
    const loaded = loadSchemaCatalog({ rootDir })
    expect(loaded.valid).toBe(true)
    const validator = new SchemaValidator(new SchemaResolver(loaded.catalog!, { rootDir }), { rootDir, limits: { maxBytes: 1024, maxDepth: 1 } })
    const compile = vi.spyOn(validator, 'compile')
    const result = validator.validate('catalog.root', { schemaVersion: '1', domains: [] })
    expect(result.valid).toBe(false)
    expect(result.diagnostics).toEqual([
      expect.objectContaining({ code: 'SCHEMA_RESOURCE_LIMIT', message: 'Instance exceeds depth limit 1' }),
    ])
    expect(compile).not.toHaveBeenCalled()
  })

  it('accepts valid input exactly at the byte and depth limits', () => {
    const loaded = loadSchemaCatalog({ rootDir })
    expect(loaded.valid).toBe(true)
    const input = { schemaVersion: '1', domains: [] }
    const validator = new SchemaValidator(new SchemaResolver(loaded.catalog!, { rootDir }), {
      rootDir, limits: { maxBytes: Buffer.byteLength(JSON.stringify(input)), maxDepth: 2 },
    })
    expect(validator.validate('catalog.root', input)).toEqual({ valid: true, artifactId: validator.resolver.require('catalog.root').artifact.id, diagnostics: [] })
  })
})
