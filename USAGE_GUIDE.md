# AIWG - Usage Guide

## Installation Options

### Claude Code Plugin (Recommended)

Native Claude Code integration via the plugin marketplace:

```bash
# Add AIWG marketplace (one-time)
/plugin marketplace add jmagly/ai-writing-guide

# Install plugins
/plugin install sdlc@aiwg        # 58 SDLC agents
/plugin install marketing@aiwg   # 37 marketing agents
/plugin install utils@aiwg       # Core utilities
/plugin install voice@aiwg       # Voice profiles
/plugin install writing@aiwg     # AI pattern detection
/plugin install hooks@aiwg       # Workflow tracing
```

### npm Install (CLI + Multi-Platform)

For CLI access and deploying to other platforms:

```bash
npm install -g aiwg
aiwg use sdlc                         # Deploy to current project
aiwg use sdlc --provider factory      # Deploy for Factory AI
```

> **No account required**: Claude Code plugin distribution is completely decentralized. There's no registry to sign up for, no approval process, and no login required. Marketplaces are simply git repositories with a `marketplace.json` file - users add them directly via URL.

---

## Important: Context Selection Strategy

**DO NOT include all documents in every context.** This guide provides targeted combinations for specific needs.

## Core Principle

The goal is to maintain sophisticated, authoritative writing with consistent voice control. We're not dumbing
down content - we're defining positive voice characteristics while preserving technical depth and professional voice.

## When to Use This Guide

### Always Include (Baseline)

- `CLAUDE.md` - Core instructions only

### Situational Additions

Only add additional documents when:

1. Output lacks consistent voice
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

- Voice profile (`voice-framework/voices/templates/technical-authority.yaml`) (if needing consistent voice)
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
- Voice profile (`casual-conversational` or custom)

### 4. User-Facing Content

**Goal**: Clear, helpful, natural

**Include**:

- `CLAUDE.md`
- `context/quick-reference.md`

**Add for problems**:

- Voice profile (`friendly-explainer` or `casual-conversational`) to calibrate tone
- `examples/rewrite-exercises.md` (if struggling)

### 5. Academic/Research Writing

**Goal**: Scholarly, precise, sophisticated

**Include**:

- `CLAUDE.md`
- `core/sophistication-guide.md`
- `context/academic-voice.md`

**Note**: Academic contexts may require different voice profiles - formal transitions and structured phrasing are often appropriate here

### 6. Cypherpunk/Technical Mythology

**Goal**: Technical precision wrapped in cultural narrative, infrastructure as folklore

**Include**:

- `CLAUDE.md`
- `context/cypherpunk-voice.md`

**Use for**:

- Protocol documentation with subcultural voice
- Blockchain/crypto technical communications
- Tech manifestos and position papers
- Infrastructure storytelling
- System architecture as cultural revolution

**Note**: Preserves technical accuracy while treating revolutionary concepts as mundane infrastructure

## Progressive Enhancement Strategy

### Level 1: Minimal Intervention

Start with just `CLAUDE.md`. Often sufficient for good models.

### Level 2: Voice Calibration

Apply a voice profile if output shows:

- Generic, impersonal tone
- Inconsistent formality levels
- Lack of domain-appropriate vocabulary

**Built-in voice profiles**:

- `technical-authority` - Direct, precise, confident (docs, APIs)
- `friendly-explainer` - Approachable, encouraging (tutorials)
- `executive-brief` - Concise, outcome-focused (business)
- `casual-conversational` - Relaxed, personal (blogs)

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
> "We architected a distributed system using CQRS and event sourcing. Initial benchmarks show 3x throughput improvement
> over the monolithic approach, though operational complexity increased substantially."

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

### Voice Mismatch (Under-Correcting)

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

| Scenario | CLAUDE.md | Philosophy | Voice Profile | Examples | Quick Ref |
|----------|-----------|------------|---------------|----------|-----------|
| First Draft | ✓ | | | | |
| Tone Issues | ✓ | | ✓ | | |
| Too Formal | ✓ | ✓ | casual-conversational | ✓ | |
| Lacks Authority | ✓ | ✓ (sophistication) | technical-authority | | |
| Quick Check | ✓ | | | | ✓ |
| Full Rewrite | ✓ | ✓ | ✓ (select appropriate) | ✓ | |

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

❌ Using all documents for every task ✅ Selective inclusion based on needs

### Wrong Context

❌ Using technical examples for marketing ✅ Matching examples to domain

### Dumbing Down

❌ "The code makes the computer go fast" ✅ "The optimized algorithm reduces time complexity from O(n²) to O(n log n)"

