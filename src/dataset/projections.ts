import type { DependencyGraph } from '../artifacts/types.js'
import type { AiwgFortemiRecord } from '../artifacts/browser-export.js'
import type { OperationalStateProvenance } from '../artifacts/operational-state.js'
import type { MarketplaceProvenanceGraph } from '../marketplace/provenance-types.js'
import type { ProvenanceRecord } from '../research/services/types.js'
import { computeLedgerEventDigest, createLedgerEvent } from './ledger.js'
import type {
  LedgerAssertion, LedgerEvent, LedgerRecord, ProjectionLossItem,
  ProjectionResult, StructuredLocator, W3cProvProjection,
} from './ledger-types.js'
import type { PrivacyClassification } from './types.js'

export interface ProjectionContext { producer: { id: string; version: string }; recordedAt: string; runId?: string; privacy?: PrivacyClassification; retentionPolicy?: string }
export interface MentionEdge { sourcePath: string; targetPath: string; method?: 'mention' | 'markdown-link'; line?: number; confidence?: number }
export interface SdlcTraceLink { requirementId: string; targetPath: string; targetType: 'code' | 'test' | 'documentation' | 'deployment'; line?: number; verified: boolean; confidence: number }

function result<T>(profile: string, value: T, items: ProjectionLossItem[]): ProjectionResult<T> { return { value, loss: { profile, lossless: items.length === 0, items } } }
function loss(path: string, reason: string, severity: ProjectionLossItem['severity'] = 'information', context?: ProjectionContext): ProjectionLossItem {
  return {
    path,
    reason,
    severity,
    ...(context?.privacy ? { sourcePrivacy: context.privacy } : {}),
    ...(context?.retentionPolicy ? { retentionPolicy: context.retentionPolicy } : {}),
  }
}
function event(record: LedgerRecord, sequence: number, context: ProjectionContext): LedgerEvent {
  return createLedgerEvent({ eventId: `urn:aiwg:event:${encodeURIComponent(record.id)}`, sequence, recordedAt: context.recordedAt, producer: context.producer, ...(context.runId ? { runId: context.runId } : {}), record })
}
function fileLocator(path: string, line?: number): StructuredLocator { return line === undefined ? { scheme: 'file', value: path } : { scheme: 'line-column', value: path, line } }

const PRIVACY_ORDER: Record<PrivacyClassification, number> = { public: 0, internal: 1, confidential: 2, restricted: 3 }
export function preventPrivacyDowngrade(source: PrivacyClassification, projected: PrivacyClassification): void {
  if (PRIVACY_ORDER[projected] < PRIVACY_ORDER[source]) throw new Error(`PROVENANCE_PRIVACY_DOWNGRADE: ${source} cannot be projected as ${projected}`)
}

