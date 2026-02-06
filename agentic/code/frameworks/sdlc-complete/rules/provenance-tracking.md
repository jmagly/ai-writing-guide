# Provenance Tracking Rules

**Enforcement Level**: HIGH
**Scope**: All artifact generation (documents, code, agents, commands, skills)
**Version**: 1.0.0

## Overview

These rules enforce W3C PROV-compliant provenance tracking for all AIWG artifacts. Provenance records establish an auditable chain of derivation, enabling reproducibility, attribution, and quality verification.

## W3C PROV Model

AIWG uses the Entity-Activity-Agent model from W3C PROV-DM:

- **Entity** - Artifact (document, code file, test, schema)
- **Activity** - Operation that created/modified the entity (generation, refactoring, testing)
- **Agent** - Who/what performed the activity (Claude agent, human developer, automated tool)

## Mandatory Rules

### Rule 1: Record Provenance for All Generated Artifacts

**FORBIDDEN**:
```bash
# NEVER create artifacts without provenance metadata
echo "# New Document" > new-doc.md
git add new-doc.md
git commit -m "add document"
```

**REQUIRED**:
```yaml
# Create provenance record when generating artifact
# .aiwg/research/provenance/records/new-doc.prov.yaml
entity:
  id: "urn:aiwg:artifact:.aiwg/research/provenance/docs/new-doc.md"
  type: "document"
  created_at: "2026-01-25T19:30:00Z"

activity:
  id: "urn:aiwg:activity:generation:new-doc:001"
  type: "generation"
  started_at: "2026-01-25T19:29:45Z"
  ended_at: "2026-01-25T19:30:00Z"

agent:
  id: "urn:aiwg:agent:claude-sonnet-4.5"
  type: "ai_assistant"
  version: "claude-sonnet-4-5-20250929"

relationships:
  wasGeneratedBy:
    entity: "urn:aiwg:artifact:.aiwg/research/provenance/docs/new-doc.md"
    activity: "urn:aiwg:activity:generation:new-doc:001"
```

### Rule 2: Use @-Mentions to Record wasDerivedFrom Relationships

**FORBIDDEN**:
```markdown
# Implementation Guide

This guide explains the implementation.

## Overview

The system works by...
```

**REQUIRED**:
```markdown
# Implementation Guide

This guide explains the implementation.

## References

- @.aiwg/requirements/use-cases/UC-104-provenance.md - Source requirement
- @agentic/code/frameworks/sdlc-complete/schemas/provenance/prov-record.yaml - Schema specification
- @.claude/rules/mention-wiring.md - Wiring conventions

## Overview

The system works by...
```

### Rule 3: Bidirectional Provenance Chains

When creating derived artifacts, record BOTH forward and backward references.

**FORBIDDEN**:
```typescript
// src/provenance/tracker.ts
// Implementation of provenance tracking
export class ProvenanceTracker {
  // ... code ...
}
```

**REQUIRED**:
```typescript
/**
 * Provenance tracking implementation
 *
 * @implements @.aiwg/requirements/use-cases/UC-104-provenance.md
 * @schema @agentic/code/frameworks/sdlc-complete/schemas/provenance/prov-record.yaml
 * @tests @test/unit/provenance/tracker.test.ts
 */
export class ProvenanceTracker {
  // ... code ...
}
```

AND update requirement document:

```markdown
## Use Case UC-104: Provenance Tracking

### Implementation

- @src/provenance/tracker.ts - Core implementation
- @test/unit/provenance/tracker.test.ts - Test coverage
```

### Rule 4: Record Agent Attribution

Every generated artifact MUST record which agent created it.

**FORBIDDEN**:
```yaml
# No agent attribution
entity:
  id: "urn:aiwg:artifact:some-file.md"
  type: "document"
```

**REQUIRED**:
```yaml
entity:
  id: "urn:aiwg:artifact:some-file.md"
  type: "document"
  created_at: "2026-01-25T19:30:00Z"

activity:
  id: "urn:aiwg:activity:generation:some-file:001"
  type: "generation"

agent:
  id: "urn:aiwg:agent:software-implementer"
  type: "aiwg_agent"
  version: "1.0.0"
  tool: "claude-sonnet-4.5"

relationships:
  wasAssociatedWith:
    activity: "urn:aiwg:activity:generation:some-file:001"
    agent: "urn:aiwg:agent:software-implementer"
```

