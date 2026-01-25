# Agent Specification: Citation Agent

## 1. Agent Overview

| Attribute | Value |
|-----------|-------|
| **Name** | Citation Agent |
| **ID** | research-citation-agent |
| **Purpose** | Format citations in any of 9,000+ styles, build citation networks, back claims with references, and manage bibliographies |
| **Lifecycle Stage** | Integration (Stage 4 of Research Framework) |
| **Model** | sonnet |
| **Version** | 1.0.0 |
| **Status** | Draft |

### Description

The Citation Agent bridges research sources and documentation artifacts by formatting citations, inserting references into SDLC documents, tracking claim coverage, and building citation networks. It supports 9,000+ citation styles via CSL (Citation Style Language), generates BibTeX/RIS exports for external tools, and maintains a claims index showing which assertions are backed by research and which need additional sources.

## 2. Capabilities

### Primary Capabilities

| Capability | Description | NFR Reference |
|------------|-------------|---------------|
| Citation Formatting | Format citations in Chicago, APA, IEEE, and 9,000+ styles | NFR-RF-C-07 |
| Claims Backing | Match claims to sources and insert inline citations | NFR-RF-C-05 |
| Bibliography Generation | Create and maintain bibliography with deduplication | BR-RF-C-004 |
| Citation Network | Build graph showing paper relationships | UC-RF-004 Alt-3 |
| Claims Index | Track backed vs. unbacked claims across documents | NFR-RF-C-08 |
| BibTeX/RIS Export | Export bibliography for LaTeX, Zotero, EndNote | UC-RF-004 Alt-2 |

### Secondary Capabilities

| Capability | Description |
|------------|-------------|
| Auto-Back Claims | Semantic matching to automatically suggest citations |
| DOI Validation | Verify DOI links resolve correctly |
| Style Switching | Convert existing citations between styles |
| Network Visualization | Generate citation graphs in DOT/JSON format |

## 3. Tools

### Required Tools

| Tool | Purpose | Permission |
|------|---------|------------|
| Bash | File operations, DOI validation | Execute |
| Read | Access sources, SDLC documents | Read |
| Write | Update documents, bibliography | Write |
| Glob | Find documents containing claims | Read |
| Grep | Search for claims in documents | Read |

### External Resources

