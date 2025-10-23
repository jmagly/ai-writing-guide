# Usability Requirements Module

**Parent Document**: [Supplemental Specification](../supplemental-specification.md)
**Category**: Usability, User Experience, Accessibility
**NFR Count**: 12 (6 P0, 5 P1, 1 P2)
**Version**: 1.3
**Last Updated**: 2025-10-22

## Overview

This module contains all usability-related non-functional requirements including learning curve, error message clarity, and first-time user success rates.

## NFRs in This Module

- NFR-TEST-07: Test Plan Clarity (Actionable Test Cases) [P0]
- NFR-TMPL-04: First-Time User Success Rate [P0]
- NFR-TMPL-05: Template Recommendation Acceptance [P1]
- NFR-TMPL-06: Error Message Clarity [P1]
- NFR-TRACE-11: Report Clarity (Actionable Steps) [P0]
- NFR-TRACE-12: Summary Brevity [P2]
- NFR-USE-001: AI Validation Learning Curve [P0]
- NFR-USE-002: Validation Feedback Clarity [P1]
- NFR-USE-003: Progress Visibility (Real-time Score Updates) [P1]
- NFR-USE-004: First-Time Setup Friction [P0]
- NFR-USE-005: Error Message Clarity [P0]
- NFR-USE-006: Onboarding Time Savings [P1]

---

### NFR-TEST-07: Test Plan Clarity (Actionable Test Cases) [P0]

**Description**: Generated test plans contain 100% actionable test cases with no ambiguous steps.

**Rationale**: Developer productivity depends on clear test steps. Ambiguous test cases create clarification delays, reducing test execution velocity.

**Measurement Criteria**:
- **Target**: 100% actionable test cases (no ambiguous steps)
- **Measurement Methodology**: User study measuring test case clarity (manual review of 100 generated test cases)
- **Baseline**: TBD (establish baseline in Construction Week 3)

**Testing Approach**: **Manual** - Test plan clarity user study

**Priority**: **P0** - Critical for test execution productivity. Ambiguous test cases block testing phase, reducing velocity.

**Traceability**:
- **Source**: UC-009 (Test Templates)
- **Test Cases**: TC-TEST-001, TC-TEST-012
- **Components**: TestPlanGenerator, TestCaseFormatter
- **ADRs**: None

**Target Value**: 100% actionable test cases

**Current Baseline**: TBD (measure in Construction Week 3 with user study)

**Implementation Notes**:
- Use Given/When/Then format (Gherkin/BDD standard)
- Provide specific test data (concrete values, not placeholders like "valid username")
- Include expected results (precise assertions, not vague "system works")
- Specify preconditions (test environment setup, data state)

---

---

### NFR-TMPL-04: First-Time User Success Rate [P0]

**Description**: First-time users successfully find correct template with high success rate.

**Rationale**: Onboarding conversion depends on successful template selection. High success rate reduces adoption barrier.

**Measurement Criteria**:
- **Target**: 85%+ find correct template
- **Measurement Methodology**: User study with 20+ first-time users measuring success rate
- **Baseline**: TBD (establish baseline in Construction Week 2)

**Testing Approach**: **Statistical** - User study measuring first-time user success rate

**Priority**: **P0** - Critical for onboarding conversion. Low success rate creates barrier to adoption.

**Traceability**:
- **Source**: UC-008 (Template Selection)
- **Test Cases**: TC-TMPL-001
- **Components**: TemplateSelector, IntakeWizard
- **ADRs**: None

**Target Value**: 85%+ first-time user success rate

**Current Baseline**: TBD (measure in Construction Week 2 with user study)

**Implementation Notes**:
- Provide guided workflow (intake wizard with context questions)
- Show template previews (enable users to verify template before selection)
- Limit recommendation set (top 3 templates reduce choice paralysis)
- Provide search fallback (allow manual search if recommendations insufficient)

---

---

### NFR-TMPL-05: Template Recommendation Acceptance [P1]

**Description**: Developers accept recommended templates with high rate, validating recommendation accuracy.

**Rationale**: Trust in recommendation engine depends on acceptance rate. High acceptance validates context-aware recommendation logic.

**Measurement Criteria**:
- **Target**: 85%+ developers use recommended template
- **Measurement Methodology**: Telemetry tracking measuring recommendation acceptance rate
- **Baseline**: TBD (establish baseline in Construction Week 2)

