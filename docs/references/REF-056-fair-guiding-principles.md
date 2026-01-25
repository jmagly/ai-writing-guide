# REF-056: FAIR Guiding Principles for Scientific Data Management

## Citation

Wilkinson, M. D., et al. (2016). The FAIR Guiding Principles for scientific data management and stewardship. Scientific Data, 3, 160018.

**DOI**: https://doi.org/10.1038/sdata.2016.18
**PDF**: https://www.nature.com/articles/sdata201618.pdf

## Document Profile

| Attribute | Value |
|-----------|-------|
| Year | 2016 |
| Citations | 17,000+ |
| Type | Research Data Management Principles |
| Endorsement | G20, European Commission, NIH, UKRI |
| AIWG Relevance | **Critical** - Foundational principles for research artifact management, source tracking, and reproducibility |

## Executive Summary

The FAIR Principles provide a framework for making data Findable, Accessible, Interoperable, and Reusable. Originally developed for scientific data management, these principles have become the global standard for data stewardship. For AIWG, FAIR provides the conceptual foundation for how research artifacts should be managed throughout the research framework lifecycle.

### Key Insight

> "Good data management is not a goal in itself, but rather is the key conduit leading to knowledge discovery and innovation."

This directly applies to AIWG: managing research artifacts isn't bureaucratic overhead—it enables the research to be validated, built upon, and trusted.

---

## The FAIR Principles

### Findable

| Principle | Description |
|-----------|-------------|
| **F1** | Data are assigned globally unique and persistent identifiers |
| **F2** | Data are described with rich metadata |
| **F3** | Metadata clearly include the identifier of the data |
| **F4** | Data are registered or indexed in a searchable resource |

### Accessible

| Principle | Description |
|-----------|-------------|
| **A1** | Data are retrievable by their identifier using standardized protocol |
| **A1.1** | The protocol is open, free, and universally implementable |
| **A1.2** | The protocol allows for authentication/authorization when required |
| **A2** | Metadata remain accessible even when data are no longer available |

### Interoperable

| Principle | Description |
|-----------|-------------|
| **I1** | Data use formal, accessible, shared language for knowledge representation |
| **I2** | Data use vocabularies that follow FAIR principles |
| **I3** | Data include qualified references to other data |

### Reusable

| Principle | Description |
|-----------|-------------|
| **R1** | Data have plurality of accurate and relevant attributes |
| **R1.1** | Data are released with clear, accessible data usage license |
| **R1.2** | Data are associated with detailed provenance |
| **R1.3** | Data meet domain-relevant community standards |

---

## Key Findings for AIWG

### 1. Machine-Actionability is Essential

> "FAIR Principles put specific emphasis on enhancing the ability of machines to automatically find and use the data."

**AIWG Implication**: The research framework must be designed so AI agents can discover, retrieve, and process research artifacts programmatically—not just for human consumption.

### 2. Metadata Persistence (A2)

> "Metadata should be accessible even when the data are no longer available."

**AIWG Implication**: Reference documentation (REF-XXX.md files) must survive even if original PDFs become unavailable. The markdown summaries are the persistent metadata layer.

### 3. Provenance is Non-Negotiable (R1.2)

> "Data should be associated with detailed provenance: where it came from, who created it, how it was processed."

**AIWG Implication**: Every research artifact needs acquisition timestamps, source URLs, agent attribution, and transformation history tracked.

---

## AIWG Implementation Mapping

