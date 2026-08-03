---
namespace: aiwg
name: validate-component
description: Validate a single AIWG component (skill, agent, or command) for completeness and correctness
platforms: [all]

---

# Validate Component

You check a single AIWG component — a skill, agent, or CLI command — for completeness and correctness, then produce a structured pass/fail report with specific gaps listed.

## Triggers

- "validate this skill" → check the skill in the current directory or named path
- "is this component complete" → run completeness check
- "check this agent" → validate agent frontmatter and manifest registration
- "validate component at <path>" → validate the named path
- "is this command wired up correctly" → check CLI command completeness
- "pre-PR check on this skill" → run validate-component

## Trigger Patterns Reference

| Pattern | Example | Action |
|---------|---------|--------|
| Validate skill | "validate this skill" | Run skill completeness checks |
| Validate agent | "check this agent definition" | Run agent completeness checks |
| Validate command | "is this command wired up" | Run command completeness checks |
| Path-specific | "validate component at agentic/code/addons/my-addon/skills/my-skill" | Validate at given path |
| Pre-PR | "pre-PR check on this component" | Run all applicable checks |

## Process

1. **Identify component type and path**:
   - If no path is given, check the current working directory or the most recently edited file
   - Detect type from directory structure:
     - Path contains `skills/<name>/SKILL.md` → skill
     - Path contains `agents/<name>.md` or `agents/<name>/` → agent
     - Component name appears in `src/extensions/commands/definitions.ts` → command

2. **Run type-appropriate checks**:

   **For a Skill**:
   - Read the `SKILL.md` file
   - Check: `description:` field present in YAML frontmatter
   - Check: `# Title` section present
   - Check: `## Behavior` or `## Process` section present
   - Check: At least one `## Examples` entry
   - Find the parent addon's `manifest.json` (walk up directory tree)
   - Check: Skill name listed in `manifest.json` `skills` array
   - Check: File lives in `agentic/code/` (not in a provider deployment directory)
   - If SKILL.md contains `executedViaSkillRunner: true` reference: check for circular CLI call pattern
   - **Full link classification check** (see Link Classification below)

   **For an Agent**:
   - Read the agent `.md` file
   - Check: YAML frontmatter block present
   - Check: `name:` field in frontmatter
   - Check: `description:` field in frontmatter
   - Check: `model:` field in frontmatter
   - Check: `tools:` field in frontmatter
   - Find parent addon's `manifest.json`
   - Check: Agent listed in `manifest.json` `agents` array
   - Check: File lives in `agentic/code/`
   - **Full link classification check** (see Link Classification below)

   **Link Classification** (applies to all component types):

   Extract every `@<path>` reference from the file and classify:

   | Pattern | Result | Message |
   |---------|--------|---------|
   | `@$AIWG_ROOT/<path>` | PASS | AIWG core ref (install-relative) |
   | `@$TOKEN/<path>` — TOKEN set in env | PASS | Registered corpus token |
   | `@$TOKEN/<path>` — TOKEN NOT in env | WARN | `env var TOKEN not set; add to .env or export` |
   | `@.aiwg/<path>` — path in Tier 1/2 allowlist | PASS | Normalized project memory |
   | `@.aiwg/<path>` — not in any `memory.creates` | FAIL | `non-normalized .aiwg/ path — repo-local only` |
   | `@.claude/<path>` | FAIL | `deployment target — forbidden in distributable source` |
   | `@agentic/code/<path>` | WARN | `legacy bare ref — migrate to @$AIWG_ROOT/agentic/code/` |
   | `@src/<path>` | WARN | `legacy bare ref — migrate to @$AIWG_ROOT/src/` |
   | `@docs/<path>` | WARN | `legacy bare ref — migrate to @$AIWG_ROOT/docs/` |
   | `@tools/<path>` | WARN | `legacy bare ref — migrate to @$AIWG_ROOT/tools/` |
   | Relative path within component | PASS | Local ref |

   Build the Tier 2 allowlist by reading all `manifest.json` files in `agentic/code/` and collecting `memory.creates[*].path` values. Combine with Tier 1 (`.aiwg/AIWG.md`, `.aiwg/frameworks/`).

   **For a CLI Command**:
   - Read `src/extensions/commands/definitions.ts`
   - Check: Command entry exists in definitions
   - Check: Command has either `executedViaSkillRunner: true` OR a handler entry
   - If `executedViaSkillRunner: true`: find the associated SKILL.md and verify it does not contain `aiwg <command-name>` in any bash block
   - If handler expected: check `src/cli/handlers/` for the handler file and registration in `allHandlers`