export function projectResearchProvenance(record: ProvenanceRecord, context: ProjectionContext): ProjectionResult<LedgerEvent[]> {
  const privacy = context.privacy ?? 'internal'; const events: LedgerEvent[] = []
  events.push(event({ recordType: 'agent', id: record.agent.id, principalKind: record.agent.type === 'software_agent' ? 'software' : 'person' }, 1, context))
  events.push(event({ recordType: 'entity', id: record.entity.id, entityType: record.entity.type, privacy, ...(context.retentionPolicy ? { retentionPolicy: context.retentionPolicy } : {}) }, 2, context))
  events.push(event({ recordType: 'activity', id: record.activity.id, activityType: record.activity.type, startedAt: record.activity.startedAt, endedAt: record.activity.endedAt, ...(context.runId ? { runId: context.runId } : {}) }, 3, context))
  for (const sourceId of record.relationships.wasDerivedFrom ?? []) {
    if (!events.some((item) => item.record.id === sourceId)) events.push(event({ recordType: 'entity', id: sourceId, entityType: 'research-source', privacy, ...(context.retentionPolicy ? { retentionPolicy: context.retentionPolicy } : {}) }, events.length + 1, context))
  }
  if (record.relationships.wasGeneratedBy && record.relationships.wasGeneratedBy !== record.activity.id) events.push(event({ recordType: 'activity', id: record.relationships.wasGeneratedBy, activityType: 'referenced-research-activity' }, events.length + 1, context))
  for (const agentId of [record.relationships.wasAttributedTo, record.relationships.wasAssociatedWith]) {
    if (agentId && !events.some((item) => item.record.id === agentId)) events.push(event({ recordType: 'agent', id: agentId, principalKind: 'software' }, events.length + 1, context))
  }
  const assertions: Array<Omit<LedgerAssertion, 'recordType' | 'id' | 'basis' | 'evidenceIds' | 'privacy'>> = []
  if (record.relationships.wasGeneratedBy) assertions.push({ subjectId: record.entity.id, predicate: 'wasGeneratedBy', objectId: record.relationships.wasGeneratedBy, activityId: record.activity.id })
  for (const sourceId of record.relationships.wasDerivedFrom ?? []) assertions.push({ subjectId: record.entity.id, predicate: 'wasDerivedFrom', objectId: sourceId, activityId: record.activity.id })
  if (record.relationships.wasAttributedTo) assertions.push({ subjectId: record.entity.id, predicate: 'wasAttributedTo', objectId: record.relationships.wasAttributedTo })
  if (record.relationships.wasAssociatedWith) assertions.push({ subjectId: record.activity.id, predicate: 'wasAssociatedWith', objectId: record.relationships.wasAssociatedWith, activityId: record.activity.id })
  for (const [index, assertion] of assertions.entries()) events.push(event({ recordType: 'assertion', id: `assertion:${record.id}:${index + 1}`, ...assertion, basis: 'imported', evidenceIds: [], privacy, ...(context.retentionPolicy ? { retentionPolicy: context.retentionPolicy } : {}) }, events.length + 1, context))
  return result('research-provenance/v1', events, [loss('/entity/attributes', 'arbitrary research entity attributes are not in the canonical vocabulary', 'information', context), loss('/activity/attributes', 'arbitrary research activity attributes require a governed extension', 'information', context)])
}

export function projectMarketplaceProvenance(graph: MarketplaceProvenanceGraph, context: ProjectionContext): ProjectionResult<LedgerEvent[]> {
  const privacy = context.privacy ?? 'internal'; const events: LedgerEvent[] = []; const items: ProjectionLossItem[] = []; let sequence = 1
  for (const agent of graph.agents) events.push(event({ recordType: 'agent', id: agent.id, principalKind: agent.type === 'catalog' ? 'service' : agent.type }, sequence++, context))
  for (const entity of graph.entities) events.push(event({ recordType: 'entity', id: entity.id, entityType: entity.type, privacy, ...(context.retentionPolicy ? { retentionPolicy: context.retentionPolicy } : {}), ...(entity.digest ? { digest: { algorithm: 'sha256', value: entity.digest.replace(/^sha256:/, '') } } : {}) }, sequence++, context))
  for (const activity of graph.activities) events.push(event({ recordType: 'activity', id: activity.id, activityType: activity.type, startedAt: activity.startedAt, endedAt: activity.endedAt }, sequence++, context))
  for (const relation of graph.relations) events.push(event({ recordType: 'assertion', id: `marketplace:${sequence}:${relation.subject}:${relation.object}`, subjectId: relation.subject, predicate: relation.type, objectId: relation.object, basis: 'imported', evidenceIds: [], privacy, ...(context.retentionPolicy ? { retentionPolicy: context.retentionPolicy } : {}) }, sequence++, context))
  if (graph.entities.some((entry) => entry.attributes)) items.push(loss('/entities/*/attributes', 'non-core marketplace attributes require a governed extension', 'information', context))
  return result('marketplace-provenance/v1', events, items)
}

