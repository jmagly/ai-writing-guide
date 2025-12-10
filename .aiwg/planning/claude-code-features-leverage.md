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

### 1. @-Mention Traceability System

**Purpose**: Leverage @-mentions for live document references throughout SDLC artifacts.

**Components**:
```
agentic/code/addons/traceability/
├── manifest.json
├── README.md
├── templates/
│   ├── code-header-block.md       # Template for code file headers with @-mentions
│   ├── artifact-references.md     # Template for doc cross-references
│   └── traceability-matrix.md     # @-mention based traceability matrix
├── linters/
│   └── mention-validator.mjs      # Validate @-mentions resolve to real files
└── guides/
    └── @-mention-conventions.md   # Naming conventions for @-mentions
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
| @-Mention traceability addon | 1-2 days | P0 |
| Agent frontmatter updates | 1 day | P0 |
| Template @-mention updates | 2-3 days | P1 |
| Persona configs | 0.5 days | P1 |
| CLI wrapper updates | 0.5 days | P1 |

## Revised Phase 0

**Week 1 Focus** (now includes hook setup and @-mention system):

1. **Agent Design Bible** (unchanged)
2. **Responsibility Linter** (unchanged)
3. **Hook Templates** (NEW) - `aiwg-hooks` addon
4. **@-Mention Traceability** (NEW) - `traceability` addon with conventions and linter
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

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2025-12-10 | AIWG Analysis | Initial feature leverage analysis from changelog review |
