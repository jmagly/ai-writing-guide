# Schema Control Plane

Status: Accepted
Issues: #2223–#2233

## Decision

AIWG treats schemas as first-class governed artifacts. A schema is not merely a
file: it has a stable logical name and URI, version, format/dialect, lifecycle,
owner, one canonical authority, consumers, dependencies, effective policy,
fixtures, compatibility baseline, and explicitly declared projections.

The root catalog is `schemas/catalog/catalog.json`. It composes domain manifests
validated by the schemas in `schemas/catalog/`. `aiwg schema` and the exported
`src/schema` API are the supported discovery and runtime surfaces. Canonical
public JSON Schema identifiers use the `https://aiwg.io/schemas/` namespace.

## Authority and projections

Every contract has exactly one authority. Copies, generated validators, types,
bundles, and documentation are projections and must point back to that authority.
Projection drift is an error. Existing duplicate `$id` files are retained only
when the catalog declares the secondary file as a projection.

Runtime-native contracts may remain authoritative while JSON Schema is a
projection during migration. Their shared fixture suites must prove behavioral
parity. Storage configuration uses JSON Schema as its published authority with a
bootstrap validator guarded by parity tests; contributor metadata retains Zod as
runtime authority and tests its JSON Schema projections against identical cases.

## Lifecycle and compatibility

Lifecycle is `experimental → proposed → active → deprecated → retired`.
Published stable artifacts default to backward compatibility. A breaking change
requires a new version and explicit migration/deprecation metadata. Compatibility
automation is conservative: `unknown` requires review and is never treated as a
pass. Baselines can be evaluated as a chain to expose transitive migration risk.

## Policy resolution

Policy resolves repository → domain → artifact; the most specific value wins and
provenance is retained. Exceptions require a rule, rationale, owner, approval,
and expiry. CI rejects expired exceptions, undeclared schemas/projections,
unresolved offline references, digest drift, and strict-compilation failures.

## Security boundary

Schema validation never fetches network references. Dependency references must
resolve from the catalog or an approved digest lock. Runtime validation enforces
input byte/depth bounds and emits stable machine-readable diagnostics. See
`docs/security/schema-execution-threat-model.md` for the complete threat model.

## Consequences

The catalog becomes the inventory and discovery plane, while domain manifests
keep ownership distributed. Catalog generation is deterministic, reviewed, and
checked by CI. Legacy validators are migrated incrementally with parity evidence;
no silent authority switch is permitted.
