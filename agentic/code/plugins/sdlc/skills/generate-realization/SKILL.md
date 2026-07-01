---
namespace: aiwg
name: generate-realization
platforms: [all]
description: Generate behavioral specifications (Layer 3) from use cases and architecture documents using multi-agent orchestration
commandHint:
  argumentHint: <UC-NNN> [--all] [--guidance "text"] [--interactive]
  allowedTools: Task, Read, Write, Glob, TodoWrite
  model: opus
  category: sdlc-orchestration
  orchestration: true
---

# Generate Use Case Realization

**You are the Core Orchestrator** for use case realization generation — producing the behavioral specification layer (Layer 3) that bridges use cases (Layer 2) to implementation.

## Your Role

**You orchestrate multi-agent workflows. You do NOT execute bash scripts.**

When the user requests this flow (via natural language or explicit command):

1. **Interpret the request** and confirm understanding
2. **Read this template** as your orchestration guide
3. **Identify target use case(s)** — single or batch
4. **Launch agents via Task tool** in correct sequence
5. **Synthesize results** and finalize artifacts
6. **Update traceability** and report completion

## Natural Language Triggers

Users may say:
- "Generate realization for UC-001"
- "Create behavioral spec for UC-042"
- "Realize UC-007"
- "Generate all use case realizations"
- "Create the Layer 3 specs"
- "Realize all use cases"
- "Build the behavioral specifications"
- "Generate realizations for all architecturally significant use cases"
- "Create sequence diagrams for UC-NNN"
- "Add DES-UCR for UC-NNN"

You recognize these as requests for this orchestration flow.

## Parameters

### UC-NNN (positional, required unless --all)

The use case ID to generate a realization for: `UC-001`

The orchestrator reads the use case document from `.aiwg/requirements/UC-NNN.md` (or any `.aiwg/requirements/UC-NNN*.md` match).

### --all (optional)

Batch generate realizations for all use cases found in `.aiwg/requirements/UC-*.md` that do not already have a corresponding realization in `.aiwg/requirements/realizations/`.

When `--all` is set:
- Glob all `UC-*.md` files in `.aiwg/requirements/`
- Skip any UC that already has a `DES-UCR-NNN.md` in `.aiwg/requirements/realizations/`
- Process remaining use cases sequentially to control context budget
- Report a completion table at the end

### --guidance (optional)

**Purpose**: User provides upfront direction to tailor the realization approach.

**Examples**:
```
--guidance "Focus on security flows — this system handles PII"
--guidance "Emphasize async patterns, we use event-driven architecture"
--guidance "Be thorough on error paths — this is a payment flow"
--guidance "Include state machine specs for all stateful entities"
```

**How to Apply**:
- Pass guidance verbatim to all agent prompts as additional context
- Guidance influences: depth of error path coverage, security emphasis, diagram density
- Guidance does not override completeness criteria

### --interactive (optional)

**Purpose**: Ask clarifying questions before generating to tailor output.

**Questions to Ask** (if --interactive):

```
I'll ask a few questions to tailor the realization:

Q1: What is the primary architectural concern for this use case?
    (e.g., security, performance, reliability, data consistency)

Q2: Are there known integration points or external systems involved?
    (Help me include the right participants in sequence diagrams)

Q3: Should I generate supplementary specs if I find stateful entities
    or complex branching? (State machine specs, decision tables)

Q4: Are there existing ADRs that constrain this realization?
    (e.g., "we use event sourcing", "REST only, no gRPC")

Q5: Who will review this realization?
    (Helps me calibrate depth and formality)
```

## Multi-Agent Orchestration Workflow

### Pattern

```
Architecture Designer (primary author)
    ↓ draft DES-UCR-NNN.md
Parallel Reviewers (single message, all at once):
    ├── Security Architect     → auth/authz gap analysis
    ├── Test Architect         → testability + test scenario extraction
    └── Domain Expert          → business logic accuracy
    ↓ all reviews complete
Documentation Synthesizer
    ↓ merges feedback → final DES-UCR-NNN.md
Archive → .aiwg/requirements/realizations/
```

**Critical**: Launch all three parallel reviewers in a **single message** with multiple Task calls.

---

### Step 1: Initialize

**Your Actions**:

1. **Parse parameters** — determine UC-NNN or --all batch mode
2. **Read the target use case(s)**:
   ```
   Glob: .aiwg/requirements/UC-NNN*.md
   Read: matched file(s)
   ```
