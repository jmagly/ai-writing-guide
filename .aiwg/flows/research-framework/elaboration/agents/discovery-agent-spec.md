# Agent Specification: Discovery Agent

## 1. Agent Overview

| Attribute | Value |
|-----------|-------|
| **Name** | Discovery Agent |
| **ID** | research-discovery-agent |
| **Purpose** | Search academic databases, rank results by relevance and quality, detect research gaps, and create reproducible search strategies |
| **Lifecycle Stage** | Discovery (Stage 1 of Research Framework) |
| **Model** | sonnet |
| **Version** | 1.0.0 |
| **Status** | Draft |

### Description

The Discovery Agent is the gateway to the Research Framework, responsible for transforming user research queries into comprehensive, ranked result sets. It leverages semantic search via Semantic Scholar API, performs automated gap detection to identify under-researched areas, and documents PRISMA-compliant search strategies for reproducibility. The agent achieves 60%+ time savings compared to manual search by automating query refinement, citation network traversal, and relevance ranking.

## 2. Capabilities

### Primary Capabilities

| Capability | Description | NFR Reference |
|------------|-------------|---------------|
| Semantic Search | Execute natural language queries against Semantic Scholar API (200M+ papers) | NFR-RF-D-01 |
| Relevance Ranking | Rank results by semantic similarity, citation count, venue tier, and recency | BR-RF-D-002 |
| Gap Detection | Identify under-researched subtopics, contradictory findings, and missing integrations | BR-RF-D-003 |
| Citation Chaining | Traverse citation networks (forward/backward) to discover related papers | UC-RF-001 Alt-2 |
| Query Refinement | Suggest query improvements when results are too broad or narrow | UC-RF-001 Alt-3 |
| PRISMA Strategy | Generate reproducible search strategy documents following PRISMA guidelines | NFR-RF-D-08 |

### Secondary Capabilities

| Capability | Description |
|------------|-------------|
| Multi-Database Fallback | Query arXiv API when Semantic Scholar results are insufficient |
| Result Deduplication | Merge and deduplicate results across databases by DOI/title |
| Progress Reporting | Real-time search progress updates for large result sets |
| Acquisition Queue Creation | Prepare selected papers for UC-RF-002 (Acquisition) |

## 3. Tools

### Required Tools

| Tool | Purpose | Permission |
|------|---------|------------|
| Bash | Execute API queries, file operations | Execute |
| Read | Access search configuration, previous strategies | Read |
| Write | Save search results, strategies, gap reports | Write |
| Grep | Search existing research corpus for duplicates | Read |
| Glob | Find related research files | Read |

### External APIs

| API | Endpoint | Rate Limit | Auth |
|-----|----------|------------|------|
| Semantic Scholar | `api.semanticscholar.org/graph/v1` | 100 req/5 min | None (API key optional) |
| arXiv | `export.arxiv.org/api/query` | 3 req/sec | None |
| CrossRef | `api.crossref.org/works` | 50 req/sec | None |

### MCP Servers (Optional)

| Server | Purpose |
|--------|---------|
| `research-mcp` | Enhanced paper metadata retrieval |
| `semantic-search-mcp` | Advanced semantic similarity scoring |

## 4. Triggers

### Automatic Triggers

| Trigger | Condition | Action |
|---------|-----------|--------|
| Research Command | User runs `aiwg research search "<query>"` | Execute semantic search |
| Gap Analysis Request | UC-RF-009 requests discovery for gap-filling | Execute targeted search |
| Workflow Stage | UC-RF-008 Workflow Agent initiates Stage 1 | Execute discovery for workflow |

### Manual Triggers

| Trigger | Command | Description |
|---------|---------|-------------|
| Direct Search | `aiwg research search "query"` | Basic semantic search |
| Preregistered Search | `aiwg research discover --preregister` | PRISMA-compliant systematic review |
| Citation Network | `aiwg research search "query" --citation-network` | Include citation chaining |
| Refined Search | `aiwg research search "query" --refine-from last` | Refine previous search |

### Event Triggers

| Event | Source | Action |
|-------|--------|--------|
| Corpus Updated | Archival Agent | Check if new papers trigger gap detection |
| Quality Threshold Not Met | Workflow Agent | Discover additional sources |

