# REF-014: SWE-bench - Can Language Models Resolve Real-world GitHub Issues?

## Citation

Jimenez, C. E., Yang, J., Wettig, A., Yao, S., Pei, K., Press, O., & Narasimhan, K. R. (2024). SWE-bench: Can Language Models Resolve Real-world GitHub Issues? *The Twelfth International Conference on Learning Representations (ICLR 2024, Oral)*.

**Website**: [https://www.swebench.com](https://www.swebench.com)

**GitHub**: [https://github.com/SWE-bench/SWE-bench](https://github.com/SWE-bench/SWE-bench)

**Paper**: [OpenReview](https://openreview.net/forum?id=VTF8yNQM66)

## Executive Summary

**Technology**: SWE-bench benchmark for evaluating language models on software engineering tasks

**Purpose**: Real-world evaluation of LMs' ability to resolve GitHub issues through code generation

**Recommendation**: **Adopt** - Critical benchmark for evaluating agentic coding systems

**Confidence**: High

**Summary**: SWE-bench represents a paradigm shift in code generation evaluation, moving from synthetic function-level tasks to real-world repository-scale software engineering. The benchmark's use of actual GitHub issues and test-driven evaluation provides a sustainable, challenging testbed that validates the necessity of agentic scaffolding, tool use, and iterative refinement - all core principles of AIWG's framework design.

## Overview

SWE-bench is a benchmark for evaluating language models on real-world software engineering tasks, specifically resolving GitHub issues from 12 popular Python repositories. Unlike synthetic coding benchmarks (e.g., HumanEval), SWE-bench requires understanding entire codebases, localizing relevant code, and generating patches that pass existing test suites.

- **Repository**: [https://github.com/SWE-bench/SWE-bench](https://github.com/SWE-bench/SWE-bench)
- **License**: Open source (task instances from MIT, BSD, Apache 2.0, GPL licensed repos)
- **Language**: Python (evaluation framework), Python repositories (benchmark tasks)
- **Initial Release**: October 2023
- **Maintainer**: Princeton University, Princeton Language and Intelligence

## Benchmark Construction Methodology

### Three-Stage Pipeline

**Stage I: Repository Selection and Data Scraping**
- Selected 12 popular open-source Python repositories
- Collected ~90,000 merged pull requests
- Focused on well-maintained repos with clear guidelines and test coverage

**Stage II: Attribute-Based Filtering**
- Merged PRs that resolve a GitHub issue (linked via "fixes #123" patterns)
- PRs that contribute test changes (indicating test coverage for the fix)
- Reduces to candidate task instances

**Stage III: Execution-Based Filtering**
- Apply PR's test content and log results before/after PR changes
- Filter instances requiring at least one "fail-to-pass" test
- Remove instances with installation/runtime errors
- **Final dataset**: 2,294 task instances

### Task Instance Components

| Component | Description |
|-----------|-------------|
| **Codebase (C)** | Repository at base commit (avg 3,010 files, 438K lines) |
| **Problem Statement (P)** | Aggregated issue text (avg 195 words) |
| **Solution (δ)** | Reference patch (avg 1.7 files, 3.0 functions, 32.8 lines) |
| **Tests (T)** | Fail-to-pass tests (avg 9.1) + pass-to-pass tests (median 51) |

### Repository Distribution

| Repository | Tasks | Domain |
|------------|-------|--------|
| django/django | 850 | Web framework |
| sympy/sympy | 386 | Computer algebra |
| scikit-learn/scikit-learn | 229 | Machine learning |
| sphinx-doc/sphinx | 187 | Documentation |
| matplotlib/matplotlib | 184 | Plotting/visualization |
| pytest-dev/pytest | 119 | Testing framework |
| xarray/xarray | 110 | N-D labeled arrays |
| astropy/astropy | 95 | Astronomy/astrophysics |
| pylint-dev/pylint | 57 | Static analysis |
| requests/requests | 44 | HTTP library |
| seaborn/seaborn | 22 | Statistical visualization |
| flask/flask | 11 | Web framework |

## Task Formulation

### Model Input
- **Issue description**: Natural language description of bug or feature request
- **Codebase**: Complete repository at specific commit
- **Task**: Generate patch file to resolve the issue

### Evaluation Metrics
1. **Apply patch** using Unix `patch` program
2. **Execute tests** from repository's test suite
3. **Success criteria**:
   - Patch applies successfully
   - All fail-to-pass tests now pass
   - All pass-to-pass tests remain passing
4. **Primary metric**: % of task instances resolved

## Key Features of SWE-bench

### Real-World Software Engineering Tasks
- Actual GitHub issues from production repositories
- Requires skills beyond simple code completion:
  - Navigating large codebases (thousands of files)
  - Understanding inter-file dependencies
  - Coordinating multi-function/multi-file changes
  - Debugging complex error traces

### Continually Updatable
- Collection process easily applied to any Python repository
- Minimal human intervention required
- Can evaluate on issues created after model training date
- Prevents training data contamination

### Diverse Long Inputs
- Issue descriptions: avg 195 words, max 4,477 words
- Codebase size: avg 438K lines, max 886K lines
- Requires identifying small edit scope within vast context

### Robust Evaluation
- **Fail-to-pass tests**: Verify issue resolution (avg 9.1, max 1,633)
- **Pass-to-pass tests**: Ensure existing functionality maintained (median 51, max 9,459)
- Execution-based evaluation eliminates subjective scoring

### Cross-Context Code Editing
- No explicit guidance on edit locations (unlike cloze-style tasks)
- Must generate multi-location revisions
- Reference solutions edit:
  - 1.7 files (median 1, max 31)
  - 3.0 functions (median 1, max 36)
  - 32.8 lines (median 15, max 5,888)

### Wide Scope for Solutions
- Allows comparison of retrieval, long-context, and agent-based approaches
- Permits novel solutions that deviate from reference PR
- Tests practical software engineering capabilities

## Model Evaluation Results

### Performance Summary (Original Paper, 2024)

| Model | Context Window | % Resolved (BM25) | % Resolved (Oracle) |
|-------|----------------|-------------------|---------------------|
| **Claude 2** | 100K tokens | **1.96%** | 4.80% |
| **GPT-4** | 32K tokens | 1.31% | 1.74% |
| **ChatGPT-3.5** | 16K tokens | 0.17% | 0.52% |
| **SWE-Llama 13b** | ≥100K tokens | 0.70% | 3.97% |
| **SWE-Llama 7b** | ≥100K tokens | 0.70% | 3.01% |

### SWE-bench Lite (300 instances, functional bugs)

| Model | % Resolved | % Apply |
|-------|-----------|---------|
| **Claude 3 Opus** | 4.33% | 51.67% |
| **Claude 2** | 3.00% | 33.00% |
| **GPT-4-turbo** | 2.67% | 29.67% |
| **SWE-Llama 13b** | 1.00% | 38.00% |

### Updated Performance (as of 2024-2025)

| System | SWE-bench Lite | Notes |
|--------|----------------|-------|
| **Claude 3.5 Sonnet + tools** | ~49% | With agentic scaffold |
| **Raw GPT-4** | ~2% | No tools |
| **Devin** | ~14% (contested) | Full agentic system |

## Key Findings

### 1. Gap Between Benchmarks and Reality (p. 1-2)

> "Language models have outpaced our ability to evaluate them effectively, but for their future development it is essential to study the frontier of their capabilities." (p. 1)

**Finding**: Models performing well on HumanEval (90%+) struggle dramatically on SWE-bench (<2% for raw models).

**Implication**: Function-level benchmarks don't reflect real-world software engineering complexity.

### 2. Codebase Understanding Matters (p. 2-3)

> "Resolving issues in SWE-bench frequently requires understanding and coordinating changes across multiple functions, classes, and even files simultaneously, calling for models to interact with execution environments, process extremely long contexts and perform complex reasoning that goes far beyond traditional code generation tasks." (p. 1)

**Characteristics of successful solutions**:
- Navigate codebases with median 1,900 files
- Understand inter-module dependencies
- Localize bugs within 438K lines of code
- Coordinate changes across median 1.7 files

### 3. Agentic Scaffolding Dramatically Improves Performance (p. 5-6)

**Performance comparison**:
- Raw Claude 2: 1.96%
- Claude 3.5 Sonnet + tools: ~49% (25x improvement)

**Tool augmentation benefits**:
- Code search and retrieval
- File editing capabilities
- Test execution feedback
- Iterative refinement loops

### 4. Retrieval Quality Critically Important (p. 4-5)

**BM25 Retrieval vs Oracle Retrieval**:

| Context Limit | BM25 Recall (All Files) | BM25 Recall (Any File) |
|---------------|------------------------|------------------------|
| 13K tokens | 26.09% | 34.77% |
| 27K tokens | 39.83% | 51.27% |
| 50K tokens | 45.90% | 58.38% |

**Finding**: In ~50% of instances with 27K context, BM25 retrieves **none** of the oracle files.

> "Even when increasing the maximum context size for BM25 would increase recall with respect to the oracle files, performance drops, as models are simply ineffective at localizing problematic code." (p. 6)

### 5. Context Length Negatively Correlates with Performance (p. 6-7)

**Claude 2 performance by total context length**:
- <20K tokens: ~8% resolved
- 20K-50K tokens: ~4% resolved
- 50K-100K tokens: ~2% resolved
- >100K tokens: ~1% resolved

> "Models become distracted by additional context and may be sensitive to the relative location of target sequences." (p. 6)

**Oracle-collapsed experiment** (showing only edited lines ±15):
- Claude 2: 4.8% → 5.9%
- GPT-4: 1.3% → 3.4%

**Implication**: Better localization/retrieval is as important as larger context windows.

### 6. Difficulty Doesn't Correlate with Time (p. 7)

**Performance on issues before/after 2023**:

| Model | Before 2023 | After 2023 |
|-------|-------------|------------|
| Claude 2 | 4.87% | 4.23% |
| ChatGPT-3.5 | 0.49% | 0.77% |
| GPT-4 | 1.96% | 0.00%* |
| SWE-Llama 13b | 3.98% | 3.85% |

*Evaluated on 25% subset

**Finding**: No evidence that models "cheat" by memorizing solutions from training data.

### 7. Models Generate Shorter, Simpler Edits (p. 7-8)

**Average lines edited (successfully applied patches)**:

| Model | Generated | Gold Patch |
|-------|-----------|-----------|
| Claude 2 | 19.6 lines | 44.1 lines |
| ChatGPT-3.5 | 30.1 lines | 39.6 lines |
| GPT-4 | 20.9 lines | 33.6 lines |
| SWE-Llama 13b | 17.6 lines | 37.8 lines |

**Observations from qualitative analysis** (p. 8-9):
- Models write primitive Python, not leveraging existing utilities
- "Greedy" approach: solve problem exactly, ignore code style
- Little regard for structural improvements or future-proofing
- Gold patches often make broader improvements beyond immediate issue

### 8. Fine-tuned Models Sensitive to Context Distribution Shifts (p. 7)

**SWE-Llama performance**:
- Oracle retrieval: 3.97% (13b), 3.01% (7b)
- BM25 retrieval: 0.70% (both models)

**Reason**: Fine-tuned on oracle context where all files should be edited; struggles when BM25 provides irrelevant files.

### 9. Patch File Generation Easier Than Full File Regeneration (p. 7)

**Claude 2 performance**:
- Generate patch: 4.8%
- Regenerate entire files: 2.2%
- Generate patch (shorter instances): 7.8%
- Regenerate files (shorter instances): 3.9%

**Finding**: Even controlling for length, patch format is more efficient.

### 10. Multi-Modal Understanding May Be Required (p. 6)

- 32% of matplotlib instances contain embedded images
- 10% of seaborn instances contain embedded images
- 2% overall contain images

**Implication**: Some issues require interpreting diagrams, UI screenshots, or visual bug demonstrations.

## Difficulty Analysis

### Task Characteristics Breakdown

| Characteristic | Mean | Median | Max |
|----------------|------|--------|-----|
| **Issue length** | 195 words | 140 words | 4,477 words |
| **Codebase files** | 3,010 | 1,900 | 5,890 |
| **Codebase lines** | 438K | 400K | 886K |
| **Files edited** | 1.7 | 1 | 31 |
| **Functions edited** | 3.0 | 1 | 36 |
| **Lines added** | 22.3 | 12 | (varies) |
| **Lines removed** | 10.5 | 5 | (varies) |
| **Fail-to-pass tests** | 9.1 | 1 | 1,633 |
| **Pass-to-pass tests** | 120.8 | 51 | 9,459 |

### Issue Categories (from tags)

| Category | Count | Examples |
|----------|-------|----------|
| **Bug** | 442 | "Bug", "type:bug", "status: confirmed bug" |
| **Feature** | 167 | "type:enhancement", "New feature", "Feature Request" |
| **Regression** | 39 | "type: regression", "Regression" |
| **Other** | 1,641 | "help wanted", "good first issue", "Wrong Result" |

## AIWG Application & Mapping

### Why SWE-bench Validates AIWG Design

SWE-bench empirically demonstrates that raw LLMs fail at real-world coding tasks, validating AIWG's agentic approach:

| SWE-bench Requirement | AIWG Feature | Evidence |
|-----------------------|--------------|----------|
| **Codebase understanding** | `.aiwg/` artifact directory, @-mention traceability | BM25 retrieval fails ~50% of time; need structured context |
| **Multi-file reasoning** | Multi-agent specialization (Test Engineer, API Designer) | Median 1.7 files edited; single-function view insufficient |
| **Tool use** | Bash, Read, Write, search tools | Agentic scaffolding: 1.96% → 49% (25x improvement) |
| **Test validation** | `/generate-tests`, test-driven workflows | 120.8 avg pass-to-pass tests; must maintain existing behavior |
| **Iterative refinement** | Ralph loop, recovery patterns | Oracle-collapsed +23% performance; iteration helps |
| **Long context processing** | Context loading via @-mentions, retrieval | Performance degrades with context length; need smart loading |

### Specific AIWG Features That Address SWE-bench Challenges

#### 1. Structured Context via `.aiwg/` Artifacts

**Problem**: Models struggle with 438K line codebases and long contexts.

**AIWG Solution**:
```
.aiwg/
├── requirements/     # Issue mapped to use case
├── architecture/     # Codebase structure documented
├── testing/          # Test strategy, test locations
└── working/          # Temporary analysis
```

**SWE-bench Evidence**: Oracle retrieval (4.8%) vs BM25 retrieval (1.96%) shows importance of correct context.

#### 2. @-Mention Wiring for Traceability

**Problem**: Models can't navigate inter-file dependencies.

**AIWG Solution**:
```typescript
/**
 * @implements @.aiwg/requirements/UC-XXX.md
 * @depends @src/utils/helper.ts
 * @tests @test/unit/module.test.ts
 */
```

**SWE-bench Evidence**: Median 1.7 files edited; must understand relationships.

#### 3. Multi-Agent Specialization

**Problem**: Single model must handle diverse tasks (localize, edit, test, review).

**AIWG Solution**:
- **Code Archaeologist**: Localize relevant code (addresses BM25 retrieval failure)
- **Test Engineer**: Ensure tests pass (addresses 120.8 avg tests)
- **Security Auditor**: Verify no regressions (addresses pass-to-pass tests)

**SWE-bench Evidence**: Agentic scaffolding improves performance 25x.

#### 4. Ralph Loop for Iterative Refinement

**Problem**: One-shot generation fails; models need feedback.

**AIWG Solution**:
```bash
aiwg ralph "Fix issue #123" \
  --completion "all tests pass" \
  --max-iterations 5
```

**SWE-bench Evidence**: Oracle-collapsed (showing only edited regions) improves performance 23%.

#### 5. Test-Driven Workflows

**Problem**: Must pass avg 9.1 fail-to-pass tests AND 120.8 pass-to-pass tests.

**AIWG Solution**:
- `/generate-tests` command
- Test-first development workflow
- Regression test validation

**SWE-bench Evidence**: Robust evaluation requires both F2P and P2P tests.

### Evaluation Integration Potential

AIWG could use SWE-bench for framework self-evaluation:

```bash
# Hypothetical AIWG SWE-bench integration
aiwg swebench run \
  --task pydata/xarray-5131 \
  --workflow flow-construction-iteration \
  --report .aiwg/reports/swebench-results.md

# Track success rate by issue difficulty
aiwg swebench analyze \
  --by-difficulty \
  --by-repository \
  --by-agent
```

### Lessons for AIWG Development

#### 1. Real Issues > Synthetic Tasks

**SWE-bench lesson**: HumanEval doesn't predict real-world performance.

**AIWG application**: Validate framework against actual GitHub issues, not toy examples.

#### 2. Full Context Critical

**SWE-bench lesson**: Performance degrades with more context, but oracle retrieval helps.

**AIWG application**:
- Prioritize smart context loading over raw context window size
- Use `.aiwg/` artifacts and @-mentions for targeted context
- Implement Code Archaeologist for better localization

#### 3. Tool Use Essential

**SWE-bench lesson**: Raw prompting insufficient; tools improve 25x.

**AIWG application**:
- Agents MUST have Bash, Read, Write tools
- Test execution feedback is critical
- Iterative refinement beats one-shot generation

#### 4. Iteration Matters

**SWE-bench lesson**: Oracle-collapsed (focused context) improves performance 23%.

**AIWG application**:
- Ralph loop for multi-iteration refinement
- Recovery patterns for failed attempts
- Incremental improvement over perfect first try

#### 5. Multi-File Coordination Required

**SWE-bench lesson**: Median 1.7 files edited, avg 3.0 functions edited.

**AIWG application**:
- Multi-agent coordination for cross-file changes
- @-mention wiring for dependency tracking
- Architectural documentation in `.aiwg/architecture/`

#### 6. Test Maintenance As Important As Bug Fixing

**SWE-bench lesson**: Median 51 pass-to-pass tests; can't break existing functionality.

**AIWG application**:
- Test Engineer agent validates both F2P and P2P
- Regression test suite in `.aiwg/testing/`
- Quality gates before code submission

## Key Quotes

> "SWE-bench evaluates LLMs on real-world software issues collected from GitHub. Given a codebase and an issue, a language model is tasked with generating a patch that resolves the described problem." (p. 1)

> "Resolving issues in SWE-bench frequently requires understanding and coordinating changes across multiple functions, classes, and even files simultaneously, calling for models to interact with execution environments, process extremely long contexts and perform complex reasoning that goes far beyond traditional code generation tasks." (p. 1)

> "Our evaluations show that both state-of-the-art proprietary models and our fine-tuned model SWE-Llama can resolve only the simplest issues. The best-performing model, Claude 2, is able to solve a mere 1.96% of the issues." (p. 1)

> "SWE-bench presents 2,294 real GitHub issues from 12 Python repositories that require understanding entire codebases to resolve." (Abstract)

> "Models become distracted by additional context and may be sensitive to the relative location of target sequences." (p. 6, citing Liu et al., 2023)

> "In approximately 40% of instances, BM25 retrieves a superset of the oracle files for the 27,000-token context limit. However, in almost half of the instances with the 27,000-token limit, it retrieves none of the files from the 'oracle' context." (p. 5)

> "Models tend to write primitive Python code and do not leverage existing third-party libraries or the rest of the codebase for their solutions." (p. 9)

> "In contrast, we observe that many gold patches will make structural improvements that cover a much larger scope of the codebase; these edits not only resolve the issue, but also anticipate and solve potential future issues." (p. 9)

> "The complexity of real-world software development processes extends far beyond just code completion." (p. 10)

> "Advances on SWE-bench represent steps towards LMs that are more practical, intelligent, and autonomous." (p. 1)

## Relevance to AIWG

| Category | Relevance | Rationale |
|----------|-----------|-----------|
| **Evaluation & Testing** | **Critical** | Gold standard benchmark for real-world code generation |
| **Agentic Systems** | **Critical** | Empirically validates necessity of tools, agents, iteration |
| **Code Generation** | **Critical** | Real-world validation beyond synthetic benchmarks |
| **Recovery Patterns** | **High** | Iterative refinement improves scores 23% |
| **Context Management** | **High** | Performance degrades with long context; need smart loading |
| **Multi-Agent Coordination** | **High** | Multi-file/function edits require specialized agents |

## Cross-References

### AIWG Documentation
- **REF-002**: Roig failure modes (explains why raw LLMs fail on SWE-bench)
- **REF-012**: ChatDev multi-agent (alternative approach to software development)
- **REF-013**: MetaGPT multi-agent (comparison of agent architectures)
- **Generate Tests**: `.claude/commands/generate-tests.md` (test-driven workflow)
- **Ralph Loop**: `docs/ralph-guide.md` (iterative refinement implementation)
- **Code Archaeologist**: `.claude/agents/code-archaeologist.md` (localization agent)

### Related Research
- **HumanEval** (Chen et al., 2021): Function-level benchmark that SWE-bench supersedes
- **MBPP**: Another synthetic programming benchmark
- **CodeContests**: Competition programming (different skill set)
- **Lost in the Middle** (Liu et al., 2023): Explains context length performance degradation

### Related Benchmarks
- **SWE-bench Verified**: 500-instance human-validated subset
- **SWE-bench Lite**: 300-instance functional bug subset
- **SWE-bench Pro**: Extended long-horizon software tasks

## Implementation Notes

### SWE-Llama Model Details

**Training data**:
- 19,000 issue-PR pairs from 37 additional Python repos
- No requirement for test contributions (unlike evaluation set)
- Disjoint from evaluation repos (prevents contamination)

**Architecture**:
- Base: CodeLlama-Python 7b and 13b
- Fine-tuning: LoRA on attention sublayers (r=16, α=16, dropout=0.05)
- Training: 4 epochs, learning rate 6e-4, batch size 32
- Max sequence length: 30,000 tokens (filtered from training)
- Effective training corpus: 10,000 instances

**Performance**:
- SWE-Llama 7b: 20 hours on 4 NVIDIA A100s
- SWE-Llama 13b: 47 hours on 8 NVIDIA A100s
- Context window: ≥100,000 tokens (via DeepSpeed Ulysses + Flash Attention)

### Evaluation Pipeline

1. **Input construction**: BM25 or oracle retrieval for relevant files
2. **Model generation**: Single patch file (greedy decoding)
3. **Patch application**: Unix `patch` program
4. **Test execution**: Repository's test framework (pytest, tox, etc.)
5. **Success determination**: All F2P tests pass, all P2P tests pass

### Retrieval Methods

**BM25 Sparse Retrieval**:
- Documents: File contents prepended with file paths
- Query: Issue description text
- Context limits: 13K, 27K, 50K tokens tested
- Finding: Models perform best on shortest context (13K)

**Oracle Retrieval**:
- Files: Exact files edited by reference solution
- Limitation: Not realistic (wouldn't know which files to edit)
- Use case: Analysis and upper-bound performance

## Success Metrics

| Metric | Value | Assessment |
|--------|-------|------------|
| **Task instances** | 2,294 | Substantial dataset |
| **Repository coverage** | 12 repos | Good diversity across domains |
| **Test coverage** | 100% | All instances have fail-to-pass tests |
| **Evaluation automation** | Full | Execution-based, objective |
| **Data freshness** | Continual | Can add new instances post-publication |
| **Research impact** | High | ICLR 2024 Oral, widely cited |
| **Industry adoption** | High | Devin, Claude, and other systems report SWE-bench scores |

## Limitations and Future Directions

### Acknowledged Limitations (from paper)

1. **Python only**: Task instances all from Python repositories
   - Future: Extend to JavaScript, Java, C++, Rust, etc.

2. **Baseline approaches**: Simple retrieval + prompting
   - Future: Agent-based approaches, tool-augmented systems

3. **Evaluation completeness**: Execution-based testing alone insufficient
   - Code readability, efficiency, maintainability not measured
   - Human review still needed for production use

### Research Opportunities

1. **Better retrieval/localization**: Address 50% BM25 failure rate
2. **Long-context reasoning**: Overcome performance degradation with context length
3. **Multi-file coordination**: Improve beyond median 1.7 files edited
4. **Code style adherence**: Generate idiomatic, maintainable code
5. **Multi-modal understanding**: Handle images in issue descriptions (32% matplotlib)
6. **Iterative debugging**: Leverage test feedback for refinement
7. **Structural improvements**: Match gold patches' future-proofing

## Recommended Next Steps

### For AIWG Framework

1. **Implement SWE-bench integration**:
   ```bash
   aiwg swebench run --task <instance-id> --agent sdlc-complete
   ```

2. **Track performance by component**:
   - Code Archaeologist: Retrieval accuracy vs BM25
   - Test Engineer: F2P and P2P test pass rates
   - Ralph loop: Improvement per iteration

3. **Validate design decisions**:
   - Does `.aiwg/` structure improve retrieval?
   - Do @-mentions help multi-file coordination?
   - Does multi-agent outperform single-agent?

4. **Benchmark against baselines**:
   - AIWG vs raw Claude/GPT-4
   - AIWG vs SWE-Llama
   - AIWG vs other agentic systems (Devin, etc.)

### For Research

1. **Investigate retrieval improvements**: Can semantic search + BM25 hybrid beat oracle?
2. **Explore agent architectures**: Which specializations matter most?
3. **Optimize iteration strategies**: When to stop Ralph loop?
4. **Study failure modes**: What patterns cause regressions?

## References

### Primary Sources
- **Paper**: Jimenez et al. (2024), ICLR 2024
- **Website**: https://www.swebench.com
- **Code**: https://github.com/SWE-bench/SWE-bench
- **Leaderboard**: https://www.swebench.com (live rankings)

### Related Work Cited
- Chen et al. (2021): HumanEval benchmark
- Liu et al. (2023): "Lost in the Middle" - context length challenges
- Rozière et al. (2023): CodeLlama foundation models
- Robertson et al. (2009): BM25 retrieval algorithm

### Datasets
- **SWE-bench**: 2,294 task instances (12 repos)
- **SWE-bench Lite**: 300 task instances (functional bugs)
- **SWE-bench-train**: 19,000 training instances (37 repos)

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-01-24 | Research Documentation | Comprehensive documentation from paper analysis |
| 2026-01-24 | Research Acquisition (#74) | Initial reference entry |

---

**Document Status**: Complete - Comprehensive analysis with AIWG mapping

**AIWG Integration**: Ready for implementation in evaluation workflows

**Next Review**: After SWE-bench Lite performance benchmarking
