# Writing fidelity checks

`assessWritingFidelity(original, candidate, brief?)` returns `pass`, `fail`, or `uncertain`, located UTF-16 changes, and source/candidate/brief hashes. Unchanged text and exact authorized proofreading corrections can pass. Changes to literal quantities, command flags, negations, qualification language, citations, and newly ungrounded first-person wording fail the conservative guard. Other rewrites remain uncertain until reviewed.

These checks do not establish truth or semantic equivalence. They use conservative English lexical patterns and supplied brief qualifiers; multilingual paraphrases, entity substitutions, scope changes and other meaning changes require semantic review. A matching word count or unchanged set of numbers cannot establish fidelity. The assessment explicitly reports `formalProof: false`.

## Output-mode integration

`applyOutputModes` retains protection requested by any stage through every later stage, then reruns every mandatory validator on the final output. Configure `fidelity: { brief }` to bind semantic review to an immutable brief. Hard guard failures fall back; uncertain rewrites require a configured `validateFinal(original, candidate)` returning `pass`. `requireFinalValidator: true` makes an absent final validator an error even without a brief. Validator exceptions, missing validators, malformed responses, timeout, and uncertainty never produce a success receipt.

`validationTimeoutMs` defaults to 30 seconds and is bounded to five minutes. It limits each validation callback; it does not cancel external work already started by that callback. The existing transform callback has its own execution lifecycle.

`onMandatoryValidationFailure: 'unaltered'` returns the original input on failure. `'fail'` throws. For compatibility, protected-token errors still throw when this option is omitted. Receipts distinguish `attempted` modes from `retained` modes. On fallback, `applied` and `retained` are empty even if intermediate candidates were transformed. Validators' explicit diagnostics are retained; thrown implementation errors are sanitized. Keep private source excerpts out of validator messages when storing receipts outside the author's workspace.

Fenced code (backticks or tildes), inline code, quotations and Markdown citations are protected as literal data. Tokens are collision-checked; deletion, duplication, unknown token insertion, and literal replacement metacharacters are covered by regression tests. This is a Markdown-oriented protector, not a universal parser. Unsupported syntax should be preserved through an explicit machine-readable/code wrapper or checked by a task-specific final validator.