3. **Read architecture inputs**:
   ```
   Read: .aiwg/architecture/software-architecture-doc.md
   Glob: .aiwg/architecture/adr/*.md
   Read: matched ADR files
   ```
4. **Check for existing realizations** (skip if present):
   ```
   Glob: .aiwg/requirements/realizations/DES-UCR-NNN.md
   ```
5. **Ensure output directory exists**: `.aiwg/requirements/realizations/`

**Communicate Progress**:
```
✓ Use case loaded: UC-NNN — {title}
✓ Architecture document loaded
✓ ADRs loaded: {count} decisions
⏳ Starting realization generation...
```

---

### Step 2: Primary Author — Architecture Designer

**Purpose**: Create the initial use case realization draft with sequence diagrams and component mapping.

```
Task(
    subagent_type="architecture-designer",
    description="Create use case realization draft for UC-NNN",
    prompt="""
    Read the use case realization template:
    $AIWG_ROOT/agentic/code/frameworks/sdlc-complete/templates/analysis-design/use-case-realization-template.md

    Read the target use case:
    .aiwg/requirements/{UC-NNN}.md

    Read the architecture document:
    .aiwg/architecture/software-architecture-doc.md

    Read all ADRs from: .aiwg/architecture/adr/

    Using the template and source documents, generate a complete use case realization:

    REQUIRED SECTIONS:
    - Metadata block (ID: DES-UCR-NNN, status: draft, dates, related IDs)
    - Traceability (parent UC, SAD section, ADRs referenced)
    - Use Case Summary (actor, scope, level, trigger, pre/postconditions)
    - Participating Components table (every actor and component with interface)
    - Main Success Scenario — MermaidJS sequenceDiagram
    - Alternate Flows (≥2 alternates if present in UC)
    - Exception Flows (all exception paths from the UC)
    - Component Responsibilities section
    - Completeness checklist (all items evaluated)

    DIAGRAM REQUIREMENTS:
    - Use MermaidJS sequenceDiagram syntax
    - Maximum 15 participants per diagram; split into sub-diagrams if needed
    - Every UC step must map to at least one message in the sequence diagram
    - Show activation boxes for long-running operations
    - Include return messages for synchronous calls

    SUPPLEMENTARY SPECS — generate these if applicable:
    - State machine spec (DES-SM-NNN.md) if the UC involves stateful entities
      (entities with lifecycle states like: order, session, workflow, subscription)
    - Decision table (DES-DT-NNN.md) if the UC has ≥3 branching conditions
    - Method interface contracts (DES-MIC-NNN.md) for each key method identified
      in the sequence diagrams (one contract per method, minimum 3 for complex UCs)

    ADDITIONAL GUIDANCE (if provided):
    {guidance}

    Save the primary draft to:
    .aiwg/working/realizations/DES-UCR-NNN-draft.md

    If supplementary specs are generated, save to:
    .aiwg/working/realizations/DES-SM-NNN-draft.md (if applicable)
    .aiwg/working/realizations/DES-DT-NNN-draft.md (if applicable)
    .aiwg/working/realizations/DES-MIC-NNN-draft.md (if applicable)

    At the end of your output, list:
    - SUPPLEMENTARY_SPECS: [SM | DT | MIC | none]
    - STATEFUL_ENTITIES: [entity names or none]
    - BRANCH_CONDITIONS: [count or 0]
    - KEY_METHODS: [method names or none]
    """
)
```

**After primary author completes**:
```
✓ DES-UCR-NNN draft complete
⏳ Launching parallel review (3 agents)...
```

---

### Step 3: Parallel Review (single message — all three at once)

**Launch all three reviewers in one message:**

