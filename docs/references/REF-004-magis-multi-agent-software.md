# REF-004: MAGIS - LLM-Based Multi-Agent Framework for GitHub Issue Resolution

## Citation

Tao, W., Zhou, Y., Wang, Y., Zhang, W., Zhang, H., & Cheng, Y. (2024). *MAGIS: LLM-Based Multi-Agent Framework for GitHub Issue ReSolution*. arXiv:2403.17927v2 [cs.SE].

**URL**: https://arxiv.org/abs/2403.17927

**Category**: cs.SE (Software Engineering)

**Publication Date**: June 27, 2024 (v2)

**Affiliations**: Fudan University, University of Macau, Sun Yat-sen University, Chongqing University, The Chinese University of Hong Kong

## Abstract Summary

MAGIS addresses the complex challenge of resolving GitHub issues at the repository level - a task requiring both incorporation of new code and maintenance of existing functionality. Through empirical analysis of why LLMs fail at GitHub issue resolution, the authors propose a multi-agent framework with four specialized agents (Manager, Repository Custodian, Developer, QA Engineer) that collaborate through planning and coding phases.

**Core Challenge Addressed**: LLMs struggle with repository-level GitHub issue resolution, achieving less than 2% success rate when applied directly (GPT-4 on SWE-bench). The challenge encompasses locating files/lines to modify, managing complexity, and generating coherent code changes across entire repositories.

**Key Results**:
- **13.94% resolved ratio** on SWE-bench benchmark
- **8x improvement** over direct GPT-4 application (1.74% → 13.94%)
- **2x improvement** over previous SOTA (Claude-2 at 4.88%)
- **97.39% applied ratio** (code changes successfully git-apply)

**Key Contributions**:
1. Empirical analysis identifying three critical factors: file locating, line locating, code change complexity
2. Novel four-agent collaborative framework inspired by GitHub Flow
3. Memory mechanism for repository evolution (reduces LLM query costs)
4. Significant benchmark improvements demonstrating production viability

## Executive Summary

### The GitHub Issue Resolution Problem

GitHub issues represent real software evolution requirements - bug fixes, feature additions, performance enhancements. For popular repositories like Django (34K issues), resolving these programmatically could dramatically accelerate development. However, this is fundamentally different from function-level code generation:

**Repository-Level Challenges**:
- **Scale**: Entire codebase as context (exceeds LLM context limits)
- **Localization**: Finding which files and lines to modify
- **Complexity**: Multiple files, functions, hunks requiring coordinated changes
- **Maintenance**: Must preserve existing functionality while adding new capabilities
- **Testing**: Must pass both existing tests and new requirement tests

### The MAGIS Solution

MAGIS transforms the monolithic task into a **collaborative workflow** with specialized agents:

```
Human → GitHub Issue
    ↓
PLANNING PHASE:
├── Repository Custodian → Locate candidate files (BM25 + memory + LLM filtering)
├── Manager → Define file-level tasks + build team
└── Kick-off Meeting → Developers confirm plan, resolve dependencies

CODING PHASE:
├── Developer Agents → Locate lines + generate code (per task)
└── QA Engineer → Review + iterate (max iterations or approval)
    ↓
Merged Repository-Level Code Change
```

**Key Innovations**:
1. **Memory Mechanism**: Reuses file summaries to reduce redundant LLM queries
2. **Decomposition**: Issue → File-level tasks → Line-level edits
3. **Multi-step Coding**: Locate lines → Extract old code → Generate new code → Review
4. **Collaborative Planning**: Kick-off meetings ensure task coherence
5. **Continuous QA**: Each developer paired with dedicated QA engineer

## Empirical Study (Section 2)

The paper conducts rigorous analysis to answer: **Why does direct LLM application fail at GitHub issue resolution?**

### RQ1: Why is Performance Limited?

#### Factor 1: Locating Files to Modify

**Finding**: Higher recall improves results initially, but including too many files degrades performance.

- Claude-2: **29.58% recall → 1.96% resolved**, but **51.06% recall → 1.22% resolved**
- Cause: Including irrelevant files or exceeding LLM context capacity

**Implication**: Need **high recall with minimal files** - strategic balance, not just more files.

**Quote** (p.2-3): "optimizing the performance of LLMs can be better achieved by striving for higher recall scores with a minimized set of files"

#### Factor 2: Locating Lines to Modify

**Metric**: Coverage ratio = intersection of generated vs reference line ranges

**Formula** (Equation 1, p.3):
```
Coverage Ratio = Σ(intersection of modified lines) / Σ(total reference lines modified)
```

**Finding**: Strong positive correlation between line coverage and resolution success.

- Claude-2: **coefficient 0.5997, P < 0.05** (statistically significant)
- GPT-4/GPT-3.5: Limited data due to low success rates

**Distribution Analysis** (Figure 1, p.3):
- All three LLMs show **highest frequency at coverage ratio ≈ 0** (most attempts miss the target)
- Claude-2 > GPT-4 > GPT-3.5 at **coverage ratio ≈ 1** (perfect localization)
- This ranking matches their overall resolution success rates

**Quote** (p.3): "locating lines is a key factor for GitHub issue resolution"

#### Factor 3: Code Change Complexity

**Indices Measured**: # files, # functions, # hunks, # added LoC, # deleted LoC, # changed LoC

**Finding**: Significant negative correlation between complexity and success (Table 1, p.4).

| LLM | # Files | # Functions | # Hunks | # Added LoC | # Deleted LoC | # Changed LoC |
|-----|---------|-------------|---------|-------------|---------------|---------------|
| GPT-3.5 | −17.57* | −17.57* | −0.06* | −0.02 | −0.03 | −0.53* |
| GPT-4 | −25.15* | −25.15* | −0.06 | −0.10 | −0.04 | −0.21 |
| Claude-2 | −1.47* | −1.47* | −0.11* | −0.09* | −0.07* | −0.44* |

(* = P-value < 0.05, statistically significant)

**Interpretation**:
- **Number of files/functions**: Strong negative impact across all models
- **Claude-2**: Better handles complexity (lower negative coefficients)
- **More complex issues** (multi-file, multi-function) → **lower resolution rates**

**Quote** (p.3): "increased complexity, particularly in terms of the number of files and functions modified, may hinder the issue resolution"

### Empirical Study Summary

