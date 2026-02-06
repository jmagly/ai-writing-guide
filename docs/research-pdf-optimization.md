# Research PDF Optimization Guide

**Version**: 1.0.0
**Last Updated**: 2026-02-06
**Issue**: #290

## Overview

Claude Code v2.1.30 introduced PDF page range support in the Read tool, enabling dramatic reductions in context consumption for research workflows. Large PDFs (>10 pages) now return lightweight references when @-mentioned, with full content available via targeted page range reads.

This guide documents optimization patterns for AIWG research tools to leverage this capability.

## PDF Page Range Support

### Read Tool Enhancement

The Read tool now accepts a `pages` parameter for targeted PDF reading:

```markdown
# Read just the abstract
Read file_path=".aiwg/research/sources/REF-015.pdf" pages="1"

# Read methodology section
Read file_path=".aiwg/research/sources/REF-015.pdf" pages="4-8"

# Verify a specific citation
Read file_path=".aiwg/research/sources/REF-015.pdf" pages="12"

# Read multiple non-contiguous pages
Read file_path=".aiwg/research/sources/REF-015.pdf" pages="1,5,10"

# Read last few pages
Read file_path=".aiwg/research/sources/REF-015.pdf" pages="-2"  # Last 2 pages
```

### Page Range Format

| Format | Description | Example |
|--------|-------------|---------|
| `"N"` | Single page | `"5"` |
| `"N-M"` | Contiguous range | `"3-7"` |
| `"N,M,O"` | Non-contiguous pages | `"1,5,10"` |
| `"-N"` | Last N pages | `"-3"` (last 3 pages) |

### Lightweight References

When large PDFs (>10 pages) are @-mentioned:

**Before (full context)**:
```
@.aiwg/research/sources/REF-015.pdf → Full 15-page paper loaded (15,000+ tokens)
```

**After (lightweight reference)**:
```
@.aiwg/research/sources/REF-015.pdf → Metadata + page count only (500 tokens)
"To read full content, use: Read file_path='...' pages='1-15'"
```

This enables mentioning many PDFs in context for reference without exhausting token budget.

## Standard Academic Paper Structure

### Typical Page Mapping

Academic papers follow predictable structures. Use these ranges as starting points:

| Section | Typical Pages | Purpose |
|---------|---------------|---------|
| **Abstract** | 1 | High-level summary, key findings |
| **Introduction** | 1-3 | Problem statement, motivation |
| **Related Work** | 3-5 | Literature review, positioning |
| **Methodology** | 4-8 | Approach, experimental design |
| **Results** | 7-10 | Findings, data, analysis |
| **Discussion** | 9-12 | Interpretation, implications |
| **Conclusion** | -2 to -1 | Summary, future work |
| **References** | -4 to -1 | Bibliography |

### Variations by Venue

**Conference Papers (6-8 pages)**:
- Abstract: page 1
- Introduction + Related Work: pages 1-3
- Methodology: pages 3-5
- Results + Discussion: pages 5-7
- Conclusion: page 7-8

**Journal Articles (10-15 pages)**:
- Abstract: page 1
- Introduction: pages 1-2
- Related Work: pages 2-4
- Methodology: pages 4-7
- Results: pages 7-10
- Discussion: pages 10-12
- Conclusion: pages 12-13
- References: pages 13-15

**Technical Reports (variable)**:
- Executive Summary: pages 1-2
- Main Content: varies widely
- Appendices: often extensive

## AIWG Research Tool Optimization

### /citation-check

**Purpose**: Verify citations reference correct page numbers and content.

**Optimization Pattern**:
```yaml
before:
  - Read full PDF (all pages)
  - Extract all potential citations
  - Token cost: 15,000+ per paper

after:
  - Read only cited pages from frontmatter
  - Example: pages="12,15,23" for three citations
  - Token cost: ~500-1000 per paper (90%+ reduction)
```

**Implementation**:
```markdown
# Extract cited pages from frontmatter
cited_pages: [12, 15, 23]

# Read only those pages
for page in cited_pages:
  Read file_path=".aiwg/research/sources/REF-XXX.pdf" pages="{page}"
```

