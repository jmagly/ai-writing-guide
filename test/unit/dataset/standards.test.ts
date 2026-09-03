import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import { describe, expect, it } from 'vitest'
import {
  DESCRIPTOR_ONLY_PROFILES, OPENLINEAGE_PROFILE, PROV_PROFILE, StandardsProfileError,
  exportStandard, importStandard, listStandardsProfiles, resolveStandardsProfile,
} from '../../../src/dataset/index.js'
import type { RunLedgerSnapshot } from '../../../src/dataset/ledger-types.js'

const root = resolve(import.meta.dirname, '../../..')
const fixture = (name: string): any => JSON.parse(readFileSync(resolve(root, `test/fixtures/dataset/standards/${name}`), 'utf8'))
const schema = (name: string): any => JSON.parse(readFileSync(resolve(root, `schemas/dataset/${name}`), 'utf8'))
const ajv = new Ajv2020({ strict: true, allErrors: true }); addFormats(ajv)
const exchangeSchema = schema('dataset-standards-exchange.v1.schema.json')
ajv.addSchema(exchangeSchema)
const validateExchange = ajv.getSchema(exchangeSchema.$id)!
const validateDescriptor = ajv.compile({ $ref: `${exchangeSchema.$id}#/$defs/profileDescriptor` })
const validateProv = ajv.compile(schema('profiles/prov-json-20130430.schema.json'))
const validateOpenLineage = ajv.compile(schema('profiles/openlineage-1.0.0.schema.json'))

describe('dataset standards profile registry', () => {
  it('publishes exact immutable descriptors with collision-resistant namespaces', () => {
    const profiles = listStandardsProfiles()
    expect(profiles).toHaveLength(6)
    expect(PROV_PROFILE).toMatchObject({ version: '2013-04-30', direction: 'round-trip', maturity: 'stable' })
    expect(OPENLINEAGE_PROFILE.supportedFeatures).toContain('dataset.facets.columnLineage')
    expect(new Set(profiles.map(item => item.extensionNamespace)).size).toBe(profiles.length)
    expect(profiles.every(item => item.extensionNamespace.startsWith('https://aiwg.io/ns/dataset-standards/') && item.extensionNamespace.endsWith('/'))).toBe(true)
    expect(Object.isFrozen(PROV_PROFILE)).toBe(true)
    expect(profiles.every(item => validateDescriptor(item)), JSON.stringify(validateDescriptor.errors)).toBe(true)
  })

  it('keeps future standards descriptor-only with explicit use cases and coverage', () => {
    expect(DESCRIPTOR_ONLY_PROFILES.map(item => item.standard)).toEqual(['dcat', 'croissant', 'data-package', 'ro-crate'])
    expect(DESCRIPTOR_ONLY_PROFILES.every(item => item.maturity === 'descriptor-only' && item.useCases.length === 1 && item.coverageBoundary.startsWith('Descriptor only'))).toBe(true)
    expect(() => resolveStandardsProfile('dcat', '3.0', 'import')).toThrowError(/DATASET_STANDARD_UNSUPPORTED_CAPABILITY/)
  })

  it('rejects silent upgrades and unsupported versions with stable diagnostics', () => {
    expect(() => resolveStandardsProfile('openlineage', 'latest')).toThrowError(/DATASET_STANDARD_UNSUPPORTED_VERSION/)
    expect(() => resolveStandardsProfile('openlineage', '2.0.0')).toThrowError(/exact version selection is required/)
  })
})

describe('PROV-JSON 2013-04-30 adapter', () => {
  it('validates and maps the declared entity/activity/agent, relation, and correction boundary', () => {
    const source = fixture('prov-json-20130430.valid.json')
    expect(validateProv(source), JSON.stringify(validateProv.errors)).toBe(true)
    const imported = importStandard('w3c-prov-json', '2013-04-30', source)
    expect(imported.value.events.map(item => item.record.recordType)).toEqual(expect.arrayContaining(['entity', 'activity', 'agent', 'assertion', 'correction']))
    expect(imported.value.events.filter(item => item.record.recordType === 'assertion').map(item => item.record.basis)).toEqual(['imported', 'imported', 'imported', 'imported', 'imported'])
    expect(imported.loss.counts.mapped).toBe(10)
    expect(imported.loss.counts.unsupported).toBe(1)
    expect(validateExchange(imported), JSON.stringify(validateExchange.errors)).toBe(true)
  })

  it('exports deterministically and round-trips every advertised relation', () => {
    const imported = importStandard('w3c-prov-json', '2013-04-30', fixture('prov-json-20130430.valid.json'))
    const first = exportStandard('w3c-prov-json', '2013-04-30', imported.value)
    const second = exportStandard('w3c-prov-json', '2013-04-30', imported.value)
    expect(first).toEqual(second)
    expect(validateProv(first.value), JSON.stringify(validateProv.errors)).toBe(true)
    const roundTrip = importStandard('w3c-prov-json', '2013-04-30', first.value as object)
    const predicates = roundTrip.value.events.filter(item => item.record.recordType === 'assertion').map(item => item.record.predicate)
    expect(predicates).toEqual(expect.arrayContaining(['wasDerivedFrom', 'wasGeneratedBy', 'used', 'wasAttributedTo', 'wasAssociatedWith']))
    expect(roundTrip.value.events.some(item => item.record.recordType === 'correction')).toBe(true)
  })

  it('rejects invalid relations, conflicting identities, and reserved namespace collisions', () => {
    const invalid = fixture('invalid.json')
    expect(() => importStandard('w3c-prov-json', '2013-04-30', invalid.provMissingRelationIdentity)).toThrowError(/DATASET_STANDARD_INVALID_INPUT/)
    expect(() => importStandard('w3c-prov-json', '2013-04-30', { entity: { same: {} }, activity: { same: {} } })).toThrowError(/DATASET_STANDARD_IDENTITY_CONFLICT/)
    expect(() => importStandard('w3c-prov-json', '2013-04-30', invalid.reservedNamespaceCollision)).toThrowError(/DATASET_STANDARD_EXTENSION_COLLISION/)
  })

  it('reports restricted policy metadata rather than silently downgrading it', () => {
    const imported = importStandard('w3c-prov-json', '2013-04-30', { entity: { a: {} } })
    const record = imported.value.events[0].record
    if (record.recordType === 'entity') record.privacy = 'restricted'
    const exported = exportStandard('w3c-prov-json', '2013-04-30', imported.value)
    expect(exported.loss.items).toContainEqual(expect.objectContaining({ category: 'omitted', sourcePath: '/events/0/record/privacy' }))
    expect(JSON.stringify(exported.value)).not.toContain('restricted')
  })
})

