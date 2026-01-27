# AIWG Provenance Tracking Guide

**Version**: 1.0.0
**Created**: 2026-01-25
**Status**: Active

## Overview

This guide explains how to create, maintain, and query W3C PROV-compliant provenance records for AIWG artifacts. Provenance tracking establishes an auditable chain of derivation, enabling reproducibility, attribution, and quality verification.

## What is Provenance?

**Provenance** is the lineage or history of an artifact - where it came from, who created it, when it was created, and what sources it was derived from.

In AIWG, provenance tracking answers critical questions:

- **Origin**: Which requirements led to this implementation?
- **Attribution**: Which agent created this artifact?
- **Derivation**: What sources was this derived from?
- **Timeline**: When was this created and by what process?
- **Quality**: Can I trace this back to validated requirements?

## W3C PROV Model

AIWG uses the W3C PROV-DM (Provenance Data Model) Entity-Activity-Agent triangle:

```
        Entity
       /      \
      /        \
 Activity ---- Agent
```

- **Entity**: An artifact (document, code, test, schema)
- **Activity**: An operation that creates/modifies entities
- **Agent**: Who/what performs activities (AI agent, human, tool)

### Core Relationships

| Relationship | Connects | Meaning |
|--------------|----------|---------|
| `wasGeneratedBy` | Entity → Activity | This artifact was created by this operation |
| `used` | Activity → Entity | This operation used these inputs |
| `wasDerivedFrom` | Entity → Entity | This artifact derives from these sources |
| `wasAssociatedWith` | Activity → Agent | This operation was performed by this agent |
| `wasAttributedTo` | Entity → Agent | This artifact is credited to this agent |

## When to Create Provenance Records

### REQUIRED (High Priority)

Provenance records MUST be created for:

1. **Requirements artifacts**
   - Use cases in `.aiwg/requirements/use-cases/`
   - User stories in `.aiwg/requirements/user-stories/`
   - NFR modules in `.aiwg/requirements/nfr-modules/`

2. **Implementation artifacts**
   - Source code in `src/`
   - Test files in `test/`
   - Configuration files

3. **SDLC artifacts**
   - Architecture documents in `.aiwg/architecture/`
   - Test plans in `.aiwg/testing/`
   - Security assessments in `.aiwg/security/`

4. **Agent definitions**
   - Agent files in `.claude/agents/`
   - Command definitions in `.claude/commands/`
   - Skills in `.claude/skills/`

5. **Research artifacts**
   - Schemas in `.aiwg/research/schemas/`
   - Quality assessments in `.aiwg/research/quality-assessments/`
   - Documentation in `.aiwg/research/docs/`

### OPTIONAL (Lower Priority)

Provenance records MAY be created for:

- Temporary working files (though these often get deleted)
- Generated outputs that are deterministically created from tracked sources
- External dependencies (track at integration point rather than per-file)

### EXEMPT

Provenance records NOT required for:

- Files in `.aiwg/working/` or `/tmp` (temporary)
- Third-party dependencies in `node_modules/`
- Build outputs (unless they are release artifacts)

## How to Create Provenance Records

### Step 1: Create the Artifact

First, create your artifact (document, code file, etc.) following normal AIWG conventions.

### Step 2: Add @-Mentions

Include @-mentions in the artifact to reference sources:

**For Markdown documents**:
```markdown
## References

- @.aiwg/requirements/use-cases/UC-104-provenance.md - Source requirement
- @.aiwg/research/provenance/schemas/prov-record.yaml - Schema specification
- @.claude/rules/mention-wiring.md - Wiring conventions
```

**For code files**:
```typescript
/**
 * @implements @.aiwg/requirements/use-cases/UC-104-provenance.md
 * @schema @.aiwg/research/provenance/schemas/prov-record.yaml
 * @tests @test/unit/provenance/tracker.test.ts
 */
```

### Step 3: Create Provenance Record

Create a YAML file in `.aiwg/research/provenance/records/` following the schema:

**Naming convention**: `<artifact-name>.prov.yaml`

**Example**: For `src/provenance/tracker.ts`, create `tracker-implementation.prov.yaml`