export function projectFortemiProvenance(record: AiwgFortemiRecord, context: ProjectionContext): ProjectionResult<LedgerEvent[]> {
  const privacy: PrivacyClassification = record.privacy.classification === 'public' ? 'public' : record.privacy.classification === 'private' ? 'confidential' : 'internal'
  const events: LedgerEvent[] = []; const items: ProjectionLossItem[] = []; let sequence = 1
  events.push(event({ recordType: 'agent', id: context.producer.id, principalKind: 'software', version: context.producer.version }, sequence++, context))
  events.push(event({ recordType: 'entity', id: record.id, entityType: record.type, revision: record.source.checksum, privacy, ...(context.retentionPolicy ? { retentionPolicy: context.retentionPolicy } : {}) }, sequence++, context))
  const agentIds = new Set((record.provenance_events ?? []).flatMap((item) => item.agent ? [item.agent] : []))
  agentIds.delete(context.producer.id)
  for (const id of agentIds) events.push(event({ recordType: 'agent', id, principalKind: 'software' }, sequence++, context))
  for (const item of record.provenance_events ?? []) {
    const activityId = item.id ?? `activity:${record.id}:${sequence}`
    events.push(event({ recordType: 'activity', id: activityId, activityType: item.activity, startedAt: item.started_at, endedAt: item.ended_at, ...(context.runId ? { runId: context.runId } : {}) }, sequence++, context))
    if (item.agent) events.push(event({ recordType: 'assertion', id: `assertion:${activityId}:agent`, subjectId: activityId, predicate: 'wasAssociatedWith', objectId: item.agent, basis: 'imported', evidenceIds: [], privacy, ...(context.retentionPolicy ? { retentionPolicy: context.retentionPolicy } : {}) }, sequence++, context))
    if (item.attributes) items.push(loss(`/provenance_events/${activityId}/attributes`, 'Fortemi activity attributes require a governed extension', 'information', { ...context, privacy }))
  }
  const sourceEntities = new Set<string>()
  for (const item of record.provenance) {
    const sourceEntityId = `urn:aiwg:source:${encodeURIComponent(item.path)}`
    if (!sourceEntities.has(sourceEntityId)) {
      events.push(event({ recordType: 'entity', id: sourceEntityId, entityType: 'source-record', privacy, ...(context.retentionPolicy ? { retentionPolicy: context.retentionPolicy } : {}) }, sequence++, context))
      sourceEntities.add(sourceEntityId)
    }
    const evidenceId = `evidence:${record.id}:${sequence}`
    events.push(event({ recordType: 'evidence', id: evidenceId, source: fileLocator(item.path), target: { scheme: 'json-pointer', value: record.id, field: item.field }, method: `fortemi-field-provenance:${item.source}`, confidence: item.confidence === 'source' || item.confidence === 'reviewed' ? 1 : 0.5, privacy, ...(context.retentionPolicy ? { retentionPolicy: context.retentionPolicy } : {}), ...(context.runId ? { runId: context.runId } : {}), responsibleAgentId: context.producer.id, observedAt: context.recordedAt }, sequence++, context))
    events.push(event({ recordType: 'assertion', id: `assertion:${record.id}:${sequence}`, subjectId: record.id, predicate: 'wasDerivedFrom', objectId: sourceEntityId, basis: context.runId ? 'observed' : 'imported', evidenceIds: [evidenceId], ...(context.runId ? { runId: context.runId } : {}), field: item.field, privacy, ...(context.retentionPolicy ? { retentionPolicy: context.retentionPolicy } : {}) }, sequence++, context))
  }
  items.push(loss('/search', 'search projection is not provenance', 'information', { ...context, privacy }))
  if (record.relationships.length) items.push(loss('/relationships', 'relationships require separate evidence-bearing conversion when source evidence is absent', 'semantic', { ...context, privacy }))
  return result('fortemi-index-export/v2', events, items)
}

