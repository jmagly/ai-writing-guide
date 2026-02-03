---
description: Show research corpus health and statistics
category: research-monitoring
argument-hint: "[--detailed] [--problems-only] [--export json]"
---

# Research Status Command

Display comprehensive health check and statistics for the research corpus.

## Instructions

When invoked, analyze corpus health:

1. **Scan Corpus**
   - Count papers in `.aiwg/research/sources/`
   - Count finding documents
   - Count quality assessments
   - Count archival packages
   - Identify orphaned or incomplete artifacts

2. **Validate Integrity**
   - Check fixity manifest integrity
   - Verify all checksums
   - Detect corrupted files
   - Find missing provenance records

3. **Assess Completeness**
   - Papers missing finding documents
   - Papers missing quality assessments
   - Papers missing archival packages
   - Incomplete frontmatter
   - Missing metadata fields

4. **Analyze Coverage**
   - Topic distribution
   - Publication year distribution
   - Source type distribution (journal, conference, preprint)
   - GRADE quality distribution

5. **Check Policy Compliance**
   - Citation policy violations
   - GRADE hedging compliance
   - Provenance completeness
   - Metadata standards adherence

6. **Generate Report**
   - Summary statistics
   - Health score
   - Problem areas flagged
   - Remediation suggestions

## Arguments

- `--detailed` - Show detailed statistics and breakdowns
- `--problems-only` - Only show issues requiring attention
- `--export [json|yaml|markdown]` - Export report to file
- `--validate-all` - Perform deep validation (slower, thorough)
- `--check-citations` - Include citation policy validation

## Examples

```bash
# Basic status check
/research-status

# Detailed analysis
/research-status --detailed

# Show only problems
/research-status --problems-only

# Full validation with citation check
/research-status --validate-all --check-citations

# Export report
/research-status --detailed --export markdown
```

## Expected Output

### Standard Mode

```
Research Corpus Health Check
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Corpus Statistics:
─────────────────────────────────────────────────────────────────────
  Papers:               47
  Finding Documents:    47 (100%)
  Quality Assessments:  45 (96%)
  Archival Packages:    42 (89%)
  Literature Notes:     38 (81%)

  Total Size:           142.8 MB
  Oldest Paper:         2018
  Newest Paper:         2024

Health Score: 92/100 (GOOD)
─────────────────────────────────────────────────────────────────────

Completeness:
─────────────────────────────────────────────────────────────────────
  ✓ All papers have finding documents
  ⚠ 2 papers missing quality assessments (REF-044, REF-045)
  ⚠ 5 papers missing archival packages (REF-041-045)
  ✓ Fixity manifest up to date
  ✓ Provenance records complete

Quality Distribution:
─────────────────────────────────────────────────────────────────────
  HIGH:      12 papers (26%)  ████████░░░░░░░░░░░░░░░░░░
  MODERATE:  18 papers (38%)  ███████████████░░░░░░░░░░░
  LOW:       14 papers (30%)  ████████████░░░░░░░░░░░░░░
  VERY LOW:   3 papers (6%)   ██░░░░░░░░░░░░░░░░░░░░░░░░

Source Types:
─────────────────────────────────────────────────────────────────────
  Peer-reviewed Journal:    15 (32%)
  Peer-reviewed Conference: 22 (47%)
  Preprint:                  8 (17%)
  Technical Report:          2 (4%)

Topics (Top 5):
─────────────────────────────────────────────────────────────────────
  1. agentic-workflows         24 papers
  2. llm-evaluation            18 papers
  3. human-in-the-loop         14 papers
  4. multi-agent-systems       12 papers
  5. cognitive-scaffolding      9 papers

Issues Requiring Attention:
─────────────────────────────────────────────────────────────────────
  ⚠ 2 papers need quality assessment:
      - REF-044 (acquired 7 days ago)
      - REF-045 (acquired 5 days ago)

  ⚠ 5 papers need archival:
      - REF-041, REF-042, REF-043, REF-044, REF-045

  ⚠ 9 papers need literature notes

Next Steps:
─────────────────────────────────────────────────────────────────────
  1. /research-quality REF-044 REF-045 - Complete quality assessments
  2. /research-archive REF-041 REF-042 REF-043 REF-044 REF-045
  3. /research-document REF-038 --depth comprehensive --include-notes

Last Corpus Update: 2026-02-03T14:35:25Z (15 minutes ago)
```

