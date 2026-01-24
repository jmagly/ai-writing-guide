# REF-018 AIWG Analysis: ReAct - Reasoning and Acting

**Source**: @/tmp/research-papers/documentation/references/REF-018-react-reasoning-acting.md

**Paper**: Yao, S., Zhao, J., Yu, D., Du, N., Shafran, I., Narasimhan, K., & Cao, Y. (2023). ReAct: Synergizing Reasoning and Acting in Language Models. *ICLR*.

**AIWG Relevance**: CRITICAL for agent tool use - establishes Thought→Action→Observation paradigm

---

## AIWG Agent Tool Use Mapping

### Direct Applications to AIWG Agents

#### 1. Tool Use Pattern (Test Engineer, API Designer, Security Auditor)

**ReAct Mapping**:
```
Thought: I need to run tests to verify the authentication logic
Action: execute_command["npm test auth.test.ts"]
Observation: 3/5 tests passing, 2 failures in token validation
Thought: Token validation is failing, I should examine the error details
Action: read_file["test/auth.test.ts"]
Observation: [file contents showing test expectations]
Thought: Tests expect JWT expiry of 3600s but code uses 1800s
Action: edit_file["src/auth/token.ts", line 45, "3600"]
Observation: File updated successfully
```

#### 2. Information Gathering Pattern (Project Analyst, Research Agent)

**ReAct Mapping**:
```
Thought: I need to find the project's security requirements
Action: search_files["security requirement"]
Observation: Found in .aiwg/requirements/nfr-modules/security.md
Thought: Now I need to check if current implementation meets these
Action: read_file[".aiwg/requirements/nfr-modules/security.md"]
Observation: [requirements content]
Thought: Requirement SEC-001 mandates HTTPS, I should verify the config
Action: read_file["config/server.ts"]
Observation: [server configuration]
```

#### 3. Planning and Execution Pattern (Orchestrator, DevOps Engineer)

**ReAct Mapping**:
```
Thought: To deploy, I need to: 1) run tests, 2) build, 3) push to registry
Action: execute_command["npm test"]
Observation: All tests passing
Thought: Tests passed, now I can build the Docker image
Action: execute_command["docker build -t app:v1.2.0 ."]
Observation: Build successful, image created
Thought: Build complete, now push to registry
Action: execute_command["docker push registry.example.com/app:v1.2.0"]
```

---

## The ReAct Framework

### Core Concept

ReAct augments the agent's action space to **Â = A ∪ L**, where:
- **A** = domain-specific actions (e.g., search, navigate, manipulate)
- **L** = language space (thoughts/reasoning traces)

### Thought→Action→Observation Cycle

The fundamental pattern (p. 2):

```
Thought 1: [Decompose goal, plan approach]
Action 1: [Execute environment action]
Observation 1: [Receive environment feedback]
Thought 2: [Reason about observation, adjust plan]
Action 2: [Execute next action]
Observation 2: [Receive feedback]
...
```

### Types of Thoughts

ReAct thoughts serve multiple purposes (p. 3):

1. **Goal decomposition**: "I need to search x, find y, then find z"
2. **Progress tracking**: "Now I have completed step 1, next I need to..."
3. **Information extraction**: "The paragraph says x was started in 1844"
4. **Commonsense reasoning**: "x is not y, so z must instead be..."
5. **Arithmetic reasoning**: "1844 < 1989"
6. **Search reformulation**: "Maybe I can search/look up x instead"
7. **Exception handling**: "The search failed, I should try a different approach"
8. **Answer synthesis**: "Based on the information gathered, the answer is x"

---

## Benchmark Results

### Knowledge-Intensive Reasoning

#### HotpotQA (Multi-hop Question Answering)

**Prompting Results (PaLM-540B)** (Table 1, p. 5):

| Method | HotpotQA EM |
|--------|-------------|
| Standard | 28.7 |
| CoT | 29.4 |
| CoT-SC (21 samples) | 33.4 |
| Act | 25.7 |
| ReAct | 27.4 |
| **CoT-SC → ReAct** | **34.2** |
| **ReAct → CoT-SC** | **35.1** |

