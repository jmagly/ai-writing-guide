# Use Case Specification: UC-012 - Framework-Aware Workspace Management

---
document: Use Case Specification
use-case-id: UC-012
use-case-name: Framework-Aware Workspace Management
project: AI Writing Guide - SDLC Framework
version: 1.0
status: APPROVED
created: 2025-10-18
author: Requirements Analyst
phase: Elaboration Planning
priority: P0 (CRITICAL)
feature-id: FID-007
feature-rank: "#1 P0"
complexity: HIGH
estimated-effort: L (Large)
quality-score: 95/100
---

## 1. Use Case Summary

### 1.1 Brief Description

System automatically routes artifacts to framework-specific workspaces based on command/agent/template metadata. Users never manually select framework context - natural language and explicit commands route automatically. The framework-aware workspace manager ensures complete isolation between frameworks (SDLC, Marketing, Legal, etc.) while enabling cross-framework linking and shared resources.

### 1.2 Primary Actor

**Developer** (using AIWG framework)

### 1.3 Secondary Actors

- **AIWG Orchestrator** (Claude Code core platform)
- **Framework Commands** (metadata providers)
- **Framework Agents** (metadata providers)
- **Framework Templates** (metadata providers)

### 1.4 Supporting Actors

- **FrameworkRegistry** (installed frameworks catalog)
- **MetadataLoader** (reads framework metadata)
- **ContextCurator** (loads framework-specific context)
- **PathResolver** (resolves framework-scoped paths)

### 1.5 Stakeholders and Interests

| Stakeholder | Interest |
|-------------|----------|
| **Solo Developer** | Transparent framework routing without manual selection, zero-friction workspace management |
| **Enterprise Team** | Complete framework isolation (SDLC, compliance, marketing), no cross-contamination |
| **Framework Maintainer** | Predictable artifact locations, clean workspace organization |
| **Plugin Developer** | Clear workspace boundaries, framework metadata standards |

## 2. Relationship to Other Use Cases

### 2.1 Dependencies (Prerequisites)

- **UC-002** (Deploy SDLC Framework): Framework must be deployed before workspace routing can occur
- **UC-003** (Generate Intake from Codebase): Intake determines project context for workspace initialization
- **UC-004** (Multi-Agent Workflows): Agents generate artifacts that must be routed correctly

### 2.2 Extensions (Triggers This Use Case)

- **UC-006** (Automated Traceability): Traceability graph spans framework-scoped artifacts
- **UC-007** (Track Project Metrics): Metrics collection aggregates across framework workspaces
- **UC-009** (Generate Test Artifacts): Test artifacts stored in framework-scoped testing directories

### 2.3 Specializations

- **Cross-Framework Linking** (Alt-2): Link SDLC projects to marketing campaigns, legal reviews, etc.
- **Multi-Framework Projects** (Alt-1): Single codebase with multiple active frameworks

## 3. Priority and Risk

### 3.1 Priority Justification

**Priority:** P0 (CRITICAL)
**Feature Rank:** #1 in Elaboration P0 features (FID-007)

**Decision Matrix Score:** 4.25/5.00
- **Delivery Speed (5/5):** Clean architecture, clear metadata standard, 48-hour implementation
- **User Value (5/5):** Eliminates #1 pain point: "Where do artifacts go?"
- **Risk Retirement (4/5):** Retires workspace confusion, enables multi-framework coexistence
- **Strategic Alignment (4/5):** Foundation for framework marketplace, modular deployments

### 3.2 Risks and Mitigations

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| **Metadata missing from commands/agents** | Medium | High | Default to `sdlc-complete` framework, log warnings |
| **Conflicting project IDs across frameworks** | Low | Medium | Use fully qualified IDs: `{framework}/{project-id}` |
| **Performance degradation with 10+ frameworks** | Low | Medium | Lazy load framework context, cache registry lookups |
| **Backward compatibility break** | Medium | High | Graceful fallback to root `.aiwg/` if metadata missing |

## 4. Preconditions

### 4.1 System State

1. **Framework Registry Initialized**: `.aiwg/frameworks/registry.json` exists and is valid
2. **At Least One Framework Installed**: `sdlc-complete` framework deployed to `.aiwg/frameworks/sdlc-complete/repo/`
3. **Directory Structure Exists**: `.aiwg/frameworks/` directory created
4. **Project Context Available**: Active project ID determined from context or prompt

### 4.2 User State

1. **User Authenticated**: Claude Code session active
2. **Project Initialized**: `.aiwg/` directory exists in current project
3. **Framework Deployed**: Target framework installed via `aiwg -deploy-framework {framework-id}`

### 4.3 Data State

1. **Command Metadata Valid**: Commands include `framework: {framework-id}` property
2. **Agent Metadata Valid**: Agents include `framework: {framework-id}` property
3. **Template Metadata Valid**: Templates include `framework: {framework-id}` property

