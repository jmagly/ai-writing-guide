# AIWG Development Kit - Implementation Plan

**Status:** Draft - Pending Approval
**Created:** 2025-12-10
**Author:** Claude (Orchestrator)

## Executive Summary

This plan defines an **AIWG Development Kit** - a comprehensive suite of tools, commands, and templates that enable users to easily create, extend, and customize AIWG frameworks and addons. The kit addresses user feedback requesting easier modification and extension of AIWG.

### Value Proposition

- **Reduce Time-to-Create**: Scaffold new addons/frameworks in minutes, not hours
- **Enforce Best Practices**: Templates ensure consistent structure and quality
- **Lower Barrier to Entry**: Users don't need deep knowledge of AIWG internals
- **Enable Community Growth**: Make it easy for users to contribute new frameworks

---

## Scope

### In Scope

1. **CLI Scaffolding Commands** (outside Claude session)
   - `aiwg scaffold-addon <name>` - Create new addon structure
   - `aiwg scaffold-framework <name>` - Create new framework structure
   - `aiwg add-agent <name> --to <addon|framework>` - Add agent to existing package
   - `aiwg add-command <name> --to <addon|framework>` - Add command to existing package
   - `aiwg add-skill <name> --to <addon>` - Add skill to existing addon

2. **In-Session Development Commands** (slash commands in Claude Code)
   - `/devkit-create-addon` - Interactive addon creation with guidance
   - `/devkit-create-command` - Create new command with templates
   - `/devkit-create-agent` - Create new agent with domain expertise
   - `/devkit-create-skill` - Create new skill with trigger patterns
   - `/devkit-validate` - Validate addon/framework structure and manifest
   - `/devkit-test` - Test command/agent in isolation

3. **Development Templates**
   - Addon manifest template
   - Framework manifest template
   - Agent definition templates (simple, complex, orchestrator)
   - Command templates (utility, transformation, orchestration)
   - Skill templates (detection, transformation, validation)

4. **Specialized Development Agent**
   - `aiwg-developer` agent - Expert in AIWG structure and patterns

5. **Documentation**
   - Addon creation guide
   - Framework creation guide
   - Best practices and patterns
   - Extension mechanisms (replaces, dependencies)

### Out of Scope (Future)

- Visual addon builder UI
- Marketplace/registry for community addons
- Automated testing infrastructure
- CI/CD integration for addon publishing

---

## Architecture

### Component Overview

```
AIWG Development Kit
├── CLI Tools (tools/scaffolding/)
│   ├── scaffold-addon.mjs
│   ├── scaffold-framework.mjs
│   ├── add-agent.mjs
│   ├── add-command.mjs
│   └── add-skill.mjs
│
├── Commands (agentic/code/addons/aiwg-utils/commands/)
│   ├── devkit-create-addon.md
│   ├── devkit-create-command.md
│   ├── devkit-create-agent.md
│   ├── devkit-create-skill.md
│   ├── devkit-validate.md
│   └── devkit-test.md
│
├── Agent (agentic/code/addons/aiwg-utils/agents/)
│   └── aiwg-developer.md
│
├── Templates (agentic/code/addons/aiwg-utils/templates/devkit/)
│   ├── addon-manifest.json
│   ├── framework-manifest.json
│   ├── agent-simple.md
│   ├── agent-complex.md
│   ├── agent-orchestrator.md
│   ├── command-utility.md
│   ├── command-transformation.md
│   ├── command-orchestration.md
│   ├── skill-detection.md
│   ├── skill-transformation.md
│   └── README-addon.md
│
└── Documentation (docs/development/)
    ├── addon-creation-guide.md
    ├── framework-creation-guide.md
    ├── command-patterns.md
    ├── agent-patterns.md
    └── extension-mechanisms.md
```

### Integration Points

1. **install.sh** - Register new CLI commands
2. **deploy-agents.mjs** - Auto-discover new addons/frameworks
3. **aiwg-utils manifest.json** - Register new commands and agents
4. **Existing validation** - Leverage manifest validation tools

---

## Requirements

### REQ-001: CLI Scaffold Addon

**Priority:** P0 (Must Have)

**Description:** Users can create a new addon structure from the command line.

**Acceptance Criteria:**
- [ ] `aiwg scaffold-addon <name>` creates complete addon directory structure
- [ ] Generates valid manifest.json with required fields
- [ ] Creates README.md with addon documentation template
- [ ] Creates agents/, commands/, skills/ directories
- [ ] Supports `--description`, `--author`, `--core` flags
- [ ] Supports `--dry-run` for preview
- [ ] Output shows created files and next steps