### Losing Professional Voice

❌ "Yeah, so we basically just..." ✅ "We implemented a pragmatic solution that..."

## Voice Framework and Skills

### Voice Framework Addon

The Voice Framework replaces pattern-avoidance approaches with positive voice definition. Instead of listing what to avoid, define the voice you want.

**Voice profile locations** (priority order):

1. Project: `.aiwg/voices/` (project-specific)
2. User: `~/.config/aiwg/voices/` (user-wide)
3. Built-in: `voice-framework/voices/templates/` (AIWG defaults)

**Built-in profiles**:

| Profile | Description | Use For |
|---------|-------------|---------|
| `technical-authority` | Direct, precise, confident | API docs, architecture, engineering |
| `friendly-explainer` | Approachable, encouraging | Tutorials, onboarding, education |
| `executive-brief` | Concise, outcome-focused | Business cases, stakeholder comms |
| `casual-conversational` | Relaxed, personal | Blog posts, social, newsletters |

### Voice Skills

Voice skills are auto-applied based on context:

- **voice-apply**: Transform content to match a voice profile
- **voice-create**: Generate new voice profile from description
- **voice-blend**: Combine multiple profiles (e.g., 70% technical + 30% friendly)
- **voice-analyze**: Analyze content's current voice characteristics

**Natural language triggers**:

- "Write this in technical voice" → applies `technical-authority`
- "Make it more casual" → calibrates toward `casual-conversational`
- "Create a voice for API docs" → generates custom profile
- "Blend 70% technical with 30% friendly" → creates weighted combination

### SDLC and MMK Skills

Skills provide domain-specific knowledge that agents automatically load:

**SDLC Skills** (10): artifact-orchestration, gate-evaluation, traceability-check, risk-cycle, security-assessment, test-coverage, architecture-evolution, decision-support, incident-triage, sdlc-reports

**MMK Skills** (8): brand-compliance, audience-synthesis, competitive-intel, approval-workflow, performance-digest, review-synthesis, qa-protocol, data-pipeline

**aiwg-utils Skills** (6): project-awareness, artifact-metadata, parallel-dispatch, nl-router, config-validator, template-engine

Skills are deployed automatically with frameworks (`aiwg use sdlc/marketing/all`).

## Subagents and Automation

### Using Claude Code Agents

For complex writing tasks, leverage specialized agents:

**Quick Start**:

```bash
# Deploy general-purpose writing agents to your project
aiwg -deploy-agents --mode general

# Or deploy all agents (general + SDLC)
aiwg -deploy-agents --mode both
```

**Agent Invocation**:

```text
# For content validation
/writing-validator path/to/content.md

# For prompt optimization
/prompt-optimizer "your prompt text"

# For generating diverse examples
/content-diversifier "base concept or topic"
```

### Available Agent Categories

#### General-Purpose Writing Agents (`/agents/`)

- **writing-validator**: Validates voice consistency and content authenticity
- **prompt-optimizer**: Enhances prompts for better output quality
- **content-diversifier**: Generates varied examples and perspectives

#### SDLC Framework Agents (`/agentic/code/frameworks/sdlc-complete/agents/`)

51 specialized agents covering all development lifecycle phases:

- **Development**: code-reviewer, test-engineer, architecture-designer, debugger, performance-engineer
- **Requirements**: requirements-analyst, requirements-reviewer, business-process-analyst
- **Security**: security-architect, security-gatekeeper, security-auditor, privacy-officer
- **Operations**: devops-engineer, incident-responder, reliability-engineer, deployment-manager
- **Management**: project-manager, product-strategist, executive-orchestrator, intake-coordinator
- And many more specialized roles

See `/agentic/code/frameworks/sdlc-complete/README.md` for complete list

### When to Use Subagents

**Use for**:

- Validating large documents for voice consistency
- Generating multiple variations of examples
- Complex multi-step writing projects
- Systematic content improvement

**Don't use for**:

- Simple edits or rewrites
- Single paragraph fixes
- Quick pattern checks

### Parallel Processing

Launch multiple agents for comprehensive work:

```text
1. Writing Validator - Check current content
2. Content Diversifier - Generate alternatives
3. Prompt Optimizer - Improve future outputs
```

## Remember

- **Authority comes from expertise**, not formality
- **Sophistication comes from precision**, not complexity
- **Authenticity comes from honesty**, not casualness
- **Different contexts need different voices**

The goal: Write like an expert who's confident enough to be honest, not an AI trying to impress or a novice trying to be
casual.
