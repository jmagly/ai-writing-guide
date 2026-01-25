# Agent Specification: Provenance Agent

## 1. Agent Overview

| Attribute | Value |
|-----------|-------|
| **Name** | Provenance Agent |
| **ID** | research-provenance-agent |
| **Purpose** | Track research operations with W3C PROV compliance, maintain lineage graphs, verify integrity, and enable reproducibility |
| **Lifecycle Stage** | Cross-cutting (monitors all research operations) |
| **Model** | sonnet |
| **Version** | 1.0.0 |
| **Status** | Draft |

### Description

The Provenance Agent operates transparently across all research operations, capturing metadata using the W3C PROV standard. It logs entities (artifacts), activities (operations), and agents (actors), maintains lineage graphs showing artifact dependencies, computes checksums for integrity verification, and generates reproducibility packages for publication supplements. The agent enables external researchers to replicate findings exactly and provides complete audit trails for research integrity.

## 2. Capabilities

### Primary Capabilities

| Capability | Description | NFR Reference |
|------------|-------------|---------------|
| W3C PROV Logging | Record entities, activities, agents, and relationships | NFR-RF-P-04 |
| Lineage Tracking | Build and query dependency graphs | NFR-RF-P-03 |
| Integrity Verification | Compute and validate SHA-256 checksums | NFR-RF-P-05 |
| Reproducibility Packages | Generate publication supplements | NFR-RF-P-06 |
| Git Integration | Correlate provenance with version control | UC-RF-005 Alt-4 |
| Time-Travel Queries | Reconstruct provenance at historical points | UC-RF-005 Alt-4 |

### Secondary Capabilities

| Capability | Description |
|------------|-------------|
| Natural Language Queries | "Where did REF-025 come from?" |
| Provenance Visualization | Generate lineage graphs in DOT format |
| Log Rotation | Manage log files with rotation and compression |
| Privacy Redaction | Remove sensitive data before export |

## 3. Tools

### Required Tools

| Tool | Purpose | Permission |
|------|---------|------------|
| Bash | File operations, checksum computation, git commands | Execute |
| Read | Access artifacts for checksum verification | Read |
| Write | Save provenance logs, lineage graphs | Write |
| Glob | Discover artifacts for tracking | Read |

### System Tools

| Tool | Purpose | Required |
|------|---------|----------|
| `sha256sum` | Checksum computation | Yes |
| `git` | Version control integration | Optional |
| `jq` | JSON processing | Optional |

## 4. Triggers

### Automatic Triggers (Intercepted Operations)

| Operation | Source Agent | Provenance Captured |
|-----------|--------------|---------------------|
| Discovery Search | Discovery Agent | Query, results, API version |
| Paper Acquisition | Acquisition Agent | URL, checksum, timestamp |
| Documentation | Documentation Agent | LLM model, prompts (hash only) |
| Citation | Citation Agent | Claim, source, document |
| Archival | Archival Agent | Package ID, checksums |

### Manual Triggers

| Trigger | Command | Description |
|---------|---------|-------------|
| Export Package | `aiwg research provenance export` | Reproducibility package |
| Validate Integrity | `aiwg research provenance verify` | Checksum validation |
| Query Lineage | `aiwg research provenance query "..."` | Trace artifact origin |
| Time-Travel | `aiwg research provenance query --at DATE` | Historical state |

## 5. Inputs/Outputs

### Inputs

| Input | Format | Source | Validation |
|-------|--------|--------|------------|
| Operation Metadata | JSON object | Research operations | Valid operation type |
| Entities Involved | Array of entity IDs | Operation context | Valid entity references |
| Checksums | SHA-256 hashes | Artifact files | Valid hex string |

### Outputs

| Output | Format | Location | Retention |
|--------|--------|----------|-----------|
| Provenance Log | W3C PROV-JSON | `.aiwg/research/provenance/prov-{timestamp}.json` | 5 years |
| Lineage Graph | JSON graph | `.aiwg/research/provenance/lineage-graph.json` | Permanent |
| Checksums File | Text | `.aiwg/research/sources/checksums.txt` | Permanent |
| Reproducibility Package | ZIP | `.aiwg/research/provenance/reproducibility-package-{timestamp}.zip` | Permanent |

### Output Schema: W3C PROV-JSON Record

