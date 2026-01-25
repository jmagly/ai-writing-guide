# REF-061 AIWG Analysis: OAIS Reference Model

**Source**: @docs/references/REF-061-oais-reference-model.md

**Paper**: CCSDS (2024). Reference Model for an Open Archival Information System (OAIS). ISO 14721:2025.

**AIWG Relevance**: MEDIUM - Provides ISO standard archival lifecycle model (SIP/AIP/DIP); informs research artifact management patterns.

---

## AIWG Concept Mapping

### OAIS → AIWG Implementation

| OAIS Concept | AIWG Implementation | Coverage |
|--------------|---------------------|----------|
| **SIP** (Submission) | PDF/URL intake | **Strong** |
| **AIP** (Archival) | REF-XXX.md + metadata | **Strong** |
| **DIP** (Dissemination) | Citable claims, exports | **Moderate** |
| **Ingest** | `/research-acquire` | **Strong** |
| **Archival Storage** | `.aiwg/research/` | **Strong** |
| **Data Management** | INDEX.md, search | **Partial** |
| **Access** | Integration commands | **Partial** |
| **Administration** | Framework config | **Weak** |
| **Preservation Planning** | Gap analysis | **Moderate** |

### Preservation Description Information (PDI)

| PDI Category | OAIS Purpose | AIWG Implementation | Coverage |
|--------------|--------------|---------------------|----------|
| **Reference** | Identifiers | REF-XXX, DOI | **Strong** |
| **Provenance** | History | Revision History | **Partial** |
| **Context** | Relationships | Cross-References | **Moderate** |
| **Fixity** | Integrity | checksums.json | **Weak** |
| **Access Rights** | Permissions | License field | **Partial** |

---

## The SIP → AIP → DIP Model

### Information Package Lifecycle

```
Producer → SIP → [Ingest] → AIP → [Access] → DIP → Consumer
```

### AIWG Research Framework Mapping

```
Researcher → Source → [Acquisition] → Documented Reference → [Integration] → Citable Claim
               │              │                    │                  │              │
             SIP           Ingest               AIP               Access          DIP
```

### Package Definitions

| Package | OAIS Definition | AIWG Equivalent |
|---------|-----------------|-----------------|
| **SIP** | Information delivered by producer | PDF download, URL, raw source |
| **AIP** | Preserved package in archive | REF-XXX.md with full metadata |
| **DIP** | Package sent to consumer | BibTeX export, citable claim |

---

## OAIS Functional Entities

### Six Functions Mapped to AIWG

| OAIS Entity | Responsibilities | AIWG Command/Component |
|-------------|-----------------|------------------------|
| **Ingest** | Accept SIPs, create AIPs | `/research-acquire` |
| **Archival Storage** | Store, manage AIPs | `.aiwg/research/sources/` |
| **Data Management** | Metadata, queries | INDEX.md, `/research-search` |
| **Access** | Discovery, DIP creation | `/research-cite`, exports |
| **Administration** | Policy, operations | Framework registry |
| **Preservation Planning** | Monitor, recommend | `/research-gap-analysis` |

### Function Implementation Status

```
┌─────────────────────────────────────────────────────────────────┐
│                         OAIS Model                               │
├───────────────┬───────────────┬───────────────┬─────────────────┤
│    Ingest     │   Storage     │     Data      │     Access      │
│   ████████    │   ████████    │   ████░░░░    │   ████░░░░      │
│    Strong     │    Strong     │   Moderate    │    Partial      │
├───────────────┴───────────────┴───────────────┴─────────────────┤
│                         Administration                           │
│                           ██░░░░░░                               │
│                            Weak                                  │
├─────────────────────────────────────────────────────────────────┤
│                      Preservation Planning                       │
│                          ████░░░░                                │
│                          Moderate                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## Archival Package Structure

### Proposed AIWG Package Format

```yaml
# .aiwg/research/sources/REF-056/package.yaml
archival_package:
  identifier: REF-056
  version: "1.0.0"
  created: "2026-01-25T10:00:00Z"
  modified: "2026-01-25T10:30:00Z"

  content_information:
    primary:
      type: "pdf"
      path: "pdfs/full/REF-056-wilkinson-2016-fair.pdf"
      size_bytes: 1245678

    supplementary:
      - type: "reference_document"
        path: "docs/references/REF-056-fair-guiding-principles.md"
      - type: "analysis"
        path: ".aiwg/research/paper-analysis/REF-056-aiwg-analysis.md"

  preservation_metadata:
    reference:
      ref_id: REF-056
      doi: "10.1038/sdata.2016.18"
      url: "https://www.nature.com/articles/sdata201618"
      alternative_ids:
        - pmid: "26978244"
        - pmc: "PMC4792175"

    provenance:
      acquired: "2026-01-25"
      acquired_by: "research-acquisition-agent"
      source_url: "https://www.nature.com/articles/sdata201618.pdf"
      acquisition_method: "direct_download"
      processing_history:
        - date: "2026-01-25"
          action: "pdf_acquisition"
          agent: "acquisition-agent"
        - date: "2026-01-25"
          action: "documentation"
          agent: "documentation-agent"
        - date: "2026-01-25"
          action: "aiwg_analysis"
          agent: "analysis-agent"

    context:
      related_refs: [REF-061, REF-062]
      topic_categories:
        - data-management
        - reproducibility
        - provenance
      aiwg_relevance: "critical"

    fixity:
      pdf_sha256: "abc123..."
      md_sha256: "def456..."
      last_verified: "2026-01-25"

    access_rights:
      license: "CC-BY-4.0"
      allows: ["copy", "redistribute", "adapt"]
      requires: ["attribution"]
      restrictions: []
