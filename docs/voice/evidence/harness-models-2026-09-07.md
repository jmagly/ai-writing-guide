# Native agent harness model trial

Thirty fresh subagents generated fifteen cases each with requested models GPT-6 Astra and GPT-5.6 Sol. Each received one frozen source/example task, no conversation fork and no prior scores or feedback. This session alone judged the outputs.

| Requested model | Cases | Applicable outputs | Complete factual fidelity | Joint facts and voice |
| --- | ---: | ---: | ---: | ---: |
| GPT-6 Astra | 15 | 15 | 13 | 4 |
| GPT-5.6 Sol | 15 | 13 | 8 | 3 |

Astra passed two Twain richer-source cells and two Darwin richer-source cells. Sol passed three Darwin richer-source cells. None of the six short technical cases per model met the joint criterion. All seven accepted candidates retained the full source and exact literals. Production revision replay retained exactly those seven; all 28 no-review controls preserved originals.

Astra's remaining problems were mostly generic cadence. Its two factual failures collapsed the distinction between a decision at the end of a pilot and a dated adoption after the pilot; one also changed required literal multiplicity. Sol additionally introduced evaluations or history absent from the source, omitted a quantifier, and exceeded the frozen per-edit source-word budget in two paragraph proposals. Invalid proposals were not semantically scored.

The result supports continuing with Astra as a promising configured harness lane. It does not establish that larger parameter counts are necessary or sufficient, that model size caused the difference, or that any lane meets 10/10 or all-channel qualification. The primary judge is not independent of the harness model family. Judgments are development evidence, not author approval or independent reader validation.

## What this lane measures

The task's system and prompt field bytes match the corresponding public-author hosted cases, but the complete inputs are not identical. Native subagents also saw the case metadata, including author labels, and inherited harness/system/developer/workspace instructions. The hosted API calls received the system and prompt fields only. Subagents had filesystem tools to read the case and write their response; no native JSON grammar or API token ceiling was imposed. Reasoning was requested at medium, versus low in the hosted lane. These are configured workflows, not an isolated base-model or equal-budget comparison.

The requested model overrides were accepted by the native spawn tool. Independent provider-resolution receipts, token use and cost are unavailable, and are not inferred from model self-identification. Completion is observed from each subagent returning its saved artifact path; the collector normalizes that completion for the shared parser without claiming an API finish reason.

## Repeatable lane procedure

Freeze a case manifest and source hashes before generation. Launch one new generation-only subagent per model/case with fork_turns=none, explicit model and reasoning request, a single assigned case file, and a unique output path. Do not reuse a subagent for another case or supply review feedback. Keep all returned artifacts, including invalid outputs. Record spawn settings, observed completion and artifact hashes.

Normalize saved artifacts into the existing outputs/manifest contract, then apply the same strict parser, unique source-span matching, non-overlap, 80 source-word budget and literal-multiplicity checks as the API lanes. Have the primary session review applicable candidates, binding decisions to candidate hashes. Replay both reviewed selection and no-review controls. This is a native orchestration procedure, not a newly shipped matric-eval CLI provider.

Raw inputs/outputs, agent receipts, primary notes and replay results are retained in .aiwg/working/voice-2292/harness-models-01/. Generated text is not enrolled as authentic author writing. This trial uses the matched public-author subset; it does not establish coverage of the private JDS voice or the full author/channel inventory.

[Aggregate receipts](harness-models-2026-09-07.json). Native model selection and isolated agent contexts are documented in the [subagent documentation](https://learn.chatgpt.com/docs/agent-configuration/subagents).