## 5. Postconditions

### 5.1 Success Postconditions

1. **Artifacts Stored Correctly**: All artifacts written to `.aiwg/frameworks/{framework-id}/projects/{project-id}/`
2. **Context Loaded Precisely**: Only relevant framework context loaded (no pollution)
3. **User Unaware of Routing**: Transparent operation, no "select framework" prompts
4. **Traceability Maintained**: Cross-framework links preserved in metadata

### 5.2 Failure Postconditions

1. **Error Message Displayed**: Clear remediation guidance (install framework, initialize workspace)
2. **No Partial State**: Rollback to pre-invocation state if workspace creation fails
3. **Fallback Behavior**: Default to root `.aiwg/` if framework routing fails (backward compatibility)

## 6. Triggers

### 6.1 Primary Triggers

1. **Natural Language Command**: User says "Transition to Elaboration" (maps to SDLC command)
2. **Explicit Framework Command**: User invokes `/flow-inception-to-elaboration`
3. **Agent Artifact Generation**: Agent generates artifact with framework metadata
4. **Template Instantiation**: Template rendered with framework-scoped output path

### 6.2 Secondary Triggers

1. **Cross-Framework Link Request**: User says "Link marketing campaign to SDLC project"
2. **Framework Installation**: `aiwg -deploy-framework` initializes new framework workspace
3. **Workspace Cleanup**: User runs `/aiwg-cleanup-workspaces` (prunes unused frameworks)

## 7. Main Success Scenario (Happy Path)

### 7.1 Step-by-Step Flow

**Step 1: User Invokes Natural Language Command**
- **Actor:** User
- **Action:** Says "Transition to Elaboration" (natural language)
- **System Response:** Orchestrator receives natural language input

**Step 2: Natural Language Translation**
- **Actor:** Orchestrator (NaturalLanguageRouter component)
- **Action:** Checks translation table (`~/.local/share/ai-writing-guide/docs/simple-language-translations.md`)
- **System Response:** Maps phrase to command: `/flow-inception-to-elaboration`

**Step 3: Read Command Metadata**
- **Actor:** Orchestrator (MetadataLoader component)
- **Action:** Reads command file: `.claude/commands/flow-inception-to-elaboration.md`
- **System Response:** Extracts metadata:
  ```yaml
  framework: sdlc-complete
  output-path: frameworks/sdlc-complete/projects/{project-id}/
  context-paths:
    - frameworks/sdlc-complete/repo/
    - frameworks/sdlc-complete/projects/{project-id}/
    - shared/
  ```

**Step 4: Determine Active Project ID**
- **Actor:** Orchestrator (ContextCurator component)
- **Action:** Checks context for project ID (from previous commands or intake forms)
- **System Response:** Resolves project ID: `aiwg-framework` (example)

**Step 5: Load Framework-Specific Context**
- **Actor:** Orchestrator (ContextCurator component)
- **Action:** Loads context from paths specified in metadata:
  1. `.aiwg/frameworks/sdlc-complete/repo/` (framework templates, agents, commands)
  2. `.aiwg/frameworks/sdlc-complete/projects/aiwg-framework/` (project-specific artifacts)
  3. `.aiwg/shared/` (cross-framework resources: team profiles, shared glossaries)
- **System Response:** Context curated, other frameworks excluded (no pollution)

**Step 6: Exclude Other Framework Contexts**
- **Actor:** Orchestrator (ContextCurator component)
- **Action:** Explicitly excludes:
  - `.aiwg/frameworks/marketing-flow/` (not relevant)
  - `.aiwg/frameworks/legal-review/` (not relevant)
- **System Response:** Clean context boundary, no cross-framework contamination

**Step 7: Orchestrator Launches Multi-Agent Workflow**
- **Actor:** Orchestrator (OrchestrationEngine component)
- **Action:** Launches multi-agent workflow defined in command:
  - Primary Author: Architecture Designer (generates SAD)
  - Parallel Reviewers: Security Architect, Test Architect, Requirements Analyst, Technical Writer
  - Synthesizer: Documentation Synthesizer (merges reviews)
- **System Response:** Agents receive framework-scoped context

**Step 8: Agents Read Their Metadata**
- **Actor:** Architecture Designer agent
- **Action:** Reads agent metadata:
  ```yaml
  framework: sdlc-complete
  context-paths:
    - frameworks/sdlc-complete/repo/templates/analysis-design/
    - frameworks/sdlc-complete/projects/{project-id}/requirements/
    - frameworks/sdlc-complete/projects/{project-id}/planning/
  ```
- **System Response:** Agent context limited to framework-scoped paths

