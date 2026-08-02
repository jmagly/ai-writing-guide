# Derived output registration

AIWG registers generated outputs as derived artifacts before proposing any of
their content for durable memory. Registration is not promotion: the output
remains model-generated material until individual candidate facts or page
updates pass the existing review gateway.

The `OutputRegistrationCoordinator` verifies an existing project-local file
without modifying or copying it. A registration records:

- a project-relative locator, media type, byte length, and SHA-256 digest;
- the exact context-pack identity and digest used to produce the output;
- bounded source references, optional source digests, and resolvable spans;
- declared conflict and supersession references.

URL references are minimized before persistence: credentials, query strings,
and fragments are removed. Transcript bodies, source bodies, output bodies,
tokens, and credentials are not copied into registration records.

## Preview, confirmation, and replay

`preview()` returns a deterministic operation identity and performs no writes.
`register()` accepts only that exact operation identity, re-verifies the output
digest, writes a pending outbox record, and invokes an idempotent incremental
index sink. A durable receipt is written only after the sink succeeds.

If the sink fails or the process stops between stages, the pending record is
retained under `.aiwg/memory/output-registration/outbox/`. `replayPending()`
retries those records by stable registration identity. Exact repeated
registrations return the original receipt with `duplicate: true`.

The filesystem index stores one bounded JSON record per registration under
`.aiwg/memory/output-registration/index/`; corpus-wide index builders can
consume these records without scanning generated output bodies.
