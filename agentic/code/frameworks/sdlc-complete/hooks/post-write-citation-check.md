# post-write-citation-check

Verify citations after any document write that contains research references.

## Trigger

- Agent writes to `**/*.md` files containing `REF-` or `@.aiwg/research/` patterns
- Agent writes to `.aiwg/research/findings/`
- Agent writes to `docs/`

## Enforcement Level

**WARN** - Generates warning for GRADE violations; **BLOCK** for hallucinated citations.

## Behavior

When triggered:

1. **Scan written content for citations**:
   - Extract all `REF-XXX` references
   - Extract all `@.aiwg/research/` @-mentions
   - Extract DOI patterns
   - Extract author-year patterns

2. **Verify existence**:
   - For each reference, check file exists in corpus
   - If file exists, validate REF-XXX matches frontmatter

3. **Check GRADE hedging**:
   - Load quality assessment for each cited source
   - Verify hedging language matches evidence quality:
     - HIGH: "demonstrates", "confirms" - OK
     - MODERATE: "suggests", "indicates" - OK
     - LOW: Must use "limited evidence", "some data"
     - VERY LOW: Must use "anecdotal", "exploratory"
   - Flag overclaiming

4. **Respond**:
   - Hallucinated citation (source not in corpus): **BLOCK** write, require fix
   - GRADE violation (overclaiming): **WARN** with suggested fix
   - All valid: Allow silently

## Warning Format

```
WARNING: Citation GRADE Violation
==================================
File: docs/architecture-overview.md (line 42)

Claim: "Research demonstrates that microservices improve scalability"
Source: REF-045 (GRADE: LOW - case series without controls)
Issue: HIGH-confidence language ("demonstrates") for LOW-quality evidence

Fix: Change to "Limited evidence suggests that microservices may improve scalability"
==================================
```

## Block Format

```
BLOCKED: Hallucinated Citation
================================
File: docs/architecture-overview.md (line 67)

Citation: "Smith et al. (2024)"
Issue: No source matching "Smith et al. (2024)" exists in research corpus

Actions:
  1. Add source to .aiwg/research/sources/ if it exists
  2. Remove the citation
  3. Add to .aiwg/research/TODO.md for future research
================================
```

## Configuration

```yaml
hook:
  name: post-write-citation-check
  type: post-write
  enforcement:
    hallucination: block
    grade_violation: warn
    missing_grade: warn
  triggers:
    - pattern: "**/*.md"
      content_match: "(REF-\\d{3}|@\\.aiwg/research/)"
  skip_conditions:
    - path_match: ".aiwg/working/**"
    - path_match: ".aiwg/ralph/**"
```

## References

- @.claude/rules/citation-policy.md - Citation policy rules
- @agentic/code/frameworks/sdlc-complete/agents/citation-verifier.md - Verifier agent
- @agentic/code/frameworks/sdlc-complete/schemas/research/hallucination-detection.yaml - Detection schema
- @.aiwg/research/docs/grade-assessment-guide.md - GRADE levels
