# Research Ingestion Plan

**Date**: 2026-01-25
**Purpose**: Track ingestion of new research sources into research-papers and ai-writing-guide repos
**Next Available REF**: REF-027

## Source Inventory

### Tier 1: High Priority Academic Papers

| REF | Source | Citation | PDF Status | Priority |
|-----|--------|----------|------------|----------|
| REF-027 | FAIR Principles | Wilkinson et al. (2016). The FAIR Guiding Principles. *Scientific Data* 3, 160018 | Available (open access) | **Critical** |
| REF-028 | Agent Laboratory | Chen et al. (2025). Agent Laboratory: Using LLM Agents as Research Assistants. arXiv:2501.04227 | Available (arXiv) | **High** |
| REF-029 | R-LAM Framework | (2025). R-LAM: Reproducibility-constrained Large Action Models. arXiv:2601.09749 | Available (arXiv) | **High** |
| REF-030 | LitLLM | ServiceNow Research (2025). LitLLM for Scientific Literature Reviews | GitHub/docs | **High** |

### Tier 2: Standards & Frameworks

| REF | Source | Citation | PDF Status | Priority |
|-----|--------|----------|------------|----------|
| REF-031 | GRADE Handbook | GRADE Working Group (2013-2025). GRADE Handbook | Online docs | **Medium** |
| REF-032 | OAIS Reference Model | CCSDS (2024). Reference Model for OAIS. CCSDS 650.0-M-3 / ISO 14721:2025 | Available (spec) | **Medium** |
| REF-033 | W3C PROV | W3C (2013). PROV-DM: The PROV Data Model | W3C Rec | **Medium** |

### Tier 3: Supplementary Sources

| REF | Source | Citation | PDF Status | Priority |
|-----|--------|----------|------------|----------|
| REF-034 | Unified Lineage System | ACM SIGMOD/PODS 2025. ULS at Scale | Conference paper | **Medium** |
| REF-035 | FAIRification Process | Bhat & Wani (2025). The FAIRification process. *SAGE Journals* | Paywalled | **Low** |
| REF-036 | Scientific Workflows | Excelra (2024). Workflow Managers Compared | Industry blog | **Low** |

### Tool Documentation (No REF needed - reference directly)

These are tools/services with documentation but no academic paper:
- Semantic Scholar API documentation
- Zotero documentation
- Obsidian documentation
- Snakemake/Nextflow/CWL documentation

## Ingestion Workflow

### For Each REF Document

**Step 1: PDF Acquisition**
```
Location: /tmp/research-papers/pdfs/full/REF-XXX-author-year-shortname.pdf
Naming: REF-027-wilkinson-2016-fair.pdf
```

**Step 2: Research-Papers Reference Doc**
```
Location: /tmp/research-papers/documentation/references/REF-XXX-topic.md
Pattern: Citation → Document Profile → Executive Summary → Key Findings → Key Quotes → Cross-References
```

**Step 3: AIWG Analysis Doc**
```
Location: /mnt/dev-inbox/jmagly/ai-writing-guide/docs/references/REF-XXX-topic.md
Pattern: Same as research-papers PLUS "AIWG Implementation Mapping" section
```

**Step 4: Index Updates**
- research-papers INDEX.md
- Cross-references in related REF docs
- research-framework-findings.md citations

## PDF Download URLs (Manual Download Required)

| REF | Filename | Download URL |
|-----|----------|--------------|
| REF-027 | `REF-027-wilkinson-2016-fair.pdf` | https://www.nature.com/articles/sdata201618.pdf |
| REF-028 | `REF-028-schmidgall-2025-agent-laboratory.pdf` | https://arxiv.org/pdf/2501.04227 |
| REF-029 | `REF-029-sureshkumar-2026-rlam.pdf` | https://arxiv.org/pdf/2601.09749 |
| REF-030 | N/A (docs only) | https://litllm.github.io/ |
| REF-031 | N/A (docs only) | https://gradepro.org/handbook/ |
| REF-032 | `REF-032-ccsds-2024-oais.pdf` | CCSDS site (registration may be required) |
| REF-033 | N/A (W3C spec) | https://www.w3.org/TR/prov-dm/ |

**Manual Download Instructions:**
```bash
cd /tmp/research-papers/pdfs/full
curl -L -o REF-027-wilkinson-2016-fair.pdf "https://www.nature.com/articles/sdata201618.pdf"
curl -L -o REF-028-schmidgall-2025-agent-laboratory.pdf "https://arxiv.org/pdf/2501.04227"
curl -L -o REF-029-sureshkumar-2026-rlam.pdf "https://arxiv.org/pdf/2601.09749"
```

## Progress Tracking

| REF | PDF | RP Doc | AIWG Doc | Index | Status |
|-----|-----|--------|----------|-------|--------|
| REF-027 | 📋 URL ready | ⬜ | ⬜ | ⬜ | In progress |
| REF-028 | 📋 URL ready | ⬜ | ⬜ | ⬜ | In progress |
| REF-029 | 📋 URL ready | ⬜ | ⬜ | ⬜ | In progress |
| REF-030 | N/A | ⬜ | ⬜ | ⬜ | Not started |
| REF-031 | N/A | ⬜ | ⬜ | ⬜ | Not started |
| REF-032 | 📋 URL ready | ⬜ | ⬜ | ⬜ | Not started |
| REF-033 | N/A | ⬜ | ⬜ | ⬜ | Not started |

## AIWG Relevance Mapping

| REF | AIWG Component | Relevance |
|-----|----------------|-----------|
| REF-027 (FAIR) | Research artifact management, metadata, quality scoring | **Critical** - foundation for artifact structure |
| REF-028 (Agent Lab) | Multi-agent research automation, workflow design | **High** - agent architecture patterns |
| REF-029 (R-LAM) | Provenance tracking, reproducibility, deterministic execution | **High** - research workflow reliability |
| REF-030 (LitLLM) | Discovery agent, citation extraction, RAG patterns | **High** - literature review automation |
| REF-031 (GRADE) | Quality scoring, evidence assessment | **High** - quality agent implementation |
| REF-032 (OAIS) | Archival stage, preservation packages, lifecycle | **Medium** - long-term storage patterns |
| REF-033 (W3C PROV) | Provenance tracking, audit trails | **Medium** - provenance agent implementation |

---

**Last Updated**: 2026-01-25
