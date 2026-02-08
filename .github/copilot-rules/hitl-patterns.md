# Human-in-the-Loop (HITL) Patterns Rules

**Enforcement Level**: MEDIUM
**Scope**: Agent workflows, Ralph loops, artifact reviews
**Research Basis**: REF-057 Agent Laboratory
**Issues**: #199, #200

## Overview

These rules implement human-in-the-loop patterns for agent-human collaboration, including explicit gate UI display and draft-then-edit workflows per REF-057 Agent Laboratory.

## Research Foundation

From REF-057 Agent Laboratory (Schmidgall et al., 2024):
- Human oversight critical for high-stakes decisions
- Draft-then-edit more effective than generate-once
- Clear handoff points reduce errors
- Iterative refinement produces higher quality outputs
- Explicit gates prevent runaway automation

## Human Gate Patterns

### Gate Types

| Type | Trigger | Required Action |
|------|---------|-----------------|
| Review | Agent completes artifact | Human reviews, provides feedback |
| Approval | Phase transition | Human approves to continue |
| Decision | Multiple valid paths | Human selects direction |
| Override | Agent uncertainty | Human provides explicit guidance |

### Gate Display Format

**REQUIRED** gate display in Ralph loops:

```
================================================================================
                    HUMAN REVIEW REQUIRED
================================================================================

Gate Type:     Architecture Review
Artifact:      .aiwg/architecture/sad.md
Agent:         Architecture Designer
Confidence:    85%

Summary:
  The Software Architecture Document has been drafted with:
  - 5 major components defined
  - 3 ADRs created
  - 2 unresolved trade-offs flagged

Actions:
  [1] approve              - Continue to next phase
  [2] revise <comments>    - Return to agent with feedback
  [3] abort                - Stop loop entirely
  [4] delegate <agent>     - Hand off to different agent

Enter choice: _
================================================================================
```

### Gate Metadata Schema

```yaml
human_gate:
  type: object
  required:
    - gate_type
    - artifact
    - agent
  properties:
    gate_type:
      type: string
      enum: [review, approval, decision, override]
    artifact:
      type: string
      description: "Path to artifact under review"
    agent:
      type: string
      description: "Agent that produced the artifact"
    confidence:
      type: number
      minimum: 0
      maximum: 100
      description: "Agent's confidence in output"
    summary:
      type: string
      description: "Brief summary of what was done"
    options:
      type: array
      items:
        type: object
        properties:
          command:
            type: string
          description:
            type: string
    expected_turnaround:
      type: string
      description: "Expected human response time"
    deadline:
      type: string
      format: date-time
      description: "Gate timeout deadline"
```

## Gate Commands

### Approve

Continue to next phase or iteration:

```bash
# Simple approval
approve

# Approval with comment
approve "Looks good, proceed with implementation"

# Conditional approval
approve --with-caveats "Address TODOs in construction phase"
```

### Revise

Return to agent with feedback:

```bash
# Simple revision request
revise "Add more detail to security section"

# Targeted revision
revise --section "5.2 Data Flow" "Missing encryption at rest discussion"

# Multi-point revision
revise --points "
- Add error handling for edge cases
- Clarify retry logic
- Include timeout configuration
"
```

### Abort

Stop the loop entirely:

```bash
# Simple abort
abort

# Abort with reason (recorded in history)
abort "Requirements have changed, need to restart from intake"

# Abort and revert
abort --revert "Reverting to last known good state"
```

### Delegate

Hand off to different agent:

```bash
# Delegate to specific agent
delegate security-auditor "Need security review before proceeding"

# Delegate with context
delegate test-engineer --context "Please write integration tests for this"
```

## Draft-Then-Edit Pattern

### When to Use

**REQUIRED** for:
- Architecture documents (SAD, ADRs)
- Security threat models
- Test strategies
- Deployment plans
- Any artifact affecting production systems

**OPTIONAL** for:
- Simple user stories
- Internal documentation
- Development-only configurations

### Workflow Steps

```
1. Agent generates draft
   ↓
2. Agent self-reviews and flags uncertainties
   ↓
3. Human gate: Review
   ↓
4. Human provides feedback (approve/revise)
   ↓
5. If revise: Agent incorporates feedback
   ↓
6. Repeat 3-5 until approved
   ↓
7. Artifact finalized
```

### Draft Markers

Agents MUST mark draft sections clearly:

```markdown
## Section 5: Security Architecture

<!-- DRAFT: Confidence 70% -->
<!-- UNCERTAINTY: Choice between JWT and session-based auth unclear -->

The system will use [JWT/Session] authentication...

<!-- END DRAFT -->
```

### Feedback Format

**REQUIRED** feedback format for revisions:

```markdown
## Revision Feedback

**Overall**: Approve with changes

### Section 5.1: Authentication
- **Issue**: JWT vs Session not decided
- **Guidance**: Use JWT for API, session for web UI
- **Rationale**: API clients are stateless, web needs CSRF protection

### Section 5.3: Data Encryption
- **Issue**: Missing encryption at rest
- **Guidance**: Add AES-256 for PII fields
- **Rationale**: Compliance requirement from SOC2

### General
- Add diagrams for data flow
- Include failure scenarios
```