### Rule 5: Timestamp All Activities

**FORBIDDEN**:
```yaml
activity:
  id: "urn:aiwg:activity:generation:doc:001"
  type: "generation"
  # Missing timestamps
```

**REQUIRED**:
```yaml
activity:
  id: "urn:aiwg:activity:generation:doc:001"
  type: "generation"
  started_at: "2026-01-25T19:29:45Z"
  ended_at: "2026-01-25T19:30:00Z"
  duration_seconds: 15
```

### Rule 6: Use URN Schema for IDs

All provenance IDs MUST follow consistent URN format.

**FORBIDDEN**:
```yaml
entity:
  id: "some-file.md"  # Ambiguous
  id: "/full/path/to/file.md"  # Machine-specific
  id: "123abc"  # Opaque
```

**REQUIRED**:
```yaml
entity:
  id: "urn:aiwg:artifact:.aiwg/research/provenance/docs/guide.md"
  # Format: urn:aiwg:artifact:<project-relative-path>

activity:
  id: "urn:aiwg:activity:generation:guide:001"
  # Format: urn:aiwg:activity:<type>:<artifact-name>:<sequence>

agent:
  id: "urn:aiwg:agent:software-implementer"
  # Format: urn:aiwg:agent:<agent-name>
```

### Rule 7: Document Derivation Chains

When an artifact is derived from multiple sources, record ALL sources.

**FORBIDDEN**:
```yaml
# Only records one source
relationships:
  wasDerivedFrom:
    - source: "urn:aiwg:artifact:.aiwg/requirements/UC-104.md"
```

**REQUIRED**:
```yaml
relationships:
  wasDerivedFrom:
    - source: "urn:aiwg:artifact:.aiwg/requirements/UC-104.md"
      derivation_type: "implements"
    - source: "urn:aiwg:artifact:agentic/code/frameworks/sdlc-complete/schemas/provenance/prov-record.yaml"
      derivation_type: "conforms_to"
    - source: "urn:aiwg:artifact:.claude/rules/mention-wiring.md"
      derivation_type: "follows_pattern"
```

## Artifact Type Requirements

### For Documents (.md, .yaml, .json)

**Required elements**:
1. References section with @-mentions
2. Creation timestamp in frontmatter (if applicable)
3. Provenance record in `.aiwg/research/provenance/records/`

**Example frontmatter**:
```yaml
---
created: 2026-01-25T19:30:00Z
created_by: urn:aiwg:agent:software-implementer
derived_from:
  - .aiwg/requirements/use-cases/UC-104-provenance.md
  - agentic/code/frameworks/sdlc-complete/schemas/provenance/prov-record.yaml
---
```

### For Code Files (.ts, .js, .py)

**Required elements**:
1. File header with @-mentions
2. Provenance record in `.aiwg/research/provenance/records/`

**Example header**:
```typescript
/**
 * @file ProvenanceTracker.ts
 * @implements @.aiwg/requirements/use-cases/UC-104-provenance.md
 * @schema @agentic/code/frameworks/sdlc-complete/schemas/provenance/prov-record.yaml
 * @tests @test/unit/provenance/tracker.test.ts
 * @created 2026-01-25T19:30:00Z
 * @agent urn:aiwg:agent:software-implementer
 */
```

### For Test Files

**Required elements**:
1. Test header with @source reference
2. Provenance record linking to implementation

**Example**:
```typescript
/**
 * @file ProvenanceTracker.test.ts
 * @source @src/provenance/tracker.ts
 * @requirement @.aiwg/requirements/use-cases/UC-104-provenance.md
 * @created 2026-01-25T19:31:00Z
 * @agent urn:aiwg:agent:test-engineer
 */
```

### For Agent Definitions

**Required elements**:
1. References section
2. Creation metadata
3. Capability derivation chain

**Example**:
```markdown
## Metadata

- **Created**: 2026-01-25T19:30:00Z
- **Agent Type**: aiwg_agent
- **Version**: 1.0.0

## References

- @.aiwg/requirements/use-cases/UC-XXX.md - Primary use case
- @.claude/rules/provenance-tracking.md - Provenance requirements
```

## Provenance Record Location

