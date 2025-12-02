# Simple Language Translations

**Purpose**: Map natural language user requests to SDLC flow orchestration templates.

## Core Principle

**Users don't type slash commands. They use natural language.**

As the core orchestrator, you interpret user intent and map it to appropriate flow templates, then coordinate multi-agent workflows.

## Translation Patterns

### Phase Transitions

| User Says | Intent | Flow Template | Expected Duration |
|-----------|--------|---------------|-------------------|
| "Let's transition to Elaboration" | Start Inception→Elaboration | `flow-inception-to-elaboration` | 15-20 min |
| "Move to Elaboration" | Same as above | `flow-inception-to-elaboration` | 15-20 min |
| "Start Elaboration phase" | Same as above | `flow-inception-to-elaboration` | 15-20 min |
| "Transition to Construction" | Start Elaboration→Construction | `flow-elaboration-to-construction` | 10-15 min |
| "Begin Construction" | Same as above | `flow-elaboration-to-construction` | 10-15 min |
| "Move to Transition phase" | Start Construction→Transition | `flow-construction-to-transition` | 10-15 min |
| "Ready to deploy" | Same as above | `flow-construction-to-transition` | 10-15 min |
| "Start Inception" | Concept→Inception | `flow-concept-to-inception` | 10-15 min |
| "Begin the project" | Same as above | `flow-concept-to-inception` | 10-15 min |

### Workflow Requests

| User Says | Intent | Flow Template | Expected Duration |
|-----------|--------|---------------|-------------------|
| "Run iteration {N}" | Execute dual-track iteration | `flow-iteration-dual-track` | 20-30 min |
| "Start iteration {N}" | Same as above | `flow-iteration-dual-track` | 20-30 min |
| "Discovery for iteration {N}" | Discovery track only | `flow-discovery-track` | 10-15 min |
| "Delivery for iteration {N}" | Delivery track only | `flow-delivery-track` | 10-15 min |
| "Deploy to production" | Production deployment | `flow-deploy-to-production` | 15-20 min |
| "Start deployment" | Same as above | `flow-deploy-to-production` | 15-20 min |
| "Run hypercare" | Post-launch monitoring | `flow-hypercare-monitoring` | 5-10 min setup |
| "Start monitoring" | Same as above | `flow-hypercare-monitoring` | 5-10 min setup |

### Review Cycles

| User Says | Intent | Flow Template | Expected Duration |
|-----------|--------|---------------|-------------------|
| "Start security review" | Security validation cycle | `flow-security-review-cycle` | 15-20 min |
| "Run security check" | Same as above | `flow-security-review-cycle` | 15-20 min |
| "Validate security" | Same as above | `flow-security-review-cycle` | 15-20 min |
| "Run tests" | Execute test strategy | `flow-test-strategy-execution` | 10-15 min |
| "Execute test suite" | Same as above | `flow-test-strategy-execution` | 10-15 min |
| "Validate tests" | Same as above | `flow-test-strategy-execution` | 10-15 min |
| "Check compliance" | Compliance validation | `flow-compliance-validation` | 15-20 min |
| "Validate {framework} compliance" | Same as above | `flow-compliance-validation` | 15-20 min |
| "Performance review" | Performance optimization | `flow-performance-optimization` | 10-15 min |
| "Optimize performance" | Same as above | `flow-performance-optimization` | 10-15 min |

### Artifact Generation

| User Says | Intent | Action | Expected Duration |
|-----------|--------|--------|-------------------|
| "Create architecture baseline" | Generate SAD + ADRs | Extract from `flow-inception-to-elaboration` Step 3 | 10-15 min |
| "Generate SAD" | Software Architecture Document | Extract from `flow-inception-to-elaboration` Step 3 | 8-10 min |
| "Create ADRs" | Architecture Decision Records | Extract from `flow-inception-to-elaboration` Step 3 | 5-8 min |
| "Build test plan" | Master Test Plan | Extract from `flow-elaboration-to-construction` | 8-10 min |
| "Create deployment plan" | Deployment planning | Extract from `flow-construction-to-transition` | 8-10 min |
| "Generate risk register" | Initial risk list | Already done in intake, or `flow-risk-management-cycle` | 5-8 min |

### Status and Gates

