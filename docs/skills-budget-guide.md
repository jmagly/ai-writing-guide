# Skill Listing Budget — User Troubleshooting Guide

**For users seeing**: `Skill listing will be truncated`, `N descriptions dropped`, or skills that exist on disk but don't appear when you ask for them.

AIWG ships ~400 skills across the SDLC, forensics, research, marketing, and ops frameworks. When you install several frameworks together, the host platform (Claude Code, Codex, etc.) may run past its skill listing budget and silently drop the lowest-priority descriptions. This guide explains what's happening and how to fix it for your platform.

---

## Quick fix by platform

| Platform | Setting | Default | If you see truncation, try |
|----------|---------|---------|----------------------------|
| Claude Code | `skillListingBudgetFraction` in `~/.claude/settings.json` | `0.01` (1% of context) | Raise to `0.05` (5%) |
| Claude Code | `skillListingMaxDescChars` | `1536` | Lower to `1024` to keep more skills full-length |
| Codex (OpenAI) | `project_doc_max_bytes` for AGENTS.md | 32 KiB | Nest AGENTS.md per-subdir; do not raise blindly |
| Codex | Skill listing cap | ~2% of context / 8000 chars | Built-in; reduce skill count or split workspaces |
| Cursor / Warp / Windsurf | Aggregated AGENTS.md | platform-defined | See "Reduce footprint" below |

---

## Claude Code 2.1.129+

Claude Code added two skill-listing settings starting in **2.1.129**. Both live in `settings.json` (precedence: user `~/.claude/settings.json` overrides project `.claude/settings.json`).

### `skillListingBudgetFraction`

A decimal fraction (not percentage) of the **active model's context window** that may be spent on skill name+description listings. Range: `(0, 1]`. Default: `0.01` (1%).

When the total listing exceeds this fraction, lower-priority skills lose their description first (kept as name-only), then drop entirely if still over budget.

### `skillListingMaxDescChars`

Maximum per-description character count. Default `1536`, raise to `2048` for less aggressive trimming, lower to `1024` to keep more skills under the budget. Each description longer than this gets shortened first; only then does the total-budget check run.

### What you'll see

```
Skill listing will be truncated
  425 descriptions dropped (full descriptions kept for most-used skills) (6.9%/1% of context)
  container-forensics, prose-detect, induct-research, +422 more
  run /skills to disable some, or raise skillListingBudgetFraction (currently 1%) in settings.json
  Opting in would cost ~14k tokens for skills every session and uses rate limits faster
```

The percentage notation is `<actual>/<budget> of context`. Above, 6.9% of the window is needed but only 1% is allowed.

### How to raise the budget

Edit `~/.claude/settings.json`:

```json
{
  "skillListingBudgetFraction": 0.05,
  "skillListingMaxDescChars": 1536
}
```

Restart Claude Code (or open a new conversation) for the change to apply. Cost trade-off: 5% of a 200k window ≈ 10k tokens spent every session.

### Disabling specific skills

Run `/skills` inside Claude Code to interactively disable skills you don't need. The selection persists for that workspace.

### Related GitHub issues

