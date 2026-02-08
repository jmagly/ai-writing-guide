# tot-exploration

Automatically trigger Tree of Thoughts exploration when agents face architectural decisions with multiple valid approaches.

## Triggers

- "evaluate architecture options"
- "compare approaches"
- "which pattern should we use"
- "explore alternatives"
- "architecture decision"
- "ADR for"
- "trade-off between"
- "should we use X or Y"

## Purpose

This skill activates the ToT exploration protocol when an agent encounters a decision point with multiple valid architectural approaches. It ensures systematic evaluation rather than defaulting to the first viable option.

## Behavior

When triggered, this skill:

1. **Detects decision context**:
   - Parse the decision question from conversation
   - Check if multiple valid approaches exist
   - Verify this is an architectural/technical decision (not stylistic)

2. **Loads ToT protocol**:
   - Load @agentic/code/frameworks/sdlc-complete/schemas/flows/tree-of-thought.yaml schema
   - Load @.aiwg/flows/docs/tot-architecture-guide.md guidance
   - Load @agentic/code/frameworks/sdlc-complete/agents/enhancements/architecture-designer-tot-protocol.md protocol

3. **Generates alternatives**:
   - Produce k=3 meaningfully distinct alternatives (default)
   - Each alternative addresses the same problem differently
   - No trivial variations (must differ in approach, not just parameters)

4. **Evaluates with scoring matrix**:
   - Extract criteria from project NFRs if available
   - Apply weighted scoring (1-5 per criterion)
   - Calculate composite scores

5. **Produces recommendation**:
   - Clear winner (gap > 0.5): Recommend with HIGH confidence
   - Close call (gap 0.2-0.5): Recommend with MODERATE confidence, note trade-offs
   - Tie (gap < 0.2): Present both options, request human decision

6. **Generates ADR if approved**:
   - Use @agentic/code/frameworks/sdlc-complete/templates/architecture/adr-with-tot.md template
   - Save to `.aiwg/architecture/`
   - Include backtracking triggers

## Activation Conditions

```yaml
activation:
  conditions:
    - decision_type: [architectural, technical, infrastructure]
    - alternatives_count: ">= 2"
    - impact_level: [high, critical]

  skip_when:
    - decision_already_documented: true
    - user_explicitly_chose: true
    - trivial_decision: true
```

## Integration

This skill uses:
- `decision-support`: Underlying decision matrix infrastructure
- `artifact-orchestration`: For multi-agent evaluation when needed
- `project-awareness`: Context for NFR-based criteria

## Agent Orchestration

```yaml
agents:
  primary:
    agent: architecture-designer
    focus: Generate and evaluate alternatives

  reviewers:
    - agent: security-architect
      focus: Security implications of each alternative
      condition: security_relevant == true
    - agent: performance-engineer
      focus: Performance trade-offs
      condition: performance_critical == true
    - agent: cloud-architect
      focus: Infrastructure implications
      condition: cloud_deployment == true
```

## Output Locations

- ADRs: `.aiwg/architecture/adr-*.md`
- Decision matrices: `.aiwg/decisions/`
- ToT exploration logs: `.aiwg/working/tot-explorations/`

## References

- @agentic/code/frameworks/sdlc-complete/schemas/flows/tree-of-thought.yaml - ToT workflow schema
- @.aiwg/flows/docs/tot-architecture-guide.md - Architecture guide
- @agentic/code/frameworks/sdlc-complete/agents/enhancements/architecture-designer-tot-protocol.md - Agent protocol
- @agentic/code/frameworks/sdlc-complete/templates/architecture/adr-with-tot.md - ADR template
- @agentic/code/frameworks/sdlc-complete/skills/decision-support/SKILL.md - Decision support skill
- @.aiwg/research/findings/REF-020-tree-of-thoughts.md - Research foundation