**Key Finding**: "The best approach overall is a combination of ReAct and CoT that allows for the use of both internal knowledge and externally obtained information during reasoning" (p. 5).

#### FEVER (Fact Verification)

| Method | Fever Accuracy |
|--------|----------------|
| Standard | 57.1 |
| CoT | 56.3 |
| Act | 58.9 |
| **ReAct** | **60.9** |
| **CoT-SC → ReAct** | **64.6** |

### Interactive Decision Making

#### ALFWorld (Text-based Embodied Tasks)

| Method | Success Rate |
|--------|--------------|
| Act (best) | **45** |
| ReAct (avg) | **57** |
| **ReAct (best)** | **71** |
| BUTLER (IL) | 37 |

**Key Results**:
- ReAct best trial: **71% success** (34% absolute improvement)
- Trained with only **1-2 in-context examples** vs 10^5 expert trajectories for BUTLER
- Consistent advantage across 6 trials: averaging **62% relative gain**

#### WebShop (Real-world Product Search)

| Method | Score | Success Rate |
|--------|-------|--------------|
| Act | 62.3 | 30.1 |
| **ReAct** | **66.6** | **40.0** |
| IL+RL | 62.4 | 28.7 |
| Human Expert | 82.1 | 59.6 |

---

## Success and Failure Mode Analysis

### Hallucination vs Groundedness (Table 2, p. 6)

**Success Modes**:
- **ReAct True Positive**: 94% correct reasoning and facts vs 86% for CoT
- **ReAct False Positive**: 6% hallucinated facts vs 14% for CoT

**Failure Modes**:

| Failure Type | ReAct | CoT |
|--------------|-------|-----|
| Reasoning error | 47% | 16% |
| Search result error | 23% | - |
| Hallucination | 0% | **56%** |
| Label ambiguity | 29% | 28% |

**Critical Insight**:
> "Hallucination is a serious problem for CoT, resulting in much higher false positive rate than ReAct (14% vs. 6%) in success mode, and make up its major failure mode (56%)" (p. 6).

> "The problem solving trajectory of ReAct is more grounded, fact-driven, and trustworthy, thanks to the access of an external knowledge base" (p. 6).

---

## Implementation in AIWG Framework

### Agent Definition Structure (based on REF-018)

```markdown
## Reasoning Capabilities

This agent uses ReAct-style reasoning with the following thought types:

1. **Goal Decomposition**: Break complex tasks into steps
2. **Progress Tracking**: Monitor completion of subtasks
3. **Information Extraction**: Parse and summarize tool outputs
4. **Error Handling**: Diagnose failures and adjust strategy
5. **Validation**: Verify outputs meet requirements

## Action Space

Available tools:
- search_files[pattern]
- read_file[path]
- edit_file[path, changes]
- execute_command[command]
- create_artifact[type, path, content]

## Thought→Action→Observation Loop

[Example trajectories showing interleaved thoughts and actions]
```

### Lessons for AIWG Tool Design

**From ReAct Success Factors**:

1. **Sparse Thoughts**: Not every action needs a thought (p. 3-4)
   - AIWG: Allow agents to execute routine actions without mandatory reasoning

2. **Flexible Thought Types**: Different tasks need different reasoning patterns (p. 4-5)
   - AIWG: Define thought categories per agent role (e.g., Test Engineer focuses on validation reasoning)

3. **Action Feedback Quality**: Observations must be informative (p. 4)
   - AIWG: Tool outputs should be structured, parseable, and contain actionable information

4. **External Grounding**: Actions retrieve real information to combat hallucination (p. 6)
   - AIWG: Agents should always verify claims against actual files/outputs, not rely on memory

**From ReAct Failure Analysis**:

1. **Search Quality Matters**: 23% of ReAct failures due to uninformative search results (Table 2, p. 6)
   - AIWG: Improve file search, code search, and grep tools to return relevant context