```yaml
metadata:
  schema_version: "1.0.0"
  created_at: "2026-01-25T19:30:00Z"
  description: "Provenance tracking implementation"

entity:
  id: "urn:aiwg:artifact:src/provenance/tracker.ts"
  type: "code"
  created_at: "2026-01-25T19:30:00Z"

activity:
  id: "urn:aiwg:activity:generation:tracker:001"
  type: "generation"
  started_at: "2026-01-25T19:29:45Z"
  ended_at: "2026-01-25T19:30:00Z"
  duration_seconds: 15
  description: "Implement ProvenanceTracker class based on UC-104 requirements"

agent:
  id: "urn:aiwg:agent:software-implementer"
  type: "aiwg_agent"
  version: "1.0.0"
  tool: "claude-sonnet-4.5"

relationships:
  wasGeneratedBy:
    entity: "urn:aiwg:artifact:src/provenance/tracker.ts"
    activity: "urn:aiwg:activity:generation:tracker:001"
    time: "2026-01-25T19:30:00Z"

  used:
    - activity: "urn:aiwg:activity:generation:tracker:001"
      entity: "urn:aiwg:artifact:.aiwg/requirements/use-cases/UC-104-provenance.md"
      role: "source_requirement"
    - activity: "urn:aiwg:activity:generation:tracker:001"
      entity: "urn:aiwg:artifact:.aiwg/research/provenance/schemas/prov-record.yaml"
      role: "schema_definition"

  wasDerivedFrom:
    - entity: "urn:aiwg:artifact:src/provenance/tracker.ts"
      source: "urn:aiwg:artifact:.aiwg/requirements/use-cases/UC-104-provenance.md"
      derivation_type: "implements"
      activity: "urn:aiwg:activity:generation:tracker:001"
    - entity: "urn:aiwg:artifact:src/provenance/tracker.ts"
      source: "urn:aiwg:artifact:.aiwg/research/provenance/schemas/prov-record.yaml"
      derivation_type: "conforms_to"

  wasAssociatedWith:
    activity: "urn:aiwg:activity:generation:tracker:001"
    agent: "urn:aiwg:agent:software-implementer"
    role: "primary_implementer"

  wasAttributedTo:
    entity: "urn:aiwg:artifact:src/provenance/tracker.ts"
    agent: "urn:aiwg:agent:software-implementer"

  actedOnBehalfOf:
    delegate: "urn:aiwg:agent:software-implementer"
    responsible: "urn:aiwg:agent:claude-sonnet-4.5"
    activity: "urn:aiwg:activity:generation:tracker:001"
```

### Step 4: Update Source Documents (Bidirectional)

If practical, add backward references from source documents to the new artifact:

**In `.aiwg/requirements/use-cases/UC-104-provenance.md`**:
```markdown
## Implementation

- @src/provenance/tracker.ts - Core implementation
- @test/unit/provenance/tracker.test.ts - Test coverage
- @.aiwg/research/provenance/records/tracker-implementation.prov.yaml - Provenance record
```

## How @-Mentions Map to wasDerivedFrom

AIWG's @-mention system directly corresponds to W3C PROV relationships:

| @-Mention Tag | PROV Relationship | Derivation Type |
|---------------|-------------------|-----------------|
| `@implements` | `wasDerivedFrom` | `implements` |
| `@architecture` | `wasDerivedFrom` | `follows_pattern` |
| `@nfr` | `wasDerivedFrom` | `conforms_to` |
| `@tests` | `wasDerivedFrom` | `tests` (reverse) |
| `@source` | `wasDerivedFrom` | `tests` |
| `@depends` | `used` | (dependency, not derivation) |

### Example Mapping

**Code header**:
```typescript
/**
 * @implements @.aiwg/requirements/use-cases/UC-104-provenance.md
 * @schema @.aiwg/research/provenance/schemas/prov-record.yaml
 * @tests @test/unit/provenance/tracker.test.ts
 */
```

**Maps to provenance record**:
```yaml
relationships:
  wasDerivedFrom:
    - entity: "urn:aiwg:artifact:src/provenance/tracker.ts"
      source: "urn:aiwg:artifact:.aiwg/requirements/use-cases/UC-104-provenance.md"
      derivation_type: "implements"
    - entity: "urn:aiwg:artifact:src/provenance/tracker.ts"
      source: "urn:aiwg:artifact:.aiwg/research/provenance/schemas/prov-record.yaml"
      derivation_type: "conforms_to"

  # Note: @tests is a forward reference, recorded in test's provenance instead
```

