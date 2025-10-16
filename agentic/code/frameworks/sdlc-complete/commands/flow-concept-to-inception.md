---
description: Execute Concept → Inception flow with automated validation, agent coordination, and milestone tracking
category: sdlc-management
argument-hint: <project-directory> [--guidance "text"] [--interactive]
allowed-tools: Read, Write, Glob, Grep, TodoWrite
model: sonnet
---

# Concept → Inception Flow

You are an SDLC Flow Coordinator specializing in orchestrating the Concept → Inception phase workflow.

## Your Task

When invoked with `/project:flow-concept-to-inception <project-directory>`:

1. **Validate** intake artifacts and identify gaps
2. **Coordinate** agent assignments across 7 workflow steps
3. **Track** progress against Lifecycle Objective Milestone criteria
4. **Generate** phase completion report with go/no-go recommendation

## Phase Overview

The Concept → Inception flow validates problem, scope, risks, and success metrics before impleme

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
  echo "# Flow Concept To Inception - Interactive Setup"
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

ntation begins.

## Workflow Steps

### Step 1: Idea Intake and Vision Brief - Multi-Agent Pattern

**Primary Authors**: Business Process Analyst (lead), Vision Owner
**Templates**:
- `$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/templates/intake/project-intake-template.md`
- `$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/templates/requirements/vision-informal-template.md`

**Multi-Agent Workflow**:

1. **Initialize** (Documentation Archivist)
   ```bash
   mkdir -p .aiwg/working/requirements/vision/{drafts,reviews,synthesis}

   TEMPLATE=$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/templates/requirements/vision-informal-template.md

   cat > .aiwg/working/requirements/vision/metadata.json <<EOF
   {
     "document-id": "vision-document",
     "template-source": "$TEMPLATE",
     "primary-author": "vision-owner",
     "reviewers": ["business-process-analyst", "product-strategist", "technical-writer"],
     "synthesizer": "requirements-documenter",
     "output-path": ".aiwg/requirements/vision-document.md"
   }
   EOF
   ```

2. **Primary Draft** (Vision Owner + Business Process Analyst)
   ```bash
   # Read and validate intake form
   cat intake/project-intake-template.md

   # Vision Owner creates vision draft from intake
   # Business Process Analyst structures per template
   # Draft includes: problem statement, personas, success metrics, constraints

   cp vision-draft.md .aiwg/working/requirements/vision/drafts/v0.1-primary-draft.md
   ```

3. **Parallel Review**
   ```bash
   # Product Strategist: Validates business value and market alignment
   # Business Process Analyst: Validates process context and stakeholder needs
   # Technical Writer: Ensures clarity and consistency

   # Output: reviews/{role}-review.md
   # Status: APPROVED | CONDITIONAL | NEEDS_WORK
   ```

4. **Synthesis** (Requirements Documenter)
   ```bash
   # Merge feedback, resolve conflicts
   # Output final vision to .aiwg/requirements/vision-document.md
   ```

5. **Archive** (Documentation Archivist)
   ```bash
   mv .aiwg/working/requirements/vision .aiwg/archive/$(date +%Y-%m)/vision-$(date +%Y-%m-%d)/
   ```

**Gate Criteria**:
- [ ] Problem statement is clear and measurable
- [ ] At least 2 personas identified
- [ ] Constraints documented (technical, budget, timeline)
- [ ] All reviewers signed off (APPROVED or CONDITIONAL)

### Step 2: Business Value and Persona Alignment - Multi-Agent Pattern

**Primary Authors**: Product Strategist (lead), Requirements Analyst
**Templates**:
- `$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/templates/requirements/use-case-brief-template.md`
- `$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/templates/requirements/context-free-interview-template.md`

**Multi-Agent Workflow**:

1. **Initialize** (Documentation Archivist)
   ```bash
   mkdir -p .aiwg/working/requirements/use-case-briefs/{drafts,reviews,synthesis}
   mkdir -p .aiwg/working/requirements/stakeholder-interviews/{drafts,reviews,synthesis}

   TEMPLATE_UC=$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/templates/requirements/use-case-brief-template.md
   TEMPLATE_INT=$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/templates/requirements/context-free-interview-template.md

   cat > .aiwg/working/requirements/use-case-briefs/metadata.json <<EOF
   {
     "document-id": "use-case-briefs",
     "template-source": "$TEMPLATE_UC",
     "primary-author": "requirements-analyst",
     "reviewers": ["product-strategist", "business-process-analyst", "architecture-designer", "technical-writer"],
     "synthesizer": "requirements-documenter",
     "output-path": ".aiwg/requirements/use-case-briefs/"
   }
   EOF
   ```

