# OpenProse Integration Addon

**Version**: 0.1.0
**Status**: Experimental
**Requires**: OpenProse installed (cloned to `/tmp/prose` or configured path)

## Overview

Provides AIWG tools for working with OpenProse programs — reading, parsing, validating, and executing `.md` programs that use the `requires:`/`ensures:` contract model.

OpenProse programs are Markdown files with contract semantics. They run natively on Claude Code + Opus via the interpreter spec pattern (loading `prose.md` into context causes the LLM to simulate the Prose VM).

## Components

| Component | Type | Description |
|-----------|------|-------------|
| **prose-setup** | Skill | Clone/update the OpenProse repo; auto-invoked by other skills when needed |
| **prose-reader** | Skill | Parse a `.prose`/`.md` program and extract its contract |
| **prose-run** | Skill | Execute a Prose program within the current AIWG session |
| **prose-validate** | Skill | Validate a Prose program against contract grammar without executing |
| **forme-manifest** | Skill | Read multi-service program and generate the Forme wiring manifest |
| **prose-bridge** | Rule | Guidance for when and how to invoke Prose programs from AIWG workflows |

## Auto-Install

All prose-integration skills **automatically install OpenProse** if it's not already present. On first use of any prose skill, the agent will:

1. Check if the OpenProse repo exists at the configured path (default: `/tmp/prose`)
2. If not found: clone `https://github.com/openprose/prose.git` automatically
3. If found but outdated: pull latest from `main`
4. Verify key spec files exist (`prose.md`, `forme.md`, examples)

No manual setup required — just use the skills and OpenProse will be installed on demand.

To manually trigger setup or update: `/prose-setup`

## Quick Start

```bash
# Deploy the addon
aiwg use prose-integration

# Read a Prose program's contract (auto-installs OpenProse if needed)
/prose-reader /tmp/prose/skills/open-prose/examples/40-rlm-self-refine/index.md

# Validate a program
/prose-validate /tmp/prose/skills/open-prose/examples/42-rlm-filter-recurse/index.md

# Generate wiring manifest for a multi-service program
/forme-manifest /tmp/prose/skills/open-prose/examples/41-rlm-divide-conquer/

# Execute a Prose program (requires Opus)
/prose-run /tmp/prose/skills/open-prose/examples/40-rlm-self-refine/index.md
```

## Configuration

| Parameter | Default | Description |
|-----------|---------|-------------|
| `proseRoot` | `/tmp/prose/skills/open-prose` | Path to OpenProse installation |
| `proseStateDir` | `.aiwg/working/prose-runs` | Where execution state is stored |
| `defaultModel` | `opus` | Model for Prose VM execution (must be Prose Complete) |

Override in `aiwg.yml`:
```yaml
addons:
  prose-integration:
    proseRoot: /path/to/prose/skills/open-prose
```

## Two-Phase Execution Model

Prose programs run in two phases:

1. **Phase 1: Wiring** (Forme Container) — reads service contracts, auto-wires dependency graph, produces manifest
2. **Phase 2: Execution** (Prose VM) — reads manifest, spawns sessions, manages state, returns output

Single-component programs skip Phase 1 — the `.md` file is the entire program.

## Contract Semantics

Prose programs use a contract language:

| Contract Element | Purpose | Example |
|-----------------|---------|---------|
| `requires:` | Input declarations | `- artifact: the document to analyze` |
| `ensures:` | Output obligations (not descriptions) | `- result: comprehensive analysis scoring 85+` |
| `strategies:` | Conditional behavior | `- when score is below threshold: refine` |
| `errors:` | Failure channels | `- cannot proceed when input is empty` |
| `invariants:` | Unconditional properties | `- audit log is always appended` |

The word `ensures` carries **obligation** — the model treats it as a commitment, not a description.

## Dependencies

**Required**: None (skills work independently)

**Optional**:
- **rlm**: Enhanced when RLM patterns match Prose examples
- **aiwg-utils**: Development utilities

## References

- OpenProse: `github.com/openprose/prose`
- Prose VM spec: `prose.md` in the OpenProse installation
- Forme Container spec: `forme.md` in the OpenProse installation
- Design tenets: `guidance/tenets.md`
- Related: Issue #617 (OpenProse review), Issue #618 (RLM patterns), Issue #620 (gap analysis)

---

**License**: MIT
**Author**: AIWG Contributors
