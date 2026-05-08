---
namespace: aiwg
name: research-gap
platforms: [all]
description: Analyze gaps in research coverage
commandHint:
  argumentHint: "[topic] [--suggest-queries] [--export markdown]"
  category: research-analysis
---

# Research Gap Command

Analyze research corpus coverage gaps and suggest literature to fill them.

## Scope Boundary

`research-gap` is **intellectual** — it analyzes what the corpus is missing in terms of knowledge:
- What topics lack adequate coverage?
- What claims lack supporting evidence?
- What contradictions are unresolved?
- What time periods, source types, or methodologies are underrepresented?

For **structural** health checks — orphan files, broken references, missing frontmatter, schema violations — use `corpus-health` / `research-status` instead.

For **declarative rule checking** (automated, CI-ready), use `research-lint` which runs the `research` lint ruleset.

## Instructions

When invoked, perform systematic gap analysis:

1. **Load Corpus Inventory**
   - Scan all papers in `.aiwg/research/`
   - Extract topics, themes, publication years
   - Build coverage map

2. **Identify Gaps**
   - **Topic Gaps** - Underrepresented areas
   - **Temporal Gaps** - Missing time periods
   - **Source Type Gaps** - Bias toward certain publication types
   - **Quality Gaps** - Insufficient HIGH GRADE sources
   - **Methodological Gaps** - Missing research approaches
   - **Perspective Gaps** - Lack of diverse viewpoints

3. **Analyze Existing Coverage**
   - Compare current corpus to AIWG needs
   - Identify critical vs nice-to-have gaps
   - Assess impact of gaps on framework quality
   - Calculate coverage scores by area

4. **Generate Search Queries**
   - Suggest specific search queries to fill gaps
   - Prioritize by urgency and AIWG relevance
   - Include database recommendations

5. **Report Findings**
   - Display gap analysis with visualizations
   - Prioritize gaps by impact
   - Provide actionable recommendations
   - Export as markdown report for review

## Arguments

- `[topic]` - Specific topic to analyze (optional, default: all)
- `--suggest-queries` - Generate search queries for gaps
- `--min-papers [n]` - Minimum papers for adequate coverage (default: 5)
- `--critical-only` - Show only critical gaps
- `--export [markdown|json|yaml]` - Export gap analysis report
- `--prioritize-by [impact|urgency|feasibility]` - Prioritization criteria (default: impact)

## Examples

```bash
# Full corpus gap analysis
/research-gap

# Analyze specific topic
/research-gap "agent security"

# Generate search queries for all gaps
/research-gap --suggest-queries

# Show only critical gaps
/research-gap --critical-only

# Export detailed report
/research-gap --export markdown --suggest-queries
```

## Expected Output

### Full Analysis

