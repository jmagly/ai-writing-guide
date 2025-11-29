# MMK Framework Research Synthesis

**Date**: 2025-01-28
**Purpose**: Consolidate research findings to inform MMK Framework design

---

## Executive Summary

Research across four domains (media kits, marketing tools, campaign planning, brand guidelines) reveals significant opportunity for an agentic framework that combines:

1. **Creation simplicity** (like Canva)
2. **Professional structure** (like Prowly/Prezly)
3. **Analytics integration** (gap in current market)
4. **Governance automation** (like enterprise DAM)

The MMK Framework should leverage these insights to provide comprehensive, best-practice-driven templates and agent guidance.

---

## Key Research Documents

| Document | Focus Area | Key Findings |
|----------|------------|--------------|
| `media-kit-best-practices.md` | Media kit structure, distribution | Digital-first, self-service, video-centric |
| `media-kit-tools-analysis.md` | Platform features, market gaps | No mid-market analytics-first solution |
| `marketing-campaign-best-practices.md` | Planning frameworks, measurement | RACE framework, privacy-first attribution |
| `brand-guidelines-best-practices.md` | Brand systems, voice documentation | Living systems, design tokens, AI-era voice |
| `cli-installer-requirements.md` | Technical requirements | Discrete framework installation support |

---

## Critical Findings by Domain

### 1. Media Kit Best Practices

**Essential Components** (must-have):
- Company overview (boilerplate library)
- Executive bios with headshots
- Visual asset library (SVG, PNG, high-res)
- Press releases (chronological archive)
- Fact sheet / at-a-glance
- Media contact directory

**Modern Requirements**:
- Mobile-optimized (60%+ journalist access)
- Self-service downloads (< 3 clicks)
- Video B-roll (68% journalist preference)
- WCAG 2.1 AA accessibility compliance
- Embargo management capabilities

**Technical Standards**:
- Images: 2000px minimum, 300 DPI
- Video: 1080p minimum (4K preferred)
- Logos: SVG/EPS vector required
- Page load: < 2 seconds

### 2. Marketing Tools Analysis

**Market Gap Identified**:
> No platform effectively combines creation + analytics + distribution at mid-market price point ($50-200/month)

**Feature Matrix (Top Platforms)**:

| Platform | Creation | Analytics | Distribution | Governance | Price |
|----------|----------|-----------|--------------|------------|-------|
| Canva | ★★★★★ | ★★ | ★★ | ★★ | Low |
| Prezly | ★★★ | ★★★★ | ★★★★★ | ★★★ | Mid |
| Brandfolder | ★★ | ★★★ | ★★★ | ★★★★★ | High |

**MMK Opportunity**: Provide structured creation with built-in best practices, filling the methodology gap that tools alone can't address.

### 3. Campaign Planning Frameworks

**Recommended Framework: RACE**
- **Plan** → Strategy definition
- **Reach** → Awareness tactics
- **Act** → Engagement activities
- **Convert** → Conversion optimization
- **Engage** → Retention and advocacy

**Agile Marketing Integration**:
- 2-week sprint cadence (recommended)
- Sprint goal = single campaign objective
- Daily standups for execution alignment
- Retrospectives for continuous improvement

**Privacy-First Measurement (Critical 2024+)**:
- First-party data strategies essential
- Marketing Mix Modeling (MMM) for aggregate analysis
- Incrementality testing for channel validation
- AI/ML for probabilistic attribution

### 4. Brand Guidelines Best Practices

**Modern Brand System Components**:
1. Living/dynamic guidelines (not static PDFs)
2. Design tokens for automated sync
3. Voice dimensional framework (scales, not rules)
4. Channel-specific adaptations
5. Inclusive language requirements
6. AI-era considerations (brand voice for LLMs)

**Governance Models**:
- **Centralized**: Brand team controls all
- **Federated**: Regional/product variations allowed
- **Open Source**: Community-driven evolution

**Asset Organization**:
- Semantic naming: `[type]-[description]-[variation]-[size].[ext]`
- Semantic versioning: MAJOR.MINOR.PATCH
- 4-tier approval workflow

---

## Framework Design Implications

### Template Additions (Based on Research)

**Media Kit Templates** (new/enhanced):
- [ ] Video B-roll brief template
- [ ] Executive headshot specification
- [ ] Embargo management checklist
- [ ] Media contact directory template
- [ ] Self-service download portal spec

**Campaign Templates** (new/enhanced):
- [ ] RACE framework planner
- [ ] Sprint planning template (marketing-specific)
- [ ] Privacy-first measurement plan
- [ ] First-party data strategy
- [ ] Incrementality test design

