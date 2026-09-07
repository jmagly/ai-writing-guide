# Native harness: one criticism-guided correction

One correction pass increased Astra's joint factual-fidelity and voice result from **4/15 to 9/15**, and Sol's from **3/15 to 4/15**. Astra passed all nine richer-source cases after selection, but neither configured model passed any of the six short technical cases. These are primary-session development judgments, not independent author validation.

| Requested model | Initial joint / planned | Corrections attempted | Corrected applicable | Corrected fidelity | Rescued / eligible | Final joint / planned |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| GPT-6 Astra | 4/15 | 11 | 11/11 | 11/11 | 5/11 | 9/15 |
| GPT-5.6 Sol | 3/15 | 12 | 11/12 | 10/12 | 1/12 | 4/15 |

Seven initial passes were retained without correction. All 23 correction requests completed. All 22 applicable corrections preserved the protected literal counts. Production revision replay retained exactly the six newly passing candidates; all 22 new no-review controls preserved the original. Seventeen of the 30 final selections preserve the original source because neither candidate qualified.

## Paired design

This is a continuation of the [first harness trial](harness-models-2026-09-07.md), following the [criticism/correction flow](../flows/voice-critique-correction.flow.yaml). Initial raw artifacts and scores were imported unchanged and hash-frozen before correction. Since generation predates the YAML flow, this is a paired continuation cohort, not a prospective replication of every stage of the flow.

Each failing response received one fresh generation-only subagent using the same requested model, medium reasoning and no conversation fork. The correction packet contained the original task, authentic examples and guidance, initial response, locked review, and concrete criticism. The parent session alone supplied criticism and rechecked the whole candidate. No replacement prose was supplied by the judge. There were no retries, extra draws, relaxed budgets or second corrections. Invalid initial proposals could receive an applicability repair, reported separately from voice gains.

Native model overrides were accepted by the spawn tool; independent model/provider resolution receipts, token use, cost and per-call latency are unavailable. Inherited harness instructions and visible author metadata remain part of this configured workflow. These results do not isolate model size or establish equal-budget comparisons with hosted API lanes. Exact task/profile/source bytes and the flow hash were verified after review.

## What improved and what did not

Astra repaired both date/decision conflations while preserving the already successful movement. Three additional corrections developed recognizable Woolf or Twain movement in the richer fixture without adding facts. Its five rescued cases were 01, 04, 07, 09 and 13. By author, its final result was Woolf 3/5, Twain 3/5 and Darwin 3/5: each author's richer three cases passed and technical two failed.

Sol repaired unsupported claims in several responses, but only case 01 gained a joint pass. Case 05 became faithful plain reporting while losing its prior dry cadence. Both initially oversized paragraph proposals became applicable, without passing voice. Case 08 regressed to an oversized source-span edit and could not be semantically scored. Case 13 restored the named missing quantifier, but whole-candidate review still found unsupported characterization/restriction of the checklist's recorded content and generic framing. Its final author results were Woolf 1/5, Twain 0/5 and Darwin 3/5.

Across both models, short technical corrections mostly changed conjunctions, moved clauses, repeated requirements or announced caveats. They preserved the facts more reliably than they produced convincing target cadence. The result supports testing whether different task-relevant technical exemplars or a richer factual brief can address that remaining gap in a new frozen cohort; it does not justify loosening fidelity or declaring overall 10/10.

[Aggregate receipts](harness-correction-2026-09-07.json) include case IDs, author/source/mechanism breakdowns, applicability transitions and missing-measurement declarations. Local evidence is retained in `.aiwg/working/voice-2292/harness-correction-01/`, including the frozen flow, correction packets, raw responses, primary reviews and revision replay. Generated writing is not enrolled as authentic profile material.
