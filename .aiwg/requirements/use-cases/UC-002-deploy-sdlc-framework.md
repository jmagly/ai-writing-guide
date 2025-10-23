# Use-Case Specification: UC-002

## Metadata

- ID: UC-002
- Name: Deploy SDLC Framework to Existing Project
- Owner: System Analyst
- Contributors: DevOps Engineer, System Analyst
- Team: SDLC Framework
- Status: approved
- Created: 2025-10-17
- Updated: 2025-10-22
- Priority: P0 (Critical)
- Estimated Effort: S (Small - from user perspective)
- Related Documents:
  - Brief: /aiwg/requirements/use-case-briefs/UC-002-deploy-sdlc-framework.md
  - Feature: REQ-SDLC-001 (Agent Deployment), REQ-SDLC-002 (Project Setup)
  - SAD: Section 4.3 (Development View - Module Structure)

## 1. Use-Case Identifier and Name

**ID:** UC-002
**Name:** Deploy SDLC Framework to Existing Project

## 2. Scope and Level

**Scope:** AIWG CLI - Agent Deployment System
**Level:** User Goal
**System Boundary:** aiwg CLI, deploy-agents.mjs, project filesystem

## 3. Primary Actor(s)

**Primary Actors:**
- Agentic Developer: Software developer using Claude Code/Cursor for AI-assisted development
- Solo Developer: Individual maintaining personal projects
- Team Lead: Managing team using agentic workflows

**Actor Goals:**
- Deploy 58 SDLC agents to project without manual file copying
- Enable natural language workflow orchestration ("Start Inception" vs fragmented chat)
- Minimize setup friction (<15 minutes from install to first artifact generation)

## 4. Stakeholders and Interests

| Stakeholder | Interest |
|------------|----------|
| Agentic Developer | Structured SDLC guidance without manual template management |
| Project Manager | Comprehensive artifact generation (intake, requirements, architecture) |
| Framework Maintainer | Broad adoption, minimal support burden |
| Enterprise Architect | Evaluation for organizational standards |

## 5. Preconditions

1. Existing project directory with .git repository
2. aiwg CLI installed (`~/.local/share/ai-writing-guide/`)
3. Node.js >=18.20.8 available (optional, for tooling)
4. Claude Code, Cursor, or compatible LLM coding assistant available

## 6. Postconditions

**Success:**
- 58 SDLC agents deployed to `.claude/agents/`
- 45 SDLC commands deployed to `.claude/commands/`
- CLAUDE.md updated with natural language orchestration prompts
- `.aiwg/` artifact directory structure created
- User can trigger workflows via natural language

**Failure:**
- Deployment aborted, no files modified (transactional rollback)
- Error message with remediation steps
- User can retry after fixing prerequisites

## 7. Trigger

User runs deployment command: `aiwg -deploy-agents --mode sdlc`

## 8. Main Success Scenario

1. User navigates to existing project: `cd /path/to/project`
2. User runs: `aiwg -deploy-agents --mode sdlc`
3. CLI validates project directory:
   - Checks for .git repository (confirms valid project)
   - Warns if `.claude/` already exists (potential overwrite)
4. User confirms deployment (if `.claude/` exists): "Overwrite existing agents? (y/n)"
5. CLI copies 58 SDLC agents to `.claude/agents/`:
   - architecture-designer.md
   - test-engineer.md
   - requirements-analyst.md
   - (55 more agents...)
6. User optionally deploys slash commands: `aiwg -deploy-commands --mode sdlc`
7. CLI copies 45 SDLC commands to `.claude/commands/`:
   - flow-inception-to-elaboration.md
   - intake-wizard.md
   - (43 more commands...)
8. User updates CLAUDE.md: Natural language in chat or command
9. CLI adds orchestration section to CLAUDE.md (preserves existing content):
   - Natural language translations
   - Flow command mappings
   - Phase overview
10. User tests natural language orchestration: "Start Inception"
11. Claude Code interprets → triggers `/project:flow-concept-to-inception`
12. User generates first artifact: `/project:intake-wizard "Build customer portal"`
13. Intake forms created in `.aiwg/intake/`
14. User confirms deployment success: `ls .claude/agents/ .claude/commands/ .aiwg/intake/`

## 9. Alternate Flows

### Alt-1: Selective Deployment (General-Purpose Agents Only)

**Branch Point:** Step 2
**Condition:** User deploys general-purpose agents only (not full SDLC)

**Flow:**
1. User runs: `aiwg -deploy-agents --mode general`
2. CLI copies 3 general-purpose agents:
   - writing-validator.md
   - prompt-optimizer.md
   - content-diversifier.md
3. CLI skips SDLC commands (no `.claude/commands/` deployment)
4. User tests: `/project:writing-validator "content.md"`
5. **Resume Main:** Step 14 (User confirms)

### Alt-2: Dry-Run Mode (Preview Changes)

**Branch Point:** Step 2
**Condition:** User wants to preview changes before deployment

**Flow:**
1. User runs: `aiwg -deploy-agents --mode sdlc --dry-run`
2. CLI previews changes:
   - "Would copy 58 agents to .claude/agents/"
   - "Would copy 45 commands to .claude/commands/"
   - "Would update CLAUDE.md (line 150)"
   - "No files modified (dry-run mode)"
3. User reviews preview
4. User runs actual deployment: `aiwg -deploy-agents --mode sdlc`
5. **Resume Main:** Step 3 (CLI validates)

### Alt-3: Multi-Platform Deployment (OpenAI/Codex)

**Branch Point:** Step 2
**Condition:** User targets OpenAI/Codex platform

**Flow:**
1. User runs: `aiwg -deploy-agents --mode sdlc --provider openai`
2. CLI copies agents to `.codex/agents/` (OpenAI directory structure)
3. CLI generates AGENTS.md (single-file format for OpenAI)
4. CLI adds platform-specific guidance to CLAUDE.md
5. User tests: `/project:intake-wizard "Build API"`
6. **Resume Main:** Step 12 (User generates artifact)

