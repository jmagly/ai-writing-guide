# Citation Policy Rules

**Enforcement Level**: CRITICAL
**Scope**: All agents, documentation, and generated content
**Version**: 1.0.0

## Overview

These rules enforce rigorous citation standards across all AIWG operations, agent definitions, and generated documentation. Violations of these rules constitute intellectual dishonesty and undermine the credibility of the entire framework.

## Mandatory Rules

### Rule 1: Never Generate Citations Without Retrieval

**FORBIDDEN**:
```markdown
# NEVER do this - invented citation
According to Smith et al. (2024), best practices include...

Research by Johnson (2023) demonstrates that...

As noted in "Software Architecture Patterns" (p. 142)...
```

**REQUIRED**:
```markdown
# Only cite after retrieving source from .aiwg/research/
According to @.aiwg/research/sources/smith-2024-best-practices.pdf (p. 15),
best practices include...

# OR acknowledge lack of citation
Best practices in this area typically include... (Note: Requires literature
review for authoritative citation)
```

### Rule 2: Never Invent DOIs, URLs, or Page Numbers

**FORBIDDEN**:
```markdown
# NEVER do this - fabricated metadata
- DOI: 10.1234/example.2024.001
- Available at: https://journal.example.com/article/123
- See page 42 for detailed analysis

Source: Conference Proceedings 2024, pp. 156-178
```

**REQUIRED**:
```markdown
# Only use exact metadata from retrieved sources
- DOI: 10.1145/3377811.3380330 (verified in @.aiwg/research/sources/paper.pdf)
- Available at: https://dl.acm.org/doi/10.1145/3377811.3380330
  (link verified 2026-01-25)
- See @.aiwg/research/sources/paper.pdf pages 4-6 for detailed analysis

# OR state uncertainty
Source location pending verification - see @.aiwg/research/TODO.md
```

### Rule 3: Never Cite Sources Not in Research Corpus

**FORBIDDEN**:
```markdown
# NEVER do this - citing sources not in .aiwg/research/
Recent studies show that microservices improve scalability [1].

[1] Martin Fowler, "Microservices Guide", martinfowler.com/microservices
```

**REQUIRED**:
```markdown
# Only cite corpus sources
Recent studies show that microservices improve scalability
[@.aiwg/research/sources/fowler-2024-microservices.pdf].

# OR use qualified claims without citation
Industry practice suggests that microservices can improve scalability,
though formal literature review is needed to support this claim.
```

### Rule 4: Always Use Exact Quotes with References

**FORBIDDEN**:
```markdown
# NEVER do this - paraphrasing without verification
The research indicates that test-driven development improves code quality
by approximately 40%.

Studies show that pair programming reduces defect rates.
```

**REQUIRED**:
```markdown
# Use exact quotes with location
The research states: "Test-driven development resulted in a 40.7% reduction
in defect density" (@.aiwg/research/sources/george-2003-tdd.pdf, p. 12).

# OR paraphrase with explicit source citation and page
Research by Williams et al. demonstrates defect rate reductions through
pair programming (@.aiwg/research/sources/williams-2000-pair.pdf, pp. 6-7),
though the magnitude varies by context.
```

### Rule 5: Always Verify Source Exists Before Citing

**FORBIDDEN**:
```markdown
# NEVER do this - citing before checking
According to the architectural analysis (@.aiwg/architecture/microservices-review.md),
the system requires...

Based on user research (@.aiwg/research/user-interviews-2024.md)...
```

**REQUIRED**:
```bash
# First verify file exists
if [ -f .aiwg/architecture/microservices-review.md ]; then
  # Then cite with confidence
  echo "According to @.aiwg/architecture/microservices-review.md..."
else
  # Acknowledge absence
  echo "Architectural analysis pending - see @.aiwg/planning/TODO.md"
fi
```

### Rule 6: Always Use Quality-Appropriate Hedging

**FORBIDDEN**:
```markdown
# NEVER do this - overconfident claims from weak evidence
Research proves that this approach is optimal.

Studies definitively show that X causes Y.

The evidence conclusively demonstrates...
```

**REQUIRED**:
```markdown
# Match claim strength to evidence quality (GRADE levels)

HIGH quality (systematic reviews, RCTs):
"Research demonstrates..." / "Evidence shows..." / "Studies confirm..."

MODERATE quality (cohort studies, case-control):
"Studies suggest..." / "Evidence indicates..." / "Research supports..."

LOW quality (case series, expert opinion):
"Some sources indicate..." / "Limited evidence suggests..." /
"Preliminary research shows..."

VERY LOW quality (anecdotal, untested):
"Exploratory work suggests..." / "Practitioner reports indicate..." /
"Anecdotal evidence suggests..."
```

### Rule 7: Always Mark Uncertainty When Source Quality Is Low

**FORBIDDEN**:
```markdown
# NEVER do this - presenting low-quality evidence as authoritative
According to industry best practices, microservices are superior to monoliths.

Research shows that daily standups improve team velocity.
```

