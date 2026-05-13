---
namespace: aiwg
name: validate-metadata
platforms: [all]
description: Validate AIWG extension definitions against the metadata schema and report errors with field names, line numbers, and remediation hints
---

# Validate Metadata

You validate all AIWG extension definitions (agents, skills, commands, behaviors) against the metadata schema. You report errors with field names, line numbers, and remediation hints — and return a clean pass/fail summary.

## Triggers

Alternate expressions and non-obvious activations (primary phrases are matched automatically from the skill description):

- "are my extensions valid?" → run full metadata validation
- "check my agent definitions" → validate agent metadata specifically
- "is this skill definition correct?" → validate single extension file
- "prep for release" → validate metadata as part of pre-release checks

## Trigger Patterns Reference

| Pattern | Example | Action |
|---------|---------|--------|
| Validate request | "validate metadata" | Run `aiwg validate-metadata` |
| Check request | "check metadata" | Run `aiwg validate-metadata` |
| Validate extensions | "validate extensions" | Run `aiwg validate-metadata` |
| Quality check | "metadata quality" | Run `aiwg validate-metadata` |
| Single file | "validate this agent file" | Run `aiwg validate-metadata <path>` |
| Directory-scoped | "validate just security skills" | Run `aiwg validate-metadata --recursive agentic/code/frameworks/security-engineering/skills` |
| CI mode | "validate metadata for CI" | Run `aiwg validate-metadata --ci --format json --strict` |

## Behavior

When triggered:

1. **Extract intent**:
   - Is validation scoped to a specific extension type (agents, skills, commands, behaviors)?
   - Is a specific file path mentioned?
   - Is verbose output needed?

2. **Run the appropriate command**:

   ```bash
   # Default: validate all extensions
   aiwg validate-metadata

   # Recursive validation of a directory
   aiwg validate-metadata --recursive agentic/code/frameworks/security-engineering/skills

   # Strict CI output
   aiwg validate-metadata --ci --format json --strict

   # Validate a single file
   aiwg validate-metadata agentic/code/addons/aiwg-utils/skills/my-skill/SKILL.md
   ```

3. **Report the result** — list all errors with field, location, and fix hint; summarize pass/fail count.

## What Gets Validated

| Check | Description |
|-------|-------------|
| Required fields | `id`, `name`, `description`, `platforms` present |
| ID format | Lowercase, hyphen-separated, no spaces |
| Version format | CalVer (`YYYY.M.PATCH`) for versioned extensions |
| Trigger phrases | At least one trigger phrase defined per skill |
| Tool declarations | Tools listed in `allowedTools` are valid AIWG tools |
| Platform list | All platforms are valid (`claude-code`, `hermes`, `openclaw`, etc.) |
| Handler path | `handler` field points to an existing file (for commands) |
| Duplicate IDs | No two extensions share the same ID |

## Error Format

Errors are reported in this format:

```
ERROR  skills/my-skill/SKILL.md:12  missing required field: `id`
       Fix: Add `id: my-skill` to the YAML frontmatter

WARN   agents/my-agent/AGENT.md:3   version format invalid: `1.0.0`
       Fix: Use CalVer format: `2026.4.0`

PASS   commands/my-command/COMMAND.md
```

## Examples

### Example 1: Full validation before release

**User**: "Run metadata validation before I tag the release"

**Extraction**: Full validation, no scope restriction

**Action**:
```bash
aiwg validate-metadata
```

**Response**: "Validated 47 extension definitions. 45 passed. 2 errors found:
- `skills/soul-blend/SKILL.md` line 4: platforms list is empty — add at least one platform
- `agents/test-engineer/AGENT.md` line 9: duplicate ID 'test-engineer' conflicts with `agents/testing/test-engineer/AGENT.md`"

### Example 2: Scoped validation for skills only

**User**: "Check only the security-engineering skills metadata"

**Extraction**: Directory-scoped to security-engineering skills

**Action**:
```bash
aiwg validate-metadata --recursive agentic/code/frameworks/security-engineering/skills
```

**Response**: "Validated 38 skill definitions. All passed."

### Example 3: Single file validation

**User**: "Is this agent definition valid?" (with path provided)

**Extraction**: Single file path

**Action**:
```bash
aiwg validate-metadata agentic/code/addons/aiwg-utils/skills/new-skill/SKILL.md
```

**Response**: "1 error: missing required field `id` in frontmatter (line 3). Add `id: new-skill` to fix."

### Example 4: CI pipeline usage

**Action**:
```bash
aiwg validate-metadata --ci --format json --strict
```

**Output**:
```json
{
  "total": 47,
  "passed": 45,
  "failed": 2,
  "errors": [
    { "file": "skills/soul-blend/SKILL.md", "line": 4, "field": "platforms", "message": "platforms list is empty" }
  ]
}
```

## References

- @$AIWG_ROOT/src/cli/handlers/utilities.ts — Command handler
- @$AIWG_ROOT/docs/cli-reference.md — CLI reference
- @$AIWG_ROOT/src/extensions/types.ts — Extension type definitions and schema
