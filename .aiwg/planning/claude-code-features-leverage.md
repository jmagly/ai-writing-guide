# Claude Code Features Leverage Analysis

Review of Claude Code changelog (2.0.43 → 2.0.64) for AIWG optimization opportunities.

## Critical New Features

### 1. Async/Background Agent Processing (2.0.64)

**Feature**: "Agents and bash commands can run asynchronously and send messages to wake up the main agent"

**Impact on AIWG**: **CRITICAL** - This fundamentally changes how we orchestrate multi-agent workflows.

**Current Pattern** (synchronous):
```
Main Agent → Task(agent-1) → wait → Task(agent-2) → wait → Task(agent-3) → wait
```

**New Pattern** (async with wake-up):
```
Main Agent → Task(agent-1, background)
          → Task(agent-2, background)
          → Task(agent-3, background)
          → Continue other work
          ← Agent-1 wakes main with results
          ← Agent-2 wakes main with results
          ← Agent-3 wakes main with results
```

**AIWG Actions**:
1. Update `prompts/reliability/parallel-hints.md` to document async patterns
2. Update flow commands to use background agents where applicable
3. Add `run_in_background: true` guidance for independent subtasks
4. Document wake-up message handling in synthesizer patterns

### 2. TaskOutputTool (2.0.64)

**Feature**: "Unshipped AgentOutputTool and BashOutputTool, in favor of a new unified TaskOutputTool"

**Impact on AIWG**: Tool references in documentation need updating.

**AIWG Actions**:
1. Audit all agent definitions for `AgentOutputTool` references
2. Update to `TaskOutputTool` in orchestration patterns
3. Update CLAUDE.md orchestrator documentation

### 3. Background Agent Support (2.0.60)

**Feature**: "Agents run in the background while you work"

**Impact on AIWG**: Enables non-blocking workflow execution.

