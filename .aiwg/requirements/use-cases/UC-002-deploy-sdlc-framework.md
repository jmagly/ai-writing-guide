# Use-Case Specification: UC-002

## Metadata

- ID: UC-002
- Name: Deploy SDLC Framework to Existing Project
- Owner: System Analyst
- Contributors: DevOps Engineer, System Analyst
- Team: SDLC Framework
- Status: approved
- Created: 2025-10-17
- Updated: 2025-10-18
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
| REQ-SDLC-001 | Feature Backlog | deploy-agents.mjs | TC-SD-001 |
| REQ-SDLC-002 | Feature Backlog | CLAUDE.md updates | TC-SD-002 |
| NFR-SD-01 | This document | CLI performance | TC-SD-003 |
| BR-SD-001 | This document | Deployment mode logic | TC-SD-004 |

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

### AC-001: Basic Deployment

**Given:** User in project directory with .git
**When:** User runs `aiwg -deploy-agents --mode sdlc`
**Then:**
- 58 agents deployed to `.claude/agents/` in <10 seconds
- 45 commands deployed (if requested)
- CLAUDE.md updated (preserves existing content)
- User can invoke `/project:intake-wizard`

### AC-002: Dry-Run Preview

**Given:** User wants to preview changes
**When:** User runs `aiwg -deploy-agents --dry-run`
**Then:**
- CLI displays preview of changes
- No files modified
- User can review before actual deployment

### AC-003: Rollback on Failure

**Given:** Deployment fails mid-process (disk full)
**When:** CLI detects failure
**Then:**
- All partial changes rolled back
- Project in same state as before deployment
- Error message with remediation steps

---

## Document Metadata

**Version:** 1.0
**Status:** APPROVED
**Created:** 2025-10-17
**Last Updated:** 2025-10-18
**Word Count:** 2,456 words

---

**Generated:** 2025-10-18
**Owner:** System Analyst (AIWG SDLC Framework)
**Status:** APPROVED