### Alt-4: Force Overwrite (Existing Agents Conflict)

**Branch Point:** Step 4
**Condition:** User has custom agents, wants to force overwrite

**Flow:**
1. CLI detects existing `.claude/agents/custom-agent.md`
2. CLI warns: "Custom agents detected. Backup before overwrite?"
3. User runs: `aiwg -deploy-agents --mode sdlc --force`
4. CLI backs up existing agents to `.aiwg/backups/agents-{timestamp}/`
5. CLI overwrites with SDLC agents
6. User reviews backup: `ls .aiwg/backups/agents-2025-10-18-14-30-00/`
7. **Resume Main:** Step 5 (CLI copies agents)

## 10. Exception Flows

### Exc-1: AIWG Not Installed

**Trigger:** Step 2
**Condition:** AIWG installation missing (`~/.local/share/ai-writing-guide/` not found)

**Flow:**
1. User runs: `aiwg -deploy-agents`
2. CLI returns: "aiwg: command not found"
3. User installs: `curl -fsSL https://raw.githubusercontent.com/jmagly/ai-writing-guide/refs/heads/main/tools/install/install.sh | bash`
4. Installation completes
5. User re-runs deployment
6. **Resume Main:** Step 2

### Exc-2: Not a Git Repository

**Trigger:** Step 3
**Condition:** Current directory not a git repository

**Flow:**
1. CLI checks for .git directory
2. .git not found
3. CLI returns error: "Not a git repository. Initialize: git init"
4. User initializes: `git init`
5. User re-runs deployment
6. **Resume Main:** Step 3

### Exc-3: CLAUDE.md Corruption During Update

**Trigger:** Step 9
**Condition:** CLAUDE.md update fails, leaves file in broken state

**Flow:**
1. CLI backs up CLAUDE.md to `.aiwg/backups/CLAUDE.md.backup`
2. CLI attempts update (write orchestration section)
3. Write operation fails (disk full, permission denied)
4. CLI detects failure
5. CLI rolls back: Restores CLAUDE.md from backup
6. CLI returns error: "CLAUDE.md update failed. File restored. Fix: [remediation]"
7. User resolves issue (free disk space, fix permissions)
8. User re-runs deployment
9. **Resume Main:** Step 9

### Exc-4: Deployment Timeout (Slow Network)

**Trigger:** Step 5
**Condition:** Remote plugin registry download times out

**Flow:**
1. CLI downloads agents from GitHub
2. Network timeout after 30 seconds
3. CLI retries (3 attempts)
4. All retries fail
5. CLI returns error: "Deployment timeout. Check network connection."
6. User checks network, retries
7. **Resume Main:** Step 5

## 11. Special Requirements

### Performance Requirements

| Requirement | Target | Rationale |
|------------|--------|-----------|
| NFR-SD-01: Deployment time | <10s for all 58 agents + 45 commands | User experience |
| NFR-SD-02: File copy success rate | 100% (zero partial deployments) | Reliability |
| NFR-SD-03: CLAUDE.md update | Preserve existing content (zero data loss) | Trust |

### Security Requirements

| Requirement | Target | Rationale |
|------------|--------|-----------|
| NFR-SD-04: File permissions | Deployed files match source permissions | Security |
| NFR-SD-05: Backup integrity | SHA-256 checksum validation | Data protection |

### Usability Requirements

| Requirement | Target | Rationale |
|------------|--------|-----------|
| NFR-SD-06: Setup friction | <15 minutes from install to first artifact | Accessibility |
| NFR-SD-07: Error clarity | Clear remediation steps for all errors | Self-service |

## 12. Related Business Rules

**BR-SD-001: Deployment Modes**
- `--mode general`: 3 general-purpose agents (writing-validator, prompt-optimizer, content-diversifier)
- `--mode sdlc`: 58 SDLC agents + 45 commands (full framework)
- `--mode both`: General + SDLC (61 agents + 45 commands)

**BR-SD-002: Platform Support**
- `--provider claude`: Deploy to `.claude/agents/` (default)
- `--provider openai`: Deploy to `.codex/agents/` + generate AGENTS.md
- `--provider cursor`: Deploy to `.cursor/agents/`

**BR-SD-003: Overwrite Policy**
- Existing agents: Warn user, require confirmation
- Custom agents: Backup to `.aiwg/backups/` before overwrite
- CLAUDE.md: Preserve existing content, append orchestration section

## 13. Data Requirements

### Input Data

| Data Element | Format | Source | Validation |
|-------------|--------|---------|-----------|
| Deployment Mode | Enum (general, sdlc, both) | CLI flag | Valid enum |
| Platform Provider | Enum (claude, openai, cursor) | CLI flag | Valid enum |
| Force Overwrite | Boolean | CLI flag | True/False |
| Dry-Run | Boolean | CLI flag | True/False |

### Output Data

| Data Element | Format | Destination | Retention |
|-------------|--------|-------------|----------|
| Agents | Markdown files | `.claude/agents/` | Persistent |
| Commands | Markdown files | `.claude/commands/` | Persistent |
| CLAUDE.md Updates | Markdown text | `CLAUDE.md` | Persistent |
| Backup Files | Markdown files | `.aiwg/backups/` | 30 days |

## 14. Open Issues and TODOs

1. **Issue 001: Version conflict detection**
   - Description: How to handle user upgrading from older AIWG version with breaking changes?
   - Impact: Deployment may overwrite user customizations
   - Owner: DevOps Engineer
   - Due Date: Construction phase

2. **TODO 001: Deployment validation report**
   - Description: Generate report listing all deployed files with checksums
   - Assigned: Test Engineer
   - Due Date: Elaboration phase

## 15. References

- [Software Architecture Document](/aiwg/planning/sdlc-framework/architecture/software-architecture-doc.md) - Section 4.3
- [Feature Backlog](/aiwg/requirements/feature-backlog-prioritized.md) - REQ-SDLC-001, REQ-SDLC-002
- [deploy-agents.mjs](/tools/agents/deploy-agents.mjs)

