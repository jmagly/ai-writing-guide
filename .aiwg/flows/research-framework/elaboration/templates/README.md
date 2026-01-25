# AIWG Research Framework Templates

This directory contains template designs for all artifacts produced by the AIWG Research Framework. Each template follows established standards (FAIR, W3C PROV, GRADE, OAIS) and includes complete structure, validation rules, and examples.

## Template Inventory

| Template | Purpose | Producing Agent | Use Case | Standards |
|----------|---------|----------------|----------|-----------|
| **REF-XXX-template.md** | Source documentation metadata | Acquisition Agent | UC-RF-002, UC-RF-003 | FAIR Principles |
| **literature-note-template.md** | Zettelkasten literature notes | Documentation Agent | UC-RF-003 | Zettelkasten Method |
| **claims-index-template.md** | Track citeable claims and backing | Citation Agent | UC-RF-004 | - |
| **gap-analysis-report-template.md** | Coverage gap identification | Gap Analysis Agent | UC-RF-009 | - |
| **quality-assessment-template.md** | Source quality evaluation | Quality Agent | UC-RF-006 | GRADE, FAIR |
| **provenance-record-template.json** | W3C PROV provenance logging | Provenance Agent | UC-RF-005 | W3C PROV |
| **workflow-status-template.md** | Research workflow tracking | Workflow Agent | UC-RF-008 | - |
| **oais-export-package-template.md** | OAIS archival/dissemination packages | Archival Agent | UC-RF-007, UC-RF-010 | OAIS (ISO 14721) |

---

## Template Summaries

### 1. REF-XXX Template (Source Documentation)

**File:** `REF-XXX-template.md`
**Purpose:** Document research sources with complete metadata for acquisition, quality assessment, and citation

**Key Sections:**
- **Metadata:** YAML frontmatter with ref_id, authors, year, DOI, tags, status
- **Citation:** Full citation and BibTeX
- **Abstract:** Paper summary
- **Research Context:** Problem, contribution, methodology, results
- **Relevance to AIWG:** Why acquired, expected application
- **File Integrity:** Checksums (SHA-256)
- **Provenance:** Acquisition and documentation history
- **FAIR Compliance:** Checklist for Findable, Accessible, Interoperable, Reusable

**Validation Rules:**
- Required fields: ref_id, title, authors, year, url, checksum
- FAIR compliance: Minimum 2/4 principles met
- Checksum validation on file changes

**Producing Agent:** Acquisition Agent (UC-RF-002)
**Updated By:** Documentation Agent (UC-RF-003), Quality Agent (UC-RF-006)

**Example:** REF-025 (Constitutional AI paper) with complete metadata, FAIR 4/4 compliance

---

### 2. Literature Note Template (Zettelkasten)

**File:** `literature-note-template.md`
**Purpose:** Create atomic, linked notes following Zettelkasten method for knowledge synthesis

**Key Sections:**
- **Metadata:** Note ID, type (literature/permanent/fleeting/MoC), source reference, tags, links
- **Source:** Full citation with link to REF-XXX
- **Main Idea:** ONE atomic concept (Zettelkasten principle)
- **Summary:** 100-300 words in own words (What, How, Why, Evidence)
- **Key Points:** 2-5 findings with evidence
- **Claims:** Citeable assertions with confidence levels
- **Personal Insights:** Connections, questions, applications, critique
- **Methodology:** Study design, sample size, validation
- **Context:** Problem space, prior work, impact
- **Links:** Related notes, permanent notes, Maps of Content

**Validation Rules:**
- Atomicity: ONE main idea per note (max 500 words)
- Clarity: Understandable without source paper
- Links: At least 1 link to related note (when corpus >10 notes)
- Tags: Concept-based, not paper-based

**Producing Agent:** Documentation Agent (UC-RF-003)
**Used By:** Citation Agent (UC-RF-004), Gap Analysis Agent (UC-RF-009)

**Example:** REF-025 literature note on Constitutional AI with atomic concept, claims, and synthesis insights

---

### 3. Claims Index Template

**File:** `claims-index-template.md`
**Purpose:** Track all citeable claims in AIWG documentation and their backing sources

**Key Sections:**
- **Metadata:** Total claims, backed claims, unbacked claims, coverage percentage
- **Claims Summary:** Metrics table (target: 100% backing)
- **Claim Entries:** CLAIM-XXX with statement, location, type, backing status, sources, GRADE rating
- **Unbacked Claims:** Priority tracking for source acquisition
- **Flagged Claims:** Claims with conflicting evidence
- **Deprecated Claims:** Claims no longer used
- **Coverage by Document:** Per-document backing percentage
- **Citation Workflow Integration:** Lifecycle diagram

