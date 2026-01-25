# REF-056 AIWG Analysis: FAIR Guiding Principles

**Source**: @docs/references/REF-056-fair-guiding-principles.md

**Paper**: Wilkinson, M. D., et al. (2016). The FAIR Guiding Principles for scientific data management and stewardship. *Scientific Data*, 3, 160018.

**AIWG Relevance**: CRITICAL for artifact management - provides foundational principles for research data stewardship with 17,000+ citations and G20/EU/NIH endorsement.

---

## AIWG Concept Mapping

### Core FAIR → AIWG Implementation

| FAIR Principle | AIWG Implementation | Coverage |
|----------------|---------------------|----------|
| **F1** - Unique Identifiers | REF-XXX numbering system | **Strong** |
| **F2** - Rich Metadata | Structured markdown with Citation, Profile, Findings | **Strong** |
| **F3** - ID in Metadata | REF-XXX in filename, title, cross-references | **Strong** |
| **F4** - Searchable/Indexed | INDEX.md with topic categories, quick lookups | **Strong** |
| **A1** - Retrievable by ID | Git paths: `docs/references/REF-XXX-*.md` | **Strong** |
| **A1.1** - Open Protocol | HTTPS/git access, no proprietary tools | **Strong** |
| **A1.2** - Auth when needed | Private repos with token auth | **Strong** |
| **A2** - Metadata Persistence | Summaries survive PDF unavailability | **Strong** |
| **I1** - Formal Language | Consistent template structure across REF-XXX | **Moderate** |
| **I2** - FAIR Vocabularies | Standardized field names (AIWG Relevance, etc.) | **Moderate** |
| **I3** - Qualified References | Cross-References with relationship types | **Partial** |
| **R1** - Relevant Attributes | Executive Summary, Key Findings, Quotes | **Strong** |
| **R1.1** - License Clarity | Source license in Document Profile | **Partial** |
| **R1.2** - Provenance | Revision History, acquisition date | **Partial** |
| **R1.3** - Community Standards | REF-XXX template follows established pattern | **Strong** |

### Gap Analysis

| FAIR Requirement | Current AIWG State | Improvement Opportunity |
|------------------|-------------------|------------------------|
| Machine-Actionability | Human-readable markdown | Add structured YAML frontmatter for programmatic access |
| Qualified References | "See also" style links | Explicit relationship types: implements, extends, conflicts |
| License Tracking | Informal notes | Structured license field in every document |
| Provenance Chain | Manual revision history | Automated provenance records per operation |

---

## Key FAIR Principles Applied to AIWG

### F1: Globally Unique and Persistent Identifiers

**FAIR Requirement**: "(Meta)data are assigned a globally unique and persistent identifier"

**AIWG Implementation**:
- REF-XXX numbering system (sequential, never reused)
- DOI capture when available
- Source URLs preserved

**Current Pattern**:
```markdown
# REF-056: FAIR Guiding Principles

| Attribute | Value |
|-----------|-------|
| DOI | https://doi.org/10.1038/sdata.2016.18 |
```

**Alignment**: **Strong** - Identifiers are unique within AIWG ecosystem, persistent across versions.

### A2: Metadata Persistence Beyond Data Availability

**FAIR Requirement**: "Metadata are accessible, even when the data are no longer available"

**AIWG Implementation**:
- REF-XXX.md summaries contain complete key information
- Executive Summary captures essential findings
- Key Quotes preserve critical passages
- Even if Nature removes the PDF, REF-056.md remains useful

**Critical Quote** (p. 3):
> "Principle A2... clarifies that even if the data themselves become unavailable, the metadata should remain findable and accessible."

**Alignment**: **Strong** - This is a core AIWG design decision.

### R1.2: Detailed Provenance

**FAIR Requirement**: "(Meta)data are associated with detailed provenance"

**AIWG Current State**:
- Revision History section in documents
- Acquisition date captured
- No automated provenance tracking