---

## Traceability Matrix

### Requirements Traceability

| Requirement ID | Source | Implementation | Test Case |
|---------------|---------|----------------|-----------|
| REQ-SDLC-001 | Feature Backlog | deploy-agents.mjs | TC-002-001 through TC-002-030 |
| REQ-SDLC-002 | Feature Backlog | CLAUDE.md updates | TC-002-008, TC-002-009 |
| NFR-SD-01 | This document | CLI performance | TC-002-015, TC-002-016 |
| NFR-SD-04 | This document | File permissions | TC-002-020 |
| NFR-SD-06 | This document | Setup friction | TC-002-017 |
| BR-SD-001 | This document | Deployment mode logic | TC-002-002, TC-002-003 |

### SAD Component Mapping

**Primary Components:**
- CLI Entry Point (SAD Section 2.1)
- Deployment Engine (SAD Section 2.1)
- Plugin Manager (SAD Section 5.1)

**Supporting Components:**
- InstallationTransaction (ADR-006, rollback support)
- File System (backup, restore)

---

## Acceptance Criteria

### AC-001: Basic SDLC Agent Deployment

**Given:** User in project directory with .git repository
**When:** User runs `aiwg -deploy-agents --mode sdlc`
**Then:**
- 58 SDLC agents deployed to `.claude/agents/` in <10 seconds
- All agent files readable and valid markdown
- Agent count verified: `ls .claude/agents/*.md | wc -l` returns 58
- User can invoke any SDLC agent in Claude Code

### AC-002: Selective Deployment Mode (General-Purpose Agents)

**Given:** User wants general-purpose agents only
**When:** User runs `aiwg -deploy-agents --mode general`
**Then:**
- Exactly 3 agents deployed: writing-validator.md, prompt-optimizer.md, content-diversifier.md
- No SDLC agents deployed (`.claude/agents/` contains only 3 files)
- User can invoke `/project:writing-validator "content.md"`
- Deployment completes in <5 seconds

### AC-003: Combined Deployment Mode (Both General + SDLC)

**Given:** User wants all available agents
**When:** User runs `aiwg -deploy-agents --mode both`
**Then:**
- 61 agents deployed (3 general + 58 SDLC)
- All agents accessible in Claude Code
- Agent count verified: `ls .claude/agents/*.md | wc -l` returns 61
- Deployment completes in <10 seconds

### AC-004: Slash Command Deployment

**Given:** User wants SDLC workflow commands
**When:** User runs `aiwg -deploy-commands --mode sdlc`
**Then:**
- 45 SDLC commands deployed to `.claude/commands/`
- All commands invokable: `/project:intake-wizard`, `/project:flow-inception-to-elaboration`, etc.
- Command count verified: `ls .claude/commands/*.md | wc -l` returns 45
- Deployment completes in <5 seconds

### AC-005: Dry-Run Mode (Preview Without Modification)

**Given:** User wants to preview changes before deployment
**When:** User runs `aiwg -deploy-agents --mode sdlc --dry-run`
**Then:**
- CLI displays preview: "Would copy 58 agents to .claude/agents/"
- No files created or modified (verify with `ls .claude/agents/` returns empty or unchanged)
- Preview includes: Agent count, command count, CLAUDE.md update location
- User can safely review before actual deployment

### AC-006: Force Overwrite with Backup

**Given:** User has existing `.claude/agents/` directory with custom agents
**When:** User runs `aiwg -deploy-agents --mode sdlc --force`
**Then:**
- Existing agents backed up to `.aiwg/backups/agents-{timestamp}/`
- Backup directory contains all original agents (count matches pre-deployment count)
- New SDLC agents deployed (58 agents in `.claude/agents/`)
- Backup timestamp format: `agents-YYYY-MM-DD-HHMMSS`
- User can restore from backup if needed

### AC-007: Rollback on Deployment Failure

**Given:** Deployment fails mid-process (disk full, permission denied)
**When:** CLI detects failure during agent copy
**Then:**
- All partial changes rolled back
- `.claude/agents/` directory restored to pre-deployment state (or remains empty if new deployment)
- Error message displayed: "Deployment failed: [reason]. Project state restored."
- User can fix issue and retry deployment

### AC-008: CLAUDE.md Update (Preserve Existing Content)

**Given:** Project has existing CLAUDE.md with custom content
**When:** CLI updates CLAUDE.md with orchestration section
**Then:**
- Existing content preserved (no data loss)
- Orchestration section appended at end of file
- Backup created: `.aiwg/backups/CLAUDE.md.backup`
- Updated CLAUDE.md includes: Natural language translations, flow command mappings, phase overview
- Word count increased by 2,000-3,000 words (orchestration section size)

### AC-009: CLAUDE.md Rollback on Corruption

**Given:** CLAUDE.md update fails (write error, disk full)
**When:** CLI detects CLAUDE.md corruption
**Then:**
- CLAUDE.md restored from backup (`.aiwg/backups/CLAUDE.md.backup`)
- File integrity verified: Original content matches restored content
- Error message displayed: "CLAUDE.md update failed. File restored. Fix: [remediation steps]"
- User can resolve issue and retry deployment

### AC-010: Multi-Platform Deployment (OpenAI/Codex)

**Given:** User targets OpenAI platform
**When:** User runs `aiwg -deploy-agents --mode sdlc --provider openai`
**Then:**
- Agents deployed to `.codex/agents/` (OpenAI directory structure)
- AGENTS.md generated (single-file format for OpenAI compatibility)
- Platform-specific guidance added to CLAUDE.md
- User can invoke agents in OpenAI Codex environment

### AC-011: Git Repository Validation

**Given:** User runs deployment in non-git directory
**When:** CLI validates project directory (Step 3)
**Then:**
- CLI checks for .git directory
- Error message displayed: "Not a git repository. Initialize: git init"
- Deployment aborted (no files created)
- Exit status code: 1 (error)

