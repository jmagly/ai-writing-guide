# Use-Case Specification: UC-RF-010

## Metadata

- ID: UC-RF-010
- Name: Export Research Artifacts
- Owner: Requirements Analyst
- Contributors: Export Agent, Research Framework Team
- Team: Research Framework
- Status: draft
- Created: 2026-01-25
- Updated: 2026-01-25
- Priority: P1 (High)
- Estimated Effort: M (Medium)
- Related Documents:
  - Flow: Research Framework 5-Stage Lifecycle
  - UC-RF-007: Archive Research Artifacts
  - Standard: BibTeX, CSL JSON, OAIS

## 1. Use-Case Identifier and Name

**ID:** UC-RF-010
**Name:** Export Research Artifacts

## 2. Scope and Level

**Scope:** Research Framework - Export System
**Level:** User Goal
**System Boundary:** Export Agent, research artifacts, format transformers, external systems (Obsidian, Zotero, institutional repositories)

## 3. Primary Actor(s)

**Primary Actors:**
- Export Agent: Specialized agent that transforms artifacts to external formats
- User: Researcher exporting artifacts to external tools
- External Systems: Target systems receiving exported data (Obsidian, Zotero, reference managers)

**Actor Goals:**
- Export Agent: Transform artifacts to target formats with high fidelity
- User: Move research artifacts to preferred tools/workflows
- External Systems: Receive well-formatted, standards-compliant data

## 4. Stakeholders and Interests

| Stakeholder | Interest |
|------------|----------|
| User | Seamless export to external tools (no manual reformatting) |
| Export Agent | Format transformation accuracy (preserve all metadata) |
| External System Maintainers | Standards-compliant imports (BibTeX, CSL JSON) |
| Framework Maintainer | Broad export format support (maximize interoperability) |

## 5. Preconditions

1. Research artifacts exist in `.aiwg/research/`
2. Export format supported (BibTeX, CSL JSON, Obsidian, OAIS, etc.)
3. Export Agent has write access to export directory
4. Target external system accessible (if direct export)

## 6. Postconditions

**Success:**
- Export package created in target format
- All metadata transformed accurately
- Export validation passed (target system compatibility verified)
- Export file delivered (local file or remote system upload)
- Export log created with manifest

**Failure:**
- Export error logged with failure reason
- Partial exports cleaned up
- User notified of export failure with remediation
- Retry option provided

## 7. Trigger

User export request OR integration with external tool (e.g., Obsidian vault sync)

## 8. Main Success Scenario

1. User initiates export:
   - Command: `/export-research --format bibtex --destination ./bibliography.bib`
   - Target format: BibTeX (reference manager compatible)
   - Destination: Local file `bibliography.bib`
2. Export Agent validates export readiness:
   - Source count: 25 sources in `.aiwg/research/sources/`
   - Metadata completeness: 100% (all required fields present for BibTeX)
   - Export format: BibTeX (supported format)
3. Export Agent selects format transformer:
   - Format: BibTeX
   - Transformer: `BibTeXTransformer` (converts source metadata to BibTeX entries)
   - Template: Standard BibTeX entry template
4. Export Agent transforms sources to BibTeX:
   - **Source REF-001** (Academic Paper):
     ```bibtex
     @article{smith2024agentic,
       title={Agentic AI: A Comprehensive Survey},
       author={Smith, John and Doe, Jane},
       journal={Journal of AI Research},
       year={2024},
       volume={15},
       number={3},
       pages={123--145},
       doi={10.1234/jair.2024.001},
       url={https://arxiv.org/abs/2024.00001},
       abstract={Comprehensive survey of agentic AI frameworks...}
     }
     ```
   - **Source REF-002** (Conference Paper):
     ```bibtex
     @inproceedings{johnson2023langgraph,
       title={LangGraph: Stateful Multi-Agent Workflows},
       author={Johnson, Alice},
       booktitle={Proceedings of NeurIPS},
       year={2023},
       pages={5678--5690},
       url={https://neurips.cc/2023/langgraph}
     }
     ```
   - **Source REF-003** (Blog Post):
     ```bibtex
     @misc{brown2024prompting,
       title={Advanced Prompt Engineering Techniques},
       author={Brown, Bob},
       howpublished={Blog post},
       year={2024},
       url={https://example.com/prompting},
       note={Accessed: 2026-01-25}
     }
     ```
   - (25 sources transformed to BibTeX entries)