**Three Critical Success Factors**:
1. **File Locating**: Precision matters more than raw recall
2. **Line Locating**: Accurate line identification strongly predicts success
3. **Complexity Management**: Simpler changes (fewer files/functions) succeed more often

**AIWG Alignment**: These findings directly inform MAGIS design and validate AIWG's own decomposition strategy (issues → tasks → subtasks).

## Methodology (Section 3)

### Four Agent Roles

MAGIS implements four specialized agents inspired by GitHub Flow (human workflow paradigm):

#### 1. Manager Agent

**Responsibilities**:
- Decompose GitHub issue into file-level tasks
- Dynamically assemble developer team (one Developer per task)
- Organize kick-off meeting
- Generate executable work plan

**Innovation vs Human Workflow**: Humans form teams first, then assign tasks. MAGIS defines tasks first, then designs Developer agents to match - **greater flexibility**.

**Algorithm 2 (Team Building, p.6)**:
```
For each candidate file fi:
    ti ← LLM(fi, issue description)  # Define file-level task
    ri ← LLM(ti, issue)               # Design Developer role
    Team ← Team ∪ {Developer with role ri}
```

**Quote** (p.4): "improves team flexibility and adaptability, enabling the formation of teams that can meet various issues efficiently"

#### 2. Repository Custodian Agent

**Responsibilities**:
- Locate candidate files relevant to GitHub issue
- Filter irrelevant files to minimize LLM context costs
- Maintain repository evolution memory (key innovation)

**Challenges Addressed**:
- **Computational cost**: Querying LLM for every file in large repos on every update
- **Performance degradation**: Long context inputs reduce LLM effectiveness (p.5 citations [31, 33, 68])

**Algorithm 1 (Locating with Memory, p.5)**:
```
1. BM25 ranking → Select top-k candidates
2. For each file fi:
    a. Check memory M for previous summary sh
    b. If file changed since version h:
        - Compute diff: Δd = diff(fh, fi)
        - If len(sh) < len(fi): reuse summary + LLM(Δd) for update
        - Else: generate new summary
    c. LLM determines relevance to issue → filter irrelevant files
```

**Memory Mechanism Benefits**:
- **Reuse**: Previous file summaries compressed by LLM
- **Incremental**: Only analyze diffs (git diff) for changed files
- **Cost reduction**: Avoid re-querying entire file contents

**Quote** (p.5): "Considering that applying the code change often modifies a specific part of the file rather than the entire file, we propose a memory mechanism to reuse the previously queried information"

#### 3. Developer Agent

**Responsibilities**:
- Execute assigned file-level task from Manager
- Locate specific line ranges to modify
- Generate new code to replace old code
- Iterate based on QA Engineer feedback

**Advantages Over Human Developers** (p.5):
- Work continuously without fatigue
- Parallel scheduling easier (no human constraints)
- Leverage automatic code generation strengths

**Innovation**: Decompose code modification into sub-operations (locate → extract → generate → replace) to maximize LLM's code generation strengths while mitigating change generation weaknesses.

#### 4. QA Engineer Agent

**Responsibilities**:
- Review each Developer's code change
- Provide task-specific, timely feedback
- Approve or request revisions (up to max iterations)

**Problem Addressed**: Code review delays in human workflows (up to 96 hours, citation [6]) and review neglect (citation [4]).

**Innovation**: **Each Developer paired with dedicated QA Engineer** - personalized, immediate feedback loop.

**Quote** (p.5): "To address this problem, our framework pairs each Developer agent with a QA Engineer agent, designed to offer task-specific, timely feedback"

### Collaborative Process

#### Planning Phase (Section 3.2.1)

**Three Stages**: Locate Code Files → Team Building → Kick-off Meeting

**Locating Code Files** (Algorithm 1):
```
Input: Repository Ri, GitHub issue qx
Output: Candidate files C^k, Repository memory M

1. BM25(Ri, qx) → Rank files by relevance
2. Select top-k files
3. For each file:
    - Retrieve/generate summary (using memory M)
    - LLM filter: relevant to issue? → Keep or discard
```

**Team Building** (Algorithm 2):
```
Input: Candidate files C^k, issue qx
Output: Tasks T^k, Developer role descriptions D^k, Work plan cmain

For each file fi in C^k:
    ti ← LLM(fi, qx, prompt P4)        # Define task
    ri ← LLM(ti, qx, prompt P5)        # Design Developer role
    T^k ← T^k ∪ (fi, ti)
    D^k ← D^k ∪ ri

recording ← kick_off_meeting(D^k)       # Agents discuss
D^k ← refine_roles(D^k, recording, P6)  # Adjust based on discussion
cmain ← LLM(recording, P7)              # Generate executable plan
```

**Kick-off Meeting** (Figure 7, Appendix B, p.17):

Circular speech format:
1. **Manager opens** - states issue, assigned tasks, expected collaboration
2. **Developers speak in turn** - provide opinions, identify dependencies, suggest modifications
3. **Manager summarizes** - generates work plan as executable code

**Purpose** (p.6):
- Confirm tasks are reasonable and comprehensive
- Determine sequential dependencies vs parallel execution
- Avoid conflicts between developers

**Quote** (p.6): "The meeting makes collaboration among Developers more efficient and avoids potential conflicts"

#### Coding Phase (Section 3.2.2)

**Algorithm 3 (Coding Task Execution, p.6-7)**:
```
Input: File-task pairs T^k, max iterations nmax
Output: Repository-level code changes D

For each (fi, ti) in T^k:
    ai ← LLM(fi, ti, P8)  # Generate QA Engineer role

    For j in [0, nmax):
        If j > 0:
            ti ← (ti, review_comment)  # Append feedback

        # Multi-step coding process:
        {[s'i, e'i]} ← LLM(fi, ti, P9)          # Locate line ranges
        old_part ← extract(fi, {[s'i, e'i]})    # Extract existing code
        new_part ← LLM(fi, ti, old_part, P10)   # Generate replacement
        f'i ← replace(fi, old_part, new_part)   # Apply change
        Δdi ← diff(fi, f'i)                      # Compute diff

        # QA Review:
        review_comment ← LLM(ti, Δdi, P11)
        review_decision ← LLM(review_comment, P11)

        If review_decision == approve:
            break  # Accept code change

    D ← D ∪ Δdi  # Merge into repository-level change
```

