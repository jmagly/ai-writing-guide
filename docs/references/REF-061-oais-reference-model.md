# REF-061: OAIS - Open Archival Information System Reference Model

## Citation

Consultative Committee for Space Data Systems (2024). Reference Model for an Open Archival Information System (OAIS). CCSDS 650.0-M-3. ISO 14721:2025.

**CCSDS**: https://public.ccsds.org/Pubs/650x0m2.pdf
**ISO**: ISO 14721:2025

## Document Profile

| Attribute | Value |
|-----------|-------|
| Year | 2002 (original), 2024 (v3) |
| Type | ISO Standard / Reference Model |
| Adoption | Global standard for digital preservation |
| AIWG Relevance | **Medium** - Provides archival lifecycle model for research artifacts; SIP/AIP/DIP pattern applies to research ingestion |

## Executive Summary

The Open Archival Information System (OAIS) Reference Model is the international standard (ISO 14721) for digital archives. It defines information packages (SIP, AIP, DIP) and functional entities (Ingest, Storage, Access, etc.) for long-term digital preservation. Despite originating from space data systems, OAIS has become the universal framework for digital preservation.

### Key Insight

> "The OAIS Reference Model has been widely adopted by a broad range of non-space agencies as a general model of a preservation system for both analog and digital data objects."

**AIWG Implication**: OAIS terminology and patterns provide a proven framework for thinking about research artifact lifecycle—even if AIWG doesn't implement a full archival system.

---

## Core Concepts

### Information Packages

| Package | Acronym | Definition | AIWG Analog |
|---------|---------|------------|-------------|
| **Submission Information Package** | SIP | Package delivered by producer to archive | Research source intake (PDF, URL) |
| **Archival Information Package** | AIP | Complete preserved package in archive | `.aiwg/research/sources/` with full metadata |
| **Dissemination Information Package** | DIP | Package sent to consumer on request | Export format (BibTeX, REF-XXX.md) |

### Package Flow

```
Producer → SIP → [Ingest] → AIP → [Access] → DIP → Consumer
```

For AIWG:
```
Researcher → Source → [Acquisition] → Documented Reference → [Integration] → Citable Claim
```

### Six Functional Entities

| Entity | Responsibilities | AIWG Analog |
|--------|-----------------|-------------|
| **Ingest** | Accept SIPs, create AIPs, validate | Research Acquisition |
| **Archival Storage** | Store, manage, retrieve AIPs | `.aiwg/research/` directory structure |
| **Data Management** | Maintain metadata, support queries | INDEX.md, search commands |
| **Access** | Discovery, DIP generation | Integration, export commands |
| **Administration** | Policy, operations, audit | Framework configuration |
| **Preservation Planning** | Monitor, recommend actions | Quality assessment, gap analysis |

---

## Preservation Description Information (PDI)

### Five Categories

| Category | Purpose | AIWG Implementation |
|----------|---------|---------------------|
| **Reference** | Identifiers (DOIs, URIs) | REF-XXX identifiers, DOIs |
| **Provenance** | History (who, what, when) | `.aiwg/research/provenance/` |
| **Context** | Relationship to other info | Cross-References section |
| **Fixity** | Data integrity (checksums) | `checksums.json` |
| **Access Rights** | Permissions/restrictions | License documentation |

---

## Key Findings for AIWG

### 1. Package Transformation is the Model

Research artifacts transform through stages:
- **SIP**: Raw source (PDF, URL, paper)
- **AIP**: Documented reference (REF-XXX.md with metadata)
- **DIP**: Integrated output (citable claims, synthesis)

**AIWG Implication**: Design research framework around explicit transformations between stages.

### 2. Metadata Must Persist

> "Metadata should be accessible even when the data are no longer available." (Related to FAIR A2)

**AIWG Implication**: REF-XXX.md summaries must contain enough information to be useful even if the original PDF becomes unavailable.

### 3. Functional Separation

OAIS separates concerns: Ingest ≠ Storage ≠ Access ≠ Preservation Planning.

**AIWG Implication**: Research Acquisition, Documentation, Integration, and Archival should be separate concerns with clear handoffs.

---

## AIWG Implementation Mapping