All provenance records stored in:
```
.aiwg/research/provenance/records/
```

Naming convention:
```
<artifact-name>.prov.yaml
```

Examples:
```
.aiwg/research/provenance/records/
├── provenance-guide.prov.yaml
├── prov-record-schema.prov.yaml
├── tracker-implementation.prov.yaml
└── artifact-creation-example.prov.yaml
```

## Validation Checklist

Before completing artifact generation:

- [ ] Provenance record created in `.aiwg/research/provenance/records/`
- [ ] Entity ID uses correct URN format
- [ ] Activity timestamps recorded (started_at, ended_at)
- [ ] Agent attribution included
- [ ] wasDerivedFrom relationships documented
- [ ] @-mentions in artifact content match provenance record
- [ ] Bidirectional links established (forward and backward)
- [ ] All source artifacts referenced
- [ ] Derivation types specified (implements, conforms_to, follows_pattern)

## Derivation Type Vocabulary

Use these standard derivation types:

| Type | Meaning | Example |
|------|---------|---------|
| `implements` | Code implements requirement | `src/auth.ts` implements `UC-001-auth.md` |
| `conforms_to` | Artifact follows schema | `record.yaml` conforms to `schema.yaml` |
| `follows_pattern` | Artifact uses template | `agent.md` follows `agent-template.md` |
| `extends` | Artifact extends base | `advanced-agent.md` extends `base-agent.md` |
| `tests` | Test verifies code | `auth.test.ts` tests `auth.ts` |
| `documents` | Documentation describes code | `api-doc.md` documents `api.ts` |
| `refines` | Artifact refines earlier version | `v2-spec.md` refines `v1-spec.md` |
| `derives_from` | General derivation | Generic when specific type unclear |

## Activity Type Vocabulary

Use these standard activity types:

| Type | Description | Example |
|------|-------------|---------|
| `generation` | New artifact created | First creation of document |
| `modification` | Existing artifact updated | Editing existing file |
| `refactoring` | Code restructured | Rename, reorganize |
| `testing` | Tests written/executed | Creating test file |
| `review` | Artifact reviewed | Code review, quality check |
| `merge` | Artifacts combined | Merging branches |
| `derivation` | Derived from sources | Creating from template |
| `validation` | Artifact validated | Schema validation |

## Agent Type Vocabulary

Use these standard agent types:

| Type | Description | Example |
|------|-------------|---------|
| `ai_assistant` | Base LLM (Claude, GPT) | `claude-sonnet-4.5` |
| `aiwg_agent` | AIWG specialized agent | `software-implementer` |
| `human` | Human developer | `developer@example.com` |
| `automated_tool` | Script or CLI tool | `eslint`, `prettier` |
| `ci_system` | CI/CD pipeline | `github-actions` |

## Enforcement

These rules are enforced:

1. **At artifact creation time** - Generate provenance record with artifact
2. **At code review time** - Verify provenance records exist
3. **At audit time** - Validate provenance chains are complete
4. **At release time** - Ensure all artifacts have provenance

## Exceptions

Exceptions to provenance tracking (must document reason):

1. **Temporary files** - Files in `.aiwg/working/` or `/tmp`
2. **Generated outputs** - Auto-generated from provenance-tracked sources
3. **External dependencies** - Third-party code (track at integration point)

All exceptions MUST be documented in `.aiwg/research/provenance/docs/exceptions.md`

## References

- @agentic/code/frameworks/sdlc-complete/schemas/provenance/prov-record.yaml - PROV record schema
- @.aiwg/research/provenance/docs/provenance-guide.md - Detailed guidance
- @.aiwg/research/provenance/examples/artifact-creation.yaml - Example record
- @.claude/rules/mention-wiring.md - @-mention wiring patterns
- @https://www.w3.org/TR/prov-dm/ - W3C PROV-DM specification

## Questions

If unsure about provenance tracking:

1. Consult @.aiwg/research/provenance/docs/provenance-guide.md
2. Review examples in `.aiwg/research/provenance/examples/`
3. Check W3C PROV-DM specification for standard patterns
4. Default to recording MORE provenance rather than less
5. When in doubt, ask before proceeding

---

**Rule Status**: ACTIVE
**Last Updated**: 2026-01-25
**Issue**: #104
