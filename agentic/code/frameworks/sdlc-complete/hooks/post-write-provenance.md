# post-write-provenance

Auto-create or update provenance records after artifact generation or modification.

## Trigger

- Agent writes to `.aiwg/**/*.md` or `.aiwg/**/*.yaml` (artifact directories)
- Agent writes to `src/**/*.ts` or `src/**/*.js` (source code)
- Agent writes to `test/**/*.ts` or `test/**/*.js` (test files)

## Enforcement Level

**WARN** - Creates provenance record automatically; warns if record creation fails.

## Behavior

When triggered:

1. **Determine operation type**:
   - If file is new: activity type = `generation`
   - If file existed: activity type = `modification`

2. **Check for existing provenance**:
   - Look for `.aiwg/research/provenance/records/<artifact-name>.prov.yaml`
   - If exists: update with new modification activity
   - If not: create new provenance record

3. **Extract derivation sources**:
   - Parse @-mentions from written content
   - Map qualified @-mentions to derivation types
   - Use generic `derives_from` for unqualified @-mentions

4. **Generate provenance record**:
   - Entity: file path as URN with SHA-256 content hash
   - Activity: generation/modification with timestamps
   - Agent: current agent name and model
   - Relationships: wasGeneratedBy, wasAssociatedWith, wasDerivedFrom

5. **Save and validate**:
   - Write record to `.aiwg/research/provenance/records/`
   - Validate against schema
   - If validation fails: **WARN** but allow write to proceed

## Record Format

```yaml
# Auto-generated provenance record
entity:
  id: "urn:aiwg:artifact:<relative-path>"
  type: "<document|code|test|schema>"
  created_at: "<ISO-8601>"
  content_hash: "sha256:<hash>"

activity:
  id: "urn:aiwg:activity:<type>:<name>:<seq>"
  type: "<generation|modification>"
  started_at: "<ISO-8601>"
  ended_at: "<ISO-8601>"

agent:
  id: "urn:aiwg:agent:<agent-name>"
  type: "<aiwg_agent|human|automated_tool>"

relationships:
  wasGeneratedBy:
    entity: "<entity-urn>"
    activity: "<activity-urn>"
  wasAssociatedWith:
    activity: "<activity-urn>"
    agent: "<agent-urn>"
  wasDerivedFrom: []  # Populated from @-mentions
```

## Configuration

```yaml
hook:
  name: post-write-provenance
  type: post-write
  enforcement: warn
  triggers:
    - pattern: ".aiwg/**/*.md"
      exclude: ".aiwg/working/**"
    - pattern: ".aiwg/**/*.yaml"
      exclude: ".aiwg/research/provenance/records/**"
    - pattern: "src/**/*.ts"
    - pattern: "src/**/*.js"
    - pattern: "test/**/*.ts"
    - pattern: "test/**/*.js"
  skip_conditions:
    - path_match: ".aiwg/working/**"
    - path_match: ".aiwg/ralph/**"
    - path_match: ".aiwg/research/provenance/records/**"
    - path_match: "**/*.prov.yaml"
    - path_match: "node_modules/**"
    - path_match: ".git/**"
  auto_create: true
  auto_update: true
```

## References

- @agentic/code/frameworks/sdlc-complete/agents/provenance-manager.md - Provenance Manager agent
- @agentic/code/frameworks/sdlc-complete/schemas/provenance/prov-record.yaml - PROV record schema
- @.claude/rules/provenance-tracking.md - Provenance tracking rules
- @.claude/rules/mention-wiring.md - @-mention patterns for derivation