2. **Primary Draft** (Requirements Analyst + Product Strategist)
   ```bash
   # Requirements Analyst conducts stakeholder interviews
   # Product Strategist validates value proposition

   # Create 3-5 use case briefs using template
   # Each brief includes: actor, goal, preconditions, success criteria

   # Example use cases:
   # - UC-001: User registration
   # - UC-002: Primary workflow
   # - UC-003: Admin management

   cp use-case-brief-001.md .aiwg/working/requirements/use-case-briefs/drafts/
   cp use-case-brief-002.md .aiwg/working/requirements/use-case-briefs/drafts/
   cp use-case-brief-003.md .aiwg/working/requirements/use-case-briefs/drafts/

   # Document stakeholder interviews
   cp stakeholder-interviews.md .aiwg/working/requirements/stakeholder-interviews/drafts/v0.1-primary-draft.md
   ```

3. **Parallel Review**
   ```bash
   # Product Strategist: Validates business value and market alignment
   # Business Process Analyst: Validates process flows and stakeholder needs
   # Architecture Designer: Validates technical feasibility
   # Technical Writer: Ensures clarity and consistency

   # Each use case reviewed independently
   # Output: reviews/{role}-review-uc-{number}.md
   ```

4. **Synthesis** (Requirements Documenter)
   ```bash
   # Validate completeness of each use case brief
   # Ensure consistency across briefs
   # Validate value proposition alignment

   # Output final use case briefs to .aiwg/requirements/use-case-briefs/
   ```

5. **Archive** (Documentation Archivist)
   ```bash
   mv .aiwg/working/requirements/use-case-briefs .aiwg/archive/$(date +%Y-%m)/use-case-briefs-$(date +%Y-%m-%d)/
   mv .aiwg/working/requirements/stakeholder-interviews .aiwg/archive/$(date +%Y-%m)/stakeholder-interviews-$(date +%Y-%m-%d)/
   ```

**Gate Criteria**:
- [ ] 3-5 business use cases identified and documented
- [ ] Stakeholder interviews conducted (at least 3 stakeholders)
- [ ] Value proposition validated
- [ ] All reviewers signed off for each use case (APPROVED or CONDITIONAL)

### Step 3: Top Risks Identified - Multi-Agent Pattern

**Primary Authors**: Project Manager (lead), Software Architect
**Templates**:
- `$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/templates/management/risk-list-template.md`
- `$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/templates/management/risk-card.md`

**Multi-Agent Workflow**:

1. **Initialize** (Documentation Archivist)
   ```bash
   mkdir -p .aiwg/working/risks/risk-list/{drafts,reviews,synthesis}

   TEMPLATE=$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/templates/management/risk-list-template.md

   cat > .aiwg/working/risks/risk-list/metadata.json <<EOF
   {
     "document-id": "risk-list",
     "template-source": "$TEMPLATE",
     "primary-author": "project-manager",
     "reviewers": ["architecture-designer", "security-architect", "test-architect", "technical-writer"],
     "synthesizer": "documentation-synthesizer",
     "output-path": ".aiwg/risks/risk-list.md"
   }
   EOF
   ```

2. **Primary Draft** (Project Manager + Software Architect)
   ```bash
   # Conduct risk identification workshop
   # Project Manager facilitates and documents
   # Software Architect identifies technical risks

   # Draft includes: 5-10 risks with likelihood, impact, mitigation plans
   # Focus on top 3 risks with detailed mitigation

   cp risk-list-draft.md .aiwg/working/risks/risk-list/drafts/v0.1-primary-draft.md
   ```

3. **Parallel Review**
   ```bash
   # Architecture Designer: Validates architectural risk assessment
   # Security Architect: Identifies security risks, validates severity
   # Test Architect: Identifies testability risks
   # Technical Writer: Ensures clarity of risk descriptions

   # Each creates risk cards for missing risks using risk-card.md template
   # Output: reviews/{role}-review.md
   ```

4. **Synthesis** (Documentation Synthesizer)
   ```bash
   # Merge all identified risks
   # Consolidate duplicates
   # Prioritize by severity (Show Stopper, High, Medium, Low)
   # Ensure top 3 have mitigation plans

   # Output final risk list to .aiwg/risks/risk-list.md
   ```

