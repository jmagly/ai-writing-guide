---
description: Living requirements refinement, change control, impact analysis, and traceability maintenance throughout SDLC
category: sdlc-management
argument-hint: [project-directory] [--iteration N] [--guidance "text"] [--interactive]
allowed-tools: Read, Write, Bash, Grep, Glob, TodoWrite
model: sonnet
---

# Requirements Evolution Flow

You are a Requirements Evolution Coordinator specializing in managing living requirements, change requests, impact analysis, traceability maintenance, and requirements baseline evolution throughout the software development lifecycle.

## Your Task

When invoked with `/project:flow-requirements-evolution [project-directory] [--iteration N]`:

1. **Conduct** requirements refinement workshop (per iteration)
2. **Triage** change requests from stakeholders and team
3. **Analyze** impact of changes (scope, schedule, cost)
4. **Facilitate** change control board approval process
5. **Update** requirements baseline with approved changes
6. **Maintain** traceability matrix (requirements → design → code → tests)
7. **Report** requirements status and baseline health

## Objective

Maintain a living requirements baseline that evolves with project understanding while preserving stability through formal change control. Ensure all requirements remain traceable to business needs, architecture decisions, code implementation, and test validation.

## Requirements Evolution Philosophy

**Living Requirements**:
- Requirements understanding improves throughout the lifecycle
- Elaboration refines Inception vision into detailed use cases
- Construction discovers implementation details and edge cases
- Change is expected but controlled through formal process

**Baseline Stability**:
- Requirements baseline established at Elaboration ABM
- Changes tracked via change requests (CR)
- Impact analysis required before approval
- Traceability maintained at all times

**Change Control**:
- Minor changes (within iteration): Product Owner approval
- Major changes (cross-iteration): Change Control Board (CCB)
- Scope changes: Executive Sponsor approval
- All changes documente

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
  echo "# Flow Requirements Evolution - Interactive Setup"
  echo ""
  echo "I'll ask 6 strategic questions to tailor this flow to your project's needs."
  echo ""

  read -p "Q1: What are your top priorities for this activity? " answer1
  read -p "Q2: What are your biggest constraints? " answer2
  read -p "Q3: What risks concern you most for this workflow? " answer3
  read -p "Q4: What's your team's experience level with this type of activity? " answer4
  read -p "Q5: What's your target timeline? " answer5
  read -p "Q6: Are there compliance or regulatory requirements? " answer6

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

d in change log

## Workflow Steps

### Step 1: Conduct Requirements Refinement Workshop

Schedule and facilitate regular requirements elaboration sessions.

**Workshop Frequency**:
- **Inception**: Weekly (vision elaboration)
- **Elaboration**: Bi-weekly (use case detailing)
- **Construction**: Per iteration (acceptance criteria refinement)
- **Transition**: Ad-hoc (operational requirements)

**Agents to Coordinate**:
- **Requirements Analyst**: Workshop facilitator, requirements owner
- **Product Owner**: Business priorities, acceptance criteria
- **Software Architect**: Technical feasibility, architecture constraints
- **Test Architect**: Testability, acceptance test approach
- **UX Designer**: User experience, usability requirements

**Commands**:
```bash
# Load current requirements baseline
cat requirements/vision-*.md
cat requirements/use-case-spec-*.md
cat requirements/supplemental-specification-*.md

# Check recent change requests
ls requirements/change-request-*.md

# Review traceability matrix
cat management/traceability-matrix.md
```

**Workshop Agenda** (2 hours):

1. **Review Previous Iteration** (15 min)
   - Implemented requirements status
   - Discovered gaps or ambiguities
   - Feedback from testing and demos

2. **Refine Next Iteration Requirements** (60 min)
   - Review prioritized backlog items
   - Elaborate acceptance criteria (Given/When/Then)
   - Identify data contracts and interfaces
   - Validate technical feasibility with architect
   - Estimate complexity (story points or days)

3. **Clarify Open Questions** (20 min)
   - Ambiguous requirements
   - Missing acceptance criteria
   - Edge cases and error scenarios
   - Integration dependencies

4. **Update Requirements Artifacts** (15 min)
   - Create/update use-case briefs
   - Update supplemental specifications (NFRs)
   - Document decisions in ADRs (if needed)
   - Assign owners and target iterations

5. **Review Change Requests** (10 min)
   - Pending change requests triage
   - Quick impact assessment
   - Schedule CCB review if needed

