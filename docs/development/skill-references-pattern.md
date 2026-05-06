# Skill `references/` Subdir Lazy-Load Pattern

PUW-031 (#1132) — convention for keeping SKILL.md lean while letting on-demand supporting content live next to the skill.

## Problem

Some AIWG skills are very long. The top 5 by line count today:

| Skill | Lines |
|---|---|
| flow-incident-response | 1931 |
| flow-deploy-to-production | 1826 |
| intake-wizard | 1765 |
| flow-compliance-validation | 1380 |
| intake-from-codebase | 1354 |

When a skill is loaded into model context, its SKILL.md is read in full. A 1900-line file pushes ~50KB of content into the always-on context budget every time the skill activates — even for invocations that only need the first decision tree. Most providers (Claude Code, Warp, Cursor) tolerate this but the cost is real: tokens that could carry task-specific context are spent on procedural detail the model didn't need this turn.

## The pattern

***SKILL.md retains the decision tree and minimal procedural content. On-demand supporting content moves to `references/<topic>.md` files inside the skill directory and is referenced from SKILL.md via markdown links.***

Layout:

```
agentic/code/frameworks/<framework>/skills/<skill>/
├── SKILL.md                       # decision tree + entry points
├── references/
│   ├── full-incident-procedure.md # detailed runbook
│   ├── escalation-matrix.md       # contact/severity mapping
│   └── post-mortem-template.md    # template for the post-incident write-up
└── scripts/                       # (existing — runtime artifacts)
```

SKILL.md links into `references/`:

```markdown
## Decision Tree

1. Severity 1 (production down) → see `references/full-incident-procedure.md` §1
2. Severity 2 (degraded) → see `references/full-incident-procedure.md` §2
3. ...

For escalation contacts, see `references/escalation-matrix.md`.
```

Claude Code and Warp natively resolve markdown links into the same skill folder; they fetch the reference file only when the model decides it needs that section. Cursor follows links when the operator clicks them in the UI. Other providers either resolve them (Hermes via `${HERMES_SKILL_DIR}/references/...`) or ignore them silently — which is fine, since the body content is the canonical source either way.

## When to apply

Use the pattern when SKILL.md exceeds **~600 lines** OR when the skill has multiple distinct branches that don't all run on every invocation. Below 600 lines the overhead of split files outweighs the context-efficiency benefit.

Don't apply mechanically — content that's part of the always-needed decision tree stays in SKILL.md. Only material that's "consult when the decision tree branches there" moves to `references/`.

## Verification

Two providers verified to resolve `references/` paths natively:

- **Claude Code**: skill loader follows relative markdown links within the skill folder. Tested by deploying a skill with `references/example.md` and asserting that `@references/example.md` from inside SKILL.md surfaces the file content.
- **Warp**: same mechanism, using its skill-level Markdown resolver.

For other providers the references ship to disk via the existing skill-folder copy (`deploySkillDir` in `tools/agents/providers/base.mjs`) — the operator can `@`-mention them manually or the model can read them via filesystem tools.

## Migration plan

1. Identify candidate skills via `find agentic -name SKILL.md -exec wc -l {} \;` filtered to >600 lines
2. For each skill, separate content by access pattern — frequently-needed (decision tree, entry points) vs occasionally-needed (templates, deep runbooks, examples)
3. Move occasional content to `references/<topic>.md` with a clear topic-naming convention (`full-incident-procedure.md`, `compliance-iso27001-controls.md`, etc.)
4. Update SKILL.md to link rather than inline the moved content
5. Verify the skill still answers its decision tree correctly with the references in place
6. Smoke test: `aiwg use sdlc --provider claude` then invoke the skill in a Claude Code session and confirm references resolve

The migration is per-skill content work and intentionally not automated — the partition between "always needed" and "occasionally needed" is a judgment call that depends on the skill's invocation pattern.

## References

- `.aiwg/research/parity/capability-matrix.md CP13` — origin of this pattern in the parity research
- `.aiwg/architecture/adr-agents-md-aggregation.md` — ADR-1, the related linking pattern for AGENTS.md
- `tools/agents/providers/base.mjs` — `deploySkillDir` preserves subdirectories during deploy
