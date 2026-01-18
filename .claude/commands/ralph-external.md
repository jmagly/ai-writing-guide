---
description: Start an external Ralph loop for crash-resilient iterative task execution
category: sdlc-orchestration
argument-hint: "<objective>" --completion "<criteria>" [--max-iterations N] [--verbose] [--checkpoint-interval M]
allowed-tools: Bash, Read, Write
model: opus
---

# /ralph-external

Start an **External Ralph Loop** - a supervisor that wraps Claude Code sessions to provide crash recovery, cross-session persistence, and comprehensive state capture for long-running sessions (6-8 hours).

## Arguments

| Argument | Type | Required | Description |
|----------|------|----------|-------------|
| `<objective>` | string | Yes | Task objective |
| `--completion` | string | Yes | Verifiable completion criteria |
| `--max-iterations` | number | No | Max external iterations (default: 5) |
| `--model` | string | No | Claude model (default: opus) |
| `--budget` | number | No | Budget per iteration USD (default: 2.0) |
| `--timeout` | number | No | Timeout per iteration minutes (default: 60) |
| `--verbose` | flag | No | Enable verbose Claude output for debugging |
| `--checkpoint-interval` | number | No | Checkpoint interval minutes (default: 30) |
| `--no-snapshots` | flag | No | Disable pre/post session snapshots |
| `--no-checkpoints` | flag | No | Disable periodic checkpoints |
| `--use-claude-assessment` | flag | No | Use Claude for state assessment |
| `--key-files` | string | No | Comma-separated key files to track |
| `--gitea-issue` | flag | No | Create Gitea issue for tracking |

## When to Use

Use External Ralph when:
- Task may take longer than a single session
- Context corruption is a risk
- You need crash recovery
- Progress tracking across sessions is important

Use Internal Ralph (`/ralph`) for:
- Tasks that fit within a single session
- Fast iteration cycles
- Simple verification criteria

## Workflow

Each iteration follows a comprehensive capture flow:

1. **Pre-Session Snapshot** - Captures git status, .aiwg state, file hashes
2. **Prompt Generation** - Context-aware prompt with learnings and progress
3. **Checkpoint Manager Start** - Begins periodic state snapshots
4. **Session Launch** - Spawns Claude with stdout/stderr/transcript capture
5. **Checkpoint Manager Stop** - Final checkpoint summary
6. **Post-Session Snapshot** - Captures changes, calculates diff
7. **Output Analysis** - Determines completion/continuation
8. **State Update** - Records all capture artifacts

## Capture Features

| Feature | Default | Description |
|---------|---------|-------------|
| Pre/Post Snapshots | Enabled | Git and .aiwg state before/after session |
| Periodic Checkpoints | Enabled | State snapshots every 30 min during session |
| Session Transcript | Always | Claude transcript from ~/.claude/projects/ |
| Stream-JSON Parsing | Always | Tool calls, errors, completions extracted |
| Verbose Output | Disabled | Enable with --verbose for debugging |

## Examples

```bash
# Simple task
/ralph-external "Fix all failing tests" --completion "npm test passes"

# With enhanced capture
/ralph-external "Implement user authentication" \
  --completion "npm test -- --testPathPattern=auth passes" \
  --max-iterations 10 \
  --verbose \
  --checkpoint-interval 15

# Long-running migration (6-8 hours)
/ralph-external "Migrate codebase to TypeScript" \
  --completion "npx tsc --noEmit exits 0" \
  --max-iterations 20 \
  --budget 5.0 \
  --checkpoint-interval 20 \
  --key-files "package.json,tsconfig.json,CLAUDE.md"

# With Claude-powered assessment
/ralph-external "Complex refactoring task" \
  --completion "npm test && npm run lint" \
  --max-iterations 15 \
  --use-claude-assessment \
  --gitea-issue

# Minimal capture (faster)
/ralph-external "Quick fix" \
  --completion "npm test passes" \
  --no-checkpoints
```

## State Directory

```
.aiwg/ralph-external/
├── session-state.json           # Active loop state
├── iterations/
│   └── 001/
│       ├── prompt.md            # Prompt used
│       ├── stdout.log           # Captured stdout
│       ├── stderr.log           # Captured stderr
│       ├── pre-snapshot.json    # State before session
│       ├── post-snapshot.json   # State after session
│       ├── snapshot-diff.json   # Changes detected
│       ├── analysis.json        # Output analysis
│       ├── state-assessment.json # Two-phase assessment
│       ├── session-transcript.jsonl # Claude transcript
│       ├── parsed-events.json   # Stream-JSON events
│       └── checkpoints/
│           ├── 001-checkpoint.json
│           ├── 002-checkpoint.json
│           └── ...
├── prompts/                      # All generated prompts
├── analysis/                     # All analysis results
└── completion-report.md          # Final summary
```

## Natural Language Triggers

- "Start external ralph loop for..."
- "Run crash-resilient loop to..."
- "Execute long-running task..."

## References

- @tools/ralph-external/orchestrator.mjs - Main loop logic
- @tools/ralph-external/index.mjs - CLI entry point
- @tools/ralph-external/snapshot-manager.mjs - Pre/post session snapshots
- @tools/ralph-external/checkpoint-manager.mjs - Periodic checkpoints
- @tools/ralph-external/state-assessor.mjs - Two-phase assessment
- @tools/ralph-external/session-launcher.mjs - Claude CLI wrapper
- @.claude/agents/ralph-output-analyzer.md - Output analyzer
