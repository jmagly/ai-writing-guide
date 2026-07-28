import type {
  Session,
  SessionEvent,
  SessionProviderId,
} from './contracts.js';

export const TIMELINE_SCHEMA_VERSION = '1.0.0' as const;
export const DEFAULT_TIMELINE_GAP_MS = 30 * 60 * 1_000;

export interface TimelineInput {
  session: Session;
  event: SessionEvent;
}

export interface SessionTimelineSegment {
  schemaVersion: typeof TIMELINE_SCHEMA_VERSION;
  provider: SessionProviderId;
  sessionId: string;
  segmentIndex: number;
  startAt: string | null;
  endAt: string | null;
  durationMs: number | null;
  eventCount: number;
  boundaryBasis: 'session-start' | 'provider-explicit' | 'inferred-gap' | 'unknown-time';
  boundaryEvidence: string | null;
  confidence: 'low' | 'medium' | 'high';
}

interface WorkingSegment extends SessionTimelineSegment {
  minSequence: number;
  maxSequence: number;
}

export function deriveSessionTimeline(
  input: readonly TimelineInput[],
  gapMs = DEFAULT_TIMELINE_GAP_MS,
): SessionTimelineSegment[] {
  if (!Number.isFinite(gapMs) || gapMs < 0) {
    throw new Error('timeline gap must be a non-negative duration');
  }
  const grouped = new Map<string, TimelineInput[]>();
  for (const item of input) {
    const group = grouped.get(item.session.sessionId) ?? [];
    group.push(item);
    grouped.set(item.session.sessionId, group);
  }

  const result: WorkingSegment[] = [];
  for (const items of grouped.values()) {
    const timed = items
      .filter((item) => item.event.occurredAt !== null)
      .sort(compareTimelineInput);
    const untimed = items
      .filter((item) => item.event.occurredAt === null)
      .sort(compareSequence);
    if (timed.length === 0) {
      const first = items[0];
      result.push({
        schemaVersion: TIMELINE_SCHEMA_VERSION,
        provider: first.session.provider,
        sessionId: first.session.sessionId,
        segmentIndex: 0,
        startAt: null,
        endAt: null,
        durationMs: null,
        eventCount: untimed.length,
        boundaryBasis: 'unknown-time',
        boundaryEvidence: null,
        confidence: 'low',
        minSequence: untimed.at(0)?.event.sequence ?? 0,
        maxSequence: untimed.at(-1)?.event.sequence ?? 0,
      });
      continue;
    }

    const sessionSegments: WorkingSegment[] = [];
    let current: WorkingSegment | null = null;
    let previous: TimelineInput | null = null;
    for (const item of timed) {
      const boundary = previous ? segmentBoundary(previous.event, item.event, gapMs) : null;
      if (!current || boundary) {
        current = {
          schemaVersion: TIMELINE_SCHEMA_VERSION,
          provider: item.session.provider,
          sessionId: item.session.sessionId,
          segmentIndex: sessionSegments.length,
          startAt: item.event.occurredAt,
          endAt: item.event.occurredAt,
          durationMs: 0,
          eventCount: 0,
          boundaryBasis: boundary?.basis ?? 'session-start',
          boundaryEvidence: boundary?.evidence ?? null,
          confidence: boundary?.confidence ?? 'high',
          minSequence: item.event.sequence,
          maxSequence: item.event.sequence,
        };
        sessionSegments.push(current);
      }
      current.eventCount += 1;
      current.endAt = item.event.occurredAt;
      current.durationMs = Math.max(
        0,
        Date.parse(current.endAt!) - Date.parse(current.startAt!),
      );
      current.minSequence = Math.min(current.minSequence, item.event.sequence);
      current.maxSequence = Math.max(current.maxSequence, item.event.sequence);
      previous = item;
    }
    for (const item of untimed) {
      const destination = sessionSegments.find(
        (segment) => item.event.sequence <= segment.maxSequence,
      ) ?? sessionSegments.at(-1)!;
      destination.eventCount += 1;
      destination.minSequence = Math.min(destination.minSequence, item.event.sequence);
      destination.maxSequence = Math.max(destination.maxSequence, item.event.sequence);
    }
    result.push(...sessionSegments);
  }

  return result
    .sort((left, right) =>
      compareNullableTime(left.startAt, right.startAt)
      || left.provider.localeCompare(right.provider)
      || left.sessionId.localeCompare(right.sessionId)
      || left.segmentIndex - right.segmentIndex)
    .map(({ minSequence: _min, maxSequence: _max, ...segment }) => segment);
}

export function parseTimelineGap(value: string | undefined): number {
  if (value === undefined) return DEFAULT_TIMELINE_GAP_MS;
  const match = /^(\d+(?:\.\d+)?)(ms|s|m|h|d)$/.exec(value.trim());
  if (!match) throw new Error('timeline gap must use ms, s, m, h, or d (for example 30m)');
  const factors: Record<string, number> = {
    ms: 1,
    s: 1_000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };
  const result = Number(match[1]) * factors[match[2]];
  if (!Number.isSafeInteger(result) || result < 0) {
    throw new Error('timeline gap is outside the supported duration range');
  }
  return result;
}

function segmentBoundary(
  previous: SessionEvent,
  current: SessionEvent,
  gapMs: number,
): {
  basis: SessionTimelineSegment['boundaryBasis'];
  evidence: string;
  confidence: SessionTimelineSegment['confidence'];
} | null {
  if (current.activityBoundary === 'resume'
    || current.activityBoundary === 'continuation') {
    return {
      basis: 'provider-explicit',
      evidence: current.activityBoundaryBasis ?? current.activityBoundary,
      confidence: current.activityBoundaryConfidence ?? 'high',
    };
  }
  if (previous.activityBoundary === 'pause' || previous.activityBoundary === 'end') {
    return {
      basis: 'provider-explicit',
      evidence: previous.activityBoundaryBasis ?? previous.activityBoundary,
      confidence: previous.activityBoundaryConfidence ?? 'high',
    };
  }
  const gap = Date.parse(current.occurredAt!) - Date.parse(previous.occurredAt!);
  if (gap > gapMs) {
    return {
      basis: 'inferred-gap',
      evidence: `inactivity>${gapMs}ms`,
      confidence: 'medium',
    };
  }
  return null;
}

function compareTimelineInput(left: TimelineInput, right: TimelineInput): number {
  return Date.parse(left.event.occurredAt!) - Date.parse(right.event.occurredAt!)
    || left.event.sequence - right.event.sequence
    || left.event.eventId.localeCompare(right.event.eventId);
}

function compareSequence(left: TimelineInput, right: TimelineInput): number {
  return left.event.sequence - right.event.sequence
    || left.event.eventId.localeCompare(right.event.eventId);
}

function compareNullableTime(left: string | null, right: string | null): number {
  if (left === right) return 0;
  if (left === null) return 1;
  if (right === null) return -1;
  return Date.parse(left) - Date.parse(right);
}
