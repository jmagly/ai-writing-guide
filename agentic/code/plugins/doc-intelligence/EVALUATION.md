# Doc-Intelligence Addon Evaluation Plan

## Overview

This document defines the evaluation criteria, test scenarios, and quality gates for the doc-intelligence addon skills.

## Research Compliance Validation

Each skill must demonstrate compliance with:

- **REF-001**: Production-Grade Agentic Workflows
- **REF-002**: LLM Failure Modes in Agentic Scenarios

### Archetype Mitigation Checklist

| Skill | Archetype 1 | Archetype 2 | Archetype 3 | Archetype 4 |
|-------|-------------|-------------|-------------|-------------|
| doc-scraper | ☐ | ☐ | ☐ | ☐ |
| pdf-extractor | ☐ | ☐ | ☐ | ☐ |
| llms-txt-support | ☐ | ☐ | ☐ | ☐ |
| source-unifier | ☐ | ☐ | ☐ | ☐ |
| doc-splitter | ☐ | ☐ | ☐ | ☐ |

## Evaluation Scenarios

### 1. doc-scraper Evaluation

**Test Case DS-001: Basic Documentation Scraping**
```
Input: https://docs.example.com/
Expected: Structured JSON output with pages, summary
Grounding: Verify robots.txt checked
Recovery: Handle 429 rate limit gracefully
```

**Test Case DS-002: JavaScript-Heavy Site**
```
Input: SPA documentation site
Expected: Playwright fallback successful
Grounding: Browser option selected correctly
Recovery: Fallback from httpx to Playwright
```

**Test Case DS-003: Rate Limit Handling**
```
Input: Fast scraping attempt
Expected: Automatic backoff applied
Recovery: Exponential backoff, max 3 retries
```

### 2. pdf-extractor Evaluation

**Test Case PE-001: Standard PDF Extraction**
```
Input: Text-based PDF document
Expected: Markdown output with structure preserved
Grounding: PDF file existence verified
Recovery: Handle corrupted PDF gracefully
```

**Test Case PE-002: Image-Heavy PDF**
```
Input: PDF with diagrams and screenshots
Expected: OCR applied, images extracted
Grounding: OCR availability checked
Recovery: Fallback to text-only if OCR fails
```

**Test Case PE-003: Large PDF Processing**
```
Input: 500+ page PDF
Expected: Chunked processing with checkpoints
Grounding: Memory limits respected
Recovery: Resume from checkpoint on failure
```

### 3. llms-txt-support Evaluation

**Test Case LT-001: llms.txt Detection**
```
Input: Site URL with /llms.txt
Expected: Fast-path extraction used
Grounding: Check existence before scraping
Recovery: Fallback to doc-scraper if not found
```

**Test Case LT-002: llms-full.txt Handling**
```
Input: Site with full version
Expected: Comprehensive content extracted
Grounding: Prefer full version if available
Recovery: Use standard version as fallback
```

### 4. source-unifier Evaluation

**Test Case SU-001: Multi-Source Merge**
```
Input: docs/ + GitHub README + PDF
Expected: Unified output with deduplication
Grounding: All sources validated before merge
Recovery: Continue with partial sources on failure
```

**Test Case SU-002: Conflict Detection**
```
Input: Sources with contradictory information
Expected: Conflicts flagged for user review
Escalation: User decision required
Recovery: Mark conflicts, don't auto-resolve
```

### 5. doc-splitter Evaluation

**Test Case SP-001: Large Documentation Split**
```
Input: 15,000 page documentation set
Expected: Sub-skills created with router
Grounding: Size analysis before splitting
Recovery: Preserve partial splits on failure
```

**Test Case SP-002: Semantic Boundary Respect**
```
Input: Documentation with logical sections
Expected: Splits at semantic boundaries
Grounding: Section analysis performed
Recovery: Conservative splits if analysis fails
```

## Quality Gates

### Gate 1: Structure Validation

- [ ] SKILL.md follows template
- [ ] Required sections present (Purpose, Grounding, Escalation, Context, Recovery)
- [ ] Checkpoint support documented
- [ ] Workflow steps defined

### Gate 2: Research Compliance

- [ ] BP-4 Single Responsibility demonstrated
- [ ] BP-9 KISS principle applied
- [ ] All 4 archetypes addressed
- [ ] Uncertainty escalation clear

### Gate 3: Functional Testing

- [ ] Happy path works
- [ ] Error handling tested
- [ ] Recovery protocol verified
- [ ] Checkpoint creation confirmed

### Gate 4: Integration Testing

- [ ] Works with doc-analyst orchestrator
- [ ] Checkpoint handoff successful
- [ ] Cross-skill data flow validated
- [ ] Rollback capability confirmed

## Metrics

### Quality Score Calculation

```
Structure (25 points)
- SKILL.md present: 5
- Required sections: 10
- Workflow steps: 5
- Configuration options: 5

Content (35 points)
- Grounding checkpoint: 10
- Uncertainty escalation: 10
- Context scope table: 5
- Recovery protocol: 10

Examples (20 points)
- Bash examples: 10
- Configuration examples: 5
- Output examples: 5

Documentation (20 points)
- References: 5
- Troubleshooting: 5
- Checkpoint structure: 5
- Integration points: 5

Total: 100 points
PASS: ≥80 | WARN: 60-79 | FAIL: <60
```

## Test Execution

### Manual Testing Checklist

```bash
# 1. Environment Setup
skill-seekers version  # Verify tool available

# 2. Basic Functionality
skill-seekers scrape https://test-docs.example.com/ --output test_output/

# 3. PDF Extraction
skill-seekers extract test.pdf --output test_output/

# 4. Source Unification
skill-seekers unify test_output/*_data/ --output unified_output/

# 5. Large Doc Splitting
skill-seekers split large_docs/ --output split_output/
```

### Automated Testing (CI/CD)

```yaml
# .github/workflows/skill-evaluation.yml
name: Skill Evaluation
on: [push, pull_request]

jobs:
  evaluate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Structure Validation
        run: |
          for skill in doc-scraper pdf-extractor llms-txt-support source-unifier doc-splitter; do
            test -f "agentic/code/addons/doc-intelligence/skills/$skill/SKILL.md"
          done
      - name: Content Validation
        run: |
          for skill in doc-scraper pdf-extractor llms-txt-support source-unifier doc-splitter; do
            grep -q "Grounding Checkpoint" "agentic/code/addons/doc-intelligence/skills/$skill/SKILL.md"
            grep -q "Recovery Protocol" "agentic/code/addons/doc-intelligence/skills/$skill/SKILL.md"
          done
```

## Revision History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2025-01-15 | Initial evaluation plan |
