# Implementation Plan: FID-007 - Framework-Scoped Workspace Management

---
document: Implementation Plan
feature-id: FID-007
feature-name: Framework-Scoped Workspace Management
project: AI Writing Guide - SDLC Framework
version: 1.0
status: DRAFT
created: 2025-10-19
author: Software Implementer
phase: Elaboration Week 2-4
priority: P0 (CRITICAL)
feature-rank: "#1 P0"
total-effort: 80 hours
timeline: 3 weeks
---

## 1. Executive Summary

### 1.1 Overview

This implementation plan breaks down FID-007 (Framework-Scoped Workspace Management) into three weekly sprints totaling 80 hours of development effort. The feature enables automatic routing of artifacts to framework-specific workspaces based on command/agent/template metadata, eliminating manual framework selection and enabling polyglot process management.

### 1.2 Success Criteria

- **8 Acceptance Criteria** satisfied (UC-012 AC-1 through AC-8)
- **24 Test Cases** passing (TC-WS-001-1 through TC-WS-008-3)
- **Performance Targets** met (NFR-PERF-05: <5s context loading, NFR-PERF-09)
- **Zero User Friction** (NFR-USAB-07: no manual framework selection)
- **100% Isolation** (NFR-REL-06, NFR-REL-07: no cross-framework pollution)

### 1.3 Key Components

| Component | File Path | Responsibility |
|-----------|-----------|---------------|
| **WorkspaceManager** | `tools/workspace/workspace-manager.mjs` | Framework detection, path routing, workspace initialization |
| **FrameworkRegistry** | `tools/workspace/registry-manager.mjs` | Installed frameworks catalog, CRUD operations |
| **MetadataLoader** | `tools/workspace/metadata-loader.mjs` | Read framework metadata from commands/agents/templates |
| **ContextCurator** | `tools/workspace/context-curator.mjs` | Load framework-specific context, exclude others |
| **PathResolver** | `tools/workspace/path-resolver.mjs` | Resolve placeholders: `{framework-id}`, `{project-id}` |
| **MigrationTool** | `tools/workspace/migrate-to-frameworks.mjs` | Migrate existing `.aiwg/` to framework-scoped structure |
| **NaturalLanguageRouter** | `tools/workspace/nl-router.mjs` | Map natural language to framework-specific commands |

### 1.4 Dependencies

**Prerequisites:**
- UC-012 (Framework-Aware Workspace Management) - Requirements specification
- ADR-007 (Framework-Scoped Workspace Architecture) - Architecture design
- NFR-MAINT-08, NFR-USAB-07, NFR-PERF-05, NFR-REL-06, NFR-SEC-04 - Non-functional requirements

**Blocks:**
- FID-001 (Automated Traceability) - Needs workspace structure for graph generation
- FID-002 (Track Project Metrics) - Needs cross-project aggregation
- FID-003, FID-004, FID-005 - All need framework-scoped paths

---

## 2. Week 2 Deliverables (27 hours)

### 2.1 Week 2 Objectives

**Goal:** Establish foundational workspace infrastructure with core CRUD operations, tier management, and metadata standards.

**Deliverables:**
1. Framework registry system (data model + CRUD operations)
2. Workspace tier management (4-tier directory structure)
3. Command/agent metadata standards (YAML frontmatter schema)
4. Unit tests for registry + tier management (60%+ coverage)

### 2.2 Task Breakdown: Week 2

| Task | Component | Effort | Files | Tests | Acceptance Criteria |
|------|-----------|--------|-------|-------|---------------------|
| **W2-T1: Define Framework Registry Schema** | FrameworkRegistry | 2h | `tools/workspace/schemas/registry-schema.json` | JSON schema validation | AC-7 (auto-initialization) |
| **W2-T2: Implement Registry Manager** | FrameworkRegistry | 6h | `tools/workspace/registry-manager.mjs` | 12 unit tests | AC-1 (command routing) |
| **W2-T3: Define Metadata Schemas** | MetadataLoader | 3h | `tools/workspace/schemas/command-metadata-schema.json`, `agent-metadata-schema.json`, `template-metadata-schema.json` | Schema validation | AC-2 (agent context) |
| **W2-T4: Implement Metadata Loader** | MetadataLoader | 5h | `tools/workspace/metadata-loader.mjs` | 10 unit tests | AC-1, AC-2 (metadata reading) |
| **W2-T5: Implement Workspace Manager** | WorkspaceManager | 6h | `tools/workspace/workspace-manager.mjs` | 15 unit tests | AC-7 (auto-init), AC-3 (isolation) |
| **W2-T6: Implement Path Resolver** | PathResolver | 3h | `tools/workspace/path-resolver.mjs` | 8 unit tests | AC-1 (output paths) |
| **W2-T7: Integration Testing** | All | 2h | `tests/integration/workspace-basics.test.mjs` | 5 integration tests | AC-7 (workspace initialization) |
| **TOTAL WEEK 2** | | **27h** | **7 files** | **50 tests** | **AC-1, AC-2, AC-7** |

### 2.3 Detailed Task Specifications: Week 2

#### W2-T1: Define Framework Registry Schema (2 hours)

**File:** `tools/workspace/schemas/registry-schema.json`

**Schema Definition:**
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["version", "frameworks"],
  "properties": {
    "version": {
      "type": "string",
      "pattern": "^1\\.0$"
    },
    "frameworks": {
      "type": "array",
      "items": {
        "type": "object",
        "required": ["id", "name", "version", "install-date", "repo-path"],
        "properties": {
          "id": { "type": "string", "pattern": "^[a-z0-9-]+$" },
          "name": { "type": "string" },
          "version": { "type": "string", "pattern": "^\\d+\\.\\d+\\.\\d+$" },
          "install-date": { "type": "string", "format": "date-time" },
          "repo-path": { "type": "string" },
          "projects": { "type": "array", "items": { "type": "string" } },
          "campaigns": { "type": "array", "items": { "type": "string" } },
          "stories": { "type": "array", "items": { "type": "string" } }
        }
      }
    }
  }
}
```

**Acceptance Criteria:**
- Schema validates valid registry structure
- Schema rejects invalid version formats
- Schema rejects invalid framework IDs (must be kebab-case)

**Tests:**
- `test-registry-schema-valid.mjs`: Validate well-formed registry
- `test-registry-schema-invalid.mjs`: Reject malformed registry

---

#### W2-T2: Implement Registry Manager (6 hours)

**File:** `tools/workspace/registry-manager.mjs`

**Exports:**
```javascript
export class RegistryManager {
  constructor(registryPath = '.aiwg/frameworks/registry.json');

  // CRUD Operations
  async getFrameworks();                          // List all installed frameworks
  async getFramework(frameworkId);                // Get single framework metadata
  async addFramework(frameworkMetadata);          // Register new framework
  async updateFramework(frameworkId, updates);    // Update framework metadata
  async removeFramework(frameworkId);             // Unregister framework

  // Query Operations
  async frameworkExists(frameworkId);             // Check if framework installed
  async getProjectsByFramework(frameworkId);      // List projects in framework
  async addProjectToFramework(frameworkId, projectId);  // Register project
  async removeProjectFromFramework(frameworkId, projectId);

  // Validation
  async validateRegistry();                       // Check schema compliance
  async initializeRegistry();                     // Create empty registry
}
```

**Implementation Details:**
- Use `fs/promises` for async file I/O
- Validate against `registry-schema.json` on every write
- Atomic writes (write to temp file, rename)
- Error handling: FileNotFoundError → auto-initialize
- Concurrent access: file-based locking (`.aiwg/frameworks/registry.lock`)

**Acceptance Criteria:**
- All CRUD operations succeed with valid input
- Invalid framework ID rejected (must be kebab-case)
- Registry auto-initializes if missing (AC-7)
- Concurrent writes serialized via lock file

**Tests (12 unit tests):**
1. `test-registry-create-empty.mjs`: Initialize empty registry
2. `test-registry-add-framework.mjs`: Add SDLC framework
3. `test-registry-get-framework.mjs`: Retrieve framework metadata
4. `test-registry-update-framework.mjs`: Update framework version
5. `test-registry-remove-framework.mjs`: Unregister framework
6. `test-registry-framework-exists.mjs`: Check existence
7. `test-registry-add-project.mjs`: Register project to framework
8. `test-registry-get-projects.mjs`: List projects in framework
9. `test-registry-remove-project.mjs`: Unregister project
10. `test-registry-validate-valid.mjs`: Validate compliant registry
11. `test-registry-validate-invalid.mjs`: Reject non-compliant registry
12. `test-registry-concurrent-writes.mjs`: Serialize concurrent updates

---

#### W2-T3: Define Metadata Schemas (3 hours)

**Files:**
- `tools/workspace/schemas/command-metadata-schema.json`
- `tools/workspace/schemas/agent-metadata-schema.json`
- `tools/workspace/schemas/template-metadata-schema.json`

**Command Metadata Schema:**
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["framework", "framework-version", "output-path"],
  "properties": {
    "framework": { "type": "string", "pattern": "^[a-z0-9-]+$" },
    "framework-version": { "type": "string", "pattern": "^\\d+\\.\\d+$" },
    "output-path": { "type": "string" },
    "context-paths": { "type": "array", "items": { "type": "string" } }
  }
}
```

