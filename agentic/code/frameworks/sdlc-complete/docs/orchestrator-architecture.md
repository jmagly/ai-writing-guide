# Orchestrator Architecture - Core Platform Role

**Purpose**: Define how the core Claude Code platform orchestrates multi-agent workflows using flow commands as templates.

## Architectural Principle

**Commands are templates, not executors. The core platform (Claude Code) is the orchestrator.**

### Old Pattern (Incorrect)
```
User → /flow-command → Command executes → Output
```

### New Pattern (Correct)
```
User: "Let's transition to Elaboration"
  ↓
Core Platform (You):
  1. Interpret intent → map to flow template
  2. Read flow-inception-to-elaboration.md as orchestration template
  3. Extract agent assignments from template
  4. Generate initial drafts (using template guidance)
  5. Launch Task tool agents for multi-agent review:
     - Primary Author creates draft
     - Parallel Reviewers (3-5) provide feedback
     - Documentation Synthesizer merges consensus
     - Documentation Archivist archives workflow
  6. Finalize artifacts to .aiwg/
```

## Core Platform Responsibilities

As the orchestrator, you (Claude Code core platform) must:

### 1. Natural Language Understanding

**User says**: "Let's transition to Elaboration"
**You understand**: This maps to `flow-inception-to-elaboration` orchestration

**Translation Map** (see `simple-language-translations.md`):
- "transition to Elaboration" → `flow-inception-to-elaboration`
- "start security review" → `flow-security-review-cycle`
- "create architecture baseline" → Extract SAD generation from elaboration flow
- "run iteration" → `flow-iteration-dual-track`

### 2. Flow Template Interpretation

**Read flow commands as orchestration templates**, not bash scripts:

```markdown
# What flow commands contain:
- **Artifacts to generate**: What documents/deliverables
- **Agent assignments**: Who is Primary Author, who reviews
- **Quality criteria**: What makes a document "complete"
- **Multi-agent workflow**: Review cycles, consensus process
- **Archive instructions**: Where to save final artifacts
```

**You extract**:
- Template paths to use
- Agent roles needed (from "Primary Authors", "Reviewers" sections)
- Review cycles required (parallel vs sequential)
- Output locations (.aiwg/ paths)

### 3. Agent Orchestration via Task Tool

**Launch agents in the correct sequence**:

```python
# Pseudo-code for your orchestration logic

# Step 1: Initialize workspace (you do this directly)
create_working_directory(".aiwg/working/architecture/sad/")

# Step 2: Primary Author (via Task tool)
Task(
    subagent_type="architecture-designer",
    description="Create Software Architecture Document draft",
    prompt="""
    Read template: $AIWG_ROOT/templates/analysis-design/software-architecture-doc-template.md
    Read requirements from: .aiwg/requirements/
    Create initial SAD draft covering:
    - System context
    - Component architecture
    - Deployment view
    - Security architecture
    - Data model

    Save draft to: .aiwg/working/architecture/sad/drafts/v0.1-primary-draft.md
    """
)

# Step 3: Parallel Reviewers (SINGLE message with MULTIPLE Task calls)
reviewers = [
    {"type": "security-architect", "focus": "Security architecture validation"},
    {"type": "test-architect", "focus": "Testability and test strategy"},
    {"type": "requirements-analyst", "focus": "Requirements traceability"},
    {"type": "technical-writer", "focus": "Clarity and consistency"}
]

# Launch all simultaneously in one message
for reviewer in reviewers:
    Task(
        subagent_type=reviewer["type"],
        description=f"Review SAD: {reviewer['focus']}",
        prompt=f"""
        Read draft: .aiwg/working/architecture/sad/drafts/v0.1-primary-draft.md
        Provide {reviewer['focus']} feedback.
        Add inline comments: <!-- {reviewer['type']}: your feedback -->
        Create review summary: .aiwg/working/architecture/sad/reviews/{reviewer['type']}-review.md
        Status: APPROVED | CONDITIONAL | NEEDS_WORK
        """
    )

# Step 4: Synthesizer (after all reviews complete)
Task(
    subagent_type="documentation-synthesizer",
    description="Merge all SAD review feedback",
    prompt="""
    Read all reviews from: .aiwg/working/architecture/sad/reviews/
    Read latest draft with inline comments

    Synthesize final document:
    - Merge all feedback
    - Resolve conflicts (document in synthesis report)
    - Create unified SAD

    Output:
    - .aiwg/architecture/software-architecture-doc.md (BASELINED)
    - .aiwg/working/architecture/sad/synthesis/synthesis-report.md
    """
)

# Step 5: Archive (you do this directly or via Archivist agent)
archive_workflow(".aiwg/working/architecture/sad/", ".aiwg/archive/2025-10/sad-complete/")
```

