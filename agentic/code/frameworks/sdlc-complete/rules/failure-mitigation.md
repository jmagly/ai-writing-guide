# Failure Archetype Mitigation Rules

**Enforcement Level**: HIGH
**Scope**: All agent operations and content generation
**Research Basis**: REF-002 Failures in Deployed LLM Systems
**Issue**: #140

## Overview

These rules document mitigation strategies for each failure archetype identified in LLM failure taxonomy research. Agents MUST apply these strategies to prevent common failure modes.

## Failure Archetypes and Mitigations

### 1. Hallucination Failures

**Description**: Generation of false or fabricated information

| Type | Mitigation |
|------|-----------|
| Fabricated citations | Verify all REF-XXX exist in corpus before citing |
| Made-up statistics | Require source citation for all numeric claims |
| False attributions | Cross-check author/source claims |
| Invented APIs | Validate against actual documentation |
| Phantom requirements | Verify UC-XXX, US-XXX exist before referencing |

**Agent Rules**:
```yaml
before_generation:
  - load_valid_references
  - load_api_documentation
  - prepare_citation_index

during_generation:
  - cite_only_known_sources
  - validate_api_calls
  - check_reference_existence

after_generation:
  - run_hallucination_detection
  - verify_all_citations
  - flag_suspicious_claims
```

### 2. Context Handling Failures

**Description**: Loss of context or incorrect context application

| Type | Mitigation |
|------|-----------|
| Context truncation | Summarize long contexts, preserve key facts |
| Context confusion | Clear separation of different contexts |
| Lost constraints | Re-state constraints in output |
| Scope drift | Explicitly bound the scope |
| Ignored instructions | Echo back key instructions |

**Agent Rules**:
```yaml
context_management:
  - maintain_context_summary
  - flag_context_length_warnings
  - preserve_user_constraints
  - re_validate_scope_boundaries
  - acknowledge_instructions_received
```

### 3. Instruction Following Failures

**Description**: Failure to correctly follow user instructions

| Type | Mitigation |
|------|-----------|
| Partial execution | Checklist all requested items |
| Instruction misinterpretation | Confirm understanding before execution |
| Overriding preferences | Respect explicit user preferences |
| Adding unrequested features | Generate only what was asked |
| Ignoring constraints | Track and apply all stated constraints |

**Agent Rules**:
```yaml
instruction_handling:
  - parse_instructions_to_checklist
  - confirm_ambiguous_instructions
  - track_completion_status
  - never_add_unrequested_features
  - preserve_all_constraints
```

### 4. Safety and Bias Failures

**Description**: Generation of harmful or biased content

| Type | Mitigation |
|------|-----------|
| Harmful content | Apply content safety filters |
| Bias amplification | Use diverse examples and perspectives |
| Privacy violations | Redact PII, respect confidentiality |
| Security vulnerabilities | Run security checks on generated code |
| Ethical violations | Apply ethical guidelines |

**Agent Rules**:
```yaml
safety_checks:
  - filter_harmful_content
  - check_for_bias_patterns
  - redact_pii_before_output
  - security_scan_generated_code
  - verify_ethical_compliance
```

### 5. Technical Errors

**Description**: Incorrect technical output

| Type | Mitigation |
|------|-----------|
| Syntax errors | Validate syntax before output |
| Logic errors | Test generated logic |
| Version mismatches | Check against current versions |
| Dependency issues | Verify package availability |
| Platform incompatibility | Check platform requirements |

**Agent Rules**:
```yaml
technical_validation:
  - syntax_check_all_code
  - validate_logic_consistency
  - verify_version_compatibility
  - check_dependency_availability
  - test_platform_requirements
```

### 6. Consistency Failures

**Description**: Internal contradictions or inconsistencies

| Type | Mitigation |
|------|-----------|
| Self-contradiction | Track claims, check for conflicts |
| Style inconsistency | Apply consistent voice/style |
| Format inconsistency | Use templates |
| Naming inconsistency | Maintain naming conventions |
| Temporal inconsistency | Track and validate timelines |