```
# Reviewer 1: Security Architect
Task(
    subagent_type="security-architect",
    description="Security review of DES-UCR-NNN realization draft",
    prompt="""
    Read the use case realization draft:
    .aiwg/working/realizations/DES-UCR-NNN-draft.md

    Read the original use case:
    .aiwg/requirements/{UC-NNN}.md

    Perform a security-focused review of the behavioral specification:

    CHECK FOR:
    - Authentication: Is the actor's identity verified before sensitive operations?
    - Authorization: Are permission checks shown at each access-controlled step?
    - Data exposure: Are sensitive fields (PII, credentials, keys) protected in transit?
    - Input validation: Are untrusted inputs validated before processing?
    - Error message safety: Do exception flows avoid leaking internal details?
    - Session management: Are session tokens created/invalidated correctly?
    - Audit logging: Are security-relevant events logged in the sequence?
    - OWASP Top 10 relevance: Flag any Top 10 patterns present in this UC

    OUTPUT FORMAT:
    ## Security Review: DES-UCR-NNN

    ### Status: APPROVED | CONDITIONAL | BLOCKED

    ### Gaps Found
    (List each gap with: location in diagram, risk level [HIGH/MED/LOW], remediation)

    ### Approved Flows
    (List flows that pass security review)

    ### Required Changes
    (Numbered list of mandatory changes before approval)

    ### Recommendations
    (Optional improvements)

    Save to: .aiwg/working/realizations/DES-UCR-NNN-review-security.md
    """
)

# Reviewer 2: Test Architect
Task(
    subagent_type="test-architect",
    description="Testability review of DES-UCR-NNN realization draft",
    prompt="""
    Read the use case realization draft:
    .aiwg/working/realizations/DES-UCR-NNN-draft.md

    Read the original use case:
    .aiwg/requirements/{UC-NNN}.md

    Perform a testability and test scenario review:

    CHECK FOR:
    - Testability: Is every sequence step observable and verifiable in tests?
    - Test boundaries: Are integration seams clearly defined (mocking points)?
    - Happy path coverage: Can the main success scenario be driven end-to-end?
    - Negative path coverage: Are exception flows independently triggerable?
    - State assertions: Are pre/postconditions verifiable with assertions?
    - Test data requirements: What fixtures or stubs are needed?
    - Performance test hooks: Are SLO-relevant operations identifiable?

    EXTRACT TEST SCENARIOS:
    For each flow in the realization, write a one-line test scenario:
    - "GIVEN {precondition} WHEN {trigger} THEN {expected outcome}"
    Minimum: 1 scenario per flow (main + alternates + exceptions)

    OUTPUT FORMAT:
    ## Test Architect Review: DES-UCR-NNN

    ### Status: APPROVED | CONDITIONAL | BLOCKED

    ### Testability Issues
    (List each issue with location and required fix)

    ### Test Scenarios Extracted
    (Numbered GIVEN/WHEN/THEN list — these become test case seeds)

    ### Required Changes
    (Mandatory changes before implementation)

    ### Test Data Requirements
    (Fixtures, stubs, or external dependencies needed for testing)

    Save to: .aiwg/working/realizations/DES-UCR-NNN-review-test.md
    """
)

# Reviewer 3: Domain Expert
Task(
    subagent_type="domain-expert",
    description="Business logic accuracy review of DES-UCR-NNN realization draft",
    prompt="""
    Read the use case realization draft:
    .aiwg/working/realizations/DES-UCR-NNN-draft.md

    Read the original use case:
    .aiwg/requirements/{UC-NNN}.md

    Read the architecture document:
    .aiwg/architecture/software-architecture-doc.md

    Perform a business logic and domain accuracy review:

    CHECK FOR:
    - Step fidelity: Does every UC step appear in the sequence diagrams?
    - Business rule coverage: Are all business rules from the UC enforced in the flow?
    - Domain language: Are entity names, actor names, and terms consistent with the UC?
    - Alternate flow completeness: Do alternate flows match the UC alternate paths?
    - Exception handling: Do exception flows match UC exception paths?
    - Traceability accuracy: Are UC step references in the realization correct?
    - Postcondition satisfaction: Does the main flow produce the stated postcondition?

    OUTPUT FORMAT:
    ## Domain Expert Review: DES-UCR-NNN

    ### Status: APPROVED | CONDITIONAL | BLOCKED

    ### Fidelity Gaps
    (Steps in the UC not represented in the realization)

    ### Business Rule Violations
    (Rules present in the UC but missing or wrong in the realization)

    ### Required Changes
    (Mandatory corrections)

    ### Minor Issues
    (Non-blocking inconsistencies to address)

    Save to: .aiwg/working/realizations/DES-UCR-NNN-review-domain.md
    """
)
```

**After all three reviews complete**:
```
  ✓ Security Architect: {APPROVED | CONDITIONAL | BLOCKED}
  ✓ Test Architect: {APPROVED | CONDITIONAL | BLOCKED}
  ✓ Domain Expert: {APPROVED | CONDITIONAL | BLOCKED}
⏳ Synthesizing final realization...
```

---

### Step 4: Documentation Synthesizer

**Purpose**: Merge all reviewer feedback into the final behavioral specification.

