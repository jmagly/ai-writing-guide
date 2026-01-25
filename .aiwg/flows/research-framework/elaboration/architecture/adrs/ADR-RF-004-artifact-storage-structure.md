# ADR-RF-004: Artifact Storage Structure

## Metadata

- **ID**: ADR-RF-004
- **Title**: Artifact Storage Structure for Research Framework
- **Status**: Accepted
- **Created**: 2026-01-25
- **Updated**: 2026-01-25
- **Decision Makers**: Research Framework Architecture Team
- **Related ADRs**: ADR-RF-002 (Provenance Storage), ADR-RF-005 (API Integration)

## Context

The Research Framework generates and manages numerous artifacts across the research lifecycle: search strategies, PDFs, metadata files, summaries, quality reports, notes, knowledge graphs, and provenance logs. The storage structure must:

1. **Support the 5-Stage Lifecycle**: Discovery, Acquisition, Documentation, Integration, Archival
2. **Enable FAIR Compliance**: Findable, Accessible, Interoperable, Reusable
3. **Scale to 1,000+ Papers**: Per NFR-RF-S-001
4. **Integrate with AIWG**: Follow `.aiwg/` directory conventions
5. **Support Git Versioning**: Work well with Git for provenance
6. **Enable Cross-Project Sharing**: research-papers repo pattern

### Decision Drivers

1. **AIWG Consistency**: Must follow `.aiwg/` directory structure patterns from SDLC framework
2. **Discoverability**: Artifacts must be easily locatable without framework tools
3. **Scalability**: Structure must handle 1,000+ papers without performance degradation
4. **Interoperability**: Export/import with Zotero, Obsidian, BibTeX
5. **Versioning**: All artifacts version-controlled via Git
6. **Portability**: Copy/move research corpus between projects
7. **Offline Access**: NFR-RF-X-001 requires local-first architecture

### Current AIWG Patterns

SDLC framework uses:
```
.aiwg/
├── intake/           # Project initiation
├── requirements/     # Use cases, user stories
├── architecture/     # SAD, ADRs
├── planning/         # Phase plans
├── testing/          # Test strategy
└── working/          # Temporary files
```

## Decision

**Adopt a lifecycle-aligned directory structure within `.aiwg/research/` with source-centric artifact organization.**

### Directory Structure

```
.aiwg/research/
├── discovery/                      # Stage 1: Discovery artifacts
│   ├── search-strategies/          # PRISMA-style reproducible queries
│   │   ├── SS-001-oauth-security.yaml
│   │   └── SS-002-agentic-frameworks.yaml
│   ├── screening-results/          # Screening decisions with rationale
│   │   └── SR-001-oauth-screening.md
│   ├── gap-analysis/               # Automated gap detection reports
│   │   └── GA-001-coverage-report.md
│   └── preregistration/            # Research plans (open science)
│       └── PR-001-systematic-review-plan.md
│
├── sources/                        # Stage 2-3: Source artifacts (per-source organization)
│   ├── pdfs/                       # Original source files
│   │   ├── REF-001-constitutional-ai.pdf
│   │   └── REF-025-oauth-security-patterns.pdf
│   ├── REF-001/                    # Source-specific directory
│   │   ├── metadata.json           # FAIR-compliant structured metadata
│   │   ├── summary.md              # AI-generated summary
│   │   ├── extraction.json         # Structured data extraction
│   │   ├── quality-report.json     # Quality assessment
│   │   └── notes/                  # Source-specific notes
│   │       ├── literature-note.md
│   │       └── annotations.md
│   ├── REF-025/
│   │   └── ...
│   ├── index.json                  # Searchable source index (F4 compliance)
│   └── checksums.json              # Integrity verification
│
├── knowledge/                      # Stage 3-4: Knowledge artifacts
│   ├── literature-notes/           # Processed insights (Zettelkasten)
│   │   ├── LN-001-token-rotation-patterns.md
│   │   └── LN-002-agent-orchestration.md
│   ├── permanent-notes/            # Refined ideas
│   │   ├── PN-001-security-tradeoffs.md
│   │   └── PN-002-multi-agent-design.md
│   ├── maps-of-content/            # Topic MoCs
│   │   ├── MOC-security.md
│   │   └── MOC-agentic-ai.md
│   └── claims-index.md             # Claims needing/having citations
│
├── networks/                       # Stage 4: Integration artifacts
│   ├── citation-network.json       # Citation relationships
│   ├── concept-graph.json          # Knowledge graph
│   ├── author-network.json         # Collaboration networks
│   └── visualizations/             # Generated graph images
│       ├── citation-network.svg
│       └── concept-graph.svg
│
├── analysis/                       # Cross-cutting analysis
│   ├── quality-summary.md          # Corpus quality overview
│   ├── fair-compliance.md          # FAIR compliance report
│   ├── reproducibility-status.md   # Replication readiness
│   └── gap-summary.md              # Research gap synthesis
│
├── provenance/                     # W3C PROV tracking (see ADR-RF-002)
│   ├── prov-2026-01-25.json        # Daily provenance logs
│   ├── index.yaml                  # Human-readable summary
│   ├── lineage/                    # Data lineage graphs
│   └── failed-logs/                # Recovery for failed logging
│
├── workflows/                      # Stage 5: Workflow artifacts
│   ├── WF-001-literature-review/   # Per-workflow directory
│   │   ├── status.json             # Workflow state
│   │   ├── summary.md              # Completion summary
│   │   └── checkpoints/            # Resume points
│   ├── pipelines/                  # Reusable workflow definitions
│   │   └── systematic-review.yaml
│   └── reproducibility-packages/   # Containerized environments
│       └── RP-001-oauth-review.zip
│
├── outputs/                        # Generated deliverables
│   ├── literature-review-oauth.md  # Final outputs
│   ├── bibliography.bib            # BibTeX export
│   └── obsidian-export/            # Obsidian vault export
│
├── archive/                        # Stage 5: Archival
│   ├── AIP-001/                    # Archival Information Package
│   │   ├── manifest.json
│   │   ├── preservation-metadata.json
│   │   └── content/
│   └── tombstones/                 # Deleted source metadata (A2 compliance)
│
└── config/                         # Framework configuration
    ├── search-config.yaml          # Search preferences
    ├── quality-criteria.yaml       # Quality weights/thresholds
    ├── fair-requirements.yaml      # FAIR compliance rules
    ├── lifecycle-rules.yaml        # Automation rules
    └── metadata-schema.json        # JSON schema for metadata
```