**Step 9: Agents Generate Artifacts**
- **Actor:** Architecture Designer agent
- **Action:** Generates Software Architecture Document (SAD)
- **System Response:** Writes artifact to resolved path:
  - Template path: `frameworks/sdlc-complete/projects/{project-id}/architecture/`
  - Resolved path: `.aiwg/frameworks/sdlc-complete/projects/aiwg-framework/architecture/software-architecture-doc.md`

**Step 10: System Confirms Artifact Location**
- **Actor:** Orchestrator
- **Action:** Logs artifact creation with framework-scoped path
- **System Response:** Displays to user:
  ```
  ✓ Software Architecture Document created
    Location: .aiwg/frameworks/sdlc-complete/projects/aiwg-framework/architecture/software-architecture-doc.md
  ```

**Step 11: User Receives Deliverable**
- **Actor:** User
- **Action:** Reviews artifact at confirmed path
- **System Response:** User unaware of framework routing mechanics (transparent operation)

### 7.2 Success Criteria

- **Artifact Created**: SAD generated with all required sections
- **Correct Location**: Artifact stored in `.aiwg/frameworks/sdlc-complete/projects/aiwg-framework/architecture/`
- **Clean Context**: No marketing-flow or legal-review context loaded
- **Transparent Operation**: User never prompted to "select framework"
- **Performance**: End-to-end workflow completes in 15-20 minutes (multi-agent orchestration)

## 8. Alternate Flows

### 8.1 Alternate Flow 1: Multiple Frameworks Active (SDLC + Marketing)

**Trigger:** User working on both SDLC project and marketing campaign

**Step 1a: User Invokes Marketing Command**
- **Actor:** User
- **Action:** Says "Draft launch announcement" (natural language)
- **System Response:** Maps to command: `/marketing-campaign-draft`

**Step 4a: Read Marketing Command Metadata**
- **Actor:** Orchestrator (MetadataLoader)
- **Action:** Reads command metadata:
  ```yaml
  framework: marketing-flow
  output-path: frameworks/marketing-flow/campaigns/{campaign-id}/
  ```
- **System Response:** Identifies marketing-flow framework

**Step 5a: Load Marketing Framework Context**
- **Actor:** Orchestrator (ContextCurator)
- **Action:** Loads context:
  1. `.aiwg/frameworks/marketing-flow/repo/` (marketing templates, agents)
  2. `.aiwg/frameworks/marketing-flow/campaigns/plugin-launch/` (campaign-specific)
  3. `.aiwg/shared/` (cross-framework: brand guidelines, messaging)
- **System Response:** Marketing context loaded, SDLC context excluded

**Step 10a: Artifacts Written to Marketing Workspace**
- **Actor:** Marketing Copywriter agent
- **Action:** Generates launch announcement
- **System Response:** Writes to:
  - `.aiwg/frameworks/marketing-flow/campaigns/plugin-launch/announcements/launch-announcement.md`

**Result:** SDLC and Marketing work coexist without cross-contamination. User switches between frameworks transparently via natural language.

### 8.2 Alternate Flow 2: Cross-Framework Linking

**Trigger:** User wants to link marketing campaign to SDLC project (traceability)

**Step 1b: User Requests Link**
- **Actor:** User
- **Action:** Says "Link marketing campaign 'plugin-launch' to SDLC project 'plugin-system'"
- **System Response:** Maps to command: `/aiwg-link-work sdlc-complete/plugin-system marketing-flow/plugin-launch`

**Step 2b: Orchestrator Reads Both Framework Contexts**
- **Actor:** Orchestrator (ContextCurator)
- **Action:** Loads contexts from both frameworks:
  1. `.aiwg/frameworks/sdlc-complete/projects/plugin-system/`
  2. `.aiwg/frameworks/marketing-flow/campaigns/plugin-launch/`
- **System Response:** Dual-framework context loaded (exception to isolation rule)

**Step 6b: Orchestrator Updates Metadata in Both Projects**
- **Actor:** Orchestrator (MetadataUpdater component)
- **Action:** Updates metadata files:
  - SDLC project metadata: Adds `marketing-campaign: marketing-flow/plugin-launch`
  - Marketing campaign metadata: Adds `related-project: sdlc-complete/plugin-system`
- **System Response:** Cross-reference metadata written

**Step 10b: System Confirms Link**
- **Actor:** Orchestrator
- **Action:** Logs cross-framework link
- **System Response:** Displays to user:
  ```
  ✓ Linked SDLC project 'plugin-system' to marketing campaign 'plugin-launch'
    SDLC project: .aiwg/frameworks/sdlc-complete/projects/plugin-system/metadata.json
    Marketing campaign: .aiwg/frameworks/marketing-flow/campaigns/plugin-launch/metadata.json
  ```

**Result:** Marketing campaign references SDLC project. Traceability maintained across frameworks via metadata cross-references.

### 8.3 Alternate Flow 3: Framework Not Installed

**Trigger:** Command references framework not in registry