| User Says | Intent | Flow Template | Expected Duration |
|-----------|--------|---------------|-------------------|
| "Where are we?" | Project status | `project-status` | Instant |
| "What's next?" | Same as above | `project-status` | Instant |
| "Check project status" | Same as above | `project-status` | Instant |
| "Can we transition?" | Gate check | `flow-gate-check {phase}` | 2-3 min |
| "Are we ready for {phase}?" | Same as above | `flow-gate-check {phase}` | 2-3 min |
| "Validate gate criteria" | Same as above | `flow-gate-check {phase}` | 2-3 min |
| "Check handoff" | Handoff validation | `flow-handoff-checklist` | 3-5 min |
| "Validate handoff" | Same as above | `flow-handoff-checklist` | 3-5 min |

### Risk and Change Management

| User Says | Intent | Flow Template | Expected Duration |
|-----------|--------|---------------|-------------------|
| "Update risks" | Risk management cycle | `flow-risk-management-cycle` | 8-10 min |
| "Review risks" | Same as above | `flow-risk-management-cycle` | 8-10 min |
| "Manage risks" | Same as above | `flow-risk-management-cycle` | 8-10 min |
| "Submit change request" | Change control | `flow-change-control` | 5-8 min |
| "Process change" | Same as above | `flow-change-control` | 5-8 min |
| "Evolve architecture" | Architecture evolution | `flow-architecture-evolution` | 10-15 min |
| "Update architecture" | Same as above | `flow-architecture-evolution` | 10-15 min |
| "Refine requirements" | Requirements evolution | `flow-requirements-evolution` | 8-10 min |
| "Update requirements" | Same as above | `flow-requirements-evolution` | 8-10 min |

### Team Coordination

| User Says | Intent | Flow Template | Expected Duration |
|-----------|--------|---------------|-------------------|
| "Onboard {name}" | Team member onboarding | `flow-team-onboarding` | 10-15 min |
| "Add team member" | Same as above | `flow-team-onboarding` | 10-15 min |
| "Knowledge transfer" | Knowledge transfer workflow | `flow-knowledge-transfer` | 10-15 min |
| "Handoff to {name}" | Same as above | `flow-knowledge-transfer` | 10-15 min |
| "Sync with {team}" | Cross-team coordination | `flow-cross-team-sync` | 8-10 min |
| "Coordinate teams" | Same as above | `flow-cross-team-sync` | 8-10 min |
| "Run retrospective" | Retrospective cycle | `flow-retrospective-cycle` | 10-15 min |
| "Hold retro" | Same as above | `flow-retrospective-cycle` | 10-15 min |

### Incident and Operations

| User Says | Intent | Flow Template | Expected Duration |
|-----------|--------|---------------|-------------------|
| "Handle incident" | Incident response | `flow-incident-response` | 15-20 min |
| "Respond to incident" | Same as above | `flow-incident-response` | 15-20 min |
| "Production issue" | Same as above | `flow-incident-response` | 15-20 min |

## Interpretation Guidelines

### 1. Context Awareness

**Consider current project phase** when interpreting ambiguous requests:

```python
# Example logic for "start"
if user_says("start") and current_phase == "Inception Ready":
    → flow-concept-to-inception
elif user_says("start") and current_phase == "Inception Active":
    → Clarify: "Start what? (Elaboration transition, security review, risk management)"
elif user_says("start") and has_recent_incident:
    → flow-incident-response
```

### 2. Clarification When Needed

**Ask for clarification** if intent is ambiguous:

```
User: "Run security"
You: "I can help with security. Did you mean:
  1. Start security review cycle (flow-security-review-cycle)
  2. Run security gate check (flow-gate-check)
  3. Something else?"
```

### 3. Extract Parameters

**Parse relevant parameters** from natural language:

```
User: "Run iteration 5 with focus on performance"
You interpret:
  - Flow: flow-iteration-dual-track
  - Parameter: iteration=5
  - Guidance: "focus on performance"
```

### 4. Offer Guidance Mode

**Suggest --guidance or --interactive** for complex requests:

```
User: "Start security review"
You: "I'll orchestrate a security review cycle. This will take ~15-20 minutes.

Would you like to:
  1. Proceed with standard security review
  2. Provide guidance upfront (--guidance: priorities, constraints, focus)
  3. Interactive mode (I'll ask 5-8 strategic questions)

[If no response in 3 seconds, proceed with #1]"
```

## Response Patterns

### Confirmation Pattern

**Always confirm understanding** before starting orchestration:

```
User: "Let's transition to Elaboration"

You: "Understood. I'll orchestrate the Inception → Elaboration transition.

This will generate:
- Software Architecture Document (SAD)
- Architecture Decision Records (3-5 ADRs)
- Master Test Plan
- Elaboration Phase Plan

I'll coordinate multiple agents for comprehensive review.
Expected duration: 15-20 minutes.

Starting orchestration...
```

### Progress Update Pattern

**Update user throughout** with clear indicators:

```
✓ = Complete
⏳ = In progress
❌ = Error/blocked
⚠️ = Warning/attention needed

Example:
✓ Initialized workspaces
⏳ SAD Draft (Architecture Designer)...
✓ SAD v0.1 draft complete (3,245 words)
⏳ Launching parallel review (4 agents)...
```

### Completion Pattern

**Summarize results** with actionable next steps:

```
─────────────────────────────────────────────
Transition Complete ✓
─────────────────────────────────────────────

Generated Artifacts:
✓ Software Architecture Document (.aiwg/architecture/software-architecture-doc.md)
✓ ADR-001: Database Selection (.aiwg/architecture/adr/ADR-001-database-selection.md)
✓ ADR-002: API Architecture (.aiwg/architecture/adr/ADR-002-api-architecture.md)
✓ Master Test Plan (.aiwg/testing/master-test-plan.md)
✓ Elaboration Phase Plan (.aiwg/planning/phase-plan-elaboration.md)

Review Status: All artifacts reviewed and APPROVED by responsible roles

Next Steps:
- Review generated artifacts
- Run "check if we can transition" to validate Elaboration readiness
- Begin Elaboration activities per phase plan
```

## Special Cases

### Intake Requests

| User Says | Intent | Action |
|-----------|--------|--------|
| "Start new project" | Begin intake | `intake-wizard` with interactive mode |
| "Analyze codebase" | Generate intake from code | `intake-from-codebase` |
| "Complete intake" | Validate and start Inception | `intake-start` |

### Health and Status

| User Says | Intent | Action |
|-----------|--------|--------|
| "Project health" | Overall health check | `project-health-check` |
| "Build report" | Artifact index | `build-artifact-index` |
| "Check traceability" | Verify traceability | `check-traceability` |

### PoC and Spikes

| User Says | Intent | Action |
|-----------|--------|--------|
| "Build PoC for {concept}" | Create proof of concept | `build-poc` |
| "Validate {technical-risk}" | Same as above | `build-poc` |
| "Spike {feature}" | Same as above | `build-poc` |

### Help and Troubleshooting

| User Says | Intent | Action |
|-----------|--------|--------|
| "Help with AIWG" | General help | `aiwg-kb "help"` |
| "How do I fix {issue}?" | Troubleshooting | `aiwg-kb "{issue}"` |
| "AIWG not working" | Setup troubleshooting | `aiwg-kb "setup issues"` |
| "Agent not found" | Deployment troubleshooting | `aiwg-kb "deployment issues"` |
| "Template not found" | Path troubleshooting | `aiwg-kb "path issues"` |
| "Why can't Claude find {x}?" | Troubleshooting | `aiwg-kb "deployment issues"` |
| "{Platform} not working" | Platform troubleshooting | `aiwg-kb "platform issues"` |
| "What commands can I use?" | Natural language reference | `aiwg-kb "natural language"` |
| "How do I start?" | Quickstart | `aiwg-kb "quickstart"` |
| "AIWG documentation" | Documentation | `aiwg-kb "help"` |

## Regex Patterns (For Implementation)

If implementing pattern matching, use these regex patterns:

