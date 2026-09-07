# Bounded expression editing and paragraph addressing

The initial sixteen-call GPT-OSS20b comparison tested whole rewriting against up to three bounded expression edits across four voices and two sources.

| Result | Whole rewrite | Exact-span edits |
| --- | ---: | ---: |
| Calls | 8 | 8 |
| Normal completions | 8 | 6 |
| Valid candidates | 8 | 4 |
| Exact-literal passes | 6 | 4 |
| Complete factual fidelity | 3 | 3 |
| Joint voice passes | 0 | 0 |
| Generation tokens | 22,887 | 28,869 |

All four valid edit candidates were the short technical source. Three preserved its facts; the Darwin candidate added an unsupported comparison with standard patterns. Their punctuation and sentence joins did not establish convincing author cadence. Three richer-source whole rewrites preserved facts but largely repeated the source inventory. Other whole rewrites introduced identity, stance, mechanisms or changed qualifications.

All four richer-source edit attempts failed to produce applicable proposals: two exhausted the output ceiling, one changed a hyphen in its expected source, and one collapsed a paragraph separator. No fuzzy matching or repair was used.

A separate four-call follow-up identified editable ranges by paragraph IDs and let the adapter derive exact source bytes and UTF-16 offsets for the production revision API. This changes both addressing and edit granularity; the earlier method permitted arbitrary substrings. All four new calls completed and all four proposals applied. Three preserved exact literals and complete facts; Twain changed adoption after a pilot into starting the pilot on that date, added an unsupported causal relationship and duplicated the CTA. None passed the joint voice criterion. The follow-up used 16,913 tokens. Twelve other original cells were not rerun or counted as new evidence.

Four joint-gated production revision replays and four no-review replays preserved originals. These are offline replays of frozen proposals and primary judgments, not an autonomous online critic. No model output was enrolled as author source material.

The primary session reviewed every candidate and also developed the profiles and scenarios; this is not independent author/reader qualification. Same existing core guidance and two authentic examples per voice were used across paired methods. The two passages confound topic and length. Warmup inventory recorded 8192 context, but inventory captured during actual generation recorded 32768; both are retained. The model digest, decoding, prompts, sources and proposal hashes are saved. Both service windows restored Fortemi healthy and unloaded the model. Usage totals exclude primary review and warmup.

Paragraph IDs improved proposal applicability in this bounded slice, but neither method established the requested cadence. Do not promote these findings to channel qualification or a default rewriting adapter. Preserve unsupported comparisons, identity additions, literal mutations and timeline changes as failure cases.

[Aggregate receipts](expression-edits-development-2026-09-07.json). Private raw outputs, source material, primary reviews and runtime receipts remain under `.aiwg/working/voice-2292/expression-edits-pilot-01/` and `expression-edits-pilot-02/`.
