---
namespace: aiwg
name: link-check
description: Verify @file references in AIWG skills and agents against the linking contract — per-file or corpus-wide, with optional auto-fix
platforms: [all]

---

# Link Check

You verify every `@file` reference in AIWG distributable skills and agents against the full linking contract, producing a structured PASS/WARN/FAIL report per reference. You can run against a single file, a directory, or the full `agentic/code/` corpus, and optionally auto-migrate legacy bare refs to the `@$AIWG_ROOT/` prefix.

## Triggers

- "link check" / "check links" → run against current file or directory
- "link check agentic/code/" → full corpus scan
- "link check --fix" → auto-migrate legacy bare refs
- "any bad links?" → run link-check on current context
- "check for broken @-refs" → run link-check
- "are there any legacy bare refs?" → run link-check, focus on 4b

## Usage

```
/link-check [path] [options]
```

| Argument | Default | Description |
|----------|---------|-------------|
| path | current file or `agentic/code/` | File or directory to check |
| --fix | off | Auto-migrate `@agentic/code/`, `@src/`, `@docs/`, `@tools/` → `@$AIWG_ROOT/` |
| --report | off | Output structured JSON report instead of human-readable |
| --aiwg-only | off | Check only `.aiwg/` refs (skip bare-core and forbidden checks) |
| --fail-on-warn | off | Treat WARN as FAIL (useful for CI) |

## Reference Classification

Each `@<path>` reference is classified per the AIWG linking contract:

| Pattern | Result | Reason |
|---------|--------|--------|
| `@$AIWG_ROOT/<path>` | PASS | AIWG core file, install-relative |
| `@$TOKEN/<path>` — TOKEN set in env | PASS | Registered corpus token |
| `@$TOKEN/<path>` — TOKEN NOT set | WARN | Unknown token — add to `.env` or export |
| `@.aiwg/<path>` — in Tier 1/2 allowlist | PASS | Normalized project memory |
| `@.aiwg/<path>` — not in allowlist | FAIL | Repo-local only — silently fails in user projects |
| `@.claude/<path>` | FAIL | Deployment target — forbidden in distributable source |
| `@agentic/code/<path>` | WARN | Legacy bare ref — use `@$AIWG_ROOT/agentic/code/` |
| `@src/<path>` | WARN | Legacy bare ref — use `@$AIWG_ROOT/src/` |
| `@docs/<path>` | WARN | Legacy bare ref — use `@$AIWG_ROOT/docs/` |
| `@tools/<path>` | WARN | Legacy bare ref — use `@$AIWG_ROOT/tools/` |
| Relative path within component | PASS | Local ref |

## Process

1. **Resolve target path** — single file, directory, or default `agentic/code/`
2. **Build normalized allowlist** — read all `manifest.json` files under `agentic/code/`; collect `memory.creates[*].path`; add Tier 1 entries
3. **Load environment** — check which env vars are set (for `@$TOKEN/` classification)
4. **Extract all `@<path>` refs** — regex: `@[\$\.]?[a-zA-Z0-9_/.\-]+` in each `.md` file
5. **Classify each ref** per the table above
6. **If `--fix`**: rewrite WARN-classified bare legacy refs in-place:
   - `@agentic/code/` → `@$AIWG_ROOT/agentic/code/`
   - `@src/` → `@$AIWG_ROOT/src/`
   - `@docs/` → `@$AIWG_ROOT/docs/`
   - `@tools/` → `@$AIWG_ROOT/tools/`
7. **Produce report**

## Output Format

### Human-readable (default)

```
Link Check: agentic/code/addons/aiwg-dev/skills/dev-doctor/SKILL.md

  PASS  $AIWG_ROOT/agentic/code/addons/aiwg-dev/rules/addon-boundaries.md
  PASS  .aiwg/AIWG.md (Tier 1, always present)
  WARN  agentic/code/addons/aiwg-dev/rules/skill-placement.md
        → legacy bare ref; use $AIWG_ROOT/agentic/code/... prefix
  FAIL  .aiwg/planning/issue-driven-ralph-loop-design.md
        → non-normalized .aiwg/ path (repo-local only)

Result: 2 issues (1 WARN, 1 FAIL)
```

### Corpus summary

When run against a directory:

```
Link Check: agentic/code/ (corpus-wide)

Files checked:  247
References found: 1,341
  PASS:  1,337
  WARN:      3
  FAIL:      1

Violations:
  WARN  agentic/code/addons/my-addon/skills/my-skill/SKILL.md:42
        agentic/code/... (bare ref) → add $AIWG_ROOT/ prefix
  FAIL  agentic/code/addons/my-addon/skills/my-skill/SKILL.md:89
        .aiwg/planning/my-design.md → non-normalized (repo-local only)

Overall: WARN (3 warnings, 1 failure)
Run with --fix to auto-migrate WARN refs.
```

### JSON report (`--report`)

```json
{
  "target": "agentic/code/",
  "timestamp": "2026-04-01T04:48:00Z",
  "summary": { "files": 247, "refs": 1341, "pass": 1337, "warn": 3, "fail": 1 },
  "violations": [
    {
      "file": "agentic/code/addons/my-addon/skills/my-skill/SKILL.md",
      "line": 42,
      "ref": "agentic/code/addons/aiwg-dev/rules/skill-placement.md",
      "result": "WARN",
      "message": "legacy bare ref — add $AIWG_ROOT/ prefix",
      "fix": "$AIWG_ROOT/agentic/code/addons/aiwg-dev/rules/skill-placement.md"
    }
  ]
}
```

## Auto-Fix Behavior (`--fix`)

Only WARN-classified legacy bare refs are auto-fixed. FAIL refs (repo-local `.aiwg/` paths, `.claude/` refs) are **never auto-fixed** — they require a human decision:
- Remove the reference
- Replace with a normalized equivalent
- Or normalize the path in a manifest's `memory.creates`

After `--fix`, report how many refs were migrated and re-run the check to confirm the result.

## CI Integration

Use `--report --fail-on-warn` for CI:

```bash
# Fails if any FAIL or WARN refs found
aiwg link-check agentic/code/ --report --fail-on-warn > link-report.json
```

Exit codes:
- `0` — all PASS
- `1` — WARN found (only if `--fail-on-warn`)
- `2` — FAIL found

## Examples

### Check a single skill

**User**: "check links in the dev-doctor skill"

**Action**: Run link-check on `agentic/code/addons/aiwg-dev/skills/dev-doctor/SKILL.md`.

### Full corpus check

**User**: "any bad links in the corpus?"

**Action**: Run link-check on `agentic/code/` and summarize violations.

### Auto-fix

**User**: "link check --fix"

**Action**: Run link-check on `agentic/code/`, migrate all bare legacy refs, report how many were fixed.

## References

- @$AIWG_ROOT/agentic/code/addons/aiwg-dev/rules/aiwg-dir-reference-contract.md — Full linking contract
- @$AIWG_ROOT/agentic/code/addons/aiwg-dev/skills/validate-component/SKILL.md — Per-component validation
- @$AIWG_ROOT/agentic/code/addons/aiwg-dev/skills/dev-doctor/SKILL.md — Full repo health check
