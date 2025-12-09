# Architecture Review: Skills Assessment Report

**Reviewer**: Architecture Designer
**Date**: 2025-12-06
**Document Under Review**: `draft-v0.1-skills-assessment.md`
**Status**: CONDITIONAL

---

## Review Summary

The Skills Assessment Report proposes integrating Claude Code Skills into the AIWG framework. After reviewing the current AIWG architecture (CLAUDE.md, agent definitions, command patterns, and addon structure), I find the proposal architecturally sound with several areas requiring clarification or adjustment before implementation.

**Overall Verdict**: CONDITIONAL APPROVAL

The proposal correctly identifies Skills as a complementary capability to existing Agents and Commands, not a replacement. However, the proposed directory structure and integration patterns require refinement to align with AIWG's established conventions.

---

## 1. Architecture Alignment Assessment

### 1.1 Current AIWG Architecture Overview

The AIWG framework currently operates on a **tripartite extensibility model**:

| Component | Location | Invocation | Context | Purpose |
|-----------|----------|------------|---------|---------|
| **Commands** | `.claude/commands/*.md` | User-explicit (`/command`) | Main | Quick workflows, user-initiated tasks |
| **Agents** | `.claude/agents/*.md` | Delegated via Task tool | Isolated | Complex multi-step work, parallel execution |
| **Addons** | `agentic/code/addons/*/` | CLI deployment | N/A | Package agents + commands for distribution |

The proposal adds a fourth component:

| Component | Location | Invocation | Context | Purpose |
|-----------|----------|------------|---------|---------|
| **Skills** | `.claude/skills/*/SKILL.md` | Model-automatic | Main | Domain expertise, auto-applied knowledge |

### 1.2 Alignment Analysis

**ALIGNED**:
- Skills fill a genuine architectural gap: domain knowledge that should apply automatically without explicit user invocation
- Skills complement rather than replace existing components (correct assessment)
- Progressive disclosure model (metadata in system prompt, content on-demand) aligns with AIWG's context optimization philosophy
- Skills as "teaching expertise" matches AIWG's purpose of improving AI-generated content quality

**CONCERNS**:

1. **Component Boundary Clarity**: The proposal states "Skills prepare Claude to solve a problem, rather than solving it directly." This is accurate but the boundaries between Skills and Commands need explicit documentation.

   - **Risk**: Users may create Skills that should be Commands (user-initiated workflows packaged as auto-applied knowledge)
   - **Mitigation**: Add clear decision criteria in skill creation documentation

2. **Agent-Skill Interaction Pattern Incomplete**: The proposal correctly notes agents can invoke skills, but lacks specificity on:
   - How agents discover available skills
   - How skill context is passed to agent isolated contexts
   - Whether skill instructions persist across agent handoffs

3. **Addon Structure for Skills**: Proposed `agentic/code/addons/aiwg-skills/` follows addon pattern but introduces a new `skills/` entry point not present in current addon schema (see `aiwg-utils/manifest.json`).

### 1.3 Architectural Conflicts

**No Major Conflicts Identified**

The Skills proposal is additive and does not conflict with existing components. However, two areas warrant attention:

1. **Token Budget Competition**: Skills share main context with Commands. High-value skills (e.g., `writing-quality` referencing `banned-patterns.md`) could significantly consume context window when combined with complex commands.

   - **Current `writing-validator` agent**: Uses isolated context (no competition)
   - **Proposed `writing-quality` skill**: Uses main context (competes with user prompt)

2. **Deployment Path Complexity**: Adding skills to the deployment matrix increases permutations:
   - Current: `aiwg -deploy-agents [--mode general|sdlc|both] [--provider claude|openai|factory]`
   - Proposed: Add `--with-skills` flag
   - **Complexity**: 3 modes x 3 providers x 2 skill options = 18 deployment variants

---

## 2. Integration Patterns

### 2.1 How Skills Should Interact with Existing Agents

**Proposed Pattern: Skill-Informed Agent Execution**