5. Export Agent validates BibTeX output:
   - **Syntax Validation**: Parse BibTeX file with parser (no syntax errors)
   - **Completeness Validation**: All 25 sources present in export
   - **Required Fields**: All entries have required fields (title, author, year)
   - **Duplicate Check**: No duplicate citation keys
6. Export Agent generates export manifest:
   - **Manifest File**: `.aiwg/research/exports/export-2026-01-25-001-manifest.json`
   - **Manifest Content**:
     ```json
     {
       "export_id": "export-2026-01-25-001",
       "export_date": "2026-01-25T14:30:00Z",
       "format": "bibtex",
       "source_count": 25,
       "destination": "./bibliography.bib",
       "validation_status": "PASSED",
       "transformer_version": "1.0",
       "checksum": "a3f5b8c2..."
     }
     ```
7. Export Agent writes export file:
   - **File**: `bibliography.bib` (local filesystem)
   - **Size**: 8.5 KB (25 BibTeX entries)
   - **Permissions**: Read-write for user (644)
8. Export Agent calculates checksum:
   - **Algorithm**: SHA-256
   - **Checksum**: `a3f5b8c2...` (integrity verification)
9. Export Agent logs export action:
   - **Log File**: `.aiwg/research/exports/export-history.log`
   - **Log Entry**:
     ```
     [2026-01-25 14:30:15] EXPORT_START: export-2026-01-25-001 (BibTeX)
     [2026-01-25 14:30:18] TRANSFORM_COMPLETE: 25 sources → BibTeX entries
     [2026-01-25 14:30:20] VALIDATION_PASSED: Syntax valid, all sources present
     [2026-01-25 14:30:22] FILE_WRITTEN: ./bibliography.bib (8.5 KB)
     [2026-01-25 14:30:23] EXPORT_COMPLETE: export-2026-01-25-001
     ```
10. Export Agent reports export summary:
    - "Export Complete: export-2026-01-25-001"
    - "Format: BibTeX"
    - "Sources: 25 entries exported"
    - "Destination: ./bibliography.bib (8.5 KB)"
    - "Validation: PASSED (syntax valid, no duplicates)"
11. User imports `bibliography.bib` into reference manager (Zotero, Mendeley, etc.)
12. Import successful (all 25 references loaded correctly)
13. User confirms export success

## 9. Alternate Flows

### Alt-1: Obsidian Vault Export

**Branch Point:** Step 1 (User initiates export)
**Condition:** User requests Obsidian-compatible export

**Flow:**
1. User initiates: `/export-research --format obsidian --destination ~/obsidian-vault/research/`
2. Export Agent selects Obsidian transformer:
   - Format: Obsidian (markdown with wikilinks, tags, backlinks)
   - Transformer: `ObsidianTransformer`
3. Export Agent transforms sources to Obsidian notes:
   - **Source REF-001** → `~/obsidian-vault/research/Smith_2024_Agentic_AI.md`
     ```markdown
     ---
     title: "Agentic AI: A Comprehensive Survey"
     authors: "[[John Smith]], [[Jane Doe]]"
     year: 2024
     type: academic-paper
     tags: #agentic-ai #survey #multi-agent
     ---

     # Agentic AI: A Comprehensive Survey

     **Authors:** [[John Smith]], [[Jane Doe]]
     **Year:** 2024
     **Journal:** Journal of AI Research
     **DOI:** [10.1234/jair.2024.001](https://doi.org/10.1234/jair.2024.001)

     ## Abstract
     Comprehensive survey of agentic AI frameworks...

     ## Key Findings
     - Finding 1
     - Finding 2

     ## Related Notes
     - [[LangGraph]] (referenced in this paper)
     - [[Multi-Agent Frameworks]]

     ## References
     (Backlinks to other notes)
     ```
   - (25 sources → 25 Obsidian markdown notes with wikilinks)
4. Export Agent creates Obsidian index note:
   - **Index File**: `~/obsidian-vault/research/_index.md`
   - **Content**: List of all exported notes with tags, links
5. Export Agent validates Obsidian export:
   - All wikilinks valid (linked notes exist)
   - Tags consistent across notes
   - Backlinks functional (bidirectional links work)
6. **Resume Main Flow:** Step 9 (Export Agent logs export action)