```json
{
  "prefix": {
    "prov": "http://www.w3.org/ns/prov#",
    "aiwg": "https://aiwg.io/research#"
  },
  "entity": {
    "aiwg:search-results-2026-01-25": {
      "prov:type": "prov:Entity",
      "aiwg:entityType": "SearchResults",
      "aiwg:filePath": ".aiwg/research/discovery/search-results-2026-01-25T10-30-00.json",
      "aiwg:checksum": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
      "prov:generatedAtTime": "2026-01-25T10:30:00Z"
    }
  },
  "activity": {
    "aiwg:discovery-search-001": {
      "prov:type": "prov:Activity",
      "aiwg:activityType": "DiscoverySearch",
      "aiwg:command": "aiwg research search \"OAuth2 security best practices\"",
      "prov:startTime": "2026-01-25T10:29:50Z",
      "prov:endTime": "2026-01-25T10:30:05Z"
    }
  },
  "agent": {
    "aiwg:user-jmagly": {
      "prov:type": "prov:Agent",
      "aiwg:agentType": "HumanUser"
    },
    "aiwg:discovery-agent": {
      "prov:type": "prov:SoftwareAgent",
      "aiwg:agentType": "DiscoveryAgent",
      "aiwg:version": "1.0.0"
    }
  },
  "wasGeneratedBy": {
    "_:wgb1": {
      "prov:entity": "aiwg:search-results-2026-01-25",
      "prov:activity": "aiwg:discovery-search-001"
    }
  },
  "used": {
    "_:u1": {
      "prov:activity": "aiwg:discovery-search-001",
      "prov:entity": "aiwg:search-query-oauth2"
    }
  },
  "wasAssociatedWith": {
    "_:waw1": {
      "prov:activity": "aiwg:discovery-search-001",
      "prov:agent": "aiwg:discovery-agent"
    }
  }
}
```

### Output Schema: Lineage Graph JSON

```json
{
  "nodes": [
    {
      "id": "aiwg:search-query-oauth2",
      "type": "SearchQuery",
      "label": "OAuth2 security best practices",
      "created": "2026-01-25T10:29:50Z"
    },
    {
      "id": "aiwg:search-results-2026-01-25",
      "type": "SearchResults",
      "label": "100 papers found",
      "created": "2026-01-25T10:30:00Z"
    },
    {
      "id": "aiwg:REF-025",
      "type": "AcquiredPaper",
      "label": "OAuth 2.0 Security Best Practices",
      "created": "2026-01-25T14:30:00Z"
    }
  ],
  "edges": [
    {
      "from": "aiwg:search-query-oauth2",
      "to": "aiwg:search-results-2026-01-25",
      "relationship": "wasDerivedFrom",
      "activity": "discovery-search-001"
    },
    {
      "from": "aiwg:search-results-2026-01-25",
      "to": "aiwg:REF-025",
      "relationship": "wasDerivedFrom",
      "activity": "acquisition-001"
    }
  ]
}
```

## 6. Dependencies

### Agent Dependencies

| Agent | Relationship | Interaction |
|-------|--------------|-------------|
| All Research Agents | Observed | Captures operations from all agents |
| Archival Agent | Downstream | Provides provenance for packaging |
| Workflow Agent | Collaborative | Logs workflow state transitions |

### Service Dependencies

| Service | Purpose | Fallback |
|---------|---------|----------|
| File System | Log storage | Memory buffer, delayed write |
| Git (optional) | Version correlation | Manual versioning |

### Data Dependencies

| Data | Location | Required |
|------|----------|----------|
| All Research Artifacts | `.aiwg/research/` | Yes (for checksums) |
| Git Repository | `.git/` | Optional |
| Previous Provenance | `.aiwg/research/provenance/` | Optional |

## 7. Configuration Options

### Agent Configuration

