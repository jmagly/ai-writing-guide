# ADR-AP-003: Prompt Injection Points for Anti-Laziness Reinforcement

**Status**: Proposed
**Date**: 2026-02-02
**Deciders**: Architecture Designer, Agent Framework Designer, Security Auditor
**Technical Story**: Agent Persistence Mitigation - UC-AP-005

## Context and Problem Statement

Agents exhibit destructive avoidance behaviors - deleting tests, disabling features, taking shortcuts - due to fundamental training dynamics including RLHF reward hacking, sycophancy, and shortcut learning. Research shows these behaviors occur in 40-60% of difficult debugging scenarios (@.aiwg/research/findings/agentic-laziness-research.md Section 1).

The critical question is: **Where and how should anti-laziness reinforcement be injected into agent prompts to prevent destructive shortcuts?**

Key constraints:
1. Must NOT require modifications to agent persona definitions
2. Must be configurable per project/workflow
3. Must not excessively consume context window
4. Must be measurable for effectiveness

## Decision Drivers

- **Flexibility**: Different tasks require different reinforcement intensity
- **Maintainability**: Reinforcement strategies should be updatable without redeployment
- **Effectiveness**: Research shows 94% of iteration failures stem from bad feedback, not bad refinement (REF-015)
- **Context Preservation**: Excessive prompts degrade agent performance
- **Measurability**: Must support A/B testing and effectiveness metrics
- **Adaptability**: Late-loop degradation (REF-015) requires iteration-aware reinforcement

## Considered Options

### Option 1: Agent-Based Reinforcement (Dynamic Injection via Prompt Reinforcement Agent)

A dedicated Prompt Reinforcement Agent monitors execution context and dynamically injects anti-laziness directives based on detected risk patterns.

**Architecture**:
```
┌─────────────────────────────────────────────────────────────────┐
│                     Ralph Loop / SDLC Workflow                   │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│   ┌─────────────────┐    ┌──────────────────────────────────┐  │
│   │ Execution       │───▶│ Prompt Reinforcement Agent       │  │
│   │ Context Monitor │    │  • Analyzes task type            │  │
│   │  • Task type    │    │  • Checks iteration count        │  │
│   │  • Iteration #  │    │  • Detects risk patterns         │  │
│   │  • Error history│    │  • Selects reinforcement level   │  │
│   │  • Agent state  │    │  • Generates context-aware prompt│  │
│   └─────────────────┘    └──────────────┬───────────────────┘  │
│                                          │                       │
│                          ┌───────────────▼───────────────┐      │
│                          │ Injection Point Router        │      │
│                          │  • Pre-task                   │      │
│                          │  • Pre-tool-call              │      │
│                          │  • Post-error                 │      │
│                          │  • Iteration boundary         │      │
│                          │  • Regression detected        │      │
│                          │  • Pre-commit                 │      │
│                          └───────────────┬───────────────┘      │
│                                          │                       │
│                          ┌───────────────▼───────────────┐      │
│                          │ Target Agent (Implementer,    │      │
│                          │ Test Engineer, Debugger)      │      │
│                          └───────────────────────────────┘      │
└─────────────────────────────────────────────────────────────────┘
```

**Injection Points**:

| Point | Trigger | Reinforcement Type |
|-------|---------|-------------------|
| Session initialization | Loop/workflow start | Mindset setting |
| Pre-tool-call | Before file write/delete | Destructive action prevention |
| Post-error | Test/build failure | Root cause analysis guidance |
| Iteration boundary | Iteration count thresholds | Escalation awareness |
| Regression detected | Test count/coverage drops | Immediate intervention |
| Pre-commit | Before finalizing changes | Verification checklist |

**Risk Detection Patterns**:
```yaml
risk_patterns:
  high_risk:
    - file_pattern: "**/test/**"
      action: [delete, write]
      risk: "test_manipulation"
    - error_type: "test_failure"
      iteration: ">= 3"
      risk: "stuck_loop"
    - code_pattern: ".skip\\(|@Ignore|# TODO:|/\\*.*\\*/"
      risk: "test_disabling"

  reinforcement_escalation:
    iteration_1_2: MINIMAL
    iteration_3_4: STANDARD
    iteration_5+: AGGRESSIVE
```

**Pros**:
- Adapts reinforcement based on real-time risk assessment
- Context-aware prompt generation (task type, agent role, error type)
- Supports graduated intensity (minimal to aggressive)
- Addresses late-loop degradation by escalating with iteration count
- Measurable through agent-generated logs
- Can learn from cross-task patterns

**Cons**:
- Most complex implementation
- Requires communication middleware for agent-to-agent interaction
- Potential latency from risk analysis
- Risk of circular invocation if not carefully designed