**Validation Rules:**
- Claim ID: Unique CLAIM-XXX identifier
- Backing requirements: At least 1 primary source with GRADE rating
- Coverage target: 100% before Construction phase
- Unbacked claims: <5% at any time

**Producing Agent:** Citation Agent (UC-RF-004)
**Updated By:** Gap Analysis Agent (UC-RF-009)

**Example:** CLAIM-002 (RAG reduces hallucinations by >80%) with dual-source backing, GRADE High rating

---

### 4. Gap Analysis Report Template

**File:** `gap-analysis-report-template.md`
**Purpose:** Identify research coverage gaps across topics, citations, and source diversity

**Key Sections:**
- **Metadata:** Corpus size, coverage score, identified gaps, priorities
- **Executive Summary:** Coverage percentage, key findings, recommendations
- **Corpus Overview:** Size, composition, date range, quality distribution
- **Coverage Analysis:**
  - **Topic Coverage:** Expected vs. actual coverage by topic
  - **Citation Completeness:** Orphaned citations (cited but not in corpus)
  - **Source Diversity:** Publication types, date range, author concentration
- **Coverage Score Calculation:** Weighted (Topic 50%, Citation 30%, Diversity 20%)
- **Recommendations:** High/Medium/Low priority gap-filling actions
- **Gap-Filling Action Plan:** Immediate, follow-up, future enhancements
- **Gap Analysis Changelog:** Track coverage improvement over time

**Validation Rules:**
- Coverage thresholds: Excellent (85-100%), Good (70-84%), Fair (50-69%), Poor (<50%)
- Gap priorities: High (missing topics, >10 orphaned citations), Medium (under-represented, 5-10 citations), Low (minor diversity gaps)
- Minimum corpus size: 10 sources (statistical validity)

**Producing Agent:** Gap Analysis Agent (UC-RF-009)
**Used By:** Discovery Agent (gap-filling searches), User (strategic planning)

**Example:** 25-source corpus with 76.5% coverage, 3 high-priority gaps (Agent Safety, Evaluation Methods, orphaned citations)

---

### 5. Quality Assessment Template

**File:** `quality-assessment-template.md`
**Purpose:** Evaluate research source quality using multi-dimensional scoring, GRADE, and FAIR

**Key Sections:**
- **Metadata:** ref_id, overall_score (0-100), grade_rating (High/Moderate/Low/Very Low), fair_score (0-4)
- **Executive Summary:** Overall assessment and recommendation
- **Multi-Dimensional Quality Assessment:**
  - **Authority (30%):** Author credentials, publisher reputation
  - **Currency (20%):** Publication date, topic timeliness
  - **Accuracy (25%):** Peer review, methodology, reproducibility
  - **Coverage (15%):** Topic depth, breadth, completeness
  - **Objectivity (10%):** Bias detection, balanced perspective
- **GRADE Assessment:** Risk of bias, consistency, directness, precision, publication bias
- **FAIR Principles Validation:** Findable, Accessible, Interoperable, Reusable (checklist)
- **Strengths and Limitations:** 3 each, with critical issues flagged
- **Recommendations:** Approved/Conditional/Rejected, citation confidence level

**Validation Rules:**
- Overall score = weighted average of 5 dimensions
- GRADE score follows dimension rules (sum to 100)
- FAIR score matches number of principles met (0-4)
- Quality thresholds: High (70-100), Moderate (50-69), Low (<50)

**Producing Agent:** Quality Agent (UC-RF-006)
**Used By:** Citation Agent (confidence levels), Gap Analysis Agent (corpus quality)

**Example:** REF-025 quality assessment with 92/100 score, GRADE High, FAIR 4/4 compliance

---

### 6. Provenance Record Template (W3C PROV)

**File:** `provenance-record-template.json`
**Purpose:** Log all research operations in W3C PROV-compliant format for reproducibility

**Key Sections:**
- **Prefix:** W3C PROV namespaces (prov, aiwg, xsd)
- **Entity:** Data artifacts (source metadata, summaries, extractions, notes)
- **Activity:** Operations (discovery, acquisition, documentation, citation, quality assessment)
- **Agent:** Actors (user, software agents, external APIs)
- **Relationships:**
  - **wasGeneratedBy:** Entity created by activity
  - **used:** Activity consumed entity
  - **wasAssociatedWith:** Activity performed by agent
  - **wasAttributedTo:** Entity attributed to agent
  - **wasDerivedFrom:** Entity derived from another
  - **wasInformedBy:** Activity triggered by another
