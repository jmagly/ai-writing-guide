# AIWG Development Kit - Implementation Plan

**Status:** Draft - Pending Approval
**Created:** 2025-12-10
**Updated:** 2025-12-10
**Author:** Claude (Orchestrator)

## Executive Summary

This plan defines an **AIWG Development Kit** - a comprehensive suite of tools, commands, and templates that enable users to easily create, extend, and customize AIWG **frameworks**, **addons**, and **extensions**. The kit addresses user feedback requesting easier modification and extension of AIWG.

### Value Proposition

- **Reduce Time-to-Create**: Scaffold new addons/frameworks/extensions in minutes, not hours
- **Enforce Best Practices**: Templates ensure consistent structure and quality
- **Lower Barrier to Entry**: Users don't need deep knowledge of AIWG internals
- **Enable Community Growth**: Make it easy for users to contribute new content
- **Support All Three Tiers**: Frameworks, addons, AND extensions per ADR-008 taxonomy

---

## Three-Tier Plugin Taxonomy (Reference)

Per **ADR-008**, AIWG uses a three-tier plugin taxonomy:

| Tier | Type | Purpose | Standalone | Example |
|------|------|---------|------------|---------|
| 1 | **Framework** | Complete lifecycle solution | ✅ Yes | sdlc-complete, media-marketing-kit |
| 2 | **Addon** | Standalone utility, works anywhere | ✅ Yes | aiwg-utils, writing-quality |
| 3 | **Extension** | Framework expansion pack, requires parent | ❌ No | sdlc-complete/gdpr, marketing/ftc |

**Key Distinctions:**
- **Frameworks** are large (50+ agents), define lifecycle phases, have own workspace scope
- **Addons** are small (1-10 agents), framework-agnostic, work with any project
- **Extensions** enhance a specific framework, inherit parent context, can't operate alone

The Development Kit must support creating all three types.

---

## Scope

### In Scope

1. **CLI Scaffolding Commands** (outside Claude session)
   - `aiwg scaffold-addon <name>` - Create new addon structure
   - `aiwg scaffold-framework <name>` - Create new framework structure
   - `aiwg scaffold-extension <name> --for <framework>` - Create extension for framework
   - `aiwg add-agent <name> --to <target>` - Add agent to existing package
   - `aiwg add-command <name> --to <target>` - Add command to existing package
   - `aiwg add-skill <name> --to <target>` - Add skill to existing package
   - `aiwg add-template <name> --to <target>` - Add template to framework/extension

2. **In-Session Development Commands** (slash commands in Claude Code)
   - `/devkit-create-addon` - Interactive addon creation with guidance
   - `/devkit-create-framework` - Interactive framework creation
   - `/devkit-create-extension` - Interactive extension creation (requires framework)
   - `/devkit-create-command` - Create new command with templates
   - `/devkit-create-agent` - Create new agent with domain expertise
   - `/devkit-create-skill` - Create new skill with trigger patterns
   - `/devkit-validate` - Validate addon/framework/extension structure and manifest
   - `/devkit-test` - Test command/agent in isolation

3. **Development Templates**
   - Addon manifest template
   - Framework manifest template
   - Extension manifest template (with `requires` field)
   - Agent definition templates (simple, complex, orchestrator)
   - Command templates (utility, transformation, orchestration)
   - Skill templates (detection, transformation, validation)

4. **Specialized Development Agent**
   - `aiwg-developer` agent - Expert in AIWG structure and patterns

5. **Documentation**
   - Addon creation guide
   - Framework creation guide
   - Extension creation guide
   - Best practices and patterns
   - Extension mechanisms (replaces, dependencies, requires)

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
│   ├── scaffold-extension.mjs       # NEW: Extension scaffolding
│   ├── add-agent.mjs
│   ├── add-command.mjs
│   ├── add-skill.mjs
│   └── add-template.mjs             # NEW: Add templates to frameworks/extensions
│
├── Commands (agentic/code/addons/aiwg-utils/commands/)
│   ├── devkit-create-addon.md
│   ├── devkit-create-framework.md   # NEW: Framework creation
│   ├── devkit-create-extension.md   # NEW: Extension creation
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
│   ├── extension-manifest.json      # NEW: Extension manifest with requires field
│   ├── agent-simple.md
│   ├── agent-complex.md
│   ├── agent-orchestrator.md
│   ├── command-utility.md
│   ├── command-transformation.md
│   ├── command-orchestration.md
│   ├── skill-detection.md
│   ├── skill-transformation.md
│   ├── README-addon.md
│   ├── README-framework.md
│   └── README-extension.md          # NEW: Extension readme template
│
└── Documentation (docs/development/)
    ├── addon-creation-guide.md
    ├── framework-creation-guide.md
    ├── extension-creation-guide.md  # NEW: Extension guide
    ├── command-patterns.md
    ├── agent-patterns.md
    └── extension-mechanisms.md