### /verify-citations

**Purpose**: Validate citation accuracy and completeness.

**Optimization Pattern**:
```yaml
workflow:
  1. Parse frontmatter for citation metadata
  2. Extract page numbers from key_findings
  3. Read only specified pages
  4. Verify quoted text matches source
  5. Check page numbers are accurate

example:
  finding: "System achieves 34% improvement (p. 7)"
  pages_to_read: "7"
  verification: Read file_path="..." pages="7"
```

### /quality-assess (GRADE)

**Purpose**: Assess research quality for GRADE baseline.

**Optimization Pattern**:
```yaml
quality_assessment_pages:
  study_design: pages="1,3-5"     # Abstract + methodology
  sample_size: pages="4-6"         # Usually in methods
  bias_assessment: pages="4-8"     # Methods + results
  consistency: pages="7-10"        # Results section
  directness: pages="1,10-12"      # Abstract + discussion

token_savings: ~80% vs full-paper read
```

**Implementation**:
```markdown
# Phase 1: Quick scan (abstract only)
Read file_path="REF-XXX.pdf" pages="1"
→ Determine study type, assess baseline quality

# Phase 2: Methodology deep-dive (if needed)
Read file_path="REF-XXX.pdf" pages="4-8"
→ Assess bias, sample size, validity

# Phase 3: Results verification (if needed)
Read file_path="REF-XXX.pdf" pages="7-10"
→ Check consistency, precision
```

### /corpus-health

**Purpose**: Scan entire corpus for metadata quality and completeness.

**Optimization Pattern**:
```yaml
before:
  - Load all papers fully
  - Token cost: 500,000+ for 50 papers
  - Context overflow common

after:
  - Read abstracts only (page 1)
  - Token cost: ~25,000 for 50 papers (95% reduction)
  - Detect issues: missing metadata, poor quality, outdated
```

**Implementation**:
```markdown
for each paper in corpus:
  Read file_path="paper.pdf" pages="1"
  extract:
    - title
    - authors
    - publication_year
    - key_findings_summary
  compare_with_frontmatter()
```

### /grade-report

**Purpose**: Generate comprehensive GRADE evidence profiles.

**Optimization Pattern**:
```yaml
tiered_reading:
  tier_1_abstract:
    pages: "1"
    purpose: "Quick classification"

  tier_2_methods:
    pages: "4-8"
    purpose: "Bias and quality assessment"
    triggered_by: "tier_1 indicates HIGH potential"

  tier_3_results:
    pages: "7-10"
    purpose: "Precision and consistency"
    triggered_by: "tier_2 confirms HIGH quality"

  tier_4_full:
    pages: "all"
    purpose: "Comprehensive analysis"
    triggered_by: "contradictory findings or unclear quality"
```

### Research Synthesis Tools

**Purpose**: Compare findings across multiple papers.

**Optimization Pattern**:
```yaml
comparative_analysis:
  step_1_abstracts:
    pages: "1"
    for_all_papers: true
    purpose: "Identify relevant papers"

  step_2_results:
    pages: "7-10"
    for_selected_papers: true
    purpose: "Extract comparable metrics"

  step_3_methodology:
    pages: "4-8"
    for_conflicting_papers: true
    purpose: "Resolve discrepancies"

token_budget:
  abstracts_50_papers: 25,000 tokens
  results_10_papers: 15,000 tokens
  methods_3_papers: 6,000 tokens
  total: 46,000 tokens (vs 750,000 full read)
```

## Usage Examples

### Example 1: Citation Verification

```markdown
# Scenario: Verify claim from REF-015 page 12

## Step 1: Read frontmatter to get claim
Read file_path=".aiwg/research/findings/REF-015.md"

## Step 2: Extract cited page
Claim: "Self-Refine improves quality by 20% (p. 12)"
Cited page: 12

## Step 3: Read only that page
Read file_path=".aiwg/research/sources/REF-015.pdf" pages="12"

## Step 4: Verify quote accuracy
Search for "20%" or "improvement" in page 12 content
```

### Example 2: Quality Assessment (GRADE)

