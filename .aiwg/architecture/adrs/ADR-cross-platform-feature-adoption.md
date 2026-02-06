# ADR: Cross-Platform Feature Adoption Strategy

**Date**: 2026-02-06
**Status**: ACCEPTED
**Author**: Architecture Designer
**Category**: Platform Architecture
**Issue**: #293
**Supersedes**: ADR-004 (Multi-Platform Compatibility Strategy)

## Reasoning

1. **Problem Analysis**: AIWG supports 7+ agentic platforms, but Claude Code v2.0.73-v2.1.33 introduced powerful platform-specific features (Agent Teams, Task Management, Memory, PreToolUse hooks, MCP Auto Mode) that have no equivalent on other platforms. If AIWG core workflows depend on these features, the framework becomes unusable on Cursor, GitHub Copilot, Factory AI, Warp, OpenCode, and Codex. Conversely, ignoring these features wastes significant capability improvements available to Claude Code users.

2. **Constraint Identification**: AIWG must remain functional on all supported platforms. This means no feature introduced via Claude Code can become a hard dependency for core SDLC workflows, artifact management, or state tracking. At the same time, the project's CLAUDE.md already documents multi-platform deployment paths, and the `aiwg use` command already adapts output per provider. The constraint is maintaining this portability while Claude Code races ahead in capability.

3. **Alternative Consideration**: Three strategies were evaluated:
   - **Lowest Common Denominator**: Only use features available on all platforms. Rejected because it wastes Claude Code's substantial advantages and penalizes the majority of users.
   - **Claude Code Only**: Drop multi-platform support and go all-in on Claude Code. Rejected because it contradicts AIWG's mission of broad accessibility and locks out users on other platforms.
   - **Two-Layer Architecture**: Platform-agnostic core with platform enhancement layer. Selected because it preserves universal access while enabling Claude Code users to benefit from advanced features.

4. **Decision Rationale**: The two-layer architecture mirrors established patterns in web development (progressive enhancement) and mobile development (capability detection). It aligns with AIWG's existing `aiwg use --provider` mechanism and the platform adapter specification. The `.aiwg/` directory already serves as cross-platform state, making it the natural canonical layer. Platform-specific features (hooks, tasks, memory) become optional UX improvements that degrade to file-based alternatives.

5. **Risk Assessment**: The primary risk is that maintaining fallback paths for every feature increases development and testing surface area. This is mitigated by keeping the number of platform-specific integrations bounded and by documenting fallback behavior at the point of adoption rather than retroactively. A secondary risk is that Claude Code users may file issues about features that "should" work on other platforms; clear documentation prevents this confusion.

## Context

AIWG supports 7+ agentic platforms:

| Platform | Agent Location | Hooks | Tasks | Memory | MCP |
|----------|---------------|-------|-------|--------|-----|
| Claude Code | `.claude/agents/` | Yes | Yes | Yes | Yes |
| GitHub Copilot | `.github/agents/` | No | No | No | Limited |
| Cursor | `.cursor/rules/` | No | No | No | Yes |
| Factory AI | `.factory/droids/` | No | No | No | No |
| Warp Terminal | `WARP.md` | No | No | No | No |
| OpenCode | `.opencode/agent/` | No | No | No | No |
| Codex (OpenAI) | `~/.codex/skills/` | No | No | No | No |

Claude Code v2.0.73 through v2.1.33 introduced a significant wave of platform-specific features:

- **Agent Teams** (v2.1.32) -- Multi-agent collaboration via tmux sessions
- **Task Management** (v2.1.16) -- Built-in task tracking with dependency management
- **Agent Memory** (v2.1.33) -- Per-agent memory with user/project/local scope
- **Automatic Memory** (v2.1.32) -- Cross-session learning stored in project memory
- **PreToolUse hooks** (v2.1.9) -- Dynamic context injection via `additionalContext`
- **MCP Auto Mode** (v2.1.7) -- Deferred tool descriptions when exceeding context threshold
- **Task(agent_type) restrictions** (v2.1.33) -- Constrain which sub-agents an agent can spawn
- **Hook timeouts** (v2.1.3) -- 10-minute hook execution limit enables test suites as hooks
- **Session-PR linking** (v2.1.27) -- Auto-link sessions to PRs
- **PDF page ranges** (v2.1.30) -- Selective PDF reading
- **Partial summarization** (v2.1.32) -- "Summarize from here" for context management