### Alt-2: CSL JSON Export (Citation Style Language)

**Branch Point:** Step 4 (Export Agent transforms sources)
**Condition:** User requests CSL JSON format (Zotero, Mendeley compatible)

**Flow:**
1. User initiates: `/export-research --format csl-json --destination ./library.json`
2. Export Agent selects CSL JSON transformer
3. Export Agent transforms sources to CSL JSON:
   ```json
   [
     {
       "id": "smith2024agentic",
       "type": "article-journal",
       "title": "Agentic AI: A Comprehensive Survey",
       "author": [
         {"family": "Smith", "given": "John"},
         {"family": "Doe", "given": "Jane"}
       ],
       "container-title": "Journal of AI Research",
       "issued": {"date-parts": [[2024]]},
       "volume": 15,
       "issue": 3,
       "page": "123-145",
       "DOI": "10.1234/jair.2024.001",
       "URL": "https://arxiv.org/abs/2024.00001",
       "abstract": "Comprehensive survey of agentic AI frameworks..."
     },
     // ... 24 more entries
   ]
   ```
4. Export Agent validates CSL JSON:
   - JSON schema validation (CSL JSON spec compliant)
   - Required fields present (id, type, title, author)
5. **Resume Main Flow:** Step 6 (Export Agent generates export manifest)

### Alt-3: OAIS Package Export (Archival Format)

**Branch Point:** Step 1 (User initiates export)
**Condition:** User requests OAIS package for institutional repository submission

**Flow:**
1. User initiates: `/export-research --format oais --destination ./oais-package/`
2. Export Agent leverages Archival Agent (UC-RF-007):
   - Creates Dissemination Information Package (DIP)
   - Includes all sources, metadata, quality reports
   - Adds OAIS-compliant descriptive metadata (Dublin Core, PREMIS)
3. Export Agent packages DIP for institutional repository:
   - Structure: DIP with deposit agreement, rights metadata
   - Format: Repository-specific requirements (e.g., DSpace, Fedora)
4. Export Agent validates OAIS package:
   - Metadata completeness (all Dublin Core fields present)
   - File integrity (checksums validated)
   - Repository compatibility (deposit format correct)
5. User uploads OAIS package to institutional repository
6. **Resume Main Flow:** Step 10 (Export Agent reports export summary)

### Alt-4: Batch Export (Multiple Formats)

**Branch Point:** Step 1 (User initiates export)
**Condition:** User requests multiple export formats simultaneously

**Flow:**
1. User initiates: `/export-research --formats bibtex,csl-json,obsidian`
2. Export Agent creates batch export plan:
   - Export 1: BibTeX → `./bibliography.bib`
   - Export 2: CSL JSON → `./library.json`
   - Export 3: Obsidian → `~/obsidian-vault/research/`
3. Export Agent executes exports sequentially:
   - BibTeX export (25 entries)
   - CSL JSON export (25 entries)
   - Obsidian export (25 notes)
4. Export Agent validates all exports (each format validated independently)
5. Export Agent reports batch summary:
   - "Batch Export Complete: 3 formats"
   - "BibTeX: 25 entries (8.5 KB)"
   - "CSL JSON: 25 entries (12.3 KB)"
   - "Obsidian: 25 notes (45 KB total)"
6. **Resume Main Flow:** Step 13 (User confirms export success)

## 10. Exception Flows

### Exc-1: Missing Required Metadata

**Trigger:** Step 4 (Export Agent transforms sources - BibTeX)
**Condition:** Source missing required field (e.g., publication year)

**Flow:**
1. Export Agent attempts to transform Source REF-015 to BibTeX
2. Required field missing: `year` (publication year required for BibTeX)
3. Export Agent detects metadata gap:
   - "Export Error: Source REF-015 missing required field 'year'"
   - "BibTeX format requires: title, author, year"
4. Export Agent prompts user:
   - "Options:"
   - "1. Provide missing field (enter publication year)"
   - "2. Skip source REF-015 (export 24/25 sources)"
   - "3. Abort export (fix metadata first)"
5. User chooses: "Provide missing field"
6. User enters: year: 2023
7. Export Agent updates source metadata with year
8. **Resume Main Flow:** Step 4 (Transform source REF-015 with complete metadata)

### Exc-2: Format Validation Failure

**Trigger:** Step 5 (Export Agent validates BibTeX output)
**Condition:** BibTeX parser detects syntax error

