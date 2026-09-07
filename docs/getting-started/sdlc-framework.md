# SDLC Framework

> **First time using AIWG?** Begin with [Install, Connect, and Verify](install-connect-verify.md). This guide assumes
AIWG is connected to the target project and your provider session can read the deployed context.

You're building software. You want structure without bureaucracy — requirements that don't drift, architecture decisions that don't get forgotten, tests that actually cover what matters, and a way to hand off work to other engineers without spending two hours explaining everything.

The SDLC framework covers the full lifecycle from idea to production: intake,
requirements, architecture decisions, tests, security review, release planning,
and project status. Use it when you want durable project artifacts instead of
a one-off chat answer.

---

## Before You Start

Complete [Install, Connect, and Verify](install-connect-verify.md) first. If
you intentionally run a targeted deployment instead of the complete system,
`aiwg use sdlc` remains the manual command for this framework.

The first useful result should be an intake artifact, audit report, or
Construction Ready Brief you can inspect. Readiness checks are prerequisites,
not the outcome.

---

## How it's structured

The SDLC framework follows five phases. You don't have to use all of them — most people start with what they need and expand from there.

| Phase | What happens | Key milestone |
|-------|-------------|---------------|
| **Inception** | Validate the idea, document risks, get alignment | Lifecycle Objective (LOM) |
| **Elaboration** | Architecture baseline, requirements depth, test strategy | Architecture Baseline (ABM) |
| **Construction** | Feature implementation, tests, security validation | Initial Operational Capability (IOC) |
| **Transition** | Production deployment, UAT, support handover | Product Release (PR) |
| **Production** | Monitoring, incident response, continuous improvement | Ongoing |

---

## Starting a project

### From an idea

```
/intake-wizard "A task management API for small teams with Slack integration"
```

This generates your project intake, solution profile, and option matrix in `.aiwg/intake/`. Then kick off the Inception phase:

```
/flow-concept-to-inception
```

### From an existing codebase

```
/intake-from-codebase . --interactive
```

AIWG scans your code and generates intake documents from what it finds — architecture, dependencies, inferred requirements. You answer a few clarifying questions and it builds the project context automatically.

### Skip everything and just ask

If you don't need formal lifecycle management:

```
Run a security audit on this codebase
What tests are missing for the most critical paths?
Explain the data flow in this application
```

You don't have to run intake to use the agents. The framework adds structure when you want it; it doesn't require it.

---

## Common Specialist Roles

The framework includes specialist roles for requirements, architecture,
security, testing, DevOps, documentation, review, and data design. A few
you'll use constantly:

| Agent | When to invoke |
|-------|---------------|
| `requirements-analyst` | Writing or refining use cases, user stories |
| `architecture-designer` | System design, ADRs, component architecture |
| `security-auditor` | Code review, vulnerability assessment |
| `test-architect` | Test strategy, coverage analysis |
| `test-engineer` | Writing test suites |
| `devops-engineer` | CI/CD, deployment configuration |
| `technical-writer` | Documentation, API references |
| `code-reviewer` | Comprehensive code review |
| `database-optimizer` | Query optimization, schema design |

You don't invoke them explicitly most of the time — orchestrated commands launch them automatically. But you can address them directly:

```
@test-architect: What's the right test strategy for this service?
@security-auditor: Review this authentication implementation
```

---

## Continuous workflows

These commands run throughout the lifecycle, not just at phase boundaries:

```
/flow-security-review-cycle           # Security audit and threat modeling
/flow-risk-management-cycle           # Risk identification and mitigation
/flow-requirements-evolution          # Living requirements refinement
/flow-architecture-evolution          # Architecture change management
/flow-test-strategy-execution         # Test suite execution and validation
/flow-performance-optimization        # Performance baseline and optimization
```

Each one coordinates the relevant roles, synthesizes their output, and
generates artifacts in `.aiwg/`.

---

## Phase transitions

When you're ready to move forward:

```
# Natural language
transition to Elaboration

# Or explicit
/flow-inception-to-elaboration
/flow-elaboration-to-construction
/flow-construction-to-transition
```

AIWG validates gate criteria before proceeding. If something's missing, it tells you exactly what — and can often generate it automatically.

---

## The fast path: sdlc-accelerate

If you want to go from idea to construction-ready without manually orchestrating each phase:

```
/sdlc-accelerate "A task management API for small teams"
```

This runs the full pipeline — intake through elaboration — with focused questions at each gate instead of requiring you to invoke 7+ commands manually. You get a Construction Ready Brief at the end. See [the complete flow and gate guide](flow-and-gate-process.md) for how this works in detail.

---

## What gets created

Everything lands in `.aiwg/`:

```
.aiwg/
├── intake/           # Project intake, solution profile, option matrix
├── requirements/     # Use cases, user stories, NFRs
├── architecture/     # SAD, ADRs
├── planning/         # Phase and iteration plans
├── risks/            # Risk register and mitigations
├── testing/          # Test strategy, test plans, results
├── security/         # Threat models, security gates
├── deployment/       # Deployment plans, runbooks
└── reports/          # Generated reports
```

Commit this directory so future sessions and teammates can pick up the same
project context.

---

## Iteration during Construction

Once you're in Construction, use the dual-track iteration model:

```
/flow-iteration-dual-track --iteration 3
```

This runs a Discovery track (backlog refinement, story prep) and a Delivery track (implementation, testing) in parallel, the way modern teams actually work.

For iterative task completion on a specific problem:

```
/ralph "Fix all the failing auth tests" --completion "npm test passes"
```

Al keeps iterating — fix, test, fix again — until the criterion is met or it needs your input.

---

## Key references

- `/project-status` — Where are we, what's next
- `/project-health-check` — Overall project health metrics
- `/flow-gate-check <phase>` — Can we move forward?
- `@docs/cli/reference.md` — CLI command reference
- `@docs/getting-started/flow-and-gate-process.md` — How intake, flows, gates, and sdlc-accelerate fit together
