# Use-Case Specification: UC-RF-007

## Metadata

- ID: UC-RF-007
- Name: Archive Research Artifacts
- Owner: Requirements Analyst
- Contributors: Archival Agent, Research Framework Team
- Team: Research Framework
- Status: draft
- Created: 2026-01-25
- Updated: 2026-01-25
- Priority: P1 (High)
- Estimated Effort: M (Medium)
- Related Documents:
  - Flow: Research Framework 5-Stage Lifecycle
  - UC-RF-004: Integrate Research Sources
  - Standard: OAIS Reference Model (ISO 14721)

## 1. Use-Case Identifier and Name

**ID:** UC-RF-007
**Name:** Archive Research Artifacts

## 2. Scope and Level

**Scope:** Research Framework - Archival System
**Level:** User Goal
**System Boundary:** Archival Agent, research artifacts, OAIS packaging, backup systems

## 3. Primary Actor(s)

**Primary Actors:**
- Archival Agent: Specialized agent that packages and archives research artifacts
- User: Researcher ensuring long-term preservation
- System Scheduler: Automated periodic archival trigger

**Actor Goals:**
- Archival Agent: Create preservation-ready packages following OAIS standards
- User: Ensure research artifacts are preserved and retrievable
- System Scheduler: Maintain automated backup schedule

## 4. Stakeholders and Interests

| Stakeholder | Interest |
|------------|----------|
| User | Long-term preservation of research investments |
| Future Researchers | Access to historical research artifacts |
| Institution | Compliance with data retention policies |
| Framework Maintainer | Automated, reliable archival workflows |

## 5. Preconditions

1. Research artifacts exist in `.aiwg/research/`
2. Integration complete (UC-RF-004) OR periodic schedule triggered
3. Archival Agent has write access to archive directory
4. Archive storage available (local or remote)
5. OAIS metadata templates accessible

## 6. Postconditions

**Success:**
- Submission Information Package (SIP) created
- Archival Information Package (AIP) generated and stored
- Dissemination Information Package (DIP) available
- Archive manifest created with checksums
- Backup verification completed
- Archival metadata logged

**Failure:**
- Archival error logged with failure reason
- Partial packages cleaned up
- User notified of archival failure
- Retry scheduled (if periodic archival)

## 7. Trigger

Integration completion OR periodic schedule (daily/weekly/monthly) OR manual user request

## 8. Main Success Scenario

1. Archival trigger fires: Integration complete OR daily schedule (2 AM)
2. Archival Agent validates archival readiness:
   - Checks for new/modified artifacts since last archival
   - Identifies 15 sources documented, 12 integrated, 3 quality reports generated
   - Validates artifacts are stable (no active modifications in last 24 hours)
3. Archival Agent creates Submission Information Package (SIP):
   - **Content**: All research artifacts from `.aiwg/research/`
     - Sources: 15 source metadata files (.md)
     - Integrations: 12 integrated citations and references
     - Quality reports: 3 quality assessment reports
     - Acquisition logs: Download receipts, access records
   - **Structure**: Hierarchical directory structure
     ```
     SIP-2026-01-25-001/
     ├── content/
     │   ├── sources/
     │   ├── integrations/
     │   ├── quality/
     │   └── acquisition/
     ├── metadata/
     │   ├── descriptive.xml (Dublin Core)
     │   ├── preservation.xml (PREMIS)
     │   └── technical.xml (source formats, software dependencies)
     └── manifest.txt (checksums for all files)
     ```
   - **Metadata**: Descriptive, preservation, and technical metadata
     - Descriptive (Dublin Core): Title, creator, subject, date, identifier
     - Preservation (PREMIS): Provenance, fixity, relationships, rights
     - Technical: File formats, software requirements, dependencies
