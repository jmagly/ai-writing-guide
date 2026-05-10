---
namespace: aiwg
name: soul-validate
platforms: [all]
description: Validate a SOUL.md file against community best practices and quality criteria

---

# soul-validate

Validate a SOUL.md file against community best practices and quality criteria.

## Triggers


Alternate expressions and non-obvious activations (primary phrases are matched automatically from the skill description):

- "soul score" → soul quality metrics
- "check the soul" → soul validation

## Behavior

When triggered, this skill performs a comprehensive quality assessment of a SOUL.md file, checking for completeness, specificity, and effectiveness.

### Validation Process

1. **Locate SOUL.md** — check `./SOUL.md`, `./.aiwg/SOUL.md`, or path from user
2. **Parse sections** — identify which recommended sections are present
3. **Assess each section** for quality criteria
4. **Report results** with specific, actionable feedback

### Section Checklist

| Section | Required | Quality Criteria |
|---------|----------|-----------------|
| Who I Am | Yes | Specific background, not generic. Mentions concrete experience. |
| Worldview | Yes | Beliefs specific enough to be falsifiable. Not platitudes. |
| Opinions | Yes | Organized by domain. Each opinion could be disagreed with. |
| Standards | Recommended | Concrete bar for completion. Names dangling threads this persona never leaves and how complete-vs-fast tension resolves. Not "I value quality." |
| Vocabulary | Recommended | Actual terms with personal definitions, not categories. |
| Boundaries | Recommended | Concrete refusals, not vague ethical statements. |
| Current Focus | Optional | Active projects, current thinking. Dated or contextual. |
| Influences | Optional | Specific people/works with what was taken from each. |
| Tensions | Optional | Genuine contradictions — shows self-awareness. |
| Pet Peeves | Optional | Specific triggers, not generic annoyances. |
| Interests | Optional | Deep interests that inform cross-domain thinking. |

**Backwards compatibility**: Souls that predate the Standards section validate with a **warning**, not an error. Existing souls remain functional; `/soul-enhance` proposes Standards content. New souls created via `/soul-create` should populate the section.

### Quality Tests

#### 1. Prediction Test (Critical)

> "Could someone reading this SOUL.md predict the agent's takes on new, unstated topics?"

- **Pass**: Worldview + opinions are specific enough to interpolate
- **Fail**: Too vague — anyone could have these opinions

#### 2. Specificity Test

Check for vague language patterns that weaken the soul:

| Vague (Fail) | Specific (Pass) |
|-------------|-----------------|
| "I have nuanced views on X" | "I think X is overrated because Y" |
| "I value quality" | "I'll delay a release to fix a flaky test" |
| "I aim for excellence" | "Done = no dangling threads, real fix not workaround" |
| "I believe in completeness" | "I never ship a fix without a regression test for it" |
| "I'm interested in technology" | "I've spent 10 years on distributed systems" |
| "I believe in best practices" | "Most 'best practices' are cargo cult" |

Flag any sentence that could apply to anyone.

#### 3. Context Budget Test

- Under 5K tokens (~3,750 words): Pass
- 5K-8K tokens: Warning — consider trimming
- Over 8K tokens: Fail — too large for context budget

#### 4. Anti-Pattern Detection

Flag common anti-patterns:

| Anti-Pattern | Example | Fix |
|-------------|---------|-----|
| Generic positivity | "I'm passionate about helping" | Replace with specific beliefs |
| Exhaustive rules | 50+ boundary statements | Reduce to 5-10 core boundaries |
| No contradictions | Suspiciously coherent persona | Add 2-3 genuine tensions |
| Category-level vocabulary | "technical terms" | List actual terms with definitions |
| Missing opinions | Worldview without takes | Add domain-specific opinions |

#### 5. Companion File Check

Check for recommended companion files:

| File | Purpose | Status |
|------|---------|--------|
| STYLE.md | Writing patterns | Check if exists |
| examples/good-outputs.md | Calibration examples | Check if exists |
| examples/bad-outputs.md | Anti-pattern examples | Check if exists |

### Output Format

```
Soul Validation Report
=======================

File: ./SOUL.md (~2,847 tokens)

Section Completeness
---------------------
  ✓ Who I Am          Present, specific
  ✓ Worldview         Present, 4 falsifiable beliefs
  ✓ Opinions          Present, organized by 3 domains
  ⚠ Standards         Missing — what's this persona's bar for "done"? (warning, not error)
  ✓ Vocabulary        Present, 12 terms defined
  ✗ Boundaries        Missing — what will the agent refuse?
  ✓ Current Focus     Present
  ✓ Influences        Present, 5 named with takeaways
  ✗ Tensions          Missing — what contradictions exist?
  ✓ Pet Peeves        Present, 4 specific triggers

Quality Tests
--------------
  ✓ Prediction test   Opinions are interpolatable
  ⚠ Specificity test  2 vague statements found:
    Line 14: "I value clean code" → too generic, what specifically?
    Line 31: "I have experience with many frameworks" → which ones?
  ✓ Context budget    ~2,847 tokens (under 5K limit)
  ✓ Anti-patterns     None detected

Companion Files
----------------
  ✗ STYLE.md               Not found
  ✗ examples/good-outputs.md   Not found
  ✗ examples/bad-outputs.md    Not found

Score: 7/10

Recommendations
----------------
1. Add a Boundaries section — define 5-10 concrete refusals
2. Add a Tensions section — list 2-3 genuine contradictions
3. Fix vague statements on lines 14 and 31
4. Consider creating calibration examples (good-outputs.md)
5. Consider creating a STYLE.md companion for writing patterns

Run /soul-enhance to auto-improve these issues.
```

### Scoring

| Score | Meaning |
|-------|---------|
| 9-10 | Production-ready. Distinctive, interpolatable, well-bounded. |
| 7-8 | Good foundation. Missing sections or minor vagueness. |
| 5-6 | Needs work. Multiple missing sections or pervasive vagueness. |
| 3-4 | Weak. Mostly generic. Fails prediction test. |
| 1-2 | Placeholder. Not functional as a soul file. |

## Integration

### With soul-create

After `/soul-create`, automatically offer validation:

```
SOUL.md created. Run /soul-validate to check quality.
```

### With soul-enable

Before enabling, recommend validation if score < 7:

```
Warning: SOUL.md scores 5/10 on quality check.
Consider running /soul-validate and /soul-enhance before enabling.
```

## Examples

```bash
# Validate project soul
/soul-validate

# Validate specific file
/soul-validate .aiwg/SOUL.md

# Validate agent soul
/soul-validate .claude/agents/test-engineer.soul.md
```

## References

- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/skills/soul-create/SKILL.md — Soul creation
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/commands/soul-enable.md — Soul enforcement
- @$AIWG_ROOT/docs/soul-md-guide.md — SOUL.md integration guide
- #437 — SOUL.md compatibility issue