| OAIS Concept | AIWG Implementation | Rationale |
|--------------|---------------------|-----------|
| **SIP (Submission)** | PDF download, URL capture, raw source | Initial intake form |
| **AIP (Archival)** | REF-XXX.md with full metadata, checksums, provenance | Complete documented reference |
| **DIP (Dissemination)** | Citable claims index, BibTeX export, synthesis docs | Output formats for use |
| **Ingest** | Research Acquisition commands | Standardized intake process |
| **Archival Storage** | `.aiwg/research/sources/`, `pdfs/` directories | Organized storage structure |
| **Data Management** | INDEX.md, topic categorization, search | Discovery and query |
| **Access** | Integration commands, export formats | Getting information out |
| **Administration** | Framework registry, configuration | Policy and settings |
| **Preservation Planning** | Quality assessment, gap analysis | Maintaining coverage |
| **PDI-Reference** | REF-XXX identifier, DOI | Persistent identification |
| **PDI-Provenance** | Provenance records (REF-058 R-LAM) | History tracking |
| **PDI-Context** | Cross-References section | Relationship documentation |
| **PDI-Fixity** | SHA-256 checksums | Integrity verification |
| **PDI-Access Rights** | License field in Document Profile | Usage rights |

---

## Specific AIWG Design Decisions Informed by OAIS

### 1. Three-Stage Research Lifecycle

**Decision**: Acquisition → Documentation → Integration mirrors SIP → AIP → DIP.

**OAIS Justification**: Proven lifecycle model that separates concerns and enables quality gates between stages.

### 2. Metadata Completeness Requirements

**Decision**: REF-XXX.md documents must contain sufficient information to be useful without the original PDF.

**OAIS Justification**: OAIS requires AIPs to be self-sufficient. If the PDF disappears, the metadata (summary, key quotes, findings) remains valuable.

### 3. Fixity Implementation

**Decision**: Generate SHA-256 checksums for all PDFs; store in `checksums.json`.

**OAIS Justification**: PDI-Fixity enables verification that stored artifacts haven't been corrupted or modified.

### 4. Separate Functional Concerns

**Decision**: Different commands for different functions:
- `/research-acquire` for Ingest
- `/research-document` for Documentation
- `/research-integrate` for Access
- `/research-gap-analysis` for Preservation Planning

**OAIS Justification**: Functional separation enables focused tooling and clear responsibility.

### 5. Context Preservation

**Decision**: Every REF-XXX document includes Cross-References section with explicit relationship types.

**OAIS Justification**: PDI-Context ensures relationships between artifacts are preserved, not just the artifacts themselves.

---

## Research Framework Application

### Archival Package Structure

```yaml
# .aiwg/research/sources/REF-056/package.yaml
archival_package:
  identifier: REF-056
  version: 1.0.0

  content_information:
    primary: pdfs/REF-056-wilkinson-2016-fair.pdf
    supplementary:
      - docs/references/REF-056-fair-guiding-principles.md

  preservation_metadata:
    reference:
      ref_id: REF-056
      doi: 10.1038/sdata.2016.18
      url: https://www.nature.com/articles/sdata201618

    provenance:
      acquired: 2026-01-25
      acquired_by: research-acquisition-agent
      source_url: https://www.nature.com/articles/sdata201618.pdf

    fixity:
      pdf_sha256: abc123...
      md_sha256: def456...
      verified: 2026-01-25

    context:
      related_refs: [REF-061, REF-062]
      topic_categories: [data-management, reproducibility]

    access_rights:
      license: CC-BY-4.0
      restrictions: none
```

### Lifecycle Stages

| OAIS Stage | Research Framework | Commands |
|------------|-------------------|----------|
| Pre-Ingest | Discovery, prioritization | `/research-discover` |
| Ingest | Acquisition, validation | `/research-acquire` |
| Archival Storage | Documentation | `/research-document` |
| Data Management | Indexing, search | `/research-search` |
| Access | Integration, export | `/research-integrate` |
| Preservation Planning | Gap analysis, quality | `/research-gap-analysis` |

---

## Key Quotes

### On scope:
> "OAIS provides information professionals with a conceptual framework of a preservation system, as well as a vocabulary of standardized terms."

### On adoption:
> "The OAIS Reference Model has been widely adopted by a broad range of non-space agencies as a general model of a preservation system."

### On information packages:
> "SIP: An Information Package delivered by the Producer to the OAIS for use in constructing Archival Information Packages."

---

## Cross-References

| Paper | Relationship |
|-------|-------------|
| **REF-056** | FAIR provides access/discoverability principles; OAIS provides preservation |
| **REF-062** | W3C PROV implements OAIS PDI-Provenance category |
| **REF-058** | R-LAM applies preservation concepts to workflow reproducibility |

---

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-01-25 | Research Acquisition | Initial AIWG-specific analysis document |
