/**
 * Live-state provenance for operational memory records.
 *
 * The contract is intentionally allowlisted. Tracker credentials, request
 * headers, arbitrary provider payloads, and URL query parameters never enter
 * the Fortemi export. Records with incomplete source identity remain
 * representable as `needs-source` so operators can retire or repair them.
 *
 * @issue #1827
 */

export type OperationalStateClassification =
  | "fresh"
  | "historical"
  | "superseded"
  | "contradicted"
  | "needs-source";

export type OperationalStateConfidence =
  | "source"
  | "candidate"
  | "reviewed"
  | "rejected";

export interface OperationalStateProvenance {
  source_repo?: string;
  source_kind?: string;
  source_id?: string;
  observed_state?: string;
  observed_at?: string;
  source_updated_at?: string;
  evidence_url?: string;
  evidence_path?: string;
  observer?: string;
  supersedes?: string[];
  contradicts?: string[];
  stale_after?: string;
  classification: OperationalStateClassification;
  confidence?: OperationalStateConfidence;
  current_action_selector?: boolean;
}

export interface OperationalStateEvidence {
  source_repo: string;
  source_kind: string;
  source_id: string;
  observed_state: string;
  observed_at: string;
  source_updated_at?: string;
  evidence_url?: string;
  evidence_path?: string;
  observer: string;
}

export interface OperationalStateFinding {
  record_id: string;
  source_id?: string;
  classification: OperationalStateClassification;
  remembered_state?: string;
  live_state?: string;
  reason: string;
  requires_live_check: boolean;
}

export interface OperationalStateQueryProjection {
  classification: OperationalStateClassification;
  current: boolean;
  requires_live_check: boolean;
  source_id?: string;
  observed_state?: string;
  observed_at?: string;
}

const CLASSIFICATIONS = new Set<OperationalStateClassification>([
  "fresh",
  "historical",
  "superseded",
  "contradicted",
  "needs-source",
]);

