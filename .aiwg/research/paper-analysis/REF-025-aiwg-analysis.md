# REF-025: Constitutional AI - AIWG Governance and Review Analysis

**Source**: `/tmp/research-papers/docs/references/REF-025-constitutional-ai-harmlessness.md`

**Citation**: Bai, Y., et al. (2022). Constitutional AI: Harmlessness from AI Feedback. *arXiv:2212.08073*.

---

## AIWG Implementation Mapping

| Paper Element | AIWG Implementation | Location |
|---------------|---------------------|----------|
| **Constitution (Principles)** | Quality criteria, gate check requirements, review standards | `agentic/code/frameworks/sdlc-complete/gates/*/criteria.md` |
| **Self-Critique** | Multi-agent review process, agent critiques against standards | `agentic/code/frameworks/sdlc-complete/agents/reviewers/` |
| **Self-Revision** | Iteration based on feedback, artifact refinement loops | Orchestrator retry/refinement patterns |
| **RLAIF (AI Feedback)** | Synthesizer agent integration, automated quality assessment | `agentic/code/frameworks/sdlc-complete/agents/synthesizer.md` |
| **Critique Templates** | Structured review prompts, gate check templates | Gate prompt templates |
| **Revision Templates** | Structured remediation prompts | Agent revision instructions |
| **Multiple Principles** | Multi-criteria gate checks (security, quality, architecture) | Multiple gate types per phase |
| **Chain-of-Thought** | Explicit reasoning in review comments | Agent system prompt patterns |
| **Non-Evasiveness** | Thoughtful engagement vs. rejection, explanation of issues | Agent communication style |
| **Harmlessness Metrics** | Gate pass/fail criteria, quality scoring | Gate evaluation functions |

---

## Direct AIWG Applications

### 1. Gate Check Constitutional Pattern

```markdown
# Security Gate (Constitutional CAI Pattern)

## Constitution (Security Principles)
1. No credentials in code or logs
2. All external input validated
3. Principle of least privilege
4. Audit logging for sensitive operations

## Critique Process
Security Auditor agent:
1. Reviews artifact against each principle
2. States compliance or violation
3. Cites specific issues with line numbers
4. Assesses severity of violations

## Revision Process
Software Implementer agent:
1. Receives critique with violations
2. Revises artifact to address each issue
3. Maintains functionality while fixing
4. Resubmits for re-evaluation

## Multiple Iterations
- Gate allows up to 3 critique-revision cycles
- Each cycle focuses on remaining issues
- Progressive improvement toward compliance
```

### 2. Multi-Principle Review

AIWG gates can encode multiple principles just as CAI uses 16 constitutional principles:
- **Security Gate**: 10+ security principles
- **Architecture Gate**: Design principles (SOLID, DRY, etc.)
- **Quality Gate**: Code quality standards
- **Testing Gate**: Test coverage and quality principles

### 3. Self-Improvement Workflows

CAI's critique-revision loop maps directly to AIWG's iterative refinement:
1. Agent produces artifact
2. Reviewer agent critiques against principles
3. Original agent revises
4. Re-review until criteria met or max iterations

### 4. Reduced Human Burden

Like CAI replacing human harmfulness labels with AI feedback, AIWG reduces human review burden by encoding expert knowledge as principles that agents evaluate against.

### 5. Transparency Through Principles

Explicit constitutional principles = explicit gate criteria. Both provide interpretable governance of AI behavior.

---

## Key Findings for AIWG

### 1. Pareto Improvement Over RLHF

**Finding**: RL-CAI models learn to be less harmful at a given level of helpfulness compared to standard RLHF models. This represents a Pareto improvement - better on both dimensions.

**AIWG Application**: Multi-criteria gates (security AND quality AND architecture) can achieve better outcomes than single-criterion gates by enforcing complementary principles simultaneously.

### 2. Progressive Improvement Through Revisions

**Finding**: Harmlessness preference model scores improve monotonically with number of critique-revision iterations (0→1→2→3→4 revisions). First revision provides largest improvement.

**AIWG Application**: Gate checks should allow iterative refinement with 2-3 cycles. First cycle catches major issues; subsequent cycles handle edge cases.

### 3. Critiques Improve Results for Smaller Models

