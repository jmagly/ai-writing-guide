# FlowGraph schema evolution

**flow.aiwg.io/v1alpha1** is an experimental conformance line. It is not a
stability promise, but changes within the line still follow explicit rules.

## Closed-world authoring

Every contract object uses **additionalProperties: false**, except embedded
JSON Schema fragments and string maps. Unknown authoring fields fail
validation. This catches spelling errors and prevents adapters from smuggling
provider-specific behavior into the portable graph.

Provider projections belong outside the source manifest. Adapters receive the
normalized envelope and emit provider-native configuration with a separate
adapter/version identity.

## Compatibility

- Documentation and diagnostic wording may change without a version change.
- New optional fields may be added during alpha only when old consumers can
  ignore them after schema-aware normalization.
- Required fields, field meanings, enum removals, or normalized-envelope shape
  changes require a new API version.
- A new API version receives its own schema path and generated TypeScript file.
- The old validator remains available until fixtures and adapters have migrated.

Regenerate TypeScript declarations after every schema change:

~~~bash
node agentic/code/addons/composition-engine/scripts/generate-types.mjs
~~~

Conformance tests compile the JSON Schema, validate all published fixtures, and
exercise each semantic rejection class before a change can ship.

## Stable artifact references

Node references use stable AIWG index IDs. Each reference must first occur in
the manifest's authorized **spec.candidates** set. Validation can additionally
prove those candidates against a captured index export with **--catalog**.
Renaming a human-facing artifact never silently redirects a graph; authors
discover the replacement stable ID and update the manifest deliberately.

## API group naming

The profile remains in the **flow.aiwg.io** API group and uses
**kind: FlowGraph**. It does not create **graph.flow.aiwg.io**, keeping DNS
integration within the supported label depth.