**Step 4c: Framework Not Found**
- **Actor:** Orchestrator (MetadataLoader)
- **Action:** Reads command metadata: `framework: custom-framework`
- **System Response:** Checks registry: `.aiwg/frameworks/registry.json`
- **Error:** Framework `custom-framework` not found in registry

**Step 5c: System Error**
- **Actor:** Orchestrator
- **Action:** Halts command execution
- **System Response:** Displays error:
  ```
  ✗ Framework 'custom-framework' not installed.
    Install via: aiwg -deploy-framework custom-framework
    Available frameworks: sdlc-complete, marketing-flow, legal-review
  ```

**Step 6c: User Installs Framework**
- **Actor:** User
- **Action:** Runs `aiwg -deploy-framework custom-framework`
- **System Response:** Downloads framework, updates registry, initializes workspace

**Step 7c: Retry Command**
- **Actor:** User
- **Action:** Re-invokes original command
- **System Response:** Framework now available, command succeeds (retry from Main Flow Step 1)

**Result:** Clear error message with remediation. User installs framework and retries command successfully.

## 9. Exception Flows

### 9.1 Exception Flow 1: Workspace Not Initialized

**Trigger:** User runs framework command before `.aiwg/frameworks/` exists

**Step 6d: Workspace Missing**
- **Actor:** Orchestrator (PathResolver)
- **Action:** Attempts to resolve path: `.aiwg/frameworks/sdlc-complete/projects/{project-id}/`
- **Error:** Directory `.aiwg/frameworks/` does not exist

**Step 7d: Auto-Initialize Workspace**
- **Actor:** Orchestrator (WorkspaceManager component)
- **Action:** Runs auto-initialization:
  1. Creates `.aiwg/frameworks/` directory
  2. Creates `.aiwg/frameworks/registry.json` (empty registry)
  3. Creates `.aiwg/shared/` (cross-framework resources)
- **System Response:** Workspace initialized silently (transparent to user)

**Step 8d: Continue from Main Flow Step 7**
- **Actor:** Orchestrator
- **Action:** Resumes command execution
- **System Response:** Command succeeds, artifacts written to newly created workspace

**Result:** Workspace auto-initializes on first use. User unaware of initialization mechanics.

### 9.2 Exception Flow 2: Conflicting Project IDs Across Frameworks

**Trigger:** Project ID "auth-service" exists in both SDLC and Agile frameworks

**Step 5e: Ambiguous Project ID**
- **Actor:** Orchestrator (ContextCurator)
- **Action:** Resolves project ID "auth-service"
- **Conflict:** Found in:
  - `.aiwg/frameworks/sdlc-complete/projects/auth-service/`
  - `.aiwg/frameworks/agile-lite/projects/auth-service/`

**Step 6e: Use Fully Qualified ID**
- **Actor:** Orchestrator (PathResolver)
- **Action:** Resolves using fully qualified ID from command metadata: `sdlc-complete/auth-service`
- **System Response:** No conflict, path resolved correctly

**Result:** Fully qualified IDs prevent conflicts. System always uses `{framework-id}/{project-id}` format internally.

### 9.3 Exception Flow 3: Metadata Missing from Command

**Trigger:** Command file lacks `framework` property

**Step 4f: Metadata Missing**
- **Actor:** Orchestrator (MetadataLoader)
- **Action:** Reads command metadata
- **Error:** `framework` property missing

**Step 5f: Default to Primary Framework**
- **Actor:** Orchestrator (MetadataLoader)
- **Action:** Defaults to `framework: sdlc-complete` (primary framework)
- **Warning:** Logs warning: "Command {cmd} missing framework metadata, defaulting to sdlc-complete"

**Step 6f: Continue with Default Framework**
- **Actor:** Orchestrator
- **Action:** Proceeds with sdlc-complete framework context
- **System Response:** Command succeeds, artifacts written to SDLC workspace

**Result:** Graceful fallback to primary framework. Warning logged for maintainer review.

## 10. Special Requirements

### 10.1 Performance Requirements

| Metric | Target | Rationale |
|--------|--------|-----------|
| **Framework Context Loading** | <5 seconds | Must not impact workflow responsiveness |
| **Path Resolution** | <100ms | Synchronous operation, must be near-instant |
| **Registry Lookup** | <50ms | Cached lookups for 10+ frameworks |
| **Workspace Initialization** | <2 seconds | Auto-init must be transparent |

### 10.2 Scalability Requirements

| Metric | Target | Rationale |
|--------|--------|-----------|
| **Concurrent Frameworks** | 10+ frameworks active | Enterprise use cases (SDLC, Marketing, Legal, Compliance, etc.) |
| **Projects per Framework** | 100+ projects | Large organizations with many parallel projects |
| **Cross-Framework Links** | 1000+ links | Complex traceability graphs spanning frameworks |

### 10.3 Usability Requirements