```
User Request → Orchestrator (Claude Code)
     ↓
     ├── Model detects skill relevance → Loads skill context
     ↓
Orchestrator spawns Agent via Task tool
     ↓
Agent receives: Prompt + System instructions (includes skill knowledge if relevant)
     ↓
Agent executes with skill-enhanced capability
```

**Key Insight**: Skills enhance the orchestrator's understanding, which then informs agent prompts. Agents themselves do not "load" skills directly because they operate in isolated contexts.

**Recommended Integration Pattern**:

```text
Skill Knowledge Flow:
┌──────────────────────────────────────────────────────────────┐
│ Main Context (Orchestrator)                                  │
│  ├── SKILL.md content (if triggered by task context)        │
│  ├── Orchestrator uses skill knowledge to craft prompts     │
│  └── Orchestrator delegates to Agent with enhanced prompt   │
├──────────────────────────────────────────────────────────────┤
│ Isolated Context (Agent)                                     │
│  ├── Receives enriched prompt (contains skill-derived info) │
│  ├── Does NOT directly access skill files                   │
│  └── Executes with implicitly transferred knowledge         │
└──────────────────────────────────────────────────────────────┘
```

### 2.2 Missing Integration Points

The proposal should address:

1. **Skill-to-Template Mapping**: AIWG templates (`templates/analysis-design/*.md`) could be skill-linked for auto-application during artifact generation.

   Example: When generating a Software Architecture Document, the `sdlc-conventions` skill automatically applies, ensuring consistent formatting without explicit `/flow-` command invocation.

2. **Skill Composition Rules**: Multiple skills may apply simultaneously. Need explicit precedence/merge rules:
   - What if `writing-quality` and `code-standards` both trigger?
   - Are they merged, sequenced, or does one take precedence?

3. **Skill Versioning in Multi-Agent Workflows**: During `/flow-inception-to-elaboration` (parallel multi-agent review), different agents may need different skill contexts. Current proposal does not address cross-agent skill consistency.

### 2.3 Proposed Specific Interaction Patterns

**Pattern 1: Skill as Pre-Flight Check**

```markdown
## When to Use
Before generating any user-facing content, check if `writing-quality` skill is loaded.
If loaded, apply banned-pattern validation automatically.

## Integration Point
Orchestrator checks active skills before delegating to content-generating agents.
```

**Pattern 2: Skill as Template Enhancer**

```markdown
## When to Use
When agents read AIWG templates, skill instructions augment template guidance.

## Integration Point
Add `skill-hint` metadata to templates:
```yaml
---
template-name: software-architecture-doc
skill-hint: sdlc-conventions
---
```

**Pattern 3: Skill as Quality Gate Supplement**

```markdown
## When to Use
During `/flow-gate-check`, skills provide additional validation criteria.

## Integration Point
Quality gate commands reference skill validation rules.
```

---

## 3. Directory Structure Review

### 3.1 Proposed Structure

```
agentic/code/addons/aiwg-skills/
├── manifest.json
├── README.md
├── skills/
│   ├── writing-quality/
│   │   ├── SKILL.md
│   │   ├── references/
│   │   │   ├── banned-patterns.md
│   │   │   └── sophistication-guide.md
│   │   └── scripts/
│   │       └── validate-patterns.py
│   ├── sdlc-conventions/
│   ├── brand-voice/
│   └── code-standards/
```

### 3.2 Structure Assessment

**APPROVED with modifications**:

1. **Addon Pattern Alignment**: Follows `aiwg-utils` pattern (manifest.json, README.md, subdirectories for artifacts)

2. **Skill Subdirectory Naming**: Uses kebab-case, consistent with AIWG conventions

3. **Reference Files**: Proposal duplicates core documents (`banned-patterns.md`, `sophistication-guide.md`) into skill references.

   **CONCERN**: Duplication creates maintenance burden and drift risk.

   **RECOMMENDATION**: Use symlinks or reference paths to source-of-truth files:
   ```
   references/
   └── banned-patterns.md → ../../../../validation/banned-patterns.md (symlink)
   ```
   Or document canonical location in SKILL.md:
   ```markdown
   ## Resources
   - banned-patterns: See `validation/banned-patterns.md` (canonical)
   ```

4. **Scripts Directory**: Including Python validation scripts is appropriate but needs runtime dependency documentation.

### 3.3 Recommended Structure Improvements

```
agentic/code/addons/aiwg-skills/
├── manifest.json                    # Addon metadata (must add "skills" entry)
├── README.md                        # Installation and usage
├── config/
│   └── skill-defaults.json          # Default skill configurations
├── skills/
│   ├── writing-quality/
│   │   ├── SKILL.md                 # Core skill definition
│   │   ├── references/              # Skill-specific supporting docs
│   │   │   └── quick-reference.md   # Condensed version for context efficiency
│   │   └── scripts/
│   │       ├── validate-patterns.py # Validation script
│   │       └── requirements.txt     # Python dependencies
│   │
│   ├── sdlc-conventions/
│   │   ├── SKILL.md
│   │   ├── references/
│   │   │   └── artifact-standards.md
│   │   └── assets/
│   │       └── templates/           # Quick-reference templates (copies, not symlinks)
│   │
│   ├── brand-voice/
│   │   └── SKILL.md                 # Minimal skill, references external brand guide
│   │
│   └── code-standards/
│       ├── SKILL.md
│       └── references/
│           ├── typescript-style.md
│           └── python-style.md
│
└── docs/
    ├── skill-creation-guide.md      # How to create new skills
    ├── skill-command-boundary.md    # When to use skill vs command
    └── skill-agent-interaction.md   # Integration patterns