**Agent Rules**:
```yaml
consistency_checks:
  - track_all_claims_made
  - detect_contradictions
  - apply_style_templates
  - enforce_naming_conventions
  - validate_temporal_consistency
```

## Detection Strategies

### Pre-Generation Detection

Before generating content, check for conditions that increase failure risk:

```yaml
risk_factors:
  high_risk:
    - long_context (>50k tokens)
    - complex_multi_part_request
    - technical_domain_unfamiliar
    - constraints_conflict

  mitigation:
    - summarize_context
    - break_into_sub_tasks
    - request_domain_clarification
    - surface_constraint_conflicts
```

### During-Generation Detection

While generating, watch for warning signs:

```yaml
warning_signs:
  - generating_unknown_references
  - deviating_from_instructions
  - contradicting_earlier_statements
  - exceeding_scope

  action:
  - pause_and_verify
  - backtrack_if_needed
  - request_clarification
```

### Post-Generation Detection

After generating, validate output:

```yaml
validation:
  citations:
    - all_refs_exist_in_corpus
    - all_links_valid
    - all_stats_have_sources

  consistency:
    - no_self_contradictions
    - style_matches_requirements
    - format_follows_template

  completeness:
    - all_instructions_addressed
    - all_constraints_applied
    - no_truncation_occurred
```

## Quality Gates Integration

Integrate failure detection with HITL gates:

```yaml
gate_integration:
  inception_gate:
    check_for:
      - scope_clarity
      - constraint_conflicts
      - requirement_ambiguity

  elaboration_gate:
    check_for:
      - requirement_hallucinations
      - consistency_issues
      - completeness_gaps

  construction_gate:
    check_for:
      - technical_errors
      - security_vulnerabilities
      - code_consistency

  transition_gate:
    check_for:
      - documentation_accuracy
      - test_coverage_completeness
      - deployment_readiness
```

## Severity Classification

| Severity | Impact | Response |
|----------|--------|----------|
| Critical | Data loss, security breach, harmful output | Immediate block, human review required |
| High | Incorrect functionality, significant misinformation | Block, attempt auto-fix, flag for review |
| Medium | Minor errors, style issues | Warn, suggest fixes |
| Low | Cosmetic issues | Log for improvement |

## Agent Protocol

### Every Agent MUST

1. **Before generation**: Load relevant validation context
2. **During generation**: Monitor for warning signs
3. **After generation**: Run failure detection checks
4. **On detection**: Apply appropriate response based on severity
5. **Report**: Log all detected issues for analysis

### Failure Response Flow

```
Detection → Classification → Response → Logging

Detection:
  - Pattern matching
  - Reference validation
  - Consistency checking

Classification:
  - Map to archetype
  - Assign severity

Response:
  - Critical: Block + Human
  - High: Block + Auto-fix
  - Medium: Warn + Suggest
  - Low: Log

Logging:
  - Record all detections
  - Track patterns
  - Update metrics
```

## Metrics and Monitoring

Track these metrics to monitor failure rates:

| Metric | Target | Alert Threshold |
|--------|--------|-----------------|
| Hallucination rate | <1% | >5% |
| Instruction compliance | >95% | <90% |
| Consistency score | >98% | <95% |
| Technical error rate | <2% | >5% |
| Safety filter triggers | <0.1% | >1% |

## References

- @.aiwg/research/findings/REF-002-failures-in-deployed-llm.md - Failure taxonomy
- @agentic/code/frameworks/sdlc-complete/schemas/research/hallucination-detection.yaml - Detection schema
- @.claude/rules/hitl-gates.md - Quality gates
- @agentic/code/frameworks/sdlc-complete/schemas/flows/error-handling.yaml - Error handling
- #140 - Implementation issue

---

**Rule Status**: ACTIVE
**Last Updated**: 2026-01-25
