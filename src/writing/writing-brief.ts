import { createHash } from 'node:crypto';
import { z } from 'zod';

const id = z.string().min(1).max(120).regex(/^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/);
const digest = z.string().regex(/^[a-f0-9]{64}$/);
const text = z.string().min(1);
const span = { start: z.number().int().nonnegative(), end: z.number().int().nonnegative() };
const evidence = z.object({ inputId: id, ...span }).strict();
const input = z.object({
  id, kind: z.enum(['source', 'author-notes', 'existing-draft']), text,
  sha256: digest, provenance: z.object({ source: text, version: text }).strict(),
  authorApproved: z.boolean(),
}).strict();
const proposition = z.object({
  id, text, evidenceStrength: z.enum(['verified', 'reported', 'preliminary', 'experimental', 'unverified']),
  evidence: z.array(evidence).min(1), qualifiers: z.array(text),
}).strict();
const authorClaim = z.object({
  id, kind: z.enum(['experience', 'opinion', 'intent', 'rationale']), text,
  evidence: z.array(evidence).min(1),
}).strict();
const correction = z.object({
  id, ...span, expected: z.string(), replacement: z.string(), reason: text,
  authorAuthorized: z.literal(true),
}).strict();
export const writingBriefSchema = z.object({
  schemaVersion: z.literal(1), id,
  operation: z.enum(['draft-from-notes', 'edit-existing', 'proofread-only', 'continue-author-text']),
  reader: z.object({ task: z.string(), audience: text, requirements: z.array(text) }).strict(),
  intendedAction: z.string(), exclusions: z.array(text), inputs: z.array(input),
  propositions: z.array(proposition), limitations: z.array(proposition), authorClaims: z.array(authorClaim),
  sourceInputId: id.optional(),
  permissions: z.object({ rephrase: z.boolean(), reorder: z.boolean(), addContent: z.boolean(), corrections: z.array(correction) }).strict(),
}).strict();
export type WritingBrief = z.infer<typeof writingBriefSchema>;
export type WritingBriefOperation = WritingBrief['operation'];
export interface BriefDiagnostic {
  code: 'schema' | 'integrity' | 'reference' | 'editorial-gap' | 'permission' | 'unsupported-claim' | 'protected-content';
  message: string;
  /** Identifiers only: diagnostics never echo input/sample text. */
  referenceId?: string;
}
export interface BriefCheck { valid: boolean; diagnostics: BriefDiagnostic[] }
export const writingBriefHash = (value: string): string => createHash('sha256').update(value, 'utf8').digest('hex');

function boundary(source: string, offset: number): boolean {
  return offset >= 0 && offset <= source.length
    && !(offset > 0 && offset < source.length && /[\uD800-\uDBFF]/.test(source[offset - 1]) && /[\uDC00-\uDFFF]/.test(source[offset]));
}
function overlaps(a: { start: number; end: number }, b: { start: number; end: number }): boolean {
  return a.start === a.end ? a.start >= b.start && a.start <= b.end : a.start < b.end && a.end > b.start;
}

