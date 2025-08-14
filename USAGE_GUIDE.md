# AI Writing Guide - Usage Guide

## Important: Context Selection Strategy

**DO NOT include all documents in every context.** This guide provides targeted combinations for specific needs.

## Core Principle

The goal is to maintain sophisticated, authoritative writing while avoiding AI detection patterns. We're not dumbing down content - we're removing performative language while preserving technical depth and professional voice.

## When to Use This Guide

### Always Include (Baseline)
- `CLAUDE.md` - Core instructions only

### Situational Additions
Only add additional documents when:
1. Output shows AI patterns
2. Content lacks authenticity
3. Specific writing challenge emerges
4. Quality check before publication

## Context Combinations by Use Case

### 1. Technical Documentation
**Goal**: Authoritative, precise, professional

**Include**:
- `CLAUDE.md`
- `core/sophistication-guide.md` (maintaining authority)

**Add if needed**:
- `validation/banned-patterns.md` (if seeing AI patterns)
- `examples/technical-writing.md` (if struggling with voice)

**Do NOT include**:
- Rewrite exercises (too remedial)
- Common tells (overly restrictive)

### 2. Executive Communications
**Goal**: Professional, strategic, polished but human

**Include**:
- `CLAUDE.md`
- `core/sophistication-guide.md`
- `context/executive-voice.md`

**Avoid**:
- Technical examples
- Casual voice guides

### 3. Blog Posts / Articles
**Goal**: Engaging, authentic, knowledgeable

**Include**:
- `CLAUDE.md`
- `core/philosophy.md`
- `patterns/common-ai-tells.md` (only if drafts sound robotic)

### 4. User-Facing Content
**Goal**: Clear, helpful, natural

**Include**:
- `CLAUDE.md`
- `context/quick-reference.md`

**Add for problems**:
- `validation/banned-patterns.md` (if too marketing-heavy)
- `examples/rewrite-exercises.md` (if struggling)

### 5. Academic/Research Writing
**Goal**: Scholarly, precise, sophisticated

**Include**:
- `CLAUDE.md`
- `core/sophistication-guide.md`
- `context/academic-voice.md`

**Note**: Many banned patterns are actually appropriate in academic contexts

## Progressive Enhancement Strategy

### Level 1: Minimal Intervention
Start with just `CLAUDE.md`. Often sufficient for good models.

### Level 2: Pattern Awareness
Add `validation/banned-patterns.md` only if seeing:
- "seamlessly integrates"
- "comprehensive solution"
- "Moreover/Furthermore"
- Other red flags

### Level 3: Voice Correction
Add `examples/technical-writing.md` if:
- Content too formal
- Lacking personality
- Missing technical depth

### Level 4: Full Remediation
Only use full suite if content consistently fails. This indicates need for:
- Model adjustment
- Prompt engineering
- Different approach

## Reading Level and Authority

### Maintaining Sophistication

**Wrong interpretation of guidelines**:
> "We built a thing. It works good. Saves money."

**Correct interpretation**:
> "We architected a distributed system using CQRS and event sourcing. Initial benchmarks show 3x throughput improvement over the monolithic approach, though operational complexity increased substantially."

### The Balance

- **Keep**: Technical vocabulary, complex sentence structures when needed, domain expertise
- **Remove**: Performative adjectives, formulaic transitions, marketing speak
- **Add**: Specific metrics, implementation details, honest assessments

## Warning Signs You're Over-Correcting

### Too Casual (Loss of Authority)
- Single-syllable words dominating
- Sentence fragments everywhere  
- Slang or colloquialisms
- Reading level below 10th grade for technical content

### Still Too AI (Under-Correcting)
- Every paragraph same length
- Formal transitions persist
- No opinions or trade-offs mentioned
- Perfect outcomes only

## Specific Use Case Guidance

### For Code Comments
- Don't use this guide - code comments should be formulaic and clear

### For API Documentation
- Use minimal guide - consistency matters more than voice

### For Sales/Marketing
- Some "banned" patterns are industry standard - use selectively

### For Legal/Compliance
- Formal language often required - skip most guidelines

### For Internal Communications
- Focus on clarity over style - minimal guide usage

## Document Selection Matrix

| Scenario | CLAUDE.md | Philosophy | Banned Patterns | Examples | Quick Ref |
|----------|-----------|------------|-----------------|----------|-----------|
| First Draft | ✓ | | | | |
| AI Patterns Detected | ✓ | | ✓ | | |
| Too Formal | ✓ | ✓ | | ✓ | |
| Lacks Authority | ✓ | ✓ (sophistication) | | | |
| Quick Check | ✓ | | | | ✓ |
| Full Rewrite | ✓ | ✓ | ✓ | ✓ | |

## Implementation Tips

### 1. Start Light
Begin with minimal context. Add documents only when specific problems emerge.

### 2. Match the Domain
Technical writing needs technical vocabulary. Don't simplify quantum computing to "computer stuff."

### 3. Preserve Voice Appropriateness
- Academic papers can use "Moreover"
- Legal documents need formal language
- API docs should be consistent over conversational

### 4. Test Output
Read result aloud:
- Does it sound intelligent?
- Does it maintain authority?
- Is it appropriate for audience?

### 5. Iterate
If output loses sophistication:
1. Remove restrictive documents
2. Add sophistication guide
3. Adjust prompt to emphasize expertise

## Common Mistakes

### Over-Application
❌ Using all documents for every task
✅ Selective inclusion based on needs

### Wrong Context
❌ Using technical examples for marketing
✅ Matching examples to domain

### Dumbing Down
❌ "The code makes the computer go fast"
✅ "The optimized algorithm reduces time complexity from O(n²) to O(n log n)"

### Losing Professional Voice
❌ "Yeah, so we basically just..."
✅ "We implemented a pragmatic solution that..."

## Remember

- **Authority comes from expertise**, not formality
- **Sophistication comes from precision**, not complexity
- **Authenticity comes from honesty**, not casualness
- **Different contexts need different voices**

The goal: Write like an expert who's confident enough to be honest, not an AI trying to impress or a novice trying to be casual.