2. **Reasoning Loops**: ReAct can get stuck repeating actions (p. 6, footnote 4)
   - AIWG: Implement loop detection and recovery mechanisms in orchestrator

3. **Thought Editing**: Human-in-the-loop correction improves outcomes (Figure 5, p. 14-15)
   - AIWG: Support interactive thought correction in agent trajectories

---

## ReAct vs Other Approaches

### vs. Chain-of-Thought (CoT)

| Dimension | CoT | ReAct |
|-----------|-----|-------|
| **Grounding** | Internal representations | External environment |
| **Flexibility** | Static black box | Reactive to feedback |
| **Hallucination** | 56% failure mode | 0% failure mode |
| **Information** | Internal knowledge only | Internal + external |

> "This 'chain-of-thought' reasoning is a static black box, in that the model uses its own internal representations to generate thoughts and is not grounded in the external world, which limits its ability to reason reactively or update its knowledge." (p. 2)

### vs. Act-Only

| Dimension | Act | ReAct |
|-----------|-----|-------|
| **Planning** | No explicit planning | Goal decomposition |
| **Progress Tracking** | Loses track of state | Maintains context |
| **Error Recovery** | No reasoning about failures | Exception handling |
| **Success Rate** | 45% (ALFWorld) | 71% (ALFWorld) |

> "Without any thoughts at all, Act fails to correctly decompose goals into smaller subgoals, or loses track of the current state of the environment" (p. 8).

---

## AIWG Agent Examples

### Test Engineer Agent (ReAct Pattern)

```markdown
# Test Engineer Agent

## System Prompt

You are a Test Engineer specializing in comprehensive test coverage and quality assurance. Use the ReAct pattern:

**Thought Types**:
- Goal Decomposition: "To test auth, I need to: 1) verify login, 2) check tokens, 3) test permissions"
- Progress Tracking: "I've tested login (3/3 passing), now checking token validation"
- Information Extraction: "The test output shows JWT expiry mismatch: expected 3600s, got 1800s"
- Error Handling: "Tests are failing, I should examine the test expectations"
- Validation: "All 15 auth tests passing, coverage at 92%"

## Available Tools

- execute_command[cmd]: Run test suites, linters, coverage tools
- read_file[path]: Read test files, source code, configuration
- search_files[pattern]: Find test files, source files by pattern
- edit_file[path, changes]: Update tests or test configuration
- create_artifact[type, path, content]: Generate test plans, reports

## Example Trajectory

Thought: I need to verify authentication test coverage
Action: execute_command["npm test -- --coverage auth"]
Observation: 12/15 tests passing, 80% coverage, failures in token refresh
Thought: Token refresh tests are failing, I should check what they expect
Action: read_file["test/auth/token-refresh.test.ts"]
Observation: [test file showing expectations]
Thought: Tests expect refresh token TTL of 7 days but implementation uses 1 day
Action: read_file["src/auth/tokens.ts"]
Observation: const REFRESH_TTL = 86400 // 1 day
Thought: This is a configuration mismatch, I should document as finding
Action: create_artifact["test-report", ".aiwg/testing/auth-test-report.md", ...]
```

### Security Auditor Agent (ReAct Pattern)

