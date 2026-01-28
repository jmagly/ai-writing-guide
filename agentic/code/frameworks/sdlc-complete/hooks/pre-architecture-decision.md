# pre-architecture-decision

Enforce Tree of Thoughts exploration before committing to architectural decisions.

## Trigger

- Agent writes to `.aiwg/architecture/adr-*.md`
- Agent creates architectural decision record
- Agent modifies system architecture document

## Enforcement Level

**WARN** - Generates warning if no ToT exploration evidence exists for the decision.

## Behavior

When triggered:

1. **Check for ToT evidence**:
   - Verify that a scoring matrix exists for this decision
   - Check if >= 2 alternatives were evaluated
   - Look for weighted criteria documentation

2. **If ToT evidence found**:
   - Validate scoring completeness (all criteria scored for all alternatives)
   - Verify backtracking triggers are defined
   - Allow the write to proceed

3. **If NO ToT evidence found**:
   - Issue WARNING: "Architecture decision lacks ToT exploration"
   - Suggest running `/tot-decide` before finalizing
   - Allow write to proceed (WARN, not BLOCK)
   - Log the skip for audit trail

4. **Exceptions**:
   - Trivial decisions (configuration changes, version bumps)
   - Decisions explicitly marked `tot_skip: true` with documented reason
   - Emergency hotfix decisions (must be reviewed within 48 hours)

## Warning Format

```
WARNING: Architecture Decision Without ToT Exploration
=========================================================
File: .aiwg/architecture/adr-xxx.md

No Tree of Thoughts exploration found for this decision.
ToT exploration improves decision quality by evaluating
k=3+ alternatives with weighted scoring.

Suggestions:
  1. Run: /tot-decide "[decision context]"
  2. Or add to ADR: `tot_skip: true` with reason

Learn more: @.aiwg/flows/docs/tot-architecture-guide.md
=========================================================
```

## Configuration

```yaml
hook:
  name: pre-architecture-decision
  type: pre-write
  enforcement: warn
  triggers:
    - pattern: ".aiwg/architecture/adr-*.md"
    - pattern: ".aiwg/architecture/sad.md"
  skip_conditions:
    - file_contains: "tot_skip: true"
    - file_contains: "## Alternatives Evaluated"
    - emergency_flag: true
```

## References

- @agentic/code/frameworks/sdlc-complete/schemas/flows/tree-of-thought.yaml - ToT schema
- @.aiwg/flows/docs/tot-architecture-guide.md - Guide
- @agentic/code/frameworks/sdlc-complete/commands/tot-decide.md - ToT command
- @agentic/code/frameworks/sdlc-complete/skills/tot-exploration/SKILL.md - ToT skill
- @.aiwg/research/findings/REF-020-tree-of-thoughts.md - Research foundation