```
Research Gap Analysis
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Current Corpus: 47 papers
Analysis Date: 2026-02-03T15:00:00Z

Topic Coverage Analysis:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Topic                      Papers   Target   Status        Gap
───────────────────────────────────────────────────────────────────
agentic-workflows          24       15       ✓ ADEQUATE    +9
llm-evaluation             18       10       ✓ ADEQUATE    +8
human-in-the-loop          14       10       ✓ ADEQUATE    +4
multi-agent-systems        12       10       ✓ ADEQUATE    +2
cognitive-scaffolding      9        8        ✓ ADEQUATE    +1
prompt-engineering         8        8        ✓ ADEQUATE    =0
tool-use                   7        8        ⚠ MINIMAL     -1
reproducibility            6        10       ⚠ SIGNIFICANT -4
fair-principles            5        8        ⚠ SIGNIFICANT -3
test-generation            4        10       ⚠ CRITICAL    -6
agent-security             2        10       ⚠ CRITICAL    -8
cost-optimization          1        8        ⚠ CRITICAL    -7
error-handling             0        8        🚨 MISSING    -8

Critical Gaps (Target - Current >= 5):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. Error Handling (Missing: 8 papers)
   Priority: CRITICAL
   Impact: HIGH - Core framework capability
   Rationale: Zero papers on agent error handling patterns,
              recovery strategies, or failure modes. This is a
              fundamental gap affecting reliability.

   Suggested Search Queries:
     • "error handling strategies LLM agents"
     • "failure recovery agentic systems"
     • "agent robustness fault tolerance"
     • "graceful degradation AI systems"

   Recommended Databases: ACM, IEEE, arXiv

2. Agent Security (Missing: 8 papers)
   Priority: CRITICAL
   Impact: HIGH - Production readiness requirement
   Rationale: Only 2 papers on agent security. Insufficient
              coverage of prompt injection, data leakage,
              adversarial attacks, sandboxing.

   Suggested Search Queries:
     • "LLM agent security vulnerabilities"
     • "prompt injection attacks defense"
     • "agent sandboxing isolation"
     • "adversarial robustness language models"

   Recommended Databases: arXiv, IEEE S&P, USENIX Security

3. Cost Optimization (Missing: 7 papers)
   Priority: CRITICAL
   Impact: MEDIUM - Economic viability
   Rationale: Only 1 paper on cost management. Need research
              on token optimization, caching strategies, model
              selection, and cost-performance tradeoffs.

   Suggested Search Queries:
     • "LLM inference cost optimization"
     • "token-efficient prompting strategies"
     • "agent computational resource management"
     • "cost-effective AI agent deployment"

   Recommended Databases: arXiv, MLSys, cloud vendor research

4. Test Generation (Missing: 6 papers)
   Priority: HIGH
   Impact: MEDIUM - Code quality assurance
   Rationale: Only 4 papers on automated test generation.
              Need more on LLM-based test creation, coverage
              strategies, test quality assessment.

   Suggested Search Queries:
     • "LLM automated test generation"
     • "AI-assisted unit test creation"
     • "test case generation language models"
     • "intelligent test suite augmentation"

   Recommended Databases: ACM, IEEE, ICSE, ISSTA

Significant Gaps (Target - Current 3-4):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

5. Reproducibility (Missing: 4 papers)
   Priority: HIGH
   Impact: MEDIUM - Research rigor
   Current: 6 papers (need 10)

   Suggested Queries:
     • "reproducibility LLM agent experiments"
     • "deterministic AI system execution"
     • "agent workflow reproducibility"

6. FAIR Principles (Missing: 3 papers)
   Priority: MEDIUM
   Impact: MEDIUM - Data governance
   Current: 5 papers (need 8)

   Suggested Queries:
     • "FAIR principles AI/ML artifacts"
     • "research data management machine learning"
     • "metadata standards AI models"

Temporal Gap Analysis:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Year      Papers   Distribution
────────────────────────────────────────────────
2024      18       ██████████████████
2023      15       ███████████████
2022      6        ██████
2021      4        ████
2020      3        ███
2019      1        █
2018      0
2017      0

Temporal Gaps Identified:
  ⚠ Pre-2020 Coverage: Only 4 papers (9%)
     - Lacks historical context for established practices
     - Missing foundational research on pre-LLM agent systems
     - Recommendation: Add 5-10 foundational papers (2015-2019)

  ⚠ 2018 Gap: Zero papers
     - Complete absence of 2018 research
     - May miss important transitional work

Source Type Gap Analysis:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Source Type               Papers   Target   Status
─────────────────────────────────────────────────────────────────
Peer-reviewed Journal     15       20       ⚠ BELOW TARGET
Peer-reviewed Conference  22       20       ✓ ADEQUATE
Preprint                  8        5        ⚠ ABOVE TARGET
Technical Report          2        2        ✓ ADEQUATE

Source Type Issues:
  ⚠ Journal Under-representation
     - Only 32% journals vs 50% target
     - Affects GRADE distribution (fewer HIGH sources)
     - Recommendation: Prioritize journal articles in next searches

  ⚠ Preprint Over-reliance
     - 17% preprints vs 10% target
     - Many may have been published; check for updates
     - Recommendation: Review preprints for journal versions

GRADE Quality Gap Analysis:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

GRADE Level    Papers   Target   Status
───────────────────────────────────────────
HIGH           12       15       ⚠ BELOW TARGET (-3)
MODERATE       18       20       ⚠ BELOW TARGET (-2)
LOW            14       10       ⚠ ABOVE TARGET (+4)
VERY LOW       3        2        ⚠ ABOVE TARGET (+1)

Quality Issues:
  ⚠ Insufficient HIGH Quality Sources
     - Only 26% HIGH vs 32% target
     - Limits confidence in evidence-based claims
     - Recommendation: Seek systematic reviews, meta-analyses, RCTs

  ⚠ Too Many LOW Quality Sources
     - 30% LOW vs 21% target
     - Consider replacing with higher quality alternatives

Methodological Gap Analysis:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Methodology                   Papers   Status
──────────────────────────────────────────────
Experimental Evaluation       28       ✓ ADEQUATE
Systematic Review             4        ⚠ MINIMAL
Case Study                    8        ✓ ADEQUATE
Theoretical Framework         12       ✓ ADEQUATE
Meta-analysis                 2        ⚠ MINIMAL
Empirical User Study          5        ⚠ MINIMAL

Methodological Gaps:
  ⚠ Lack of Systematic Reviews
     - Only 4 systematic reviews (need 8-10)
     - Reduces ability to synthesize evidence across studies
     - Recommendation: Prioritize systematic reviews and meta-analyses

  ⚠ Limited Empirical User Studies
     - Only 5 user studies
     - Missing human factors, usability, practitioner perspectives
     - Recommendation: Include HCI and empirical SE research

Coverage Score by AIWG Component:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Component               Coverage   Status        Priority
────────────────────────────────────────────────────────────────
Agent Orchestration     85%        ✓ GOOD        Maintain
HITL Gates              80%        ✓ GOOD        Maintain
Reproducibility         60%        ⚠ FAIR        Improve
Provenance Tracking     70%        ⚠ FAIR        Improve
Test Generation         40%        ⚠ POOR        Critical
Error Handling          0%         🚨 MISSING     Critical
Security                20%        ⚠ POOR        Critical
Cost Management         10%        🚨 MINIMAL     Critical

Overall Corpus Coverage Score: 68/100 (FAIR)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Breakdown:
  Topic Coverage:        70/100 (FAIR)
  Temporal Coverage:     55/100 (POOR)
  Source Type Balance:   65/100 (FAIR)
  Quality Distribution:  60/100 (FAIR)
  Methodological Mix:    75/100 (GOOD)

Prioritized Action Plan:
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Phase 1: Critical Gaps (Next 2 weeks)
  1. /research-discover "error handling LLM agents"
  2. /research-discover "agent security vulnerabilities"
  3. /research-discover "LLM cost optimization"
  4. /research-discover "automated test generation LLM"

Phase 2: Significant Gaps (Next month)
  5. /research-discover "reproducibility AI experiments"
  6. /research-discover "FAIR principles ML"
  7. Upgrade preprints to journal versions where available

Phase 3: Quality Improvement (Ongoing)
  8. Add systematic reviews (target: 4 more)
  9. Add journal articles (target: 5 more)
  10. Add foundational pre-2020 papers (target: 6 more)

Estimated Effort:
  Phase 1: ~20 papers, 15-20 hours
  Phase 2: ~10 papers, 8-10 hours
  Phase 3: ~10 papers, 8-10 hours
  Total: ~40 papers, 30-40 hours

Suggested Search Queries (Full List):
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Priority 1 (Critical):
  • "error handling strategies LLM agents"
  • "failure recovery agentic systems"
  • "LLM agent security vulnerabilities"
  • "prompt injection attacks defense"
  • "LLM inference cost optimization"
  • "token-efficient prompting strategies"
  • "LLM automated test generation"

Priority 2 (High):
  • "reproducibility LLM agent experiments"
  • "deterministic AI system execution"
  • "FAIR principles AI/ML artifacts"
  • "research data management machine learning"

Priority 3 (Medium):
  • "systematic review LLM applications"
  • "meta-analysis language model effectiveness"
  • "empirical study AI developer tools"
  • "foundational agent architectures 2015-2019"

Export Commands:
  # Export full report
  /research-gap --export markdown > .aiwg/research/reports/gap-analysis-20260203.md

  # Execute discovery workflows
  /research-workflow discovery-to-corpus --input gap-phase1-queries.yaml
```

