---
enforcement: medium
---

# AIWG Directory Reference Contract

**Enforcement Level**: MEDIUM
**Scope**: aiwg-development
**Addon**: aiwg-dev (devOnly)

## Overview

Skills and agents in `agentic/code/` may reference `.aiwg/` paths — this is a feature, not a problem. When a skill references `.aiwg/requirements/` or `.aiwg/AIWG.md`, it gains project-specific context when deployed to any user project. **The constraint is that only normalized paths may be referenced** — paths guaranteed to exist after `aiwg init` or framework deployment.

The normalized contract is **manifest-derived**: each framework and addon declares its `.aiwg/` footprint in `memory.creates`. The allowlist is computed from those declarations, not maintained as a static document.

## Tier 1: Always Present (aiwg init)

These paths exist in every AIWG project, regardless of which frameworks are installed:

| Path | Created by | Purpose |
|------|-----------|---------|
| `.aiwg/AIWG.md` | `aiwg init` | Project context entry point — phase, architecture summary, installed frameworks |
| `.aiwg/frameworks/registry.json` | `aiwg use <framework>` | Installed framework registry |

## Tier 2: Framework-Specific (present when framework deployed)

These paths are normalized per the `memory.creates` declarations in framework manifests:

| Path | Requires | Purpose |
|------|----------|---------|
| `.aiwg/requirements/` | sdlc-complete | User stories, use cases, NFRs |
| `.aiwg/architecture/` | sdlc-complete | SAD, ADRs, diagrams |
| `.aiwg/planning/` | sdlc-complete | Phase plans, iteration plans |
| `.aiwg/risks/` | sdlc-complete | Risk register, mitigations |
| `.aiwg/testing/` | sdlc-complete | Test strategy, test plans |
| `.aiwg/security/` | sdlc-complete | Threat models, security gates |
| `.aiwg/deployment/` | sdlc-complete | Deployment plans, runbooks |
| `.aiwg/intake/` | sdlc-complete | Project intake documents |
| `.aiwg/patterns/` | sdlc-complete | AI behavior pattern catalogs |
| `.aiwg/incidents/` | sdlc-complete | Incident reports and post-mortems |
| `.aiwg/regression/` | sdlc-complete | Regression tracking records |
| `.aiwg/archive/` | sdlc-complete | Phase completion archives |
| `.aiwg/management/` | sdlc-complete | Project management artifacts |
| `.aiwg/ux/` | sdlc-complete | UX artifacts: wireframes, research, templates |
| `.aiwg/compliance/` | sdlc-complete | Compliance documentation |
| `.aiwg/research/` | research-complete | Research artifacts |
| `.aiwg/forensics/` | forensics-complete | Digital forensics artifacts |

Skills referencing Tier 2 paths should declare the required framework in their `requires` field.

## Tier 3: Repo-Local (NOT safe in distributable skills)

Any `.aiwg/` path not declared in any installed component's `memory.creates` is Tier 3. These paths only exist in the AIWG development repository and silently fail in all user projects.

| Path | Why unsafe |
|------|-----------|
| `.aiwg/planning/issue-driven-ralph-loop-design.md` | Specific to AIWG dev repo |
| `.aiwg/architecture/adr-rules-index-hierarchy.md` | Dev-repo ADR, not in user projects |
| Any specific file not created by init or deployment | Not guaranteed to exist |

## Rules

### Rule 1: Only Reference Normalized Paths from agentic/code/

Skills and agents under `agentic/code/` may only `@`-reference `.aiwg/` paths that are normalized (Tier 1 or Tier 2).

**FORBIDDEN** (in any file under `agentic/code/`):
```
@.aiwg/planning/issue-driven-ralph-loop-design.md
@.aiwg/architecture/adr-rules-index-hierarchy.md
```

**ALLOWED**:
```
@.aiwg/AIWG.md
@.aiwg/requirements/
@.aiwg/research/
```

### Rule 2: New Frameworks Must Declare Their Memory Footprint

