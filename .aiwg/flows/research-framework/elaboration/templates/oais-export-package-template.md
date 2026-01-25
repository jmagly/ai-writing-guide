# OAIS Export Package Specification

## Overview

This template defines the structure for research artifact export packages following the **OAIS (Open Archival Information System)** reference model. OAIS defines three package types:

- **SIP (Submission Information Package):** Content submitted for archival
- **AIP (Archival Information Package):** Content stored for long-term preservation
- **DIP (Dissemination Information Package):** Content distributed to users

**AIWG Implementation:** This template focuses on **DIP (Dissemination Information Package)** for reproducibility and **AIP (Archival Information Package)** for long-term preservation.

---

## Package Metadata

```yaml
---
package_type: DIP  # DIP (dissemination) or AIP (archival)
package_id: aiwg-research-export-YYYYMMDD-HHMMSS
package_version: 1.0.0
creation_date: YYYY-MM-DDTHH:MM:SSZ
creator: archival-agent
oais_compliant: true
oais_version: "ISO 14721:2012"
project: aiwg-research-framework
corpus_size: 25  # Number of sources
export_purpose: publication-supplement | archival | reproducibility | sharing
retention_period: permanent | 5-years | project-lifetime
---
```

## OAIS Information Model

### 1. Content Information

**Definition:** The data being preserved plus its Representation Information

#### Data Object (Digital Content)
- Research sources (REF-XXX metadata, summaries, extractions)
- AIWG documentation (architecture, use cases)
- Provenance logs (W3C PROV-JSON)
- Claims index
- Gap analysis reports
- Quality assessments

#### Representation Information
- **Structure:** File formats (Markdown, JSON, PDF)
- **Semantic:** Data schemas, controlled vocabularies
- **Software:** Required tools (AIWG CLI, LLM models)
- **Documentation:** README, usage guides

### 2. Preservation Description Information (PDI)

#### Provenance
- Creation history (who, when, how)
- Modification history (versions, changes)
- Source attribution (original creators)

#### Context
- Research project description
- Intended use case
- Related projects

#### Reference
- Identifiers (DOIs, REF-XXX)
- Citations
- External references

#### Fixity
- Checksums (SHA-256)
- File integrity validation
- Verification procedures

### 3. Descriptive Information
- Title, abstract, keywords
- Authors, contributors
- Date, version
- Subject classification

### 4. Packaging Information
- Package structure (directory layout)
- File manifest
- Relationships between files

---

## DIP (Dissemination Information Package) Structure

**Purpose:** Share research corpus for reproducibility, publication supplements, or external collaboration

```
aiwg-research-export-YYYYMMDD-HHMMSS/
├── README.md                           # Package overview and usage
├── MANIFEST.txt                        # File listing with checksums
├── package-metadata.json               # OAIS package metadata
│
├── content/                            # Content Information
│   ├── sources/                        # Research sources
│   │   ├── metadata/                   # Source metadata (REF-XXX)
│   │   │   ├── REF-001-metadata.json
│   │   │   ├── REF-002-metadata.json
│   │   │   └── ...
│   │   ├── pdfs/                       # Source PDFs (excluded due to copyright)
│   │   │   └── NOTE-pdfs-excluded.txt  # Explanation of exclusion
│   │   └── REF-XXX.md                  # Source documentation files
│   │
│   ├── knowledge/                      # Documented knowledge
│   │   ├── summaries/                  # Paper summaries
│   │   │   ├── REF-001-summary.md
│   │   │   └── ...
│   │   ├── extractions/                # Structured data extractions
│   │   │   ├── REF-001-extraction.json
│   │   │   └── ...
│   │   ├── notes/                      # Literature notes (Zettelkasten)
│   │   │   ├── REF-001-literature-note.md
│   │   │   └── ...
│   │   └── maps/                       # Maps of Content
│   │       ├── llm-evaluation-methods.md
│   │       └── ...
│   │
│   ├── analysis/                       # Analysis artifacts
│   │   ├── claims-index.md             # All claims with backing
│   │   ├── gap-analysis-report.md      # Gap analysis
│   │   └── quality/                    # Quality assessments
│   │       ├── REF-001-quality-report.md
│   │       └── ...
│   │
│   └── aiwg-documentation/             # AIWG docs (optional - only cited sections)
│       ├── architecture-excerpts.md    # Relevant architecture sections
│       └── use-case-excerpts.md        # Relevant use cases
│
├── provenance/                         # Preservation Description Information (Provenance)
│   ├── prov-logs/                      # W3C PROV-JSON logs
│   │   ├── prov-2026-01-25.json
│   │   └── ...
│   ├── lineage-graph.json              # Artifact dependency graph
│   ├── workflow-status.md              # Final workflow status
│   └── agent-manifest.json             # Agent versions used
│
├── representation-info/                # Representation Information
│   ├── schemas/                        # Data schemas
│   │   ├── ref-metadata-schema.json
│   │   ├── extraction-schema.json
│   │   ├── prov-schema.json
│   │   └── ...
│   ├── vocabularies/                   # Controlled vocabularies
│   │   ├── tags-taxonomy.yaml
│   │   └── publication-types.yaml
│   └── software-requirements.md        # Required software versions
│
├── descriptive-info/                   # Descriptive Information
│   ├── abstract.md                     # Package abstract
│   ├── keywords.txt                    # Subject keywords
│   ├── contributors.json               # Authors and contributors
│   └── bibliography.bib                # BibTeX bibliography
│
└── fixity/                             # Fixity Information
    ├── checksums-sha256.txt            # SHA-256 hashes for all files
    ├── checksums-md5.txt               # MD5 hashes (optional)
    └── verify.sh                       # Checksum verification script
```

