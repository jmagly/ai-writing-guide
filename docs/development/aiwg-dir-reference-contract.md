# .aiwg/ Reference Contract

Every AIWG project has a `.aiwg/` directory — the project's semantic memory space. Skills and agents in `agentic/code/` can and should reference `.aiwg/` files to gain project-specific context when deployed. **The constraint is which paths they may reference.**

## Core Principle

A `.aiwg/` path is safe to reference from a distributable skill if and only if it is **normalized** — guaranteed to exist in every properly initialized AIWG project that has the required component installed. Non-normalized (repo-local) paths silently fail in user projects.

## The Contract Is Manifest-Derived

The normalized allowlist is not a static document — it is computed from `memory.creates` in installed component manifests. When a new framework creates `.aiwg/` paths, it declares them in its manifest:

```json
{
  "memory": {
    "creates": [
      { "path": ".aiwg/requirements/", "description": "User stories, use cases, NFRs" }
    ],
    "normalizedFiles": [
      { "path": ".aiwg/AIWG.md", "description": "Project context entry point" }
    ]
  }
}
```

`validate-component` and `dev-doctor` read these declarations to validate link correctness dynamically.

## Normalized Paths

### Tier 1: Always Present

Created by `aiwg init` for every project:

| Path | Purpose |
|------|---------|
| `.aiwg/AIWG.md` | Project context entry point — current phase, architecture summary, installed frameworks |
| `.aiwg/frameworks/registry.json` | Installed framework registry |

### Tier 2: Framework-Specific

Present when the indicated framework is deployed (`aiwg use <framework>`):

| Path | Requires | Purpose |
|------|----------|---------|
| `.aiwg/requirements/` | `sdlc-complete` | User stories, use cases, NFRs |
| `.aiwg/architecture/` | `sdlc-complete` | SAD, ADRs, diagrams |
| `.aiwg/planning/` | `sdlc-complete` | Phase plans, iteration plans |
| `.aiwg/risks/` | `sdlc-complete` | Risk register, mitigations |
| `.aiwg/testing/` | `sdlc-complete` | Test strategy, test plans, results |
| `.aiwg/security/` | `sdlc-complete` | Threat models, security gates |
| `.aiwg/deployment/` | `sdlc-complete` | Deployment plans, runbooks |
| `.aiwg/intake/` | `sdlc-complete` | Project intake documents |
| `.aiwg/patterns/` | `sdlc-complete` | AI behavior pattern catalogs |
| `.aiwg/incidents/` | `sdlc-complete` | Incident reports and post-mortems |
| `.aiwg/regression/` | `sdlc-complete` | Regression tracking records |
| `.aiwg/archive/` | `sdlc-complete` | Phase completion archives |
| `.aiwg/research/` | `research-complete` | Research artifacts (workflows, findings, reports, etc.) |
| `.aiwg/forensics/` | `forensics-complete` | Digital forensics artifacts (profiles, evidence, timelines, etc.) |

*This table is derived from each framework's `manifest.json` `memory.creates` field.*

## Non-Normalized (Repo-Local) Paths

These paths exist in the AIWG development repository but are NOT guaranteed in user projects. Do not reference them from distributable skills or agents.

| Path | Why It Exists Here |
|------|--------------------|
| `.aiwg/planning/issue-driven-al-loop-design.md` | Design doc for this feature, AIWG dev repo only |
| `.aiwg/architecture/adr-rules-index-hierarchy.md` | ADR for this project's rules structure |
| Any specific file not created by `aiwg init` or framework deployment | Project artifact, not framework output |

## Guidelines for Skill Authors

### Referencing normalized paths (ALLOWED)

```markdown
# In a skill or agent definition under agentic/code/

See current project phase in @.aiwg/AIWG.md.
Check requirements in @.aiwg/requirements/.
```

### Referencing repo-local paths (FORBIDDEN)

```markdown
# WRONG — this file only exists in the AIWG dev repo
See @.aiwg/planning/issue-driven-al-loop-design.md for design rationale.
```

### Declaring dependencies for Tier 2 paths

If a skill references a Tier 2 path, declare the required framework in `SKILL.md` frontmatter:

```yaml
---
description: Analyze project requirements
requires:
  - sdlc-complete
---
```