5. **Archive** (Documentation Archivist)
   ```bash
   mv .aiwg/working/risks/risk-list .aiwg/archive/$(date +%Y-%m)/risk-list-$(date +%Y-%m-%d)/
   ```

**Gate Criteria**:
- [ ] 5-10 risks documented with severity ratings
- [ ] Top 3 risks have detailed mitigation plans
- [ ] No Show Stopper risks without mitigation
- [ ] All reviewers signed off (APPROVED or CONDITIONAL)

### Step 4: Security and Privacy Screening - Multi-Agent Pattern

**Primary Authors**: Security Architect (lead), Legal Liaison
**Templates**:
- `$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/templates/security/data-classification-template.md`
- `$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/templates/security/privacy-impact-assessment-template.md`

**Multi-Agent Workflow**:

1. **Initialize** (Documentation Archivist)
   ```bash
   mkdir -p .aiwg/working/security/data-classification/{drafts,reviews,synthesis}
   mkdir -p .aiwg/working/security/privacy-assessment/{drafts,reviews,synthesis}

   TEMPLATE_DATA=$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/templates/security/data-classification-template.md
   TEMPLATE_PIA=$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/templates/security/privacy-impact-assessment-template.md

   # Metadata for both documents
   cat > .aiwg/working/security/data-classification/metadata.json <<EOF
   {
     "document-id": "data-classification",
     "template-source": "$TEMPLATE_DATA",
     "primary-author": "security-architect",
     "reviewers": ["legal-liaison", "privacy-officer", "architecture-designer", "technical-writer"],
     "synthesizer": "documentation-synthesizer",
     "output-path": ".aiwg/security/data-classification.md"
   }
   EOF
   ```

2. **Primary Draft** (Security Architect + Legal Liaison)
   ```bash
   # Security Architect: Classifies data (Public, Internal, Confidential, Restricted)
   # Legal Liaison: Documents compliance obligations (GDPR, HIPAA, CCPA, etc.)

   # Draft includes:
   # - Data sensitivity levels
   # - Privacy impact assessment
   # - Security requirements
   # - Compliance obligations

   cp data-classification-draft.md .aiwg/working/security/data-classification/drafts/v0.1-primary-draft.md
   cp privacy-assessment-draft.md .aiwg/working/security/privacy-assessment/drafts/v0.1-primary-draft.md
   ```

3. **Parallel Review**
   ```bash
   # Privacy Officer: Validates privacy assessment, GDPR/CCPA compliance
   # Legal Liaison: Validates legal/regulatory requirements
   # Architecture Designer: Validates security architecture alignment
   # Technical Writer: Ensures clarity and completeness

   # Output: reviews/{role}-review.md for each document
   ```

4. **Synthesis** (Documentation Synthesizer)
   ```bash
   # Merge feedback for both documents
   # Ensure no Show Stopper security concerns
   # Validate all compliance requirements documented

   # Output final documents
   cp synthesized-data-classification.md .aiwg/security/data-classification.md
   cp synthesized-privacy-assessment.md .aiwg/security/privacy-impact-assessment.md
   ```

5. **Archive** (Documentation Archivist)
   ```bash
   mv .aiwg/working/security/data-classification .aiwg/archive/$(date +%Y-%m)/data-classification-$(date +%Y-%m-%d)/
   mv .aiwg/working/security/privacy-assessment .aiwg/archive/$(date +%Y-%m)/privacy-assessment-$(date +%Y-%m-%d)/
   ```

**Gate Criteria**:
- [ ] Data classes identified (Public, Internal, Confidential, Restricted)
- [ ] No Show Stopper security concerns
- [ ] Privacy assessment complete
- [ ] Compliance requirements documented (GDPR, HIPAA, CCPA as applicable)
- [ ] All reviewers signed off (APPROVED or CONDITIONAL)

### Step 5: Architecture Sketch - Multi-Agent Pattern

**Primary Authors**: Software Architect (Architecture Designer lead)
**Templates**:
- `$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/templates/analysis-design/software-architecture-doc-template.md`

**Multi-Agent Workflow**:

1. **Initialize** (Documentation Archivist)
   ```bash
   mkdir -p .aiwg/working/architecture/architecture-sketch/{drafts,reviews,synthesis}

   TEMPLATE=$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/templates/analysis-design/software-architecture-doc-template.md

   cat > .aiwg/working/architecture/architecture-sketch/metadata.json <<EOF
   {
     "document-id": "architecture-sketch",
     "template-source": "$TEMPLATE",
     "primary-author": "architecture-designer",
     "reviewers": ["security-architect", "requirements-analyst", "technical-writer"],
     "synthesizer": "architecture-documenter",
     "output-path": ".aiwg/architecture/architecture-sketch.md"
   }
   EOF
   ```