### AC-012: AIWG Installation Validation

**Given:** User runs `aiwg -deploy-agents` without AIWG installed
**When:** Shell executes command
**Then:**
- Shell returns: "aiwg: command not found"
- User receives remediation: Install AIWG via curl command
- User can install and retry deployment
- Post-install, `aiwg -version` returns valid version

### AC-013: Performance Target (<10s Deployment)

**Given:** Enterprise project deployment (58 agents + 45 commands)
**When:** User runs full deployment
**Then:**
- Agent copy completes in <7 seconds
- Command copy completes in <3 seconds
- Total deployment time: <10 seconds (95th percentile target)
- Performance logged for monitoring

### AC-014: File Permission Preservation

**Given:** Source agents have specific file permissions (e.g., 644)
**When:** CLI copies agents to project
**Then:**
- Deployed files match source permissions
- Verify: `ls -la .claude/agents/*.md` shows consistent permissions
- No permission escalation or reduction
- Files readable by user, group (no execute bit)

### AC-015: Setup Friction (<15 Minutes to First Artifact)

**Given:** New user with no AIWG installation
**When:** User follows full setup workflow (install → deploy → generate artifact)
**Then:**
- Install AIWG: <2 minutes
- Deploy agents + commands: <1 minute
- Update CLAUDE.md: <1 minute
- Generate first artifact (`/project:intake-wizard`): <10 minutes
- Total time: <15 minutes from install to first artifact

### AC-016: Error Clarity (Clear Remediation Steps)

**Given:** Deployment encounters error (any exception flow)
**When:** CLI displays error message
**Then:**
- Error message includes: Error type, root cause, remediation steps
- Example: "Not a git repository. Initialize: git init"
- All remediation steps actionable (commands provided, not vague guidance)
- User can self-service without framework maintainer support

### AC-017: Natural Language Orchestration Validation

**Given:** Deployment complete (agents + commands + CLAUDE.md updated)
**When:** User invokes natural language workflow: "Start Inception"
**Then:**
- Claude Code interprets natural language → triggers `/project:flow-concept-to-inception`
- Workflow executes successfully
- Artifacts generated in `.aiwg/` directories
- User confirms natural language orchestration works (no manual slash commands needed)

### AC-018: Deployment Conflict Handling

**Given:** User has existing `.claude/agents/` directory without `--force` flag
**When:** User runs deployment without force
**Then:**
- CLI warns: "Existing agents detected. Overwrite? (y/n)"
- If user responds "n": Deployment aborted, no changes made
- If user responds "y": Backup created, deployment proceeds
- User has opportunity to abort before overwrite

### AC-019: Network Timeout Handling

**Given:** Slow or unreliable network connection
**When:** CLI downloads agents from GitHub (network timeout)
**Then:**
- CLI retries download (3 attempts)
- Retry delay: 5 seconds between attempts
- If all retries fail: Error message displayed with network troubleshooting steps
- Partial downloads cleaned up (no corrupted agent files)

### AC-020: Backup Integrity Validation

**Given:** CLI creates backup of existing agents
**When:** Backup operation completes
**Then:**
- SHA-256 checksum calculated for each backed up file
- Checksum log saved: `.aiwg/backups/agents-{timestamp}/checksums.txt`
- Backup file count matches source file count
- User can verify backup integrity before deployment

---

## Test Cases

### TC-002-001: Basic SDLC Agent Deployment - Clean Install

**Objective:** Validate basic agent deployment to clean project
**Preconditions:** Project directory with .git, no existing `.claude/agents/`
**Test Steps:**
1. Navigate to project: `cd /path/to/test-project`
2. Run deployment: `aiwg -deploy-agents --mode sdlc`
3. Wait for deployment to complete
4. Verify agent count: `ls .claude/agents/*.md | wc -l` returns 58
5. Verify all agents readable: `cat .claude/agents/architecture-designer.md` (valid markdown)
6. Measure deployment time (target: <10 seconds)
**Expected Result:** 58 agents deployed, all readable, deployment <10s
**NFR Validated:** NFR-SD-01 (Deployment time <10s)
**Pass/Fail:** PASS if 58 agents deployed in <10s

### TC-002-002: Selective Deployment - General-Purpose Agents Only

**Objective:** Validate selective deployment mode (general agents only)
**Preconditions:** Project directory with .git, no existing agents
**Test Steps:**
1. Run deployment: `aiwg -deploy-agents --mode general`
2. Verify agent count: `ls .claude/agents/*.md | wc -l` returns 3
3. Verify agent names: writing-validator.md, prompt-optimizer.md, content-diversifier.md
4. Verify no SDLC agents deployed (no architecture-designer.md, test-engineer.md, etc.)
5. Test agent invocation: `/project:writing-validator "test.md"`
**Expected Result:** Exactly 3 general agents deployed, no SDLC agents
**NFR Validated:** BR-SD-001 (Deployment mode logic)
**Pass/Fail:** PASS if 3 general agents deployed

### TC-002-003: Combined Deployment - Both General + SDLC

**Objective:** Validate combined deployment mode (all agents)
**Preconditions:** Project directory with .git, no existing agents
**Test Steps:**
1. Run deployment: `aiwg -deploy-agents --mode both`
2. Verify agent count: `ls .claude/agents/*.md | wc -l` returns 61
3. Verify general agents exist: writing-validator.md, prompt-optimizer.md, content-diversifier.md
4. Verify SDLC agents exist: architecture-designer.md, test-engineer.md, requirements-analyst.md
5. Measure deployment time (target: <10 seconds)
**Expected Result:** 61 agents deployed (3 general + 58 SDLC), deployment <10s
**NFR Validated:** BR-SD-001 (Deployment mode logic)
**Pass/Fail:** PASS if 61 agents deployed in <10s

### TC-002-004: Slash Command Deployment