4. Archival Agent calculates fixity checksums:
   - Algorithm: SHA-256 (cryptographic hash)
   - Checksums calculated for all content files
   - Manifest file created: `manifest.txt` with format:
     ```
     SHA256 (sources/REF-001-paper.md) = a3f5b8c2...
     SHA256 (sources/REF-002-blog.md) = 9d2e4f1a...
     SHA256 (integrations/INT-001.md) = 7c6b3e9d...
     ```
5. Archival Agent creates Archival Information Package (AIP):
   - **SIP Transformation**: SIP + archival metadata → AIP
   - **AIP Structure**:
     ```
     AIP-2026-01-25-001/
     ├── SIP-2026-01-25-001/ (original SIP)
     ├── archival-metadata/
     │   ├── aip-description.xml (AIP-level metadata)
     │   ├── preservation-history.log (archival actions)
     │   └── access-rights.xml (access policies)
     └── checksum-validation.txt (verification results)
     ```
   - **Version**: AIP-2026-01-25-001 (incremental version number)
   - **Storage**: `.aiwg/archives/AIPs/AIP-2026-01-25-001/`
6. Archival Agent stores AIP:
   - **Primary Storage**: Local filesystem `.aiwg/archives/AIPs/`
   - **Secondary Storage** (optional): Remote backup (S3, Glacier, institutional repository)
   - **Permissions**: Read-only (prevent accidental modification)
   - **Compression**: Optional gzip compression for space efficiency
7. Archival Agent validates AIP integrity:
   - Re-calculates checksums for all files in AIP
   - Compares to original manifest checksums
   - Verification status: All checksums match (integrity confirmed)
   - Validation log: `.aiwg/archives/validation-logs/AIP-2026-01-25-001-validation.log`
8. Archival Agent creates Dissemination Information Package (DIP):
   - **Purpose**: User-friendly access package (subset of AIP)
   - **DIP Structure**:
     ```
     DIP-2026-01-25-001/
     ├── README.md (access guide, citation instructions)
     ├── sources/ (readable markdown files)
     ├── integrations/ (citation lists, reference maps)
     └── index.html (browsable web interface, optional)
     ```
   - **Format**: Markdown + HTML for easy access
   - **Storage**: `.aiwg/archives/DIPs/DIP-2026-01-25-001/`
9. Archival Agent generates archive manifest:
   - **Manifest File**: `.aiwg/archives/archive-manifest.json`
   - **Manifest Content**:
     ```json
     {
       "archive_version": "1.0",
       "created_date": "2026-01-25T02:00:00Z",
       "packages": [
         {
           "package_id": "AIP-2026-01-25-001",
           "package_type": "AIP",
           "creation_date": "2026-01-25T02:00:00Z",
           "item_count": 30,
           "total_size_bytes": 5242880,
           "checksum_algorithm": "SHA-256",
           "verification_status": "PASSED",
           "storage_location": ".aiwg/archives/AIPs/AIP-2026-01-25-001/"
         }
       ]
     }
     ```
10. Archival Agent logs archival action:
    - **Log File**: `.aiwg/archives/archival-history.log`
    - **Log Entry**:
      ```
      [2026-01-25 02:00:15] ARCHIVAL_START: AIP-2026-01-25-001
      [2026-01-25 02:00:18] SIP_CREATED: 30 items, 5.0 MB
      [2026-01-25 02:00:22] AIP_GENERATED: Version 1, SHA-256 checksums
      [2026-01-25 02:00:25] INTEGRITY_VERIFIED: All checksums match
      [2026-01-25 02:00:28] DIP_CREATED: User-accessible package
      [2026-01-25 02:00:30] ARCHIVAL_COMPLETE: AIP-2026-01-25-001
      ```
11. Archival Agent applies retention policy:
    - **Policy**: Keep all AIPs permanently (research data retention)
    - **SIP Cleanup**: Delete SIP after AIP verification (optional, space-saving)
    - **DIP Refresh**: Update DIP if AIP modified (maintain consistency)