**Testing Approach**: **Statistical** - Acceptance rate tracking with usage telemetry

**Priority**: **P1** - High value for recommendation engine validation. High acceptance rate confirms context-aware accuracy.

**Traceability**:
- **Source**: UC-008 (Template Selection)
- **Test Cases**: TC-TMPL-003
- **Components**: TemplateRecommender, UsageTelemetry
- **ADRs**: None

**Target Value**: 85%+ recommendation acceptance rate

**Current Baseline**: TBD (measure in Construction Week 2)

**Implementation Notes**:
- Track recommendation acceptance (log when users select recommended template)
- Track recommendation rejection (log when users search manually instead)
- Analyze rejection patterns (identify contexts where recommendations fail)
- Refine recommendation logic (adjust weights based on rejection patterns)

---

---

### NFR-TMPL-06: Error Message Clarity [P1]

**Description**: Template selection error messages are clear and actionable, enabling self-service troubleshooting.

**Rationale**: Support burden reduction depends on clear error messages. Self-service troubleshooting reduces support requests.

**Measurement Criteria**:
- **Target**: 90%+ developers understand remediation
- **Measurement Methodology**: User study measuring error message comprehension (manual review of 50 error scenarios)
- **Baseline**: TBD (establish baseline in Construction Week 2)

**Testing Approach**: **Manual** - Error message clarity user study

**Priority**: **P1** - High value for support burden reduction. Clear error messages enable self-service troubleshooting.

**Traceability**:
- **Source**: UC-008 (Template Selection)
- **Test Cases**: TC-TMPL-005, TC-TMPL-007, TC-TMPL-008
- **Components**: ErrorMessageFormatter, TemplateValidator
- **ADRs**: None

**Target Value**: 90%+ developer comprehension of error messages

**Current Baseline**: TBD (measure in Construction Week 2 with user study)

**Implementation Notes**:
- Provide specific error context (file path, template name, validation rule)
- Suggest remediation (how to fix the error)
- Link to documentation (template usage guides, validation rules)
- Use plain language (avoid technical jargon where possible)

---

---

### NFR-TRACE-11: Report Clarity (Actionable Steps) [P0]

**Description**: Traceability validation reports provide 100% actionable remediation steps for all gaps.

**Rationale**: Developer productivity depends on clear next actions. Vague traceability gaps create frustration and delay remediation.

**Measurement Criteria**:
- **Target**: 100% actionable remediation steps
- **Measurement Methodology**: User study measuring percentage of gaps with clear remediation (manual review of 100 gap reports)
- **Baseline**: TBD (establish baseline in Construction Week 1)

**Testing Approach**: **Manual** - Traceability report clarity user study

**Priority**: **P0** - Critical for developer productivity. Clear remediation steps ensure rapid gap resolution.

**Traceability**:
- **Source**: UC-006 (Automated Traceability)
- **Test Cases**: TC-TRACE-012, TC-TRACE-019, TC-TRACE-020
- **Components**: TraceabilityReporter, RemediationGuide
- **ADRs**: None

**Target Value**: 100% actionable remediation steps

**Current Baseline**: TBD (measure in Construction Week 1 with user study)

**Implementation Notes**:
- Provide specific remediation for each gap (not generic advice)
- Include examples (show how to add traceability links to code/tests)
- Link to documentation (traceability best practices, tagging conventions)
- Estimate remediation effort (Simple/Medium/Complex for sprint planning)

---

---

### NFR-TRACE-12: Summary Brevity [P2]

**Description**: Traceability summary reports are concise to enable quick understanding without information overload.

**Rationale**: Quick understanding critical for traceability reviews. Concise summaries enable rapid gap assessment.

**Measurement Criteria**:
- **Target**: <500 words summary
- **Measurement Methodology**: Word count validation on generated summaries
- **Baseline**: TBD (establish baseline in Construction Week 1)

**Testing Approach**: **Automated** - Summary length validation

**Priority**: **P2** - Nice-to-have usability enhancement. Deferred to Version 2.0 as detailed reports acceptable for MVP.

**Traceability**:
- **Source**: UC-006 (Automated Traceability)
- **Test Cases**: TC-TRACE-012
- **Components**: TraceabilitySummarizer, ReportGenerator
- **ADRs**: None

**Target Value**: <500 words summary

**Current Baseline**: TBD (measure in Construction Week 1)