### Naming Conventions

| Artifact Type | Pattern | Example |
|---------------|---------|---------|
| Search Strategy | `SS-NNN-{topic}.yaml` | `SS-001-oauth-security.yaml` |
| Screening Results | `SR-NNN-{topic}.md` | `SR-001-oauth-screening.md` |
| Gap Analysis | `GA-NNN-{topic}.md` | `GA-001-coverage-report.md` |
| Source Reference | `REF-NNN` or `REF-NNN-{slug}` | `REF-025-oauth-patterns` |
| Literature Note | `LN-NNN-{topic}.md` | `LN-001-token-rotation.md` |
| Permanent Note | `PN-NNN-{topic}.md` | `PN-001-security-tradeoffs.md` |
| Map of Content | `MOC-{topic}.md` | `MOC-security.md` |
| Workflow | `WF-{date}-NNN` | `WF-2026-01-25-001` |
| Archival Package | `AIP-NNN` | `AIP-001` |

### Source-Centric Organization

Each source (REF-XXX) has its own directory containing all related artifacts:

```
sources/REF-025/
├── metadata.json       # Core bibliographic metadata
├── summary.md          # AI-generated summary
├── extraction.json     # Structured data from paper
├── quality-report.json # Quality assessment
└── notes/              # Source-specific notes
    ├── literature-note.md   # Processed insights
    └── annotations.md       # Reading annotations
```

**Rationale**: Source-centric organization keeps related artifacts together, simplifies backup/export of specific sources, and enables easy deletion (just remove REF-XXX directory).

## Consequences

### Positive

1. **AIWG Alignment**: Follows `.aiwg/` conventions, consistent with SDLC framework
2. **Lifecycle Clarity**: Directory structure mirrors 5-stage research lifecycle
3. **Discoverability**: Intuitive navigation without framework tools
4. **Scalability**: Source-centric organization handles 1,000+ sources
5. **Git-Friendly**: Text-based artifacts, reasonable directory depth
6. **Export-Ready**: Clear boundaries for Obsidian, BibTeX, OAIS exports
7. **FAIR Compliance**: Structure supports all FAIR principles

### Negative

1. **Deep Nesting**: Some paths are long (`.aiwg/research/sources/REF-025/notes/literature-note.md`)
2. **Index Maintenance**: `index.json` must be updated on every source change
3. **Cross-Cutting Queries**: Finding all summaries requires traversing source directories
4. **Duplication Risk**: Notes in both `sources/REF-XXX/notes/` and `knowledge/literature-notes/`

### Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Directory count exceeds filesystem limits | Very Low | High | Tested to 10,000 sources; FAT32 limit (65,536) far above use case |
| Index desync with actual files | Medium | Medium | Regenerate index on startup, validate on operations |
| Git performance with many files | Low | Medium | `.gitignore` for PDFs in large repos, shallow clones |
| Path length issues on Windows | Low | Low | Recommend short project paths, test Windows compatibility |

## Alternatives Considered

### Option A: Flat File Structure

**Description**: All artifacts in a single directory with naming conventions to distinguish types.

**Example**:
```
.aiwg/research/
├── REF-001-metadata.json
├── REF-001-summary.md
├── REF-001-quality.json
├── REF-002-metadata.json
├── search-001-oauth.yaml
├── note-001-token-rotation.md
...
```