## 5. Inputs/Outputs

### Inputs

| Input | Format | Source | Validation |
|-------|--------|--------|------------|
| Search Query | String (3-200 chars) | User command | Non-empty, sanitized |
| Publication Year Range | Integer pair (YYYY-YYYY) | Optional flag | Valid years, start <= end |
| Result Limit | Integer (1-500) | Optional flag `--limit` | Within API limits |
| Venue Filter | Enum (conference, journal, all) | Optional flag `--venue` | Valid enum value |
| Preregistration Mode | Boolean | Optional flag `--preregister` | N/A |
| Previous Search Context | JSON | Optional flag `--refine-from` | Valid search ID |

### Outputs

| Output | Format | Location | Retention |
|--------|--------|----------|-----------|
| Search Results | JSON | `.aiwg/research/discovery/search-results-{timestamp}.json` | Permanent |
| Search Strategy | Markdown | `.aiwg/research/discovery/search-strategy.md` | Permanent |
| Gap Report | Markdown | `.aiwg/research/analysis/gap-report-{timestamp}.md` | Permanent |
| Acquisition Queue | JSON | `.aiwg/research/discovery/acquisition-queue.json` | Until acquired |
| Preregistration Protocol | Markdown | `.aiwg/research/discovery/preregistration/{timestamp}-protocol.md` | Permanent |

### Output Schema: Search Results JSON

```json
{
  "query": "OAuth2 security best practices",
  "timestamp": "2026-01-25T10:30:00Z",
  "api_version": "semantic-scholar-v1",
  "total_results": 100,
  "filters_applied": {
    "year_range": "2020-2026",
    "venue": "all"
  },
  "papers": [
    {
      "paper_id": "abc123def456",
      "title": "OAuth 2.0 Security Best Practices",
      "authors": ["Smith, J.", "Doe, A."],
      "year": 2023,
      "venue": "ACM CCS",
      "venue_tier": "A*",
      "citations": 42,
      "doi": "10.1145/example",
      "abstract": "...",
      "relevance_score": 0.95,
      "url": "https://www.semanticscholar.org/paper/abc123def456"
    }
  ],
  "gap_analysis": {
    "under_researched_topics": ["token refresh security", "OAuth PKCE adoption"],
    "contradictory_findings": ["Token rotation effectiveness disputed"],
    "missing_integrations": ["OAuth + WebAuthn"]
  }
}
```

## 6. Dependencies

### Agent Dependencies

| Agent | Relationship | Interaction |
|-------|--------------|-------------|
| Acquisition Agent | Downstream | Passes acquisition queue for UC-RF-002 |
| Workflow Agent | Orchestrator | Receives task assignments, reports completion |
| Quality Agent | Feedback | Receives quality scores for ranking refinement |
| Gap Analysis Agent | Bidirectional | Provides search data, receives gap-filling requests |

### Service Dependencies

| Service | Purpose | Fallback |
|---------|---------|----------|
| Semantic Scholar API | Primary paper database | arXiv API, manual search |
| Network connectivity | API access | Cache from previous searches |
| File system | Result storage | Memory buffer, delayed write |

### Data Dependencies

| Data | Location | Required |
|------|----------|----------|
| Previous search results | `.aiwg/research/discovery/` | Optional (for refinement) |
| Research corpus | `.aiwg/research/sources/` | Optional (for deduplication) |
| Topic taxonomy | `.aiwg/research/topic-taxonomy.yaml` | Optional (for gap detection) |

## 7. Configuration Options

### Agent Configuration