12. Archival Agent reports archival summary:
    - "Archival Complete: AIP-2026-01-25-001"
    - "Items Archived: 30 (15 sources, 12 integrations, 3 quality reports)"
    - "Total Size: 5.0 MB"
    - "Verification Status: PASSED (all checksums valid)"
    - "Access Package: DIP-2026-01-25-001 available"
13. User reviews archival summary and confirms successful archival
14. Periodic schedule updates: Next archival scheduled for 2026-01-26 02:00 AM

## 9. Alternate Flows

### Alt-1: Incremental Archival (Delta Packaging)

**Branch Point:** Step 2 (Archival Agent validates archival readiness)
**Condition:** Only 3 new sources since last archival (not full re-archival)

**Flow:**
1. Archival Agent detects incremental changes:
   - Last archival: AIP-2026-01-24-001 (yesterday)
   - New items since last archival: 3 sources, 1 integration
   - Unchanged items: 12 sources, 11 integrations (already archived)
2. Archival Agent creates incremental SIP:
   - **SIP Type**: Delta SIP (only new/modified items)
   - **Content**: 3 new sources + 1 new integration
   - **Reference**: Links to previous AIP-2026-01-24-001 for unchanged items
3. Archival Agent creates incremental AIP:
   - **AIP ID**: AIP-2026-01-25-001-delta
   - **Structure**: Delta AIP + reference to base AIP
   - **Relationship**: `is_supplement_to: AIP-2026-01-24-001`
4. Archival Agent stores delta AIP and updates manifest
5. Archival Agent provides reconstitution instructions:
   - "Full Archive Reconstitution: Combine AIP-2026-01-24-001 + AIP-2026-01-25-001-delta"
6. **Resume Main Flow:** Step 7 (Archival Agent validates AIP integrity)

### Alt-2: Remote Archival (Cloud Backup)

**Branch Point:** Step 6 (Archival Agent stores AIP)
**Condition:** Remote backup configured (S3, Glacier, institutional repository)

**Flow:**
1. Archival Agent stores AIP locally (primary storage)
2. Archival Agent initiates remote backup:
   - **Destination**: AWS S3 bucket `s3://research-archives/`
   - **Transfer**: Upload AIP-2026-01-25-001/ directory
   - **Encryption**: AES-256 encryption in transit and at rest
3. Remote backup progress:
   - Uploading: 5.0 MB (estimated time: 30 seconds)
   - Upload complete: Received ETag from S3
4. Archival Agent verifies remote backup:
   - Calculate checksum of remote AIP
   - Compare to local AIP checksum
   - Verification: Remote checksum matches local (backup verified)
5. Archival Agent updates manifest with remote location:
   - `storage_location_primary: ".aiwg/archives/AIPs/AIP-2026-01-25-001/"`
   - `storage_location_remote: "s3://research-archives/AIP-2026-01-25-001/"`
   - `backup_verified: true`
6. **Resume Main Flow:** Step 8 (Archival Agent creates DIP)

### Alt-3: Manual Archival Request (User-Initiated)

**Branch Point:** Step 1 (Archival trigger fires)
**Condition:** User manually requests archival before scheduled time

**Flow:**
1. User invokes: `/archive-research --immediate`
2. Archival Agent checks for archivable content:
   - 5 sources documented today (not yet archived)
   - 2 integrations completed today (not yet archived)
3. Archival Agent prompts user:
   - "Create immediate archive? (y/n)"
   - "Items to archive: 7 (5 sources, 2 integrations)"
   - "Note: Scheduled archival in 8 hours"
4. User confirms: "Yes, create immediate archive"
5. Archival Agent creates AIP-2026-01-25-002 (second archive today)
6. Archival Agent updates schedule:
   - "Immediate archive created: AIP-2026-01-25-002"
   - "Next scheduled archival: 2026-01-26 02:00 AM (unchanged)"
7. **Resume Main Flow:** Step 3 (Archival Agent creates SIP)

## 10. Exception Flows

