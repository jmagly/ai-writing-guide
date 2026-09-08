# Reviewed executor fixtures

`reviewed-sha256.json` records the reviewed SHA-256 digest of each JSON fixture.
The expected digest is checked in independently from the bytes hashed during a test
run, so edits made before collection are detected.

When intentionally changing a fixture, review its protocol semantics and affected
positive and negative assertions first. Update only that fixture's manifest entry
after review, then run the executor conformance suite. Do not regenerate all
expected digests automatically to accept an unexplained failure.

`paused-event.json` supplies a canonical optional pause payload for schema
conformance. It does not claim a live executor implements pause/resume.

The manifest is a review and drift guard, not an external authenticity signature.
Semantic schema and registry assertions remain separate from byte integrity.