**Improvement Opportunity**: Implement W3C PROV-compliant provenance records:

```yaml
# .aiwg/research/provenance/REF-056-acquisition.yaml
provenance:
  entity: "ref:REF-056"
  activity: "paper_acquisition"
  agent: "research-acquisition-agent"
  timestamp: "2026-01-25T10:00:00Z"
  source_url: "https://www.nature.com/articles/sdata201618.pdf"
  derived_from: null
```

**Alignment**: **Partial** - Needs automated provenance tracking.

---

## Machine-Actionability Implementation

### Current State (Human-Readable)

AIWG documents are markdown optimized for human reading:

```markdown
## Document Profile

| Attribute | Value |
|-----------|-------|
| Year | 2016 |
| Type | Research Data Management Principles |
| AIWG Relevance | **Critical** |
```

### Proposed Enhancement (Machine-Actionable)

Add YAML frontmatter for programmatic access:

```yaml
---
ref_id: REF-056
title: "FAIR Guiding Principles for Scientific Data Management"
citation:
  authors: ["Wilkinson, M. D.", "et al."]
  year: 2016
  venue: "Scientific Data"
  doi: "10.1038/sdata.2016.18"
profile:
  type: "research-data-management"
  aiwg_relevance: "critical"
  endorsements: ["G20", "European Commission", "NIH", "UKRI"]
topics:
  - data-management
  - reproducibility
  - provenance
  - metadata
cross_references:
  complements: [REF-061, REF-062]
  implements: []
  conflicts: []
---
```

**Benefits**:
- AI agents can programmatically discover relevant papers
- Automated INDEX.md generation
- Structured queries ("find all Critical relevance papers on provenance")
- Integration with MCP resources

---

## AIWG Research Framework Application

### Three-Stage Lifecycle (SIP → AIP → DIP)

FAIR + OAIS integration for research acquisition:

| Stage | FAIR Compliance | AIWG Implementation |
|-------|-----------------|---------------------|
| **Acquisition (SIP)** | F1 (assign ID), R1.2 (capture provenance) | `/research-acquire` assigns REF-XXX, logs source |
| **Documentation (AIP)** | F2, F3, I1 (rich metadata) | `/research-document` creates structured markdown |
| **Integration (DIP)** | A1, I3 (accessible, linked) | `/research-cite` enables citation with relationships |

### Compliance Checklist

For every research artifact:

- [ ] **F1**: REF-XXX identifier assigned
- [ ] **F2**: Document Profile with rich metadata
- [ ] **F3**: ID appears in filename, title, content
- [ ] **F4**: Added to INDEX.md categories
- [ ] **A1**: Accessible via standard git/https
- [ ] **A2**: Summary standalone useful
- [ ] **I1**: Follows REF-XXX template structure
- [ ] **I3**: Cross-References section populated
- [ ] **R1.1**: License documented
- [ ] **R1.2**: Provenance record created

---

## Implementation Recommendations

### Immediate (High Priority)

#### 1. Add YAML Frontmatter to REF-XXX Documents

Convert existing documents to include machine-readable metadata:

```yaml
---
ref_id: REF-056
aiwg_relevance: critical
topics: [data-management, provenance]
cross_references:
  complements: [REF-061, REF-062]
---
```

#### 2. Create Automated Provenance Records

Every acquisition operation generates:

```yaml
# .aiwg/research/provenance/op-YYYY-MM-DD-NNN.yaml
operation:
  id: "op-2026-01-25-001"
  type: "paper_acquisition"
  entity: "ref:REF-056"
  agent: "research-acquisition"
  timestamp: "2026-01-25T10:00:00Z"
  inputs:
    source_url: "https://doi.org/10.1038/sdata.2016.18"
  outputs:
    pdf_path: "pdfs/full/REF-056-wilkinson-2016-fair.pdf"
    doc_path: "docs/references/REF-056-fair-guiding-principles.md"
  status: "completed"
```

#### 3. Implement Qualified Cross-References