const CONFIDENCE = new Set<OperationalStateConfidence>([
  "source",
  "candidate",
  "reviewed",
  "rejected",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function stringValue(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function isoValue(value: unknown): string | undefined {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? undefined : value.toISOString();
  }
  const candidate = stringValue(value);
  if (!candidate) return undefined;
  const parsed = new Date(candidate);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function stringArray(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) return undefined;
  const items = [...new Set(value.map(stringValue).filter((item): item is string => Boolean(item)))].sort(
    (left, right) => left.localeCompare(right),
  );
  return items.length > 0 ? items : undefined;
}

function evidencePathValue(value: unknown): string | undefined {
  const candidate = stringValue(value);
  if (
    !candidate ||
    candidate.includes("\0") ||
    candidate.includes("\n") ||
    candidate.includes("\r") ||
    candidate.includes("?") ||
    candidate.includes("#") ||
    candidate.startsWith("/") ||
    candidate.startsWith("\\") ||
    candidate.split(/[\\/]/).includes("..")
  ) {
    return undefined;
  }
  return candidate;
}

/**
 * Preserve an evidence locator without preserving URL credentials, query
 * strings, or fragments. Non-HTTP(S) locators are not accepted here; local
 * evidence belongs in `evidence_path`.
 */
export function sanitizeOperationalEvidenceUrl(value: unknown): string | undefined {
  const candidate = stringValue(value);
  if (!candidate) return undefined;
  try {
    const url = new URL(candidate);
    if (url.protocol !== "https:" && url.protocol !== "http:") return undefined;
    url.username = "";
    url.password = "";
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    return undefined;
  }
}

/**
 * Parse the `operational_state` frontmatter block into the portable v2
 * contract. Unknown keys are dropped by design.
 */
export function normalizeOperationalState(value: unknown): OperationalStateProvenance | undefined {
  if (!isRecord(value)) return undefined;

  const source_repo = stringValue(value.source_repo);
  const source_kind = stringValue(value.source_kind);
  const source_id = stringValue(value.source_id);
  const observed_state = stringValue(value.observed_state);
  const observed_at = isoValue(value.observed_at);
  const source_updated_at = isoValue(value.source_updated_at);
  const observer = stringValue(value.observer);
  const evidence_url = sanitizeOperationalEvidenceUrl(value.evidence_url);
  const evidence_path = evidencePathValue(value.evidence_path);
  const supersedes = stringArray(value.supersedes);
  const contradicts = stringArray(value.contradicts);
  const stale_after = isoValue(value.stale_after);
  const requestedClassification = stringValue(value.classification);
  const completeSource = Boolean(
    source_repo && source_kind && source_id && observed_state && observed_at && observer,
  );
  const classification = !completeSource
    ? "needs-source"
    : requestedClassification && CLASSIFICATIONS.has(requestedClassification as OperationalStateClassification)
      ? (requestedClassification as OperationalStateClassification)
      : "historical";
  const requestedConfidence = stringValue(value.confidence);
  const confidence =
    requestedConfidence && CONFIDENCE.has(requestedConfidence as OperationalStateConfidence)
      ? (requestedConfidence as OperationalStateConfidence)
      : undefined;

  return {
    ...(source_repo ? { source_repo } : {}),
    ...(source_kind ? { source_kind } : {}),
    ...(source_id ? { source_id } : {}),
    ...(observed_state ? { observed_state } : {}),
    ...(observed_at ? { observed_at } : {}),
    ...(source_updated_at ? { source_updated_at } : {}),
    ...(evidence_url ? { evidence_url } : {}),
    ...(evidence_path ? { evidence_path } : {}),
    ...(observer ? { observer } : {}),
    ...(supersedes ? { supersedes } : {}),
    ...(contradicts ? { contradicts } : {}),
    ...(stale_after ? { stale_after } : {}),
    classification,
    ...(confidence ? { confidence } : {}),
    ...(typeof value.current_action_selector === "boolean"
      ? { current_action_selector: value.current_action_selector }
      : {}),
  };
}

function sameSource(
  record: OperationalStateProvenance,
  evidence: OperationalStateEvidence,
): boolean {
  return (
    record.source_repo === evidence.source_repo &&
    record.source_kind === evidence.source_kind &&
    record.source_id === evidence.source_id
  );
}

function timeValue(value: string | undefined): number {
  if (!value) return Number.NaN;
  return new Date(value).getTime();
}

export function classifyOperationalState(
  record: OperationalStateProvenance,
  evidence?: OperationalStateEvidence,
  now = new Date(),
): { classification: OperationalStateClassification; reason: string } {
  if (
    !record.source_repo ||
    !record.source_kind ||
    !record.source_id ||
    !record.observed_state ||
    !record.observed_at ||
    !record.observer
  ) {
    return {
      classification: "needs-source",
      reason: "record lacks complete live-source identity or observation metadata",
    };
  }

  if (evidence && sameSource(record, evidence)) {
    if (
      record.contradicts?.includes(evidence.source_id) ||
      record.observed_state !== evidence.observed_state
    ) {
      return {
        classification: "contradicted",
        reason: `remembered state '${record.observed_state}' conflicts with live state '${evidence.observed_state}'`,
      };
    }

    const recordTime = timeValue(record.source_updated_at ?? record.observed_at);
    const evidenceTime = timeValue(evidence.source_updated_at ?? evidence.observed_at);
    if (Number.isFinite(recordTime) && Number.isFinite(evidenceTime) && evidenceTime > recordTime) {
      return {
        classification: "superseded",
        reason: "newer authoritative evidence supersedes the remembered observation",
      };
    }

    return {
      classification: "fresh",
      reason: "remembered state matches the supplied authoritative evidence",
    };
  }

  if (record.stale_after && timeValue(record.stale_after) <= now.getTime()) {
    return {
      classification: "historical",
      reason: "record passed its stale-after boundary and requires a live re-check",
    };
  }

  if (record.current_action_selector === false || record.classification === "historical") {
    return {
      classification: "historical",
      reason: "record is retained as history and is not a current action selector",
    };
  }

  return {
    classification: record.classification,
    reason: "no fresh authoritative evidence was supplied; preserve the recorded classification",
  };
}

export function compareOperationalStateRecords(
  records: Array<{ id: string; operational_state?: OperationalStateProvenance }>,
  evidence: OperationalStateEvidence[],
  now = new Date(),
): OperationalStateFinding[] {
  const evidenceBySource = new Map(
    evidence.map((item) => [`${item.source_repo}\u0000${item.source_kind}\u0000${item.source_id}`, item]),
  );

  return records
    .map(({ id, operational_state }) => {
      if (!operational_state) {
        return {
          record_id: id,
          classification: "needs-source" as const,
          reason: "record has no operational_state provenance block",
          requires_live_check: true,
        };
      }
      const key = `${operational_state.source_repo ?? ""}\u0000${operational_state.source_kind ?? ""}\u0000${operational_state.source_id ?? ""}`;
      const live = evidenceBySource.get(key);
      const classified = classifyOperationalState(operational_state, live, now);
      return {
        record_id: id,
        ...(operational_state.source_id ? { source_id: operational_state.source_id } : {}),
        classification: classified.classification,
        ...(operational_state.observed_state
          ? { remembered_state: operational_state.observed_state }
          : {}),
        ...(live ? { live_state: live.observed_state } : {}),
        reason: classified.reason,
        requires_live_check: !live,
      };
    })
    .sort((left, right) =>
      (left.source_id ?? left.record_id).localeCompare(right.source_id ?? right.record_id) ||
      left.record_id.localeCompare(right.record_id),
    );
}

export function operationalStateQueryProjection(
  record: OperationalStateProvenance,
  now = new Date(),
): OperationalStateQueryProjection {
  const classified = classifyOperationalState(record, undefined, now);
  const current =
    classified.classification === "fresh" && record.current_action_selector === true;
  return {
    classification: classified.classification,
    current,
    requires_live_check: true,
    ...(record.source_id ? { source_id: record.source_id } : {}),
    ...(record.observed_state ? { observed_state: record.observed_state } : {}),
    ...(record.observed_at ? { observed_at: record.observed_at } : {}),
  };
}
