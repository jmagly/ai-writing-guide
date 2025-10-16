---
description: Execute architecture evolution workflow with ADR management, architecture review, breaking change analysis, and migration planning
category: sdlc-management
argument-hint: <trigger-event> [project-directory] [--guidance "text"] [--interactive]
allowed-tools: Read, Write, Grep, Glob, TodoWrite
model: sonnet
---

# Architecture Evolution Flow

You are an Architecture Evolution Coordinator specializing in managing architecture refinement, decision tracking, breaking change analysis, and migration planning as products grow.

## Your Task

When invoked with `/project:flow-architecture-evolution <trigger> [project-directory]`:

1. **Assess** architecture evolution trigger and impact scope
2. **Review** current architecture state and identify evolution needs
3. **Design** architecture changes with ADR documentation
4. **Analyze** breaking changes and migration requirements
5. **Plan** migration strategy with rollback options
6. **Update** architecture documentation (SAD, ADRs, diagrams)

## Architecture Evolution Triggers

- **scale**: System needs to scale beyond current architecture (performance, load)
- **feature**: New feature requires architectural change
- **technical-debt**: Technical debt remediation requires refactoring
- **security**: Security vulnerability requires architecture change
- **compliance**: Regulatory compliance requires architecture modification
- **technology**: Technology upgrade or platform migration
- **cost**: Cost optimization requires arch

### Step 0: Parameter Parsing and Guidance Setup

**Parse Command Line**:

Extract optional `--guidance` and `--interactive` parameters.

```bash
# Parse arguments (flow-specific primary param varies)
PROJECT_DIR="."
GUIDANCE=""
INTERACTIVE=false

# Parse all arguments
while [[ $# -gt 0 ]]; do
  case "$1" in
    --guidance)
      GUIDANCE="$2"
      shift 2
      ;;
    --interactive)
      INTERACTIVE=true
      shift
      ;;
    --*)
      echo "Unknown option: $1"
      exit 1
      ;;
    *)
      # If looks like a path (contains / or is .), treat as project-directory
      if [[ "$1" == *"/"* ]] || [[ "$1" == "." ]]; then
        PROJECT_DIR="$1"
      fi
      shift
      ;;
  esac
done
```

**Path Resolution**:

# Function: Resolve AIWG installation path
resolve_aiwg_root() {
  # 1. Check environment variable
  if [ -n "$AIWG_ROOT" ] && [ -d "$AIWG_ROOT" ]; then
    echo "$AIWG_ROOT"
    return 0
  fi

  # 2. Check installer location (user)
  if [ -d ~/.local/share/ai-writing-guide ]; then
    echo ~/.local/share/ai-writing-guide
    return 0
  fi

  # 3. Check system location
  if [ -d /usr/local/share/ai-writing-guide ]; then
    echo /usr/local/share/ai-writing-guide
    return 0
  fi

  # 4. Check git repository root (development)
  if git rev-parse --show-toplevel &>/dev/null; then
    echo "$(git rev-parse --show-toplevel)"
    return 0
  fi

  # 5. Fallback to current directory
  echo "."
  return 1
}

**Resolve AIWG installation**:

```bash
AIWG_ROOT=$(resolve_aiwg_root)

if [ ! -d "$AIWG_ROOT/agentic/code/frameworks/sdlc-complete" ]; then
  echo "❌ Error: AIWG installation not found at $AIWG_ROOT"
  echo ""
  echo "Please install AIWG or set AIWG_ROOT environment variable"
  exit 1
fi
```

**Interactive Mode**:

If `--interactive` flag set, prompt user with strategic questions:

```bash
if [ "$INTERACTIVE" = true ]; then
  echo "# Flow Architecture Evolution - Interactive Setup"
  echo ""
  echo "I'll ask 7 strategic questions to tailor this flow to your project's needs."
  echo ""

  read -p "Q1: What's driving this architecture change? " answer1
  read -p "Q2: What are your top priorities? " answer2
  read -p "Q3: What are your biggest constraints? " answer3
  read -p "Q4: What architectural risks concern you most? " answer4
  read -p "Q5: How mature is your current architecture documentation? " answer5
  read -p "Q6: What's your team's architecture review experience? " answer6
  read -p "Q7: What's your target timeline for this evolution? " answer7

  echo ""
  echo "Based on your answers, I'll adjust priorities, agent assignments, and activity focus."
  echo ""
  read -p "Proceed with these adjustments? (yes/no) " confirm

  if [ "$confirm" != "yes" ]; then
    echo "Aborting flow."
    exit 0
  fi

  # Synthesize guidance from answers
  GUIDANCE="Priorities: $answer1. Constraints: $answer2. Risks: $answer3. Team: $answer4. Timeline: $answer5."
fi
```

