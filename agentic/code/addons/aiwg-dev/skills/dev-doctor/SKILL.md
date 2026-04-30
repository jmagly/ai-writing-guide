---
namespace: aiwg
name: dev-doctor
description: Run a development-focused health check on the AIWG repository structure
platforms: [all]

---

# Dev Doctor

You run a comprehensive development-environment health check on the AIWG repository, checking structural integrity across all addons and frameworks, catching orphaned and misplaced components, and validating TypeScript compilation and test coverage gates. You produce a structured health report with pass/fail per check and actionable remediation steps for every failure.

## Triggers

- "run dev doctor" → full health check
- "check aiwg dev health" → full health check
- "are there any placement violations" → run placement check section only
- "find orphaned skills" → run orphan check section only
- "is the repo in a good state" → full health check
- "pre-commit health check" → run dev-doctor before committing
- "dev health" → full health check

## Trigger Patterns Reference

| Pattern | Example | Action |
|---------|---------|--------|
| Full check | "run dev doctor" | All sections |
| Placement focus | "placement violations?" | Placement check only |
| Orphan focus | "find orphaned skills" | Orphan detection only |
| Pre-commit | "pre-commit health check" | Full check |
| TypeScript | "does TypeScript compile" | Compilation check only |
| Quick | "dev health" | Full check, condensed output |

## Process

Run the following checks in sequence. Collect all results before generating the report.

### Section 1: `agentic/code/` Structure Integrity

1. Read `agentic/code/addons/` — list all addon directories
2. For each addon directory:
   - `manifest.json` present and valid JSON
   - `manifest.json` has `id`, `type`, `name`, `version`, `description`
   - `README.md` present
3. Read `agentic/code/frameworks/` — list all framework directories
4. For each framework directory:
   - `manifest.json` present and valid JSON
   - Required fields present

### Section 2: Manifest vs Filesystem Consistency (Orphan Detection)

For each addon and framework:

**Orphaned skills** (SKILL.md exists but not in manifest):
- List all `skills/*/SKILL.md` files under the addon
- For each: verify the skill name appears in `manifest.json` `skills` array
- Any SKILL.md without a manifest entry is an orphan

**Missing skills** (in manifest but SKILL.md absent):
- For each entry in `manifest.json` `skills` array: verify `skills/<name>/SKILL.md` exists
- Any manifest entry without a corresponding SKILL.md is a missing skill

Repeat the same orphan/missing check for agents and rules.

### Section 3: Placement Violations

For each provider directory that exists in the repository:
- `.claude/skills/`, `.claude/agents/`, `.claude/commands/`, `.claude/rules/`
- `.github/agents/`, `.github/prompts/`, `.github/instructions/`
- `.cursor/skills/`, `.cursor/agents/`, `.cursor/commands/`, `.cursor/rules/`

For each file found in a provider directory:
- Attempt to locate the corresponding source in `agentic/code/`
- If no source found: flag as a potential placement violation (note: some files like `CLAUDE.md`, `settings.json`, `.gitignore` are intentionally in provider directories and are not violations)
- Skills, agents, commands, and rule files with no `agentic/code/` source are violations

### Section 4: `@file` Reference Check (Full Classification)

All `@file` references in distributable skills and agents are checked against the full linking contract. Three categories of violations are reported:

**Step 1**: Build the Tier 2 normalized allowlist from installed manifests:
- Read all `manifest.json` files in `agentic/code/`
- Collect all `memory.creates[*].path` values
- Combine with Tier 1: `.aiwg/AIWG.md`, `.aiwg/frameworks/`

**Step 2**: Scan for `.aiwg/` violations (Section 4a):

```bash
grep -rn "@\.aiwg/" agentic/code/ --include="*.md"
```

For each ref found: check against allowlist.
- Starts with a Tier 1/2 prefix → PASS
- Not in allowlist → FAIL (repo-local path)

**Step 3**: Scan for bare AIWG-core refs (Section 4b — legacy migration):

Use Grep tool to search for bare AIWG-core ref patterns — refs to `agentic/code/`, `src/`, `docs/`, `tools/` that lack the `$AIWG_ROOT/` token prefix — in `agentic/code/` markdown files. Each match → WARN: legacy bare ref, needs `$AIWG_ROOT/` prefix.

**Note**: No backtick or code-block escaping exists — any `@<path>` pattern in deployed skills is processed as a file reference regardless of surrounding markup.

**Step 4**: Scan for forbidden deployment-target refs (Section 4c):

Use Grep tool to search for `@.claude/` in `agentic/code/` markdown files. Each match → FAIL: deployment target ref, forbidden in distributable source.

**Report format**:
```
SECTION 4 — @file Reference Check

  4a — .aiwg/ References
  PASS  sdlc-complete/agents/requirements-analyst.md  .aiwg/requirements/ (normalized)
  FAIL  my-addon/skills/my-skill.md  .aiwg/planning/my-design.md
        → non-normalized path: only exists in AIWG dev repo

  4b — Bare AIWG-core References (legacy)
  WARN  research-complete/agents/workflow-agent.md  agentic/code/frameworks/research-complete/...
        → add $AIWG_ROOT/ prefix

  4c — Deployment-Target References (forbidden)
  (none)
```

### Section 5: TypeScript Compilation

Run TypeScript type checking:

```bash
npx tsc --noEmit
```

- PASS: exit code 0, no errors
- FAIL: exit code non-zero, report the error count and first 5 error lines

