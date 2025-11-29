# Media/Marketing Kit (MMK) Framework - Plan Summary

**Document ID**: PLAN-MMK-SUMMARY
**Created**: 2025-01-28
**Status**: READY FOR APPROVAL

---

## Executive Summary

This document summarizes the comprehensive plan for the **Media/Marketing Kit (MMK) Framework** - a new AIWG framework module that applies the proven SDLC-Complete patterns to media kit creation, marketing deck assembly, and campaign material production.

The framework has been fully designed with:
- **37 specialized agents** across 8 categories
- **87+ templates** across 16 categories
- **20 commands/flows** for workflow orchestration
- **5-phase lifecycle** model (Strategy → Creation → Review → Publication → Analysis)
- **Complete artifact directory structure** (.aiwg/marketing/)

---

## Deliverables Created

### Core Planning Document
| File | Description | Lines |
|------|-------------|-------|
| `media-marketing-framework-plan.md` | Comprehensive framework plan | ~900 |

### Supporting Documents
| File | Description |
|------|-------------|
| `mmk-actors-and-templates.md` | Role-to-template mappings with RACI |
| `mmk-simple-language-translations.md` | 86+ natural language command translations |

### Sample Agents (5)
| Agent | Model | Purpose |
|-------|-------|---------|
| `campaign-strategist.md` | opus | Campaign architecture & measurement |
| `copywriter.md` | sonnet | Marketing copy & content creation |
| `brand-guardian.md` | sonnet | Brand compliance validation |
| `pr-specialist.md` | sonnet | Press releases & media relations |
| `marketing-analyst.md` | sonnet | Performance analysis & reporting |

### Sample Templates (7)
| Template | Category | Purpose |
|----------|----------|---------|
| `campaign-card.md` | operations | Campaign tracking card |
| `content-card.md` | operations | Content piece tracking card |
| `campaign-strategy-template.md` | strategy | Campaign planning document |
| `messaging-matrix-template.md` | strategy | Message-audience-channel matrix |
| `press-release-template.md` | pr-communications | Standard press release format |
| `media-kit-template.md` | pr-communications | Complete media kit structure |
| `creative-brief-template.md` | creative | Design/creative brief |

---

## Framework Architecture

### Directory Structure
```
agentic/code/frameworks/media-marketing-kit/
├── README.md
├── plan-act-mmk.md
├── actors-and-templates.md
├── prompt-templates.md
├── aiwg-marketing-structure.md
├── agents/                 (37 agents)
├── commands/               (20 commands)
├── templates/              (87+ templates)
│   ├── intake/
│   ├── strategy/
│   ├── brand/
│   ├── content/
│   ├── social/
│   ├── email/
│   ├── advertising/
│   ├── pr-communications/
│   ├── sales-enablement/
│   ├── product-marketing/
│   ├── events/
│   ├── analytics/
│   ├── creative/
│   ├── governance/
│   └── operations/
├── flows/
├── docs/
├── config/
├── metrics/
├── add-ons/
└── artifacts/
```

### Lifecycle Model
```
STRATEGY ──► CREATION ──► REVIEW ──► PUBLICATION ──► ANALYSIS
   │            │           │            │             │
   ▼            ▼           ▼            ▼             ▼
Strategy    Content     Brand &      Go-Live      Performance
Baseline    Complete   Legal OK      Ready         Review
  (SB)        (CC)       (BL)         (GL)          (PR)
```

### Agent Categories
| Category | Count | Model Distribution |
|----------|-------|-------------------|
| Strategy | 6 | opus (3), sonnet (3) |
| Content Creation | 8 | sonnet (8) |
| Creative/Design | 4 | opus (1), sonnet (3) |
| Communications | 5 | opus (2), sonnet (3) |
| Production | 4 | haiku (2), sonnet (2) |
| Analytics | 4 | sonnet (3), haiku (1) |
| Compliance | 3 | sonnet (2), haiku (1) |
| Orchestration | 3 | sonnet (3) |
| **Total** | **37** | |

---

## Key Patterns Applied

### From SDLC-Complete Framework
1. **Multi-agent orchestration**: Primary Author → Parallel Reviewers → Synthesizer → Archive
2. **Phase gate criteria**: Clear exit criteria for each phase
3. **Card-based tracking**: Atomic work units with standard metadata
4. **Natural language interface**: User intent → command translation
5. **Artifact directory structure**: Unified `.aiwg/marketing/` within shared `.aiwg/`
6. **Manifest system**: Machine-readable file indices
7. **Template standardization**: Consistent format, placeholders, agent notes

### Marketing-Specific Adaptations
1. **Brand compliance gates**: Brand guardian validation throughout
2. **Channel-specific guidance**: Platform-native content patterns
3. **Creative production workflow**: Brief → Design → Review → Asset
4. **Measurement integration**: Analytics woven into every phase
5. **Compliance checkpoints**: Legal, FTC, accessibility, industry-specific