**Multi-Step Breakdown**:
1. **Locate**: Identify line ranges {[start, end]} requiring modification
2. **Extract**: Split file into old_part (to replace) and retained sections
3. **Generate**: LLM creates new_part to replace old_part
4. **Review**: QA Engineer evaluates, provides feedback or approval
5. **Iterate**: Continue until approval or max iterations reached

**Quote** (p.6): "we transform the code change generation into the multi-step coding process that is designed to leverage the strengths of LLMs in code generation while mitigating their weaknesses in code change generation"

### MAGIS Workflow Summary

```
GitHub Issue
    ↓
Repository Custodian: BM25 → Memory filter → LLM relevance check → Candidate files
    ↓
Manager: Define tasks → Design Developers → Kick-off meeting → Work plan
    ↓
Developer (per task):
    Locate lines → Extract code → Generate new code → Submit for review
        ↓
    QA Engineer: Review → Feedback/Approval
        ↓
    [Iterate until approval or max attempts]
    ↓
Merge all code changes → New repository
```

## Experimental Results (Section 4)

### Setup

**Dataset**: SWE-bench - 2,294 real GitHub issues from 12 Python repositories
- **Test set**: 25% subset (574 instances) - same subset used for GPT-4 experiments [27]
- **Repositories**: Django, scikit-learn, matplotlib, pandas, sympy, etc.

**Base Model**: GPT-4 (for fairness with SWE-bench baselines)

**Metrics**:
- **Applied Ratio**: % of instances where code change can be `git apply`'d
- **Resolved Ratio**: % where code change passes all tests (old + new requirements)

**Setting**: Oracle file locating (correct files provided) - focuses evaluation on planning and coding phases.

### RQ2: Overall Effectiveness

**Table 2 (Main Results, p.7)**:

| Method | % Applied | % Resolved |
|--------|-----------|------------|
| GPT-3.5 | 11.67 | **0.84** |
| Claude-2 | 49.36 | **4.88** |
| GPT-4 | 13.24 | **1.74** |
| SWE-Llama 7b | 51.56 | **2.12** |
| SWE-Llama 13b | 49.13 | **4.36** |
| **MAGIS** | **97.39** | **13.94** |
| MAGIS (w/o QA) | 92.71 | 10.63 |
| MAGIS (w/o hints) | 94.25 | 10.28 |
| MAGIS (w/o hints, w/o QA) | 91.99 | 8.71 |

**Key Findings**:

1. **MAGIS achieves 13.94% resolved ratio** - best performance by significant margin
2. **8x improvement over GPT-4** (1.74% → 13.94%) using same base model
3. **2.86x improvement over Claude-2** (4.88% → 13.94%) - previous SOTA
4. **97.39% applied ratio** - nearly all code changes are syntactically valid
5. **Even without QA and hints** (8.71%), still **5x better than GPT-4**

**Quote** (p.7): "our framework's effectiveness is eight-fold that of the base LLM, GPT-4. This substantial increase underscores our framework's capability to harness the potential of LLMs more effectively"

**Ablation Analysis**:

- **w/o QA**: 10.63% (−3.31%) - QA Engineer contributes significantly
- **w/o hints**: 10.28% (−3.66%) - Human clarifications help but aren't required
- **w/o both**: 8.71% (−5.23%) - Core framework still provides 5x improvement

**Implication**: Multi-agent collaboration itself (Manager, Custodian, Developer) drives majority of gains.

### RQ3: Planning Effectiveness

#### Repository Custodian Performance

**Figure 3 (Recall vs File Number, p.8)**: MAGIS consistently outperforms BM25 baseline across all file counts.

- **Higher recall with fewer files** - validates memory mechanism effectiveness
- Strategic filtering reduces irrelevant files while maintaining coverage

#### Manager Performance

**Task Description Quality** (Figure 4, p.8):

GPT-4 evaluates correlation between Manager's generated task descriptions and reference code changes (1-5 scale, Table 6, p.21).

**Distribution**:
- Majority score ≥3 (correct direction)
- Higher scores (4-5) correlate with higher resolution probability
- More "Resolved" outcomes in high-correlation buckets

**Quote** (p.8): "when the generated task description closely aligns with the reference, there is a higher possibility of resolving the issue"

### RQ4: Coding Effectiveness

#### Line Locating Accuracy

**Figure 5 (Coverage Distribution, p.9)**: MAGIS shows **strong preference for coverage ratio ≈ 1** (perfect localization).

Compared to baselines:
- Higher frequency at ratio ≈ 1
- Lower frequency at ratio ≈ 0
- Multi-step process (Algorithm 3) improves line identification

**Figure 6 (Resolved Ratio by Coverage, p.9)**:
- **Cumulative frequency increases with coverage**
- Steeper slope in high-coverage region (0.6-1.0)
- Validates empirical finding: accurate line locating → higher success

**Quote** (p.9): "the Developer agent should prioritize improving its capability of locating code lines"

#### Complexity Correlation Reduction

**Table 3 (Complexity vs Resolution, p.9)**:

| Method | # Files | # Functions | # Hunks | # Added LoC | # Deleted LoC | # Changed LoC |
|--------|---------|-------------|---------|-------------|---------------|---------------|
| GPT-4 | −25.15* | −25.15* | −0.06 | −0.10 | −0.04 | −0.21 |
| **MAGIS** | **−1.55*** | **−1.55*** | −0.12* | −0.04* | −0.06* | −0.57* |

**Finding**: MAGIS dramatically reduces negative impact of file/function complexity.

- GPT-4: −25.15 correlation with # files/functions
- MAGIS: −1.55 correlation (94% reduction in negative impact)

**Implication**: Multi-agent decomposition successfully mitigates complexity barriers.

#### QA Engineer Contribution

**Ablation Result** (Table 2): QA Engineer adds +3.31% resolved ratio (10.63% → 13.94%)

**Case Study** (Figure 11 → Figure 10, Appendix I, p.20):
- Developer initially assigns wrong parameter (`random_state` instead of `seed`)
- QA Engineer identifies error: "doesn't seem entirely correct... could lead to worse results"
- Developer revises → Final code passes all tests

**Quote** (p.9): "This overall enhancement substantiates the QA Engineer's contribution to improving outcomes"

### Comparison with Contemporary Work

**SWE-bench Lite Results** (Table 4, Appendix D, p.18):

| Method | Resolved % |
|--------|-----------|
| AutoCodeRover | 16.11% (22.33% union) |
| SWE-Agent | 18.00% |
| **MAGIS Full** | **25.33%** |
| MAGIS w/o QA | 23.33% |
| MAGIS w/o hints | 16.67% |
| MAGIS w/o both | 16.00% |