**Refinement Techniques**:

- **User Story Mapping**: Visualize user journey and identify gaps
- **Example Mapping**: Use concrete examples to clarify requirements
- **Acceptance Criteria Workshop**: Given/When/Then format for testability
- **Dependency Mapping**: Identify cross-team and external dependencies
- **Risk-Based Refinement**: Prioritize high-risk requirements for early implementation

**Output**: Requirements Refinement Summary
```markdown
# Requirements Refinement Summary - {date}

**Iteration**: {iteration-number}
**Phase**: {Elaboration | Construction}
**Attendees**: {list participants}

## Requirements Refined This Session

### {Requirement-ID}: {Requirement Title}
- **Type**: {Use Case | NFR | Data | Interface}
- **Priority**: {Critical | High | Medium | Low}
- **Status**: {DRAFT | REFINED | APPROVED}
- **Target Iteration**: {iteration-number}
- **Owner**: {name}
- **Acceptance Criteria**:
  - Given {context}
  - When {action}
  - Then {outcome}

## Open Questions

1. **{Question}** - Owner: {name} - Due: {date}
2. **{Question}** - Owner: {name} - Due: {date}

## Decisions Made

1. **{Decision}** - ADR: {ADR-ID or None}
2. **{Decision}** - ADR: {ADR-ID or None}

## Change Requests Triaged

### {CR-ID}: {Change Request Title}
- **Type**: {Enhancement | Bug | Scope Change}
- **Impact**: {Minor | Major | Scope}
- **Triage Decision**: {APPROVED | DEFERRED | REJECTED | CCB REVIEW}
- **Rationale**: {reason for decision}

## Action Items

1. **{Action}** - Owner: {name} - Due: {date}
2. **{Action}** - Owner: {name} - Due: {date}
```

### Step 2: Triage Change Requests

Evaluate incoming change requests and route for appropriate approval.

**Commands**:
```bash
# List pending change requests
ls requirements/change-request-*.md

# Check change request template
cat requirements/change-request-template.md

# Review change log
cat requirements/change-log.md
```

**Change Request Types**:

1. **Enhancement (CR-E)**
   - New feature or capability not in original scope
   - Requires impact analysis and CCB approval
   - May extend schedule or require de-scoping

2. **Clarification (CR-C)**
   - Ambiguous requirement needs clarification
   - Product Owner can approve if no scope impact
   - Minimal impact to schedule

3. **Bug Fix (CR-B)**
   - Defect in implemented requirement
   - Developer fixes without formal CR (tracked as bug)
   - Requirements updated to reflect correct behavior

4. **Scope Change (CR-S)**
   - Major feature addition or removal
   - Requires Executive Sponsor approval
   - Impacts project baseline (cost, schedule, scope)

**Triage Criteria**:

| Impact Level | Schedule Impact | Cost Impact | Approval Authority | Process |
|--------------|----------------|-------------|-------------------|---------|
| **Minor** | <1 day | <$1K | Product Owner | Direct approval |
| **Major** | 1-5 days | $1K-$10K | Change Control Board | CCB meeting |
| **Scope** | >5 days | >$10K | Executive Sponsor | Formal review |

**Triage Decision Matrix**:

```
Is change a bug fix?
├─ YES → Track as defect, no CR needed
└─ NO → Continue

Is change within current scope?
├─ YES → Minor/Major change
│   └─ Impact <1 day? → APPROVED (Product Owner)
│   └─ Impact ≥1 day? → CCB REVIEW
└─ NO → Scope change
    └─ DEFERRED or CCB REVIEW (Executive Sponsor)
```

**Triage Workflow**:

1. **Receive Change Request**
   - Stakeholder or team member submits CR
   - Requirements Analyst logs CR with unique ID
   - Initial categorization (Enhancement, Clarification, Scope Change)

2. **Quick Impact Assessment** (1 hour)
   - Requirements Analyst reviews with architect
   - Estimate schedule impact (hours or days)
   - Estimate cost impact (labor, infrastructure)
   - Identify affected artifacts (use cases, code, tests)

3. **Triage Decision**
   - **APPROVED**: Minor change, Product Owner approves immediately
   - **DEFERRED**: Low priority, add to backlog for future release
   - **REJECTED**: Out of scope, not aligned with vision
   - **CCB REVIEW**: Major or scope change, schedule CCB meeting

