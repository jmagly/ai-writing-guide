# Agent Specification: Archival Agent

## 1. Agent Overview

| Attribute | Value |
|-----------|-------|
| **Name** | Archival Agent |
| **ID** | research-archival-agent |
| **Purpose** | Package research artifacts following OAIS standards, manage version control, verify integrity, and maintain backups |
| **Lifecycle Stage** | Archival (Stage 5 of Research Framework) |
| **Model** | sonnet |
| **Version** | 1.0.0 |
| **Status** | Draft |

### Description

The Archival Agent ensures long-term preservation of research artifacts by creating OAIS-compliant packages (SIP, AIP, DIP), computing and verifying checksums, managing version control integration, and maintaining backup copies. It supports both local and remote storage (S3, Glacier), implements retention policies, and generates reproducibility packages for publication supplements.

## 2. Capabilities

### Primary Capabilities

| Capability | Description | NFR Reference |
|------------|-------------|---------------|
| SIP Creation | Create Submission Information Packages with content and metadata | NFR-AR-05 |
| AIP Generation | Transform SIP to Archival Information Package with preservation metadata | NFR-AR-05 |
| DIP Production | Create user-friendly Dissemination Information Packages | NFR-AR-05 |
| Checksum Verification | Compute and validate SHA-256 checksums for integrity | NFR-AR-03 |
| Remote Backup | Sync archives to S3, Glacier, or institutional repositories | NFR-AR-04 |
| Version Management | Track archive versions with incremental/delta packaging | BR-AR-001 |

### Secondary Capabilities

| Capability | Description |
|------------|-------------|
| Archive Manifest | Maintain JSON manifest of all archived packages |
| Retention Policies | Enforce retention rules (permanent, time-limited) |
| Format Migration | Plan for future format obsolescence |
| Integrity Monitoring | Periodic checksum re-verification |

## 3. Tools

### Required Tools

| Tool | Purpose | Permission |
|------|---------|------------|
| Bash | File operations, compression, checksums | Execute |
| Read | Access research artifacts | Read |
| Write | Create packages, manifests, logs | Write |
| Glob | Discover artifacts for packaging | Read |

### System Tools

| Tool | Purpose | Required |
|------|---------|----------|
| `sha256sum` | Checksum computation | Yes |
| `tar` / `gzip` | Archive compression | Yes |
| `aws s3` | Remote backup to S3 | Optional |
| `git` | Version control integration | Optional |

## 4. Triggers

### Automatic Triggers

| Trigger | Condition | Action |
|---------|-----------|--------|
| Integration Complete | UC-RF-004 completes | Package artifacts |
| Scheduled Archival | Daily/weekly schedule | Incremental archive |
| Workflow Completion | UC-RF-008 completes | Final packaging |

### Manual Triggers

| Trigger | Command | Description |
|---------|---------|-------------|
| Immediate Archive | `aiwg research archive --immediate` | Create archive now |
| Verify Integrity | `aiwg research archive --verify` | Validate checksums |
| Export Reproducibility | `aiwg research provenance export --package` | Publication package |
| Remote Sync | `aiwg research archive --sync-remote` | Push to cloud storage |

## 5. Inputs/Outputs

### Inputs

| Input | Format | Source | Validation |
|-------|--------|--------|------------|
| Research Artifacts | Files | `.aiwg/research/` | Valid files exist |
| Archive Schedule | Cron expression | Configuration | Valid cron |
| Remote Config | YAML | Configuration | Valid credentials |

### Outputs

| Output | Format | Location | Retention |
|--------|--------|----------|-----------|
| SIP | Directory structure | `.aiwg/archives/SIPs/` | Temporary (delete after AIP) |
| AIP | Directory structure | `.aiwg/archives/AIPs/` | Permanent |
| DIP | Directory + HTML | `.aiwg/archives/DIPs/` | Permanent (refresh on update) |
| Archive Manifest | JSON | `.aiwg/archives/archive-manifest.json` | Permanent |
| Validation Logs | Text | `.aiwg/archives/validation-logs/` | 1 year |
| Archival History | Text | `.aiwg/archives/archival-history.log` | Permanent |

### Output Schema: Archive Manifest JSON

```json
{
  "archive_version": "1.0",
  "created_date": "2026-01-25T02:00:00Z",
  "last_archival": "2026-01-25T02:00:00Z",
  "packages": [
    {
      "package_id": "AIP-2026-01-25-001",
      "package_type": "AIP",
      "creation_date": "2026-01-25T02:00:00Z",
      "item_count": 30,
      "total_size_bytes": 5242880,
      "checksum_algorithm": "SHA-256",
      "verification_status": "PASSED",
      "storage_locations": {
        "primary": ".aiwg/archives/AIPs/AIP-2026-01-25-001/",
        "remote": "s3://research-archives/AIP-2026-01-25-001/"
      },
      "backup_verified": true
    }
  ],
  "retention_policy": {
    "aip_retention": "permanent",
    "sip_retention": "delete-after-aip-verified",
    "validation_log_retention": "1-year"
  }
}
```