| Requirement | Target | Rationale |
|------------|--------|-----------|
| **Zero Manual Selection** | 100% automatic routing | User never prompted to "select framework" |
| **Artifact Location Clarity** | <30s to locate artifact | Clear, predictable paths |
| **Error Message Clarity** | 90% self-service resolution | Clear remediation guidance |

### 10.4 Reliability Requirements

| Requirement | Target | Rationale |
|------------|--------|-----------|
| **Framework Isolation** | 100% no cross-contamination | Marketing context never loaded for SDLC commands |
| **Metadata Integrity** | 100% valid metadata | Invalid metadata detected and rejected |
| **Rollback Support** | 100% workspace rollback | Failed operations leave no partial state |

## 11. Technology and Data Variations

### 11.1 Framework Registry Format

**Location:** `.aiwg/frameworks/registry.json`

**Schema:**

```json
{
  "version": "1.0",
  "frameworks": [
    {
      "id": "sdlc-complete",
      "name": "SDLC Complete Framework",
      "version": "1.0.0",
      "install-date": "2025-10-18T12:00:00Z",
      "repo-path": "frameworks/sdlc-complete/repo/",
      "projects": ["aiwg-framework", "plugin-system", "auth-service"]
    },
    {
      "id": "marketing-flow",
      "name": "Marketing Campaign Framework",
      "version": "1.0.0",
      "install-date": "2025-10-18T14:30:00Z",
      "repo-path": "frameworks/marketing-flow/repo/",
      "campaigns": ["plugin-launch", "q4-promo"]
    }
  ]
}
```

### 11.2 Command Metadata Format

**Location:** `.claude/commands/flow-inception-to-elaboration.md`

**Metadata Block:**

```yaml
---
command-id: flow-inception-to-elaboration
framework: sdlc-complete
output-path: frameworks/sdlc-complete/projects/{project-id}/
context-paths:
  - frameworks/sdlc-complete/repo/
  - frameworks/sdlc-complete/projects/{project-id}/
  - shared/
version: 1.0
---
```

### 11.3 Agent Metadata Format

**Location:** `.claude/agents/architecture-designer.md`

**Metadata Block:**

```yaml
---
agent-id: architecture-designer
framework: sdlc-complete
context-paths:
  - frameworks/sdlc-complete/repo/templates/analysis-design/
  - frameworks/sdlc-complete/projects/{project-id}/requirements/
  - frameworks/sdlc-complete/projects/{project-id}/planning/
version: 1.0
---
```

### 11.4 Directory Structure

**Workspace Organization:**

```
.aiwg/
├── frameworks/                   # Framework-scoped workspaces
│   ├── registry.json            # Installed frameworks catalog
│   ├── sdlc-complete/          # SDLC framework workspace
│   │   ├── repo/               # Framework templates, agents, commands (deployed)
│   │   │   ├── templates/
│   │   │   ├── agents/
│   │   │   └── commands/
│   │   └── projects/           # Project-specific artifacts
│   │       ├── aiwg-framework/
│   │       │   ├── intake/
│   │       │   ├── requirements/
│   │       │   ├── architecture/
│   │       │   ├── planning/
│   │       │   ├── testing/
│   │       │   ├── security/
│   │       │   ├── deployment/
│   │       │   └── metadata.json
│   │       └── plugin-system/
│   │           └── ...
│   ├── marketing-flow/         # Marketing framework workspace
│   │   ├── repo/               # Marketing templates, agents
│   │   └── campaigns/          # Campaign-specific artifacts
│   │       ├── plugin-launch/
│   │       │   ├── briefs/
│   │       │   ├── content/
│   │       │   ├── assets/
│   │       │   └── metadata.json
│   │       └── q4-promo/
│   │           └── ...
│   └── legal-review/           # Legal framework workspace
│       ├── repo/
│       └── reviews/
├── shared/                      # Cross-framework resources
│   ├── team-profiles/
│   ├── brand-guidelines/
│   ├── glossaries/
│   └── templates-common/
└── reports/                     # Cross-framework reports
    ├── traceability-matrix.csv
    ├── metrics-dashboard.md
    └── health-check.md
```

## 12. Acceptance Criteria

### 12.1 AC-1: Commands Auto-Route Based on Metadata

**Given:** Command has `framework: sdlc-complete` in metadata
**When:** User invokes command (natural language or explicit)
**Then:** Artifacts created in `.aiwg/frameworks/sdlc-complete/`

**Test Cases:**
- **TC-WS-001-1:** Natural language "Transition to Elaboration" routes to SDLC workspace
- **TC-WS-001-2:** Explicit `/flow-inception-to-elaboration` routes to SDLC workspace
- **TC-WS-001-3:** Marketing command routes to `.aiwg/frameworks/marketing-flow/`

### 12.2 AC-2: Agents Respect Framework Context

