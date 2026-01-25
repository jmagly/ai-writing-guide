# Research Framework: Best Practices Research Findings

**Date**: 2026-01-25
**Purpose**: Foundation research for designing the AIWG Research Framework
**Status**: Expanded Draft (Comprehensive Research Complete)
**Research Depth**: 15 major topic areas, 50+ sources consulted

## Executive Summary

This document synthesizes research on traditional human methodologies and modern agentic/data science approaches for research management and curation. The findings will inform the architecture of a new AIWG framework (`agentic/code/frameworks/research-complete/`) that manages the full research lifecycle from discovery to archival.

## 1. Traditional Methodologies

### 1.1 Systematic Review Protocols (PRISMA)

**Source**: [PRISMA Statement](https://www.prisma-statement.org/)

PRISMA (Preferred Reporting Items for Systematic reviews and Meta-Analyses) provides a 27-item checklist and flow diagram for transparent reporting. Key principles:

- **Protocol registration** before conducting review (reduces bias)
- **Explicit search strategy** with reproducible queries
- **Eligibility criteria** defined upfront
- **Quality assessment** of included studies
- **Data extraction** with standardized forms
- **Synthesis** of findings with bias assessment

**Framework Application**:
- Adapt PRISMA protocol for research discovery stage
- Create explicit search strategy templates
- Implement eligibility screening workflows
- Track quality scores per source

### 1.2 Zettelkasten Method

**Source**: [Zettelkasten.de](https://zettelkasten.de/)

German sociologist Niklas Luhmann's method for knowledge management (90,000+ cards):

- **Atomic notes**: One idea per note
- **Unique identifiers**: Sequential IDs (similar to REF-XXX)
- **Bidirectional linking**: Notes reference each other via IDs
- **Emergence**: Network reveals connections not visible in isolation
- **Continuous review**: Regular revisiting and refinement

**Framework Application**:
- REF-XXX numbering already aligns with this
- Add bidirectional linking in documentation
- Implement emergence detection (gap analysis)
- Build review/maintenance workflows

### 1.3 Building a Second Brain (BASB) / CODE Cycle

**Source**: Tiago Forte's methodology

The CODE cycle:
1. **Collect**: Gather information efficiently
2. **Organize**: Categorize and tag for access
3. **Distill**: Extract core insights
4. **Express**: Apply knowledge effectively

**The 5 C's of PKM**:
1. Collect relevant information
2. Capture insights and ideas
3. Curate by organizing and updating
4. Create new content by synthesis
5. Collaborate to share and expand

**Framework Application**:
- Map to lifecycle: Discovery (Collect) → Documentation (Organize/Distill) → Integration (Express)
- Implement progressive summarization
- Enable collaboration patterns

### 1.4 Maps of Content (MoCs)

Curated link collections that pull together notes on a topic - provides:
- Flexibility of tags
- Less rigid than folder hierarchies
- Acts as table of contents for topic areas

**Framework Application**:
- INDEX.md already serves this purpose
- Add topic-specific MoCs for major research areas
- Auto-generate MoCs from reference categorization

## 2. AI-Powered Research Tools

### 2.1 Semantic Scholar

**Source**: [Semantic Scholar](https://www.semanticscholar.org/)

Allen Institute's AI-powered academic search (200M+ papers):
- TLDR summaries (AI-generated overviews)
- Citation analysis highlighting influential studies
- Personalized research feeds
- "Ask This Paper" natural language queries

### 2.2 Elicit

**Source**: [Elicit](https://elicit.com/)

AI tool for literature review with 125M+ papers:
- **99.4% accuracy** on data extraction (1,502/1,511 data points)
- Generates editable research reports
- Structured data extraction from academic databases

### 2.3 Research Rabbit

**Source**: [Research Rabbit](https://www.researchrabbit.ai/)

Free tool for mapping research relationships:
- Takes single paper or reference list
- Generates recommendations and citation graphs
- Timeline view for temporal analysis
- Author-centric exploration

### 2.4 Connected Papers

**Source**: [Connected Papers](https://www.connectedpapers.com/)

Co-citation network analysis:
- Identifies "most closely related" papers
- Shows prior and derived works
- Visual graph representation
- 5 free analyses/month

### 2.5 Scite

Smart citations showing HOW papers are cited:
- Supported, contradicted, or merely mentioned
- Context for each reference
- Helps assess claim reliability

### 2.6 Litmaps

Citation chain visualization:
- Chronological story of topic evolution
- Identify pivotal studies
- Spot gaps and emerging areas

**Framework Application**:
- Integrate with Semantic Scholar API for discovery
- Implement citation context analysis (supported/contradicted)
- Build citation network visualization
- Auto-generate research recommendations

## 3. Research Automation & LLMs

### 3.1 LLM-Enhanced Systematic Reviews

Recent developments (2024-2025):
- **Review Copilot**: Multi-agent LLM architecture for document triage
- **LLMSurver**: Filtration pipelines with LLM embeddings
- **60%+ reduction** in manual screening while maintaining >90% recall

### 3.2 AI Tools for Stage-by-Stage Review

[Research Rabbit's guide](https://www.researchrabbit.ai/articles/best-ai-tools-for-literature-review):

| Stage | Recommended Tools |
|-------|-------------------|
| Discovery | Semantic Scholar, Research Rabbit, Litmaps |
| Screening | Elicit, Consensus |
| Extraction | Elicit, Scite |
| Synthesis | Elicit, ChatGPT |
| Citation | Scite, Connected Papers |

**Framework Application**:
- Map agents to review stages
- Implement multi-agent screening pipeline
- Create extraction templates with AI assistance

## 4. Reproducibility & Provenance

### 4.1 R-LAM Framework (2025)

**Source**: [arXiv:2601.09749](https://arxiv.org/html/2601.09749)

Reproducibility-constrained Large Action Models for scientific workflow automation:

- **Structured action schemas**
- **Deterministic execution policies**
- **Explicit provenance tracking** (every action auditable)
- **Failure-aware execution loops**
- **Controlled workflow forking** for experimentation

Key insight: Generic LLM agents have "implicit state, unconstrained action generation, and stochastic execution behavior" - R-LAM addresses this with structured constraints.

### 4.2 Research Lifecycle Management (HDSR 2025)

**Source**: [Harvard Data Science Review](https://hdsr.mitpress.mit.edu/pub/ulfgjwy1)

Platform capturing analysis workflows in real time:
- Branching graph of every step
- Digital trace provides data + analysis + computational environment
- Automates provenance tracking as research unfolds

### 4.3 W3C PROV Standard

Use of W3C PROV for:
- Reproducibility and trust of computer-generated outputs
- Provenance templates with domain-specific ontologies
- Meaningful abstraction of provenance information

### 4.4 AiiDA Workflow Management

Used for scientific workflow execution and data provenance:
- Handles transfer of input data
- Collects results and metadata
- Enables bit-for-bit reproducibility

**Framework Application**:
- Implement provenance tracking for all research operations
- Use deterministic execution where possible
- Create audit trail for all artifact transformations
- Enable workflow forking for experimental research

## 5. Citation Networks & Bibliometrics

### 5.1 VOSviewer

**Source**: [VOSviewer](https://www.vosviewer.com/)

Leiden University tool for bibliometric networks:
- Citation relations (bibliographic coupling, co-citation)
- Text mining for term extraction
- Networks of journals, researchers, publications

### 5.2 CitNetExplorer

**Source**: [CitNetExplorer](https://www.citnetexplorer.nl/)

Interactive citation network visualization:
- Drill-down into networks
- Cluster identification
- Publication relationship exploration

### 5.3 Analysis Methods

- **Degree centrality**: Influence measurement
- **Eigenvector centrality**: Impact beyond direct citations
- **Chronological construction**: Topic evolution tracking
- **Community detection**: Research area clustering

**Framework Application**:
- Implement citation network analysis
- Auto-detect research communities
- Track influence metrics for sources
- Visualize evolution of research areas

## 6. Token-Lifecycle Patterns (RNESS)

**Source**: [token-lifecycle](https://git.integrolabs.net/roko/token-lifecycle)

The RNESS (Roko Network Economic Sustainability Simulator) demonstrates:

### 6.1 Simulation-Based Validation
- SimPy discrete-event simulation
- Calibrated parameters validated against real data (Polkadot)
- 94% test coverage for reliability

### 6.2 Data Collection Pipelines
- Structured data acquisition from external sources
- Parameter estimation against real-world data
- Error margins and confidence intervals documented

### 6.3 Reproducibility Patterns
- Immutable state with `copy_with()` pattern
- Configuration-driven approach (ADR-003)
- Scenario definitions in `config/scenarios/`

### 6.4 Validation Workflow
- 1-year simulation with calibrated parameters
- Comparison against historical data
- <10% error target on key metrics

**Framework Application**:
- Implement hypothesis validation workflows
- Create data collection agents for research sources
- Track parameter provenance
- Build scenario comparison capabilities

## 7. Matric Ecosystem Research Needs

### 7.1 matric-memory (#154, #155)

Documentation professionalization requires:
- Research acquisition and citation integration
- Terminology mapping (informal → professional)
- Multi-audience documentation levels
- Claims need citations (citable-claims-index.md)

Pattern established:
- Shared corpus in research-papers repo
- Project-specific analysis in local repo
- Cross-references between them

### 7.2 matric-eval

Research needs for model evaluation framework:
- Benchmark papers (HumanEval, MBPP, GSM8K, MT-Bench, ARC)
- LLM-as-Judge methodology
- Pass@k metric implementation

### 7.3 Research Workflow Issues

Current pain points identified:
- Manual PDF management
- Manual gap analysis
- Ad-hoc research organization
- No automated discovery

## 8. FAIR Principles & Data Management

### 8.1 FAIR Principles Overview

**Sources**: [GO FAIR](https://www.go-fair.org/fair-principles/), [Nature Scientific Data](https://www.nature.com/articles/sdata201618)

FAIR (Findable, Accessible, Interoperable, Reusable) principles were published in 2016 and have become the gold standard for research data management:

**Findable**:
- F1: Data assigned globally unique, persistent identifier
- F2: Rich metadata describing the data
- F3: Metadata includes the identifier
- F4: Data registered in searchable resource

**Accessible**:
- A1: Data retrievable by identifier using standard protocol
- A2: Metadata remains accessible even when data isn't

**Interoperable**:
- I1: Use formal, shared, broadly applicable language
- I2: Use FAIR vocabularies
- I3: Include qualified references to other data

**Reusable**:
- R1: Rich, accurate metadata with clear usage license
- R1.1: Clear data usage license
- R1.2: Detailed provenance
- R1.3: Domain-relevant community standards

### 8.2 FAIRification Process (2025)

**Source**: [Bhat & Wani 2025](https://journals.sagepub.com/doi/10.1177/03400352241270692)

The FAIRification process involves systematic implementation:
- Stakeholder-driven minimum requirements selection
- Stepwise enhancement of data visibility and interoperability
- Integration with data repositories and research centers

### 8.3 FAIR Assessment Tools

- **F-UJI**: Programmatic FAIRness assessment at dataset level
- **FAIR-Aware**: Online tool for researchers to self-assess before upload

**Framework Application**:
- Implement FAIR compliance scoring for all research artifacts
- Use persistent identifiers (DOIs, REF-XXX)
- Ensure metadata richness and accessibility
- Track provenance per FAIR R1.2 requirements

---

## 9. Reference Management Software

### 9.1 Zotero

**Source**: [Paperpile Comparison](https://paperpile.com/r/zotero-vs-mendeley/)

Open-source reference management tool:
- **Free** desktop use (300MB free cloud storage, $120/year unlimited)
- Single-click capture from databases/catalogs/websites
- PDF metadata retrieval for automatic citation creation
- 9,000+ citation styles
- Extensive community plugin ecosystem
- Microsoft Word, LibreOffice, Google Docs integration

**Key Strengths**: Affordability, flexibility, plugin ecosystem, open-source ethos

### 9.2 Mendeley

Elsevier-owned reference manager:
- 2GB free cloud storage
- Integrated PDF viewer with annotations
- Microsoft Office integration (desktop, 365, iPad)
- Team collaboration features

**Concerns (2025)**: iOS/Android apps discontinued, development "lackluster" since 2013 Elsevier acquisition

### 9.3 Integration Patterns

**Source**: [Obsidian + Zotero workflow](https://medium.com/pkm-playbook/how-i-use-obsidian-for-personal-knowledge-management-insights-from-my-2-years-experience-f5e55012d163)

Best practice: Use Zotero for PDF/highlight storage, link into PKM system (Obsidian) for note-taking

**Framework Application**:
- Default to open-source tooling (Zotero integration over Mendeley)
- Provide reference import/export in standard formats (BibTeX, RIS)
- Enable PDF-to-metadata extraction
- Support citation style customization

---

## 10. Knowledge Graphs & Semantic Technologies

### 10.1 Knowledge Graph State (2025)

**Sources**: [IJCKG 2025](https://ijckg2025.github.io/), [KGSWC 2025](https://kgsw.org/)

Major conference themes:
- Knowledge Graph Enhanced LLMs (KG4LLM, LLM4KG)
- Knowledge Representation and Reasoning
- Ontology Modeling and Evolution
- Automated Knowledge Graph Construction

### 10.2 LLM + Knowledge Graph Integration

**Source**: [Branzan 2025](https://medium.com/@claudiubranzan/from-llms-to-knowledge-graphs-building-production-ready-graph-systems-in-2025-2b4aff1ec99a)

Transformation in past 18 months:
- What once required specialized NLP + months of annotation → achievable in days with LLMs
- Organizations achieving **300-320% ROI** on knowledge graph implementations
- AutoSchemaKG: Autonomous KG construction without predefined schemas

### 10.3 Enterprise Knowledge Graphs

**Source**: [Ontotext](https://www.ontotext.com/blog/the-semantic-web-20-years-later/)

KGs drive adoption of Semantic Web standards by:
- Introducing semantic metadata to data/content management
- Enabling new levels of efficiency in enterprise contexts
- Supporting complex querying and inference

**Framework Application**:
- Build citation network as knowledge graph
- Enable semantic queries across research corpus
- Implement ontology for research domain concepts
- Support automated relationship discovery via LLMs

---

## 11. Digital Preservation (OAIS Model)

### 11.1 OAIS Reference Model

**Sources**: [OCLC](https://www.oclc.org/research/publications/2000/lavoie-oais.html), [Wikipedia](https://en.wikipedia.org/wiki/Open_Archival_Information_System)

Open Archival Information System (ISO 14721:2025) - conceptual model for digital archives:

**Information Packages**:
- **SIP (Submission)**: Package delivered by producer for ingest
- **AIP (Archival)**: Complete preserved package with all metadata
- **DIP (Dissemination)**: Package delivered to consumer on request

**Functional Entities**:
- **Ingest**: Accepts SIPs, creates AIPs
- **Data Management**: Maintains descriptive metadata databases
- **Archival Storage**: Stores and retrieves AIPs
- **Access**: Provides discovery and delivery
- **Administration**: Day-to-day operations
- **Preservation Planning**: Monitors threats, recommends revisions

### 11.2 OAIS v3 (December 2024)

**Source**: [Preservica](https://preservica.com/resources/blogs-and-news/what-you-need-to-know-about-the-most-recent-oais-revision)

Latest revision brings updates aligned with modern preservation needs.

### 11.3 Complementary Standards

- **ISO 16363**: Trustworthy digital repository certification
- **DCC Lifecycle Model**: Emphasizes actions throughout data lifecycle

**Framework Application**:
- Model artifact lifecycle on OAIS concepts
- Implement SIP/AIP/DIP equivalents for research content
- Create preservation planning workflows
- Track integrity via checksums and audit logs

---

## 12. Evidence Quality Assessment (GRADE)

### 12.1 GRADE Framework

**Sources**: [GRADE Working Group](https://www.gradeworkinggroup.org/), [Cochrane Handbook](https://handbook-5-1.cochrane.org/chapter_12/12_2_1_the_grade_approach.htm)

GRADE (Grading of Recommendations, Assessment, Development and Evaluations) - most widely adopted evidence grading system:
- **100+ organizations** worldwide officially endorse GRADE
- Used by WHO, NICE (UK), Cochrane Collaboration, UpToDate

### 12.2 Evidence Levels

**Starting Points**:
- RCTs start as **high quality**
- Observational studies start as **low quality**

**Rating Factors** (5 down, 3 up):
- **Downgrade**: Risk of bias, inconsistency, indirectness, imprecision, publication bias
- **Upgrade**: Large effect, dose-response, confounding

**Final Categories**: High, Moderate, Low, Very Low

### 12.3 GRADE-CERQual

For qualitative evidence synthesis:
- Assesses confidence in findings based on: methodological limitations, coherence, adequacy, relevance
- Categories: High, Moderate, Low, Very Low confidence

### 12.4 Tools

- **GRADEpro**: Software for Summary of Findings (SoF) tables
- **GRADE Checklist**: Structured assessment of 5 downgrading domains

**Framework Application**:
- Implement GRADE-inspired quality scoring for research sources
- Distinguish evidence types (RCT equivalent → opinion piece)
- Track confidence levels for claims
- Generate quality assessment reports

---

## 13. Personal Knowledge Management Tools

### 13.1 Obsidian (2025 State)

**Sources**: [Glukhov 2025](https://www.glukhov.org/post/2025/07/obsidian-for-personal-knowledge-management/), [Obsibrain Blog](https://blog.obsibrain.com/other-articles/personal-knowledge-management-tools)

"In 2025, Obsidian has become a powerful knowledge management tool that has revolutionized how professionals, researchers, students, and creative thinkers build their personal knowledge systems."

**Key Features**:
- Local-first storage (Markdown files)
- Backlinking and graph visualization
- Extensive plugin ecosystem
- Free for personal use

**Research Workflow Patterns**:
- **Literature Notes**: Processed insights from external sources with attribution
- **Permanent Notes**: Your refined ideas, building on literature notes
- Zettelkasten implementation via atomic notes + heavy interlinking

### 13.2 Scaling PKM

**Source**: [Sebastien 2025](https://www.dsebastien.net/personal-knowledge-management-at-scale-analyzing-8-000-notes-and-64-000-links/)

Analysis of 8,000 notes / 64,000 links system:
- ~8 links per note average
- "It's not about collecting but about **connecting**"
- Global graph view unusable at scale (too slow)
- High link density adds value through relationships

### 13.3 Pricing (2025)

- Sync: $8/month (encrypted cross-device)
- Publish: $10/month (public sites)
- Commercial: ~$50/year

**Framework Application**:
- Support Obsidian-compatible Markdown output
- Enable high-density linking patterns
- Provide literature note templates
- Generate permanent note scaffolds from extractions

---

## 14. Research Collaboration Tools

### 14.1 Notion for Teams

**Source**: [Kubinec](https://www.robertkubinec.com/post/notion/), [Prime Productiv4](https://www.primeproductiv4.com/blog-articles/notion-vs-obsidian-vs-roam-research-productivity-comparison)

Strong collaboration features:
- Real-time editing
- Task assignment for managing complex collaborations
- Share individual records with up to 100 others (academic accounts)
- "Email replacement" for project communication

**Best For**: Teams, all-in-one workspaces, project management

### 14.2 Roam Research

Bi-directional linking focus:
- Network of interconnected notes
- AI-automated organization
- **Limitations**: Not built for effective team collaboration, scales poorly past 5K notes, $15/month per collaborator

**Best For**: Creative/research work, complex interconnected thinking

### 14.3 Hybrid Approaches

Common pattern: Notion for project management + team collaboration, Obsidian/Roam for personal knowledge management

**Framework Application**:
- Enable both solo researcher and team workflows
- Support export to collaboration platforms
- Provide project management integration points
- Maintain individual context while enabling sharing

---

## 15. LLM Literature Review Automation

### 15.1 Specialized Tools

**Source**: [Anara AI Guide](https://anara.com/blog/ai-for-literature-review), [LitLLM](https://litllm.github.io/)

**LitLLM** (ServiceNow Research):
- Transforms literature review writing using RAG
- Retrieves real papers from academic search engines
- Ranks by relevance
- Generates factual reviews grounded in actual publications
- Unlike traditional LLMs: **does not hallucinate sources**

**Consensus**: AI search engine for 200M+ academic papers
- Evidence-backed summaries with direct citations
- Every claim tied to a real paper

**Scite.ai**: Citation classification + LLM assistant
- Refines search strategies
- Reduces hallucination risk

### 15.2 Agent Laboratory (2025)

**Source**: [arXiv:2501.04227](https://arxiv.org/abs/2501.04227)

Multi-agent system for research workflow:
- Literature review → planning → experiments → report writing
- **84% decrease** in research expenses vs. previous autonomous methods

### 15.3 Limitations & Safeguards

**Source**: [ACS Applied Materials](https://pubs.acs.org/doi/10.1021/acsami.5c08837)

LLMs produce "plausible but unreliable statements" (hallucinations), especially at:
- Data extraction stage
- Synthesis stage (may misinterpret results)

**Current State**: "Not yet ready to fully automate the literature review process" - fail to meet top-tier publication standards in critical analysis and originality

**Framework Application**:
- Implement LLM-assisted extraction with human verification
- Use RAG-based tools (LitLLM pattern) to reduce hallucination
- Require citation backing for all AI-generated claims
- Build human-in-the-loop workflows for critical stages

---

## 16. Data Provenance & Lineage

### 16.1 Provenance for Reproducibility

**Source**: [PMC Semi-automated Provenance](https://pmc.ncbi.nlm.nih.gov/articles/PMC11931605/)

2025 prototype for Trusted Research Environments (TRE):
- Improves transparency and quality assurance
- Authenticates and audits data workflows
- Assists Data Analysts, researchers, and governance teams

W3C PROV usage increases:
- Reproducibility and trust of computer-generated outputs
- Provenance templates + domain-specific ontologies
- Meaningful abstraction of provenance information

### 16.2 Unified Lineage System (2025)

**Source**: [ACM SIGMOD/PODS 2025](https://dl.acm.org/doi/10.1145/3722212.3724458)

ULS (Unified Lineage System):
- End-to-end lineage aggregator at scale
- General data model for flows between asset types
- Navigation across granularities
- Stitching of incomplete lineage traces

### 16.3 AI/ML Provenance

Both lineage and provenance needed for AI systems:
- **Lineage**: How input data is processed before reaching model
- **Provenance**: Source and quality of training data

Critical for: avoiding bias, ensuring reproducibility, meeting ethical/regulatory guidelines

### 16.4 Best Practices

- Automate lineage extraction from orchestration tools (dbt, Airflow)
- Capture provenance logs during data creation/editing
- Embed metadata tags via CI/CD
- Consider blockchain for tamper-proof audit trails in high-compliance environments

**Framework Application**:
- Implement comprehensive provenance tracking for all operations
- Create lineage graphs for research artifacts
- Enable audit trail queries
- Support compliance reporting

---

## 17. Scientific Workflow Management

### 17.1 Major Systems Compared

**Sources**: [Nature Scientific Reports](https://www.nature.com/articles/s41598-021-99288-8), [Excelra](https://www.excelra.com/blogs/bioinformatics-workflow-managers/)

| System | Language | Strengths | Best For |
|--------|----------|-----------|----------|
| **Nextflow** | DSL (Groovy) | HPC/cloud, containerization, dataflow model | Scalability, distributed computing |
| **Snakemake** | Python | Mature, DAG visualization, Conda support | Moderate complexity, Python users |
| **CWL** | YAML | Interoperability, standardization | Consortia, regulated settings |

### 17.2 Nextflow

- Scalable across local → HPC → cloud
- Built-in containerization for reproducibility
- Dataflow programming simplifies parallelism
- "Stands out compared to simpler solutions... structure holds up well"

### 17.3 Snakemake

- Python-based, inspired by GNU Make
- 1000s of shared pipelines in Workflow Catalog
- Great Conda/container support
- "Recommended for pipelines with moderate complexity"

### 17.4 CWL (Common Workflow Language)

- Community-driven standardization effort
- Supported by Arvados, Galaxy, Seven Bridges
- "Designed for long-term clarity and correctness"
- Excellent for teams prioritizing stability and auditability

### 17.5 Emerging Tools (2025)

**Source**: [HAL 2025](https://hal.science/hal-05240352v1/document)

- **BioFlow-Model**: Improved reproducibility model for bioinformatics
- **Snakemaker**: AI-driven pipeline generation from terminal commands/notebooks

**Framework Application**:
- Support workflow definitions for research pipelines
- Enable containerization for reproducibility
- Provide DAG visualization for research processes
- Export to standard formats (CWL for interoperability)

---

## 18. Reproducibility Crisis & Open Science

### 18.1 Current State

**Sources**: [OPUS Project](https://opusproject.eu/openscience-news/he-reproducibility-crisis-how-open-science-can-save-research/), [Nature 2025](https://www.nature.com/articles/d41586-025-01266-x)

The reproducibility crisis: inability to replicate many published studies
- 2021 Center for Open Science study: **46% success rate** replicating 53 cancer studies
- Brazilian biomedical replication effort: "dismaying results"

**Key Challenges**:
- Selective reporting
- Pressure to publish
- Limited resources
- Lack of incentives
- Incomplete documentation
- Under-reporting of null/negative results

### 18.2 Open Science Solutions

**Source**: [Aging Well Lab](https://agingwell.utdallas.edu/2022/02/21/replication-and-open-science/)

Core practices:
- **Preregistration**: Log hypotheses, protocol, analyses before data collection
- **Open data/methods/code**: Full transparency for replication
- **Open-source data pipelines**: Visibility into processes and methodologies

### 18.3 2025 Policy Developments

**Source**: [C&EN 2025](https://cen.acs.org/research-integrity/reproducibility/Amid-White-House-claims-research/103/web/2025/06)

MAHA report recommendations:
- "Replicable, reproducible and generalizable research must serve as the basis for truth"
- NIH mandate: 0.1% of annual budget (~$48M) for replication studies
- Addressing replication crisis is first of 10 recommended steps

### 18.4 Effectiveness of Interventions

**Source**: [PMC Scoping Review 2025](https://pmc.ncbi.nlm.nih.gov/articles/PMC11979971/)

Analysis of interventions: 60/105 authors concluded positively, but evidence still limited on whether interventions actually improve reproducibility/replicability

"For the replication crisis to be solved: money needs to be there; incentives of science need to change; governments need to engage in earnest." - Goldman & Nosek

**Framework Application**:
- Enforce documentation standards that support replication
- Implement preregistration-equivalent workflows for research plans
- Track methodology transparency scores
- Generate reproducibility reports
- Support null result documentation

---

## 19. Proposed Framework Architecture

Based on comprehensive research findings across 15 topic areas, the Research Framework should include:

### 19.1 Lifecycle Stages (Enhanced)

```
Discovery → Acquisition → Documentation → Integration → Archival
    │           │              │              │            │
    ├── Search  ├── Download   ├── Summarize  ├── Cite     ├── Version
    ├── Screen  ├── Validate   ├── Extract    ├── Link     ├── Backup
    ├── Rank    ├── FAIRify    ├── Review     ├── Apply    ├── Prune
    └── Gap-ID  └── Organize   └── Grade      └── Network  └── Archive
```

**Cross-cutting Concerns**:
- Provenance tracking (W3C PROV) at every stage
- Quality assessment (GRADE-inspired) throughout
- FAIR compliance scoring
- Reproducibility documentation

### 19.2 Agent Specializations (Expanded)

| Agent | Stage | Key Capabilities | Research Basis |
|-------|-------|------------------|----------------|
| Discovery Agent | Discovery | API search, relevance ranking, gap detection, preregistration | PRISMA, Semantic Scholar |
| Acquisition Agent | Acquisition | PDF download, metadata extraction, FAIR validation | Zotero patterns, FAIR |
| Documentation Agent | Documentation | Summarization, data extraction, literature notes | Zettelkasten, LitLLM |
| Citation Agent | Integration | Citation formatting, claim backing, network building | Scite, Knowledge Graphs |
| Archival Agent | Archival | Version control, backup, OAIS compliance | OAIS model |
| Quality Agent | Cross-cutting | GRADE scoring, reproducibility checks, FAIR assessment | GRADE, F-UJI |
| Provenance Agent | Cross-cutting | Lineage tracking, audit trails, integrity verification | W3C PROV, ULS |
| Workflow Agent | Cross-cutting | Pipeline orchestration, DAG management, reproducibility | Snakemake/Nextflow patterns |

### 19.3 Artifact Structure (.aiwg/research/) - Expanded

```
.aiwg/research/
├── discovery/
│   ├── search-strategies/           # PRISMA-style reproducible queries
│   ├── screening-results/           # Screening decisions with rationale
│   ├── gap-analysis/                # Automated gap detection reports
│   └── preregistration/             # Research plans (open science)
├── sources/
│   ├── pdfs/                        # Original source files
│   ├── REF-XXX-metadata.json        # FAIR-compliant structured metadata
│   ├── REF-XXX-summary.md           # AI-generated summaries (LitLLM pattern)
│   ├── REF-XXX-extraction.json      # Structured data extraction
│   └── REF-XXX-quality.json         # GRADE-inspired quality scores
├── knowledge/
│   ├── literature-notes/            # Processed insights (Zettelkasten)
│   ├── permanent-notes/             # Refined ideas
│   ├── maps-of-content/             # Topic MoCs
│   └── claims-index.md              # Claims needing/having citations
├── networks/
│   ├── citation-network.json        # Citation relationships
│   ├── concept-graph.json           # Knowledge graph
│   └── author-network.json          # Collaboration networks
├── analysis/
│   ├── quality-scores.md            # Source quality assessments
│   ├── fair-compliance.md           # FAIR compliance reports
│   └── reproducibility-status.md    # Replication readiness
├── provenance/
│   ├── operations.log               # All research operations (W3C PROV)
│   ├── lineage/                     # Data lineage graphs
│   ├── transformations/             # Artifact transformation history
│   └── checksums.json               # Integrity verification
├── workflows/
│   ├── pipelines/                   # Research workflow definitions
│   ├── dag-visualizations/          # Process graphs
│   └── reproducibility-packages/    # Containerized environments
└── config/
    ├── search-config.yaml           # Search preferences
    ├── quality-criteria.yaml        # GRADE-based evaluation rules
    ├── fair-requirements.yaml       # FAIR compliance rules
    └── lifecycle-rules.yaml         # Automation rules
```

### 19.4 Key Differentiators from Media Curator

| Aspect | Media Curator | Research Framework |
|--------|---------------|-------------------|
| Methodology | Casual discovery | PRISMA-inspired protocol with preregistration |
| Quality | Basic validation | GRADE-inspired multi-dimensional scoring |
| Linking | Manual tagging | AI-powered citation networks + knowledge graphs |
| Gaps | Manual review | Automated gap detection with prioritization |
| Provenance | Basic tracking | W3C PROV-compatible with full lineage |
| Validation | Basic checks | Simulation-based verification + FAIR compliance |
| Notes | Flat structure | Zettelkasten (literature + permanent notes) |
| Workflows | Ad-hoc | Snakemake/CWL-style reproducible pipelines |
| Output | Single format | Multiple formats (Obsidian, BibTeX, OAIS packages) |

### 19.5 Integration Points

| External System | Integration Type | Purpose |
|-----------------|------------------|---------|
| Semantic Scholar API | Discovery | Paper search, citation data |
| Zotero | Acquisition | PDF management, metadata |
| Obsidian | Documentation | PKM sync, note templates |
| research-papers repo | Storage | Shared corpus management |
| Knowledge Graph DB | Analysis | Concept relationships |
| CI/CD | Workflows | Automated pipelines |

### 19.6 Quality Metrics Dashboard

The framework should track and display:
- FAIR compliance scores per source
- GRADE quality ratings
- Citation network density
- Gap analysis coverage
- Reproducibility status
- Provenance completeness

## 20. Research Sources

### Traditional Methodologies

- [PRISMA Statement](https://www.prisma-statement.org/) - Systematic review protocol
- [Zettelkasten Method](https://zettelkasten.de/) - Knowledge management
- Tiago Forte - Building a Second Brain / CODE cycle

### AI Research Tools

- [Semantic Scholar](https://www.semanticscholar.org/) - 200M+ papers, TLDR summaries
- [Elicit](https://elicit.com/) - 99.4% extraction accuracy
- [Research Rabbit](https://www.researchrabbit.ai/) - Citation graph mapping
- [Connected Papers](https://www.connectedpapers.com/) - Co-citation networks
- [Scite](https://scite.ai/) - Smart citation context
- [Litmaps](https://www.litmaps.com/) - Citation chain visualization
- [Consensus](https://consensus.app/) - Evidence-backed summaries
- [LitLLM](https://litllm.github.io/) - RAG-based literature review

### Data Management & Standards

- [GO FAIR](https://www.go-fair.org/fair-principles/) - FAIR principles
- [Nature: FAIR Principles](https://www.nature.com/articles/sdata201618) - Original 2016 paper
- [Bhat & Wani 2025](https://journals.sagepub.com/doi/10.1177/03400352241270692) - FAIRification process
- [OCLC OAIS](https://www.oclc.org/research/publications/2000/lavoie-oais.html) - Digital preservation model
- [GRADE Working Group](https://www.gradeworkinggroup.org/) - Evidence quality assessment

### Reproducibility & Provenance

- [R-LAM Framework (arXiv)](https://arxiv.org/html/2601.09749) - Reproducibility-constrained agents
- [Harvard Data Science Review](https://hdsr.mitpress.mit.edu/pub/ulfgjwy1) - Research lifecycle
- [PMC Provenance Study](https://pmc.ncbi.nlm.nih.gov/articles/PMC11931605/) - Semi-automated tracking
- [ACM ULS 2025](https://dl.acm.org/doi/10.1145/3722212.3724458) - Unified lineage system

### PKM & Collaboration Tools

- [Paperpile Comparison](https://paperpile.com/r/zotero-vs-mendeley/) - Reference managers
- [Obsidian PKM](https://www.glukhov.org/post/2025/07/obsidian-for-personal-knowledge-management/)
- [PKM at Scale](https://www.dsebastien.net/personal-knowledge-management-at-scale-analyzing-8-000-notes-and-64-000-links/)
- [Notion for Research](https://www.robertkubinec.com/post/notion/)

### Workflow & Automation

- [Excelra Workflow Managers](https://www.excelra.com/blogs/bioinformatics-workflow-managers/) - Nextflow/Snakemake/CWL
- [Agent Laboratory (arXiv)](https://arxiv.org/abs/2501.04227) - LLM agents for research
- [Anara AI Guide](https://anara.com/blog/ai-for-literature-review) - LLM literature review

### Knowledge Graphs

- [IJCKG 2025](https://ijckg2025.github.io/) - Knowledge graph conference
- [KGSWC 2025](https://kgsw.org/) - Semantic web conference
- [Branzan 2025](https://medium.com/@claudiubranzan/from-llms-to-knowledge-graphs-building-production-ready-graph-systems-in-2025-2b4aff1ec99a) - LLM+KG integration

### Citation Analysis

- [VOSviewer](https://www.vosviewer.com/) - Bibliometric networks
- [CitNetExplorer](https://www.citnetexplorer.nl/) - Citation exploration

### Reproducibility Crisis

- [OPUS Project](https://opusproject.eu/openscience-news/he-reproducibility-crisis-how-open-science-can-save-research/) - Open science solutions
- [C&EN 2025](https://cen.acs.org/research-integrity/reproducibility/Amid-White-House-claims-research/103/web/2025/06) - Policy developments
- [Nature 2025 Replication](https://www.nature.com/articles/d41586-025-01266-x) - Biomedical replication study

### Internal Sources

- research-papers repo structure and INDEX.md
- matric-memory issues #154, #155
- token-lifecycle/RNESS implementation
- ai-writing-guide research patterns
- REF-001: Production-Grade Agentic AI Workflows
- REF-003: Agentic Development Anti-Patterns

## 21. Next Steps

1. **Review Findings** - Present comprehensive research to stakeholders
2. **Design Architecture** - Create detailed framework architecture document incorporating all findings
3. **Define Agents** - Specify agent capabilities based on lifecycle stages
4. **Create Templates** - Design artifact templates (FAIR-compliant, GRADE-scored)
5. **Build Provenance System** - Implement W3C PROV-compatible tracking
6. **Integrate APIs** - Connect to Semantic Scholar, Zotero, etc.
7. **Create Tickets** - Detailed implementation issues with research backing

---

**Document Status**: Comprehensive research complete, ready for findings review
**Research Coverage**: 15 major topic areas, 50+ sources
**Next Task**: Review findings with stakeholder, then proceed to architecture design
