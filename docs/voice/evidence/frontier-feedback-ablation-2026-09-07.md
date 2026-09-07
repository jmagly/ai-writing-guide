# Astra correction ablation: feedback and example selection

The three research-informed interventions did not improve the short technical cases in this trial. All 23 new corrections were applicable, retained protected literals and passed factual review, but none of the 18 technical outputs passed the unchanged voice criterion. More precise feedback also lost one richer-source joint pass relative to the previous correction draw.

| Condition | New corrections | Technical joint passes | Full inventory joint passes |
| --- | ---: | ---: | ---: |
| Earlier broad-feedback baseline | 11 historical | 0/6 | 9/15 |
| A: precise span feedback + preservation instructions | 11 | 0/6 | 8/15 |
| B: function-selected authentic examples + broad feedback | 6 | 0/6 | Not rerun |
| C: new examples + precise feedback | 6 | 0/6 | Not rerun |

A's four new passes survived production revision replay. All 23 new no-review controls preserved originals. Four initial passes were carried unchanged into A's full-inventory count; they were not counted as successful corrections. B/C covered only the six technical cells and make no full-inventory claim.

## Design and evidence

Each generation used one fresh subagent with requested GPT-6 Astra, medium reasoning and no conversation fork. The same original responses from `harness-models-01` were supplied to every correction condition; no condition continued from another condition's corrected output. This session alone supplied and judged criticism. The original source, fact requirements, literal multiplicity, output mechanism, edit limits and voice rubric were retained. There were no retries or additional correction rounds.

A replaced broad cadence directions with small quoted spans, an authentic exemplar anchor, a concrete rhetorical operation and preservation instructions. Its two factual-only corrections explicitly preserved previously accepted cadence. B changed only the correction examples and associated selection metadata relative to broad-feedback packets. C combined the changes and updated exemplar anchors to the selected material. The function-example selector inspected authentic development samples and never evaluated model outputs.

Selected examples were Woolf's explanation of translation limits and essay principles; Twain's speech-note instruction and alphabet-scope qualification; Darwin's discussion of transition inference and voyage advice. Provenance includes exact source/sample IDs, spans and hashes. Word budgets stayed below the original example totals: Woolf 286/334, Twain 84/102 and Darwin 275/326. These are word ceilings, not equal token counts. Changes in example length are a confound alongside their rhetorical function.

The experiment operationalizes hypotheses motivated by [Self-Refine (REF-015)](https://arxiv.org/abs/2303.17651), [implicit style imitation (REF-2453)](https://aclanthology.org/2025.findings-emnlp.532/), and the corpus's natural-voice evaluation brief. The sources do not guarantee that these interventions work with current frontier harness models. The example-selection paper itself reports mixed effects across metrics and domains.

## Failure pattern and decision

Technical responses continued to rely on clause reordering, repeated adapter requirements, and phrases announcing that checks have limits. Some became tautological, such as restating that local checks are local. These outputs were faithful; they did not demonstrate convincing author-specific cadence under the existing rubric.

A retained the richer Woolf and Darwin improvements but case 07, the Twain paragraph proposal, became generic reporting. Its earlier broad-feedback correction remains the better observed candidate. No earlier score or output was overwritten. The earlier correction workflow remains the best observed baseline, and these variants are not promoted as improvements.

This is a small development study: six technical cells share one 59-word source; each condition has one draw; the baseline was not rerun; and the primary judge is neither independent nor blinded. Requested model overrides were accepted, but independent resolved-model receipts, token use and costs are unavailable. Frozen arm inputs were verified after completion. The result does not establish that precise feedback or function-based example selection fails generally.

Before spending more on the same short fixture, the next useful measurement is judge calibration using authentic short passages and faithful generic controls. A separate fresh-drafting-from-facts test could then distinguish prior-draft anchoring from example or feedback problems. New technical topics are needed before generalizing; no threshold reduction, invented facts or detector-based acceptance is proposed.

[Aggregate results](frontier-feedback-ablation-2026-09-07.json). Local run artifacts, frozen packets, source-selection provenance, agent receipts, primary notes and replay results are in `.aiwg/working/voice-2292/frontier-feedback-ablation-01/`. See the [earlier correction trial](harness-correction-2026-09-07.md) and [YAML operating flow](../flows/voice-critique-correction.flow.yaml).
