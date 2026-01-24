# REF-014: SWE-bench - AIWG Evaluation Analysis

**Source**: [REF-014: SWE-bench - Can Language Models Resolve Real-world GitHub Issues?](https://tmp/research-papers/documentation/references/REF-014-swe-bench-evaluation.md)

**Author**: Jimenez, C. E., et al. (2024)

**AIWG Relevance**: CRITICAL - Gold standard benchmark for real-world code generation

---

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

---

## Specific AIWG Features That Address SWE-bench Challenges

### 1. Structured Context via `.aiwg/` Artifacts

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

### 2. @-Mention Wiring for Traceability

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

### 3. Multi-Agent Specialization

**Problem**: Single model must handle diverse tasks (localize, edit, test, review).

**AIWG Solution**:
- **Code Archaeologist**: Localize relevant code (addresses BM25 retrieval failure)
- **Test Engineer**: Ensure tests pass (addresses 120.8 avg tests)
- **Security Auditor**: Verify no regressions (addresses pass-to-pass tests)

**SWE-bench Evidence**: Agentic scaffolding improves performance 25x.

### 4. Ralph Loop for Iterative Refinement

**Problem**: One-shot generation fails; models need feedback.

**AIWG Solution**:
```bash
aiwg ralph "Fix issue #123" \
  --completion "all tests pass" \
  --max-iterations 5
```

**SWE-bench Evidence**: Oracle-collapsed (showing only edited regions) improves performance 23%.

### 5. Test-Driven Workflows

**Problem**: Must pass avg 9.1 fail-to-pass tests AND 120.8 pass-to-pass tests.

**AIWG Solution**:
- `/generate-tests` command
- Test-first development workflow
- Regression test validation

**SWE-bench Evidence**: Robust evaluation requires both F2P and P2P tests.

---

## Key Findings and AIWG Implications

### 1. Gap Between Benchmarks and Reality

**SWE-bench Finding**: Models performing well on HumanEval (90%+) struggle dramatically on SWE-bench (<2% for raw models).

**AIWG Implication**: Function-level benchmarks don't reflect real-world software engineering complexity. AIWG must be validated against actual GitHub issues, not toy examples.

### 2. Agentic Scaffolding Dramatically Improves Performance

**SWE-bench Finding**:
- Raw Claude 2: 1.96%
- Claude 3.5 Sonnet + tools: ~49% (25x improvement)

**AIWG Implication**: Agents MUST have Bash, Read, Write tools. Test execution feedback is critical. Iterative refinement beats one-shot generation.

### 3. Retrieval Quality Critically Important

**SWE-bench Finding**: In ~50% of instances with 27K context, BM25 retrieves **none** of the oracle files.

**AIWG Application**:
- Prioritize smart context loading over raw context window size
- Use `.aiwg/` artifacts and @-mentions for targeted context
- Implement Code Archaeologist for better localization

### 4. Context Length Negatively Correlates with Performance

**SWE-bench Finding**:
- <20K tokens: ~8% resolved
- 20K-50K tokens: ~4% resolved
- 50K-100K tokens: ~2% resolved
- >100K tokens: ~1% resolved

**AIWG Application**: Better localization/retrieval is as important as larger context windows. Don't just load everything - load the right things.

### 5. Multi-File Coordination Required

**SWE-bench Finding**: Median 1.7 files edited, avg 3.0 functions edited.

**AIWG Application**:
- Multi-agent coordination for cross-file changes
- @-mention wiring for dependency tracking
- Architectural documentation in `.aiwg/architecture/`

### 6. Test Maintenance As Important As Bug Fixing

**SWE-bench Finding**: Median 51 pass-to-pass tests; can't break existing functionality.

**AIWG Application**:
- Test Engineer agent validates both F2P and P2P
- Regression test suite in `.aiwg/testing/`
- Quality gates before code submission

---

## Evaluation Integration Potential

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

### Metrics to Track

| Metric | Target | Current Baseline |
|--------|--------|------------------|
| **% Resolved** | >10% | Raw model: 1.96% |
| **% Apply** | >80% | Raw model: varies |
| **Files Edited** | Match oracle (1.7 avg) | Measure |
| **Lines Added** | Match oracle (22.3 avg) | Measure |
| **Iteration Count** | <3 iterations | Ralph loop tracking |
| **Agent Specialization Impact** | Quantify per agent | A/B test |

---

## Lessons for AIWG Development

### 1. Real Issues > Synthetic Tasks

**SWE-bench lesson**: HumanEval doesn't predict real-world performance.

**AIWG application**: Validate framework against actual GitHub issues, not toy examples.

### 2. Full Context Critical

**SWE-bench lesson**: Performance degrades with more context, but oracle retrieval helps.

**AIWG application**:
- Prioritize smart context loading over raw context window size
- Use `.aiwg/` artifacts and @-mentions for targeted context
- Implement Code Archaeologist for better localization

### 3. Tool Use Essential

**SWE-bench lesson**: Raw prompting insufficient; tools improve 25x.

**AIWG application**:
- Agents MUST have Bash, Read, Write tools
- Test execution feedback is critical
- Iterative refinement beats one-shot generation

### 4. Iteration Matters

**SWE-bench lesson**: Oracle-collapsed (focused context) improves performance 23%.

**AIWG application**:
- Ralph loop for multi-iteration refinement
- Recovery patterns for failed attempts
- Incremental improvement over perfect first try

### 5. Multi-File Coordination Required

**SWE-bench lesson**: Median 1.7 files edited, avg 3.0 functions edited.

**AIWG application**:
- Multi-agent coordination for cross-file changes
- @-mention wiring for dependency tracking
- Architectural documentation in `.aiwg/architecture/`

### 6. Test Maintenance As Important As Bug Fixing

**SWE-bench lesson**: Median 51 pass-to-pass tests; can't break existing functionality.

**AIWG application**:
- Test Engineer agent validates both F2P and P2P
- Regression test suite in `.aiwg/testing/`
- Quality gates before code submission

---

## Task Characteristics Analysis

### Complexity Breakdown

| Characteristic | Mean | Median | Max | AIWG Handling |
|----------------|------|--------|-----|---------------|
| **Issue length** | 195 words | 140 words | 4,477 words | Stakeholder Analyst parses, Requirements Specialist formalizes |
| **Codebase files** | 3,010 | 1,900 | 5,890 | Code Archaeologist localizes |
| **Codebase lines** | 438K | 400K | 886K | `.aiwg/architecture/` documents structure |
| **Files edited** | 1.7 | 1 | 31 | Multi-agent coordination |
| **Functions edited** | 3.0 | 1 | 36 | Implementation Specialist + reviewers |
| **Lines added** | 22.3 | 12 | varies | Code generation with Ralph loop |
| **Lines removed** | 10.5 | 5 | varies | Refactoring tracked |
| **Fail-to-pass tests** | 9.1 | 1 | 1,633 | Test Engineer validates |
| **Pass-to-pass tests** | 120.8 | 51 | 9,459 | Regression validation critical |

### Agent Responsibility Mapping

**For typical SWE-bench task** (median values):
- **Issue Parser**: Handle 140-word description
- **Code Archaeologist**: Navigate 1,900 files, 400K lines → localize to 1 file
- **Requirements Specialist**: Convert issue to use case
- **Implementation Specialist**: Edit 1 file, 1 function, add ~12 lines, remove ~5 lines
- **Test Engineer**: Ensure 1 F2P test passes, 51 P2P tests remain passing
- **Code Reviewer**: Validate changes don't introduce regressions

---

## Implementation Patterns

### Pattern 1: Localization Before Implementation

```typescript
async function resolveGitHubIssue(
  issue: GitHubIssue,
  codebase: Codebase
): Promise<Patch> {
  // Step 1: Localize (address BM25 50% failure)
  const relevantFiles = await codeArchaeologist.localize(
    issue.description,
    codebase
  );

  // Step 2: Understand (address multi-file coordination)
  const context = await loadRelevantContext(relevantFiles);

  // Step 3: Implement (with Ralph loop)
  const patch = await ralphLoop({
    task: `Fix issue: ${issue.title}`,
    context,
    completionCriteria: 'all F2P tests pass, all P2P tests remain passing',
    maxIterations: 5
  });

  return patch;
}
```

### Pattern 2: Test-Driven Validation

```typescript
async function validatePatch(
  patch: Patch,
  tests: TestSuite
): Promise<ValidationResult> {
  // Apply patch
  await applyPatch(patch);

  // Run fail-to-pass tests
  const f2pResults = await runTests(tests.failToPass);

  // Run pass-to-pass tests (regression)
  const p2pResults = await runTests(tests.passToPass);

  return {
    f2pPassed: f2pResults.allPassed,
    p2pMaintained: p2pResults.allPassed,
    success: f2pResults.allPassed && p2pResults.allPassed,
    errors: [...f2pResults.failures, ...p2pResults.failures]
  };
}
```

### Pattern 3: Context Pruning

```typescript
interface ContextLoadStrategy {
  // Don't load entire codebase (438K lines)
  // Load only what's relevant
  loadForLocalization(issue: Issue): Context {
    return {
      issueDescription: issue.description,
      fileList: codebase.fileList,  // Just names, not contents
      directoryStructure: codebase.structure,
      recentChanges: git.log('--since=1 month')
    };
  }

  loadForImplementation(files: File[]): Context {
    return {
      targetFiles: files.map(f => f.contents),  // Full contents
      dependencies: getDependencies(files),      // Related files
      tests: getRelatedTests(files),             // Test files
      documentation: getRelatedDocs(files)       // API docs
    };
  }
}
```

---

## Benchmark Integration Strategy

### Phase 1: Manual Evaluation (Immediate)

1. Select 10 SWE-bench Lite instances (functional bugs)
2. Run AIWG framework manually
3. Measure:
   - % resolved
   - Iteration count
   - Agent handoffs
   - Time to completion
4. Document failure modes

### Phase 2: Automated Pipeline (Q2 2026)

```bash
# Automated evaluation
aiwg swebench run \
  --dataset swebench-lite \
  --instances 10 \
  --workflow flow-construction-iteration \
  --report .aiwg/reports/swebench-$(date +%Y%m%d).md

# Track over time
aiwg swebench benchmark \
  --baseline v2026.1.0 \
  --compare v2026.2.0 \
  --show-regression
```

### Phase 3: Continuous Monitoring (Q3 2026)

- Weekly SWE-bench runs on subset
- Track performance regressions
- A/B test agent improvements
- Publish results to leaderboard

---

## Cross-References

**AIWG Documentation**:
- @docs/references/REF-002-roig-failure-modes.md - Why raw LLMs fail on SWE-bench
- @docs/references/REF-012-chatdev-multi-agent-software.md - Alternative multi-agent approach
- @docs/references/REF-013-metagpt-multi-agent-framework.md - Comparison of agent architectures
- @.claude/commands/generate-tests.md - Test-driven workflow
- @docs/ralph-guide.md - Iterative refinement implementation
- @.claude/agents/code-archaeologist.md - Localization agent

**Related Benchmarks**:
- **SWE-bench Verified**: 500-instance human-validated subset
- **SWE-bench Lite**: 300-instance functional bug subset
- **SWE-bench Pro**: Extended long-horizon software tasks

---

## Improvement Opportunities

### High Priority

1. **Implement Code Archaeologist**
   - Address 50% BM25 retrieval failure
   - Localize to relevant files before implementation
   - Track localization accuracy vs. oracle

2. **Add Test Validation Pipeline**
   - Run F2P tests (must pass)
   - Run P2P tests (must maintain)
   - Report coverage metrics

3. **Optimize Context Loading**
   - Load only relevant files for implementation
   - Use @-mentions for explicit context
   - Measure token usage per task

4. **Implement Ralph Loop for Code Tasks**
   - Max 5 iterations
   - Test-driven completion criteria
   - Track iteration patterns

### Medium Priority

1. **Build SWE-bench Integration**
   - Automated evaluation pipeline
   - Weekly benchmark runs
   - Performance tracking over time

2. **Create Multi-File Coordination**
   - Track dependencies across files
   - Coordinate changes across Implementation Specialists
   - Validate cross-file consistency

3. **Add Patch Generation**
   - Generate unified diff format
   - Validate patch applies cleanly
   - Track lines added/removed

---

**Analysis Created**: 2026-01-24
**Source Paper**: Jimenez et al. (2024) - SWE-bench
**AIWG Impact**: Critical benchmark for evaluating real-world code generation capabilities