```

---

## PDI Implementation

### Reference Information

**OAIS Requirement**: Identifiers that unambiguously reference content.

**AIWG Implementation**:
- REF-XXX unique identifier
- DOI capture when available
- Multiple identifier support (PMID, PMC, arXiv ID)

```yaml
reference:
  ref_id: REF-056
  doi: "10.1038/sdata.2016.18"
  alternative_ids:
    pmid: "26978244"
    pmc: "PMC4792175"
```

### Provenance Information

**OAIS Requirement**: History of creation, transformation, custody.

**AIWG Implementation**:
- Acquisition timestamp and agent
- Processing history
- W3C PROV integration (see REF-062)

```yaml
provenance:
  acquired: "2026-01-25"
  acquired_by: "research-acquisition-agent"
  processing_history:
    - date: "2026-01-25"
      action: "pdf_acquisition"
      agent: "acquisition-agent"
```

### Context Information

**OAIS Requirement**: Relationship to other information.

**AIWG Implementation**:
- Cross-references with relationship types
- Topic categorization
- AIWG relevance assessment

```yaml
context:
  related_refs:
    - ref: REF-061
      relationship: "complements"
    - ref: REF-062
      relationship: "implements_provenance"
  topic_categories: [data-management, provenance]
```

### Fixity Information

**OAIS Requirement**: Data integrity verification.

**AIWG Implementation** (needs enhancement):

```yaml
fixity:
  checksums:
    pdf:
      algorithm: "sha256"
      value: "abc123..."
    markdown:
      algorithm: "sha256"
      value: "def456..."
  last_verified: "2026-01-25"
  verification_schedule: "monthly"
```

### Access Rights Information

**OAIS Requirement**: Terms governing access and use.

**AIWG Implementation**:

```yaml
access_rights:
  license:
    type: "CC-BY-4.0"
    url: "https://creativecommons.org/licenses/by/4.0/"
  permissions:
    - copy
    - redistribute
    - adapt
  conditions:
    - attribution_required
  restrictions: []
```

---

## Implementation Recommendations

### Immediate (High Priority)

#### 1. Implement Package Structure

Create standardized package directories:

```
.aiwg/research/sources/
├── REF-056/
│   ├── package.yaml          # Package metadata
│   ├── content/
│   │   └── REF-056-wilkinson-2016-fair.pdf
│   └── metadata/
│       ├── reference.yaml
│       ├── provenance.yaml
│       ├── context.yaml
│       ├── fixity.yaml
│       └── access_rights.yaml
└── REF-057/
    └── ...
```

#### 2. Implement Fixity Checking

Add checksum generation and verification:

```bash
# Generate checksums for all sources
aiwg research fixity generate

# Output:
# Generating checksums for 34 sources...
# REF-056: sha256:abc123... ✓
# REF-057: sha256:def456... ✓
# ...
# Checksums stored in .aiwg/research/checksums.json

# Verify fixity
aiwg research fixity verify