**Finding**: MAGIS achieves highest resolved ratio on canonical SWE-bench lite subset.

**Devin Comparison** (Appendix E, p.18):

On 140 overlapping instances:
- MAGIS: 21 resolved (15%)
- Devin: 18 resolved (12.86%)
- **MAGIS faster**: ~3 min/issue vs Devin >10 min for 72% of instances

**Note**: Not entirely fair comparison - Devin has internet access, browser, unknown LLM.

## Case Studies

### Case 1: Django Issue #30664 (Figure 14, p.23)

**Issue**: SQLite3 migrations fail with quoted db_table

**MAGIS Resolution**:
1. **Repository Custodian**: Located 2 candidate files
2. **Manager**: Defined 2 tasks → Recruited Django Database Specialist, Alex Rossini
3. **Kick-off Meeting**: Determined execution sequence (Database Specialist first)
4. **Developer I**: Modified code, QA approved immediately
5. **Developer II**: Three attempts, QA feedback on first two, final version approved
6. **Result**: Both changes merged → All tests pass

**Comparison with Human Solution** (Figure 15 vs Figure 16):
- Human: Modified 4 hunks across 2 files
- MAGIS: Modified only 1 file (simpler solution)
- **Both pass all tests** - MAGIS found more elegant solution

### Case 2: scikit-learn Issue #9784 (Figures 11 → 10, p.20)

**Issue**: KMeans gives different results for n_jobs=1 vs n_jobs>1

**QA Engineer Value Demonstration**:

**First Attempt** (Figure 11):
```python
# Developer's initial code (Line 371)
random_state=random_state  # WRONG - not using seeds array
```

**QA Engineer Feedback**:
> "This code change modifies the implementation of K-means algorithm and doesn't seem entirely correct. Running the algorithm just one time could lead to worse results, compared to running it multiple times (n_init times) and choosing the best result"

**Final Version** (Figure 10):
```python
# Developer's corrected code (Line 377)
random_state=seed  # CORRECT - uses seed from iteration
```

**Result**: All tests pass after QA-guided revision

**Quote** (Case Study Section H, p.22): "With the help of the QA Engineer, the Developer further revise the code, and the final code change is shown in Fig. 10"

### Key Insights from Cases

1. **MAGIS can find simpler solutions** than human developers (Django case)
2. **QA Engineer prevents subtle bugs** (scikit-learn case)
3. **Kick-off meetings coordinate** multi-developer tasks effectively
4. **Memory mechanism scales** to large repositories

## Statistics on Generated Code Changes (Appendix F)

### Resolved Issues (Table 5, p.21)

**Complexity Comparison** (MAGIS vs Human Reference):

| Metric | MAGIS Avg | Gold Avg | Difference |
|--------|-----------|----------|------------|
| # Files | 1.02 | 1.04 | −0.02 |
| # Functions | 1.02 | 1.04 | −0.02 |
| # Hunks | 1.45 | 1.66 | −0.21 |
| # Added LoC | 9.75 | 4.34 | +5.41 |
| # Deleted LoC | 5.27 | 5.16 | +0.11 |

**Finding**: MAGIS generates **more comments** (explains higher added LoC).

**Figure 10 Example**: Lines 365, 368, 371, 374, 383 contain natural language descriptions of code changes.

**Quote** (p.19): "the generation results provided by our framework often contained more comment information... These natural language descriptions are valuable in actual software evolution [26, 35]"

**Implication**: MAGIS prioritizes **maintainability** through documentation.

### Maximum Capabilities

**Resolved Instances**:
- Max files modified: 2
- Max hunks: 4
- Max total changes: 1,655 lines
- Max single modification: 190 lines

**Applied but Unresolved**:
- Max files: 13
- Max hunks: 28
- Max modification location: Line 7,150
- Max single modification: 9,367 lines

**Implication**: Framework can handle complex, large-scale modifications.

### Distribution Analysis

**Figure 8 (Resolved Instances, p.19)**:
- MAGIS adds more lines than reference (higher median)
- MAGIS deletes similar amount (overlapping distribution)
- Difference primarily from added comments

**Figure 9 (Unresolved Instances, p.19)**:
- MAGIS deletes more, adds less (compared to reference)
- Suggests overly conservative strategy may contribute to test failures

**Quote** (p.19): "for unresolved instances, the framework tends to delete a larger number of lines while adding fewer lines, in contrast to the distribution of human-written changes"

### Repository Variation (Figure 13, p.21)

**Resolved Ratio by Repository**:
- Highest: ~40% (some repositories)
- Lowest: ~0% (others)
- **Large variance** suggests domain-specific challenges

**Implication**: Different code styles, architectures, and complexity affect success rates.

## AIWG Implementation Mapping

MAGIS validates and extends AIWG's multi-agent architecture. Here's how MAGIS concepts map to AIWG:

### Direct Alignments

| MAGIS Concept | AIWG Equivalent | Strength |
|---------------|-----------------|----------|
| **Manager Agent** | Project Manager agent + flow orchestration | **Strong** |
| **Repository Custodian** | Code Intelligence agent + context gathering | **Moderate** |
| **Developer Agents** | Code Writer, Test Engineer, etc. (53 agents) | **Strong** |
| **QA Engineer** | Code Reviewer agent + review flows | **Strong** |
| **Kick-off Meeting** | Agent collaboration in flows | **Moderate** |
| **Multi-step Coding** | Decomposed subtasks in SDLC phases | **Strong** |
| **File-level Tasks** | Use case → implementation mapping | **Strong** |
| **Memory Mechanism** | `.aiwg/` artifact persistence | **Partial** |

### MAGIS Innovations AIWG Can Adopt

#### 1. Memory Mechanism for Repository Evolution

**MAGIS Implementation** (Algorithm 1, p.5):
```
For each file in repository:
    If previously analyzed:
        summary_previous ← retrieve from memory
        diff ← git diff previous current
        If len(summary) < len(file):
            summary_updated ← summary_previous + LLM(diff)
    Else:
        summary ← LLM(file)

    memory.store(file, version, summary)
```

