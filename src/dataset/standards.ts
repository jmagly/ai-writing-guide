import { createHash } from 'node:crypto'
import { readFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import Ajv2020, { type ValidateFunction } from 'ajv/dist/2020.js'
import addFormats from 'ajv-formats'
import { createLedgerEvent } from './ledger.js'
import type { LedgerAssertion, LedgerEvent, LedgerRecord, RunLedgerSnapshot } from './ledger-types.js'
import { RUN_LEDGER_VERSION } from './ledger-types.js'
import {
  STANDARDS_EXCHANGE_VERSION, StandardsProfileError,
  type LossCategory, type StandardAdapter, type StandardId, type StandardsExchange,
  type StandardsLossItem, type StandardsLossReport, type StandardsProfileDescriptor,
} from './standards-types.js'

const AIWG_EXTENSION_ROOT = 'https://aiwg.io/ns/dataset-standards/'
const PRODUCER = { id: 'aiwg:standards-adapter', version: '1.0.0' }
const IMPORTED_AT = '1970-01-01T00:00:00.000Z'

function packageRoot(start: string): string {
  let current = resolve(start)
  for (;;) {
    try {
      const manifest = JSON.parse(readFileSync(join(current, 'package.json'), 'utf8')) as { name?: string }
      if (manifest.name === 'aiwg' || manifest.name === '@aiwg/cli') return current
    } catch { /* source and compiled modules have different depths */ }
    const parent = dirname(current)
    if (parent === current) throw new Error('dataset standards: could not locate the aiwg package root')
    current = parent
  }
}
const root = packageRoot(dirname(fileURLToPath(import.meta.url)))
const ajv = new Ajv2020({ strict: true, allErrors: true }); addFormats(ajv)
function compileSchema(name: string): ValidateFunction { return ajv.compile(JSON.parse(readFileSync(join(root, 'schemas/dataset/profiles', name), 'utf8')) as Record<string, unknown>) }
const validateProvDocument = compileSchema('prov-json-20130430.schema.json')
const validateOpenLineageDocument = compileSchema('openlineage-1.0.0.schema.json')

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`
  if (value && typeof value === 'object') return `{${Object.entries(value as Record<string, unknown>).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(',')}}`
  return JSON.stringify(value)
}
function digest(value: unknown): { algorithm: 'sha256'; value: string } { return { algorithm: 'sha256', value: createHash('sha256').update(stable(value)).digest('hex') } }
function loss(profile: StandardsProfileDescriptor, direction: 'import' | 'export', source: unknown, items: StandardsLossItem[]): StandardsLossReport {
  const counts = { mapped: 0, omitted: 0, synthesized: 0, unsupported: 0, 'extension-carried': 0 } satisfies Record<LossCategory, number>
  for (const item of items) counts[item.category]++
  return { schemaVersion: STANDARDS_EXCHANGE_VERSION, profileId: profile.id, profileVersion: profile.version, direction, sourceDigest: digest(source), items, counts }
}
function exchange<T>(profile: StandardsProfileDescriptor, direction: 'import' | 'export', source: unknown, value: T, items: StandardsLossItem[]): StandardsExchange<T> {
  return { schemaVersion: STANDARDS_EXCHANGE_VERSION, profile: { id: profile.id, version: profile.version }, value, loss: loss(profile, direction, source, items) }
}
function isObject(value: unknown): value is Record<string, unknown> { return Boolean(value) && typeof value === 'object' && !Array.isArray(value) }
function invalid(code: 'DATASET_STANDARD_INVALID_INPUT' | 'DATASET_STANDARD_INVALID_OUTPUT', detail: string): never { throw new StandardsProfileError(code, detail) }
function validateDocument(validate: ValidateFunction, value: unknown, direction: 'input' | 'output'): void {
  if (!validate(value)) invalid(direction === 'input' ? 'DATASET_STANDARD_INVALID_INPUT' : 'DATASET_STANDARD_INVALID_OUTPUT', ajv.errorsText(validate.errors, { separator: '; ' }))
}
function event(record: LedgerRecord, sequence: number): LedgerEvent { return createLedgerEvent({ eventId: `urn:aiwg:standards:event:${sequence}:${encodeURIComponent(record.id)}`, sequence, recordedAt: IMPORTED_AT, producer: PRODUCER, record }) }
function assertion(id: string, subjectId: string, predicate: string, objectId: string): LedgerAssertion {
  return { recordType: 'assertion', id, subjectId, predicate, objectId, basis: 'imported', evidenceIds: [], privacy: 'internal' }
}
function entries(value: unknown, path: string): Array<[string, Record<string, unknown>]> {
  if (value === undefined) return []
  if (!isObject(value)) invalid('DATASET_STANDARD_INVALID_INPUT', `${path} must be an object`)
  return Object.entries(value).map(([id, item]) => {
    if (!isObject(item)) invalid('DATASET_STANDARD_INVALID_INPUT', `${path}/${id} must be an object`)
    return [id, item]
  })
}
function ensureLedger(snapshot: RunLedgerSnapshot): void {
  if (!isObject(snapshot) || snapshot.schemaVersion !== RUN_LEDGER_VERSION || !Array.isArray(snapshot.events)) invalid('DATASET_STANDARD_INVALID_INPUT', 'canonical input must be a run-ledger/v1 snapshot')
}
function extensionItems(document: Record<string, unknown>, known: Set<string>, descriptor: StandardsProfileDescriptor): StandardsLossItem[] {
  const items: StandardsLossItem[] = []
  for (const key of Object.keys(document)) if (!known.has(key)) {
    if (key.startsWith(AIWG_EXTENSION_ROOT) && !key.startsWith(descriptor.extensionNamespace)) throw new StandardsProfileError('DATASET_STANDARD_EXTENSION_COLLISION', `${key} collides with the reserved AIWG namespace`)
    items.push({ category: descriptor.unknownExtensionPolicy === 'preserve' ? 'extension-carried' : 'unsupported', sourcePath: `/${key}`, reason: 'unknown top-level extension', ...(descriptor.unknownExtensionPolicy === 'preserve' ? { extensionNamespace: descriptor.extensionNamespace } : {}) })
  }
  return items
}

export const PROV_PROFILE: StandardsProfileDescriptor = Object.freeze({
  id: 'w3c-prov-json/20130430', standard: 'w3c-prov-json', version: '2013-04-30', direction: 'round-trip',
  inputSchema: { id: 'https://aiwg.io/schemas/dataset/profiles/prov-json-20130430.schema.json', version: '1.0.0' },
  outputSchema: { id: 'https://aiwg.io/schemas/dataset/profiles/prov-json-20130430.schema.json', version: '1.0.0' },
  mappingImplementation: 'src/dataset/standards.ts#provAdapter',
  supportedFeatures: ['entity', 'activity', 'agent', 'wasDerivedFrom', 'wasGeneratedBy', 'used', 'wasAttributedTo', 'wasAssociatedWith', 'correction'],
  roundTripFields: ['entity', 'activity', 'agent', 'wasDerivedFrom', 'wasGeneratedBy', 'used', 'wasAttributedTo', 'wasAssociatedWith'],
  extensionNamespace: `${AIWG_EXTENSION_ROOT}prov-json/20130430/`, unknownExtensionPolicy: 'report', maturity: 'stable',
  useCases: ['exchange canonical dataset and run lineage with PROV-JSON consumers'], coverageBoundary: 'PROV-JSON core entity/activity/agent and eight listed relation/history mappings; qualified relations and bundles are unsupported',
})

function importProv(document: unknown): StandardsExchange<RunLedgerSnapshot> {
  validateDocument(validateProvDocument, document, 'input')
  if (!isObject(document)) invalid('DATASET_STANDARD_INVALID_INPUT', 'PROV-JSON document must be an object')
  const items = extensionItems(document, new Set(['prefix', 'entity', 'activity', 'agent', 'wasDerivedFrom', 'wasGeneratedBy', 'used', 'wasAttributedTo', 'wasAssociatedWith', 'alternateOf']), PROV_PROFILE)
  const events: LedgerEvent[] = []; let sequence = 1
  const entityEntries = entries(document.entity, '/entity'); const activityEntries = entries(document.activity, '/activity'); const agentEntries = entries(document.agent, '/agent')
  const identities = [...entityEntries.map(([id]) => id), ...activityEntries.map(([id]) => id), ...agentEntries.map(([id]) => id)]
  if (new Set(identities).size !== identities.length) throw new StandardsProfileError('DATASET_STANDARD_IDENTITY_CONFLICT', 'an identifier cannot be both an entity, activity, or agent')
  for (const [id, attrs] of entityEntries) events.push(event({ recordType: 'entity', id, entityType: String(attrs['prov:type'] ?? 'entity'), privacy: 'internal' }, sequence++))
  for (const [id, attrs] of activityEntries) events.push(event({ recordType: 'activity', id, activityType: String(attrs['prov:type'] ?? 'activity'), ...(typeof attrs['prov:startTime'] === 'string' ? { startedAt: attrs['prov:startTime'] } : {}), ...(typeof attrs['prov:endTime'] === 'string' ? { endedAt: attrs['prov:endTime'] } : {}) }, sequence++))
  for (const [id, attrs] of agentEntries) events.push(event({ recordType: 'agent', id, principalKind: attrs['prov:type'] === 'prov:Person' ? 'person' : attrs['prov:type'] === 'prov:Organization' ? 'organization' : 'software' }, sequence++))
  const relations: Array<[string, string, string]> = [
    ['wasDerivedFrom', 'prov:generatedEntity', 'prov:usedEntity'], ['wasGeneratedBy', 'prov:entity', 'prov:activity'], ['used', 'prov:activity', 'prov:entity'],
    ['wasAttributedTo', 'prov:entity', 'prov:agent'], ['wasAssociatedWith', 'prov:activity', 'prov:agent'], ['alternateOf', 'prov:alternate1', 'prov:alternate2'],
  ]
  for (const [relation, subjectKey, objectKey] of relations) for (const [id, attrs] of entries(document[relation], `/${relation}`)) {
    const subject = attrs[subjectKey], object = attrs[objectKey]
    if (typeof subject !== 'string' || typeof object !== 'string') invalid('DATASET_STANDARD_INVALID_INPUT', `/${relation}/${id} requires ${subjectKey} and ${objectKey}`)
    const predicate = relation === 'alternateOf' ? 'correction' : relation
    if (predicate === 'correction') events.push(event({ recordType: 'correction', id, correctsEventId: subject, replacementEventId: object, reason: 'imported PROV alternateOf relation', responsibleAgentId: PRODUCER.id }, sequence++))
    else events.push(event(assertion(id, subject, predicate, object), sequence++))
    items.push({ category: 'mapped', sourcePath: `/${relation}/${id}`, targetPath: `/events/${events.length - 1}`, reason: `${relation} mapped to canonical ledger` })
  }
  for (const section of ['entity', 'activity', 'agent']) for (const [id] of entries(document[section], `/${section}`)) items.push({ category: 'mapped', sourcePath: `/${section}/${id}`, targetPath: `/events/${events.findIndex(item => item.record.id === id)}`, reason: `${section} mapped to canonical ledger` })
  items.push({ category: 'synthesized', targetPath: '/events/*/recordedAt', reason: 'PROV-JSON has no document observation timestamp; deterministic import epoch used' })
  return exchange(PROV_PROFILE, 'import', document, { schemaVersion: RUN_LEDGER_VERSION, events }, items)
}

function exportProv(snapshot: RunLedgerSnapshot): StandardsExchange<unknown> {
  ensureLedger(snapshot)
  const document: Record<string, unknown> = { prefix: { aiwg: 'https://aiwg.io/ns/' }, entity: {}, activity: {}, agent: {}, wasDerivedFrom: {}, wasGeneratedBy: {}, used: {}, wasAttributedTo: {}, wasAssociatedWith: {}, alternateOf: {} }
  const items: StandardsLossItem[] = []
  for (const item of snapshot.events) {
    const record = item.record
    if (record.recordType === 'entity') (document.entity as Record<string, unknown>)[record.id] = { 'prov:type': record.entityType }
    else if (record.recordType === 'activity') (document.activity as Record<string, unknown>)[record.id] = { 'prov:type': record.activityType, ...(record.startedAt ? { 'prov:startTime': record.startedAt } : {}), ...(record.endedAt ? { 'prov:endTime': record.endedAt } : {}) }
    else if (record.recordType === 'agent') (document.agent as Record<string, unknown>)[record.id] = { 'prov:type': record.principalKind === 'person' ? 'prov:Person' : record.principalKind === 'organization' ? 'prov:Organization' : 'prov:SoftwareAgent' }
    else if (record.recordType === 'assertion' && ['wasDerivedFrom', 'wasGeneratedBy', 'used', 'wasAttributedTo', 'wasAssociatedWith'].includes(record.predicate)) {
      const keys: Record<string, [string, string]> = { wasDerivedFrom: ['prov:generatedEntity', 'prov:usedEntity'], wasGeneratedBy: ['prov:entity', 'prov:activity'], used: ['prov:activity', 'prov:entity'], wasAttributedTo: ['prov:entity', 'prov:agent'], wasAssociatedWith: ['prov:activity', 'prov:agent'] }
      const [a, b] = keys[record.predicate]; (document[record.predicate] as Record<string, unknown>)[record.id] = { [a]: record.subjectId, [b]: record.objectId }
    } else if (record.recordType === 'correction' && record.replacementEventId) (document.alternateOf as Record<string, unknown>)[record.id] = { 'prov:alternate1': record.correctsEventId, 'prov:alternate2': record.replacementEventId }
    else { items.push({ category: 'unsupported', sourcePath: `/events/${item.sequence - 1}`, reason: `${record.recordType}${record.recordType === 'assertion' ? `:${record.predicate}` : ''} is outside the declared PROV profile` }); continue }
    items.push({ category: 'mapped', sourcePath: `/events/${item.sequence - 1}`, reason: `${record.recordType} mapped to PROV-JSON` })
    if ('privacy' in record) items.push({ category: 'omitted', sourcePath: `/events/${item.sequence - 1}/record/privacy`, reason: 'privacy classification is policy metadata and is not downgraded into PROV' })
  }
  validateDocument(validateProvDocument, document, 'output')
  return exchange(PROV_PROFILE, 'export', snapshot, document, items)
}

export const OPENLINEAGE_PROFILE: StandardsProfileDescriptor = Object.freeze({
  id: 'openlineage/1.0.0', standard: 'openlineage', version: '1.0.0', direction: 'round-trip',
  inputSchema: { id: 'https://aiwg.io/schemas/dataset/profiles/openlineage-1.0.0.schema.json', version: '1.0.0' }, outputSchema: { id: 'https://aiwg.io/schemas/dataset/profiles/openlineage-1.0.0.schema.json', version: '1.0.0' },
  mappingImplementation: 'src/dataset/standards.ts#openLineageAdapter', supportedFeatures: ['job', 'run', 'inputs', 'outputs', 'eventTime', 'eventType', 'failure-state', 'dataset.facets.columnLineage'],
  roundTripFields: ['job.namespace', 'job.name', 'run.runId', 'eventTime', 'eventType', 'inputs.namespace', 'inputs.name', 'outputs.namespace', 'outputs.name'],
  extensionNamespace: `${AIWG_EXTENSION_ROOT}openlineage/1.0.0/`, unknownExtensionPolicy: 'report', maturity: 'stable',
  useCases: ['exchange job and dataset execution lineage with OpenLineage producers and consumers'], coverageBoundary: 'single RunEvent with job/run/dataset identities, lifecycle timing/failure, and columnLineage facet; arbitrary facets are reported unsupported',
})

function olId(value: unknown, path: string): string { if (!isObject(value) || typeof value.namespace !== 'string' || typeof value.name !== 'string') invalid('DATASET_STANDARD_INVALID_INPUT', `${path} requires namespace and name`); return `${value.namespace}/${value.name}` }
function importOpenLineage(document: unknown): StandardsExchange<RunLedgerSnapshot> {
  validateDocument(validateOpenLineageDocument, document, 'input')
  if (!isObject(document) || typeof document.eventTime !== 'string' || typeof document.eventType !== 'string' || !isObject(document.run) || typeof document.run.runId !== 'string') invalid('DATASET_STANDARD_INVALID_INPUT', 'OpenLineage RunEvent requires eventTime, eventType, and run.runId')
  const jobId = olId(document.job, '/job'); const items = extensionItems(document, new Set(['eventTime', 'eventType', 'run', 'job', 'inputs', 'outputs', 'producer', 'schemaURL']), OPENLINEAGE_PROFILE)
  const events: LedgerEvent[] = []; let sequence = 1
  events.push(createLedgerEvent({ eventId: `urn:aiwg:openlineage:${document.run.runId}:activity`, runId: document.run.runId, sequence: sequence++, recordedAt: document.eventTime, producer: PRODUCER, record: { recordType: 'activity', id: jobId, activityType: `openlineage:${document.eventType}`, runId: document.run.runId, ...(document.eventType === 'START' ? { startedAt: document.eventTime } : { endedAt: document.eventTime }) } }))
  const mapDatasets = (datasets: unknown, predicate: 'used' | 'wasGeneratedBy', path: string) => {
    if (datasets === undefined) return
    if (!Array.isArray(datasets)) invalid('DATASET_STANDARD_INVALID_INPUT', `${path} must be an array`)
    for (const [index, dataset] of datasets.entries()) {
      const id = olId(dataset, `${path}/${index}`); events.push(event({ recordType: 'entity', id, entityType: 'dataset', privacy: 'internal' }, sequence++)); events.push(event(assertion(`openlineage:${predicate}:${sequence}`, predicate === 'used' ? jobId : id, predicate, predicate === 'used' ? id : jobId), sequence++))
      items.push({ category: 'mapped', sourcePath: `${path}/${index}`, targetPath: `/events/${events.length - 2}`, reason: `dataset and ${predicate} relation mapped` })
      if (isObject(dataset) && isObject(dataset.facets)) {
        const facets = dataset.facets
        for (const facet of Object.keys(facets)) if (facet !== 'columnLineage') items.push({ category: 'unsupported', sourcePath: `${path}/${index}/facets/${facet}`, reason: 'facet is outside the declared OpenLineage profile' })
        if (isObject(facets.columnLineage) && isObject(facets.columnLineage.fields)) {
          for (const [field, lineage] of Object.entries(facets.columnLineage.fields)) {
            if (!isObject(lineage) || !Array.isArray(lineage.inputFields)) invalid('DATASET_STANDARD_INVALID_INPUT', `${path}/${index}/facets/columnLineage/fields/${field} requires inputFields`)
            const outputFieldId = `${id}#field=${encodeURIComponent(field)}`
            events.push(event({ recordType: 'entity', id: outputFieldId, entityType: 'dataset-field', privacy: 'internal' }, sequence++))
            for (const [inputIndex, input] of lineage.inputFields.entries()) {
              if (!isObject(input) || typeof input.namespace !== 'string' || typeof input.name !== 'string' || typeof input.field !== 'string') invalid('DATASET_STANDARD_INVALID_INPUT', `${path}/${index}/facets/columnLineage/fields/${field}/inputFields/${inputIndex} requires namespace, name, and field`)
              const inputFieldId = `${input.namespace}/${input.name}#field=${encodeURIComponent(input.field)}`
              events.push(event({ recordType: 'entity', id: inputFieldId, entityType: 'dataset-field', privacy: 'internal' }, sequence++))
              const relation = assertion(`openlineage:column:${sequence}`, outputFieldId, 'wasDerivedFrom', inputFieldId); relation.field = field
              events.push(event(relation, sequence++))
              items.push({ category: 'mapped', sourcePath: `${path}/${index}/facets/columnLineage/fields/${field}/inputFields/${inputIndex}`, targetPath: `/events/${events.length - 1}`, reason: 'column lineage mapped to a field-qualified canonical derivation' })
            }
          }
        }
      }
    }
  }
  mapDatasets(document.inputs, 'used', '/inputs'); mapDatasets(document.outputs, 'wasGeneratedBy', '/outputs')
  items.push({ category: 'mapped', sourcePath: '/job', targetPath: '/events/0', reason: 'job/run lifecycle mapped to canonical activity' })
  if (isObject(document.run.facets)) for (const facet of Object.keys(document.run.facets)) items.push({ category: 'unsupported', sourcePath: `/run/facets/${facet}`, reason: 'run facet is reported but not promoted into canonical observed evidence' })
  return exchange(OPENLINEAGE_PROFILE, 'import', document, { schemaVersion: RUN_LEDGER_VERSION, events }, items)
}

