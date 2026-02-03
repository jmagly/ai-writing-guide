# Research-Complete Framework Templates

This directory contains 8 artifact templates for the research-complete framework, following progressive disclosure patterns and AIWG best practices.

## Templates Overview

| Template | Format | Use Case | Agent |
|----------|--------|----------|-------|
| **literature-note.md** | Markdown | Zettelkasten-style note capturing paper insights | Discovery Agent |
| **summary.md** | Markdown | Multi-level summary (1-sentence, 1-paragraph, 1-page) | Discovery Agent |
| **extraction.yaml** | YAML | Structured extraction of claims, methods, findings | Discovery Agent |
| **gap-report.md** | Markdown | Research gap analysis and prioritization | Discovery Agent |
| **citation-network.md** | Markdown | Citation network visualization and analysis | Discovery Agent |
| **quality-assessment.md** | Markdown | GRADE quality assessment | Quality Agent |
| **provenance-record.yaml** | YAML | W3C PROV-compliant provenance tracking | Provenance Agent |
| **acquisition-report.md** | Markdown | Paper acquisition with FAIR compliance scores | Acquisition Agent |

## Template Categories

### Note-Taking & Synthesis
- `literature-note.md` - Deep reading notes with connections
- `summary.md` - Tiered summaries for different audiences

### Analysis & Evaluation
- `extraction.yaml` - Machine-readable structured data
- `gap-report.md` - Identify unstudied research areas
- `citation-network.md` - Map intellectual lineage
- `quality-assessment.md` - Evaluate evidence quality with GRADE

### Metadata & Compliance
- `provenance-record.yaml` - Track artifact derivation chains
- `acquisition-report.md` - Document paper acquisition and verification

## Usage Workflow

The recommended workflow for processing a new research paper:

```
1. acquisition-report.md     → Acquire paper, verify identity, check license
2. provenance-record.yaml    → Create W3C PROV record
3. literature-note.md        → Deep reading, capture insights
4. summary.md                → Generate tiered summaries
5. extraction.yaml           → Extract structured data
6. quality-assessment.md     → Assess evidence quality (GRADE)
7. citation-network.md       → Analyze relationships (when corpus sufficient)
8. gap-report.md             → Identify gaps (periodic synthesis)
```

## Key Features

### Progressive Disclosure

All markdown templates follow progressive disclosure pattern:

- **Phase 1: Core (ESSENTIAL)** - Always visible, complete immediately
- **Phase 2: Details (EXPAND WHEN READY)** - Expand during elaboration
- **Phase 3: Advanced (ADVANCED)** - Technical details during construction

### Reasoning Sections

All templates include mandatory reasoning sections per `@.claude/rules/reasoning-sections.md`:

1. **Problem Analysis** - What are we solving?
2. **Approach Planning** - How will we approach this?
3. **Trade-off Evaluation** - What are the options?
4. **Decision Rationale** - Why this approach?
5. **Impact Assessment** - What are the consequences?

### Worked Examples

Every template includes extensive inline examples showing:
- **Simple scenarios** - Baseline understanding
- **Moderate scenarios** - Realistic complexity
- **Complex scenarios** - Edge cases and advanced usage
- **Anti-patterns** - What NOT to do (with explanations)

### Schema Compliance

YAML templates conform to schemas:
- `extraction.yaml` → `@agentic/code/frameworks/research-complete/schemas/extraction-schema.yaml`
- `provenance-record.yaml` → `@agentic/code/frameworks/sdlc-complete/schemas/provenance/prov-record.yaml`

## Template Selection Guide

### For Literature Review
Start with: `literature-note.md`
- Deep reading and insight capture
- Connect to AIWG implementation needs
- Track connections to other papers

### For Quick Reference
Start with: `summary.md`
- 1-sentence summary for executives
- 1-paragraph for practitioners
- 1-page for researchers

### For Machine Processing
Start with: `extraction.yaml`
- Structured claims with evidence
- Methods and algorithms
- Findings with applicability notes

### For Research Planning
Start with: `gap-report.md`
- Identify unstudied areas
- Prioritize research needs
- Plan pilot studies or external research

### For Intellectual Lineage
Start with: `citation-network.md`
- Map paper relationships
- Identify influential work
- Find citation paths to AIWG implementations

### For Evidence Quality
Start with: `quality-assessment.md`
- GRADE quality rating (HIGH/MODERATE/LOW/VERY LOW)
- Systematic evaluation
- Applicability to AIWG assessment

### For Paper Acquisition
Start with: `acquisition-report.md`
- Document source and verification
- Compute fixity checksums
- Assess FAIR compliance

### For Provenance Tracking
Start with: `provenance-record.yaml`
- W3C PROV-compliant records
- Track derivation chains
- Attribution and audit trails

## Integration with Research Services

These templates are used by research-complete framework services:

- **Discovery Service** - Uses literature-note, summary, extraction templates
- **Acquisition Service** - Uses acquisition-report, provenance-record templates
- **Archival Service** - Uses provenance-record, quality-assessment templates
- **Citation Service** - Uses citation-network, extraction templates
- **Documentation Service** - Uses summary, gap-report templates
- **Provenance Service** - Uses provenance-record template
- **Quality Service** - Uses quality-assessment template

## Example Usage

### Create Literature Note

```bash
# Using template directly
cp templates/literature-note.md .aiwg/research/findings/REF-018-react.md

# Or via agent
aiwg research note REF-018 --template literature-note
```

### Generate Multi-Level Summary

```bash
# Using template
cp templates/summary.md .aiwg/research/summaries/REF-018-summary.md

# Or via agent
aiwg research summary REF-018
```

### Extract Structured Data

```bash
# Using template
cp templates/extraction.yaml .aiwg/research/extractions/REF-018-extraction.yaml

# Or via agent
aiwg research extract REF-018
```

## Quality Checklist

Before completing any artifact from these templates:

- [ ] Reasoning section completed FIRST (before content)
- [ ] All ESSENTIAL fields populated
- [ ] Inline examples provided (not placeholders)
- [ ] Anti-patterns documented where applicable
- [ ] References include @-mentions to related artifacts
- [ ] Progressive disclosure sections properly tagged
- [ ] Schema validation passes (for YAML templates)
- [ ] Provenance record created (if generating new artifact)

## References

- **Framework README**: `@agentic/code/frameworks/research-complete/README.md`
- **Agents**: `@agentic/code/frameworks/research-complete/agents/`
- **Schemas**: `@agentic/code/frameworks/sdlc-complete/schemas/research/`

### Rules
- `@.claude/rules/progressive-disclosure.md` - Template structure
- `@.claude/rules/reasoning-sections.md` - Reasoning requirements
- `@.claude/rules/provenance-tracking.md` - Provenance tracking
- `@.claude/rules/research-metadata.md` - Metadata requirements
- `@.claude/rules/citation-policy.md` - Citation standards

## Manifest

Full template catalog available in `manifest.json`.

---

**Version:** 1.0.0
**Last Updated:** 2026-02-03
**Framework:** research-complete
