---
description: Generate properly formatted citation from research corpus
category: research-quality
---

# Research Cite Command

Generate a properly formatted, policy-compliant citation from the research corpus.

## Instructions

When invoked, generate a correct citation:

1. **Locate Source**
   - Search `.aiwg/research/sources/` and `.aiwg/research/findings/` for the specified reference
   - Match by REF-XXX identifier, author name, or keyword
   - If multiple matches, present options for user selection

2. **Load Metadata**
   - Extract frontmatter: ref_id, title, authors, year, DOI, source_type
   - Load quality assessment if available
   - Determine GRADE level

3. **Generate Citation**
   - Format @-mention citation with full path
   - Include page numbers if specified
   - Apply GRADE-appropriate hedging language
   - Include quality level annotation

4. **Output Formats**
   - `inline` - Ready to paste into markdown
   - `bibtex` - BibTeX format
   - `reference` - Full reference section entry

## Arguments

- `[ref-id or keyword]` - REF-XXX identifier or search keyword (required)
- `--format [inline|bibtex|reference]` - Output format (default: inline)
- `--page [n]` - Include page reference
- `--quote "[text]"` - Include direct quote

## Example

```
/research-cite REF-020 --page 4

Output:
According to @.aiwg/research/findings/REF-020-tree-of-thoughts.md (p. 4),
Tree of Thoughts enables "deliberate decision making" through systematic
exploration of reasoning paths.

GRADE: HIGH (peer-reviewed conference, NeurIPS 2023)
Hedging: "demonstrates" / "shows" appropriate for HIGH quality evidence
```

## References

- @.claude/rules/citation-policy.md - Citation enforcement rules
- @agentic/code/frameworks/sdlc-complete/schemas/research/frontmatter-schema.yaml - Source metadata
- @.aiwg/research/docs/grade-assessment-guide.md - GRADE levels