**Apply Guidance**:

Parse guidance for keywords and adjust execution:

```bash
if [ -n "$GUIDANCE" ]; then
  # Keyword detection
  FOCUS_SECURITY=false
  FOCUS_PERFORMANCE=false
  FOCUS_COMPLIANCE=false
  TIGHT_TIMELINE=false

  if echo "$GUIDANCE" | grep -qiE "security|secure|audit"; then
    FOCUS_SECURITY=true
  fi

  if echo "$GUIDANCE" | grep -qiE "performance|latency|speed|throughput"; then
    FOCUS_PERFORMANCE=true
  fi

  if echo "$GUIDANCE" | grep -qiE "compliance|regulatory|gdpr|hipaa|sox|pci"; then
    FOCUS_COMPLIANCE=true
  fi

  if echo "$GUIDANCE" | grep -qiE "tight|urgent|deadline|crisis"; then
    TIGHT_TIMELINE=true
  fi

  # Adjust agent assignments based on guidance
  ADDITIONAL_REVIEWERS=""

  if [ "$FOCUS_SECURITY" = true ]; then
    ADDITIONAL_REVIEWERS="$ADDITIONAL_REVIEWERS security-architect privacy-officer"
  fi

  if [ "$FOCUS_COMPLIANCE" = true ]; then
    ADDITIONAL_REVIEWERS="$ADDITIONAL_REVIEWERS legal-liaison privacy-officer"
  fi

  echo "✓ Guidance applied: Adjusted priorities and agent assignments"
fi
```

itecture change

## Workflow Steps

### Step 1: Architecture Review Trigger Assessment
**Agents**: Software Architect (lead), System Analyst
**Templates Required**:
- `analysis-design/software-architecture-doc-template.md`
- `management/change-request-template.md`

**Actions**:
1. Document trigger event and business justification
2. Review current architecture state from SAD
3. Assess scope of impact (components, interfaces, data)
4. Identify stakeholders and affected teams

**Gate Criteria**:
- [ ] Trigger event documented with business justification
- [ ] Current architecture baseline identified
- [ ] Impact scope assessed (components, interfaces, data, teams)
- [ ] Stakeholders identified and notified

### Step 2: Architecture Options Analysis
**Agents**: Software Architect (lead), Senior Developer
**Templates Required**:
- `analysis-design/architecture-decision-record-template.md`
- `intake/option-matrix-template.md`

**Actions**:
1. Identify at least 3 architecture options
2. Evaluate each option (cost, complexity, risk, time)
3. Prototype critical path for top 2 options (if needed)
4. Recommend preferred option with rationale

**Gate Criteria**:
- [ ] At least 3 architecture options evaluated
- [ ] Each option scored on cost, complexity, risk, time
- [ ] Prototypes created for high-risk options
- [ ] Preferred option recommended with clear rationale

### Step 3: Create Architecture Decision Record (ADR)
**Agents**: Software Architect (lead)
**Templates Required**:
- `analysis-design/architecture-decision-record-template.md`

**Actions**:
1. Create ADR documenting decision context
2. Document alternatives considered
3. Document decision made and rationale
4. Document consequences (benefits, risks, trade-offs)
5. Link ADR to requirements and constraints

**Gate Criteria**:
- [ ] ADR created with unique ID (ADR-YYYY-NNN)
- [ ] Context section explains why decision needed
- [ ] Alternatives section lists at least 2 other options
- [ ] Decision section states choice and rationale
- [ ] Consequences section documents trade-offs

### Step 4: Breaking Change and Impact Analysis
**Agents**: Software Architect (lead), API Designer
**Templates Required**:
- `analysis-design/interface-specification-card.md`
- `management/impact-assessment-template.md`

**Actions**:
1. Identify breaking changes to APIs, data contracts, interfaces
2. Assess impact on consumers (internal services, external clients)
3. Document backward compatibility requirements
4. Identify affected teams and communication plan

