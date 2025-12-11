# CLAUDE.md Modernization Plan

## Executive Summary

Current CLAUDE.md is 1,018 lines - far exceeding the Anthropic-recommended 100-200 line maximum. This loads excessive context into every session, wasting tokens and reducing effectiveness for simple tasks.

This plan modernizes the CLAUDE.md structure using:
1. **Modular CLAUDE.md** - Core 100-150 line file with essentials only
2. **Path-scoped rules** - `.claude/rules/*.md` files that load conditionally based on file paths
3. **@-mention integration** - Reference docs without auto-loading them
4. **Deferred context** - Load orchestration guidance only for flow commands

## Current State Analysis

### Problems Identified

| Issue | Impact | Severity |
|-------|--------|----------|
| 1,018 line CLAUDE.md | Loads into every session regardless of task | High |
| Full SDLC orchestrator guidance (~400 lines) always loaded | Simple commands like `/pr-review` don't need this | High |
| Voice Framework docs always loaded | Only needed for content commands | Medium |
| Agent ecosystem description always loaded | Rarely needed for most tasks | Medium |
| Installation/CLI docs always loaded | Only needed for setup tasks | Low |
| Path resolution duplicated in 20+ commands | Maintenance burden, inconsistency risk | Medium |
| @-mentions used for validation only | Missing auto-context loading potential | Medium |

### Current Structure (Bloated)

```
CLAUDE.md (1,018 lines - ALL LOADED EVERY SESSION)
├── Repository Purpose (10 lines)
├── Multi-Platform Support (10 lines)
├── Context Selection Strategy (15 lines)
├── High-Level Architecture (40 lines)
├── Agent Ecosystem (30 lines)
├── Common Development Tasks (40 lines)
├── Writing Guide Principles (20 lines)
├── Voice Framework (80 lines)
├── Installation & CLI (100 lines)
├── Development Kit (50 lines)
├── Multi-Provider Support (40 lines)
├── SDLC Complete Framework (100 lines)
├── .aiwg/ Directory Structure (80 lines)
├── AIWG SDLC Framework Section (400+ lines) ← ORCHESTRATOR GUIDANCE
│   ├── Orchestrator Role
│   ├── Natural Language Command Translation
│   ├── Multi-Agent Workflow Patterns
│   └── Available Commands Reference
├── Phase Overview (50 lines)
└── Troubleshooting (30 lines)
```

## Target Architecture

### New Structure (Modular)

```
CLAUDE.md (100-150 lines - CORE ONLY)
├── Repository Purpose (10 lines)
├── Quick Navigation (15 lines) ← Links to rules and docs
├── Essential Commands (20 lines)
├── Context Strategy (10 lines) ← How to use @-mentions
├── Writing Principles (15 lines)
└── Common Tasks (30 lines)

.claude/rules/ (Path-Scoped - LOADED CONDITIONALLY)
├── sdlc-orchestration.md (paths: .aiwg/**)
│   └── Full orchestrator guidance, natural language translations
├── voice-framework.md (paths: **/*.md, **/*.txt)
│   └── Voice profiles, skills, content writing guidance
├── agent-deployment.md (paths: .claude/agents/**, agentic/**)
│   └── Agent deployment patterns, provider-specific guidance
├── flow-commands.md (paths: .claude/commands/flow-*.md)
│   └── Multi-agent orchestration patterns
└── development.md (paths: src/**, test/**)
    └── TypeScript/Node patterns, testing conventions

docs/reference/ (NOT AUTO-LOADED - Reference Only)
├── ORCHESTRATOR_GUIDE.md ← Full orchestration reference
├── AGENTS_CATALOG.md ← Complete agent listing
├── COMMANDS_REFERENCE.md ← All commands with examples
├── TEMPLATES_INDEX.md ← Template locations and usage
└── NATURAL_LANGUAGE_PATTERNS.md ← All supported phrases
```

### How It Works

