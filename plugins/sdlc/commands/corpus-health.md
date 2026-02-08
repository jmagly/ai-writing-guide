---
description: Report on research corpus health, completeness, and integrity
category: research-quality
---

# Corpus Health Command

Assess the health and completeness of the research corpus at `.aiwg/research/`.

## Instructions

When invoked, analyze the research corpus and report on its health:

1. **Scan Corpus Structure**
   - Count sources in `.aiwg/research/sources/`
   - Count findings in `.aiwg/research/findings/`
   - Count quality assessments in `.aiwg/research/quality-assessments/`
   - Count provenance records in `.aiwg/research/provenance/records/`

2. **Frontmatter Completeness**
   - Check each source for required frontmatter per @agentic/code/frameworks/sdlc-complete/schemas/research/frontmatter-schema.yaml
   - Report sources missing: ref_id, title, authors, year, DOI, key_findings
   - Calculate completeness percentage

3. **PDF Integrity**
   - Check `.aiwg/research/pdfs/` for downloaded papers
   - Verify SHA-256 checksums against frontmatter `pdf_hash` values
   - Report missing PDFs and checksum mismatches

4. **Cross-Reference Integrity**
   - Verify all REF-XXX in findings reference valid sources
   - Check for orphaned findings (no source reference)
   - Check for orphaned sources (never cited in any artifact)

5. **Staleness Check**
   - Flag sources with `last_verified` > 90 days old
   - Flag DOIs that haven't been re-verified
   - Report sources needing refresh

6. **Evidence Gaps**
   - Load `.aiwg/research/TODO.md` for planned research
   - Count unresolved evidence gaps
   - Report gap severity distribution

7. **Generate Health Report**
   - Summary dashboard with pass/warn/fail indicators
   - Detailed findings per category
   - Action items prioritized by severity

## Arguments

- `--brief` - Show summary only
- `--fix` - Attempt to fix frontmatter gaps and regenerate checksums
- `--report` - Save report to `.aiwg/reports/corpus-health.md`

## References

- @agentic/code/frameworks/sdlc-complete/schemas/research/frontmatter-schema.yaml - Frontmatter requirements
- @agentic/code/frameworks/sdlc-complete/schemas/research/fixity-manifest.yaml - Fixity verification
- @.claude/rules/research-metadata.md - Research metadata rules
- @agentic/code/frameworks/sdlc-complete/agents/citation-verifier.md - Citation Verifier agent