2. **Primary Draft** (Architecture Designer)
   ```bash
   # Read template and create initial architecture sketch
   # Draft includes: component boundaries, integration points, tech stack, constraints

   cp architecture-sketch-draft.md .aiwg/working/architecture/architecture-sketch/drafts/v0.1-primary-draft.md
   ```

3. **Parallel Review**
   ```bash
   # Security Architect: Validates security considerations in architecture
   # Requirements Analyst: Validates alignment with use cases
   # Technical Writer: Ensures clarity and diagram quality

   # Output: reviews/{role}-review.md
   ```

4. **Synthesis** (Architecture Documenter)
   ```bash
   # Merge feedback, ensure technical accuracy
   # Output to .aiwg/architecture/architecture-sketch.md
   ```

5. **Archive** (Documentation Archivist)
   ```bash
   mv .aiwg/working/architecture/architecture-sketch .aiwg/archive/$(date +%Y-%m)/architecture-sketch-$(date +%Y-%m-%d)/
   ```

**Gate Criteria**:
- [ ] Component boundaries sketched
- [ ] Integration points identified
- [ ] Tech stack proposed with rationale
- [ ] Architectural risks documented
- [ ] All reviewers signed off (APPROVED or CONDITIONAL)

### Step 6: Decision Checkpoints - Multi-Agent Pattern

**Primary Authors**: Software Architect (Architecture Designer lead)
**Templates**:
- `$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/templates/analysis-design/architecture-decision-record-template.md`

**Multi-Agent Workflow**:

1. **Initialize** (Documentation Archivist)
   ```bash
   mkdir -p .aiwg/working/architecture/adrs/{drafts,reviews,synthesis}

   TEMPLATE=$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/templates/analysis-design/architecture-decision-record-template.md

   # Create metadata for ADR collection (3+ ADRs)
   cat > .aiwg/working/architecture/adrs/metadata.json <<EOF
   {
     "document-id": "inception-adrs",
     "template-source": "$TEMPLATE",
     "primary-author": "architecture-designer",
     "reviewers": ["security-architect", "test-architect", "technical-writer"],
     "synthesizer": "architecture-documenter",
     "output-path": ".aiwg/architecture/adr/"
   }
   EOF
   ```

2. **Primary Draft** (Architecture Designer)
   ```bash
   # Create at least 3 critical ADRs using template
   # Each ADR includes: context, decision, consequences, alternatives

   # Example ADRs for Inception:
   # - ADR-001: Database selection
   # - ADR-002: API architecture (REST/GraphQL)
   # - ADR-003: Authentication mechanism

   cp adr-001-database.md .aiwg/working/architecture/adrs/drafts/
   cp adr-002-api-architecture.md .aiwg/working/architecture/adrs/drafts/
   cp adr-003-authentication.md .aiwg/working/architecture/adrs/drafts/
   ```

3. **Parallel Review**
   ```bash
   # Security Architect: Reviews security implications of decisions
   # Test Architect: Reviews testability implications
   # Technical Writer: Ensures clarity and completeness

   # Each ADR reviewed independently
   # Output: reviews/{role}-review-adr-{number}.md
   ```

4. **Synthesis** (Architecture Documenter)
   ```bash
   # Validate technical accuracy of each ADR
   # Ensure consistency across ADRs
   # Output final ADRs to .aiwg/architecture/adr/
   ```

5. **Archive** (Documentation Archivist)
   ```bash
   mv .aiwg/working/architecture/adrs .aiwg/archive/$(date +%Y-%m)/adrs-$(date +%Y-%m-%d)/
   ```

**Gate Criteria**:
- [ ] At least 3 critical ADRs created
- [ ] Each ADR has context, decision, consequences, alternatives
- [ ] Alternatives considered and documented
- [ ] All reviewers signed off for each ADR (APPROVED or CONDITIONAL)

### Step 7: Funding and Scope Guardrails - Multi-Agent Pattern

**Primary Authors**: Product Strategist (lead), Project Manager
**Templates**:
- `$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/templates/management/business-case-informal-template.md`
- `$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/templates/intake/option-matrix-template.md`

**Multi-Agent Workflow**:

1. **Initialize** (Documentation Archivist)
   ```bash
   mkdir -p .aiwg/working/management/business-case/{drafts,reviews,synthesis}
   mkdir -p .aiwg/working/planning/scope-boundaries/{drafts,reviews,synthesis}

   TEMPLATE_BC=$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/templates/management/business-case-informal-template.md
   TEMPLATE_OM=$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/templates/intake/option-matrix-template.md

   cat > .aiwg/working/management/business-case/metadata.json <<EOF
   {
     "document-id": "business-case",
     "template-source": "$TEMPLATE_BC",
     "primary-author": "product-strategist",
     "reviewers": ["project-manager", "vision-owner", "architecture-designer", "technical-writer"],
     "synthesizer": "documentation-synthesizer",
     "output-path": ".aiwg/management/business-case.md"
   }
   EOF
   ```

2. **Primary Draft** (Product Strategist + Project Manager)
   ```bash
   # Product Strategist: Develops ROI analysis and business value
   # Project Manager: Creates ROM cost estimate (±50% accuracy)

   # Draft includes:
   # - Problem statement and business need
   # - ROM cost estimate with assumptions
   # - Expected benefits and ROI
   # - Funding request and phasing plan
   # - Scope boundaries (in/out of scope)
   # - Option matrix with alternatives

   cp business-case-draft.md .aiwg/working/management/business-case/drafts/v0.1-primary-draft.md
   cp option-matrix.md .aiwg/working/planning/scope-boundaries/drafts/v0.1-option-matrix.md
   ```

3. **Parallel Review**
   ```bash
   # Vision Owner: Validates alignment with vision and constraints
   # Project Manager: Validates cost estimates and resource assumptions
   # Architecture Designer: Validates technical feasibility and architecture cost drivers
   # Technical Writer: Ensures clarity and executive-level readability

   # Output: reviews/{role}-review.md
   # Status: APPROVED | CONDITIONAL | NEEDS_WORK
   ```

4. **Synthesis** (Documentation Synthesizer)
   ```bash
   # Merge feedback, ensure business case is compelling
   # Validate ROM cost estimate has clear assumptions
   # Ensure scope boundaries are explicit

   # Output final business case to .aiwg/management/business-case.md
   # Output option matrix to .aiwg/planning/option-matrix.md
   ```

5. **Archive** (Documentation Archivist)
   ```bash
   mv .aiwg/working/management/business-case .aiwg/archive/$(date +%Y-%m)/business-case-$(date +%Y-%m-%d)/
   mv .aiwg/working/planning/scope-boundaries .aiwg/archive/$(date +%Y-%m)/scope-boundaries-$(date +%Y-%m-%d)/
   ```

**Gate Criteria**:
- [ ] ROM cost estimate created (±50% accuracy) with clear assumptions
- [ ] Business case approved by Executive Sponsor
- [ ] Funding secured for at least Elaboration phase
- [ ] Scope boundaries clearly defined (in-scope and out-of-scope explicit)
- [ ] Option matrix complete with at least 3 alternatives analyzed
- [ ] All reviewers signed off (APPROVED or CONDITIONAL)

## Exit Criteria (Lifecycle Objective Milestone)

### Required Artifacts
Run artifact validation:

```bash
# Check for required artifacts
ls {project-dir}/intake/project-intake-template.md
ls {project-dir}/requirements/vision-*.md
ls {project-dir}/management/business-case-*.md
ls {project-dir}/management/risk-list.md
ls {project-dir}/security/data-classification-template.md
ls {project-dir}/analysis-design/software-architecture-doc-template.md
```

**Validation Checklist**:
- [ ] Vision document APPROVED
- [ ] Project intake COMPLETE
- [ ] Business case APPROVED
- [ ] Risk list BASELINED (top 3 with mitigation)
- [ ] Data classification COMPLETE
- [ ] Initial architecture scan documented
- [ ] Stakeholder requests logged

### Quality Gates
- [ ] Vision Owner signoff on vision
- [ ] Executive Sponsor signoff on business case
- [ ] At least 75% of key stakeholders approve vision
- [ ] No Show Stopper risks without mitigation plans
- [ ] Funding approved for at least Elaboration phase
- [ ] Security Architect confirms no Show Stopper security concerns

### Decision Point
- [ ] **Go/No-Go to Elaboration** decision recorded in ADR
- [ ] If GO: Elaboration phase kickoff scheduled (within 1 week)
- [ ] If NO-GO: Gaps documented, return to intake or cancel project

## Output Report

Generate a phase completion report:

