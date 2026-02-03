---
description: Download research papers and extract metadata
category: research-acquisition
argument-hint: "[DOI or arXiv ID] [--output path] [--extract-text]"
---

# Research Acquire Command

Download research papers from public repositories and extract metadata.

## Instructions

When invoked, perform automated paper acquisition:

1. **Identify Source**
   - Parse DOI, arXiv ID, or URL
   - Determine paper hosting location
   - Check if paper already exists in `.aiwg/research/sources/`

2. **Download Paper**
   - Attempt direct PDF download from source
   - Try fallback sources (arXiv mirror, Unpaywall, PMC)
   - Save to `.aiwg/research/sources/[ref-id].pdf`
   - Verify download integrity (file size, PDF structure)

3. **Extract Metadata**
   - Parse PDF metadata (title, authors, year)
   - Query CrossRef/Semantic Scholar for enhanced metadata
   - Extract abstract, keywords, citation count
   - Determine source type (journal, conference, preprint)

4. **Generate Frontmatter**
   - Create YAML frontmatter per @agentic/code/frameworks/sdlc-complete/schemas/research/frontmatter-schema.yaml
   - Assign REF-XXX identifier
   - Calculate PDF checksum (SHA-256)
   - Set initial GRADE baseline from source type

5. **Create Finding Document**
   - Generate `.aiwg/research/findings/REF-XXX-[slug].md` from template
   - Populate frontmatter with extracted metadata
   - Add placeholder sections for key findings
   - Update fixity manifest

6. **Post-Acquisition**
   - Log acquisition in `.aiwg/research/acquisition-log.yaml`
   - Update corpus index
   - Suggest next steps (quality assessment, documentation)

## Arguments

- `[identifier]` - DOI, arXiv ID, or URL (required)
- `--output [path]` - Custom output location (default: auto-generate)
- `--ref-id [REF-XXX]` - Specific REF-XXX identifier (default: auto-assign)
- `--extract-text` - Extract full text to `.txt` file for analysis
- `--no-metadata` - Skip metadata enrichment
- `--force` - Re-download even if paper exists

## Examples

```bash
# Acquire by DOI
/research-acquire 10.48550/arXiv.2308.08155

# Acquire by arXiv ID
/research-acquire arXiv:2308.08155

# Acquire with custom identifier
/research-acquire https://arxiv.org/pdf/2308.08155.pdf --ref-id REF-022

# Acquire with full text extraction
/research-acquire 10.1145/3377811.3380330 --extract-text
```

## Expected Output

```
Acquiring Paper: 10.48550/arXiv.2308.08155
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Step 1: Resolving identifier
  ✓ DOI resolved to arXiv:2308.08155
  ✓ Paper not found in corpus

Step 2: Downloading PDF
  ✓ Downloaded from arxiv.org (2.4 MB)
  ✓ Saved to .aiwg/research/sources/REF-022.pdf
  ✓ Checksum: a1b2c3d4e5f6...

Step 3: Extracting metadata
  ✓ Title: AutoGen: Enabling Next-Gen LLM Applications...
  ✓ Authors: Wu, Q., Bansal, G., Zhang, J., et al. (9 authors)
  ✓ Year: 2023
  ✓ Source: arXiv preprint
  ✓ Citations: 234 (as of 2026-02-03)

Step 4: Creating finding document
  ✓ Generated .aiwg/research/findings/REF-022-autogen.md
  ✓ Frontmatter populated
  ✓ Template sections added

Step 5: Updating corpus
  ✓ Added to fixity manifest
  ✓ Updated INDEX.md
  ✓ Logged acquisition

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Acquisition complete!

REF-ID: REF-022
Title: AutoGen: Enabling Next-Gen LLM Applications...
File: .aiwg/research/sources/REF-022.pdf
Finding: .aiwg/research/findings/REF-022-autogen.md

Next Steps:
1. /research-quality REF-022 - Assess evidence quality
2. /research-document REF-022 - Create detailed summary
3. /research-cite REF-022 - Generate citation
```

## Provenance Tracking

All acquisitions create provenance records:

```yaml
# .aiwg/research/provenance/records/REF-022-acquisition.yaml
entity:
  id: "urn:aiwg:artifact:.aiwg/research/sources/REF-022.pdf"
  type: "research_paper"

activity:
  id: "urn:aiwg:activity:acquisition:REF-022:001"
  type: "acquisition"
  started_at: "2026-02-03T12:00:00Z"
  ended_at: "2026-02-03T12:00:15Z"

agent:
  id: "urn:aiwg:agent:acquisition-agent"
  type: "aiwg_agent"

source:
  identifier: "10.48550/arXiv.2308.08155"
  url: "https://arxiv.org/pdf/2308.08155.pdf"
```

## References

- @agentic/code/frameworks/research-complete/agents/acquisition-agent.md - Acquisition Agent
- @src/research/services/acquisition-service.ts - Download implementation
- @agentic/code/frameworks/sdlc-complete/schemas/research/frontmatter-schema.yaml - Metadata format
- @.aiwg/research/fixity-manifest.json - Checksum tracking
- @.claude/rules/provenance-tracking.md - Provenance requirements