- **Plan:** Workflow definitions (5-stage research framework)
- **Bundle:** Session groupings
- **Collection:** Research corpus membership

**Validation Rules:**
- W3C PROV-JSON schema compliance: 100%
- All entities have unique IDs and timestamps (ISO 8601)
- Relationships reference valid entities/activities
- Checksums included for all artifacts (SHA-256)

**Producing Agent:** Provenance Agent (UC-RF-005)
**Used By:** External researchers (reproducibility), Archival Agent (package assembly)

**Example Logs:**
- Discovery search (query → results)
- Documentation (PDF → summary)
- Citation integration (extraction → architecture doc)

---

### 7. Workflow Status Template

**File:** `workflow-status-template.md`
**Purpose:** Track real-time research workflow progress across 5 stages

**Key Sections:**
- **Metadata:** workflow_id, current_stage, overall_progress, status
- **Workflow Overview:** Session ID, current stage, overall progress percentage
- **Stage Progress:** 5 stages (Discovery, Acquisition, Documentation, Integration, Archival)
  - Status, progress, duration
  - Substeps with checkboxes
  - Output artifacts
  - Metrics (e.g., sources documented, claims backed)
  - Issues/blockers
  - Next steps
- **Overall Metrics:** Corpus statistics, time tracking, quality metrics
- **Active Tasks:** Current, queued, backlog with owners and due dates
- **Checkpoints and Gates:** Criteria for stage transitions
- **Errors and Warnings:** Blocking errors, non-blocking warnings
- **Provenance Summary:** Records generated, compliance status
- **Agent Status:** Per-agent status (idle/busy, current task)
- **Next Actions:** Immediate, short-term, medium-term

**Validation Rules:**
- Overall progress = weighted average of stage progress
- Stage status aligns with substep completion
- Gate criteria evaluated before stage transitions
- Tasks have owners and due dates

**Producing Agent:** Workflow Agent (UC-RF-008)
**Updated By:** All agents (real-time updates)

**Example:** Research session with Discovery complete, Acquisition 70%, Documentation pending, showing 7/10 PDFs acquired

---

### 8. OAIS Export Package Template

**File:** `oais-export-package-template.md`
**Purpose:** Define structure for archival (AIP) and dissemination (DIP) packages following OAIS standard

**Key Sections:**
- **Overview:** OAIS model (SIP, AIP, DIP)
- **Package Metadata:** Package ID, type, version, OAIS compliance, corpus size, purpose
- **OAIS Information Model:**
  - **Content Information:** Data + Representation Info
  - **Preservation Description:** Provenance, context, reference, fixity
  - **Descriptive Information:** Title, abstract, keywords, authors
  - **Packaging Information:** Structure, manifest, relationships
- **DIP Structure:** Directory layout (content, provenance, representation-info, fixity)
  - Excludes PDFs (copyright), includes metadata for acquisition
  - Size: ~5 MB (160 files)
- **AIP Structure:** Same as DIP + PDFs (if copyright allows), migration plans, audit logs
- **Core Files:**
  - **README.md:** Package overview, usage, citation
  - **MANIFEST.txt:** File listing with SHA-256 checksums
  - **package-metadata.json:** OAIS-compliant metadata
  - **fixity/verify.sh:** Integrity verification script
- **Export Workflow:** 8 steps from selection to upload
- **Validation Rules:** OAIS compliance checklist, DIP/AIP-specific requirements

**Producing Agent:** Archival Agent (UC-RF-007, UC-RF-010)
**Used By:** External researchers (reproducibility), Archival repositories (preservation), Publication venues (supplements)

**Example:** DIP package for publication supplement with 25 sources, W3C PROV logs, FAIR compliance, ~5 MB

---

## Standards Compliance

### FAIR Principles (Findable, Accessible, Interoperable, Reusable)
**Applied in:**
- REF-XXX Template (source documentation)
- Quality Assessment Template (FAIR validation)
- OAIS Export Package (metadata completeness)

**Requirements:**
- Persistent identifiers (DOI, ArXiv ID)
- Complete metadata
- Standard formats (Markdown, JSON, BibTeX)
- Clear licenses

---

### W3C PROV (Provenance Standard)
**Applied in:**
- Provenance Record Template (all operations)
- OAIS Export Package (provenance logs)

**Requirements:**
- Entity, Activity, Agent model
- Relationships (wasGeneratedBy, used, wasAttributedTo, wasDerivedFrom)
- ISO 8601 timestamps
- Unique identifiers

---

### GRADE (Evidence Quality Assessment)
**Applied in:**
- Quality Assessment Template (GRADE scoring)
- Claims Index Template (claim confidence)

