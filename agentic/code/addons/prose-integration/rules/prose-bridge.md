---
enforcement: medium
name: prose-bridge
level: MEDIUM
scope: universal
description: Guidance for when and how to invoke OpenProse programs from AIWG workflows, including contract mapping and integration patterns
---

# AIWG ↔ OpenProse Bridge Rule

## Purpose

Documents when and how to use OpenProse programs within AIWG workflows, establishing the integration surface between Prose's contract model and AIWG's agent orchestration.

## When to Consider Prose Programs

Use a `.prose` program instead of a custom multi-agent subagent chain when:

1. **Well-defined contracts**: The task has clear inputs (`requires:`) and clear expected outputs (`ensures:`) that can be stated as obligations
2. **Existing Prose example**: One of the 50+ bundled examples already solves a similar problem
3. **RLM patterns**: The task matches self-refine, divide-conquer, filter-recurse, or pairwise patterns
4. **Reproducibility**: The task benefits from a declarative specification that can be re-run identically

Do NOT use Prose programs when:

1. **Interactive workflows**: The task requires human-in-the-loop interaction mid-execution
2. **AIWG artifact generation**: The task produces AIWG-specific artifacts (SAD, ADRs, test plans) — use SDLC agents
3. **Platform-specific operations**: The task uses platform features Prose can't access
4. **Simple tasks**: If a single agent call suffices, Prose adds unnecessary overhead

## Integration Surface

The contract (`requires:` / `ensures:`) is the integration boundary:

```
AIWG Flow                    Prose Program
────────────                 ─────────────
Agent produces output  →  Maps to Prose `requires:` input
                             Program executes
Prose `ensures:` output  →  Maps to AIWG artifact path
```

### Mapping AIWG Artifacts to Prose Contracts

| AIWG Artifact | Prose `requires:` | Prose `ensures:` |
|---------------|-------------------|------------------|
| Source files | `- source_code: path to files` | `- analysis: findings report` |
| Requirements docs | `- requirements: use case document` | `- validation: traceability report` |
| Test results | `- test_output: test run results` | `- diagnosis: failure analysis` |
| Architecture docs | `- architecture: SAD document` | `- review: architecture review` |

### Where Prose Outputs Go

Prose program outputs should be written to AIWG artifact paths:
- Analysis results → `.aiwg/working/prose-runs/{run-id}/output.md`
- If the output is a formal deliverable → copy to appropriate `.aiwg/` subdirectory

## Contract Language Translation

| AIWG Pattern | Prose Equivalent | Notes |
|-------------|------------------|-------|
| Skill description | `ensures:` obligation | Prose `ensures` is stronger — it's a commitment |
| Skill triggers | No equivalent | Prose programs are invoked explicitly |
| Agent tools | No equivalent | Prose uses the host platform's tools |
| Quality gate (RLM) | `ensures: result scoring N+` | Same concept, different syntax |
| Decomposition strategy | `strategies: when X: Y` | Prose strategies are more flexible |

## Model Requirements

- **prose-reader**, **prose-validate**, **forme-manifest**: Sonnet is sufficient
- **prose-run**: Requires Opus ("Prose Complete" systems only)
- The Prose VM specification (`prose.md`) states that reliable execution requires a model capable of maintaining the VM simulation across the full program execution

## Example: Using Prose from an AIWG Flow

An SDLC flow that needs to analyze code quality could delegate to a Prose program:

```
Flow: flow-test-strategy-execution
  Step 1: Gather test results (AIWG agent)
  Step 2: Analyze failures using Prose self-refine program
    → /prose-run examples/40-rlm-self-refine/index.md
       requires: { artifact: test-results.md, criteria: "coverage gaps, flaky tests, missing edge cases" }
    ← ensures: { result: refined analysis scoring 85+ }
  Step 3: Create test plan from analysis (AIWG agent)
```

## State Management

- Prose uses `.prose/runs/{id}/` for execution state
- AIWG maps this to `.aiwg/working/prose-runs/` to stay within the AIWG working directory
- Prose state is ephemeral — it does not persist across sessions
- To preserve Prose outputs, copy them to the appropriate `.aiwg/` artifact directory

## References

- OpenProse: `github.com/openprose/prose`
- Prose VM spec: `{proseRoot}/prose.md`
- Forme Container spec: `{proseRoot}/forme.md`
- AIWG RLM addon: `agentic/code/addons/rlm/`
- Related issues: #617, #618, #619, #620
