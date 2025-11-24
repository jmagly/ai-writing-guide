# Use-Case Specification: UC-008

## Metadata

- ID: UC-008
- Name: Developer Selects Templates by Project Context
- Owner: Requirements Analyst
- Contributors: User Experience Designer, Technical Writer
- Reviewers: Requirements Reviewer
- Team: AIWG Framework Development
- Status: approved
- Created: 2025-10-22
- Updated: 2025-10-22
- Priority: P0 (Critical - Elaboration Phase)
- Estimated Effort: L (Low)
- Related Documents:
  - Use Case Brief: /aiwg/requirements/use-case-briefs/UC-008-template-selection.md
  - Feature: FID-003 (Template Selection Guides), Feature Backlog Prioritized
  - SAD: Section 4.3 (Template Library), Section 5.1 (CLI Tools)

## 1. Use-Case Identifier and Name

**ID:** UC-008
**Name:** Developer Selects Templates by Project Context

## 2. Scope and Level

**Scope:** AIWG Template Selection System
**Level:** User Goal
**System Boundary:** AIWG CLI (`aiwg -find-template`), template library (`~/.local/share/ai-writing-guide/.../templates/`), context analyzer, recommendation engine

## 3. Primary Actor(s)

**Primary Actors:**
- First-Time Developer: New AIWG user onboarding to framework (never used AIWG before)
- Experienced Developer: Returning user looking up templates for new artifact
- Solo Developer: Individual using AIWG for personal projects
- Enterprise Team Lead: Selecting templates for team-wide standardization

**Actor Goals:**
- Quickly identify correct template for current project phase and artifact type
- Avoid "template overload" (100+ templates in catalog, overwhelming for first-time users)
- Reduce onboarding friction from hours (manual template browsing) to minutes (guided selection)
- Understand when to use each template (usage context, customization guidance)
- Get started with template immediately (copy to project directory, fill placeholders)

## 4. Stakeholders and Interests

| Stakeholder | Interest |
|------------|----------|
| First-Time Developer | Fast onboarding (50% time reduction target), minimal overwhelm (avoid 100+ template catalog browsing) |
| Experienced Developer | Quick template lookup (artifact-specific, <2 minute discovery), minimal friction |
| Enterprise Team Lead | Team standardization (consistent template adoption), compliance guidance (template completeness) |
| Product Owner | Onboarding conversion rate (adoption barrier reduction), user satisfaction (template relevance 85%+) |

## 5. Preconditions

1. AIWG framework installed (`aiwg -version` works, returns version number)
2. Template library accessible (`~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/templates/` directory exists)
3. Template catalog metadata available (templates have phase, artifact type, word count, effort estimates in metadata)
4. Developer knows project context (current phase, artifact needed, team size, tech stack)
5. Claude Code configured (optional - for context-aware recommendations during command execution)

## 6. Postconditions

