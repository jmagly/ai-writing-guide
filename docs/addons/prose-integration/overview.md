# prose-integration Overview

The prose-integration addon provides AIWG tools for working with OpenProse programs — Markdown files that use a contract model (`requires:`/`ensures:`) to define precise behavioral obligations. Five skills handle setup, reading, validation, execution, and wiring of Prose programs within AIWG sessions.

## What OpenProse Is

OpenProse programs are Markdown files with contract semantics. They run on Claude Code + Opus via an interpreter spec pattern: loading the `prose.md` specification into context causes the LLM to simulate the Prose VM, which then executes the `.md` program.

The key idea is the word `ensures`. In OpenProse contracts, `ensures:` is an **obligation**, not a description. The model treats it as a commitment that must be satisfied, not a statement of intent that can be approximated.

```markdown
requires:
  - artifact: the document to analyze

ensures:
  - result: comprehensive analysis scoring 85 or higher on the quality rubric

strategies:
  - when score is below threshold: refine and re-analyze

errors:
  - cannot proceed when input is empty
```

## The Seven Skills

### prose-detect

Locate an existing OpenProse installation using a 7-signal priority chain (env var → AIWG config → AIWG-local install → plugin manifest → user home → global CLI → not found). All other prose skills call this first. Never installs silently.

Manual trigger: `/prose-detect`

### prose-install

Install OpenProse for AIWG use when `/prose-detect` reports nothing is found. Confirms with the user before installing. Tries `npx skills add openprose/prose` first, falls back to git clone. Saves the resolved path to `.aiwg/config.json`.

Manual trigger: `/prose-install`

### prose-setup

Clone or update the OpenProse repository at the configured path (default: `/tmp/prose`). All other skills auto-invoke this on first use — you do not need to run it manually unless you want to trigger an update.

Manual trigger: `/prose-setup`

### prose-reader

Parse a `.prose` or `.md` OpenProse program and extract its contract structure: `requires:`, `ensures:`, `strategies:`, `errors:`, and `invariants:`. Produces a structured summary of what the program needs and what it commits to deliver.

Use this to understand a Prose program before running it.

Natural language trigger: "Read this Prose program," "What does this Prose contract require?"

### prose-validate

Validate a Prose program against the contract grammar without executing it. Checks that:
- Required contract sections are present (`requires:` and `ensures:` are mandatory)
- Each `ensures:` clause is stated as an obligation (not a description)
- `strategies:` conditions are syntactically valid
- `errors:` channels are defined

Use this before deploying or running a Prose program to catch contract authoring errors early.

Natural language trigger: "Validate this Prose program," "Check the Prose contract syntax."

### prose-run

Execute a Prose program within the current AIWG session. Requires Opus (the model must be "Prose Complete" to simulate the Prose VM). Execution state is stored in `.aiwg/working/prose-runs/`.

Single-component programs are the full program in one `.md` file. Multi-component programs use the Forme Container (see `forme-manifest` below) for wiring.

Natural language trigger: "Run this Prose program," "Execute the Prose spec."

### forme-manifest

For multi-service Prose programs: read all service contracts in the program directory and generate the Forme wiring manifest. The manifest maps the dependency graph between components, determining which outputs feed which inputs.

After generating the manifest, `prose-run` uses it to spawn sessions and manage state across components.

Natural language trigger: "Generate the Forme manifest," "Wire up this multi-service Prose program."

## Two-Phase Execution Model

Single-component programs (one `.md` file) skip Phase 1 and run directly.

Multi-component programs use both phases:

1. **Phase 1: Wiring** — `forme-manifest` reads all service contracts and auto-wires the dependency graph. No code, no schema — it infers the wiring from `requires:` and `ensures:` clauses.

2. **Phase 2: Execution** — `prose-run` reads the manifest, spawns sessions for each component in dependency order, manages state, and returns output.

## Detection and Installation

All skills automatically detect OpenProse on first use via `/prose-detect`. The 7-signal detection chain checks env vars, AIWG config, AIWG-local install, project plugin manifests, user home, and global CLI.

If no installation is found, skills report an error and suggest running `/prose-install`. Installation is never silent — the user must confirm before any files are written.

To manually trigger detection or installation:
```bash
/prose-detect    # find existing install
/prose-install   # install if not found
/prose-setup     # install or update (git pull if already present)
```

## Configuration

Override defaults in `aiwg.yml`:

```yaml
addons:
  prose-integration:
    proseRoot: /path/to/prose/skills/open-prose
    proseStateDir: .aiwg/working/prose-runs
    defaultModel: opus
```

| Parameter | Default | Description |
|-----------|---------|-------------|
| `proseRoot` | `/tmp/prose/skills/open-prose` | Path to OpenProse installation |
| `proseStateDir` | `.aiwg/working/prose-runs` | Execution state storage |
| `defaultModel` | `opus` | Model for Prose VM (must support Prose Complete) |

## Status

This addon is **experimental** (v0.1.0). The Prose VM spec and Forme Container spec are actively being developed in the OpenProse project. The AIWG integration tracks them.

## References

- OpenProse repository: `github.com/openprose/prose`
- `@$AIWG_ROOT/agentic/code/addons/prose-integration/skills/` — All skill definitions
- OpenProse spec: `prose.md` in the OpenProse installation (auto-downloaded)
- Forme Container spec: `forme.md` in the OpenProse installation (auto-downloaded)
