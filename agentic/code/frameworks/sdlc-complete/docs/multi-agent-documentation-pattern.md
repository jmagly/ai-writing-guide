# Multi-Agent Documentation Pattern

## Overview

The Multi-Agent Documentation Pattern ensures SDLC artifacts receive comprehensive, multi-perspective review by having specialized agents collaborate on document creation. This approach produces higher-quality, more complete documentation than single-agent generation.

## Pattern Architecture

### Workflow

```
1. Primary Agent (Domain Expert)
   ↓ Creates initial draft
2. Working Draft (.aiwg/working/{type}/{name}/drafts/v0.1)
   ↓ Distributed to reviewers
3. Parallel Review (Responsible Roles from template metadata)
   ├─ Security Architect → security perspective
   ├─ Test Architect → testability perspective
   ├─ Requirements Analyst → requirements alignment
   └─ Technical Writer → clarity and consistency
   ↓ Each adds inline comments/feedback
4. Documentation Archivist (tracks versions, manages workflow)
   ↓ Collects all feedback
5. Documentation Synthesizer (merges all perspectives)
   ↓ Resolves conflicts, creates unified document
6. Final Document (.aiwg/{type}/{name}.md - BASELINED)
   ↓ Archived for audit trail
7. Archive (.aiwg/archive/{date}/{name}/ - complete history)
```

### Roles

| Role | Responsibility | Model | When Invoked |
|------|---------------|-------|--------------|
| **Primary Author** | Creates initial draft from domain expertise | opus | Always (starts workflow) |
| **Responsible Reviewers** | Provide domain-specific feedback | opus/sonnet | Parallel (after draft) |
| **Technical Writer** | Ensures clarity, consistency, quality | sonnet | Parallel (with reviewers) |
| **Documentation Archivist** | Manages versions, tracks workflow | sonnet | Throughout (version control) |
| **Documentation Synthesizer** | Merges feedback, resolves conflicts | opus | After all reviews complete |

### Specialized Documentation Agents

**Created for this pattern:**
1. **Documentation Synthesizer** - Merges multi-agent feedback
2. **Technical Writer** - Clarity and consistency
3. **Documentation Archivist** - Version history and audit trails
4. **Requirements Documenter** - Requirements artifacts specialist
5. **Architecture Documenter** - Architecture artifacts specialist
6. **Test Documenter** - Test artifacts specialist

**Existing domain agents used:**
- Architecture Designer, Security Architect, Test Architect, Requirements Analyst, etc.

## Template Metadata

Templates define collaboration structure via "Ownership & Collaboration" section:

```markdown
## Ownership & Collaboration

- Document Owner: {primary-author-role}
- Contributor Roles: {reviewer-role-1}, {reviewer-role-2}, {reviewer-role-3}
- Automation Inputs: {what primary author needs}
- Automation Outputs: {final document path and name}
```

**Example (Software Architecture Document):**
```markdown
## Ownership & Collaboration

- Document Owner: Software Architect
- Contributor Roles: System Analyst, Designer, Test Architect
- Automation Inputs: Approved requirements set, non-functional drivers
- Automation Outputs: `software-architecture.md` including views and decisions
```

## Implementation in Flow Commands

### Step-by-Step Pattern

**1. Initialize Documentation Workflow**

```bash
# Archivist creates working directory structure
mkdir -p .aiwg/working/architecture/software-architecture-doc/{drafts,reviews,synthesis}

# Initialize metadata tracking
cat > .aiwg/working/architecture/software-architecture-doc/metadata.json <<EOF
{
  "document-id": "software-architecture-doc",
  "template-source": "~/.local/share/ai-writing-guide/.../software-architecture-doc-template.md",
  "primary-author": "architecture-designer",
  "reviewers": ["security-architect", "test-architect", "requirements-analyst", "technical-writer"],
  "synthesizer": "architecture-documenter",
  "status": "DRAFT",
  "current-version": "0.1"
}
EOF
```