**Finding**: For smaller models (<10B parameters), critiqued revisions achieve higher harmlessness scores than direct revisions. For larger models (52B), both perform similarly with critiques slightly better.

**AIWG Application**: Explicit critique step (structured feedback) is more important when using less capable models. Always include critique step in gates for robustness.

### 4. Reduced Evasiveness Without Sacrificing Harmlessness

**Finding**: RL-CAI models are "virtually never evasive" and give nuanced, thoughtful responses to sensitive topics while remaining harmless. HH RLHF models often give canned evasive responses.

**AIWG Application**: Agents should provide thoughtful explanations of why something doesn't meet criteria rather than simple "FAIL" responses. Example:

```markdown
# Instead of:
❌ "This artifact fails security review."

# Provide:
⚠️ "This artifact has 3 security issues that need addressing:
1. Line 45: Hardcoded API key in source code (High severity)
2. Line 67: User input not validated before SQL query (Critical)
3. Line 89: Logging contains PII (Medium)

Let's fix these while maintaining the functionality..."
```

### 5. Number of Principles Has Limited Impact on Harmlessness

**Finding**: Varying the number of constitutional principles (N=1,2,4,8,16) does not significantly affect harmlessness PM scores, but diversity likely improves exploration.

**AIWG Application**: Gate criteria should focus on diversity of checks (security, quality, architecture) rather than sheer quantity. 5-10 diverse principles better than 50 overlapping ones.

### 6. Both SL and RL Phases Contribute Substantially

**Finding**: SL-CAI provides significant improvement over pretrained baseline, and RL-CAI further improves substantially over SL-CAI.

**AIWG Application**: Two-phase agent training could work:
- **Phase 1 (SL)**: Fine-tune on AIWG template examples
- **Phase 2 (RL)**: Reinforce based on gate pass/fail feedback

### 7. Soft Preference Labels Outperform Hard Labels

**Finding**: Using normalized log-probabilities (soft labels) from the feedback model works better than binary 0/1 labels (hard labels). For CoT, clamping probabilities to 40-60% works best.

**AIWG Application**: Gate scoring should use graded scales (0-100) rather than binary pass/fail:

```json
{
  "security_score": 85,
  "quality_score": 92,
  "architecture_score": 78,
  "overall": "PASS_WITH_CONDITIONS",
  "threshold": 80
}
```

---

## Constitutional Principles for AIWG Gates

### Security Gate Constitution (Example)

```markdown
## Security Principles

1. **Authentication**: All user authentication must use industry-standard protocols
2. **Authorization**: Implement principle of least privilege for all access control
3. **Input Validation**: All external input must be validated and sanitized
4. **Secrets Management**: No credentials, keys, or secrets in source code or logs
5. **Data Protection**: Encrypt sensitive data at rest and in transit
6. **Audit Logging**: Log all security-relevant events with timestamps
7. **Error Handling**: Never expose internal details in error messages
8. **Dependencies**: Keep all dependencies up-to-date and scan for vulnerabilities
9. **Session Management**: Implement secure session handling with timeouts
10. **HTTPS Only**: All network communication must use TLS 1.2+
```

### Quality Gate Constitution (Example)

```markdown
## Code Quality Principles

1. **Readability**: Code should be self-documenting with clear naming
2. **Modularity**: Functions should have single responsibility (SRP)
3. **DRY**: Don't repeat yourself - extract common patterns
4. **Error Handling**: All errors must be caught and handled appropriately
5. **Testing**: Minimum 80% code coverage with meaningful tests
6. **Documentation**: Public APIs must have docstrings/JSDoc
7. **Complexity**: Cyclomatic complexity < 10 per function
8. **Linting**: Zero linter errors, warnings addressed
9. **Type Safety**: Strong typing with no 'any' types (TypeScript)
10. **Performance**: No O(n²) algorithms in hot paths without justification
```

---

## Two-Phase Training for AIWG Agents

### Phase 1: Supervised Learning (SL-CAI Pattern)

**Objective**: Train agents to generate compliant artifacts from examples

**Process**:
1. Collect high-quality AIWG artifacts (use cases, ADRs, test plans)
2. Generate critiques against gate principles
3. Revise artifacts based on critiques
4. Fine-tune agent on (context, revised_artifact) pairs

**Outcome**: Agent learns to generate gate-compliant artifacts