```

### Extension Structure (Within Parent Framework)

Extensions live inside their parent framework's `extensions/` directory:

```
agentic/code/frameworks/sdlc-complete/
├── agents/
├── commands/
├── templates/
├── flows/
└── extensions/                      # Extensions directory
    ├── gdpr/                        # GDPR compliance extension
    │   ├── manifest.json            # requires: ["sdlc-complete"]
    │   ├── README.md
    │   ├── templates/
    │   │   ├── dpia-template.md
    │   │   └── privacy-checklist.md
    │   └── checklists/
    │       └── gdpr-compliance.md
    └── healthcare/                  # Healthcare compliance extension
        ├── manifest.json            # requires: ["sdlc-complete"]
        ├── README.md
        └── templates/
            ├── hipaa-requirements.md
            └── phi-handling.md
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
- [ ] Generates valid manifest.json with `type: "framework"`
- [ ] Creates agents/, commands/, skills/, templates/, flows/, extensions/ directories
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
# ├── flows/
# └── extensions/          # Ready for future extensions
```

---

### REQ-002.5: CLI Scaffold Extension

**Priority:** P0 (Must Have)

**Description:** Users can create extensions (framework expansion packs) that enhance a specific parent framework.

**Acceptance Criteria:**
- [ ] `aiwg scaffold-extension <name> --for <framework>` creates extension structure
- [ ] Extension created inside parent framework's `extensions/` directory
- [ ] Generates valid manifest.json with `type: "extension"` and `requires: ["<framework>"]`
- [ ] Creates templates/, checklists/ directories (typical extension content)
- [ ] Validates parent framework exists before creating
- [ ] Supports `--description`, `--author` flags
- [ ] Supports `--dry-run` for preview
- [ ] Output shows created files and extension activation instructions

**Example:**
```bash
aiwg scaffold-extension hipaa --for sdlc-complete --description "HIPAA compliance templates"

# Creates:
# agentic/code/frameworks/sdlc-complete/extensions/hipaa/
# ├── manifest.json         # type: "extension", requires: ["sdlc-complete"]
# ├── README.md
# ├── templates/
# │   ├── phi-handling.md
# │   └── hipaa-requirements.md
# └── checklists/
#     └── hipaa-compliance.md
```

**Extension Manifest Schema:**
```json
{
  "id": "hipaa",
  "type": "extension",
  "name": "HIPAA Compliance Extension",
  "version": "1.0.0",
  "description": "HIPAA compliance templates for healthcare projects",
  "requires": ["sdlc-complete"],
  "author": "User",
  "entry": {
    "templates": "templates",
    "checklists": "checklists"
  },
  "templates": ["phi-handling", "hipaa-requirements"],
  "checklists": ["hipaa-compliance"]
}
```

---

### REQ-003: CLI Add Agent/Command/Skill/Template

**Priority:** P0 (Must Have)

**Description:** Users can add individual components to existing addons, frameworks, or extensions.

**Acceptance Criteria:**
- [ ] `aiwg add-agent <name> --to <target>` creates agent file from template
- [ ] `aiwg add-command <name> --to <target>` creates command file from template
- [ ] `aiwg add-skill <name> --to <target>` creates skill directory with SKILL.md
- [ ] `aiwg add-template <name> --to <target>` creates template file (for frameworks/extensions)
- [ ] Updates target manifest.json to include new component
- [ ] Supports `--template <simple|complex|orchestrator>` for agents
- [ ] Supports `--template <utility|transformation|orchestration>` for commands
- [ ] Supports `--dry-run` for preview
- [ ] Target can be addon, framework, OR extension (e.g., `sdlc-complete/extensions/hipaa`)

**Example:**
```bash
# Add to framework
aiwg add-agent compliance-reviewer --to legal-compliance --template complex

# Add to extension
aiwg add-template audit-checklist --to sdlc-complete/extensions/hipaa

# Creates:
# agentic/code/frameworks/sdlc-complete/extensions/hipaa/templates/audit-checklist.md
# Updates extension manifest.json templates array
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

### REQ-004.5: In-Session Extension Creation

**Priority:** P0 (Must Have)

**Description:** Users can interactively create extensions within a Claude Code session with AI assistance.

**Acceptance Criteria:**
- [ ] `/devkit-create-extension <name>` command available
- [ ] Requires `--for <framework>` parameter to specify parent framework
- [ ] Validates parent framework exists
- [ ] Interactive mode asks about compliance domain, required templates
- [ ] AI generates appropriate manifest.json with `requires` field
- [ ] Creates extension inside parent framework's `extensions/` directory
- [ ] Suggests templates and checklists based on extension purpose
- [ ] Validates result before finalizing

