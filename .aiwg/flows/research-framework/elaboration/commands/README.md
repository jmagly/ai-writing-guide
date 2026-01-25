

# Research Framework Commands

Slash commands and natural language skills for the AIWG Research Framework.

## Overview

The Research Framework provides 10 specialized commands covering the complete research lifecycle:

1. **Discovery**: Find and rank relevant papers
2. **Acquisition**: Download and validate PDFs
3. **Documentation**: Generate structured notes
4. **Citation**: Format citations and back claims
5. **Archival**: Package for long-term preservation
6. **Quality Assessment**: Evaluate FAIR compliance
7. **Gap Analysis**: Identify research gaps
8. **Export**: Generate multiple output formats
9. **Workflow**: Execute end-to-end pipelines
10. **Status**: Monitor framework state

## Command Reference

| Command | Use Case | Primary Agent | Natural Language Example |
|---------|----------|---------------|-------------------------|
| `/research-discover` | UC-RF-001 | Discovery Agent | "Find papers on OAuth2 security" |
| `/research-acquire` | UC-RF-002 | Acquisition Agent | "Download the papers" |
| `/research-document` | UC-RF-003 | Documentation Agent | "Summarize the papers" |
| `/research-cite` | UC-RF-004 | Citation Agent | "Cite this claim in APA style" |
| `/research-archive` | UC-RF-007 | Archival Agent | "Archive the research" |
| `/research-quality` | UC-RF-006 | Quality Agent | "Assess research quality" |
| `/research-gap-analysis` | UC-RF-009 | Discovery Agent | "What's missing in the literature?" |
| `/research-export` | UC-RF-010 | Archival Agent | "Export to BibTeX" |
| `/research-workflow` | UC-RF-008 | Workflow Agent | "Complete research workflow for LLM evaluation" |
| `/research-status` | Cross-cutting | All Agents | "Show research status" |

## Typical Workflows

### Workflow 1: Quick Research Discovery

**Goal**: Find and document papers on a specific topic

```bash
# 1. Discover papers
aiwg research discover "OAuth2 security best practices"

# 2. Select top papers
aiwg research select --top 10

# 3. Acquire PDFs
aiwg research acquire --all

# 4. Document findings
aiwg research document --all

# 5. Export to BibTeX
aiwg research export bibtex
```

**Time**: ~10 minutes for 10 papers (vs. 2+ hours manual)

### Workflow 2: Systematic Literature Review

**Goal**: Conduct PRISMA-compliant systematic review

```bash
# 1. Preregister search protocol
aiwg research discover --preregister
# Agent prompts for PICO elements, generates protocol

# 2. Execute registered search
# (automatically uses preregistration protocol)

# 3. Acquire all papers
aiwg research acquire --all

# 4. Document with claim extraction
aiwg research document --all --template claim-extraction

# 5. Assess quality (PRISMA checklist)
aiwg research quality --all --checklist prisma

# 6. Perform gap analysis
aiwg research gap-analysis --depth comprehensive

# 7. Archive versioned collection
aiwg research archive --version v1.0-systematic-review

# 8. Export for publication
aiwg research export oais-sip
```

**Time**: ~30 minutes for 50 papers (vs. 10+ hours manual)

### Workflow 3: Citation-Driven Exploration

**Goal**: Explore research via citation network

```bash
# 1. Discover papers with citation network
aiwg research discover "deep Q-learning" --citation-network

# 2. Review citation relationships
# Agent displays forward/backward citation graph

# 3. Acquire papers from citation network
aiwg research acquire --all

# 4. Build citation network visualization
aiwg research cite --build-network

# 5. Export to Obsidian for graph view
aiwg research export obsidian
```

**Time**: ~15 minutes for 30 papers + citations

### Workflow 4: End-to-End Automation

**Goal**: Complete research lifecycle in single command

```bash
# Run full workflow: discover → acquire → document → cite → archive → export
aiwg research workflow "LLM evaluation methods" --output-format obsidian --limit 20
```

**Time**: ~5 minutes for 20 papers (fully automated)

## Command Details

### /research-discover