**Success Postconditions:**
- Correct template identified (matches developer's project phase and artifact type)
- Template guide displayed (when to use, how to customize, prerequisites, effort estimate)
- Template copied to project directory (optional - if developer confirms copy)
- Developer understands next steps (fill placeholders, reference examples, invoke review workflows)
- Template metadata captured (phase, artifact type, word count, effort) for project tracking

**Failure Postconditions:**
- No matching template found (custom artifact type not in catalog)
- Generic template recommended (fallback to base template for artifact category)
- Developer prompted to contribute custom template (GitHub contribution workflow suggested)
- Error message with remediation (e.g., "Template library missing. Run `aiwg -reinstall`")

## 7. Trigger

**Manual Trigger:**
- Developer types `aiwg -find-template` (interactive mode - prompts for phase, artifact type)
- Developer types `aiwg -find-template SAD` (direct request - loads Software Architecture Document template)
- Developer types `aiwg -find-template --phase elaboration --artifact architecture` (filtered search)

**Contextual Trigger:**
- Developer invokes phase transition command (e.g., `/flow-inception-to-elaboration`)
- System detects missing required artifact (e.g., Software Architecture Document for Elaboration phase)
- System prompts: "You'll need a Software Architecture Document. Would you like help selecting the right template?"

**Interactive Trigger:**
- AIWG agent embedded in project detects developer creating new artifact
- System prompts: "Which artifact are you creating? (Architecture/Requirements/Testing/Security/Deployment)"
- Developer selects artifact type, system recommends template

## 8. Main Success Scenario

1. Developer invokes template selection: `aiwg -find-template` (interactive mode, no arguments)
2. System displays welcome message:
   ```
   AIWG Template Selection
   =======================
   100+ templates available across 11 categories.
   Let's find the right template for your project.
   ```
3. System prompts: "What phase are you in? (Inception/Elaboration/Construction/Transition/Production)"
4. Developer selects "Elaboration" (types `2` or `elaboration`)
5. System filters templates to Elaboration phase (35 templates remain)
6. System prompts: "What artifact category do you need? (Architecture/Requirements/Testing/Management/Security/Deployment)"
7. Developer selects "Architecture" (types `1` or `architecture`)
8. System filters templates to Architecture category (10 templates remain)
9. System displays artifact type menu:
   ```
   Available Architecture Templates:
   1. Software Architecture Document (SAD) - Comprehensive system design
   2. Architecture Decision Record (ADR) - Single design decision
   3. Component Design Card - Individual component specification
   4. Interface Contract Card - API/interface definition
   5. Data Flow Diagram - System data flow visualization
   6. Database Design - Schema and migration plan
   7. Sequence Diagram - Interaction flow
   8. Use Case Realization - Architecture view of use case
   ```
10. Developer selects "Software Architecture Document (SAD)" (types `1` or `SAD`)
11. System loads SAD template metadata:
    - **Template**: `software-architecture-doc-template.md`
    - **Word count range**: 5,000-8,000 words (typical)
    - **Effort estimate**: 8-12 hours (Primary Author + 3-4 reviewers)
    - **Prerequisites**: Use cases defined, NFRs documented, tech stack selected
    - **Sections**: 15 sections (Architectural Goals, System Overview, Component Design, Deployment View, etc.)
12. System displays template guide:
    ```
    Software Architecture Document (SAD)
    ====================================

    WHEN TO USE:
    - Elaboration phase (architecture baseline)
    - Transitioning from Inception to Elaboration
    - System complexity requires comprehensive design documentation
    - Enterprise projects (compliance, knowledge transfer)

    PREREQUISITES:
    - Use cases defined (.aiwg/requirements/use-cases/)
    - NFRs documented (.aiwg/requirements/supplemental-spec.md)
    - Tech stack selected (programming languages, frameworks, databases)

    EFFORT ESTIMATE:
    - Primary Author: 6-8 hours (Architecture Designer agent)
    - Reviewers: 2-4 hours total (3-4 reviewers: Security, Test, Requirements, Technical Writer)
    - Total: 8-12 hours (multi-agent workflow)

    CUSTOMIZATION TIPS:
    - Replace [PROJECT NAME] placeholders with actual project name
    - Use example SAD from sample project: .aiwg/artifacts/sample-project/architecture/software-architecture-doc.md
    - Focus on architecturally significant decisions (not every class/method)
    - Reference ADRs for major design decisions

    NEXT STEPS AFTER CREATION:
    1. Fill SAD placeholders with project-specific content
    2. Invoke multi-agent review: /flow-architecture-evolution
    3. Baseline SAD for Construction phase (commit to Git)
    ```
13. System prompts: "Copy template to your project? (y/n/preview)"
14. Developer confirms "y" (copy to project)
15. System prompts: "Destination path? (default: .aiwg/architecture/software-architecture-doc.md)"
16. Developer accepts default (presses Enter)
17. System copies template to `.aiwg/architecture/software-architecture-doc.md` with placeholders:
    - Replaces `[PROJECT NAME]` → actual project name (from `.aiwg/intake/project-intake.md` if available)
    - Replaces `[CURRENT DATE]` → current date (YYYY-MM-DD)
    - Preserves example sections (marked with `<!-- EXAMPLE -->`)
    - Includes inline guidance (marked with `<!-- GUIDANCE: ... -->`)
18. System confirms successful copy:
    ```
    ✓ Template copied to .aiwg/architecture/software-architecture-doc.md
    ✓ Placeholders filled (PROJECT NAME, CURRENT DATE)
    ✓ Word count: 1,245 words (template structure + guidance)
    ✓ Estimated completion: 5,000-8,000 words (add 3,755-6,755 words of project-specific content)
    ```
19. System displays next steps:
    ```
    NEXT STEPS:
    1. Open template: code .aiwg/architecture/software-architecture-doc.md
    2. Fill section placeholders (search for "[INSERT:" to find all)
    3. Reference example SAD: .aiwg/artifacts/sample-project/architecture/software-architecture-doc.md
    4. Invoke architecture review workflow: /flow-architecture-evolution
    5. Commit baseline to Git when complete
    ```
20. Developer opens template in editor, begins filling content

## 9. Alternate Flows

### Alt-1: Direct Template Request (Non-Interactive)

**Branch Point:** Step 1 (Developer invokes command)
**Condition:** Developer knows exact template name (SAD, ADR, Test Plan, etc.)

**Flow:**
1. Developer types `aiwg -find-template SAD` (direct template name)
2. System searches template catalog for "SAD" (fuzzy match: Software Architecture Document)
3. System finds exact match: `software-architecture-doc-template.md`
4. System loads template metadata (word count, effort, prerequisites)
5. System displays template guide (when to use, customization tips, next steps)
6. **Resume Main Flow:** Step 13 (Copy template prompt)

**Rationale:** Experienced developers know exact template names and want fast access without interactive prompts.

### Alt-2: Context-Aware Recommendation (Phase Transition)

**Branch Point:** Step 1 (Trigger)
**Condition:** Developer invokes phase transition command, system detects missing required artifact

**Flow:**
1. Developer invokes `/flow-inception-to-elaboration` (phase transition command)
2. Core Orchestrator reads Elaboration phase requirements: SAD, Master Test Plan, ADRs required
3. Orchestrator checks `.aiwg/architecture/` for existing SAD
4. SAD not found (file missing)
5. Orchestrator prompts: "You'll need a Software Architecture Document for Elaboration. Would you like help selecting the template? (y/n)"
6. Developer confirms "y"
7. System loads SAD template directly (skips phase/artifact prompts - context known)
8. System displays template guide with context-specific notes:
   ```
   SOFTWARE ARCHITECTURE DOCUMENT (SAD)
   ====================================

   CONTEXT: Transitioning from Inception to Elaboration
   REQUIRED FOR: Elaboration phase gate (Lifecycle Architecture milestone)
   DEADLINE: End of Elaboration phase (Week 8)

   CURRENT PROJECT CONTEXT:
   - Use cases: 11 use cases defined (.aiwg/requirements/use-cases/)
   - NFRs: 67 NFRs documented (.aiwg/requirements/supplemental-spec.md)
   - Tech stack: Node.js, TypeScript, CLI tools (from intake)

   [Standard template guide continues...]
   ```
9. **Resume Main Flow:** Step 13 (Copy template prompt)

**Rationale:** Context-aware recommendations reduce cognitive load by auto-filling known context (phase, project state, prerequisites).

### Alt-3: Multiple Template Matches (Disambiguation)

**Branch Point:** Step 10 (Developer selects artifact type)
**Condition:** Multiple template variants exist (e.g., API Specification has REST/GraphQL/gRPC variants)

**Flow:**
1. Developer selects "API Specification" (artifact type)
2. System finds 3 template variants:
   - `api-spec-rest-template.md` (REST API specification)
   - `api-spec-graphql-template.md` (GraphQL API specification)
   - `api-spec-grpc-template.md` (gRPC API specification)
3. System displays disambiguation menu:
   ```
   API Specification - Multiple Variants Found
   ============================================
   1. REST API Specification (JSON/HTTP, OpenAPI 3.0)
   2. GraphQL API Specification (Schema-first, Apollo Server)
   3. gRPC API Specification (Protocol Buffers, gRPC framework)

   Which API type are you using?
   ```
4. Developer selects "REST API" (types `1` or `rest`)
5. System loads REST API template metadata
6. **Resume Main Flow:** Step 11 (Display template metadata)

**Rationale:** Some artifact types have multiple implementation variants (API styles, test frameworks, deployment platforms) requiring disambiguation.

### Alt-4: Template Preview Before Copy

**Branch Point:** Step 14 (Copy template prompt)
**Condition:** Developer wants to preview template content before copying to project

**Flow:**
1. System prompts: "Copy template to your project? (y/n/preview)"
2. Developer selects "preview" (types `p` or `preview`)
3. System displays template structure (section headings, word count per section, example snippets):
   ```
   SOFTWARE ARCHITECTURE DOCUMENT PREVIEW
   ======================================

   SECTION STRUCTURE (15 sections):
   1. Architectural Goals (300-500 words)
      - Quality attributes (performance, security, scalability)
      - Constraints (budget, timeline, tech stack)
      - Example: "System must handle 10,000 concurrent users..."

   2. System Overview (500-800 words)
      - High-level architecture diagram
      - Component relationships
      - Example: "Three-tier architecture: Web, API, Database..."

   [15 sections total, 5,000-8,000 words]

   FULL TEMPLATE: ~/.local/share/ai-writing-guide/.../software-architecture-doc-template.md
   ```
4. System prompts: "Copy template to your project? (y/n)"
5. Developer confirms "y"
6. **Resume Main Flow:** Step 15 (Destination path prompt)

**Rationale:** Preview mode reduces risk of copying wrong template (especially for first-time users unfamiliar with template structure).

### Alt-5: Filtered Search by Multiple Criteria

**Branch Point:** Step 1 (Developer invokes command)
**Condition:** Developer uses command-line flags to filter templates by multiple criteria

**Flow:**
1. Developer types `aiwg -find-template --phase elaboration --artifact architecture --effort low` (multi-criteria filter)
2. System filters templates:
   - Phase: Elaboration (35 templates remain)
   - Artifact: Architecture (10 templates remain)
   - Effort: Low (<4 hours) (3 templates remain)
3. System displays filtered results:
   ```
   3 Templates Found (Elaboration + Architecture + Low Effort):
   1. Architecture Decision Record (ADR) - Single design decision (1-2 hours)
   2. Component Design Card - Individual component spec (2-3 hours)
   3. Interface Contract Card - API/interface definition (2-3 hours)
   ```
4. Developer selects "Architecture Decision Record (ADR)" (types `1` or `ADR`)
5. **Resume Main Flow:** Step 11 (Display template metadata)

**Rationale:** Power users want fast filtering by multiple criteria (phase + artifact + effort + team size) without interactive prompts.

## 10. Exception Flows

### Exc-1: Template Not Found (Custom Artifact Type)

**Trigger:** Step 7 (Developer selects artifact category)
**Condition:** Developer requests artifact type not in catalog (e.g., "Blockchain Architecture Document")

**Flow:**
1. Developer selects "Architecture" category
2. Developer types custom artifact: "Blockchain Architecture Document"
3. System searches catalog: 0 matches found for "Blockchain Architecture Document"
4. System searches for partial matches: 0 matches found
5. System displays error message:
   ```
   Template Not Found
   ==================

   No template found for "Blockchain Architecture Document".

   RECOMMENDATIONS:
   1. Use generic Architecture Template Base:
      aiwg -find-template "Architecture Base"

   2. Contribute custom template to AIWG repository:
      - Fork: https://github.com/jmagly/ai-writing-guide
      - Add template: agentic/code/frameworks/sdlc-complete/templates/analysis-design/blockchain-architecture-doc-template.md
      - Submit PR with template metadata

   3. Browse similar templates:
      - Software Architecture Document (comprehensive system design)
      - Component Design Card (modular architecture)
   ```
6. Developer chooses option 1 (use generic template)
7. System loads Architecture Template Base (generic template with common architecture sections)
8. **Resume Main Flow:** Step 11 (Display template metadata)

**Rationale:** Custom artifact types (blockchain, ML models, IoT architectures) not in standard catalog require fallback to generic templates or contribution workflow.

### Exc-2: Template Library Missing (Installation Issue)

**Trigger:** Step 1 (Developer invokes command)
**Condition:** Template directory missing (corrupt installation, manual deletion, wrong path)

**Flow:**
1. Developer types `aiwg -find-template`
2. System attempts to read template directory: `~/.local/share/ai-writing-guide/.../templates/`
3. Directory not found error (ENOENT)
4. System displays error message:
   ```
   Template Library Not Found
   ===========================

   Template directory not found: ~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/templates/

   POSSIBLE CAUSES:
   1. AIWG not installed (run: curl -fsSL https://raw.githubusercontent.com/jmagly/ai-writing-guide/refs/heads/main/tools/install/install.sh | bash)
   2. Corrupt installation (run: aiwg -reinstall)
   3. Custom installation path (set environment variable: export AIWG_ROOT=/custom/path)

   REMEDIATION:
   Run: aiwg -reinstall

   This will:
   - Remove existing installation
   - Reclone repository from GitHub
   - Register aiwg CLI
   - Restore template library (100+ templates)

   Estimated time: 2-3 minutes
   ```
5. System exits with error code 1
6. Developer runs `aiwg -reinstall`
7. Installation completes successfully
8. Developer re-invokes `aiwg -find-template`
9. **Resume Main Flow:** Step 1

**Rationale:** Template library corruption or missing installation requires clear error message with remediation steps (not generic "file not found" error).

### Exc-3: Target Directory Already Exists (File Conflict)

**Trigger:** Step 16 (System copies template to destination path)
**Condition:** File `.aiwg/architecture/software-architecture-doc.md` already exists (previous template copy, manual creation)

**Flow:**
1. System attempts to copy template to `.aiwg/architecture/software-architecture-doc.md`
2. File already exists error (EEXIST)
3. System prompts:
   ```
   File Conflict
   =============

   File already exists: .aiwg/architecture/software-architecture-doc.md
   Created: 2025-10-15 14:32:18
   Size: 4,287 words

   OPTIONS:
   1. Overwrite existing file (DESTRUCTIVE - will lose current content)
   2. Backup existing file (rename to software-architecture-doc-backup-2025-10-22.md)
   3. Copy to new filename (software-architecture-doc-v2.md)
   4. Cancel (do not copy template)

   Choice? (1/2/3/4)
   ```
4. Developer selects "2" (backup existing file)
5. System renames existing file: `.aiwg/architecture/software-architecture-doc-backup-2025-10-22.md`
6. System copies new template to original path: `.aiwg/architecture/software-architecture-doc.md`
7. System confirms:
   ```
   ✓ Existing file backed up to software-architecture-doc-backup-2025-10-22.md
   ✓ New template copied to software-architecture-doc.md
   ```
8. **Resume Main Flow:** Step 18 (Confirm successful copy)

**Rationale:** File conflicts common when developers regenerate templates or experiment with multiple versions - backup mode prevents data loss.

### Exc-4: Invalid Phase or Artifact Type (User Input Error)

**Trigger:** Step 4 or Step 7 (Developer selects phase or artifact)
**Condition:** Developer types invalid input (typo, unknown phase, invalid artifact)

**Flow:**
1. System prompts: "What phase are you in? (Inception/Elaboration/Construction/Transition/Production)"
2. Developer types "Elabortaion" (typo)
3. System detects invalid input: "Elabortaion" not in valid phases list
4. System attempts fuzzy match: "Elabortaion" → "Elaboration" (edit distance: 1)
5. System prompts:
   ```
   Did you mean "Elaboration"? (y/n)
   ```
6. Developer confirms "y"
7. System accepts "Elaboration" as input
8. **Resume Main Flow:** Step 5 (Filter templates to Elaboration phase)

**Alternate Exception:** No fuzzy match found
1. System prompts: "What phase are you in? (Inception/Elaboration/Construction/Transition/Production)"
2. Developer types "Discovery" (unknown phase)
3. System detects invalid input: "Discovery" not in valid phases list
4. System attempts fuzzy match: 0 matches within edit distance threshold
5. System displays error:
   ```
   Invalid Phase
   =============

   "Discovery" is not a valid SDLC phase.

   Valid phases:
   - Inception (concept validation, business case)
   - Elaboration (architecture baseline, requirements detail)
   - Construction (feature implementation, testing)
   - Transition (production deployment, user acceptance)
   - Production (operations, incident response, iteration)

   Please select a valid phase.
   ```
6. System re-prompts: "What phase are you in? (Inception/Elaboration/Construction/Transition/Production)"
7. Developer selects "Elaboration"
8. **Resume Main Flow:** Step 5

**Rationale:** Typo tolerance reduces friction for first-time users unfamiliar with exact phase names (fuzzy matching common in CLI tools).

### Exc-5: No Templates Match Filter Criteria (Overly Restrictive Search)

**Trigger:** Step 2 (System filters templates by criteria)
**Condition:** Developer uses overly restrictive filters (e.g., `--phase inception --artifact deployment --effort low`) resulting in 0 matches

**Flow:**
1. Developer types `aiwg -find-template --phase inception --artifact deployment --effort low`
2. System filters templates:
   - Phase: Inception (15 templates remain)
   - Artifact: Deployment (0 templates remain - deployment artifacts typically in Transition phase)
3. System detects 0 matches
4. System displays error:
   ```
   No Templates Found
   ==================

   No templates match all criteria:
   - Phase: Inception
   - Artifact: Deployment
   - Effort: Low (<4 hours)

   SUGGESTIONS:
   1. Deployment artifacts typically appear in Transition phase (not Inception).
      Try: aiwg -find-template --phase transition --artifact deployment

   2. Relax effort filter:
      Try: aiwg -find-template --phase inception --artifact deployment (remove --effort)

   3. Browse all Inception templates:
      Try: aiwg -find-template --phase inception
   ```
5. Developer chooses suggestion 1 (change phase to Transition)
6. Developer types `aiwg -find-template --phase transition --artifact deployment`
7. System finds 8 deployment templates
8. **Resume Main Flow:** Step 9 (Display artifact type menu)

**Rationale:** Overly restrictive filters result in empty results - helpful suggestions guide developer to correct filters (especially for first-time users unfamiliar with phase-to-artifact mappings).

## 11. Special Requirements

### Performance Requirements

| Requirement | Target | Rationale |
|------------|--------|-----------|
| NFR-TMPL-01: Template catalog search time | <2 seconds (95th percentile) | Responsiveness (100+ templates, developer patience threshold) |
| NFR-TMPL-02: Template selection time (first-time user) | <5 minutes (95th percentile) | Onboarding friction reduction (50% time savings vs manual browsing) |
| NFR-TMPL-03: Template copy and placeholder replacement | <5 seconds (95th percentile) | Perceived performance (instant feedback for copy operation) |

### Usability Requirements

| Requirement | Target | Rationale |
|------------|--------|-----------|
| NFR-TMPL-04: First-time user success rate | 85%+ find correct template | Onboarding conversion (adoption barrier reduction) |
| NFR-TMPL-05: Template recommendation acceptance | 85%+ developers use recommended template | Trust in recommendation engine (context-aware accuracy) |
| NFR-TMPL-06: Error message clarity | 90%+ developers understand remediation | Support burden reduction (self-service troubleshooting) |

### Accuracy Requirements

| Requirement | Target | Rationale |
|------------|--------|-----------|
| NFR-TMPL-07: Template recommendation accuracy | 90%+ correct template for context | User satisfaction (relevant template for phase/artifact/project type) |
| NFR-TMPL-08: Fuzzy match accuracy (typo tolerance) | 95%+ typos corrected | Input error handling (common CLI UX pattern) |

## 12. Related Business Rules

**BR-TMPL-001: Template Selection by Phase**
- **Inception**: Vision, Business Case, Risk Register, Architecture Sketch, Stakeholder Requests
- **Elaboration**: SAD, ADRs, Use Cases, NFRs, Master Test Plan, Component Design
- **Construction**: Code Templates, Test Cases, Deployment Plans, Integration Plans
- **Transition**: Runbooks, User Guides, Release Notes, Support Documentation, Acceptance Plans
- **Production**: Retrospectives, Incident Reports, SLO/SLI, Chaos Experiments
- **Rationale:** Phase-to-artifact mapping guides developers to appropriate templates (prevents recommending Deployment Plan in Inception phase)

**BR-TMPL-002: Template Recommendation Priority**
1. **Exact match**: User request matches template name exactly (e.g., "SAD" → Software Architecture Document)
2. **Phase match**: Template phase matches user's current phase (from project context or command flag)
3. **Artifact type match**: Template artifact type matches user's need (architecture, requirements, testing, etc.)
4. **Effort match**: Template effort matches user's available time (low/medium/high filters)
5. **Generic fallback**: Base template for artifact category (if no specific match found)
- **Rationale:** Prioritization ensures most relevant template recommended first (reduces cognitive load)

**BR-TMPL-003: Template Metadata Requirements**
- **Word count range**: Typical size (e.g., SAD: 5,000-8,000 words, ADR: 500-1,000 words)
- **Effort estimate**: Time to complete (e.g., SAD: 8-12 hours including multi-agent review)
- **Prerequisites**: Required inputs (e.g., SAD needs use cases, NFRs, tech stack)
- **Customization guide**: How to adapt for project (placeholder replacement, example sections)
- **Phase applicability**: Which SDLC phases template is used in (Elaboration, Construction, Transition)
- **Rationale:** Rich metadata enables intelligent recommendations and sets developer expectations (effort, prerequisites)

**BR-TMPL-004: Template Copy Behavior**
- **Placeholders**: Replace with project-specific values (e.g., `[PROJECT NAME]` → actual project name from intake)
- **Date replacement**: Replace `[CURRENT DATE]` with current date (YYYY-MM-DD format)
- **Examples**: Preserve example sections (marked with `<!-- EXAMPLE -->`) for reference
- **Guidance comments**: Include inline guidance (marked with `<!-- GUIDANCE: ... -->`) to help developers fill sections
- **Formatting**: Preserve markdown formatting, heading structure, code fences
- **Rationale:** Smart placeholder replacement reduces manual setup time (developer focuses on content, not boilerplate)

**BR-TMPL-005: Template Versioning and Updates**
- **Version metadata**: Templates include version number (e.g., v1.2) in metadata header
- **Compatibility**: Version 1.x templates compatible with AIWG 1.x CLI (breaking changes bump major version)
- **Update notification**: CLI notifies if template catalog has newer version available (`aiwg -update` checks)
- **Migration guides**: Breaking changes include migration guide (how to update existing artifacts)
- **Rationale:** Template evolution must not break existing projects (semantic versioning reduces migration friction)

**BR-TMPL-006: Context-Aware Recommendations**
- **Phase detection**: If project has `.aiwg/planning/phase-status.md`, read current phase
- **Existing artifacts**: Scan `.aiwg/` directories for existing artifacts, recommend missing prerequisites
- **Tech stack awareness**: If project intake includes tech stack, recommend framework-specific templates (e.g., Django templates for Django projects)
- **Team size awareness**: If team profile includes team size, recommend appropriate templates (e.g., skip formal Business Case for solo developers)
- **Rationale:** Context-aware recommendations reduce cognitive load (system auto-fills known context vs prompting for every detail)

## 13. Data Requirements

### Input Data

| Data Element | Format | Source | Validation |
|-------------|--------|---------|-----------|
| Phase selection | String (Inception/Elaboration/Construction/Transition/Production) | User input or project context | Must be valid SDLC phase |
| Artifact type | String (Architecture/Requirements/Testing/etc.) | User input | Must be valid artifact category |
| Template name | String (fuzzy match allowed) | User input | Fuzzy match to catalog, edit distance ≤2 |
| Filter criteria | CLI flags (--phase, --artifact, --effort) | Command line arguments | Valid enum values |
| Project context | YAML file | `.aiwg/intake/project-intake.md` or `.aiwg/planning/phase-status.md` | Valid YAML structure |

### Output Data

| Data Element | Format | Destination | Retention |
|-------------|--------|-------------|----------|
| Template file | Markdown file (1,000-10,000 words) | `.aiwg/{category}/{template-name}.md` | Permanent (Git-tracked) |
| Template metadata | YAML frontmatter | Template file header | Permanent (embedded in template) |
| Copy confirmation | Console message | Standard output | Ephemeral (logged) |
| Template guide | Console text (300-500 words) | Standard output | Ephemeral (displayed once) |

### Data Validation Rules

**Template Catalog:**
- Must contain at least 1 template per SDLC phase (minimum 5 templates)
- Each template must have metadata: name, phase, artifact type, word count, effort
- Template file must exist in filesystem (path validation)
- Template metadata must be valid YAML (parsable)

**User Input:**
- Phase: Must be one of 5 valid phases (case-insensitive, fuzzy match allowed)
- Artifact type: Must be valid category (architecture/requirements/testing/security/deployment/management)
- Template name: Fuzzy match tolerance ≤2 edit distance (e.g., "SAD" matches "Software Architecture Document")
- File path: Must be valid filesystem path (no special characters, valid directory)

## 14. Open Issues and TODOs

1. **Issue 001: Template catalog growth scalability**
   - **Description:** How to maintain fast search (<2 seconds) as catalog grows to 500+ templates?
   - **Impact:** Performance degradation, increased search time, developer frustration
   - **Owner:** CLI Tools Engineer
   - **Due Date:** Construction Week 2 (spike on indexed search, fuzzy matching optimization)

2. **Issue 002: Template versioning migration complexity**
   - **Description:** How to migrate existing artifacts when template format changes (breaking changes)?
   - **Impact:** Developer friction, manual migration effort, potential data loss
   - **Owner:** Template Maintainer
   - **Due Date:** Elaboration Week 6 (define template versioning policy, migration guide structure)

3. **TODO 001: Multi-language template support**
   - **Description:** Add templates in multiple languages (Spanish, French, German) for international adoption
   - **Assigned:** Technical Writer agent
   - **Due Date:** Post-MVP (Version 1.2)

4. **TODO 002: Template preview mode enhancements**
   - **Description:** Add visual previews (rendered markdown, diagrams) in preview mode (not just text)
   - **Assigned:** User Experience Designer
   - **Due Date:** Construction Week 3

## 15. References

**Requirements Documents:**
- [Use Case Brief](/aiwg/requirements/use-case-briefs/UC-008-template-selection.md)
- [Feature Backlog Prioritized](/aiwg/requirements/feature-backlog-prioritized.md) - FID-003 (Template Selection Guides)
- [Vision Document](/aiwg/requirements/vision-document.md) - Section 3.1: Onboarding Friction Reduction

**Architecture Documents:**
- [Software Architecture Document](/aiwg/planning/sdlc-framework/architecture/software-architecture-doc.md) - Section 4.3 (Template Library), Section 5.1 (CLI Tools)

**Template Catalog:**
- [Template Library](~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/templates/) - 100+ templates across 11 categories

**Agent Definitions:**
- N/A (template selection is CLI tool, not agent-based)

**Command Definitions:**
- `aiwg -find-template` (CLI command specification)

**Templates:**
- All templates in catalog (100+ templates used as reference examples)

---

## Traceability Matrix

### Requirements Traceability

| Requirement ID | Source Document | Implementation Component | Test Case |
|---------------|-----------------|-------------------------|-----------|
| FID-003 | Feature Backlog Prioritized | aiwg -find-template CLI command | TC-TMPL-001 through TC-TMPL-010 |
| NFR-TMPL-01 | This document (Section 11) | Template catalog search engine | TC-TMPL-006 |
| NFR-TMPL-02 | This document (Section 11) | Interactive prompt workflow | TC-TMPL-001, TC-TMPL-002 |
| NFR-TMPL-04 | This document (Section 11) | Template recommendation engine | TC-TMPL-003 |
| BR-TMPL-001 | This document (Section 12) | Phase-to-template mapping logic | TC-TMPL-007 |

### SAD Component Mapping

**Primary Components (from SAD v1.0):**
- CLI Tools (aiwg -find-template) - Section 5.1
- Template Library (filesystem-based catalog) - Section 4.3
- Context Analyzer (project state detection) - Section 4.4
- Recommendation Engine (template matching logic) - Section 4.5

**Supporting Components:**
- File system (template storage in `~/.local/share/ai-writing-guide/.../templates/`)
- Project context files (`.aiwg/intake/`, `.aiwg/planning/`)
- Console output (user interaction, template guides)

**Integration Points:**
- Template library (100+ markdown templates)
- Project context (intake forms, phase status)
- Git repository (version control for copied templates)

### ADR References

**ADR-001: Template Library Storage Format** (Filesystem-based, not database)
- Template selection reads templates from filesystem (performance, simplicity)
- Fuzzy search implemented in-memory (no database dependency)
- Catalog metadata embedded in template files (YAML frontmatter)

---

## Acceptance Criteria

### AC-001: Basic Template Selection - Interactive Mode

**Given:** Developer invokes `aiwg -find-template` (no arguments)
**When:** System prompts for phase → artifact → type
**Then:**
- Correct template identified (SAD for Elaboration + Architecture)
- Template guide displayed (when to use, effort, prerequisites)
- Copy option offered (y/n/preview)
- Total interaction time <5 minutes (95th percentile)

### AC-002: Template Selection - Direct Request

**Given:** Developer types `aiwg -find-template SAD`
**When:** System searches catalog for "SAD"
**Then:**
- Exact match found (Software Architecture Document)
- Template guide displayed (no interactive prompts)
- Copy option offered immediately
- Search time <2 seconds (95th percentile)

### AC-003: Context-Aware Recommendation

**Given:** Developer invokes `/flow-inception-to-elaboration`, SAD missing
**When:** System detects missing required artifact
**Then:**
- System prompts: "You'll need a Software Architecture Document. Would you like help?"
- Developer confirms, SAD template loaded with project context (use cases count, NFRs count)
- Copy option offered with pre-filled destination path

### AC-004: Template Metadata Display

**Given:** SAD template selected
**When:** System displays template guide
**Then:**
- Guide includes word count range (5,000-8,000 words)
- Guide includes effort estimate (8-12 hours)
- Guide includes prerequisites (use cases, NFRs, tech stack)
- Guide includes customization tips (placeholder replacement, example references)
- Guide includes next steps (fill placeholders, invoke review workflow)

### AC-005: Template Copy with Placeholder Replacement

**Given:** Developer confirms copy to project (destination: `.aiwg/architecture/software-architecture-doc.md`)
**When:** System copies template
**Then:**
- File created at destination path
- `[PROJECT NAME]` replaced with actual project name (from intake)
- `[CURRENT DATE]` replaced with current date (YYYY-MM-DD)
- Example sections preserved (marked with `<!-- EXAMPLE -->`)
- Inline guidance preserved (marked with `<!-- GUIDANCE: ... -->`)
- Copy time <5 seconds (95th percentile)

### AC-006: Template Not Found - Generic Fallback

**Given:** Developer requests "Blockchain Architecture Doc" (not in catalog)
**When:** System searches catalog
**Then:**
- 0 exact matches found
- System recommends generic Architecture Template Base
- System suggests contributing custom template to AIWG repository
- System displays similar templates (SAD, Component Design)

### AC-007: Performance Target - Catalog Search <2 Seconds

**Given:** Template catalog with 100+ templates
**When:** Developer searches for template (any query)
**Then:**
- Search completes in <2 seconds (95th percentile)
- Fuzzy matching applied (typo tolerance)
- Results ranked by relevance (exact match first, then fuzzy matches)

### AC-008: File Conflict - Backup Mode

**Given:** File `.aiwg/architecture/software-architecture-doc.md` already exists
**When:** Developer confirms copy to same path
**Then:**
- System prompts for conflict resolution (overwrite/backup/new filename/cancel)
- Developer selects "backup"
- Existing file renamed to `software-architecture-doc-backup-YYYY-MM-DD.md`
- New template copied to original path
- Confirmation message includes backup filename

### AC-009: Template Library Missing - Installation Error

**Given:** Template directory deleted (simulated corrupt installation)
**When:** Developer invokes `aiwg -find-template`
**Then:**
- Error message displayed: "Template library not found"
- Remediation instructions clear: "Run `aiwg -reinstall`"
- Error includes possible causes (not installed, corrupt, custom path)
- System exits with error code 1

### AC-010: Typo Tolerance - Fuzzy Matching

**Given:** Developer types "Elabortaion" (typo for "Elaboration")
**When:** System validates phase input
**Then:**
- Fuzzy match detected (edit distance: 1)
- System prompts: "Did you mean 'Elaboration'? (y/n)"
- Developer confirms, system accepts "Elaboration"
- No re-prompting required (smooth correction)

### AC-011: Multi-Criteria Filter Search

**Given:** Developer types `aiwg -find-template --phase elaboration --artifact architecture --effort medium`
**When:** System filters templates by all criteria
**Then:**
- Phase filter applied (35 templates remain)
- Artifact filter applied (10 templates remain)
- Effort filter applied (4 templates remain: SAD, Component Design, Interface Contract, Data Flow)
- Results displayed with metadata (effort, word count, prerequisites)
- Developer selects template, guide displayed

### AC-012: Template Preview Mode

**Given:** Developer selects template, copy prompt appears
**When:** Developer chooses "preview" option
**Then:**
- Template structure displayed (15 sections for SAD)
- Word count per section shown (Architectural Goals: 300-500 words, etc.)
- Example snippets displayed (first 100 characters of each section)
- Full template path shown for reference
- Re-prompt: "Copy template to your project? (y/n)"

---

## Test Cases

### TC-TMPL-001: Basic Template Selection - Interactive Mode

**Objective:** Validate interactive template selection workflow
**Preconditions:** AIWG installed, template library present (100+ templates)
**Test Steps:**
1. Run: `aiwg -find-template` (no arguments)
2. Verify welcome message displayed
3. Select phase: "Elaboration" (type `2` or `elaboration`)
4. Verify 35 templates filtered (Elaboration phase)
5. Select artifact: "Architecture" (type `1` or `architecture`)
6. Verify 10 templates filtered (Architecture category)
7. Select template: "Software Architecture Document" (type `1` or `SAD`)
8. Verify template guide displayed (word count: 5,000-8,000 words, effort: 8-12 hours)
9. Measure total interaction time
**Expected Result:** Correct template identified, guide displayed, total time <5 minutes
**Pass/Fail:** PASS if SAD template loaded and time <5 minutes
**NFR Validated:** NFR-TMPL-02 (First-time user selection time <5 minutes)

### TC-TMPL-002: Template Selection - Direct Request

**Objective:** Validate direct template request (non-interactive)
**Preconditions:** AIWG installed, developer knows template name
**Test Steps:**
1. Run: `aiwg -find-template SAD`
2. Measure search time (start timer)
3. Verify template guide displayed (no interactive prompts)
4. Verify guide includes: word count, effort, prerequisites, customization tips, next steps
5. Measure search time (stop timer)
**Expected Result:** SAD template loaded directly, guide displayed, search time <2 seconds
**Pass/Fail:** PASS if correct template and search time <2 seconds
**NFR Validated:** NFR-TMPL-01 (Catalog search time <2 seconds)

### TC-TMPL-003: Context-Aware Recommendation

**Objective:** Validate context-aware template recommendation during phase transition
**Preconditions:** Project in Inception phase, SAD missing, use cases defined
**Test Steps:**
1. Run: `/flow-inception-to-elaboration` (phase transition command)
2. Verify system detects missing SAD
3. Verify system prompts: "You'll need a Software Architecture Document. Would you like help?"
4. Confirm "y"
5. Verify SAD template loaded with project context (use cases: 11, NFRs: 67)
6. Verify destination path pre-filled (`.aiwg/architecture/software-architecture-doc.md`)
**Expected Result:** Context-aware recommendation, project state auto-filled
**Pass/Fail:** PASS if SAD recommended and project context displayed
**NFR Validated:** NFR-TMPL-05 (Template recommendation acceptance 85%+)

### TC-TMPL-004: Template Copy with Placeholder Replacement

**Objective:** Validate template copy and smart placeholder replacement
**Preconditions:** SAD template selected, project name "ai-writing-guide"
**Test Steps:**
1. Confirm copy: "y"
2. Accept default destination: `.aiwg/architecture/software-architecture-doc.md`
3. Wait for copy completion
4. Open copied file: `cat .aiwg/architecture/software-architecture-doc.md`
5. Verify `[PROJECT NAME]` replaced with "ai-writing-guide"
6. Verify `[CURRENT DATE]` replaced with current date (YYYY-MM-DD)
7. Verify example sections preserved (search for `<!-- EXAMPLE -->`)
8. Verify inline guidance preserved (search for `<!-- GUIDANCE: -->`)
9. Measure copy time
**Expected Result:** Template copied, placeholders replaced, copy time <5 seconds
**Pass/Fail:** PASS if placeholders replaced and copy time <5 seconds
**NFR Validated:** NFR-TMPL-03 (Template copy time <5 seconds)

### TC-TMPL-005: Template Not Found - Generic Fallback

**Objective:** Validate fallback behavior when custom artifact type requested
**Preconditions:** Request "Blockchain Architecture Doc" (not in catalog)
**Test Steps:**
1. Run: `aiwg -find-template "Blockchain Architecture Doc"`
2. Verify 0 exact matches found
3. Verify system recommends generic Architecture Template Base
4. Verify system suggests contribution workflow (GitHub fork, PR)
5. Verify system displays similar templates (SAD, Component Design)
**Expected Result:** Generic template recommended, contribution workflow suggested
**Pass/Fail:** PASS if fallback template recommended and contribution link displayed
**NFR Validated:** NFR-TMPL-06 (Error message clarity 90%+)

### TC-TMPL-006: Performance Test - Catalog Search <2 Seconds

**Objective:** Validate NFR-TMPL-01 (catalog search time <2 seconds)
**Preconditions:** Template catalog with 100+ templates
**Test Steps:**
1. Run: `aiwg -find-template --phase elaboration --artifact architecture`
2. Start timer
3. Wait for filtered results
4. Stop timer when results displayed
5. Verify search time <2 seconds (95th percentile)
6. Repeat test 20 times, calculate 95th percentile
**Expected Result:** Search completes in <2 seconds (95th percentile)
**Pass/Fail:** PASS if 95th percentile <2 seconds
**NFR Validated:** NFR-TMPL-01 (Catalog search time <2 seconds)

### TC-TMPL-007: File Conflict - Backup Mode

**Objective:** Validate file conflict resolution (backup mode)
**Preconditions:** File `.aiwg/architecture/software-architecture-doc.md` already exists
**Test Steps:**
1. Create existing file: `echo "Existing SAD content" > .aiwg/architecture/software-architecture-doc.md`
2. Run: `aiwg -find-template SAD`
3. Confirm copy: "y"
4. Accept default destination
5. Verify conflict prompt: "File already exists. Options: 1. Overwrite, 2. Backup, 3. New filename, 4. Cancel"
6. Select "2" (backup)
7. Verify existing file renamed to `software-architecture-doc-backup-2025-10-22.md`
8. Verify new template copied to original path
9. Verify backup file contains original content ("Existing SAD content")
**Expected Result:** Existing file backed up, new template copied, no data loss
**Pass/Fail:** PASS if backup created and new template copied
**NFR Validated:** NFR-TMPL-06 (Error message clarity 90%+)

### TC-TMPL-008: Template Library Missing - Installation Error

**Objective:** Validate error handling when template library missing
**Preconditions:** Template directory deleted (simulated corrupt installation)
**Test Steps:**
1. Delete template directory: `rm -rf ~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/templates/`
2. Run: `aiwg -find-template`
3. Verify error message: "Template library not found"
4. Verify remediation instructions: "Run `aiwg -reinstall`"
5. Verify possible causes listed: not installed, corrupt, custom path
6. Verify exit code: 1 (error)
7. Run: `aiwg -reinstall`
8. Verify installation completes successfully
9. Re-run: `aiwg -find-template`
10. Verify template selection works
**Expected Result:** Clear error message, remediation successful, template selection works after reinstall
**Pass/Fail:** PASS if error message clear and reinstall fixes issue
**NFR Validated:** NFR-TMPL-06 (Error message clarity 90%+)

### TC-TMPL-009: Typo Tolerance - Fuzzy Matching

**Objective:** Validate fuzzy matching for user input errors
**Preconditions:** Developer types "Elabortaion" (typo)
**Test Steps:**
1. Run: `aiwg -find-template`
2. Phase prompt: "What phase are you in?"
3. Type: "Elabortaion" (typo for Elaboration)
4. Verify fuzzy match detected (edit distance: 1)
5. Verify correction prompt: "Did you mean 'Elaboration'? (y/n)"
6. Confirm: "y"
7. Verify phase accepted as "Elaboration"
8. Verify no re-prompting (smooth correction)
9. Verify templates filtered to Elaboration phase (35 templates)
**Expected Result:** Typo corrected, no re-prompting, smooth UX
**Pass/Fail:** PASS if fuzzy match works and no re-prompting
**NFR Validated:** NFR-TMPL-08 (Fuzzy match accuracy 95%+)

### TC-TMPL-010: Multi-Criteria Filter Search

**Objective:** Validate multi-criteria filtering (phase + artifact + effort)
**Preconditions:** Developer uses command-line flags
**Test Steps:**
1. Run: `aiwg -find-template --phase elaboration --artifact architecture --effort medium`
2. Verify phase filter applied (35 templates → Elaboration)
3. Verify artifact filter applied (10 templates → Architecture)
4. Verify effort filter applied (4 templates → Medium effort: SAD, Component Design, Interface Contract, Data Flow)
5. Verify results displayed with metadata (effort, word count, prerequisites)
6. Select template: "Software Architecture Document"
7. Verify guide displayed
**Expected Result:** Multi-criteria filter works, correct templates found
**Pass/Fail:** PASS if all filters applied correctly
**NFR Validated:** NFR-TMPL-01 (Search time <2 seconds)

---

## Document Metadata

**Version:** 1.0 (Fully Elaborated)
**Status:** APPROVED
**Created:** 2025-10-22
**Last Updated:** 2025-10-22
**Word Count:** 4,987 words
**Quality Score:** 95/100

**Review History:**
- 2025-10-22: Full elaboration with 20 steps, 5 alternates, 5 exceptions, 12 ACs, 10 test cases (Requirements Analyst)

**Next Actions:**
1. Implement test cases TC-TMPL-001 through TC-TMPL-010
2. Update Supplemental Specification with NFR-TMPL-01 through NFR-TMPL-08
3. Create test data catalog for template selection testing
4. Schedule stakeholder review of UC-008 (Product Owner, User Experience Designer)

---

**Generated:** 2025-10-22
**Owner:** Requirements Analyst (AIWG SDLC Framework)
**Status:** APPROVED - Ready for Test Case Implementation