- [anthropics/claude-code#56448](https://github.com/anthropics/claude-code/issues/56448) — `2.1.129` started reporting "47 skill descriptions dropped" on configurations that loaded clean on `2.1.128`.
- [anthropics/claude-code#31505](https://github.com/anthropics/claude-code/issues/31505) — Skills silently dropped past ~28 limit (older bug, addressed by the new budget mechanism).

---

## OpenAI Codex

Codex uses **progressive disclosure**: only skill `name`, `description`, and file path enter the initial context. The full `SKILL.md` body loads only when Codex decides to use that skill.

### Caps you should know

| Limit | Value | Setting |
|-------|-------|---------|
| Skill listing in initial context | ~2% of model context, or ~8,000 chars | Built-in; not user-configurable |
| Per-AGENTS.md size | 32 KiB | `project_doc_max_bytes` (advanced config) |

When the AGENTS.md size limit is hit, **Codex stops adding files silently** ([openai/codex#7138](https://github.com/openai/codex/issues/7138), [#13386](https://github.com/openai/codex/issues/13386)). Instructions near the end of an oversized file are ignored without warning.

### How to fix in Codex

1. **Nest AGENTS.md per subdirectory** rather than one giant root file. Codex respects nearest-ancestor first.
2. **Don't blindly raise `project_doc_max_bytes`** — it lifts the cap but doesn't help if descriptions are bloated.
3. **Reduce framework count** if you see truncation (see below).

---

## Reduce AIWG skill footprint

Independent of platform settings, you can reduce how many skills AIWG deploys.

### List installed frameworks

```bash
aiwg list
```

### Remove a framework you don't need

```bash
aiwg remove media-marketing       # if you're not running marketing workflows
aiwg remove forensics-complete    # if you're not doing IR
aiwg remove research-complete     # if you're not running a research corpus
```

Per-framework approximate skill counts:

| Framework | Skills | When you need it |
|-----------|--------|------------------|
| `sdlc-complete` | ~117 | Most projects (requirements → deployment) |
| `aiwg-utils` | ~111 | Always on (deploys with everything) |
| `media-marketing` | ~32 | Marketing campaigns, content ops |
| `research-complete` | ~20 | Research corpora, citation graphs |
| `forensics-complete` | ~19 | Incident response, forensic investigation |
| `media-curator` | ~18 | Personal media archive |
| `security-engineering` | ~7 | Security/cryptography reviews |

The big cost is when you stack everything: full install ≈ 400+ skills. A focused install (sdlc + utils) is ~228 skills and fits comfortably in default Claude Code budgets.

### Workspace-per-purpose pattern

If you regularly switch between very different domains (forensics, marketing, dev), run separate workspaces with separate framework installs rather than one mega-workspace with everything deployed.

---

## Doctor diagnostics

```bash
aiwg doctor
```

`aiwg doctor` runs a per-provider **Skill Budget** check (#1150) for every deployed skills directory it finds. The check sums each `SKILL.md`'s `name + description` from frontmatter, converts via the standard ~4 chars/token heuristic, and compares against the platform's default budget.

| Platform | Budget |
|----------|--------|
| Claude Code | `skillListingBudgetFraction × context_window` (default `1% × 200,000 = 2,000 tokens`) |
| Codex | Fixed 8,000-char built-in cap |
| Other | Info-only line — no documented budget |

The check honors:
- Your existing `~/.claude/settings.json` override (or `~/.config/claude/settings.json` fallback). When the user is already at e.g. `0.05`, the verdict reads **EXCEEDS OVERRIDE** rather than the misleading "EXCEEDS DEFAULT".
- The `<!-- AIWG_CONTEXT_WINDOW: N -->` directive in `CLAUDE.md` / `AGENTS.md` / `AIWG.md` — overrides the assumed 200,000-token context.

Sample output on a sysops + sdlc + marketing + ops + forensics workspace:

```
⚠ Claude Code Skill Budget: EXCEEDS OVERRIDE (9.50×) — 393 skills (avg 101 chars desc),
  est. 11,870 tokens vs 1,250 tokens budget — 5.00% × 100,000 ctx (override in ~/.claude/settings.json)
  | raise skillListingBudgetFraction to 0.1 (~10%) in ~/.claude/settings.json
  | or remove unused frameworks (e.g. aiwg remove media-marketing)
  | see docs/skills-budget-guide.md for full options
○ Factory Skill Budget: 294 skills, ~8,807 tokens — no documented budget for factory, skipping verdict
○ Copilot Skill Budget: 296 skills, ~8,846 tokens — no documented budget for copilot, skipping verdict
```

To suppress in CI runs that don't care about pre-flight surface analysis:

```bash
aiwg doctor --no-budget-check
```

---

## When to file an AIWG issue vs a platform issue

| Symptom | File where |
|---------|-----------|
| Specific AIWG skill description is too long | AIWG (`/issues`) |
| Truncation message references AIWG skills | AIWG `#1147` (frame budget) — link your repro |
| `skillListingBudgetFraction` doesn't take effect after edit | Claude Code (anthropics/claude-code) |
| AGENTS.md content past 32 KiB ignored without warning | Codex (openai/codex) |
| Truncation appears regardless of which framework is installed | Platform issue, not AIWG |

---

## References

- Claude Code skill loading: <https://code.claude.com/docs/en/skills>
- Claude Code skill budget mechanics: <https://claudefa.st/blog/guide/mechanics/skill-listing-budget>
- Claude Code settings reference: <https://claudefa.st/blog/guide/settings-reference>
- Codex skills: <https://developers.openai.com/codex/skills>
- Codex AGENTS.md guide: <https://developers.openai.com/codex/guides/agents-md>
- AIWG issue #1147 — Skill listing exceeds default budget
- AIWG issue #1148 — Description audit and rewrite