### File Count and Size Estimates

| Category | Files | Size (Approx) |
|----------|-------|---------------|
| Source metadata | 25 | 500 KB |
| Summaries | 25 | 1 MB |
| Extractions | 25 | 250 KB |
| Literature notes | 25 | 1.5 MB |
| Quality reports | 25 | 750 KB |
| Provenance logs | 5-10 | 500 KB |
| Schemas/docs | 10-15 | 200 KB |
| **Total (without PDFs)** | **~160** | **~5 MB** |

**Note:** PDFs excluded due to copyright restrictions. Users can acquire PDFs independently using provided metadata.

---

## AIP (Archival Information Package) Structure

**Purpose:** Long-term preservation (5+ years), institutional repositories

**Differences from DIP:**
- **Includes PDFs** (if copyright allows, or with license agreements)
- **More comprehensive metadata** (preservation-specific)
- **Redundant checksums** (multiple hash algorithms)
- **Migration plans** (format obsolescence mitigation)

```
aiwg-research-archive-YYYYMMDD-HHMMSS/
├── [Same as DIP structure]
│
├── content/
│   ├── sources/
│   │   └── pdfs/                       # PDFs INCLUDED for archival
│   │       ├── REF-001-paper.pdf
│   │       └── ...
│
├── preservation/                       # Additional preservation metadata
│   ├── format-registry.json            # File format specifications
│   ├── migration-plan.md               # Format migration strategy
│   ├── retention-policy.md             # Retention schedule
│   └── audit-log.json                  # Access/modification history
│
└── fixity/
    ├── checksums-sha256.txt
    ├── checksums-sha512.txt            # Stronger hash for long-term
    └── checksums-md5.txt
```

---

## Core Files Specification

### README.md

```markdown
# AIWG Research Corpus Export Package

**Package ID:** aiwg-research-export-YYYYMMDD-HHMMSS
**Package Type:** DIP (Dissemination Information Package)
**Created:** YYYY-MM-DD
**Version:** 1.0.0
**Corpus Size:** 25 research sources

## Overview

This package contains a complete export of the AIWG Research Framework corpus for reproducibility and research validation. The package follows the OAIS (Open Archival Information System) reference model for standardized archival and dissemination.

## Contents

- **content/sources/**: Research source metadata and documentation (25 sources)
- **content/knowledge/**: Summaries, extractions, literature notes
- **content/analysis/**: Claims index, gap analysis, quality assessments
- **provenance/**: W3C PROV-compliant provenance logs
- **representation-info/**: Data schemas and software requirements
- **fixity/**: Checksums and verification tools

**Note:** PDFs are excluded due to copyright restrictions. Metadata includes DOIs and URLs for independent acquisition.

## Usage

### 1. Verify Package Integrity

```bash
cd fixity/
./verify.sh
```

All checksums should match. If any mismatches, package may be corrupted.

### 2. Review Corpus

- **Start with:** `content/analysis/gap-analysis-report.md` (corpus overview)
- **Explore sources:** `content/sources/` (REF-XXX metadata)
- **Read summaries:** `content/knowledge/summaries/`

### 3. Replicate Findings

Follow provenance logs in `provenance/prov-logs/` to replicate research workflow:

1. Discovery: See original search queries in provenance
2. Acquisition: Acquire sources using metadata (DOIs, URLs)
3. Documentation: Summaries and extractions provided
4. Integration: Claims index shows citation backing

### 4. Validate Quality

Review quality assessments in `content/analysis/quality/` for GRADE ratings and FAIR compliance scores.

## Software Requirements

See `representation-info/software-requirements.md` for required tools:
- AIWG CLI v1.0.0+
- LLM API (Claude Opus 4 or equivalent)
- Standard Unix tools (jq, git)

## Citation

If using this corpus in research, please cite:

> [Your Name]. (YYYY). "AIWG Research Framework Corpus." AIWG Export Package v1.0.0. [DOI or URL]

## Contact

[Maintainer contact information]

## License

- **Metadata and Analysis:** CC-BY 4.0 (Creative Commons Attribution)
- **Source PDFs:** See individual source licenses (not included in this package)
- **Software:** MIT License (AIWG CLI)
```

