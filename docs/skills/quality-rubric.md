# SKILL.md quality rubric

The `aiwg skill-lint` command (#1015 Phase C) scores SKILL.md files
against a four-dimension rubric. Use it to track quality trends, gate
CI on a minimum threshold, or audit a skill before publishing.

## Quick start

```bash
# Standard rubric, default target (agentic/code)
aiwg skill-lint

# Specific path, strict rubric
aiwg skill-lint agentic/code/addons/aiwg-utils --rubric strict

# JSON output for CI consumption
aiwg skill-lint --json | jq '.failedCount'
```

## Dimensions

The rubric scores four dimensions, each contributing a weighted slice
of the total score (0–100). Per-dimension scores are reported when a
file falls below the chosen threshold.

| Dimension | Weight | What it scores |
|---|---|---|
| **Schema** | 40% | Frontmatter passes `SkillFrontmatterSchema` (Zod) — required `name`, `description`, valid types. |
| **Description** | 20% | Description ≥30 characters; uses "Use when…" or action-leading verb for NL routing. |
| **Discoverability** | 20% | If `user-invocable: true`, has `triggers:` array with ≥2 entries. Agent-only skills auto-pass. |
| **Body** | 20% | Skill body has ≥100 words of content (catches stub skills). |

The weighted total determines whether a file passes the chosen rubric's
threshold.

## Rubric modes

Three modes set increasingly strict thresholds:

| Mode | Threshold | Use when |
|---|---|---|
| `lenient` | ≥40 | Catching only severe regressions. Schema-only is roughly enough. |
| `standard` (default) | ≥60 | Recommended for CI on the source corpus. Schema + most quality dimensions. |
| `strict` | ≥80 | Pre-publish audit; ensures every dimension is in good shape. |

## Per-dimension detail

### Schema (40%)

Hard gate. Score is binary: 100 if `SkillFrontmatterSchema` validates
clean, 0 otherwise. The schema enforces:

- `name` (required, non-empty)
- `description` (required, non-empty)
- `version` (optional; semver/CalVer when present)
- `namespace`, `platforms`, `triggers`, `aliases`,
  `commandHint`, etc. when present must conform to their own subschemas

Schema failures are reported with field paths so authors can fix them
quickly. After Phase A cleanup, the entire `agentic/code/` corpus
passes this gate.

### Description (20%)

A non-empty description gets to 100; it then loses points for being
short or lacking action-oriented phrasing.

- Empty / missing: **0**
- Non-empty but <30 characters: **−40**
- No "Use when…" clause and no verb-leading sentence: **−30**

The "Use when…" pattern helps NL routing match user intent to the
skill. Verb-leading phrasing (e.g., "Generate…", "Validate…",
"Execute…") is the heuristic fallback.

### Discoverability (20%)

A skill is discoverable when one of:
- It has a `triggers:` array of ≥2 entries (NL routing surface), **OR**
- It is explicitly **not** user-invocable (agent-only / library skill)

Skills that are user-invocable but have no triggers are the failure
case this dimension guards against — they can't be reached by NL
routing, only by their literal `/<name>` invocation.

| Configuration | Score |
|---|---|
| Not user-invocable | **100** (auto-pass) |
| `user-invocable: true` + ≥2 triggers | **100** |
| `user-invocable: true` + 1 trigger | **60** |
| `user-invocable: true` + 0 triggers | **0** |

### Body (20%)

Counts words after the frontmatter. Catches stub or placeholder
skills that haven't been fleshed out.

| Word count | Score |
|---|---|
| ≥100 | **100** |
| 30–99 | **60** |
| <30 | **0** |

## CI integration

Two workflows in `.gitea/workflows/` cover skill quality:

- **`metadata-validation.yml`** (#1014) — schema-only gate. Fails the PR
  if any SKILL.md violates the schema. Runs against the full corpus.
- **`skill-lint-pr.yml`** (#1015 Phase D) — diagnostic. Runs
  `aiwg skill-lint --json` on changed SKILL.md files and posts a
  sticky PR comment with per-dimension scores. Non-blocking by default.

For an ad-hoc CI step in another workflow:

```yaml
# Optional — replace `standard` with `strict` for stricter projects
- name: Skill quality (lint)
  run: aiwg skill-lint agentic/code --rubric standard
```

The command exits 0 when all files meet the threshold, 1 otherwise.

## Relation to other tools

| Tool | What it does | Speed |
|---|---|---|
| `tools/linters/skill-frontmatter-linter.mjs` | Schema-only gate (YAML parse + required fields). | Fastest; no Node build required |
| `aiwg validate-metadata` | Schema-only via `MetadataValidator` (also handles manifest.md, BEHAVIOR.md). | Fast; needs build |
| `aiwg skill-lint` | Full rubric (this doc). | Fast; needs build |

The three tools share `SkillFrontmatterSchema` — the Zod schema in
`src/extensions/validation.ts` — so their schema verdicts agree by
construction. They diverge only on what *additional* checks they
perform on top of schema validation.

## Authoring checklist

A SKILL.md that scores 100 in `strict` mode:

- [ ] Frontmatter has `name`, `description`, `namespace`, `platforms`
- [ ] Description is ≥30 chars, includes "Use when…" or verb-leading clause
- [ ] If `user-invocable: true`, `triggers:` has ≥2 entries
- [ ] Body has ≥100 words of skill content
- [ ] No YAML parse errors

## See also

- `.aiwg/architecture/adr-skill-md-frontmatter-schema.md` — schema policy ADR
- `src/extensions/validation.ts` — `SkillFrontmatterSchema` definition
- `src/cli/handlers/skill-lint.ts` — handler implementation
- Issue #1015 Phase C — this command