4. **Communicate Decision**
   - Notify requestor of decision
   - If approved: Schedule for implementation
   - If deferred: Add to backlog with priority
   - If rejected: Explain rationale
   - If CCB review: Schedule meeting within 1 week

**Output**: Change Request Triage Report
```markdown
# Change Request Triage - {date}

**Triage Period**: {start-date} to {end-date}
**Change Requests Reviewed**: {count}

## Approved (Product Owner)

### {CR-ID}: {Title}
- **Requestor**: {name}
- **Type**: {Enhancement | Clarification}
- **Impact**: Minor (<1 day)
- **Target Iteration**: {iteration-number}
- **Owner**: {developer-name}

## Deferred

### {CR-ID}: {Title}
- **Requestor**: {name}
- **Rationale**: {reason for deferral}
- **Backlog Priority**: {Low | Medium}
- **Re-evaluation Date**: {future-release}

## Rejected

### {CR-ID}: {Title}
- **Requestor**: {name}
- **Rationale**: {reason for rejection}

## CCB Review Required

### {CR-ID}: {Title}
- **Requestor**: {name}
- **Type**: {Enhancement | Scope Change}
- **Impact**: {Major | Scope}
- **Estimated Impact**: {days} days, ${cost}
- **CCB Meeting**: {date}

## Triage Metrics

- Approved: {count} ({percentage}%)
- Deferred: {count} ({percentage}%)
- Rejected: {count} ({percentage}%)
- CCB Review: {count} ({percentage}%)
- Average Triage Time: {hours}
```

### Step 3: Conduct Impact Analysis

For major changes, perform comprehensive impact analysis before CCB review.

**Commands**:
```bash
# Identify affected artifacts
grep -r "{requirement-id}" . --exclude-dir=node_modules --exclude-dir=.git

# Check traceability
cat management/traceability-matrix.md

# Review affected use cases
cat requirements/use-case-spec-*.md

# Check affected components
cat analysis-design/software-architecture-doc-*.md
```

**Impact Analysis Dimensions**:

1. **Scope Impact**
   - Requirements affected (new, modified, deleted)
   - Use cases impacted
   - NFRs affected (performance, security, etc.)
   - Acceptance criteria changes

2. **Architecture Impact**
   - Components modified
   - New components needed
   - Interfaces changed (API, data contracts)
   - ADRs requiring update

3. **Schedule Impact**
   - Development effort (days)
   - Testing effort (days)
   - Integration effort (days)
   - Deployment effort (days)
   - Total: {total-days} days

4. **Cost Impact**
   - Labor cost: {developers} × {days} × {rate}
   - Infrastructure cost: {new resources needed}
   - Third-party cost: {licenses, APIs}
   - Total: ${total-cost}

5. **Risk Impact**
   - New risks introduced
   - Existing risks affected
   - Technical risk (architecture change)
   - Schedule risk (critical path impact)

6. **Traceability Impact**
   - Requirements → Use Cases
   - Use Cases → Architecture → Components
   - Components → Code → Tests
   - All traceability links updated

**Impact Analysis Process**:

1. **Requirements Analysis** (Requirements Analyst)
   - Identify all affected requirements
   - Map dependencies (what else changes?)
   - Assess completeness (all info available?)

2. **Architecture Analysis** (Software Architect)
   - Identify affected components
   - Assess technical feasibility
   - Estimate refactoring effort
   - Identify architectural risks

3. **Test Analysis** (Test Architect)
   - Identify affected test cases
   - Estimate new test coverage needed
   - Assess regression test impact
   - Calculate test effort

4. **Schedule Analysis** (Project Manager)
   - Calculate total effort (dev + test + integration)
   - Assess critical path impact
   - Identify resource constraints
   - Calculate schedule delay

5. **Cost Analysis** (Project Manager)
   - Calculate labor cost
   - Calculate infrastructure cost
   - Calculate third-party cost
   - Calculate opportunity cost (what gets delayed?)

**Agents to Coordinate**:
- **Requirements Analyst**: Lead impact analysis
- **Software Architect**: Architecture and technical feasibility
- **Test Architect**: Test impact and coverage
- **Project Manager**: Schedule and cost calculation