### Detailed Mode

```
/research-status --detailed

Research Corpus Health Check (Detailed)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Corpus Statistics:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Papers by Year:
  2024: ███████████ 18 (38%)
  2023: ██████████  15 (32%)
  2022: ████        6 (13%)
  2021: ███         4 (9%)
  2020: ██          3 (6%)
  2019: ░           1 (2%)

Papers by GRADE Level:
  HIGH:      ████████  12 (26%)
    - Systematic Reviews: 4
    - Meta-analyses: 2
    - High-quality RCTs: 6

  MODERATE:  ███████████████  18 (38%)
    - Conference Papers: 12
    - Cohort Studies: 6

  LOW:       ████████████  14 (30%)
    - Case Series: 8
    - Limited Evaluation: 6

  VERY LOW:  ██  3 (6%)
    - Preprints (not peer-reviewed): 2
    - Blog Posts: 1

Papers by Source:
  ACM Digital Library:      12
  IEEE Xplore:              8
  arXiv:                    15
  Nature/Science:           5
  Springer:                 4
  Other:                    3

AIWG Relevance:
  HIGH:      32 papers (68%)  - Direct applicability
  MEDIUM:    12 papers (26%)  - Tangential relevance
  LOW:        3 papers (6%)   - Background/context only

Citation Usage:
  Total citations across corpus: 347
  Average citations per paper:   7.4
  Most cited: REF-001 (34 citations)
  Least cited: REF-044 (0 citations, new)

Completeness Matrix:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Artifact Type               Count    %      Status
────────────────────────────────────────────────────────────────────
Source PDFs                 47/47    100%   ✓ Complete
Finding Documents           47/47    100%   ✓ Complete
Quality Assessments         45/47    96%    ⚠ 2 missing
Archival Packages           42/47    89%    ⚠ 5 missing
Literature Notes            38/47    81%    ⚠ 9 missing
Provenance Records          47/47    100%   ✓ Complete

Metadata Completeness:
────────────────────────────────────────────────────────────────────
DOI:                        44/47    94%    ⚠ 3 preprints lack DOI
Authors:                    47/47    100%   ✓ Complete
Year:                       47/47    100%   ✓ Complete
Abstract:                   46/47    98%    ⚠ 1 missing
Keywords:                   38/47    81%    ⚠ 9 missing
Citation Count:             45/47    96%    ⚠ 2 missing

Integrity Checks:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Fixity Validation:          47/47    100%   ✓ All checksums verified
Provenance Chains:          47/47    100%   ✓ Complete
Broken References:          0               ✓ None found
Orphaned Files:             0               ✓ None found

Storage Metrics:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total Size:                 142.8 MB
  Source PDFs:              128.4 MB (90%)
  Finding Documents:        2.1 MB (1%)
  Literature Notes:         0.8 MB (1%)
  Quality Assessments:      0.3 MB (<1%)
  Archival Packages:        11.2 MB (8%)

Average PDF Size:           2.7 MB
Largest Paper:              REF-015 (12.4 MB, book chapter)
Smallest Paper:             REF-031 (0.4 MB, short paper)

Topic Coverage:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

agentic-workflows           ████████████████  24
llm-evaluation              ████████████      18
human-in-the-loop           ██████████        14
multi-agent-systems         ████████          12
cognitive-scaffolding       ██████            9
prompt-engineering          ██████            8
tool-use                    █████             7
reproducibility             █████             6
fair-principles             ████              5
test-generation             ████              4

Research Gaps Identified:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ⚠ Limited coverage of:
      - Agent security (2 papers, recommend 5+)
      - Cost optimization (1 paper, recommend 5+)
      - Real-world case studies (3 papers, recommend 10+)

  ⚠ Date range gaps:
      - 2019-2020: Only 4 papers (consider historical context)

  ⚠ Source diversity:
      - Heavy arXiv reliance (32% preprints)
      - Recommend more journal articles for HIGH GRADE sources

Health Score Breakdown:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Completeness:               18/20 (90%)
Integrity:                  20/20 (100%)
Quality:                    18/20 (90%)
Coverage:                   16/20 (80%)
Policy Compliance:          20/20 (100%)
────────────────────────────────────────────
Overall Health Score:       92/100 (GOOD)

Recommendations:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

High Priority:
  1. Complete quality assessments for REF-044, REF-045
  2. Archive recently acquired papers (REF-041-045)

Medium Priority:
  3. Add literature notes for 9 papers lacking synthesis
  4. Enrich metadata (keywords for 9 papers, abstracts for 1)
  5. Fill research gaps: agent security, cost optimization

Low Priority:
  6. Add more pre-2020 papers for historical context
  7. Increase journal article proportion for HIGH GRADE sources

Maintenance Schedule:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Weekly:
    - Run /research-status --validate-all
    - Archive new acquisitions
    - Update literature notes

  Monthly:
    - Citation policy audit
    - GRADE reassessment for preprints (check for publication)
    - Fixity verification
    - Generate synthesis reports

  Quarterly:
    - Topic coverage review
    - Research gap analysis
    - Corpus pruning (remove obsolete sources)
```

