# pre-cite-grade-check

Enforce GRADE-appropriate hedging language before citations are committed.

## Trigger

- Agent writes content containing `REF-` citation patterns
- Agent writes content with `@.aiwg/research/` references
- Agent writes content with research hedging language ("demonstrates", "suggests", "shows", etc.)

## Enforcement Level

**BLOCK** - Prevents HIGH-confidence language for LOW/VERY LOW evidence.
**WARN** - Flags MODERATE mismatches for review.

## Behavior

When triggered:

1. **Extract citations from content**:
   - Scan for `REF-XXX` identifiers
   - Scan for `@.aiwg/research/sources/` and `@.aiwg/research/findings/` mentions
   - Scan for DOI patterns

2. **Load GRADE assessments**:
   - For each citation, load assessment from `.aiwg/research/quality-assessments/`
   - If no assessment exists, flag as **WARN** (unassessed source)

3. **Check hedging compliance**:
   - Parse surrounding language (sentence containing citation)
   - Match hedging words against GRADE-approved vocabulary:

   | GRADE Level | Allowed Language | Forbidden Language |
   |-------------|------------------|--------------------|
   | HIGH | "demonstrates", "shows", "confirms", "establishes" | - |
   | MODERATE | "suggests", "indicates", "supports", "points to" | "demonstrates", "confirms", "proves" |
   | LOW | "limited evidence", "some data", "preliminary" | "demonstrates", "shows", "confirms", "suggests" |
   | VERY LOW | "anecdotal", "exploratory", "practitioner reports" | All higher-confidence language |

4. **Respond**:
   - HIGH language for VERY LOW/LOW source: **BLOCK** write
   - MODERATE language for VERY LOW source: **BLOCK** write
   - HIGH language for MODERATE source: **WARN** with suggestion
   - Unassessed source: **WARN** (recommend running quality-assess first)
   - Compliant: Allow silently

## Block Format

```
BLOCKED: GRADE Hedging Violation
===================================
File: docs/guide-section-3.md (line 28)

Claim: "Research demonstrates that prompt chaining improves accuracy"
Source: REF-045 (GRADE: LOW - case series)
Issue: HIGH-confidence language ("demonstrates") for LOW-quality evidence

Required fix: Change to one of:
  - "Limited evidence suggests that prompt chaining may improve accuracy"
  - "Preliminary findings indicate potential accuracy improvements from prompt chaining"

Reference: @.claude/rules/citation-policy.md (Rule 6)
===================================
```

## Warning Format

```
WARNING: GRADE Hedging Mismatch
===================================
File: docs/architecture-overview.md (line 55)

Claim: "Studies demonstrate that microservices improve scalability"
Source: REF-032 (GRADE: MODERATE - cohort study)
Issue: HIGH-confidence language ("demonstrate") for MODERATE-quality evidence

Suggested fix: "Studies suggest that microservices may improve scalability"
===================================
```

## Unassessed Warning Format

```
WARNING: Unassessed Source Cited
===================================
File: docs/testing-guide.md (line 12)

Citation: REF-078
Issue: No GRADE assessment found in .aiwg/research/quality-assessments/
Risk: Cannot verify hedging compliance without quality assessment

Action: Run `/quality-assess REF-078` before citing
===================================
```

## Configuration

```yaml
hook:
  name: pre-cite-grade-check
  type: pre-write
  enforcement:
    high_for_low: block
    high_for_very_low: block
    moderate_for_very_low: block
    high_for_moderate: warn
    unassessed_source: warn
  triggers:
    - pattern: "**/*.md"
      content_match: "(REF-\\d{3}|@\\.aiwg/research/)"
  skip_conditions:
    - path_match: ".aiwg/working/**"
    - path_match: ".aiwg/ralph/**"
    - path_match: ".aiwg/research/quality-assessments/**"
    - path_match: "**/CHANGELOG.md"
  hedging_vocabulary:
    high:
      allowed: ["demonstrates", "shows", "confirms", "establishes", "proves"]
    moderate:
      allowed: ["suggests", "indicates", "supports", "points to"]
    low:
      allowed: ["limited evidence", "some data", "preliminary findings", "early research"]
    very_low:
      allowed: ["anecdotal", "exploratory", "practitioner reports", "informal observations"]
```

## References

- @.claude/rules/citation-policy.md - Citation policy rules (Rule 6: GRADE hedging)
- @agentic/code/frameworks/sdlc-complete/agents/quality-assessor.md - Quality Assessor agent
- @agentic/code/frameworks/sdlc-complete/agents/citation-verifier.md - Citation Verifier agent
- @.aiwg/research/docs/grade-assessment-guide.md - GRADE methodology
- @agentic/code/frameworks/sdlc-complete/hooks/post-write-citation-check.md - Post-write citation hook