**Example:**
```bash
aiwg scaffold-addon my-utils --description "Custom utilities" --author "Me"

# Creates:
# agentic/code/addons/my-utils/
# ├── manifest.json
# ├── README.md
# ├── agents/
# ├── commands/
# └── skills/
```

---

### REQ-002: CLI Scaffold Framework

**Priority:** P1 (Should Have)

**Description:** Users can create a new framework structure from the command line.

**Acceptance Criteria:**
- [ ] `aiwg scaffold-framework <name>` creates complete framework directory structure
- [ ] Generates valid manifest.json
- [ ] Creates agents/, commands/, skills/, templates/, flows/ directories
- [ ] Creates template subdirectories (intake/, requirements/, etc.)
- [ ] Supports `--description`, `--author` flags
- [ ] Supports `--dry-run` for preview
- [ ] Output shows created files and guidance for populating

**Example:**
```bash
aiwg scaffold-framework legal-compliance --description "Legal compliance lifecycle"

# Creates:
# agentic/code/frameworks/legal-compliance/
# ├── manifest.json
# ├── README.md
# ├── agents/
# ├── commands/
# ├── skills/
# ├── templates/
# │   ├── intake/
# │   ├── requirements/
# │   └── ...
# └── flows/
```

---

### REQ-003: CLI Add Agent/Command/Skill

**Priority:** P0 (Must Have)

**Description:** Users can add individual components to existing addons/frameworks.

**Acceptance Criteria:**
- [ ] `aiwg add-agent <name> --to <target>` creates agent file from template
- [ ] `aiwg add-command <name> --to <target>` creates command file from template
- [ ] `aiwg add-skill <name> --to <target>` creates skill directory with SKILL.md
- [ ] Updates target manifest.json to include new component
- [ ] Supports `--template <simple|complex|orchestrator>` for agents
- [ ] Supports `--template <utility|transformation|orchestration>` for commands
- [ ] Supports `--dry-run` for preview

**Example:**
```bash
aiwg add-agent compliance-reviewer --to legal-compliance --template complex

# Creates:
# agentic/code/frameworks/legal-compliance/agents/compliance-reviewer.md
# Updates manifest.json agents array
```

---

### REQ-004: In-Session Addon Creation

**Priority:** P0 (Must Have)

**Description:** Users can interactively create addons within a Claude Code session with AI assistance.

**Acceptance Criteria:**
- [ ] `/devkit-create-addon <name>` command available
- [ ] Interactive mode asks clarifying questions about purpose
- [ ] AI generates appropriate manifest.json content
- [ ] AI suggests initial agents/commands based on description
- [ ] Creates complete structure with documentation
- [ ] Validates result before finalizing

**Example:**
```
/devkit-create-addon security-scanner --interactive

> What is the primary purpose of this addon?
User: Scan code for security vulnerabilities

> What types of files should it analyze?
User: Python, JavaScript, TypeScript

[Creates addon with appropriate agents and commands]
```

---

### REQ-005: In-Session Command Creation

**Priority:** P0 (Must Have)

**Description:** Users can create new commands with AI assistance in session.

**Acceptance Criteria:**
- [ ] `/devkit-create-command <name>` command available
- [ ] Presents template options (utility, transformation, orchestration)
- [ ] AI helps define parameters and execution steps
- [ ] Generates complete command file with documentation
- [ ] Offers to add to specific addon/framework
- [ ] Validates command structure

---

### REQ-006: In-Session Agent Creation

**Priority:** P0 (Must Have)

**Description:** Users can create new agents with AI assistance in session.

**Acceptance Criteria:**
- [ ] `/devkit-create-agent <name>` command available
- [ ] Presents template options (simple, complex, orchestrator)
- [ ] AI helps define expertise, tools, and workflow
- [ ] Generates complete agent file with domain knowledge
- [ ] Offers to add to specific addon/framework
- [ ] Validates agent structure

---

### REQ-007: Validation Command

**Priority:** P1 (Should Have)

**Description:** Users can validate addon/framework structure and manifests.

**Acceptance Criteria:**
- [ ] `/devkit-validate <path>` validates structure
- [ ] Checks manifest.json required fields
- [ ] Validates all referenced files exist
- [ ] Checks frontmatter in agents/commands
- [ ] Reports errors with remediation suggestions
- [ ] Returns pass/fail status

---

### REQ-008: Development Agent

**Priority:** P0 (Must Have)

**Description:** Specialized agent for AIWG development assistance.

