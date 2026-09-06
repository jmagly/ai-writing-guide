import { parseWritingBrief, writingBriefHash, applyProofreadCorrections, type WritingBrief } from './writing-brief.js';

export type FidelityOutcome = 'pass' | 'fail' | 'uncertain';
export interface FidelityChange {
  kind: 'quantity' | 'command' | 'negation' | 'qualification' | 'citation' | 'first-person' | 'protected' | 'wording';
  side: 'original' | 'candidate';
  start: number;
  end: number;
  reason: string;
  referenceId?: string;
}
export interface FidelityAssessment {
  outcome: FidelityOutcome;
  changes: FidelityChange[];
  originalHash: string;
  candidateHash: string;
  briefHash?: string;
  method: 'conservative-literal-review-v1';
  formalProof: false;
}

function matches(text: string, pattern: RegExp) {
  return [...text.matchAll(pattern)].map(m => ({ text: m[0], start: m.index!, end: m.index! + m[0].length }));
}

/** Literal guards flag concrete drift; all other rewrites require semantic review. */
export function assessWritingFidelity(original: string, candidate: string, value?: WritingBrief): FidelityAssessment {
  const brief = value ? parseWritingBrief(value) : undefined;
  const changes: FidelityChange[] = [];
  const selectedSource = brief?.inputs.find(i => i.id === brief.sourceInputId);
  const sourceMismatch = brief !== undefined && brief.operation !== 'draft-from-notes' && selectedSource?.text !== original;
  if (sourceMismatch) changes.push({ kind: 'protected', side: 'original', start: 0, end: original.length, reason: 'Original content does not match the immutable brief source.' });
  const rules: Array<[FidelityChange['kind'], RegExp]> = [
    ['quantity', /\b\d+(?:[.,:/-]\d+)*(?:%|\b)/gu],
    ['command', /(?<!\w)--?[a-zA-Z][\w-]*(?:=[^\s`]+)?/gu],
    ['negation', /\b(?:not|never|no|cannot|without|neither|nor)\b|\b\w+n['’]t\b/giu],
    ['qualification', /\b(?:experimental|preliminary|unverified|unqualified|offline|may|might|could|only|unless|except)\b/giu],
    ['citation', /https?:\/\/[^\s<>]+|\[[0-9]+\]/gu],
  ];
  for (const [kind, regex] of rules) {
    const before = matches(original, regex), after = matches(candidate, regex);
    const count = (list: typeof before, text: string) => list.filter(v => v.text === text).length;
    for (const [side, list, other] of [['original', before, after], ['candidate', after, before]] as const) {
      for (const item of list) if (count(list, item.text) !== count(other, item.text)) {
        changes.push({ kind, side, start: item.start, end: item.end, reason: 'Protected lexical quantity or wording changed; review the located source and candidate.' });
      }
    }
  }
  if (brief) {
    for (const claim of [...brief.propositions, ...brief.limitations]) {
      for (const qualifier of claim.qualifiers) {
        const offset = original.indexOf(qualifier);
        if (offset >= 0 && !candidate.includes(qualifier)) changes.push({ kind: 'qualification', side: 'original', start: offset, end: offset + qualifier.length, referenceId: claim.id, reason: 'A brief qualifier was removed.' });
      }
    }
    if (brief.operation === 'continue-author-text' && !candidate.startsWith(original)) changes.push({ kind: 'protected', side: 'original', start: 0, end: original.length, reason: 'Continuation changed the existing author text.' });
  }
  const firstPerson = /\b(?:I|we|my|our|me|us)\b/giu;
  const allowedPersonal = brief?.authorClaims.map(c => c.text) ?? [];
  for (const claim of matches(candidate, /[^.!?\n]+(?:[.!?]|$)/gu)) {
    if (matches(claim.text, firstPerson).length && !original.includes(claim.text.trim()) && !allowedPersonal.some(text => text === claim.text.trim())) {
      changes.push({ kind: 'first-person', side: 'candidate', start: claim.start, end: claim.end, reason: 'New first-person wording lacks exact supplied author grounding; review is required.' });
    }
  }
  const proofread = brief?.operation === 'proofread-only' && brief.inputs.find(i => i.id === brief.sourceInputId)?.text === original ? applyProofreadCorrections(brief, brief.permissions.corrections.map(c => c.id)) : undefined;
  const unchanged = !sourceMismatch && (original === candidate || (proofread?.valid === true && proofread.text === candidate));
  if (unchanged) changes.length = 0;
  if (!unchanged && changes.length === 0) changes.push({ kind: 'wording', side: candidate.length ? 'candidate' : 'original', start: 0, end: candidate.length || original.length, reason: 'Literal guards cannot establish semantic preservation of changed prose.' });
  return {
    outcome: unchanged ? 'pass' : changes.some(c => c.kind !== 'wording') ? 'fail' : 'uncertain',
    changes, originalHash: writingBriefHash(original), candidateHash: writingBriefHash(candidate),
    ...(brief ? { briefHash: writingBriefHash(JSON.stringify(brief)) } : {}),
    method: 'conservative-literal-review-v1', formalProof: false,
  };
}
