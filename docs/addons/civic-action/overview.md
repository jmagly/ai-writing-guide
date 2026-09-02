# Civic Action overview

Civic Action packages research-first, evidence-preserving workflows for public
sources, meetings, records requests, public-technology procurement, local
resource indexes, corrections, and publication review. It is an opt-in addon,
not a jurisdiction database, law practice, autonomous newsroom, recorder, CMS,
or outreach system.

## Safety and evidence model

The executable source, meeting, and publication commands validate their input
schemas and block selected declared conditions, including access-control bypass,
unresolved source authorization/rights, conflicted or unverified vote evidence,
uncited declared material claims, incomplete named privacy/accessibility review,
and missing independent, dated exact-hash publication approval. Publication
claims use source/retrieval/selector citations, and empty claim or upstream-gate
inventories cannot pass. Broader jurisdiction,
consent, private/public status, anti-targeting, retention, and independent-review
requirements are mandatory human workflow rules; the commands do not infer
those facts from content.

Source identity and retrieval versions are distinct. Contracts provide fields
for epistemic status, source/retrieval identity, selectors, contrary evidence,
and review history. Correction artifacts plan linked new versions rather than
silent replacements; the addon does not enforce an external storage history.

These choices follow [W3C PROV-O](https://www.w3.org/TR/prov-o/),
[RFC 9309](https://www.rfc-editor.org/rfc/rfc9309.html), the
[NIST AI RMF](https://www.nist.gov/itl/ai-risk-management-framework), the
[NIST Privacy Framework](https://www.nist.gov/privacy-framework), and the
[SPJ Code of Ethics](https://www.spj.org/spj-code-of-ethics/). The cited legal
and standards research in `docs/research/` states scope and dissent explicitly.
The `control-source-matrix.md` file maps each skill to its sources, tests, and
executable-versus-declarative boundary.

## Human authority

Machine gates return `pass|warn|block`; a pass only means no blocking condition
was found among the declared fields inspected by that command. It does not
authorize action, determine legality, or independently verify facts. A named
human reviews the exact artifact and underlying evidence before recording,
submission, outreach, identity assignment, legal assertions, publication, or
correction release. External action remains outside the executable gates.

## Composition

`aiwg-utils` supplies the Flow contract. Optional research-complete,
media-curator, knowledge-base, media-marketing-kit, ops-complete, and
security-engineering components add specialized capabilities. Their absence is
reported honestly and never replaced with invented transcripts, citations,
legal conclusions, accessibility conformance, or deployment evidence.
