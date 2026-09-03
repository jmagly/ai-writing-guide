import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import Ajv2020 from 'ajv/dist/2020.js'
import { describe, expect, it } from 'vitest'
import { validateStorageConfig } from '../../../src/storage/config.js'

const schema = JSON.parse(readFileSync(resolve('schemas/storage/storage.config.v1.schema.json'), 'utf8'))
const validate = new Ajv2020({ strict: true, allErrors: true }).compile(schema)
const fixtures: unknown[] = [
  { version: '1' },
  { version: '1', roots: { research: 'research' }, backends: { memory: { type: 'notion', parent: { pageId: 'p' } } }, fallback: 'block' },
  { version: '1', backends: { memory: { type: 'webdav', url: 'http://localhost', basePath: '/' } } },
  {},
  { version: '2' },
  { version: '1', extra: true },
  { version: '1', roots: { unknown: 'x' } },
  { version: '1', backends: { memory: { type: 'obsidian' } } },
  { version: '1', backends: { memory: { type: 's3', bucket: 'b', token: 'secret' } } },
]

describe('storage config authority parity', () => {
  it.each(fixtures)('keeps bootstrap validation aligned for %j', fixture => {
    const runtime = (() => { try { validateStorageConfig(fixture); return true } catch { return false } })()
    expect(validate(fixture), JSON.stringify(validate.errors)).toBe(runtime)
  })
})
