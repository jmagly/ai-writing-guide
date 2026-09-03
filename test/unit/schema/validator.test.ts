import { describe, expect, it } from 'vitest'
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

  it('rejects inputs beyond configured resource limits before compilation', () => {
    const loaded = loadSchemaCatalog({ rootDir })
    const validator = new SchemaValidator(new SchemaResolver(loaded.catalog!, { rootDir }), { rootDir, limits: { maxBytes: 4, maxDepth: 2 } })
    const result = validator.validate('catalog.root', { deeply: { nested: true } })
    expect(result.valid).toBe(false)
    expect(result.diagnostics.every(item => item.code === 'SCHEMA_RESOURCE_LIMIT')).toBe(true)
  })
})