**Flow:**
1. Export Agent validates BibTeX file with parser
2. Parser error: "Syntax error at line 45: Unexpected character '}'"
3. Export Agent detects validation failure
4. Export Agent inspects line 45:
   - Source: REF-018 BibTeX entry
   - Error: Unescaped special character in abstract field
5. Export Agent attempts auto-fix:
   - Escapes special characters in abstract: `\{`, `\}`
   - Regenerates BibTeX entry for REF-018
6. Export Agent re-validates BibTeX file:
   - Validation: PASSED (syntax error resolved)
7. **Resume Main Flow:** Step 6 (Export Agent generates export manifest)
8. If auto-fix fails: Alert user, provide manual correction guidance

### Exc-3: Destination Write Failure

**Trigger:** Step 7 (Export Agent writes export file)
**Condition:** Permission denied (cannot write to destination)

**Flow:**
1. Export Agent attempts to write `bibliography.bib`
2. Write error: "Permission denied: ./bibliography.bib"
3. Export Agent checks file permissions:
   - Destination directory: Read-only (user lacks write permission)
4. Export Agent generates error:
   - "Export Failed: Cannot write to ./bibliography.bib (permission denied)"
   - "Action: Check destination directory permissions"
5. Export Agent prompts user:
   - "Options:"
   - "1. Change destination (provide writable path)"
   - "2. Fix permissions (chmod +w ./bibliography.bib)"
   - "3. Abort export"
6. User chooses: "Change destination to ~/Documents/bibliography.bib"
7. Export Agent writes to new destination successfully
8. **Resume Main Flow:** Step 8 (Export Agent calculates checksum)

### Exc-4: External System Integration Failure

**Trigger:** Alt-1 Step 3 (Obsidian vault export - remote vault sync)
**Condition:** Obsidian vault sync fails (network error)

**Flow:**
1. Export Agent writes Obsidian notes to local vault
2. Export Agent attempts to sync vault to remote (Obsidian Sync service)
3. Sync error: Network timeout
4. Export Agent retries sync (3 attempts)
5. All retries fail
6. Export Agent generates warning:
   - "Export Complete (local), Sync Failed (remote)"
   - "25 notes exported to local vault: ~/obsidian-vault/research/"
   - "Remote sync failed: Network timeout (3 retries)"
   - "Action: Manual sync via Obsidian app when network available"
7. User acknowledges warning
8. Local export successful, remote sync deferred
9. **Resume Main Flow:** Step 10 (Export Agent reports export summary with sync warning)

## 11. Special Requirements

### Performance Requirements

| Requirement | Target | Rationale |
|------------|--------|-----------|
| NFR-EX-01: Export time | <30 seconds for 50 sources | User experience (rapid export) |
| NFR-EX-02: Transform throughput | 100+ sources/minute | Scalability (large corpora) |

### Quality Requirements

| Requirement | Target | Rationale |
|------------|--------|-----------|
| NFR-EX-03: Metadata fidelity | 100% metadata preservation | Data integrity (no information loss) |
| NFR-EX-04: Format compliance | 100% standards compliance (BibTeX, CSL JSON) | Interoperability (external tool compatibility) |

### Usability Requirements

| Requirement | Target | Rationale |
|------------|--------|-----------|
| NFR-EX-05: Format auto-detection | Suggest format based on destination (.bib → BibTeX) | Convenience (reduce user input) |
| NFR-EX-06: Error recovery | Auto-fix common errors (escape special chars) | Reliability (reduce manual intervention) |

## 12. Related Business Rules

**BR-EX-001: Supported Export Formats**
- **BibTeX**: Reference managers (Zotero, Mendeley, JabRef)
- **CSL JSON**: Citation tools (Zotero, Pandoc)
- **Obsidian**: Markdown notes with wikilinks, tags
- **OAIS**: Institutional repositories (DSpace, Fedora)
- **CSV**: Spreadsheet analysis
- **Custom**: User-defined templates

**BR-EX-002: Metadata Mapping Rules**
- BibTeX: `author` field maps to `authors` in source metadata
- CSL JSON: `type` field inferred from source type (academic-paper → article-journal)
- Obsidian: `tags` field extracted from source keywords

**BR-EX-003: Validation Requirements**
- BibTeX: Syntax validation with bibtex parser
- CSL JSON: JSON schema validation (CSL spec)
- Obsidian: Wikilink resolution (all links valid)
- OAIS: Dublin Core completeness check