```

**Key Changes**:
1. Added `config/` for skill configuration defaults
2. Added `docs/` for skill-specific documentation
3. Added `requirements.txt` for Python script dependencies
4. Added explicit documentation for skill vs command decision boundary

---

## 4. Technical Risks

### 4.1 Risk Catalog

| ID | Risk | Likelihood | Impact | Mitigation |
|----|------|------------|--------|------------|
| R1 | Context window exhaustion when multiple skills load | Medium | High | Implement skill budgeting; prioritize skill loading by relevance score |
| R2 | Skill-command confusion (users create workflows as skills) | High | Medium | Add clear decision criteria; code review for skills |
| R3 | Reference file drift (duplicated content diverges) | Medium | Medium | Use references to canonical sources, not copies |
| R4 | Python script runtime dependency issues | Low | Medium | Document Python version, dependencies in manifest |
| R5 | Skill versioning conflicts in enterprise deployments | Low | High | Implement version pinning in manifest; workspace-wide skill registry |
| R6 | Skill discovery latency in large skill sets | Low | Low | Optimize skill metadata indexing; cache skill manifests |

### 4.2 Risk Deep Dive: Context Window Exhaustion (R1)

**Scenario**: User's project has multiple skills installed:
- `writing-quality` (~3,000 tokens when loaded)
- `sdlc-conventions` (~2,000 tokens)
- `code-standards` (~1,500 tokens)
- `brand-voice` (~1,000 tokens)

If all skills trigger simultaneously (e.g., user asks "review this architecture document for our brand"), total skill context = ~7,500 tokens before any user content or agent prompts.

**Mitigation Strategy**:

1. **Skill Priority Tiers**: Define tier-1 (always load), tier-2 (load if relevant), tier-3 (load on explicit request)
   - Tier-1: `writing-quality` (core AIWG purpose)
   - Tier-2: `sdlc-conventions`, `code-standards` (context-dependent)
   - Tier-3: `brand-voice` (project-specific, explicit opt-in)

2. **Skill Token Budget**: Add `max-tokens` to skill metadata
   ```yaml
   ---
   name: writing-quality
   description: ...
   max-tokens: 3000
   priority-tier: 1
   ---
   ```

3. **Condensed Mode**: Provide `quick-reference.md` versions of skill content for context-constrained scenarios

### 4.3 Risk Deep Dive: Skill-Command Confusion (R2)

**Scenario**: User creates a "deployment-checklist" skill that includes step-by-step deployment instructions. This should be a command (`/deployment-checklist`) not a skill.

**Decision Criteria Documentation** (to be added):

| Use Skill When... | Use Command When... |
|-------------------|---------------------|
| Knowledge should apply automatically based on context | User explicitly requests action |
| Content is domain expertise (how to write well, code style rules) | Content is a workflow (step-by-step process) |
| Guidance is passive (influences output quality) | Guidance is active (generates specific artifacts) |
| Applicable across many different tasks | Applicable to specific use case |

**Examples**:
- Writing style guidelines → SKILL (auto-apply to all content)
- Generate deployment plan → COMMAND (explicit artifact)
- Code review best practices → SKILL (influences all reviews)
- Run security audit → COMMAND (explicit workflow)

---

## 5. Recommendations

### 5.1 Prioritized Architecture Changes

| Priority | Recommendation | Effort | Impact |
|----------|---------------|--------|--------|
| P0 | Add `skills` entry to addon manifest schema | Low | High |
| P0 | Document skill-vs-command decision criteria | Low | High |
| P1 | Implement skill priority tiers for context management | Medium | High |
| P1 | Create skill-agent interaction documentation | Medium | Medium |
| P1 | Update CLI to support `--with-skills` deployment flag | Medium | Medium |
| P2 | Add skill token budget metadata field | Low | Medium |
| P2 | Create condensed reference versions for context efficiency | Medium | Medium |
| P3 | Implement skill composition/precedence rules | High | Low |
| P3 | Add skill health monitoring to `aiwg -status` | Medium | Low |

### 5.2 Manifest Schema Update

Current `aiwg-utils/manifest.json`:
```json
{
  "entry": {
    "agents": "agents/",
    "commands": "commands/"
  }
}
```

Required for `aiwg-skills/manifest.json`:
```json
{
  "entry": {
    "skills": "skills/"
  },
  "skills": [
    "writing-quality",
    "sdlc-conventions",
    "brand-voice",
    "code-standards"
  ],
  "skillConfig": {
    "writing-quality": {
      "priority-tier": 1,
      "max-tokens": 3000
    },
    "sdlc-conventions": {
      "priority-tier": 2,
      "max-tokens": 2000
    }
  }
}
```

### 5.3 CLI Update Requirements

```bash
# Current
aiwg -deploy-agents --mode sdlc