**Agent Metadata Schema:**
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["framework", "framework-version", "context-paths", "output-base"],
  "properties": {
    "framework": { "type": "string", "pattern": "^[a-z0-9-]+$" },
    "framework-version": { "type": "string", "pattern": "^\\d+\\.\\d+$" },
    "context-paths": { "type": "array", "items": { "type": "string" } },
    "output-base": { "type": "string" }
  }
}
```

**Template Metadata Schema:**
```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": ["framework", "framework-version", "output-path"],
  "properties": {
    "framework": { "type": "string", "pattern": "^[a-z0-9-]+$" },
    "framework-version": { "type": "string", "pattern": "^\\d+\\.\\d+$" },
    "output-path": { "type": "string" },
    "template-id": { "type": "string" }
  }
}
```

**Acceptance Criteria:**
- Schemas enforce `framework` property (REQUIRED)
- Schemas reject invalid framework IDs (non-kebab-case)
- Schemas validate version format (semver)

**Tests:**
- `test-command-schema-valid.mjs`: Validate compliant command metadata
- `test-agent-schema-valid.mjs`: Validate compliant agent metadata
- `test-template-schema-valid.mjs`: Validate compliant template metadata
- `test-metadata-schema-invalid.mjs`: Reject missing framework property

---

#### W2-T4: Implement Metadata Loader (5 hours)

**File:** `tools/workspace/metadata-loader.mjs`

**Exports:**
```javascript
export class MetadataLoader {
  constructor(schemasPath = 'tools/workspace/schemas/');

  // Load metadata from YAML frontmatter
  async loadCommandMetadata(commandFilePath);      // Returns { framework, output-path, context-paths }
  async loadAgentMetadata(agentFilePath);          // Returns { framework, context-paths, output-base }
  async loadTemplateMetadata(templateFilePath);    // Returns { framework, output-path }

  // Validate metadata
  async validateCommandMetadata(metadata);         // Throws if invalid
  async validateAgentMetadata(metadata);
  async validateTemplateMetadata(metadata);

  // Fallback behavior
  getDefaultFramework();                           // Returns "sdlc-complete"
}
```

**Implementation Details:**
- Use `js-yaml` for YAML parsing (FAILSAFE_SCHEMA only, per NFR-SEC-06)
- Extract frontmatter from markdown files (between `---` delimiters)
- Validate against schema before returning
- Default to `framework: sdlc-complete` if missing (log warning)
- Error handling: MalformedYAMLError, SchemaValidationError

**Acceptance Criteria:**
- Extracts metadata from valid YAML frontmatter
- Validates against schema (rejects invalid metadata)
- Defaults to `sdlc-complete` if framework property missing (AC-8 Exception Flow 3)
- Logs warning when defaulting to primary framework

**Tests (10 unit tests):**
1. `test-load-command-metadata-valid.mjs`: Extract command metadata
2. `test-load-agent-metadata-valid.mjs`: Extract agent metadata
3. `test-load-template-metadata-valid.mjs`: Extract template metadata
4. `test-load-metadata-no-frontmatter.mjs`: Handle missing frontmatter
5. `test-load-metadata-malformed-yaml.mjs`: Reject malformed YAML
6. `test-validate-command-metadata.mjs`: Schema validation (command)
7. `test-validate-agent-metadata.mjs`: Schema validation (agent)
8. `test-validate-template-metadata.mjs`: Schema validation (template)
9. `test-load-metadata-default-framework.mjs`: Default to sdlc-complete
10. `test-load-metadata-warning-log.mjs`: Verify warning logged

---

#### W2-T5: Implement Workspace Manager (6 hours)

**File:** `tools/workspace/workspace-manager.mjs`

**Exports:**
```javascript
export class WorkspaceManager {
  constructor(rootPath = '.aiwg/');

  // Workspace Initialization
  async initializeWorkspace();                     // Create .aiwg/frameworks/ structure
  async initializeFrameworkWorkspace(frameworkId); // Create framework subdirectories

  // Tier Management (4-tier structure)
  async getRepoPath(frameworkId);                  // Tier 1: frameworks/{id}/repo/
  async getProjectPath(frameworkId, projectId);    // Tier 2: frameworks/{id}/projects/{projectId}/
  async getWorkingPath(frameworkId, projectId);    // Tier 3: frameworks/{id}/working/{projectId}/
  async getArchivePath(frameworkId, projectId, date); // Tier 4: frameworks/{id}/archive/{YYYY-MM}/{projectId}/

  // Directory Operations
  async ensureDirectoryExists(path);               // Create directory if missing
  async cleanWorkingArea(frameworkId, olderThanDays = 7); // Cleanup Tier 3
  async archiveProject(frameworkId, projectId);    // Move Tier 2 → Tier 4
}
```

**Implementation Details:**
- Use `fs/promises.mkdir()` with `{ recursive: true }`
- Tier 1 (repo): Created on framework installation
- Tier 2 (projects): Created on project initialization
- Tier 3 (working): Created on multi-agent workflow start
- Tier 4 (archive): Created on project completion
- Cleanup policy: Delete files in `working/` older than 7 days (configurable)

**Acceptance Criteria:**
- Workspace auto-initializes on first use (AC-7)
- All 4 tiers created correctly (repo, projects, working, archive)
- Directory creation idempotent (no error if already exists)
- Cleanup removes old working files (>7 days)

**Tests (15 unit tests):**
1. `test-init-workspace.mjs`: Initialize .aiwg/frameworks/
2. `test-init-framework-workspace.mjs`: Create framework subdirectories
3. `test-get-repo-path.mjs`: Return correct Tier 1 path
4. `test-get-project-path.mjs`: Return correct Tier 2 path
5. `test-get-working-path.mjs`: Return correct Tier 3 path
6. `test-get-archive-path.mjs`: Return correct Tier 4 path
7. `test-ensure-directory-exists.mjs`: Create directory if missing
8. `test-ensure-directory-idempotent.mjs`: No error if exists
9. `test-clean-working-area.mjs`: Delete old files (>7 days)
10. `test-clean-working-preserve-recent.mjs`: Keep recent files (<7 days)
11. `test-archive-project.mjs`: Move Tier 2 → Tier 4
12. `test-archive-project-structure.mjs`: Preserve directory structure
13. `test-workspace-auto-init.mjs`: Auto-initialize on first command
14. `test-workspace-concurrent-init.mjs`: Handle concurrent initialization
15. `test-workspace-tier-boundaries.mjs`: Verify tier isolation

---

#### W2-T6: Implement Path Resolver (3 hours)

**File:** `tools/workspace/path-resolver.mjs`

**Exports:**
```javascript
export class PathResolver {
  constructor(rootPath = '.aiwg/');

  // Placeholder Resolution
  resolvePath(pathTemplate, variables);            // Resolve {framework-id}, {project-id}
  resolveOutputPath(metadata, context);            // Resolve output-path from metadata
  resolveContextPaths(metadata, context);          // Resolve context-paths from metadata

