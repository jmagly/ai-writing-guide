# SOP-Encoded Flow Command Template

## Frontmatter Metadata

```yaml
---
type: flow-command
category: [phase-transition | workflow | quality-gate]
trigger: [natural-language-pattern | explicit-command]
complexity: [low | medium | high]
estimated_duration: [time-estimate]
prerequisites:
  - artifact-type-1
  - artifact-type-2
outputs:
  - artifact-type-3
  - artifact-type-4
related_agents:
  - agent-role-1
  - agent-role-2
metagpt_pattern: [sequential | parallel | iterative]
---
```

## Command Overview

**Purpose**: [One sentence describing what this flow accomplishes]

**When to Use**: [Context for invoking this flow]

**Expected Outcome**: [What artifacts/state changes result from completion]

## Standard Operating Procedure

### Prerequisites (Blocking)

**Artifact Prerequisites**:
- [ ] @.aiwg/path/to/prerequisite-1.md - [Brief description of why needed]
- [ ] @.aiwg/path/to/prerequisite-2.md - [Brief description of why needed]

**State Prerequisites**:
- [ ] Phase gate [phase-name] approved
- [ ] Stakeholder sign-off obtained for [artifact-name]
- [ ] [Specific condition] confirmed

**Validation**: Before proceeding, verify all prerequisites exist and pass quality gates.

### Workflow Steps

**Step 1: [Agent Role] - [Task Name]**

**Input Artifacts**:
- @.aiwg/path/to/input-artifact.md
- @.aiwg/path/to/context-artifact.md (for reference)

**Action Sequence**:
1. Load and validate input artifacts:
   - Check schema compliance
   - Verify completeness (no "TBD" or "unclear" sections)
   - Confirm traceability links are valid
2. Perform [specific analysis/generation task]:
   - [Sub-task 1 with specific criteria]
   - [Sub-task 2 with specific criteria]
   - [Sub-task 3 with specific criteria]
3. Generate output according to [schema-name]:
   - Follow structure defined in Output Schema section
   - Include all required sections
   - Add @-mention references for traceability
4. Validate output against quality gates (see below)

**Output Artifact**:
- @.aiwg/path/to/output-artifact.md
- Schema: [schema-name] (see Output Schema section)

**Available Tools**:
- [tool-1]: [Purpose]
- [tool-2]: [Purpose]

**Constraints**:
- MUST NOT [boundary violation - what this agent should never do]
- MUST include [required element - what must always be present]
- MUST hand off to [next-agent] after completion

**Quality Gates** (must pass before proceeding):
- [ ] Output follows [schema-name] structure
- [ ] All required sections populated
- [ ] Traceability links valid (@-mentions resolve)
- [ ] [Domain-specific quality criterion]

---

**Step 2: [Next Agent Role] - [Next Task Name]**

**Subscription Trigger**: Receives [artifact-type-from-step-1] published to @.aiwg/[directory]

**Input Artifacts**:
- Output from Step 1: @.aiwg/path/to/artifact-from-step-1.md
- Additional context: @.aiwg/path/to/other-context.md

**Pre-Acceptance Validation**:
1. Verify Step 1 output quality gates passed
2. Check for blocking issues:
   - [ ] No "anything_unclear" fields populated
   - [ ] All dependencies resolved
   - [ ] Schema compliance confirmed
3. If validation fails:
   - Publish issue back to [Step-1-Agent]
   - Block until resolved
   - Log issue to @.aiwg/working/handoff-issues.md

**Action Sequence**:
1. [Specific task for this step]
2. [Next sub-task]
3. [Final sub-task]

**Output Artifact**:
- @.aiwg/path/to/step-2-output.md
- Schema: [schema-name-2]

**Quality Gates**:
- [ ] [Criteria 1]
- [ ] [Criteria 2]

---

**Step N: [Final Agent Role] - [Final Task]**

[Continue pattern for each step in the SOP]

**Action Sequence**:
1. [Final validation tasks]
2. Publish completion notification
3. Archive artifacts to @.aiwg/archive/[phase-name]/

**Output**:
- Completion report: @.aiwg/reports/[flow-name]-completion.md
- Archived artifacts in designated directory

### Exit Criteria (Gate Approval)

**Artifact Completeness**:
- [ ] All steps completed successfully
- [ ] All outputs follow specified schemas
- [ ] Traceability established (all @-mentions valid)

**Quality Validation**:
- [ ] No blocking issues in @.aiwg/working/handoff-issues.md
- [ ] Token efficiency within target (< 150 tokens/line if code)
- [ ] Human correction count < 1.5 per major artifact

**Handoff Readiness**:
- [ ] Artifacts published to correct .aiwg/ directories
- [ ] Downstream agents notified (via subscription)
- [ ] Phase gate documentation updated

## Output Schemas

### Schema: [Schema-Name-1]

**Purpose**: [What this schema defines]

**File Location**: @.aiwg/[directory]/[filename-pattern].md

**Required Sections**:

```markdown
# [Artifact Title]

## Section 1: [Name]
**Purpose**: [Why this section exists]
**Format**: [list | prose | table | diagram]
**Validation Rules**:
- MUST contain [specific element]
- MUST NOT include [prohibited element]
- MUST link to [related artifact type]

**Example**:
[Brief example of what this section looks like]

## Section 2: [Name]
[Continue for each required section]

## References
**Required @-mentions**:
- @.aiwg/[upstream-artifact].md - [Relationship]
- @.aiwg/[context-artifact].md - [Relationship]
- @src/[implementation].ts - [If applicable]
- @test/[test-file].ts - [If applicable]
```