**Purpose**: Semantic search for papers via Semantic Scholar API

**Arguments**:
- `<query>`: Research topic (required)
- `--preregister`: Generate PRISMA protocol
- `--citation-network`: Enable citation chaining
- `--refine-from <session>`: Refine previous search
- `--limit <count>`: Number of results (default: 100)

**Examples**:
```bash
# Basic search
aiwg research discover "OAuth2 security"

# Systematic review
aiwg research discover --preregister

# Citation network exploration
aiwg research discover "deep Q-learning" --citation-network

# Refined search
aiwg research discover "machine learning LLM caching" --refine-from last
```

**Outputs**:
- Search results JSON
- PRISMA-compliant search strategy
- Gap analysis report
- Acquisition queue

**Performance**:
- Search completion: <10 seconds (100 papers)
- Gap analysis: <30 seconds

### /research-acquire

**Purpose**: Download PDFs from open access sources

**Arguments**:
- `--queue <file>`: Custom acquisition queue
- `--doi <identifier>`: Acquire single paper
- `--all`: Acquire all pending papers
- `--validate-only`: Check integrity without downloading

**Examples**:
```bash
# Acquire all papers in queue
aiwg research acquire --all

# Acquire specific paper
aiwg research acquire --doi 10.1145/3491102.3501874

# Validate existing downloads
aiwg research acquire --validate-only
```

**Outputs**:
- Downloaded PDFs
- Metadata JSON files
- SHA256 checksums
- Acquisition log

**Sources** (priority order):
1. Unpaywall (open access)
2. DOI.org resolver
3. arXiv
4. Institutional repositories

### /research-document

**Purpose**: Generate structured notes from papers

**Arguments**:
- `--paper-id <id>`: Document specific paper
- `--all`: Document all acquired papers
- `--template <type>`: Note template (research-note, literature-review, claim-extraction)

**Examples**:
```bash
# Document all papers
aiwg research document --all

# Extract claims from specific paper
aiwg research document --paper-id abc123def456 --template claim-extraction
```

**Outputs**:
- Markdown research notes
- Claim database JSON
- Documentation summary

### /research-cite

**Purpose**: Format citations and back claims

**Arguments**:
- `<claim-text>`: Claim to cite (required)
- `--style <format>`: Citation style (apa, ieee, acm, bibtex)
- `--back-claim`: Find supporting papers

**Examples**:
```bash
# Format citation in APA
aiwg research cite "OAuth2 token refresh improves security" --style apa

# Back claim with research
aiwg research cite "LLMs hallucinate 15-30% of the time" --back-claim

# Build citation network
aiwg research cite --build-network
```

**Outputs**:
- Formatted bibliography
- Citation network graph
- Backed claims report

### /research-archive

**Purpose**: Version and preserve research collection

**Arguments**:
- `--version <tag>`: Version tag (default: timestamp)
- `--format <type>`: Archive format (tar.gz, zip, oais-sip)
- `--destination <path>`: Backup location

**Examples**:
```bash
# Archive with version tag
aiwg research archive --version v1.0-oauth-security

# Create OAIS preservation package
aiwg research archive --format oais-sip

# Backup to S3
aiwg research archive --destination s3://my-bucket/research-backups/
```

**Outputs**:
- Versioned archive package
- PREMIS preservation metadata
- Backup log

### /research-quality

**Purpose**: Assess FAIR compliance and quality

**Arguments**:
- `--paper-id <id>`: Assess specific paper
- `--all`: Assess all papers
- `--checklist <type>`: Quality checklist (fair, consort, prisma, arrive)

**Examples**:
```bash
# Assess all papers
aiwg research quality --all

# FAIR compliance check
aiwg research quality --all --checklist fair

# PRISMA checklist for systematic review
aiwg research quality --checklist prisma
```

**Outputs**:
- Quality assessment report
- FAIR scores JSON
- Compliance checklist

### /research-gap-analysis

**Purpose**: Identify research gaps and future directions

**Arguments**:
- `--topic <area>`: Focus on specific topic
- `--depth <level>`: Analysis depth (quick, standard, comprehensive)

