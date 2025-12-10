# Creating AIWG Frameworks

Frameworks are comprehensive lifecycle solutions with 50+ agents, extensive templates, and complete workflow coverage. Creating a framework is a significant undertaking.

## When to Create a Framework

Create a framework when you need:

- Complete lifecycle coverage (inception to completion)
- Large-scale agent coordination (50+ agents)
- Comprehensive template libraries
- Phase-based workflow management
- Cross-cutting concerns (security, quality, compliance)

Examples: Software development lifecycle, marketing campaign lifecycle, legal case management, research project lifecycle.

## Framework vs Extension vs Addon

| Aspect | Framework | Extension | Addon |
|--------|-----------|-----------|-------|
| Scale | Large (50+ agents) | Medium (5-20 agents) | Small (1-10 agents) |
| Standalone? | Yes | No | Yes |
| Lifecycle? | Complete | Partial | None |
| Templates | 100+ | 10-30 | 0-10 |
| Use case | Full methodology | Domain specialization | Utilities |

## Getting Started

Framework creation is complex. Use interactive mode:

```bash
/devkit-create-framework fintech-lifecycle --interactive
```

Claude will guide you through:

1. **Lifecycle phases**: What stages does this framework cover?
2. **Agent roster**: What roles are needed at each phase?
3. **Template library**: What artifacts are produced?
4. **Workflow patterns**: How do phases transition?
5. **Quality gates**: What criteria must be met?

## Framework Structure

```
frameworks/my-framework/
├── manifest.json           # Framework metadata
├── README.md               # Comprehensive documentation
├── plan-act-*.md           # High-level lifecycle guide
├── actors-and-templates.md # Role-to-artifact mapping
│
├── agents/                 # 50+ role-based agents
│   ├── manifest.md         # Agent catalog
│   ├── architect.md
│   ├── analyst.md
│   └── ...
│
├── commands/               # 40+ workflow commands
│   ├── manifest.md         # Command catalog
│   ├── flow-phase-*.md     # Phase transition workflows
│   └── ...
│
├── templates/              # 100+ artifact templates
│   ├── manifest.json       # Template registry
│   ├── inception/
│   ├── elaboration/
│   ├── construction/
│   └── transition/
│
├── flows/                  # Phase workflow documentation
│   ├── inception.md
│   ├── elaboration.md
│   └── ...
│
├── metrics/                # Health and progress tracking
│   └── tracking-catalog.md
│
├── config/                 # Framework configuration
│   └── models.json         # Default model assignments
│
├── extensions/             # Framework-specific extensions
│   ├── gdpr/
│   └── hipaa/
│
└── docs/                   # Additional documentation
    ├── orchestrator-architecture.md
    └── multi-agent-pattern.md
```

## Manifest Configuration

```json
{
  "id": "my-framework",
  "type": "framework",
  "name": "My Framework",
  "version": "1.0.0",
  "description": "Complete lifecycle management for X",
  "author": "Your Name",
  "license": "MIT",
  "entry": {
    "agents": "agents",
    "commands": "commands",
    "templates": "templates",
    "flows": "flows",
    "metrics": "metrics"
  },
  "agents": ["architect", "analyst", "developer", "..."],
  "commands": ["flow-inception", "flow-elaboration", "..."],
  "templates": ["vision-doc", "requirements-spec", "..."],
  "phases": ["inception", "elaboration", "construction", "transition"],
  "defaultPhase": "inception"
}
```

## Designing Phases

### Phase Structure

Each phase should have:

1. **Entry criteria**: What must be true to start this phase?
2. **Key activities**: What happens during this phase?
3. **Deliverables**: What artifacts are produced?
4. **Exit criteria**: What must be true to complete this phase?
5. **Milestone**: What milestone marks completion?

### Example Phase Definition

```markdown
# Inception Phase

## Entry Criteria
- Project concept approved
- Initial stakeholders identified
- Budget range established

## Key Activities
- Vision document creation
- Stakeholder analysis
- Risk identification
- Architecture sketch
- Business case development

## Deliverables
- Vision document
- Stakeholder register
- Risk register (initial)
- Architecture overview
- Business case

## Exit Criteria (Lifecycle Objective - LO)
- [ ] Vision approved by stakeholders
- [ ] Key risks identified and mitigation planned
- [ ] Architecture feasibility confirmed
- [ ] Business case approved
- [ ] Go/no-go decision made

## Milestone
Lifecycle Objective (LO) - Project viability confirmed
```

## Designing Agents

### Agent Categories

Frameworks typically need agents in these categories:

| Category | Examples | Count |
|----------|----------|-------|
| Analysis | Requirements Analyst, System Analyst, Domain Expert | 5-10 |
| Architecture | Architecture Designer, API Designer, Security Architect | 5-8 |
| Development | Software Implementer, Test Engineer, DevOps Engineer | 8-12 |
| Quality | Code Reviewer, Test Architect, Quality Controller | 5-8 |
| Management | Project Manager, Risk Manager, Configuration Manager | 5-8 |
| Documentation | Technical Writer, Documentation Synthesizer | 3-5 |
| Operations | Deployment Manager, Incident Responder, Reliability Engineer | 5-8 |
| Orchestration | Executive Orchestrator, Intake Coordinator | 2-5 |