```
Task(
    subagent_type="documentation-synthesizer",
    description="Synthesize DES-UCR-NNN final realization from reviews",
    prompt="""
    Read the primary draft:
    .aiwg/working/realizations/DES-UCR-NNN-draft.md

    Read all three review files:
    .aiwg/working/realizations/DES-UCR-NNN-review-security.md
    .aiwg/working/realizations/DES-UCR-NNN-review-test.md
    .aiwg/working/realizations/DES-UCR-NNN-review-domain.md

    Synthesize the final use case realization:

    MERGE PROTOCOL:
    1. Apply all REQUIRED CHANGES from every review (mandatory — do not skip)
    2. Apply APPROVED items without modification
    3. For CONDITIONAL status: resolve each condition by incorporating the fix
    4. For BLOCKED status: flag the blocking issue clearly in the document header
    5. Incorporate test scenarios from the Test Architect into a "Test Scenarios"
       section at the end of the document
    6. Update the metadata: status → "approved" (or "blocked" if any reviewer blocked)
    7. Update the Reviewers field in the metadata block with all three reviewer roles
    8. Update the completeness checklist — all items should now be checked

    FINAL DOCUMENT STRUCTURE:
    (Follow the use-case-realization template exactly)
    - Metadata (status updated, reviewers listed)
    - Traceability
    - Use Case Summary
    - Participating Components
    - Main Success Scenario (sequence diagram — updated per reviews)
    - Alternate Flows (updated per domain review)
    - Exception Flows (updated per security and domain reviews)
    - Component Responsibilities
    - Test Scenarios (from test architect review)
    - Completeness Checklist (all items evaluated and checked)

    Save the final document to:
    .aiwg/requirements/realizations/DES-UCR-NNN.md

    If supplementary specs were generated in the draft step, synthesize them too:
    - Apply relevant review feedback to each spec
    - Save to:
      .aiwg/requirements/realizations/DES-SM-NNN.md (if applicable)
      .aiwg/requirements/realizations/DES-DT-NNN.md (if applicable)
      .aiwg/requirements/realizations/DES-MIC-NNN.md (if applicable)

    At the end of your output, report:
    - FINAL_STATUS: approved | blocked | conditional
    - BLOCKING_ISSUES: [list or none]
    - SUPPLEMENTARY_ARTIFACTS: [list of DES-*-NNN.md files created or none]
    """
)
```

---

### Step 5: Update Traceability

**Purpose**: Link the new realization back to its use case in the traceability index.

**Your Direct Actions** (no Task needed for simple index update):

1. **Read** `.aiwg/requirements/traceability-index.md` (if it exists)
2. **Add or update** the UC → realization link:
   ```
   UC-NNN → DES-UCR-NNN.md [+ DES-SM-NNN.md, DES-DT-NNN.md, DES-MIC-NNN.md if generated]
   ```
3. **Write** updated index

If no traceability index exists, create a minimal entry in a new file at `.aiwg/requirements/traceability-index.md`.

---

### Step 6: Report Completion

**Your Direct Communication**:

```
─────────────────────────────────────────────
Use Case Realization Complete: UC-NNN
─────────────────────────────────────────────

Primary Artifact:
  .aiwg/requirements/realizations/DES-UCR-NNN.md

Supplementary Specs:
  {DES-SM-NNN.md — State Machine: {entity name} | none}
  {DES-DT-NNN.md — Decision Table: {condition count} branches | none}
  {DES-MIC-NNN.md — Method Interface Contracts: {count} methods | none}

Review Summary:
  Security Architect:   {APPROVED | CONDITIONAL | BLOCKED}
  Test Architect:       {APPROVED | CONDITIONAL | BLOCKED}
  Domain Expert:        {APPROVED | CONDITIONAL | BLOCKED}

Final Status: {APPROVED | BLOCKED}

{If BLOCKED:}
  Blocking Issues:
  - {issue 1}
  - {issue 2}
  These must be resolved before the realization can be used as implementation input.

Test Scenarios Extracted: {count} scenarios
  (See: .aiwg/requirements/realizations/DES-UCR-NNN.md — Test Scenarios section)

Traceability Updated:
  UC-NNN → DES-UCR-NNN {+ supplementary IDs}

─────────────────────────────────────────────
```

---

## Batch Mode (--all)

When `--all` is specified:

### Step 1: Discover and Plan

```
Glob all: .aiwg/requirements/UC-*.md
Glob existing: .aiwg/requirements/realizations/DES-UCR-*.md

Compute:
- PENDING = UC-*.md files with no corresponding DES-UCR
- SKIP = UC-*.md files already realized

Report plan to user:
  Realizations to generate: {count} — {UC-NNN, UC-NNN, ...}
  Already realized (skip): {count} — {UC-NNN, ...}
  Starting batch generation...
```