### Topic-Specific Analysis

```
/research-gap "agent security"

Gap Analysis: Agent Security
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Current Coverage: 2 papers (Target: 10)
Gap Severity: CRITICAL (-8 papers)
Priority: URGENT

Existing Papers:
────────────────────────────────────────────────────────────────────
  REF-034: Security Considerations for LLM-Based Systems (2023)
    GRADE: MODERATE
    Coverage: General security overview, threat landscape

  REF-042: Prompt Injection Attacks and Mitigations (2024)
    GRADE: LOW
    Coverage: Specific attack vector (prompt injection)

Coverage Gaps:
────────────────────────────────────────────────────────────────────
  🚨 MISSING: Data leakage and exfiltration
  🚨 MISSING: Agent sandboxing and isolation
  🚨 MISSING: Adversarial robustness
  🚨 MISSING: Access control for agent operations
  ⚠ MINIMAL: Prompt injection (1 paper, need 3+)
  ⚠ MINIMAL: Model security and safety

Impact Assessment:
────────────────────────────────────────────────────────────────────
  Production Readiness: BLOCKED
    - Cannot deploy agents to production without security validation
    - Lacks guidelines for secure agent implementation
    - Missing threat models for agent architectures

  Framework Completeness: 35/100
    - Security gates incomplete
    - Security auditor agent has limited research foundation
    - No evidence-based security patterns

  User Confidence: LOW
    - Developers will have security concerns
    - Compliance requirements unmet

Suggested Search Queries:
────────────────────────────────────────────────────────────────────

High Priority:
  1. "LLM agent security vulnerabilities systematic review"
     Why: Comprehensive overview of threat landscape

  2. "agent sandboxing isolation techniques"
     Why: Core security requirement for production agents

  3. "data leakage prevention language models"
     Why: Critical for handling sensitive information

  4. "adversarial robustness LLM agents"
     Why: Defensive capabilities against attacks

Medium Priority:
  5. "secure prompt engineering best practices"
  6. "access control agentic systems"
  7. "security testing LLM applications"
  8. "threat modeling AI agent architectures"

Recommended Actions:
────────────────────────────────────────────────────────────────────

Immediate (This Week):
  1. /research-discover "LLM agent security systematic review" --limit 20
  2. Review top 5 results for acquisition

Short Term (Next 2 Weeks):
  3. Acquire 8-10 papers to reach target coverage
  4. Generate security synthesis report
  5. Update security-auditor agent with findings

Medium Term (Next Month):
  6. Create security testing guidelines
  7. Implement security gates based on research
  8. Document secure agent patterns

Next Steps:
────────────────────────────────────────────────────────────────────
  # Execute discovery
  /research-discover "LLM agent security systematic review" --limit 20

  # Or run automated workflow
  /research-workflow discovery-to-corpus --input '{"query": "LLM agent security", "max_results": 10}'
```

## References

- @$AIWG_ROOT/agentic/code/frameworks/research-complete/agents/workflow-agent.md - Gap analysis
- @$AIWG_ROOT/src/research/services/gap-analysis-service.ts - Gap detection implementation
- @.aiwg/research/README.md - Corpus structure and targets
- @.aiwg/research/reports/ - Generated gap analysis reports