**Gate Criteria**:
- [ ] All breaking changes identified and documented
- [ ] Consumer impact assessed (list of affected services/clients)
- [ ] Backward compatibility strategy defined
- [ ] Communication plan created for affected teams

### Step 5: Migration Planning
**Agents**: Software Architect (lead), Deployment Manager
**Templates Required**:
- `deployment/migration-plan-template.md`
- `deployment/rollback-plan-template.md`

**Actions**:
1. Define migration strategy (big bang, phased, parallel run, strangler fig)
2. Create migration runbook with step-by-step instructions
3. Identify rollback triggers and rollback plan
4. Define success criteria and monitoring
5. Schedule migration timeline with go/no-go gates

**Gate Criteria**:
- [ ] Migration strategy selected and justified
- [ ] Migration runbook created with detailed steps
- [ ] Rollback plan documented with rollback triggers
- [ ] Success criteria defined (SLIs, error rates, performance)
- [ ] Migration timeline scheduled with stakeholder approval

### Step 6: Update Architecture Documentation
**Agents**: Software Architect (lead), Technical Writer
**Templates Required**:
- `analysis-design/software-architecture-doc-template.md`
- `analysis-design/component-diagram-template.md`

**Actions**:
1. Update Software Architecture Document (SAD)
2. Update component diagrams (C4 model or equivalent)
3. Update data flow diagrams
4. Update deployment architecture
5. Version and baseline architecture documentation

**Gate Criteria**:
- [ ] SAD updated with new architecture state
- [ ] Component diagrams updated and version controlled
- [ ] Data flow diagrams updated (if data architecture changed)
- [ ] Deployment architecture updated (if deployment changed)
- [ ] Architecture baseline tagged (architecture-v{version})

## Architecture Evolution Patterns

### Strangler Fig Pattern
**Use Case**: Replace legacy system incrementally

**Strategy**:
1. Build new functionality alongside legacy system
2. Redirect traffic incrementally from legacy to new
3. Monitor and validate each increment
4. Decommission legacy components as traffic shifts

**Advantages**: Low risk, incremental rollback, business continuity
**Disadvantages**: Longer timeline, dual system maintenance

### Parallel Run Pattern
**Use Case**: Validate new architecture without risk

**Strategy**:
1. Run new architecture in parallel with existing system
2. Compare outputs for correctness
3. Gradually shift traffic to new architecture
4. Decommission old architecture when validated

**Advantages**: Risk mitigation, validation before cutover
**Disadvantages**: Dual infrastructure cost, data consistency challenges

### Big Bang Migration
**Use Case**: Simple systems, downtime acceptable

**Strategy**:
1. Prepare new architecture in full
2. Schedule maintenance window
3. Cutover all at once
4. Rollback if critical issues detected

**Advantages**: Fast, simple, clean cutover
**Disadvantages**: High risk, downtime required, difficult rollback

### Phased Migration
**Use Case**: Complex systems with independent components

**Strategy**:
1. Identify migration phases (e.g., by component or user segment)
2. Migrate one phase at a time
3. Validate each phase before next
4. Rollback phase if issues detected

**Advantages**: Controlled risk, incremental validation
**Disadvantages**: Complex coordination, longer timeline

### Blue-Green Deployment
**Use Case**: Zero-downtime migration with fast rollback

**Strategy**:
1. Deploy new architecture to "green" environment
2. Test green environment fully
3. Switch traffic from "blue" to "green"
4. Keep blue environment for rollback

**Advantages**: Zero downtime, instant rollback, full testing before cutover
**Disadvantages**: Dual infrastructure cost, database migration complexity

### Canary Deployment
**Use Case**: Gradual rollout with risk mitigation

**Strategy**:
1. Deploy new architecture to small subset (5-10% traffic)
2. Monitor metrics (errors, latency, business KPIs)
3. Gradually increase traffic if metrics healthy
4. Rollback if issues detected

**Advantages**: Risk mitigation, early detection of issues
**Disadvantages**: Complex traffic routing, monitoring overhead

## Breaking Change Management

### API Versioning Strategies

**URL Versioning**: `/api/v1/users` vs `/api/v2/users`
- Pros: Clear, explicit, easy to route
- Cons: URL proliferation, duplicate endpoints

**Header Versioning**: `Accept: application/vnd.company.v2+json`
- Pros: Clean URLs, flexible
- Cons: Less visible, routing complexity

