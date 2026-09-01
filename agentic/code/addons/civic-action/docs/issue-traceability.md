# Civic-action issue traceability

| Issue | Implemented proof | Verification |
|---|---|---|
| #2213 legal/ethics guardrails | `rules/civic-safety.md`, `rules/publication-human-review.md`, jurisdiction template, cited legal brief, non-overridable source/publish gate findings | Source bypass and missing-review negative tests |
| #2214 public-source compliance | Source registry and gate-result schemas/templates, executable `source-compliance-gate`, access/rights/robots/freshness logic | Valid and hostile fixtures; stable JSON/exit codes |
| #2215 civic newsroom bundle | Non-core addon manifest, README, composition/degraded-mode map, `civic-newsroom-plan`, newsroom flow | Package and manifest discovery validation |
| #2216 meeting transcript/votes | Vote-ledger and reconciliation schemas/templates, executable meeting gate, meeting flow with two human gates | Conflict, inferred-vote, source-cue, exact-ID, and approval tests |
| #2217 public records | Draft-only skill, planning schema/template, records flow, jurisdiction/manual-submission/privacy boundaries | Schema fixture and Flow human-submission gate validation |
| #2218 procurement | Neutral evidence/risk schema, review template/skill, protected/public release states, no award recommendation | Schema fixture enforces `award_recommendation: null` |
| #2219 personas | Bounded operator, news-caster, citation-editor, and correction-editor agents | Strict agent linter and placeholder/orphan tests |
| #2220 publishing gates | Executable claim/citation/freshness/privacy/accessibility/correction/reindex/last-good/deployment gate | Positive and multi-failure fixtures; JSON/exit-code tests |
| #2221 local resources | CAP/GTFS/HSDS index schema, template, skill, freshness/public-scope/correction controls | Schema fixture and research-source assertions |
| #2222 packaging | Canonical opt-in addon, CLI namespace, docs, optional dependency/degraded-mode contract; plugin deferred to thin generated wrapper | Dry-run and isolated provider deployment with live CLI execution |

All machine passes remain evidence for review, not authorization for external
action. The full readiness and packaging decision is in
`docs/research/synthesis-and-readiness.md`.