/** Structural checks prove reference/permission integrity, not truth or semantic entailment. */
export function validateWritingBrief(value: unknown): BriefCheck {
  const parsed = writingBriefSchema.safeParse(value);
  if (!parsed.success) return { valid: false, diagnostics: [{ code: 'schema', message: 'Invalid writing brief shape; input text is omitted.' }] };
  const b = parsed.data;
  const diagnostics: BriefDiagnostic[] = [];
  const report = (code: BriefDiagnostic['code'], message: string, referenceId?: string) => diagnostics.push({ code, message, ...(referenceId ? { referenceId } : {}) });
  if (!b.reader.task.trim()) report('editorial-gap', 'Supply the reader task before drafting.');
  if (!b.intendedAction.trim()) report('editorial-gap', 'Supply the intended reader action before drafting.');
  if (!b.propositions.length) report('editorial-gap', 'Supply supported propositions or look up context before drafting.');
  for (const group of [b.inputs, [...b.propositions, ...b.limitations, ...b.authorClaims], b.permissions.corrections]) {
    if (new Set(group.map(v => v.id)).size !== group.length) report('reference', 'Duplicate identifiers are ambiguous.');
  }
  const inputs = new Map(b.inputs.map(v => [v.id, v]));
  for (const i of b.inputs) if (writingBriefHash(i.text) !== i.sha256) report('integrity', 'Input digest mismatch.', i.id);
  for (const claim of [...b.propositions, ...b.limitations, ...b.authorClaims]) {
    for (const e of claim.evidence) {
      const source = inputs.get(e.inputId);
      if (!source || e.start >= e.end || !boundary(source.text, e.start) || !boundary(source.text, e.end)) report('reference', 'Evidence requires an existing input and a nonempty Unicode-safe span.', claim.id);
      if ('kind' in claim && (!source || source.kind !== 'author-notes' || !source.authorApproved)) report('unsupported-claim', 'Personal experience, opinion, intent and rationale require approved author notes.', claim.id);
    }
    if ('kind' in claim && !claim.evidence.some(e => { const i = inputs.get(e.inputId); return i?.text.slice(e.start, e.end).includes(claim.text); })) report('unsupported-claim', 'Author claim wording must occur in the cited approved notes; paraphrases require review.', claim.id);
    if ('qualifiers' in claim && claim.qualifiers.some(q => !claim.text.includes(q))) report('protected-content', 'A declared qualifier is missing from its proposition.', claim.id);
    if ('evidenceStrength' in claim && claim.evidenceStrength === 'experimental' && !claim.qualifiers.length) report('protected-content', 'Experimental propositions require an explicit protected qualifier.', claim.id);
  }
  const source = b.sourceInputId ? inputs.get(b.sourceInputId) : undefined;
  if (b.sourceInputId && !source) report('reference', 'Selected draft input does not exist.');
  if (b.operation !== 'draft-from-notes' && (!source || source.kind !== 'existing-draft')) report('editorial-gap', 'This operation requires an existing author draft.');
  if (b.operation === 'proofread-only' && (b.permissions.rephrase || b.permissions.reorder || b.permissions.addContent)) report('permission', 'Proofread-only permits listed corrections, not rewriting, reordering or additions.');
  if (b.operation === 'continue-author-text' && (b.permissions.rephrase || b.permissions.reorder || !b.permissions.addContent)) report('permission', 'Continuation preserves the source prefix and permits only appended content.');
  for (const c of b.permissions.corrections) {
    if (!source || c.start > c.end || !boundary(source.text, c.start) || !boundary(source.text, c.end) || source.text.slice(c.start, c.end) !== c.expected) report('integrity', 'Authorized correction does not match its source span.', c.id);
  }
  return { valid: diagnostics.length === 0, diagnostics };
}

/** Parse only a complete, internally consistent brief; no guessed task, intent or sources. */
export function parseWritingBrief(value: unknown): WritingBrief {
  const check = validateWritingBrief(value);
  if (!check.valid) throw new Error(`Writing brief requires review: ${[...new Set(check.diagnostics.map(d => d.code))].join(', ')}. Source text is omitted.`);
  return writingBriefSchema.parse(value);
}

export interface WritingBriefTarget { profileId: string; channel: 'article' | 'social' | 'email' | 'engineering' | 'conversation' }
export interface PreparedWritingBrief {
  brief: WritingBrief; target: WritingBriefTarget; briefDigest: string;
  lineage: { inputId: string; sha256: string; role: WritingBrief['inputs'][number]['kind'] }[];
  operation: WritingBriefOperation; permissions: WritingBrief['permissions'];
  factualVerification: 'not-performed';
}
/** Parameterization changes presentation targets only, never the brief or confidence. */
export function prepareWritingBrief(value: unknown, target: WritingBriefTarget): PreparedWritingBrief {
  const b = parseWritingBrief(value);
  const selection = z.object({ profileId: id, channel: z.enum(['article', 'social', 'email', 'engineering', 'conversation']) }).strict().safeParse(target);
  if (!selection.success) throw new Error('Invalid writing brief target; input text is omitted.');
  return { brief: structuredClone(b), target: selection.data, briefDigest: writingBriefHash(JSON.stringify(b)),
    lineage: b.inputs.map(i => ({ inputId: i.id, sha256: i.sha256, role: i.kind })),
    operation: b.operation, permissions: structuredClone(b.permissions), factualVerification: 'not-performed' };
}

