# UC-HMP-002: Hermes Skill Path Migration

**Phase**: Elaboration | **Priority**: P0 | **Status**: Draft

## Reasoning

1. **Problem**: AIWG deploys ~385 standard skills to `~/.hermes/.aiwg/skills/` — a sibling of Hermes's scanned root, invisible to Hermes.
2. **Constraint**: Cannot break existing operators mid-flight; must be idempotent across `aiwg refresh` cycles.
3. **Alternatives**: (a) move path to `~/.hermes/skills/.aiwg/` (chosen — verified Hermes recurses); (b) add `external_dirs:` to Hermes config (operator-invasive); (c) MCP-only (already rejected).
4. **Rationale**: Native discovery preserves Hermes's skill-graph model and avoids per-turn MCP cost for skill enumeration.
5. **Risk**: Stale files at old path (R1); Curator pruning of `.aiwg/` skills (R5).

## Primary Actor

Hermes user running `aiwg use --provider hermes` or `aiwg refresh --provider hermes`.

## Goal

Standard skills become natively discoverable by Hermes; old-path artifacts are cleaned up; Curator does not prune AIWG-managed skills.

## Main Success Scenario

1. Operator runs `aiwg refresh --provider hermes` (or `aiwg use sdlc --provider hermes`).
2. Deployer writes standard skills to `~/.hermes/skills/.aiwg/` (child of scanned root).
3. Deployer writes Curator-protection metadata flag in each SKILL.md frontmatter.
4. Deployer detects legacy `~/.hermes/.aiwg/skills/` directory; if populated with AIWG-deployed skills, removes after new path verified.
5. Hermes session restart picks up new skill locations via `os.walk()` scan.
6. `mcp_aiwg_skill_list` reflects the same set as Hermes's native discovery.

## Acceptance Criteria

- [ ] `tools/agents/providers/hermes.mjs:51` updates `paths.skills` to `path.join(os.homedir(), '.hermes', 'skills', '.aiwg')`
- [ ] Deployer adds Curator-protection metadata to all deployed SKILL.md (exact flag verified against Hermes PR #20194)
- [ ] Migration helper detects `~/.hermes/.aiwg/skills/` populated with AIWG skills, verifies new path populated, then removes old path
- [ ] Migration is idempotent — re-running `aiwg refresh` after migration is a no-op
- [ ] UAT verifies Hermes session discovers all 385 standard skills + ~9 kernel skills natively
- [ ] CHANGELOG entry documents the path change and migration behavior

## Implementation Sketch

`tools/agents/providers/hermes.mjs`:
- L51: change `paths.skills` to `~/.hermes/skills/.aiwg`
- New function `migrateSkillsPath(opts)`:
  - Detect `~/.hermes/.aiwg/skills/`
  - Filter for AIWG-deployed (hash-match against corpus)
  - Verify new path has same skill count
  - `rm -rf` old path
  - Log migration to `activity.log`
- Curator flag emission in skill copy step (frontmatter merge)