1. **Always Loaded**: Only the 100-150 line `CLAUDE.md` core
2. **Conditionally Loaded**: Rules in `.claude/rules/` based on file paths being worked on
3. **On-Demand**: Reference docs in `docs/reference/` via @-mentions when needed
4. **Never Auto-Loaded**: Large catalogs, installation docs, troubleshooting guides

## Implementation Plan

### Phase 1: Create Rules Directory Structure

```bash
mkdir -p .claude/rules
mkdir -p docs/reference
```

### Phase 2: Extract Content into Path-Scoped Rules

#### File: `.claude/rules/sdlc-orchestration.md`

```yaml
---
paths: .aiwg/**
---

# SDLC Orchestration Rules

[Extract current AIWG SDLC Framework section here - ~400 lines]
[Only loaded when working with .aiwg/ artifacts]
```

#### File: `.claude/rules/voice-framework.md`

```yaml
---
paths:
  - "**/*.md"
  - "**/*.txt"
  - "docs/**"
  - "content/**"
---

# Voice Framework Rules

[Extract current Voice Framework section here - ~80 lines]
[Only loaded when working with markdown/content files]
```

#### File: `.claude/rules/agent-deployment.md`

```yaml
---
paths:
  - ".claude/agents/**"
  - "agentic/**"
  - ".factory/**"
---

# Agent Deployment Rules

[Extract agent ecosystem, multi-provider support here - ~100 lines]
[Only loaded when working with agent definitions]
```

#### File: `.claude/rules/development.md`

```yaml
---
paths:
  - "src/**"
  - "test/**"
  - "tools/**"
---

# Development Rules

[TypeScript patterns, testing conventions, Node.js guidance]
[Only loaded when working with source code]
```

### Phase 3: Create Reference Documents

#### File: `docs/reference/ORCHESTRATOR_GUIDE.md`

Full orchestration reference (not auto-loaded):
- Complete natural language pattern registry
- Multi-agent workflow patterns
- All available commands with full examples
- Phase transition workflows

Referenced via: `@docs/reference/ORCHESTRATOR_GUIDE.md` when needed

#### File: `docs/reference/AGENTS_CATALOG.md`

Complete agent listing:
- All 58 SDLC agents with descriptions
- All 37 marketing agents with descriptions
- All 3 writing agents with descriptions
- Agent selection guidance

Referenced via: `@docs/reference/AGENTS_CATALOG.md` when needed

### Phase 4: Rewrite Core CLAUDE.md

New `CLAUDE.md` (100-150 lines):

```markdown
# AI Writing Guide

Framework for improving AI-generated content quality with voice profiles,
validation tools, and specialized agents.

## Quick Navigation

| Task | Where to Look |
|------|---------------|
| SDLC workflows | See `.claude/rules/sdlc-orchestration.md` |
| Voice/content | See `.claude/rules/voice-framework.md` |
| Agent deployment | See `.claude/rules/agent-deployment.md` |
| Full reference | Use `@docs/reference/ORCHESTRATOR_GUIDE.md` |

## Essential Commands

```bash
# Writing validation
/writing-validator "path/to/content.md"

# SDLC workflows (natural language)
"transition to elaboration"
"run security review"
"project status"

# Agent deployment
aiwg -deploy-agents --mode sdlc
```

## Context Strategy

**Use @-mentions for on-demand loading**:
- `@docs/reference/ORCHESTRATOR_GUIDE.md` - Full orchestration details
- `@docs/reference/AGENTS_CATALOG.md` - Complete agent listing
- `@.aiwg/requirements/UC-*.md` - Specific requirements

**Automatic loading via rules**:
- Working in `.aiwg/` → loads SDLC orchestration rules
- Working in `.md` files → loads voice framework rules
- Working in `src/` → loads development rules

## Writing Principles

1. Apply appropriate voice (technical-authority, friendly-explainer, etc.)
2. Maintain sophistication - preserve domain-appropriate vocabulary
3. Include authenticity markers - opinions, trade-offs, constraints
4. Vary structure - sentence lengths, paragraph styles
5. Be specific - exact metrics, concrete examples

## Common Tasks

### Start New Project
```bash
aiwg -new
/intake-wizard "project description"
```

### Deploy Agents
```bash
aiwg -deploy-agents --mode sdlc
aiwg -deploy-commands --mode sdlc
```

### Check Status
```bash
/project-status
"where are we?"
```

## Repository Structure

```
agentic/code/
├── frameworks/
│   ├── sdlc-complete/      # 58 SDLC agents, 42+ commands
│   └── media-marketing-kit/ # 37 marketing agents
├── addons/
│   └── voice-framework/    # Voice profiles
└── agents/                 # 3 writing agents
```

For complete documentation, see `@docs/reference/`.
```

