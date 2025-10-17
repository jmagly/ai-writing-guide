# Warp AI Platform Integration - Feature Requirements

## Metadata

- **Feature ID**: FEAT-AIWG-002
- **Type**: Platform Integration
- **Status**: Draft
- **Owner**: Development Team
- **Created**: 2025-10-17
- **Last Updated**: 2025-10-17
- **Priority**: High
- **Complexity**: Medium
- **Related**:
  - Epic: EP-AIWG-001 (Multi-Provider Agent Support)
  - Dependencies: Current multi-provider implementation (Claude, OpenAI)
  - Related Features: FEAT-AIWG-001 (OpenAI Codex Integration)

## Executive Summary

AIWG currently supports Claude Code (.claude/) and OpenAI Codex (.codex/) agent deployment via the `aiwg -deploy-agents` command with `--provider` flag. Warp AI is a terminal-based AI platform that uses WARP.md files for project-specific rules and context. This feature extends AIWG's multi-provider support to include Warp AI, enabling developers to deploy AIWG agents and commands to Warp-enabled projects through a new `--provider warp` deployment mode.

The integration maintains existing patterns established with OpenAI support while adapting to Warp's unique WARP.md-based configuration format. This enables terminal-first development teams to leverage AIWG's 58 SDLC agents and 42+ commands within their Warp-powered workflows.

## Business Context

### Problem Statement

Warp AI users cannot currently deploy AIWG agents to their projects. Developers working in Warp terminals need SDLC framework support but lack a deployment mechanism compatible with Warp's WARP.md configuration format. This creates an adoption barrier for terminal-first development teams who prefer Warp's AI-enhanced terminal experience.

### Business Value

- **Market Expansion**: Capture Warp AI user segment (growing terminal-based AI IDE market)
- **Competitive Parity**: Match OpenAI Codex support with equivalent Warp integration
- **User Retention**: Prevent AIWG users from abandoning framework when switching to Warp
- **Developer Experience**: Provide consistent AIWG deployment across all major AI platforms

### Success Metrics

- Deploy to Warp projects with <5 second command execution time
- Zero errors in WARP.md generation for all 58 agents
- 90% user satisfaction rating for Warp deployment experience
- Support both general-purpose and SDLC agent modes

## Functional Requirements

### FR-001: CLI Command Syntax

**Priority**: Critical

**Description**: Extend `aiwg -deploy-agents` command to support Warp AI platform as a provider option.

**Acceptance Criteria**:

- [ ] `aiwg -deploy-agents --provider warp` deploys agents to Warp format
- [ ] `aiwg -deploy-agents --provider warp --mode general` deploys only general agents
- [ ] `aiwg -deploy-agents --provider warp --mode sdlc` deploys only SDLC agents
- [ ] `aiwg -deploy-agents --provider warp --mode both` deploys all agents (default)
- [ ] `--dry-run` flag shows deployment plan without writing files
- [ ] `--force` flag overwrites existing WARP.md files
- [ ] `--target <path>` specifies custom project directory
- [ ] Command returns exit code 0 on success, non-zero on failure

**Technical Notes**:

- Follows existing provider pattern: `claude` → `.claude/agents/*.md`, `openai` → `.codex/agents/*.md`
- Warp provider should create `WARP.md` in project root or `.warp/` directory (TBD based on Warp conventions)
- Model parameter flags (`--reasoning-model`, `--coding-model`, `--efficiency-model`) should apply to Warp deployment

### FR-002: WARP.md File Generation

**Priority**: Critical

**Description**: Generate valid WARP.md configuration files compatible with Warp AI's project rules format.

**Acceptance Criteria**:

- [ ] Generate WARP.md file in project root (or appropriate Warp config location)
- [ ] WARP.md contains all deployed agent definitions in Warp-compatible format
- [ ] Agent names, descriptions, and instructions are preserved from source
- [ ] Model assignments (reasoning, coding, efficiency) are correctly mapped
- [ ] File is UTF-8 encoded with consistent line endings (LF)
- [ ] Generated files pass Warp AI validation (if Warp provides linting tools)
- [ ] Multiple agents aggregate into single WARP.md or separate files based on Warp best practices

**Technical Notes**:

- Research Warp AI documentation for WARP.md format specification
- Determine if Warp supports multiple WARP.md files or single aggregated file
- Ensure frontmatter/metadata compatibility with Warp's parsing engine

### FR-003: Agent Format Conversion

**Priority**: Critical

**Description**: Transform AIWG agent markdown files from Claude/OpenAI format to Warp AI format.

**Acceptance Criteria**:

- [ ] Extract agent metadata (name, description, model, tools) from YAML frontmatter
- [ ] Convert agent instructions to Warp-compatible markdown format
- [ ] Preserve agent role definitions and process descriptions
- [ ] Map tool access permissions to Warp's capability model
- [ ] Convert model references (opus → warp-reasoning, sonnet → warp-coding, haiku → warp-efficiency)
- [ ] Maintain agent behavior consistency across platforms
- [ ] Handle edge cases: missing metadata, invalid YAML, unsupported tools

**Technical Notes**:

- Implement transformer function similar to `transformIfNeeded()` in deploy-agents.mjs
- Create Warp-specific model mapping table (may need Warp documentation review)
- Consider if Warp uses different tool permission model than Claude/OpenAI

### FR-004: Command Deployment Strategy

**Priority**: High

**Description**: Deploy AIWG slash commands to Warp projects in a format compatible with Warp's command system.

**Acceptance Criteria**:

- [ ] `aiwg -deploy-agents --provider warp --deploy-commands` deploys commands
- [ ] `aiwg -deploy-agents --provider warp --commands-only` deploys only commands (no agents)
- [ ] Commands deploy to appropriate Warp directory structure
- [ ] Command metadata (parameters, descriptions) preserved
- [ ] Recursive command deployment handles subdirectories (e.g., commands/flows/)
- [ ] Skip excluded files (README.md, manifest.md, DEVELOPMENT_GUIDE.md)
- [ ] Deploy both general-purpose and SDLC commands based on `--mode` flag

**Technical Notes**:

- Investigate if Warp supports slash commands or requires alternative invocation pattern
- May need to convert `/project:command-name` syntax to Warp-native format
- Verify if Warp commands support parameters, flags, and subcommands

### FR-005: Multi-Provider Compatibility

**Priority**: High

**Description**: Ensure Warp integration does not break existing Claude and OpenAI deployments.

**Acceptance Criteria**:

- [ ] Existing `--provider claude` deployments unchanged
- [ ] Existing `--provider openai` deployments unchanged
- [ ] Code reuses existing `deployFiles()`, `listMdFiles()`, and `transformIfNeeded()` functions
- [ ] Provider validation rejects invalid provider names with helpful error message
- [ ] Default provider remains `claude` for backward compatibility
- [ ] All providers support same flags: `--mode`, `--dry-run`, `--force`, `--target`

**Technical Notes**:

- Add 'warp' to allowed provider list in `parseArgs()`
- Extend model defaults object to include Warp model names
- Add Warp destination directory logic to deployment flow

### FR-006: Model Assignment and Overrides

**Priority**: Medium

**Description**: Support Warp-specific model assignments with override flags.

**Acceptance Criteria**:

- [ ] Default Warp models defined for reasoning, coding, efficiency tiers
- [ ] `--reasoning-model <name>` overrides Warp reasoning model
- [ ] `--coding-model <name>` overrides Warp coding model
- [ ] `--efficiency-model <name>` overrides Warp efficiency model
- [ ] Model assignments apply to all deployed agents
- [ ] Invalid model names trigger warning (if Warp provides model list API)
- [ ] Documentation includes Warp model naming conventions

**Technical Notes**:

- Research Warp AI model naming: does it use GPT-style, Claude-style, or custom names?
- Determine default model tiers for Warp (similar to Claude: opus/sonnet/haiku)
- Update `replaceModelFrontmatter()` to handle Warp model format

### FR-007: Dry-Run and Validation

**Priority**: Medium

**Description**: Provide dry-run mode to preview Warp deployment without writing files.

**Acceptance Criteria**:

- [ ] `--dry-run` flag shows all files that would be created/modified
- [ ] Dry-run displays WARP.md content preview (first 500 chars)
- [ ] Dry-run reports agent count, command count, destination paths
- [ ] Dry-run validates WARP.md format before showing preview
- [ ] Dry-run detects conflicts with existing WARP.md files
- [ ] Exit code 0 for valid deployment plan, non-zero for validation errors

**Technical Notes**:

- Extend existing dry-run logic in `deployFiles()` and `writeFile()`
- Add Warp-specific validation step (format check, syntax validation)
- Consider adding `--validate-only` flag for strict validation without deployment

### FR-008: Error Handling and User Feedback

**Priority**: High

**Description**: Provide clear error messages and user feedback throughout deployment process.

**Acceptance Criteria**:

