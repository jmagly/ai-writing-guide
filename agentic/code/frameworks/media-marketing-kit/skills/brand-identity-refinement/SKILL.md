---
namespace: aiwg
name: brand-identity-refinement
platforms: [all]
description: Refine brand identity through metaphor testing, competitive research, and owner-grounded verification tied to repository reality
---

# brand-identity-refinement

Refine brand identity through structured metaphor testing, competitive research, sentiment analysis, and owner-grounded verification — producing a two-layer identity document where every claim is traceable to current repository reality.

## Triggers

Alternate expressions and non-obvious activations (primary phrases are matched automatically from the skill description):

- "brand refresh" → full identity refinement cycle
- "what's our story" → identity seed intake + metaphor generation
- "refine our positioning" → metaphor testing and two-layer document generation
- "brand session" → guided owner contribution + structured refinement
- "fix the brand" → claim audit + identity realignment
- "brand voice doesn't feel right" → structural metaphor re-evaluation

## Purpose

Brand identity work fails in predictable ways: it starts with what sounds good rather than what is true, commits to metaphors competitors already own, and produces claims the product cannot actually support. This skill exists to prevent all three failure modes.

It grounds identity work in repository reality before any creative output is produced. It tests metaphors against structural criteria rather than vibes. It researches competitive ownership of candidate metaphors. It creates explicit moments for domain expertise to correct AI assumptions. And it produces a two-layer document — metaphor front door, literal product room — so identity is both memorable and defensible.

The result is brand identity that a founder can say out loud and mean, that a salesperson can use without qualification, and that a skeptical prospect cannot immediately disprove.

## Behavior

When triggered, this skill executes in eight ordered steps:

### Step 1: Ground in Reality

Before any creative work begins, read the codebase and documentation to establish a verified capability baseline.

1. Identify all relevant repositories from the project context or user input
2. Read every top-level README and any linked capability documentation
3. Extract every explicit capability claim: what the system does, what it produces, what it integrates with, what it does not do
4. Build a "what is actually true right now" baseline document
5. If an existing identity document or brand brief is present, cross-check its claims against the extracted baseline
6. Flag any claim in the existing identity that the repos do not support — mark as `[UNVERIFIED]` with a note on what would be needed to substantiate it
7. Flag any capability in the repos that the existing identity does not mention — mark as `[UNCLAIMED ASSET]`

Output: `.aiwg/marketing/brand/capability-baseline.md`

### Step 2: Input Identity Seed

Accept the starting material for the refinement session.

1. Request or locate one of: existing identity document, brand brief, seed positioning statement, or founder description of the product
2. From the input, extract:
   - Current structural metaphor (if any — what frame does the language imply?)
   - Key claims being made
   - Target audience as currently described
   - Emotional register (aspirational, pragmatic, urgent, playful, authoritative?)
   - What the identity document implies the product *is for*
3. If no seed material is available, prompt the owner with: "Describe what this product does in one sentence, as if explaining to a smart person who has never heard of it."
4. Document the extracted seed elements alongside the capability baseline

Output: append to `.aiwg/marketing/brand/capability-baseline.md` under "Identity Seed" section

### Step 3: Structural Metaphor Testing

For the current metaphor and any proposed alternatives, apply a four-criteria evaluation before committing to any metaphor direction.

**Criterion 1 — Output capture**: Does the metaphor describe what the system *produces*, not just how it *operates*? A metaphor that describes mechanism but not outcome will feel abstract to buyers.

**Criterion 2 — Human role accuracy**: Does the human role implied by the metaphor match what users actually experience? If the metaphor casts the user as a passive recipient but the product requires active configuration, the metaphor will feel dishonest over time.

**Criterion 3 — Memory/persistence mapping**: Does the metaphor accommodate the product's memory, state, or continuity story naturally? Or does it require a forced extension that feels bolted on?

**Criterion 4 — Emotional register fit**: What is the emotional register the metaphor evokes, and does it match both the product's actual stakes and the target audience's self-image? A metaphor with the wrong emotional register will attract the wrong buyers and alienate the right ones.

For each candidate metaphor, score each criterion: Strong / Acceptable / Weak / Disqualifying. A single Disqualifying score eliminates the metaphor. Two Weak scores require a substantial reason to proceed.

Document results in a comparison table. Carry forward only Strong or Acceptable metaphors.

Output: `.aiwg/marketing/brand/metaphor-testing.md`

### Step 4: Competitive and Sentiment Research

Metaphors that pass structural testing must still clear two external checks.

**Competitive ownership check**: Research whether candidate metaphors are already strongly associated with a competitor, a category leader, or a broader cultural frame that would make the metaphor confusing or derivative. A metaphor you did not invent but that is not yet owned is viable. A metaphor already associated with a specific brand in the same category is not.