**2. Primary Author Creates Draft**

```bash
# Architecture Designer reads template
TEMPLATE=~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/templates/analysis-design/software-architecture-doc-template.md

# Creates initial draft
# (Agent reads requirements, designs architecture, structures per template)

# Archivist saves v0.1
cp draft.md .aiwg/working/architecture/software-architecture-doc/drafts/v0.1-primary-draft.md
```

**3. Distribute for Parallel Review**

```bash
# Launch all reviewers in parallel (single message, multiple Task tool calls)
# Each reviewer:
# - Reads v0.1 draft
# - Adds inline comments (<!-- ROLE: feedback -->)
# - Saves review summary to reviews/{role}-review.md
# - Updates draft to v0.2, v0.3, etc. (or same version with comments)
```

**4. Collect and Synthesize**

```bash
# Synthesizer reads:
# - Latest draft with all inline comments
# - All review summaries from reviews/

# Synthesizer:
# - Resolves conflicts (documented in synthesis report)
# - Merges complementary feedback
# - Creates unified final document
# - Generates synthesis report

# Output final version
cp synthesized.md .aiwg/architecture/software-architecture-doc.md

# Generate synthesis report
cat > .aiwg/working/architecture/software-architecture-doc/synthesis/synthesis-report.md
```

**5. Archive Workflow**

```bash
# Archivist archives complete workflow
mv .aiwg/working/architecture/software-architecture-doc \
   .aiwg/archive/2025-10/software-architecture-doc-2025-10-15/

# Generate audit trail
cat > .aiwg/archive/2025-10/software-architecture-doc-2025-10-15/audit-trail.md
```

### Example: flow-inception-to-elaboration Implementation

**Step 3: Develop Architecture Baseline (SAD) - Multi-Agent Pattern**

```markdown
### Step 3: Develop Architecture Baseline (SAD)

Create comprehensive Software Architecture Document with multi-agent review.

**Multi-Agent Workflow:**

1. **Initialize** (Documentation Archivist)
   ```bash
   # Create working structure
   mkdir -p .aiwg/working/architecture/sad/{drafts,reviews,synthesis}

   # Read template metadata
   TEMPLATE=~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/templates/analysis-design/software-architecture-doc-template.md

   # Extract responsible roles:
   # - Owner: architecture-designer (or architecture-documenter)
   # - Reviewers: security-architect, test-architect, requirements-analyst
   # - Writer: technical-writer
   # - Synthesizer: architecture-documenter
   ```

2. **Primary Draft** (Architecture Designer or Architecture Documenter)
   ```bash
   # Architecture Designer provides technical design
   # Architecture Documenter structures into SAD template

   # Save v0.1
   cp sad-draft.md .aiwg/working/architecture/sad/drafts/v0.1-primary-draft.md
   ```

3. **Parallel Review** (Launch all reviewers simultaneously)
   ```bash
   # Use Task tool to launch in parallel:
   # - Security Architect: Validates security architecture
   # - Test Architect: Validates testability
   # - Requirements Analyst: Maps use cases to components
   # - Technical Writer: Ensures clarity and consistency

   # Each reviewer:
   # - Reads v0.1
   # - Adds inline feedback: <!-- ROLE: comment -->
   # - Saves review: reviews/{role}-review.md
   # - Status: APPROVED | CONDITIONAL | NEEDS_WORK
   ```

4. **Synthesis** (Architecture Documenter + Documentation Synthesizer)
   ```bash
   # Documentation Synthesizer:
   # - Reads all review feedback
   # - Resolves conflicts (e.g., TLS 1.3 vs 1.2 for test env)
   # - Merges complementary additions
   # - Creates unified final SAD

   # Architecture Documenter validates technical accuracy

   # Output final v1.0
   cp sad-final.md .aiwg/architecture/software-architecture-doc.md

   # Generate synthesis report
   cat > .aiwg/working/architecture/sad/synthesis/synthesis-report.md
   ```

5. **Archive** (Documentation Archivist)
   ```bash
   # Archive complete workflow
   mv .aiwg/working/architecture/sad \
      .aiwg/archive/2025-10/sad-2025-10-15/

   # Generate audit trail
   cat > .aiwg/archive/2025-10/sad-2025-10-15/audit-trail.md
   ```

**Output:** Software Architecture Document (BASELINED)
- Location: `.aiwg/architecture/software-architecture-doc.md`
- Status: BASELINED (all reviewers approved)
- Archive: `.aiwg/archive/2025-10/sad-2025-10-15/` (complete history)
```