**AIWG Application**:
```markdown
# Proposed: .aiwg/knowledge/repository-memory.json
{
  "src/auth/login.ts": {
    "version": "a4f3b2c",
    "summary": "Handles user authentication with JWT tokens...",
    "last_analyzed": "2026-01-24T10:30:00Z"
  },
  "src/auth/session.ts": {
    "version": "b2e1d9a",
    "summary": "Manages user session lifecycle...",
    "last_analyzed": "2026-01-24T10:32:00Z",
    "diff_from_previous": "Added session timeout configuration"
  }
}
```

**Benefits**:
- Reduce LLM queries for unchanged files
- Faster context loading for large repositories
- Incremental understanding as code evolves

**Implementation Location**: `agentic/code/addons/code-intelligence/memory-mechanism/`

#### 2. Line-Level Localization Before Code Generation

**MAGIS Multi-Step Process** (Algorithm 3, p.6):
```
1. Locate: {[start_line, end_line]} ← LLM(file, task, P9)
2. Extract: old_code ← file[start_line:end_line]
3. Generate: new_code ← LLM(file, task, old_code, P10)
4. Replace: file' ← replace(file, old_code, new_code)
5. Review: QA Engineer evaluates change
```

**AIWG Application**:

Current AIWG pattern (implicit):
```markdown
Developer agent receives task → generates full code change
```

**Proposed enhancement**:
```markdown
# In Code Writer agent definition:

## Modification Protocol

When modifying existing code:

1. **Locate**: Identify exact line ranges requiring change
   - Use grep/glob to find relevant sections
   - Output: "Lines X-Y in file.ts require modification"

2. **Extract**: Read current implementation
   - Use Read tool with line numbers
   - Understand existing logic and dependencies

3. **Generate**: Create replacement code
   - Maintain existing style and patterns
   - Add inline comments explaining changes

4. **Verify**: Self-check before submission
   - Does change address the requirement?
   - Are existing tests still valid?
```

**Benefits**:
- Leverages LLM strength in code generation
- Mitigates weakness in code modification
- Improves accuracy (validated by MAGIS Figure 6 correlation)

**Implementation**: Update agents in `agentic/code/frameworks/sdlc-complete/agents/code-writer.md`

#### 3. Formalized Kick-off Meetings

**MAGIS Pattern** (Section 3.2.1, p.6 + Figure 7, p.17):

```
Manager opens → States issue, tasks, expected collaboration
Developer 1 speaks → Identifies dependencies, suggests sequence
Developer 2 speaks → Confirms understanding, notes potential conflicts
Developer N speaks → ...
Manager summarizes → Generates executable work plan
```

**AIWG Application**:

Current: Flow commands coordinate agents sequentially
Proposed: Add explicit planning phase

```markdown
# New skill: .claude/skills/planning-meeting.md

# Planning Meeting Skill

## Purpose
Coordinate multiple agents before execution to identify dependencies,
resolve conflicts, and optimize execution order.

## Process

1. **Convene**: Gather all agents assigned to the workflow
2. **Present**: Manager agent describes overall goal and individual tasks
3. **Discuss**: Each agent identifies:
   - Prerequisites for their task
   - Outputs they produce for other agents
   - Potential conflicts with other tasks
4. **Sequence**: Determine execution order (sequential vs parallel)
5. **Commit**: Generate executable plan with dependencies

## Outputs

- `.aiwg/working/planning-meeting-notes.md`
- `.aiwg/working/execution-plan.json`

## Example

```json
{
  "workflow": "implement-auth-feature",
  "agents": [
    {
      "name": "database-designer",
      "task": "Design user schema",
      "dependencies": [],
      "outputs_for": ["api-designer", "test-engineer"]
    },
    {
      "name": "api-designer",
      "task": "Define authentication endpoints",
      "dependencies": ["database-designer"],
      "outputs_for": ["code-writer", "test-engineer"]
    }
  ],
  "execution_sequence": [
    {"parallel": false, "agents": ["database-designer"]},
    {"parallel": false, "agents": ["api-designer"]},
    {"parallel": true, "agents": ["code-writer", "test-engineer"]}
  ]
}
```
```

**Benefits**:
- Reduces conflicts between parallel agents
- Optimizes execution order
- Documents decision-making process

**Implementation**: `agentic/code/addons/collaboration/planning-meetings/`

#### 4. Dedicated QA Engineer per Developer

**MAGIS Pattern** (Section 3.1 + Algorithm 3):
```
For each Developer agent:
    qa_engineer ← LLM(developer_task, P8)  # Generate specialized QA role

    Loop:
        code_change ← Developer.execute(task)
        review ← qa_engineer.review(code_change, task)

        If review.decision == "approve":
            break
        Else:
            task ← task + review.feedback
            Continue (max N iterations)
```

**AIWG Current Pattern**:
- Code Reviewer agent operates on completed work
- Review happens after implementation complete

**AIWG Enhancement**:

```markdown
# Proposed: Pair each agent with specialized reviewer

## In flow commands:

```yaml
agents:
  - role: code-writer
    task: "Implement authentication"
    paired_reviewer:
      role: security-focused-code-reviewer
      context: "authentication implementation"
      max_iterations: 3

  - role: test-engineer
    task: "Write integration tests"
    paired_reviewer:
      role: test-coverage-reviewer
      context: "authentication tests"
      max_iterations: 2
```

**Benefits**:
- Immediate, task-specific feedback
- Catches errors early (before merging)
- Reduces rework in later phases

**Implementation**: Extend flow command syntax, add iteration logic to orchestrator

### MAGIS Empirical Findings Applied to AIWG

#### Finding 1: File Locating Precision Matters

**MAGIS Evidence** (p.2-3): Claude-2 performance decreased from 1.96% → 1.22% as recall increased from 29.58% → 51.06%.

**AIWG Implication**: Code Intelligence agent should prioritize **relevant files** over **all files**.

**Current AIWG**: Uses grep/glob to find potentially relevant code
**Proposed Enhancement**:
```markdown
# In Code Intelligence agent

## File Relevance Scoring

When locating files for a task:

1. **Initial candidates**: Use grep/glob for broad search
2. **Summarize**: For each file, generate 2-3 sentence summary
3. **Score relevance**: Rate 1-5 how relevant to current task
4. **Filter**: Only include files with score ≥4
5. **Minimize**: If >5 files, prioritize highest scores