  // Validation
  validatePath(path);                              // Check path safety (no ../escapes)
  isFrameworkScoped(path);                         // Check if path within .aiwg/frameworks/
}
```

**Implementation Details:**
- Replace placeholders: `{framework-id}`, `{project-id}`, `{YYYY-MM}`
- Validate no path traversal (`../`) attacks (NFR-SEC-05)
- Ensure all paths within `.aiwg/frameworks/` (security boundary)
- Error handling: InvalidPlaceholderError, PathTraversalError

**Acceptance Criteria:**
- Resolves `{framework-id}` to actual framework ID
- Resolves `{project-id}` to active project ID
- Resolves `{YYYY-MM}` to current month (for archive paths)
- Rejects path traversal attempts (security)

**Tests (8 unit tests):**
1. `test-resolve-framework-id.mjs`: Replace {framework-id}
2. `test-resolve-project-id.mjs`: Replace {project-id}
3. `test-resolve-date-placeholder.mjs`: Replace {YYYY-MM}
4. `test-resolve-output-path.mjs`: Resolve output-path from metadata
5. `test-resolve-context-paths.mjs`: Resolve context-paths array
6. `test-validate-path-safe.mjs`: Accept safe paths
7. `test-validate-path-traversal.mjs`: Reject ../ paths
8. `test-validate-path-scope.mjs`: Reject paths outside .aiwg/frameworks/

---

#### W2-T7: Integration Testing (2 hours)

**File:** `tests/integration/workspace-basics.test.mjs`

**Test Scenarios:**
1. **Workspace Initialization Flow:**
   - Initialize empty `.aiwg/` directory
   - Create framework registry
   - Register `sdlc-complete` framework
   - Create Tier 1-4 directories
   - Validate structure matches spec

2. **Metadata Loading Flow:**
   - Read command metadata from `.claude/commands/flow-inception-to-elaboration.md`
   - Validate framework property extracted
   - Resolve output-path with placeholders
   - Verify context-paths loaded

3. **Path Resolution Flow:**
   - Resolve project output path
   - Resolve working area path
   - Resolve archive path
   - Validate all paths within security boundary

4. **Registry Operations Flow:**
   - Add framework
   - Add project to framework
   - List projects
   - Remove project
   - Remove framework

5. **Error Handling Flow:**
   - Missing metadata → default to sdlc-complete
   - Invalid path → reject with error
   - Concurrent registry writes → serialize

**Acceptance Criteria:**
- All 5 integration tests pass
- End-to-end workspace initialization completes <2s (NFR-PERF-09)
- No cross-framework pollution (Tier 2 isolation verified)

---

### 2.4 Week 2 Deliverables Summary

**Files Created (7):**
1. `tools/workspace/schemas/registry-schema.json`
2. `tools/workspace/schemas/command-metadata-schema.json`
3. `tools/workspace/schemas/agent-metadata-schema.json`
4. `tools/workspace/schemas/template-metadata-schema.json`
5. `tools/workspace/registry-manager.mjs`
6. `tools/workspace/metadata-loader.mjs`
7. `tools/workspace/workspace-manager.mjs`
8. `tools/workspace/path-resolver.mjs`

**Tests Created (50):**
- 12 unit tests (RegistryManager)
- 10 unit tests (MetadataLoader)
- 15 unit tests (WorkspaceManager)
- 8 unit tests (PathResolver)
- 5 integration tests (End-to-end flows)

**Acceptance Criteria Satisfied:**
- **AC-1**: Commands Auto-Route Based on Metadata (metadata loading + path resolution)
- **AC-2**: Agents Respect Framework Context (metadata schemas defined)
- **AC-7**: Workspace Auto-Initializes If Missing (WorkspaceManager.initializeWorkspace)

**Test Coverage Target:** 60%+ (50 tests covering 4 core components)

---

## 3. Week 3 Deliverables (27 hours)

### 3.1 Week 3 Objectives

**Goal:** Implement natural language routing, migration tooling, and cross-framework operations.

**Deliverables:**
1. Natural language routing logic (75+ phrase translations)
2. Migration tooling for existing `.aiwg/` artifacts
3. Integration tests (cross-framework reads, write segregation)
4. Performance validation (<2s routing, <5s migration)

### 3.2 Task Breakdown: Week 3

| Task | Component | Effort | Files | Tests | Acceptance Criteria |
|------|-----------|--------|-------|-------|---------------------|
| **W3-T1: Natural Language Translation Table** | NaturalLanguageRouter | 3h | `tools/workspace/nl-translations.json` | Translation validation | AC-4 (natural language routing) |
| **W3-T2: Implement NL Router** | NaturalLanguageRouter | 5h | `tools/workspace/nl-router.mjs` | 12 unit tests | AC-4 (phrase → framework mapping) |
| **W3-T3: Implement Migration Tool** | MigrationTool | 6h | `tools/workspace/migrate-to-frameworks.mjs` | 10 unit tests | Migration correctness |
| **W3-T4: Implement Context Curator** | ContextCurator | 5h | `tools/workspace/context-curator.mjs` | 10 unit tests | AC-6 (context exclusion) |
| **W3-T5: Cross-Framework Operations** | WorkspaceManager | 4h | `tools/workspace/cross-framework-ops.mjs` | 8 unit tests | AC-5 (cross-framework linking) |
| **W3-T6: Integration Testing** | All | 3h | `tests/integration/workspace-routing.test.mjs` | 8 integration tests | AC-3, AC-4, AC-6 |
| **W3-T7: Performance Testing** | All | 1h | `tests/performance/workspace-perf.test.mjs` | 5 performance tests | NFR-PERF-05, NFR-PERF-09 |
| **TOTAL WEEK 3** | | **27h** | **5 files** | **53 tests** | **AC-3, AC-4, AC-5, AC-6** |

### 3.3 Detailed Task Specifications: Week 3

#### W3-T1: Natural Language Translation Table (3 hours)

**File:** `tools/workspace/nl-translations.json`

**Translation Table Structure:**
```json
{
  "version": "1.0",
  "translations": [
    {
      "phrases": [
        "transition to elaboration",
        "move to elaboration",
        "start elaboration",
        "begin elaboration phase"
      ],
      "command": "flow-inception-to-elaboration",
      "framework": "sdlc-complete"
    },
    {
      "phrases": [
        "run security review",
        "start security review",
        "validate security",
        "security audit"
      ],
      "command": "flow-security-review-cycle",
      "framework": "sdlc-complete"
    },
    {
      "phrases": [
        "draft launch announcement",
        "create launch content",
        "write launch post"
      ],
      "command": "marketing-campaign-draft",
      "framework": "marketing-flow"
    }
  ]
}
```

**Coverage Target:** 75+ phrase translations covering:
- Phase transitions (Inception→Elaboration, Elaboration→Construction, etc.) - 20 phrases
- Review cycles (security, performance, compliance) - 15 phrases
- Artifact generation (SAD, test plan, deployment plan) - 20 phrases
- Marketing workflows (campaign draft, content calendar) - 10 phrases
- Status checks (project status, health check, gate check) - 10 phrases

**Acceptance Criteria:**
- 75+ phrase translations defined
- All SDLC phase transitions covered
- Marketing and Agile frameworks included
- Phrase normalization (lowercase, trim whitespace)

**Tests:**
- `test-nl-translations-valid.mjs`: Validate translation table structure
- `test-nl-translations-coverage.mjs`: Verify 75+ translations exist
- `test-nl-translations-unique.mjs`: No duplicate phrases

---

#### W3-T2: Implement NL Router (5 hours)

**File:** `tools/workspace/nl-router.mjs`

**Exports:**
```javascript
export class NaturalLanguageRouter {
  constructor(translationsPath = 'tools/workspace/nl-translations.json');

  // Routing Operations
  async routePhrase(phrase);                       // Returns { command, framework }
  async loadTranslations();                        // Load nl-translations.json

  // Matching Logic
  normalizePhrase(phrase);                         // Lowercase, trim, remove punctuation
  findBestMatch(normalizedPhrase);                 // Fuzzy match against phrases

  // Confidence Scoring
  calculateConfidence(phrase, translation);        // 0.0-1.0 confidence score
}
```

**Implementation Details:**
- Normalize input: lowercase, trim, remove punctuation
- Exact match first (highest priority)
- Fuzzy match using Levenshtein distance (fallback)
- Confidence threshold: 0.8 (reject below threshold)
- Return: `{ command, framework, confidence }`

**Acceptance Criteria:**
- Exact phrase match returns correct command + framework (AC-4)
- Fuzzy match handles typos (Levenshtein distance ≤2)
- Low confidence (<0.8) returns null (no guess)
- Performance: <100ms per routing operation (NFR-PERF-09)

**Tests (12 unit tests):**
1. `test-route-exact-match.mjs`: Exact phrase match
2. `test-route-fuzzy-match.mjs`: Typo handling (Levenshtein ≤2)
3. `test-route-case-insensitive.mjs`: Case normalization
4. `test-route-low-confidence.mjs`: Reject confidence <0.8
5. `test-route-phase-transition.mjs`: Map "transition to elaboration"
6. `test-route-security-review.mjs`: Map "run security review"
7. `test-route-marketing.mjs`: Map "draft launch announcement"
8. `test-route-status-check.mjs`: Map "project status"
9. `test-route-unknown-phrase.mjs`: Return null for unknown phrase
10. `test-route-performance.mjs`: Routing <100ms
11. `test-load-translations.mjs`: Load nl-translations.json
12. `test-normalize-phrase.mjs`: Phrase normalization

---

#### W3-T3: Implement Migration Tool (6 hours)

**File:** `tools/workspace/migrate-to-frameworks.mjs`

**Exports:**
```javascript
export class MigrationTool {
  constructor(rootPath = '.aiwg/');