## Benefits

### Quality Improvements

1. **Depth:** Multiple expert perspectives vs. single agent
2. **Completeness:** Reviewers catch gaps (missing security, testability issues)
3. **Accuracy:** Domain experts validate technical correctness
4. **Clarity:** Technical writer ensures readability
5. **Consistency:** Terminology and structure uniform

### Process Improvements

1. **Traceability:** Complete audit trail (versions, reviews, decisions)
2. **Accountability:** Clear ownership and sign-offs
3. **Transparency:** All feedback documented and addressed
4. **Compliance:** Meets audit requirements for documentation rigor

### Example Quality Gains

**Single-Agent Output:**
- Architecture Designer creates SAD alone
- Missing: Security details, test strategy, requirements traceability
- Issues: Jargon heavy, inconsistent terminology
- Time: 2 hours (fast but incomplete)

**Multi-Agent Output:**
- Architecture Designer + 4 reviewers + synthesizer
- Complete: All sections filled, security validated, testability confirmed
- Quality: Professional, clear, consistent
- Time: 4 hours total (2h draft + 1h reviews + 1h synthesis)
- **2x time → 5x quality improvement**

## Directory Structure

### Active Workflow

```
.aiwg/working/
├── document-index.json          # Master index
├── architecture/
│   └── software-architecture-doc/
│       ├── drafts/
│       │   ├── v0.1-primary-draft.md
│       │   ├── v0.2-with-security-review.md
│       │   ├── v0.3-with-test-review.md
│       │   └── v0.4-synthesis-ready.md
│       ├── reviews/
│       │   ├── security-architect-review.md
│       │   ├── test-architect-review.md
│       │   ├── requirements-analyst-review.md
│       │   └── technical-writer-review.md
│       ├── synthesis/
│       │   └── synthesis-report.md
│       └── metadata.json
```

### Final Output

```
.aiwg/architecture/
└── software-architecture-doc.md  # BASELINED final version
```

### Archive

```
.aiwg/archive/2025-10/
└── software-architecture-doc-2025-10-15/
    ├── drafts/               # All draft versions
    ├── reviews/              # All review feedback
    ├── synthesis/            # Synthesis report
    ├── metadata.json         # Complete version history
    └── audit-trail.md        # Human-readable timeline
```

## Agent Coordination Examples

### Example 1: Parallel Review (Preferred)

**Launch all reviewers simultaneously:**

```python
# Pseudo-code for flow command
# Single message with multiple Task tool calls

reviewers = [
    {"role": "security-architect", "task": "Review SAD security architecture"},
    {"role": "test-architect", "task": "Review SAD testability"},
    {"role": "requirements-analyst", "task": "Validate component mapping"},
    {"role": "technical-writer", "task": "Review clarity and consistency"}
]

# Launch all in parallel (one message, multiple tool uses)
for reviewer in reviewers:
    Task(
        subagent_type=reviewer["role"],
        description=reviewer["task"],
        prompt=f"Review {draft_path} and provide {reviewer['role']} perspective feedback"
    )

# Wait for all to complete, then proceed to synthesis
```

### Example 2: Sequential Review (When Dependencies Exist)

**Reviews build on each other:**