3. **Compile report**:

   Format results as a structured report:

   ```
   Component Validation: <component-name> (<type>)
   Path: <absolute-or-relative-path>

   Checks:
     PASS  description frontmatter present
     PASS  title section present
     PASS  behavior section present
     FAIL  no examples section found
     PASS  listed in manifest.json
     FAIL  not in agentic/code/ (found in .claude/skills/ — placement violation)
     WARN  @.aiwg/planning/my-design.md is not a normalized path (repo-local only)

   Result: FAIL — 2 issues found

   Required actions:
     1. Add ## Examples section to SKILL.md
     2. Move SKILL.md to agentic/code/addons/<addon>/skills/<name>/SKILL.md
        then re-deploy with: aiwg use <addon>
   ```

4. **Surface the report** to the user with the result line prominent.

## Examples

### Example 1: Valid skill

**User**: "Validate the doctor skill"

**Action**: Read `agentic/code/addons/aiwg-utils/skills/doctor/SKILL.md`, find parent manifest, run all checks.

**Output**:
```
Component Validation: doctor (skill)
Path: agentic/code/addons/aiwg-utils/skills/doctor/SKILL.md

Checks:
  PASS  description frontmatter present
  PASS  title section present
  PASS  behavior section present
  PASS  examples section present
  PASS  listed in aiwg-utils manifest.json
  PASS  lives in agentic/code/

Result: PASS — all checks passed
```

### Example 2: Incomplete skill with placement violation

**User**: "validate component at .claude/skills/my-new-skill"

**Action**: Read SKILL.md, check for completeness, check placement.

**Output**:
```
Component Validation: my-new-skill (skill)
Path: .claude/skills/my-new-skill/SKILL.md

Checks:
  PASS  description frontmatter present
  FAIL  no ## Behavior or ## Process section
  FAIL  no ## Examples section
  FAIL  placement violation: .claude/skills/ is a deployment target
  FAIL  not found in any manifest.json

Result: FAIL — 4 issues found

Required actions:
  1. Add ## Behavior section to SKILL.md
  2. Add ## Examples section to SKILL.md
  3. Move to agentic/code/addons/<your-addon>/skills/my-new-skill/SKILL.md
  4. Add "my-new-skill" to your addon's manifest.json skills array
  5. Run `aiwg use <addon>` to deploy
```

### Example 3: Circular skill-executed command

**User**: "check the my-command command"

**Action**: Read `definitions.ts`, find `executedViaSkillRunner: true`, read associated SKILL.md, search for `aiwg my-command`.

**Output**:
```
Component Validation: my-command (command)
Path: src/extensions/commands/definitions.ts

Checks:
  PASS  definition entry present in definitions.ts
  PASS  executedViaSkillRunner: true (no TypeScript handler required)
  FAIL  circular call detected: SKILL.md contains "aiwg my-command" in bash block (line 47)

Result: FAIL — 1 issue found

Required actions:
  1. Rewrite SKILL.md to perform work directly via Read/Write/Bash/Task tools
     without calling back into `aiwg my-command`
  See: agentic/code/addons/aiwg-dev/rules/no-circular-skill-calls.md
```

## References

- @$AIWG_ROOT/agentic/code/addons/aiwg-dev/rules/component-completeness.md — Full completeness requirements
- @$AIWG_ROOT/agentic/code/addons/aiwg-dev/rules/skill-placement.md — Placement requirements
- @$AIWG_ROOT/agentic/code/addons/aiwg-dev/rules/no-circular-skill-calls.md — Circular call detection
- @$AIWG_ROOT/agentic/code/addons/aiwg-dev/rules/aiwg-dir-reference-contract.md — Normalized .aiwg/ path contract
- @$AIWG_ROOT/src/extensions/commands/definitions.ts — Command definition registry