None of these features have equivalents on the other six platforms. The original ADR-004 adopted a "Monitor-then-Abstract" strategy that assumed multi-platform demand would be validated before investing in abstraction. That demand has since been validated: AIWG ships deployment adapters for all seven platforms, and users actively deploy to non-Claude platforms. This ADR supersedes ADR-004 with a concrete architectural strategy for feature adoption.

## Decision

Adopt a **two-layer architecture** that separates platform-agnostic core functionality from platform-specific enhancements.

### Layer 1: Platform-Agnostic Core

All AIWG workflows, `.aiwg/` state files, artifact conventions, and SDLC flows work on ANY platform. This layer consists of:

- **`.aiwg/` directory** -- The canonical cross-platform source of truth for all project state (requirements, architecture, planning, risks, testing, security, deployment, working files, reports)
- **Artifact conventions** -- Markdown files with frontmatter, @-mention wiring, reasoning sections, provenance records
- **SDLC phase workflows** -- Natural language transitions ("transition to elaboration"), phase gates, artifact checklists
- **Voice profiles** -- Writing quality enforcement via templates and conventions
- **Agent definitions** -- System prompt text, role descriptions, examples (the intellectual content of agents)
- **Ralph loop state** -- Iteration tracking, completion criteria, feedback history stored in `.aiwg/ralph/`

This layer relies exclusively on:
- File system read/write operations
- Text-based configuration (YAML, JSON, Markdown)
- Standard shell commands (git, npm, etc.)
- Context loading via `@`-mentions or file inclusion

### Layer 2: Platform Enhancement

Platform-specific features provide UX improvements when available but are never functional dependencies.

```
+---------------------------------------------------+
|                AIWG Core Layer                     |
|  .aiwg/ state files, artifact conventions,        |
|  SDLC workflows, voice profiles, agent prompts    |
|  --> Works on ALL platforms                        |
+---------------------------------------------------+
|           Platform Enhancement Layer               |
|  Claude Code: Tasks, Memory, Hooks, MCP Auto      |
|  Copilot: Custom instructions, tool access         |
|  Cursor: Rules-based context loading               |
|  --> Platform-specific UX improvements             |
+---------------------------------------------------+
```

When a platform enhancement is unavailable, the system degrades to the core layer behavior. The user experience may be less polished (more manual steps, less visual feedback, no cross-session learning), but all workflows remain functional and produce identical artifacts.

## Design Principles

### 1. `.aiwg/` State Files Are the Canonical Cross-Platform Source of Truth

All AIWG state must be representable as files in `.aiwg/`. Platform features may provide alternative views or interactions with this state, but the files are authoritative.

**Example**: Task Management (Claude Code v2.1.16) tracks tasks in-memory during a session. AIWG flows should always write task status to `.aiwg/working/` files in parallel. If Task Management is unavailable, only the file-based tracking exists, and that is sufficient.

### 2. Platform Features Are Progressive Enhancements, Not Requirements

No AIWG agent definition, workflow, or command may require a platform-specific feature to produce its deliverables. Platform features may improve the experience of producing those deliverables.

**Example**: Agent Memory (v2.1.33) enables cross-session learning. Without it, agents start fresh each session but can still load context from `.aiwg/` files, CLAUDE.md, and @-mentioned documents. The workflow functions; it just lacks accumulated knowledge.

### 3. Feature Detection Over Assumption

AIWG flows should check for platform capability before attempting to use it, rather than assuming a specific platform.

**Example**: Before invoking `TaskCreate`, check whether the tool is available. If not, fall back to writing a status file. Never hard-code "if Claude Code, use tasks."

### 4. Graceful Degradation: Reduced Polish, Not Broken Workflows

