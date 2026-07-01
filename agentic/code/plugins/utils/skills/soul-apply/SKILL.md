---
namespace: aiwg
name: soul-apply
platforms: [all]
description: Apply a SOUL.md identity to content generation, incorporating worldview, opinions, and character

---

# soul-apply

Apply a SOUL.md identity to content generation — deeper than voice-apply, incorporating worldview, opinions, and character.

## Triggers


Alternate expressions and non-obvious activations (primary phrases are matched automatically from the skill description):

- "apply soul" → voice enforcement via SOUL.md
- "write in our voice" → soul-based writing

## Behavior

When triggered, this skill applies the loaded SOUL.md to any content generation task. Unlike `/voice-apply` which adjusts writing style (tone, formality, sentence structure), `/soul-apply` incorporates the agent's identity — worldview shapes arguments, opinions influence recommendations, vocabulary infuses the text, and boundaries constrain what gets said.

### Application Layers

| Layer | What Changes | Source Section |
|-------|-------------|----------------|
| **Worldview** | How arguments are framed, what's treated as axiomatic | Worldview |
| **Opinions** | Which positions are taken on debatable topics | Opinions |
| **Vocabulary** | Which terms are used and their specific meanings | Vocabulary |
| **Boundaries** | What the agent won't say or recommend | Boundaries |
| **Tensions** | Where the agent acknowledges complexity | Tensions |
| **Tone** | How confident, direct, or warm the output feels | Who I Am + Pet Peeves |

### Application Process

1. **Load soul file** — `./SOUL.md`, `./.aiwg/SOUL.md`, or specified path
2. **Load per-agent soul** if active agent has a companion `.soul.md`
3. **Internalize identity** — not as rules to follow, but as character to inhabit
4. **Generate content** with soul actively shaping:
   - Arguments derived from worldview, not generic reasoning
   - Opinions stated where relevant, not hedged away
   - Vocabulary used naturally, not forced
   - Boundaries respected silently (no meta-commentary about what was avoided)
   - Tensions acknowledged when the topic touches contradictions
5. **Verify output** against soul — would this person actually write this?

### Application Modes

#### Explicit Mode

User invokes `/soul-apply` with specific content:

```
/soul-apply "Write a recommendation for our database migration strategy"
```

The soul shapes the recommendation — e.g., if the soul values simplicity, it might recommend PostgreSQL over a microservices data mesh.

#### Passive Mode

When soul enforcement is enabled via `/soul-enable`, the soul is passively applied to all content generation. `/soul-apply` is the explicit version of what the enforcement rule does implicitly.

#### Revision Mode

Apply soul to existing content:

```
/soul-apply --revise ./docs/architecture-decision.md
```

Rewrites the document to reflect the soul's worldview, opinions, and voice while preserving the factual content.

### What Soul Application Looks Like

**Without soul** (generic):
```
We should consider using microservices for this project. There are several
approaches to consider, each with trade-offs. The team should evaluate
what works best for their specific situation.
```

**With soul** (engineer who values simplicity):
```
Start with a monolith. Most teams split too early, and you'll spend more
time on service boundaries than on the actual problem. If you hit a genuine
scaling bottleneck — not a hypothetical one — extract that specific piece.
A well-structured monolith beats a distributed monolith with network latency
every time.
```

**Without soul** (generic code review):
```
This function could benefit from some refactoring. Consider breaking it
into smaller pieces for better readability and testability.
```

**With soul** (skeptical engineer):
```
This function is 40 lines and does one thing. That's fine. Don't split it
into three functions that each need the same context passed through parameters.
The current version is readable at 3 AM — splitting it would make it harder
to follow, not easier.
```

## Parameters

| Flag | Description |
|------|-------------|
| `--soul <path>` | Use a specific soul file (default: auto-detect) |
| `--revise <path>` | Revise existing content through the soul |
| `--compare` | Show before/after comparison |
| `--intensity <low\|medium\|high>` | How strongly the soul shapes output (default: medium) |

### Intensity Levels

| Level | Behavior |
|-------|----------|
| `low` | Subtle influence — vocabulary and tone shift, opinions only when directly relevant |
| `medium` | Clear character — worldview shapes framing, opinions stated naturally, vocabulary consistent |
| `high` | Full character — strong opinions, distinctive voice, boundaries enforced, contradictions surfaced |

## Integration

### With Voice Framework

When both soul and voice profile are active:
- **Soul** controls *what* is said (opinions, worldview, boundaries)
- **Voice** controls *how* it sounds (sentence structure, formality, tone scales)
- If they conflict, soul takes precedence on content; voice takes precedence on syntax

### With soul-enable

When enforcement is active, `/soul-apply` is redundant for new content — the soul is already being applied. Use `/soul-apply` for:
- Explicit revision of existing content
- Switching between soul files mid-session
- Testing soul application before enabling enforcement

### Verification

After application, the output should pass the soul prediction test:
> "Would someone who read the SOUL.md predict this output came from this persona?"

If not, the soul may be too vague — recommend `/soul-enhance`.

## Examples

```bash
# Apply soul to a content generation task
/soul-apply "Write a post about why we chose PostgreSQL"

# Revise existing content through the soul
/soul-apply --revise docs/architecture-decision.md

# Apply with high intensity (strong character)
/soul-apply --intensity high "Review this PR's architectural approach"

# Use a specific soul file
/soul-apply --soul .claude/agents/security-auditor.soul.md "Assess this auth flow"

# Compare before/after
/soul-apply --revise --compare docs/team-practices.md
```

## References

- @$AIWG_ROOT/agentic/code/addons/voice-framework/skills/voice-apply/SKILL.md — Voice application (complementary)
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/rules/soul-enforcement.md — Passive enforcement rule
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/skills/soul-create/SKILL.md — Soul creation
- @$AIWG_ROOT/docs/soul-md-guide.md — Integration guide
- #437 — SOUL.md compatibility issue (Phase 2)