**Acceptance Criteria:**
- [ ] `aiwg-developer` agent available
- [ ] Deep knowledge of addon/framework structure
- [ ] Can answer questions about AIWG patterns
- [ ] Can suggest appropriate templates
- [ ] Can debug manifest/structure issues
- [ ] Can explain extension mechanisms

---

### REQ-009: Template Library

**Priority:** P0 (Must Have)

**Description:** Comprehensive template library for all component types.

**Acceptance Criteria:**
- [ ] Addon manifest template with all fields
- [ ] Framework manifest template with all fields
- [ ] Agent templates: simple, complex, orchestrator
- [ ] Command templates: utility, transformation, orchestration
- [ ] Skill template with SKILL.md and structure
- [ ] README templates for addons and frameworks
- [ ] Templates include placeholder documentation

---

### REQ-010: Documentation

**Priority:** P1 (Should Have)

**Description:** Complete documentation for addon/framework development.

**Acceptance Criteria:**
- [ ] Addon creation guide (step-by-step)
- [ ] Framework creation guide (step-by-step)
- [ ] Command development patterns
- [ ] Agent development patterns
- [ ] Extension mechanisms (replaces, dependencies)
- [ ] Best practices and anti-patterns
- [ ] Troubleshooting guide

---

## Architecture Decision Records

### ADR-001: Devkit as Extension of aiwg-utils

**Status:** Proposed

**Context:**
The Development Kit needs a home. Options:
1. Separate addon (aiwg-devkit)
2. Extension of existing aiwg-utils
3. Part of core tools only (no addon)

**Decision:** Extend aiwg-utils with devkit capabilities.

**Rationale:**
- aiwg-utils is already core and auto-installed
- Users already have access without extra installation
- Consistent with "utilities" purpose
- Avoids addon proliferation
- Manifest already supports commands, agents, skills

**Consequences:**
- aiwg-utils grows larger (acceptable given purpose)
- Version bump to 1.2.0
- May need to split later if too large

---

### ADR-002: Templates in aiwg-utils/templates/devkit/

**Status:** Proposed

**Context:**
Templates need a home. Options:
1. Inline in CLI scripts (hardcoded)
2. docs/templates/
3. agentic/code/addons/aiwg-utils/templates/devkit/
4. Separate templates addon

**Decision:** Store in aiwg-utils/templates/devkit/

**Rationale:**
- Templates are addon content, not documentation
- Keeps templates co-located with commands that use them
- Allows manifest.json to reference them
- Easy to deploy with addon

**Consequences:**
- Need to update deploy-agents.mjs to handle templates directory
- Templates deployed alongside addon

---

### ADR-003: CLI Commands for Scaffolding

**Status:** Proposed

**Context:**
Scaffolding requires file creation outside Claude sessions. Options:
1. Claude-only (in-session commands create files)
2. CLI-only (bash commands)
3. Both (CLI for quick scaffold, Claude for interactive)

**Decision:** Provide both CLI and in-session commands.

**Rationale:**
- CLI for quick, non-interactive scaffolding
- In-session for guided, AI-assisted creation
- Different use cases: quick start vs. thoughtful design
- CLI doesn't require active Claude session

**Consequences:**
- Maintain two codepaths (Node.js CLI + command markdown)
- CLI is authoritative for structure, Claude adds intelligence
- Need to keep both in sync

---

### ADR-004: Template Selection via --template Flag

**Status:** Proposed

**Context:**
Different components need different starting templates. Options:
1. Single template per type (one size fits all)
2. Multiple templates selected via flag
3. Interactive template selection

**Decision:** Multiple templates via --template flag with sensible defaults.

**Rationale:**
- Simple agents need minimal template
- Complex agents need expertise sections
- Orchestrator agents need multi-agent patterns
- Users know what complexity they need
- Defaults to "simple" if not specified

**Templates:**
- Agents: `simple` (default), `complex`, `orchestrator`
- Commands: `utility` (default), `transformation`, `orchestration`
- Skills: `detection`, `transformation`, `validation`

**Consequences:**
- Need to maintain multiple templates per type
- CLI help must document template options
- Default templates must be production-ready

---

### ADR-005: Manifest Auto-Update on Add

**Status:** Proposed

**Context:**
When adding components, manifest.json needs updating. Options:
1. Manual manifest update (user responsibility)
2. Automatic manifest update (CLI updates it)
3. Manifest regeneration (scan and rebuild)

**Decision:** Automatic manifest update with validation.

**Rationale:**
- Manual updates are error-prone
- Full regeneration may lose custom fields
- Targeted update is precise and safe
- Validates after update to catch issues