When a platform feature is missing, the user should experience:
- Less visual feedback (no task progress bars)
- More manual steps (copying context instead of auto-loading)
- No cross-session learning (agent starts fresh)

The user should NOT experience:
- Workflow errors or failures
- Missing artifacts
- Broken agent definitions
- Inaccessible features

### 5. Agent Definitions Use Intersection Capabilities for Core Function

The core system prompt, role definition, examples, and deliverable specifications of an agent must work on any platform. Platform-specific frontmatter fields (memory scope, Task restrictions, model preference) are additive metadata that non-Claude platforms simply ignore.

## Feature Compatibility Matrix

| Feature (Claude Code) | Version | Cross-Platform Fallback | Impact if Missing |
|-----------------------|---------|------------------------|-------------------|
| Task Management | v2.1.16 | `.aiwg/working/` status files with YAML/JSON tracking | Less visual progress tracking; iteration state still persisted |
| Agent Memory | v2.1.33 | CLAUDE.md project context, `.aiwg/` state files, @-mention context loading | No cross-session learning; agents start fresh but load project context on demand |
| Automatic Memory | v2.1.32 | Manual context management via CLAUDE.md updates | No automatic pattern accumulation; user manages context explicitly |
| Task(agent_type) | v2.1.33 | Agent definition documentation only; no runtime enforcement | Agents can spawn any sub-agent; security boundary is advisory, not enforced |
| PreToolUse hooks | v2.1.9 | Path-scoped rules in `.claude/rules/`, CLAUDE.md directives | More rules loaded upfront; slightly higher context consumption |
| MCP Auto Mode | v2.1.7 | Manual MCP configuration with explicit tool lists | More upfront context consumed by tool descriptions |
| Agent Teams | v2.1.32 | Sequential `Task()` calls via orchestrator pattern | Slower execution; no parallel agent collaboration; functionally equivalent |
| Hook timeouts (10min) | v2.1.3 | External CI/CD for long-running checks | No in-session gating; validation deferred to CI/CD pipeline |
| Session-PR linking | v2.1.27 | Manual PR reference in session context | Less convenient; user manually provides PR context |
| PDF page ranges | v2.1.30 | Full PDF read or pre-extracted text files | More context consumed; slower for large research PDFs |
| Partial summarization | v2.1.32 | Manual context management; restart session if context exhausted | Harder to manage long sessions; may require more session restarts |
| Skills from --add-dir | v2.1.32 | Manual skill file copying or symlinks | More setup friction for multi-project deployments |
| Indexed arguments | v2.1.19 | `$ARGUMENTS` as single string, parsed by skill | Less structured argument passing; skill must do its own parsing |
| Merged skills/commands | v2.1.3 | Platform-specific skill/command distinction | No impact on AIWG; internal unification only |

## Platform Capability Detection

AIWG flows should detect platform capabilities at runtime rather than hardcoding platform assumptions. The detection strategy operates at three levels.

### Level 1: Tool Availability Detection

Check whether platform-specific tools are available before invoking them.

```
Before using Task Management:
  1. Attempt to list available tools (ToolSearch or equivalent)
  2. If TaskCreate, TaskUpdate, TaskGet, TaskList are available:
     --> Use built-in task management alongside .aiwg/ file tracking
  3. If unavailable:
     --> Use .aiwg/working/ files exclusively

Before using Memory:
  1. Check if agent frontmatter 'memory' field is honored by platform
  2. If memory is active:
     --> Agent accumulates cross-session knowledge automatically
  3. If unavailable:
     --> Agent loads context from .aiwg/ files and CLAUDE.md on each session start
```

### Level 2: Hook Support Detection

Check whether the platform supports lifecycle hooks.

```
On workflow start:
  1. Check for .claude/hooks/ directory and hook registration
  2. If hooks are supported:
     --> Register PreToolUse hooks for dynamic context injection
     --> Register SubagentStart/SubagentStop hooks for tracing
     --> Use hook-based HITL gates
  3. If hooks are unsupported:
     --> Load all relevant context via CLAUDE.md and path-scoped rules
     --> Use file-based tracing (.aiwg/traces/)
     --> Use natural-language HITL gates in conversation
```

