# OpenProse Integration Guide

Practical guide for using OpenProse programs within AIWG workflows. For conceptual overview, see `overview.md`.

## Quick Start

```bash
# 1. Check if OpenProse is available
/prose-detect

# 2. If not found, install it
/prose-install

# 3. Validate a program before running
/prose-validate path/to/program.md

# 4. Run a program
/prose-run path/to/program.md
```

## Installation

The `prose-detect` skill finds OpenProse if you already have it installed (via `npx skills add openprose/prose`, git clone, or prior usage). If not found, `prose-install` handles it:

```bash
/prose-install
# → Prompts for confirmation, then installs to ~/.aiwg/prose/
# → Saves path to .aiwg/config.json for future sessions
```

Once installed, all prose skills find it automatically — you don't need to run install again.

## Providing a Custom Install Path

If you have OpenProse installed somewhere specific:

```bash
# Option 1: Environment variable (per-session)
export PROSE_ROOT=/path/to/prose/skills/open-prose

# Option 2: AIWG config (persists across sessions)
# .aiwg/config.json
{
  "prose": {
    "path": "/path/to/prose/skills/open-prose"
  }
}

# Option 3: Project plugin manifest (auto-detected)
# .claude-plugin/plugin.json
{
  "name": "open-prose",
  "path": "./prose"
}
```

## Running Programs

### Single-Component Program

A single `.md` file with `requires:`, `ensures:`, and the program body:

```bash
/prose-run my-analysis.md
# → Loads prose.md spec, executes program, returns ensures: outputs
```

### Multi-Component Program

A directory with `index.md` (`kind: program`) and service files:

```bash
# Preview the wiring before running
/forme-manifest my-program/
# → Shows service contracts, dependency graph, execution order, Mermaid diagram

# Run the full program
/prose-run my-program/index.md
# → Phase 1: Forme wiring → Phase 2: Prose VM execution
```

### Reading a Program's Contract

Before running, understand what a program needs and what it delivers:

```bash
/prose-reader my-analysis.md
# → Extracts requires:, ensures:, errors:, invariants: into structured summary
```

## Model Requirements

`prose-run` requires **Opus**. The Prose VM specification requires a model capable of reliably simulating the VM across the full program execution. Sonnet may produce partial or incorrect results for complex programs.

All other prose skills (detect, reader, validate, forme-manifest, install) run on **Haiku** or **Sonnet**.

## Using Prose from AIWG Flows

The integration surface is the contract — Prose `requires:` maps to AIWG outputs; Prose `ensures:` maps to AIWG artifact inputs.

```
AIWG agent produces output  →  Prose program requires:
Prose program ensures:      →  AIWG agent or artifact receives
```

### Example: Research Analysis via Prose Self-Refine

An SDLC flow that needs high-quality analysis can delegate to a Prose program:

```
Flow: flow-test-strategy-execution

Step 1: Gather test results (AIWG agent)
Step 2: Run Prose self-refine analysis
  /prose-run examples/40-rlm-self-refine/index.md
  Input → requires: { artifact: test-results.md, criteria: "coverage, flaky tests" }
  Output ← ensures: { result: analysis scoring 85+ }
Step 3: Create test plan from analysis (AIWG agent)
```

### When to Use Prose vs. AIWG Agents

**Use Prose when:**
- Task has clear `requires:`/`ensures:` contract that can be stated as obligations
- One of the 50+ bundled Prose examples matches the pattern
- Reproducibility matters — declarative spec can be re-run identically
- Quality must be formally committed to (not just described)

**Use AIWG agents when:**
- Workflow is interactive (requires human-in-the-loop mid-execution)
- Task produces AIWG-specific artifacts (SAD, ADRs, test plans) — use SDLC agents
- Task is simple enough that a single agent call suffices
- Platform-specific features are needed that Prose can't access

## Execution State

Prose run artifacts are stored at `.aiwg/working/prose-runs/{run-id}/`. This is ephemeral — it does not persist across sessions. To preserve outputs as formal AIWG artifacts, copy them to the appropriate `.aiwg/` subdirectory.

## Debugging

```bash
# Check detection chain
/prose-detect
# → Reports which signal resolved PROSE_ROOT

# Validate before running (catches contract authoring errors)
/prose-validate program.md

# Preview wiring for multi-service programs
/forme-manifest program-dir/
# → Shows dependency graph without executing
```

## Configuration Reference

| Config Key | Env Var | Default | Description |
|------------|---------|---------|-------------|
| `prose.path` | `PROSE_ROOT` | auto-detect | Path to `skills/open-prose/` |
| `prose.stateDir` | — | `.aiwg/working/prose-runs` | Execution state directory |
| `prose.defaultModel` | — | `opus` | Model for prose-run |

Set in `.aiwg/config.json` or `aiwg.yml` under `addons.prose-integration`.

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `prose-detect` reports not found | Run `/prose-install` |
| prose-run gives wrong results | Verify model is Opus; Sonnet is insufficient |
| Stale path in config | Delete `.aiwg/config.json prose.path` and re-run `/prose-detect` |
| Multi-service wiring fails | Run `/forme-manifest` first to check for unwired dependencies |
| Program runs but output is wrong | Run `/prose-validate` to check contract structure |
