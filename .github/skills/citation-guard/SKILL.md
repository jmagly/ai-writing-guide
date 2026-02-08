# citation-guard

Automatically verify citations when agents generate content that makes factual claims or references research.

## Triggers

- "cite"
- "reference"
- "according to"
- "research shows"
- "studies demonstrate"
- Agent writes to `.aiwg/research/`
- Agent writes to `docs/`
- Agent generates content with REF-XXX references

## Purpose

This skill acts as a passive citation guard, activating whenever agents generate content that includes citations or factual claims requiring evidence. It prevents citation hallucination by verifying references exist before they are written.

## Behavior

When triggered, this skill:

1. **Intercept citation generation**:
   - Detect when an agent is about to write content with citations
   - Extract all REF-XXX, DOI, and @-mention references

2. **Verify against corpus**:
   - Check each reference exists in `.aiwg/research/sources/` or `.aiwg/research/findings/`
   - Validate REF-XXX identifiers match frontmatter
   - Flag any references not in corpus

3. **Check GRADE compliance**:
   - Load quality assessment for cited sources
   - Verify hedging language matches evidence quality level
   - Suggest language corrections if overclaiming detected

4. **Allow or warn**:
   - All citations valid: Proceed silently
   - GRADE violation: WARN with suggested language fix
   - Hallucinated citation: BLOCK with specific error

5. **Track gaps**:
   - Log uncitable claims to `.aiwg/research/TODO.md`
   - Track frequently needed but missing sources

## Activation Conditions

```yaml
activation:
  always_active_for:
    - technical-writer
    - documentation-synthesizer
    - requirements-analyst
    - architecture-designer
    - domain-expert
    - technical-researcher

  triggers_on_content:
    - pattern: "REF-\\d{3}"
    - pattern: "@\\.aiwg/research/"
    - pattern: "according to"
    - pattern: "research (shows|demonstrates|suggests|indicates)"
    - pattern: "\\(\\w+ et al\\., \\d{4}\\)"
```

## Integration

This skill uses:
- `project-awareness`: Load project's research corpus path
- Citation Verifier agent for deep verification when needed

## References

- @.claude/rules/citation-policy.md - Citation policy rules
- @agentic/code/frameworks/sdlc-complete/agents/citation-verifier.md - Citation Verifier agent
- @agentic/code/frameworks/sdlc-complete/schemas/research/hallucination-detection.yaml - Detection patterns
- @.aiwg/research/docs/grade-assessment-guide.md - GRADE methodology