### Exc-1: Integrity Verification Failure

**Trigger:** Step 7 (Archival Agent validates AIP integrity)
**Condition:** Checksum mismatch detected (data corruption)

**Flow:**
1. Archival Agent re-calculates checksums for AIP files
2. Checksum comparison:
   - Original manifest: `SHA256 (sources/REF-003.md) = a3f5b8c2...`
   - AIP checksum: `SHA256 (sources/REF-003.md) = 9d2e4f1a...` (MISMATCH)
3. Archival Agent detects corruption
4. Archival Agent generates error report:
   - "Integrity Verification FAILED: AIP-2026-01-25-001"
   - "Corrupted File: sources/REF-003.md"
   - "Action: Retry archival from original artifacts"
5. Archival Agent deletes corrupted AIP (cleanup)
6. Archival Agent retries archival from original artifacts
7. If retry successful: **Resume Main Flow:** Step 8 (Create DIP)
8. If retry fails: Alert user, log critical error, abort archival

### Exc-2: Storage Space Exhausted

**Trigger:** Step 6 (Archival Agent stores AIP)
**Condition:** Insufficient disk space for AIP storage

**Flow:**
1. Archival Agent attempts to write AIP to `.aiwg/archives/AIPs/`
2. Disk write error: "No space left on device"
3. Archival Agent checks available disk space:
   - Available: 100 MB
   - Required: 5.0 MB (AIP size) + 1.0 MB (DIP) + 100 MB buffer = 106 MB
   - Insufficient space detected
4. Archival Agent generates storage error:
   - "Archival FAILED: Insufficient disk space"
   - "Available: 100 MB, Required: 106 MB"
   - "Action: Free disk space or configure remote archival"
5. Archival Agent cleans up partial AIP (delete incomplete package)
6. Archival Agent prompts user:
   - "Options:"
   - "1. Free disk space (delete old AIPs, move to external storage)"
   - "2. Configure remote archival (S3, Glacier)"
   - "3. Reduce AIP size (compress, selective archival)"
7. User chooses remediation action
8. Archival retry scheduled after remediation

### Exc-3: Metadata Generation Failure

**Trigger:** Step 3 (Archival Agent creates SIP - metadata generation)
**Condition:** Missing required metadata for Dublin Core/PREMIS

**Flow:**
1. Archival Agent attempts to generate descriptive metadata
2. Dublin Core field missing: `dc:creator` (author/creator required)
3. Archival Agent checks source metadata:
   - Author field: Empty in source REF-007.md
   - Creator cannot be determined automatically
4. Archival Agent generates metadata gap report:
   - "Metadata Incomplete: Cannot create archival package"
   - "Missing Field: dc:creator (Dublin Core)"
   - "Source: REF-007.md"
   - "Action: Complete source metadata before archival"
5. Archival Agent prompts user:
   - "Provide missing metadata:"
   - "Creator/Author for REF-007.md: _______"
6. User provides: "John Doe, Research Institution"
7. Archival Agent updates source metadata
8. **Resume Main Flow:** Step 3 (Archival Agent creates SIP with complete metadata)

### Exc-4: Remote Backup Failure

**Trigger:** Alt-2 Step 2 (Remote backup upload)
**Condition:** Network failure during remote upload

**Flow:**
1. Archival Agent initiates S3 upload
2. Upload progress: 2.5 MB / 5.0 MB (50%)
3. Network error: Connection timeout
4. Archival Agent detects upload failure
5. Archival Agent retries upload (3 attempts):
   - Retry 1: Failed (timeout)
   - Retry 2: Failed (timeout)
   - Retry 3: Failed (timeout)
6. All retries exhausted
7. Archival Agent logs remote backup failure:
   - "Remote Backup FAILED: AIP-2026-01-25-001"
   - "Destination: s3://research-archives/"
   - "Cause: Network timeout (3 retries exhausted)"
   - "Fallback: Local backup only"
