import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import Ajv2020 from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import { describe, expect, it } from 'vitest'
import {
  RunLedger, RunLedgerError, computeLedgerEventDigest, createLedgerEvent, preventPrivacyDowngrade,
  projectLedgerToDependencyGraph, projectLedgerToW3cProv,
  projectFortemiProvenance, projectMarketplaceProvenance, projectMentionEdge, projectOperationalState,
  projectResearchProvenance, projectSdlcTraceLink, verifyLedgerEventDigest,
  type LedgerEvent, type LedgerRecord, type ProjectionContext,
} from '../../../src/dataset/index.js'

const root = resolve(import.meta.dirname, '../../..')
const schema = JSON.parse(readFileSync(resolve(root, 'schemas/dataset/run-ledger.v1.schema.json'), 'utf8'))
const validFixture = JSON.parse(readFileSync(resolve(root, 'test/fixtures/dataset/run-ledger.valid.json'), 'utf8'))
const invalidFixture = JSON.parse(readFileSync(resolve(root, 'test/fixtures/dataset/run-ledger.invalid.json'), 'utf8'))
const w3cGolden = JSON.parse(readFileSync(resolve(root, 'test/fixtures/dataset/run-ledger.w3c-prov.golden.json'), 'utf8'))
const ajv = new Ajv2020({ strict: true, allErrors: true }); addFormats(ajv); const validate = ajv.compile(schema)
const context: ProjectionContext = { producer: { id: 'software:aiwg', version: '2026.9.0' }, recordedAt: '2026-09-02T12:00:00Z', runId: 'run:1', privacy: 'internal', retentionPolicy: 'P30D' }

function events(): LedgerEvent[] {
  const records: LedgerRecord[] = [
    { recordType: 'agent', id: 'agent:1', principalKind: 'software', version: '1' },
    { recordType: 'entity', id: 'entity:source', entityType: 'dataset-revision', privacy: 'confidential', retentionPolicy: 'P30D' },
    { recordType: 'entity', id: 'entity:output', entityType: 'derived-artifact', privacy: 'confidential', retentionPolicy: 'P30D' },
    { recordType: 'activity', id: 'activity:1', activityType: 'transform', runId: 'run:1' },
    { recordType: 'evidence', id: 'evidence:1', source: { scheme: 'line-column', value: 'data/source.jsonl', line: 4 }, target: { scheme: 'json-pointer', value: 'entity:output', field: '/amount' }, method: 'execution-observation', confidence: 1, privacy: 'confidential', retentionPolicy: 'P30D', runId: 'run:1', responsibleAgentId: 'agent:1', observedAt: context.recordedAt },
    { recordType: 'assertion', id: 'assertion:1', subjectId: 'entity:output', predicate: 'wasDerivedFrom', objectId: 'entity:source', basis: 'observed', evidenceIds: ['evidence:1'], activityId: 'activity:1', runId: 'run:1', field: '/amount', privacy: 'confidential', retentionPolicy: 'P30D' },
  ]
  return records.map((record, index) => createLedgerEvent({ eventId: `event:${index + 1}`, runId: 'run:1', sequence: index + 1, recordedAt: context.recordedAt, producer: context.producer, record }))
}