**Dimensions:**
- Risk of bias (study design)
- Consistency (agreement with other studies)
- Directness (relevance to question)
- Precision (statistical power)
- Publication bias (selective reporting)

**Ratings:** High (80-100), Moderate (60-79), Low (40-59), Very Low (<40)

---

### OAIS (Open Archival Information System - ISO 14721:2012)
**Applied in:**
- OAIS Export Package Template (archival/dissemination)

**Information Model:**
- Content Information (data + representation)
- Preservation Description (provenance, context, fixity)
- Descriptive Information (metadata)
- Packaging Information (structure, manifest)

**Package Types:**
- **SIP (Submission):** Content submitted for archival
- **AIP (Archival):** Content stored for preservation (includes PDFs, migration plans)
- **DIP (Dissemination):** Content distributed to users (excludes PDFs, smaller)

---

### Zettelkasten Method
**Applied in:**
- Literature Note Template (atomic notes)

**Principles:**
- **Atomic:** One idea per note
- **Autonomous:** Understandable without source
- **Connected:** Links to related notes
- **Permanent:** Long-term knowledge building

---

## Template Usage by Workflow Stage

### Stage 1: Discovery (UC-RF-001)
**Outputs:**
- Search strategy document (no template, ad-hoc)
- Search results JSON (no template, API format)

### Stage 2: Acquisition (UC-RF-002)
**Outputs:**
- **REF-XXX-template.md** - Source documentation

### Stage 3: Documentation (UC-RF-003)
**Outputs:**
- REF-XXX summary (embedded in REF-XXX-template.md)
- REF-XXX extraction JSON (no template, schema in agent spec)
- **literature-note-template.md** - Zettelkasten note

### Stage 4: Integration (UC-RF-004)
**Outputs:**
- **claims-index-template.md** - Claims tracking
- AIWG documentation (updated with citations, no template)

### Stage 5: Archival (UC-RF-007, UC-RF-010)
**Outputs:**
- **oais-export-package-template.md** - Export package

### Cross-Cutting (UC-RF-005, UC-RF-006, UC-RF-008, UC-RF-009)
**Outputs:**
- **provenance-record-template.json** - W3C PROV logs (all operations)
- **quality-assessment-template.md** - Source quality (after documentation)
- **workflow-status-template.md** - Workflow tracking (real-time)
- **gap-analysis-report-template.md** - Coverage gaps (periodic)

---

## Agent Responsibilities Matrix

| Agent | Produces | Updates | Uses |
|-------|----------|---------|------|
| **Discovery Agent** | Search results | - | Gap analysis report (gap-filling queries) |
| **Acquisition Agent** | REF-XXX-template.md | - | Search results |
| **Documentation Agent** | Literature note, REF-XXX summary/extraction | REF-XXX-template.md | REF-XXX-template.md |
| **Citation Agent** | Claims index | AIWG docs (inline citations) | Literature notes, extractions |
| **Quality Agent** | Quality assessment | REF-XXX-template.md (quality scores) | REF-XXX-template.md |
| **Gap Analysis Agent** | Gap analysis report | Claims index (unbacked claims) | REF-XXX-template.md, citations |
| **Provenance Agent** | Provenance records | - | All artifacts (logs all operations) |
| **Workflow Agent** | Workflow status | - | All agents (orchestration) |
| **Archival Agent** | OAIS export package | - | All artifacts (packaging) |

---

## Validation and Quality Gates

### Template Validation
Each template includes validation rules for:
- **Required fields:** Must be present
- **Data types:** Correct formats (dates, IDs, scores)
- **Consistency:** Cross-field validation (e.g., overall score = weighted average)
- **Completeness:** All sections populated (or marked N/A)

### Quality Thresholds
- **REF-XXX:** FAIR compliance ≥2/4 principles
- **Literature Note:** Atomicity (≤500 words), ≥1 link (when corpus >10)
- **Claims Index:** Coverage ≥100% before Construction phase
- **Gap Analysis:** Coverage score ≥85% (comprehensive)
- **Quality Assessment:** Overall score ≥70 (High Quality)
- **Provenance Record:** W3C PROV compliance 100%
- **Workflow Status:** Overall progress = weighted average of stages
- **OAIS Export:** OAIS compliance checklist 100%

---

## Template Maintenance

### Versioning
All templates use semantic versioning:
- **Major (X.0.0):** Breaking changes (incompatible schema)
- **Minor (1.X.0):** New features (backward compatible)
- **Patch (1.0.X):** Bug fixes, clarifications

