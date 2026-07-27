import { z } from 'zod';
import {
  IntelligenceCandidateSchema,
  IntelligenceCandidateTypeSchema,
  SESSION_CONTRACT_VERSION,
  SessionContractError,
  sha256,
  type CandidateSecurityWarning,
  type IntelligenceCandidate,
} from './contracts.js';
import type { SessionSearchDocument } from './repository.js';

export const ExtractedCandidateDraftSchema = z.object({
  type: IntelligenceCandidateTypeSchema,
  assertion: z.string().min(1),
  subject: z.string().min(1).nullable(),
  predicate: z.string().min(1).nullable(),
  object: z.string().min(1).nullable(),
  evidence: z.array(z.object({
    eventId: z.string().min(1),
    start: z.number().int().nonnegative(),
    end: z.number().int().positive(),
  }).strict()).min(1),
  confidence: z.number().min(0).max(1),
  conflictsWith: z.array(z.string().min(1)).default([]),
  supersedes: z.array(z.string().min(1)).default([]),
}).strict().superRefine((candidate, context) => {
  if (candidate.type === 'relationship'
    && (!candidate.subject || !candidate.predicate || !candidate.object)) {
    context.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'relationship candidates require subject, predicate, and object',
    });
  }
});

export type ExtractedCandidateDraft = z.infer<typeof ExtractedCandidateDraftSchema>;

export interface CandidateExtractor {
  readonly method: string;
  readonly version: string;
  readonly model: string | null;
  extract(evidence: ReadonlyArray<{
    eventId: string;
    text: string;
    role: string | null;
  }>): Promise<unknown> | unknown;
}

export interface CandidateStorePort {
  saveCandidates(candidates: readonly IntelligenceCandidate[]): IntelligenceCandidate[];
}

export interface CandidateExtractionPolicy {
  version: string;
  projectScope: string;
  temporalScope: string;
  minimumConfidence: number;
}

export class CandidateExtractionService {
  constructor(private readonly store: CandidateStorePort) {}

  async extract(input: {
    documents: readonly SessionSearchDocument[];
    extractor: CandidateExtractor;
    policy: CandidateExtractionPolicy;
  }): Promise<IntelligenceCandidate[]> {
    const evidenceById = new Map(input.documents.map((document) => [document.eventId, document]));
    const raw = await input.extractor.extract(input.documents.map((document) => Object.freeze({
      eventId: document.eventId,
      text: document.searchableText,
      role: document.role,
    })));
    const drafts = z.array(ExtractedCandidateDraftSchema).parse(raw);
    const candidates = drafts
      .filter((draft) => draft.confidence >= input.policy.minimumConfidence)
      .map((draft) => {
        const evidence = draft.evidence.map((span) => {
          const document = evidenceById.get(span.eventId);
          if (!document) {
            throw new SessionContractError(
              'SOURCE_NOT_AUTHORIZED',
              'candidate cites evidence outside the authorized extraction scope',
            );
          }
          if (span.start >= span.end || span.end > document.searchableText.length) {
            throw new SessionContractError('MALFORMED_SOURCE', 'candidate evidence span is invalid');
          }
          const quote = document.searchableText.slice(span.start, span.end);
          if (!quote.trim()) {
            throw new SessionContractError(
              'MALFORMED_SOURCE',
              'candidate evidence span must contain redacted source text',
            );
          }
          return {
            ...span,
            quoteDigest: sha256(quote),
            quote,
          };
        });
        const sensitivity = evidence.some(
          (span) => evidenceById.get(span.eventId)?.sensitivity === 'sensitive',
        ) ? 'sensitive' as const : 'none' as const;
        if (!evidence.some((span) => evidenceSupportsAssertion(draft.assertion, span.quote))) {
          throw new SessionContractError(
            'MALFORMED_SOURCE',
            'candidate assertion is not supported by its cited redacted evidence span',
          );
        }
        const security = classifyCandidateSecurity({
          assertion: draft.assertion,
          subject: draft.subject,
          predicate: draft.predicate,
          object: draft.object,
        });
        return IntelligenceCandidateSchema.parse({
          contractVersion: SESSION_CONTRACT_VERSION,
          candidateId: stableCandidateId(draft),
          version: 1,
          type: draft.type,
          assertion: draft.assertion,
          subject: draft.subject,
          predicate: draft.predicate,
          object: draft.object,
          evidence,
          confidence: draft.confidence,
          temporalScope: input.policy.temporalScope,
          projectScope: input.policy.projectScope,
          extractionMethod: input.extractor.method,
          extractionVersion: input.extractor.version,
          extractionPolicyVersion: input.policy.version,
          model: input.extractor.model,
          sensitivity,
          security,
          reviewState: 'pending',
          conflictsWith: draft.conflictsWith,
          supersedes: draft.supersedes,
          createdAt: new Date().toISOString(),
        });
      });
    return this.store.saveCandidates(candidates);
  }
}

export class StructuralCandidateExtractor implements CandidateExtractor {
  readonly method = 'structural-labels';
  readonly version = '1.0.0';
  readonly model = null;

