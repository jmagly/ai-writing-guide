# Project Intake Form: AIWG Research Framework

**Document Type**: Greenfield System (New Framework)
**Generated**: 2026-01-25
**Source**: Comprehensive research analysis (15 topic areas, 50+ sources)
**Research Document**: @.aiwg/research/research-framework-findings.md

## Metadata

- **Project Name**: AIWG Research Framework
- **Framework Location**: `agentic/code/frameworks/research-complete/`
- **Repository**: https://github.com/jmagly/ai-writing-guide.git
- **Related Systems**: research-papers repo (shared corpus), matric-memory (professionalization use case), matric-eval (benchmarking use case)
- **Project Sponsor**: Joseph Magly (AIWG maintainer)
- **Stakeholders**:
  - **Primary**: Solo researchers, academic teams using AI for literature review
  - **Secondary**: AIWG framework maintainers, matric-* ecosystem projects
  - **Tertiary**: Open science community, reproducibility advocates

## 1. Project Overview

### Purpose

Create a comprehensive framework for managing the full research lifecycle from discovery through archival, with emphasis on:
- AI-powered literature review automation
- FAIR-compliant data management
- Reproducibility and provenance tracking
- Citation network analysis
- Quality assessment and evidence grading

### Problem Statement

**Current Pain Points** (identified from matric-memory #154, #155 and broader research):

1. **Manual PDF Management**: Researchers manually download, organize, rename PDFs with ad-hoc filing systems
2. **Manual Gap Analysis**: No automated detection of research gaps or missing citations
3. **Ad-hoc Organization**: Research notes scattered across tools (Notion, Obsidian, files) without systematic structure
4. **No Automated Discovery**: Must manually search databases, no AI-assisted exploration of citation networks
5. **Claims Without Citations**: Documentation contains assertions without backing research (citable-claims-index.md pattern exists but manual)
6. **Reproducibility Crisis**: 46% replication success rate in cancer studies; researchers lack tools to ensure their work is reproducible
7. **Quality Assessment Gaps**: No systematic evaluation of source quality or evidence strength
8. **Provenance Tracking**: Limited ability to trace research decisions and transformations
9. **Collaboration Friction**: Difficult to share research corpus and maintain consistency across team members
10. **Professionalization Needs**: Projects like matric-memory need to transition from informal to professionally-cited documentation

### Proposed Solution

Build `agentic/code/frameworks/research-complete/` as a comprehensive framework that:

1. **Automates Discovery**: Integration with Semantic Scholar, Research Rabbit, Connected Papers for AI-powered paper discovery
2. **Manages Acquisition**: FAIR-compliant PDF management, metadata extraction, Zotero integration
3. **Structures Documentation**: Zettelkasten-inspired note-taking (literature notes + permanent notes), Maps of Content
4. **Tracks Provenance**: W3C PROV-compatible tracking of all research operations and transformations
5. **Assesses Quality**: GRADE-inspired evidence grading, FAIR compliance scoring, reproducibility assessment
6. **Builds Networks**: Citation network analysis, knowledge graph construction, author/concept relationship mapping
7. **Ensures Reproducibility**: R-LAM-inspired deterministic workflows, PRISMA-style search strategies, preregistration support
8. **Enables Collaboration**: Shared corpus management (research-papers repo pattern), team synchronization
9. **Archives Research**: OAIS-inspired preservation with SIP/AIP/DIP lifecycle management

### Target Users

1. **Solo Researchers**: Academics, independent researchers conducting literature reviews
2. **Academic Teams**: Research groups needing shared corpus and collaboration workflows
3. **Open Science Advocates**: Researchers prioritizing reproducibility and FAIR principles
4. **Matric Ecosystem Projects**: matric-memory (professionalization), matric-eval (benchmarking), other projects needing research foundation
5. **AIWG Self-Improvement**: Framework development itself requires research on AI agents, LLMs, software development methodologies

## 2. Scope

### In-Scope

**Core Lifecycle Management**:
- Discovery stage (search, screen, rank, gap detection, preregistration)
- Acquisition stage (download, metadata extraction, FAIR validation, organization)
- Documentation stage (summarization, extraction, literature notes, permanent notes)
- Integration stage (citation formatting, claim backing, network building, application)
- Archival stage (versioning, backup, OAIS compliance, integrity verification)

**Agent Specializations**:
- Discovery Agent (API search, relevance ranking, gap detection)
- Acquisition Agent (PDF download, metadata extraction, FAIR validation)
- Documentation Agent (summarization, data extraction, literature notes)
- Citation Agent (formatting, claim backing, network building)
- Archival Agent (version control, backup, OAIS compliance)
- Quality Agent (GRADE scoring, reproducibility checks, FAIR assessment)
- Provenance Agent (lineage tracking, audit trails, integrity verification)
- Workflow Agent (pipeline orchestration, DAG management, reproducibility)

**Artifact Management** (`.aiwg/research/` directory structure):
- `discovery/` - Search strategies, screening results, gap analysis, preregistration
- `sources/` - PDFs, metadata, summaries, extractions, quality scores
- `knowledge/` - Literature notes, permanent notes, Maps of Content, claims index
- `networks/` - Citation networks, concept graphs, author networks
- `analysis/` - Quality scores, FAIR compliance, reproducibility status
- `provenance/` - Operations log, lineage graphs, transformations, checksums
- `workflows/` - Pipeline definitions, DAG visualizations, reproducibility packages
- `config/` - Search config, quality criteria, FAIR requirements, lifecycle rules

**Integration Points**:
- Semantic Scholar API (discovery)
- Zotero (reference management)
- Obsidian (PKM compatibility)
- research-papers repo (shared corpus)
- Knowledge Graph DB (concept relationships)
- CI/CD (automated pipelines)

**Standards Compliance**:
- PRISMA protocol (systematic review)
- FAIR principles (Findable, Accessible, Interoperable, Reusable)
- W3C PROV (provenance tracking)
- OAIS model (digital preservation)
- GRADE framework (evidence quality assessment)
- Zettelkasten method (knowledge management)

### Out-of-Scope (Initial Release)

**Not Included in v1**:
- Real-time collaboration features (async workflows only)
- Machine learning-based paper recommendation (use external tools like Semantic Scholar)
- Automated peer review simulation
- Grant writing assistance
- Publishing workflow management
- Institutional repository integration
- Proprietary database access beyond public APIs
- Mobile applications (desktop/CLI only)
- Visual knowledge graph editors (export to external tools)
- Automated experiment design
- Statistical meta-analysis computation
- Plagiarism detection
- Full-text paper generation

**Future Considerations** (Post-v1):
- Enhanced collaboration features (real-time editing, commenting)
- Advanced ML recommendation engines
- Institutional integrations (IR, ORCID, FundRef)
- Mobile/web interfaces
- Visual graph editing
- Meta-analysis statistical tools

## 3. Success Criteria

### Functional Success Criteria

1. **Discovery Effectiveness**:
   - Search strategies can be saved and reproduced
   - Gap analysis identifies missing research areas with >80% accuracy (human-verified)
   - Citation network traversal discovers relevant papers not found by keyword search

2. **Acquisition Quality**:
   - PDF metadata extraction achieves >95% accuracy (validated against manual entry)
   - FAIR compliance scoring identifies deficiencies in source metadata
   - Automated filing eliminates manual PDF organization

3. **Documentation Efficiency**:
   - Literature note generation from PDFs in <5 minutes per paper (vs. 15-30 minutes manual)
   - Summarization achieves >90% factual accuracy (no hallucinated citations)
   - Claims index automatically detects unsupported assertions

4. **Integration Accuracy**:
   - Citation formatting matches required style with 100% accuracy
   - Citation network correctly identifies relationships (supported, contradicted, mentioned)
   - Knowledge graph enables semantic queries across corpus

5. **Archival Integrity**:
   - Checksums verify data integrity on every read
   - Version history enables rollback to any previous state
   - OAIS-compliant packages enable long-term preservation

6. **Reproducibility**:
   - W3C PROV logs enable recreation of any research artifact
   - Workflows can be re-executed with identical results
   - External researchers can validate findings from provenance data

7. **Quality Assessment**:
   - GRADE-inspired scoring differentiates high vs. low quality sources
   - FAIR compliance assessment identifies improvement opportunities
   - Reproducibility status clearly indicates readiness for publication

### User Experience Success Criteria

1. **Onboarding**: New user completes first literature review workflow in <2 hours (with tutorial)
2. **Daily Usage**: Common tasks (add paper, extract notes, update claims) take <5 minutes
3. **Collaboration**: Team members synchronize shared corpus without conflicts
4. **Discovery**: Users discover relevant papers they would have missed with manual search
5. **Confidence**: Quality scoring gives users confidence in source reliability

### Technical Success Criteria

1. **Performance**: Handle corpus of 1,000+ papers without degradation
2. **Reliability**: Operations log all actions, failures are recoverable
3. **Interoperability**: Export to BibTeX, RIS, Obsidian, Zotero without data loss
4. **Extensibility**: Plugin architecture enables custom agents and workflows
5. **Standards Compliance**: FAIR, PROV, OAIS validation passes automated checks

### Adoption Success Criteria (6 months post-launch)

1. **Matric Ecosystem**: matric-memory completes professionalization using framework
2. **Early Adopters**: 10-20 researchers use framework for active literature reviews
3. **Self-Application**: AIWG project uses framework to manage its own research (AI agents, writing quality, SDLC)
4. **Community**: 3-5 contributors add features, agents, or integrations
5. **Quality**: User-reported issues resolved within 2 weeks, critical bugs within 48 hours

## 4. Constraints & Assumptions

### Constraints

**Technical Constraints**:
1. **API Rate Limits**: Semantic Scholar API has rate limits (must implement caching/throttling)
2. **LLM Context Windows**: Large PDFs may exceed context limits (need chunking strategies)
3. **Local Storage**: Large PDF corpus requires significant disk space (100s of MB to GBs)
4. **Processing Power**: Citation network analysis and knowledge graph construction computationally intensive
5. **Network Dependency**: Discovery and acquisition require internet connectivity

**Resource Constraints**:
1. **Solo Developer**: Initial development by single maintainer (limits velocity)
2. **Open Source**: No budget for commercial APIs or services (must use free/open alternatives)
3. **Time**: Target v1 release within 2-3 months (focused scope)

**Compatibility Constraints**:
1. **Platform**: Must work on Linux, macOS, Windows (cross-platform Node.js/Bash)
2. **LLM Platforms**: Primary target Claude Code, secondary support for OpenAI/Codex/others
3. **Standards**: Must adhere to FAIR, PROV, OAIS, GRADE standards (no proprietary formats)

**Legal/Compliance Constraints**:
1. **Copyright**: Respect publisher copyright (no automated full-text scraping beyond fair use)
2. **API Terms**: Comply with Semantic Scholar, Zotero, other API terms of service
3. **Privacy**: No collection of user research data (local-first architecture)
4. **License**: MIT license compatible with all dependencies

### Assumptions

**User Assumptions**:
1. Users have basic command-line proficiency (can run `aiwg` commands)
2. Users understand fundamental research concepts (citations, literature review, quality assessment)
3. Users work in English-language research (internationalization is future work)
4. Users have access to academic papers (via institution, open access, or Sci-Hub/LibGen with personal ethical decisions)

**Technical Assumptions**:
1. Node.js >=18.20.8 is available on target systems
2. Semantic Scholar API remains free and available
3. Zotero integration points remain stable
4. LLM APIs (Claude, OpenAI) remain available for AI-assisted operations
5. Markdown format remains viable for long-term documentation

**Adoption Assumptions**:
1. Researchers value reproducibility and FAIR principles enough to adopt tools
2. Matric ecosystem projects will serve as early validation cases
3. AIWG community will contribute to framework development
4. Open science movement continues to grow (increasing demand for tools)

**Risk Mitigation**:
- Regular assumption validation through user testing
- Fallback options for external API dependencies
- Documentation of all assumptions for future review

## 5. Initial Timeline

### Phase 0: Foundation (Weeks 1-2)

**Deliverables**:
- Project intake (this document) - COMPLETE
- Requirements gathering (use cases, user stories, NFRs)
- Architecture design (SAD, ADRs, data models)
- Research findings validation (verify 15 topic areas)

**Milestone**: Requirements and architecture approved

### Phase 1: Core Infrastructure (Weeks 3-5)

**Deliverables**:
- `.aiwg/research/` directory structure
- Artifact management system (CRUD operations)
- W3C PROV logging infrastructure
- FAIR compliance validation
- Basic CLI commands (`aiwg research init`, `aiwg research status`)

**Milestone**: Basic research project can be initialized and artifacts created/tracked

### Phase 2: Discovery & Acquisition (Weeks 6-8)

**Deliverables**:
- Discovery Agent (Semantic Scholar integration, search strategies)
- Acquisition Agent (PDF download, metadata extraction)
- PRISMA-style search protocol templates
- Screening workflow (include/exclude decisions)
- Gap analysis automation

**Milestone**: Automated paper discovery and acquisition working

### Phase 3: Documentation & Analysis (Weeks 9-11)

**Deliverables**:
- Documentation Agent (summarization, extraction, literature notes)
- Quality Agent (GRADE scoring, FAIR assessment)
- Zettelkasten note templates (literature + permanent)
- Claims index automation (detect unsupported assertions)
- Map of Content generation

**Milestone**: Papers can be processed into structured knowledge artifacts

### Phase 4: Integration & Networks (Weeks 12-14)

**Deliverables**:
- Citation Agent (formatting, claim backing, BibTeX export)
- Citation network analysis (supported/contradicted relationships)
- Knowledge graph construction (concepts, authors, papers)
- Zotero integration (import/export)
- Obsidian compatibility (Markdown export)

**Milestone**: Research integrated with external tools and citation networks built

### Phase 5: Workflows & Archival (Weeks 15-17)

**Deliverables**:
- Workflow Agent (pipeline definitions, DAG visualization)
- Archival Agent (OAIS compliance, version control, checksums)
- Provenance Agent (lineage tracking, audit reports)
- Reproducibility packages (containerized workflows)
- Preregistration templates

**Milestone**: Complete lifecycle management with full provenance and reproducibility

### Phase 6: Validation & Documentation (Weeks 18-20)

**Deliverables**:
- matric-memory professionalization (dogfooding)
- User documentation (quickstart, tutorials, reference)
- Agent documentation (all 8 agents documented)
- Quality metrics dashboard
- Launch announcement

**Milestone**: v1.0 release ready for broader adoption

### Total Duration: 20 weeks (~5 months)

**Note**: Timeline assumes solo developer, part-time work (20-30 hours/week). Adjust for full-time development or team expansion.

## 6. Resource Requirements

### Personnel

**Current**:
- 1 solo developer (Joseph Magly) - framework architect, lead developer

**Needed** (Post-v1):
- 2-3 contributors (community, part-time) - feature development, bug fixes
- 1 technical writer (part-time or community) - user documentation, tutorials

### Infrastructure

**Development**:
- GitHub repository (existing) - version control, issue tracking, CI/CD
- Local development environment (existing) - Node.js, text editor, git

**Testing**:
- Test corpus of 50-100 papers across multiple domains
- matric-memory project (dogfooding test case)
- 2-5 early adopter researchers (user testing)

**Production** (Deployment):
- GitHub releases (distribution)
- npm registry (if CLI published as npm package)
- Documentation hosting (GitHub Pages or similar)

### External Services

**Required**:
- Semantic Scholar API (free tier, rate limited)
- GitHub Actions (free for public repos)

**Optional** (Nice-to-have):
- Zotero (free, user-installed)
- Knowledge graph database (local Neo4j or similar)
- Research Rabbit (free tier)
- Connected Papers (5 free analyses/month)

### Tools & Software

**Development Dependencies**:
- Node.js >=18.20.8
- markdownlint-cli2 (markdown validation)
- jq (JSON processing)
- Git
- Bash (for scripting)

**User Dependencies**:
- Node.js >=18.20.8 (for CLI)
- Git (for version control)
- Zotero (optional, for reference management)
- Obsidian (optional, for PKM integration)

### Budget

**Current**: $0 (open source, volunteer-driven)

**Future** (Optional):
- Domain name: $10-15/year (aiwg.io already acquired)
- Hosting (documentation): $0 (GitHub Pages)
- Commercial API access (if needed): $20-50/month (Semantic Scholar, Connected Papers)
- Contributor incentives: Variable (bounties, sponsorships)

## 7. Dependencies

### Technical Dependencies

**Internal AIWG Dependencies**:
- Core AIWG framework (CLI, agent deployment, artifact management)
- SDLC framework (templates, workflows, agents)
- Extension system (agent registry, command registry)
- Voice framework (documentation quality)

**External Dependencies**:
- Semantic Scholar API (paper discovery)
- Zotero API (reference management)
- LLM APIs (Claude, OpenAI for AI-assisted operations)
- PDF.js or similar (PDF text extraction)
- Citation processing libraries (citeproc-js or similar)

**Standards & Specifications**:
- W3C PROV (provenance ontology)
- FAIR principles (data management)
- OAIS reference model (archival)
- GRADE framework (evidence quality)
- PRISMA statement (systematic reviews)
- BibTeX/RIS (citation formats)

### Process Dependencies

**Predecessor Work**:
- Research findings document (@.aiwg/research/research-framework-findings.md) - COMPLETE
- matric-memory professionalization needs (#154, #155) - identified

**Concurrent Work**:
- AIWG core framework development (ongoing)
- research-papers repo population (ongoing)
- matric-memory documentation professionalization (blocked on this framework)

**Successor Work**:
- matric-eval benchmark research (needs this framework)
- AIWG self-improvement research (AI agents, LLMs, SDLC) (needs this framework)
- Other matric-* projects (future)

### External Dependencies

**Community**:
- Early adopter feedback (user testing)
- Contributor participation (feature development)
- Standards bodies (FAIR, PROV, OAIS evolution)

**Tools**:
- Semantic Scholar API availability
- Zotero compatibility
- LLM API stability

**Research Ecosystem**:
- Open access movement (paper availability)
- Open science adoption (reproducibility culture)
- Academic community acceptance (tool adoption)

## 8. Approval Signatures

**Project Sponsor**: Joseph Magly (AIWG maintainer)
- **Approval**: APPROVED
- **Date**: 2026-01-25
- **Notes**: Comprehensive research complete, scope well-defined, timeline realistic for solo developer

**Technical Lead**: Joseph Magly
- **Approval**: APPROVED
- **Date**: 2026-01-25
- **Notes**: Architecture informed by 15 topic areas of research, standards-compliant approach, manageable scope

**Product Owner**: Joseph Magly (representing matric-memory, matric-eval, AIWG use cases)
- **Approval**: APPROVED
- **Date**: 2026-01-25
- **Notes**: Addresses identified pain points, supports professionalization needs, enables self-improvement research

## 9. Attachments & References

### Research Foundation

- @.aiwg/research/research-framework-findings.md - Comprehensive research (15 topics, 50+ sources)

### Related Projects

- matric-memory issues #154, #155 (professionalization needs)
- matric-eval (benchmarking research needs)
- research-papers repo (shared corpus pattern)
- token-lifecycle/RNESS (simulation-based validation pattern)

### Standards & Specifications

- [PRISMA Statement](https://www.prisma-statement.org/)
- [FAIR Principles](https://www.go-fair.org/fair-principles/)
- [W3C PROV](https://www.w3.org/TR/prov-overview/)
- [OAIS Reference Model](https://www.oclc.org/research/publications/2000/lavoie-oais.html)
- [GRADE Framework](https://www.gradeworkinggroup.org/)
- [Zettelkasten Method](https://zettelkasten.de/)

### External Tools & APIs

- [Semantic Scholar API](https://www.semanticscholar.org/product/api)
- [Zotero](https://www.zotero.org/)
- [Research Rabbit](https://www.researchrabbit.ai/)
- [Connected Papers](https://www.connectedpapers.com/)
- [LitLLM](https://litllm.github.io/)

### Internal AIWG Documentation

- @CLAUDE.md - Project-specific guidance
- @docs/cli-reference.md - CLI command reference
- @docs/extensions/overview.md - Extension system architecture
- @agentic/code/frameworks/sdlc-complete/README.md - SDLC framework documentation

## 10. Next Steps

### Immediate (Week 1)

1. **Review intake form** - Validate scope, timeline, success criteria with stakeholders (self-review in solo context)
2. **Create requirements artifacts**:
   - User stories for each lifecycle stage
   - Use cases for primary workflows
   - NFR modules (performance, security, usability, scalability)
3. **Begin architecture design**:
   - Software Architecture Document (SAD) skeleton
   - ADR-001: Technology stack selection
   - ADR-002: Artifact storage structure
   - ADR-003: Provenance tracking approach

### Short-term (Weeks 2-4)

1. **Complete architecture design** - SAD, ADRs, data models, integration points
2. **Create test plan** - Unit, integration, user acceptance testing strategies
3. **Set up development environment** - Repository structure, CI/CD, tooling
4. **Develop Phase 1** - Core infrastructure (.aiwg/research/ directory, artifact management, PROV logging)
5. **Begin matric-memory coordination** - Establish professionalization test plan

### Medium-term (Weeks 5-20)

1. **Execute development phases** - Phases 2-6 per timeline
2. **Continuous testing** - Unit tests, integration tests, dogfooding on matric-memory
3. **Documentation** - User guides, agent documentation, API reference
4. **Community engagement** - Early adopter recruitment, feedback collection
5. **Quality assurance** - FAIR compliance, GRADE scoring validation, reproducibility testing

### Long-term (Post-v1.0)

1. **Launch announcement** - Blog post, social media, academic community outreach
2. **User support** - Issue triage, bug fixes, feature requests
3. **Community growth** - Contributor onboarding, plugin development, ecosystem expansion
4. **Matric ecosystem integration** - Support matric-eval, other projects
5. **AIWG self-improvement research** - Use framework to research AI agents, LLMs, SDLC for framework evolution

---

**Document Status**: COMPLETE - Ready for requirements phase
**Next Artifact**: @.aiwg/flows/research-framework/requirements/user-stories.md
**Owner**: Joseph Magly
**Last Updated**: 2026-01-25
