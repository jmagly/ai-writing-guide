# AIWG Terminology Glossary

**Version:** 2.0.0
**Last Updated:** 2026-01-25
**Status:** Official Reference

## Overview

This glossary documents AIWG's dual-terminology approach: accessible informal terms alongside professional/academic terminology. This enables practitioners to use familiar language while providing researchers and evaluators with precise technical framing backed by established standards.

### Purpose

1. **Bridge accessibility and rigor** - Support both day-to-day usage and academic discourse
2. **Standards alignment** - Map AIWG features to established research and industry standards
3. **Citation clarity** - Provide clear references for professional contexts
4. **Onboarding support** - Help new users understand AIWG's research foundations

### How to Use This Glossary

**Informal Terms** - Used in documentation, commands, and everyday work
**Professional Terms** - Used in research contexts, academic writing, and enterprise positioning
**Citations/Standards** - Research papers, industry standards, or specifications backing the professional terminology

> **Full Paper Documentation**: [roctinam/research-papers](https://git.integrolabs.net/roctinam/research-papers)

## Terminology by Domain

### Core Architecture Terms

These terms describe AIWG's fundamental cognitive architecture for AI-augmented development.

| Informal Term | Professional Term | Citation/Standard |
|---------------|-------------------|-------------------|
| Context stacks | Structured Semantic Memory | Graves et al. (2016) Neural Turing Machines REF-009 |
| Extended memory | Persistent Knowledge Store | Lewis et al. (2020) RAG REF-008 |
| `.aiwg/` directory | Artifact Repository | Software Engineering, Configuration Management |
| Multi-agent review | Ensemble Validation | Jacobs et al. (1991) Mixture of Experts REF-007 |
| Ralph loop | Closed-Loop Self-Correction | Control Theory, Roig (2025) REF-002 |
| Doc-code validation | Dual-Representation Consistency | Formal Verification Methods |
| 7±2 decomposition | Cognitive Load Optimization | Miller (1956) REF-005, Sweller (1988) REF-006 |
| Voice profiles | Continuous Style Representation | Neural Style Transfer Literature |
| Phase gates | Stage-Gate Process | Cooper (1990) Stage-Gate Systems REF-010 |
| @-mentions | Traceability Links | IEEE 830, DO-178C, Gotel & Finkelstein (1994) REF-011 |
| Capability dispatch | Semantic Service Discovery | Service-Oriented Architecture (SOA) |
| Agent coordination | Multi-Agent Orchestration | Multi-Agent Systems (MAS) Literature |
| Framework deployment | Cognitive Architecture Installation | SOAR, ACT-R Cognitive Architectures |
| Templates | Worked Examples | Sweller (1988) Cognitive Load Theory REF-006 |
| Flow commands | Standardized Operating Procedures | Hong et al. (2024) MetaGPT REF-013 |
| Agent specialization | Domain Expert Networks | Jacobs et al. (1991) REF-007, Qian et al. (2024) REF-012 |
| Context pollution | Distractor-Induced Interference | Roig (2025) REF-002 Archetype 3 |
| Grounding checkpoint | Source-of-Truth Verification | Roig (2025) REF-002 Archetype 1 mitigation |
| Recovery-first design | Fault-Tolerant Agentic Systems | Roig (2025) REF-002 |

### Data Management & FAIR Terms (REF-056)

AIWG's research management aligns with FAIR Principles (Findable, Accessible, Interoperable, Reusable) endorsed by G20, EU Horizon 2020, NIH, and UKRI.

| Informal Term | Professional Term | Standard |
|---------------|-------------------|----------|
| REF-XXX system | Persistent Identifiers | FAIR Principle F1, Wilkinson et al. (2016) REF-056 |
| Research docs | Metadata-Rich Entities | FAIR Principle F2 REF-056 |
| Cross-references | FAIR Interoperability | FAIR Principles I1-I3 REF-056 |
| Document Profile | Provenance Metadata | FAIR Principle R1.2 REF-056 |
| Source URL capture | Resolvable Identifiers | FAIR Principle A1 REF-056 |
| Machine-readable metadata | Semantic Annotation | FAIR Principle I1 REF-056 |
| Paper search | Discovery Mechanisms | FAIR Principle F4 REF-056 |
| Citation exports | Data Reuse Support | FAIR Principle R1.1 REF-056 |
| Version tracking | Qualified References | FAIR Principle F3 REF-056 |
| Research corpus | FAIR Data Collection | Wilkinson et al. (2016) REF-056 |

**Standards Endorsement:** FAIR Principles have 17,000+ citations and are mandated by major funding agencies worldwide.

### Agent Coordination Terms (REF-057)

Terms describing AIWG's multi-agent orchestration patterns based on recent research showing 84% cost reduction with human-in-the-loop validation.

| Informal Term | Professional Term | Citation |
|---------------|-------------------|----------|
| Human gates | Human-in-the-Loop Validation | Schmidgall et al. (2025) Agent Laboratory REF-057 |
| Quality gates | Editorial Gates | Agent Laboratory REF-057 |
| Cost optimization | Hierarchical Specialization | REF-057 (84% cost reduction) |
| Draft-then-edit | Iterative Refinement Pattern | Agent Laboratory Methodology REF-057 |
| Agent review | Draft-then-Refine Workflow | Schmidgall et al. (2025) REF-057 |
| Agent handoffs | Inter-Agent Communication | FIPA Agent Communication Standards |
| Review synthesis | Ensemble Aggregation | Machine Learning Ensemble Methods |
| Primary→Reviewers→Synthesizer | Mixture of Experts (MoE) | Jacobs et al. (1991) REF-007, Hong et al. (2024) REF-013 |

**Key Finding:** Human-in-the-loop validation reduces costs by 84% compared to fully autonomous systems while maintaining quality (REF-057).

### Reproducibility Terms (REF-058)

AIWG implements reproducibility constraints addressing the finding that 47% of AI workflows produce inconsistent results without proper controls.

| Informal Term | Professional Term | Citation |
|---------------|-------------------|----------|
| Workflow consistency | Reproducibility Constraints | R-LAM Sureshkumar et al. (2026) REF-058 |
| Config tracking | Environment Versioning | R-LAM Component 1: Environment REF-058 |
| Checkpoint/recovery | Workflow Checkpointing | R-LAM Component 2: Checkpoints REF-058 |
| Ralph state | Execution Provenance | R-LAM Component 3: Provenance REF-058 |
| Deterministic mode | Controlled Stochasticity | R-LAM Component 4: Determinism REF-058 |
| Run metadata | Execution Context | R-LAM Component 5: Metadata REF-058 |
| Iteration logs | Execution Trace | Software Tracing Literature |
| State snapshots | Workflow State Capture | R-LAM Checkpointing System REF-058 |

**Key Finding:** 47% of workflows produce different outputs without reproducibility constraints; acceptable overhead is 8-12% (REF-058).

### Citation Integrity Terms (REF-059)

AIWG's citation system implements retrieval-first architecture, eliminating the 56% hallucination rate observed in generation-only approaches.

| Informal Term | Professional Term | Citation |
|---------------|-------------------|----------|
| Citation rules | Retrieval-First Architecture | ServiceNow (2025) LitLLM REF-059 |
| Key Quotes | Grounded Generation | LitLLM Methodology REF-059 |
| Citation checking | Citation Verification Pipeline | LitLLM System REF-059 |
| No made-up refs | Anti-Hallucination Architecture | LitLLM RAG Implementation REF-059 |
| Source whitelist | Citation Whitelist | LitLLM Controlled Retrieval REF-059 |
| Reference validation | Bibliographic Verification | Library Science Standards |
| Citation extraction | Metadata Parsing | BibTeX, DOI Resolution |

**Key Finding:** Retrieval-first reduces hallucination from 56% (generation-only) to 0% (verified retrieval) (REF-059).

### Evidence Quality Terms (REF-060)

Source quality assessment aligned with GRADE (Grading of Recommendations Assessment, Development and Evaluation), used by 100+ organizations including WHO, Cochrane, and NICE.

| Informal Term | Professional Term | Standard |
|---------------|-------------------|----------|
| Source quality | Evidence Quality Levels | GRADE Methodology REF-060 |
| Good source | High-Quality Evidence | GRADE High Quality REF-060 |
| Needs verification | Low-Quality Evidence | GRADE Low Quality REF-060 |
| Quality notes | Explicit Quality Criteria | GRADE Assessment Framework REF-060 |
| Source type | Study Design Baseline | GRADE Starting Point REF-060 |
| Peer review status | Publication Quality | GRADE Domain: Study Design REF-060 |
| Citation count | Impact Assessment | Bibliometrics |
| Authority check | Source Credibility | Information Literacy Standards |

**Standards Adoption:** GRADE is used by WHO, Cochrane, NICE, and 100+ health organizations for evidence assessment (REF-060).

### Archival Terms (REF-061)

AIWG's research intake implements the OAIS (Open Archival Information System) reference model, an ISO standard for digital preservation.

| Informal Term | Professional Term | Standard |
|---------------|-------------------|----------|
| Research intake | Submission Information Package (SIP) | OAIS/ISO 14721:2025 REF-061 |
| REF-XXX docs | Archival Information Package (AIP) | OAIS/ISO 14721:2025 REF-061 |
| Exports/citations | Dissemination Information Package (DIP) | OAIS/ISO 14721:2025 REF-061 |
| `/research-acquire` | Ingest Function | OAIS Functional Model REF-061 |
| Checksums | Fixity Information | OAIS Preservation Description Information REF-061 |
| `.aiwg/research/` | Archival Storage | OAIS Storage Architecture REF-061 |
| INDEX.md/search | Data Management Function | OAIS Access Mechanisms REF-061 |
| Paper metadata | Descriptive Information | OAIS Package Description REF-061 |
| Format preservation | Representation Information | OAIS Content Preservation REF-061 |

**Standards Compliance:** OAIS is ISO 14721:2025, the international standard for trusted digital repositories.

### Provenance Terms (REF-062)

AIWG tracks artifact derivation using W3C PROV (Provenance Data Model), enabling full traceability chains.

| Informal Term | Professional Term | Standard |
|---------------|-------------------|----------|
| Artifacts | PROV Entities | W3C PROV-DM (2013) REF-062 |
| Operations | PROV Activities | W3C PROV-DM (2013) REF-062 |
| Agent attribution | PROV Agents | W3C PROV-DM (2013) REF-062 |
| "Created from" | wasDerivedFrom | W3C PROV Relation REF-062 |
| "Produced by" | wasGeneratedBy | W3C PROV Relation REF-062 |
| "Performed by" | wasAssociatedWith | W3C PROV Relation REF-062 |
| Derivation chain | Provenance Chain | W3C PROV Graph REF-062 |
| Operation log | PROV-N Notation | W3C PROV Serialization REF-062 |
| Source tracking | Backward Provenance | W3C PROV Queries REF-062 |
| Impact analysis | Forward Provenance | W3C PROV Queries REF-062 |
| Audit trail | Provenance Graph | W3C PROV Model REF-062 |

**Standards Compliance:** W3C PROV is a W3C Recommendation (2013) for representing and interchanging provenance information.

### MCP Protocol Terms (REF-066)

AIWG exposes functionality via MCP (Model Context Protocol), a Linux Foundation standard with 10,000+ active servers.

| Informal Term | Professional Term | Standard |
|---------------|-------------------|----------|
| Tool definitions | MCP Tools (Action Primitives) | MCP Specification 2025 REF-066 |
| Resource endpoints | MCP Resources | MCP Specification 2025 REF-066 |
| Prompt templates | MCP Prompts | MCP Specification 2025 REF-066 |
| Long-running ops | MCP Tasks | MCP Specification 2025 REF-066 |
| Server info | Server Discovery (.well-known) | MCP Specification 2025 REF-066 |
| stdio mode | stdio Transport | MCP Specification 2025 REF-066 |
| HTTP mode | Streamable HTTP Transport | MCP Specification 2025 REF-066 |
| Capability negotiation | Protocol Initialization | MCP Handshake REF-066 |
| Progress tracking | Progress Tokens | MCP Task Protocol REF-066 |
| Server metadata | Server Capabilities | MCP Discovery Protocol REF-066 |

**Ecosystem Size:** MCP has 10,000+ active servers and is maintained by the Agentic AI Foundation under Linux Foundation governance (REF-066).

## Additional Cross-Domain Terms

### Software Engineering Process

| Informal Term | Professional Term | Citation/Standard |
|---------------|-------------------|-------------------|
| Inception phase | Requirements Elicitation | Rational Unified Process (RUP) |
| Elaboration phase | Architecture & Design | RUP, ISO/IEC 12207 |
| Construction phase | Implementation & Testing | RUP, ISO/IEC 12207 |
| Transition phase | Deployment & Operations | RUP, ISO/IEC 12207 |
| Risk register | Risk Management Plan | PMI PMBOK, ISO 31000 |
| Use cases | Functional Requirements | IEEE 830, UML Specification |
| NFRs | Non-Functional Requirements | ISO/IEC 25010 Quality Model |
| Traceability matrix | Requirements Traceability | IEEE 830, DO-178C |
| Milestones (LOM, ABM, IOC, PR) | Phase Gate Deliverables | Cooper (1990) REF-010, Kruchten (2004) |
| Dual-track iteration | Agile Discovery/Delivery | RUP, SAFe |

### LLM System Design

| Informal Term | Professional Term | Citation |
|---------------|-------------------|----------|
| Context window | Working Memory Capacity | Transformer Architecture |
| Token limits | Context Length Constraints | LLM Technical Specifications |
| Structured reasoning | Chain-of-Thought (CoT) | Wei et al. (2022) REF-016 |
| Multi-path validation | Self-Consistency Decoding | Wang et al. (2023) |
| Deliberate planning | Tree of Thoughts (ToT) | Yao et al. (2023) |
| Tool-augmented reasoning | ReAct Pattern | Yao et al. (2023) |
| Search-based planning | Language Agent Tree Search | Zhou et al. (2024) |
| Verbal learning | Reflexion | Shinn et al. (2023) REF-015 |
| Principle-based review | Constitutional AI | Bai et al. (2022) |
| LLM orchestration | Task Controller Pattern | Shen et al. (2023) |
| Conversation coordination | Multi-Agent Conversation | Wu et al. (2023) AutoGen |
| Few-shot examples | In-Context Learning | Dong et al. (2024), Brown et al. (2020) GPT-3 |
| Prompt engineering | Instruction Tuning | NLP Literature |
| Temperature settings | Sampling Hyperparameters | Probabilistic Text Generation |
| System prompts | Behavioral Conditioning | LLM System Design |

### Quality Assurance

| Informal Term | Professional Term | Citation/Standard |
|---------------|-------------------|-------------------|
| Test coverage | Code Coverage Metrics | ISO/IEC 25023 |
| Security review | Security Assurance | OWASP, ISO 27001 |
| Performance testing | Non-Functional Validation | ISO/IEC 25010 |
| Acceptance criteria | Verification Conditions | IEEE 829 Test Documentation |
| Defect tracking | Issue Management | ISO/IEC 90003 |

## Category Index

### Memory & Retrieval

| Term | Professional | Citation |
|------|--------------|----------|
| Context stacks | Structured Semantic Memory | REF-009 Graves et al. |
| Extended memory | RAG | REF-008 Lewis et al. |
| .aiwg/ directory | Non-Parametric Store | REF-008 Lewis et al. |

### Multi-Agent Systems

| Term | Professional | Citation |
|------|--------------|----------|
| Multi-agent review | Ensemble Validation | REF-007 Jacobs et al. |
| Primary→Reviewers→Synthesizer | Mixture of Experts | REF-007, REF-013 Hong et al. |
| Agent specialization | Domain Expert Networks | REF-007, REF-012 Qian et al. |
| Capability dispatch | Semantic Service Discovery | SOA |
| Human gates | Human-in-the-Loop Validation | REF-057 Schmidgall et al. |

### Iteration & Recovery

| Term | Professional | Citation |
|------|--------------|----------|
| Ralph loop | Closed-Loop Self-Correction | REF-015 Madaan et al., REF-002 Roig |
| Recovery-first design | Fault-Tolerant Systems | REF-002 Roig |
| Workflow consistency | Reproducibility Constraints | REF-058 R-LAM |

### Cognitive Load

| Term | Professional | Citation |
|------|--------------|----------|
| 7±2 decomposition | Cognitive Load Optimization | REF-005 Miller, REF-006 Sweller |
| Templates | Worked Examples | REF-006 Sweller |

### Process Management

| Term | Professional | Citation |
|------|--------------|----------|
| Phase gates | Stage-Gate Process | REF-010 Cooper |
| Flow commands | Standardized Operating Procedures | REF-013 Hong et al. |
| @-mentions | Traceability Links | REF-011 Gotel & Finkelstein |

### Research Management

| Term | Professional | Citation |
|------|--------------|----------|
| REF-XXX system | Persistent Identifiers | REF-056 FAIR F1 |
| Research intake | OAIS SIP | REF-061 ISO 14721 |
| Citation rules | Retrieval-First Architecture | REF-059 LitLLM |
| Source quality | Evidence Quality Levels | REF-060 GRADE |
| Provenance tracking | W3C PROV | REF-062 PROV-DM |

### Failure Modes

| Term | Professional | Citation |
|------|--------------|----------|
| Context pollution | Distractor-Induced Interference | REF-002 Roig Archetype 3 |
| Grounding checkpoint | Source-of-Truth Verification | REF-002 Roig Archetype 1 |

## Usage Guidelines

### When to Use Informal Terms

- Day-to-day development work
- Documentation for practitioners
- CLI commands and tool names
- Internal team communication
- Quick reference materials

### When to Use Professional Terms

- Academic papers and presentations
- Research documentation (`docs/research/`)
- Enterprise positioning and proposals
- Standards compliance documentation
- Grant applications and formal proposals
- Conference presentations and papers

### When to Use Both

- Introductory documentation (professional term with informal in parentheses)
- Glossaries and reference materials
- Bridge content for mixed audiences
- Educational materials

**Example Pattern:**
> "AIWG implements **structured semantic memory** (context stacks) to maintain knowledge across sessions..."

### In Practitioner Docs

Use dual inline format:
> AIWG implements **structured semantic memory** (context stacks) to maintain project knowledge across sessions.

### In Research Docs

Use full citations:
> AIWG's memory architecture draws on Retrieval-Augmented Generation (Lewis et al., 2020 REF-008), extending the pattern with bidirectional traceability links (Gotel & Finkelstein, 1994 REF-011).

### In README

Use professional terms only (no inline citations):
> AIWG provides structured semantic memory, ensemble validation, and closed-loop self-correction.

## Standards Endorsement Summary

AIWG aligns with widely-adopted standards and research-backed methodologies:

| Standard/Framework | Adoption | AIWG Application |
|-------------------|----------|------------------|
| **FAIR Principles** | G20, EU, NIH, UKRI (17,000+ citations) | REF-XXX system, research management |
| **OAIS/ISO 14721** | International archival standard | Research intake lifecycle (SIP→AIP→DIP) |
| **W3C PROV** | W3C Recommendation (2013) | Artifact provenance tracking |
| **GRADE** | 100+ orgs (WHO, Cochrane, NICE) | Source quality assessment |
| **MCP** | Linux Foundation (10,000+ servers) | Tool/resource exposure |
| **R-LAM** | Reproducibility research (2026) | Workflow consistency constraints |
| **LitLLM** | Citation integrity research (2025) | Retrieval-first architecture |
| **Agent Laboratory** | Multi-agent coordination (2025) | Human-in-the-loop patterns |

## Quantified Claims Reference

Key research-backed statistics for AIWG positioning:

| Claim | Value | Source | Context |
|-------|-------|--------|---------|
| Cost reduction with HITL | **84%** | REF-057 | Agent Laboratory study |
| Workflow failure rate | **47%** | REF-058 | Without reproducibility constraints |
| Citation hallucination | **56%** | REF-059 | Generation-only approaches |
| Hallucination with retrieval | **0%** | REF-059 | Retrieval-first architecture |
| FAIR citations | **17,000+** | REF-056 | Academic validation |
| GRADE adoption | **100+ orgs** | REF-060 | Including WHO, Cochrane, NICE |
| MCP ecosystem | **10,000+** | REF-066 | Active servers |
| Reproducibility overhead | **8-12%** | REF-058 | Acceptable performance cost |

## References

Full citations for all standards and research papers can be found in:

- `docs/references/` - Individual REF-XXX reference files
- `.aiwg/research/paper-analysis/` - AIWG-specific analysis documents
- `.aiwg/research/paper-analysis/INDEX.md` - Complete research corpus index

### Key Reference Files

| REF | Title | Domain |
|-----|-------|--------|
| REF-002 | Roig (2025) - LLM Failure Modes | Failure Analysis |
| REF-005 | Miller (1956) - Magical Number Seven | Cognitive Load |
| REF-006 | Sweller (1988) - Cognitive Load Theory | Cognitive Load |
| REF-007 | Jacobs et al. (1991) - Mixture of Experts | Multi-Agent Systems |
| REF-008 | Lewis et al. (2020) - RAG | Memory & Retrieval |
| REF-009 | Graves et al. (2016) - Neural Turing Machines | Memory Systems |
| REF-010 | Cooper (1990) - Stage-Gate Systems | Process Management |
| REF-011 | Gotel & Finkelstein (1994) - Traceability | Requirements Engineering |
| REF-012 | Qian et al. (2024) - ChatDev | Multi-Agent Systems |
| REF-013 | Hong et al. (2024) - MetaGPT | Multi-Agent Systems |
| REF-015 | Madaan et al. (2023) - Self-Refine | Iteration & Recovery |
| REF-056 | Wilkinson et al. (2016) - FAIR Principles | Data Management |
| REF-057 | Schmidgall et al. (2025) - Agent Laboratory | Agent Coordination |
| REF-058 | Sureshkumar et al. (2026) - R-LAM | Reproducibility |
| REF-059 | ServiceNow (2025) - LitLLM | Citation Integrity |
| REF-060 | GRADE Working Group (2004-2025) | Evidence Quality |
| REF-061 | CCSDS (2024) - OAIS ISO 14721 | Archival Science |
| REF-062 | W3C (2013) - PROV-DM | Provenance |
| REF-066 | Agentic AI Foundation (2025) - MCP Spec | AI Protocols |

## Maintenance

This glossary is maintained alongside AIWG's research corpus. When new research is integrated or standards are updated:

1. Add new terms to appropriate domain section
2. Update citation references
3. Add quantified claims to reference table
4. Update standards endorsement section
5. Increment version number
6. Update "Last Updated" date

**Maintainers:** Documentation Professionalization Team
**Review Cycle:** Quarterly or when major research additions occur
**Issue Tracker:** [Issue #68 - Terminology Mapping](https://git.integrolabs.net/roctinam/ai-writing-guide/issues/68)

---

**Glossary Version:** 2.0.0
**Last Updated:** 2026-01-25
**Status:** Official Reference
**Related Documentation:**
- @docs/research/research-background.md - Research foundations
- @.aiwg/planning/documentation-professionalization-plan.md - Professional terminology strategy
- @.aiwg/research/paper-analysis/INDEX.md - Complete research corpus
- [roctinam/research-papers](https://git.integrolabs.net/roctinam/research-papers) - Full paper repository
