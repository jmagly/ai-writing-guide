# ADR-002: Normalize Immutable Evidence Events

Status: Accepted for planning

Date: 2026-07-26

## Context

Providers expose incompatible transcript, event, lifecycle, and export models.
Flattening them into messages would discard lineage, compaction, interruption,
tool, attachment, and consistency evidence.

## Decision

Normalize sources, sessions, and ordered evidence events. Provider-native fields
remain under versioned `native.<provider>` namespaces or immutable bounded raw
references.

Imported evidence is append/version-oriented. Parser upgrades create a new
`import_run`; they do not silently rewrite prior evidence.

Stable native IDs are preferred. Synthetic event IDs use source/session
identity, a native sequence or byte locator, event kind, and a canonicalized
payload digest.

## Consequences

- Unknown native fields survive normalization.
- Search and extraction can cite exact evidence.
- Reprocessing and schema drift are auditable.
- Storage cost is higher than a summary-only catalog.