function splitOlId(id: string): { namespace: string; name: string } { const at = id.lastIndexOf('/'); return at > 0 ? { namespace: id.slice(0, at), name: id.slice(at + 1) } : { namespace: 'aiwg', name: id } }
function exportOpenLineage(snapshot: RunLedgerSnapshot): StandardsExchange<unknown> {
  ensureLedger(snapshot); const activity = snapshot.events.find(item => item.record.recordType === 'activity')?.record
  if (!activity || activity.recordType !== 'activity' || !activity.runId) invalid('DATASET_STANDARD_INVALID_OUTPUT', 'OpenLineage export requires an activity with runId')
  const associations = snapshot.events.filter((item): item is LedgerEvent & { record: LedgerAssertion } => item.record.recordType === 'assertion')
  const entityIds = new Set(snapshot.events.filter(item => item.record.recordType === 'entity').map(item => item.record.id))
  const inputs = associations.filter(item => item.record.predicate === 'used' && item.record.subjectId === activity.id && entityIds.has(item.record.objectId)).map(item => splitOlId(item.record.objectId))
  const outputs = associations.filter(item => item.record.predicate === 'wasGeneratedBy' && item.record.objectId === activity.id && entityIds.has(item.record.subjectId)).map(item => splitOlId(item.record.subjectId))
  for (const relation of associations.filter(item => item.record.predicate === 'wasDerivedFrom' && item.record.field && item.record.subjectId.includes('#field=') && item.record.objectId.includes('#field='))) {
    const [outputDataset, outputField] = relation.record.subjectId.split('#field='); const [inputDataset, inputField] = relation.record.objectId.split('#field=')
    const output = outputs.find(item => `${item.namespace}/${item.name}` === outputDataset)
    if (!output) continue
    const withFacets = output as typeof output & { facets?: Record<string, unknown> }; const facets = withFacets.facets ??= {}; const columnLineage = (facets.columnLineage ??= { fields: {} }) as { fields: Record<string, { inputFields: Array<{ namespace: string; name: string; field: string }> }> }
    const decodedOutput = decodeURIComponent(outputField); const entry = columnLineage.fields[decodedOutput] ??= { inputFields: [] }; entry.inputFields.push({ ...splitOlId(inputDataset), field: decodeURIComponent(inputField) })
  }
  const eventType = activity.activityType.replace(/^openlineage:/, '')
  const allowed = new Set(['START', 'RUNNING', 'COMPLETE', 'ABORT', 'FAIL', 'OTHER'])
  if (!allowed.has(eventType)) throw new StandardsProfileError('DATASET_STANDARD_UNSUPPORTED_CAPABILITY', `activity type ${activity.activityType} cannot be represented as an OpenLineage eventType`)
  const document = { eventTime: activity.startedAt ?? activity.endedAt ?? snapshot.events[0]?.recordedAt, eventType, run: { runId: activity.runId }, job: splitOlId(activity.id), inputs, outputs, producer: 'https://aiwg.io' }
  if (!document.eventTime) invalid('DATASET_STANDARD_INVALID_OUTPUT', 'OpenLineage export requires an event timestamp')
  validateDocument(validateOpenLineageDocument, document, 'output')
  const items: StandardsLossItem[] = [{ category: 'mapped', sourcePath: `/events/${snapshot.events.findIndex(item => item.record === activity)}`, targetPath: '/job', reason: 'activity/run mapped to OpenLineage job event' }]
  for (const item of snapshot.events) if (item.record.recordType !== 'activity' && item.record.recordType !== 'entity' && item.record.recordType !== 'assertion') items.push({ category: 'unsupported', sourcePath: `/events/${item.sequence - 1}`, reason: `${item.record.recordType} is outside the declared OpenLineage profile` })
  return exchange(OPENLINEAGE_PROFILE, 'export', snapshot, document, items)
}

