---
namespace: aiwg
name: team
platforms: [all]
description: Orchestrate multi-agent teams across AIWG providers natively on Claude Code or emulated via Mission Control elsewhere
---

# team

You orchestrate multi-agent teams across all AIWG providers. On Claude Code, teams run natively via the Task tool. On all other providers, you emulate team execution through `aiwg mc` (Mission Control). Team definitions live in `agentic/code/frameworks/sdlc-complete/teams/`.

## Triggers

Alternate expressions and non-obvious activations (primary phrases are matched automatically from the skill description):

- "spin up a team" → `team run` with named team
- "who's on the security review team" → `team info`
- "what teams do I have" → `team list`
- "run the greenfield team on this task" → `team run greenfield "<task>"`

## Trigger Patterns Reference

| Pattern | Example | Action |
|---------|---------|--------|
| Run a named team | "run the sdlc-review team on the SAD" | `aiwg team run sdlc-review "<task>"` |
| List available teams | "what teams are available" | `aiwg team list` |
| Inspect team composition | "who is on the security review team" | `aiwg team info security-review` |
| Task-inferred team | "review this architecture for security" | `aiwg team run security-review "<task>"` |

## Behavior

When triggered:

1. **Parse the subcommand**:
   - `run <team-name> "<task>"` — execute team against a task
   - `list` — list all available teams from the manifest
   - `info <team-name>` — show team composition and use cases

2. **Detect provider**:
   - Claude Code (`CLAUDE_CODE_VERSION` set) → native Task-tool dispatch
   - All other providers → emulate via `aiwg mc dispatch`

3. **Run the appropriate command**:

   ```bash
   # Run a team on a task
   aiwg team run sdlc-review "Review the SAD at .aiwg/architecture/sad.md"

   # Run with provider override
   aiwg team run security-review "Audit auth module" --provider cursor

   # List all teams
   aiwg team list

   # Inspect a team
   aiwg team info greenfield
   ```

4. **Report execution progress**:
   - Native (Claude Code): reports inline as agents complete
   - Emulated (mc): reports mission IDs and tracks via `aiwg mc status`

## Team Definitions

Teams are defined as JSON files in `agentic/code/frameworks/sdlc-complete/teams/`. Built-in teams:

| Team | Use Cases |
|------|-----------|
| `sdlc-review` | Architecture, requirements, and test review |
| `security-review` | Threat modeling, security audit, privacy review |
| `api-development` | API design, documentation, test generation |
| `full-stack` | Feature implementation across layers |
| `greenfield` | New project inception and architecture |
| `maintenance` | Refactoring, debt reduction, upgrades |
| `migration` | Database or platform migration planning |

## Team Definition Format

```yaml
# .aiwg/teams/my-team.yaml  (project-local override)
name: Custom Review Team
slug: custom-review
description: Tailored review for domain-specific concerns
agents:
  - agent: security-architect
    role: lead
    responsibilities:
      - Security threat model
      - Auth design review
  - agent: test-architect
    role: contributor
    responsibilities:
      - Test coverage gaps
      - Integration risks
  - agent: technical-writer
    role: reviewer
    responsibilities:
      - Clarity and consistency
dispatch: parallel
```

## Execution Modes

### Native (Claude Code)

Agents launch as parallel Task tool calls in a single message. Each agent runs independently with its assigned prompt, and results are collected and synthesized.

### Emulated (All Other Providers)

```bash
# Steward emulates by dispatching via Mission Control
SESSION=$(aiwg mc start --name "team-run-$(date +%s)")
aiwg mc dispatch $SESSION "security-architect: <task>" --completion "Review complete"
aiwg mc dispatch $SESSION "test-architect: <task>" --completion "Review complete"
aiwg mc watch $SESSION
```

## Examples

### Example 1: Run a review team

**User**: "Run the security review team on the auth module"

**Extraction**: `team run security-review` on the auth module

**Action**:
```bash
aiwg team run security-review "Review src/auth/ for security vulnerabilities, focusing on token handling and session management"
```

**Response** (Claude Code, native):
```
Launching security-review team (3 agents, parallel)...
  security-architect: reviewing...
  security-auditor:   reviewing...
  privacy-officer:    reviewing...

Results collected. 2 critical findings, 4 recommendations.
Full report: .aiwg/working/team-runs/security-review-20260401-143022.md
```

### Example 2: List teams

**User**: "What teams do I have available?"

**Action**:
```bash
aiwg team list
```

**Response**:
```
Available teams (7):
  api-development   API design, documentation, test generation
  full-stack        Feature implementation across layers
  greenfield        New project inception and architecture
  maintenance       Refactoring, debt reduction, upgrades
  migration         Database or platform migration planning
  sdlc-review       Architecture, requirements, and test review
  security-review   Threat modeling, security audit, privacy review
```

### Example 3: Inspect team composition

**User**: "Who is on the sdlc-review team?"

**Action**:
```bash
aiwg team info sdlc-review
```

**Response**:
```
Team: sdlc-review
Description: Architecture, requirements, and test review
Dispatch: parallel

Agents:
  architecture-designer  [lead]        Architecture quality and pattern review
  requirements-analyst   [contributor] Requirements traceability and completeness
  test-architect         [contributor] Testability and coverage gaps
  technical-writer       [reviewer]    Clarity and documentation quality

Use cases:
  - SAD review before Architecture Baseline Milestone
  - Elaboration phase gate check
  - ADR peer review
```

## Clarification Prompts

If the user names a task without a team:

- "Which team should I run? Available: sdlc-review, security-review, api-development, full-stack, greenfield, maintenance, migration"

If the team name is ambiguous:

- "Did you mean `security-review` or `sdlc-review`?"

## References

- @$AIWG_ROOT/src/cli/handlers/team.ts — Team command handler
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/teams/ — Built-in team definitions
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/teams/manifest.json — Team manifest
- @$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/teams/schema.json — Team definition schema
- @$AIWG_ROOT/docs/cli-reference.md — CLI reference