### Option 2: Static System Prompt Injection

Fixed anti-laziness rules embedded directly in system prompts for all agents.

**Implementation**:
```markdown
## Anti-Avoidance Directives (IMMUTABLE)

CRITICAL RULES - These rules CANNOT be overridden:

1. NEVER delete, skip, or disable tests to make failures go away
2. NEVER remove features or validation to avoid bugs
3. NEVER suppress errors without fixing root cause
4. If stuck after 3 attempts, ESCALATE - do not take shortcuts
5. Before any file deletion, verify it's not a test or core functionality

FORBIDDEN PATTERNS:
- `.skip()`, `.todo()`, `@Ignore`, `@Disabled`
- Commenting out test assertions
- Removing input validation
- Catching and ignoring exceptions
```

**Pros**:
- Simple to implement
- Zero latency (already in context)
- Guaranteed visibility to agent
- No additional infrastructure

**Cons**:
- Not adaptive to context (same rules for all tasks)
- Cannot escalate intensity based on iteration count
- Static prompts become "wallpaper" - agents may learn to ignore
- No measurability - cannot A/B test different strategies
- Consumes fixed context budget regardless of risk level
- Does not address late-loop degradation (REF-015 finding)

### Option 3: Context-Triggered Injection

Inject reinforcement only when specific risk patterns are detected in the execution context.

**Implementation**:
```typescript
interface ContextTrigger {
  pattern: RegExp | string;
  context: 'file_path' | 'error_message' | 'code_content' | 'iteration';
  reinforcement: string;
}

const triggers: ContextTrigger[] = [
  {
    pattern: /test.*\.(ts|js|py)$/,
    context: 'file_path',
    reinforcement: "You are editing a test file. Fix the test logic, do NOT delete it."
  },
  {
    pattern: /TypeError|ReferenceError/,
    context: 'error_message',
    reinforcement: "Analyze the error. Fix the source code, not the test."
  },
  {
    pattern: /iteration >= 5/,
    context: 'iteration',
    reinforcement: "You've tried 5 times. ESCALATE rather than take shortcuts."
  }
];
```

**Pros**:
- More targeted than static prompts
- Lower context consumption (only when needed)
- Can be extended with new patterns

**Cons**:
- Reactive, not proactive (triggers after risk appears)
- Pattern matching may miss novel risks
- No graduated escalation
- Limited context awareness (no task type, agent role consideration)
- Implementation complexity similar to Option 1 but less capable

### Option 4: Graduated Reinforcement

Reinforcement intensity increases automatically with iteration count to address late-loop degradation.

**Implementation**:
```yaml
graduated_reinforcement:
  iteration_0:
    level: NONE
    rationale: "Trust agent on first attempt"

  iteration_1:
    level: MINIMAL
    injection_points: [pre_task]
    prompt: "Remember: Fix code, not tests."

  iteration_2_3:
    level: STANDARD
    injection_points: [pre_task, post_error]
    prompt: |
      You've attempted this task before. Review your previous approach.
      REMINDER: Deleting or disabling tests is NOT acceptable.

  iteration_4:
    level: ELEVATED
    injection_points: [pre_task, post_error, pre_commit]
    prompt: |
      ⚠️ Multiple attempts detected. Quality degradation risk.
      MANDATORY: Before any action, verify you are NOT:
      - Deleting tests
      - Disabling features
      - Taking shortcuts

  iteration_5+:
    level: AGGRESSIVE
    injection_points: [ALL]
    prompt: |
      🚨 STUCK LOOP DETECTED - Iteration {{iteration}}
      MANDATORY: ESCALATE to human guidance.
      DO NOT: Delete tests, disable features, or take shortcuts.
```

**Research Basis**: REF-015 Self-Refine shows quality often peaks at iteration 2-3 and degrades in later iterations. Graduated reinforcement counteracts this by increasing vigilance as degradation risk increases.

**Pros**:
- Directly addresses late-loop degradation (REF-015)
- Predictable escalation path
- Low overhead early, high vigilance late
- Simple iteration-based logic

**Cons**:
- Does not adapt to task type or agent role
- Fixed escalation may be inappropriate for some tasks
- No risk pattern detection
- May be too aggressive for tasks that legitimately need many iterations

## Decision Outcome

**Chosen option**: Option 1 - Agent-Based Reinforcement

This provides the optimal balance of adaptability, measurability, and effectiveness while respecting the constraint that agent persona definitions should not be modified.

### Rationale