**REQUIRED**:
```markdown
# Explicitly mark uncertainty for low-quality sources

Industry discussions suggest microservices may offer advantages over monoliths
in certain contexts, though rigorous comparative studies are limited
(@.aiwg/research/quality-notes.md - GRADE: LOW).

Practitioner reports indicate potential velocity improvements from daily
standups (@.aiwg/research/sources/blog-posts/agile-practices.md), though
controlled studies are needed to establish causation (GRADE: VERY LOW).

# OR acknowledge gaps
Claims about standup effectiveness require literature review - see
@.aiwg/research/TODO.md for planned research.
```

## Quality-Based Citation Language

### Evidence Quality Matrix

| GRADE Level | Claim Language | Context | Example |
|-------------|----------------|---------|---------|
| **HIGH** | "demonstrates", "shows", "confirms", "establishes" | Systematic reviews, meta-analyses, well-designed RCTs | "Meta-analysis demonstrates 35% defect reduction" |
| **MODERATE** | "suggests", "indicates", "supports", "points to" | Cohort studies, case-control studies, lower-quality RCTs | "Research suggests correlation between TDD and quality" |
| **LOW** | "some evidence", "limited data", "preliminary findings" | Case series, case reports, expert opinion with evidence | "Limited evidence indicates potential benefits" |
| **VERY LOW** | "anecdotal", "exploratory", "practitioner reports" | Expert opinion, anecdotes, untested claims | "Practitioner reports suggest possible improvements" |

### Usage Examples by Quality Level

**HIGH Quality Citation**:
```markdown
Systematic review by Rafique and Mišić (2015) demonstrates that test-driven
development significantly reduces defect density across multiple studies
(pooled effect size: -0.42, 95% CI: -0.58 to -0.26)
(@.aiwg/research/sources/rafique-2015-tdd-systematic.pdf, p. 234).

GRADE: HIGH - Systematic review with meta-analysis
```

**MODERATE Quality Citation**:
```markdown
Cohort study evidence suggests that pair programming correlates with reduced
defect rates (Williams et al., 2000), though the magnitude of effect varies
by team composition and task complexity
(@.aiwg/research/sources/williams-2000-pair.pdf, pp. 6-9).

GRADE: MODERATE - Single cohort study, no randomization
```

**LOW Quality Citation**:
```markdown
Case series data provide limited evidence for velocity improvements with
daily standups (n=12 teams), though selection bias and confounding variables
were not controlled (@.aiwg/research/sources/agile-case-studies-2023.pdf,
pp. 45-52).

GRADE: LOW - Case series without controls
```

**VERY LOW Quality Citation**:
```markdown
Practitioner discussions on engineering forums suggest potential benefits of
microservices for scalability, though these reports are anecdotal and lack
formal evaluation (@.aiwg/research/sources/forum-discussions-2024.md).

GRADE: VERY LOW - Anecdotal evidence only

Note: Formal literature review planned - see @.aiwg/research/TODO.md
```

## Agent Definition Requirements

When creating agent definitions that generate documentation:

### Required Elements

1. **Citation verification MUST be explicit**:
   ```markdown
   ## Citation Protocol

   Before citing any source:
   1. Verify file exists in @.aiwg/research/sources/
   2. Extract exact quote with page/section number
   3. Assess GRADE quality level
   4. Use appropriate hedging language
   5. Include full citation with @-mention

   See @.claude/rules/citation-policy.md for complete requirements.
   ```

2. **Quality assessment MUST be documented**:
   ```markdown
   ## Quality Assessment

   All citations include GRADE level:
   - HIGH: Systematic reviews, meta-analyses, RCTs
   - MODERATE: Cohort studies, case-control studies
   - LOW: Case series, expert opinion with evidence
   - VERY LOW: Anecdotal reports, untested claims

   Claims are hedged according to evidence quality.
   ```

3. **References MUST include citation policy**:
   ```markdown
   ## References

   - @.claude/rules/citation-policy.md - Citation requirements
   - @.aiwg/research/quality-assessment.md - GRADE methodology
   - @.aiwg/research/sources/ - Research corpus
   ```

## Documentation Requirements

When creating any documentation that includes claims or recommendations:

1. **MUST check research corpus first**:
   ```bash
   # Search for existing sources
   find .aiwg/research/sources -name "*keyword*"

   # If found, cite with full reference
   # If not found, either:
   # 1. Add to research TODO
   # 2. Hedge claim appropriately
   # 3. Omit unsupported claim
   ```

2. **MUST use appropriate hedging**:
   ```markdown
   # Match language to evidence quality
   HIGH: "Research demonstrates X"
   MODERATE: "Studies suggest X"
   LOW: "Limited evidence indicates X"
   VERY LOW: "Anecdotal reports suggest X"
   ```

3. **MUST provide source location**:
   ```markdown
   # Include full @-mention path
   According to @.aiwg/research/sources/author-2024-topic.pdf (p. 42)...

   # Not just author name
   # NOT: "According to Author (2024)..."
   ```

## Content Generation Requirements

When generating any content that makes factual claims:

### For Technical Documentation