export interface ProposedBriefClaim { kind: 'proposition' | 'experience' | 'opinion' | 'intent' | 'rationale'; text: string; groundedIn: string[] }
/** Exact supported wording only. Paraphrases need review; matching IDs alone cannot approve invented text. */
export function validateBriefClaims(value: unknown, proposed: ProposedBriefClaim[]): BriefCheck {
  const check = validateWritingBrief(value);
  if (!check.valid) return check;
  const b = parseWritingBrief(value);
  const proposal = z.array(z.object({ kind: z.enum(['proposition', 'experience', 'opinion', 'intent', 'rationale']), text, groundedIn: z.array(id) }).strict()).safeParse(proposed);
  if (!proposal.success) return { valid: false, diagnostics: [{ code: 'schema', message: 'Invalid proposed claim shape; input text is omitted.' }] };
  const claims = [...b.propositions.map(p => ({ ...p, kind: 'proposition' as const })), ...b.limitations.map(p => ({ ...p, kind: 'proposition' as const })), ...b.authorClaims];
  const diagnostics: BriefDiagnostic[] = [];
  for (const p of proposal.data) {
    const matches = claims.filter(c => p.groundedIn.includes(c.id));
    if (!p.groundedIn.length || matches.length !== new Set(p.groundedIn).size || !matches.some(c => c.kind === p.kind && c.text === p.text)) diagnostics.push({ code: 'unsupported-claim', message: 'Proposed claim needs supplied matching wording and grounded input lineage; paraphrase or new content requires author review.' });
  }
  return { valid: diagnostics.length === 0, diagnostics };
}

export interface BriefEditResult extends BriefCheck {
  text: string;
  lineage: { sourceInputId?: string; sourceDigest?: string; finalDigest: string; correctionIds: string[]; briefDigest?: string };
}
/** Apply only explicitly authorized, exact corrections; on any failure return the unchanged source. */
export function applyProofreadCorrections(value: unknown, correctionIds: string[]): BriefEditResult {
  const structural = writingBriefSchema.safeParse(value);
  const source = structural.success ? structural.data.inputs.find(i => i.id === structural.data.sourceInputId) : undefined;
  const original = source?.text ?? '';
  const result = (check: BriefCheck, output = original, applied: string[] = []): BriefEditResult => ({ ...check, text: output,
    lineage: { sourceInputId: source?.id, sourceDigest: source?.sha256, finalDigest: writingBriefHash(output), correctionIds: applied,
      ...(structural.success ? { briefDigest: writingBriefHash(JSON.stringify(structural.data)) } : {}) } });
  const check = validateWritingBrief(value);
  if (!check.valid) return result(check);
  const b = parseWritingBrief(value);
  if (b.operation !== 'proofread-only') return result({ valid: false, diagnostics: [{ code: 'permission', message: 'Correction application requires proofread-only operation.' }] });
  if (!z.array(id).safeParse(correctionIds).success) return result({ valid: false, diagnostics: [{ code: 'permission', message: 'Correction selection must contain authorized identifiers.' }] });
  const corrections = correctionIds.map(key => b.permissions.corrections.find(c => c.id === key));
  if (new Set(correctionIds).size !== correctionIds.length || corrections.some(c => !c)) return result({ valid: false, diagnostics: [{ code: 'permission', message: 'Only unique, explicitly authorized correction IDs may be applied.' }] });
  const selected = corrections.filter((c): c is NonNullable<typeof c> => !!c).sort((a, b) => a.start - b.start || a.end - b.end);
  for (let i = 1; i < selected.length; i++) if (overlaps(selected[i], selected[i - 1]) || selected[i].start === selected[i - 1].start) return result({ valid: false, diagnostics: [{ code: 'permission', message: 'Overlapping corrections require author review.' }] });
  // Protect cited source spans, including experimental qualifiers and limitations.
  const protectedSpans = [...b.propositions, ...b.limitations, ...b.authorClaims].flatMap(c => c.evidence).filter(e => e.inputId === source!.id);
  const qualifiers = [...b.propositions, ...b.limitations].flatMap(c => c.qualifiers);
  for (const q of qualifiers) {
    for (let at = original.indexOf(q); at >= 0; at = original.indexOf(q, at + q.length)) protectedSpans.push({ inputId: source!.id, start: at, end: at + q.length });
  }
  if (selected.some(c => c.expected !== c.replacement && protectedSpans.some(s => overlaps(c, s)))) return result({ valid: false, diagnostics: [{ code: 'protected-content', message: 'A correction changes grounded content or a protected qualification; author review is required.' }] });
  let output = original;
  for (const c of [...selected].reverse()) output = output.slice(0, c.start) + c.replacement + output.slice(c.end);
  return result({ valid: true, diagnostics: [] }, output, selected.map(c => c.id));
}
