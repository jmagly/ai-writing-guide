# Use-Case Brief

## Metadata

- ID: UC-002
- Owner: Requirements Analyst
- Contributors: System Analyst, DevOps Engineer
- Reviewers: Requirements Reviewer
- Team: SDLC Framework
- Stakeholders: Agentic Developers, Solo Developers, Small Teams
- Status: approved
- Dates: created 2025-10-17 / updated 2025-10-17 / due N/A
- Related: REQ-SDLC-001 (Agent Deployment), REQ-SDLC-002 (Project Setup)
- Links: /tools/agents/deploy-agents.mjs, /tools/install/install.sh

## Related templates

- agentic/code/frameworks/sdlc-complete/templates/ (156 templates)
- agentic/code/frameworks/sdlc-complete/agents/ (58 SDLC agents)

## Identifier

- ID: UC-002
- Name: Deploy SDLC Framework to Existing Project

## Summary

Developers using Claude Code or Cursor for project work need structured SDLC guidance without manual template copying. The aiwg CLI provides one-command deployment of 58 specialized SDLC agents and 45 slash commands to existing projects, enabling natural language orchestration ("Start Inception") instead of fragmented chat-based workflows.

## Actors & Preconditions

- Primary actor(s): Agentic developer, solo developer, team lead, project manager
- Preconditions:
  - Existing project directory with .git repository
  - aiwg CLI installed (`curl -fsSL https://raw.githubusercontent.com/jmagly/ai-writing-guide/refs/heads/main/tools/install/install.sh | bash`)
  - Node.js >=18.20.8 available (optional, for deployment tooling)
  - Claude Code, Cursor, or compatible LLM coding assistant available

## Main Success Scenario

1. User navigates to existing project directory: `cd /path/to/project`
2. User runs deployment command: `aiwg -deploy-agents --mode sdlc`
3. CLI validates project directory (checks for .git, warns if .claude/ already exists)
4. CLI copies 58 SDLC agents to `.claude/agents/` (architecture-designer, test-engineer, requirements-analyst, etc.)
5. User optionally deploys slash commands: `aiwg -deploy-commands --mode sdlc`
6. CLI copies 45 SDLC commands to `.claude/commands/` (flow-inception-to-elaboration, intake-wizard, etc.)
7. User updates CLAUDE.md with orchestration prompts: `/aiwg-setup-project` (preserves existing content, adds AIWG orchestration section)
8. User tests natural language orchestration: "Start Inception" → Claude Code triggers flow-concept-to-inception
9. User generates first artifact: `/intake-wizard "Build customer portal"` → Intake forms created in `.aiwg/intake/`
10. User confirms deployment success: `ls .claude/agents/ .claude/commands/ .aiwg/intake/`

## Postconditions

- 58 SDLC agents deployed to `.claude/agents/` (architecture-designer, test-engineer, requirements-analyst, etc.)
- 45 SDLC commands deployed to `.claude/commands/` (flow-inception-to-elaboration, intake-wizard, etc.)
- CLAUDE.md updated with natural language orchestration prompts
- `.aiwg/` artifact directory structure created
- User can trigger workflows via natural language ("transition to Elaboration") instead of manual template copying

## Success Criteria (Quantifiable)

- Deployment completes in <10 seconds (even for all 58 agents + 45 commands)
- 100% of agents/commands copied successfully (zero file errors)
- User can invoke at least 1 workflow via natural language within 5 minutes of deployment
- CLAUDE.md preserves existing content (zero data loss during update)
- User-reported setup friction: <15 minutes from install to first artifact generation

## Priority

**HIGH** - Critical for SDLC Framework adoption, primary use case for Agentic Developers persona

## Effort Estimate

**User Effort**:
- Install aiwg CLI: <2 minutes (one-line bash command)
- Deploy agents/commands: <1 minute (single command)
- Update CLAUDE.md: <5 minutes (one command invocation)
- Validate deployment: <2 minutes (check directories)
- **Total**: <10 minutes for full deployment

**System Processing**: <10 seconds for deployment operations

**Learning Curve**: 0 minutes (deployment is automated, usage learning happens during first workflow invocation)

## Notes

**Open Questions**:
- Should deployment check for existing CLAUDE.md conflicts (warn if AIWG section already exists)?
- How to handle version conflicts (user has older agents, deploys newer version)?
- Should deployment support selective agent/command deployment (not all 58 agents)?

**Risks**:
- File conflicts: Existing `.claude/agents/` directory with user-created agents (mitigation: warn user, offer backup)
- CLAUDE.md corruption: Update script fails, leaves CLAUDE.md in broken state (mitigation: backup before update, rollback on error)
- Platform incompatibility: Project uses Cursor/Codex with different agent format expectations (mitigation: multi-provider support with --provider flag)

**Dependencies**:
- aiwg CLI must be installed (`~/.local/share/ai-writing-guide/`)
- Project must have .git directory (validates project structure)
- `.claude/` directory must be writable (deployment target)

**Future Enhancements**:
- Interactive deployment wizard (select specific agents/commands)
- Deployment validation report (lists deployed files, checks for conflicts)
- Rollback command (`aiwg -rollback`) to undo deployment
- Version management (track deployed version, support upgrades)
- Dry-run mode (`aiwg -deploy-agents --dry-run`) to preview changes