## How Agent Attribution Maps to wasAssociatedWith

Every activity should record which agent performed it:

### AIWG Agent Creates Artifact

```yaml
agent:
  id: "urn:aiwg:agent:software-implementer"
  type: "aiwg_agent"
  version: "1.0.0"
  tool: "claude-sonnet-4.5"

relationships:
  wasAssociatedWith:
    activity: "urn:aiwg:activity:generation:tracker:001"
    agent: "urn:aiwg:agent:software-implementer"
    role: "primary_implementer"

  actedOnBehalfOf:
    delegate: "urn:aiwg:agent:software-implementer"
    responsible: "urn:aiwg:agent:claude-sonnet-4.5"
```

**Interpretation**: The Software Implementer agent (an AIWG specialized agent) performed the generation activity, acting on behalf of the Claude Sonnet 4.5 base model.

### Human Developer Creates Artifact

```yaml
agent:
  id: "urn:aiwg:agent:human:developer@example.com"
  type: "human"
  name: "Jane Developer"

relationships:
  wasAssociatedWith:
    activity: "urn:aiwg:activity:modification:config:005"
    agent: "urn:aiwg:agent:human:developer@example.com"
    role: "manual_editor"
```

### Automated Tool Creates Artifact

```yaml
agent:
  id: "urn:aiwg:agent:tool:prettier"
  type: "automated_tool"
  version: "3.2.4"

relationships:
  wasAssociatedWith:
    activity: "urn:aiwg:activity:refactoring:codebase:012"
    agent: "urn:aiwg:agent:tool:prettier"
    role: "code_formatter"
```

## Example Provenance Chains

### Example 1: Requirement → Implementation → Test

**Chain**:
```
UC-104-provenance.md (requirement)
    ↓ implements
tracker.ts (implementation)
    ↓ tests
tracker.test.ts (test)
```

**Provenance records**:

1. **UC-104-provenance.md** (requirement)
```yaml
entity:
  id: "urn:aiwg:artifact:.aiwg/requirements/use-cases/UC-104-provenance.md"
  type: "document"
  created_at: "2026-01-25T13:42:00Z"

agent:
  id: "urn:aiwg:agent:requirements-analyst"
  type: "aiwg_agent"

relationships:
  wasDerivedFrom:
    - source: "urn:aiwg:artifact:.aiwg/research/comprehensive-implementation-opportunities.md"
      derivation_type: "derives_from"
```

2. **tracker.ts** (implementation)
```yaml
entity:
  id: "urn:aiwg:artifact:src/provenance/tracker.ts"
  type: "code"

relationships:
  wasDerivedFrom:
    - source: "urn:aiwg:artifact:.aiwg/requirements/use-cases/UC-104-provenance.md"
      derivation_type: "implements"
```

3. **tracker.test.ts** (test)
```yaml
entity:
  id: "urn:aiwg:artifact:test/unit/provenance/tracker.test.ts"
  type: "test"

relationships:
  wasDerivedFrom:
    - source: "urn:aiwg:artifact:src/provenance/tracker.ts"
      derivation_type: "tests"
    - source: "urn:aiwg:artifact:.aiwg/requirements/use-cases/UC-104-provenance.md"
      derivation_type: "implements"
```

### Example 2: Schema → Multiple Implementations

**Chain**:
```
prov-record.yaml (schema)
    ↓ conforms_to
tracker.ts (implementation 1)
validator.ts (implementation 2)
query-engine.ts (implementation 3)
```

Each implementation records:
```yaml
relationships:
  wasDerivedFrom:
    - source: "urn:aiwg:artifact:.aiwg/research/provenance/schemas/prov-record.yaml"
      derivation_type: "conforms_to"
```

### Example 3: Template → Agent Definition

**Chain**:
```
token-security.md (pattern template)
    ↓ follows_pattern
provenance-tracking.md (new rule)
```