This prevents context overload while maintaining high recall.
```

#### Finding 2: Line Locating Strongly Predicts Success

**MAGIS Evidence** (Figure 6, p.9): Resolved ratio increases sharply with line coverage ratio, especially in 0.6-1.0 range.

**AIWG Implication**: Agents should **explicitly identify target lines** before generating code.

**Proposed Workflow**:
```markdown
# Code Writer agent modification protocol

## Step 1: Locate Target Lines
Use grep with context to identify modification points:
```bash
grep -n "function authenticate" src/auth.ts
# Output: Line 45: export function authenticate(credentials: Credentials)
```

## Step 2: Read Context
```bash
# Read lines 40-60 for context
```

## Step 3: State Intent
"I will modify lines 48-52 in src/auth.ts to add session timeout validation"

## Step 4: Generate Replacement
[Generate new code for lines 48-52]

## Step 5: Verify
Does the change address the requirement? Are line numbers correct?
```

#### Finding 3: Complexity Decomposition Reduces Negative Impact

**MAGIS Evidence** (Table 3, p.9): GPT-4 correlation with # files: −25.15; MAGIS: −1.55 (94% reduction).

**AIWG Implication**: Multi-file changes should be **decomposed into file-level tasks**, each handled by specialized agent.

**Current AIWG**: Single Code Writer may handle multi-file changes
**Proposed Enhancement**:

```markdown
# In Project Manager agent

## Multi-File Change Decomposition

When a requirement affects multiple files:

1. **Identify files**: List all files requiring modification
2. **Define tasks**: Create one file-level task per file
   - Task 1: "Update user model in src/models/user.ts"
   - Task 2: "Update auth service in src/services/auth.ts"
   - Task 3: "Update API routes in src/routes/auth.ts"
3. **Assign specialists**: Create/assign agent per task
4. **Coordinate**: Use planning meeting to resolve dependencies
5. **Integrate**: Merge changes after individual completion