- [ ] Missing Warp installation detected with helpful error message
- [ ] Invalid WARP.md format errors include line numbers and fix suggestions
- [ ] File permission errors show actionable resolution steps
- [ ] Deployment progress shows: agent count, file paths, success/skip/error counts
- [ ] Summary report at end: X agents deployed, Y commands deployed, Z files skipped
- [ ] Errors do not leave project in inconsistent state (atomic deployment or rollback)

**Technical Notes**:

- Add pre-deployment validation phase
- Implement transaction-like deployment (write to temp, validate, then move)
- Log errors to console with color coding (red = error, yellow = warning, green = success)

### FR-009: Documentation and Help

**Priority**: Medium

**Description**: Provide comprehensive documentation for Warp deployment.

**Acceptance Criteria**:

- [ ] `aiwg -help` includes Warp provider in provider list
- [ ] README.md updated with Warp deployment examples
- [ ] CLAUDE.md includes Warp-specific deployment instructions
- [ ] Create `warp-integration.md` guide in documentation
- [ ] Document Warp model naming conventions
- [ ] Include troubleshooting section for common Warp deployment issues
- [ ] Provide before/after examples of WARP.md files

**Technical Notes**:

- Update `tools/agents/README.md` with Warp section
- Add Warp example to `agentic/code/frameworks/sdlc-complete/agents/README.md`
- Create `agentic/code/frameworks/sdlc-complete/agents/warp-compat.md` (similar to openai-compat.md)

## Non-Functional Requirements

### NFR-001: Performance

**Target**: Deploy 58 agents + 42 commands in <5 seconds on standard development machine

**Metrics**:

- Agent file transformation: <50ms per agent
- WARP.md generation: <200ms total
- File I/O operations: <2 seconds total
- No blocking operations in main deployment loop

**Acceptance Criteria**:

- [ ] Deployment completes in <5s for all agents + commands
- [ ] Memory usage <100MB during deployment
- [ ] CPU usage peaks at <50% on single core

### NFR-002: Compatibility

**Target**: Support Warp AI versions X.Y.Z and above (TBD based on Warp release cycle)

**Acceptance Criteria**:

- [ ] Deployment works on macOS, Linux, Windows (if Warp supports all platforms)
- [ ] Compatible with Node.js 18+, 20+ (matching AIWG system requirements)
- [ ] Generated WARP.md files validated against Warp AI spec (if available)
- [ ] No dependencies on Warp CLI being installed (graceful detection)

### NFR-003: Maintainability

**Target**: Reuse 80%+ of existing deployment codebase

**Acceptance Criteria**:

- [ ] Warp integration adds <300 lines of code
- [ ] No duplication of deployment logic (reuse `deployFiles()`, `listMdFiles()`, etc.)
- [ ] Provider-specific logic isolated in dedicated functions
- [ ] Configuration externalized (model mappings in constants, not hardcoded)
- [ ] Code follows existing style guide (ESLint, Prettier, if applicable)

### NFR-004: Testability

**Target**: 90% code coverage for Warp-specific deployment logic

**Acceptance Criteria**:

- [ ] Unit tests for WARP.md generation
- [ ] Unit tests for Warp model transformation
- [ ] Integration tests for full deployment flow
- [ ] Test fixtures include sample agents and expected WARP.md output
- [ ] Edge case tests: empty agents, invalid metadata, permission conflicts

### NFR-005: Usability

**Target**: Zero-knowledge deployment for users familiar with Claude/OpenAI deployment

**Acceptance Criteria**:

- [ ] Single command deploys to Warp: `aiwg -deploy-agents --provider warp`
- [ ] Error messages guide users to resolution (no cryptic stack traces)
- [ ] Deployment summary provides actionable next steps
- [ ] Documentation accessible from command output (link to warp-integration.md)
- [ ] Consistent flag naming across all providers (no Warp-specific exceptions)

### NFR-006: Security

**Target**: No security vulnerabilities introduced by Warp integration

**Acceptance Criteria**:

- [ ] No arbitrary file writes outside project directory
- [ ] Path traversal attacks mitigated (validate `--target` path)
- [ ] No shell injection vulnerabilities in WARP.md generation
- [ ] File permissions preserve user/group settings (no overly permissive 777)
- [ ] No sensitive data logged (API keys, credentials)

### NFR-007: Scalability

**Target**: Support future AIWG growth to 100+ agents without performance degradation

**Acceptance Criteria**:

- [ ] Deployment time scales linearly with agent count (O(n), not O(n^2))
- [ ] Memory usage remains constant regardless of agent count
- [ ] WARP.md aggregation handles 100+ agents without truncation
- [ ] No hardcoded limits on agent count, file size, or command count

## User Stories

### US-001: Solo Developer Deploys to Warp