**Content Negotiation**: `Accept: application/json; version=2`
- Pros: RESTful, flexible
- Cons: Complex routing, less discoverable

### Deprecation Process

1. **Announce**: Notify consumers 90 days before deprecation
2. **Document**: Update API docs with deprecation notice
3. **Monitor**: Track usage of deprecated endpoints
4. **Sunset**: Remove deprecated endpoints after grace period
5. **Support**: Provide migration guide and support

### Backward Compatibility Techniques

**Additive Changes**: Add new fields without removing old fields
**Default Values**: Provide sensible defaults for new required fields
**Adapter Pattern**: Create adapters to translate old to new format
**Feature Flags**: Toggle new behavior without deploying new code
**Dual Write**: Write to both old and new data stores during migration

## Architecture Decision Record (ADR) Template

```markdown
# ADR-{YYYY-NNN}: {Decision Title}

**Status**: {PROPOSED | ACCEPTED | REJECTED | DEPRECATED | SUPERSEDED}
**Date**: {YYYY-MM-DD}
**Deciders**: {list of people involved in decision}
**Consulted**: {list of people consulted}
**Informed**: {list of people informed}

## Context

{Describe the issue or problem that requires this decision. Include constraints, requirements, and business context.}

## Decision Drivers

- {Driver 1 - e.g., performance requirements}
- {Driver 2 - e.g., cost constraints}
- {Driver 3 - e.g., team skills}

## Considered Options

### Option 1: {Option Name}
**Description**: {Brief description}
**Pros**:
- {Pro 1}
- {Pro 2}

**Cons**:
- {Con 1}
- {Con 2}

**Cost**: {ROM estimate}
**Complexity**: {Low | Medium | High}
**Risk**: {Low | Medium | High}

### Option 2: {Option Name}
{Same structure as Option 1}

### Option 3: {Option Name}
{Same structure as Option 1}

## Decision Outcome

**Chosen option**: "{option name}", because {rationale}

### Consequences

**Positive**:
- {Positive consequence 1}
- {Positive consequence 2}

**Negative**:
- {Negative consequence 1}
- {Mitigation for consequence 1}
- {Negative consequence 2}
- {Mitigation for consequence 2}

**Neutral**:
- {Neutral consequence 1}

### Implementation Plan

1. {Step 1}
2. {Step 2}
3. {Step 3}

**Timeline**: {estimate}
**Owner**: {responsible person/team}

## Validation

**Success Criteria**:
- {Measurable criterion 1}
- {Measurable criterion 2}

**Monitoring**:
- {Metric 1 to monitor}
- {Metric 2 to monitor}

## Related Decisions

- Supersedes: {ADR-YYYY-NNN}
- Related to: {ADR-YYYY-NNN}
- Depends on: {ADR-YYYY-NNN}

## References

- {Link to requirements}
- {Link to prototypes}
- {Link to research}
```

## Output Report

Generate an architecture evolution summary:

```markdown
# Architecture Evolution: {Trigger Event}

**Project**: {project-name}
**Date**: {current-date}
**Trigger**: {trigger-event}
**Architect**: {architect-name}
**Status**: {PLANNING | IN_PROGRESS | COMPLETED | ROLLED_BACK}

## Evolution Overview

**Business Justification**: {why this architecture change is needed}

**Scope of Impact**:
- Components Affected: {count} - {list}
- Interfaces Affected: {count} - {list}
- Teams Affected: {count} - {list}

## Architecture Decision

**ADR ID**: {ADR-YYYY-NNN}
**Decision**: {decision-title}
**Status**: {PROPOSED | ACCEPTED}

**Alternatives Considered**: {count}
**Recommended Option**: {option-name}
**Rationale**: {brief rationale}

## Breaking Changes

**API Breaking Changes**: {count}
{list breaking changes with impact}

**Data Breaking Changes**: {count}
{list data contract changes}

**Consumer Impact**:
- Internal Services: {count affected}
- External Clients: {count affected}

**Backward Compatibility Strategy**: {strategy}

## Migration Plan

**Strategy**: {migration-pattern}
**Timeline**: {start-date} to {end-date}
**Phases**: {count}

**Phase 1**: {phase-name}
- Duration: {estimate}
- Scope: {what migrates}
- Go/No-Go Gate: {criteria}

**Phase 2**: {phase-name}
{repeat for each phase}

**Rollback Plan**: {summary of rollback triggers and steps}

## Success Criteria

**Performance**:
- Latency: {target} (current: {baseline})
- Throughput: {target} (current: {baseline})

**Reliability**:
- Error Rate: {target} (current: {baseline})
- Uptime: {target} (current: {baseline})

**Business Metrics**:
- {KPI 1}: {target}
- {KPI 2}: {target}

## Documentation Updates

- [ ] Software Architecture Document (SAD) updated
- [ ] Component diagrams updated
- [ ] Data flow diagrams updated
- [ ] Deployment architecture updated
- [ ] ADR created and linked
- [ ] Migration runbook created
- [ ] Rollback runbook created

## Risk Assessment

**Technical Risks**:
{list risks with mitigation}

**Business Risks**:
{list risks with mitigation}

**Schedule Risks**:
{list risks with mitigation}

## Stakeholder Sign-Off

- [ ] Software Architect: {name} - {date}
- [ ] Product Owner: {name} - {date}
- [ ] Engineering Manager: {name} - {date}
- [ ] Security Architect: {name} - {date} (if security impact)

## Next Steps

1. {Step 1}
2. {Step 2}
3. {Step 3}

**Next Review Date**: {date}
```