### Phase 5: Update Commands to Use @-Mentions

Update `/aiwg-regenerate-claude` to generate the new modular structure:

```markdown
# Instead of generating 1,000+ line CLAUDE.md:
1. Generate core CLAUDE.md (100-150 lines)
2. Generate appropriate .claude/rules/*.md files based on project type
3. Generate docs/reference/ index if AIWG project
```

Update `/aiwg-setup-project` to:
1. Create `.claude/rules/` directory
2. Copy appropriate rule files based on frameworks in use
3. Add reference doc links to CLAUDE.md

### Phase 6: Create Centralized Registry

#### File: `agentic/code/config/registry.json`

```json
{
  "version": "1.0.0",
  "paths": {
    "aiwg_root": "${HOME}/.local/share/ai-writing-guide",
    "sdlc_framework": "${aiwg_root}/agentic/code/frameworks/sdlc-complete",
    "marketing_framework": "${aiwg_root}/agentic/code/frameworks/media-marketing-kit",
    "templates": "${sdlc_framework}/templates",
    "agents": "${sdlc_framework}/agents",
    "commands": "${sdlc_framework}/commands"
  },
  "natural_language_patterns": {
    "flow-inception-to-elaboration": [
      "transition to elaboration",
      "move to elaboration",
      "start elaboration",
      "begin elaboration"
    ],
    "flow-security-review-cycle": [
      "security review",
      "run security",
      "validate security",
      "security audit"
    ]
  },
  "artifacts": {
    "requirements": ".aiwg/requirements/",
    "architecture": ".aiwg/architecture/",
    "testing": ".aiwg/testing/",
    "security": ".aiwg/security/"
  }
}
```

Commands can then load this registry instead of duplicating path resolution.

## Migration Strategy

### For Existing Projects

1. Run `/aiwg-update-claude --migrate-to-modular`
2. Command backs up current CLAUDE.md
3. Generates new modular structure
4. Preserves team directives (marked with `<!-- TEAM: ... -->`)

### For New Projects

1. `aiwg -new` generates modular structure by default
2. No migration needed

## Benefits

| Metric | Before | After | Improvement |
|--------|--------|-------|-------------|
| Base context load | 1,018 lines | 100-150 lines | 85% reduction |
| Simple task context | 1,018 lines | 100-150 lines | 85% reduction |
| SDLC workflow context | 1,018 lines | 100-150 + 400 = 550 lines | 46% reduction |
| Content task context | 1,018 lines | 100-150 + 80 = 230 lines | 77% reduction |
| Path resolution code | 20+ duplicates | 1 registry | Centralized |
| @-mention utilization | Validation only | Auto-context loading | Integrated |

## Next Steps

1. [ ] Create `.claude/rules/` directory structure
2. [ ] Extract SDLC orchestration content into `sdlc-orchestration.md`
3. [ ] Extract voice framework content into `voice-framework.md`
4. [ ] Create core CLAUDE.md (100-150 lines)
5. [ ] Create `docs/reference/` index documents
6. [ ] Update `/aiwg-regenerate-claude` for new structure
7. [ ] Update `/aiwg-setup-project` for new structure
8. [ ] Create `agentic/code/config/registry.json`
9. [ ] Update commands to use registry instead of hardcoded paths
10. [ ] Test migration on this repository