### Problems Only Mode

```
/research-status --problems-only

Research Corpus Issues
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CRITICAL Issues (0):
  None found

HIGH Priority Issues (2):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ⚠ Missing Quality Assessments:
      - REF-044 (acquired 7 days ago)
        Action: /research-quality REF-044
      - REF-045 (acquired 5 days ago)
        Action: /research-quality REF-045

MEDIUM Priority Issues (5):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ⚠ Missing Archival Packages:
      - REF-041, REF-042, REF-043, REF-044, REF-045
        Action: /research-archive REF-041 REF-042 REF-043 REF-044 REF-045

LOW Priority Issues (9):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ⚠ Missing Literature Notes:
      - REF-012, REF-015, REF-023, REF-028, REF-031, REF-038, REF-041, REF-044, REF-045
        Action: /research-document [REF-XXX] --depth comprehensive

INFO Issues (3):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  ℹ Missing Keywords:
      - REF-012, REF-018, REF-023, REF-028, REF-031, REF-038, REF-041, REF-044, REF-045
        Action: Update frontmatter manually or re-run metadata extraction

Summary:
  Total Issues: 19
  Critical: 0
  High: 2
  Medium: 5
  Low: 9
  Info: 3

Suggested Actions:
  # Fix high priority issues
  /research-quality REF-044 REF-045

  # Fix medium priority issues
  /research-archive REF-041 REF-042 REF-043 REF-044 REF-045

  # Address low priority issues (optional)
  /research-document REF-012 --depth comprehensive
```

## Health Score Calculation

```
Health Score = weighted_sum(
  completeness_score * 0.25,
  integrity_score * 0.25,
  quality_score * 0.20,
  coverage_score * 0.15,
  compliance_score * 0.15
)

Completeness = % artifacts with all required elements
Integrity = % passing fixity/provenance checks
Quality = GRADE distribution (higher is better)
Coverage = Topic diversity and gap analysis
Compliance = Citation policy and standards adherence

Score Ranges:
  90-100: EXCELLENT
  80-89:  GOOD
  70-79:  FAIR
  60-69:  NEEDS IMPROVEMENT
  <60:    CRITICAL
```

## Scheduled Reports

Generate scheduled reports:

```bash
# Daily summary
/research-status --export json > .aiwg/research/reports/daily-$(date +%Y%m%d).json

# Weekly detailed
/research-status --detailed --export markdown > .aiwg/research/reports/weekly-$(date +%Y%m%d).md

# Monthly with citation audit
/research-status --validate-all --check-citations --export yaml > .aiwg/research/reports/monthly-$(date +%Y%m%d).yaml
```

## References

- @agentic/code/frameworks/research-complete/agents/workflow-agent.md - Status monitoring
- @src/research/services/status-service.ts - Health check implementation
- @.aiwg/research/fixity-manifest.json - Integrity tracking
- @.aiwg/research/README.md - Corpus structure
- @.claude/rules/citation-policy.md - Policy compliance