export function projectOperationalState(state: OperationalStateProvenance, recordId: string, context: ProjectionContext): ProjectionResult<LedgerEvent[]> {
  const items: ProjectionLossItem[] = []; const privacy = context.privacy ?? 'internal'
  const agentId = state.observer ?? context.producer.id
  const locator = state.evidence_path ? fileLocator(state.evidence_path) : state.evidence_url ? { scheme: 'uri' as const, value: state.evidence_url } : undefined
  if (!locator) items.push(loss('/evidence', 'operational state has no evidence locator', 'semantic', context))
  if (state.supersedes?.length) items.push(loss('/supersedes', 'referenced operational revisions require separately imported ledger entities', 'semantic', context))
  if (state.contradicts?.length) items.push(loss('/contradicts', 'referenced operational revisions require separately imported ledger entities', 'semantic', context))
  const events = [event({ recordType: 'agent', id: agentId, principalKind: 'software' }, 1, context), event({ recordType: 'entity', id: recordId, entityType: state.source_kind ?? 'operational-state', privacy, ...(context.retentionPolicy ? { retentionPolicy: context.retentionPolicy } : {}) }, 2, context)]
  if (locator) events.push(event({ recordType: 'evidence', id: `evidence:${recordId}`, source: locator, method: 'operational-observation', confidence: state.confidence === 'source' || state.confidence === 'reviewed' ? 1 : 0.5, privacy, ...(context.retentionPolicy ? { retentionPolicy: context.retentionPolicy } : {}), ...(context.runId ? { runId: context.runId } : {}), responsibleAgentId: agentId, observedAt: state.observed_at ?? context.recordedAt }, 3, context))
  return result('operational-state/v1', events, items)
}

export function projectMentionEdge(edge: MentionEdge, context: ProjectionContext): ProjectionResult<LedgerEvent[]> {
  const privacy = context.privacy ?? 'internal'; const agentId = context.producer.id
  return result('mention-edge/v1', [
    event({ recordType: 'agent', id: agentId, principalKind: 'software', version: context.producer.version }, 1, context),
    event({ recordType: 'entity', id: edge.sourcePath, entityType: 'file', privacy, ...(context.retentionPolicy ? { retentionPolicy: context.retentionPolicy } : {}) }, 2, context),
    event({ recordType: 'entity', id: edge.targetPath, entityType: 'file', privacy, ...(context.retentionPolicy ? { retentionPolicy: context.retentionPolicy } : {}) }, 3, context),
    event({ recordType: 'evidence', id: `evidence:mention:${edge.sourcePath}:${edge.targetPath}`, source: fileLocator(edge.sourcePath, edge.line), target: fileLocator(edge.targetPath), method: edge.method ?? 'mention', confidence: edge.confidence ?? 1, privacy, ...(context.retentionPolicy ? { retentionPolicy: context.retentionPolicy } : {}), ...(context.runId ? { runId: context.runId } : {}), responsibleAgentId: agentId, observedAt: context.recordedAt }, 4, context),
    event({ recordType: 'assertion', id: `assertion:mention:${edge.sourcePath}:${edge.targetPath}`, subjectId: edge.sourcePath, predicate: edge.method === 'markdown-link' ? 'links-to' : 'mentions', objectId: edge.targetPath, basis: 'inferred', evidenceIds: [`evidence:mention:${edge.sourcePath}:${edge.targetPath}`], ...(context.runId ? { runId: context.runId } : {}), privacy, ...(context.retentionPolicy ? { retentionPolicy: context.retentionPolicy } : {}) }, 5, context),
  ], [])
}

export function projectSdlcTraceLink(link: SdlcTraceLink, context: ProjectionContext): ProjectionResult<LedgerEvent[]> {
  const projected = projectMentionEdge({ sourcePath: link.targetPath, targetPath: link.requirementId, method: 'mention', line: link.line, confidence: link.confidence }, context)
  const assertion = projected.value.at(-1)!
  const observed = link.verified && context.runId !== undefined
  assertion.record = { ...(assertion.record as LedgerAssertion), predicate: `implements:${link.targetType}`, basis: observed ? 'observed' : 'inferred' }
  const { eventDigest: _eventDigest, ...content } = assertion
  assertion.eventDigest = computeLedgerEventDigest(content)
  return result('sdlc-traceability/v1', projected.value, [
    ...projected.loss.items,
    ...(link.verified && !context.runId ? [loss('/runId', 'verified SDLC link lacks run identity and remains inferred', 'semantic', context)] : []),
  ])
}