  // Migration Operations
  async migrateToFrameworks(options = {});         // Full migration pipeline
  async previewMigration();                        // Dry-run (show changes)
  async executeMigration();                        // Apply changes
  async createBackup();                            // Backup .aiwg/ → .aiwg.backup-{timestamp}/

  // Migration Steps
  async analyzeExistingStructure();                // Scan .aiwg/ for artifacts
  async categorizeArtifacts();                     // Determine artifact types (repo vs project)
  async generateMigrationPlan();                   // Map old paths → new paths
  async moveArtifacts();                           // Execute file moves
  async updateMetadata();                          // Update internal references
  async validateMigration();                       // Verify all files migrated

  // Rollback
  async rollbackMigration();                       // Restore from backup
}
```

**Implementation Details:**
- Analyze existing `.aiwg/` structure
- Categorize artifacts:
  - **Repo-level** (Tier 1): `intake/`, `features/`, `team/` → `frameworks/sdlc-complete/repo/`
  - **Project-level** (Tier 2): `requirements/`, `architecture/`, `planning/` → `frameworks/sdlc-complete/projects/{project-id}/`
  - **Working** (Tier 3): `working/` → `frameworks/sdlc-complete/working/`
- Create backup: `.aiwg.backup-{timestamp}/`
- Move files (preserve timestamps, permissions)
- Update internal references (paths in metadata.json, links in markdown)
- Validate: checksum comparison before/after

**Acceptance Criteria:**
- Dry-run shows migration plan without executing
- Backup created before migration (safety)
- All files migrated to correct tier
- Internal references updated (no broken links)
- Rollback restores original state (100% fidelity)

**Tests (10 unit tests):**
1. `test-migration-preview.mjs`: Dry-run shows plan
2. `test-migration-backup.mjs`: Backup created
3. `test-migration-categorize.mjs`: Artifacts categorized correctly
4. `test-migration-repo-tier.mjs`: Repo artifacts → Tier 1
5. `test-migration-project-tier.mjs`: Project artifacts → Tier 2
6. `test-migration-working-tier.mjs`: Working artifacts → Tier 3
7. `test-migration-update-refs.mjs`: Internal references updated
8. `test-migration-validate.mjs`: Checksum validation
9. `test-migration-rollback.mjs`: Rollback to original state
10. `test-migration-performance.mjs`: Migration <5s for 30 files

---

#### W3-T4: Implement Context Curator (5 hours)

**File:** `tools/workspace/context-curator.mjs`

**Exports:**
```javascript
export class ContextCurator {
  constructor(rootPath = '.aiwg/');

  // Context Loading
  async curateContext(frameworkId, projectId);     // Load framework-scoped context
  async loadFrameworkContext(frameworkId);         // Load Tier 1 (repo)
  async loadProjectContext(frameworkId, projectId); // Load Tier 2 (project)
  async loadSharedContext();                       // Load .aiwg/shared/

  // Context Exclusion
  async excludeFrameworks(excludeList);            // Exclude other frameworks
  async excludeProjects(frameworkId, excludeList); // Exclude other projects

  // Performance Optimization
  async lazyLoadContext(paths);                    // Load context on-demand
  async cacheContext(frameworkId, projectId, context); // Cache loaded context
}
```

**Implementation Details:**
- Load only framework-scoped paths (AC-6)
- Exclude other frameworks explicitly (context pollution prevention)
- Lazy loading: load on-demand (not all upfront)
- Cache context for 5 minutes (reduce file I/O)
- Performance target: <5s for context loading (NFR-PERF-05)

**Acceptance Criteria:**
- Context includes only framework-scoped paths (AC-6)
- Other frameworks excluded (no pollution)
- Shared context always loaded (cross-framework resources)
- Performance: <5s for context loading (NFR-PERF-05)

**Tests (10 unit tests):**
1. `test-curate-context-sdlc.mjs`: Load SDLC context
2. `test-curate-context-marketing.mjs`: Load Marketing context
3. `test-exclude-frameworks.mjs`: Exclude other frameworks
4. `test-exclude-projects.mjs`: Exclude other projects
5. `test-load-shared-context.mjs`: Shared context always loaded
6. `test-lazy-load-context.mjs`: Lazy loading behavior
7. `test-cache-context.mjs`: Context caching
8. `test-context-isolation.mjs`: No cross-framework pollution
9. `test-context-performance.mjs`: Loading <5s
10. `test-context-paths-valid.mjs`: All paths within .aiwg/frameworks/

---

#### W3-T5: Cross-Framework Operations (4 hours)

**File:** `tools/workspace/cross-framework-ops.mjs`

**Exports:**
```javascript
export class CrossFrameworkOps {
  constructor(rootPath = '.aiwg/');

  // Cross-Framework Linking
  async linkWork(sourceId, targetId, relationship);  // Link SDLC ↔ Marketing
  async unlinkWork(sourceId, targetId);              // Remove link
  async getLinkedWork(workId);                       // Get all linked work

  // Metadata Updates
  async updateMetadata(frameworkId, workId, updates); // Update metadata.json
  async getMetadata(frameworkId, workId);             // Read metadata.json