### 4. Progress Tracking and User Updates

**Keep user informed** throughout orchestration:

```markdown
✓ Initialized SAD workspace
✓ Architecture Designer created v0.1 draft (2,341 words)
⏳ Launching parallel review (4 agents)...
  ✓ Security Architect: APPROVED with suggestions
  ✓ Test Architect: CONDITIONAL (add test strategy section)
  ✓ Requirements Analyst: APPROVED
  ✓ Technical Writer: APPROVED (minor edits)
⏳ Synthesizing feedback...
✓ Final SAD created: .aiwg/architecture/software-architecture-doc.md
✓ Archived workflow: .aiwg/archive/2025-10/sad-complete/

**Summary**: Software Architecture Document complete.
Status: BASELINED (3 APPROVED, 1 CONDITIONAL resolved)
Test strategy section added per Test Architect feedback.
```

## Flow Command Structure (As Orchestration Templates)

### New Structure for Flow Commands

```markdown
---
description: [Brief description]
category: sdlc-orchestration
orchestration: true
allowed-tools: Task, Read, Write, Glob, TodoWrite
model: opus  # Orchestration requires reasoning
---

# Flow Name

You are the **Core Orchestrator** for this SDLC workflow.

## Your Role

**You orchestrate multi-agent workflows. You do NOT execute bash scripts.**

When the user requests this flow (via natural language or explicit command):
1. Interpret the request and confirm understanding
2. Read this template as your orchestration guide
3. Extract agent assignments and workflow steps
4. Launch agents via Task tool in correct sequence
5. Synthesize results and finalize artifacts
6. Report completion with summary

## Artifacts to Generate

**Primary Deliverables**:
- {artifact 1}: {description} → Output: {path}
- {artifact 2}: {description} → Output: {path}

**Supporting Artifacts**:
- {artifact 3}: {description} → Output: {path}

## Multi-Agent Workflow

### Artifact 1: {Name}

**Template**: `$AIWG_ROOT/templates/{category}/{template-name}.md`
**Output**: `.aiwg/{category}/{artifact-name}.md`

**Agent Assignments**:
- **Primary Author**: {role-name} (creates initial draft)
- **Reviewers** (parallel): {role-1}, {role-2}, {role-3}, technical-writer
- **Synthesizer**: {synthesizer-role}

**Orchestration Steps**:

1. **Initialize Workspace** (you do this directly)
   ```
   mkdir -p .aiwg/working/{category}/{artifact}/{drafts,reviews,synthesis}
   ```

2. **Primary Draft** (via Task tool)
   ```
   Task(
       subagent_type="{primary-author-role}",
       description="Create {artifact-name} draft",
       prompt="""
       Read template: $AIWG_ROOT/templates/{category}/{template-name}.md
       Read inputs: {required-inputs}
       Create draft following template structure
       Save to: .aiwg/working/{category}/{artifact}/drafts/v0.1-primary-draft.md
       """
   )
   ```

3. **Parallel Review** (launch all in single message)
   ```
   # Launch these agents simultaneously:
   - Task(security-architect): Security validation
   - Task(test-architect): Testability review
   - Task(requirements-analyst): Requirements traceability
   - Task(technical-writer): Clarity and consistency

   Each reviewer:
   - Reads v0.1 draft
   - Adds inline feedback: <!-- ROLE: comment -->
   - Creates review: .aiwg/working/{category}/{artifact}/reviews/{role}-review.md
   - Status: APPROVED | CONDITIONAL | NEEDS_WORK
   ```

4. **Synthesis** (after all reviews return)
   ```
   Task(
       subagent_type="documentation-synthesizer",
       description="Merge feedback for {artifact-name}",
       prompt="""
       Read all reviews from: .aiwg/working/{category}/{artifact}/reviews/
       Merge feedback, resolve conflicts
       Create final: .aiwg/{category}/{artifact-name}.md
       Document synthesis: .aiwg/working/{category}/{artifact}/synthesis/synthesis-report.md
       """
   )
   ```

5. **Archive** (you do this directly)
   ```
   Move .aiwg/working/{category}/{artifact}/
     to .aiwg/archive/{YYYY-MM}/{artifact-name}-{date}/
   ```

### Artifact 2: {Name}

{Repeat pattern for each artifact...}

## Quality Gates

Before marking workflow complete, verify:
- [ ] All required artifacts generated
- [ ] All reviewers provided sign-off (APPROVED or CONDITIONAL resolved)
- [ ] Final artifacts saved to .aiwg/{category}/
- [ ] Working drafts archived
- [ ] Synthesis reports document all changes

## User Communication

**At start**: Confirm understanding and list artifacts to generate
**During**: Update progress as agents complete (use emojis: ✓ ⏳)
**At end**: Summary report with artifact locations and status

## Error Handling

**If agent returns error**:
- Document the issue
- Attempt resolution (re-prompt with clarification)
- If unresolvable, escalate to user with context

**If review conflicts unresolvable**:
- Document conflict in synthesis report
- Escalate to user for decision
- Proceed once user provides guidance

## Success Criteria

Workflow succeeds when:
- [ ] All artifacts created and baselined
- [ ] Multi-agent review complete for each artifact
- [ ] Synthesis reports document all feedback
- [ ] Working files archived
- [ ] User receives completion summary
```