### Agent Design Principles

1. **Single responsibility**: Each agent has one primary function
2. **Clear expertise**: Domain knowledge is explicit
3. **Defined outputs**: What artifacts does this agent produce?
4. **Integration points**: How does this agent interact with others?

## Designing Commands

### Command Categories

| Category | Purpose | Examples |
|----------|---------|----------|
| `flow-*` | Phase transitions | `flow-inception-to-elaboration` |
| `intake-*` | Project onboarding | `intake-wizard`, `intake-from-codebase` |
| Phase workflows | In-phase activities | `flow-risk-management-cycle` |
| Utilities | Supporting operations | `project-status`, `build-artifact-index` |
| Gates | Quality validation | `flow-gate-check`, `security-gate` |

### Flow Command Pattern

```markdown
---
name: flow-phase-transition
description: Orchestrate transition from Phase A to Phase B
args:
  - name: project-directory
    description: Path to project root
    required: false
    default: "."
  - name: --guidance
    description: Strategic guidance for transition
    required: false
---

## Preconditions

- Phase A gate criteria met
- All Phase A artifacts baselined

## Workflow

### Step 1: Gate Validation
Launch gate-check agent to validate Phase A completion.

### Step 2: Artifact Generation
Launch parallel agents for Phase B initialization:
- Agent 1: Create Phase B planning document
- Agent 2: Update risk register
- Agent 3: Generate Phase B templates

### Step 3: Handoff
Document handoff checklist and archive Phase A working files.

## Postconditions

- Phase B workspace initialized
- Phase A artifacts archived
- Handoff documented
```

## Designing Templates

### Template Organization

```
templates/
├── manifest.json           # Template registry
├── inception/
│   ├── vision-document.md
│   ├── stakeholder-register.md
│   └── initial-risk-register.md
├── elaboration/
│   ├── requirements-spec.md
│   ├── architecture-document.md
│   └── test-strategy.md
├── construction/
│   ├── iteration-plan.md
│   ├── code-review-checklist.md
│   └── test-report.md
├── transition/
│   ├── deployment-plan.md
│   ├── user-guide.md
│   └── operations-runbook.md
└── cross-cutting/
    ├── decision-record.md
    ├── meeting-notes.md
    └── status-report.md
```

### Template Types

Use `--type` when creating templates:

- `document`: Structured markdown documents
- `checklist`: Validation/audit checklists
- `matrix`: Decision matrices, RACI charts
- `form`: Intake forms with frontmatter

## Multi-Agent Orchestration

Frameworks require orchestration patterns. Document in `docs/orchestrator-architecture.md`:

```markdown
# Orchestrator Architecture

## Pattern: Primary Author → Parallel Review → Synthesis

```
Primary Author → Parallel Reviewers → Synthesizer → Archive
     ↓                ↓                    ↓           ↓
  Draft v0.1    Reviews (3-5)      Final merge    .aiwg/
```

## Agent Coordination

1. **Executive Orchestrator**: Manages cross-phase coordination
2. **Phase Orchestrators**: Manage within-phase workflows
3. **Specialist Agents**: Execute specific tasks

## Workflow Example

```yaml
artifact: Software Architecture Document
workflow:
  primary:
    agent: architecture-designer
    output: .aiwg/working/architecture/sad/drafts/v0.1.md
  reviewers:
    - agent: security-architect
      focus: Security validation
    - agent: test-architect
      focus: Testability review
    - agent: requirements-analyst
      focus: Requirements coverage
  synthesis:
    agent: documentation-synthesizer
    output: .aiwg/architecture/software-architecture-doc.md
```
```

## Validation

```bash
# Validate framework structure
aiwg validate my-framework --verbose

# Checks:
# - Manifest completeness
# - All agents have definitions
# - All commands have definitions
# - Template organization
# - Phase coverage
```

## Testing

Before publishing:

1. **Scaffold test project**: `aiwg -new --framework my-framework`
2. **Run through lifecycle**: Execute each phase transition
3. **Verify artifacts**: Check all templates produce valid output
4. **Test agents**: Validate each agent performs its function
5. **Integration test**: Full lifecycle walkthrough

## Distribution

Frameworks are distributed via the AIWG repository:

1. Create PR to `agentic/code/frameworks/`
2. Include comprehensive documentation
3. Provide example project demonstrating lifecycle
4. Update framework registry

## Best Practices

1. **Start with phases**: Define lifecycle before agents
2. **Map roles to phases**: Which agents operate when?
3. **Design for orchestration**: Agents should coordinate
4. **Template everything**: Consistent artifact structure
5. **Gate everything**: Quality checks at each transition
6. **Document thoroughly**: Frameworks are complex

## Reference Implementations

- `sdlc-complete`: Software development lifecycle (53 agents, 48 commands, 100+ templates)
- `media-marketing-kit`: Marketing campaign lifecycle (37 agents, marketing templates)

Study these implementations before creating new frameworks.