When a new framework or addon creates `.aiwg/` paths, it MUST add those paths to `memory.creates` in its `manifest.json`. This is what normalizes the paths and makes them safe to reference from skills.

```json
{
  "memory": {
    "creates": [
      { "path": ".aiwg/my-framework/", "description": "..." }
    ]
  }
}
```

### Rule 3: The Contract Is Manifest-Derived

Do not maintain a static allowlist document. The normalized contract is computed from `memory.creates` across all installed manifests. `validate-component` and `dev-doctor` read manifests to determine the allowlist dynamically.

## AIWG Install-Path References (`@$AIWG_ROOT/`)

Skills and agents often need to cross-reference other AIWG-installed files (rules, schemas, templates, agent definitions). Use the `@$AIWG_ROOT/` prefix for all such references:

```
@$AIWG_ROOT/${CLAUDE_PLUGIN_ROOT}/rules/addon-boundaries.md
@$AIWG_ROOT/src/extensions/types.ts
@$AIWG_ROOT/docs/development/aiwg-dir-reference-contract.md
```

`$AIWG_ROOT` resolves to the AIWG install root. Any environment variable can be used as a corpus token with the same `@$TOKEN/path` syntax — define tokens in `.env` at the project root.

| Context | `$AIWG_ROOT` resolves to |
|---------|--------------------------|
| AIWG dev repo | Repository root (`.`) |
| npm global install | `$(npm root -g)/aiwg` |
| Custom install | `$AIWG_ROOT` env var (if set explicitly) |

## Broader Linking Contract

| Pattern | Classification | Valid? |
|---------|---------------|--------|
| `@$AIWG_ROOT/<path>` | AIWG core file (install-relative) | YES |
| `@$TOKEN/<path>` (registered env var) | Custom corpus token | YES |
| `@.aiwg/<normalized-path>` | Project memory (Tier 1/2, in `memory.creates`) | YES |
| `@.aiwg/<repo-local-path>` | Repo-local only | NO — silently fails in user projects |
| `@.claude/<path>` | Deployment target | NO — overwritten by `aiwg sync` |
| `@agentic/code/<path>` | Bare AIWG core ref (legacy) | NO — use `@$AIWG_ROOT/agentic/code/` |
| `@src/<path>` | Bare AIWG core ref (legacy) | NO — use `@$AIWG_ROOT/src/` |
| `@docs/<path>` | Bare AIWG core ref (legacy) | NO — use `@$AIWG_ROOT/docs/` |
| `@tools/<path>` | Bare AIWG core ref (legacy) | NO — use `@$AIWG_ROOT/tools/` |
| Within-component relative | Local ref | YES — valid within component dir |

## No Escape Mechanism

There is no backtick or code-block escaping for `@` references. Every `@<path>` pattern in a deployed skill or agent is processed as a file-load directive regardless of surrounding markup (inline code, code blocks, bullets). This is by design — agentic systems are confused by excessive backtick nesting just as humans are.

**Consequence**: Examples and documentation in SKILL.md files must NOT use `@` prefix when showing bad/legacy patterns. Drop the `@` prefix in example output and show the raw path instead.

## Detection

`validate-component`, `dev-doctor` (Section 4), and `link-check` implement the full classification:

1. Find **all** `@<path>` references in the file(s) under review — including those in code blocks and inline code
2. Classify per the table above
3. For `@.aiwg/` refs: load `memory.creates` from all installed manifests; check against allowlist
4. For `@$TOKEN/` refs: check if TOKEN is set in the environment
5. Report PASS/FAIL/WARN per reference with specific remediation

## References

- @$AIWG_ROOT/${CLAUDE_PLUGIN_ROOT}/rules/addon-boundaries.md — Source vs project output boundary
- @$AIWG_ROOT/src/extensions/types.ts — `MemoryFootprint` type definition
- @$AIWG_ROOT/docs/development/aiwg-dir-reference-contract.md — Full reference contract document

---

**Rule Status**: ACTIVE
**Last Updated**: 2026-4-1