**Consequences:**
- CLI must parse and update JSON safely
- Need to preserve custom fields and formatting
- Must handle merge conflicts gracefully

---

## Implementation Phases

### Phase 1: Foundation (P0 Requirements)

**Deliverables:**
1. CLI scaffold-addon.mjs
2. CLI add-agent.mjs, add-command.mjs, add-skill.mjs
3. Template library (all templates)
4. /devkit-create-addon command
5. /devkit-create-command command
6. /devkit-create-agent command
7. aiwg-developer agent
8. install.sh updates

**Estimated Effort:** Medium

### Phase 2: Enhancement (P1 Requirements)

**Deliverables:**
1. CLI scaffold-framework.mjs
2. /devkit-validate command
3. /devkit-test command
4. Documentation suite
5. /devkit-create-skill command

**Estimated Effort:** Medium

### Phase 3: Polish (P2 Future)

**Deliverables:**
1. Interactive mode improvements
2. Template customization
3. Addon discovery and listing
4. Community contribution workflow

**Estimated Effort:** Low-Medium

---

## Success Metrics

1. **Time to Create Addon**: < 5 minutes for basic addon with CLI
2. **Time to Add Agent**: < 2 minutes with template
3. **Validation Pass Rate**: > 95% of scaffolded addons pass validation
4. **User Adoption**: Track usage of devkit commands
5. **Error Rate**: < 5% of scaffolding operations fail

---

## Risks and Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| Template drift from actual patterns | High | Medium | Validate templates against existing addons |
| CLI/in-session divergence | Medium | Medium | Share template files, sync on updates |
| Manifest format changes | High | Low | Version manifests, migration tooling |
| User creates invalid structures | Medium | Medium | Strong validation, clear error messages |

---

## Open Questions

1. **Template versioning**: Should templates have versions independent of addon version?
2. **Framework templates**: How much default content (empty dirs vs. placeholder files)?
3. **Skill creation**: Should skills require Python scripts or allow pure markdown?
4. **Testing**: How should users test new commands/agents before deployment?

---

## Appendix: File Inventory

### New Files to Create

**CLI Tools:**
- tools/scaffolding/scaffold-addon.mjs
- tools/scaffolding/scaffold-framework.mjs
- tools/scaffolding/add-agent.mjs
- tools/scaffolding/add-command.mjs
- tools/scaffolding/add-skill.mjs

**Commands:**
- agentic/code/addons/aiwg-utils/commands/devkit-create-addon.md
- agentic/code/addons/aiwg-utils/commands/devkit-create-command.md
- agentic/code/addons/aiwg-utils/commands/devkit-create-agent.md
- agentic/code/addons/aiwg-utils/commands/devkit-create-skill.md
- agentic/code/addons/aiwg-utils/commands/devkit-validate.md
- agentic/code/addons/aiwg-utils/commands/devkit-test.md

**Agent:**
- agentic/code/addons/aiwg-utils/agents/aiwg-developer.md

**Templates:**
- agentic/code/addons/aiwg-utils/templates/devkit/addon-manifest.json
- agentic/code/addons/aiwg-utils/templates/devkit/framework-manifest.json
- agentic/code/addons/aiwg-utils/templates/devkit/agent-simple.md
- agentic/code/addons/aiwg-utils/templates/devkit/agent-complex.md
- agentic/code/addons/aiwg-utils/templates/devkit/agent-orchestrator.md
- agentic/code/addons/aiwg-utils/templates/devkit/command-utility.md
- agentic/code/addons/aiwg-utils/templates/devkit/command-transformation.md
- agentic/code/addons/aiwg-utils/templates/devkit/command-orchestration.md
- agentic/code/addons/aiwg-utils/templates/devkit/skill-template/SKILL.md
- agentic/code/addons/aiwg-utils/templates/devkit/README-addon.md
- agentic/code/addons/aiwg-utils/templates/devkit/README-framework.md

**Documentation:**
- docs/development/addon-creation-guide.md
- docs/development/framework-creation-guide.md
- docs/development/command-patterns.md
- docs/development/agent-patterns.md
- docs/development/extension-mechanisms.md

### Files to Update

- tools/install/install.sh (add scaffold commands)
- agentic/code/addons/aiwg-utils/manifest.json (add new commands, agent)
- agentic/code/addons/aiwg-utils/README.md (document devkit features)

---

## Approval

**Reviewer:** [User]
**Decision:** [ ] Approved / [ ] Approved with Changes / [ ] Rejected
**Comments:**

---

*Plan generated by Claude Opus 4.5 based on codebase analysis and user requirements.*
