# AIWG Rules

Deployable enforcement policies that define default behaviors AIWG users can count on.

## What Are Rules?

Rules are structured enforcement documents that configure AI assistant behavior. Unlike guidelines or suggestions, rules are **non-negotiable defaults** that AIWG deploys to every supported platform.

When a user runs `aiwg use sdlc` or `aiwg new`, rules are copied or injected into the platform's native rule location. The AI assistant then follows them automatically.

## Tiers

| Tier | Deployed When | Purpose |
|------|--------------|---------|
| **core** | Always (`aiwg use`, `aiwg new`) | Universal behaviors every user can count on |
| **sdlc** | With SDLC framework (`aiwg use sdlc`) | Workflow-specific enforcement |
| **research** | When research features active | Research corpus management |

### Core Rules (Always Deployed)

These define what AIWG **is** as a tool:

| Rule | Enforcement | What It Does |
|------|-------------|-------------|
| `no-attribution` | CRITICAL | Zero AI branding in commits, PRs, docs, code |
| `token-security` | CRITICAL | Never hardcode, log, or expose tokens |
| `versioning` | CRITICAL | CalVer format, no leading zeros |
| `citation-policy` | CRITICAL | Never fabricate citations or sources |
| `anti-laziness` | HIGH | Never delete tests or remove features to pass |
| `executable-feedback` | HIGH | Execute tests before returning code |
| `failure-mitigation` | HIGH | Mitigate known LLM failure archetypes |

These 7 rules ship with every AIWG installation. They're the behaviors that make AIWG a trustworthy tool rather than an unpredictable assistant.

## Platform Deployment

Rules deploy to platform-native locations:

| Platform | Location | Mechanism |
|----------|----------|-----------|
| Claude Code | `.claude/rules/` | Direct file copy |
| Cursor | `.cursor/rules/` | Direct file copy |
| Copilot | `.github/copilot-instructions.md` | Content injection |
| Codex | `~/.codex/instructions.md` | Content injection |
| Warp | `WARP.md` | Content injection |
| Factory AI | `.factory/rules/` | Direct file copy |
| OpenCode | `.opencode/rules/` | Direct file copy |

**File copy platforms** get the full rule file with all metadata, examples, and enforcement details.

**Content injection platforms** get a condensed version of each rule embedded in the platform's context file. The `aiwg regenerate` command handles this conversion.

## CLI Integration

```bash
# Deploy all rules for a framework
aiwg use sdlc          # Deploys core + sdlc tier rules

# Deploy to specific platform
aiwg use sdlc --provider cursor   # Deploys to .cursor/rules/

# Scaffold new project with rules
aiwg new my-project    # Includes core tier rules

# Regenerate rules for a platform
aiwg regenerate claude  # Syncs rules to .claude/rules/

# List deployed rules
aiwg rules list

# Check rule compliance
aiwg rules check
```

## Rule Structure

Each rule file follows this format:

```markdown
# Rule Name

**Enforcement Level**: CRITICAL | HIGH | MEDIUM
**Scope**: What this rule applies to
**Issue**: #NNN (Gitea tracking issue)

## Principle
Why this rule exists.

## Mandatory Rules
### Rule 1: ...
**FORBIDDEN**: (what not to do)
**REQUIRED**: (what to do instead)

## References
Links to related rules, schemas, and research.
```

## Manifest

`manifest.json` registers all rules with metadata for the CLI:

- **name**: Rule identifier
- **file**: Filename in this directory
- **enforcement**: critical | high | medium
- **tier**: core | sdlc | research
- **description**: One-line purpose
- **issue**: Gitea issue reference

## Adding New Rules

1. Create the rule file in this directory following the standard structure
2. Add an entry to `manifest.json`
3. Choose the appropriate tier (core = universal, sdlc = workflow, research = corpus)
4. Set enforcement level based on impact of violations
5. Run `aiwg rules check` to validate

## Relationship to .claude/rules/

`.claude/rules/` is the **deployment target** for Claude Code. This directory (`agentic/code/frameworks/sdlc-complete/rules/`) is the **canonical source**.

- Source of truth: `agentic/code/frameworks/sdlc-complete/rules/`
- Claude Code deployment: `.claude/rules/`
- Other platforms: Platform-specific locations per deployment map

The `aiwg use` and `aiwg regenerate` commands sync from source to targets.

For this repository (which dogfoods AIWG), `.claude/rules/` may also contain project-specific rules that aren't part of the framework. Only rules listed in `manifest.json` are deployed to other projects.