**Implementation Notes**:
- Summarize key metrics (total requirements, coverage %, orphan count, gap count)
- Highlight blockers (list P0 requirements with gaps requiring immediate attention)
- Omit verbose details (link to detailed CSV report for full traceability matrix)
- Use bullet points (improve scannability)

---

---

### NFR-USE-001: AI Validation Learning Curve [P0]

**Description**: Users internalize AI validation feedback patterns within 1-2 validation cycles.

**Rationale**: Steep learning curve (>2 cycles) reduces adoption. Users should quickly understand validation feedback, apply improvements.

**Measurement Criteria**:
- **Target**: 1-2 validation cycles to internalize feedback patterns
- **Measurement Methodology**: User study with 10 new users, observe task completion improvement
- **Baseline**: 80% of users internalize feedback after 2 cycles

**Testing Approach**: **Manual** - User acceptance testing (UAT) with task observation

**Priority**: **P0** - Adoption barrier if steep, accessibility requirement

**Traceability**:
- **Source**: UC-001: Validate AI-Generated Content (AC-001: learning curve)
- **Test Cases**: TC-001-019 (usability validation)
- **Components**: WritingValidator (SAD Section 5.1)
- **ADRs**: None

**Target Value**: 1-2 validation cycles to internalize feedback patterns

**Current Baseline**: TBD (establish baseline in Transition phase, UAT with beta testers)

**Proxy Metric for Automated Testing**:
- Measure feedback consistency (same pattern flagged consistently across documents)
- Target: 95% consistency (pattern X always flagged in all documents)

**Implementation Notes**:
- Use clear feedback messages (explain why pattern flagged)
- Use consistent terminology (same terms across all feedback)
- Provide examples (show before/after rewrite suggestions)

---

---

### NFR-USE-002: Validation Feedback Clarity [P1]

**Description**: Validation feedback includes line numbers and specific rewrite suggestions.

**Rationale**: Vague feedback ("improve clarity") is not actionable. Specific line numbers + rewrite suggestions enable immediate action.

**Measurement Criteria**:
- **Target**: 100% of feedback includes line numbers and specific rewrite suggestions
- **Measurement Methodology**: Feedback message inspection (regex validation)
- **Baseline**: 100% (enforced by feedback format)

**Testing Approach**: **Automated** - Feedback format validation (regex checks)

**Priority**: **P1** - User experience enhancement, deferred to post-MVP feedback improvement

**Traceability**:
- **Source**: UC-001: Validate AI-Generated Content (AC-002: feedback clarity)
- **Test Cases**: TC-001-020 (usability validation)
- **Components**: WritingValidator (SAD Section 5.1)
- **ADRs**: None

**Target Value**: 100% of feedback includes line numbers and specific rewrite suggestions

**Current Baseline**: TBD (establish baseline in Construction phase)

**Feedback Format Example**:
```
Line 42: AI pattern detected - "It's worth noting that"
Suggestion: Remove hedge phrase. Rewrite as: "The system supports..."
```

**Implementation Notes**:
- Use line number tracking (parse markdown line-by-line)
- Use suggestion templates (predefined rewrites for common patterns)
- Use severity levels (high-confidence patterns flagged as errors, low-confidence as warnings)

---

---

### NFR-USE-003: Progress Visibility (Real-time Score Updates) [P1]

**Description**: Authenticity score updates in real-time as files are validated.

**Rationale**: Real-time updates motivate users (see improvement incrementally). Batch updates delay gratification, reduce engagement.

**Measurement Criteria**:
- **Target**: Score updates visible after each file validation (not batched)
- **Measurement Methodology**: UI inspection (manual testing)
- **Baseline**: Real-time updates (enforced by validation loop)

**Testing Approach**: **Manual** - UI inspection (requires UI testing framework)

**Priority**: **P1** - Motivation feature, deferred to Construction phase (when UI implemented)

**Traceability**:
- **Source**: UC-001: Validate AI-Generated Content (AC-003: progress visibility)
- **Test Cases**: TC-001-021 (usability validation)
- **Components**: WritingValidator (SAD Section 5.1)
- **ADRs**: None

**Target Value**: Real-time score updates (after each file validation)

**Current Baseline**: TBD (establish baseline in Construction phase, UI implementation)

**Implementation Notes**:
- Use streaming output (display score incrementally, not at end)
- Use progress indicators (percentage complete, files remaining)
- Use color coding (green = improving, red = declining)

---

---

### NFR-USE-004: First-Time Setup Friction [P0]