**Brand Templates** (new/enhanced):
- [ ] Voice dimensional framework
- [ ] Channel voice adaptation matrix
- [ ] Design token specification
- [ ] Inclusive language guide
- [ ] AI brand voice training brief

### Agent Guidance Updates

**PR Specialist**:
- Add video B-roll best practices
- Include embargo workflow
- Reference AP Style requirements
- Add journalist preference data

**Campaign Strategist**:
- Integrate RACE framework
- Add privacy-first measurement guidance
- Include agile sprint planning
- Reference OKR methodology

**Brand Guardian**:
- Add design token validation
- Include voice dimensional checks
- Add inclusive language review
- Reference WCAG compliance

**Marketing Analyst**:
- Add MMM methodology
- Include incrementality testing
- Reference attribution model selection
- Add privacy-compliant tracking

### Quality Gates (Research-Informed)

**Media Kit Gate Criteria**:
- [ ] All assets ≥ 2000px / 300 DPI
- [ ] SVG/EPS vectors for all logos
- [ ] Video in 1080p minimum
- [ ] WCAG 2.1 AA compliance verified
- [ ] Mobile responsiveness tested
- [ ] Download in ≤ 3 clicks verified

**Campaign Launch Gate Criteria**:
- [ ] RACE framework complete
- [ ] Privacy-compliant tracking configured
- [ ] First-party data strategy defined
- [ ] Attribution model selected
- [ ] UTM parameters standardized
- [ ] Rollback plan documented

**Brand Compliance Gate Criteria**:
- [ ] Voice dimensional alignment verified
- [ ] Design tokens validated
- [ ] Inclusive language checked
- [ ] Channel adaptations reviewed
- [ ] Accessibility compliance confirmed

---

## CLI/Installer Integration

**Key Requirement**: Discrete framework installation

```bash
# Install SDLC only (software projects)
aiwg -new --framework sdlc

# Install Marketing only (marketing projects)
aiwg -new --framework marketing

# Install both (product launch with marketing)
aiwg -new --framework all
```

**Output Structure** (unified .aiwg/):
```
.aiwg/
├── intake/           # Shared intake forms
├── marketing/        # MMK-specific artifacts
├── requirements/     # SDLC-specific artifacts
└── ...               # Other shared directories
```

See `cli-installer-requirements.md` for full technical specification.

---

## Competitive Differentiation

### What MMK Provides That Tools Don't

| Gap | How MMK Fills It |
|-----|------------------|
| Methodology | RACE framework, agile marketing, phase gates |
| Best practices | Research-backed templates with guidance |
| Governance | Multi-agent review workflows |
| Quality assurance | Automated compliance checking |
| Integration | SDLC alignment for product launches |
| Measurement | Privacy-first analytics templates |

### Unique Value Proposition

> "The MMK Framework brings software engineering discipline to marketing content production, with research-backed templates, multi-agent review workflows, and seamless integration with SDLC processes."

---

## Implementation Priority

### High Priority (Phase 1)
1. Media kit templates (essential components)
2. Campaign strategy templates (RACE framework)
3. Brand guidelines templates (modern structure)
4. Core agents (strategist, copywriter, reviewer)
5. CLI discrete installation support

### Medium Priority (Phase 2)
1. Advanced measurement templates
2. Agile marketing integration
3. Additional content agents
4. Platform integration add-ons
5. Sample project artifacts

### Lower Priority (Phase 3)
1. Industry-specific compliance add-ons
2. Localization templates
3. Advanced analytics agents
4. Tool integration guides
5. Training/onboarding materials

---

## Sources Summary

### Media Kit Research
- Cision State of Media Report
- Muck Rack Journalist Survey
- Prezly Newsroom Guide
- PR Newswire Best Practices
- WCAG 2.1 Accessibility Guidelines

### Tools Analysis
- Platform documentation (Canva, Prezly, Prowly, Brandfolder, Bynder)
- G2/Capterra reviews
- Industry analyst reports

### Campaign Planning
- Smart Insights RACE Framework
- Agile Sherpas Scrum for Marketing
- Marketing Evolution Attribution Research
- Google Privacy Sandbox Documentation

### Brand Guidelines
- Frontify Brand Guidelines Report
- Bynder State of Branding
- Lucidpress Brand Consistency Report
- Nielsen Norman Group Voice & Tone Research

---

## Next Steps

1. **Update main plan** with research-informed additions
2. **Prioritize template development** based on research findings
3. **Enhance agent prompts** with best practice guidance
4. **Implement CLI changes** for discrete installation
5. **Create sample project** demonstrating full workflow

---

*Research synthesis complete - ready for framework implementation*
