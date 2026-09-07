# Voice correction evaluation flow

[voice-critique-correction.flow.yaml](voice-critique-correction.flow.yaml) records the complete repeatable protocol for **voice output → primary-session criticism → voice correction → primary-session recheck**. It uses AIWG's [declarative flow schema](../../../agentic/code/frameworks/sdlc-complete/schemas/metalanguage/flow.schema.json).

The default experiment uses one initial draw and at most one correction per case. The same configured model generates and corrects in fresh contexts. The parent session alone judges. Initial joint passes are retained without another call. An unsuccessful correction preserves the original source. Best-of-three or additional correction rounds are separate experiments with separate manifests.

To conduct a run, have the primary session read the YAML, create a unique run directory in the configured AIWG artifact store, and supply the required manifest, cases, authentic profiles/examples and rubric. Follow its nine ordered steps and retain the listed artifacts. The manifest must bind concrete model settings, case inventory, budgets, reviewer identity and hashes before the first call. The flow does not implicitly launch another experiment when read.

This is an **agent-interpreted metalanguage flow**, not an installed unattended execution adapter or a `GraphPlaybook`. Role names are bindings described in the YAML, not assumed installed agent IDs. `protocol` contains the detailed operating contract; the schema validates the flow structure, while the orchestrating session must enforce those instructions. No claim is made that schema validation proves runtime enforcement.

For comparison, the [initial harness study](../evidence/harness-models-2026-09-07.md) contains generation and primary review only. Its revision replay checked application, not voice correction. New paired results must keep those first-pass scores unchanged and report correction rescue rates, validity repairs, residual failures and all planned denominators separately. Source/example changes require a new run. Session judgment remains development evidence, not independent author validation.