**Description**: Users generate first artifact within 15 minutes from installation.

**Rationale**: Onboarding friction (>15 minutes) reduces conversion. Users should experience value quickly.

**Measurement Criteria**:
- **Target**: <15 minutes from install to first artifact (80% of users)
- **Measurement Methodology**: Timed user study with 10 new users, task completion observation
- **Baseline**: 12 minutes (typical), 15 minutes (threshold)

**Testing Approach**: **Manual** - User acceptance testing (UAT) with timer

**Priority**: **P0** - Onboarding conversion rate, accessibility requirement

**Traceability**:
- **Source**: UC-002: Deploy SDLC Framework to Existing Project (AC-001: setup friction)
- **Test Cases**: TC-002-021 (usability validation)
- **Components**: CLI entry point, deploy-agents.mjs (SAD Section 2.1)
- **ADRs**: None

**Target Value**: <15 minutes from install to first artifact (80% of users)

**Current Baseline**: TBD (establish baseline in Transition phase, UAT with beta testers)

**Proxy Metric for Automated Testing**:
- Measure setup time (install + deploy + generate first artifact)
- Target: <15 minutes (measured on reference hardware)

**Implementation Notes**:
- Use one-line install (curl | bash)
- Use interactive prompts (guide users through setup)
- Use default values (minimize user input required)

---

---

### NFR-USE-005: Error Message Clarity [P0]

**Description**: Error messages include clear remediation steps for all errors.

**Rationale**: Unclear errors ("something went wrong") frustrate users, increase support burden. Clear remediation steps enable self-service recovery.

**Measurement Criteria**:
- **Target**: 100% of error messages include remediation steps
- **Measurement Methodology**: Error message inspection (regex validation)
- **Baseline**: 100% (enforced by error handling)

**Testing Approach**: **Automated** - Error message format validation (regex checks)

**Priority**: **P0** - Self-service support, reduce support burden

**Traceability**:
- **Source**: UC-002: Deploy SDLC Framework to Existing Project (AC-005: error clarity)
- **Test Cases**: TC-002-022 (usability validation)
- **Components**: CLI entry point, deploy-agents.mjs (SAD Section 2.1)
- **ADRs**: None

**Target Value**: 100% of error messages include remediation steps

**Current Baseline**: TBD (establish baseline in Construction phase)

**Error Message Format Example**:
```
ERROR: Plugin installation failed - insufficient disk space

Remediation:
1. Free up disk space (current: 50MB available, required: 100MB)
2. Retry installation: aiwg -install-plugin <name>
3. If issue persists, file bug report: https://github.com/jmagly/ai-writing-guide/issues
```

**Implementation Notes**:
- Use error templates (predefined remediation steps for common errors)
- Use context-specific guidance (include relevant details: disk space, file path, etc.)
- Use actionable language (specific commands, not vague suggestions)

---

---

### NFR-USE-006: Onboarding Time Savings [P1]

**Description**: Template selection guides reduce onboarding time by 50% vs manual selection.

**Rationale**: Manual template selection takes 10-20 minutes (browsing, comparison). 50% time savings (5-10 minutes) demonstrates automation value.

**Measurement Criteria**:
- **Target**: 50% time savings vs manual selection
- **Measurement Methodology**: A/B comparison (template selection with vs without AIWG), timed user study with 20 users (10 AIWG, 10 manual)
- **Baseline**: 10 minutes (AIWG), 20 minutes (manual) = 50% time savings

**Testing Approach**: **Manual** - User acceptance testing (UAT) with A/B comparison

**Priority**: **P1** - Productivity metric, deferred to FID-003 (Template Selection Guides)

**Traceability**:
- **Source**: UC-008: Template Selection Guides (AC-003: time savings)
- **Test Cases**: TC-008-017 (usability validation)
- **Components**: TemplateSelector (SAD Section 2.1)
- **ADRs**: None

**Target Value**: 50% time savings vs manual selection (10 minutes AIWG vs 20 minutes manual)

**Current Baseline**: TBD (establish baseline in Transition phase, UAT with beta testers)

**Proxy Metric for Automated Testing**:
- Measure recommendation time (time to generate recommendation)
- Target: <2 minutes (fast enough to save time vs manual browsing)

**Implementation Notes**:
- Use intelligent recommendation (project type, tech stack, team size)
- Limit recommendation set (top 3 templates, ranked)
- Provide explanation (why this template recommended)

---

---