### Phase 2: Reinforcement Learning (RLAIF Pattern)

**Objective**: Improve agent reliability through feedback

**Process**:
1. Generate artifact pairs for same requirement
2. Use AI evaluator to judge which better satisfies gate principles
3. Train preference model on AI judgments
4. Perform RL with preference model as reward

**Outcome**: Agent achieves higher gate pass rates with fewer iterations

---

## Critique-Revision Loop Implementation

```typescript
// Constitutional AI pattern for AIWG gates

interface GatePrinciple {
  id: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
}

interface Critique {
  principle: GatePrinciple;
  violation: boolean;
  details: string;
  lineNumbers?: number[];
  suggestions: string[];
}

interface RevisionCycle {
  iteration: number;
  artifact: Artifact;
  critiques: Critique[];
  revised: boolean;
}

async function gateCheckWithRevision(
  artifact: Artifact,
  principles: GatePrinciple[],
  maxIterations: number = 3
): Promise<GateResult> {
  const cycles: RevisionCycle[] = [];
  let currentArtifact = artifact;

  for (let i = 0; i < maxIterations; i++) {
    // Critique phase: Check against each principle
    const critiques: Critique[] = [];

    for (const principle of principles) {
      const critique = await reviewerAgent.critique(
        currentArtifact,
        principle
      );
      critiques.push(critique);
    }

    // Check if all principles satisfied
    const violations = critiques.filter(c => c.violation);

    if (violations.length === 0) {
      return {
        status: 'PASS',
        iterations: i + 1,
        cycles,
        finalArtifact: currentArtifact
      };
    }

    // Revision phase: Fix violations
    const revised = await authorAgent.revise(
      currentArtifact,
      violations
    );

    cycles.push({
      iteration: i,
      artifact: currentArtifact,
      critiques,
      revised: true
    });

    currentArtifact = revised;
  }

  // Max iterations reached with violations
  return {
    status: 'FAIL',
    iterations: maxIterations,
    cycles,
    finalArtifact: currentArtifact,
    remainingViolations: cycles[cycles.length - 1].critiques.filter(c => c.violation)
  };
}
```

---

## Key Performance Results

### Absolute Harmlessness Scores (0-4 scale, lower = less harmful)

| Model | Initial | After Training | Improvement |
|-------|---------|----------------|-------------|
| Helpful RLHF | 3.5 | 3.6 | ❌ Gets worse |
| HH RLHF | 1.7 | 0.7 | ✅ -1.0 |
| RL-CAI | 1.7 | 0.7 | ✅ -1.0 (matches HH) |
| **RL-CAI w/ CoT** | 1.7 | **0.6** | ✅ **-1.1 (best)** |

### Elo Ratings (Helpfulness vs. Harmlessness)

| Model | Helpfulness Elo | Harmlessness Elo | Notes |
|-------|-----------------|------------------|-------|
| Pretrained Base | -50 | -100 | Starting point |
| Helpful RLHF | 150 | -50 | Helpful but harmful |
| HH RLHF | 100 | 0 | Balanced but evasive |
| SL-CAI | 50 | 0 | Supervised constitutional |
| **RL-CAI** | **100** | **150** | **Pareto improvement** |
| RL-CAI w/ CoT | 100 | 200 | Best harmlessness |

---

## AIWG References

**Related AIWG Documentation**:
- `@agentic/code/frameworks/sdlc-complete/gates/` - Gate definitions and criteria
- `@agentic/code/frameworks/sdlc-complete/agents/reviewers/` - Reviewer agents
- `@agentic/code/frameworks/sdlc-complete/docs/gate-architecture.md` - Gate system design

**Related Research Papers**:
- **REF-015**: Self-Refine (similar revision loop but CAI adds explicit principles)
- **REF-021**: Reflexion (both use self-generated feedback, Reflexion focuses on episodic memory)
- **REF-016**: Chain-of-Thought (CAI uses CoT for evaluation and critique generation)
- **REF-026**: In-Context Learning (CAI's few-shot prompting for critiques and revisions)

---

**Document Created**: 2026-01-24
**Analysis Type**: AIWG Governance and Review Pattern Mapping
**Source Paper**: arXiv:2212.08073 (Anthropic)
**Core Innovation**: Training harmless AI through self-improvement with explicit principles
