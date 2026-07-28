import type {
  ProviderRecord,
  SessionEvent,
  SessionProviderId,
} from './contracts.js';

export const ORIGIN_CLASSIFIER_VERSION = '1.0.0' as const;

export type SessionEventOrigin =
  | 'user-authored'
  | 'assistant-generated'
  | 'provider-bootstrap'
  | 'workspace-instruction'
  | 'tool-control'
  | 'unknown';

export interface OriginClassification {
  origin: SessionEventOrigin;
  rule: string;
  classifierVersion: typeof ORIGIN_CLASSIFIER_VERSION;
}

export function classifySessionEventOrigin(
  provider: SessionProviderId,
  record: ProviderRecord,
): OriginClassification {
  const envelope = classifyWholeEnvelope(record.text);
  if (envelope) return envelope;

  const kind = record.kind.toLowerCase();
  if (isProviderBootstrap(provider, kind)) {
    return classified('provider-bootstrap', `${provider}:structured-bootstrap`);
  }
  if (isToolControl(kind, record.role)) {
    return classified('tool-control', `${provider}:structured-control`);
  }
  if (record.role === 'assistant') {
    return classified('assistant-generated', `${provider}:assistant-role`);
  }
  if (record.role === 'user' && kind === 'message' && record.text.trim().length > 0) {
    return classified('user-authored', `${provider}:user-message`);
  }
  return classified('unknown', `${provider}:insufficient-authorship-evidence`);
}

export function isControlOrigin(origin: SessionEventOrigin): boolean {
  return origin === 'provider-bootstrap'
    || origin === 'workspace-instruction'
    || origin === 'tool-control';
}

export function deriveSessionIntent(events: readonly SessionEvent[]): {
  status: 'selected' | 'absent' | 'unknown';
  eventId: string | null;
  sequence: number | null;
  title: string | null;
  summary: string | null;
} {
  const eligible = events
    .filter((event) =>
      event.origin === 'user-authored'
      && event.kind === 'message'
      && event.searchableText.trim().length > 0)
    .sort((left, right) =>
      left.sequence - right.sequence || left.eventId.localeCompare(right.eventId));
  const selected = eligible[0];
  if (selected) {
    const summary = normalizeExcerpt(selected.searchableText, 240);
    return {
      status: 'selected',
      eventId: selected.eventId,
      sequence: selected.sequence,
      title: normalizeExcerpt(summary.split('\n')[0], 80),
      summary,
    };
  }
  const uncertain = events.some((event) =>
    event.origin === 'unknown' && event.searchableText.trim().length > 0);
  return {
    status: uncertain ? 'unknown' : 'absent',
    eventId: null,
    sequence: null,
    title: null,
    summary: null,
  };
}

function classifyWholeEnvelope(text: string): OriginClassification | null {
  const trimmed = text.trim();
  if (!trimmed) return null;
  if (/^# AGENTS\.md instructions for [^\n]+\n+<INSTRUCTIONS>\n[\s\S]*\n<\/INSTRUCTIONS>$/.test(trimmed)) {
    return classified('workspace-instruction', 'envelope:agents-instructions');
  }
  for (const tag of [
    'recommended_plugins',
    'codex_internal_context',
    'environment_context',
  ]) {
    if (wholeTag(trimmed, tag)) {
      return classified('provider-bootstrap', `envelope:${tag}`);
    }
  }
  if (wholeTag(trimmed, 'local-command-caveat')) {
    return classified('tool-control', 'envelope:local-command-caveat');
  }
  if (/^<[A-Za-z_][\w.-]*(?:\s[^>]*)?>[\s\S]*<\/[A-Za-z_][\w.-]*>$/.test(trimmed)) {
    return classified('unknown', 'envelope:unrecognized');
  }
  return null;
}

function wholeTag(value: string, tag: string): boolean {
  const escaped = tag.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^<${escaped}(?:\\s[^>]*)?>[\\s\\S]*<\\/${escaped}>$`).test(value);
}

function isProviderBootstrap(provider: SessionProviderId, kind: string): boolean {
  if (provider === 'codex') {
    return kind === 'codex.session_meta'
      || kind === 'codex.turn_context'
      || kind === 'codex.thread-state';
  }
  if (provider === 'factory') {
    return kind === 'factory.session_start' || kind === 'factory.settings';
  }
  if (provider === 'cursor') return kind === 'system';
  return false;
}

function isToolControl(kind: string, role: string | undefined): boolean {
  return role === 'tool'
    || role === 'system'
    || kind === 'lifecycle-hook'
    || kind === 'tool-call'
    || kind === 'tool-result'
    || kind === 'summary'
    || kind.includes('lifecycle')
    || kind.startsWith('tool.')
    || kind.startsWith('cursor.cloud.')
    || kind === 'cursor.agent.turn_ended'
    || kind === 'factory.session_end';
}

function classified(
  origin: SessionEventOrigin,
  rule: string,
): OriginClassification {
  return {
    origin,
    rule,
    classifierVersion: ORIGIN_CLASSIFIER_VERSION,
  };
}

function normalizeExcerpt(value: string, max: number): string {
  const normalized = value.replace(/\s+/g, ' ').trim();
  return normalized.length <= max ? normalized : `${normalized.slice(0, max - 1)}…`;
}