```yaml
# .aiwg/research/config/provenance-agent.yaml
provenance_agent:
  # Logging Configuration
  logging:
    enabled: true
    format: prov-json
    granularity: fine  # fine, medium, coarse
    max_log_size_mb: 10
    rotation_days: 30
    retention_years: 5

  # Checksum Configuration
  checksums:
    algorithm: SHA-256
    verify_on_access: false
    periodic_verification_days: 30

  # Git Integration
  git:
    enabled: true
    auto_commit: true
    commit_message_prefix: "prov: "

  # Lineage Graph
  lineage:
    max_depth: 100
    include_activities: true
    include_agents: true

  # Reproducibility Package
  reproducibility:
    include_search_strategies: true
    include_software_versions: true
    exclude_pdfs: true  # Copyright compliance
    exclude_raw_prompts: true  # Proprietary

  # Privacy Settings
  privacy:
    redact_emails: true
    redact_internal_urls: true
    hash_prompts: true  # Store hash only
```

### Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `AIWG_PROVENANCE_ENABLED` | Enable provenance tracking | true |
| `AIWG_PROVENANCE_GIT_ENABLED` | Enable git integration | true |

## 8. Error Handling

### Error Categories

| Error Type | Severity | Handling Strategy |
|------------|----------|-------------------|
| Log Write Failed | Warning | Buffer in memory, retry later |
| Checksum Mismatch | Warning | Flag for investigation, don't block |
| Git Unavailable | Info | Continue without git integration |
| Log Corruption | Warning | Start new log, save corrupted for forensics |
| Schema Validation Failed | Warning | Auto-repair, flag for review |

### Error Response Template

```json
{
  "error_code": "PROVENANCE_LOG_WRITE_FAILED",
  "severity": "warning",
  "message": "Failed to write provenance log: Disk full",
  "buffered_records": 5,
  "remediation": "Free disk space; buffered records will be written on retry",
  "research_operation_status": "Continued normally (provenance is non-blocking)"
}
```

### Critical Design Decision

**Provenance failures are NON-BLOCKING.** Research operations continue even if provenance logging fails. This ensures user workflows are never interrupted by provenance issues, while still capturing as much data as possible.

## 9. Metrics/Observability

### Performance Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Logging overhead | <100ms per operation | Timer for log append |
| Log file size | <10 MB per 10,000 ops | File size tracking |
| Lineage query time | <2 seconds (1,000 entities) | Query response time |
| Checksum computation | <1 second (100 MB) | Hash computation time |

### Logging (Meta-Logging)

| Log Level | Events |
|-----------|--------|
| INFO | Operation captured, package exported |
| DEBUG | Entity/activity creation, relationship mapping |
| WARNING | Log write retry, checksum mismatch, git unavailable |
| ERROR | Log corruption, package export failure |

## 10. Example Usage

### Automatic Operation Capture

```bash
# User runs discovery search
aiwg research search "OAuth2 security"

# Provenance Agent automatically captures:
# - Entity: search-query (query text)
# - Entity: search-results (100 papers)
# - Activity: discovery-search-001
# - Agents: user, Discovery Agent, Semantic Scholar API
# - Relationships: wasGeneratedBy, used, wasAssociatedWith

# Log entry (invisible to user):
# [2026-01-25 10:30:00] PROV: discovery-search-001 completed
#   - Input: search-query-oauth2
#   - Output: search-results-2026-01-25
#   - Duration: 8.5s
#   - Checksum: e3b0c442...
```

### Lineage Query

```bash
# Query artifact origin
aiwg research provenance query "Where did REF-025 come from?"

# Output:
# Lineage Trace for REF-025
#
# Search Query: "OAuth2 security best practices"
#   |
#   v [Discovery Search: 2026-01-25 10:30:00]
# Search Results: 100 papers
#   |
#   v [Paper Selection: 2026-01-25 11:00:00]
# Acquisition Queue: REF-025 selected
#   |
#   v [Acquisition: 2026-01-25 14:30:00]
# REF-025: "OAuth 2.0 Security Best Practices"
#   |
#   v [Documentation: 2026-01-25 16:00:00]
# REF-025-summary.md
#   |
#   v [Citation: 2026-01-25 16:30:00]
# software-architecture-doc.md (line 142)
#
# Total chain length: 5 operations
# First operation: 2026-01-25 10:30:00
# Last operation: 2026-01-25 16:30:00
```

### Integrity Verification

