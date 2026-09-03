import { datasetDigest } from './contracts.js'
import { RUN_LEDGER_VERSION, type LedgerEvent, type LedgerRecord, type RunLedgerSnapshot } from './ledger-types.js'

export class RunLedgerError extends Error { constructor(readonly code: string, message: string) { super(message); this.name = 'RunLedgerError' } }
export function computeLedgerEventDigest(event: Omit<LedgerEvent, 'eventDigest'>): LedgerEvent['eventDigest'] { return datasetDigest(event) }
export function createLedgerEvent(input: Omit<LedgerEvent, 'schemaVersion' | 'eventDigest'>): LedgerEvent { const event = { schemaVersion: RUN_LEDGER_VERSION, ...input }; return { ...event, eventDigest: computeLedgerEventDigest(event) } }
export function verifyLedgerEventDigest(event: LedgerEvent): boolean { const { eventDigest, ...content } = event; return eventDigest?.algorithm === 'sha256' && eventDigest.value === computeLedgerEventDigest(content).value }

function references(record: LedgerRecord): string[] {
  switch (record.recordType) {
    case 'evidence': return [record.responsibleAgentId]
    case 'assertion': return [record.subjectId, record.objectId, ...record.evidenceIds, ...(record.activityId ? [record.activityId] : [])]
    case 'correction': return [record.correctsEventId, ...(record.replacementEventId ? [record.replacementEventId] : []), record.responsibleAgentId]
    case 'supersession': return [record.supersedesEventId, record.successorEventId]
    default: return []
  }
}

function validateRecord(record: LedgerRecord): void {
  const supported = new Set(['entity', 'activity', 'agent', 'evidence', 'assertion', 'correction', 'supersession'])
  if (!record || typeof record !== 'object' || !supported.has((record as LedgerRecord).recordType)) throw new RunLedgerError('RUN_LEDGER_RECORD_TYPE_UNSUPPORTED', 'record type is not part of the governed run-ledger vocabulary')
  if (record.recordType === 'assertion' && record.basis === 'observed') {
    if (!record.runId) throw new RunLedgerError('RUN_LEDGER_OBSERVED_RUN_REQUIRED', 'observed assertions require run identity')
    if (record.evidenceIds.length === 0) throw new RunLedgerError('RUN_LEDGER_OBSERVED_EVIDENCE_REQUIRED', 'observed assertions require evidence')
  }
  if (record.recordType === 'evidence') {
    if (record.confidence < 0 || record.confidence > 1) throw new RunLedgerError('RUN_LEDGER_CONFIDENCE_INVALID', 'evidence confidence must be from 0 through 1')
    for (const locator of [record.source, record.target].filter((value) => value !== undefined)) {
      if (locator.value.includes('\0') || locator.value.includes('\n') || locator.value.includes('\r')) throw new RunLedgerError('RUN_LEDGER_LOCATOR_INVALID', 'evidence locator contains control characters')
      if (locator.scheme === 'file' && (locator.value.startsWith('/') || locator.value.split(/[\\/]/u).includes('..'))) throw new RunLedgerError('RUN_LEDGER_LOCATOR_INVALID', 'file evidence locator must be repository-relative without traversal')
      if (locator.scheme === 'uri') {
        try { new URL(locator.value) } catch { throw new RunLedgerError('RUN_LEDGER_LOCATOR_INVALID', 'URI evidence locator is malformed') }
      }
    }
  }
}

export class RunLedger {
  private readonly events: LedgerEvent[] = []
  private readonly eventIds = new Map<string, LedgerEvent>()
  private readonly recordIds = new Map<string, LedgerEvent>()
  append(event: LedgerEvent): { appended: boolean; event: LedgerEvent } {
    if (event.schemaVersion !== RUN_LEDGER_VERSION) throw new RunLedgerError('RUN_LEDGER_VERSION_UNSUPPORTED', `unsupported ledger version ${event.schemaVersion}`)
    validateRecord(event.record)
    const globallyScoped = /^[A-Za-z][A-Za-z0-9+.-]*:.+$/u
    if (!globallyScoped.test(event.eventId)) throw new RunLedgerError('RUN_LEDGER_EVENT_ID_INVALID', `event ID ${event.eventId} must be globally scoped`)
    const runIds = [event.runId, 'runId' in event.record ? event.record.runId : undefined].filter((value): value is string => value !== undefined)
    if (runIds.some((runId) => !globallyScoped.test(runId))) throw new RunLedgerError('RUN_LEDGER_RUN_ID_INVALID', 'run IDs must be globally scoped')
    if (!verifyLedgerEventDigest(event)) throw new RunLedgerError('RUN_LEDGER_DIGEST_MISMATCH', `event ${event.eventId} digest does not match immutable content`)
    const existing = this.eventIds.get(event.eventId)
    if (existing) { if (existing.eventDigest.value === event.eventDigest.value) return { appended: false, event: existing }; throw new RunLedgerError('RUN_LEDGER_EVENT_ID_CONFLICT', `event ID ${event.eventId} was reused with different content`) }
    if (event.sequence !== this.events.length + 1) throw new RunLedgerError('RUN_LEDGER_SEQUENCE_INVALID', `expected sequence ${this.events.length + 1}; received ${event.sequence}`)
    if (this.recordIds.has(event.record.id)) throw new RunLedgerError('RUN_LEDGER_RECORD_ID_CONFLICT', `record ID ${event.record.id} is immutable and already exists`)
    const known = new Set([...this.eventIds.keys(), ...this.recordIds.keys()])
    const missing = references(event.record).filter((id) => !known.has(id))
    if (missing.length) throw new RunLedgerError('RUN_LEDGER_REFERENCE_DANGLING', `event ${event.eventId} has dangling references: ${missing.sort().join(', ')}`)
    this.events.push(event); this.eventIds.set(event.eventId, event); this.recordIds.set(event.record.id, event)
    return { appended: true, event }
  }
  get(eventId: string): LedgerEvent | undefined { return this.eventIds.get(eventId) }
  snapshot(): RunLedgerSnapshot { return { schemaVersion: RUN_LEDGER_VERSION, events: [...this.events] } }
  query(options: { runId?: string; recordType?: LedgerRecord['recordType']; afterSequence?: number; limit?: number } = {}): LedgerEvent[] {
    const limit = options.limit ?? 100
    if (!Number.isInteger(limit) || limit < 1 || limit > 1000) throw new RunLedgerError('RUN_LEDGER_QUERY_LIMIT_INVALID', 'limit must be from 1 through 1000')
    if (options.afterSequence !== undefined && (!Number.isInteger(options.afterSequence) || options.afterSequence < 0)) throw new RunLedgerError('RUN_LEDGER_QUERY_CURSOR_INVALID', 'afterSequence must be a non-negative integer')
    return this.events.filter((event) => (options.runId === undefined || event.runId === options.runId) && (options.recordType === undefined || event.record.recordType === options.recordType) && (options.afterSequence === undefined || event.sequence > options.afterSequence)).slice(0, limit)
  }
  static replay(events: readonly LedgerEvent[]): RunLedger { const ledger = new RunLedger(); for (const event of events) ledger.append(event); return ledger }
}