For each surviving metaphor:
- Identify the top 5–8 competitors and category-adjacent brands
- Search for metaphor usage in their positioning, taglines, and headline copy
- Rate metaphor availability: Unclaimed / Lightly used / Contested / Owned by competitor

**Sentiment and cultural context check**: Logical correctness does not guarantee cultural safety. Research current sentiment and connotation around each metaphor:
- Is there a recent cultural event or controversy that has changed the resonance of this metaphor?
- Does the metaphor carry unintended connotations for any segment of the target audience?
- Is the metaphor on an upward or downward cultural trajectory?

Eliminate any metaphor rated "Owned by competitor" or carrying a significant negative connotation. Flag contested metaphors for owner decision.

Output: `.aiwg/marketing/brand/competitive-landscape.md` (metaphor section appended to any existing competitive landscape file)

### Step 5: Domain Expertise Correction

This step creates a structured pause for the product owner's domain knowledge to correct AI-generated assumptions. It is not optional and cannot be synthesized from other sources.

Present findings so far to the owner and ask three explicit questions:

**Question 1 — Assumption audit**: "What assumptions am I making about the audience and their stakes that your domain expertise would correct? What do I not understand about how this product gets used in practice?"

**Question 2 — Internal phenomenology**: "What does it feel like to use this system when it's working well? Not what it produces — what it feels like from the inside."

**Question 3 — Owner completion prompt**: "Complete this sentence from your perspective, without editing for polish: '[Product] is the ___ for ___.' Say what first comes to mind."

Record the owner's responses verbatim. These responses take precedence over metaphors that passed all structural and competitive criteria. A metaphor the owner cannot say out loud is not a viable brand metaphor regardless of its score.

If the owner's completion prompt surfaces a metaphor not previously considered, add it to the candidate set and run it through Steps 3 and 4 before proceeding.

Output: owner responses recorded in `.aiwg/marketing/brand/owner-contributions.md`

### Step 6: Generate Two-Layer Identity

For each major identity element — positioning statement, tagline, elevator pitch, about description, mission statement — produce both layers.

**Metaphor layer (the front door)**: Evocative, memorable, structurally sound. Uses the chosen metaphor frame. Prioritizes resonance and distinctiveness. Can be understood without product knowledge. Does not require qualification.

**Literal layer (the room)**: Precise product language. Verifiable claims only (cross-referenced against Step 1 baseline). Describes what the system actually does, for whom, and what outcome it produces. No metaphor required — plain language that holds up to scrutiny.

Both layers are required for every identity element. Neither stands alone. The metaphor layer gets said in a pitch; the literal layer gets read on a feature page. They must describe the same product.

Format for each element:
```
## [Element Name]

**Metaphor layer**
[Evocative statement using chosen metaphor frame]

**Literal layer**
[Precise product description with verifiable claims]
```

Output: `.aiwg/marketing/brand/identity-document.md`

### Step 7: Verify All Claims

Cross-check every capability claim in the final identity document against the repo-verified baseline from Step 1.

For each claim in the identity document:
- Find the repo source that supports it (README line, documented feature, confirmed integration)
- Mark as `[VERIFIED: source]` if supported
- Mark as `[NEEDS QUALIFICATION]` if partially supported — add the appropriate qualifier ("for supported providers", "in beta", "requires configuration")
- Mark as `[REMOVE OR SUBSTANTIATE]` if no current repo evidence supports it

Produce a claim verification report listing all claims and their status. Claims marked `[REMOVE OR SUBSTANTIATE]` must be removed from the final document or replaced with a verified alternative before the identity document is considered complete.

The identity document is not done until zero `[REMOVE OR SUBSTANTIATE]` items remain.

Output: `.aiwg/marketing/brand/claim-verification.md`

### Step 8: Output and Handoff

Assemble all artifacts and produce a handoff summary.