| FAIR Principle | AIWG Implementation | Rationale |
|----------------|---------------------|-----------|
| **F1 - Unique Identifiers** | REF-XXX numbering system for all research sources | Enables unambiguous citation and cross-referencing across projects |
| **F2 - Rich Metadata** | Structured markdown documents with Citation, Profile, Executive Summary, Key Findings sections | Captures essential context beyond just the PDF |
| **F3 - ID in Metadata** | REF-XXX appears in document title, filename, and all internal references | Every reference to the source carries its identifier |
| **F4 - Indexed/Searchable** | INDEX.md with topic categories, application domains, and quick lookups | AI agents and humans can discover relevant papers by use case |
| **A1 - Retrievable by ID** | Git repository with predictable paths: `documentation/references/REF-XXX-*.md` | Standard protocol (git/https) with deterministic URL structure |
| **A1.1 - Open Protocol** | HTTPS access to public repository | No proprietary tools required |
| **A2 - Metadata Persistence** | Markdown docs survive PDF loss; summaries capture key findings | If Nature removes the PDF, the REF-056.md summary remains |
| **I1 - Formal Language** | Consistent document template structure across all REF-XXX files | Machine-parseable sections (Citation, Profile, Findings, Quotes) |
| **I2 - FAIR Vocabularies** | Standardized field names: `AIWG Relevance`, `Key Contribution`, `Cross-References` | Vocabulary itself is documented and consistent |
| **I3 - Qualified References** | Cross-References section with explicit relationship types | Not just "see also" but "implements", "complements", "conflicts with" |
| **R1.1 - License Clarity** | Source license documented in Profile section | Enables reuse decisions (can we quote? redistribute?) |
| **R1.2 - Provenance** | Revision History section; acquisition date; source URL | Complete chain from original publication to current documentation |
| **R1.3 - Community Standards** | REF-XXX document template follows established pattern | New contributors can add papers following the same structure |

---

## Specific AIWG Design Decisions Informed by FAIR

### 1. REF-XXX Identifier System

**Decision**: All research sources assigned sequential REF-XXX identifiers.

**FAIR Justification**: F1 (unique identifiers) + F3 (ID in metadata). The identifier is:
- Globally unique within AIWG ecosystem
- Persistent (never reused for different papers)
- Machine-readable (simple pattern matching)
- Human-memorable (sequential numbers easier than UUIDs)

### 2. Two-Repository Architecture

**Decision**: Canonical references in `research-papers` repo; project-specific analysis in each project's `docs/references/`.

**FAIR Justification**:
- A1 (retrievable): Single source of truth for each paper
- I3 (qualified references): Projects reference canonical corpus
- R1.3 (standards): Consistent format across all projects

### 3. Markdown as Primary Format

**Decision**: All documentation in Markdown, not proprietary formats.

**FAIR Justification**:
- A1.1 (open protocol): Plain text, no special tools needed
- I1 (formal language): Parseable structure with headers, tables, code blocks
- A2 (persistence): Text survives format migrations better than binary

### 4. INDEX.md Quick Lookups

**Decision**: FAQ-style quick lookups like "How do I manage research data?" → REF-XXX

**FAIR Justification**: F4 (searchable resource). Optimized for the actual queries AI agents and humans make.

### 5. Cross-Reference Tables

**Decision**: Every REF-XXX document includes explicit Cross-References section.

**FAIR Justification**: I3 (qualified references). Not just links but relationship types:
- "OAIS complements FAIR for preservation"
- "W3C PROV implements R1.2 provenance"

---

## Research Framework Application

### Acquisition Stage (SIP in OAIS terms)

FAIR compliance at intake:
- Assign REF-XXX identifier immediately (F1)
- Capture source URL and retrieval timestamp (R1.2)
- Extract rich metadata: authors, year, venue, DOI (F2)

### Documentation Stage (AIP in OAIS terms)

FAIR compliance during documentation:
- Create markdown summary with all standard sections (I1)
- Include original identifier in document (F3)
- Add to INDEX.md topic categories (F4)
- Document any licensing constraints (R1.1)

### Integration Stage (DIP in OAIS terms)

FAIR compliance for use:
- Cross-reference to related papers (I3)
- Cite with standardized format (I2)
- Track which projects use which papers (R1.2)

---

## Key Quotes

### On machine-actionability (p. 1):
> "FAIR Principles put specific emphasis on enhancing the ability of machines to automatically find and use the data."

### On the purpose of data management (p. 1):
> "Good data management is not a goal in itself, but rather is the key conduit leading to knowledge discovery and innovation."

### On metadata persistence (p. 3):
> "Principle A2... clarifies that even if the data themselves become unavailable, the metadata should remain findable and accessible."

### On provenance (p. 4):
> "Rich, fine-grained provenance information will be important to enable reproducibility."

---

## Cross-References

| Paper | Relationship |
|-------|-------------|
| **REF-061** | OAIS provides archival framework; FAIR provides access principles |
| **REF-062** | W3C PROV implements R1.2 provenance tracking |
| **REF-060** | GRADE provides quality assessment for R1 (reusability attributes) |
| **REF-058** | R-LAM applies FAIR to agent workflow reproducibility |

---

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-01-25 | Research Acquisition | Initial AIWG-specific analysis document |