```yaml
# .aiwg/research/config/discovery-agent.yaml
discovery_agent:
  # API Configuration
  api:
    primary: semantic-scholar
    fallback: [arxiv, crossref]
    timeout_ms: 30000
    retry_attempts: 3
    retry_backoff_ms: [5000, 10000, 20000]

  # Search Defaults
  search:
    default_limit: 100
    max_limit: 500
    min_query_length: 3
    temperature: 0.3  # LLM query expansion

  # Ranking Weights (must sum to 1.0)
  ranking:
    relevance_weight: 0.40
    citation_weight: 0.30
    venue_weight: 0.20
    recency_weight: 0.10

  # Gap Detection Thresholds
  gap_detection:
    sparse_cluster_threshold: 5      # Papers per topic cluster
    contradiction_variance: 0.50     # Disagreement threshold
    coverage_minimum: 0.15           # Expected coverage per topic

  # Rate Limiting
  rate_limit:
    requests_per_window: 100
    window_seconds: 300
    burst_allowed: 10

  # PRISMA Compliance
  prisma:
    require_boolean_operators: true
    log_api_version: true
    timestamp_all_searches: true
```

### Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `SEMANTIC_SCHOLAR_API_KEY` | Optional API key for higher rate limits | None |
| `AIWG_RESEARCH_DISCOVERY_TIMEOUT` | Search timeout in seconds | 30 |
| `AIWG_RESEARCH_MAX_RESULTS` | Maximum results per search | 500 |

## 8. Error Handling

### Error Categories

| Error Type | Severity | Handling Strategy |
|------------|----------|-------------------|
| API Rate Limit (429) | Warning | Wait and retry with backoff |
| API Unavailable (5xx) | Warning | Fallback to alternative API |
| Network Timeout | Warning | Retry 3x, then suggest manual search |
| Empty Results | Info | Suggest query refinement |
| Invalid Query | Error | Validate and prompt correction |
| Disk Full | Error | Abort, cleanup, notify user |

### Error Response Template

```json
{
  "error_code": "DISCOVERY_API_RATE_LIMIT",
  "severity": "warning",
  "message": "Rate limit exceeded. Retrying in 60 seconds...",
  "retry_after_seconds": 60,
  "remediation": "Wait for rate limit window or reduce query frequency",
  "fallback_available": true,
  "fallback_action": "Use arXiv API for this query"
}
```

### Recovery Procedures

| Scenario | Procedure |
|----------|-----------|
| Partial search failure | Save completed results, retry failed portion |
| API key invalid | Switch to unauthenticated mode (lower rate limit) |
| Disk space low | Stream results to stdout instead of file |
| Previous search corrupted | Regenerate from API (if within rate limits) |

## 9. Metrics/Observability

### Performance Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Search completion time | <10 seconds (100 results) | Timer from query to results |
| Gap analysis time | <30 seconds | Timer for gap detection |
| API success rate | >95% | Successful requests / total requests |
| Relevance precision | >80% | User-validated relevance |

### Logging

| Log Level | Events |
|-----------|--------|
| INFO | Search start, results count, completion |
| DEBUG | API requests, ranking calculations, gap detection steps |
| WARNING | Rate limit hit, fallback triggered, empty results |
| ERROR | API failure, validation error, disk error |

### Telemetry

```json
{
  "event": "discovery_search_complete",
  "timestamp": "2026-01-25T10:30:05Z",
  "metrics": {
    "query_length": 35,
    "results_count": 100,
    "search_time_ms": 8500,
    "api_calls": 3,
    "gaps_detected": 2,
    "cache_hit": false
  }
}
```

### Health Check

```bash
# Discovery Agent health check
aiwg research discovery --health-check

# Expected output:
# Discovery Agent: HEALTHY
# - Semantic Scholar API: AVAILABLE (latency: 150ms)
# - arXiv API: AVAILABLE (latency: 200ms)
# - Storage: OK (500MB free)
# - Last successful search: 2026-01-25T10:30:00Z
```

## 10. Example Usage

### Basic Semantic Search

```bash
# Simple search
aiwg research search "OAuth2 security best practices"

# Output:
# Searching Semantic Scholar API...
# Found 100 results in 8.5 seconds
# Top 5 results:
# 1. "OAuth 2.0 Security Best Practices" (Smith 2023) - Relevance: 95%
# 2. "Securing OAuth 2.0 Implementations" (Doe 2024) - Relevance: 92%
# ...
# Results saved: .aiwg/research/discovery/search-results-2026-01-25T10-30-00.json
# Gap analysis: 2 under-researched topics identified
```

### Preregistered Systematic Review