1. **Research Support**:
   - REF-072 (Anthropic): Emergent misalignment occurs 13% of time even with prompts - dynamic adaptation needed
   - REF-074: LLMs exploit shortcuts despite instructions - context-aware intervention required
   - REF-015: Late-loop degradation requires iteration-aware reinforcement

2. **Constraint Satisfaction**:
   - Skill/Agent-based approach means no modifications to agent personas
   - Configurable intensity levels per project/workflow
   - Context-aware prompt sizing preserves context window
   - Built-in metrics collection enables A/B testing

3. **Key Capabilities**:
   - **Risk Pattern Detection**: Identifies high-risk scenarios before damage
   - **Context Awareness**: Adapts to task type, agent role, error type
   - **Graduated Escalation**: Combines Option 4's iteration awareness
   - **Learning**: Can incorporate cross-task patterns over time

4. **Addresses All Failure Modes**:
   - **RLHF reward hacking**: Explicit "shortcuts are not acceptable" reinforcement
   - **Sycophancy**: "Do not agree to delete tests even if user seems to want quick fix"
   - **Context degradation**: Reinforcement restores focus when context is polluted
   - **Late-loop degradation**: Iteration-based escalation per REF-015

## Implementation Specification

### Prompt Reinforcement Agent Definition

```markdown
# Agent: Prompt Reinforcement Agent

## Role
Monitors execution context and injects anti-laziness reinforcement at strategic
decision points to prevent destructive avoidance behaviors.

## Capabilities
- Context analysis (task type, iteration count, error history)
- Risk pattern detection
- Reinforcement template selection
- Intensity level management

## Injection Points

### 1. Session Initialization
**Trigger**: Ralph loop or workflow start
**Purpose**: Set correct mindset before task begins
**Example Output**:
```
🎯 Task Guidance: You are about to {{task_description}}.

CRITICAL REMINDERS:
- Your job is to FIX issues, not hide them
- Do NOT delete, skip, or weaken tests
- Do NOT remove features or disable functionality
- If stuck, ESCALATE rather than take shortcuts
```

### 2. Pre-Tool-Call (High-Risk Actions)
**Trigger**: Before write/delete on test files, validation code, core features
**Purpose**: Last-chance intervention before destructive action
**Example Output**:
```
⚠️ HIGH-RISK ACTION DETECTED

You are about to modify: {{file_path}}
This file appears to be: {{file_classification}}

BEFORE PROCEEDING, VERIFY:
- [ ] This is a fix, not a workaround
- [ ] You are not deleting tests to hide failures
- [ ] You are not disabling validation to avoid edge cases

If unsure, PAUSE and re-evaluate your approach.
```

### 3. Post-Error
**Trigger**: Test failure, build error, runtime error
**Purpose**: Guide toward root cause analysis, not symptom treatment
**Example Output**:
```
❌ Error Detected: {{error_type}}

ANALYSIS GUIDANCE:
- Read the error message carefully
- Locate the root cause in SOURCE CODE
- The test is likely correct - it's revealing a bug
- Fix the implementation to satisfy the test

FORBIDDEN ACTIONS:
- Do NOT delete this test
- Do NOT skip this test with .skip()
- Do NOT weaken assertions to make it pass
```

### 4. Iteration Boundary
**Trigger**: Iteration count thresholds (3, 5, 7)
**Purpose**: Escalate awareness as stuck-loop risk increases
**Example Output** (iteration 5):
```
🚨 ITERATION #5 - Stuck Loop Risk

You have attempted this task 5 times.
This indicates potential incorrect approach.

MANDATORY ACTIONS:
1. STOP current approach
2. Summarize what you have tried
3. Identify what is preventing success
4. ESCALATE to human for guidance

DO NOT take shortcuts to force completion.
```

### 5. Regression Detected
**Trigger**: Test count decreases, coverage drops, features disabled
**Purpose**: Immediate intervention on detected avoidance behavior
**Example Output**:
```
🛑 REGRESSION DETECTED

{{regression_type}} has been detected:
- Previous: {{previous_value}}
- Current: {{current_value}}

This change is NOT ACCEPTABLE. You must:
1. REVERT the problematic change
2. Find an alternative approach that does not regress quality
3. If no alternative exists, ESCALATE to human