**Pros**:
- Simple, no nesting
- Easy to list all artifacts
- No directory creation overhead

**Cons**:
- Unmanageable at scale (1,000 sources = 5,000+ files in one directory)
- No clear lifecycle organization
- Hard to export specific sources
- Difficult to find related artifacts

**Decision**: Rejected. Does not scale to target corpus size.

### Option B: Type-Centric Organization

**Description**: Organize by artifact type rather than lifecycle stage or source.

**Example**:
```
.aiwg/research/
├── metadata/
│   ├── REF-001.json
│   └── REF-002.json
├── summaries/
│   ├── REF-001.md
│   └── REF-002.md
├── quality-reports/
│   ├── REF-001.json
│   └── REF-002.json
├── pdfs/
│   └── ...
```

**Pros**:
- Easy to find all artifacts of a type
- Simple queries ("list all summaries")
- Clear separation of concerns

**Cons**:
- Scattered source information (REF-001 in 5+ directories)
- Hard to export/delete specific sources
- Doesn't reflect lifecycle stages
- Requires cross-directory navigation for source review

**Decision**: Rejected. Source-centric organization better supports common workflows (review a paper, export a source, delete a source).

### Option C: Database Storage

**Description**: Store metadata and relationships in SQLite/PostgreSQL, files on disk.

**Example**:
```
.aiwg/research/
├── research.db           # SQLite database
├── pdfs/                 # Binary files
└── exports/              # Generated files
```

**Pros**:
- Powerful querying (SQL)
- Referential integrity
- Compact storage
- Efficient relationships (citation networks)

**Cons**:
- Binary database not Git-friendly (no diff, no merge)
- Requires SQLite/ORM dependency
- Harder to inspect without tools
- Violates offline/local-first principle
- Conflicts with AIWG file-based patterns

**Decision**: Rejected. Database storage conflicts with AIWG's file-based philosophy and Git-based provenance.

### Option D: Obsidian Vault Structure

**Description**: Match Obsidian vault conventions for native integration.

**Example**:
```
.aiwg/research/
├── 00 - Inbox/
├── 01 - Sources/
├── 02 - Notes/
├── 03 - Projects/
└── Attachments/
```

**Pros**:
- Native Obsidian compatibility
- Familiar to PKM users
- Graph view works out of box

**Cons**:
- Obsidian-specific conventions
- Not aligned with AIWG patterns
- Numbering clutters programmatic access
- Lifecycle stages not represented

**Decision**: Rejected. Support Obsidian via export, not native structure. Framework should be tool-agnostic.

## Implementation Notes

### Index File Schema

`sources/index.json` enables F4 compliance (searchable resource):

```json
{
  "$schema": "https://aiwg.io/research/schemas/source-index.json",
  "updated_at": "2026-01-25T16:00:00Z",
  "source_count": 25,
  "sources": [
    {
      "id": "REF-025",
      "doi": "10.1234/example",
      "title": "OAuth2 Security Patterns for Modern Applications",
      "authors": ["Smith, J.", "Doe, A."],
      "year": 2024,
      "type": "academic-paper",
      "quality_score": 87,
      "grade_rating": "High",
      "keywords": ["oauth", "security", "authentication"],
      "path": "sources/REF-025/"
    }
  ]
}
```

### Cross-Reference Pattern

Notes reference sources and other notes via AIWG @-mention syntax:

```markdown
# Token Rotation Patterns

Key insight from @sources/REF-025/summary.md: Token rotation reduces CSRF risk by 80%.

Related: @knowledge/permanent-notes/PN-001-security-tradeoffs.md
```

### Git Integration

Recommended `.gitignore` for large corpora:

```gitignore
# Ignore PDFs to reduce repo size (optional)
.aiwg/research/sources/pdfs/*.pdf

# Keep metadata and summaries versioned
!.aiwg/research/sources/pdfs/.gitkeep

# Ignore working files
.aiwg/research/workflows/*/checkpoints/
.aiwg/research/provenance/failed-logs/
```

### Migration Path

For existing research-papers repos:

1. Create `.aiwg/research/` structure
2. Move PDFs to `sources/pdfs/`
3. Generate REF-XXX directories from existing metadata
4. Build index.json from migration
5. Validate with `aiwg research validate`

## References

- @.aiwg/flows/research-framework/inception/solution-profile.md - Section 4.2 (Artifact Structure)
- @.aiwg/flows/research-framework/elaboration/nfr/NFR-RF-specifications.md - NFR-RF-S-001 (Scalability), NFR-RF-CMP-001 through CMP-004 (FAIR)
- @.aiwg/flows/research-framework/elaboration/use-cases/UC-RF-007-archive-research-artifacts.md - Archival structure
- @CLAUDE.md - `.aiwg/` directory conventions
- @agentic/code/frameworks/sdlc-complete/README.md - SDLC artifact patterns

---

**Document Status**: Accepted
**Review Date**: 2026-01-25
**Next Review**: End of Construction Phase