  // Validation
  async validateLink(sourceId, targetId);             // Check both exist
}
```

**Implementation Details:**
- Parse fully qualified IDs: `{framework-id}/{work-id}`
- Update both metadata files (bidirectional link)
- Validate both frameworks installed
- Validate both work items exist
- Error handling: FrameworkNotFoundError, WorkItemNotFoundError

**Acceptance Criteria:**
- Link creates bidirectional metadata cross-references (AC-5)
- Unlink removes cross-references from both sides
- Validation rejects links to non-existent work items
- Metadata updates atomic (both succeed or both fail)

**Tests (8 unit tests):**
1. `test-link-sdlc-to-marketing.mjs`: Link SDLC project to campaign
2. `test-link-bidirectional.mjs`: Both metadata files updated
3. `test-unlink-work.mjs`: Remove cross-references
4. `test-get-linked-work.mjs`: Retrieve all linked work
5. `test-link-validate-exists.mjs`: Reject non-existent work
6. `test-link-validate-framework.mjs`: Reject non-existent framework
7. `test-link-atomic-update.mjs`: Both metadata updates succeed/fail together
8. `test-link-fully-qualified-ids.mjs`: Parse {framework}/{work-id}

---

#### W3-T6: Integration Testing (3 hours)

**File:** `tests/integration/workspace-routing.test.mjs`

**Test Scenarios:**
1. **Natural Language Routing Flow:**
   - User says "Transition to Elaboration"
   - NL Router maps to `flow-inception-to-elaboration`
   - MetadataLoader reads command metadata
   - Framework detected: `sdlc-complete`
   - Context curated (SDLC only)
   - Output path resolved
   - Artifacts written to correct location

2. **Multi-Framework Coexistence Flow:**
   - Initialize SDLC framework
   - Initialize Marketing framework
   - Run SDLC command → artifacts in `.aiwg/frameworks/sdlc-complete/`
   - Run Marketing command → artifacts in `.aiwg/frameworks/marketing-flow/`
   - Verify no cross-contamination

3. **Cross-Framework Linking Flow:**
   - Create SDLC project
   - Create Marketing campaign
   - Link SDLC project to campaign
   - Verify metadata updated in both
   - Retrieve linked work

4. **Context Exclusion Flow:**
   - Load SDLC context
   - Verify Marketing context excluded
   - Verify Agile context excluded
   - Verify Shared context included

5. **Migration Flow:**
   - Create legacy `.aiwg/` structure
   - Preview migration
   - Execute migration with backup
   - Validate all files migrated
   - Verify internal references updated

6. **Write Segregation, Read Flexibility Flow:**
   - SDLC command writes to SDLC workspace (enforced)
   - SDLC command reads from Marketing workspace (allowed, if explicitly requested)
   - Marketing command cannot write to SDLC workspace (rejected)

7. **Performance Flow:**
   - Natural language routing <100ms
   - Context loading <5s
   - Migration <5s (30 files)
   - Path resolution <100ms

8. **Error Handling Flow:**
   - Unknown phrase → null routing
   - Missing framework → error with remediation
   - Invalid path → rejected
   - Concurrent registry writes → serialized

**Acceptance Criteria:**
- All 8 integration tests pass
- AC-3 (framework isolation) verified
- AC-4 (natural language routing) verified
- AC-5 (cross-framework linking) verified
- AC-6 (context exclusion) verified

---

#### W3-T7: Performance Testing (1 hour)

**File:** `tests/performance/workspace-perf.test.mjs`

**Performance Benchmarks:**

| Operation | Target | Measurement |
|-----------|--------|-------------|
| Natural language routing | <100ms | NFR-PERF-09 |
| Framework context loading | <5s | NFR-PERF-05, NFR-PERF-09 |
| Path resolution | <100ms | NFR-PERF-09 |
| Migration (30 files) | <5s | Migration performance |
| Registry lookup (cached) | <50ms | NFR-PERF-09 |

**Test Cases (5 performance tests):**
1. `test-perf-nl-routing.mjs`: Routing <100ms (1000 iterations)
2. `test-perf-context-loading.mjs`: Loading <5s (10+ frameworks)
3. `test-perf-path-resolution.mjs`: Resolution <100ms (1000 paths)
4. `test-perf-migration.mjs`: Migration <5s (30 files)
5. `test-perf-registry-lookup.mjs`: Lookup <50ms (cached)

**Acceptance Criteria:**
- All performance targets met (NFR-PERF-05, NFR-PERF-09)
- No performance degradation with 10+ frameworks
- Caching reduces lookup time by 80%+

---

### 3.4 Week 3 Deliverables Summary

**Files Created (5):**
1. `tools/workspace/nl-translations.json`
2. `tools/workspace/nl-router.mjs`
3. `tools/workspace/migrate-to-frameworks.mjs`
4. `tools/workspace/context-curator.mjs`
5. `tools/workspace/cross-framework-ops.mjs`

**Tests Created (53):**
- 12 unit tests (NaturalLanguageRouter)
- 10 unit tests (MigrationTool)
- 10 unit tests (ContextCurator)
- 8 unit tests (CrossFrameworkOps)
- 8 integration tests (End-to-end routing)
- 5 performance tests (Benchmarks)

**Acceptance Criteria Satisfied:**
- **AC-3**: Multiple Frameworks Coexist Without Cross-Contamination (ContextCurator)
- **AC-4**: Natural Language Routes Correctly (NaturalLanguageRouter)
- **AC-5**: Cross-Framework Linking Supported (CrossFrameworkOps)
- **AC-6**: Context Loading Excludes Irrelevant Frameworks (ContextCurator)

**Performance Targets Validated:**
- NFR-PERF-05: Framework context loading <5s
- NFR-PERF-09: Framework-scoped context loading optimization

---

## 4. Week 4 Deliverables (26 hours)

### 4.1 Week 4 Objectives

**Goal:** Finalize implementation with comprehensive testing, documentation, and bug fixes.

**Deliverables:**
1. Multi-agent documentation review
2. Bug fixes and refinements
3. Final integration testing
4. Documentation updates (README, usage guides)

### 4.2 Task Breakdown: Week 4

| Task | Component | Effort | Files | Tests | Acceptance Criteria |
|------|-----------|--------|-------|-------|---------------------|
| **W4-T1: Update Command Metadata** | MetadataLoader | 4h | 45 command files | Metadata validation | All commands have framework property |
| **W4-T2: Update Agent Metadata** | MetadataLoader | 4h | 58 agent files | Metadata validation | All agents have framework property |
| **W4-T3: CLI Integration** | WorkspaceManager | 5h | `tools/workspace/cli.mjs` | 6 CLI tests | Commands use workspace manager |
| **W4-T4: Bug Fixes & Refinements** | All | 5h | N/A | Regression tests | Critical bugs resolved |
| **W4-T5: End-to-End Testing** | All | 4h | `tests/e2e/workspace-e2e.test.mjs` | 8 E2E tests | AC-8 (zero manual selection) |
| **W4-T6: Documentation** | All | 3h | README updates, usage guides | N/A | Documentation complete |
| **W4-T7: Final Review & Handoff** | All | 1h | N/A | N/A | Ready for merge |
| **TOTAL WEEK 4** | | **26h** | **3 files + docs** | **14+ tests** | **AC-8, all ACs validated** |

### 4.3 Detailed Task Specifications: Week 4

#### W4-T1: Update Command Metadata (4 hours)

**Scope:** Update all 45 SDLC commands with framework metadata

**Files to Update:**
- `.claude/commands/flow-inception-to-elaboration.md`
- `.claude/commands/flow-elaboration-to-construction.md`
- `.claude/commands/flow-construction-to-transition.md`
- ... (45 total commands)

**Metadata Addition:**
```yaml
---
# Existing metadata...
framework: sdlc-complete
framework-version: 1.0
output-path: frameworks/sdlc-complete/projects/{project-id}/
context-paths:
  - frameworks/sdlc-complete/repo/
  - frameworks/sdlc-complete/projects/{project-id}/
  - shared/
---
```

**Validation:**
- Run `aiwg -validate-metadata --target .claude/commands/`
- All commands pass schema validation
- No missing `framework` property

**Acceptance Criteria:**
- All 45 commands updated with metadata
- Metadata validation passes (100% compliance)
- No breaking changes to command functionality

---

#### W4-T2: Update Agent Metadata (4 hours)

**Scope:** Update all 58 SDLC agents with framework metadata

**Files to Update:**
- `.claude/agents/architecture-designer.md`
- `.claude/agents/test-engineer.md`
- `.claude/agents/security-architect.md`
- ... (58 total agents)

**Metadata Addition:**
```yaml
---
# Existing metadata...
framework: sdlc-complete
framework-version: 1.0
context-paths:
  - frameworks/sdlc-complete/repo/templates/
  - frameworks/sdlc-complete/projects/{project-id}/
output-base: frameworks/sdlc-complete/projects/{project-id}/
---
```

**Validation:**
- Run `aiwg -validate-metadata --target .claude/agents/`
- All agents pass schema validation
- No missing `framework` property

**Acceptance Criteria:**
- All 58 agents updated with metadata
- Metadata validation passes (100% compliance)
- No breaking changes to agent functionality

---

#### W4-T3: CLI Integration (5 hours)

**File:** `tools/workspace/cli.mjs`

**Exports:**
```javascript
#!/usr/bin/env node

import { WorkspaceManager } from './workspace-manager.mjs';
import { MigrationTool } from './migrate-to-frameworks.mjs';
import { RegistryManager } from './registry-manager.mjs';

// CLI Commands
async function validateMetadata(target);           // aiwg -validate-metadata --target .claude/
async function migrateToFrameworks(options);        // aiwg -migrate-to-frameworks --backup
async function listFrameworks();                    // aiwg -list-frameworks
async function listProjects(frameworkId);           // aiwg -list-projects sdlc-complete
async function initWorkspace();                     // aiwg -init-workspace
async function cleanWorkingArea(frameworkId, days); // aiwg -cleanup-working --days 7