```bash
# Start preregistered search
aiwg research discover --preregister

# Interactive prompts:
# Research Question (PICO format):
# > "In LLM-based systems, does chain-of-thought prompting improve reasoning accuracy?"
#
# Inclusion criteria:
# > Publication year: 2022-2026
# > Venue type: Peer-reviewed conferences/journals
# > Minimum citations: 5
#
# Exclusion criteria:
# > Non-English papers
# > Workshop papers
#
# Preregistration saved: .aiwg/research/discovery/preregistration/2026-01-25-protocol.md
# Executing search per protocol...
```

### Citation Network Traversal

```bash
# Search with citation chaining
aiwg research search "reinforcement learning from human feedback" --citation-network

# Output:
# Keyword search: 50 papers found
# Forward citation chaining: +25 papers (citing top 10)
# Backward citation chaining: +30 papers (cited by top 10)
# Total: 105 unique papers
# Snowball discovery revealed: 55 papers not found by keyword search
```

### Query Refinement

```bash
# Initial search too broad
aiwg research search "machine learning"
# Warning: Query may be too broad. 10,000+ results.
# Suggest narrowing: "machine learning" + domain/technique/application

# Refine from previous search
aiwg research search "machine learning LLM semantic caching" --refine-from last
# Loading previous search context...
# Refined search: 45 papers (narrowed from 10,000+)
```

## 11. Related Use Cases

| Use Case | Relationship | Description |
|----------|--------------|-------------|
| UC-RF-001 | Primary | Discover Research Papers via Semantic Search and Gap Analysis |
| UC-RF-009 | Supporting | Perform Gap Analysis (provides search data) |
| UC-RF-002 | Downstream | Acquire Research Source (receives acquisition queue) |
| UC-RF-008 | Orchestrated | Execute Research Workflow (Stage 1) |

## 12. Implementation Notes

### Architecture Considerations

1. **Stateless Search Execution**: Each search is independent; state preserved via files
2. **Idempotent Operations**: Re-running same query produces same results (within API consistency)
3. **Graceful Degradation**: Always return partial results rather than complete failure
4. **Rate Limit Awareness**: Built-in backoff and fallback prevent API bans

### Performance Optimizations

1. **Result Streaming**: Stream large result sets to avoid memory issues
2. **Parallel API Calls**: Batch pagination requests where API supports
3. **Local Caching**: Cache frequent queries (TTL: 24 hours)
4. **Incremental Gap Analysis**: Only analyze new results vs. full corpus

### Security Considerations

1. **Query Sanitization**: Escape special characters, prevent injection
2. **API Key Storage**: Use environment variables, never hardcode
3. **Rate Limit Compliance**: Respect API terms of service
4. **Result Validation**: Validate API responses before processing

### Testing Strategy

| Test Type | Coverage Target | Focus Areas |
|-----------|-----------------|-------------|
| Unit Tests | 80% | Query parsing, ranking algorithm, gap detection |
| Integration Tests | 70% | API interaction, file I/O, error handling |
| E2E Tests | Key workflows | Full search → results → queue creation |

### Known Limitations

1. **Semantic Scholar Coverage**: Not all papers indexed; supplement with arXiv
2. **Citation Lag**: New papers may not have citation data for weeks
3. **Gap Detection Accuracy**: Depends on corpus size and topic taxonomy quality
4. **Rate Limits**: Heavy users may hit limits during systematic reviews

---

## References

- @.aiwg/flows/research-framework/elaboration/use-cases/UC-RF-001-discover-research-papers.md
- @.aiwg/flows/research-framework/elaboration/use-cases/UC-RF-009-perform-gap-analysis.md
- @.aiwg/flows/research-framework/inception/vision-document.md - Section 5.1 (Goal 1)
- @.aiwg/flows/research-framework/inception/initial-risk-assessment.md - T-02 (API Dependency)
- [Semantic Scholar API Documentation](https://www.semanticscholar.org/product/api)
- [PRISMA Statement](https://www.prisma-statement.org/)

---

## Document Metadata

**Version:** 1.0 (Draft)
**Status:** DRAFT - Awaiting Review
**Created:** 2026-01-25
**Last Updated:** 2026-01-25
**Owner:** Agent Designer (Research Framework Team)
