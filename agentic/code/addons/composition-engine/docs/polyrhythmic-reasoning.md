# Polyrhythmic reasoning pattern

The **polyrhythmic-reasoning** adapter turns the illustrative 4:4 and 5:4
prompt shape into an explicit FlowGraph pattern. It makes no claim that more
beats are smarter, more accurate, or more efficient. Those are evaluation
questions, not properties implied by the topology.

Both profiles use **flow.aiwg.io/v1alpha1** and **kind: FlowGraph**. No
fourth-level DNS API group is required.

## Profiles

**strict-lcm** runs problem-mode every fourth activation and user-mode every
fifth activation. Their first common activation is 20, when final synthesis is
allowed. This profile exists to reproduce and test that exact schedule.

**adaptive** uses the same nodes, phases, state fields, bindings, and final
output. It checks an evidence-backed typed convergence value after each paired
activation and may synthesize early. The eight-activation ceiling remains
independent and stops execution even if the evaluator never converges.

The periods are one pattern choice, not a default recommendation for other
graphs.

## Beat contract

Problem-mode uses the **derive-evaluate-expand** phase:

1. Derive one bounded candidate from the supplied question.
2. Evaluate it against supplied task evidence.
3. Expand only implications supported by that evidence.

User-mode uses **classify-evaluate-expand**:

1. Classify only context the user stated and attach the supporting evidence.
2. Preserve **unknown** when evidence is missing or ambiguous.
3. Evaluate presentation constraints and expand only supported adaptations.

Each beat emits a typed evidence record with track, phase, activation,
iteration, status, evidence, and conclusion. **status: executed** means the
beat ran. Adapters may record **status: skipped** only when the manifest's
optional/failure policy authorizes the skip; the reason belongs in the event
trace. A failed beat follows the graph's partial-synthesis policy and is never
silently treated as successful.

Evidence arrays are appended in manifest order. The convergence score uses a
maximum reducer. Conflicting conclusions are preserved and final synthesis
returns **conflicting-track-results** rather than silently selecting one.

## Public output and trace boundary

Final synthesis returns:

- **answer** — the user-facing response;
- **decisionSummary** — a concise compatibility or conflict outcome;
- **evidenceSummary** — beat counts and conflict status; and
- **userState** — an explicitly supported state or **unknown**.

Both profiles are final-only. Intermediate drafts are not user output. Metadata
traces contain execution identities, status, digests, and resources—not private
chain-of-thought. Classification evidence is redacted if full-I/O tracing is
enabled.

## Safe examples

The shipped examples cover technical troubleshooting, conceptual explanation,
practical planning, and theoretical comparison. They include agent-only and
agent-plus-read-only-tool forms. The latter grants only **filesystem:read** and
uses **sideEffectMode: none**.

The adapter rejects general medical/healthcare diagnosis or treatment,
investment/financial advice, and any scenario marked high risk. Those domains
require separate governance and are not generic prompt templates. It also
rejects unsupported claims that the pattern is better, smarter, more accurate,
or more efficient.

## Programmatic adapter

~~~javascript
import { buildPolyrhythmicGraph } from './lib/polyrhythmic-reasoning.mjs';

const graph = buildPolyrhythmicGraph({
  id: 'explain-idempotency',
  domain: 'conceptual-explanation',
  profile: 'adaptive',
  composition: 'agent-plus-read-only-tool',
  question: 'Explain idempotent versus exactly-once execution.',
  evidence: [{ source: 'local-document', path: 'docs/runtime-operations.md' }],
  classificationEvidence: [],
  statedUserState: 'unknown',
});
~~~

The builder validates the scenario, narrows read-only tool authority, produces
one strict FlowGraph, and validates the generated graph before returning it.
Use the normal **aiwg composition run** adapter boundary to execute it.