```markdown
# Template for evidence-based claim

[CLAIM] (@.aiwg/research/sources/[FILE].pdf, p. [PAGE]).

GRADE: [HIGH|MODERATE|LOW|VERY LOW] - [Evidence type and limitations]

# Example:
Automated testing reduces production defects by 40-50%
(@.aiwg/research/sources/beller-2017-testing-practices.pdf, pp. 8-11).

GRADE: MODERATE - Large-scale observational study, correlation not causation
```

### For Architectural Decisions

```markdown
# Template for architecture rationale with citation

## Decision: [Architecture Choice]

### Evidence Base

**Supporting Evidence**:
- [Claim from high-quality source] (@.aiwg/research/sources/[FILE].pdf,
  pp. [PAGES]) - GRADE: HIGH
- [Claim from moderate-quality source] (@.aiwg/research/sources/[FILE].pdf,
  pp. [PAGES]) - GRADE: MODERATE

**Evidence Gaps**:
- [Claim requiring literature review] - See @.aiwg/research/TODO.md

### Rationale

Based on [HIGH/MODERATE/LOW] quality evidence, this decision is
[strongly supported/provisionally supported/exploratory]...
```

### For Requirements Documentation

```markdown
# Template for requirement justification

## Requirement: [REQ-ID]

### Justification

[Industry practice/Research/Stakeholder needs] [demonstrates/suggests/indicates]
that [requirement rationale].

**Evidence**:
- [@.aiwg/research/sources/[FILE].pdf, pp. [PAGES]] - GRADE: [LEVEL]
- [@.aiwg/requirements/stakeholder-interviews/[FILE].md] - Primary source

**Confidence**: [HIGH|MODERATE|LOW] based on evidence quality and stakeholder
validation.
```

## Validation Checklist

Before completing any content generation that includes citations:

- [ ] All citations reference files in `.aiwg/research/sources/`
- [ ] All cited files verified to exist using file system check
- [ ] All quotes are exact with page/section numbers included
- [ ] GRADE quality level assessed and documented for each citation
- [ ] Claim language matches evidence quality (no overclaiming)
- [ ] Uncertainty explicitly marked for LOW/VERY LOW quality sources
- [ ] No invented DOIs, URLs, ISBNs, or page numbers
- [ ] @-mention paths provided for all internal references
- [ ] Research gaps documented in `@.aiwg/research/TODO.md`
- [ ] Citation policy referenced in agent definitions

## Remediation

If you identify citation policy violations:

1. **Immediate**: Remove or hedge any unsupported claims
2. **Immediate**: Delete any fabricated citations (DOIs, URLs, page numbers)
3. **Immediate**: Add disclaimers to content with uncertain sourcing
4. **Prompt**: Search `.aiwg/research/sources/` for supporting evidence
5. **Prompt**: Rewrite claims to match available evidence quality
6. **Prompt**: Document research gaps in `@.aiwg/research/TODO.md`
7. **Follow-up**: Audit entire codebase for similar violations
8. **Follow-up**: Add research tasks to backlog for unsupported claims

### Remediation Example

**BEFORE (Violation)**:
```markdown
Research proves that microservices improve scalability by 60% (Johnson, 2023).
```

**AFTER (Remediated)**:
```markdown
Industry reports suggest microservices may improve scalability, though rigorous
comparative studies are limited.

Evidence gap documented in @.aiwg/research/TODO.md - planned literature review
on microservices scalability claims (GRADE: VERY LOW - anecdotal only).
```

## Enforcement

These rules are enforced:

1. **At content generation time** - All claims must follow citation protocol
2. **At agent creation time** - All new agents must include citation requirements
3. **At documentation time** - All docs must cite sources from research corpus
4. **At review time** - Pull requests checked for citation violations
5. **At audit time** - Periodic citation audits across all content

## Exceptions

There are NO exceptions to these rules for factual claims requiring evidence. The only acceptable cases for uncited claims are:

1. **Obvious truths** - "TypeScript is a typed superset of JavaScript"
2. **Project-specific facts** - "This repository uses CalVer versioning"
3. **Explicit opinions** - "We prefer X over Y because..." (marked as opinion)

All other factual claims require either:
- Citation from research corpus, OR
- Explicit acknowledgment of evidence gap, OR
- Removal of the claim

## References

- @.aiwg/research/quality-assessment.md - GRADE methodology for evidence quality
- @.aiwg/research/sources/ - Research corpus directory
- @.aiwg/research/TODO.md - Research gaps and planned literature reviews
- @agentic/code/addons/voice-framework/docs/authenticity-markers.md - Balancing authority with honesty

## Questions

If unsure about citation requirements:

1. Check if source exists in `@.aiwg/research/sources/`
2. Assess GRADE quality level of available evidence
3. Match claim language to evidence quality (Table in Rule 6)
4. If no source available, document gap in `@.aiwg/research/TODO.md`
5. Default to explicit uncertainty over unsupported confidence
6. When in doubt, hedge more conservatively

---

**Rule Status**: ACTIVE
**Last Updated**: 2026-01-25
**Issue**: #100