```markdown
# Scenario: Assess REF-042 for GRADE baseline

## Phase 1: Quick scan (abstract)
Read file_path=".aiwg/research/sources/REF-042.pdf" pages="1"
→ Study type: Randomized Controlled Trial → Baseline: HIGH

## Phase 2: Methodology check
Read file_path=".aiwg/research/sources/REF-042.pdf" pages="4-8"
→ Sample size: 120 participants
→ Randomization: proper
→ Blinding: double-blind
→ Confirmed: HIGH quality

## Phase 3: Results consistency
Read file_path=".aiwg/research/sources/REF-042.pdf" pages="8-10"
→ Confidence intervals reported
→ Effect size: significant (p<0.01)
→ No inconsistencies detected

## Final: HIGH quality (no downgrades)
```

### Example 3: Bulk Corpus Scan

```markdown
# Scenario: Check 50 papers for missing authors in frontmatter

## For each paper:
for ref in REF-001 through REF-050:
  # Read lightweight reference
  @.aiwg/research/sources/{ref}.pdf

  # Read abstract only
  Read file_path=".aiwg/research/sources/{ref}.pdf" pages="1"

  # Extract authors from page 1
  authors = extract_authors(page_1_content)

  # Compare with frontmatter
  frontmatter_authors = load_frontmatter_authors(ref)

  if authors != frontmatter_authors:
    flag_discrepancy(ref)

## Token cost: ~25,000 (vs 750,000 for full reads)
```

### Example 4: Multi-Paper Synthesis

```markdown
# Scenario: Compare TDD effectiveness across 5 studies

## Step 1: Read all abstracts
Read file_path="REF-010.pdf" pages="1"  # TDD study 1
Read file_path="REF-023.pdf" pages="1"  # TDD study 2
Read file_path="REF-035.pdf" pages="1"  # TDD study 3
Read file_path="REF-041.pdf" pages="1"  # TDD study 4
Read file_path="REF-052.pdf" pages="1"  # TDD study 5

## Step 2: Identify key metrics pages
Study 1: results on page 9
Study 2: results on page 12
Study 3: results on page 8
Study 4: results on page 10
Study 5: results on page 7

## Step 3: Read results sections
Read file_path="REF-010.pdf" pages="9"
Read file_path="REF-023.pdf" pages="12"
Read file_path="REF-035.pdf" pages="8"
Read file_path="REF-041.pdf" pages="10"
Read file_path="REF-052.pdf" pages="7"

## Step 4: Synthesize findings
Effect sizes: 15%, 22%, 18%, 30%, 12%
Mean: 19.4%
Range: 12-30%

## Token cost: ~6,000 (vs 75,000 for full papers)
```

## Best Practices

### 1. Always Start with Abstracts

```markdown
# Good: Progressive disclosure
Read file_path="paper.pdf" pages="1"      # Abstract first
if relevant:
  Read file_path="paper.pdf" pages="4-8"  # Then methodology
if still_needed:
  Read file_path="paper.pdf" pages="all"  # Full paper last

# Bad: Load everything upfront
Read file_path="paper.pdf" pages="all"    # Wastes tokens if not relevant
```

### 2. Use Frontmatter to Guide Page Selection

```yaml
# Store key page numbers in frontmatter
key_findings:
  - finding: "34% improvement"
    metric: "+34% accuracy"
    page: 7                    # ← Use this for targeted reads
    impact: high

  - finding: "Sample size n=500"
    page: 5                    # ← Methodology section
    impact: high
```

### 3. Batch Related Page Reads

```markdown
# Good: Single read for contiguous sections
Read file_path="paper.pdf" pages="4-8"    # Methods + results together

# Less efficient: Multiple reads
Read file_path="paper.pdf" pages="4"
Read file_path="paper.pdf" pages="5"
Read file_path="paper.pdf" pages="6"
Read file_path="paper.pdf" pages="7"
Read file_path="paper.pdf" pages="8"
```

### 4. Document Page Mappings in Corpus

```yaml
# Add to research corpus metadata
paper_structure:
  abstract: 1
  introduction: 2-3
  methodology: 4-6
  results: 7-9
  discussion: 9-11
  conclusion: 11-12
  references: 12-14

# Enables automation:
Read file_path="paper.pdf" pages="{paper_structure.methodology}"
```

