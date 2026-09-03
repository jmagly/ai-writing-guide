# Schema inventory baseline

The machine-readable catalog at `schemas/catalog/catalog.json` is the authority
inventory for governed contracts. Its generated repository domain currently
accounts for 82 JSON Schema files as 75 authorities and 7 declared projections;
the control-plane schemas bring the compiled catalog to 78 authorities.
`npm run lint:schemas --
--report-json <path>` emits a deterministic report containing the inventory
mode, registered resources, IDs, dialects, compilation status, policy state,
and stable categorized diagnostics.

The inventory model records each contract's format and dialect, canonical
authority, owner, lifecycle, consumers, fixtures, generators, projections, and
compatibility policy. Intentional copies must be declared as projections;
duplicate authorities are defects. Schema-like contracts not yet represented
as JSON Schema—including YAML structural contracts, Zod/manual validators,
SQL schemas, frontmatter, and protocol grammars—remain inventory records with
their native format and validation boundary rather than being silently treated
as JSON Schema.

Until the catalog is present, the linter retains a visible legacy fallback that
scans `schemas/`. The fallback emits `SCHEMA_CATALOG_MISSING`; it exists only to
keep established domain gates operating during migration and is not evidence
of catalog completeness.

The former implicit storage-config contract is now canonical at
`schemas/storage/storage.config.v1.schema.json`; its bootstrap validator is
held to the same fixture outcomes. Contributor metadata explicitly retains its
Zod runtime authority while JSON Schema publications are parity-tested
projections. SQL and protocol contracts remain native-format authorities and
are migration candidates, not files to relabel as JSON Schema.
