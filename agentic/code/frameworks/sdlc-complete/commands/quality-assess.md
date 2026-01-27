---
description: Perform GRADE quality assessment on a research source
category: research-quality
---

# Quality Assess Command

Perform a GRADE evidence quality assessment on a research source or finding.

## Instructions

When invoked, perform systematic GRADE assessment:

1. **Load Source**
   - Accept REF-XXX identifier or file path
   - Load frontmatter metadata
   - Determine source type and baseline quality

2. **Apply GRADE Framework**
   - Evaluate 5 downgrade factors (bias, inconsistency, indirectness, imprecision, publication bias)
   - Evaluate 3 upgrade factors (large effect, dose-response, confounding)
   - Calculate final GRADE level

3. **Generate Assessment**
   - Fill assessment template per @.aiwg/research/docs/grade-assessment-guide.md
   - Include hedging language recommendations
   - Include applicability notes for AIWG context

4. **Save Assessment**
   - Save to `.aiwg/research/quality-assessments/{ref-id}-assessment.yaml`
   - Update frontmatter in source document if --update-frontmatter

5. **Report**
   - Display GRADE level with confidence statement
   - Show allowed vs forbidden hedging language
   - Flag any existing citations that violate the assessed quality level

## Arguments

- `[ref-id or file-path]` - Source to assess (required)
- `--output [yaml|markdown]` - Output format (default: yaml)
- `--update-frontmatter` - Update source document frontmatter with assessment
- `--check-citations` - Also check existing citations of this source for GRADE compliance

## References

- @.aiwg/research/docs/grade-assessment-guide.md - GRADE methodology
- @agentic/code/frameworks/sdlc-complete/agents/quality-assessor.md - Quality Assessor agent
- @.aiwg/research/schemas/quality-dimensions.yaml - Quality schema
- @.claude/rules/citation-policy.md - Hedging language rules