**AIWG Actions**:
1. Document background agent patterns for long-running tasks
2. Add "fire-and-forget" patterns for audit/logging agents
3. Consider background trace collection (#6)

### 4. Named Sessions (2.0.64)

**Feature**: `/rename` to name sessions, `/resume <name>` to resume

**Impact on AIWG**: **HIGH** - Enables workflow state persistence across sessions.

**Current Gap**: Workflows that span multiple sessions lose context.

**AIWG Actions**:
1. Add session naming convention to flow commands: `aiwg-{phase}-{iteration}`
2. Document `/resume` patterns for interrupted workflows
3. Add session naming to trace collector (#6)
4. Consider auto-naming sessions on flow start

**Example**:
```bash
# Start inception flow
/flow-inception-to-elaboration
# Auto-names session: "aiwg-inception-elaboration-2025-12-10"

# Later, resume
claude --resume "aiwg-inception-elaboration-2025-12-10"
```

### 5. Skills Frontmatter for Subagents (2.0.43)

**Feature**: `skills` frontmatter field to declare skills to auto-load for subagents

**Impact on AIWG**: Agents can automatically load required skills.

**Current State**: Skills must be manually invoked or referenced.

**AIWG Actions**:
1. Add `skills:` frontmatter to agent definitions where applicable
2. Voice framework agents should auto-load voice skills
3. SDLC agents should auto-load relevant SDLC skills

**Example**:
```yaml
---
name: content-writer
skills:
  - voice-apply
  - voice-analyze
tools: Read, Write, MultiEdit, Bash, WebFetch
---
```

### 6. permissionMode for Custom Agents (2.0.43)

**Feature**: `permissionMode` field for custom agents

**Impact on AIWG**: Fine-grained permission control per agent type.

**AIWG Actions**:
1. Define permission modes for agent categories:
   - `read-only`: Analyst agents (requirements-analyst, metrics-analyst)
   - `write-artifacts`: Documentation agents (technical-writer, test-documenter)
   - `write-code`: Implementation agents (software-implementer, test-engineer)
   - `full`: Orchestrator agents (executive-orchestrator, deployment-manager)
2. Add `permissionMode:` to agent frontmatter

**Example**:
```yaml
---
name: security-auditor
permissionMode: read-only
tools: Read, Grep, Glob, WebFetch
---
```

### 7. PermissionRequest Hooks (2.0.54, 2.0.45)

**Feature**: "PermissionRequest hook to automatically approve or deny tool permission requests"

**Impact on AIWG**: Auto-approve patterns for trusted AIWG operations.

**AIWG Actions**:
1. Create hook templates for common AIWG patterns:
   - Auto-approve `.aiwg/` directory writes
   - Auto-approve git operations on AIWG branches
   - Auto-approve template file reads from AIWG install
2. Add hook setup to `aiwg -deploy-agents`

**Example Hook** (`.claude/hooks/permission-request.js`):
```javascript
export default function({ tool, parameters }) {
  // Auto-approve .aiwg/ writes
  if (tool === 'Write' && parameters.file_path.includes('.aiwg/')) {
    return { decision: 'approve' };
  }
  // Auto-approve AIWG template reads
  if (tool === 'Read' && parameters.file_path.includes('ai-writing-guide')) {
    return { decision: 'approve' };
  }
  return { decision: 'ask' };
}
```

### 8. SubagentStart/SubagentStop Hooks (2.0.43, 2.0.42)

**Feature**: Hook events for agent lifecycle with `agent_id` and `agent_transcript_path`

**Impact on AIWG**: **HIGH** - Enables trace collection (#6) natively.

**AIWG Actions**:
1. Create hook for trace collection:
   - SubagentStart: Log agent start with timestamp, agent type
   - SubagentStop: Log completion, capture transcript path
2. This significantly simplifies Trace Collector (#6) implementation

**Example Hook** (`.claude/hooks/subagent-lifecycle.js`):
```javascript
import fs from 'fs';

export function onSubagentStart({ agent_id, subagent_type }) {
  const trace = {
    event: 'start',
    agent_id,
    subagent_type,
    timestamp: new Date().toISOString()
  };
  fs.appendFileSync('.aiwg/traces/current.jsonl', JSON.stringify(trace) + '\n');
}

export function onSubagentStop({ agent_id, agent_transcript_path }) {
  const trace = {
    event: 'stop',
    agent_id,
    transcript_path: agent_transcript_path,
    timestamp: new Date().toISOString()
  };
  fs.appendFileSync('.aiwg/traces/current.jsonl', JSON.stringify(trace) + '\n');
}
```

### 9. Background Tasks with `&` Prefix (2.0.45)

**Feature**: "Send background tasks to Claude Code on the web by starting a message with &"

**Impact on AIWG**: Web users can trigger background workflows.

**AIWG Actions**:
1. Document `&` prefix for long-running flows
2. Add to simple-language-translations.md

**Example**:
```
& Run security review for SOC2 compliance
```

### 10. @-Mention Fixes (2.0.43)

**Feature**: "Fixed nested CLAUDE.md files not loading when @-mentioning files"

**Impact on AIWG**: **HIGH** - @-mentions are now reliable for cross-file references everywhere.

**AIWG Actions**:

1. **Use @-mentions in generated artifacts**:
   - Architecture docs reference requirements: `See @.aiwg/requirements/user-stories.md for UC-001`
   - Test plans reference specs: `Testing @.aiwg/architecture/api-contract.md endpoints`
   - Security reviews reference threat model: `Per @.aiwg/security/threat-model.md TM-003`

2. **Use @-mentions in code comments**:
   ```typescript
   /**
    * Authentication middleware implementing @.aiwg/requirements/nfr-security.md NFR-SEC-001
    * Architecture decision: @.aiwg/architecture/adrs/ADR-003-auth-strategy.md
    */
   export function authMiddleware(req, res, next) {
     // Implementation per @.aiwg/security/auth-patterns.md
   }
   ```

3. **Use @-mentions in templates**:
   - All SDLC templates should include @-mention placeholders
   - Generated artifacts maintain live links to source docs

4. **Traceability via @-mentions**:
   - Requirements → Code: `// Implements @.aiwg/requirements/UC-001.md`
   - Code → Tests: `// Tests for @src/auth/middleware.ts`
   - Tests → Requirements: `// Validates @.aiwg/requirements/NFR-SEC-001.md`

**Example: Architecture Document with @-mentions**:
```markdown
# Software Architecture Document

## Requirements Basis
This architecture addresses requirements defined in:
- @.aiwg/requirements/user-stories.md (functional)
- @.aiwg/requirements/nfr-performance.md (performance)
- @.aiwg/requirements/nfr-security.md (security)

## Component Design

### Authentication Service
See @.aiwg/architecture/adrs/ADR-003-auth-strategy.md for decision rationale.

Implementation: @src/services/auth/
Tests: @test/integration/auth/
```

**Example: Code with @-mention traceability**:
```python
# @.aiwg/requirements/UC-005-user-registration.md
# @.aiwg/architecture/adrs/ADR-007-password-hashing.md

def register_user(email: str, password: str) -> User:
    """
    Register new user per @.aiwg/requirements/UC-005-user-registration.md

    Security: Implements @.aiwg/security/auth-patterns.md#password-storage
    """
    # Hash password per ADR-007
    hashed = hash_password(password)  # @.aiwg/architecture/adrs/ADR-007-password-hashing.md
    return User.create(email=email, password_hash=hashed)
```

**Template Updates Required**:
1. Update all SDLC templates to include @-mention sections
2. Add @-mention traceability guide to Agent Design Bible
3. Create traceability linter to validate @-mentions resolve

### 11. --agent CLI Flag (2.0.60, 2.0.59)

**Feature**: Override agent setting for current session

**Impact on AIWG**: Launch Claude with specific AIWG agent persona.

**AIWG Actions**:
1. Create top-level AIWG agent definitions for common personas:
   - `aiwg-orchestrator` - Full SDLC orchestration
   - `aiwg-reviewer` - Code review focus
   - `aiwg-security` - Security audit focus
2. Document CLI patterns

**Example**:
```bash
claude --agent aiwg-orchestrator
claude --agent aiwg-security
```

## Feature → Unified Plan Mapping

| Feature | Version | Unified Plan Item(s) | Impact |
|---------|---------|----------------------|--------|
| Async agents | 2.0.64 | #2 Parallel-Hints | **Enables native async** |
| TaskOutputTool | 2.0.64 | All orchestration | Documentation update |
| Background agents | 2.0.60 | #2 Parallel-Hints, #6 Trace | Non-blocking patterns |
| Named sessions | 2.0.64 | #6 Trace, #11 Resilience | Workflow persistence |
| Skills frontmatter | 2.0.43 | Voice Framework | Auto-load skills |
| permissionMode | 2.0.43 | #4 Agent Bible | Permission tiers |
| PermissionRequest hooks | 2.0.54 | All flows | Auto-approve patterns |
| Subagent hooks | 2.0.43 | #6 Trace Collector | **Native trace capture** |
| @-mention fixes | 2.0.43 | Traceability, All templates | **Live doc references** |
| `&` background | 2.0.45 | UX improvement | Web user convenience |
| --agent flag | 2.0.60 | CLI UX | Persona shortcuts |

## Revised Implementation: Trace Collector (#6)

**Original Plan**: Build custom JSON Lines logger, `/trace-start` command, replay viewer.

**Revised with Hooks**: SubagentStart/SubagentStop hooks provide 80% of trace collection.

**New Implementation**:
1. Create `.claude/hooks/aiwg-trace.js` with lifecycle hooks
2. JSON Lines format compatible with Bandara paper
3. `/trace-start` becomes: ensure hooks are active, create trace file
4. Replay viewer still needed (unchanged)

**Effort Reduction**: ~40% (hooks handle collection; we just format and view)

## Revised Implementation: Parallel-Hints (#2)

**Original Plan**: Auto-inject "think parallel first" block, `/multi-run` wrapper.

**Revised with Async Agents**: Native async support simplifies patterns.

**New Implementation**:
1. Document `run_in_background: true` parameter in Task tool calls
2. Document wake-up message handling
3. Create `.claude/rules/parallel-execution.md` with async patterns
4. `/multi-run` may be unnecessary (native support)

**Key Pattern**:
```markdown
# Parallel Agent Execution (2.0.64+)

For independent subtasks, launch agents with `run_in_background: true`:

1. Identify tasks with no dependencies
2. Launch each as background agent
3. Continue orchestration work
4. Agents wake main thread when complete
5. Synthesize results

Example:
- Background: Security review (no deps)
- Background: Performance review (no deps)
- Background: Requirements traceability (no deps)
- Foreground: Wait for all, then synthesize
```

**Effort Reduction**: ~60% (native async replaces injection system)

## New AIWG Deliverables

### 1. @-Mention Traceability System (in `aiwg-utils` addon)

**Purpose**: Leverage @-mentions for live document references throughout SDLC artifacts.

**Location**: Added to existing `agentic/code/addons/aiwg-utils/` (core addon, auto-installed)

**New Commands**:
```
aiwg-utils/commands/
├── mention-wire.md          # Analyze codebase and inject @-mentions intelligently
├── mention-validate.md      # Validate all @-mentions resolve to real files
├── mention-report.md        # Generate traceability report from @-mentions
├── mention-conventions.md   # Display/apply @-mention conventions
└── mention-lint.md          # Lint @-mentions for style consistency
```

**New Tools**:
```
tools/mentions/
├── wire-mentions.mjs        # CLI: aiwg wire-mentions [--target .] [--dry-run]
├── validate-mentions.mjs    # CLI: aiwg validate-mentions [--target .]
├── mention-report.mjs       # CLI: aiwg mention-report [--format md|json|csv]
└── mention-lint.mjs         # CLI: aiwg mention-lint [--target .] [--fix]
```

**New Templates** (in aiwg-utils):
```
aiwg-utils/templates/mentions/
├── code-header-block.md       # Template for code file headers with @-mentions
├── artifact-references.md     # Template for doc cross-references
└── traceability-matrix.md     # @-mention based traceability matrix
```

**`mention-wire` Command Behavior**:
1. Scan target directory for code files and SDLC artifacts
2. Identify relationships:
   - Code files → Find matching requirements (by name, comments, patterns)
   - Test files → Find matching source files
   - Architecture docs → Find referenced requirements
   - Security docs → Find referenced threat models
3. Generate @-mention suggestions with confidence scores
4. `--dry-run`: Show proposed changes without applying
5. `--interactive`: Prompt for approval per file
6. `--auto`: Apply high-confidence (>80%) mentions automatically

**Example Usage**:
```bash
# Analyze and show what would be wired
aiwg wire-mentions --target . --dry-run

# Wire up with interactive approval
aiwg wire-mentions --target . --interactive

# Auto-wire high-confidence mentions
aiwg wire-mentions --target . --auto

# Validate all @-mentions resolve
aiwg validate-mentions --target .

# Lint @-mentions for style consistency
aiwg mention-lint --target .

# Lint and auto-fix style issues
aiwg mention-lint --target . --fix

# Generate traceability report
aiwg mention-report --format md > .aiwg/reports/traceability.md

# Display conventions guide
aiwg mention-conventions
```

**@-Mention Conventions Guide** (output of `aiwg mention-conventions`):
```markdown
# @-Mention Conventions

## Naming Patterns

### Requirements
@.aiwg/requirements/UC-{NNN}-{slug}.md          # Use cases
@.aiwg/requirements/NFR-{CAT}-{NNN}.md          # Non-functional (NFR-SEC-001, NFR-PERF-002)
@.aiwg/requirements/user-stories.md             # User story collection

### Architecture
@.aiwg/architecture/adrs/ADR-{NNN}-{slug}.md    # Architecture Decision Records
@.aiwg/architecture/components/{name}.md        # Component specifications
@.aiwg/architecture/software-architecture-doc.md # Main SAD

### Security
@.aiwg/security/threat-model.md                 # Main threat model
@.aiwg/security/TM-{NNN}.md                     # Individual threats
@.aiwg/security/controls/{control-id}.md        # Security controls

### Testing
@.aiwg/testing/test-plan.md                     # Master test plan
@.aiwg/testing/test-cases/{TC-NNN}.md           # Individual test cases

### Code References
@src/{path/to/file}                             # Source files (relative to repo root)
@test/{path/to/file}                            # Test files
@lib/{path/to/file}                             # Library files

## Placement Rules

### In Code Files
- Place @-mentions in file header docblock
- Use JSDoc/docstring style for language compatibility
- Group by type: @implements, @architecture, @security, @tests

### In Markdown Documents
- Place in "References" or "Related" section
- Use bullet lists for multiple references
- Include brief context for each reference

### In Comments
- Single-line: // @.aiwg/requirements/UC-001.md
- Can appear inline near relevant code
```

**Linting Rules** (`aiwg mention-lint`):
| Rule ID | Description | Severity | Auto-fix |
|---------|-------------|----------|----------|
| ML001 | @-mention path does not exist | error | no |
| ML002 | @-mention uses wrong case (case-sensitive) | warning | yes |
| ML003 | @-mention missing required prefix (.aiwg/, src/, test/) | warning | yes |
| ML004 | @-mention uses deprecated path pattern | warning | yes |
| ML005 | @-mention ID format invalid (UC-NNN, ADR-NNN) | warning | yes |
| ML006 | Duplicate @-mentions in same file | info | yes |
| ML007 | @-mention in wrong section (e.g., not in header) | info | no |
| ML008 | Orphan @-mention (target exists but doesn't back-reference) | info | no |
| ML009 | Circular @-mention chain detected | warning | no |
| ML010 | @-mention exceeds max depth (>3 hops) | warning | no |

**Lint Output Example**:
```
aiwg mention-lint --target .

src/services/auth/login.ts
  L3:  ML005 @.aiwg/requirements/UC-3-auth.md should be UC-003 (auto-fixable)
  L5:  ML001 @.aiwg/architecture/adrs/ADR-999.md does not exist

test/integration/auth.test.ts
  L2:  ML003 @auth/login.ts should be @src/auth/login.ts (auto-fixable)

.aiwg/architecture/software-architecture-doc.md
  L45: ML008 References @.aiwg/requirements/UC-005.md but UC-005 doesn't back-reference

Summary: 4 issues (1 error, 2 warnings, 1 info)
         3 auto-fixable (run with --fix)
```

**Wiring Heuristics**:
| Pattern | Inferred @-mention |
|---------|-------------------|
| File in `src/auth/` | `@.aiwg/requirements/UC-*-auth*.md` |
| File named `*test*.ts` | `@src/{corresponding-source}.ts` |
| Comment `// UC-001` | `@.aiwg/requirements/UC-001.md` |
| Comment `// ADR-005` | `@.aiwg/architecture/adrs/ADR-005*.md` |
| File in `.aiwg/architecture/` | `@.aiwg/requirements/*.md` (scan for refs) |
| Security control reference | `@.aiwg/security/controls/*.md` |

**Output of `mention-wire --dry-run`**:
```
@-Mention Wiring Analysis
========================

src/services/auth/login.ts (confidence: 85%)
  + @.aiwg/requirements/UC-003-user-auth.md (name match)
  + @.aiwg/architecture/adrs/ADR-005-jwt-strategy.md (comment: "JWT")

test/integration/auth.test.ts (confidence: 92%)
  + @src/services/auth/login.ts (test-to-source)
  + @.aiwg/requirements/UC-003-user-auth.md (inherited from source)

.aiwg/architecture/software-architecture-doc.md (confidence: 78%)
  + @.aiwg/requirements/user-stories.md (section: "Requirements Basis")
  + @.aiwg/requirements/nfr-security.md (mentions "security")

Summary: 15 files, 42 mentions suggested, avg confidence 84%
Run with --auto to apply 38 high-confidence mentions
Run with --interactive to review all 42
```

**@-Mention Conventions**:
```
# Requirements
@.aiwg/requirements/UC-{number}.md          # Use cases
@.aiwg/requirements/NFR-{category}-{number}.md  # Non-functional

# Architecture
@.aiwg/architecture/adrs/ADR-{number}-{slug}.md  # Decisions
@.aiwg/architecture/components/{name}.md    # Component specs

# Security
@.aiwg/security/TM-{number}.md              # Threat model items
@.aiwg/security/controls/{control}.md       # Security controls

# Code (relative from repo root)
@src/{path}                                 # Source files
@test/{path}                                # Test files
```

**Template Example** (code file header):
```typescript
/**
 * @file Authentication Service
 * @implements @.aiwg/requirements/UC-003-user-auth.md
 * @architecture @.aiwg/architecture/adrs/ADR-005-jwt-strategy.md
 * @security @.aiwg/security/controls/authn-001.md
 * @tests @test/integration/auth.test.ts
 */
```

### 2. Hook Templates (`agentic/code/addons/aiwg-hooks/`)

```
agentic/code/addons/aiwg-hooks/
├── manifest.json
├── README.md
├── hooks/
│   ├── aiwg-trace.js           # Subagent lifecycle tracing
│   ├── aiwg-permissions.js     # Auto-approve patterns
│   └── aiwg-session-naming.js  # Auto-name sessions for flows
└── templates/
    └── hooks-config.json       # Example .claude/hooks/ config
```

### 2. Agent Persona Configs (`agentic/code/agents/personas/`)

```
agentic/code/agents/personas/
├── aiwg-orchestrator.md    # Full SDLC orchestration
├── aiwg-reviewer.md        # Code review focus
├── aiwg-security.md        # Security audit focus
└── aiwg-writer.md          # Documentation focus
```

### 3. Updated Agent Frontmatter

All agents updated with:
- `skills:` for auto-loading
- `permissionMode:` for permission tiers
- Updated tool references (TaskOutputTool)

## CLI Updates

```bash
# Deploy hooks to project
aiwg deploy-hooks [--trace] [--permissions] [--sessions]

# Launch with AIWG persona
aiwg --persona orchestrator  # Wraps: claude --agent aiwg-orchestrator

# Start traced session with auto-naming
aiwg trace-session "inception-elaboration"
# Creates: claude --resume "aiwg-inception-elaboration-$(date)"
```

## Updated Success Metrics

| Metric | Original Target | Revised Target | Rationale |
|--------|-----------------|----------------|-----------|
| Parallel utilization | >60% on ≥4 subtasks | >80% on ≥4 subtasks | Native async support |
| Trace generation | <3 seconds | <1 second | Hook-based capture |
| Session recovery | Not measured | 100% named sessions | Named session support |
| Permission prompts | Not measured | <3 per flow | Auto-approve hooks |

## Implementation Priority Adjustment

### Now Easier (Native Support)

| Item | Original Effort | Revised Effort | Reason |
|------|-----------------|----------------|--------|
| #2 Parallel-Hints | 2-3 days | 0.5 days | Native async agents |
| #6 Trace Collector | 3-5 days | 1-2 days | Subagent hooks |
| #11 Resilience | 3-5 days | 2-3 days | Named sessions for recovery |

### New Work (Feature Adoption)

| Item | Effort | Priority |
|------|--------|----------|
| Hook templates addon | 1-2 days | P0 |
| @-Mention utilities (in aiwg-utils) | 3-4 days | P0 |
| - Commands: mention-wire, mention-validate, mention-report | 1 day | |
| - Commands: mention-lint, mention-conventions | 0.5 days | |
| - CLI tools: wire-mentions.mjs, validate-mentions.mjs | 1-2 days | |
| - CLI tool: mention-lint.mjs (10 lint rules) | 1 day | |
| - Templates: code headers, artifact refs, conventions guide | 0.5 days | |
| Agent frontmatter updates | 1 day | P0 |
| Template @-mention updates (SDLC templates) | 2-3 days | P1 |
| Persona configs | 0.5 days | P1 |
| CLI wrapper updates | 0.5 days | P1 |

## Revised Phase 0

**Week 1 Focus** (now includes hook setup and @-mention system):

1. **Agent Design Bible** (unchanged)
2. **Responsibility Linter** (unchanged)
3. **Hook Templates** (NEW) - `aiwg-hooks` addon
4. **@-Mention Utilities** (NEW) - Added to `aiwg-utils` addon (core, auto-installed):
   - Commands: `/mention-wire`, `/mention-validate`, `/mention-report`, `/mention-lint`, `/mention-conventions`
   - CLI tools: `aiwg wire-mentions`, `aiwg validate-mentions`, `aiwg mention-report`, `aiwg mention-lint`
   - Templates: code header blocks, artifact reference patterns
   - Conventions guide: naming patterns, placement rules
   - Linting rules: 10 rules (ML001-ML010) with auto-fix support
5. **Prompt Library Reorganization** (from memory analysis)
6. **Agent Frontmatter Updates** - Add skills, permissionMode

## Open Questions

1. **Hook Compatibility**: Do hooks work with all providers (Claude, OpenAI, Factory)?
   - Action: Test and document provider-specific limitations

2. **Async Agent Limits**: How many background agents can run simultaneously?
   - Action: Benchmark and document limits

3. **Wake-up Message Format**: What's the structure of wake-up messages?
   - Action: Document in parallel-hints guide

4. **Named Session Persistence**: How long do named sessions persist?
   - Action: Test and document lifecycle

---

## Phase 2: Features Leverage (v2.0.73 → v2.1.33)

Review of Claude Code changelog (v2.0.73 → v2.1.33, Dec 2025 – Feb 2026) for AIWG optimization opportunities.

### 12. Opus 4.6 Model (v2.1.32)

**Feature**: Claude Opus 4.6 now available as the most capable model.

**Impact on AIWG**: **HIGH** - Our orchestration and complex multi-agent workflows benefit from the most capable model.

**AIWG Actions**:
1. Update agent definitions to use `opus` for complex orchestration agents (architecture designer, executive orchestrator)
2. Keep `sonnet` for high-volume agents (code reviewer, test engineer)
3. Keep `haiku` for lightweight tasks (Explore subagents, quick lookups)
4. Document model selection guidance in Agent Design Bible

### 13. Agent Teams (v2.1.32)

**Feature**: Multi-agent collaboration via tmux sessions with TeammateIdle and TaskCompleted hooks.

**Impact on AIWG**: **CRITICAL** - Native multi-agent coordination could replace or augment our orchestrator patterns.

**Current Pattern** (sequential orchestration):
```
Orchestrator → Task(agent-1) → wait → Task(agent-2) → wait → synthesize
```

**New Pattern** (team collaboration):
```
Agent-1 ←→ Agent-2 ←→ Agent-3
    ↓ TeammateIdle    ↓ TaskCompleted
         Orchestrator
```

**AIWG Actions**:
1. Evaluate agent teams for SDLC phase workflows (requirements ↔ architecture ↔ security)
2. Create hook handlers for TeammateIdle/TaskCompleted events
3. Document token cost vs benefit for team-based workflows
4. Consider team-based code review (reviewer + security auditor + test engineer)

**Status**: Experimental (`CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS=1`). Monitor for stability before adoption.

### 14. Automatic Memory (v2.1.32)

**Feature**: Claude automatically records and recalls memories as it works. Memory stored in `~/.claude/projects/<project>/memory/`.

**Impact on AIWG**: **HIGH** - Enables cross-session learning for AIWG workflows without manual memory management.

**AIWG Actions**:
1. Seed MEMORY.md with AIWG-specific patterns and conventions
2. Use auto-memory for tracking recurring issues across Ralph loops
3. Document memory management best practices for AIWG users
4. Consider pre-seeding project memory during `aiwg new` scaffolding

### 15. Agent Memory Frontmatter (v2.1.33)

**Feature**: `memory` field in agent frontmatter with `user`, `project`, or `local` scope.

**Impact on AIWG**: **HIGH** - Agents can now accumulate domain knowledge across sessions.

**AIWG Actions**:
1. Add `memory: project` to all SDLC agents that learn from project context:
   - Architecture Designer, Requirements Analyst, Domain Expert
2. Add `memory: user` to cross-project agents:
   - Security Auditor (remembers org-wide security patterns)
   - Technical Writer (remembers style preferences)
3. Document memory scope selection criteria in Agent Design Bible
4. Update agent template with memory field

**Example**:
```yaml
---
name: "Architecture Designer"
model: "opus"
memory: project
tools:
  allow: [Read, Write, Grep, Glob, Task(Explore)]
---
```

### 16. Task(agent_type) Restriction (v2.1.33)

**Feature**: Restrict which sub-agents an agent can spawn via `Task(agent_type)` in tools frontmatter.

**Impact on AIWG**: **HIGH** - Enables security-scoped agent hierarchies. Prevents agents from spawning unrestricted subagents.

**AIWG Actions**:
1. Add Task restrictions to all agent definitions:
   - Analyst agents: `Task(Explore)` only
   - Implementation agents: `Task(Explore)`, `Task(Bash)`
   - Orchestrator agents: Full `Task` access
2. Create permission tier matrix mapping agent roles to allowed subagent types
3. Update Agent Design Bible with subagent restriction patterns

**Example**:
```yaml
---
name: "Security Auditor"
tools:
  allow:
    - Read
    - Grep
    - Glob
    - Task(Explore)        # Can explore codebase
  deny:
    - Write                # Read-only
    - Bash                 # No shell access
    - Task(Bash)           # Can't spawn Bash subagents
---
```

### 17. Task Management System (v2.1.16)

**Feature**: Built-in task tracking with dependency management (TaskCreate, TaskUpdate, TaskGet, TaskList, TaskStop).

**Impact on AIWG**: **HIGH** - Native dependency-aware task tracking for SDLC workflows.

**Current Pattern**: Manual tracking in `.aiwg/working/` files.

**New Pattern**: Use built-in tasks for iteration tracking within sessions.

**AIWG Actions**:
1. Use TaskCreate at flow start to create phase checklist
2. Track artifact completion status via TaskUpdate
3. Use dependency tracking (blocks/blockedBy) for ordered deliverables
4. Integrate with Ralph loop iteration tracking
5. Document task management patterns for SDLC flows

### 18. Merged Skills and Commands (v2.1.3)

**Feature**: Slash commands and skills unified into a single concept. Both `.claude/commands/` and `.claude/skills/` work identically.

**Impact on AIWG**: Simplifies our distribution model - no need to differentiate between commands and skills.

**AIWG Actions**:
1. Consolidate documentation to refer to "skills" uniformly
2. Verify all AIWG skills work from both directories
3. Update plugin manifests if needed

### 19. Indexed Arguments (v2.1.19)

**Feature**: `$ARGUMENTS[0]`, `$ARGUMENTS[1]` for accessing individual arguments.

**Impact on AIWG**: Enables more structured skill arguments.

**AIWG Actions**:
1. Update skills that accept structured arguments to use indexed syntax
2. Document indexed argument patterns for AIWG skill developers

### 20. Plugin System (v2.1.14+)

**Feature**: Full plugin marketplace with discovery, installation, pinning to git SHAs, and auto-update.

**Impact on AIWG**: **CRITICAL** - This is AIWG's primary distribution mechanism.

**AIWG Actions**:
1. Ensure AIWG plugins are properly registered in marketplace
2. Pin stable releases to git commit SHAs
3. Test auto-update behavior for AIWG plugins
4. Document marketplace publishing workflow

### 21. MCP Tool Search Auto Mode (v2.1.7)

**Feature**: MCP tool descriptions automatically deferred when exceeding 10% of context window.

**Impact on AIWG**: **HIGH** - AIWG MCP servers (Gitea, Hound, IT Assets, Fortemi) can have many tools without context bloat.

**AIWG Actions**:
1. Verify our MCP servers work correctly with auto-deferred tool discovery
2. Optimize tool descriptions for ToolSearch discoverability
3. Document `auto:N` threshold configuration for AIWG users
4. Test MCP server behavior when tools are loaded on demand vs upfront

### 22. PreToolUse additionalContext (v2.1.9)

**Feature**: PreToolUse hooks can return `additionalContext` that gets injected into the model's context.

**Impact on AIWG**: **HIGH** - Enables dynamic context injection without bloating CLAUDE.md.

**AIWG Actions**:
1. Create PreToolUse hook that injects AIWG conventions when writing to `.aiwg/`:
   - Template format requirements
   - Naming conventions
   - Required @-mention patterns
2. Inject security rules when Bash tool is invoked
3. Inject voice profile when Write tool is used for content files
4. This is a lighter-weight alternative to loading everything into CLAUDE.md

**Example Hook**:
```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Write(.aiwg/**)",
        "hooks": [{
          "type": "command",
          "command": "echo '{\"additionalContext\": \"Follow AIWG artifact conventions: include frontmatter, references section, @-mentions.\"}'"
        }]
      }
    ]
  }
}
```

### 23. Hook Timeout Increase (v2.1.3)

**Feature**: Hook execution timeout increased from 60 seconds to 10 minutes.

**Impact on AIWG**: Test suites and security scans can now run as hooks without timeout risk.

**AIWG Actions**:
1. Enable pre-commit hooks that run full test suites
2. Add security gate hooks that run comprehensive scans
3. Update hook documentation with new timeout limits

### 24. PDF Page Ranges (v2.1.30)

**Feature**: Read tool supports `pages` parameter for PDFs. Large PDFs return lightweight references when @-mentioned.

**Impact on AIWG**: Research corpus PDFs can be selectively read without consuming full context.

**AIWG Actions**:
1. Update research tools to use page ranges when reading research papers
2. Document page range patterns for citation verification workflows
3. Update corpus health tools to leverage lightweight PDF references

### 25. Session-PR Linking (v2.1.27)

**Feature**: Sessions auto-link to PRs from `gh pr create`. `--from-pr` flag for resuming.

**Impact on AIWG**: Enables PR-centric workflows with automatic session tracking.

**AIWG Actions**:
1. Document PR-linked session patterns for code review flows
2. Add `--from-pr` to PR review skill workflow
3. Leverage session URL attribution in commits

### 26. Large Tool Outputs to Disk (v2.1.2)

**Feature**: Large bash/tool outputs saved to disk instead of truncated, accessible via file references.

**Impact on AIWG**: Full build outputs, test results, and log files are now accessible without truncation.

**AIWG Actions**:
1. Update Ralph loop patterns to read full test output from disk references
2. Improve debug memory with complete error context
3. Update executable feedback patterns to handle disk-based outputs

### 27. Partial Summarization (v2.1.32)

**Feature**: "Summarize from here" message selector for partial conversation summarization.

**Impact on AIWG**: Better context management for long SDLC sessions.

**AIWG Actions**:
1. Document partial summarization as a context management strategy
2. Use in long-running flows to preserve recent work while compacting history

### 28. Skills from Additional Directories (v2.1.32)

**Feature**: Skills from `--add-dir` directories auto-loaded. Nested `.claude/skills/` directories auto-discovered.

**Impact on AIWG**: AIWG skills deployed to multiple directories are automatically available.

**AIWG Actions**:
1. Verify AIWG skills in monorepo setups work with nested discovery
2. Document `--add-dir` patterns for multi-project AIWG deployments

### 29. Security Fixes (v2.1.2, v2.1.6, v2.1.7)

**Features**: Fixed permission bypass via shell line continuation, wildcard permission matching with shell operators, command injection in bash processing.

**Impact on AIWG**: Improved security baseline for our permission-based agent isolation.

**AIWG Actions**:
1. Audit AIWG permission patterns against fixed vulnerabilities
2. Update security documentation for agents
3. Verify agent isolation still works correctly after permission system changes

## Feature → AIWG Impact Matrix (v2.0.73 → v2.1.33)

| Feature | Version | Impact | Priority | Status |
|---------|---------|--------|----------|--------|
| Opus 4.6 | v2.1.32 | HIGH | P0 | Available |
| Agent Teams | v2.1.32 | CRITICAL | P1 | Experimental |
| Automatic Memory | v2.1.32 | HIGH | P0 | Available |
| Agent Memory Frontmatter | v2.1.33 | HIGH | P0 | Available |
| Task(agent_type) Restriction | v2.1.33 | HIGH | P0 | Available |
| Task Management | v2.1.16 | HIGH | P1 | Available |
| Merged Skills/Commands | v2.1.3 | MEDIUM | P2 | Available |
| Indexed Arguments | v2.1.19 | LOW | P2 | Available |
| Plugin System | v2.1.14 | CRITICAL | P0 | Available |
| MCP Auto Mode | v2.1.7 | HIGH | P1 | Available |
| PreToolUse additionalContext | v2.1.9 | HIGH | P1 | Available |
| Hook Timeout 10min | v2.1.3 | MEDIUM | P2 | Available |
| PDF Page Ranges | v2.1.30 | MEDIUM | P2 | Available |
| Session-PR Linking | v2.1.27 | MEDIUM | P2 | Available |
| Large Outputs to Disk | v2.1.2 | HIGH | P1 | Available |
| Partial Summarization | v2.1.32 | MEDIUM | P2 | Available |
| Skills from --add-dir | v2.1.32 | MEDIUM | P2 | Available |
| Security Fixes | Various | HIGH | P0 | Complete |

## Immediate Action Items (P0)

1. **Update agent definitions** with `memory: project/user` and `Task(agent_type)` restrictions
2. **Verify plugin marketplace** registration and SHA pinning
3. **Update model references** to include Opus 4.6 where appropriate
4. **Seed auto-memory** with AIWG patterns for new projects
5. **Audit permissions** against security fixes

## Near-Term Action Items (P1)

1. **Evaluate agent teams** for SDLC workflows (when stable)
2. **Create PreToolUse hooks** for AIWG context injection
3. **Leverage MCP auto mode** for large MCP tool sets
4. **Adopt task management** for flow tracking within sessions
5. **Update executable feedback** for disk-based tool outputs

## Open Questions (Updated)

1. **Agent Teams Stability**: When will teams exit experimental? Monitor releases.
2. **Memory Persistence**: How does auto-memory interact with `.aiwg/` artifacts? Test overlap.
3. **MCP Auto Mode Thresholds**: What's the optimal `auto:N` value for our tool count? Benchmark.
4. **Task Management vs Ralph**: How do built-in tasks complement Ralph loop tracking? Design integration.
5. **Hook Performance**: Does additionalContext injection add latency? Benchmark.

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2025-12-10 | AIWG Analysis | Initial feature leverage analysis from changelog review |
| 2025-12-10 | AIWG Analysis | Added @-mention wiring utilities to aiwg-utils addon plan |
| 2026-02-06 | AIWG Analysis | Phase 2 analysis: v2.0.73 → v2.1.33 (18 new feature assessments) |