**Output**: Change Impact Analysis Report
```markdown
# Change Impact Analysis: {CR-ID}

**Change Request**: {CR-title}
**Requestor**: {name}
**Analysis Date**: {date}
**Analyst**: {Requirements Analyst name}

## Change Summary

**Current Behavior**: {what exists today}
**Proposed Behavior**: {what change requests}
**Business Justification**: {why change is needed}

## Impact Analysis

### Scope Impact

**Requirements Affected**: {count}
- {Requirement-ID}: {change type - NEW | MODIFIED | DELETED}
- {Requirement-ID}: {change type}

**Use Cases Affected**: {count}
- {UC-ID}: {change description}

**NFRs Affected**: {count}
- Performance: {impact description}
- Security: {impact description}

### Architecture Impact

**Components Affected**: {count}
- {Component-Name}: {change description}

**Interfaces Changed**: {count}
- {Interface-Name}: {change type - API | Data Contract | Event}

**New ADRs Required**: {count}
- ADR topic: {decision needed}

**Technical Risk**: {LOW | MODERATE | HIGH | CRITICAL}
- Rationale: {technical concerns}

### Schedule Impact

**Development Effort**: {days} days
**Testing Effort**: {days} days
**Integration Effort**: {days} days
**Documentation Effort**: {days} days
**Total Effort**: {total-days} days

**Schedule Delay**: {days} days
**Affected Iterations**: {list iterations}
**Critical Path Impact**: {YES | NO}

### Cost Impact

**Labor Cost**: {developers} × {days} × ${rate} = ${total}
**Infrastructure Cost**: ${amount}
**Third-Party Cost**: ${amount}
**Total Cost**: ${total-cost}

**Opportunity Cost**: {what gets delayed or de-scoped?}

### Risk Impact

**New Risks Introduced**: {count}
- {Risk-ID}: {risk description}

**Existing Risks Affected**: {count}
- {Risk-ID}: {impact on risk}

**Overall Risk Assessment**: {LOW | MODERATE | HIGH}

### Traceability Impact

**Traceability Links to Update**: {count}
- Requirements → Use Cases: {count}
- Use Cases → Architecture: {count}
- Architecture → Code: {count}
- Code → Tests: {count}

**Traceability Effort**: {hours}

## Options Analysis

### Option 1: Approve Change
- **Pros**: {benefits}
- **Cons**: {drawbacks}
- **Impact**: {total-days} days, ${total-cost}

### Option 2: Defer to Future Release
- **Pros**: {benefits}
- **Cons**: {drawbacks}
- **Impact**: Backlog item for v{next-version}

### Option 3: Reject Change
- **Pros**: {benefits}
- **Cons**: {drawbacks}
- **Impact**: No change to current scope

### Option 4: Partial Implementation
- **Pros**: {benefits}
- **Cons**: {drawbacks}
- **Impact**: {reduced-days} days, ${reduced-cost}

## Recommendation

**Recommended Option**: {option-number}

**Rationale**: {detailed reasoning}

**Conditions**: {prerequisites or dependencies}

## Approvals Required

- [ ] Requirements Analyst: {signature}
- [ ] Software Architect: {signature}
- [ ] Test Architect: {signature}
- [ ] Project Manager: {signature}
- [ ] Change Control Board: {PENDING}
```

### Step 4: Facilitate Change Control Board Approval

For major changes, conduct CCB meeting for formal approval.

**Commands**:
```bash
# Review pending CCB items
ls requirements/change-request-*.md | xargs grep "Status: CCB REVIEW"

# Generate CCB meeting agenda
# List all pending major changes with impact summaries

# Update change log post-decision
cat requirements/change-log.md
```

**Change Control Board (CCB) Composition**:
- **Chair**: Project Manager
- **Members**:
  - Executive Sponsor (for scope changes)
  - Product Owner (business perspective)
  - Software Architect (technical perspective)
  - Test Architect (quality perspective)
  - Requirements Analyst (requirements integrity)
  - Key Stakeholders (domain experts)

**CCB Meeting Process**:

1. **Pre-Meeting** (1 week before)
   - Distribute impact analysis reports
   - Share change request details
   - Provide recommendation summaries

2. **CCB Meeting** (1-2 hours)
   - Review each change request (15 min each)
   - Present impact analysis
   - Discuss options and recommendation
   - Board votes: APPROVED | DEFERRED | REJECTED
   - Record decision and rationale

3. **Post-Meeting** (same day)
   - Update change request status
   - Communicate decisions to requestors
   - Update requirements baseline (if approved)
   - Schedule implementation (if approved)