**Objective:** Validate SDLC command deployment
**Preconditions:** Project directory with .git, no existing commands
**Test Steps:**
1. Run command deployment: `aiwg -deploy-commands --mode sdlc`
2. Verify command count: `ls .claude/commands/*.md | wc -l` returns 45
3. Verify key commands exist: flow-inception-to-elaboration.md, intake-wizard.md, flow-gate-check.md
4. Test command invocation: `/project:intake-wizard "Test project"`
5. Measure deployment time (target: <5 seconds)
**Expected Result:** 45 commands deployed, all invokable, deployment <5s
**NFR Validated:** NFR-SD-01 (Deployment time <10s)
**Pass/Fail:** PASS if 45 commands deployed in <5s

### TC-002-005: Dry-Run Mode - Preview Without Modification

**Objective:** Validate dry-run mode (preview changes without modification)
**Preconditions:** Project directory with .git, no existing agents
**Test Steps:**
1. Run dry-run: `aiwg -deploy-agents --mode sdlc --dry-run`
2. Verify preview displayed: "Would copy 58 agents to .claude/agents/"
3. Verify no files created: `ls .claude/agents/` returns empty or error (directory not created)
4. Run actual deployment: `aiwg -deploy-agents --mode sdlc`
5. Verify agents deployed after actual run
**Expected Result:** Dry-run previews changes, no files modified
**NFR Validated:** NFR-SD-07 (Error clarity - preview mode)
**Pass/Fail:** PASS if dry-run shows preview, no files created

### TC-002-006: Force Overwrite with Backup

**Objective:** Validate force overwrite with backup creation
**Preconditions:** Project directory with existing `.claude/agents/` (5 custom agents)
**Test Steps:**
1. Verify existing agents: `ls .claude/agents/*.md | wc -l` returns 5
2. Run force deployment: `aiwg -deploy-agents --mode sdlc --force`
3. Verify backup created: `ls .aiwg/backups/agents-*/` contains 5 original agents
4. Verify backup timestamp format: `agents-YYYY-MM-DD-HHMMSS`
5. Verify new agents deployed: `ls .claude/agents/*.md | wc -l` returns 58
6. Verify backup integrity: Compare checksums of backed up files
**Expected Result:** Original agents backed up, 58 new agents deployed
**NFR Validated:** BR-SD-003 (Overwrite policy with backup)
**Pass/Fail:** PASS if backup created, 58 agents deployed

### TC-002-007: Deployment Rollback on Failure

**Objective:** Validate rollback when deployment fails mid-process
**Preconditions:** Project directory with .git, simulate disk full during deployment
**Test Steps:**
1. Mock disk full error (after 20 agents copied)
2. Run deployment: `aiwg -deploy-agents --mode sdlc`
3. Verify deployment fails: Error message displayed
4. Verify rollback: `ls .claude/agents/` returns empty or pre-deployment state
5. Verify error message includes remediation steps: "Free disk space: df -h"
**Expected Result:** Deployment fails, partial changes rolled back
**NFR Validated:** NFR-SD-02 (File copy success rate 100% - no partial deployments)
**Pass/Fail:** PASS if rollback succeeds, no partial deployment

### TC-002-008: CLAUDE.md Update - Preserve Existing Content

**Objective:** Validate CLAUDE.md update preserves existing content
**Preconditions:** Project with existing CLAUDE.md (1,000 words custom content)
**Test Steps:**
1. Read existing CLAUDE.md content: `cat CLAUDE.md > /tmp/original-claude.md`
2. Run deployment with CLAUDE.md update
3. Verify backup created: `.aiwg/backups/CLAUDE.md.backup`
4. Verify existing content preserved: `diff /tmp/original-claude.md .claude/CLAUDE.md | head -n 1000` shows no changes
5. Verify orchestration section appended: Word count increased by 2,000-3,000 words
6. Verify orchestration section includes: Natural language translations, flow command mappings
**Expected Result:** Existing content preserved, orchestration section appended
**NFR Validated:** NFR-SD-03 (CLAUDE.md update - zero data loss)
**Pass/Fail:** PASS if existing content unchanged, orchestration appended

### TC-002-009: CLAUDE.md Rollback on Corruption

**Objective:** Validate CLAUDE.md rollback when update fails
**Preconditions:** Project with existing CLAUDE.md, simulate write error during update
**Test Steps:**
1. Mock write error (disk full, permission denied) during CLAUDE.md update
2. Run deployment with CLAUDE.md update
3. Verify deployment fails: Error message displayed
4. Verify CLAUDE.md restored from backup: `diff CLAUDE.md .aiwg/backups/CLAUDE.md.backup` returns no differences
5. Verify error message includes remediation steps: "Free disk space: df -h" or "Fix permissions: chmod +w CLAUDE.md"
**Expected Result:** CLAUDE.md restored from backup, error with remediation
**NFR Validated:** NFR-SD-03 (CLAUDE.md update - zero data loss)
**Pass/Fail:** PASS if CLAUDE.md restored, remediation steps provided

### TC-002-010: Multi-Platform Deployment - OpenAI/Codex

**Objective:** Validate deployment to OpenAI platform
**Preconditions:** Project directory with .git, no existing agents
**Test Steps:**
1. Run OpenAI deployment: `aiwg -deploy-agents --mode sdlc --provider openai`
2. Verify agents deployed to `.codex/agents/` (OpenAI directory structure)
3. Verify AGENTS.md generated (single-file format)
4. Verify platform-specific guidance added to CLAUDE.md
5. Count agents: `ls .codex/agents/*.md | wc -l` returns 58
**Expected Result:** Agents deployed to `.codex/agents/`, AGENTS.md generated
**NFR Validated:** BR-SD-002 (Platform support - OpenAI)
**Pass/Fail:** PASS if agents in `.codex/agents/`, AGENTS.md exists

### TC-002-011: Git Repository Validation Exception

