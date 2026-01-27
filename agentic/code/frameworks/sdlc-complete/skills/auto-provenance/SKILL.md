# Auto-Provenance

Automatically generates W3C PROV-compliant provenance records when agents create or modify artifacts.

## Triggers

- "create provenance"
- "track artifact"
- "record provenance"
- "who created this"
- "what derived from"
- "provenance chain"
- "trace artifact"
- "audit trail"

## Purpose

Ensures every artifact created by AIWG agents has a provenance record, maintaining an auditable chain of derivation from requirements through implementation. Implements the W3C PROV-DM Entity-Activity-Agent model automatically, without requiring agents to manually create records.

## Activation Conditions

This skill activates when:

1. **New artifact creation** - Agent writes a new file to `.aiwg/` or `src/` directories
2. **Artifact modification** - Agent modifies an existing tracked artifact
3. **Content with @-mentions** - Written content contains derivation @-mentions
4. **Manual trigger** - User explicitly requests provenance tracking

### Skip Conditions

- File is in `.aiwg/working/` (temporary files)
- File is in `.aiwg/ralph/` (loop state, not artifacts)
- File is in `.aiwg/research/provenance/records/` (provenance about provenance would be circular)
- File is `node_modules/`, `.git/`, or build output
- File is a provenance record itself (`.prov.yaml`)

## Behavior

When a tracked artifact is created or modified:

1. **Detect artifact event**
   - Monitor file writes in tracked directories
   - Classify as generation (new) or modification (existing)
   - Extract agent identity from context

2. **Extract derivation sources**
   - Parse @-mentions in the written content
   - Classify relationship types:
     - `@implements` -> derivation_type: implements
     - `@tests` -> derivation_type: tests
     - `@extends` -> derivation_type: extends
     - `@depends` -> derivation_type: depends
     - Generic `@path` -> derivation_type: derives_from

3. **Generate provenance record**
   - Create Entity with URN ID and content hash
   - Create Activity with type, timestamps
   - Create Agent with name, type, tool version
   - Create Relationships (wasGeneratedBy, wasAssociatedWith, wasDerivedFrom)

4. **Validate and save**
   - Validate against `@.aiwg/research/provenance/schemas/prov-record.yaml`
   - Save to `.aiwg/research/provenance/records/<artifact-name>.prov.yaml`
   - Update provenance index

5. **Report**
   - Brief confirmation: "Provenance record created for <artifact>"
   - Warning if derivation sources could not be resolved

## Agent Orchestration

- **Primary**: Provenance Manager (handles record creation and validation)
- **Passive participants**: All artifact-generating agents (Software Implementer, Test Engineer, Requirements Analyst, Architecture Designer, Technical Writer, Documentation Synthesizer, Security Auditor, API Designer)

## Integration

### With Mention Wiring

@-mentions serve as the primary source of derivation relationships:

```yaml
integration:
  mention_wiring:
    source: "@-mentions in artifact content"
    target: "wasDerivedFrom relationships in provenance record"
    mapping:
      "@implements": "implements"
      "@tests": "tests"
      "@extends": "extends"
      "@depends": "depends"
      "@source": "derives_from"
```

### With Qualified References

Qualified @-mentions provide relationship type information:

```yaml
integration:
  qualified_references:
    source: "qualified @-mentions (@implements @path)"
    target: "typed derivation relationships"
```

### With HITL Gates

Phase transitions trigger provenance completeness checks:

```yaml
integration:
  hitl_gates:
    action: validate_provenance_coverage
    trigger: phase_transition
```

## Configuration

```yaml
skill:
  name: auto-provenance
  type: passive
  always_active_for:
    - provenance-manager
    - software-implementer
    - test-engineer
    - requirements-analyst
    - architecture-designer
    - technical-writer
    - documentation-synthesizer
    - security-auditor
    - api-designer
  file_triggers:
    - pattern: ".aiwg/**/*.md"
    - pattern: ".aiwg/**/*.yaml"
    - pattern: "src/**/*.ts"
    - pattern: "src/**/*.js"
    - pattern: "test/**/*.ts"
    - pattern: "test/**/*.js"
  exclude:
    - pattern: ".aiwg/working/**"
    - pattern: ".aiwg/ralph/**"
    - pattern: ".aiwg/research/provenance/records/**"
    - pattern: "**/*.prov.yaml"
  auto_create: true
  auto_update: true
  validate_on_create: true
```

## Output Locations

- Provenance records: `.aiwg/research/provenance/records/<name>.prov.yaml`
- Provenance index: `.aiwg/research/provenance/index.yaml`
- Validation reports: `.aiwg/reports/provenance-report.md`

## References

- @agentic/code/frameworks/sdlc-complete/agents/provenance-manager.md - Provenance Manager agent
- @.aiwg/research/provenance/schemas/prov-record.yaml - PROV record schema
- @.aiwg/research/provenance/docs/provenance-guide.md - Provenance guide
- @.claude/rules/provenance-tracking.md - Provenance tracking rules
- @.claude/rules/mention-wiring.md - @-mention wiring patterns
- @.claude/rules/qualified-references.md - Qualified reference rules