8. Archival Agent updates manifest:
   - `storage_location_primary: ".aiwg/archives/AIPs/AIP-2026-01-25-001/"`
   - `storage_location_remote: null`
   - `backup_verified: false`
   - `backup_status: "FAILED - Network timeout"`
9. Archival Agent schedules remote backup retry for next archival cycle
10. **Resume Main Flow:** Step 8 (Create DIP with local-only archival)

## 11. Special Requirements

### Performance Requirements

| Requirement | Target | Rationale |
|------------|--------|-----------|
| NFR-AR-01: Archival time | <5 minutes for 1 GB artifacts | Efficiency (no workflow blocking) |
| NFR-AR-02: Verification time | <2 minutes for 1 GB package | Reliability (thorough integrity check) |

### Reliability Requirements

| Requirement | Target | Rationale |
|------------|--------|-----------|
| NFR-AR-03: Integrity verification | 100% checksum validation | Data integrity (zero tolerance for corruption) |
| NFR-AR-04: Backup redundancy | 2+ copies (local + remote) | Disaster recovery |

### Compliance Requirements

| Requirement | Target | Rationale |
|------------|--------|-----------|
| NFR-AR-05: OAIS compliance | 100% adherence to ISO 14721 | Standards compliance |
| NFR-AR-06: Metadata completeness | All required Dublin Core/PREMIS fields | Discoverability, preservation |

## 12. Related Business Rules

**BR-AR-001: Archive Versioning**
- Daily archives: AIP-YYYY-MM-DD-NNN (incremental number)
- Incremental archives: AIP-YYYY-MM-DD-NNN-delta
- Full re-archives: Every 30 days (consolidate deltas)

**BR-AR-002: Retention Policy**
- AIPs: Permanent retention (critical research data)
- SIPs: Delete after AIP verification (space-saving, optional)
- DIPs: Refresh when AIP updated (maintain consistency)
- Validation logs: Retain for 1 year (audit trail)

**BR-AR-003: Checksum Algorithm**
- Primary: SHA-256 (cryptographic strength)
- Fallback: MD5 (legacy compatibility, not recommended)
- Re-verification: Annual checksum validation for all AIPs

**BR-AR-004: Storage Tiers**
- Tier 1: Local filesystem (fast access, primary)
- Tier 2: Remote cloud (S3 Standard) (durability, secondary)
- Tier 3: Glacier/Deep Archive (long-term, lowest cost, tertiary)

## 13. Data Requirements

### Input Data

| Data Element | Format | Source | Validation |
|-------------|--------|---------|-----------|
| Research Artifacts | Markdown, PDF, JSON | `.aiwg/research/` | Valid file formats |
| Source Metadata | YAML frontmatter | Source files | Required fields present |
| Acquisition Logs | JSON | `.aiwg/research/acquisition/` | Valid JSON schema |
| Quality Reports | Markdown | `.aiwg/research/quality/` | Valid report format |

### Output Data

| Data Element | Format | Destination | Retention |
|-------------|--------|-------------|----------|
| AIP | Directory structure + metadata | `.aiwg/archives/AIPs/` | Permanent |
| DIP | Markdown + HTML | `.aiwg/archives/DIPs/` | Permanent (refresh on update) |
| Archive Manifest | JSON | `.aiwg/archives/archive-manifest.json` | Permanent |
| Validation Logs | Text log | `.aiwg/archives/validation-logs/` | 1 year |
| Archival History | Text log | `.aiwg/archives/archival-history.log` | Permanent |

## 14. Open Issues and TODOs

1. **Issue 001: Long-Term Format Preservation**
   - Description: How to handle format obsolescence (e.g., markdown variants)?
   - Impact: Future accessibility may be compromised
   - Mitigation: Include format migration plan in preservation metadata
   - Owner: Archival Agent
   - Due Date: Elaboration phase