**Examples**:
```bash
# Comprehensive gap analysis
aiwg research gap-analysis --depth comprehensive

# Topic-focused analysis
aiwg research gap-analysis --topic "OAuth token security"
```

**Outputs**:
- Gap analysis report
- Future research agenda

**Gap Detection Criteria**:
- Sparse clusters: <5 papers in topic cluster
- High variance: >50% disagreement in findings
- Missing integrations: Concepts never co-occurring

### /research-export

**Purpose**: Export to external formats

**Arguments**:
- `<format>`: Export format (bibtex, obsidian, zotero, oais-sip) [required]
- `--destination <path>`: Output path

**Examples**:
```bash
# Export to BibTeX
aiwg research export bibtex

# Create Obsidian vault
aiwg research export obsidian --destination ~/obsidian/research-vault/

# Generate Zotero library
aiwg research export zotero

# Package for OAIS
aiwg research export oais-sip
```

**Output Formats**:
- **BibTeX**: `bibliography.bib`
- **Obsidian**: Markdown vault with backlinks
- **Zotero**: `library.json` import file
- **OAIS SIP**: Preservation package with PREMIS metadata

### /research-workflow

**Purpose**: Execute complete research pipeline

**Arguments**:
- `<query>`: Research topic (required)
- `--output-format <type>`: Final export format
- `--limit <count>`: Number of papers to process

**Examples**:
```bash
# End-to-end workflow
aiwg research workflow "LLM evaluation methods" --output-format obsidian --limit 20
```

**Pipeline Steps**:
1. Discovery (semantic search)
2. Acquisition (download PDFs)
3. Documentation (generate notes)
4. Citation integration
5. Quality assessment (FAIR)
6. Archival (versioned backup)
7. Export (to specified format)

### /research-status

**Purpose**: Monitor framework state

**Arguments**:
- `--verbose`: Detailed breakdown
- `--export <format>`: Export status (json, markdown)

**Examples**:
```bash
# Show status
aiwg research status

# Verbose with export
aiwg research status --verbose --export markdown
```

**Displays**:
- Total papers (discovered, acquired, documented)
- Coverage metrics
- Quality scores
- Recent activity
- Top research topics
- Recommendations

## Natural Language Support

All commands support natural language invocation:

| Natural Language | Command Executed |
|------------------|------------------|
| "Find papers on OAuth2 security" | `/research-discover "OAuth2 security"` |
| "Download the papers" | `/research-acquire --all` |
| "Summarize the papers" | `/research-document --all` |
| "Cite this claim in APA" | `/research-cite "{claim}" --style apa` |
| "What's missing in the literature?" | `/research-gap-analysis` |
| "Export to BibTeX" | `/research-export bibtex` |
| "Show research status" | `/research-status` |

## File Structure

```
.aiwg/research/
├── config.yaml                  # Configuration (API keys, settings)
├── discovery/                   # Search results and strategies
│   ├── search-results-*.json
│   ├── search-strategy.md
│   ├── preregistration/
│   └── acquisition-queue.json
├── papers/                      # Acquired PDFs
│   ├── {paper-id}.pdf
│   ├── {paper-id}.json          # Metadata
│   └── {paper-id}.sha256        # Checksum
├── notes/                       # Structured documentation
│   └── {paper-id}.md
├── claims/                      # Extracted claims
│   ├── claims.json
│   └── backed-claims.md
├── analysis/                    # Gap analysis and reports
│   ├── gap-report-*.md
│   ├── citation-network.dot
│   └── documentation-summary.md
├── quality/                     # Quality assessments
│   ├── quality-assessment.md
│   └── fair-scores.json
├── archives/                    # Versioned backups
│   ├── research-v*.tar.gz
│   └── premis-v*.xml
├── exports/                     # External format exports
│   ├── bibliography.bib
│   ├── obsidian-vault/
│   ├── zotero-library.json
│   └── oais-sip.tar.gz
└── logs/                        # Operation logs
    ├── acquisition-*.log
    └── archive-*.log
```

## Agent Mapping