**As a** solo developer using Warp terminal
**I want** to deploy AIWG agents to my project with a single command
**So that** I can use SDLC framework within my Warp-powered workflow

**Acceptance Criteria**:

**Given** I have AIWG installed and a Warp-enabled project
**When** I run `aiwg -deploy-agents --provider warp`
**Then** all agents deploy to WARP.md in my project root
**And** I see confirmation message with deployment summary
**And** Warp AI recognizes the deployed agents

**Edge Cases**:

- **Given** WARP.md already exists
  **When** I deploy without `--force` flag
  **Then** deployment skips existing file and warns user
- **Given** I don't have write permissions in project directory
  **When** I run deployment
  **Then** clear error message explains permission issue and resolution

**Priority**: Critical
**Complexity**: Low

### US-002: Team Lead Deploys SDLC Agents to Warp

**As a** team lead managing a software project
**I want** to deploy only SDLC framework agents to my team's Warp environment
**So that** my team follows standardized SDLC workflows in terminal

**Acceptance Criteria**:

**Given** I have a team project repository with Warp enabled
**When** I run `aiwg -deploy-agents --provider warp --mode sdlc`
**Then** 58 SDLC agents deploy to WARP.md
**And** general-purpose agents are excluded
**And** team members can invoke SDLC commands in Warp

**Edge Cases**:

- **Given** Some team members use Claude, others use Warp
  **When** I deploy to both providers
  **Then** agents remain consistent across platforms (same behavior)
- **Given** SDLC framework updates with new agents
  **When** I re-deploy with `--force`
  **Then** WARP.md updates with new agents without losing customizations

**Priority**: High
**Complexity**: Medium

### US-003: Developer Migrates from Claude to Warp

**As a** developer switching from Claude Code to Warp AI
**I want** to migrate my AIWG agents from `.claude/` to `WARP.md`
**So that** I maintain my SDLC workflows without manual reconfiguration

**Acceptance Criteria**:

**Given** I have existing `.claude/agents/*.md` files
**When** I run `aiwg -deploy-agents --provider warp --force`
**Then** all Claude agents convert to Warp format
**And** agent behavior remains identical
**And** model assignments map correctly (opus → warp-reasoning, etc.)

**Edge Cases**:

- **Given** I have custom agent modifications in `.claude/agents/`
  **When** I deploy to Warp
  **Then** system warns about overwriting customizations
  **And** offers `--dry-run` to preview changes
- **Given** I want to support both Claude and Warp simultaneously
  **When** I deploy to both providers
  **Then** agents coexist without conflicts

**Priority**: High
**Complexity**: Medium

### US-004: Open Source Contributor Tests Warp Integration

**As an** AIWG contributor
**I want** to run automated tests for Warp deployment
**So that** I can verify Warp integration works correctly before merging PR

**Acceptance Criteria**:

**Given** I have cloned AIWG repository
**When** I run `npm test -- warp-integration`
**Then** tests validate WARP.md generation, agent transformation, and deployment
**And** tests pass on macOS, Linux, Windows (if Warp supports all)
**And** code coverage reports show >90% for Warp-specific code

**Edge Cases**:

- **Given** Warp API changes in new version
  **When** tests run
  **Then** failures pinpoint exact compatibility issues
- **Given** Contributor doesn't have Warp installed
  **When** tests run
  **Then** tests skip Warp-specific integration tests (unit tests still run)

**Priority**: Medium
**Complexity**: High

### US-005: DevOps Engineer Automates Warp Deployment in CI/CD

**As a** DevOps engineer
**I want** to automate AIWG Warp deployment in CI/CD pipeline
**So that** every project repository has up-to-date agents without manual intervention

**Acceptance Criteria**:

**Given** I have GitHub Actions workflow
**When** pipeline runs `aiwg -deploy-agents --provider warp --target ./project`
**Then** deployment succeeds in CI environment
**And** commit includes updated WARP.md
**And** deployment is idempotent (re-running doesn't cause changes)

**Edge Cases**:

- **Given** CI environment has read-only filesystem
  **When** deployment runs
  **Then** deployment fails gracefully with actionable error
- **Given** Multiple projects deploy in parallel
  **When** deployments run concurrently
  **Then** no file conflicts or race conditions occur

**Priority**: Medium
**Complexity**: Medium

## Technical Architecture

### Component Overview

```text
aiwg CLI
   |
   v
tools/agents/deploy-agents.mjs
   |
   +---> parseArgs() [add 'warp' provider]
   |
   +---> deployFiles() [reuse existing]
   |
   +---> transformIfNeeded() [add Warp transformer]
   |        |
   |        v
   |     warpTransformer()
   |        - extractMetadata()
   |        - convertInstructions()
   |        - mapModels()
   |        - formatWarpMd()
   |
   +---> writeWarpMd() [new function]
          - aggregate agents
          - validate format
          - write to project root or .warp/
```

### Data Flow

```text
1. User runs: aiwg -deploy-agents --provider warp --mode sdlc

2. CLI parses arguments:
   - provider: 'warp'
   - mode: 'sdlc'
   - target: process.cwd()

3. Script reads source agents:
   - agents/*.md (if mode=general or both)
   - agentic/code/frameworks/sdlc-complete/agents/*.md (if mode=sdlc or both)

4. For each agent file:
   - Read markdown content
   - Extract YAML frontmatter (name, description, model, tools)
   - Transform to Warp format (warpTransformer)
   - Add to aggregation buffer

5. Generate WARP.md:
   - Combine all transformed agents
   - Add Warp-specific header/footer
   - Validate format
   - Write to target/WARP.md

6. Generate commands (if --deploy-commands):
   - Similar transformation process
   - Output to appropriate Warp command location

7. Report results:
   - X agents deployed
   - Y commands deployed
   - Z files skipped
   - Path to WARP.md
```

### File Structure

**Input** (existing AIWG agents):

```text
agents/
├── writing-validator.md
├── prompt-optimizer.md
└── content-diversifier.md

agentic/code/frameworks/sdlc-complete/agents/
├── requirements-analyst.md
├── architecture-designer.md
├── test-engineer.md
└── ... (55 more)
```

**Output** (Warp deployment):

```text
project-root/
└── WARP.md  (or .warp/WARP.md if Warp uses .warp/ directory)
    - Aggregated agent definitions
    - Warp-specific metadata
    - Model assignments
```

### Model Mapping

| Claude Model | OpenAI Model | Warp Model (TBD) |
|--------------|--------------|------------------|
| opus | gpt-5 | warp-reasoning (placeholder) |
| sonnet | gpt-5-codex | warp-coding (placeholder) |
| haiku | gpt-4o-mini | warp-efficiency (placeholder) |

**Note**: Warp model names are placeholders pending Warp AI documentation review.

## Assumptions and Constraints

### Assumptions

1. **Warp supports project-level configuration files** (WARP.md or similar)
   - *Impact if invalid*: May need to use different configuration mechanism (environment variables, CLI flags)

2. **Warp AI markdown format is compatible with Claude/OpenAI agent format**
   - *Impact if invalid*: Significant transformer logic required, potential loss of agent features

3. **Warp supports tool/capability assignment for agents**
   - *Impact if invalid*: May need to limit tool access or use Warp's permission model

4. **Warp uses model naming similar to Claude or OpenAI**
   - *Impact if invalid*: Model mapping table needs adjustment, user documentation critical

5. **Warp installation is optional for deployment** (deployment script doesn't require Warp CLI)
   - *Impact if invalid*: Add Warp CLI dependency check, installation instructions

6. **Single WARP.md file can contain multiple agent definitions**
   - *Impact if invalid*: Need per-agent file generation (similar to `.claude/agents/*.md` pattern)

7. **Warp supports slash commands or equivalent invocation pattern**
   - *Impact if invalid*: Command deployment may require alternative approach (scripts, aliases)

### Constraints

1. **Technical Constraint**: Must maintain backward compatibility with Claude and OpenAI deployments
   - *Mitigation*: Isolate Warp-specific logic, extensive regression testing

2. **Technical Constraint**: No breaking changes to `deploy-agents.mjs` API (flags, behavior)
   - *Mitigation*: Additive changes only, default to Claude provider if unspecified

3. **Resource Constraint**: Limited access to Warp AI internal documentation (if not publicly available)
   - *Mitigation*: Reverse-engineer from Warp examples, community forums, or request documentation access

4. **Platform Constraint**: Warp may not support all platforms (Windows, Linux, macOS)
   - *Mitigation*: Document platform limitations, graceful degradation if Warp unavailable

5. **Business Constraint**: Warp AI is actively developed - breaking changes possible
   - *Mitigation*: Version compatibility matrix, CI tests against multiple Warp versions

6. **Legal Constraint**: Warp API/format may have usage restrictions or licensing terms
   - *Mitigation*: Review Warp terms of service, ensure AIWG integration complies

## Dependencies

### Upstream Dependencies

**DEP-001: Warp AI Platform Documentation**

- **Type**: External documentation
- **Required**: WARP.md format specification, model naming conventions, configuration options
- **Status**: Needs research
- **Blocking**: FR-002, FR-003, FR-006
- **Mitigation**: Use community examples, reverse-engineer format, contact Warp team

**DEP-002: Existing Multi-Provider Implementation**

- **Type**: Internal codebase
- **Required**: `deploy-agents.mjs` (Claude, OpenAI support)
- **Status**: Complete
- **Blocking**: None (already exists)
- **Notes**: Foundation for Warp integration, well-tested codebase

**DEP-003: AIWG Agent Library**

- **Type**: Internal content
- **Required**: 58 SDLC agents + 3 general-purpose agents in markdown format
- **Status**: Complete
- **Blocking**: None (already exists)
- **Notes**: Source content for transformation

### Downstream Impact

**IMPACT-001: Documentation Updates**

- **Affected**: README.md, CLAUDE.md, agents/README.md, USAGE_GUIDE.md
- **Nature**: Additive (new sections on Warp deployment)
- **Effort**: ~2 hours

**IMPACT-002: CI/CD Pipeline**

- **Affected**: GitHub Actions workflows (if testing multi-provider deployments)
- **Nature**: New test suite for Warp integration
- **Effort**: ~4 hours

**IMPACT-003: Example Projects**

- **Affected**: Sample projects using AIWG
- **Nature**: Add Warp deployment examples
- **Effort**: ~1 hour

### External Dependencies

**EXT-001: Warp AI Terminal**

- **System**: Warp terminal application
- **Version**: TBD (research latest stable version)
- **Nature**: Optional (deployment works without Warp installed, but WARP.md won't be used)
- **Impact**: If Warp changes WARP.md format, breaking changes possible

**EXT-002: Node.js Runtime**

- **System**: Node.js 18+ or 20+
- **Version**: Aligned with existing AIWG requirements
- **Nature**: Required for deployment script execution
- **Impact**: No change from current requirements

## Risk Analysis

| Risk | Probability | Impact | Mitigation |
|------|------------|--------|------------|
| **Warp WARP.md format incompatible with Claude/OpenAI agent format** | Medium | High | Research Warp docs early, prototype transformer, contact Warp team for format spec |
| **Warp model naming differs significantly from Claude/OpenAI** | High | Medium | Externalize model mapping to config file, allow user overrides via flags |
| **Warp platform changes break integration** | Medium | Medium | Version compatibility matrix, CI tests against multiple Warp versions, community monitoring |
| **Limited Warp documentation/examples available** | High | Medium | Reverse-engineer from public projects, Warp community forums, submit documentation request |
| **Tool/capability model incompatible with Claude tools** | Low | High | Fallback to basic agent definitions, document limitations, feature parity analysis |
| **Performance degradation with 58+ agents in single WARP.md** | Low | Medium | Load testing, optimize aggregation logic, consider chunking if needed |
| **User confusion between Claude/OpenAI/Warp deployments** | Medium | Low | Clear documentation, consistent CLI interface, examples for each provider |
| **Warp not available on all platforms (Windows/Linux)** | Medium | Medium | Document platform support, graceful error message if Warp unsupported |

## Implementation Estimate

### Complexity Assessment

**Overall Complexity**: Medium

**Factors**:

- **Well-understood pattern**: Follows existing OpenAI integration (reference implementation available)
- **Some unknowns**: Warp WARP.md format requires research, model naming TBD
- **Moderate integration**: Extends existing codebase, minimal refactoring needed
- **Known technology**: Node.js, markdown processing, file I/O (familiar territory)

### Effort Estimation

**Base Effort**: 5 feature points × 4 hours/point = 20 hours

**Adjustments**:

- **Risk Factor** (+20%): Warp format unknowns, potential API changes
- **Integration Factor** (+10%): Coordination with existing multi-provider architecture
- **Adjusted Effort**: 20 × (1 + 0.20 + 0.10) = 26 hours

**Buffer** (30%): 26 × 0.30 = 7.8 hours

**Total Estimate**: 34 hours (~4-5 days for one developer)

### Task Breakdown

| Task | Estimated Hours | Dependencies |
|------|----------------|--------------|
| **Research Warp AI documentation** | 4h | None |
| **Design WARP.md transformer** | 3h | Research complete |
| **Implement Warp provider in deploy-agents.mjs** | 6h | Transformer design |
| **Implement WARP.md generation** | 5h | Provider implementation |
| **Add Warp model mapping** | 2h | Transformer implementation |
| **Unit tests for Warp transformer** | 4h | Implementation complete |
| **Integration tests for full deployment** | 3h | Implementation complete |
| **Update documentation (README, CLAUDE.md, etc.)** | 3h | Implementation complete |
| **Create warp-compat.md guide** | 2h | Documentation updates |
| **Manual testing on sample projects** | 2h | All implementation complete |

**Total**: 34 hours

### Recommended Team

- **Developer**: 1 (primary implementer)
- **Code Reviewer**: 1 (existing AIWG maintainer for consistency review)
- **Tester**: 0.5 (manual testing, edge case validation)

### Critical Dependencies

1. **Warp AI format specification** (blocks implementation start)
2. **Access to Warp terminal for testing** (blocks integration testing)
3. **Code review availability** (blocks merge to main)

## Open Questions

### Format and Configuration

1. **Where does Warp expect configuration files?**
   - Project root `WARP.md`?
   - `.warp/` directory?
   - User home directory `~/.warp/`?
   - **Resolution needed**: Review Warp docs, test with sample project

2. **Does Warp support multiple agent definitions in single file?**
   - If yes: aggregate to WARP.md
   - If no: create `.warp/agents/*.md` structure
   - **Resolution needed**: Format specification review

3. **What is Warp's markdown parsing engine?**
   - CommonMark, GFM, custom?
   - Does it support YAML frontmatter?
   - **Resolution needed**: Test parser capabilities

### Model and Capability Mapping

4. **What model naming convention does Warp use?**
   - Claude-style (opus/sonnet/haiku)?
   - OpenAI-style (gpt-4, gpt-3.5)?
   - Custom (warp-large, warp-small)?
   - **Resolution needed**: Model documentation or API reference

5. **How does Warp handle tool/capability permissions?**
   - Similar to Claude tools (Read, Write, Bash, etc.)?
   - Different capability model?
   - No tool restrictions?
   - **Resolution needed**: Capability/permission documentation

### Deployment Strategy

6. **Should Warp deployment use single WARP.md or multiple files?**
   - Single file: easier management, potential size limits
   - Multiple files: better organization, potential discovery issues
   - **Resolution needed**: Warp best practices, user preference research

7. **How should command deployment work for Warp?**
   - Does Warp support slash commands?
   - Alternative invocation (terminal commands, aliases)?
   - **Resolution needed**: Command system documentation

### Versioning and Compatibility

8. **What Warp versions should AIWG support?**
   - Latest stable only?
   - Last 2-3 versions?
   - **Resolution needed**: Warp release cycle analysis, user survey

9. **How should we handle Warp API breaking changes?**
   - Version-specific transformers?
   - Deprecation warnings?
   - **Resolution needed**: Versioning strategy, community feedback

### User Experience

10. **Should `--provider warp` be case-insensitive?**
    - Currently `--provider openai` accepts lowercase only
    - Should we accept `Warp`, `WARP`, `warp`?
    - **Resolution needed**: UX consistency review

11. **What should happen if Warp and Claude agents coexist in same project?**
    - Allow both (user manages manually)?
    - Warn about potential conflicts?
    - Mutually exclusive?
    - **Resolution needed**: Multi-provider usage patterns research

## Next Steps

### Immediate Actions (Week 1)

1. **Research Warp AI documentation**
   - Find WARP.md format specification
   - Document model naming conventions
   - Identify configuration file locations
   - Capture examples of Warp agent definitions

2. **Prototype WARP.md transformer**
   - Create standalone script to convert one agent
   - Validate output format with Warp terminal (if available)
   - Identify edge cases and format limitations

3. **Review existing OpenAI integration**
   - Study `openai-compat.md` for pattern guidance
   - Analyze `transformIfNeeded()` for reuse opportunities
   - Document differences between OpenAI and anticipated Warp integration

### Follow-Up Actions (Week 2-3)

4. **Implement Warp provider in deploy-agents.mjs**
   - Add 'warp' to provider list
   - Implement Warp model mapping
   - Create Warp-specific destination directory logic

5. **Write comprehensive tests**
   - Unit tests for transformer
   - Integration tests for deployment
   - Edge case tests (missing metadata, invalid YAML)

6. **Update documentation**
   - README.md with Warp examples
   - Create warp-compat.md guide
   - Update CLAUDE.md with Warp orchestration notes

### Long-Term Actions (Week 4+)

7. **Community validation**
   - Share with Warp AI users for feedback
   - Collect real-world usage data
   - Iterate based on user reports

8. **Performance optimization**
   - Benchmark deployment with 100+ agents
   - Optimize WARP.md generation if needed
   - Profile memory usage

9. **Maintenance and monitoring**
   - Subscribe to Warp release notes
   - Monitor Warp community for format changes
   - Update integration as Warp evolves

## Success Criteria

### Definition of Ready

Before implementation begins:

- [ ] Warp WARP.md format specification documented
- [ ] Model naming conventions researched and documented
- [ ] Configuration file location confirmed (project root vs .warp/)
- [ ] Tool/capability permission model understood
- [ ] Team consensus on single vs. multiple file deployment strategy

### Definition of Done

Implementation is complete when:

- [ ] All functional requirements (FR-001 to FR-009) met
- [ ] All non-functional requirements (NFR-001 to NFR-007) validated
- [ ] All user stories (US-001 to US-005) tested and accepted
- [ ] Unit test coverage >90% for Warp-specific code
- [ ] Integration tests pass on macOS, Linux (Windows if Warp supports)
- [ ] Documentation complete (README, CLAUDE.md, warp-compat.md)
- [ ] Manual testing on 3+ sample projects successful
- [ ] Code review approved by AIWG maintainer
- [ ] No high or critical severity issues remain
- [ ] Performance targets met (<5s deployment for 58 agents)
- [ ] Backward compatibility with Claude/OpenAI verified (regression tests pass)

## Appendices

### Appendix A: Warp AI Platform Overview

**Warp AI** is a terminal application with built-in AI capabilities. It enhances developer workflows with:

- AI-powered command suggestions
- Natural language to terminal command translation
- Project-specific context via WARP.md configuration
- Integrated terminal and AI assistant

**Key Differentiators**:

- Terminal-first (not IDE-based like Claude Code)
- WARP.md for project rules (similar to CLAUDE.md but terminal-focused)
- Growing user base in terminal power-user community

### Appendix B: Reference Implementations

**OpenAI Integration** (existing):

- File: `tools/agents/deploy-agents.mjs` (lines 144-156)
- Model mapping: `{ reasoning: 'gpt-5', coding: 'gpt-5-codex', efficiency: 'gpt-4o-mini' }`
- Destination: `.codex/agents/`
- Aggregation option: `--as-agents-md` for single AGENTS.md file

**Claude Integration** (existing):

- Model mapping: `{ reasoning: 'opus', coding: 'sonnet', efficiency: 'haiku' }`
- Destination: `.claude/agents/`
- Per-agent files (no aggregation)

**Warp Integration** (proposed):

- Model mapping: TBD (pending Warp docs)
- Destination: `WARP.md` or `.warp/` (TBD)
- Aggregation: TBD (single vs. multiple files)

### Appendix C: Example WARP.md Format (Hypothetical)

**Note**: This is speculative pending Warp documentation research.

```markdown
# Project AI Rules (WARP.md)

## Agent: Requirements Analyst

**Model**: warp-coding
**Tools**: Read, Write, Bash
**Description**: Transforms vague user requests into detailed technical requirements.

### Instructions

You are a Requirements Analyst specializing in transforming vague user requests into detailed technical requirements...

[Full agent instructions]

---

## Agent: Architecture Designer

**Model**: warp-reasoning
**Tools**: Read, Write, Bash, WebFetch
**Description**: Creates comprehensive software architecture documentation.

### Instructions

[Full agent instructions]

---

[Additional agents...]
```

### Appendix D: CLI Usage Examples

**Basic Warp Deployment**:

```bash
# Deploy all agents to Warp format
aiwg -deploy-agents --provider warp

# Deploy only SDLC agents
aiwg -deploy-agents --provider warp --mode sdlc

# Deploy with custom models
aiwg -deploy-agents --provider warp \
  --reasoning-model warp-large \
  --coding-model warp-standard \
  --efficiency-model warp-fast

# Dry-run to preview deployment
aiwg -deploy-agents --provider warp --dry-run

# Force overwrite existing WARP.md
aiwg -deploy-agents --provider warp --force

# Deploy to specific directory
aiwg -deploy-agents --provider warp --target ~/projects/my-app

# Deploy commands in addition to agents
aiwg -deploy-agents --provider warp --deploy-commands

# Deploy only commands (no agents)
aiwg -deploy-agents --provider warp --commands-only
```

**Multi-Provider Deployment**:

```bash
# Support both Claude and Warp in same project
aiwg -deploy-agents --provider claude
aiwg -deploy-agents --provider warp

# Compare deployments with dry-run
aiwg -deploy-agents --provider claude --dry-run
aiwg -deploy-agents --provider warp --dry-run
```

## Version Control

**Version**: 1.0
**Status**: Draft
**Last Updated**: 2025-10-17
**Owner**: Development Team
**Reviewers**: TBD
**Change History**:

- 2025-10-17: Initial requirements document created (v1.0)