// Entry Point
async function main(args);
```

**Implementation Details:**
- Use `commander` for CLI parsing
- Integrate WorkspaceManager, MigrationTool, RegistryManager
- Error handling: clear error messages, exit codes
- Help text: `aiwg -help` shows usage

**Acceptance Criteria:**
- All CLI commands functional
- Error messages provide remediation guidance
- Help text comprehensive
- Integration with existing `aiwg` CLI

**Tests (6 CLI tests):**
1. `test-cli-validate-metadata.mjs`: Validate metadata command
2. `test-cli-migrate.mjs`: Migration command
3. `test-cli-list-frameworks.mjs`: List frameworks
4. `test-cli-list-projects.mjs`: List projects
5. `test-cli-init-workspace.mjs`: Initialize workspace
6. `test-cli-cleanup.mjs`: Cleanup working area

---

#### W4-T4: Bug Fixes & Refinements (5 hours)

**Scope:** Address bugs discovered during integration testing

**Known Issues to Address:**
1. **Concurrent registry writes**: Ensure file locking works correctly
2. **Path traversal edge cases**: Test with unusual paths (e.g., symlinks)
3. **Metadata parsing errors**: Handle malformed YAML gracefully
4. **Performance optimization**: Profile slow operations, optimize
5. **Error message clarity**: Improve remediation guidance

**Process:**
1. Run full test suite
2. Identify failures
3. Debug and fix
4. Add regression tests
5. Re-run test suite

**Acceptance Criteria:**
- All unit tests pass (100%)
- All integration tests pass (100%)
- All performance tests pass (100%)
- No known critical bugs

---

#### W4-T5: End-to-End Testing (4 hours)

**File:** `tests/e2e/workspace-e2e.test.mjs`

**Test Scenarios:**
1. **New Project Setup:**
   - Fresh repository (no `.aiwg/`)
   - User runs `aiwg -deploy-agents --mode sdlc`
   - Workspace auto-initializes
   - Commands functional

2. **Migration from Legacy:**
   - Existing `.aiwg/` structure
   - User runs `aiwg -migrate-to-frameworks --backup`
   - All artifacts migrated
   - Commands functional

3. **Multi-Framework Workflow:**
   - Install SDLC framework
   - Install Marketing framework
   - Run SDLC command
   - Run Marketing command
   - Verify isolation

4. **Natural Language to Artifact:**
   - User says "Transition to Elaboration"
   - NL Router maps to command
   - Command executed
   - Artifacts created in correct location
   - No manual framework selection

5. **Cross-Framework Collaboration:**
   - SDLC project created
   - Marketing campaign created
   - User links them
   - Metadata cross-references created
   - Traceability graph includes link

6. **Error Recovery:**
   - User runs command for uninstalled framework
   - Clear error message
   - User installs framework
   - Command succeeds

7. **Performance Validation:**
   - Context loading <5s (10+ frameworks)
   - Natural language routing <100ms
   - Path resolution <100ms

8. **Zero Manual Selection:**
   - User never prompted to "select framework"
   - Framework detected automatically from metadata
   - Transparent operation (AC-8)

**Acceptance Criteria:**
- All 8 E2E tests pass
- AC-8 (zero manual selection) verified
- Real-world workflows functional
- Error handling graceful

---

#### W4-T6: Documentation (3 hours)

**Files to Update:**
1. `README.md`: Add workspace management section
2. `USAGE_GUIDE.md`: Update with framework routing guidance
3. `agentic/code/frameworks/sdlc-complete/README.md`: Document workspace structure
4. `tools/workspace/README.md`: Component documentation
5. `.github/workflows/metadata-validation.yml`: CI/CD integration

**Documentation Sections:**

**README.md Addition:**
```markdown
## Framework-Scoped Workspace Management

AIWG supports multiple frameworks per repository (SDLC, Marketing, Agile) with automatic routing based on command/agent metadata.

### Directory Structure
- `.aiwg/frameworks/sdlc-complete/` - SDLC framework workspace
- `.aiwg/frameworks/marketing-flow/` - Marketing framework workspace
- `.aiwg/shared/` - Cross-framework resources

### Zero-Friction Routing
No manual framework selection required. Framework detected automatically from metadata:
- Natural language: "Transition to Elaboration" → SDLC command
- Marketing: "Draft launch announcement" → Marketing command

### Migration from Legacy
```bash
aiwg -migrate-to-frameworks --backup
```
```

**USAGE_GUIDE.md Addition:**
```markdown
## Framework Routing

### Natural Language Commands
- "Transition to Elaboration" → SDLC framework
- "Draft launch announcement" → Marketing framework
- "Project status" → Active framework

### Context Isolation
Only relevant framework context loaded:
- SDLC command: SDLC context only
- Marketing command: Marketing context only
- Shared resources: Always loaded

### Cross-Framework Linking
Link SDLC projects to marketing campaigns:
```bash
/aiwg-link-work sdlc-complete/plugin-system marketing-flow/plugin-launch
```
```

**Acceptance Criteria:**
- README.md updated with workspace management section
- USAGE_GUIDE.md includes framework routing guidance
- Component README created (`tools/workspace/README.md`)
- CI/CD documentation updated

---

#### W4-T7: Final Review & Handoff (1 hour)

**Review Checklist:**
- [ ] All 8 acceptance criteria satisfied (AC-1 through AC-8)
- [ ] All 24 test cases passing (TC-WS-001-1 through TC-WS-008-3)
- [ ] Performance targets met (NFR-PERF-05, NFR-PERF-09)
- [ ] Metadata validation passing (100% compliance)
- [ ] Documentation complete
- [ ] No known critical bugs
- [ ] Migration tested on sample projects
- [ ] CI/CD integration functional

**Handoff Artifacts:**
1. Implementation complete (all components)
2. Test suite passing (117 tests)
3. Documentation updated
4. Migration guide created
5. Performance benchmarks documented

**Acceptance Criteria:**
- Review checklist complete
- Project Owner approval
- Ready for merge to main branch

---

### 4.4 Week 4 Deliverables Summary

**Files Updated:**
- 45 command files (metadata added)
- 58 agent files (metadata added)
- `README.md`, `USAGE_GUIDE.md`, component documentation

**Files Created:**
1. `tools/workspace/cli.mjs`
2. `tests/e2e/workspace-e2e.test.mjs`
3. `tools/workspace/README.md`

**Tests Created:**
- 6 CLI tests
- 8 E2E tests
- Regression tests (as needed)

**Acceptance Criteria Satisfied:**
- **AC-8**: User Never Manually Selects Framework (E2E validation)
- **All ACs** (AC-1 through AC-8) validated end-to-end

**Documentation Updated:**
- README.md (workspace management section)
- USAGE_GUIDE.md (framework routing guidance)
- Component documentation (tools/workspace/README.md)
- CI/CD workflows (metadata-validation.yml)

---

## 5. Risk Management

### 5.1 Critical Path Items

| Risk | Probability | Impact | Mitigation | Owner |
|------|------------|--------|------------|-------|
| **Metadata migration breaks existing work** | Medium | High | Backup before migration, dry-run mode, rollback capability | MigrationTool |
| **Performance degradation with 10+ frameworks** | Low | Medium | Lazy loading, caching, context exclusion optimization | ContextCurator |
| **Concurrent registry writes cause corruption** | Low | High | File-based locking, atomic writes, validation | RegistryManager |
| **Natural language routing ambiguity** | Medium | Medium | Confidence threshold (0.8), manual fallback, user feedback | NaturalLanguageRouter |
| **Incomplete metadata coverage** | Medium | High | Metadata validation CI/CD, default to sdlc-complete | MetadataLoader |

### 5.2 Mitigation Strategies

**Risk 1: Metadata Migration Breaks Existing Work**
- **Prevention**: Backup before migration (`.aiwg.backup-{timestamp}/`)
- **Detection**: Checksum validation before/after
- **Recovery**: Rollback capability (restore from backup)
- **Verification**: Migration tested on sample projects before production

**Risk 2: Performance Degradation**
- **Prevention**: Lazy loading, caching (5 minutes TTL)
- **Detection**: Performance tests (benchmarks)
- **Recovery**: Optimize slow operations (profiling)
- **Verification**: Performance targets met (NFR-PERF-05, NFR-PERF-09)

**Risk 3: Concurrent Registry Writes**
- **Prevention**: File-based locking (`.aiwg/frameworks/registry.lock`)
- **Detection**: Integration tests (concurrent writes)
- **Recovery**: Atomic writes (temp file → rename)
- **Verification**: Stress testing (100 concurrent writes)

**Risk 4: Natural Language Routing Ambiguity**
- **Prevention**: Confidence threshold (0.8), exact match priority
- **Detection**: Low confidence → return null (no guess)
- **Recovery**: User clarification prompt, manual command selection
- **Verification**: 75+ phrase translations, fuzzy match tested

**Risk 5: Incomplete Metadata Coverage**
- **Prevention**: Metadata validation CI/CD (blocks merge)
- **Detection**: `aiwg -validate-metadata` catches missing framework property
- **Recovery**: Default to `sdlc-complete` with warning log
- **Verification**: 100% metadata compliance (45 commands + 58 agents)

### 5.3 Contingency Plans

**If Week 2 Delayed:**
- Reduce scope: Skip migration tool (defer to Week 3)
- Focus on core components (WorkspaceManager, RegistryManager, MetadataLoader)
- Adjust Week 3 timeline (add migration tool)

**If Week 3 Delayed:**
- Reduce scope: Skip natural language routing (manual command invocation)
- Focus on migration tool (critical for adoption)
- Adjust Week 4 timeline (add natural language routing)

**If Week 4 Delayed:**
- Reduce scope: Skip documentation (defer to Construction phase)
- Focus on bug fixes and testing (quality gate)
- Ship with minimal documentation (inline code comments)

---

## 6. Test Strategy

### 6.1 Test Coverage Goals

| Phase | Target | Actual (Estimated) |
|-------|--------|-------------------|
| Week 2 (Unit Tests) | 60% | 65% (50 tests) |
| Week 3 (Integration Tests) | 70% | 75% (103 tests) |
| Week 4 (E2E Tests) | 80% | 85% (117 tests) |

### 6.2 Test Pyramid

**Unit Tests (85 tests):**
- RegistryManager: 12 tests
- MetadataLoader: 10 tests
- WorkspaceManager: 15 tests
- PathResolver: 8 tests
- NaturalLanguageRouter: 12 tests
- MigrationTool: 10 tests
- ContextCurator: 10 tests
- CrossFrameworkOps: 8 tests

**Integration Tests (18 tests):**
- Workspace initialization flow: 5 tests
- Natural language routing flow: 8 tests
- Performance benchmarks: 5 tests

**E2E Tests (8 tests):**
- New project setup: 1 test
- Migration from legacy: 1 test
- Multi-framework workflow: 1 test
- Natural language to artifact: 1 test
- Cross-framework collaboration: 1 test
- Error recovery: 1 test
- Performance validation: 1 test
- Zero manual selection: 1 test

**Total: 111 tests (85 unit + 18 integration + 8 E2E)**

### 6.3 Test Execution

**Week 2:**
- Run unit tests after each component implementation
- Test coverage: 60%+ (50 tests)
- CI/CD: Unit tests on every commit

**Week 3:**
- Run integration tests after component integration
- Test coverage: 70%+ (103 tests)
- CI/CD: Integration tests on every PR

**Week 4:**
- Run E2E tests on complete system
- Test coverage: 80%+ (117 tests)
- CI/CD: E2E tests before merge

### 6.4 Test Automation

**CI/CD Workflow (`.github/workflows/workspace-tests.yml`):**
```yaml
name: Workspace Tests
on: [push, pull_request]
jobs:
  unit-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npm run test:unit

  integration-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npm run test:integration

  e2e-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npm run test:e2e

  performance-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm install
      - run: npm run test:performance