  extract(evidence: ReadonlyArray<{ eventId: string; text: string }>): ExtractedCandidateDraft[] {
    const drafts: ExtractedCandidateDraft[] = [];
    for (const item of evidence) {
      let offset = 0;
      for (const line of item.text.split(/\n/)) {
        const match = STRUCTURAL_PATTERN.exec(line);
        if (match) {
          const label = match[1].toLowerCase();
          const assertion = match[2].trim();
          const start = offset + line.indexOf(assertion);
          const type = STRUCTURAL_TYPES[label];
          const relationship = type === 'relationship'
            ? parseRelationship(assertion)
            : { subject: null, predicate: null, object: null };
          if (type && (type !== 'relationship' || relationship.subject)) {
            drafts.push({
              type,
              assertion,
              ...relationship,
              evidence: [{ eventId: item.eventId, start, end: start + assertion.length }],
              confidence: 0.8,
              conflictsWith: [],
              supersedes: [],
            });
          }
        }
        offset += line.length + 1;
      }
    }
    return drafts;
  }
}

const SECURITY_POLICY_VERSION = '1.0.0';
const INSTRUCTION_PATTERN = /\b(?:ignore|override|disregard)\b.{0,40}\b(?:instruction|prompt|policy|rule)s?\b|\b(?:system|developer)\s+(?:message|instruction|prompt)\b|\b(?:execute|invoke|run)\b.{0,30}\b(?:tool|command|shell|script)\b/i;
const SECRET_PATTERN = /\b(?:api[_-]?key|access[_-]?token|password|passwd|private[_-]?key|authorization|cookie|secret)\b\s*(?:[:=]|\bis\b)/i;
const STRUCTURE_PATTERN = /(?:^|\n)\s*(?:---|\.\.\.)\s*(?:\n|$)|```|~~~|<[/!?A-Za-z]|!\[[^\]]*\]\(|\[[^\]]+\]\([^)]*\)|\{\{|\{%/;
const CONTROL_PATTERN = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f]/;
const BIDI_PATTERN = /[\u061c\u200e\u200f\u202a-\u202e\u2066-\u2069]/u;
const LATIN_PATTERN = /\p{Script=Latin}/u;
const CONFUSABLE_SCRIPT_PATTERN = /[\p{Script=Cyrillic}\p{Script=Greek}]/u;

export function classifyCandidateSecurity(input: {
  assertion: string;
  subject?: string | null;
  predicate?: string | null;
  object?: string | null;
}): IntelligenceCandidate['security'] {
  const text = [input.assertion, input.subject, input.predicate, input.object]
    .filter((value): value is string => Boolean(value))
    .join('\n');
  const warnings: CandidateSecurityWarning[] = [];
  if (INSTRUCTION_PATTERN.test(text)) warnings.push('instruction-like');
  if (STRUCTURE_PATTERN.test(text)) warnings.push('structure-breaking');
  if (CONTROL_PATTERN.test(text)) warnings.push('control-character');
  if (BIDI_PATTERN.test(text)) warnings.push('bidi-control');
  if (LATIN_PATTERN.test(text) && CONFUSABLE_SCRIPT_PATTERN.test(text)) {
    warnings.push('unicode-confusable');
  }
  if (/(?:javascript|data|vbscript):|<\s*(?:script|iframe|object|embed)\b/i.test(text)) {
    warnings.push('active-content');
  }
  if (SECRET_PATTERN.test(text)) warnings.push('secret-bearing');
  return {
    disposition: warnings.length === 0 ? 'clear' : 'suspicious',
    warnings: [...new Set(warnings)],
    requiresAcknowledgement: warnings.length > 0,
    acknowledged: false,
    policyVersion: SECURITY_POLICY_VERSION,
  };
}

function evidenceSupportsAssertion(assertion: string, quote: string): boolean {
  const tokens = (value: string): Set<string> => new Set(
    value.normalize('NFKC').toLocaleLowerCase('en-US')
      .match(/[\p{L}\p{N}]{3,}/gu) ?? [],
  );
  const assertionTokens = tokens(assertion);
  const quoteTokens = tokens(quote);
  return [...assertionTokens].some((token) => quoteTokens.has(token));
}

const STRUCTURAL_PATTERN = /^(Decision|Requirement|Constraint|Preference|Task|Discovery|Fix|Failed approach|Procedure|Risk|Contradiction|Question|Entity|Relationship):\s*(.+)$/i;
const STRUCTURAL_TYPES: Record<string, IntelligenceCandidate['type']> = {
  decision: 'decision',
  requirement: 'requirement',
  constraint: 'constraint',
  preference: 'preference',
  task: 'task',
  discovery: 'discovery',
  fix: 'fix',
  'failed approach': 'failed-approach',
  procedure: 'procedure',
  risk: 'risk',
  contradiction: 'contradiction',
  question: 'question',
  entity: 'entity',
  relationship: 'relationship',
};

function parseRelationship(assertion: string): {
  subject: string | null;
  predicate: string | null;
  object: string | null;
} {
  const parts = assertion.split('|').map((part) => part.trim());
  return parts.length === 3 && parts.every(Boolean)
    ? { subject: parts[0], predicate: parts[1], object: parts[2] }
    : { subject: null, predicate: null, object: null };
}

function stableCandidateId(draft: ExtractedCandidateDraft): string {
  return sha256(JSON.stringify({
    type: draft.type,
    evidenceEventIds: [...new Set(draft.evidence.map((span) => span.eventId))].sort(),
    subject: draft.subject,
    predicate: draft.predicate,
    object: draft.object,
  }));
}
