# Thought Protocol Rules

**Enforcement Level**: MEDIUM
**Scope**: All tool-using agents
**Research Basis**: REF-018 ReAct Methodology
**Issue**: #158

## Overview

These rules integrate six thought types from ReAct methodology into agent system prompts for enhanced reasoning transparency and tool usage.

## Research Foundation

From REF-018 ReAct (Yao et al., 2022):
- ReAct improves success rates by 34% on HotpotQA
- Reduces hallucinations to 0% with tool grounding (vs 56% without)
- Six distinct thought types structure reasoning effectively
- Explicit thought types enable better monitoring and debugging

## Six Thought Types

### Type Definitions

| Type | Purpose | Example |
|------|---------|---------|
| **Goal** | State the objective | "I need to implement user authentication" |
| **Progress** | Track completion | "So far I have created the login component" |
| **Extraction** | Pull key data from observations | "From the error log, the key issue is missing token" |
| **Reasoning** | Explain logic | "This means I should add token validation because..." |
| **Exception** | Flag inconsistencies | "Wait, this doesn't match the requirement because..." |
| **Synthesis** | Draw conclusions | "Combining all evidence, the best approach is..." |

### Thought Type Protocol

```markdown
## Thought Protocol

For each step, express your thinking using appropriate thought types:

**Goal Thought** 🎯
- Format: "Goal: I need to accomplish [objective]"
- Use: At start of task and when switching sub-goals
- Example: "Goal: I need to fix the failing authentication tests"

**Progress Thought** 📊
- Format: "Progress: So far I have completed [items]"
- Use: After completing steps, to maintain context
- Example: "Progress: I have identified the failing test and located the bug"

**Extraction Thought** 🔍
- Format: "Extraction: From [source], the key data is [data]"
- Use: After reading files, running commands, observing output
- Example: "Extraction: From the test output, the error is 'Token expired'"

**Reasoning Thought** 💭
- Format: "Reasoning: This means I should [action] because [justification]"
- Use: Before making decisions or taking actions
- Example: "Reasoning: I should refresh the token before retrying because it's expired"

**Exception Thought** ⚠️
- Format: "Exception: Wait, [inconsistency] because [explanation]"
- Use: When something unexpected occurs or doesn't make sense
- Example: "Exception: Wait, the token shouldn't expire this quickly - the TTL is wrong"

**Synthesis Thought** ✅
- Format: "Synthesis: Combining all evidence, the conclusion is [conclusion]"
- Use: At end of investigation or before final decision
- Example: "Synthesis: The root cause is the TTL config, and the fix is to update the constant"
```

## Agent Prompt Integration

### System Prompt Addition

Add to all tool-using agent system prompts:

```markdown
## Thinking Protocol

When working on tasks, express your thinking explicitly using thought types:

1. **Goal** 🎯 - State what you're trying to achieve
2. **Progress** 📊 - Summarize what's been done
3. **Extraction** 🔍 - Pull key data from observations
4. **Reasoning** 💭 - Explain your logic
5. **Exception** ⚠️ - Flag surprises or inconsistencies
6. **Synthesis** ✅ - Draw conclusions from evidence

This protocol helps maintain clarity and enables better oversight.
```

### Per-Agent Customization

Different agents may emphasize different thought types:

| Agent | Primary Thoughts | Secondary Thoughts |
|-------|-----------------|-------------------|
| Architecture Designer | Reasoning, Synthesis | Goal, Exception |
| Requirements Analyst | Extraction, Reasoning | Goal, Progress |
| Test Engineer | Goal, Extraction | Exception, Synthesis |
| Security Auditor | Exception, Reasoning | Extraction, Synthesis |
| Debugger | Extraction, Exception | Reasoning, Synthesis |

## Thought Formatting

### Inline Format

For simple thoughts within conversation:

```
Goal: Fix the authentication bug in login.ts

Extraction: From the error log:
- Error: "JWT malformed"
- File: src/auth/login.ts:42
- Timestamp: 2026-01-25T10:30:00Z

Reasoning: The token parsing is failing because the header
format changed in the latest update. I should update the
parser to handle both formats.

Synthesis: The fix requires updating the token parser to
be backwards-compatible with the old format.
```