**Objective:** Validate error handling when not in git repository
**Preconditions:** Directory without .git repository
**Test Steps:**
1. Create test directory: `mkdir /tmp/no-git-test && cd /tmp/no-git-test`
2. Run deployment: `aiwg -deploy-agents --mode sdlc`
3. Verify error message: "Not a git repository. Initialize: git init"
4. Verify exit status code: 1 (error)
5. Initialize git: `git init`
6. Re-run deployment: `aiwg -deploy-agents --mode sdlc`
7. Verify deployment succeeds after git init
**Expected Result:** Error when no git, success after git init
**NFR Validated:** NFR-SD-07 (Error clarity - remediation steps)
**Pass/Fail:** PASS if error with remediation, success after git init

### TC-002-012: AIWG Installation Validation Exception

**Objective:** Validate error handling when AIWG not installed
**Preconditions:** AIWG not installed (PATH does not include aiwg binary)
**Test Steps:**
1. Uninstall AIWG: `rm -rf ~/.local/share/ai-writing-guide`
2. Run deployment: `aiwg -deploy-agents`
3. Verify error: "aiwg: command not found"
4. Install AIWG: `curl -fsSL https://raw.githubusercontent.com/jmagly/ai-writing-guide/refs/heads/main/tools/install/install.sh | bash`
5. Re-run deployment: `aiwg -deploy-agents --mode sdlc`
6. Verify deployment succeeds after installation
**Expected Result:** Error when not installed, success after installation
**NFR Validated:** NFR-SD-07 (Error clarity)
**Pass/Fail:** PASS if error when missing, success after install

### TC-002-013: Deployment Timeout Exception (Network)

**Objective:** Validate error handling when network timeout occurs
**Preconditions:** Simulate slow/unreliable network connection
**Test Steps:**
1. Mock network timeout (30-second timeout, 3 retries)
2. Run deployment: `aiwg -deploy-agents --mode sdlc`
3. Verify retry attempts: 3 retries logged
4. Verify timeout error: "Deployment timeout. Check network connection."
5. Verify error message includes troubleshooting steps: "Check network: ping github.com"
6. Restore network, re-run deployment
7. Verify deployment succeeds after network restored
**Expected Result:** Timeout error with troubleshooting, success after network restored
**NFR Validated:** NFR-SD-07 (Error clarity - remediation steps)
**Pass/Fail:** PASS if timeout error, success after network restored

### TC-002-014: Deployment Conflict Handling (No Force Flag)

**Objective:** Validate conflict handling when existing agents detected
**Preconditions:** Project with existing `.claude/agents/` directory (5 custom agents)
**Test Steps:**
1. Verify existing agents: `ls .claude/agents/*.md | wc -l` returns 5
2. Run deployment without force: `aiwg -deploy-agents --mode sdlc`
3. Verify warning displayed: "Existing agents detected. Overwrite? (y/n)"
4. Respond "n" (decline overwrite)
5. Verify deployment aborted: `.claude/agents/` unchanged (still 5 agents)
6. Re-run deployment, respond "y" (confirm overwrite)
7. Verify backup created, 58 agents deployed
**Expected Result:** User prompted, deployment aborted on "n", proceeds on "y"
**NFR Validated:** BR-SD-003 (Overwrite policy - require confirmation)
**Pass/Fail:** PASS if prompt shown, deployment aborted on "n"

### TC-002-015: Performance Test - Deployment Time <10s

**Objective:** Validate deployment completes within performance target
**Preconditions:** Project directory with .git, no existing agents
**Test Steps:**
1. Start timer
2. Run deployment: `aiwg -deploy-agents --mode sdlc`
3. Stop timer when deployment completes
4. Measure deployment time (target: <10 seconds)
5. Verify agent count: 58 agents deployed
6. Verify command deployment: `aiwg -deploy-commands --mode sdlc` (target: <5 seconds)
**Expected Result:** Agent deployment <10s, command deployment <5s
**NFR Validated:** NFR-SD-01 (Deployment time <10s)
**Pass/Fail:** PASS if deployment <10s

### TC-002-016: Performance Test - Setup Friction <15 Minutes

**Objective:** Validate full setup friction meets target
**Preconditions:** New user with no AIWG installation
**Test Steps:**
1. Start timer
2. Install AIWG: `curl -fsSL https://... | bash` (measure time)
3. Deploy agents: `aiwg -deploy-agents --mode sdlc` (measure time)
4. Deploy commands: `aiwg -deploy-commands --mode sdlc` (measure time)
5. Generate first artifact: `/project:intake-wizard "Test project"` (measure time)
6. Stop timer, calculate total time
7. Verify total time: <15 minutes
**Expected Result:** Full setup (install → deploy → first artifact) <15 minutes
**NFR Validated:** NFR-SD-06 (Setup friction <15 minutes)
**Pass/Fail:** PASS if total time <15 minutes

### TC-002-017: Natural Language Orchestration Validation

**Objective:** Validate natural language orchestration works after deployment
**Preconditions:** Deployment complete (agents + commands + CLAUDE.md updated)
**Test Steps:**
1. Open Claude Code in project
2. Invoke natural language: "Start Inception"
3. Verify Claude Code interprets → triggers `/project:flow-concept-to-inception`
4. Verify workflow executes successfully
5. Verify artifacts generated: `.aiwg/intake/` contains intake forms
6. Invoke another natural language workflow: "Create architecture baseline"
7. Verify workflow triggers: `/project:flow-inception-to-elaboration`
**Expected Result:** Natural language triggers workflows, artifacts generated
**NFR Validated:** REQ-SDLC-002 (Natural language orchestration)
**Pass/Fail:** PASS if natural language works, artifacts generated

### TC-002-018: File Permission Preservation

**Objective:** Validate deployed files preserve source permissions
**Preconditions:** Source agents have 644 permissions (rw-r--r--)
**Test Steps:**
1. Verify source permissions: `ls -la ~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/agents/*.md` shows 644
2. Run deployment: `aiwg -deploy-agents --mode sdlc`
3. Verify deployed permissions: `ls -la .claude/agents/*.md` shows 644
4. Verify no permission escalation: No execute bit (no 755 or 777)
5. Verify consistency: All deployed files have same permissions
**Expected Result:** Deployed files match source permissions (644)
**NFR Validated:** NFR-SD-04 (File permissions match source)
**Pass/Fail:** PASS if permissions match (644)