## Artifact-Specific Patterns

### Architecture Documents

```yaml
hitl_config:
  artifact_type: "architecture"
  gates:
    - type: review
      trigger: "draft_complete"
      reviewers: [tech-lead, security-auditor]
    - type: approval
      trigger: "review_complete"
      approvers: [architect, product-owner]
  draft_iterations: 2-3
  confidence_threshold: 85
```

### Test Plans

```yaml
hitl_config:
  artifact_type: "test-plan"
  gates:
    - type: review
      trigger: "draft_complete"
      reviewers: [qa-lead, developer]
    - type: decision
      trigger: "coverage_tradeoff"
      deciders: [tech-lead]
  draft_iterations: 1-2
  confidence_threshold: 90
```

### Deployment Plans

```yaml
hitl_config:
  artifact_type: "deployment-plan"
  gates:
    - type: review
      trigger: "draft_complete"
      reviewers: [devops, security]
    - type: approval
      trigger: "pre_production"
      approvers: [ops-lead, security-lead]
    - type: override
      trigger: "production_deploy"
      approvers: [release-manager]
  draft_iterations: 2
  confidence_threshold: 95
```

### Security Reviews

```yaml
hitl_config:
  artifact_type: "threat-model"
  gates:
    - type: review
      trigger: "draft_complete"
      reviewers: [security-auditor, architect]
    - type: approval
      trigger: "security_signoff"
      approvers: [security-lead, ciso]
  draft_iterations: 2-3
  confidence_threshold: 90
```

## Best Practices

### For Humans Providing Feedback

1. **Be specific** - Reference exact sections/lines
2. **Explain rationale** - Help agent learn from feedback
3. **Prioritize** - Indicate critical vs nice-to-have changes
4. **Use structured format** - Easier for agent to parse

**Good feedback**:
```
Section 5.2, line 45: Change "might fail" to specific failure modes:
- Network timeout (>30s)
- Authentication failure (401/403)
- Rate limit exceeded (429)

Rationale: Vague failure descriptions lead to inadequate error handling.
Priority: Critical
```

**Poor feedback**:
```
Make it better.
```

### For Agents Producing Drafts

1. **Flag uncertainties** - Mark low-confidence sections
2. **Provide options** - When multiple valid approaches exist
3. **Explain trade-offs** - Help human make informed decisions
4. **Request specific feedback** - Ask targeted questions

**Good draft marking**:
```markdown
<!-- DECISION NEEDED -->
Two approaches for caching:

Option A: Redis
- Pros: Fast, mature, good clustering
- Cons: Additional infrastructure

Option B: In-memory
- Pros: Simple, no dependencies
- Cons: Lost on restart, no sharing

Recommendation: Option A for production, Option B for dev
Please confirm or provide alternative guidance.
<!-- END DECISION -->
```

## Gate History Tracking

All gate interactions are logged:

```yaml
# .aiwg/ralph/gate-history.yaml
gates:
  - id: "gate-001"
    timestamp: "2026-01-25T10:30:00Z"
    type: "review"
    artifact: ".aiwg/architecture/sad.md"
    agent: "architecture-designer"
    action: "revise"
    feedback: "Add security section details"
    human: "jmagly"
    iteration: 1

  - id: "gate-002"
    timestamp: "2026-01-25T11:45:00Z"
    type: "review"
    artifact: ".aiwg/architecture/sad.md"
    agent: "architecture-designer"
    action: "approve"
    feedback: "Looks good, proceed"
    human: "jmagly"
    iteration: 2
```

## Integration with Ralph

### External Ralph Loop

```bash
# Ralph with HITL gates
ralph-external "Design system architecture" \
  --completion "SAD approved" \
  --hitl-gates "review,approval" \
  --max-iterations 5
```

### Gate Timeout

```yaml
gate_timeout:
  review: "24h"
  approval: "48h"
  decision: "4h"
  override: "1h"

timeout_actions:
  - notify_escalation_path
  - extend_deadline
  - auto_abort_with_state_save
```

## Validation Checklist

Before completing HITL-gated workflows:

- [ ] Gate type appropriate for artifact
- [ ] Clear display format with all options
- [ ] Feedback properly structured
- [ ] Draft markers present for uncertainties
- [ ] Gate history tracked
- [ ] Timeout configured
- [ ] Escalation path defined

## References

- @.aiwg/research/findings/REF-057-agent-laboratory.md - Research foundation
- @tools/ralph-external/ - Ralph implementation
- @.aiwg/ralph/ - Ralph state tracking
- @agentic/code/frameworks/sdlc-complete/docs/orchestrator-architecture.md - Workflow integration
- #199 - Human gate UI issue
- #200 - Draft-then-edit pattern issue

---

**Rule Status**: ACTIVE
**Last Updated**: 2026-01-25