### Structured Format

For complex tasks, use structured blocks:

```markdown
### Thought: Goal
I need to implement the user registration flow per UC-002.

### Thought: Progress
✓ Created user model
✓ Added validation schema
○ Implement API endpoint (current)
○ Add database migration
○ Write tests

### Thought: Extraction
From the requirements:
- Email must be unique
- Password requires: 8+ chars, 1 uppercase, 1 number
- Must send verification email

### Thought: Reasoning
I should use the existing email service for verification
because it already handles templates and delivery tracking.

### Thought: Exception
Wait - the requirements say "unique email" but the schema
allows duplicate emails. I need to add a unique constraint.

### Thought: Synthesis
The implementation plan is:
1. Add unique constraint to user email
2. Use existing email service for verification
3. Follow password validation pattern from login
```

## Logging and Monitoring

### Thought Type Logging

Ralph loops SHOULD log thought types for analysis:

```yaml
thought_log:
  loop_id: "ralph-001"
  thoughts:
    - type: goal
      content: "Fix authentication tests"
      timestamp: "2026-01-25T10:30:00Z"
      iteration: 1
    - type: extraction
      content: "Error: Token expired at line 42"
      timestamp: "2026-01-25T10:30:15Z"
      iteration: 1
    - type: exception
      content: "TTL should be 3600, found 60"
      timestamp: "2026-01-25T10:30:30Z"
      iteration: 1
```

### Thought Type Metrics

Track thought type distribution:

| Metric | Description |
|--------|-------------|
| thought_type_count | Count by type per loop |
| exception_rate | Exceptions / total thoughts |
| synthesis_quality | Manual rating of conclusions |
| thought_sequence_patterns | Common thought sequences |

## Agent Protocol

### Thought-Augmented Execution

```yaml
agent_execution:
  steps:
    - express_goal_thought
    - execute_step:
        - express_reasoning_thought
        - perform_action
        - express_extraction_thought
        - check_for_exceptions
    - after_each_iteration:
        - express_progress_thought
    - on_completion:
        - express_synthesis_thought
```

### Exception Handling

When Exception thought is expressed:

```yaml
on_exception_thought:
  steps:
    - log_exception
    - pause_execution_if_critical
    - re_evaluate_approach
    - update_goal_if_needed
    - continue_with_adjusted_plan
```

## Agents to Update

The following agents MUST include thought protocol:

| Agent | Priority |
|-------|----------|
| Architecture Designer | HIGH |
| Requirements Analyst | HIGH |
| Test Engineer | HIGH |
| Security Auditor | HIGH |
| Software Implementer | MEDIUM |
| Debugger | HIGH |
| Code Reviewer | MEDIUM |
| Technical Writer | LOW |

## Validation

### Pre-Execution Check

Before executing complex tasks, verify agent has:
- [ ] Expressed Goal thought
- [ ] Identified key constraints (Extraction/Reasoning)
- [ ] Planned approach (Reasoning)

### Post-Execution Check

After completing tasks, verify:
- [ ] Progress thoughts tracked completion
- [ ] Any exceptions were addressed
- [ ] Synthesis thought summarizes outcome

## Benefits

1. **Reduced Hallucinations**: Tool grounding via Extraction thoughts
2. **Better Debugging**: Thought logs enable tracing decisions
3. **Quality Improvement**: Exception thoughts catch errors early
4. **Knowledge Transfer**: Reasoning thoughts document decisions
5. **Human Oversight**: Thought protocol enables effective review

## References

- @.aiwg/research/findings/REF-018-react.md - ReAct research
- @agentic/code/frameworks/sdlc-complete/agents/ - Agent definitions
- @.aiwg/research/synthesis/topic-04-tool-grounding.md - Tool grounding
- @.claude/rules/reasoning-sections.md - Reasoning patterns
- #158 - Implementation issue

---

**Rule Status**: ACTIVE
**Last Updated**: 2026-01-25