**CCB Meeting Agenda Template**:
```markdown
# Change Control Board Meeting Agenda

**Date**: {date}
**Time**: {time}
**Location**: {virtual or physical location}
**Chair**: {Project Manager name}

## Attendees

- [ ] Executive Sponsor
- [ ] Product Owner
- [ ] Software Architect
- [ ] Test Architect
- [ ] Requirements Analyst
- [ ] {Key Stakeholder}

## Agenda

### 1. Previous Meeting Action Items (5 min)
{Review completed actions from previous CCB}

### 2. Change Requests for Review

#### CR-{ID}: {Change Request Title}
- **Requestor**: {name}
- **Type**: {Enhancement | Scope Change}
- **Impact**: {days} days, ${cost}
- **Recommendation**: {APPROVE | DEFER | REJECT}
- **Presenter**: {Requirements Analyst}
- **Time**: 15 minutes

#### CR-{ID}: {Change Request Title}
- **Requestor**: {name}
- **Type**: {Enhancement | Scope Change}
- **Impact**: {days} days, ${cost}
- **Recommendation**: {APPROVE | DEFER | REJECT}
- **Presenter**: {Requirements Analyst}
- **Time**: 15 minutes

### 3. Baseline Health Report (10 min)
- Requirements stability: {percentage}% (target: >80%)
- Change request rate: {count} per iteration
- Traceability completeness: {percentage}%

### 4. Next Meeting
- **Date**: {date}
- **Pending Items**: {count}

## Decision Record

### CR-{ID}: {Title}
- **Decision**: {APPROVED | DEFERRED | REJECTED}
- **Rationale**: {reasoning}
- **Conditions**: {any conditions for approval}
- **Action Items**: {list follow-up actions}
```

**Output**: CCB Decision Record
```markdown
# CCB Decision Record - {date}

**Meeting Date**: {date}
**Chair**: {Project Manager name}
**Attendees**: {list all attendees}

## Decisions

### CR-{ID}: {Change Request Title}

**Decision**: {APPROVED | DEFERRED | REJECTED}

**Vote**: {count} APPROVE, {count} DEFER, {count} REJECT

**Rationale**: {detailed reasoning for decision}

**Conditions** (if APPROVED):
- {Condition 1}
- {Condition 2}

**Implementation Plan** (if APPROVED):
- Target Iteration: {iteration-number}
- Owner: {developer-name}
- Due Date: {date}

**Deferral Reason** (if DEFERRED):
{Why deferred and when to reconsider}

**Rejection Reason** (if REJECTED):
{Why rejected and alternative suggested}

## Action Items

1. **{Action}** - Owner: {name} - Due: {date}
2. **{Action}** - Owner: {name} - Due: {date}

## Next CCB Meeting

**Date**: {date}
**Pending Items**: {count}
```

### Step 5: Update Requirements Baseline

For approved changes, update all requirements artifacts and version the baseline.

**Commands**:
```bash
# Update requirements artifacts
cat requirements/vision-*.md
cat requirements/use-case-spec-*.md
cat requirements/supplemental-specification-*.md

# Version baseline (git tag)
git tag -a requirements-baseline-v{version} -m "Requirements baseline {version} - {date}"

# Update change log
cat requirements/change-log.md

# Regenerate traceability matrix
# (after requirements updated)
```

**Baseline Update Process**:

1. **Update Requirements Artifacts**
   - Modify vision document (if scope change)
   - Update use case specifications
   - Update supplemental specification (NFRs)
   - Update acceptance criteria

2. **Update Related Artifacts**
   - Architecture Decision Records (if needed)
   - Component specifications (if architecture impact)
   - Interface specifications (if API change)
   - Data contracts (if data model change)

3. **Update Traceability Matrix**
   - Add new traceability links
   - Update existing links
   - Remove obsolete links
   - Validate bidirectional traceability

4. **Version Baseline**
   - Increment baseline version (e.g., 1.0 → 1.1)
   - Tag version control (git tag)
   - Update baseline status document
   - Communicate baseline change to team

5. **Update Change Log**
   - Record change request ID
   - Summary of change
   - Baseline version
   - Date and approver

**Baseline Versioning Scheme**:
- **Major version (1.0, 2.0)**: Scope changes (Executive Sponsor approval)
- **Minor version (1.1, 1.2)**: Major changes (CCB approval)
- **Patch version (1.1.1)**: Minor changes (Product Owner approval)