---

### MANIFEST.txt

```
# AIWG Research Export Package Manifest
# Package ID: aiwg-research-export-YYYYMMDD-HHMMSS
# Created: YYYY-MM-DD HH:MM:SS
# Total Files: 160
# Total Size: 5.2 MB

# Format: SHA256 | Size (bytes) | Path

e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855 1234 README.md
a3f8c9e2d1b4567890abcdef1234567890abcdef1234567890abcdef12345678 2345 package-metadata.json
f7c3bc1d808e04732adf679965ccc34ca7ae3441808e04732adf679965ccc34c 3456 content/sources/metadata/REF-001-metadata.json
[... one line per file ...]

# Verification:
# Run: sha256sum -c MANIFEST.txt
# Or use: ./fixity/verify.sh
```

---

### package-metadata.json

```json
{
  "package_id": "aiwg-research-export-YYYYMMDD-HHMMSS",
  "package_type": "DIP",
  "package_version": "1.0.0",
  "oais_compliant": true,
  "oais_version": "ISO 14721:2012",
  "creation_date": "YYYY-MM-DDTHH:MM:SSZ",
  "creator": {
    "agent": "archival-agent",
    "version": "1.0.0",
    "user": "jmagly"
  },
  "project": {
    "name": "AIWG Research Framework",
    "version": "1.0.0",
    "repository": "https://github.com/jmagly/ai-writing-guide"
  },
  "corpus": {
    "size": 25,
    "date_range": "2022-2024",
    "topics": [
      "multi-agent systems",
      "llm applications",
      "prompt engineering",
      "ai safety"
    ],
    "quality_distribution": {
      "high": 15,
      "moderate": 8,
      "low": 2
    }
  },
  "export_purpose": "publication-supplement",
  "retention_period": "permanent",
  "content_information": {
    "sources": 25,
    "summaries": 25,
    "extractions": 25,
    "literature_notes": 25,
    "quality_reports": 25,
    "claims_tracked": 50,
    "claims_backed": 48
  },
  "preservation_description": {
    "provenance_logs": 8,
    "lineage_graph_nodes": 65,
    "w3c_prov_compliant": true
  },
  "fixity": {
    "checksum_algorithm": "SHA-256",
    "total_files": 160,
    "total_size_bytes": 5452800,
    "verification_date": "YYYY-MM-DDTHH:MM:SSZ"
  },
  "representation_information": {
    "formats": [
      "Markdown",
      "JSON",
      "YAML",
      "BibTeX"
    ],
    "schemas_included": true,
    "software_requirements": "representation-info/software-requirements.md"
  },
  "descriptive_information": {
    "title": "AIWG Research Framework Corpus - Multi-Agent Systems for SDLC",
    "abstract": "This corpus documents 25 research sources on multi-agent systems, LLM applications, and AI safety, curated for the AIWG Research Framework project.",
    "keywords": [
      "multi-agent systems",
      "large language models",
      "software development lifecycle",
      "ai safety",
      "prompt engineering"
    ],
    "contributors": [
      "John Magly (Curator)",
      "Claude Opus 4.5 (Documentation Agent)"
    ]
  },
  "license": {
    "metadata": "CC-BY-4.0",
    "software": "MIT",
    "pdfs": "See individual source licenses (not included)"
  },
  "contact": {
    "email": "maintainer@example.com",
    "repository": "https://github.com/jmagly/ai-writing-guide/issues"
  }
}
```

---

### fixity/verify.sh