# Output:
# Verifying 34 sources...
# REF-056: ✓ (unchanged)
# REF-057: ✓ (unchanged)
# REF-058: ⚠ (modified since last check)
# ...
```

#### 3. Add Processing History

Track all operations on each source:

```yaml
# Automatic logging
processing_history:
  - timestamp: "2026-01-25T10:00:00Z"
    operation: "acquisition"
    agent: "research-acquisition"
    inputs: ["https://arxiv.org/pdf/2601.09749"]
    outputs: ["pdfs/full/REF-058-rlam.pdf"]

  - timestamp: "2026-01-25T10:15:00Z"
    operation: "documentation"
    agent: "documentation-agent"
    inputs: ["pdfs/full/REF-058-rlam.pdf"]
    outputs: ["docs/references/REF-058-rlam-reproducibility.md"]
```

### Short-Term (Enhancement)

#### 4. DIP Generation (Exports)

Implement export formats:

```bash
# Export to BibTeX
aiwg research export --format bibtex --refs "REF-056,REF-057,REF-058"

# Output: bibliography.bib
@article{REF-056,
  author = {Wilkinson, Mark D. and others},
  title = {The FAIR Guiding Principles...},
  journal = {Scientific Data},
  year = {2016},
  doi = {10.1038/sdata.2016.18}
}

# Export to citation list
aiwg research export --format citations --refs "all"

# Output: citations.md with formatted citations
```

#### 5. Access Function Enhancement

Improve discovery and retrieval:

```bash
# Search by topic
aiwg research search --topic "reproducibility"

# Output:
# Found 5 sources:
# - REF-056 (FAIR) - Critical
# - REF-058 (R-LAM) - Critical
# - REF-062 (W3C PROV) - Medium
# ...

# Get specific source
aiwg research get REF-056 --format yaml
```

### Medium-Term (Framework Enhancement)

#### 6. Administration Dashboard

```bash
# Repository status
aiwg research admin status

# Output:
# Research Repository Status
# ─────────────────────────
# Total Sources: 34
# Storage Used: 245 MB
#
# By Type:
#   Peer-reviewed: 18
#   Preprints: 8
#   Standards: 5
#   Technical Reports: 3
#
# Fixity Status:
#   Verified (current): 32
#   Needs verification: 2
#
# Completeness:
#   Full package: 28
#   Missing metadata: 6
```

#### 7. Preservation Planning

```bash
# Gap analysis for archive completeness
aiwg research preservation-check

# Output:
# Preservation Analysis
# ─────────────────────
#
# Missing PDI Components:
#   REF-022: No fixity checksum
#   REF-025: No license information
#   REF-066: Incomplete provenance
#
# At-Risk Sources:
#   REF-003: Source URL no longer accessible
#   REF-019: PDF not archived locally
#
# Recommendations:
#   1. Generate checksums for 6 sources
#   2. Archive REF-019 PDF before URL expires
#   3. Update license info for REF-025
```

---

## Cross-References to AIWG Components

| Component | Location | OAIS Relevance |
|-----------|----------|----------------|
| Research Acquisition | `/research-acquire` | Ingest function |
| Source Storage | `.aiwg/research/sources/` | Archival Storage |
| INDEX.md | `docs/references/INDEX.md` | Data Management |
| Export Commands | `/research-export` (proposed) | Access/DIP |
| Framework Registry | `.aiwg/frameworks/registry.json` | Administration |
| Gap Analysis | `/research-gap-analysis` | Preservation Planning |

---

## Key Quotes for Documentation

### On Scope:
> "OAIS provides information professionals with a conceptual framework of a preservation system, as well as a vocabulary of standardized terms."

### On Adoption:
> "The OAIS Reference Model has been widely adopted by a broad range of non-space agencies as a general model of a preservation system."

### On Information Packages:
> "SIP: An Information Package delivered by the Producer to the OAIS for use in constructing Archival Information Packages."

---

## Professional Terminology Mapping

| Informal AIWG Term | Professional Term (OAIS) | Use In |
|-------------------|--------------------------|--------|
| Research intake | Submission Information Package (SIP) | Technical docs |
| Documented reference | Archival Information Package (AIP) | Architecture docs |
| Citable claims/exports | Dissemination Information Package (DIP) | API docs |
| `/research-acquire` | Ingest Function | Command docs |
| `.aiwg/research/` | Archival Storage | Directory docs |
| INDEX.md | Data Management | Search docs |
| Checksums | Fixity Information | Security docs |

---

## Document Status

**Created**: 2026-01-25
**Source Paper**: REF-061
**AIWG Priority**: MEDIUM
**Implementation Status**: Strong on core packages; weak on PDI completeness
**Key Contribution**: ISO standard archival lifecycle model
**Standards Alignment**: ISO 14721:2025