---

## Implementation Estimate

| Phase | Duration | Key Deliverables |
|-------|----------|------------------|
| Foundation | Week 1-2 | Directory structure, README, phase docs |
| Core Templates | Week 2-3 | 40 essential templates |
| Agent Development | Week 3-4 | 37 agent definitions |
| Commands & Flows | Week 4-5 | 20 commands, flow documentation |
| Documentation | Week 5-6 | Orchestrator docs, guides |
| Testing | Week 6-7 | End-to-end validation |

**Total**: ~7 weeks to complete framework

---

## Research Completed

Comprehensive research was conducted across four domains with findings documented in `mmk-research/`:

| Research Area | Key Findings |
|--------------|--------------|
| **Media Kit Best Practices** | Video B-roll preferred (68%), mobile-first (60%+), < 3 click downloads |
| **Marketing Tools Analysis** | Market gap in mid-market analytics-first solutions |
| **Campaign Planning** | RACE framework recommended, 2-week agile sprints |
| **Brand Guidelines** | Living systems, design tokens, AI-era voice documentation |
| **Privacy-First Measurement** | First-party data, MMM, incrementality testing |

**Sources**: 50+ citations from Cision, Muck Rack, Smart Insights, Marketing Evolution, Frontify, and others.

---

## CLI/Installer Requirements

**Discrete Framework Installation** is required:

```bash
# SDLC-only project
aiwg -new --framework sdlc

# Marketing-only project
aiwg -new --framework marketing

# Combined project (product launch)
aiwg -new --framework all
```

**Mode Extension**: `--mode general|sdlc|marketing|all`

**Unified Output**: Both frameworks use `.aiwg/` with framework-specific subdirectories.

---

## Open Questions for Approval

1. **Brand Configuration**: Per-project brand voice configuration approach?
2. **Asset Management**: Include DAM (Digital Asset Management) patterns?
3. **Approval Workflows**: Complexity level for approval routing?
4. **Localization**: Priority for multi-language support?
5. **Analytics Integration**: Depth of external tool integration?
6. **Default Mode**: Should `aiwg -deploy-agents` default to `all` or `sdlc`?

---

## File Inventory

### Created Files (20+ total)
```
.aiwg/planning/
├── media-marketing-framework-plan.md       # Main plan document (~1000 lines)
├── mmk-actors-and-templates.md             # Role mappings
├── mmk-simple-language-translations.md     # 86+ natural language translations
├── MMK-FRAMEWORK-SUMMARY.md                # This summary
├── mmk-sample-agents/
│   ├── campaign-strategist.md
│   ├── copywriter.md
│   ├── brand-guardian.md
│   ├── pr-specialist.md
│   └── marketing-analyst.md
├── mmk-sample-templates/
│   ├── campaign-card.md
│   ├── content-card.md
│   ├── campaign-strategy-template.md
│   ├── messaging-matrix-template.md
│   ├── press-release-template.md
│   ├── media-kit-template.md
│   └── creative-brief-template.md
└── mmk-research/                           # Research documentation
    ├── RESEARCH-SYNTHESIS.md               # Consolidated findings
    ├── media-kit-best-practices.md         # Industry standards
    ├── media-kit-tools-analysis.md         # Platform analysis
    ├── marketing-campaign-best-practices.md # Campaign frameworks
    ├── brand-guidelines-best-practices.md  # Brand system research
    └── cli-installer-requirements.md       # Technical requirements
```

---

## Next Steps

Upon approval:

1. **Create framework directory**: `agentic/code/frameworks/media-marketing-kit/`
2. **Migrate sample artifacts**: Move samples to proper locations
3. **Complete remaining agents**: 32 additional agent definitions
4. **Complete remaining templates**: 80+ additional templates
5. **Develop commands**: 20 command definitions
6. **Write documentation**: Orchestrator architecture, integration guides
7. **Create add-ons**: Compliance extensions, platform integrations
8. **Build sample projects**: End-to-end examples

---

## Approval Request

This plan requests approval to proceed with full implementation of the Media/Marketing Kit Framework.

**Estimated effort**: ~7 weeks
**Deliverables**: Complete framework with 37 agents, 87+ templates, 20 commands

| Approver | Role | Decision | Date |
|----------|------|----------|------|
| | Product Owner | | |
| | Architecture Lead | | |
| | Content Lead | | |

---

## References

- SDLC-Complete Framework: `~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/`
- AIWG Core Writing Guide: `/home/manitcor/dev/ai-writing-guide/core/`
- Main Plan Document: `.aiwg/planning/media-marketing-framework-plan.md`