**Quality Gates**:
- [ ] All required sections present
- [ ] Section validation rules met
- [ ] References section includes all required @-mentions
- [ ] No "TBD" or "unclear" markers remaining

---

### Schema: [Schema-Name-2]

[Repeat schema definition pattern for each output type]

## Subscription Rules

### [Agent-Role-1] Subscription

**Activates When**:
- Receives artifact type: [artifact-type]
- From directory: @.aiwg/[directory]/*.md
- Published by: [upstream-agent-role]

**Filters**:
- ONLY processes files matching: [pattern]
- IGNORES files in:
  - @.aiwg/working/** (temporary)
  - @.aiwg/archive/** (historical)

**Publishes**:
- Artifact type: [output-schema-name]
- To directory: @.aiwg/[output-directory]/
- Notifies: [downstream-agent-1], [downstream-agent-2]

---

### [Agent-Role-2] Subscription

[Continue pattern for each agent in the workflow]

## Handoff Checklist

Before marking this flow as complete, verify:

**Artifact Publication**:
- [ ] All outputs in correct @.aiwg/ directories
- [ ] No artifacts left in @.aiwg/working/ (cleanup done)
- [ ] Filename patterns match schema specifications

**Traceability Validation**:
- [ ] All @-mentions resolve to existing files
- [ ] Bidirectional links established where appropriate
- [ ] Requirements → Design → Implementation → Test chain complete

**Quality Assurance**:
- [ ] Schema compliance verified for all outputs
- [ ] Quality gates passed for each step
- [ ] No blocking issues outstanding

**Downstream Notification**:
- [ ] Subscription notifications sent (artifacts published)
- [ ] Handoff documentation updated
- [ ] Phase gate status updated

**Token Efficiency** (if applicable):
- [ ] Token count logged
- [ ] Efficiency metrics within target
- [ ] Verbose anti-patterns avoided

## Iterative Workflow Pattern (if applicable)

**For flows with executable feedback loops** (e.g., code generation, test creation):

```markdown
### Iteration Protocol (Max 3 Attempts)

**Attempt 1: Initial Generation**
1. Generate artifact based on requirements
2. Execute validation/tests
3. Capture results

**If Success**:
- Proceed to next step

**If Failure**:
- Capture debugging context:
  - Error messages + tracebacks
  - Comparison against requirements
  - Review of architectural constraints
  - Prior attempt artifacts
- Proceed to Attempt 2

**Attempt 2: Corrective Generation**
1. Review debugging context from Attempt 1
2. Identify root cause of failure
3. Regenerate with corrections
4. Execute validation/tests
5. Capture results

**If Success**: Proceed
**If Failure**: Proceed to Attempt 3 with enhanced context

**Attempt 3: Final Attempt**
1. Review both prior attempts
2. Consult additional context sources
3. Regenerate with comprehensive fixes
4. Execute validation/tests

**If Success**: Proceed
**If Failure**: Escalate to human or senior agent

**Escalation Criteria**:
- 3 consecutive failures
- Blocking dependency issue
- Architectural ambiguity requiring human decision
```

## Post-Completion

After this flow completes successfully:

### 1. Workspace Health Check (Recommended)

Run a workspace health assessment to ensure alignment:

```
/project-status
```

Or ask: "check workspace health"

This will:
- Verify artifacts are properly archived
- Check for stale files in .aiwg/working/
- Confirm documentation alignment with current phase
- Suggest any cleanup actions

### 2. Common Follow-up Actions

**If workspace needs cleanup**:
- `/workspace-prune-working` - Remove stale draft files
- `/workspace-realign` - Reorganize misaligned documentation

**If documentation is out of sync**:
- `/aiwg-regenerate` - Regenerate context files
- `/check-traceability` - Verify requirement links

### 3. Notify Stakeholders

Consider updating stakeholders on completion:
- Update project status board
- Send completion notification
- Schedule next phase kickoff (if phase transition)

## Usage Notes

**Token Efficiency Tips**:
- Use numbered steps, not verbose prose
- Reference artifacts via @-mentions, don't copy content
- Employ structured schemas, not free-form descriptions
- Limit agent scope to prevent off-topic generation

**Hallucination Prevention**:
- Enforce narrow agent responsibilities (see Constraints)
- Require structured handoff validation (see Pre-Acceptance Validation)
- Implement executable feedback where applicable
- Use subscription filters to prevent information overload

**Quality Assurance**:
- All outputs MUST follow defined schemas
- All quality gates MUST pass before proceeding
- All @-mentions MUST resolve to existing files
- Human correction target: < 1.5 per major artifact

## References

- @.aiwg/research/docs/sop-encoding-guide.md - How to encode SOPs
- @docs/references/REF-013-metagpt-multi-agent-framework.md - MetaGPT research basis
- @agentic/code/frameworks/sdlc-complete/agents/manifest.json - Available agents
- @agentic/code/frameworks/sdlc-complete/templates/flow-patterns/requirements-sop-example.md - Concrete example

## Metadata

**Created**: [Date]
**Last Updated**: [Date]
**Pattern Source**: MetaGPT REF-013 (ICLR 2024)
**Issue**: [Related issue number]

---

**Template Version**: 1.0.0
**License**: CC-BY-4.0
**Part of**: AIWG SDLC Framework