Finalize:
- Brand identity document with two-layer structure and all claims verified
- Metaphor testing results with scoring rationale
- Competitive landscape analysis with metaphor availability assessment
- Claim verification report with resolution status for every flagged item
- Owner contribution record (verbatim responses preserved)
- Voice profile update recommendations (if voice-framework is installed, propose updates to brand voice profile to reflect chosen metaphor's emotional register)

Handoff summary includes:
- The chosen metaphor and why it was selected (structural scores + competitive availability + owner confirmation)
- Any claims that were removed or qualified and what replaced them
- Any unclaimed capability assets identified in Step 1 that could become future identity territory
- Recommended next review trigger (e.g., major feature release, competitive repositioning event, audience expansion)

## Metaphor Evaluation Rubric

```yaml
criteria:
  output_capture:
    question: "Does the metaphor describe what the system produces, not just how it operates?"
    strong: Metaphor implies a concrete, desirable outcome without explanation
    acceptable: Metaphor implies outcome with one sentence of context
    weak: Metaphor describes mechanism; outcome requires significant bridging
    disqualifying: Metaphor actively implies a different outcome than the product delivers

  human_role_accuracy:
    question: "Does the human role in the metaphor match actual user experience?"
    strong: Role implied by metaphor matches user posture exactly
    acceptable: Minor mismatch easily resolved in adjacent copy
    weak: Significant mismatch requires active correction in messaging
    disqualifying: Metaphor casts user as passive when active, or vice versa, in a way that feels dishonest

  memory_persistence_mapping:
    question: "Does the memory/persistence story map naturally or feel bolted on?"
    strong: Memory is central to or flows naturally from the metaphor
    acceptable: Memory can be added without straining the metaphor
    weak: Memory requires a new metaphor layer that competes with the first
    disqualifying: Metaphor implies ephemerality for a persistent system, or permanence for an ephemeral one

  emotional_register_fit:
    question: "Does the emotional register match both the product's stakes and the audience's self-image?"
    strong: Register matches how the target audience sees themselves and the stakes of their work
    acceptable: Register is close; minor adjustments in surrounding copy resolve the gap
    weak: Register mismatch requires consistent qualification to avoid misleading the audience
    disqualifying: Metaphor evokes feelings incompatible with the audience's professional context or self-image
```

## Owner Contribution Prompts

These prompts are used verbatim in Step 5. They are designed to surface knowledge that cannot be inferred from documentation.

```
Prompt 1 — Assumption audit:
"What assumptions am I making about the audience and their stakes
that your domain expertise would correct? What do I not understand
about how this product gets used in practice?"

Prompt 2 — Internal phenomenology:
"What does it feel like to use this system when it's working well?
Not what it produces — what it feels like from the inside, to the
person doing the work."

Prompt 3 — Owner completion:
"Complete this sentence from your perspective, without editing for
polish or marketing language — just say what first comes to mind:
'[Product] is the ___ for ___'"
```

Record all responses verbatim in `owner-contributions.md`. Do not paraphrase. Do not synthesize until the owner has confirmed the record is accurate.

## Usage Examples

### Full Refinement Session

```
User: "Our brand doesn't feel right — can you help us refine the identity?"

Skill executes:
1. Reads all repo READMEs, extracts capabilities
2. Requests current brand brief or positioning statement
3. Tests existing metaphor against 4 criteria
4. Researches competitive metaphor ownership
5. Asks owner 3 structured questions
6. Generates two-layer identity document
7. Verifies all claims against repo baseline

Output:
"Brand Identity Refinement Complete

Grounding:
- 3 repos read, 14 capability claims extracted
- 2 claims in existing identity not supported by repos (flagged)
- 1 unclaimed capability asset identified

Metaphor Analysis:
- Existing metaphor: Weak on human-role accuracy (disqualified)
- Candidate A: Strong on all criteria, unclaimed in category
- Owner confirmed Candidate A in completion prompt

Two-layer document generated:
- 6 identity elements (positioning, tagline, elevator, about, mission, values)
- 14 capability claims verified
- 0 unverified claims remaining

Artifacts:
- .aiwg/marketing/brand/identity-document.md
- .aiwg/marketing/brand/metaphor-testing.md
- .aiwg/marketing/brand/competitive-landscape.md
- .aiwg/marketing/brand/claim-verification.md
- .aiwg/marketing/brand/owner-contributions.md"
```

### Claim Audit Only

```
User: "Check if our brand claims are still accurate — we've shipped a lot since we wrote this"

Skill executes:
1. Reads all repo READMEs, extracts current capabilities
2. Loads existing identity document
3. Cross-checks every claim

Output:
"Claim Audit Complete

17 claims checked:
- 12 verified against current repos
- 3 need qualification (features now provider-specific)
- 2 cannot be substantiated (remove or update)

Flagged items:
- 'Works with all major CRMs' → [NEEDS QUALIFICATION: supports Salesforce and HubSpot]
- 'Real-time processing' → [REMOVE OR SUBSTANTIATE: batch mode in current release]

Report: .aiwg/marketing/brand/claim-verification.md"
```

### Metaphor Testing Only

```
User: "We're considering the metaphor [X] — is it solid?"

Skill executes:
1. Evaluates [X] against 4 structural criteria
2. Researches competitive ownership
3. Checks cultural sentiment
4. Asks owner completion prompt

Output:
"Metaphor Testing: [X]

Structural Evaluation:
- Output capture: Strong
- Human role accuracy: Weak (users are active, metaphor implies passive)
- Memory mapping: Acceptable
- Emotional register: Strong

Competitive Availability: Unclaimed in category

Recommendation: Weak on human-role accuracy. Consider how surrounding copy
can address the role mismatch before committing. Alternatively, evaluate
[related metaphor] which preserves the output-capture strength without
the passivity implication.

Full results: .aiwg/marketing/brand/metaphor-testing.md"
```

## Integration

This skill uses:
- `project-awareness`: Locate and read relevant repository READMEs
- `competitive-intel`: Pull existing competitive landscape data before researching metaphor availability
- `voice-framework`: Read and propose updates to brand voice profile
- `brand-compliance`: Validate final identity document against any existing brand guidelines

## Agent Orchestration

```yaml
primary:
  agent: brand-guardian
  role: Lead identity author, metaphor selection, two-layer document generation

reviewers:
  - agent: market-researcher
    role: Competitive metaphor ownership research and landscape analysis
    focus: Which metaphors competitors already own; available metaphor territory

  - agent: positioning-specialist
    role: Structural metaphor evaluation
    focus: Apply four-criteria rubric; score candidates; identify disqualifying failures

  - agent: legal-reviewer
    role: Claim verification and qualification
    focus: Flag unsubstantiated superlatives; ensure comparative claims are defensible

support:
  - agent: content-strategist
    role: Messaging consistency review
    focus: Ensure two-layer elements are consistent with each other and across channels
```

Execution pattern:
- Steps 1–2: Brand Guardian (sequential — grounding and seed intake must complete before creative work)
- Steps 3–4: Positioning Specialist + Market Researcher (parallel — structural and competitive evaluation are independent)
- Step 5: Owner interaction (synchronous — requires human in loop, cannot be parallelized)
- Step 6: Brand Guardian with Content Strategist review (parallel review after initial draft)
- Step 7: Legal Reviewer (sequential — runs after Step 6 draft is complete)
- Step 8: Brand Guardian synthesis

## Configuration

```yaml
brand_identity_config:
  # Source repositories to read in Step 1
  # If not configured, skill will request from user or infer from project context
  source_repos:
    - path: .  # current repo
    - path: ../  # adjacent repos if applicable
  
  # Existing identity inputs (any one is sufficient)
  identity_inputs:
    brand_brief: .aiwg/marketing/brand/brand-brief.md
    existing_identity: .aiwg/marketing/brand/identity-document.md
    positioning_statement: .aiwg/marketing/brand/positioning.md
  
  # Voice framework integration
  voice_framework:
    enabled: true  # set false if voice-framework addon not installed
    profile_path: .aiwg/voices/brand-voice.yaml
  
  # Claim verification thresholds
  claim_verification:
    # What counts as a verified claim source
    accepted_sources:
      - readme  # README.md files
      - changelog  # CHANGELOG entries
      - docs  # /docs directory content
      - feature_flags  # documented feature flags
    # Unverified claims above this count block completion
    max_unverified_claims: 0
  
  # Metaphor evaluation
  metaphor_evaluation:
    # Number of disqualifying scores to reject a metaphor
    disqualifying_threshold: 1
    # Number of weak scores requiring explicit owner override
    weak_threshold: 2
```

## Output Locations

| Artifact | Path | When Created |
|----------|------|--------------|
| Capability baseline | `.aiwg/marketing/brand/capability-baseline.md` | Step 1 |
| Metaphor testing | `.aiwg/marketing/brand/metaphor-testing.md` | Step 3 |
| Competitive landscape | `.aiwg/marketing/brand/competitive-landscape.md` | Step 4 |
| Owner contributions | `.aiwg/marketing/brand/owner-contributions.md` | Step 5 |
| Identity document | `.aiwg/marketing/brand/identity-document.md` | Step 6 |
| Claim verification | `.aiwg/marketing/brand/claim-verification.md` | Step 7 |
| Voice profile updates | `.aiwg/voices/brand-voice.yaml` (updated in place) | Step 8 (if voice-framework installed) |

## References

- `@$AIWG_ROOT/agentic/code/frameworks/media-marketing-kit/templates/brand/brand-guidelines-template.md`
- `@$AIWG_ROOT/agentic/code/frameworks/media-marketing-kit/templates/brand/brand-story-template.md`
- `@$AIWG_ROOT/agentic/code/addons/voice-framework/README.md`
- `@$AIWG_ROOT/agentic/code/frameworks/media-marketing-kit/skills/competitive-intel/SKILL.md`
- `@$AIWG_ROOT/agentic/code/frameworks/media-marketing-kit/skills/brand-compliance/SKILL.md`