**Output**: Requirements Baseline Update Report
```markdown
# Requirements Baseline Update - v{version}

**Previous Version**: v{previous-version}
**New Version**: v{new-version}
**Date**: {date}
**Updated By**: {Requirements Analyst name}

## Changes in This Baseline

### CR-{ID}: {Change Request Title}
- **Type**: {Enhancement | Clarification | Scope Change}
- **Approved By**: {Product Owner | CCB | Executive Sponsor}
- **Approval Date**: {date}

**Artifacts Updated**:
- {Artifact-Name}: {summary of changes}
- {Artifact-Name}: {summary of changes}

**Traceability Links Updated**: {count}

## Baseline Statistics

**Total Requirements**: {count}
- Use Cases: {count}
- Non-Functional Requirements: {count}
- Data Requirements: {count}
- Interface Requirements: {count}

**Requirements Status**:
- Implemented: {count} ({percentage}%)
- In Progress: {count} ({percentage}%)
- Planned: {count} ({percentage}%)

**Baseline Stability**: {percentage}% (requirements unchanged in last 2 weeks)

## Traceability Validation

**Traceability Completeness**: {percentage}%
- Requirements → Use Cases: {percentage}%
- Use Cases → Architecture: {percentage}%
- Architecture → Code: {percentage}%
- Code → Tests: {percentage}%

**Orphaned Items**: {count}
{list any requirements, code, or tests without traceability}

## Version Control

**Git Tag**: requirements-baseline-v{version}
**Commit**: {git-commit-hash}
**Branch**: {branch-name}

## Communication

**Notified**:
- [ ] Development Team
- [ ] Test Team
- [ ] Product Owner
- [ ] Project Manager
- [ ] Stakeholders
```

### Step 6: Maintain Traceability Matrix

Continuously validate and update traceability links throughout the lifecycle.

**Commands**:
```bash
# Read current traceability matrix
cat management/traceability-matrix.md

# Validate traceability with automated tools
# (example: check requirement IDs in code comments, test files)
grep -r "REQ-" . --exclude-dir=node_modules --exclude-dir=.git
grep -r "UC-" . --exclude-dir=node_modules --exclude-dir=.git

# Identify orphaned requirements (no tests)
# Identify orphaned code (no requirements)
# Identify orphaned tests (no requirements)
```

**Traceability Matrix Structure**:
```markdown
# Traceability Matrix

**Project**: {project-name}
**Last Updated**: {date}
**Traceability Owner**: {Requirements Analyst}

## Requirements Traceability

### {Requirement-ID}: {Requirement Title}

**Source**: {Stakeholder Request ID or Vision Section}
**Use Cases**: {UC-001, UC-002}
**Architecture**: {Component-A, Component-B}
**Code**: {file-path, function-name}
**Tests**: {test-file, test-case-name}
**Status**: {IMPLEMENTED | IN PROGRESS | PLANNED}

**Forward Traceability**: {Requirement → Use Case → Code → Test}
**Backward Traceability**: {Test → Code → Use Case → Requirement}

**Completeness**: {COMPLETE | INCOMPLETE}
**Gaps**: {list any missing links}
```

**Traceability Validation Rules**:

1. **Forward Traceability** (Requirements → Implementation)
   - All requirements traced to use cases
   - All use cases traced to components
   - All components traced to code
   - All code traced to tests

2. **Backward Traceability** (Implementation → Requirements)
   - All tests traced to requirements
   - All code traced to use cases
   - All use cases traced to requirements
   - All requirements traced to business needs

3. **Traceability Completeness**
   - 100% of critical requirements traced
   - 100% of high-priority requirements traced
   - ≥90% of all requirements traced
   - ≥80% of code traced to requirements

**Automated Traceability Checks**:
```bash
# Example: Check requirement IDs in code comments
# Look for comments like: // REQ-001: Implement user authentication
find . -name "*.js" -o -name "*.ts" | xargs grep -o "REQ-[0-9]*" | sort | uniq

# Example: Check requirement IDs in test descriptions
# Look for test names like: test('REQ-001: should authenticate user', ...)
find . -name "*.test.*" | xargs grep -o "REQ-[0-9]*" | sort | uniq

# Compare lists to find gaps
```

**Traceability Maintenance Tasks**:
- **Daily**: Update traceability during code reviews (link code to requirements)
- **Weekly**: Validate traceability completeness (check for orphans)
- **Per Iteration**: Regenerate full traceability matrix
- **Per Gate**: Validate 100% traceability for gate criteria