# Proposed
aiwg -deploy-agents --mode sdlc --with-skills
aiwg -deploy-skills                              # Skills-only deployment
aiwg -deploy-skills --tier 1                     # Deploy only tier-1 skills
aiwg -list-skills                                # Show available skills
aiwg -skill-status                               # Show loaded/active skills
```

### 5.4 Documentation Requirements

1. **Skill Creation Guide**: How to author AIWG-compatible skills
2. **Skill-Command Boundary**: Decision criteria for choosing skill vs command
3. **Skill-Agent Integration**: How skills influence agent behavior
4. **Skill Best Practices**: Token optimization, reference structure, versioning

---

## 6. Conditions for Approval

This architecture review grants **CONDITIONAL APPROVAL** with the following conditions:

### Must Address (Blockers)

- [ ] Add `skills` entry to addon manifest schema
- [ ] Document explicit skill-vs-command decision criteria
- [ ] Address reference file duplication concern (symlinks or canonical references)

### Should Address (Strongly Recommended)

- [ ] Implement skill priority tiers for context management
- [ ] Create skill-agent interaction documentation
- [ ] Add `max-tokens` metadata to skill schema

### May Address (Nice to Have)

- [ ] Implement skill composition/precedence rules
- [ ] Add skill health monitoring to CLI

---

## 7. Appendix: Architecture Diagrams

### 7.1 Current AIWG Extensibility Model

```
┌─────────────────────────────────────────────────────────────┐
│                    AIWG Framework                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │  Commands   │    │   Agents    │    │   Addons    │     │
│  │  /flow-*    │    │  designer   │    │ aiwg-utils  │     │
│  │  /intake-*  │    │  reviewer   │    │             │     │
│  └──────┬──────┘    └──────┬──────┘    └──────┬──────┘     │
│         │                  │                  │             │
│         v                  v                  v             │
│  ┌────────────────────────────────────────────────────┐    │
│  │              Core Orchestrator (Claude)             │    │
│  │                                                     │    │
│  │  User Prompt → Command Resolution → Agent Dispatch  │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Proposed AIWG Extensibility Model with Skills

