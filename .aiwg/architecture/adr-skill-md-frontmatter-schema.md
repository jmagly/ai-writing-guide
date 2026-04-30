---
title: SKILL.md frontmatter schema policy
status: Accepted
date: 2026-04-30
deciders: [@jmagly]
related:
  - .aiwg/architecture/adr-skills-canonical-extension-type.md
  - .aiwg/architecture/adr-skill-namespace-strategy.md
context_issues: ["#1013", "#1014", "#1015"]
---

# ADR: SKILL.md frontmatter schema policy

## Status

Accepted (2026-04-30).

## Context

Issues #1013, #1014, and #1015 surfaced a substantial gap in SKILL.md
frontmatter quality across the repository:

- 5 files with critically broken frontmatter shipped to `main`, surfaced
  by an external reviewer (PR #97 on the GitHub mirror, declined).
- A repo-wide audit during #1014 cleanup found 63 SKILL.md files with
  invalid YAML frontmatter and 254 missing the `name:` field — 317 total
  violations across 410 source files (77%).
- The existing `MetadataValidator` recursive walker (`findManifestFiles`
  at `src/plugin/metadata-validator.ts:924`) only matched `manifest.md`
  and `BEHAVIOR.md`. SKILL.md was never validated by directory mode.
- The `metadata-validation.yml` CI workflow only validated two
  hardcoded `sdlc-complete` subdirectories. The entire
  `agentic/code/addons/**` tree was uncovered.

A standalone diff-aware linter
(`tools/linters/skill-frontmatter-linter.mjs`) and CI job were added in
#1014 to close the immediate gap. After #1015 cleanup, the corpus is
clean and CI is full-corpus.

This ADR codifies the policy now in force so future authors know what
fields are expected and the validator/Zod schema can converge on a
single source of truth.

## Decision

### Required fields

Every `SKILL.md` MUST include the following frontmatter fields. The
skill-frontmatter linter (full-corpus mode in CI) and the Zod
`SkillFrontmatterSchema` both enforce these.

| Field | Type | Rationale |
|---|---|---|
| `name` | string, non-empty | Identifies the skill. Default convention: matches the parent directory name. Codex/Claude/Cursor all key on this. |
| `description` | string, non-empty | Required by Codex. Drives natural-language invocation in Claude Code. Empty descriptions caused real regressions historically. |
| `namespace` | string | Distinguishes AIWG-managed skills from user-authored ones. Use `aiwg` for in-repo skills. |
| `platforms` | array or string | Declares which deployment targets the skill is valid for (e.g., `[all]`, `[claude, cursor]`). Drives multi-platform deployment. |

### Required for user-invocable skills

A skill that surfaces in user-facing `/<command>` invocation UI MUST
declare:

| Field | Type | Rationale |
|---|---|---|
| `user-invocable` | `true` | Explicitly opts the skill into user-facing invocation. Without this, the skill is callable only by agents. |

This field is required when the skill is meant to be invoked as a slash
command. It is optional otherwise (agent-only or library skills).

### Recommended fields

These improve discovery and natural-language matching but are not
enforced as errors:

| Field | Type | Rationale |
|---|---|---|
| `triggers` | array of strings | Phrases that should match this skill in NL routing. E.g., `["run prose program", "execute as prose"]`. |
| `aliases` | array of strings | Alternative names the skill responds to. |
| `commandHint.argumentHint` | string (single-quoted) | CLI-style usage hint. Quote with single quotes to avoid YAML parse issues with brackets/quotes. |
| `commandHint.allowedTools` | string | Tools the skill is permitted to use. |

### Optional fields

`version`, `aliases`, `deprecated_names`, `model`, `category`,
`orchestration`, `effort`, `disable-model-invocation`, `context`,
`tools`, `author`, `license`, `metadata`. The schema accepts unknown
fields via `passthrough()` so authors can extend without breaking
validation.

### YAML conventions

- Use **single-quoted** scalars for any value containing brackets,
  double quotes, or `:` (colon) followed by space-then-text. The 5
  bugs in #1013 and 59 broader bugs in #1015 were all unquoted scalars
  that YAML mis-parsed.
- For frontmatter list items where the value contains a `:` (e.g.,
  `requires:` blocks in Prose-style contracts), wrap the entire value
  in double quotes.

## Consequences

### Positive

- Single source of truth for schema: `SkillFrontmatterSchema` in
  `src/extensions/validation.ts`. Linter, validator, and CI agree.
- Authors get a clear policy. `aiwg validate-metadata` failures and
  CI failures point to the same field/rule.
- `name` (the field most external tools key on) is now required —
  matches what manifest.md and BEHAVIOR.md already require.
- `triggers:` recommended (not required) keeps the bar low for new
  skills while encouraging good NL matching practice.

### Negative / accepted tradeoffs

- 308 source files needed `name:` backfill (#1015 Phase A.2). One-time
  cost.
- `triggers:` not being required means NL routing quality varies. We
  accept this — making it required is a separate decision once we have
  data on routing failures attributable to missing triggers.
- The schema is permissive (`passthrough()`). Field additions don't
  break validation but also aren't validated. This matches AIWG's
  ergonomic-over-strict bias.

### Follow-ups

- **Phase B.2** (this work): Add `triggers` field to
  `SkillFrontmatterSchema`. Done.
- **Phase B.3** (this work): Refactor
  `MetadataValidator.findManifestFiles()` to also match `SKILL.md`,
  routing those files through `SkillFrontmatterSchema` instead of the
  manifest schema (which currently incorrectly requires `version` and
  `type`). Done.
- **Phase C** (#1015): Headless `aiwg skill-lint <path>` CLI built on
  this same schema, with `--rubric` modes for varying strictness. Pending.
- **Phase D** (#1015): Sticky PR-comment workflow surfacing skill-lint
  results. Pending.

## Alternatives considered

### Make `triggers` required

Considered for Phase B but rejected. Triggers are valuable for NL
routing but lack-of-triggers is not a quality bug — it just means the
skill is invoked by other means (agent calls, explicit `/<name>`). Keep
as recommended; revisit if NL routing quality becomes a measurable
problem.

### Adopt the rejected upstream PR's full opinion (Tessl rubric)

Considered and explicitly rejected. The upstream PR proposed `triggers`
required and `user-invocable: true` everywhere. We adopt only what
fits AIWG's existing conventions:
- `user-invocable: true` required for skills with user-facing slash
  command UI (matches platform reality)
- `triggers:` recommended (matches our existing pattern in
  `quality-checker` and other skills)

Tessl's rubric scores against an opaque proprietary metric; we own the
schema and the rubric.

### Strict mode (no `passthrough()`)

Considered and rejected. AIWG skills evolve: new fields appear before
the schema catches up. `passthrough()` lets authors experiment without
churn. The required + recommended fields above are enough to catch real
regressions; over-strict validation would just block legitimate work.

## References

- Issue #1013 — five SKILL.md files with broken frontmatter on main
- Issue #1014 — investigation: validator gap + CI scope gap
- Issue #1015 — Phase A cleanup (59 YAML errors + 308 missing-name backfills) + Phase B/C/D
- `src/extensions/validation.ts` — `SkillFrontmatterSchema`
- `src/plugin/metadata-validator.ts:924` — `findManifestFiles` (refactored in Phase B.3)
- `tools/linters/skill-frontmatter-linter.mjs` — diff-aware → full-corpus CI linter
- `.gitea/workflows/metadata-validation.yml` — CI integration
