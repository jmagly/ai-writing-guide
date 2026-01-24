# REF-025: Constitutional AI - Harmlessness from AI Feedback

## Citation

Bai, Y., Kadavath, S., Kundu, S., Askell, A., Kernion, J., Jones, A., Chen, A., Goldie, A., Mirhoseini, A., McKinnon, C., Chen, C., Olsson, C., Olah, C., Hernandez, D., Drain, D., Ganguli, D., Li, D., Tran-Johnson, E., Perez, E., ... & Kaplan, J. (2022). Constitutional AI: Harmlessness from AI Feedback. *arXiv preprint arXiv:2212.08073*.

**arXiv**: [https://arxiv.org/abs/2212.08073](https://arxiv.org/abs/2212.08073)

**Anthropic Research**: [https://www.anthropic.com/research/constitutional-ai-harmlessness-from-ai-feedback](https://www.anthropic.com/research/constitutional-ai-harmlessness-from-ai-feedback)

## Summary

Constitutional AI (CAI) trains AI assistants to be harmless without extensive human labeling of harmful outputs. Instead, the AI critiques its own responses against a set of principles ("constitution"), revises them, and learns from this self-improvement process. This enables RLHF-like benefits with reduced human annotation burden.

### Key Concepts

| Concept | Definition |
|---------|------------|
| **Constitution** | Set of principles guiding AI behavior |
| **Self-Critique** | Model evaluates own outputs against principles |
| **Self-Revision** | Model improves outputs based on critique |
| **RLAIF** | Reinforcement Learning from AI Feedback |

### Two-Phase Training

```
Phase 1: Supervised Learning (SL-CAI)
  1. Sample potentially harmful response
  2. Ask model to critique response against constitution
  3. Ask model to revise response
  4. Fine-tune on revised responses

Phase 2: Reinforcement Learning (RL-CAI)
  1. Generate pairs of responses
  2. Ask model which is more harmless/helpful
  3. Train preference model on AI preferences
  4. RL with preference model as reward
```

### Key Findings

1. **Reduced Human Labeling**: AI feedback replaces most human annotation
2. **Pareto Improvement**: More helpful AND more harmless than standard RLHF
3. **Transparency**: Constitution provides interpretable behavior guide
4. **Scalable**: AI feedback scales better than human feedback

### Constitution Examples

```
- Choose the response that is most helpful to the human
- Choose the response that is least likely to encourage illegal activity
- Choose the response that is most respectful of privacy
- Choose the response that is least likely to be dangerous
```

## AIWG Application

### Direct Parallel: Principle-Based Review

CAI's constitution pattern maps to AIWG's gate checks:

| CAI Element | AIWG Implementation |
|-------------|---------------------|
| Constitution | Quality criteria, gate check requirements |
| Self-critique | Multi-agent review against standards |
| Self-revision | Iteration based on feedback |
| Preference learning | Synthesizer integration patterns |

### Integration Pattern

```markdown
# AIWG Gate Check (Constitutional Pattern)

## Security Gate Principles (Constitution)
- No hardcoded credentials
- Input validation on all endpoints
- Authentication on sensitive operations
- Encryption for data at rest

## Review Process
1. Security Auditor critiques against principles
2. Identifies violations
3. Recommends revisions
4. Software Implementer revises
5. Re-evaluate against principles
```

### Why CAI Matters for AIWG

1. **Principle Encoding**: Explicit quality criteria guide review
2. **Self-Improvement**: Models can critique and revise autonomously
3. **Reduced Human Burden**: AI feedback for routine checks
4. **Transparency**: Documented principles explain decisions

### Gate Check Enhancement

```markdown
# AIWG Security Gate (CAI-Style)

## Constitution (Security Principles)
1. No credentials in code or logs
2. All external input validated
3. Principle of least privilege
4. Audit logging for sensitive operations

## Critique Template
"Review this code against security principles. For each principle:
- State whether the code complies
- If violation, cite the specific issue
- Suggest remediation"

## Revision Template
"Revise this code to address the following security issues:
[List violations]
Maintain original functionality while fixing security."
```

## Key Quotes

> "We experiment with methods for training a harmless AI assistant through self-improvement, without any human labels identifying harmful outputs."

> "Constitutional RL models trained with AI feedback learn to be less harmful at a given level of helpfulness—a Pareto improvement."

## Relevance to AIWG

| Category | Relevance |
|----------|-----------|
| Gate Checks | **High** - principle-based validation |
| Multi-Agent Review | **High** - critique/revise patterns |
| Quality Criteria | **High** - constitutional encoding |
| Self-Improvement | **Medium** - autonomous refinement |

## Cross-References

- **REF-015**: Self-Refine (iteration without explicit principles)
- **REF-021**: Reflexion (verbal learning from feedback)
- **Security Gates**: `.claude/commands/security-gate.md`

## Related Work

- RLHF: Ouyang et al. (2022) - original human feedback
- Self-Refine: Madaan et al. (2023) - iterative improvement
- Reflexion: Shinn et al. (2023) - verbal reinforcement

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-01-24 | Research Acquisition (#74) | Initial reference entry |