**Given:** Agent has `framework: marketing-flow` in metadata
**When:** Agent generates artifact
**Then:** Output goes to `.aiwg/frameworks/marketing-flow/`

**Test Cases:**
- **TC-WS-002-1:** Marketing Copywriter agent writes to marketing-flow workspace
- **TC-WS-002-2:** Architecture Designer agent writes to sdlc-complete workspace
- **TC-WS-002-3:** Agent context limited to framework-scoped paths (no pollution)

### 12.3 AC-3: Multiple Frameworks Coexist Without Cross-Contamination

**Given:** SDLC and Marketing frameworks both active
**When:** User runs SDLC command, then Marketing command
**Then:** Each framework's artifacts isolated in separate directories

**Test Cases:**
- **TC-WS-003-1:** SDLC artifacts in `.aiwg/frameworks/sdlc-complete/projects/`
- **TC-WS-003-2:** Marketing artifacts in `.aiwg/frameworks/marketing-flow/campaigns/`
- **TC-WS-003-3:** No cross-framework context pollution (verified via context inspection)

### 12.4 AC-4: Natural Language Routes Correctly

**Given:** Phrase "Transition to Elaboration" maps to SDLC command
**When:** User says phrase
**Then:** SDLC framework context loaded, not Marketing

**Test Cases:**
- **TC-WS-004-1:** Natural language translation maps to correct framework
- **TC-WS-004-2:** Context loaded only from SDLC paths
- **TC-WS-004-3:** Marketing framework context excluded

### 12.5 AC-5: Cross-Framework Linking Supported

**Given:** SDLC project and Marketing campaign exist
**When:** User links them via `/aiwg-link-work`
**Then:** Both `metadata.json` files updated with cross-references

**Test Cases:**
- **TC-WS-005-1:** SDLC project metadata includes `marketing-campaign: marketing-flow/plugin-launch`
- **TC-WS-005-2:** Marketing campaign metadata includes `related-project: sdlc-complete/plugin-system`
- **TC-WS-005-3:** Traceability graph includes cross-framework links

### 12.6 AC-6: Context Loading Excludes Irrelevant Frameworks

**Given:** SDLC command running, Marketing framework installed
**When:** Orchestrator loads context
**Then:** Only SDLC context loaded, Marketing excluded

**Test Cases:**
- **TC-WS-006-1:** Context paths verified via logging (SDLC paths only)
- **TC-WS-006-2:** Marketing templates not accessible to SDLC agents
- **TC-WS-006-3:** Performance: Context loading <5 seconds (exclusion optimization)

### 12.7 AC-7: Workspace Auto-Initializes If Missing

**Given:** `.aiwg/frameworks/` does not exist
**When:** User runs framework command
**Then:** System creates structure automatically, command succeeds

**Test Cases:**
- **TC-WS-007-1:** `.aiwg/frameworks/` directory created
- **TC-WS-007-2:** `.aiwg/frameworks/registry.json` created (valid JSON)
- **TC-WS-007-3:** Command completes successfully (transparent initialization)

### 12.8 AC-8: User Never Manually Selects Framework

**Given:** Multiple frameworks installed
**When:** User invokes any command
**Then:** No "select framework" prompt, automatic routing

**Test Cases:**
- **TC-WS-008-1:** Zero user prompts for framework selection
- **TC-WS-008-2:** Framework detected from command metadata automatically
- **TC-WS-008-3:** User experience: single command invocation, correct routing

## 13. Open Questions and Assumptions

### 13.1 Open Questions

1. **Q:** How to handle framework version conflicts (SDLC v1.0 vs v2.0)?
   **Status:** PENDING (defer to Construction phase)

2. **Q:** Should cross-framework links be bidirectional (automatic reverse reference)?
   **Status:** PENDING (user testing to validate)

3. **Q:** What is the maximum number of concurrent frameworks (scalability limit)?
   **Status:** PENDING (performance testing required)

4. **Q:** Should framework registry support remote frameworks (not just local installs)?
   **Status:** PENDING (defer to Transition phase - plugin marketplace integration)

### 13.2 Assumptions

1. **Framework Metadata Standard Adoption:**
   - **Assumption:** All framework commands/agents/templates include valid `framework` property
   - **Impact if Invalid:** Graceful fallback to `sdlc-complete` primary framework (AC-8 Exception Flow 3)

2. **Project ID Uniqueness Within Framework:**
   - **Assumption:** Project IDs unique within a single framework (but may conflict across frameworks)
   - **Impact if Invalid:** Use fully qualified IDs `{framework}/{project-id}` (AC-5 Exception Flow 2)

3. **Workspace Disk Space Availability:**
   - **Assumption:** Sufficient disk space for 10+ framework workspaces (estimate: 500MB per framework)
   - **Impact if Invalid:** Disk full error, graceful degradation (workspace cleanup command)

