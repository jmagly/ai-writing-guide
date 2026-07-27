# Session Intelligence Supplementary Requirements

## Functional Contracts

- **FR-001:** The provider set is exactly the canonical IDs from
  `provider-definitions.ts`: `claude`, `codex`, `copilot`, `cursor`, `factory`,
  `hermes`, `opencode`, `openclaw`, `openhuman`, `warp`, `devin-desktop`, `generic`.
  `windsurf` remains an accepted compatibility alias during its deprecation window.
- **FR-002:** Capability classification and current operational state are
  independent machine-readable fields.
- **FR-003:** Unknown provider IDs fail with a stable nonzero error and must not
  fall back to Claude.
- **FR-004:** Every imported event has stable identity, digest, adapter version,
  import run, consistency state, and raw provenance.
- **FR-005:** Provider extensions use `native.<provider>` namespaces.
- **FR-006:** Reimport, relocation, and reindex preserve stable IDs when source
  identity is unchanged.
- **FR-007:** Search pagination is deterministic under concurrent imports.
- **FR-008:** Candidate promotion requires a named consumer, accepted candidate
  version, explicit approval, dry-run, and duplicate detection.
- **FR-009:** `delete --all` means all AIWG-owned copies and never provider logs.
- **FR-010:** Deletion reports surviving promoted-memory dependents.

## Security and Privacy

- **NFR-SEC-001:** Source access is read-only. Transcript content cannot cause
  command, tool, URL, template, plugin, or workflow execution.
- **NFR-SEC-002:** Network acquisition is disabled by default and requires
  explicit operation-specific authorization.
- **NFR-SEC-003:** Allowed roots are canonicalized; traversal, symlink escape,
  non-regular files, and device/FIFO/socket inputs fail closed.
- **NFR-PRIV-001:** Classification/redaction completes before indexing,
  embeddings, extraction, export, or optional-backend transfer.
- **NFR-PRIV-002:** Raw transcript content is excluded from logs, errors,
  telemetry, receipts, and diagnostics unless the operator explicitly requests
  an authorized raw view.
- **NFR-ISO-001:** Queries cannot cross workspace/user scope unless explicitly
  requested and authorized.

## Reliability and Compatibility

- **NFR-REL-001:** Import, reindex, and deletion are atomic or restartable;
  process termination cannot expose partial visible state.
- **NFR-REL-002:** Unchanged replay has a duplicate rate of zero under
  conformance fixtures.
- **NFR-REL-003:** Active append-only files are consumed only through complete
  records and are marked provisional.
- **NFR-COMP-001:** CLI JSON carries a contract version. Additive fields remain
  compatible within a major version.
- **NFR-COMP-002:** Unknown major source schemas fail closed. Unknown individual
  event kinds are preserved opaquely and reported.

## Performance and Resources

Provisional targets must be validated by the repository implementation issue.

- **NFR-PERF-001:** On the documented reference host and a one-million-event
  corpus, indexed search completes within 2 seconds p95.
- **NFR-PERF-002:** Metadata listing completes within 500 milliseconds p95.
- **NFR-RES-001:** Imports stream with configurable limits for record size,
  total input, nesting depth, attachment size, and decompression ratio.
- **NFR-RES-002:** Resource-limit failures preserve checkpoints and do not emit
  partial sessions.

## Observability and Provenance

- **NFR-OBS-001:** Every mutation emits a content-free audit event with
  operation ID, actor context, counts, adapter/policy version, and outcome.
- **NFR-PROV-001:** Citation integrity survives relocation, reindexing,
  extraction, promotion, supersession, tombstone, and purge.
- **NFR-PROV-002:** Deletion receipts exclude content, raw paths, secrets, and
  linkable content digests.

## Testability

- **NFR-TEST-001:** Every adapter passes malformed-input, property/fuzz,
  traversal, schema-drift, active-tail, and resource-limit suites.
- **NFR-TEST-002:** Every provider has either synthetic conformance fixtures or
  an automated contract proving manual-only/degraded/unsupported behavior.
- **NFR-TEST-003:** Parent closure requires provider x operation x fixture x
  documentation x issue traceability.
