---
namespace: aiwg
name: prose-reader
description: Read and parse an OpenProse program file, extracting its contract (requires, ensures, strategies, errors, invariants) and services into a structured representation
version: 0.1.0
platforms: [all]

---

# Prose Reader Skill

You read and parse OpenProse program files (`.md` with contract semantics), extracting the full contract specification into a structured, human-readable summary.

## Triggers

- "read prose program" / "parse prose file"
- "what does [file] require and ensure"
- "show me the contract for [file]"
- "extract prose contract from [path]"
- "what are the inputs and outputs of [program]"

## Input

A path to a `.md` file that is an OpenProse program (has `requires:` and/or `ensures:` sections).

## Behavior

Given a path to an OpenProse program file:

### Step 0: Detect OpenProse Installation

Before any operation, run `/prose-detect` to locate the OpenProse installation and resolve `PROSE_ROOT`. `/prose-detect` handles the full detection chain (env var, AIWG config, AIWG-local install, project plugin manifest, user home, global CLI).

If `/prose-detect` reports no installation found, do NOT auto-clone. Inform the user:

```
OpenProse not found. Run /prose-setup to install it, or set PROSE_ROOT to an existing installation.
```

### Step 1: Read the File

Read the target file using the Read tool.

### Step 2: Parse Frontmatter

Extract YAML frontmatter fields:
- `name` — program name
- `kind` — `program`, `service`, `library`, or `test`
- `services` — list of service component names (multi-service programs only)
- `model` — preferred model if specified
- Any other frontmatter fields

### Step 3: Extract Contract Elements

Parse the markdown body for contract sections. Each section uses a specific keyword followed by a colon and a list:

| Section | Keyword | Format | Meaning |
|---------|---------|--------|---------|
| Inputs | `requires:` | `- name: description` | What the program needs to run |
| Outputs | `ensures:` | `- name: description` | What the program commits to produce (obligation) |
| Conditional behavior | `strategies:` | `- when condition: action` | How to handle specific situations |
| Failure channels | `errors:` | `- condition description` | When the program cannot proceed |
| Invariants | `invariants:` | `- property description` | Properties that always hold |

### Step 4: Identify Services

If `kind: program` and `services:` is present in frontmatter:
- List each service name
- Check if corresponding `.md` file exists in the same directory
- Note any missing service files

### Step 5: Output Structured Summary

Format the extracted information as:

```markdown
## Program: {name}

**Kind**: {kind}
**Services**: {services list or "single-component"}
**Model**: {model or "not specified"}

### Requires (Inputs)
| Name | Description |
|------|-------------|
| {name} | {description} |

### Ensures (Outputs — Obligations)
| Name | Description |
|------|-------------|
| {name} | {description} |

### Strategies
- when {condition}: {action}

### Errors
- {error condition}

### Invariants
- {invariant property}

### Services
| Service | File | Exists |
|---------|------|--------|
| {name} | {name}.md | {yes/no} |
```

## Edge Cases

- **No `requires:`**: Report as "No declared inputs (implicit)"
- **No `ensures:`**: Flag as warning — all valid programs should have ensures
- **Conditional ensures**: `ensures:` entries with `when` clauses — parse and display the condition
- **Nested services**: If a service itself has `services:`, note the nesting
- **Legacy `.prose` files**: Treat identically to `.md` files

## Model

This skill runs on **Sonnet** — parsing and extraction don't require complex reasoning.

## References

- @$AIWG_ROOT/agentic/code/addons/prose-integration/README.md — prose-integration addon overview
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/research-before-decision.md — Run prose-detect before reading any program file
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/instruction-comprehension.md — Extract all contract fields; do not skip optional sections
- @$AIWG_ROOT/docs/cli-reference.md — CLI reference for AIWG addon integration commands
