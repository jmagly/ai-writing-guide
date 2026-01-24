# REF-014: SWE-bench - Can Language Models Resolve Real-world GitHub Issues?

## Citation

Jimenez, C. E., Yang, J., Wettig, A., Yao, S., Pei, K., Press, O., & Narasimhan, K. R. (2024). SWE-bench: Can Language Models Resolve Real-world GitHub Issues? *The Twelfth International Conference on Learning Representations (ICLR 2024, Oral)*.

**Website**: [https://www.swebench.com](https://www.swebench.com)

**GitHub**: [https://github.com/SWE-bench/SWE-bench](https://github.com/SWE-bench/SWE-bench)

**Paper**: [OpenReview](https://openreview.net/forum?id=VTF8yNQM66)

## Summary

SWE-bench is a benchmark for evaluating LLMs on real-world software engineering tasks, specifically resolving GitHub issues from 12 popular Python repositories. Unlike synthetic coding benchmarks, SWE-bench requires understanding entire codebases, localizing relevant code, and generating patches that pass existing test suites. It has become the standard benchmark for agentic coding systems.

### Key Concepts

| Concept | Definition |
|---------|------------|
| **Real-world Issues** | Actual GitHub issues, not synthetic tasks |
| **Patch Generation** | Model must produce valid git diff |
| **Test Validation** | Success = patch passes project's test suite |
| **Full Codebase** | Models given entire repository context |

### Benchmark Statistics

| Metric | Value |
|--------|-------|
| Total Issues | 2,294 (original) |
| Repositories | 12 Python repos |
| Verified Subset | 500 (human-validated) |
| Domains | Django, Flask, scikit-learn, matplotlib, etc. |

### Task Structure

```
Input:
  - Full codebase (repository at issue time)
  - Issue description (title + body)
  - (Optional) Agentic tools

Output:
  - Git patch resolving the issue

Evaluation:
  - Apply patch to codebase
  - Run repository's test suite
  - Success = all relevant tests pass
```

### Key Findings

1. **Gap Between Benchmarks and Reality**: Models performing well on HumanEval struggle on SWE-bench
2. **Codebase Understanding Matters**: Must navigate, localize, and understand existing code
3. **Agentic Scaffolding Helps**: Models with tools (search, edit, test) outperform raw LLMs
4. **Long-tail Difficulty**: Many issues require multi-file changes, debugging, understanding project patterns

### Historical Performance (as of 2024)

| System | SWE-bench Lite | Notes |
|--------|----------------|-------|
| Raw GPT-4 | ~2% | No tools |
| Claude 3.5 Sonnet + tools | ~49% | With agentic scaffold |
| Devin | ~14% (contested) | Full agentic system |
| OpenAI o1 + scaffold | ~TBD | Latest models |

## AIWG Application

### Benchmark Relevance

SWE-bench validates AIWG's design principles:

| SWE-bench Requirement | AIWG Feature | Alignment |
|-----------------------|--------------|-----------|
| Codebase understanding | Context loading via @-mentions | Direct |
| Multi-file reasoning | Multi-agent with specialized views | Direct |
| Tool use | Agentic scaffolding with Bash, Read, etc. | Direct |
| Test validation | `/generate-tests`, test-driven workflows | Direct |
| Iterative refinement | Ralph loop for recovery | Direct |

### Why AIWG Outperforms Raw LLMs

SWE-bench results show that agentic systems dramatically outperform raw models. AIWG provides:

1. **Structured Context**: .aiwg/ artifacts provide project knowledge RAG-style
2. **Tool Augmentation**: Agents have search, read, edit, test capabilities
3. **Decomposition**: Complex issues broken into subtasks
4. **Review/Verification**: Multi-agent catches errors before submission
5. **Recovery**: Ralph enables iteration on failed attempts

### Evaluation Integration

AIWG could use SWE-bench for framework evaluation:

```bash
# Potential evaluation flow
1. Load SWE-bench issue into .aiwg/requirements/
2. Run flow-construction-iteration
3. Verify generated patch passes tests
4. Track success rate by issue difficulty
```

### Lessons for AIWG

1. **Real Issues > Synthetic Tasks**: Validate against actual GitHub issues
2. **Full Context Critical**: Don't truncate codebase context
3. **Tool Use Essential**: Raw prompting insufficient for complex tasks
4. **Iteration Matters**: Few-shot correction improves pass rates

## Key Quotes

> "SWE-bench evaluates LLMs on real-world software issues collected from GitHub. Given a codebase and an issue, a language model is tasked with generating a patch that resolves the described problem."

> "SWE-bench presents 2,294 real GitHub issues from 12 Python repositories that require understanding entire codebases to resolve."

## Relevance to AIWG

| Category | Relevance |
|----------|-----------|
| Evaluation & Testing | **Critical** - benchmark methodology |
| Agentic Systems | **Critical** - validates tooling approach |
| Code Generation | **High** - real-world validation |
| Recovery Patterns | **High** - iteration improves scores |

## Cross-References

- **REF-002**: Roig failure modes (explains why raw LLMs fail)
- **REF-012, REF-013**: ChatDev, MetaGPT (multi-agent comparisons)
- **Generate Tests**: `.claude/commands/generate-tests.md`
- **Ralph Loop**: `docs/ralph-guide.md`

## Related Benchmarks

- **HumanEval**: Function-level code generation (too simple)
- **MBPP**: Simple programming problems
- **CodeContests**: Competition programming (different skill)
- **SWE-bench Verified**: Human-validated 500-issue subset
- **SWE-bench Pro**: Long-horizon software tasks

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-01-24 | Research Acquisition (#74) | Initial reference entry |