### Output Schema: SIP/AIP Directory Structure

```
AIP-2026-01-25-001/
├── SIP-2026-01-25-001/
│   ├── content/
│   │   ├── sources/         # REF-XXX metadata and summaries
│   │   ├── integrations/    # Citations, bibliography
│   │   ├── quality/         # Quality assessment reports
│   │   └── acquisition/     # Acquisition logs
│   ├── metadata/
│   │   ├── descriptive.xml  # Dublin Core
│   │   ├── preservation.xml # PREMIS
│   │   └── technical.xml    # Format info
│   └── manifest.txt         # SHA-256 checksums
├── archival-metadata/
│   ├── aip-description.xml
│   ├── preservation-history.log
│   └── access-rights.xml
└── checksum-validation.txt
```

## 6. Dependencies

### Agent Dependencies

| Agent | Relationship | Interaction |
|-------|--------------|-------------|
| Citation Agent | Upstream | Receives bibliography for packaging |
| Provenance Agent | Collaborative | Includes provenance in packages |
| Workflow Agent | Orchestrator | Receives task assignments |
| All Agents | Observer | Archives artifacts from all agents |

### Service Dependencies

| Service | Purpose | Fallback |
|---------|---------|----------|
| File System | Local storage | Abort if unavailable |
| AWS S3 (optional) | Remote backup | Local-only archival |
| Git (optional) | Version control | Manual versioning |

### Data Dependencies

| Data | Location | Required |
|------|----------|----------|
| Research Sources | `.aiwg/research/sources/` | Yes |
| Knowledge Base | `.aiwg/research/knowledge/` | Yes |
| Bibliography | `.aiwg/research/bibliography.md` | Optional |
| Provenance Logs | `.aiwg/research/provenance/` | Optional |

## 7. Configuration Options

### Agent Configuration

```yaml
# .aiwg/research/config/archival-agent.yaml
archival_agent:
  # Schedule Configuration
  schedule:
    enabled: true
    cron: "0 2 * * *"  # Daily at 2 AM
    timezone: UTC

  # Packaging Settings
  packaging:
    compression: gzip
    checksum_algorithm: SHA-256
    include_provenance: true
    include_bibliography: true

  # Storage Configuration
  storage:
    primary_path: ".aiwg/archives/AIPs"
    dip_path: ".aiwg/archives/DIPs"
    max_aip_size_mb: 1000

  # Remote Backup
  remote:
    enabled: false
    provider: s3  # s3, glacier, or custom
    bucket: research-archives
    region: us-east-1
    encryption: AES-256

  # Retention Policy
  retention:
    aip: permanent
    sip: delete-after-verification
    dip: permanent
    validation_logs: 1-year
    archival_history: permanent

  # Versioning
  versioning:
    incremental: true
    full_repackage_interval: 30  # Days
    max_delta_chain: 10
```

### Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `AWS_ACCESS_KEY_ID` | S3 authentication | None |
| `AWS_SECRET_ACCESS_KEY` | S3 authentication | None |
| `AIWG_ARCHIVE_REMOTE_ENABLED` | Enable remote backup | false |

## 8. Error Handling

### Error Categories

| Error Type | Severity | Handling Strategy |
|------------|----------|-------------------|
| Integrity Verification Failed | Error | Delete corrupted AIP, retry |
| Disk Space Exhausted | Error | Abort, cleanup, notify user |
| Remote Backup Failed | Warning | Local-only, schedule retry |
| Metadata Generation Failed | Warning | Prompt for manual input |
| Compression Failed | Error | Retry without compression |

### Error Response Template

```json
{
  "error_code": "ARCHIVAL_INTEGRITY_FAILED",
  "severity": "error",
  "package_id": "AIP-2026-01-25-001",
  "message": "Checksum mismatch detected: sources/REF-003.md",
  "expected_checksum": "a3f5b8c2...",
  "actual_checksum": "9d2e4f1a...",
  "remediation": "Re-archive from original artifacts",
  "action_taken": "Corrupted AIP deleted, retry initiated"
}
```

## 9. Metrics/Observability

### Performance Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| Archival time | <5 minutes (1 GB) | Timer for full package |
| Verification time | <2 minutes (1 GB) | Timer for checksum validation |
| Remote sync time | <10 minutes (1 GB) | Timer for upload |
| Integrity pass rate | 100% | Successful verifications |

### Logging

| Log Level | Events |
|-----------|--------|
| INFO | Archival start, package created, verification passed |
| DEBUG | File processing, checksum calculations, metadata generation |
| WARNING | Remote backup failed, large file skipped |
| ERROR | Integrity failure, disk full, abort |

## 10. Example Usage

### Scheduled Archival