**Provenance record**:
```yaml
entity:
  id: "urn:aiwg:artifact:.claude/rules/provenance-tracking.md"
  type: "document"

relationships:
  wasDerivedFrom:
    - source: "urn:aiwg:artifact:.claude/rules/token-security.md"
      derivation_type: "follows_pattern"
    - source: "urn:aiwg:artifact:.aiwg/requirements/use-cases/UC-104-provenance.md"
      derivation_type: "implements"
```

## Querying Provenance

### Finding All Implementations of a Requirement

**Question**: What code implements UC-104?

**Query** (manual grep):
```bash
grep -r "UC-104-provenance.md" .aiwg/research/provenance/records/ | \
  grep "derivation_type: \"implements\""
```

**Result**: List of provenance records where `wasDerivedFrom.derivation_type` is "implements"

### Finding Origin of an Artifact

**Question**: Where did `tracker.ts` come from?

**Query**:
1. Find provenance record: `.aiwg/research/provenance/records/tracker-implementation.prov.yaml`
2. Look at `wasDerivedFrom` relationships
3. Recursively follow chains to requirements

### Finding All Artifacts by Agent

**Question**: What has the Software Implementer agent created?

**Query**:
```bash
grep -r "software-implementer" .aiwg/research/provenance/records/ | \
  grep "wasAttributedTo"
```

### Timeline Reconstruction

**Question**: When was this artifact created and modified?

**Query**: Read provenance record and sort activities by `started_at` timestamp

```yaml
# Original creation
activity:
  id: "urn:aiwg:activity:generation:tracker:001"
  started_at: "2026-01-25T19:29:45Z"

# Later modification
activity:
  id: "urn:aiwg:activity:modification:tracker:002"
  started_at: "2026-01-26T10:15:00Z"
```

## Best Practices

### 1. Create Provenance Immediately

Don't defer provenance tracking. Create records when you create artifacts.

### 2. Be Specific with Derivation Types

Use specific derivation types (`implements`, `conforms_to`, `tests`) rather than generic `derives_from`.

### 3. Record ALL Sources

If an artifact derives from multiple sources, record all of them:

```yaml
wasDerivedFrom:
  - source: "urn:aiwg:artifact:.aiwg/requirements/UC-104.md"
    derivation_type: "implements"
  - source: "urn:aiwg:artifact:.aiwg/research/provenance/schemas/prov-record.yaml"
    derivation_type: "conforms_to"
  - source: "urn:aiwg:artifact:.claude/rules/mention-wiring.md"
    derivation_type: "follows_pattern"
```

### 4. Use Consistent URN Format

Always use project-relative paths in URNs:

**Good**: `urn:aiwg:artifact:src/provenance/tracker.ts`
**Bad**: `urn:aiwg:artifact:/mnt/dev-inbox/jmagly/ai-writing-guide/src/provenance/tracker.ts`

### 5. Include Timestamps in UTC

Use UTC timezone (Z suffix) for unambiguous timestamps:

**Good**: `2026-01-25T19:30:00Z`
**Acceptable**: `2026-01-25T19:30:00-05:00` (with explicit timezone)
**Bad**: `2026-01-25T19:30:00` (ambiguous timezone)

### 6. Record Agent Tool/Version

For reproducibility, record which version of tools/models were used:

```yaml
agent:
  id: "urn:aiwg:agent:software-implementer"
  type: "aiwg_agent"
  version: "1.0.0"
  tool: "claude-sonnet-4.5"  # Important for reproducibility
```

### 7. Bidirectional Links When Practical

Update source documents to point to derived artifacts:

**In UC-104-provenance.md**:
```markdown
## Implementation

- @src/provenance/tracker.ts - Core implementation
```

**In tracker.ts**:
```typescript
/**
 * @implements @.aiwg/requirements/use-cases/UC-104-provenance.md
 */
```

### 8. Validate Records Against Schema

Before committing, validate provenance records:

```bash
# Using yq or similar YAML validator
yq eval '.entity.id' tracker-implementation.prov.yaml
# Should output: urn:aiwg:artifact:src/provenance/tracker.ts
```

## Common Mistakes to Avoid

### Mistake 1: Missing Source References

**Wrong**:
```yaml
wasDerivedFrom:
  - source: "urn:aiwg:artifact:.aiwg/requirements/UC-104.md"
    derivation_type: "implements"
# Missing: schema, patterns, templates used
```

**Right**: Record ALL sources used during creation.

