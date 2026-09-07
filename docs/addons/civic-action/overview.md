# Civic Action overview

Civic Action packages research-first, evidence-preserving workflows for public
sources, meetings, records requests, public-technology procurement, local
resource indexes, corrections, and publication review. It is an opt-in addon,
not a jurisdiction database, law practice, autonomous newsroom, recorder, CMS,
or outreach system.

## Common Use Cases

- Review public sources while preserving source identity, retrieval details, and uncertainty.
- Plan a records request or meeting workflow with human approval gates.
- Build a local resource index without inventing citations or eligibility rules.
- Prepare a correction or publication review package before any external action.

## Interaction model

Users describe the civic outcome and evidence boundary in a prompt. The AIWG
steward handles opt-in setup, capability discovery, dependency checks, and
provider-safe deployment; the selected civic skill then creates reviewable
artifacts and stops at the appropriate human gate.

```text
Act as the AIWG steward. Make Civic Action available for this project after
previewing the setup and obtaining approval. Then help me plan an evidence-bound
civic workflow for the material I provide. Establish jurisdiction and source
authority, preserve uncertainty and citations, explain every warning or blocked
condition, and stop before any submission, contact, recording, identification,
or publication.
```

The [prompt-based quickstart](quickstart.md) provides focused asks for source
review, public records, meetings, procurement, local resources, corrections,
and publication. Direct setup and gate syntax is isolated in the
[Civic Action CLI reference](../../cli/reference.md#civic-action)
for advanced operators and automation.

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
