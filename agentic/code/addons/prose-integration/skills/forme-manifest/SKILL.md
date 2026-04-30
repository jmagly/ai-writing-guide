---
namespace: aiwg
name: forme-manifest
description: Read a multi-service OpenProse program directory, analyze all service contracts, and generate the Forme wiring manifest for inspection and debugging
version: 0.1.0
platforms: [all]
requires:
  - "program-dir: path to directory containing a multi-service OpenProse program (index.md with kind: program and services: list)"
ensures:
  - wiring-manifest: human-readable manifest showing service contracts, dependency graph, and execution order
  - mermaid-diagram: visual dependency graph in Mermaid LR format
  - issues: list of unwired dependencies, unused outputs, or circular dependency errors
errors:
  - prose-not-found: OpenProse installation not detected; run /prose-detect for guidance
  - not-multi-service: target is a single-component program; wiring manifest not applicable
  - circular-dependency: services form a dependency cycle; execution order cannot be determined
invariants:
  - no program execution occurs — forme-manifest is a static analysis tool
  - ambiguous wiring (multiple possible sources for one requires:) is reported, not silently resolved
---

# Forme Manifest Skill

You analyze a multi-service OpenProse program directory by reading all service contracts and generating the wiring manifest that the Forme Container would produce — without executing the program.

## Triggers

- "show forme manifest" / "generate wiring manifest"
- "how does this prose program wire together"
- "forme manifest [path]"
- "show dependency graph for [program]"
- "what's the wiring for [program]"

## Input

A path to a directory containing a multi-service OpenProse program (must have an `index.md` with `kind: program` and a `services:` list).

## Behavior

### Step 0: Detect OpenProse Installation

Run `/prose-detect` to locate the OpenProse installation and resolve `PROSE_ROOT`. The Forme Container spec at `$PROSE_ROOT/forme.md` drives the wiring semantics used in this analysis. If not found, stop and report:

```
OpenProse not found. Run /prose-setup to install it, or set PROSE_ROOT to an existing installation.
```

### Step 1: Read Entry Point

Read `index.md` (or the specified entry file) in the directory. Extract:
- Program name
- Services list
- Program-level `requires:` (external inputs)
- Program-level `ensures:` (final outputs)

### Step 2: Read All Service Contracts

For each service in the `services:` list:
1. Read `{service-name}.md` from the same directory
2. Extract `requires:` (what this service needs)
3. Extract `ensures:` (what this service produces)
4. Extract `strategies:` (conditional behavior)

### Step 3: Build Dependency Graph

Match outputs to inputs by semantic understanding:

For each service's `requires:` entry:
1. Check if it matches the program's `requires:` (external input)
2. Check if it matches another service's `ensures:` (internal wiring)
3. If no match found: flag as **unwired dependency**

For each service's `ensures:` entry:
1. Check if it's consumed by another service's `requires:`
2. Check if it maps to the program's `ensures:` (final output)
3. If not consumed: flag as **unused output** (warning)

### Step 4: Determine Execution Order

Build a topological sort of the dependency graph:
- Services with only external inputs execute first
- Services depending on other services' outputs execute after their dependencies
- Services with no dependencies between them can execute in parallel

### Step 5: Output Manifest

```markdown
## Forme Wiring Manifest

**Program**: {name}
**Services**: {count}
**External Inputs**: {count}
**Final Outputs**: {count}

### Service Contracts

| Service | Requires | Ensures |
|---------|----------|---------|
| {name} | {requires list} | {ensures list} |

### Wiring Graph

```
{service_a}.{output} → {service_b}.requires.{input}
{service_b}.{output} → {service_c}.requires.{input}
{program}.requires.{input} → {service_a}.requires.{input}
{service_c}.{output} → {program}.ensures.{output}
```

### Execution Order

1. {service_a} (depends on: external inputs only)
2. {service_b} (depends on: {service_a})
3. {service_c} (depends on: {service_b})

**Parallel groups**: [{service_a}] → [{service_b}] → [{service_c}]

### Issues

- {any unwired dependencies}
- {any unused outputs}
- {any circular dependencies}

### Mermaid Diagram

```mermaid
graph LR
    Input[Program Input] --> A[{service_a}]
    A --> B[{service_b}]
    B --> C[{service_c}]
    C --> Output[Program Output]
```
```

## Edge Cases

- **Single-component program**: Report that wiring is not needed — program is self-contained
- **Missing service file**: Report as error with path that was expected
- **Circular dependency**: Report as error — cannot determine execution order
- **Ambiguous wiring**: When multiple services could satisfy a requirement, list all candidates and flag for human decision

## Model

This skill runs on **Sonnet** — contract analysis requires moderate reasoning but not Opus-level complexity.

## References

- @$AIWG_ROOT/agentic/code/addons/prose-integration/README.md — prose-integration addon overview
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/research-before-decision.md — Run prose-detect before operating
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/vague-discretion.md — Report ambiguous wiring explicitly rather than resolving silently
- @$AIWG_ROOT/docs/cli-reference.md — CLI reference for AIWG addon integration commands