describe('canonical run ledger (#2235)', () => {
  it('keeps schema/runtime fixtures strict and digest-bound', () => {
    expect(validate(validFixture), JSON.stringify(validate.errors)).toBe(true)
    expect(verifyLedgerEventDigest(validFixture)).toBe(true)
    expect(validate(invalidFixture)).toBe(false)
    expect(verifyLedgerEventDigest({ ...validFixture, recordedAt: '2026-09-03T00:00:00Z' })).toBe(false)
  })

  it('is append-only, idempotent for exact replay, and rejects rewritten history', () => {
    const ledger = new RunLedger(); const input = events()
    for (const item of input) expect(ledger.append(item).appended).toBe(true)
    expect(ledger.append(input[5]).appended).toBe(false)
    const rewritten = createLedgerEvent({ ...input[5], eventDigest: undefined, record: { ...input[5].record, id: 'assertion:changed' } } as never)
    rewritten.eventId = input[5].eventId
    expect(() => ledger.append(rewritten)).toThrow(RunLedgerError)
    expect(ledger.snapshot().events).toEqual(input)
  })

  it('preserves history through correction and supersession records', () => {
    const ledger = RunLedger.replay(events())
    const replacement = createLedgerEvent({ eventId: 'event:7', runId: 'run:1', sequence: 7, recordedAt: context.recordedAt, producer: context.producer, record: { recordType: 'assertion', id: 'assertion:2', subjectId: 'entity:output', predicate: 'wasDerivedFrom', objectId: 'entity:source', basis: 'observed', evidenceIds: ['evidence:1'], runId: 'run:1', privacy: 'confidential' } })
    ledger.append(replacement)
    ledger.append(createLedgerEvent({ eventId: 'event:8', sequence: 8, recordedAt: context.recordedAt, producer: context.producer, record: { recordType: 'correction', id: 'correction:1', correctsEventId: 'event:6', replacementEventId: 'event:7', reason: 'field locator corrected', responsibleAgentId: 'agent:1' } }))
    ledger.append(createLedgerEvent({ eventId: 'event:9', sequence: 9, recordedAt: context.recordedAt, producer: context.producer, record: { recordType: 'supersession', id: 'supersession:1', supersedesEventId: 'event:6', successorEventId: 'event:7' } }))
    expect(ledger.get('event:6')).toBeDefined(); expect(ledger.snapshot().events).toHaveLength(9)
  })

  it('rejects dangling references, malformed locators, privacy downgrade, and unbounded queries', () => {
    const ledger = new RunLedger()
    expect(() => ledger.append(createLedgerEvent({ eventId: 'bad:1', sequence: 1, recordedAt: context.recordedAt, producer: context.producer, record: { recordType: 'evidence', id: 'e:bad', source: { scheme: 'file', value: '../secret' }, method: 'read', confidence: 1, privacy: 'restricted', responsibleAgentId: 'missing', observedAt: context.recordedAt } }))).toThrow(/LOCATOR|locator/)
    expect(() => ledger.append(createLedgerEvent({ eventId: 'bad:2', sequence: 1, recordedAt: context.recordedAt, producer: context.producer, record: { recordType: 'evidence', id: 'e:missing-agent', source: { scheme: 'file', value: 'data/source.jsonl' }, method: 'read', confidence: 1, privacy: 'internal', responsibleAgentId: 'agent:missing', observedAt: context.recordedAt } }))).toThrow(/dangling/)
    expect(() => preventPrivacyDowngrade('restricted', 'public')).toThrow(/PRIVACY_DOWNGRADE/)
    const withoutEvidence = events()[5]
    withoutEvidence.record = { ...(withoutEvidence.record as Extract<LedgerRecord, { recordType: 'assertion' }>), evidenceIds: [] }
    const { eventDigest: _digest, ...withoutEvidenceContent } = withoutEvidence
    withoutEvidence.eventDigest = computeLedgerEventDigest(withoutEvidenceContent)
    expect(() => RunLedger.replay([...events().slice(0, 5), withoutEvidence])).toThrow(/evidence/)
    expect(() => new RunLedger().append(createLedgerEvent({ eventId: 'not-globally-scoped', sequence: 1, recordedAt: context.recordedAt, producer: context.producer, record: { recordType: 'agent', id: 'agent:1', principalKind: 'software' } }))).toThrow(/globally scoped/)
    expect(() => new RunLedger().append(createLedgerEvent({ eventId: 'event:unsupported', sequence: 1, recordedAt: context.recordedAt, producer: context.producer, record: { recordType: 'extension:unknown', id: 'extension:1' } as never }))).toThrow(/governed run-ledger vocabulary/)
    expect(() => RunLedger.replay(events()).query({ limit: 1001 })).toThrow(/limit/)
  })

  it('replays deterministically regardless of read page boundaries', () => {
    const source = events()
    for (let boundary = 0; boundary <= source.length; boundary += 1) {
      const replayed = RunLedger.replay([...source.slice(0, boundary), ...source.slice(boundary)])
      expect(replayed.snapshot().events).toEqual(source)
      expect(replayed.query({ afterSequence: 3, limit: 2 }).map((item) => item.sequence)).toEqual([4, 5])
    }
    expect(() => RunLedger.replay([source[1], source[0]])).toThrow(/sequence/)
    expect(() => RunLedger.replay(source).query({ afterSequence: -1 })).toThrow(/afterSequence/)
  })

  it('maps core W3C PROV to a golden value and reports omitted canonical qualifiers', () => {
    const projected = projectLedgerToW3cProv(events())
    expect(projected.value.entity['entity:source']).toBeDefined()
    expect(projected.value.activity['activity:1']).toBeDefined()
    expect(projected.value.agent['agent:1']).toBeDefined()
    expect(projected.value.wasDerivedFrom).toEqual([{ generatedEntity: 'entity:output', usedEntity: 'entity:source', evidence: ['evidence:1'] }])
    expect(JSON.parse(JSON.stringify(projected.value))).toEqual(w3cGolden)
    expect(projected.loss.lossless).toBe(false)
    expect(projected.loss.items.some((item) => item.path === '/records/evidence:1')).toBe(true)
  })

  it('makes every lossy compatibility projection explicit', () => {
    const research = projectResearchProvenance({ id: 'research:1', timestamp: context.recordedAt, entity: { id: 'paper:1', type: 'paper', attributes: { title: 'T' } }, activity: { id: 'activity:research', type: 'analysis', startedAt: context.recordedAt, endedAt: context.recordedAt, attributes: { description: 'review' } }, agent: { id: 'agent:research', type: 'software_agent', attributes: {} }, relationships: { wasGeneratedBy: 'activity:research', wasDerivedFrom: ['paper:source'], wasAttributedTo: 'agent:research', wasAssociatedWith: 'agent:research' } }, context)
    expect(research.loss.lossless).toBe(false)
    expect(() => RunLedger.replay(research.value)).not.toThrow()
    const market = projectMarketplaceProvenance({ standard: 'W3C-PROV', entities: [{ id: 'package:1', type: 'package', attributes: { channel: 'stable' } }], activities: [{ id: 'activity:publish', type: 'publish', startedAt: context.recordedAt, endedAt: context.recordedAt }], agents: [{ id: 'agent:publisher', type: 'organization' }], relations: [{ type: 'wasGeneratedBy', subject: 'package:1', object: 'activity:publish' }, { type: 'wasAssociatedWith', subject: 'activity:publish', object: 'agent:publisher' }] }, context)
    expect(market.loss.items).not.toEqual([])
    expect(() => RunLedger.replay(market.value)).not.toThrow()
    const fortemi = projectFortemiProvenance({ schema_version: 'aiwg.fortemi.index.record.v2', id: 'aiwg:artifact:1', type: 'aiwg.artifact', source: { path: 'docs/a.md', repo_relative_path: 'docs/a.md', locator: 'docs/a.md', checksum: 'a'.repeat(64) }, title: 'A', text: 'A', facets: {}, tags: [], concepts: [], relationships: [], provenance: [{ field: '/title', source: 'frontmatter', path: 'docs/a.md', confidence: 'source', privacy: 'private' }], provenance_events: [{ id: 'activity:fortemi-index', activity: 'index', agent: 'agent:fortemi', started_at: context.recordedAt, ended_at: context.recordedAt }], privacy: { classification: 'private', pii: false }, updated_at: context.recordedAt }, context)
    expect(() => RunLedger.replay(fortemi.value)).not.toThrow()
    expect(fortemi.loss.lossless).toBe(false)
    expect(fortemi.value.find((item) => item.record.recordType === 'evidence')?.record).toMatchObject({ privacy: 'confidential', responsibleAgentId: context.producer.id })
    expect(fortemi.value.find((item) => item.record.recordType === 'assertion' && item.record.field === '/title')?.record).toMatchObject({ field: '/title', basis: 'observed', retentionPolicy: 'P30D' })
    expect(fortemi.value.some((item) => item.record.recordType === 'assertion' && item.record.predicate === 'wasAssociatedWith')).toBe(true)
    expect(projectOperationalState({ classification: 'historical' }, 'state:1', context).loss.lossless).toBe(false)
    expect(projectSdlcTraceLink({ requirementId: 'UC-001', targetPath: 'src/a.ts', targetType: 'code', verified: true, confidence: 1 }, { ...context, runId: undefined }).loss.lossless).toBe(false)
  })

  it('retains mention/SDLC evidence before legacy graph projection reports loss', () => {
    const mention = projectMentionEdge({ sourcePath: 'src/a.ts', targetPath: 'docs/r.md', line: 12, confidence: 0.9 }, context)
    const evidence = mention.value.find((item) => item.record.recordType === 'evidence')!.record as any
    expect(evidence).toMatchObject({ source: { line: 12 }, method: 'mention', confidence: 0.9, runId: 'run:1' })
    const graph = projectLedgerToDependencyGraph(mention.value)
    expect(graph.value['src/a.ts'].upstream).toEqual([{ path: 'docs/r.md', type: 'mentions' }])
    expect(graph.loss.lossless).toBe(false)
    expect(graph.loss.items[0]).toMatchObject({ sourcePrivacy: 'internal', retentionPolicy: 'P30D' })
  })

  it('maps W3C usage, association, and attribution core relations', () => {
    const base = events()
    const extra: LedgerRecord[] = [
      { recordType: 'assertion', id: 'assertion:used', subjectId: 'activity:1', predicate: 'used', objectId: 'entity:source', basis: 'declared', evidenceIds: [], privacy: 'confidential' },
      { recordType: 'assertion', id: 'assertion:associated', subjectId: 'activity:1', predicate: 'wasAssociatedWith', objectId: 'agent:1', basis: 'declared', evidenceIds: [], privacy: 'confidential' },
      { recordType: 'assertion', id: 'assertion:attributed', subjectId: 'entity:output', predicate: 'wasAttributedTo', objectId: 'agent:1', basis: 'declared', evidenceIds: [], privacy: 'confidential' },
    ]
    const extended = [...base, ...extra.map((record, index) => createLedgerEvent({ eventId: `event:${base.length + index + 1}`, sequence: base.length + index + 1, recordedAt: context.recordedAt, producer: context.producer, record }))]
    expect(() => RunLedger.replay(extended)).not.toThrow()
    expect(projectLedgerToW3cProv(extended).value).toMatchObject({
      used: [{ activity: 'activity:1', entity: 'entity:source', evidence: [] }],
      wasAssociatedWith: [{ activity: 'activity:1', agent: 'agent:1' }],
      wasAttributedTo: [{ entity: 'entity:output', agent: 'agent:1' }],
    })
  })
})