```

---

## 7. Definition of Done

### 7.1 Component-Level DoD

**Each component (WorkspaceManager, RegistryManager, etc.) is complete when:**
- [ ] Implementation matches specification
- [ ] Unit tests pass (100%)
- [ ] Code coverage ≥60%
- [ ] JSDoc comments complete
- [ ] Error handling comprehensive
- [ ] Performance targets met (if applicable)
- [ ] Code review approved

### 7.2 Week-Level DoD

**Week 2 complete when:**
- [ ] All 7 tasks complete (W2-T1 through W2-T7)
- [ ] 50 tests passing (unit + integration)
- [ ] AC-1, AC-2, AC-7 satisfied
- [ ] No critical bugs

**Week 3 complete when:**
- [ ] All 7 tasks complete (W3-T1 through W3-T7)
- [ ] 103 tests passing (cumulative)
- [ ] AC-3, AC-4, AC-5, AC-6 satisfied
- [ ] Performance targets met (NFR-PERF-05, NFR-PERF-09)

**Week 4 complete when:**
- [ ] All 7 tasks complete (W4-T1 through W4-T7)
- [ ] 117 tests passing (cumulative)
- [ ] AC-8 satisfied (all ACs validated)
- [ ] Documentation complete
- [ ] Project Owner approval

### 7.3 Feature-Level DoD

**FID-007 complete when:**
- [ ] All 8 acceptance criteria satisfied (AC-1 through AC-8)
- [ ] All 24 test cases passing (TC-WS-001-1 through TC-WS-008-3)
- [ ] 117 tests passing (85 unit + 18 integration + 8 E2E + 6 CLI)
- [ ] Test coverage ≥80%
- [ ] Performance targets met (NFR-PERF-05, NFR-PERF-09)
- [ ] All 45 commands updated with metadata
- [ ] All 58 agents updated with metadata
- [ ] Migration tested on sample projects
- [ ] Documentation complete (README, USAGE_GUIDE, component docs)
- [ ] CI/CD integration functional
- [ ] Project Owner approval
- [ ] Ready for merge to main branch

---

## 8. Traceability Matrix

### 8.1 Requirements → Components

| Requirement | Component | Acceptance Criteria |
|------------|-----------|---------------------|
| **REQ-1**: Multiple frameworks per repository | FrameworkRegistry, WorkspaceManager | AC-3 (framework isolation) |
| **REQ-2**: Automatic framework routing | MetadataLoader, NaturalLanguageRouter | AC-1, AC-4 (auto-routing) |
| **REQ-3**: Context isolation | ContextCurator | AC-6 (context exclusion) |
| **REQ-4**: Multi-project concurrency | WorkspaceManager (Tier 2) | AC-3 (project isolation) |
| **REQ-5**: Clear artifact lifecycle | WorkspaceManager (4-tier) | AC-7 (tier management) |

### 8.2 Acceptance Criteria → Test Cases

| Acceptance Criterion | Test Cases | Test Files |
|---------------------|-----------|-----------|
| **AC-1**: Commands Auto-Route | TC-WS-001-1, TC-WS-001-2, TC-WS-001-3 | `tests/integration/workspace-routing.test.mjs` |
| **AC-2**: Agents Respect Context | TC-WS-002-1, TC-WS-002-2, TC-WS-002-3 | `tests/unit/metadata-loader.test.mjs` |
| **AC-3**: Framework Isolation | TC-WS-003-1, TC-WS-003-2, TC-WS-003-3 | `tests/integration/workspace-routing.test.mjs` |
| **AC-4**: Natural Language Routing | TC-WS-004-1, TC-WS-004-2, TC-WS-004-3 | `tests/unit/nl-router.test.mjs` |
| **AC-5**: Cross-Framework Linking | TC-WS-005-1, TC-WS-005-2, TC-WS-005-3 | `tests/unit/cross-framework-ops.test.mjs` |
| **AC-6**: Context Exclusion | TC-WS-006-1, TC-WS-006-2, TC-WS-006-3 | `tests/unit/context-curator.test.mjs` |
| **AC-7**: Auto-Initialization | TC-WS-007-1, TC-WS-007-2, TC-WS-007-3 | `tests/unit/workspace-manager.test.mjs` |
| **AC-8**: Zero Manual Selection | TC-WS-008-1, TC-WS-008-2, TC-WS-008-3 | `tests/e2e/workspace-e2e.test.mjs` |

### 8.3 NFRs → Implementation

| NFR | Target | Implementation | Validation |
|-----|--------|---------------|------------|
| **NFR-PERF-05** | Context loading <5s | ContextCurator (lazy loading, caching) | `test-perf-context-loading.mjs` |
| **NFR-PERF-09** | Framework-scoped optimization | ContextCurator (exclusion), PathResolver | `test-perf-nl-routing.mjs`, `test-perf-path-resolution.mjs` |
| **NFR-USAB-07** | Zero-friction routing | NaturalLanguageRouter, MetadataLoader | `tests/e2e/workspace-e2e.test.mjs` (AC-8) |
| **NFR-MAINT-08** | Workspace lifecycle | WorkspaceManager (4-tier), cleanup policy | `test-workspace-tier-boundaries.mjs`, `test-clean-working-area.mjs` |
| **NFR-REL-06** | Isolation guarantees | ContextCurator (exclusion), WorkspaceManager | `test-context-isolation.mjs`, AC-3 tests |
| **NFR-REL-07** | Write segregation, read flexibility | WorkspaceManager (enforce writes), ContextCurator (allow reads) | Integration test scenario 6 |
| **NFR-SEC-04** | Data integrity | RegistryManager (atomic writes), MigrationTool (checksums) | `test-registry-concurrent-writes.mjs`, `test-migration-validate.mjs` |

---

## 9. Timeline Summary

### 9.1 Gantt Chart

```
Week 2 (27 hours):
├─ W2-T1: Registry Schema           [2h]  ████
├─ W2-T2: Registry Manager          [6h]  ████████████
├─ W2-T3: Metadata Schemas          [3h]  ██████
├─ W2-T4: Metadata Loader           [5h]  ██████████
├─ W2-T5: Workspace Manager         [6h]  ████████████
├─ W2-T6: Path Resolver             [3h]  ██████
└─ W2-T7: Integration Testing       [2h]  ████

Week 3 (27 hours):
├─ W3-T1: NL Translation Table      [3h]  ██████
├─ W3-T2: NL Router                 [5h]  ██████████
├─ W3-T3: Migration Tool            [6h]  ████████████
├─ W3-T4: Context Curator           [5h]  ██████████
├─ W3-T5: Cross-Framework Ops       [4h]  ████████
├─ W3-T6: Integration Testing       [3h]  ██████
└─ W3-T7: Performance Testing       [1h]  ██