**Current Version:** 1.0.0 (all templates)

### Update Process
1. Identify template deficiency (missing field, validation rule, example)
2. Propose change in elaboration phase (Architecture Designer or Requirements Analyst)
3. Update template file
4. Update this README with change summary
5. Update agent specifications if template changes affect agent behavior
6. Increment template version

### Deprecation
Deprecated sections marked with:
```markdown
<!-- DEPRECATED: This section replaced by X in v1.1.0 -->
```

---

## Example Workflows

### Workflow 1: Document Single Paper (UC-RF-002 → UC-RF-003)
1. **Acquisition Agent** creates **REF-025.md** using **REF-XXX-template.md**
2. **Documentation Agent** generates summary, extraction, updates REF-025.md
3. **Documentation Agent** creates **REF-025-literature-note.md** using **literature-note-template.md**
4. **Quality Agent** creates **REF-025-quality-report.md** using **quality-assessment-template.md**
5. **Provenance Agent** logs all operations in **provenance-record-template.json**

### Workflow 2: Complete Research Corpus (UC-RF-008)
1. **Discovery Agent** identifies 10 sources (no template)
2. **Acquisition Agent** creates 10 REF-XXX.md files
3. **Documentation Agent** creates 10 literature notes
4. **Citation Agent** creates **claims-index.md** using **claims-index-template.md**
5. **Gap Analysis Agent** creates **gap-analysis-report.md** using **gap-analysis-report-template.md**
6. **Workflow Agent** maintains **workflow-status.md** using **workflow-status-template.md**
7. **Archival Agent** creates **export package** using **oais-export-package-template.md**

### Workflow 3: Gap-Filling Iteration (UC-RF-009)
1. **Gap Analysis Agent** identifies gaps in **gap-analysis-report.md**
2. **Discovery Agent** searches for gap-filling sources (high priority)
3. **Acquisition Agent** acquires new sources (REF-026, REF-027, REF-028)
4. **Documentation Agent** documents new sources
5. **Gap Analysis Agent** updates **gap-analysis-report.md** with improved coverage (76% → 85%)

---

## References

### Use Cases
- @.aiwg/flows/research-framework/elaboration/use-cases/UC-RF-001-discover-research-papers.md
- @.aiwg/flows/research-framework/elaboration/use-cases/UC-RF-002-acquire-research-source.md
- @.aiwg/flows/research-framework/elaboration/use-cases/UC-RF-003-document-research-paper.md
- @.aiwg/flows/research-framework/elaboration/use-cases/UC-RF-004-integrate-citations.md
- @.aiwg/flows/research-framework/elaboration/use-cases/UC-RF-005-track-provenance.md
- @.aiwg/flows/research-framework/elaboration/use-cases/UC-RF-006-assess-source-quality.md
- @.aiwg/flows/research-framework/elaboration/use-cases/UC-RF-007-archive-research-artifacts.md
- @.aiwg/flows/research-framework/elaboration/use-cases/UC-RF-008-execute-research-workflow.md
- @.aiwg/flows/research-framework/elaboration/use-cases/UC-RF-009-perform-gap-analysis.md
- @.aiwg/flows/research-framework/elaboration/use-cases/UC-RF-010-export-research-artifacts.md

### Agent Specifications
- @.aiwg/flows/research-framework/elaboration/agents/discovery-agent-spec.md
- @.aiwg/flows/research-framework/elaboration/agents/acquisition-agent-spec.md
- @.aiwg/flows/research-framework/elaboration/agents/documentation-agent-spec.md
- @.aiwg/flows/research-framework/elaboration/agents/citation-agent-spec.md
- @.aiwg/flows/research-framework/elaboration/agents/quality-agent-spec.md
- @.aiwg/flows/research-framework/elaboration/agents/provenance-agent-spec.md
- @.aiwg/flows/research-framework/elaboration/agents/workflow-agent-spec.md
- @.aiwg/flows/research-framework/elaboration/agents/archival-agent-spec.md

### Standards
- [FAIR Principles](https://www.go-fair.org/fair-principles/)
- [W3C PROV Overview](https://www.w3.org/TR/prov-overview/)
- [PROV-JSON](https://www.w3.org/Submission/prov-json/)
- [GRADE Framework](https://www.gradeworkinggroup.org/)
- [OAIS Reference Model (ISO 14721:2012)](https://www.iso.org/standard/57284.html)
- [Zettelkasten Method](https://zettelkasten.de/introduction/)

---

**Document Version:** 1.0.0
**Last Updated:** 2026-01-25
**Owner:** Requirements Analyst, Technical Writer
