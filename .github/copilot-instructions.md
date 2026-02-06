# GitHub Copilot Instructions

This file provides project-specific instructions for GitHub Copilot.

<!-- AIWG SDLC Framework Integration -->

## AIWG SDLC Framework

This project uses the AI Writing Guide (AIWG) SDLC Framework for software development lifecycle management.

### Available Custom Agents

AIWG agents are deployed to `.github/agents/` and can be invoked via `@agent-name`:

**Planning & Architecture**:
- `@architecture-designer` - System architecture and design decisions
- `@requirements-analyst` - Requirements gathering and analysis
- `@api-designer` - API design and contract definitions

**Implementation**:
- `@software-implementer` - Production code implementation
- `@test-engineer` - Test development and coverage
- `@code-reviewer` - Code review and quality

**Security & Quality**:
- `@security-architect` - Security architecture and threat modeling
- `@security-auditor` - Security review and vulnerability assessment
- `@performance-engineer` - Performance optimization

**Documentation**:
- `@technical-writer` - Technical documentation
- `@architecture-documenter` - Architecture documentation
- `@documentation-synthesizer` - Multi-source documentation consolidation

### Copilot Coding Agent

You can assign GitHub issues directly to Copilot to have it work autonomously:
1. Navigate to an issue
2. Assign `@copilot` or select Copilot as assignee
3. Copilot will analyze the issue and create a pull request

### SDLC Artifacts Location

All SDLC artifacts are stored in `.aiwg/`:

```
.aiwg/
├── intake/        # Project intake forms
├── requirements/  # User stories, use cases
├── architecture/  # SAD, ADRs
├── planning/      # Phase plans
├── risks/         # Risk register
├── testing/       # Test strategy
├── security/      # Threat models
├── deployment/    # Deployment plans
├── working/       # Temporary (safe to delete)
└── reports/       # Generated reports
```

### Workflow Patterns

**Multi-agent review**: For comprehensive artifact review, invoke multiple custom agents to get specialized perspectives.

**Copilot coding agent**: Assign complex issues to `@copilot` for autonomous implementation with pull request creation.

**Code review**: Use Copilot code review to get AI-powered feedback on pull requests.

## Core Enforcement Rules

<!-- AIWG Core Rules - These 7 rules are non-negotiable defaults deployed to every AIWG installation -->

### No Attribution (CRITICAL)

Never add AI tool attribution to commits, PRs, docs, or code. No `Co-Authored-By`, no "Generated with", no "Written by [AI tool]". The AI is a tool like a compiler - tools don't sign their output. This applies to ALL platforms: Copilot, Claude Code, Codex, Cursor, etc.

### Token Security (CRITICAL)

Never hard-code tokens, pass tokens as CLI arguments, or log token values. Load tokens from secure files or environment variables. Use scoped operations to limit token lifetime. See `agentic/code/frameworks/sdlc-complete/rules/token-security.md` for patterns.

### Versioning (CRITICAL)

CalVer format: `YYYY.M.PATCH`. Never use leading zeros (`2026.01.5` is wrong, `2026.1.5` is correct). Tags use `v` prefix (`v2026.1.5`). PATCH resets each month.

### Citation Policy (CRITICAL)

Never fabricate citations, DOIs, URLs, or page numbers. Only cite sources that exist in the research corpus. Use quality-appropriate hedging (HIGH evidence: "demonstrates"; LOW evidence: "limited evidence suggests"). When no source exists, acknowledge the gap rather than inventing a reference.

### Anti-Laziness (HIGH)

Never delete tests to make them pass. Never skip tests with `.skip()` or `@Ignore`. Never remove features instead of fixing them. Never weaken assertions. If stuck after 3 attempts, escalate to human with full context rather than taking shortcuts.

### Executable Feedback (HIGH)

Execute tests before returning code. Track execution history for debugging. Retry on failure with root cause analysis (max 3 attempts). Never return code without running the test suite first.

### Failure Mitigation (HIGH)

Apply mitigations for known LLM failure archetypes: hallucination (verify all references), context loss (maintain summaries), instruction drift (echo constraints), consistency violations (track claims), and technical errors (validate syntax). See `agentic/code/frameworks/sdlc-complete/rules/failure-mitigation.md` for the full taxonomy.

### Rules Reference

Full rule documentation lives in `agentic/code/frameworks/sdlc-complete/rules/`. The manifest at `agentic/code/frameworks/sdlc-complete/rules/manifest.json` lists all 28 rules across core, sdlc, and research tiers.

## Project-Specific Configuration

<!-- Add project-specific instructions below this line -->