Change from:

```markdown
## Cross-References

| Paper | Relationship |
|-------|-------------|
| **REF-061** | OAIS provides archival framework |
```

To:

```markdown
## Cross-References

| Paper | Relationship Type | Description |
|-------|------------------|-------------|
| **REF-061** | `complements` | OAIS provides archival lifecycle; FAIR provides access principles |
| **REF-062** | `implements` | W3C PROV implements FAIR R1.2 provenance requirement |
| **REF-060** | `extends` | GRADE provides quality assessment for R1 reusability |
```

### Short-Term (Enhancement)

#### 4. License Field Standardization

Add explicit license tracking:

```yaml
source_license:
  type: "CC-BY-4.0"
  allows: ["copy", "redistribute", "adapt"]
  requires: ["attribution"]
  url: "https://creativecommons.org/licenses/by/4.0/"
```

#### 5. Machine-Actionable INDEX.md

Generate INDEX.md from YAML frontmatter:

```bash
# Build INDEX.md from all REF-XXX frontmatter
aiwg research build-index
```

### Medium-Term (Framework Enhancement)

#### 6. FAIR Assessment Command

```bash
# Assess FAIR compliance for a document
aiwg research fair-check REF-056

# Output:
# F1: ✓ Unique identifier (REF-056)
# F2: ✓ Rich metadata (Document Profile)
# F3: ✓ ID in metadata (filename, title)
# F4: ✓ Indexed (INDEX.md)
# A1: ✓ Retrievable (git path)
# A2: ✓ Metadata persistent (summary standalone)
# I1: ✓ Formal language (template structure)
# I2: ○ FAIR vocabularies (needs YAML frontmatter)
# I3: ○ Qualified references (needs relationship types)
# R1.1: ○ License clarity (needs structured field)
# R1.2: ○ Provenance (needs automated records)
# R1.3: ✓ Community standards (follows template)
#
# FAIR Score: 8/12 (67%)
# Recommendations: Add YAML frontmatter, license field, provenance record
```

---

## Cross-References to AIWG Components

| Component | Location | FAIR Relevance |
|-----------|----------|----------------|
| REF-XXX Template | `.aiwg/flows/research-framework/elaboration/templates/REF-XXX-template.md` | F2, F3, I1 |
| INDEX.md | `docs/references/INDEX.md` (to create) | F4 |
| Provenance Directory | `.aiwg/research/provenance/` | R1.2 |
| Research Acquisition | `/research-acquire` command | F1, R1.2 |
| Research Documentation | `/research-document` command | F2, A2 |
| Research Integration | `/research-cite` command | I3 |

---

## Key Quotes for Documentation

### On Machine-Actionability (p. 1):
> "FAIR Principles put specific emphasis on enhancing the ability of machines to automatically find and use the data."

### On Purpose (p. 1):
> "Good data management is not a goal in itself, but rather is the key conduit leading to knowledge discovery and innovation."

### On Metadata Persistence (p. 3):
> "Principle A2... clarifies that even if the data themselves become unavailable, the metadata should remain findable and accessible."

### On Provenance (p. 4):
> "Rich, fine-grained provenance information will be important to enable reproducibility."

---

## Professional Terminology Mapping

| Informal AIWG Term | Professional FAIR Term | Use In |
|-------------------|------------------------|--------|
| REF-XXX numbers | Persistent Identifiers (PIDs) | Marketing, docs |
| Document summaries | Metadata Persistence | Architecture docs |
| INDEX.md | Searchable Resource | Technical docs |
| Cross-references | Qualified References | All docs |
| Source notes | Provenance Tracking | Technical docs |

---

## Document Status

**Created**: 2026-01-25
**Source Paper**: REF-056
**AIWG Priority**: CRITICAL
**Implementation Status**: Strong foundation, needs provenance automation
**Key Contribution**: International standard backing for artifact management
**Standards Alignment**: G20, European Commission, NIH, UKRI endorsed