## Cross-Platform Compatibility

### Platform Support Matrix

| Platform | PDF Page Ranges | Fallback Behavior |
|----------|-----------------|-------------------|
| Claude Code v2.1.30+ | ✅ Supported | N/A |
| Claude Code <v2.1.30 | ❌ Not supported | Full PDF read |
| GitHub Copilot | ❌ Not supported | Full PDF read |
| Cursor | ❌ Not supported | Full PDF read |
| Factory AI | ❌ Not supported | Full PDF read |

### Graceful Degradation

Research tools MUST handle both modes:

```typescript
// Detect page range support
function readPdfPages(path: string, pages?: string): string {
  try {
    // Attempt page range read
    return readTool({ file_path: path, pages });
  } catch (error) {
    if (error.message.includes('pages parameter not supported')) {
      // Fall back to full read
      console.warn('Page ranges not supported, reading full PDF');
      return readTool({ file_path: path });
    }
    throw error;
  }
}
```

### Detection Method

```markdown
# Test for page range support
try:
  Read file_path="test.pdf" pages="1"
  PAGE_RANGES_SUPPORTED = true
except:
  PAGE_RANGES_SUPPORTED = false
```

## Integration with Research Metadata Rules

### Enhanced Frontmatter

```yaml
---
ref_id: "REF-015"
title: "Self-Refine: Iterative Refinement with Self-Feedback"
pdf_hash: "a1b2c3d4..."

# NEW: Page-level metadata
page_structure:
  abstract: 1
  methodology: 4-7
  results: 7-10
  key_tables:
    - page: 8
      caption: "Performance comparison"
    - page: 9
      caption: "Ablation study"

# NEW: Citation page references
key_findings:
  - finding: "20% improvement over baseline"
    metric: "+20% accuracy"
    page: 9                    # ← Enables targeted verification
    impact: high

  - finding: "94% of failures due to bad feedback"
    metric: "94% attribution"
    page: 12                   # ← Direct citation verification
    impact: critical
---
```

### Validation Updates

```yaml
validation_checklist:
  # Existing checks
  - pdf_hash_recorded
  - doi_verified
  - frontmatter_complete

  # NEW: Page-level checks
  - page_structure_documented
  - key_findings_have_pages
  - citation_pages_verified
```

## Performance Comparison

### Token Consumption Analysis

| Operation | Before (Full Read) | After (Page Ranges) | Savings |
|-----------|-------------------|---------------------|---------|
| Single paper citation check | 15,000 tokens | 500 tokens | 97% |
| GRADE assessment (5 papers) | 75,000 tokens | 10,000 tokens | 87% |
| Corpus health scan (50 papers) | 750,000 tokens | 25,000 tokens | 97% |
| Synthesis (10 papers) | 150,000 tokens | 20,000 tokens | 87% |

### Real-World Example

**Scenario**: Verify 20 citations across 15 papers

**Before**:
```
Load 15 full PDFs: 15 × 10,000 = 150,000 tokens
→ Often exceeds context window
→ Requires multiple sessions
```

**After**:
```
Load 20 specific pages: 20 × 500 = 10,000 tokens
→ Single session
→ 93% token reduction
```

## Migration Checklist

When updating research tools to use page ranges:

- [ ] Test for page range support before using
- [ ] Implement graceful fallback to full reads
- [ ] Update frontmatter schema to include page structure
- [ ] Document page mappings for key papers
- [ ] Add page numbers to key_findings
- [ ] Update citation verification to use targeted reads
- [ ] Refactor corpus health checks to use abstracts only
- [ ] Add page range examples to tool documentation
- [ ] Test cross-platform compatibility
- [ ] Update token budget calculations

## References

- @.claude/rules/research-metadata.md - Research metadata requirements
- @docs/cli-reference.md - AIWG CLI commands
- @.aiwg/research/docs/grade-assessment-guide.md - GRADE methodology
- Claude Code v2.1.30 Release Notes - PDF page range feature

---

**Status**: ACTIVE
**Version**: 1.0.0
**Issue**: #290