### Level 3: Agent Capability Detection

Determine what level of agent orchestration the platform supports.

```
For multi-agent workflows:
  1. If Task(agent_type) is supported:
     --> Use typed sub-agent spawning with restrictions
  2. If general Task() is supported:
     --> Use untyped sub-agent spawning
  3. If no sub-agent spawning is supported:
     --> Use single-agent mode with manual context switching
     --> Document available agent prompts for user to invoke manually
```

### Detection Implementation

Detection should be implemented in the AIWG flow initialization sequence, not as a separate utility. When a flow starts (e.g., "transition to elaboration"), it should:

1. Probe for available tools
2. Set internal capability flags
3. Select the appropriate execution path
4. Log detected capabilities for troubleshooting

This detection is lightweight (a few tool availability checks) and adds negligible overhead.

## Implementation Guidance

### Agent Frontmatter Degradation

Agent definitions may include Claude Code-specific frontmatter fields. On non-Claude platforms, these fields are ignored by the platform but may be read by AIWG's own deployment tooling.

**Claude Code agent with full frontmatter:**
```yaml
---
name: "Architecture Designer"
model: "opus"
memory: project
tools:
  allow:
    - Read
    - Write
    - Grep
    - Glob
    - Task(Explore)
  deny:
    - Bash
---
```

**What happens on each platform:**

| Platform | `model` | `memory` | `tools.allow/deny` |
|----------|---------|----------|---------------------|
| Claude Code | Honored: uses Opus 4.6 | Honored: project-scoped memory | Honored: enforced restrictions |
| GitHub Copilot | Ignored: uses platform default | Ignored: no memory system | Ignored: no tool restrictions |
| Cursor | Ignored: uses platform default | Ignored: no memory system | Partially honored via rules |
| Factory AI | Ignored | Ignored | Ignored |
| Warp | Ignored | Ignored | Ignored |
| OpenCode | Ignored | Ignored | Ignored |
| Codex | Ignored | Ignored | Ignored |

The agent's system prompt, role definition, and examples function identically regardless of which frontmatter fields the platform honors.

### Hook-Based Features Fallback

Features that rely on Claude Code hooks fall back to static configuration.

**PreToolUse hooks (dynamic context injection):**
- Claude Code: Hook fires before Write operations targeting `.aiwg/`, injecting artifact conventions as `additionalContext`
- Fallback: Artifact conventions loaded via path-scoped rules (`.claude/rules/*.md`) or included in CLAUDE.md. Result is equivalent context but loaded upfront rather than on-demand.

**SubagentStart/SubagentStop hooks (agent tracing):**
- Claude Code: Hooks capture agent lifecycle events to `.aiwg/traces/current.jsonl` automatically
- Fallback: Tracing data written to `.aiwg/traces/` manually within agent prompts, or omitted. Tracing is observability, not core function.

**TeammateIdle/TaskCompleted hooks (agent teams):**
- Claude Code: Hooks coordinate multi-agent team workflows
- Fallback: Sequential agent invocation via orchestrator pattern. Same deliverables, linear execution.

### Task Management Fallback

Claude Code's built-in Task Management provides visual progress tracking and dependency management within a session. The fallback is file-based.

**With Task Management:**
```
TaskCreate: "Complete requirements analysis"
  subtask: "Draft user stories"    [status: done]
  subtask: "Identify NFRs"         [status: in-progress]
  subtask: "Create use cases"      [status: blocked-by: "Draft user stories"]
```

**Without Task Management (fallback):**
```yaml
# .aiwg/working/phase-status.yaml
phase: inception
status: in-progress
checklist:
  - item: "Draft user stories"
    status: done
    completed_at: "2026-02-06T10:30:00Z"
  - item: "Identify NFRs"
    status: in-progress
  - item: "Create use cases"
    status: blocked
    blocked_by: "Draft user stories"
```

Both approaches track identical information. The Claude Code version provides in-session visual feedback; the file-based version persists across sessions and platforms.

