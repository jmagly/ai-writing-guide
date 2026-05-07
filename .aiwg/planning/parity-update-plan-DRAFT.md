# Cross-Provider Parity Update — Plan (DRAFT)

**Status**: Draft — pending operator approval before implementation issues are filed
**Created**: 2026-05-05
**Owner**: roctinam
**Tracking epic**: TBD (Gitea origin)

## Goal

Bring AIWG's 10 supported provider deployments up to parity with the latest provider mechanisms, identify new capabilities to exploit, and flag cross-port candidates (capabilities present in one provider that should mirror to others).

## Scope

| Dimension | Items |
|-----------|-------|
| Providers | Claude Code, Codex CLI, GitHub Copilot, Factory AI, Cursor, OpenCode, OpenClaw, Warp, Windsurf, Hermes |
| Artifact types | agents, commands, skills, rules, hooks, behaviors |
| Output | per-provider assessment + cross-provider matrix + prioritized update plan |

## Provider repo strategy

Local clones in `/tmp/aiwg-parity-2026-05/` (disposable). Operator may pre-clone any to `~/dev/` for persistence.

| # | Provider | Repo | Action | Source paths of interest |
|---|----------|------|--------|--------------------------|
| 1 | Claude Code | github.com/anthropics/claude-code | Clone (partial OSS) | docs only — no skill loader source |
| 2 | Codex CLI | github.com/openai/codex | Clone (full Rust) | `codex-rs/core-skills/src/loader.rs` |
| 3 | GitHub Copilot / VS Code | github.com/microsoft/vscode | Sparse clone | `src/vs/workbench/contrib/chat/**`, `promptFileLocations.ts` |
| 4 | Factory AI | github.com/Factory-AI/factory | Clone (docs only) | `docs/cli/configuration/skills.mdx` |
| 5 | Cursor | github.com/cursor/cursor | No clone (issues-only) | docs scrape + GitHub issues |
| 6 | OpenCode | github.com/sst/opencode | Clone (full TS) | `packages/opencode/src/skill/index.ts` |
| 7 | OpenClaw | github.com/openclaw/openclaw | Clone (full TS) | `src/agents/skills/workspace.ts`, `local-loader.ts`, behaviors |
| 8 | Warp | github.com/warpdotdev/Warp + warpdotdev/oz-skills | Clone examples only | docs + oz-skills examples |
| 9 | Windsurf | Closed source (Codeium) | Docs-only via WebFetch | — |
| 10 | Hermes | github.com/NousResearch/hermes-agent | Clone (full Python) | `agent/skill_commands.py`, `skill_utils.py`, `tools/skills_tool.py` |
| ref | agentskills spec | github.com/agentskills/agentskills | Clone | reference baseline |

## Research workflow per provider

```
For each provider (10 jobs, parallelized in batches of 3-4 per context-budget rule):
  Discovery Agent       → enumerate features, hooks, lifecycle events
  Technical Researcher  → read loader/discovery source; document file paths, scan order, recursion depth
  Documentation Agent   → fetch latest vendor docs; delta vs. existing AIWG memory
  Quality Agent         → grade source quality (GRADE), flag stale/missing claims
  Synthesizer           → produce per-provider assessment.md
```

After all 10 complete, single synthesis pass (no parallel — per `parallel-then-synthesize` rule):
- `.aiwg/research/parity/capability-matrix.md` — 10 × 6 grid
- `.aiwg/planning/parity-update-plan.md` — prioritized work items, each linked to source citations

## Per-provider assessment template

Every `.aiwg/research/parity/<provider>/assessment.md` contains:

1. **Repo state** — version/commit, OSS status, clone path
2. **Discovery mechanism** — how the platform finds agents/skills/commands/rules (file paths, scan order, recursion depth)
3. **Artifact format** — frontmatter schema, file extensions, size limits
4. **Lifecycle hooks** — pre/post events the platform emits
5. **Current AIWG deployment** — what `aiwg use` writes for this provider today
6. **Gaps** — where AIWG is behind latest provider mechanism
7. **New capabilities** — features AIWG doesn't yet exploit
8. **Cross-port candidates** — capability X from provider Y to mirror here
9. **Citations** — file:line refs for each claim

## Issue plan (Gitea origin: roctinam/aiwg)

Per `delivery-policy` rule — delivery mode is `direct`, so commits land on main with `Closes #N`.

| # | Issue type | Title | Blocks |
|---|-----------|-------|--------|
| 1 | epic | Cross-Provider Parity Update — 2026-05 | — |
| 2-11 | research | Parity assessment: \<provider\> (×10) | parallel-safe |
| 12 | synthesis | Build cross-provider capability matrix | blocked by 2-11 |
| 13 | plan | Draft parity update plan + reviewer signoff | blocked by 12 |

**Implementation issues** (port/expand work) are filed *after* this plan is approved with reviewer signoff.

## Effort estimate

Per `no-time-estimates` rule — agent-units only:

| Phase | Atomic deliverables | Agent count | Parallelism | Pass estimate |
|-------|---------------------|-------------|-------------|---------------|
| Provider research | 10 assessments × ~9 sections each | 4 agents/provider × 10 = 40 dispatches | 3-4 providers in parallel per batch | 1-2 passes per provider |
| Capability matrix | 1 doc (10×6 grid) | 1 synthesizer | sequential | 1 pass |
| Update plan + signoff | 1 plan + 2 reviews | 3 agents (drafter + 2 reviewers) | reviews parallel | 1-2 revision passes |

## Completion criteria

The loop terminates when ALL of:

1. `.aiwg/research/parity/<provider>/assessment.md` exists for all 10 providers
2. `.aiwg/research/parity/capability-matrix.md` exists, covers all 6 artifact types × all 10 providers
3. `.aiwg/planning/parity-update-plan.md` exists with reviewer signoff footer from `architecture-designer` AND `technical-researcher`

## Operator pause-points

The loop will pause and surface a request to the operator when:

- A local provider repo needs cloning the operator wants to do themselves
- A vendor doc URL returns 404 / requires auth
- A finding contradicts existing AIWG architectural assumption (operator decides: rewrite or document divergence)

## Reviewer signoff

This plan must be reviewed and signed by:
- [ ] `architecture-designer`
- [ ] `technical-researcher`

After signoff, implementation issues are filed and the agent loop launches.

---

*Plan version: DRAFT-1 — 2026-05-05*
