# Provenance Tracking Exceptions

Approved exceptions to the provenance tracking rules defined in `@.claude/rules/provenance-tracking.md`.

## Exception Categories

### 1. Temporary Files

**Scope**: Files in `.aiwg/working/` or system temp directories (`/tmp`)

**Rationale**: Temporary files are ephemeral by nature and do not contribute to the artifact record. Tracking their provenance adds overhead without value.

**Conditions**:
- File resides in `.aiwg/working/` or `/tmp`
- File is not promoted to a permanent location
- If promoted, provenance tracking begins at promotion time

### 2. Generated Outputs from Tracked Sources

**Scope**: Auto-generated files derived from provenance-tracked sources (e.g., compiled output, rendered HTML, transpiled code)

**Rationale**: The provenance chain is established through the source artifact. Generated outputs inherit provenance from their source.

**Conditions**:
- Source artifact has a valid provenance record
- Generation process is deterministic and documented
- Build/generation tool is identified in source provenance
- Re-generation from source produces equivalent output

**Examples**:
- `dist/` directory contents (generated from `src/`)
- `INDEX.md` files (auto-generated from frontmatter)
- Compiled `.js` from `.ts` sources

### 3. External Dependencies

**Scope**: Third-party code, libraries, and packages not authored within the project

**Rationale**: External dependencies have their own versioning and provenance systems. AIWG tracks provenance at the integration point, not within the dependency itself.

**Conditions**:
- Dependency is managed by a package manager (npm, pip, etc.)
- Version is pinned in lockfile or manifest
- Integration point (import/require) is tracked in consuming artifact's provenance
- Security audit status is tracked separately (if applicable)

**Examples**:
- `node_modules/` contents
- Python `venv/` packages
- System libraries

## Exception Registration

When claiming an exception, document it in the artifact's provenance context:

```yaml
provenance_exception:
  category: temporary_file | generated_output | external_dependency
  artifact: "path/to/file"
  reason: "Brief justification"
  conditions_met:
    - "condition 1 satisfied"
    - "condition 2 satisfied"
  registered_by: "agent or human identifier"
  registered_at: "ISO-8601 timestamp"
```

## Non-Exceptions

The following are **NOT valid exceptions** and MUST have provenance records:

| Item | Why Not Exempt |
|------|---------------|
| Configuration files | Affect system behavior, need audit trail |
| Schema files | Define data contracts, critical for reproducibility |
| Agent definitions | Define system capabilities, must be traceable |
| Test files | Verify correctness, need source linkage |
| Documentation | Knowledge artifacts, need derivation chains |
| Scripts/tools | Affect build process, need attribution |

## Audit

Exceptions are audited:
- **Monthly**: Verify all claimed exceptions still meet conditions
- **On promotion**: When temporary files become permanent, add provenance
- **On incident**: Review exception claims during post-mortems

## References

- @.claude/rules/provenance-tracking.md - Base provenance rules
- @.aiwg/research/provenance/schemas/prov-record.yaml - Record schema
- @.aiwg/research/provenance/docs/provenance-guide.md - Implementation guide