### Step 2: Sequential Processing

Process each pending use case sequentially (not in parallel) to respect context budget.

For each UC in PENDING:
- Execute Steps 1–5 above for that UC
- Report per-UC status before moving to next

### Step 3: Batch Summary

After all use cases are processed:

```
─────────────────────────────────────────────
Batch Realization Complete
─────────────────────────────────────────────

| Use Case | Status   | Artifacts Generated          |
|----------|----------|------------------------------|
| UC-001   | APPROVED | DES-UCR-001, DES-SM-001      |
| UC-002   | APPROVED | DES-UCR-002                  |
| UC-003   | BLOCKED  | DES-UCR-003 (see issues)     |
| UC-004   | SKIPPED  | Already realized             |

Total: {approved}/{total} approved, {blocked} blocked, {skipped} skipped
Traceability index updated for all generated realizations.

─────────────────────────────────────────────
```

---

## Completeness Criteria

A realization is complete when ALL of:

- [ ] Metadata block present with status, dates, and related IDs
- [ ] Traceability links to parent UC, SAD section, and relevant ADRs
- [ ] All UC participants appear in Participating Components table
- [ ] Main success scenario has a MermaidJS sequence diagram
- [ ] Every UC step maps to at least one diagram message
- [ ] All alternate flows from the UC are represented
- [ ] All exception flows from the UC are represented
- [ ] Security review: APPROVED or CONDITIONAL resolved
- [ ] Test review: APPROVED or CONDITIONAL resolved, test scenarios extracted
- [ ] Domain review: APPROVED or CONDITIONAL resolved
- [ ] Supplementary specs generated if stateful entities or complex branching detected
- [ ] Traceability index updated

---

## Error Handling

**Use case not found**:
```
❌ No use case found: UC-NNN
   Expected: .aiwg/requirements/UC-NNN*.md

   Available use cases:
   {glob .aiwg/requirements/UC-*.md and list}

   Please verify the UC ID and try again.
```

**Architecture document missing**:
```
⚠️ Architecture document not found: .aiwg/architecture/software-architecture-doc.md
   Generating realization with use case only — component mapping may be incomplete.
   Run /flow-inception-to-elaboration to produce the architecture document first.
```

**Reviewer blocks realization**:
```
⚠️ Realization blocked by {reviewer role}:
   {blocking issue description}

   The draft has been saved to: .aiwg/working/realizations/DES-UCR-NNN-draft.md
   Review the blocking issues, update the use case or architecture docs,
   then re-run: generate-realization UC-NNN
```

**Realization already exists**:
```
⚠️ Realization already exists: .aiwg/requirements/realizations/DES-UCR-NNN.md
   Use --force to regenerate (overwrites existing realization).
   Or open the existing file to inspect its status.
```

---

## Examples

### Single use case
```
generate-realization UC-001
```

### Single use case with guidance
```
generate-realization UC-042 --guidance "This UC handles payment processing — be thorough on error paths and PCI-DSS relevant flows"
```

### Interactive mode for a complex use case
```
generate-realization UC-017 --interactive
```

### Batch — generate all missing realizations
```
generate-realization --all
```

### Batch with guidance
```
generate-realization --all --guidance "Emphasize async patterns — we use event-driven architecture throughout"
```

---

## References

**Templates** (via $AIWG_ROOT):
- Use Case Realization: `agentic/code/frameworks/sdlc-complete/templates/analysis-design/use-case-realization-template.md`
- Sequence Diagram: `agentic/code/frameworks/sdlc-complete/templates/analysis-design/sequence-diagram-template.md`
- State Machine Spec: `agentic/code/frameworks/sdlc-complete/templates/analysis-design/state-machine-spec-template.md`
- Method Interface Contract: `agentic/code/frameworks/sdlc-complete/templates/analysis-design/method-interface-contract-template.md`
- Activity Diagram: `agentic/code/frameworks/sdlc-complete/templates/analysis-design/activity-diagram-spec-template.md`

**Multi-Agent Pattern**:
- `$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/docs/multi-agent-documentation-pattern.md`

**Orchestrator Architecture**:
- `$AIWG_ROOT/agentic/code/frameworks/sdlc-complete/docs/orchestrator-architecture.md`

**Gate Integration**:
- ABM gate checks for `DES-UCR-*.md` coverage in: `agentic/code/frameworks/sdlc-complete/skills/flow-gate-check/SKILL.md`