### Memory Fallback

Agent memory enables cross-session learning. Without it, each session starts fresh but can bootstrap from project state.

**With Agent Memory:**
- Agent remembers past architectural decisions, coding patterns, user preferences
- Accumulated automatically across sessions

**Without Agent Memory (fallback):**
- Agent reads `.aiwg/architecture/decisions/` for past ADRs
- Agent reads `CLAUDE.md` for project conventions
- Agent reads `.aiwg/working/` for recent context
- No automatic accumulation; user or CLAUDE.md must capture important patterns manually

The fallback produces equivalent results for any single session. The difference is in multi-session efficiency, not correctness.

## Consequences

### Positive

- **Universal Access**: AIWG works on all seven supported platforms without modification
- **Enhanced Claude Code UX**: Claude Code users benefit from native features (memory, tasks, hooks, teams) without AIWG artificially limiting itself
- **Clear Architecture**: The two-layer separation makes it obvious which features are core vs. enhancement
- **Future-Proof**: New platform features can be adopted as enhancements without risking cross-platform breakage
- **Testable Boundaries**: The core layer can be tested independently of any platform

### Negative

- **Maintenance Overhead**: Every Claude Code feature adopted requires a documented fallback path, increasing the surface area of the codebase
- **Testing Complexity**: Must validate AIWG on all platforms, not just Claude Code, to ensure the core layer works
- **Feature Temptation**: Developers may be tempted to make core workflows depend on convenient Claude Code features, requiring discipline and review
- **Documentation Burden**: Each feature adoption issue (#277-#292) must include cross-platform fallback documentation

### Neutral

- Agent definitions may include frontmatter fields that are silently ignored on non-Claude platforms; this is expected behavior, not a bug
- The file-based fallbacks add files to `.aiwg/working/` that Claude Code users may not need; these are low-cost and safe to delete
- Platform detection adds a small initialization step to flow execution

## Testing Strategy

### Cross-Platform Validation Matrix

Each AIWG release should validate core functionality on at least three platforms:

| Test Tier | Platforms | What to Validate |
|-----------|-----------|-----------------|
| Primary | Claude Code | Full feature set including enhancements |
| Secondary | Cursor, GitHub Copilot | Core workflows, artifact generation, SDLC flows |
| Tertiary | Factory AI or OpenCode | Basic agent loading, file-based state management |

### Core Layer Smoke Tests

Validate on every release:
1. Agent definitions load without errors on target platform
2. `.aiwg/` artifacts can be created and read
3. SDLC phase transitions work via natural language
4. Ralph loop state persists and resumes
5. Voice profiles apply correctly
6. @-mention wiring resolves

### Enhancement Layer Tests (Claude Code Only)

Validate that enhancements activate and degrade correctly:
1. Task Management creates tasks when available, writes files when not
2. Memory accumulates when available, loads from files when not
3. Hooks fire when registered, static rules used when not
4. Tool restrictions enforce when supported, advisory when not

## Related ADRs

- **ADR-004** (Superseded): Original "Monitor-then-Abstract" strategy that deferred multi-platform support
- **ADR-016**: Claude Code Plugin Distribution -- dual distribution model (npm + plugin) aligns with this two-layer approach
- **ADR-001** (decisions/): Plugin Manifest Format
- **ADR-008**: Plugin Type Taxonomy

## References

- @.aiwg/planning/claude-code-features-leverage.md -- Full feature analysis (Phase 1 + Phase 2)
- @.aiwg/architecture/platform-adapter-spec.md -- MCP-based platform adapter specification
- @.aiwg/architecture/adr/ADR-004-multi-platform-compatibility-strategy.md -- Superseded strategy
- @.aiwg/architecture/decisions/ADR-016-claude-code-plugin-distribution.md -- Plugin distribution
- Issue #293 -- Cross-platform compatibility strategy (this ADR's parent issue)
- Issues #277-#292 -- Individual Claude Code feature adoption issues
- CLAUDE.md Multi-Platform Support table -- Platform deployment paths
