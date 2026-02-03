---
description: Format citations and generate bibliographies
category: research-citation
argument-hint: "[REF-XXX] [--format inline|bibtex|reference] [--page n]"
---

# Research Cite Command

Generate properly formatted, policy-compliant citations from the research corpus.

## Instructions

When invoked, generate correct citations:

1. **Locate Source**
   - Search `.aiwg/research/sources/` and `.aiwg/research/findings/` for specified reference
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
   - `inline` - Ready to paste into markdown with GRADE-appropriate language
   - `bibtex` - BibTeX format for reference management
   - `reference` - Full reference section entry
   - `apa` - APA 7th edition format
   - `chicago` - Chicago Manual of Style format

## Arguments

- `[ref-id or keyword]` - REF-XXX identifier or search keyword (required)
- `--format [inline|bibtex|reference|apa|chicago]` - Output format (default: inline)
- `--page [n]` - Include page reference
- `--quote "[text]"` - Include direct quote with citation
- `--hedging [suggest|none]` - Include hedging language suggestions (default: suggest)

## Examples

```bash
# Basic inline citation
/research-cite REF-022

# Citation with page reference
/research-cite REF-022 --page 4

# Citation with quote
/research-cite REF-022 --page 4 --quote "deliberate decision making"

# BibTeX format for bibliography
/research-cite REF-022 --format bibtex

# Search by keyword
/research-cite "autogen multi-agent" --format inline

# Multiple citations for bibliography
/research-cite REF-022 REF-001 REF-013 --format reference
```

## Expected Output

### Inline Format (Default)

```
/research-cite REF-022 --page 4

Output:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Citation (inline format):

  According to @.aiwg/research/findings/REF-022-autogen.md (p. 4),
  AutoGen enables "flexible conversation patterns" through multi-agent
  collaboration.

GRADE Assessment: MODERATE
  Source: arXiv preprint (peer-reviewed conference version available)
  Quality: Moderate (single study, not systematic review)

Recommended Hedging Language:
  ✓ APPROPRIATE: "Research suggests...", "Evidence indicates..."
  ✗ TOO STRONG: "Research proves...", "Evidence demonstrates..."
  ✗ TOO WEAK: "Some sources claim...", "Anecdotal reports suggest..."

Usage Example:
  Multi-agent conversation patterns suggest flexible agent orchestration
  is feasible for complex workflows (@.aiwg/research/findings/REF-022-autogen.md,
  p. 4), though scalability limits require further investigation (GRADE: MODERATE).
```

### BibTeX Format

```
/research-cite REF-022 --format bibtex

Output:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

@article{wu2023autogen,
  title={AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation},
  author={Wu, Qingyun and Bansal, Gagan and Zhang, Jieyu and Wu, Yiran and Zhang, Shaokun and Zhu, Erkang and Li, Beibin and Jiang, Li and Zhang, Xiaoyun and Wang, Chi},
  journal={arXiv preprint arXiv:2308.08155},
  year={2023},
  doi={10.48550/arXiv.2308.08155},
  note={GRADE: MODERATE - arXiv preprint}
}
```

### Reference Format

```
/research-cite REF-022 --format reference

Output:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Wu, Q., Bansal, G., Zhang, J., Wu, Y., Zhang, S., Zhu, E., Li, B.,
Jiang, L., Zhang, X., & Wang, C. (2023). AutoGen: Enabling Next-Gen
LLM Applications via Multi-Agent Conversation. *arXiv preprint*
arXiv:2308.08155. https://doi.org/10.48550/arXiv.2308.08155

GRADE: MODERATE
Internal Reference: @.aiwg/research/findings/REF-022-autogen.md
PDF: @.aiwg/research/sources/REF-022.pdf
```

## GRADE-Based Hedging

Citations automatically include hedging guidance based on evidence quality:

| GRADE Level | Appropriate Language | Avoid |
|-------------|---------------------|-------|
| **HIGH** | "demonstrates", "shows", "confirms" | Uncertainty language |
| **MODERATE** | "suggests", "indicates", "supports" | Definitive claims |
| **LOW** | "limited evidence", "preliminary findings" | Strong claims |
| **VERY LOW** | "anecdotal", "exploratory", "reports suggest" | Confident claims |

## Batch Citation

Generate bibliography for multiple sources:

```bash
/research-cite REF-001 REF-013 REF-022 REF-057 --format reference

Output:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## References

Feng, Y., et al. (2024). The Landscape of Emerging AI Agent Architectures...
  GRADE: MODERATE - @.aiwg/research/findings/REF-001-production-agentic.md

Hong, S., et al. (2023). MetaGPT: Meta Programming for Multi-Agent Systems...
  GRADE: HIGH - @.aiwg/research/findings/REF-013-metagpt.md

Wu, Q., et al. (2023). AutoGen: Enabling Next-Gen LLM Applications...
  GRADE: MODERATE - @.aiwg/research/findings/REF-022-autogen.md

Schmidgall, S., et al. (2024). Agent Laboratory: Using LLM Agents...
  GRADE: HIGH - @.aiwg/research/findings/REF-057-agent-laboratory.md
```

## Citation Validation

All citations are validated against:

- [ ] Source exists in `.aiwg/research/`
- [ ] Metadata is complete (title, authors, year)
- [ ] DOI/identifier is valid
- [ ] GRADE level is assessed
- [ ] Hedging language matches quality level
- [ ] Page references are within paper bounds (if PDF available)
- [ ] Quotes are exact (if --quote provided)

## Integration with Writing

When writing documentation:

1. Use `/research-cite REF-XXX` to get citation
2. Copy inline format into document
3. Use suggested hedging language
4. Add @-mention for traceability
5. Include GRADE level in internal notes

## References

- @agentic/code/frameworks/research-complete/agents/citation-agent.md - Citation Agent
- @src/research/services/citation-service.ts - Citation formatting
- @.claude/rules/citation-policy.md - Citation policy requirements
- @agentic/code/frameworks/sdlc-complete/schemas/research/frontmatter-schema.yaml - Source metadata
- @.aiwg/research/docs/grade-assessment-guide.md - GRADE levels
