---
namespace: aiwg
name: provenance-create
platforms: [all]
description: Create a W3C PROV-compliant provenance record for an artifact
commandHint:
  category: provenance
---

# Provenance Create Command

Create a provenance record for a new or existing artifact, establishing its Entity-Activity-Agent chain.

## Instructions

When invoked, create provenance record:

1. **Read artifact**
   - Load file at specified path
   - Compute SHA-256 content hash
   - Extract @-mentions for derivation sources

2. **Determine metadata**
   - Activity type: generation (new) or modification (existing)
   - Agent: from `--agent` flag or infer from context
   - Derivation sources: from @-mentions or `--derived-from` flags

3. **Generate URN identifiers**
   - Entity: `urn:aiwg:artifact:<relative-path>`
   - Activity: `urn:aiwg:activity:<type>:<name>:<sequence>`
   - Agent: `urn:aiwg:agent:<agent-name>`

4. **Create provenance record**
   - Generate YAML conforming to `@$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/schemas/provenance/prov-record.yaml`
   - Include entity, activity, agent, and relationships
   - Include timestamps and content hash

5. **Validate record**
   - Verify schema compliance
   - Check all referenced entities exist
   - Verify derivation sources are valid paths

6. **Save record**
   - Write to `.aiwg/research/provenance/records/<artifact-name>.prov.yaml`
   - Update provenance index if it exists

7. **Report**
   - Display created record summary
   - Show derivation chain

## Arguments

- `[artifact-path]` - Path to artifact (required)
- `--derived-from [paths...]` - Explicit derivation sources
- `--activity [type]` - Activity type: generation, modification, refactoring, testing, review, derivation (default: generation)
- `--agent [name]` - Agent that created the artifact (default: inferred)
- `--output [path]` - Custom output path for provenance record
- `--no-validate` - Skip schema validation

## References

- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/agents/provenance-manager.md - Provenance Manager agent
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/schemas/provenance/prov-record.yaml - PROV record schema
- @.aiwg/research/provenance/docs/provenance-guide.md - Provenance guide
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/rules/provenance-tracking.md - Provenance tracking rules

## Storage Routing (#934, #968)

This skill's persistence flows through `resolveStorage('provenance')`. On the default `fs` backend provenance records live at `.aiwg/provenance/`. To redirect into Obsidian, Logseq, Fortemi, or another backend, configure `roots.provenance` or `backends.provenance` in `.aiwg/storage.config` (#934).

```bash
aiwg provenance path                                # resolved root
aiwg provenance list --prefix activities/
aiwg provenance get activities/2026-04-28-deploy.json
echo '{"@context":"...","activity":"..."}' | aiwg provenance put activities/x.json
```