## Adding New Framework Paths

When creating a new framework that populates `.aiwg/` directories, add a `memory` field to its `manifest.json`:

```json
{
  "id": "my-framework",
  "memory": {
    "creates": [
      { "path": ".aiwg/my-framework/", "description": "My framework artifacts" },
      { "path": ".aiwg/my-framework/reports/", "description": "Generated reports" }
    ]
  }
}
```

This normalizes the paths and allows skills to reference them safely.

## AIWG.md Schema

`.aiwg/AIWG.md` is the primary context injection point. Skills that reference it can depend on these fields being present:

| Field | Description |
|-------|-------------|
| Project name | The name of the project |
| Current phase | Inception / Elaboration / Construction / Transition / Production |
| Architecture summary | Brief overview of key technical decisions |
| Installed frameworks | List of `aiwg use`-deployed frameworks |
| Key constraints | Notable non-functional requirements or constraints |

The full AIWG.md template is generated by `aiwg init`.

## AIWG Install-Path References (`@$AIWG_ROOT/`)

Skills and agents frequently cross-reference other AIWG-installed files. Use the `@$AIWG_ROOT/` prefix:

```markdown
@$AIWG_ROOT/agentic/code/addons/aiwg-dev/rules/addon-boundaries.md
@$AIWG_ROOT/src/extensions/types.ts
@$AIWG_ROOT/docs/development/aiwg-dir-reference-contract.md
```

`$AIWG_ROOT` is an environment variable that resolves to the AIWG install root:

| Context | Resolves to |
|---------|-------------|
| AIWG dev repo | Repository root (`.`) |
| npm global install | `$(npm root -g)/aiwg` |
| Custom install | `$AIWG_ROOT` env var (if set) |

Any environment variable can be used as a corpus token with the same `@$TOKEN/path` syntax. Define project-level tokens in `.env`:

```ini
# .env
AIWG_ROOT=/usr/local/lib/node_modules/aiwg   # auto-set
MY_CORPUS=/path/to/custom/corpus
```

### What does NOT use `@$AIWG_ROOT/`

- `@.aiwg/<normalized-path>` — project-relative, already correct (see contract above)
- Relative paths within the same component directory — valid as-is
- `@.claude/<path>` — forbidden in distributable source (deployment target)

## Complete Linking Contract

| Pattern | Valid? | Notes |
|---------|--------|-------|
| `@$AIWG_ROOT/<path>` | YES | AIWG core file |
| `@$TOKEN/<path>` (env var set) | YES | Custom corpus token |
| `@$TOKEN/<path>` (env var not set) | WARN | Add to `.env` or export |
| `@.aiwg/<normalized>` | YES | Tier 1 or Tier 2, in `memory.creates` |
| `@.aiwg/<repo-local>` | NO | Silently fails in user projects |
| `@.claude/<path>` | NO | Overwritten by `aiwg refresh` |
| `@agentic/code/<path>` | NO (legacy) | Migrate to `@$AIWG_ROOT/agentic/code/` |
| `@src/<path>` | NO (legacy) | Migrate to `@$AIWG_ROOT/src/` |
| `@docs/<path>` | NO (legacy) | Migrate to `@$AIWG_ROOT/docs/` |

## Validation

Run the full reference check:

```bash
# Check full corpus — all three violation categories
/link-check agentic/code/

# Auto-migrate legacy bare refs
/link-check agentic/code/ --fix

# Or use dev-doctor Section 4 for the same checks
```

`link-check` classifies every `@file` ref and reports PASS/WARN/FAIL per reference with specific remediation.

## Related

- `docs/development/corpus-navigation-guide.md` — How refs guide agent context loading; composite skill pattern; context architecture
- `agentic/code/addons/aiwg-dev/rules/aiwg-dir-reference-contract.md` — Enforcement rule
- `agentic/code/addons/aiwg-dev/skills/link-check/SKILL.md` — Automated link verification
- `agentic/code/addons/aiwg-dev/rules/addon-boundaries.md` — Source vs project output boundary
- `src/extensions/types.ts` — `MemoryFootprint` type definition
- `docs/extensions/extension-types.md` — Extension manifest field reference