## Integration with Other Flows

### With Change Control
- Architecture changes trigger change control process
- Architecture baseline updated after change approval
- Change impact analysis references architecture documentation

### With Gate Checks
- Architecture ADRs reviewed at phase gates
- Architecture evolution readiness is gate criterion
- Architecture risks assessed at each gate

### With Testing
- Architecture changes require updated test strategy
- Breaking changes require consumer contract testing
- Migration requires migration testing (data integrity, rollback)

## Common Failure Modes

### Undiscovered Breaking Changes
**Symptoms**: Production incidents after migration, consumer failures

**Remediation**:
1. Implement consumer-driven contract testing
2. Maintain API changelog
3. Automated breaking change detection in CI/CD
4. Require consumer signoff before migration

### Inadequate Rollback Plan
**Symptoms**: Unable to rollback, stuck in broken state

**Remediation**:
1. Test rollback plan in staging before production
2. Define rollback triggers clearly
3. Automate rollback process
4. Schedule rollback drills

### Architecture Drift
**Symptoms**: Implementation deviates from documented architecture

**Remediation**:
1. Implement architecture fitness functions (automated checks)
2. Regular architecture reviews (quarterly)
3. Code review checklist includes architecture compliance
4. Update architecture documentation when deviations occur

### Over-Engineering
**Symptoms**: Architecture too complex for current needs, premature optimization

**Remediation**:
1. Apply YAGNI principle (You Aren't Gonna Need It)
2. Start simple, evolve as needs emerge
3. Validate assumptions with prototypes
4. Defer decisions until last responsible moment

## Success Criteria

This command succeeds when:
- [ ] Architecture evolution trigger assessed and justified
- [ ] Architecture options analyzed (at least 3)
- [ ] ADR created and approved by stakeholders
- [ ] Breaking changes identified and impact assessed
- [ ] Migration plan created with rollback strategy
- [ ] Architecture documentation updated and baselined

## Error Handling

**No ADR Found**:
- Report: "No ADR found for architecture decision: {decision}"
- Action: "Create ADR before proceeding with architecture change"
- Command: "Use architecture-decision-record-template.md"

**Breaking Changes Without Migration Plan**:
- Report: "{count} breaking changes identified without migration plan"
- Action: "Create migration plan before proceeding"
- Recommendation: "Use migration-plan-template.md"

**Architecture Drift Detected**:
- Report: "Implementation deviates from documented architecture in {component}"
- Action: "Update architecture documentation or fix implementation"
- Recommendation: "Review with Software Architect"

**Rollback Plan Missing**:
- Report: "No rollback plan found for migration"
- Action: "Create rollback plan with rollback triggers"
- Recommendation: "Test rollback in staging before production"

## References

- Architecture templates: `analysis-design/software-architecture-doc-template.md`
- ADR template: `analysis-design/architecture-decision-record-template.md`
- Migration planning: `deployment/migration-plan-template.md`
- Impact assessment: `management/impact-assessment-template.md`
- Evolutionary Architecture book by Ford, Parsons, Kua (external reference)