export function projectLedgerToDependencyGraph(events: readonly LedgerEvent[]): ProjectionResult<DependencyGraph> {
  const graph: DependencyGraph = {}; const items: ProjectionLossItem[] = []
  for (const event of events) if (event.record.recordType === 'assertion') {
    const assertion = event.record; graph[assertion.subjectId] ??= { upstream: [], downstream: [] }; graph[assertion.objectId] ??= { upstream: [], downstream: [] }
    graph[assertion.subjectId].upstream.push({ path: assertion.objectId, type: assertion.predicate }); graph[assertion.objectId].downstream.push({ path: assertion.subjectId, type: assertion.predicate })
    items.push({ ...loss(`/events/${event.eventId}`, 'DependencyGraph drops basis, evidence, run, field, privacy, and retention', 'semantic'), sourcePrivacy: assertion.privacy, ...(assertion.retentionPolicy ? { retentionPolicy: assertion.retentionPolicy } : {}) })
  }
  return result('dependency-graph/v1', graph, items)
}

export function projectLedgerToW3cProv(events: readonly LedgerEvent[]): ProjectionResult<W3cProvProjection> {
  const value: W3cProvProjection = { entity: {}, activity: {}, agent: {}, wasDerivedFrom: [], wasGeneratedBy: [], used: [], wasAssociatedWith: [], wasAttributedTo: [] }; const items: ProjectionLossItem[] = []
  for (const event of events) {
    const record = event.record
    if (record.recordType === 'entity') {
      value.entity[record.id] = { type: record.entityType, revision: record.revision, privacy: record.privacy }
      if (record.digest || record.retentionPolicy) items.push({ ...loss(`/records/${record.id}`, 'core W3C projection omits canonical digest or retention metadata', 'information'), sourcePrivacy: record.privacy, ...(record.retentionPolicy ? { retentionPolicy: record.retentionPolicy } : {}) })
    }
    else if (record.recordType === 'activity') value.activity[record.id] = { type: record.activityType, startedAt: record.startedAt, endedAt: record.endedAt }
    else if (record.recordType === 'agent') value.agent[record.id] = { type: record.principalKind, version: record.version }
    else if (record.recordType === 'evidence') items.push({ ...loss(`/records/${record.id}`, 'core W3C relation view references evidence IDs but omits canonical locator and observation detail', 'information'), sourcePrivacy: record.privacy, ...(record.retentionPolicy ? { retentionPolicy: record.retentionPolicy } : {}) })
    else if (record.recordType === 'assertion') {
      if (record.predicate === 'wasDerivedFrom') value.wasDerivedFrom.push({ generatedEntity: record.subjectId, usedEntity: record.objectId, evidence: record.evidenceIds })
      else if (record.predicate === 'wasGeneratedBy') value.wasGeneratedBy.push({ entity: record.subjectId, activity: record.objectId })
      else if (record.predicate === 'used') value.used.push({ activity: record.subjectId, entity: record.objectId, evidence: record.evidenceIds })
      else if (record.predicate === 'wasAssociatedWith') value.wasAssociatedWith.push({ activity: record.subjectId, agent: record.objectId })
      else if (record.predicate === 'wasAttributedTo') value.wasAttributedTo.push({ entity: record.subjectId, agent: record.objectId })
      else items.push(loss(`/records/${record.id}`, `predicate ${record.predicate} has no core W3C projection`, 'semantic'))
      if (record.basis !== 'declared' || record.runId || record.field || record.retentionPolicy) items.push({ ...loss(`/records/${record.id}/qualifiers`, 'core W3C relation view omits canonical basis, run, field, or retention qualifiers', 'information'), sourcePrivacy: record.privacy, ...(record.retentionPolicy ? { retentionPolicy: record.retentionPolicy } : {}) })
    }
    else if (record.recordType === 'correction' || record.recordType === 'supersession') items.push(loss(`/records/${record.id}`, 'ledger history operation requires an extension namespace'))
  }
  return result('w3c-prov/core', value, items)
}