```python
# Step 1: Security review (adds security section)
Task("security-architect", "Review and add security architecture")

# Step 2: Test review (builds on security section)
Task("test-architect", "Review testability including security test strategy")

# Step 3: Technical writer (polishes everything)
Task("technical-writer", "Review final draft for clarity")

# Step 4: Synthesize
Task("documentation-synthesizer", "Merge all feedback")
```

### Example 3: Iterative Review (Complex Documents)

**Multiple review rounds:**

```python
# Round 1: Initial feedback
parallel_review(["security-architect", "test-architect"])
synthesize_round_1()

# Round 2: Address conflicts
parallel_review(["security-architect", "test-architect"]) # Re-review
synthesize_round_2()

# Round 3: Final polish
parallel_review(["technical-writer"])
final_synthesis()
```

## Template Path Reference

**All templates located at:**
```
~/.local/share/ai-writing-guide/agentic/code/frameworks/sdlc-complete/templates/
```

**Key templates:**
- `analysis-design/software-architecture-doc-template.md`
- `analysis-design/architecture-decision-record-template.md`
- `requirements/use-case-spec-template.md`
- `requirements/supplemental-specification-template.md`
- `test/master-test-plan-template.md`
- `test/test-strategy-template.md`

**Agents have read-only access** to aiwg install location via Claude settings.

## Success Metrics

**Quality:**
- 100% of required sections completed (vs. ~60% single-agent)
- Zero critical gaps flagged in reviews
- All responsible roles sign off (APPROVED or CONDITIONAL)

**Traceability:**
- Complete audit trail (versions, reviews, decisions)
- Bidirectional links (requirements ↔ components ↔ tests)
- Synthesis report documents all changes

**Timeliness:**
- Parallel review: Complete in 1 business day
- Sequential review: 2-3 business days
- Iterative review: 3-5 business days

## Common Patterns by Document Type

| Document Type | Primary Author | Reviewers | Synthesizer | Pattern |
|---------------|----------------|-----------|-------------|---------|
| **SAD** | Architecture Designer | Security Architect, Test Architect, Requirements Analyst, Technical Writer | Architecture Documenter | Parallel |
| **Master Test Plan** | Test Architect | Test Engineer, Security Architect, DevOps Engineer, Technical Writer | Test Documenter | Parallel |
| **Use Case Specs** | Requirements Analyst | Architecture Designer, Test Engineer, Technical Writer | Requirements Documenter | Parallel |
| **Risk Report** | Project Manager | Architecture Designer, Security Architect, Requirements Analyst | Documentation Synthesizer | Sequential |
| **ADR** | Architecture Designer | Security Architect, Technical Writer | Architecture Documenter | Sequential |

## Error Handling

**Incomplete reviews:**
- Archivist tracks pending reviewers
- Alerts after 1 business day SLA breach
- Escalate to flow coordinator if blocked

**Conflicting feedback:**
- Synthesizer documents all conflicts
- Resolves based on domain expertise hierarchy:
  - Security matters: Security Architect decides
  - Testing matters: Test Architect decides
  - Architecture patterns: Architecture Designer decides
- Escalates unresolvable conflicts to PM/Executive Sponsor

**Missing metadata:**
- Flow command infers responsible roles from document type
- Requests clarification if ambiguous
- Proceeds with best-effort review assignment

## Integration with SDLC Flows

**Flows using multi-agent pattern:**
- `/project:flow-inception-to-elaboration` (SAD, Risk Report, Requirements Baseline)
- `/project:flow-elaboration-to-construction` (ABM Report, Master Test Plan)
- `/project:flow-construction-to-transition` (Deployment Plans, ORR)
- `/project:flow-deploy-to-production` (Deployment Reports)

**Each flow implements:**
1. Initialize working directory (Archivist)
2. Primary draft creation (Domain agent)
3. Parallel review (Responsible roles)
4. Synthesis (Synthesizer + domain agent)
5. Baseline final document (Archivist)
6. Archive workflow (Archivist)
