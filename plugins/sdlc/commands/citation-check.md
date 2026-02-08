---
description: Check a file for citation quality and GRADE compliance
category: research-quality
---

# Citation Check Command

Quick check of a single file for citation validity and GRADE-appropriate hedging.

## Instructions

When invoked, perform quick citation check:

1. **Parse File**
   - Extract all citations (REF-XXX, @-mentions, author-year)
   - Map each citation to its GRADE level (from quality assessments)

2. **Check Hedging Compliance**
   - For each citation, verify the surrounding language matches GRADE level:
     - HIGH: "demonstrates", "shows", "confirms" - OK
     - MODERATE: "suggests", "indicates" - OK
     - LOW: Must use "limited evidence", "some data"
     - VERY LOW: Must use "anecdotal", "exploratory"

3. **Report**
   - List each citation with its GRADE level
   - Flag violations (overclaiming)
   - Suggest fixes for violations

4. **Auto-Fix (--fix)**
   - Replace overclaiming language with GRADE-appropriate hedging
   - Preserve meaning while adjusting confidence level

## Arguments

- `[file-path]` - File to check (required)
- `--fix` - Automatically fix hedging violations
- `--strict` - Treat all GRADE violations as errors

## References

- @.claude/rules/citation-policy.md - Citation policy
- @.aiwg/research/docs/grade-assessment-guide.md - GRADE guide
- @agentic/code/frameworks/sdlc-complete/agents/citation-verifier.md - Verifier agent