| Resource | Purpose | Source |
|----------|---------|--------|
| CSL Styles | Citation formatting templates | [Zotero Style Repository](https://www.zotero.org/styles) |
| CSL Locale | Language-specific formatting | CSL Project |
| Citation.js | JavaScript citation processor | npm package |

## 4. Triggers

### Automatic Triggers

| Trigger | Condition | Action |
|---------|-----------|--------|
| Documentation Complete | Paper documented (UC-RF-003) | Add to citation pool |
| Workflow Stage | UC-RF-008 initiates Stage 4 | Process integration tasks |

### Manual Triggers

| Trigger | Command | Description |
|---------|---------|-------------|
| Single Citation | `aiwg research cite "claim" --source REF-XXX` | Insert one citation |
| Auto-Back | `aiwg research cite --auto-back-claims` | Auto-match claims |
| Export BibTeX | `aiwg research export-bib --format bibtex` | Export bibliography |
| Visualize Network | `aiwg research visualize-network` | Generate citation graph |
| Style Switch | `aiwg research cite --switch-style apa` | Convert citation style |

## 5. Inputs/Outputs

### Inputs

| Input | Format | Source | Validation |
|-------|--------|--------|------------|
| Claim Text | String (10-500 chars) | User command | Non-empty |
| Source Identifier | REF-XXX | User command | Valid REF-XXX exists |
| Citation Style | String or CSL file | Optional flag | Valid CSL style |
| Target Document | File path | Optional flag | File exists in `.aiwg/` |

### Outputs

| Output | Format | Location | Retention |
|--------|--------|----------|-----------|
| Inline Citations | Markdown text | SDLC documents | Permanent |
| Bibliography | Markdown | `.aiwg/research/bibliography.md` | Permanent |
| BibTeX Export | BibTeX format | `.aiwg/research/bibliography.bib` | Permanent |
| RIS Export | RIS format | `.aiwg/research/bibliography.ris` | Permanent |
| Claims Index | Markdown table | `.aiwg/research/knowledge/claims-index.md` | Updated continuously |
| Citation Network | JSON graph | `.aiwg/research/networks/citation-network.json` | Permanent |

### Output Schema: Claims Index

```markdown
# Claims Index

**Coverage:** 151/200 claims backed (75.5%)
**Last Updated:** 2026-01-25T16:30:00Z

| Claim | Status | Source | Document | Last Updated |
|-------|--------|--------|----------|--------------|
| Token rotation reduces CSRF risk by 80% | Backed | REF-025 | `.aiwg/architecture/software-architecture-doc.md:142` | 2026-01-25 |
| OAuth PKCE prevents authorization code interception | Backed | REF-025 | `.aiwg/requirements/nfr-modules/security.md:78` | 2026-01-25 |
| LLM caching reduces latency by 40% | Unbacked | - | `.aiwg/architecture/adr-008-llm-caching.md:23` | 2026-01-20 |
```

### Output Schema: Citation Network JSON

```json
{
  "nodes": [
    {
      "id": "REF-025",
      "title": "OAuth 2.0 Security Best Practices",
      "authors": ["Smith, J.", "Doe, J."],
      "year": 2023,
      "citation_count": 5,
      "grade_score": 90
    }
  ],
  "edges": [
    {
      "source": ".aiwg/architecture/software-architecture-doc.md",
      "target": "REF-025",
      "claim": "Token rotation reduces CSRF risk by 80%",
      "context": "supported",
      "timestamp": "2026-01-25T16:30:00Z"
    }
  ]
}
```

## 6. Dependencies

### Agent Dependencies

| Agent | Relationship | Interaction |
|-------|--------------|-------------|
| Documentation Agent | Upstream | Receives extractions with claims |
| Archival Agent | Downstream | Provides bibliography for packaging |
| Workflow Agent | Orchestrator | Receives task assignments |
| Provenance Agent | Observer | Logs citation operations |

### Service Dependencies

| Service | Purpose | Fallback |
|---------|---------|----------|
| CSL Processor | Citation formatting | Built-in basic formatter |
| DOI Resolution | Link validation | Skip validation |
| File System | Document storage | Abort if unavailable |

### Data Dependencies

| Data | Location | Required |
|------|----------|----------|
| Source Metadata | `.aiwg/research/sources/metadata/` | Yes |
| SDLC Documents | `.aiwg/requirements/`, `.aiwg/architecture/` | Yes |
| Existing Bibliography | `.aiwg/research/bibliography.md` | Optional |
| Claims Extractions | `.aiwg/research/knowledge/extractions/` | Optional |

## 7. Configuration Options

### Agent Configuration

```yaml
# .aiwg/research/config/citation-agent.yaml
citation_agent:
  # Default Citation Style
  style:
    default: chicago-17th-author-date
    fallback: apa-7th
    custom_csl_path: null  # Path to custom .csl file

  # Claims Matching
  claims:
    semantic_threshold: 0.90  # Minimum similarity for auto-match
    require_user_approval: true
    index_refresh_interval: 24h

  # Bibliography Settings
  bibliography:
    sort_by: author  # author, year, or title
    deduplicate_by: doi
    include_access_date: true

  # Network Visualization
  network:
    output_formats: [json, dot]
    cluster_by: topic
    edge_colors:
      supported: green
      contradicted: red
      uncertain: gray

  # Validation
  validation:
    check_doi_links: true
    doi_timeout_seconds: 10
    warn_on_incomplete_metadata: true
```

### Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `AIWG_CITATION_STYLE` | Default citation style | chicago-17th |
| `AIWG_CITATION_VALIDATE_DOI` | Enable DOI link checking | true |

## 8. Error Handling

### Error Categories

| Error Type | Severity | Handling Strategy |
|------------|----------|-------------------|
| Metadata Incomplete | Warning | Prompt to complete, allow partial |
| Claim Not Found | Warning | Show similar claims, allow manual |
| DOI Link Broken | Warning | Log and continue, user can fix |
| Style Not Found | Error | Fallback to default, suggest alternatives |
| Bibliography Conflict | Warning | Prompt for merge resolution |

### Error Response Template

```json
{
  "error_code": "CITATION_CLAIM_NOT_FOUND",
  "severity": "warning",
  "message": "Claim not found in any SDLC document",
  "claim": "Token rotation reduces CSRF risk",
  "similar_claims": [
    "Token rotation reduces CSRF attack success rate by 80%"
  ],
  "remediation": "Update claim text to match document wording",
  "user_action_required": true
}
```

## 9. Metrics/Observability

### Performance Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Citation formatting time | <5 seconds | Timer per citation |
| Bulk citation throughput | 10 claims/minute | Citations processed |
| Bibliography generation | <10 seconds (100 entries) | Timer for generation |
| DOI validation rate | >95% resolve | Successful / total |

### Logging

| Log Level | Events |
|-----------|--------|
| INFO | Citation added, bibliography updated, network built |
| DEBUG | CSL processing, claim matching, DOI checks |
| WARNING | Incomplete metadata, broken DOI, style fallback |
| ERROR | Style not found, document write failure |

## 10. Example Usage

### Basic Citation Insertion

```bash
# Add citation to a claim
aiwg research cite "Token rotation reduces CSRF risk by 80%" --source REF-025

# Output:
# Searching for claim in SDLC documents...
# Found in: .aiwg/architecture/software-architecture-doc.md (line 142)
# Formatting citation (Chicago 17th)...
# Inline: (Smith and Doe 2023)
# Full: Smith, John, and Jane Doe. 2023. "OAuth 2.0 Security Best Practices." ...
#
# Citation inserted.
# Claims index updated: 151/200 backed (75.5%)
# Bibliography updated with 1 new entry.
```

### Auto-Back Claims

```bash
# Automatically match unbacked claims to sources
aiwg research cite --auto-back-claims

# Output:
# Scanning claims index for unbacked claims...
# Found 50 unbacked claims
#
# Matching claims to literature notes...
# [1/50] "LLM caching reduces latency by 40%"
#        Match: REF-042 (95% similarity) "40% latency reduction via semantic caching"
#        Back claim with REF-042? (y/n/skip): y
#
# [2/50] "Agentic systems require tool orchestration"
#        Match: REF-015 (92% similarity)
#        Back claim with REF-015? (y/n/skip): y
#
# ...
#
# Auto-backing complete:
# - Approved: 30 claims
# - Skipped: 15 claims
# - No match: 5 claims
# Claims coverage: 75.5% -> 90.5%
```

### BibTeX Export

```bash
# Export bibliography for LaTeX
aiwg research export-bib --format bibtex

# Output:
# Converting 50 sources to BibTeX format...
# Export complete: .aiwg/research/bibliography.bib
#
# Sample entry:
# @inproceedings{Smith2023OAuth,
#   title = {OAuth 2.0 Security Best Practices},
#   author = {Smith, John and Doe, Jane},
#   booktitle = {Proceedings of ACM CCS},
#   year = {2023},
#   pages = {123--145},
#   doi = {10.1145/example}
# }
```

### Citation Network Visualization

```bash
# Generate citation network
aiwg research visualize-network

# Output:
# Building citation network from 50 papers and 10 documents...
# Nodes: 50 papers
# Edges: 120 citations
# Clusters: 5 topic areas
#
# Exports:
# - JSON: .aiwg/research/networks/citation-network.json
# - GraphViz: .aiwg/research/networks/citation-network.dot
#
# To render: dot -Tpng citation-network.dot -o network.png
```

## 11. Related Use Cases

| Use Case | Relationship | Description |
|----------|--------------|-------------|
| UC-RF-004 | Primary | Integrate Citations into Documentation |
| UC-RF-003 | Upstream | Document Research Paper (provides extractions) |
| UC-RF-007 | Downstream | Archive Research Artifacts (includes bibliography) |
| UC-RF-008 | Orchestrated | Execute Research Workflow (Stage 4) |

## 12. Implementation Notes

### Architecture Considerations

1. **CSL Processing**: Use Citation.js or citeproc-js for formatting
2. **Transactional Updates**: Document edits are atomic (all-or-nothing)
3. **Bidirectional Linking**: Claims index links to both document and source
4. **Idempotent Citations**: Re-citing same claim/source updates rather than duplicates

### Performance Optimizations

1. **Style Caching**: Cache compiled CSL styles for reuse
2. **Batch Processing**: Process multiple citations per document scan
3. **Incremental Index**: Update claims index incrementally, not full rebuild
4. **Lazy DOI Validation**: Validate DOIs in background or on export

### Security Considerations

1. **Document Backup**: Create backup before document modification
2. **No Data Loss**: Never remove existing content, only add citations
3. **Merge Conflict Prevention**: Lock documents during update

### Testing Strategy

| Test Type | Coverage Target | Focus Areas |
|-----------|-----------------|-------------|
| Unit Tests | 80% | CSL formatting, claim matching, network building |
| Integration Tests | 70% | Document modification, bibliography generation |
| E2E Tests | Key workflows | Full claim to citation workflow |

### Known Limitations

1. **Style Accuracy**: Complex styles may have edge case formatting issues
2. **Semantic Matching**: May suggest incorrect matches for ambiguous claims
3. **Network Scale**: Large networks (>1000 papers) may be slow to visualize
4. **Stale Index**: Claims index may become out of sync if documents edited externally

---

## References

- @.aiwg/flows/research-framework/elaboration/use-cases/UC-RF-004-integrate-citations.md
- @.aiwg/flows/research-framework/inception/vision-document.md - Section 7.1 (Citation Integration)
- @.aiwg/flows/research-framework/inception/initial-risk-assessment.md - T-05 (Citation Accuracy)
- [Citation Style Language (CSL)](https://citationstyles.org/)
- [Zotero Style Repository](https://www.zotero.org/styles)

---

## Document Metadata

**Version:** 1.0 (Draft)
**Status:** DRAFT - Awaiting Review
**Created:** 2026-01-25
**Last Updated:** 2026-01-25
**Owner:** Agent Designer (Research Framework Team)