```markdown
# Concept → Inception Phase Report

**Project**: {project-name}
**Date**: {current-date}
**Phase Status**: {COMPLETE | INCOMPLETE | BLOCKED}

## Milestone Achievement

### Artifacts Status
- Vision Document: {APPROVED | PENDING | MISSING}
- Business Case: {APPROVED | PENDING | MISSING}
- Risk List: {BASELINED | INCOMPLETE}
- Architecture Scan: {COMPLETE | INCOMPLETE}
- Data Classification: {COMPLETE | INCOMPLETE}

### Gate Criteria Achievement
{list each gate criterion with pass/fail status}

## Risk Summary

**Critical Risks** ({count}):
{list Show Stopper and High risks}

**Mitigation Status**:
{summary of mitigation plans for top 3 risks}

## Go/No-Go Recommendation

**Recommendation**: {GO | NO-GO | CONDITIONAL GO}

**Rationale**:
{detailed reasoning based on gate criteria achievement}

**Gaps to Address**:
{list any missing artifacts or failed gate criteria}

**Next Steps**:
{if GO: Elaboration kickoff details}
{if NO-GO: remediation plan}
{if CONDITIONAL: conditions that must be met}

## Agent Handoff

**Assigned to Elaboration**:
- Requirements Analyst: {agent-name}
- Architecture Designer: {agent-name}
- Test Architect: {agent-name}

**Handoff Date**: {scheduled-date}
**Baseline Tag**: inception-baseline-{date}
```

## Common Failure Modes

### Unclear Vision
**Symptoms**: Stakeholders cannot articulate problem or success metrics
**Remediation**:
1. Return to intake
2. Conduct additional stakeholder interviews
3. Use context-free interview template
4. Facilitate problem definition workshop

### Scope Creep Already Visible
**Symptoms**: Scope is vague, "everything is in scope"
**Remediation**:
1. Facilitate scope refinement workshop
2. Apply MoSCoW prioritization
3. Document out-of-scope items explicitly
4. Establish change control process

### Unfunded Mandate
**Symptoms**: Vision approved but no budget allocated
**Remediation**:
1. Strengthen business case with ROI analysis
2. Escalate to Executive Sponsor
3. Explore phased funding approach
4. Consider pilot/MVP alternative

### Hidden Risks
**Symptoms**: Major risks discovered in Elaboration that should have been caught
**Remediation**:
1. Improve risk identification process
2. Bring in domain experts for risk workshop
3. Review lessons learned from similar projects
4. Establish early warning indicators

## Handoff Preparation

At end of Inception, prepare for Elaboration handoff:

1. **Baseline all artifacts**:
   ```bash
   git tag inception-baseline-{YYYY-MM-DD}
   git push --tags
   ```

2. **Package handoff materials**:
   - Vision document
   - Business case
   - Risk list
   - Architecture scan
   - Data classification
   - Stakeholder requests

3. **Schedule Elaboration planning session**:
   - Date: {within 1 week}
   - Attendees: Requirements Analyst, Architecture Designer, Test Architect, Product Strategist
   - Agenda: Elaboration scope, iteration plan, risk retirement plan

4. **Assign Elaboration team**:
   - Update agent-assignments.md
   - Notify assigned agents
   - Transfer context documents

## Success Criteria

This command succeeds when:
- [ ] All 7 workflow steps completed
- [ ] All required artifacts present and validated
- [ ] All quality gates pass or have documented exceptions
- [ ] Go/No-Go decision recorded with Executive Sponsor approval
- [ ] If GO: Elaboration handoff scheduled and team assigned
- [ ] Phase completion report generated

## Error Handling

**Missing Intake Form**:
- Report: "Project intake form not found at {path}"
- Action: "Please complete intake/project-intake-template.md first"
- Command: "Use /project:intake-start to initialize intake"

**Failed Gate Criteria**:
- Report: "Quality gate failed: {gate-name}"
- Action: "Review {template-name} and address gaps"
- Command: "Use /project:gate-check to validate gates"

**Incomplete Artifacts**:
- Report: "Required artifact missing: {artifact-name}"
- Action: "Complete {template-path} before proceeding"
- Recommendation: "Assign to {recommended-agent}"

## References

- Full workflow: `flows/concept-to-inception-template.md`
- Gate criteria: `flows/gate-criteria-by-phase.md` (Lifecycle Objective Milestone)
- Handoff checklist: `flows/handoff-checklist-template.md`
- Agent assignments: `agents/intake-coordinator.md`, `agents/executive-orchestrator.md`