describe('OpenLineage 1.0.0 adapter', () => {
  it('maps job/run, timing, failure, datasets, and declared facets without elevating imported evidence', () => {
    const source = fixture('openlineage-1.0.0.valid.json')
    expect(validateOpenLineage(source), JSON.stringify(validateOpenLineage.errors)).toBe(true)
    const imported = importStandard('openlineage', '1.0.0', source)
    const activity = imported.value.events[0].record
    expect(activity).toMatchObject({ recordType: 'activity', id: 'example.test/jobs/transform', runId: 'run-001', endedAt: '2026-09-02T10:01:00Z' })
    expect(imported.value.events.filter(item => item.record.recordType === 'assertion').every(item => item.record.basis === 'imported')).toBe(true)
    expect(imported.loss.counts.mapped).toBeGreaterThanOrEqual(4)
    expect(imported.loss.counts.unsupported).toBe(1)
    expect(imported.value.events.some(item => item.record.recordType === 'assertion' && item.record.field === 'normalized')).toBe(true)
  })

  it('exports a conforming event and preserves exact round-trip identities', () => {
    const imported = importStandard('openlineage', '1.0.0', fixture('openlineage-1.0.0.valid.json'))
    const exported = exportStandard('openlineage', '1.0.0', imported.value)
    expect(validateOpenLineage(exported.value), JSON.stringify(validateOpenLineage.errors)).toBe(true)
    expect(exported.value).toMatchObject({ eventType: 'COMPLETE', run: { runId: 'run-001' }, job: { namespace: 'example.test/jobs', name: 'transform' } })
    expect((exported.value as any).inputs).toEqual([{ namespace: 'example.test/data', name: 'source' }])
    expect((exported.value as any).outputs).toEqual([{ namespace: 'example.test/data', name: 'result', facets: { columnLineage: { fields: { normalized: { inputFields: [{ namespace: 'example.test/data', name: 'source', field: 'raw' }] } } } } }])
  })

  it('rejects invalid source and unsupported canonical event capabilities', () => {
    expect(() => importStandard('openlineage', '1.0.0', fixture('invalid.json').openLineageMissingRun)).toThrowError(/DATASET_STANDARD_INVALID_INPUT/)
    const unsupported: RunLedgerSnapshot = { schemaVersion: 'aiwg.run-ledger/v1', events: [{ ...importStandard('openlineage', '1.0.0', fixture('openlineage-1.0.0.valid.json')).value.events[0], record: { recordType: 'activity', id: 'job', activityType: 'custom', runId: 'r' } }] }
    expect(() => exportStandard('openlineage', '1.0.0', unsupported)).toThrowError(/DATASET_STANDARD_UNSUPPORTED_CAPABILITY/)
  })
})

describe('standards schemas and loss reports', () => {
  it('accepts governed exchange fixtures and rejects malformed versions', () => {
    expect(validateExchange(fixture('exchange.valid.json')), JSON.stringify(validateExchange.errors)).toBe(true)
    expect(validateExchange(fixture('exchange.invalid.json'))).toBe(false)
    expect(validateProv(fixture('prov-json-20130430.invalid.json'))).toBe(false)
    expect(validateOpenLineage(fixture('openlineage-1.0.0.invalid.json'))).toBe(false)
  })

  it('binds source bytes semantically and categorizes every conversion outcome', () => {
    const a = importStandard('w3c-prov-json', '2013-04-30', { entity: { a: {} }, extra: true })
    const b = importStandard('w3c-prov-json', '2013-04-30', { extra: true, entity: { a: {} } })
    expect(a.loss.sourceDigest).toEqual(b.loss.sourceDigest)
    expect(a.loss.items.map(item => item.category)).toEqual(expect.arrayContaining(['mapped', 'synthesized', 'unsupported']))
    expect(Object.values(a.loss.counts).reduce((sum, count) => sum + count, 0)).toBe(a.loss.items.length)
  })

  it('uses typed stable errors', () => {
    try { resolveStandardsProfile('openlineage', '0') } catch (error) { expect(error).toBeInstanceOf(StandardsProfileError); expect((error as StandardsProfileError).code).toBe('DATASET_STANDARD_UNSUPPORTED_VERSION') }
  })
})