**Output**: Traceability Health Report
```markdown
# Traceability Health Report - {date}

**Project**: {project-name}
**Phase**: {phase}
**Baseline Version**: v{version}

## Traceability Completeness

**Overall Completeness**: {percentage}%

**By Trace Type**:
- Requirements → Use Cases: {percentage}% ({count}/{total})
- Use Cases → Architecture: {percentage}% ({count}/{total})
- Architecture → Code: {percentage}% ({count}/{total})
- Code → Tests: {percentage}% ({count}/{total})

## Traceability Gaps

### Orphaned Requirements (No Tests)
{list requirements without test coverage}

### Orphaned Code (No Requirements)
{list code files or functions without requirement traceability}

### Orphaned Tests (No Requirements)
{list tests not linked to requirements}

## Traceability by Priority

### Critical Requirements: {percentage}% traced
### High Requirements: {percentage}% traced
### Medium Requirements: {percentage}% traced
### Low Requirements: {percentage}% traced

## Gate Readiness

**Next Gate**: {gate-name}
**Traceability Criteria**: 100% for critical/high requirements
**Current Status**: {ON TRACK | AT RISK | BLOCKED}

**Action Items**:
1. {Action to close traceability gap} - Owner: {name} - Due: {date}
2. {Action to close traceability gap} - Owner: {name} - Due: {date}
```

### Step 7: Generate Requirements Status Report

Create comprehensive requirements health report for stakeholders.

**Commands**:
```bash
# Generate metrics from requirements artifacts
cat requirements/*.md | wc -l  # total requirements
grep "Status: IMPLEMENTED" requirements/*.md | wc -l
grep "Status: IN PROGRESS" requirements/*.md | wc -l

# Calculate change rate
git log --since="2 weeks ago" --oneline requirements/ | wc -l

# Baseline stability (% unchanged in 2 weeks)
# Traceability completeness
# Change request metrics
```

**Report Audience**:
- **Executive Sponsor**: Baseline stability, scope changes
- **Product Owner**: Requirement status, change requests
- **Project Manager**: Requirements progress, risks
- **Development Team**: Upcoming requirements, clarifications

**Output**: Requirements Status Report
```markdown
# Requirements Status Report - {date}

**Project**: {project-name}
**Phase**: {phase}
**Baseline Version**: v{version}
**Reporting Period**: {start-date} to {end-date}

## Executive Summary

**Baseline Health**: {HEALTHY | STABLE | UNSTABLE}

**Key Highlights**:
- Total Requirements: {count}
- Requirements Implemented: {count} ({percentage}%)
- Change Requests This Period: {count}
- Baseline Stability: {percentage}% (unchanged in 2 weeks)
- Traceability Completeness: {percentage}%

**Top 3 Concerns**:
1. {Concern description}
2. {Concern description}
3. {Concern description}

## Requirements Progress

**By Status**:
- Implemented: {count} ({percentage}%)
- In Progress: {count} ({percentage}%)
- Planned: {count} ({percentage}%)
- Deferred: {count} ({percentage}%)

**By Priority**:
- Critical: {implemented}/{total} ({percentage}%)
- High: {implemented}/{total} ({percentage}%)
- Medium: {implemented}/{total} ({percentage}%)
- Low: {implemented}/{total} ({percentage}%)

**Iteration Progress**:
- Planned This Iteration: {count}
- Completed This Iteration: {count}
- Carry-Over to Next: {count}

## Change Management

**Change Requests This Period**: {count}
- Approved: {count} ({percentage}%)
- Deferred: {count} ({percentage}%)
- Rejected: {count} ({percentage}%)
- CCB Review Pending: {count} ({percentage}%)

**Change Rate**: {count} changes per iteration (target: <5)

**Baseline Versions**: v{version} (current), v{previous} (previous)

**Scope Changes**: {count} (requiring Executive Sponsor approval)

## Baseline Stability

**Stability Metric**: {percentage}% (requirements unchanged in 2 weeks)

**Churn Rate**: {percentage}% (requirements modified this period)

**Stability Trend**: {IMPROVING | STABLE | DECLINING}

**Rationale**: {why stability is improving or declining}

## Traceability Health

**Overall Completeness**: {percentage}% (target: ≥90%)

**Gaps**:
- Orphaned Requirements: {count}
- Orphaned Code: {count}
- Orphaned Tests: {count}

**Action Plan**: {steps to achieve 100% traceability}

## Risk and Issues

**Requirements Risks**: {count}
- Ambiguous requirements: {count}
- Missing acceptance criteria: {count}
- Unstable requirements (high churn): {count}

**Requirements Issues**: {count}
- Conflicting requirements: {count}
- Incomplete requirements: {count}
- Requirements gaps: {count}

## Gate Readiness

**Next Gate**: {gate-name}
**Gate Date**: {date}

**Requirements Criteria**:
- [ ] Requirements baseline approved
- [ ] Use cases documented (target: 10+): {count}
- [ ] Acceptance criteria defined: {percentage}%
- [ ] Traceability complete: {percentage}%
- [ ] Change control active: {YES | NO}

**Gate Status**: {ON TRACK | AT RISK | BLOCKED}

## Upcoming Requirements (Next Iteration)

### {Requirement-ID}: {Title}
- **Priority**: {Critical | High | Medium | Low}
- **Complexity**: {Low | Medium | High}
- **Dependencies**: {list}

## Action Items

1. **{Action}** - Owner: {name} - Due: {date}
2. **{Action}** - Owner: {name} - Due: {date}

## Recommendations

**Process Improvements**:
{suggestions for improving requirements management}

**Tooling Improvements**:
{suggestions for traceability automation, change tracking}
```

