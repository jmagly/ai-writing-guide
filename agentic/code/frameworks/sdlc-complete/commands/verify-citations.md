---
description: Verify all citations in a document against the research corpus
category: research-quality
---

# Verify Citations Command

Validate that all citations, references, and factual claims are backed by actual sources in the research corpus.

## Instructions

When invoked, perform systematic citation verification:

1. **Parse Target File**
   - Load the specified file (or all markdown files if no path given)
   - Extract all citation patterns:
     - `@.aiwg/research/sources/*` references
     - `@.aiwg/research/findings/*` references
     - `REF-XXX` inline references
     - DOI patterns (`10.XXXX/...`)
     - Author-year patterns (`Author et al., YYYY`)

2. **Verify Each Citation**
   - Check file existence for @-mention references
   - Validate REF-XXX against frontmatter in corpus
   - Verify DOI format validity
   - Check page number ranges
   - Validate quoted text against source

3. **Detect Hallucinations**
   - Flag citations to non-existent files
   - Flag fabricated DOIs
   - Flag statistics without sources
   - Flag author names not in corpus

4. **Check GRADE Compliance**
   - Load quality assessment for each cited source
   - Compare hedging language to evidence quality
   - Flag overclaiming (HIGH-confidence language for LOW evidence)

5. **Generate Report**
   - Display summary table (total, valid, issues)
   - List each issue with severity and fix suggestion
   - Provide overall PASS/FAIL verdict

6. **Auto-Fix Mode (--fix)**
   - Downgrade hedging language for GRADE violations
   - Remove citations to non-existent sources (with comment)
   - Add TODO markers for sources needing verification

## Arguments

- `[file-path]` - File to verify (default: all `.md` files in current directory)
- `--strict` - Treat warnings as errors
- `--fix` - Automatically fix GRADE violations and remove hallucinated citations
- `--report` - Save report to `.aiwg/reports/citation-verification.md`
- `--corpus-only` - Only check @-mention references, skip author-year patterns

## References

- @.claude/rules/citation-policy.md - Citation enforcement rules
- @agentic/code/frameworks/sdlc-complete/agents/citation-verifier.md - Citation Verifier agent
- @.aiwg/research/schemas/citation-audit.yaml - Audit schema
- @.aiwg/research/schemas/hallucination-detection.yaml - Detection patterns