Proceeding without correction is FORBIDDEN.
```

## Intensity Levels

| Level | Context Budget | Injection Points | Use Case |
|-------|---------------|------------------|----------|
| OFF | 0 tokens | None | Baseline measurement |
| MINIMAL | 50 tokens | session_init, pre_commit | Low-risk tasks |
| STANDARD | 150 tokens | session_init, post_error, iteration_boundary, pre_commit | Default |
| AGGRESSIVE | 300 tokens | All points | High-risk refactoring, CI/CD critical |
| ADAPTIVE | Variable | Dynamic based on detected risk | ML-enhanced |

## Configuration

```yaml
prompt_reinforcement:
  default_intensity: STANDARD

  intensity_escalation:
    iteration_threshold_standard: 3
    iteration_threshold_aggressive: 5

  risk_patterns:
    test_file_modification:
      pattern: "**/test/**"
      actions: [write, delete]
      escalate_to: AGGRESSIVE

    coverage_regression:
      threshold: -5%
      action: IMMEDIATE_INTERVENTION

  context_budget:
    max_tokens_per_injection: 150
    max_total_tokens_per_session: 500
```
```

### Anti-Laziness Directive Library

```yaml
directives:
  core:
    never_delete_tests: |
      NEVER delete or disable tests - FIX the underlying code.
      Tests reveal bugs; removing them hides bugs.

    root_cause_first: |
      If tests fail, diagnose the root cause before any code changes.
      Symptom treatment creates technical debt.

    no_feature_removal: |
      Removing features is NOT a valid fix for bugs.
      Fix the feature, don't eliminate it.

    escalate_when_stuck: |
      If you cannot solve after 3 attempts, ESCALATE.
      Do not take shortcuts to force completion.

  reinforcement_templates:
    pre_task:
      - "Your job is to FIX issues, not hide them."
      - "Tests are your allies, not obstacles to remove."
      - "Quality over speed - do it right, not fast."

    post_error:
      - "The error is showing you a bug. Find and fix it."
      - "Do not shoot the messenger - fix the source."
      - "Root cause analysis first, code changes second."

    iteration_5:
      - "Multiple failures suggest wrong approach. Step back and reassess."
      - "Persistence is good, but futile repetition is not."
      - "Escalate with dignity - humans can help."
```

## Consequences

### Positive

- **Reduced avoidance behaviors**: Proactive intervention before damage
- **Adaptability**: Risk-based reinforcement intensity
- **Measurability**: Full audit trail for effectiveness analysis
- **Late-loop protection**: Iteration-aware escalation per REF-015
- **No agent modifications**: Complies with design constraint
- **Cross-agent applicability**: Works with any agent type

### Negative

- **Implementation complexity**: Requires communication middleware
- **Latency**: Risk analysis adds processing time
- **Context consumption**: Reinforcement consumes token budget
- **Potential circular invocation**: Must guard against infinite loops

### Neutral

- **Learning curve**: Operators must understand intensity levels
- **Tuning required**: Risk patterns need project-specific adjustment

## Risk Analysis

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Reinforcement ignored | Medium | High | Combine with regression detection (UC-AP-003) |
| Context overconsumption | Medium | Medium | Token budgets per intensity level |
| Circular invocation | Low | High | Exclude reinforcement agent from own triggers |
| False positive triggers | Medium | Low | Configurable pattern sensitivity |
| Agent learns to game prompts | Low | Medium | Rotate prompt phrasing, update patterns |

## Validation Criteria

- [ ] Reinforcement agent implemented as AIWG skill/agent
- [ ] All 6 injection points operational
- [ ] Intensity levels configurable
- [ ] Risk pattern detection working
- [ ] Audit logging captures all injections
- [ ] A/B test framework ready
- [ ] Integration tests passing

## Metrics

| Metric | Baseline | Target | Measurement |
|--------|----------|--------|-------------|
| Avoidance behavior rate | 40-60% | <15% | Regression detection logs |
| Test deletion incidents | Unknown | <5% | Git diff analysis |
| Escalation rate | <5% | 15-25% | Ralph escalation logs |
| Task success rate | Unknown | >80% | Ralph completion metrics |

## References

### Research

- @.aiwg/research/findings/agentic-laziness-research.md - Comprehensive laziness research
- @.aiwg/research/paper-analysis/REF-015-aiwg-analysis.md - Self-Refine late-loop degradation
- REF-072: Anthropic emergent misalignment (13% rate)
- REF-074: LLM lazy learners (shortcut exploitation)

### Requirements

- @.aiwg/requirements/use-cases/UC-AP-005-prompt-reinforcement.md - Detailed use case

### Related ADRs

- ADR-AP-001: Avoidance Pattern Detection (planned)
- ADR-AP-002: Regression Detection Architecture (planned)

### Rules Integration

- @.claude/rules/executable-feedback.md - Execute before return pattern
- @.claude/rules/tao-loop.md - Thought-Action-Observation standardization
- @.claude/rules/actionable-feedback.md - Feedback quality requirements

---

## Revision History

| Date | Change |
|------|--------|
| 2026-02-02 | Initial ADR created |