| Agent | Primary Commands | Responsibilities |
|-------|-----------------|------------------|
| Discovery Agent | /research-discover, /research-gap-analysis | Semantic search, gap detection |
| Acquisition Agent | /research-acquire | PDF download, validation |
| Documentation Agent | /research-document | Note generation, claim extraction |
| Citation Agent | /research-cite | Citation formatting, network building |
| Provenance Agent | (passive) | Track artifact lineage |
| Quality Agent | /research-quality | FAIR compliance, quality assessment |
| Archival Agent | /research-archive, /research-export | Versioning, preservation, export |
| Workflow Agent | /research-workflow | End-to-end orchestration |

## Performance Targets

| Operation | Target | Measurement |
|-----------|--------|-------------|
| Semantic search (100 papers) | <10 seconds | NFR-RF-D-01 |
| Gap analysis (100 papers) | <30 seconds | NFR-RF-D-02 |
| PDF acquisition (per paper) | <5 seconds | NFR-RF-A-01 |
| Documentation (per paper) | <30 seconds | NFR-RF-DO-01 |
| End-to-end workflow (20 papers) | <5 minutes | UC-RF-008 acceptance |

## Integration Points

### Semantic Scholar API

- **Purpose**: Primary paper discovery source
- **Rate Limit**: 100 requests / 5 minutes
- **Coverage**: 200M+ papers across all disciplines
- **Authentication**: API key (optional but recommended)

### Unpaywall API

- **Purpose**: Open access PDF discovery
- **Rate Limit**: Polite (respect headers)
- **Coverage**: 30M+ open access papers
- **Authentication**: Email in User-Agent

### arXiv API

- **Purpose**: Preprint access
- **Rate Limit**: 1 request / 3 seconds
- **Coverage**: 2M+ preprints
- **Authentication**: None required

## Error Handling

| Error | Command | Mitigation |
|-------|---------|------------|
| Rate limit (429) | /research-discover | Wait 60s, retry (3 attempts) |
| Network timeout | /research-acquire | Exponential backoff (5s, 10s, 20s) |
| No results | /research-discover | Suggest query refinement |
| No open access | /research-acquire | Skip, log for manual acquisition |
| Corrupted PDF | /research-acquire | Re-download, validate checksum |
| Disk full | Any write operation | Abort, display df -h guidance |

## Security Considerations

1. **API Keys**: Loaded from config.yaml, never hardcoded
2. **Query Sanitization**: Prevent injection attacks
3. **Download Validation**: Verify PDF integrity with checksums
4. **Rate Limiting**: Strictly enforced to prevent bans
5. **Trusted Sources**: Download only from verified repositories

## Testing Coverage

| Command | Test Cases | Coverage Target |
|---------|-----------|----------------|
| /research-discover | TC-RF-001-001 through TC-RF-001-015 | 90%+ |
| /research-acquire | TC-RF-002-001 through TC-RF-002-010 | 85%+ |
| /research-document | TC-RF-003-001 through TC-RF-003-008 | 80%+ |
| /research-cite | TC-RF-004-001 through TC-RF-004-006 | 80%+ |
| /research-quality | TC-RF-006-001 through TC-RF-006-005 | 75%+ |

(Full test case specifications in respective use case documents)

## References

- **Use Cases**: `.aiwg/flows/research-framework/elaboration/use-cases/UC-RF-*.md`
- **Agents**: `.aiwg/flows/research-framework/elaboration/agents/*-agent-spec.md`
- **Architecture**: `.aiwg/flows/research-framework/elaboration/architecture/research-framework-architecture.md`
- **Vision**: `.aiwg/flows/research-framework/inception/vision-document.md`

## Change History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 0.1-draft | 2026-01-25 | Requirements Analyst | Initial command definitions |

---

**Status**: DRAFT
**Created**: 2026-01-25
**Owner**: Research Framework Team
**Review Status**: Awaiting stakeholder feedback

## Next Steps

1. **Implementation**: Build command handlers in `src/commands/research/`
2. **Testing**: Create test suite covering all 10 commands
3. **Documentation**: Expand command help text and examples
4. **Integration**: Connect to AIWG CLI and natural language router
5. **Validation**: User testing with real research workflows
