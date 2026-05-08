---
namespace: aiwg
name: soul-blend
platforms: [all]
description: Merge multiple SOUL.md files into a composite persona for team-level agents or multi-perspective characters
---

# soul-blend

Merge multiple SOUL.md files into a composite persona — for team-level agents or multi-perspective characters.

## Triggers


Alternate expressions and non-obvious activations (primary phrases are matched automatically from the skill description):

- "blend souls" → multi-SOUL.md synthesis
- "merge voice profiles" → soul blending

## Behavior

When triggered, this skill takes two or more SOUL.md files and produces a unified composite that preserves distinctive elements from each while resolving conflicts coherently.

### Blending Process

1. **Load source souls** — read all input SOUL.md files
2. **Identify overlaps** — shared beliefs, vocabulary, boundaries
3. **Identify conflicts** — contradictory opinions, incompatible boundaries
4. **Resolve conflicts** using a configurable strategy
5. **Merge non-conflicting sections** — union of vocabulary, interests, influences
6. **Generate composite** — new SOUL.md with attribution for each element
7. **Validate result** — run soul-validate on the output

### Conflict Resolution Strategies

| Strategy | Behavior | Use When |
|----------|----------|----------|
| `weighted` (default) | Primary soul takes precedence on conflicts | One soul is dominant, others add flavor |
| `union` | Include both sides of each conflict as a Tension | Building a deliberately complex persona |
| `consensus` | Keep only opinions both souls share | Building a team consensus persona |
| `interactive` | Ask user to resolve each conflict | Precision matters |

### Section Merging Rules

| Section | Merge Strategy |
|---------|---------------|
| Who I Am | Combine backgrounds into composite narrative |
| Worldview | Union non-conflicting beliefs; conflicts → strategy |
| Opinions | Union non-conflicting; conflicts → strategy |
| Standards | **Highest-bar wins** by default. Take the strictest "bar for completion" across inputs; union the dangling-thread examples; surface complete-vs-fast conflicts as a Tension rather than averaging them. Standards never blend down — a craft persona blended with a pragmatic shipping persona produces a craft-leaning composite, with the speed sensitivity captured in Tensions. Override with `--strategy consensus` to keep only the bar both souls share. |
| Vocabulary | Union all terms; flag conflicting definitions |
| Boundaries | Union all (strictest boundary wins) |
| Interests | Union all |
| Influences | Union all, deduplicate |
| Tensions | Union all + add new tensions from resolved conflicts |
| Pet Peeves | Union all |

### Output Format

The blended SOUL.md includes attribution comments:

```markdown
## Worldview

- Simplicity beats cleverness <!-- from: engineer.soul.md -->
- Security is not optional <!-- from: auditor.soul.md -->
- Both agreed: test what matters, not everything <!-- shared -->

## Tensions

- Values moving fast (engineer) but also thorough review (auditor) <!-- blend tension -->
```

## Parameters

| Flag | Description |
|------|-------------|
| `<files...>` | Two or more SOUL.md files to blend |
| `--primary <path>` | Designate the primary soul for weighted blending |
| `--strategy <name>` | Conflict resolution: `weighted`, `union`, `consensus`, `interactive` |
| `--output <path>` | Output path (default: `./SOUL.md`) |
| `--strip-attribution` | Remove `<!-- from: -->` comments from output |

## Examples

```bash
# Blend two agent souls
/soul-blend .claude/agents/test-engineer.soul.md .claude/agents/security-auditor.soul.md

# Weighted blend with primary
/soul-blend --primary engineer.soul.md engineer.soul.md designer.soul.md

# Interactive conflict resolution
/soul-blend --strategy interactive soul-a.md soul-b.md soul-c.md

# Team consensus
/soul-blend --strategy consensus team-member-*.soul.md --output team-soul.md
```

## Integration

### With voice-blend

Parallel to `/voice-blend` which merges voice profiles. If both voice profiles and soul files exist for the same sources, consider blending both and running `/soul-to-voice` to keep them synchronized.

### With SDLC Agent Souls

Blend SDLC agent souls to create cross-functional agents:

```bash
# Create a "security-aware test engineer"
/soul-blend \
  --primary .claude/agents/test-engineer.soul.md \
  .claude/agents/test-engineer.soul.md \
  .claude/agents/security-auditor.soul.md \
  --output .claude/agents/security-test-engineer.soul.md
```

## References

- @$AIWG_ROOT/agentic/code/addons/voice-framework/skills/voice-blend/SKILL.md — Voice blending (parallel pattern)
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/skills/soul-create/SKILL.md — Soul creation
- @$AIWG_ROOT/docs/soul-md-guide.md — Integration guide
- #437 — SOUL.md compatibility issue (Phase 3)