**Example:**
```
/devkit-create-extension sox --for sdlc-complete --interactive

> What compliance domain does this extension address?
User: Sarbanes-Oxley (SOX) compliance for financial controls

> What artifacts should this extension provide?
User: Control templates, audit checklists, evidence requirements

[Creates extension with manifest, templates, and checklists]

Created: agentic/code/frameworks/sdlc-complete/extensions/sox/
├── manifest.json     # requires: ["sdlc-complete"]
├── README.md
├── templates/
│   ├── control-matrix.md
│   └── evidence-requirements.md
└── checklists/
    └── sox-audit-checklist.md
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

**Description:** Users can validate addon/framework/extension structure and manifests.

**Acceptance Criteria:**
- [ ] `/devkit-validate <path>` validates structure
- [ ] Auto-detects type (addon, framework, extension) from manifest
- [ ] Checks manifest.json required fields for each type
- [ ] For extensions: validates parent framework exists, checks `requires` field
- [ ] Validates all referenced files exist
- [ ] Checks frontmatter in agents/commands
- [ ] Reports errors with remediation suggestions
- [ ] Returns pass/fail status

**Extension-Specific Validation:**
- [ ] `requires` field must be array of valid framework IDs
- [ ] Extension must be in parent's `extensions/` directory
- [ ] Parent framework must exist and be valid

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

**Description:** Comprehensive template library for all component types across all three plugin tiers.

**Acceptance Criteria:**
- [ ] Addon manifest template with all fields (`type: "addon"`)
- [ ] Framework manifest template with all fields (`type: "framework"`)
- [ ] Extension manifest template with `requires` field (`type: "extension"`)
- [ ] Agent templates: simple, complex, orchestrator
- [ ] Command templates: utility, transformation, orchestration
- [ ] Skill template with SKILL.md and structure
- [ ] README templates for addons, frameworks, AND extensions
- [ ] Templates include placeholder documentation
- [ ] Extension-specific templates: checklist.md, compliance-matrix.md

---

### REQ-010: Documentation

**Priority:** P1 (Should Have)

**Description:** Complete documentation for addon/framework/extension development.

**Acceptance Criteria:**
- [ ] Addon creation guide (step-by-step)
- [ ] Framework creation guide (step-by-step)
- [ ] Extension creation guide (step-by-step) - NEW
- [ ] Three-tier taxonomy reference (frameworks vs addons vs extensions)
- [ ] Command development patterns
- [ ] Agent development patterns
- [ ] Extension mechanisms (replaces, dependencies, requires)
- [ ] Best practices and anti-patterns
- [ ] Troubleshooting guide
- [ ] FAQ: "When should I create an addon vs extension?"

---

## Architecture Decision Records

The following ADRs have been extracted to standalone files in `.aiwg/architecture/decisions/`:

| ADR | Title | Status | File |
|-----|-------|--------|------|
| ADR-009 | Devkit as Extension of aiwg-utils | Proposed | [ADR-009-devkit-extends-aiwg-utils.md](../architecture/decisions/ADR-009-devkit-extends-aiwg-utils.md) |
| ADR-010 | Templates in aiwg-utils/templates/devkit/ | Proposed | [ADR-010-devkit-template-location.md](../architecture/decisions/ADR-010-devkit-template-location.md) |
| ADR-011 | CLI and In-Session Commands for Scaffolding | Proposed | [ADR-011-devkit-cli-and-session-commands.md](../architecture/decisions/ADR-011-devkit-cli-and-session-commands.md) |
| ADR-012 | Template Selection via --template Flag | Proposed | [ADR-012-devkit-template-selection.md](../architecture/decisions/ADR-012-devkit-template-selection.md) |
| ADR-013 | Automatic Manifest Updates on Component Add | Proposed | [ADR-013-devkit-manifest-auto-update.md](../architecture/decisions/ADR-013-devkit-manifest-auto-update.md) |

### ADR Summary

**ADR-009**: Extend aiwg-utils (already core/auto-installed) rather than create separate addon. Users get devkit features automatically.

**ADR-010**: Store templates in `aiwg-utils/templates/devkit/` co-located with commands that use them. Enables deployment alongside addon.

**ADR-011**: Provide both CLI commands (quick scaffold) and in-session commands (AI-guided). Supports different user workflows.

**ADR-012**: Multiple templates per component type (`--template simple|complex|orchestrator`) with sensible defaults.

**ADR-013**: Automatically update manifest.json when adding components. No manual editing required.

### Related ADRs

| ADR | Title | Relevance |
|-----|-------|-----------|
| [ADR-008](../architecture/decisions/ADR-008-plugin-type-taxonomy.md) | Plugin Type Taxonomy | Defines three-tier taxonomy (framework/addon/extension) that devkit must support |
| [ADR-001](../architecture/decisions/ADR-001-plugin-manifest-format.md) | Plugin Manifest Format | Manifest schema that templates must follow |
| [ADR-002](../architecture/decisions/ADR-002-plugin-isolation-strategy.md) | Plugin Isolation Strategy | Security constraints for all plugin types |

---

## Implementation Phases

### Phase 1: Foundation (P0 Requirements)

**Deliverables:**
1. CLI scaffold-addon.mjs
2. CLI scaffold-extension.mjs (extensions are P0 - common use case)
3. CLI add-agent.mjs, add-command.mjs, add-skill.mjs, add-template.mjs
4. Template library (addon, extension, agent, command, skill templates)
5. /devkit-create-addon command
6. /devkit-create-extension command
7. /devkit-create-command command
8. /devkit-create-agent command
9. aiwg-developer agent
10. install.sh updates

**Why extensions in Phase 1:** Per user feedback, extensions (framework expansion packs) are a primary use case. Users want to extend existing frameworks (e.g., add HIPAA to SDLC) more often than creating entirely new frameworks.

### Phase 2: Enhancement (P1 Requirements)

**Deliverables:**
1. CLI scaffold-framework.mjs (less common, but important)
2. /devkit-create-framework command
3. /devkit-validate command (with extension validation)
4. /devkit-test command
5. /devkit-create-skill command
6. Documentation suite (addon, framework, extension guides)

### Phase 3: Polish (P2 Future)

**Deliverables:**
1. Interactive mode improvements
2. Template customization
3. Addon/extension discovery and listing
4. Community contribution workflow
5. Extension dependency resolution (multi-extension support)

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
- tools/scaffolding/scaffold-extension.mjs (NEW)
- tools/scaffolding/add-agent.mjs
- tools/scaffolding/add-command.mjs
- tools/scaffolding/add-skill.mjs
- tools/scaffolding/add-template.mjs (NEW)

**Commands:**
- agentic/code/addons/aiwg-utils/commands/devkit-create-addon.md
- agentic/code/addons/aiwg-utils/commands/devkit-create-framework.md (NEW)
- agentic/code/addons/aiwg-utils/commands/devkit-create-extension.md (NEW)
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
- agentic/code/addons/aiwg-utils/templates/devkit/extension-manifest.json (NEW)
- agentic/code/addons/aiwg-utils/templates/devkit/agent-simple.md
- agentic/code/addons/aiwg-utils/templates/devkit/agent-complex.md
- agentic/code/addons/aiwg-utils/templates/devkit/agent-orchestrator.md
- agentic/code/addons/aiwg-utils/templates/devkit/command-utility.md
- agentic/code/addons/aiwg-utils/templates/devkit/command-transformation.md
- agentic/code/addons/aiwg-utils/templates/devkit/command-orchestration.md
- agentic/code/addons/aiwg-utils/templates/devkit/skill-template/SKILL.md
- agentic/code/addons/aiwg-utils/templates/devkit/README-addon.md
- agentic/code/addons/aiwg-utils/templates/devkit/README-framework.md
- agentic/code/addons/aiwg-utils/templates/devkit/README-extension.md (NEW)
- agentic/code/addons/aiwg-utils/templates/devkit/checklist.md (NEW - extension-specific)
- agentic/code/addons/aiwg-utils/templates/devkit/compliance-matrix.md (NEW - extension-specific)

**Documentation:**
- docs/development/addon-creation-guide.md
- docs/development/framework-creation-guide.md
- docs/development/extension-creation-guide.md (NEW)
- docs/development/three-tier-taxonomy.md (NEW - reference guide)
- docs/development/command-patterns.md
- docs/development/agent-patterns.md
- docs/development/extension-mechanisms.md

**ADRs (already created):**
- .aiwg/architecture/decisions/ADR-009-devkit-extends-aiwg-utils.md
- .aiwg/architecture/decisions/ADR-010-devkit-template-location.md
- .aiwg/architecture/decisions/ADR-011-devkit-cli-and-session-commands.md
- .aiwg/architecture/decisions/ADR-012-devkit-template-selection.md
- .aiwg/architecture/decisions/ADR-013-devkit-manifest-auto-update.md

### Files to Update

- tools/install/install.sh (add scaffold commands)
- tools/agents/deploy-agents.mjs (support extension deployment)
- agentic/code/addons/aiwg-utils/manifest.json (add new commands, agent)
- agentic/code/addons/aiwg-utils/README.md (document devkit features)
- .aiwg/architecture/decisions/README.md (add ADR-009 through ADR-013)

---

## Approval

**Reviewer:** [User]
**Decision:** [ ] Approved / [ ] Approved with Changes / [ ] Rejected
**Comments:**

---

*Plan generated by Claude Opus 4.5 based on codebase analysis and user requirements.*