```
┌─────────────────────────────────────────────────────────────┐
│                    AIWG Framework                            │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  Commands   │  │   Agents    │  │   Skills    │  NEW    │
│  │  /flow-*    │  │  designer   │  │  writing-   │         │
│  │  /intake-*  │  │  reviewer   │  │  quality    │         │
│  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘         │
│         │                │                │                 │
│         v                │                v                 │
│  ┌────────────────────────────────────────────────────┐    │
│  │              Core Orchestrator (Claude)             │    │
│  │                                                     │    │
│  │  ┌──────────────────────────────────────────────┐  │    │
│  │  │ Skill Detection: Context triggers skill load  │  │    │
│  │  │ Skill Context: Enhances orchestrator prompts  │  │    │
│  │  └──────────────────────────────────────────────┘  │    │
│  │                         │                          │    │
│  │  User Prompt + Skills → Command → Enhanced Agent   │    │
│  └────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                      Addons                          │   │
│  │  aiwg-utils (commands, agents)                       │   │
│  │  aiwg-skills (skills)                       NEW      │   │
│  └─────────────────────────────────────────────────────┘   │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 7.3 Skill-Agent Knowledge Flow

```
┌──────────────────────────────────────────────────────────────┐
│ Main Context                                                  │
│                                                               │
│  1. User Request: "Review this architecture document"         │
│                         │                                     │
│  2. Skill Detection     v                                     │
│     ┌─────────────────────────────────────────────┐          │
│     │ Skills Relevant:                             │          │
│     │  - writing-quality (content review)          │          │
│     │  - sdlc-conventions (architecture doc)       │          │
│     └─────────────────────────────────────────────┘          │
│                         │                                     │
│  3. Skill Loading       v                                     │
│     ┌─────────────────────────────────────────────┐          │
│     │ Load SKILL.md content into context          │          │
│     │ (~3,000 tokens writing-quality)             │          │
│     │ (~2,000 tokens sdlc-conventions)            │          │
│     └─────────────────────────────────────────────┘          │
│                         │                                     │
│  4. Enhanced Prompt     v                                     │
│     ┌─────────────────────────────────────────────┐          │
│     │ Orchestrator crafts agent prompt with:       │          │
│     │  - User request context                      │          │
│     │  - Skill-derived guidelines                  │          │
│     │  - Specific validation rules                 │          │
│     └─────────────────────────────────────────────┘          │
│                         │                                     │
└─────────────────────────┼────────────────────────────────────┘
                          │
                          v
┌──────────────────────────────────────────────────────────────┐
│ Isolated Context (Agent: architecture-designer)               │
│                                                               │
│  Receives enriched prompt:                                    │
│  "Review architecture document. Apply these guidelines:       │
│   - Avoid banned patterns: 'plays a vital role', 'seamlessly' │
│   - Use specific metrics instead of vague claims              │
│   - Follow SDLC artifact formatting standards                 │
│   - Validate traceability to requirements..."                 │
│                                                               │
│  Agent executes without direct skill file access              │
│  Knowledge transferred via prompt enhancement                 │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## 8. Conclusion

The Skills Assessment Report demonstrates a solid understanding of Claude Code Skills and proposes a reasonable integration path for AIWG. The proposed `aiwg-skills` addon structure aligns with existing conventions, and the identification of high-value skill candidates (`writing-quality`, `sdlc-conventions`, `code-standards`, `brand-voice`) is appropriate.

Key architecture decisions required:
1. Extend addon manifest schema to support skills
2. Document skill-command boundary clearly
3. Implement context management via skill priority tiers
4. Address reference file duplication to prevent drift

With these conditions addressed, the Skills integration can proceed to implementation phase.

---

**Review Status**: CONDITIONAL
**Reviewer**: Architecture Designer
**Date**: 2025-12-06
**Next Steps**: Address blocking conditions, then proceed to implementation planning

---

*Pending reviews from: Security Architect, Requirements Analyst, Technical Writer*