```markdown
# Security Auditor Agent

## System Prompt

You are a Security Auditor specializing in threat identification and vulnerability assessment. Use the ReAct pattern for security analysis.

**Thought Types**:
- Goal Decomposition: "To audit auth, check: 1) input validation, 2) crypto, 3) session management"
- Progress Tracking: "I've checked input validation (2 issues found), now examining crypto"
- Information Extraction: "The code uses MD5 for hashing, which is cryptographically broken"
- Commonsense Reasoning: "This endpoint accepts user input without sanitization, likely SQL injection risk"
- Exception Handling: "Can't find rate limiting config, should check deployment settings"

## Example Trajectory

Thought: I need to audit authentication security
Action: search_files["auth password hash"]
Observation: Found src/auth/password.ts, src/auth/crypto.ts
Thought: Let me check the hashing implementation
Action: read_file["src/auth/password.ts"]
Observation: using bcrypt with cost factor 10
Thought: Bcrypt cost 10 is acceptable for 2023, now check crypto primitives
Action: read_file["src/auth/crypto.ts"]
Observation: using crypto.createHmac('sha256', secret)
Thought: HMAC-SHA256 is secure, but I should verify secret management
Action: search_files["SECRET"]
Observation: Found config/.env, config/secrets.ts
Thought: Environment file should not be committed
Action: execute_command["git ls-files config/.env"]
Observation: config/.env (file is tracked in git!)
Thought: CRITICAL: Secrets file is committed to git, major vulnerability
Action: create_artifact["security-finding", ".aiwg/security/SEC-001-secrets-in-git.md", ...]
```

---

## Key Insights and Quotes

### On Synergy of Reasoning and Acting

> "A unique feature of human intelligence is the ability to seamlessly combine task-oriented actions with verbal reasoning (or inner speech), which has been theorized to play an important role in human cognition for enabling self-regulation or strategization and maintaining a working memory" (p. 1).

> "This tight synergy between 'acting' and 'reasoning' allows humans to learn new tasks quickly and perform robust decision making or reasoning, even under previously unseen circumstances or facing information uncertainties" (p. 1).

### On Hallucination vs Groundedness

> "While interleaving reasoning, action and observation steps improves ReAct's groundedness and trustworthiness, such a structural constraint also reduces its flexibility in formulating reasoning steps, leading to more reasoning error rate than CoT" (p. 6).

### On Combining Internal and External Knowledge

> "The problem solving process demonstrated by ReAct is more factual and grounded, whereas CoT is more accurate in formulating reasoning structure but can easily suffer from hallucinated facts or thoughts" (p. 5).

> "These results indicate the value of properly combining model internal knowledge and external knowledge for reasoning tasks" (p. 6).

### On Few-Shot Learning Power

> "Two or even one-shot ReAct prompting is able to outperform imitation or reinforcement learning methods trained with 10^3 ~ 10^5 task instances, with an absolute improvement of 34% and 10% in success rates respectively" (p. 3).

### On Interpretability and Control

> "ReAct promises an interpretable sequential decision making and reasoning process where humans can easily inspect reasoning and factual correctness. Moreover, humans can also control or correct the agent behavior on the go by thought editing" (p. 4).

---

## Cross-References to Other AIWG Papers

**Related AIWG References**:
- @REF-016 - Chain-of-Thought: Foundational reasoning technique that ReAct extends
- @REF-019 - Toolformer: Tool learning approach
- @REF-015 - Self-Refine: Iteration patterns
- @REF-020 - Tree of Thoughts: Adds tree search to reasoning

---

## Implementation Checklist for AIWG

Based on ReAct methodology:

- [ ] **Define Thought Types per Agent**: Customize thought categories for each agent role
- [ ] **Structured Tool Outputs**: Ensure all tools return parseable, actionable information
- [ ] **Loop Detection**: Implement detection for repeated thought-action cycles
- [ ] **Thought Editing Support**: Allow human intervention in agent trajectories
- [ ] **External Grounding**: Agents must verify facts against actual files/data
- [ ] **Sparse Thoughts**: Don't require reasoning for every routine action
- [ ] **Error Recovery Patterns**: Include exception handling in thought types
- [ ] **Progress Tracking**: Maintain context across multi-step tasks
- [ ] **Observation Quality**: Improve search/grep tools for better results
- [ ] **Few-Shot Examples**: Provide 1-2 ReAct trajectories per agent type

---

## Document Status

**Created**: 2026-01-24
**Source Paper**: REF-018
**AIWG Priority**: CRITICAL
**Implementation Status**: Active in SDLC agent tool calling
**Key Pattern**: Thought→Action→Observation loop