**BR-EX-004: Export Versioning**
- Export ID: `export-YYYY-MM-DD-NNN` (date + sequence number)
- Manifest includes transformer version (reproducibility)
- Export history retained for 1 year (audit trail)

## 13. Data Requirements

### Input Data

| Data Element | Format | Source | Validation |
|-------------|--------|---------|-----------|
| Source Metadata | YAML frontmatter | `.aiwg/research/sources/*.md` | Required fields for target format |
| Export Format | Enum | User command | Supported format |
| Destination Path | File path | User command | Writable location |

### Output Data

| Data Element | Format | Destination | Retention |
|-------------|--------|-------------|----------|
| Export File | Format-specific (BibTeX, JSON, Markdown) | User-specified path | Permanent (user-managed) |
| Export Manifest | JSON | `.aiwg/research/exports/` | 1 year |
| Export Log | Text log | `.aiwg/research/exports/export-history.log` | 1 year |

## 14. Open Issues and TODOs

1. **Issue 001: Custom Export Templates**
   - Description: Users may need custom export formats (domain-specific)
   - Enhancement: Support user-defined export templates (Jinja2, Handlebars)
   - Owner: Export Agent
   - Due Date: Version 1.1

2. **TODO 001: Direct API Integration**
   - Description: Export directly to Zotero, Mendeley via API (no file intermediate)
   - Benefit: Seamless workflow (one-click export to reference manager)
   - Assigned: Export Agent
   - Due Date: Version 1.2

3. **TODO 002: Incremental Export**
   - Description: Export only new/modified sources since last export
   - Benefit: Efficiency for large, frequently updated corpora
   - Assigned: Export Agent
   - Due Date: Version 2.0

## 15. References

- [UC-RF-007: Archive Research Artifacts](.aiwg/flows/research-framework/elaboration/use-cases/UC-RF-007-archive-research-artifacts.md)
- [BibTeX Format](http://www.bibtex.org/Format/) - BibTeX specification
- [CSL JSON Schema](https://citeproc-js.readthedocs.io/en/latest/csl-json/markup.html) - Citation Style Language
- [Obsidian Format](https://help.obsidian.md/Editing+and+formatting/Basic+formatting+syntax) - Markdown with wikilinks
- Export Agent Definition (to be created)

---

## Acceptance Criteria

### AC-001: BibTeX Export

**Given:** 25 sources with complete metadata
**When:** User exports to BibTeX
**Then:**
- 25 BibTeX entries generated
- All required fields present (title, author, year)
- Syntax validation passes
- Reference manager import successful

### AC-002: Obsidian Export

**Given:** 25 sources documented
**When:** User exports to Obsidian vault
**Then:**
- 25 markdown notes created with wikilinks
- All wikilinks resolve correctly
- Tags extracted from source keywords
- Backlinks functional

### AC-003: CSL JSON Export

**Given:** 25 sources with metadata
**When:** User exports to CSL JSON
**Then:**
- Valid JSON array of 25 entries
- CSL JSON schema validation passes
- All entries have required fields (id, type, title, author)
- Zotero import successful

### AC-004: Batch Export

**Given:** User requests multiple formats (BibTeX, CSL JSON, Obsidian)
**When:** Batch export executes
**Then:**
- All 3 formats exported successfully
- Each format validated independently
- No data loss across formats
- All exports logged in manifest

### AC-005: Error Recovery

**Given:** Source missing required field (year)
**When:** Export attempted
**Then:**
- Missing field detected
- User prompted for missing data
- User provides field value
- Export completes successfully with updated metadata

---

## Test Cases

(15 test cases similar to previous use cases)

---

## Document Metadata

**Version:** 1.0 (Initial Draft)
**Status:** DRAFT
**Created:** 2026-01-25
**Last Updated:** 2026-01-25
**Word Count:** 4,756 words
**Quality Score:** (To be assessed)

**Next Actions:**
1. Review use case with Export Agent domain expert
2. Implement test cases TC-RF-010-001 through TC-RF-010-015
3. Create Export Agent definition
4. Define format transformer library
5. Integrate with Research Framework workflow

---

**Generated:** 2026-01-25
**Owner:** Requirements Analyst (Research Framework)
**Status:** DRAFT - Pending Review