### Mistake 2: Circular Derivations

**Wrong**:
```yaml
# File A
wasDerivedFrom:
  - source: "urn:aiwg:artifact:B.md"

# File B
wasDerivedFrom:
  - source: "urn:aiwg:artifact:A.md"
```

**Right**: Derivation chains must be acyclic (directed acyclic graph).

### Mistake 3: Absolute Paths in URNs

**Wrong**: `urn:aiwg:artifact:/mnt/dev-inbox/jmagly/ai-writing-guide/src/tracker.ts`

**Right**: `urn:aiwg:artifact:src/tracker.ts` (project-relative)

### Mistake 4: Missing Timestamps

**Wrong**:
```yaml
activity:
  id: "urn:aiwg:activity:generation:tracker:001"
  type: "generation"
  # No started_at or ended_at
```

**Right**: Always include `started_at` and `ended_at` for activities.

### Mistake 5: Opaque Agent IDs

**Wrong**: `urn:aiwg:agent:12345`

**Right**: `urn:aiwg:agent:software-implementer` (descriptive, stable)

## Integration with AIWG Workflow

### During Artifact Creation

1. Create artifact with @-mentions
2. Create provenance record
3. Commit both together

### During Code Review

Reviewer checks:
- Does provenance record exist?
- Are all sources documented in `wasDerivedFrom`?
- Are timestamps present?
- Does @-mention wiring match provenance record?

### During Audit

Auditor verifies:
- Complete derivation chains from requirements to code
- All agents attributed
- No orphaned artifacts (artifacts without provenance)

### During Release

Release manager:
- Generates provenance summary report
- Validates provenance chain integrity
- Includes provenance metadata in release notes

## Troubleshooting

### Q: How do I handle artifacts derived from external sources?

**A**: Create a pseudo-entity for the external source:

```yaml
wasDerivedFrom:
  - source: "urn:external:w3c:prov-dm:2013"
    derivation_type: "conforms_to"
    # Note: external: prefix indicates non-AIWG source
```

### Q: What if I don't know who created an artifact?

**A**: Use a generic agent:

```yaml
agent:
  id: "urn:aiwg:agent:unknown"
  type: "human"
  name: "Unknown Author"
```

Then investigate and update when information found.

### Q: How do I record collaborative creation?

**A**: List multiple agents in `wasAssociatedWith`:

```yaml
wasAssociatedWith:
  - activity: "urn:aiwg:activity:generation:doc:001"
    agent: "urn:aiwg:agent:software-implementer"
    role: "primary_author"
  - activity: "urn:aiwg:activity:generation:doc:001"
    agent: "urn:aiwg:agent:human:reviewer@example.com"
    role: "reviewer"
```

### Q: What about auto-generated files?

**A**: Record the generator as the agent:

```yaml
agent:
  id: "urn:aiwg:agent:tool:typescript-compiler"
  type: "automated_tool"
  version: "5.3.3"
```

## Future Enhancements

Planned improvements to AIWG provenance tracking:

1. **Automated record generation** - CLI tool to generate provenance records
2. **Provenance query API** - Programmatic querying of provenance database
3. **Visualization** - Graph visualization of derivation chains
4. **Validation tool** - Automated schema validation and integrity checks
5. **Provenance summary reports** - Auto-generated reports for releases

## References

- @.claude/rules/provenance-tracking.md - Provenance tracking enforcement rules
- @.aiwg/research/provenance/schemas/prov-record.yaml - PROV record schema
- @.aiwg/research/provenance/examples/artifact-creation.yaml - Example record
- @.claude/rules/mention-wiring.md - @-mention wiring conventions
- @https://www.w3.org/TR/prov-dm/ - W3C PROV-DM specification
- @https://www.w3.org/TR/prov-primer/ - W3C PROV Primer (tutorial)

## Questions?

If you encounter issues or have questions about provenance tracking:

1. Review examples in `.aiwg/research/provenance/examples/`
2. Consult the schema at `.aiwg/research/provenance/schemas/prov-record.yaml`
3. Check the W3C PROV Primer for conceptual explanations
4. File an issue at the AIWG repository

---

**Document Status**: Active
**Last Updated**: 2026-01-25
**Maintainer**: AIWG Research Team
