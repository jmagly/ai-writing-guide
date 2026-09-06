# Structured writing briefs

The writing brief API separates reader needs, source propositions, evidence strength and author-supplied intent before a consumer drafts or edits text. It does not generate prose, verify factual truth or certify semantic equivalence.

## Contract

`WritingBrief` is a strict version-1 object:

| Field | Meaning |
|---|---|
| `id`, `schemaVersion` | Brief identity and schema version |
| `operation` | `draft-from-notes`, `edit-existing`, `proofread-only` or `continue-author-text` |
| `reader` | Explicit `task`, `audience` and channel-independent `requirements` |
| `intendedAction`, `exclusions` | Reader action and content to leave out |
| `inputs` | Source/author-notes/existing-draft text, SHA-256, provenance source/version and declared author approval |
| `propositions`, `limitations` | Supported wording, evidence-strength label, input spans and protected literal qualifiers |
| `authorClaims` | Experience, opinion, intent or rationale grounded in approved author notes |
| `sourceInputId` | Existing draft required for editing, proofreading and continuation |
| `permissions` | Explicit rephrase/reorder/add-content permissions and individually authorized corrections |

Each evidence reference is `{ inputId, start, end }`. Offsets are JavaScript UTF-16, end-exclusive; validation rejects offsets splitting a surrogate pair. Source hashes cover the exact UTF-8 text, including whitespace.

Proposition evidence-strength labels are `verified`, `reported`, `preliminary`, `experimental` and `unverified`. These labels are supplied by the brief's owner, not inferred or established by this API. Source references prove which supplied material was cited, not whether that material entails the proposition. A confident profile cannot raise these labels.

An `authorClaim` requires approved `author-notes` input and matching wording within its cited span. This deliberately conservative check sends paraphrases for review. Supplying an unrelated input ID does not authorize a new experience or explanation. `authorApproved` and `authorAuthorized` record caller declarations; they do not authenticate a human or grant publication permission.

## API

- `validateWritingBrief(value)` returns `{ valid, diagnostics }`. Missing reader task, action or propositions yields an `editorial-gap`, requiring supplied information or context lookup. Diagnostics omit source text.
- `parseWritingBrief(value)` returns a validated brief or throws a redacted review error.
- `prepareWritingBrief(brief, { profileId, channel })` returns a detached plan containing the unchanged brief, target, operation, permissions, brief digest and input lineage. Channels are `article`, `social`, `email`, `engineering` and `conversation`. Selection does not resolve or apply a profile.
- `validateBriefClaims(brief, proposed)` checks proposed `{ kind, text, groundedIn: [claimId] }` records against supplied propositions or author claims. Changed wording requires review; this is not a semantic paraphrase verifier or an exhaustive scan of arbitrary prose.
- `applyProofreadCorrections(brief, correctionIds)` applies a selected subset of already authorized corrections and returns text, diagnostics and source/brief/final digests.
- `writingBriefHash(text)` computes the source-text SHA-256 used by the contract.

```ts
import {
  parseWritingBrief,
  prepareWritingBrief,
  validateBriefClaims,
  applyProofreadCorrections,
} from 'aiwg/api';

const brief = parseWritingBrief(suppliedBrief);
const plan = prepareWritingBrief(brief, {
  profileId: 'writer-team',
  channel: 'engineering',
});
// plan.brief retains the same propositions and evidence strength for any target.
const review = validateBriefClaims(brief, proposedClaims);
if (!review.valid) {
  // Request source material or author review; do not invent missing content.
}
// Only use for a brief whose operation is proofread-only:
const corrected = applyProofreadCorrections(brief, ['approved-typo']);
```

## Operation boundaries

`draft-from-notes` prepares generation from the supplied brief. `edit-existing` requires a draft and exposes the caller's permissions. `continue-author-text` requires a draft, disables rephrasing/reordering and declares append-only intent. These three modes prepare an inspectable plan; this module does not execute or certify the resulting generation. A consumer must enforce its permitted transformation and validate the resulting text.

`proofread-only` is executable and more restrictive: rephrasing, reordering and content additions are disabled. Each correction includes an ID, original UTF-16 span, exact expected text, exact replacement, reason and `authorAuthorized: true`. The caller selects IDs, not replacement text. Unknown, duplicate, overlapping or stale corrections fail without partial application. An empty selection is a no-op.

Proofreading also refuses changes to cited source spans and occurrences of declared literal qualifiers, including experimental status, even if a correction was listed. Such edits require a separately reviewed brief/operation. This can reject a harmless correction within a cited passage; the API reports that conservative boundary rather than claiming semantic understanding. It cannot determine whether every correction outside protected spans is factual or merely grammatical; the author must authorize it appropriately.

No output here is a publication approval. Existing artifact and publishing policies still apply.

## Historical launch fixtures

`test/fixtures/writing/launch-briefs.v1.json` contains small, exact excerpts from the OMP and Antigravity launch drafts in the strategy repository, pinned to commit `2197634ce5273f79310538c98c530254c65c05e3`. Each fixture records the original path, full-source SHA-256, excerpt hashes, original line/UTF-16 positions and evidence date. Excerpts are combined into an explicitly identified draft fragment for deterministic tests; they are not a newly invented article.

Annotations distinguish:

- a reader-first opening opportunity grounded in the existing deployment action;
- internal campaign/announcement instructions to remove from publishable prose;
- experimental support wording and material qualifications to retain.

OMP evidence is dated 2026-09-04; Antigravity evidence is dated 2026-09-05. Local Linux coverage, project-only resources and unqualified authenticated execution remain historical draft qualifications. The fixtures do not requalify current providers or prove live publication status. Tests verify annotation integrity, stable brief targeting and rejection of qualifier-strengthening edits; independent author review remains necessary for rewritten openings or prose quality.