2. **TODO 001: Automated Format Migration**
   - Description: Periodically migrate AIPs to current standard formats
   - Enhancement: Detect format obsolescence, trigger migration
   - Assigned: Archival Agent
   - Due Date: Version 2.0

3. **TODO 002: Archive Compression Optimization**
   - Description: Experiment with compression algorithms (gzip, zstd, bzip2)
   - Benefit: Reduced storage costs, faster transfers
   - Assigned: Archival Agent
   - Due Date: Version 1.1

## 15. References

- [UC-RF-004: Integrate Research Sources](.aiwg/flows/research-framework/elaboration/use-cases/UC-RF-004-integrate-sources.md)
- [OAIS Reference Model (ISO 14721)](https://www.iso.org/standard/57284.html) - Archival standard
- [Dublin Core Metadata](https://www.dublincore.org/) - Descriptive metadata standard
- [PREMIS Data Dictionary](https://www.loc.gov/standards/premis/) - Preservation metadata standard
- Archival Agent Definition (to be created)

---

## Traceability Matrix

### Requirements Traceability

| Requirement ID | Source | Implementation | Test Case |
|---------------|---------|----------------|-----------|
| Archival System | Research Framework Inception | Archival Agent | TC-RF-007-001 through TC-RF-007-015 |
| OAIS Compliance | Framework Requirements | SIP/AIP/DIP packaging | TC-RF-007-003, TC-RF-007-004 |
| Integrity Verification | Framework Requirements | Checksum validation | TC-RF-007-005, TC-RF-007-006 |

### SAD Component Mapping

**Primary Components:**
- Archival Agent (specialized packaging agent)
- OAIS Package Builder (SIP/AIP/DIP generation)
- Integrity Validator (checksum verification)

---

## Acceptance Criteria

### AC-001: Basic Archival Workflow

**Given:** Research artifacts ready for archival
**When:** Archival triggered (integration complete OR scheduled)
**Then:**
- SIP created with all artifacts
- AIP generated and stored
- DIP created for access
- All checksums validated
- Archive manifest updated

### AC-002: OAIS Package Structure

**Given:** Archival Agent creates AIP
**When:** AIP generation completes
**Then:**
- SIP embedded in AIP
- Archival metadata included (preservation history, access rights)
- Checksum validation results documented
- AIP version number assigned
- Storage location recorded

### AC-003: Integrity Verification

**Given:** AIP stored successfully
**When:** Verification performed
**Then:**
- All file checksums re-calculated
- Checksums match original manifest (100% accuracy)
- Verification status: PASSED
- Validation log generated

### AC-004: Incremental Archival

**Given:** Only 3 new sources since last archival
**When:** Incremental archival triggered
**Then:**
- Delta SIP created (only new items)
- Delta AIP generated with reference to base AIP
- Reconstitution instructions provided
- Storage optimized (avoid duplicating unchanged items)

### AC-005: Remote Backup

**Given:** Remote archival configured
**When:** AIP stored locally
**Then:**
- Remote backup initiated (S3, Glacier)
- Upload completed with encryption
- Remote checksum verified against local
- Manifest updated with remote location

---

## Test Cases

### TC-RF-007-001: Basic Archival Workflow

**Objective:** Validate end-to-end archival process
**Preconditions:** 15 sources documented, 12 integrated
**Test Steps:**
1. Trigger archival: Integration complete
2. Verify SIP created with 30 items
3. Verify AIP generated with metadata
4. Verify DIP created for access
5. Verify checksums validated (all match)
6. Verify manifest updated
**Expected Result:** Complete archival in <5 minutes
**Pass/Fail:** PASS if all packages created and verified

### TC-RF-007-002: SIP Creation

**Objective:** Validate Submission Information Package structure
**Preconditions:** Research artifacts ready
**Test Steps:**
1. Archival Agent creates SIP
2. Verify SIP structure: content/, metadata/, manifest.txt
3. Verify content includes: sources, integrations, quality reports
4. Verify metadata includes: Dublin Core, PREMIS, technical
5. Verify manifest includes SHA-256 checksums
**Expected Result:** Valid SIP structure
**Pass/Fail:** PASS if SIP structure correct

### TC-RF-007-003: AIP Generation

**Objective:** Validate Archival Information Package creation
**Preconditions:** SIP created successfully
**Test Steps:**
1. Archival Agent transforms SIP to AIP
2. Verify AIP structure: SIP/ + archival-metadata/
3. Verify archival metadata: aip-description.xml, preservation-history.log
4. Verify AIP version: AIP-2026-01-25-001
5. Verify storage location: `.aiwg/archives/AIPs/`
**Expected Result:** Valid AIP with archival metadata
**Pass/Fail:** PASS if AIP structure correct

### TC-RF-007-004: DIP Creation

**Objective:** Validate Dissemination Information Package
**Preconditions:** AIP stored successfully
**Test Steps:**
1. Archival Agent creates DIP from AIP
2. Verify DIP structure: README.md, sources/, integrations/
3. Verify DIP format: Markdown + HTML (user-friendly)
4. Verify DIP storage: `.aiwg/archives/DIPs/`
5. Verify access guide: README.md with citation instructions
**Expected Result:** User-accessible DIP package
**Pass/Fail:** PASS if DIP accessible and well-formatted

### TC-RF-007-005: Checksum Validation - Success

**Objective:** Validate integrity verification with matching checksums
**Preconditions:** AIP created with manifest
**Test Steps:**
1. Archival Agent re-calculates checksums for all AIP files
2. Compare to original manifest checksums
3. Verify all checksums match
4. Verify verification status: PASSED
5. Verify validation log created
**Expected Result:** 100% checksum match
**Pass/Fail:** PASS if all checksums match

### TC-RF-007-006: Checksum Validation - Failure

**Objective:** Validate detection of data corruption
**Preconditions:** Simulated checksum mismatch
**Test Steps:**
1. Modify AIP file after creation (simulate corruption)
2. Archival Agent re-calculates checksums
3. Verify mismatch detected
4. Verify error report generated
5. Verify corrupted AIP deleted
6. Verify retry initiated
**Expected Result:** Corruption detected, retry triggered
**Pass/Fail:** PASS if corruption detected and handled

### TC-RF-007-007: Incremental Archival

**Objective:** Validate delta packaging for efficiency
**Preconditions:** Previous AIP exists, 3 new sources added
**Test Steps:**
1. Trigger archival with 3 new sources
2. Verify delta SIP created (only 3 sources)
3. Verify delta AIP references base AIP
4. Verify relationship documented: `is_supplement_to`
5. Verify reconstitution instructions provided
**Expected Result:** Delta AIP with reference to base
**Pass/Fail:** PASS if delta packaging correct

### TC-RF-007-008: Remote Backup - Success

**Objective:** Validate remote archival to S3
**Preconditions:** S3 bucket configured, network available
**Test Steps:**
1. Archival Agent stores AIP locally
2. Initiate remote backup to S3
3. Verify upload completes
4. Verify remote checksum matches local
5. Verify manifest updated with remote location
6. Verify backup_verified: true
**Expected Result:** Remote backup verified
**Pass/Fail:** PASS if remote backup successful

### TC-RF-007-009: Remote Backup - Failure

**Objective:** Validate handling of remote backup failure
**Preconditions:** Network unavailable
**Test Steps:**
1. Simulate network failure during S3 upload
2. Verify upload fails
3. Verify retry attempts (3 retries)
4. Verify all retries fail
5. Verify fallback to local-only archival
6. Verify manifest: backup_status: "FAILED"
7. Verify retry scheduled
**Expected Result:** Graceful fallback to local archival
**Pass/Fail:** PASS if local archival completes despite remote failure

### TC-RF-007-010: Storage Space Exception

**Objective:** Validate handling of insufficient disk space
**Preconditions:** Disk space <AIP size
**Test Steps:**
1. Mock disk space exhaustion
2. Archival Agent attempts to store AIP
3. Verify write error detected
4. Verify error message: "Insufficient disk space"
5. Verify partial AIP cleaned up
6. Verify remediation options provided
**Expected Result:** Error handled, remediation prompted
**Pass/Fail:** PASS if error handled gracefully

### TC-RF-007-011: Metadata Completeness Validation

**Objective:** Validate detection of incomplete metadata
**Preconditions:** Source missing dc:creator field
**Test Steps:**
1. Archival Agent attempts to generate Dublin Core metadata
2. Verify missing field detected
3. Verify metadata gap report generated
4. Verify user prompted for missing field
5. User provides creator information
6. Verify archival resumes successfully
**Expected Result:** Metadata gap handled with user input
**Pass/Fail:** PASS if metadata completed and archival succeeds

### TC-RF-007-012: Archive Manifest Generation

**Objective:** Validate archive manifest structure
**Preconditions:** AIP created successfully
**Test Steps:**
1. Archival Agent generates archive manifest
2. Verify manifest file: `.aiwg/archives/archive-manifest.json`
3. Verify manifest fields: package_id, creation_date, item_count, total_size_bytes, checksum_algorithm, verification_status
4. Verify manifest JSON schema valid
5. Verify manifest includes storage locations
**Expected Result:** Valid archive manifest
**Pass/Fail:** PASS if manifest structure correct

### TC-RF-007-013: Archival History Logging

**Objective:** Validate archival action logging
**Preconditions:** Archival workflow executing
**Test Steps:**
1. Monitor archival history log during workflow
2. Verify log entries: ARCHIVAL_START, SIP_CREATED, AIP_GENERATED, INTEGRITY_VERIFIED, DIP_CREATED, ARCHIVAL_COMPLETE
3. Verify timestamps for each action
4. Verify log file: `.aiwg/archives/archival-history.log`
5. Verify log retention: Permanent
**Expected Result:** Complete audit trail
**Pass/Fail:** PASS if all actions logged

### TC-RF-007-014: Periodic Archival Schedule

**Objective:** Validate scheduled archival trigger
**Preconditions:** Daily schedule configured (2 AM)
**Test Steps:**
1. Set system time to 2026-01-25 02:00:00
2. Verify scheduled trigger fires
3. Verify archival workflow executes
4. Verify AIP created: AIP-2026-01-25-001
5. Verify next schedule updated: 2026-01-26 02:00:00
**Expected Result:** Scheduled archival executes automatically
**Pass/Fail:** PASS if schedule triggers archival

### TC-RF-007-015: End-to-End Archival with Remote Backup

**Objective:** Validate complete archival workflow with all features
**Preconditions:** Research artifacts ready, S3 configured
**Test Steps:**
1. Trigger archival: `/archive-research`
2. Verify SIP creation (30 items)
3. Verify AIP generation with metadata
4. Verify local storage successful
5. Verify remote backup to S3
6. Verify integrity validation (all checksums match)
7. Verify DIP creation for access
8. Verify manifest updated
9. Verify archival history logged
**Expected Result:** Complete archival with local + remote backup
**Pass/Fail:** PASS if all steps complete successfully

---

## Document Metadata

**Version:** 1.0 (Initial Draft)
**Status:** DRAFT
**Created:** 2026-01-25
**Last Updated:** 2026-01-25
**Word Count:** 5,684 words
**Quality Score:** (To be assessed)

**Next Actions:**
1. Review use case with Archival Agent domain expert
2. Implement test cases TC-RF-007-001 through TC-RF-007-015
3. Create Archival Agent definition
4. Define OAIS packaging templates
5. Integrate with Research Framework workflow

---

**Generated:** 2026-01-25
**Owner:** Requirements Analyst (Research Framework)
**Status:** DRAFT - Pending Review