Week 4 (26 hours):
├─ W4-T1: Update Commands           [4h]  ████████
├─ W4-T2: Update Agents             [4h]  ████████
├─ W4-T3: CLI Integration           [5h]  ██████████
├─ W4-T4: Bug Fixes                 [5h]  ██████████
├─ W4-T5: E2E Testing               [4h]  ████████
├─ W4-T6: Documentation             [3h]  ██████
└─ W4-T7: Final Review              [1h]  ██

Total: 80 hours over 3 weeks
```

### 9.2 Milestones

| Milestone | Date | Deliverable |
|-----------|------|------------|
| **M1: Core Infrastructure** | End of Week 2 | Registry, Metadata, Workspace, Path components functional |
| **M2: Routing & Migration** | End of Week 3 | Natural language routing, migration tool, context curation functional |
| **M3: Production Ready** | End of Week 4 | All metadata updated, E2E tests passing, documentation complete |

### 9.3 Dependencies

**Week 2 → Week 3:**
- MetadataLoader (W2-T4) → NaturalLanguageRouter (W3-T2)
- WorkspaceManager (W2-T5) → MigrationTool (W3-T3)
- PathResolver (W2-T6) → ContextCurator (W3-T4)

**Week 3 → Week 4:**
- MigrationTool (W3-T3) → Update Commands/Agents (W4-T1, W4-T2)
- All components (Week 2+3) → CLI Integration (W4-T3)
- All components (Week 2+3) → E2E Testing (W4-T5)

---

## 10. Success Metrics

### 10.1 Quantitative Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Test Coverage** | ≥80% | 117 tests passing |
| **Acceptance Criteria** | 8/8 satisfied | AC-1 through AC-8 |
| **Test Cases** | 24/24 passing | TC-WS-001-1 through TC-WS-008-3 |
| **Performance** | <5s context loading | NFR-PERF-05, NFR-PERF-09 |
| **Metadata Coverage** | 100% | 45 commands + 58 agents |
| **Migration Success** | 100% | All files migrated, no data loss |
| **Bug Count** | 0 critical | No blocking issues |

### 10.2 Qualitative Metrics

| Metric | Target | Validation |
|--------|--------|------------|
| **User Experience** | Zero manual selection | AC-8 (E2E test) |
| **Framework Isolation** | 100% no pollution | AC-3 (integration test) |
| **Error Messages** | 90% self-service resolution | User testing |
| **Documentation Quality** | Comprehensive | Project Owner review |
| **Code Maintainability** | Clear, modular | Code review |

### 10.3 Acceptance Gates

**Week 2 Gate:**
- [ ] 50 tests passing
- [ ] AC-1, AC-2, AC-7 satisfied
- [ ] Code coverage ≥60%

**Week 3 Gate:**
- [ ] 103 tests passing
- [ ] AC-3, AC-4, AC-5, AC-6 satisfied
- [ ] Performance targets met

**Week 4 Gate (Final):**
- [ ] 117 tests passing
- [ ] AC-8 satisfied (all ACs validated)
- [ ] Test coverage ≥80%
- [ ] Documentation complete
- [ ] Project Owner approval

---

## 11. Appendices

### Appendix A: File Structure

**Complete File Tree:**
```
tools/workspace/
├── schemas/
│   ├── registry-schema.json
│   ├── command-metadata-schema.json
│   ├── agent-metadata-schema.json
│   └── template-metadata-schema.json
├── registry-manager.mjs
├── metadata-loader.mjs
├── workspace-manager.mjs
├── path-resolver.mjs
├── nl-router.mjs
├── nl-translations.json
├── migrate-to-frameworks.mjs
├── context-curator.mjs
├── cross-framework-ops.mjs
├── cli.mjs
└── README.md

tests/
├── unit/
│   ├── registry-manager.test.mjs        (12 tests)
│   ├── metadata-loader.test.mjs         (10 tests)
│   ├── workspace-manager.test.mjs       (15 tests)
│   ├── path-resolver.test.mjs           (8 tests)
│   ├── nl-router.test.mjs               (12 tests)
│   ├── migrate-to-frameworks.test.mjs   (10 tests)
│   ├── context-curator.test.mjs         (10 tests)
│   └── cross-framework-ops.test.mjs     (8 tests)
├── integration/
│   ├── workspace-basics.test.mjs        (5 tests)
│   └── workspace-routing.test.mjs       (8 tests)
├── performance/
│   └── workspace-perf.test.mjs          (5 tests)
├── e2e/
│   └── workspace-e2e.test.mjs           (8 tests)
└── cli/
    └── workspace-cli.test.mjs           (6 tests)

Total: 117 tests
```

### Appendix B: Metadata Examples

**Command Metadata (`.claude/commands/flow-inception-to-elaboration.md`):**
```yaml
---
command-id: flow-inception-to-elaboration
description: Orchestrate Inception→Elaboration phase transition
framework: sdlc-complete
framework-version: 1.0
output-path: frameworks/sdlc-complete/projects/{project-id}/
context-paths:
  - frameworks/sdlc-complete/repo/
  - frameworks/sdlc-complete/projects/{project-id}/
  - shared/
version: 1.0
---
```

**Agent Metadata (`.claude/agents/architecture-designer.md`):**
```yaml
---
agent-id: architecture-designer
name: Architecture Designer
framework: sdlc-complete
framework-version: 1.0
context-paths:
  - frameworks/sdlc-complete/repo/templates/analysis-design/
  - frameworks/sdlc-complete/projects/{project-id}/requirements/
  - frameworks/sdlc-complete/projects/{project-id}/planning/
output-base: frameworks/sdlc-complete/projects/{project-id}/
version: 1.0
---
```

### Appendix C: Natural Language Translations (Sample)

**75+ Phrase Translations (Sample):**
```json
{
  "version": "1.0",
  "translations": [
    {
      "phrases": [
        "transition to elaboration",
        "move to elaboration",
        "start elaboration",
        "begin elaboration phase"
      ],
      "command": "flow-inception-to-elaboration",
      "framework": "sdlc-complete"
    },
    {
      "phrases": [
        "run security review",
        "start security review",
        "validate security",
        "security audit"
      ],
      "command": "flow-security-review-cycle",
      "framework": "sdlc-complete"
    }
  ]
}
```

### Appendix D: Performance Baselines

**Performance Targets:**

| Operation | p50 | p95 | p99 | Rationale |
|-----------|-----|-----|-----|-----------|
| Natural language routing | <50ms | <100ms | <200ms | NFR-PERF-09 |
| Framework context loading | <3s | <5s | <8s | NFR-PERF-05 |
| Path resolution | <10ms | <50ms | <100ms | NFR-PERF-09 |
| Migration (30 files) | <3s | <5s | <8s | User tolerance |
| Registry lookup (cached) | <10ms | <50ms | <100ms | NFR-PERF-09 |

---

## 12. Document Metadata

**Document Version:** 1.0
**Status:** DRAFT
**Created:** 2025-10-19
**Author:** Software Implementer
**Last Updated:** 2025-10-19
**Review Status:** Pending (Architecture Designer, Test Engineer, Project Owner)

**Word Count:** 12,456 words
**Tasks:** 21 (7 per week × 3 weeks)
**Components:** 9 (WorkspaceManager, RegistryManager, MetadataLoader, PathResolver, NaturalLanguageRouter, MigrationTool, ContextCurator, CrossFrameworkOps, CLI)
**Tests:** 117 (85 unit + 18 integration + 8 E2E + 6 CLI)
**Effort:** 80 hours over 3 weeks

**Traceability:**
- Feature: FID-007 (Framework-Scoped Workspace Management - P0 #1)
- Use Case: UC-012 (Framework-Aware Workspace Management)
- Architecture: ADR-007 (Framework-Scoped Workspace Architecture)
- NFRs: NFR-PERF-05, NFR-PERF-09, NFR-USAB-07, NFR-MAINT-08, NFR-REL-06, NFR-REL-07, NFR-SEC-04

**Next Actions:**
1. Review implementation plan - Architecture Designer (Week 2 start)
2. Review test strategy - Test Engineer (Week 2 start)
3. Approve plan - Project Owner (Week 2 start)
4. Begin implementation - Software Implementer (Week 2 Day 1)

---

**Generated:** 2025-10-19
**Owner:** Software Implementer (AIWG SDLC Framework)
**Status:** DRAFT - Detailed Implementation Plan Complete
