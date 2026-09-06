# Writing Receipts and Legacy Migration

Writing receipts are local AIWG artifacts for recording what a writing command reports using without saving the private prose it processed. The canonical path is the resolved AIWG artifact root plus `writing/receipts/<receipt-id>.json`; projects that use `.aiwg-location` or artifact path environment aliases write receipts to that configured root.

The v1 receipt is intentionally closed. It records profile IDs, versions, revisions, cache epochs, selected example hashes, ordered references and hashes for the effective mode stack, consumer selected/delivered/applied/validated state, operation configuration IDs such as selected correction IDs, prompt/template/configuration hashes, deterministic decoding parameters, validator and evaluation references, input and output hashes, budget use, fallback status, and author acceptance. It does not contain raw samples, brief text, generated output text, credentials, provider-native transcript logs, or arbitrary metadata bags. The entire receipt is checked by the governance redaction engine and rejected if any field contains a known secret or credential pattern.

Mode state is checked against the declared mode stack: mode IDs are unique, state IDs must reference declared modes, applied modes must have been delivered, validated modes must have been applied, and fallback receipts cannot report applied or validated modes.

Model execution is explicit: `none` for deterministic local operations, `local-callback` when a local prose transformer was invoked, and `hosted` when a hosted model was used. Hosted provider model and prompt versions cannot be fully attested by a local receipt. Hosted receipts bind the local prompt material supplied to the caller and record that hosted version certainty is unavailable unless an external provider attestation is added separately.

A receipt is an integrity-bound record of caller declarations, not independent execution attestation. Reproduction also requires the matching private brief, profile, examples, prompts and validator implementations; hashes cannot reconstruct these inputs. Keep authorized inputs separately under their retention policy. Revocation can intentionally make a previous run no longer reproducible.

Receipt IDs are immutable. Rewriting the same ID with identical bytes is idempotent; rewriting it with different content is rejected so a receipt path cannot silently change meaning.

Legacy migration is opt in. `planWriterProfileMigration` reads a YAML or JSON legacy profile through the existing legacy adapter, validates it, and returns a dry-run plan. The plan creates a writer-profile sidecar with the legacy payload attached losslessly; it does not infer preferences, does not replace deprecated numeric scoring, and does not activate an output mode.

`applyWriterProfileMigration` rechecks the source digest from the dry-run plan, verifies the target profile revision/hash still matches the dry-run, writes a private backup under the writer profile store's managed migration area, then saves the sidecar through `WriterProfileStore`. Rollback accepts only backups from that managed directory and verifies the current profile digest/revision before reading backup contents. If the profile changed after migration, rollback refuses to touch it so unrelated edits are preserved. Later normal profile updates and deletion clear managed migration backups through store invalidation.

Deletion and revocation remain store operations. Revoking samples removes dependent inferred preferences and invalidates managed caches; it cannot recall shared exports or copies already written outside the local AIWG artifact root, so those require separate operator review.