This mirrors MAGIS's Manager → multiple Developers pattern.
```

### Integration Opportunities

#### Short-Term (Immediate AIWG Enhancements)

1. **Add memory mechanism** to Code Intelligence agent
   - Location: `agentic/code/addons/code-intelligence/`
   - Implementation: JSON storage in `.aiwg/knowledge/repository-memory.json`
   - Benefit: Faster context loading, reduced LLM queries

2. **Formalize multi-step modification protocol** in Code Writer agent
   - Update: `agentic/code/frameworks/sdlc-complete/agents/code-writer.md`
   - Add steps: Locate → Extract → Generate → Verify
   - Benefit: Improved accuracy (validates MAGIS empirical findings)

3. **Enhance file locating precision** in Code Intelligence
   - Add relevance scoring step
   - Filter to top-N most relevant files
   - Benefit: Avoid context overload (MAGIS Finding 1)

#### Medium-Term (Flow Command Extensions)

4. **Implement planning meetings** for multi-agent workflows
   - New skill: `planning-meeting.md`
   - Generates execution plan with dependencies
   - Benefit: Optimize sequential vs parallel execution

5. **Add paired reviewer pattern** to flow commands
   - Syntax: `paired_reviewer:` field in agent definitions
   - Iteration logic with max attempts
   - Benefit: Earlier error detection (MAGIS QA Engineer pattern)

6. **Decompose multi-file changes** in Project Manager logic
   - Detect multi-file requirements
   - Generate file-level subtasks
   - Assign specialized agents per file
   - Benefit: 94% reduction in complexity negative impact (MAGIS Table 3)

#### Long-Term (Framework Evolution)

7. **Incremental repository understanding**
   - Persistent memory across sessions
   - Git-based change tracking
   - Diff-based summary updates
   - Benefit: Scale to large, evolving codebases

8. **Dynamic agent generation**
   - Manager creates specialized agents on-demand (MAGIS pattern)
   - Currently: Fixed catalog of 53 agents
   - Future: Generate bespoke agents per unique task
   - Benefit: Greater flexibility for novel requirements

## Key Quotes

### On LLM Limitations at Repository Level

> "LLMs exhibit limitations in processing excessively long context inputs and are subject to constraints regarding their input context length. This limitation is particularly evident in repository-level coding tasks, such as solving GitHub issues, where the context comprises the entire repository" (p.2)

### On Locating Files Strategically

> "optimizing the performance of LLMs can be better achieved by striving for higher recall scores with a minimized set of files, thus suggesting a strategic balance between recall optimization and the number of chosen files" (p.3)

### On Line Locating as Key Factor

> "with a coefficient, 0.5997, on Claude-2, there is a substantial and positive relation between improvements in the coverage ratio and the probability of successfully resolving issues, which demonstrates that locating lines is a key factor for GitHub issue resolution" (p.3)

### On Manager Agent Flexibility

> "This setup improves team flexibility and adaptability, enabling the formation of teams that can meet various issues efficiently" (p.4)

### On Repository Custodian Memory Mechanism

> "Considering that applying the code change often modifies a specific part of the file rather than the entire file, we propose a memory mechanism to reuse the previously queried information" (p.5)

### On QA Engineer Necessity

> "To address this problem, our framework pairs each Developer agent with a QA Engineer agent, designed to offer task-specific, timely feedback. This personalized QA approach aims to boost the review process thereby better ensuring the software quality" (p.5)

### On Multi-Step Coding Process

> "we transform the code change generation into the multi-step coding process that is designed to leverage the strengths of LLMs in code generation while mitigating their weaknesses in code change generation" (p.6)

### On Kick-off Meeting Value

> "The meeting makes collaboration among Developers more efficient and avoids potential conflicts" (p.6)

### On Performance Gains

> "our framework's effectiveness is eight-fold that of the base LLM, GPT-4. This substantial increase underscores our framework's capability to harness the potential of LLMs more effectively" (p.7)

### On Task Description Quality

> "when the generated task description closely aligns with the reference, there is a higher possibility of resolving the issue" (p.8)

### On Line Locating Priority

> "the Developer agent should prioritize improving its capability of locating code lines" (p.9)

### On Generated Code Comments

> "the generation results provided by our framework often contained more comment information... These natural language descriptions are valuable in actual software evolution" (p.19)

## Related Work Context

### Multi-Agent Systems for Code Generation

**MetaGPT** (Hong et al., 2023): Simulates programming team SOPs, achieves leading scores on HumanEval/MBPP but focuses on **code repository establishment** (0 → complete), not evolution.

**ChatDev** (Qian et al., 2023): Virtual development company, decomposes requirements into atomic tasks. Completes small projects (<5 files average) in <7 minutes but doesn't address **software evolution**.

**MAGIS Distinction**: Focuses on **existing repository modification** - different challenge requiring file/line locating, complexity management, and existing code understanding.

### Automatic Program Repair (APR)

**Bug Localization**: DreamLoc (Qi et al., 2022) - deep relevance matching for bug locating

**Repair Methods**:
- VarFix (Wong et al., 2021) - retrieval-based
- ITER (Ye & Monperrus, 2024) - iterative neural repair
- RAP-GEN (Wang et al., 2023) - retrieval-augmented with CodeT5

**LLM-based APR**:
- Xia et al. (2023): Direct LLM application outperforms existing APR
- RepairAgent (Bouzenia et al., 2024): Autonomous LLM agent with dynamic tool interaction

**MAGIS Distinction**: Addresses **all GitHub issue types** (bugs, features, enhancements), not just bug fixing. Handles multi-file changes and complex requirements beyond single-bug repairs.

### Contemporary Work (Post-MAGIS)

**AutoCodeRover** (Zhang et al., 2024): 16.11% on SWE-bench lite (22.33% union over 3 runs)

**SWE-Agent** (Yang et al., 2024): 18.00% on SWE-bench lite

**Devin** (Cognition Labs, 2024): 12.86% on overlapping 140 instances, but has internet access + browser

**MAGIS Position**: Highest resolved ratio (25.33% on SWE-bench lite), fastest execution (~3 min/issue), open methodology.

## Limitations

### Acknowledged by Authors (Appendix K)

1. **Prompt Design Bias** (p.25)
   - Prompt engineering affects LLM performance
   - Template design follows guidelines but can't eliminate bias
   - Dataset instance biases and API limitations compound issue

2. **Dataset Scope** (p.25)
   - 12 Python repositories in SWE-bench
   - May not generalize to specialized domains (microservices, functional programming)
   - Code style and architecture variability not fully represented

**Quote** (p.25): "applying the findings of this paper to other code repositories may require further validation"

### Additional Considerations

3. **Language Specificity**: Only Python repositories tested
   - JavaScript/TypeScript, Java, Go, Rust not validated
   - Dynamic vs static typing may affect results

4. **Oracle File Locating**: Experiments assume correct files provided
   - Real-world: File locating accuracy impacts overall performance
   - Repository Custodian effectiveness critical but less validated

5. **Base Model Dependency**: Results tied to GPT-4 capabilities
   - Future models may change relative performance
   - Framework architecture should transfer, but absolute numbers may shift

6. **Context Length**: Still bounded by LLM context limits
   - Memory mechanism helps but doesn't eliminate constraint
   - Very large files (>10K lines) may challenge approach

## Benchmark Details

### SWE-bench Overview

**Source**: Jimenez et al. (2024) - "SWE-bench: Can language models resolve real-world GitHub issues?"

**Composition**:
- 2,294 GitHub issues from 12 Python repositories
- Real software evolution requirements (not synthetic)
- Each instance includes:
  - Issue description
  - Repository state at issue time
  - Reference code change (human solution)
  - Test suite (existing + new tests for requirement)

**Repositories** (example):
- django/django (web framework)
- scikit-learn/scikit-learn (machine learning)
- matplotlib/matplotlib (visualization)
- pandas-dev/pandas (data analysis)
- sympy/sympy (symbolic mathematics)

**Challenge Types**:
- Bug fixes (~60%)
- Feature additions (~25%)
- Performance enhancements (~10%)
- Refactoring (~5%)

**Evaluation**:
1. **Applied**: Can code change be `git apply`'d without conflicts?
2. **Resolved**: Does applied change pass all tests (Told ∩ Tnew)?

### SWE-bench Lite

**Purpose**: Canonical 300-instance subset for faster evaluation (recommended by authors)

**Selection Criteria**:
- Representative difficulty distribution
- Balanced across repositories
- Validated to correlate with full dataset results

**MAGIS Results**:
- 25.33% resolved on lite (vs 13.94% on 25% subset)
- Higher performance on curated subset expected

## Technical Implementation Details

### Prompts and Configuration

Paper mentions 11 distinct prompts (P1-P11) but doesn't publish full text:

| Prompt | Purpose | Algorithm Location |
|--------|---------|-------------------|
| P1 | Summarize code diff as commit message | Algorithm 1, line 13 |
| P2 | Compress file into summary | Algorithm 1, line 17 |
| P3 | Determine file relevance to issue | Algorithm 1, line 20 |
| P4 | Define file-level task | Algorithm 2, line 5 |
| P5 | Design Developer role | Algorithm 2, line 7 |
| P6 | Refine roles after meeting | Algorithm 2, line 11 |
| P7 | Generate executable work plan | Algorithm 2, line 12 |
| P8 | Design QA Engineer role | Algorithm 3, line 5 |
| P9 | Locate line ranges | Algorithm 3, line 10 |
| P10 | Generate replacement code | Algorithm 3, line 12 |
| P11 | Review code change | Algorithm 3, line 15-16 |

**Configuration** (not detailed in paper):
- Max iterations (nmax): Likely 3-5 based on case studies
- BM25 top-k: Not specified (likely 5-10 based on Figure 3)
- Context limits: Managed via memory mechanism

### Execution Environment

**Not specified in paper**:
- Docker/Kubernetes deployment?
- Parallel vs sequential agent execution?
- State management for long-running workflows?
- Error recovery strategies?

**Implied from case studies**:
- Sequential Developer execution (based on kick-off meeting output)
- Iterative QA review loop (max N attempts)
- Git-based repository management

## Future Research Directions

### Identified by Authors

1. **Cross-Language Generalization**: Validate on JavaScript, Java, Go, Rust repositories
2. **Specialized Domain Support**: Microservices, functional programming paradigms
3. **Larger Context Handling**: Improvements as LLM context windows expand
4. **Autonomous File Locating**: Remove oracle assumption, improve Repository Custodian

### Implied by Results

5. **Unresolved Instance Analysis**: Why do 86% still fail? Common failure patterns?
6. **Repository-Specific Adaptation**: Address 0-40% variance across repositories (Figure 13)
7. **Complex Change Strategies**: Improve handling of 10+ file, 20+ hunk modifications
8. **Comment Generation Policy**: Balance between documentation and implementation

### AIWG Research Opportunities

9. **Memory Mechanism Generalization**: Apply to non-code artifacts (docs, configs, tests)
10. **Planning Meeting Optimization**: When is kick-off valuable vs overhead?
11. **QA Engineer Specialization**: Task-specific vs general reviewers - performance tradeoff?
12. **Multi-Model Consensus**: Does heterogeneous LLM ensemble improve results (BP-6 from REF-001)?

## Comparative Framework Analysis

### MAGIS vs ChatDev vs MetaGPT

| Aspect | MAGIS | ChatDev | MetaGPT |
|--------|-------|---------|---------|
| **Primary Task** | Repository evolution | Project establishment | Project establishment |
| **Input** | GitHub issue + existing repo | Requirements | Requirements |
| **Output** | Code change (patch) | Complete codebase | Complete codebase |
| **Agent Roles** | 4 types (Manager, Custodian, Developer, QA) | 7 types (CEO, CTO, Programmer, etc.) | 5 types (PM, Architect, Engineer, etc.) |
| **Team Formation** | Dynamic (per issue) | Fixed team | Fixed team |
| **Key Innovation** | Memory mechanism, line-level locating | Self-reflection, mutual communication | SOPs, structured outputs |
| **Benchmark** | SWE-bench (13.94%) | Small projects (<5 files, <7 min) | HumanEval (leading scores) |
| **Limitation** | 86% still unresolved | Doesn't handle evolution | Doesn't handle evolution |

**Complementarity**: MAGIS extends ChatDev/MetaGPT from establishment → maintenance.

### MAGIS vs Traditional APR

| Aspect | MAGIS | Traditional APR |
|--------|-------|-----------------|
| **Scope** | All issue types | Bug fixing only |
| **Approach** | Multi-agent collaboration | Fault localization + repair |
| **Context** | Repository-level | File/function-level |
| **Human Input** | Issue description | Bug report |
| **Validation** | Test suite (old + new) | Test suite (old only) |
| **Performance** | 13.94% on SWE-bench | <10% on typical benchmarks |

**Advantage**: MAGIS handles feature additions, enhancements, refactoring - not just bugs.

## References

### Primary Source

- Tao, W., Zhou, Y., Wang, Y., Zhang, W., Zhang, H., & Cheng, Y. (2024). [MAGIS: LLM-Based Multi-Agent Framework for GitHub Issue ReSolution](https://arxiv.org/abs/2403.17927). arXiv:2403.17927v2 [cs.SE]

### Cited Benchmarks

- **SWE-bench**: Jimenez, C.E., Yang, J., Wettig, A., Yao, S., Pei, K., Press, O., & Narasimhan, K. (2024). [SWE-bench: Can language models resolve real-world GitHub issues?](https://openreview.net/forum?id=VTF8yNQM66). ICLR 2024.
- **SWE-bench Lite**: [Canonical 300-instance subset](https://www.swebench.com/lite.html)
- **HumanEval**: Chen, M. et al. (2021). [Evaluating Large Language Models Trained on Code](https://arxiv.org/abs/2107.03374). arXiv:2107.03374
- **MBPP**: Austin, J. et al. (2021). [Program Synthesis with Large Language Models](https://arxiv.org/abs/2108.07732). arXiv:2108.07732

### Related Multi-Agent Systems

- **MetaGPT**: Hong, S. et al. (2023). [MetaGPT: Meta Programming for Multi-Agent Collaborative Framework](https://arxiv.org/abs/2308.00352). arXiv:2308.00352
- **ChatDev**: Qian, C. et al. (2023). Communicative Agents for Software Development. arXiv preprint
- **AutoGen**: Wu, Q. et al. (2023). [AutoGen: Enabling Next-Gen LLM Applications via Multi-Agent Conversation](https://arxiv.org/abs/2308.08155). arXiv:2308.08155

### Contemporary Work

- **AutoCodeRover**: Zhang, Y. et al. (2024). [AutoCodeRover: Autonomous Program Improvement](https://arxiv.org/abs/2404.05427). arXiv:2404.05427
- **SWE-Agent**: Yang, J. et al. (2024). SWE-Agent: Agent Computer Interfaces Enable Software Engineering Language Models
- **Devin**: Cognition Labs (2024). [SWE-bench Technical Report](https://www.cognition-labs.com/post/swe-bench-technical-report)
- **RepairAgent**: Bouzenia, I., Devanbu, P.T., & Pradel, M. (2024). [RepairAgent: An Autonomous, LLM-Based Agent for Program Repair](https://arxiv.org/abs/2403.17134). arXiv:2403.17134

### APR Background

- **DreamLoc**: Qi, B. et al. (2022). [DreamLoc: A Deep Relevance Matching-Based Framework for Bug Localization](https://doi.org/10.1109/TR.2021.3104728). IEEE Trans. Reliab., 71(1):235-249
- **ITER**: Ye, H. & Monperrus, M. (2024). [ITER: Iterative Neural Repair for Multi-Location Patches](https://doi.org/10.1145/3597503.3623337). ICSE 2024

### AIWG Documentation

- **SDLC Framework**: `agentic/code/frameworks/sdlc-complete/README.md`
- **Multi-Agent Pattern**: `docs/multi-agent-documentation-pattern.md`
- **Agent Catalog**: `agentic/code/frameworks/sdlc-complete/agents/`

## Appendices Summary

**Appendix A (p.16)**: Coverage ratio formula details, observation explanations

**Appendix B (p.17)**: Full kick-off meeting transcript (Figure 7) - Django issue #30664

**Appendix C (p.16)**: Applied and resolved ratio metric definitions

**Appendix D (p.18)**: SWE-bench lite comparison with AutoCodeRover, SWE-Agent

**Appendix E (p.18)**: Devin comparison - 140 overlapping instances, speed analysis

**Appendix F (p.19-21)**: Statistics on generated code changes, distribution analysis

**Appendix G (p.21)**: Task description evaluation criteria (GPT-4 scoring rubric)

**Appendix H (p.22)**: Django case study - detailed workflow walkthrough

**Appendix I (p.22)**: QA Engineer effectiveness - scikit-learn case study

**Appendix J (p.22-25)**: Extended related work - LLMs, multi-agent systems, APR

**Appendix K (p.25)**: Limitations - prompt bias, dataset scope

## Revision History

| Date | Author | Changes |
|------|--------|---------|
| 2026-01-24 | AIWG Research | Initial comprehensive documentation - full paper analysis, AIWG mapping, implementation recommendations |