export const DESCRIPTOR_ONLY_PROFILES: readonly StandardsProfileDescriptor[] = Object.freeze([
  ['dcat', '3.0', 'catalog discovery'], ['croissant', '1.0', 'machine-learning dataset metadata'], ['data-package', '2.0', 'tabular data packaging'], ['ro-crate', '1.1', 'research object packaging'],
].map(([standard, version, useCase]) => Object.freeze({ id: `${standard}/${version}`, standard: standard as StandardId, version, direction: 'round-trip' as const, inputSchema: { id: `https://aiwg.io/schemas/dataset/profiles/${standard}-${version}.schema.json`, version: '0.0.0' }, outputSchema: { id: `https://aiwg.io/schemas/dataset/profiles/${standard}-${version}.schema.json`, version: '0.0.0' }, mappingImplementation: 'unimplemented', supportedFeatures: [], roundTripFields: [], extensionNamespace: `${AIWG_EXTENSION_ROOT}${standard}/${version}/`, unknownExtensionPolicy: 'report' as const, maturity: 'descriptor-only' as const, useCases: [useCase], coverageBoundary: 'Descriptor only: no import, export, validation, or conformance capability is claimed.' })))

export const provAdapter: StandardAdapter = { descriptor: PROV_PROFILE, importDocument: importProv, exportDocument: exportProv }
export const openLineageAdapter: StandardAdapter = { descriptor: OPENLINEAGE_PROFILE, importDocument: importOpenLineage, exportDocument: exportOpenLineage }
const adapters: readonly StandardAdapter[] = Object.freeze([provAdapter, openLineageAdapter])
export const standardsProfiles: readonly StandardsProfileDescriptor[] = Object.freeze([...adapters.map(adapter => adapter.descriptor), ...DESCRIPTOR_ONLY_PROFILES])