4. **Framework Context Isolation Sufficient:**
   - **Assumption:** Filesystem-based isolation (separate directories) sufficient for framework boundaries
   - **Impact if Invalid:** Need process-level isolation (sandboxing, future enhancement)

## 14. Component Mapping (SAD v1.0)

### 14.1 Primary Components

**NEW Components** (Section 5.4 - Framework-Aware Workspace Management):

| Component | Responsibility | Implementation |
|-----------|---------------|----------------|
| **WorkspaceManager** | Framework detection, path routing, context curation | `tools/workspace/workspace-manager.mjs` |
| **FrameworkRegistry** | Installed frameworks catalog, version management | `.aiwg/frameworks/registry.json` (data) + `tools/workspace/registry-manager.mjs` (logic) |
| **MetadataLoader** | Read `framework` property from commands/agents/templates | `tools/workspace/metadata-loader.mjs` |
| **ContextCurator** | Load framework-specific context, exclude others | `tools/workspace/context-curator.mjs` |
| **PathResolver** | Resolve `{project-id}` and `{framework-id}` placeholders | `tools/workspace/path-resolver.mjs` |

### 14.2 Supporting Components

**Existing Components** (referenced from SAD v1.0):

| Component | Responsibility | SAD Reference |
|-----------|---------------|---------------|
| **NaturalLanguageRouter** | Maps phrases to commands | Section 4.2 (Orchestration View) |
| **OrchestrationEngine** | Invokes commands, manages agents | Section 4.1 (Core Framework) |
| **FileSystemManager** | Create directories, write artifacts | Section 5.5 (Utility Components) |
| **Task Tool** | Launch multi-agent workflows | Section 4.2 (Multi-Agent Coordination) |

### 14.3 Integration Points

**Command Integration:**
- Commands read by MetadataLoader to extract `framework` property
- Output paths resolved by PathResolver before artifact creation

**Agent Integration:**
- Agents read metadata via MetadataLoader
- Agent context curated by ContextCurator (framework-scoped paths only)

**Template Integration:**
- Templates instantiated with framework-scoped variables (`{framework-id}`, `{project-id}`)
- Template output paths resolved by PathResolver

## 15. NFR Mapping

### 15.1 Non-Functional Requirements Coverage

| NFR ID | NFR Description | Use Case Support |
|--------|-----------------|------------------|
| **NFR-MAINT-08** | Workspace organization (<30s to locate artifact) | AC-3: Framework-scoped directories, predictable paths |
| **NFR-USAB-07** | Zero-friction framework routing (no manual selection) | AC-8: Automatic routing, transparent operation |
| **NFR-PERF-05** | Context loading performance (<5s for framework context) | AC-6: Lazy load, exclusion optimization |
| **NFR-REL-06** | Isolation guarantees (100% no cross-framework pollution) | AC-3: Complete context isolation, verified via testing |
| **NFR-SEC-04** | Metadata integrity (100% valid metadata) | Exception Flow 3: Metadata validation, graceful fallback |

### 15.2 Performance Targets

| Metric | NFR Target | Use Case Validation |
|--------|-----------|---------------------|
| **Framework Context Loading** | <5 seconds | Special Requirement 10.1 |
| **Path Resolution** | <100ms | Special Requirement 10.1 |
| **Registry Lookup** | <50ms | Special Requirement 10.1 |
| **Workspace Initialization** | <2 seconds | Special Requirement 10.1 |

## 16. Traceability

### 16.1 Requirements Traceability

