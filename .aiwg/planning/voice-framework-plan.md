# Voice Framework Transition Plan

**Status**: DRAFT
**Date**: 2025-12-06

---

## Strategic Context

### Current State
- AIWG includes extensive "banned patterns" and "AI detection" guidance
- Focus on removing AI-isms (formulaic transitions, corporate buzzwords, etc.)
- Pattern detection scripts and validation rules

### Market Shift
Modern frontier models (Claude Opus 4.5, GPT-5, etc.) naturally produce more varied, authentic content. The "avoid sounding like AI" problem is largely solved at the model level.

### New Value Proposition
Shift from **pattern avoidance** to **voice crafting**:
- Define custom voice profiles (tone, vocabulary, sentence structure, domain expertise)
- Apply voices consistently across content types
- Generate new voices on-demand for specific contexts
- Voice inheritance and composition (base voice + modifications)

---

## Deprecation Scope

### Components to Deprecate

| Component | Path | Reason |
|-----------|------|--------|
| Banned patterns list | `validation/banned-patterns.md` | Modern models don't need this |
| Pattern scanner script | `skills/ai-pattern-detection/scripts/pattern_scanner.py` | Obsolete with model improvements |
| AI detection references | `skills/ai-pattern-detection/references/` | No longer primary value |
| Quick pattern reference | Various | Superseded by voice profiles |

### Components to Preserve/Evolve

| Component | Evolution |
|-----------|-----------|
| Voice profiles concept | Expand into full voice framework |
| Sophistication guide | Integrate into voice calibration |
| Context-specific writing | Becomes voice template system |
| Writing validator agent | Refocus on voice consistency, not pattern detection |

---

## New Voice Framework Architecture

### 1. Voice Profile Schema

```yaml
# .aiwg/voices/technical-authority.yaml
name: technical-authority
version: 1.0.0
description: Authoritative technical voice for documentation and guides

base: null  # or inherit from another voice

tone:
  formality: 0.7        # 0=casual, 1=formal
  confidence: 0.9       # 0=hedging, 1=assertive
  warmth: 0.3           # 0=clinical, 1=friendly

vocabulary:
  prefer:
    - domain-specific terminology
    - precise technical terms
    - concrete metrics
  avoid:
    - hedging phrases when facts are known
    - unnecessary qualifiers

structure:
  sentence_variety: high
  paragraph_length: medium
  use_lists: when-appropriate
  use_examples: frequently

domain:
  expertise_areas:
    - software engineering
    - system architecture
    - DevOps
  assumed_reader_level: practitioner

markers:
  - states opinions with reasoning
  - acknowledges tradeoffs explicitly
  - uses specific numbers over vague claims
  - references real constraints (time, budget, team)
```

### 2. Voice Operations

| Operation | Description | Example |
|-----------|-------------|---------|
| `voice:apply` | Apply voice to content | Transform draft using voice profile |
| `voice:create` | Generate new voice from examples | "Create voice from these 3 blog posts" |
| `voice:blend` | Combine multiple voices | 70% technical + 30% friendly |
| `voice:calibrate` | Adjust voice parameters | "Make this 20% more casual" |
| `voice:validate` | Check content matches voice | Consistency scoring |

### 3. Voice Skill Structure

```
agentic/code/addons/voice-framework/
├── manifest.json
├── skills/
│   ├── voice-apply/
│   │   ├── SKILL.md
│   │   └── scripts/
│   ├── voice-create/
│   │   ├── SKILL.md
│   │   └── scripts/
│   └── voice-validate/
│       ├── SKILL.md
│       └── scripts/
├── voices/
│   ├── templates/           # Built-in voice templates
│   │   ├── technical-authority.yaml
│   │   ├── friendly-explainer.yaml
│   │   ├── executive-brief.yaml
│   │   └── casual-conversational.yaml
│   └── examples/            # Example content for each voice
└── commands/
    ├── voice-apply.md
    ├── voice-create.md
    └── voice-list.md
```

### 4. Integration Points

**With SDLC Framework**:
- Technical documentation voice for architecture docs
- Executive voice for business cases
- Support voice for runbooks

**With Marketing Kit**:
- Brand voice profiles
- Campaign-specific voices
- Channel-appropriate voices (LinkedIn vs Twitter vs blog)

**With Intake**:
- Voice selection during project setup
- Voice inheritance from organization defaults

---

## Implementation Phases

### Phase 1: Foundation (P0)
- [ ] Define voice profile YAML schema
- [ ] Create 4 built-in voice templates
- [ ] Implement `voice-apply` skill
- [ ] Deprecation notices on old pattern files

### Phase 2: Creation Tools (P1)
- [ ] Implement `voice-create` skill (from examples)
- [ ] Implement `voice-blend` operation
- [ ] Add voice commands to CLI
- [ ] Integration with SDLC templates

### Phase 3: Validation & Polish (P2)
- [ ] Implement `voice-validate` skill
- [ ] Voice consistency scoring
- [ ] Organization voice libraries
- [ ] Voice inheritance system

### Phase 4: Cleanup (P3)
- [ ] Remove deprecated pattern files
- [ ] Update documentation
- [ ] Migration guide for existing users
- [ ] Archive old writing-quality addon

---

## Migration Path

### For Existing Users

1. **Immediate**: Deprecation warnings on old components
2. **Transition**: Both systems available, voice framework recommended
3. **Removal**: Old pattern system archived (kept for reference only)

### Backward Compatibility

- Old `ai-pattern-detection` skill marked deprecated
- Pattern scanner script remains but logs deprecation notice
- `writing-validator` agent refocused on voice consistency

---

## Open Questions

1. **Voice storage location**: Per-project `.aiwg/voices/` or centralized?
2. **Voice versioning**: How to handle voice evolution over time?
3. **Voice sharing**: Mechanism for sharing voices across projects/orgs?
4. **Voice fine-tuning**: How granular should calibration controls be?

---

## Success Metrics

| Metric | Target |
|--------|--------|
| Built-in voice templates | 4+ |
| Voice operations | 5 (apply, create, blend, calibrate, validate) |
| Integration with frameworks | SDLC + Marketing |
| User adoption | Voice commands used > pattern commands |

---

## Next Steps

1. Review and approve plan
2. Define voice profile schema in detail
3. Create built-in voice templates
4. Implement `voice-apply` skill as POC