export function listStandardsProfiles(): readonly StandardsProfileDescriptor[] { return standardsProfiles }
export function resolveStandardsProfile(standard: StandardId, version: string, capability?: 'import' | 'export'): StandardAdapter {
  const known = standardsProfiles.filter(profile => profile.standard === standard)
  if (known.length === 0) throw new StandardsProfileError('DATASET_STANDARD_PROFILE_NOT_FOUND', `unknown standard ${standard}`)
  const profile = known.find(item => item.version === version)
  if (!profile) throw new StandardsProfileError('DATASET_STANDARD_UNSUPPORTED_VERSION', `${standard} version ${version} is not registered; exact version selection is required`)
  const adapter = adapters.find(item => item.descriptor.id === profile.id)
  if (!adapter || profile.maturity === 'descriptor-only') throw new StandardsProfileError('DATASET_STANDARD_UNSUPPORTED_CAPABILITY', `${profile.id} is descriptor-only`)
  if (capability && profile.direction !== 'round-trip' && profile.direction !== capability) throw new StandardsProfileError('DATASET_STANDARD_UNSUPPORTED_CAPABILITY', `${profile.id} does not support ${capability}`)
  return adapter
}
export function importStandard(standard: StandardId, version: string, document: unknown): StandardsExchange<RunLedgerSnapshot> { return resolveStandardsProfile(standard, version, 'import').importDocument(document) }
export function exportStandard(standard: StandardId, version: string, snapshot: RunLedgerSnapshot): StandardsExchange<unknown> { return resolveStandardsProfile(standard, version, 'export').exportDocument(snapshot) }