```python
PHASE_TRANSITIONS = {
    r"(transition|move|start|begin).*(elaboration)": "flow-inception-to-elaboration",
    r"(transition|move|start|begin).*(construction)": "flow-elaboration-to-construction",
    r"(transition|move|start|begin).*(transition)": "flow-construction-to-transition",
}

WORKFLOWS = {
    r"(run|start|execute).*(iteration|sprint)\s*(\d+)": "flow-iteration-dual-track",
    r"(deploy|deployment|release).*(production|prod)": "flow-deploy-to-production",
    r"(security|sec).*(review|check|validate)": "flow-security-review-cycle",
}

STATUS = {
    r"(where|what).*(are we|next|status)": "project-status",
    r"(can|ready).*(transition|move|proceed)": "flow-gate-check",
}

HELP = {
    r"(help|fix|problem|issue|error).*(aiwg|install|setup)": "aiwg-kb setup",
    r"(agent|command).*(not found|missing|can't find)": "aiwg-kb deployment",
    r"(template|path|directory).*(not found|missing|error)": "aiwg-kb path",
    r"(claude|factory|warp).*(not working|issue|problem)": "aiwg-kb platform",
    r"(how|what).*(start|begin|commands?)": "aiwg-kb quickstart",
    r"(help|documentation|docs).*aiwg": "aiwg-kb help",
}
```

## Examples

### Example 1: Clear Intent

```
User: "Let's transition to Elaboration"

Intent: Phase transition (clear)
Flow: flow-inception-to-elaboration
Parameters: None
Guidance: None

Action: Confirm and orchestrate
```

### Example 2: Needs Clarification

```
User: "Start"

Intent: Ambiguous
Current Phase: Inception Active

Response: "What would you like to start?
  - Elaboration transition (if Inception complete)
  - Security review cycle
  - Risk management cycle
  - Specific artifact generation"
```

### Example 3: Extract Guidance

```
User: "Run security review with focus on authentication and HIPAA compliance"

Intent: Security review cycle
Flow: flow-security-review-cycle
Parameters: None
Guidance: "Focus on authentication and HIPAA compliance"

Action: Confirm and orchestrate with guidance
```

### Example 4: Interactive Suggestion

```
User: "Create architecture baseline"

Intent: Generate SAD + ADRs
Flow: Extract from flow-inception-to-elaboration Step 3

Response: "I'll generate the architecture baseline (SAD + ADRs).

This is a comprehensive artifact. Would you like:
  1. Standard generation (15 min)
  2. Provide guidance first (priorities, constraints)
  3. Interactive mode (I'll ask 7 questions)

[Default to #1 if no response]"
```

## Natural Language Command Reference

**Full list of recognized phrases by category:**

### Phase Work
- "transition to {phase}" | "move to {phase}" | "start {phase}"
- "run iteration {N}" | "start iteration {N}"
- "deploy to production" | "start deployment"

### Reviews and Validation
- "security review" | "run security" | "validate security"
- "run tests" | "execute tests" | "test suite"
- "check compliance" | "validate compliance"
- "performance review" | "optimize performance"

### Artifacts
- "create {artifact}" | "generate {artifact}" | "build {artifact}"
- "architecture baseline" | "SAD" | "ADRs"
- "test plan" | "deployment plan" | "risk register"

### Status
- "where are we" | "what's next" | "project status"
- "can we transition" | "ready for {phase}" | "check gate"

### Team and Process
- "onboard {name}" | "add team member"
- "knowledge transfer" | "handoff to {name}"
- "retrospective" | "retro" | "hold retro"

### Operations
- "incident" | "production issue" | "handle incident"
- "hypercare" | "monitoring" | "post-launch"

## Implementation Notes

1. **Pattern Matching**: Use fuzzy matching (not exact), prioritize recent context
2. **Default to Safety**: If unsure, ask for clarification rather than guessing
3. **Learn Over Time**: Track which phrases users use most, adapt patterns
4. **Context Stack**: Maintain conversation context to resolve "it", "that", "same"
5. **Abbreviations**: Support common abbreviations (e.g., "sec review", "perf test")

## Testing

**Test scenarios for validation:**

```
✓ "transition to Elaboration" → flow-inception-to-elaboration
✓ "run security review" → flow-security-review-cycle
✓ "where are we" → project-status
✓ "can we move forward" + (context: Inception) → flow-gate-check inception
✓ "start" + (phase: Pre-Inception) → intake-wizard
✓ "run iteration 5 with performance focus" → flow-iteration-dual-track (iteration=5, guidance="performance focus")
```