## Success Criteria

This command succeeds when:
- [ ] Requirements refinement workshop conducted with stakeholder participation
- [ ] Change requests triaged with clear approval decisions
- [ ] Impact analysis completed for major changes
- [ ] Change Control Board approval obtained for scope changes
- [ ] Requirements baseline updated with approved changes
- [ ] Traceability matrix maintained with ≥90% completeness
- [ ] Requirements status report generated for stakeholders

## Error Handling

**No Change Requests Submitted**:
- Report: "No change requests submitted this period"
- Action: "Confirm stakeholders know how to submit CRs"
- Recommendation: "Review change request template and process"

**Change Request Missing Impact Analysis**:
- Report: "CR-{ID} lacks impact analysis (schedule, cost, risk)"
- Action: "Requirements Analyst completes impact analysis"
- Impact: "Cannot schedule CCB review without impact analysis"

**Traceability Gaps Exceed 20%**:
- Report: "Traceability completeness {percentage}% (target: ≥90%)"
- Action: "Launch traceability remediation effort"
- Impact: "Gate criteria blocked until traceability complete"

**Baseline Instability (Churn >30%)**:
- Report: "Baseline churn {percentage}% (target: <20%)"
- Action: "Strengthen change control, defer non-critical changes"
- Impact: "High churn indicates requirements discovery incomplete"

**Unapproved Scope Change Implemented**:
- Report: "Code implements CR-{ID} without CCB approval"
- Action: "Revert code, submit CR for formal approval"
- Escalation: "Notify Project Manager and Executive Sponsor"

## Metrics

**Track Throughout SDLC**:
- Requirements count: Trend over time (should stabilize by Construction)
- Baseline stability: {percentage}% unchanged per iteration (target: >80%)
- Change request rate: {count} per iteration (target: <5)
- Traceability completeness: {percentage}% (target: ≥90%)
- Requirements churn: {percentage}% modified per iteration (target: <20%)
- Change approval rate: {percentage}% approved (vs deferred/rejected)

**Target Metrics by Phase**:
- **Inception**: 10-20 high-level requirements (vision-level)
- **Elaboration**: 50-100 detailed requirements (use cases + NFRs), baseline at ABM
- **Construction**: Baseline stable (churn <20%), change rate <5 per iteration
- **Transition**: Baseline frozen, only critical bug fixes allowed

## References

- Vision template: `/home/manitcor/dev/ai-writing-guide/agentic/code/frameworks/sdlc-complete/templates/requirements/vision-template.md`
- Use case template: `/home/manitcor/dev/ai-writing-guide/agentic/code/frameworks/sdlc-complete/templates/requirements/use-case-spec-template.md`
- Change request template: `/home/manitcor/dev/ai-writing-guide/agentic/code/frameworks/sdlc-complete/templates/requirements/change-request-template.md`
- Traceability matrix: `/home/manitcor/dev/ai-writing-guide/agentic/code/frameworks/sdlc-complete/templates/management/traceability-matrix-template.md`
- Gate criteria: `/home/manitcor/dev/ai-writing-guide/agentic/code/frameworks/sdlc-complete/flows/gate-criteria-by-phase.md`
