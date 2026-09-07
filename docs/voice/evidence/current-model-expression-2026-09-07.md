# Current-model expression revalidation

Following operator direction, GPT-OSS20b is excluded from current-model qualification. This study makes 40 new calls with the designated Qwen3.8:27b baseline and Gemma4:31b. Each model receives the same 20 frozen prompt/system pairs: four voices × two passages × whole rewriting/exact-span editing, plus four richer-source paragraph-range edits.

| Configured workflow | Calls | Normal | Applicable | Complete factual fidelity | Joint voice passes |
| --- | ---: | ---: | ---: | ---: | ---: |
| Qwen3.8:27b | 20 | 14 | 13 | 6 | 3 |
| Gemma4:31b | 20 | 20 | 8 | 1 | 0 |

Qwen's three joint development passes were the Woolf richer-source rewrite, Darwin richer-source paragraph edit, and JDS short technical exact-span edit. The first develops a reader's reconsideration through connected clauses; the second connects observation, countercondition and bounded adoption; the third preserves already-concise practical expression without requiring expansion or shortening. All three retain exact literals and the complete source claims. These are primary-session judgments, not author approval or independent authenticity evidence.

Qwen had six output-ceiling failures and one bare-array proposal instead of the required object. Gemma returned all twelve edit proposals inside Markdown fences; the frozen strict JSON parser rejected them. Those twelve have no applied candidate or semantic rating in this experiment: do not report them as twelve semantic-fidelity failures or infer that Gemma cannot perform edits. Native structured output is the next integration hypothesis. No wrapper removal, schema repair or replacement draws were applied here.

Other completed candidates introduced unsupported comparisons, exclusivity, personal participation, evaluative stance, or dropped the fixture's fictional status. Exact literal retention alone did not establish fidelity. Paragraph edit granularity also differs from arbitrary substring edits; this is not a pure identifier experiment. The three normally completed Qwen paragraph proposals fit the selected source-word budget; an interim concern about those ranges was corrected after measurement. Gemma proposals were rejected at the earlier JSON-parsing stage.

Production revision replays retained exactly the three Qwen joint passes and none of the eight applicable Gemma candidates. All 21 no-review replays preserved originals. Whole rewrites are represented as a single substantive edit only for replay; other candidates use their proposed edits. Reviews are hash-bound, offline and primary-session supplied, not an autonomous online critic.

Qwen used 87,227 tokens with temperature 0.3, medium reasoning requested and 32768 observed generation context. Gemma used 33,525 tokens with release-recommended temperature 1.0/top_p0.95/top_k64, reasoning disabled and 8192 context pinned through a local model alias. Both use seed 2303 and 4096 output ceiling. Different decoding/context means comparison of configured workflows, not an isolated architecture effect or equal-budget benchmark. Usage excludes primary review and warmup. Exact model digests and receipts are retained. Both service windows restored Fortemi healthy and unloaded the tested model.

Gemma's base artifact is 31.3B Q4_K_M, digest 6316f0629137b426c9d9b853ffc4c8209589f30ee39aebede6285096c0ff47e7; its configured alias digest is 806ac40b8301eb57d02220c82a5c8407a6df06aeb6225e0ace00b2f3ed039a4b. Actual generation inventory recorded 21.53GB loaded size and 19.94GB GPU-resident size; do not claim all residency was on GPU. Qwen digest is 22130167c4c20e20c7b71454612966ca8e8171e9b3cc8ab6ce8aa6cbfec79643.

[Aggregate receipts](current-model-expression-2026-09-07.json). Private source material, raw outputs, frozen inputs, primary notes and replays remain in `.aiwg/working/voice-2292/expression-modern-qwen-01/` and `expression-modern-gemma-01/`. No generated text is enrolled as authentic author writing. These results do not qualify every channel or satisfy independent evaluation.

Runtime settings were checked against the [Gemma4 release](https://ollama.com/library/gemma4:31b) and [Ollama compatibility documentation](https://docs.ollama.com/api/openai-compatibility).

The [native-schema follow-up](gemma-native-schema-2026-09-07.md) completed twelve new Gemma edit calls: six applicable proposals, two fidelity passes and no joint voice passes. It preserves the original outcomes above.
