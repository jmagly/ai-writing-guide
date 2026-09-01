# Civic-action issue traceability

| Issue | Implemented proof | Verification |
|---|---|---|
| #2213 legal/ethics guardrails | `rules/civic-safety.md`, `rules/publication-human-review.md`, jurisdiction template, cited legal brief, non-overridable source/publish gate findings | Source bypass and missing-review negative tests |
| #2214 public-source compliance | Source registry and gate-result schemas/templates, explicit owner/method/cadence/decision/citation/fallback/empty-result fields, executable `source-compliance-gate` | Valid, hostile, public-record-alternative, empty-result, and last-good-copy tests; stable JSON/exit codes |
| #2215 civic newsroom bundle | Non-core addon manifest, README, composition/degraded-mode map, `civic-newsroom-plan`, newsroom flow | Package and manifest discovery validation |
| #2216 meeting transcript/votes | Vote-ledger and reconciliation schemas/templates with mover/seconder/timestamp/citation fields, executable meeting gate, meeting flow with two human gates | Conflict, inferred-vote, source-cue, required-field, exact-ID, and approval tests |
| #2217 public records | Draft-only skill, full planning/tracker/response-ingestion schema and template, records flow, jurisdiction/manual-submission/privacy boundaries | Automatic-submission, tracking-field, schema-fixture, and Flow human-submission tests |
| #2218 procurement | All requested source-class inventory, neutral evidence/risk/handoff schema, review template/skill, protected/public release states, no award recommendation | Inventory completeness and `award_recommendation: null` negative tests |
| #2219 personas | Bounded operator, news-caster, citation-editor, and correction-editor agents; explicit skill/template allocation for resource/records/SEO-GEO work | Strict agent linter, model-policy, and placeholder/orphan tests |
| #2220 publishing gates | Publication packet/gate schemas with section count/freshness, structured-data, link, correction, live-page, sitemap/reindex/cache and last-good-copy controls | Positive and multi-failure fixtures; JSON/exit-code tests |
| #2221 local resources | CAP/GTFS/HSDS conditional field sets, citations, structured-data, template/skill, freshness/public-scope/correction/takedown and publish-gate handoff | Per-vertical required-field negative and research-source assertions |
| #2222 packaging | Canonical opt-in addon, CLI namespace, docs, pilot/marketplace decision, optional dependency/degraded-mode contract; plugin deferred to thin generated wrapper | Dry-run and isolated provider deployment with live CLI execution |

All machine passes remain evidence for review, not authorization for external
action. The full readiness and packaging decision is in
`docs/research/synthesis-and-readiness.md`.