```bash
# Archival triggered by daily schedule (2 AM)
# Log output:
[2026-01-25 02:00:00] ARCHIVAL_START: Scheduled daily archival
[2026-01-25 02:00:05] SIP_CREATED: 30 items, 5.0 MB
[2026-01-25 02:00:12] AIP_GENERATED: AIP-2026-01-25-001
[2026-01-25 02:00:18] INTEGRITY_VERIFIED: All checksums match
[2026-01-25 02:00:22] DIP_CREATED: User-accessible package
[2026-01-25 02:00:25] REMOTE_SYNC: Uploading to s3://research-archives/
[2026-01-25 02:00:45] REMOTE_SYNC_COMPLETE: Backup verified
[2026-01-25 02:00:48] ARCHIVAL_COMPLETE: AIP-2026-01-25-001
```

### Immediate Archive

```bash
# Manual archive request
aiwg research archive --immediate

# Output:
# Checking for archivable content...
# Items to archive: 25 (15 sources, 7 integrations, 3 reports)
# Last archived: 2026-01-24 02:00:00 (23 hours ago)
#
# Creating archive: AIP-2026-01-25-002
# [1/4] Creating SIP... OK (30 items)
# [2/4] Generating AIP metadata... OK
# [3/4] Computing checksums... OK (30 files)
# [4/4] Verifying integrity... PASSED
#
# Archival Complete:
# - Package: AIP-2026-01-25-002
# - Size: 5.2 MB (compressed)
# - Items: 30
# - Verification: PASSED
# - Location: .aiwg/archives/AIPs/AIP-2026-01-25-002/
```

### Integrity Verification

```bash
# Verify existing archives
aiwg research archive --verify

# Output:
# Verifying archive integrity...
#
# AIP-2026-01-25-001: Verifying 30 files...
# [OK] All checksums match
#
# AIP-2026-01-24-001: Verifying 25 files...
# [OK] All checksums match
#
# Verification Summary:
# - Archives checked: 2
# - Total files: 55
# - Integrity status: PASSED (100%)
# - Last verification: 2026-01-25T10:00:00Z
```

### Reproducibility Package Export

```bash
# Create publication supplement
aiwg research provenance export --package publication-supplement

# Output:
# Creating reproducibility package...
#
# Collecting artifacts:
# - Provenance logs (W3C PROV-JSON)
# - Search strategies (PRISMA protocols)
# - Source metadata (all REF-XXX)
# - Checksums (integrity verification)
# - Software versions (AIWG, LLM, APIs)
#
# Generating reproducibility report...
# Creating README with replication instructions...
#
# Package created: reproducibility-package-2026-01-25.zip
# Size: 12.5 MB (excludes PDFs for copyright compliance)
# Location: .aiwg/research/provenance/reproducibility-package-2026-01-25.zip
```

## 11. Related Use Cases

| Use Case | Relationship | Description |
|----------|--------------|-------------|
| UC-RF-007 | Primary | Archive Research Artifacts |
| UC-RF-004 | Upstream | Integrate Citations (provides bibliography) |
| UC-RF-005 | Collaborative | Track Provenance (includes in packages) |
| UC-RF-008 | Orchestrated | Execute Research Workflow (Stage 5) |

## 12. Implementation Notes

### Architecture Considerations

1. **OAIS Compliance**: Strictly follow ISO 14721 for package structure
2. **Transactional Packaging**: All-or-nothing package creation
3. **Idempotent Operations**: Re-archiving same content updates, doesn't duplicate
4. **Storage Efficiency**: Incremental/delta archives to save space

### Performance Optimizations

1. **Parallel Checksums**: Compute checksums for multiple files concurrently
2. **Streaming Compression**: Compress while reading to avoid double I/O
3. **Incremental Archives**: Only package changed files
4. **Async Remote Sync**: Upload in background after local verification

### Security Considerations

1. **Encryption at Rest**: Encrypt remote backups with AES-256
2. **Access Control**: Read-only permissions on AIPs
3. **Integrity Monitoring**: Periodic checksum re-verification
4. **Credential Security**: Use IAM roles or secure credential storage

### Testing Strategy

| Test Type | Coverage Target | Focus Areas |
|-----------|-----------------|-------------|
| Unit Tests | 80% | Checksum calculation, metadata generation |
| Integration Tests | 70% | Package creation, remote sync |
| E2E Tests | Key workflows | Full archive creation and verification |

### Known Limitations

1. **Large Archives**: Packaging may be slow for archives >10GB
2. **Remote Latency**: Cloud uploads depend on network speed
3. **Format Obsolescence**: Long-term format support requires migration planning
4. **PDF Exclusion**: PDFs excluded from reproducibility packages (copyright)

---

## References

- @.aiwg/flows/research-framework/elaboration/use-cases/UC-RF-007-archive-research-artifacts.md
- [OAIS Reference Model (ISO 14721)](https://www.iso.org/standard/57284.html)
- [Dublin Core Metadata](https://www.dublincore.org/)
- [PREMIS Data Dictionary](https://www.loc.gov/standards/premis/)

---

## Document Metadata

**Version:** 1.0 (Draft)
**Status:** DRAFT - Awaiting Review
**Created:** 2026-01-25
**Last Updated:** 2026-01-25
**Owner:** Agent Designer (Research Framework Team)