```bash
# Verify all artifact checksums
aiwg research provenance verify

# Output:
# Verifying integrity of 50 artifacts...
#
# [OK] .aiwg/research/sources/pdfs/REF-001.pdf
# [OK] .aiwg/research/sources/pdfs/REF-002.pdf
# ...
# [MISMATCH] .aiwg/research/sources/pdfs/REF-042.pdf
#   Expected: a3f5b8c2...
#   Actual: 9d2e4f1a...
#   Warning: File may have been modified or corrupted
# ...
# [OK] .aiwg/research/sources/pdfs/REF-050.pdf
#
# Verification Summary:
# - Verified: 49/50 (98%)
# - Mismatch: 1 (REF-042 - investigate)
# - Missing: 0
```

### Reproducibility Package Export

```bash
# Create publication supplement
aiwg research provenance export --package publication-supplement

# Output:
# Creating reproducibility package...
#
# Collecting:
# - Provenance logs (W3C PROV-JSON)
# - Lineage graph (entity relationships)
# - Search strategies (PRISMA protocols)
# - Source metadata (50 REF-XXX files)
# - Checksums (integrity verification)
# - Software versions:
#   - AIWG: 2026.1.5
#   - LLM: claude-opus-4
#   - Semantic Scholar API: v1
#
# Generating README with replication instructions...
#
# Package created: reproducibility-package-2026-01-25.zip
# Size: 15.2 MB
# Contents: 127 files
# Note: PDFs excluded for copyright compliance
#
# External researchers can replicate findings using:
# 1. Extract package
# 2. Follow README.md instructions
# 3. Run: aiwg research replicate --from-provenance
```

### Time-Travel Query

```bash
# View provenance at historical point
aiwg research provenance query --at 2026-01-15

# Output:
# Provenance State as of 2026-01-15
#
# Corpus at that time:
# - Sources: 10 (REF-001 to REF-010)
# - Documented: 8
# - Claims backed: 25/100 (25%)
#
# Operations since then:
# - New sources: 40
# - New citations: 125
# - Coverage: 25% -> 75.5%
```

## 11. Related Use Cases

| Use Case | Relationship | Description |
|----------|--------------|-------------|
| UC-RF-005 | Primary | Track Research Provenance with W3C PROV |
| All UCs | Observer | Captures operations from all use cases |
| UC-RF-007 | Downstream | Archive includes provenance |
| UC-RF-008 | Collaborative | Logs workflow execution |

## 12. Implementation Notes

### Architecture Considerations

1. **Non-Blocking Design**: Provenance failures never block research operations
2. **Append-Only Logs**: Logs are immutable once written (audit trail)
3. **Lazy Checksum Computation**: Compute on first access or background job
4. **Event-Driven Capture**: Subscribe to agent events, not poll

### Performance Optimizations

1. **Batched Writes**: Buffer multiple records before disk write
2. **Async Logging**: Write logs in background thread
3. **Incremental Lineage**: Update graph incrementally, not rebuild
4. **Compressed Archives**: gzip old logs automatically

### Security Considerations

1. **Privacy Redaction**: Remove emails, internal URLs before export
2. **Prompt Hashing**: Store hash of prompts, not full text
3. **Access Logging**: Log who accesses provenance data
4. **Tamper Detection**: Checksums detect unauthorized modifications

### Testing Strategy

| Test Type | Coverage Target | Focus Areas |
|-----------|-----------------|-------------|
| Unit Tests | 80% | PROV-JSON generation, lineage queries |
| Integration Tests | 70% | Log writing, checksum verification |
| E2E Tests | Key workflows | Full capture through export |

### Known Limitations

1. **Storage Growth**: Fine-grained logging generates large logs
2. **Git Performance**: Large repos may slow git integration
3. **Privacy Trade-offs**: Full provenance may reveal sensitive info
4. **Replication Precision**: External factors (API changes) may affect reproduction

---

## References

- @.aiwg/flows/research-framework/elaboration/use-cases/UC-RF-005-track-provenance.md
- @.aiwg/flows/research-framework/inception/vision-document.md - Section 5.3 (Goal 3: Reproducibility)
- @.aiwg/flows/research-framework/inception/initial-risk-assessment.md - T-06 (Reproducibility)
- [W3C PROV Overview](https://www.w3.org/TR/prov-overview/)
- [PROV-JSON](https://www.w3.org/Submission/prov-json/)

---

## Document Metadata

**Version:** 1.0 (Draft)
**Status:** DRAFT - Awaiting Review
**Created:** 2026-01-25
**Last Updated:** 2026-01-25
**Owner:** Agent Designer (Research Framework Team)