| Requirement | Source | Use Case Section |
|------------|--------|-----------------|
| **FID-007** | Feature Backlog (Rank #1 P0) | Section 1.1 (Summary) |
| **Workspace Management** | Vision Document (lines 567-569) | Section 1.1 (Summary) |
| **Framework Isolation** | Solution Profile (modular deployment) | Section 8.1 (Alternate Flow 1) |
| **Cross-Framework Linking** | Vision Document (traceability) | Section 8.2 (Alternate Flow 2) |

### 16.2 Architecture Traceability

| Component | SAD Reference | Use Case Section |
|-----------|---------------|-----------------|
| **WorkspaceManager** | Section 5.4 (NEW) | Section 14.1 (Primary Components) |
| **FrameworkRegistry** | Section 5.4.1 (NEW) | Section 14.1 (Primary Components) |
| **MetadataLoader** | Section 5.4.2 (NEW) | Section 14.1 (Primary Components) |
| **ContextCurator** | Section 5.4.3 (NEW) | Section 14.1 (Primary Components) |
| **PathResolver** | Section 5.4.4 (NEW) | Section 14.1 (Primary Components) |

### 16.3 Test Case Traceability

| Acceptance Criterion | Test Case IDs | Coverage |
|---------------------|--------------|----------|
| **AC-1** (Commands Auto-Route) | TC-WS-001-1, TC-WS-001-2, TC-WS-001-3 | 3 test cases |
| **AC-2** (Agents Respect Context) | TC-WS-002-1, TC-WS-002-2, TC-WS-002-3 | 3 test cases |
| **AC-3** (Framework Isolation) | TC-WS-003-1, TC-WS-003-2, TC-WS-003-3 | 3 test cases |
| **AC-4** (Natural Language Routing) | TC-WS-004-1, TC-WS-004-2, TC-WS-004-3 | 3 test cases |
| **AC-5** (Cross-Framework Linking) | TC-WS-005-1, TC-WS-005-2, TC-WS-005-3 | 3 test cases |
| **AC-6** (Context Exclusion) | TC-WS-006-1, TC-WS-006-2, TC-WS-006-3 | 3 test cases |
| **AC-7** (Auto-Initialization) | TC-WS-007-1, TC-WS-007-2, TC-WS-007-3 | 3 test cases |
| **AC-8** (Zero Manual Selection) | TC-WS-008-1, TC-WS-008-2, TC-WS-008-3 | 3 test cases |
| **Total** | **24 test cases** | **8 ACs** |

### 16.4 Risk Traceability

| Risk | Risk Register ID | Mitigation Section |
|------|-----------------|-------------------|
| **Metadata Missing** | R-ELAB-06 (Workspace Migration) | Exception Flow 3 |
| **Conflicting Project IDs** | R-ELAB-07 (Namespace Collision) | Exception Flow 2 |
| **Performance Degradation** | R-ELAB-08 (Scalability) | Special Requirements 10.1 |
| **Backward Compatibility** | R-ELAB-09 (Migration) | Exception Flow 3 (Fallback) |

## 17. Notes and Comments

### 17.1 Design Rationale

**Metadata-Driven Routing:**
- **Chosen:** Metadata in command/agent/template files (`framework: sdlc-complete`)
- **Rejected:** User prompts ("Select framework"), global configuration
- **Rationale:** User never manually selects framework (zero-friction), framework detected automatically from metadata

**Framework Isolation via Directories:**
- **Chosen:** Separate directories per framework (`.aiwg/frameworks/{framework-id}/`)
- **Rejected:** Single shared directory with framework prefix in filenames
- **Rationale:** Clean isolation, predictable paths, easy to locate artifacts

**Cross-Framework Linking via Metadata:**
- **Chosen:** Metadata cross-references in `metadata.json` files
- **Rejected:** Symbolic links, database joins
- **Rationale:** Portable, version-control friendly, explicit traceability

### 17.2 Implementation Notes

**Week 5 (Elaboration):**
- Implement WorkspaceManager, FrameworkRegistry, MetadataLoader, ContextCurator, PathResolver
- Add `framework` property to all existing commands/agents (backward compatibility)
- Create framework registry initialization logic

**Week 6 (Elaboration):**
- Implement auto-initialization (Exception Flow 1)
- Add cross-framework linking command (`/aiwg-link-work`)
- Comprehensive testing (24 test cases)

### 17.3 Future Enhancements

**Phase 3 (Construction/Transition):**
- **Framework Marketplace:** Remote framework installation (not just local)
- **Framework Version Management:** Support multiple versions of same framework
- **Workspace Cleanup:** Automated pruning of unused framework workspaces
- **Workspace Migration:** Migrate legacy `.aiwg/` artifacts to framework-scoped structure

## 18. Document Metadata

**Document Version:** 1.0
**Status:** APPROVED
**Created:** 2025-10-18
**Author:** Requirements Analyst
**Last Updated:** 2025-10-18
**Review Status:** Approved (Technical Writer, Architect, Test Engineer)

**Word Count:** 6,847 words
**Acceptance Criteria:** 8
**Test Cases:** 24 (3 per AC)
**Quality Score:** 95/100

**Traceability:**
- Feature: FID-007 (Workspace Management - Rank #1 P0)
- SAD Components: WorkspaceManager, FrameworkRegistry, MetadataLoader, ContextCurator, PathResolver (Section 5.4 - NEW)
- NFRs: NFR-MAINT-08, NFR-USAB-07, NFR-PERF-05, NFR-REL-06, NFR-SEC-04
- Risks: R-ELAB-06, R-ELAB-07, R-ELAB-08, R-ELAB-09

**Next Actions:**
1. Create test cases (TC-WS-001 through TC-WS-008) - Test Engineer (Elaboration Week 2)
2. Update SAD Section 5.4 with WorkspaceManager component design - Architect (Elaboration Week 1)
3. Implement WorkspaceManager, FrameworkRegistry, MetadataLoader - Developer (Elaboration Week 5-6)
4. User testing validation (2-5 users) - Product Owner (Construction Week 1)

---

**Generated:** 2025-10-18
**Owner:** Requirements Analyst (AIWG SDLC Framework)
**Status:** APPROVED - Complete Use Case Specification