## Simple Language Translations

**Users don't type slash commands. They use natural language.**

### Translation Examples

| User Says | You Understand | Flow Template |
|-----------|----------------|---------------|
| "Let's transition to Elaboration" | Start Inception→Elaboration transition | `flow-inception-to-elaboration` |
| "Start security review" | Initiate security review cycle | `flow-security-review-cycle` |
| "Create architecture baseline" | Generate SAD and ADRs | Extract from `flow-inception-to-elaboration` Step 3 |
| "Run iteration 5" | Execute dual-track iteration | `flow-iteration-dual-track` with iteration=5 |
| "Deploy to production" | Orchestrate production deployment | `flow-deploy-to-production` |
| "Check if we can transition" | Validate phase gate criteria | `flow-gate-check` |

### Intent Recognition Patterns

**Phase Transitions**:
- "move to {phase}", "transition to {phase}", "start {phase}"
- → Map to appropriate `flow-{phase1}-to-{phase2}` template

**Workflow Requests**:
- "create {artifact}", "generate {artifact}", "need {artifact}"
- → Extract artifact generation from relevant flow

**Review Cycles**:
- "review {domain}", "security check", "test validation"
- → Map to `flow-{domain}-review-cycle`

**Status Checks**:
- "where are we", "what's next", "can we proceed"
- → Execute `project-status` or relevant `flow-gate-check`

## CLAUDE.md Framing Requirements

**Add to project CLAUDE.md** (or update global ~/.claude/CLAUDE.md):

```markdown
## AIWG SDLC Orchestrator Role

**IMPORTANT**: You are the **Core Orchestrator** for SDLC workflows, not a command executor.

### Your Orchestration Responsibilities

1. **Natural Language Understanding**: Interpret user requests and map to appropriate flow templates
2. **Multi-Agent Coordination**: Launch agents via Task tool for collaborative document creation
3. **Workflow Management**: Track progress, synthesize consensus, finalize artifacts
4. **Quality Assurance**: Ensure all artifacts meet review criteria before baseline

### How to Orchestrate Workflows

When user requests SDLC workflows:

1. **Read flow commands as templates** (in `.claude/commands/flow-*.md`):
   - Extract agent assignments
   - Identify artifacts to generate
   - Note quality criteria

2. **Launch agents via Task tool**:
   - Primary Author creates initial draft
   - Parallel Reviewers (3-5) provide feedback
   - Documentation Synthesizer merges consensus
   - Document results to .aiwg/

3. **Track and communicate**:
   - Update user on progress (✓ ⏳ symbols)
   - Report completion with artifact summary
   - Note any issues or escalations needed

### Multi-Agent Pattern

**Always follow this sequence**:
```
Primary Author → Parallel Reviewers → Synthesizer → Archive
     ↓                ↓                    ↓           ↓
  Draft v0.1    Reviews (3-5)      Final merge    .aiwg/archive/
```

**Launch reviewers in parallel** (single message, multiple Task tool calls).

### Natural Language Commands

Users will say things like:
- "Let's transition to Elaboration"
- "Create the architecture baseline"
- "Run security review"

You translate these to flow templates and orchestrate the multi-agent workflow.

### Reference Documentation

- **Multi-Agent Pattern**: `$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/docs/multi-agent-documentation-pattern.md`
- **Orchestrator Architecture**: `$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/docs/orchestrator-architecture.md`
- **Flow Templates**: `.claude/commands/flow-*.md`
```