### Section 6: Test Suite

Run the test suite:

```bash
npm test
```

- PASS: exit code 0
- FAIL: exit code non-zero, report test failure summary

Do not run UAT (`npm run uat`) here — that is a pre-release gate, not a daily development check. Mention that it should be run before tagging a release.

### Section 7: Circular Skill Call Detection

Search all `SKILL.md` files in `agentic/code/` for potential circular calls:

For each `SKILL.md`:
1. Check if the associated command in `definitions.ts` has `executedViaSkillRunner: true`
2. If yes: search the SKILL.md for `aiwg <command-name>` in any bash block or instruction text
3. Flag any matches as circular call violations

### Report Format

```
AIWG Dev Doctor
Run at: <timestamp>
Repo: <working directory>

SECTION 1 — Structure Integrity
  PASS  agentic/code/addons/ (8 addons, all have manifest.json + README.md)
  PASS  agentic/code/frameworks/ (5 frameworks, all have manifest.json)

SECTION 2 — Orphan Detection
  PASS  no orphaned skills
  FAIL  aiwg-utils: soul-blend listed in manifest but skills/soul-blend/SKILL.md missing
  PASS  no orphaned agents
  PASS  no missing agents
  PASS  no orphaned rules

SECTION 3 — Placement Violations
  PASS  no placement violations found

SECTION 4 — @file References
  4a .aiwg/ refs:   PASS (all normalized)
  4b bare AIWG refs: WARN — 2 legacy refs (add $AIWG_ROOT/ prefix)
  4c .claude/ refs: PASS (none found)
  WARN  agentic/code/addons/my-addon/skills/my-skill.md
        agentic/code/... (bare ref) → add $AIWG_ROOT/ prefix

SECTION 5 — TypeScript Compilation
  PASS  tsc --noEmit: 0 errors

SECTION 6 — Test Suite
  PASS  npm test: 142 passing, 0 failing

SECTION 7 — Circular Skill Calls
  PASS  no circular skill calls detected

Overall: FAIL — 2 issues found

Blocking issues:
  1. [Section 2] aiwg-utils/skills/soul-blend/SKILL.md missing
     Action: Create the SKILL.md or remove soul-blend from manifest.json
  2. [Section 4] non-normalized @.aiwg/ reference in my-addon/skills/my-skill.md
     Action: Either remove the reference, replace it with a normalized path,
             or add the path to the framework's memory.creates in manifest.json

Notes:
  - UAT (`npm run uat`) not run — run before tagging a release
  - 8 addons, 5 frameworks validated
```

## Examples

### Example 1: Clean repo

**User**: "run dev doctor"

**Output**:
```
AIWG Dev Doctor — 2026-04-01

Structure:        PASS (8 addons, 5 frameworks)
Orphans:          PASS (no orphaned or missing components)
Placement:        PASS (no violations)
.aiwg/ refs:      PASS
TypeScript:       PASS (0 errors)
Tests:            PASS (142 passing)
Circular calls:   PASS

Overall: PASS — repo is in a good state
Note: Run `npm run uat` before tagging a release.
```

### Example 2: Multiple issues

**User**: "is the repo in a good state before I make a PR?"

**Output**:
```
AIWG Dev Doctor — 2026-04-01

Structure:        PASS
Orphans:          FAIL — 1 missing skill, 1 orphaned rule
Placement:        FAIL — 1 violation in .claude/skills/
.aiwg/ refs:      PASS
TypeScript:       PASS
Tests:            PASS
Circular calls:   PASS

Overall: FAIL — 3 issues found

1. [Orphans] my-addon/skills/my-skill/SKILL.md missing (listed in manifest)
   → Create the file or remove from manifest.json
2. [Orphans] my-addon/rules/old-rule.md exists but not in RULES-INDEX.md
   → Add an entry to rules/RULES-INDEX.md or delete old-rule.md
3. [Placement] .claude/skills/scratch-skill/ has no source in agentic/code/
   → Move to agentic/code/addons/<addon>/skills/scratch-skill/ or delete
```

### Example 3: Focused check

**User**: "just check for placement violations"

**Action**: Run Section 3 only.

**Output**:
```
Placement Violation Check

Checked: .claude/skills/, .claude/agents/, .claude/commands/, .claude/rules/
         .github/agents/, .github/prompts/, .github/instructions/
         .cursor/skills/, .cursor/agents/

Result: PASS — no placement violations found
All deployed files have corresponding source in agentic/code/.
```

## References

- @$AIWG_ROOT/agentic/code/addons/aiwg-dev/rules/skill-placement.md — Placement violation definitions
- @$AIWG_ROOT/agentic/code/addons/aiwg-dev/rules/no-circular-skill-calls.md — Circular call detection
- @$AIWG_ROOT/agentic/code/addons/aiwg-dev/rules/component-completeness.md — Completeness requirements
- @$AIWG_ROOT/agentic/code/addons/aiwg-dev/rules/addon-boundaries.md — Source vs project output boundary
- @$AIWG_ROOT/agentic/code/addons/aiwg-dev/rules/aiwg-dir-reference-contract.md — Normalized .aiwg/ reference contract
- @$AIWG_ROOT/agentic/code/addons/aiwg-dev/skills/validate-addon/SKILL.md — Per-addon validation
- @$AIWG_ROOT/tools/cli/doctor.mjs — Runtime doctor (end-user installation health, not dev structure)
