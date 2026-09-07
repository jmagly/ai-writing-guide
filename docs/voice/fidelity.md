# Writing fidelity checks

`assessWritingFidelity(original, candidate, brief?)` returns `pass`, `fail`, or `uncertain`, located UTF-16 changes, and source/candidate/brief hashes. Unchanged text and exact authorized proofreading corrections can pass. Changes to literal quantities, command flags, citations and immutable source/continuation boundaries fail the conservative guard. Negation, qualification (including exact brief qualifier wording), and first-person matches are located review signals: changed prose remains uncertain until an explicit semantic reviewer passes it. A contraction or a proper name containing “My” is not itself proof of changed meaning. The same review requirement also applies to actual negation reversals and invented personal claims; the lexical checker cannot distinguish them reliably.

These checks do not establish truth or semantic equivalence. They use conservative English lexical patterns and supplied brief qualifiers; multilingual paraphrases, entity substitutions, scope changes and other meaning changes require semantic review. A matching word count or unchanged set of numbers cannot establish fidelity. The assessment explicitly reports `formalProof: false`.

## Output-mode integration

`applyOutputModes` retains protection requested by any stage through every later stage, then reruns every mandatory validator on the final output. Configure `fidelity: { brief }` to bind semantic review to an immutable brief. Hard guard failures fall back; uncertain rewrites require a configured `validateFinal(original, candidate, assessment?)` returning `pass`. The optional third argument is a cloned literal assessment when a brief is supplied, so reviewers can inspect the located changes without altering the receipt. Existing two-argument callbacks remain compatible. `requireFinalValidator: true` makes an absent final validator an error even without a brief. Validator exceptions, missing validators, malformed responses, timeout, and uncertainty never produce a success receipt.

`validationTimeoutMs` defaults to 30 seconds and is bounded to five minutes. It limits each validation callback; it does not cancel external work already started by that callback. The existing transform callback has its own execution lifecycle.

`onMandatoryValidationFailure: 'unaltered'` returns the original input on failure. `'fail'` throws. For compatibility, protected-token errors still throw when this option is omitted. Receipts distinguish `attempted` modes from `retained` modes. On fallback, `applied` and `retained` are empty even if intermediate candidates were transformed. Validators' explicit diagnostics are retained; thrown implementation errors are sanitized. Keep private source excerpts out of validator messages when storing receipts outside the author's workspace.

Fenced code (backticks or tildes), inline code, quotations and Markdown citations are protected as literal data. Tokens are collision-checked; deletion, duplication, unknown token insertion, and literal replacement metacharacters are covered by regression tests. This is a Markdown-oriented protector, not a universal parser. Unsupported syntax should be preserved through an explicit machine-readable/code wrapper or checked by a task-specific final validator.

## Development evidence

The [exact-span repair study](evidence/span-repair-development-2026-09-07.md) records six assisted cases and the frozen-output replay that motivated semantic-review routing. One of four repaired failures passed the joint development criteria; this does not qualify a model or channel for broad rollout.