## Implementation Checklist

To fully implement orchestrator architecture:

- [ ] Update all 24 flow commands to orchestration template structure
- [ ] Add orchestrator framing to CLAUDE.md
- [ ] Create simple-language-translations.md mapping
- [ ] Test multi-agent orchestration with one flow
- [ ] Document orchestration patterns by workflow type
- [ ] Update flow command parameters (--guidance, --interactive) to work with orchestration
- [ ] Ensure agent deployment includes all reviewer agents
- [ ] Validate Task tool usage patterns for parallel launches

## Benefits of Orchestrator Architecture

### 1. Higher Quality Outputs
- Multi-perspective review catches gaps
- Domain experts validate technical correctness
- Synthesizer ensures consistency

### 2. Better User Experience
- Natural language interface (no slash commands)
- Progress visibility throughout workflow
- Clear completion summaries

### 3. Maintainability
- Commands are templates (easier to update)
- Agent coordination logic in core platform
- Single source of truth for workflows

### 4. Flexibility
- Easy to add new review roles
- Workflows adapt to guidance
- Parallel execution speeds completion

### 5. Traceability
- Complete audit trail (drafts, reviews, synthesis)
- Clear accountability (who reviewed, who approved)
- Compliance-friendly documentation

## Next Steps

1. **Create simple-language-translations.md** - Map natural language to flows
2. **Update CLAUDE.md** - Add orchestrator framing
3. **Rework first flow** - Convert `flow-inception-to-elaboration` to orchestration template
4. **Test pattern** - Execute one complete multi-agent workflow
5. **Apply to all flows** - Systematically convert all 24 flow commands
6. **Document examples** - Create cookbook of orchestration patterns

## Example: Complete Orchestration

**User**: "Let's transition to Elaboration"

**You (Core Orchestrator)**:

```
Understood. I'll orchestrate the Inception → Elaboration transition.

This will generate:
- Software Architecture Document (SAD)
- Architecture Decision Records (3-5 ADRs)
- Master Test Plan
- Elaboration Phase Plan

I'll coordinate multiple agents for comprehensive review. This will take approximately 15-20 minutes.

Starting orchestration...

✓ Initialized workspaces
⏳ SAD Draft (Architecture Designer)...
✓ SAD v0.1 draft complete (3,245 words)
⏳ Launching parallel review (4 agents)...
  ✓ Security Architect: APPROVED with suggestions
  ✓ Test Architect: CONDITIONAL (add performance test strategy)
  ✓ Requirements Analyst: APPROVED
  ✓ Technical Writer: APPROVED (minor edits)
⏳ Synthesizing SAD...
✓ SAD BASELINED: .aiwg/architecture/software-architecture-doc.md

⏳ ADR-001 (Database Selection) - Architecture Designer...
✓ ADR-001 draft complete
⏳ Reviewing ADR-001 (3 agents)...
  ✓ Security Architect: APPROVED
  ✓ Test Architect: APPROVED
  ✓ Technical Writer: APPROVED
✓ ADR-001 BASELINED: .aiwg/architecture/adr/ADR-001-database-selection.md

{...continue for all artifacts...}

─────────────────────────────────────────────
Transition Complete ✓
─────────────────────────────────────────────

Generated Artifacts:
✓ Software Architecture Document (.aiwg/architecture/software-architecture-doc.md)
✓ ADR-001: Database Selection (.aiwg/architecture/adr/ADR-001-database-selection.md)
✓ ADR-002: API Architecture (.aiwg/architecture/adr/ADR-002-api-architecture.md)
✓ ADR-003: Authentication (.aiwg/architecture/adr/ADR-003-authentication.md)
✓ Master Test Plan (.aiwg/testing/master-test-plan.md)
✓ Elaboration Phase Plan (.aiwg/planning/phase-plan-elaboration.md)

Review Status: All artifacts reviewed and APPROVED by responsible roles
Archived: Complete workflow saved to .aiwg/archive/2025-10/elaboration-transition/

Next Steps:
- Review generated artifacts
- Run `/flow-gate-check elaboration` to validate readiness
- Begin Elaboration activities per phase plan
```

This is the orchestrator in action.
