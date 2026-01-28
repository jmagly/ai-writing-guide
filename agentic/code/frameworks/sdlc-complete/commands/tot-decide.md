---
description: Evaluate architectural decisions using Tree of Thoughts exploration
category: architecture-quality
---

# Tree of Thoughts Decision Command

Evaluate architectural decisions by generating and scoring k alternatives using the ToT methodology.

## Instructions

When invoked, perform structured Tree of Thoughts exploration for architecture decisions:

1. **Parse Decision Context**
   - Extract the decision question from arguments or prompt
   - Identify relevant non-functional requirements from `.aiwg/requirements/nfr-modules/`
   - Load existing architectural constraints from `.aiwg/architecture/`

2. **Load ToT Protocol**
   - Reference @agentic/code/frameworks/sdlc-complete/schemas/flows/tree-of-thought.yaml for workflow schema
   - Reference @.aiwg/flows/docs/tot-architecture-guide.md for evaluation patterns
   - Reference @agentic/code/frameworks/sdlc-complete/agents/enhancements/architecture-designer-tot-protocol.md for agent protocol

3. **Define Evaluation Criteria**
   - Extract criteria from NFRs (scalability, security, performance, maintainability)
   - Assign weights based on project priorities
   - Define scoring rubric (1-5 scale)

4. **Generate Alternatives (k=3 default)**
   - Generate k distinct architectural approaches
   - Each alternative must be meaningfully different (not variations of the same approach)
   - Document the core idea, key components, and trade-offs for each

5. **Score and Compare**
   - Build weighted scoring matrix
   - Calculate composite scores
   - Identify clear winner or close calls requiring stakeholder input

6. **Generate ADR**
   - Use @agentic/code/frameworks/sdlc-complete/templates/architecture/adr-with-tot.md template
   - Document all alternatives with scores
   - Record decision rationale and trade-offs accepted
   - Include backtracking triggers (conditions for re-evaluation)

7. **Output**
   - Display scoring matrix summary
   - State recommendation with confidence level
   - Save ADR to `.aiwg/architecture/`
   - If close call (score gap < 0.5), flag for human decision gate

## Arguments

- `[decision-context]` - Description of the architectural decision (required)
- `--alternatives [k]` - Number of alternatives to generate (default: 3, max: 7)
- `--depth [levels]` - Depth of exploration per alternative (default: 2)
- `--output [path]` - Custom output path for ADR (default: `.aiwg/architecture/`)
- `--criteria [list]` - Override criteria (comma-separated)
- `--quick` - Skip detailed analysis, produce summary matrix only

## Examples

### Full Architecture Decision

```
/tot-decide "Select authentication approach for multi-tenant SaaS platform"
```

Output:
```
Tree of Thoughts Decision Analysis
===================================

Decision: Authentication approach for multi-tenant SaaS

Criteria (from NFRs):
  Security    [30%] - Multi-tenant isolation required
  Scalability [25%] - 10K+ tenants expected
  Cost        [20%] - Startup budget constraints
  Dev Speed   [15%] - MVP in 3 months
  Maintenance [10%] - Small ops team

Alternatives Generated:
  A: OAuth2 + OIDC with tenant-scoped JWTs
  B: Session-based with Redis cluster per tenant
  C: API key + HMAC with per-request validation

Scoring Matrix:
  | Criterion     | Wt  | A    | B    | C    |
  |---------------|-----|------|------|------|
  | Security      | 30% | 5    | 4    | 3    |
  | Scalability   | 25% | 5    | 3    | 4    |
  | Cost          | 20% | 3    | 2    | 5    |
  | Dev Speed     | 15% | 3    | 4    | 5    |
  | Maintenance   | 10% | 4    | 2    | 4    |
  | Weighted      |     | 4.15 | 3.10 | 4.00 |

Recommendation: Option A (OAuth2 + OIDC)
  Confidence: HIGH (gap > 0.5 from runner-up)
  Trade-off accepted: Higher initial dev cost for superior security/scale

ADR saved: .aiwg/architecture/adr-auth-approach.md
```

### Quick Comparison

```
/tot-decide "Database for event sourcing" --alternatives 4 --quick
```

### Deep Analysis

```
/tot-decide "Microservices vs modular monolith" --depth 3 --criteria "scalability,team-autonomy,ops-complexity,latency"
```

## References

- @agentic/code/frameworks/sdlc-complete/schemas/flows/tree-of-thought.yaml - ToT workflow schema
- @.aiwg/flows/docs/tot-architecture-guide.md - Architecture evaluation guide
- @agentic/code/frameworks/sdlc-complete/agents/enhancements/architecture-designer-tot-protocol.md - Agent enhancement
- @agentic/code/frameworks/sdlc-complete/templates/architecture/adr-with-tot.md - ADR template
- @.aiwg/research/findings/REF-020-tree-of-thoughts.md - Research foundation
- @.claude/rules/reasoning-sections.md - Reasoning requirements
