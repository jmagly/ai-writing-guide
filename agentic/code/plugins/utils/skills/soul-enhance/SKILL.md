---
namespace: aiwg
name: soul-enhance
platforms: [all]
description: Improve an existing SOUL.md by identifying vague sections, suggesting missing content, and generating calibration examples

---

# soul-enhance

Improve an existing SOUL.md by identifying vague sections, suggesting missing content, and generating calibration examples.

## Triggers


Alternate expressions and non-obvious activations (primary phrases are matched automatically from the skill description):

- "improve the soul" → soul quality enhancement
- "soul needs work" → soul refinement trigger

## Behavior

When triggered, this skill analyzes an existing SOUL.md and makes targeted improvements. It does not rewrite the file from scratch — it preserves the author's intent while strengthening weak areas.

### Enhancement Process

1. **Load and validate** the existing SOUL.md (runs soul-validate internally)
2. **Identify improvement targets** from the validation report
3. **Apply enhancements** category by category
4. **Generate companion files** if missing
5. **Report changes** with before/after comparisons

### Enhancement Categories

#### 1. Vague Statement Resolution

Scans for language patterns that are too generic to be useful:

| Vague Pattern | Enhancement Approach |
|--------------|---------------------|
| "I have nuanced views on X" | Ask: "What specifically do you believe about X?" |
| "I value quality" | Ask: "What does quality mean to you? What would you sacrifice for it?" |
| "I'm experienced with Y" | Ask: "How many years? What specifically have you built?" |
| "I believe in best practices" | Ask: "Which practices? Which 'best practices' do you think are wrong?" |
| "I'm passionate about Z" | Replace with concrete opinions about Z |

For each vague statement:
- Prompt the user with a sharpening question
- If interactive, wait for response and incorporate
- If non-interactive, suggest 2-3 specific alternatives based on context

#### 2. Missing Section Generation

For each missing recommended section, generate a draft:

| Missing Section | Generation Strategy |
|----------------|-------------------|
| Standards | Propose a bar-for-completion paragraph + dangling-thread examples + complete-vs-fast resolution. Infer from opinions and pet peeves about quality, shipping, and "good enough." Surface as a draft for the author to confirm. |
| Boundaries | Infer from opinions — strong opinions imply boundaries |
| Tensions | Find contradictions between stated opinions |
| Vocabulary | Extract signature terms from existing text |
| Pet Peeves | Infer from boundaries and strong opinions |
| Influences | Ask user or leave as TODO |

#### 3. Opinion Strengthening

Opinions must be specific enough to be falsifiable:

```
Before: "I think testing is important"
After:  "Integration tests catch more real bugs than unit tests.
         80% coverage with real calls beats 95% with mocked everything."
```

For each opinion:
- Check: could someone disagree with this?
- Check: is this specific to this persona or generic?
- If too generic, strengthen with specifics from the existing worldview

#### 4. Vocabulary Extraction

If the vocabulary section is empty or category-level:

1. Scan the entire SOUL.md for terms used in specific ways
2. Identify jargon, metaphors, and signature phrases
3. Add definitions that show personal meaning, not dictionary meaning

```
Before:
## Vocabulary
- Technical terms

After:
## Vocabulary
- **Blast radius**: How many things break when this thing breaks — my primary metric for evaluating changes
- **Yak shaving**: Work that's 3+ steps removed from the actual goal — I kill yak-shaving sessions aggressively
- **Accidental complexity**: Complexity from our tools and choices, not the problem domain — most complexity I encounter is accidental
```

#### 5. Calibration Example Generation

Generate `examples/good-outputs.md` and `examples/bad-outputs.md` from the soul definition:

**good-outputs.md**: 3-5 examples of text that correctly embodies the soul
- Match tone, vocabulary, opinions
- Cover different domains mentioned in the soul
- Include the contradictions/tensions

**bad-outputs.md**: 3-5 anti-examples showing what the soul would NOT produce
- Generic text that could come from anyone
- Text that contradicts stated opinions
- Text that uses avoided vocabulary
- Text that breaks stated boundaries

#### 6. Context Budget Optimization

If the soul file exceeds recommended limits:

- Identify sections that could be more concise
- Suggest moving detailed examples to companion files
- Flag redundancies between sections
- Recommend a target token count per section

## Parameters

| Flag | Description |
|------|-------------|
| `--interactive` | Ask sharpening questions for each vague statement |
| `--sections <list>` | Only enhance specific sections: `--sections "opinions,vocabulary"` |
| `--generate-examples` | Force generation of calibration examples |
| `--dry-run` | Show proposed changes without applying them |

## Output

### Interactive Mode

```
Enhancing SOUL.md...

Found 3 vague statements:

1. Line 14: "I value clean code"
   → What does "clean" mean to you specifically?
   → What would you sacrifice for clean code? What wouldn't you?
   User: "Clean means I can read it at 3 AM. I'll sacrifice DRY for readability."
   ✓ Updated: "Clean code is code I can read at 3 AM during an incident.
     I'll sacrifice DRY for readability — duplicated clarity beats obscure abstractions."

2. Line 31: "I have experience with many frameworks"
   → Which frameworks? What did each teach you?
   User: "Rails taught me convention, React taught me composition, Django taught me batteries-included"
   ✓ Updated: "I've built production systems in Rails (conventions),
     React (composition), and Django (batteries-included)."

3. Line 45: "I'm interested in distributed systems"
   → What specifically? Consensus? Networking? Data replication?
   User: "Consensus algorithms and failure modes"
   ✓ Updated: "I've spent a decade thinking about consensus algorithms
     and the creative ways distributed systems fail."

Missing sections generated:
  + Boundaries (5 items inferred from opinions)
  + Tensions (3 contradictions identified)

Calibration examples:
  + examples/good-outputs.md (4 examples)
  + examples/bad-outputs.md (3 anti-examples)

Score: 5/10 → 8/10
```

### Non-Interactive Mode

```
Enhancing SOUL.md...

Changes applied:
  ~ Line 14: Strengthened vague opinion (2 alternatives provided, chose first)
  ~ Line 31: Replaced generic statement with specific alternative
  ~ Line 45: Sharpened interest description
  + Boundaries section (5 items)
  + Tensions section (3 contradictions)
  + examples/good-outputs.md (4 examples)
  + examples/bad-outputs.md (3 anti-examples)

Score: 5/10 → 8/10

Review changes with: git diff SOUL.md
```

## Integration

### With soul-validate

`soul-enhance` runs `soul-validate` internally as its first step. The validation report drives which enhancements are applied.

### With soul-enable

After enhancement, if soul enforcement is already enabled, the improved SOUL.md is automatically active at the next session — no re-enabling needed.

### With voice-create

If a voice profile exists, `soul-enhance` cross-references it to ensure consistency. If the soul file mentions vocabulary that conflicts with the voice profile's avoid-list, it flags the conflict.

## Examples

```bash
# Full enhancement (interactive)
/soul-enhance --interactive

# Enhance specific sections only
/soul-enhance --sections "opinions,vocabulary,boundaries"

# Generate calibration examples without other changes
/soul-enhance --generate-examples

# Preview changes without applying
/soul-enhance --dry-run

# Enhance an agent soul file
/soul-enhance .claude/agents/test-engineer.soul.md
```

## References

- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/skills/soul-validate/SKILL.md — Validation (used internally)
- @$AIWG_ROOT/agentic/code/addons/aiwg-utils/skills/soul-create/SKILL.md — Creation skill
- @$AIWG_ROOT/docs/soul-md-guide.md — Integration guide
- #437 — SOUL.md compatibility issue (Phase 2)