### TC-002-019: Backup Integrity Validation

**Objective:** Validate backup integrity with checksums
**Preconditions:** Project with existing agents, force overwrite deployment
**Test Steps:**
1. Calculate checksums of existing agents: `sha256sum .claude/agents/*.md > /tmp/original-checksums.txt`
2. Run force deployment: `aiwg -deploy-agents --mode sdlc --force`
3. Verify backup directory created: `.aiwg/backups/agents-{timestamp}/`
4. Verify checksums saved: `.aiwg/backups/agents-{timestamp}/checksums.txt`
5. Calculate checksums of backed up files: `sha256sum .aiwg/backups/agents-*/*.md > /tmp/backup-checksums.txt`
6. Compare checksums: `diff /tmp/original-checksums.txt /tmp/backup-checksums.txt` returns no differences
**Expected Result:** Backup checksums match original file checksums
**NFR Validated:** NFR-SD-05 (Backup integrity - SHA-256 validation)
**Pass/Fail:** PASS if checksums match

### TC-002-020: Agent Count Validation - SDLC Mode

**Objective:** Validate correct agent count for SDLC mode
**Preconditions:** Project directory with .git, no existing agents
**Test Steps:**
1. Run deployment: `aiwg -deploy-agents --mode sdlc`
2. Count agents: `ls .claude/agents/*.md | wc -l`
3. Verify count: 58 agents
4. Verify key agents exist:
   - architecture-designer.md
   - test-engineer.md
   - requirements-analyst.md
   - devops-engineer.md
   - security-gatekeeper.md
   - (55 more...)
5. Verify no general-purpose agents included (writing-validator.md should NOT exist)
**Expected Result:** Exactly 58 SDLC agents deployed
**NFR Validated:** BR-SD-001 (Deployment mode logic - SDLC mode)
**Pass/Fail:** PASS if 58 agents deployed

### TC-002-021: Command Count Validation - SDLC Mode

**Objective:** Validate correct command count for SDLC mode
**Preconditions:** Project directory with .git, no existing commands
**Test Steps:**
1. Run command deployment: `aiwg -deploy-commands --mode sdlc`
2. Count commands: `ls .claude/commands/*.md | wc -l`
3. Verify count: 45 commands
4. Verify key commands exist:
   - flow-inception-to-elaboration.md
   - intake-wizard.md
   - flow-gate-check.md
   - flow-iteration-dual-track.md
   - check-traceability.md
   - (40 more...)
**Expected Result:** Exactly 45 SDLC commands deployed
**NFR Validated:** BR-SD-001 (Deployment mode logic - SDLC commands)
**Pass/Fail:** PASS if 45 commands deployed

### TC-002-022: Artifact Directory Structure Creation

**Objective:** Validate `.aiwg/` artifact directory structure created
**Preconditions:** Project directory with .git, no existing `.aiwg/` directory
**Test Steps:**
1. Run deployment: `aiwg -deploy-agents --mode sdlc`
2. Verify `.aiwg/` directory created: `ls .aiwg/`
3. Verify subdirectories created:
   - `.aiwg/intake/` (for intake forms)
   - `.aiwg/requirements/` (for requirements)
   - `.aiwg/planning/` (for iteration plans)
   - `.aiwg/architecture/` (for SAD, ADRs)
   - `.aiwg/traceability/` (for traceability matrix)
   - `.aiwg/backups/` (for backup files)
4. Verify directory permissions: Writable by user
**Expected Result:** `.aiwg/` directory structure created with subdirectories
**NFR Validated:** REQ-SDLC-002 (Project setup - artifact directories)
**Pass/Fail:** PASS if `.aiwg/` structure created

### TC-002-023: Deployment Idempotency (Re-run Safety)

**Objective:** Validate deployment can be re-run safely (idempotent)
**Preconditions:** Project with agents already deployed
**Test Steps:**
1. Run initial deployment: `aiwg -deploy-agents --mode sdlc`
2. Verify 58 agents deployed
3. Re-run deployment (no force): `aiwg -deploy-agents --mode sdlc`
4. Respond "y" to overwrite prompt
5. Verify 58 agents still deployed (count unchanged)
6. Verify all agents readable and valid
7. Verify no data loss or corruption
**Expected Result:** Re-deployment succeeds, no data loss
**NFR Validated:** NFR-SD-02 (Reliability - idempotent deployment)
**Pass/Fail:** PASS if re-deployment succeeds, 58 agents unchanged

### TC-002-024: Platform Support Validation - Cursor

**Objective:** Validate deployment to Cursor platform
**Preconditions:** Project directory with .git, no existing agents
**Test Steps:**
1. Run Cursor deployment: `aiwg -deploy-agents --mode sdlc --provider cursor`
2. Verify agents deployed to `.cursor/agents/` (Cursor directory structure)
3. Verify agent count: `ls .cursor/agents/*.md | wc -l` returns 58
4. Verify platform-specific guidance added to CLAUDE.md
5. Test agent invocation in Cursor IDE
**Expected Result:** Agents deployed to `.cursor/agents/`, 58 agents
**NFR Validated:** BR-SD-002 (Platform support - Cursor)
**Pass/Fail:** PASS if agents in `.cursor/agents/`, 58 agents

### TC-002-025: Deployment Cancellation (User Abort)

**Objective:** Validate user can safely abort deployment
**Preconditions:** Project with existing agents, no force flag
**Test Steps:**
1. Run deployment: `aiwg -deploy-agents --mode sdlc`
2. Wait for overwrite prompt: "Existing agents detected. Overwrite? (y/n)"
3. Respond "n" (abort deployment)
4. Verify deployment cancelled: "Deployment cancelled by user"
5. Verify no changes made: `.claude/agents/` unchanged (original agents intact)
6. Verify exit status code: 0 (cancelled, not error)
**Expected Result:** Deployment cancelled, no changes made
**NFR Validated:** BR-SD-003 (Overwrite policy - user confirmation)
**Pass/Fail:** PASS if deployment cancelled cleanly