```bash
#!/bin/bash
# AIWG Research Package Integrity Verification Script
# Package: aiwg-research-export-YYYYMMDD-HHMMSS

set -e

echo "=== AIWG Research Package Integrity Verification ==="
echo "Package ID: aiwg-research-export-YYYYMMDD-HHMMSS"
echo "Verification started: $(date)"
echo ""

# Change to package root directory
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_ROOT="$(dirname "$SCRIPT_DIR")"
cd "$PACKAGE_ROOT"

# Verify SHA-256 checksums
echo "[1/3] Verifying SHA-256 checksums..."
if sha256sum -c fixity/checksums-sha256.txt --quiet; then
    echo "✅ SHA-256 verification: PASSED (all files match)"
else
    echo "❌ SHA-256 verification: FAILED (one or more files corrupted)"
    exit 1
fi

# Verify file count
echo ""
echo "[2/3] Verifying file count..."
EXPECTED_FILES=160
ACTUAL_FILES=$(find . -type f | wc -l)
if [ "$ACTUAL_FILES" -eq "$EXPECTED_FILES" ]; then
    echo "✅ File count verification: PASSED ($ACTUAL_FILES files)"
else
    echo "⚠️  File count verification: WARNING (expected $EXPECTED_FILES, found $ACTUAL_FILES)"
fi

# Verify package metadata
echo ""
echo "[3/3] Verifying package metadata..."
if [ -f "package-metadata.json" ]; then
    PACKAGE_ID=$(jq -r '.package_id' package-metadata.json)
    CORPUS_SIZE=$(jq -r '.corpus.size' package-metadata.json)
    echo "✅ Package metadata: VALID"
    echo "   Package ID: $PACKAGE_ID"
    echo "   Corpus Size: $CORPUS_SIZE sources"
else
    echo "❌ Package metadata: MISSING (package-metadata.json not found)"
    exit 1
fi

echo ""
echo "=== Verification Complete ==="
echo "Status: ✅ Package integrity verified"
echo "Timestamp: $(date)"
echo ""
echo "Package is ready for use. See README.md for usage instructions."
```

---

## Export Workflow

### Step 1: Package Selection (UC-RF-010)
User initiates export: `aiwg research export --type DIP --purpose publication-supplement`

### Step 2: Content Collection
Archival Agent collects:
- All source metadata (REF-XXX)
- All knowledge artifacts (summaries, extractions, notes)
- All analysis artifacts (claims index, gap analysis, quality reports)
- Provenance logs
- AIWG documentation (cited sections only)

### Step 3: FAIR Validation
Quality Agent validates FAIR compliance for all sources:
- Ensure persistent identifiers present
- Verify accessibility metadata
- Check standard formats
- Confirm license documentation

### Step 4: Package Assembly
Archival Agent creates OAIS-compliant structure:
- Content Information (data + representation info)
- Preservation Description (provenance, context, fixity)
- Descriptive Information (metadata)
- Packaging Information (manifest, structure)

### Step 5: Fixity Generation
Compute checksums for all files:
```bash
find . -type f -exec sha256sum {} \; > fixity/checksums-sha256.txt
```

### Step 6: Package Validation
Verify package integrity:
- Checksum validation
- OAIS compliance check
- Metadata completeness
- File count verification

### Step 7: Compression and Export
Create distributable archive:
```bash
tar -czf aiwg-research-export-YYYYMMDD-HHMMSS.tar.gz aiwg-research-export-YYYYMMDD-HHMMSS/
```

### Step 8: Upload and Share
Upload to:
- **Publication Supplement:** Journal repository, Zenodo, FigShare
- **Archival Repository:** Institutional repository, LOCKSS
- **Collaboration:** GitHub Release, Google Drive, Dropbox

---

## Validation Rules

### OAIS Compliance Checklist
- [ ] Content Information present and complete
- [ ] Representation Information includes schemas and software requirements
- [ ] Preservation Description includes provenance (W3C PROV)
- [ ] Descriptive Information includes title, abstract, keywords
- [ ] Packaging Information includes manifest with checksums
- [ ] Fixity Information includes SHA-256 checksums for all files
- [ ] README.md provides usage instructions
- [ ] Package can be verified independently

### DIP-Specific Requirements
- [ ] PDFs excluded (with explanation) or included with license
- [ ] Metadata sufficient for independent source acquisition
- [ ] Provenance logs enable workflow replication
- [ ] Total package size <100 MB (excludes PDFs)
- [ ] All formats are open standards (Markdown, JSON, not proprietary)

### AIP-Specific Requirements (if applicable)
- [ ] PDFs included (if copyright allows)
- [ ] Multiple hash algorithms (SHA-256, SHA-512)
- [ ] Format migration plan documented
- [ ] Retention policy specified
- [ ] Audit log maintained

---

## Agent Responsibilities

**Produced by:** Archival Agent (UC-RF-007, UC-RF-010)
**Validated by:** Quality Agent (FAIR compliance), Provenance Agent (provenance completeness)
**Used by:** External researchers (reproducibility), Archival repositories (preservation), Publication venues (supplements)

---

## References

- @.aiwg/flows/research-framework/elaboration/use-cases/UC-RF-007-archive-research-artifacts.md - Archival use case
- @.aiwg/flows/research-framework/elaboration/use-cases/UC-RF-010-export-research-artifacts.md - Export use case
- [OAIS Reference Model (ISO 14721:2012)](https://www.iso.org/standard/57284.html) - OAIS standard
- [W3C PROV](https://www.w3.org/TR/prov-overview/) - Provenance standard
- [FAIR Principles](https://www.go-fair.org/fair-principles/) - Data quality standard

---

**Template Version:** 1.0.0
**Last Updated:** 2026-01-25
**Owner:** Archival Agent
