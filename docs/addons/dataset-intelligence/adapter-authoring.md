# Source adapter authoring and qualification

Use the normative [source adapter guide](../../dataset/source-adapters.md)
and `source-adapter.v1` schema. An adapter manifest declares identity, version,
source kinds, configuration schema, credential locators, capability limits,
privacy/network behavior, lifecycle support, checkpoint compatibility, and
qualification maturity.

Adapters must implement bounded check and preview behavior before ingestion;
redact secrets and sensitive samples; reject undeclared hosts and path escape;
and bind checkpoints to adapter version, source schema, and plan digest. A
declared capability is not a supported capability until qualification evidence
passes. Publication must include versioned schemas, valid and invalid fixtures,
security review, compatibility policy, and a release artifact digest.

The reference adapters and SDK live in `src/dataset/`. Addon skills only select
and explain them; they must never duplicate adapter execution.
