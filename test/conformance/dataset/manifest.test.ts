import { readFile } from 'node:fs/promises'
import { describe, expect, it } from 'vitest'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import { createHash } from 'node:crypto'
import type { DatasetConformanceManifest } from '../../../src/dataset/conformance-types.js'
import { conformanceDigest, validateConformanceManifest } from '../../../src/dataset/conformance.js'

const load = async () => JSON.parse(await readFile('test/fixtures/dataset-intelligence/v1/manifest.json', 'utf8')) as DatasetConformanceManifest

describe('dataset conformance manifest', () => {
  it('declares a valid, independently versioned and digestible matrix', async () => {
    const manifest = await load()
    expect(validateConformanceManifest(manifest)).toEqual([])
    expect(conformanceDigest(manifest)).toMatch(/^sha256:[0-9a-f]{64}$/u)
    expect(new Set(manifest.cells.map(cell => cell.area))).toEqual(new Set(['adapter', 'capability', 'replay', 'checkpoint', 'security', 'offline', 'provenance', 'standards', 'migration', 'parity']))
    const schema = JSON.parse(await readFile('schemas/dataset/conformance-manifest.v1.schema.json', 'utf8'))
    const ajv = new Ajv2020({ strict: true, allErrors: true }); addFormats(ajv)
    expect(ajv.compile(schema)(manifest)).toBe(true)
  })

  it('rejects mock-only stable claims and absent resource envelopes', async () => {
    const manifest = await load()
    const weakened = structuredClone(manifest)
    weakened.cells[0]!.evidence = ['fixture']
    weakened.cells[1]!.resourceEnvelope.maxBytes = 0
    expect(validateConformanceManifest(weakened).map(item => item.code)).toEqual(expect.arrayContaining(['CONFORMANCE_MOCK_ONLY_STABLE', 'CONFORMANCE_RESOURCE_ENVELOPE_MISSING']))
  })

  it('binds every committed golden source to the fixed corpus seed', async () => {
    const digestManifest = JSON.parse(await readFile('test/fixtures/dataset-intelligence/v1/digest-manifest.json', 'utf8')) as { seed: string; files: Record<string, string> }
    expect(digestManifest.seed).toBe('dataset-intelligence-v1')
    for (const [path, digest] of Object.entries(digestManifest.files)) {
      expect(createHash('sha256').update(await readFile(`test/fixtures/dataset-intelligence/v1/${path}`)).digest('hex'), path).toBe(digest)
    }
  })
})