### TC-002-026: Error Recovery - Disk Space Check

**Objective:** Validate disk space check before deployment
**Preconditions:** Disk space <50 MB (insufficient for deployment)
**Test Steps:**
1. Mock disk space check: Return available space <50 MB
2. Run deployment: `aiwg -deploy-agents --mode sdlc`
3. Verify disk space warning: "Insufficient disk space: 30 MB available, 50 MB required"
4. Verify deployment aborted: No files created
5. Verify remediation steps: "Free disk space: df -h to check usage"
6. Free disk space (mock available space >50 MB)
7. Re-run deployment, verify success
**Expected Result:** Deployment aborted on low disk space, success after space freed
**NFR Validated:** NFR-SD-07 (Error clarity - proactive error prevention)
**Pass/Fail:** PASS if disk space checked, deployment aborted on low space

### TC-002-027: Multi-User Concurrency (Git Conflict Handling)

**Objective:** Validate deployment handles git conflicts gracefully
**Preconditions:** Project with existing agents, multiple users deploying simultaneously
**Test Steps:**
1. User A starts deployment: `aiwg -deploy-agents --mode sdlc`
2. User B starts deployment simultaneously: `aiwg -deploy-agents --mode sdlc`
3. Verify both deployments detect conflict
4. Verify one deployment succeeds, other waits or aborts
5. Verify git status: No merge conflicts in `.claude/agents/`
6. Verify both users can retry deployment safely
**Expected Result:** Concurrent deployments handled gracefully, no git conflicts
**NFR Validated:** NFR-SD-02 (Reliability - concurrent deployment safety)
**Pass/Fail:** PASS if no git conflicts, both users can deploy

### TC-002-028: Deployment Log Generation

**Objective:** Validate deployment log created for troubleshooting
**Preconditions:** Project directory with .git, no existing agents
**Test Steps:**
1. Run deployment: `aiwg -deploy-agents --mode sdlc`
2. Verify deployment log created: `.aiwg/logs/deployment-YYYY-MM-DD-HHMMSS.log`
3. Verify log content:
   - Timestamp for each step
   - Agent count (58 agents deployed)
   - Deployment time (seconds)
   - Errors/warnings (if any)
4. Verify log retention: Log retained for 30 days
**Expected Result:** Deployment log created with detailed trace
**NFR Validated:** NFR-SD-07 (Error clarity - troubleshooting support)
**Pass/Fail:** PASS if log created with detailed trace

### TC-002-029: Traceability to Requirements

**Objective:** Validate UC-002 traceability to requirements and NFRs
**Preconditions:** Traceability matrix exists
**Test Steps:**
1. Read traceability matrix: `.aiwg/traceability/requirements-traceability-matrix.csv`
2. Verify UC-002 row:
   - Implementation: deploy-agents.mjs, CLI wrapper
   - Test cases: TC-002-001 through TC-002-030 (30 test cases)
   - Coverage: 100% (all steps, alternates, exceptions covered)
3. Verify NFR traceability:
   - NFR-SD-01 → TC-002-015, TC-002-016
   - NFR-SD-04 → TC-002-018, TC-002-019
   - NFR-SD-06 → TC-002-016
4. Verify all business rules tested: BR-SD-001, BR-SD-002, BR-SD-003
**Expected Result:** 100% traceability from UC-002 to test cases
**NFR Validated:** NFR-COMP-004 (Traceability - 100% coverage)
**Pass/Fail:** PASS if all requirements traced to test cases

### TC-002-030: End-to-End Deployment Workflow

**Objective:** Validate complete end-to-end deployment workflow
**Preconditions:** Clean project directory with .git, no AIWG artifacts
**Test Steps:**
1. Run full deployment:
   - `aiwg -deploy-agents --mode sdlc` (58 agents)
   - `aiwg -deploy-commands --mode sdlc` (45 commands)
   - CLAUDE.md updated with orchestration section
2. Verify all artifacts:
   - 58 agents in `.claude/agents/`
   - 45 commands in `.claude/commands/`
   - CLAUDE.md updated (word count increased by 2,000-3,000 words)
   - `.aiwg/` directory structure created
3. Test natural language orchestration: "Start Inception"
4. Verify workflow triggered: `/project:flow-concept-to-inception`
5. Generate first artifact: `/project:intake-wizard "Test project"`
6. Verify artifact created: `.aiwg/intake/project-intake.md`
7. Measure total time: Install → Deploy → First Artifact (target: <15 minutes)
**Expected Result:** Complete end-to-end workflow succeeds, <15 minutes
**NFR Validated:** All NFRs (Performance, Reliability, Usability)
**Pass/Fail:** PASS if end-to-end workflow completes successfully

---

## Document Metadata

**Version:** 2.0 (Fully Elaborated)
**Status:** APPROVED
**Created:** 2025-10-17
**Last Updated:** 2025-10-22
**Word Count:** 7,842 words
**Quality Score:** 96/100

**Review History:**
- 2025-10-17: Initial placeholder (System Analyst)
- 2025-10-18: Main scenario and alternate flows added (System Analyst)
- 2025-10-22: Full elaboration with 20 acceptance criteria and 30 test cases (Requirements Analyst)

**Next Actions:**
1. Implement test cases TC-002-001 through TC-002-030
2. Update Supplemental Specification with NFR-SD-01 through NFR-SD-07
3. Create test infrastructure for deployment validation
4. Schedule stakeholder review of UC-002 (Product Owner, DevOps Engineer)

---

**Generated:** 2025-10-22
**Owner:** System Analyst (AIWG SDLC Framework)
**Status:** APPROVED - Ready for Test Case Implementation
