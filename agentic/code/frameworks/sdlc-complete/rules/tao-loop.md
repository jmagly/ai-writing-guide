# TAO Loop Standardization Rules

**Enforcement Level**: HIGH
**Scope**: All iterative agent execution (Ralph loops, agent tasks)
**Research Basis**: REF-018 ReAct Methodology
**Issue**: #162

## Overview

These rules standardize the Thought→Action→Observation (TAO) loop across all iterative agent execution, ensuring consistent reasoning traces and tool grounding.

## Research Foundation

From REF-018 ReAct (Yao et al., 2022):
- ReAct interleaving thoughts and actions improves performance by 34%
- Explicit TAO structure reduces hallucinations to 0% (vs 56% without)
- TAO loops enable better monitoring, debugging, and oversight
- Standardized format enables cross-agent learning

## TAO Loop Structure

### Canonical Format

Every iteration MUST follow this structure:

```
THOUGHT: [reasoning about current state and next step]
ACTION: [specific action to take with parameters]
OBSERVATION: [result of the action]
```

### Detailed Format

```yaml
tao_iteration:
  iteration_number: 1

  thought:
    type: reasoning  # goal, progress, extraction, reasoning, exception, synthesis
    content: "I need to find the authentication module to fix the token issue"
    confidence: 0.85
    timestamp: "2026-01-25T10:30:00Z"

  action:
    tool: grep
    parameters:
      pattern: "authenticate"
      path: "src/"
    rationale: "Searching for authentication-related code"
    timestamp: "2026-01-25T10:30:01Z"

  observation:
    result: |
      src/auth/authenticate.ts:42: export function authenticate(token: string)
      src/auth/middleware.ts:15: import { authenticate } from './authenticate'
    status: success  # success, failure, partial, timeout
    duration_ms: 150
    timestamp: "2026-01-25T10:30:01.150Z"
```

## Mandatory TAO Elements

### Thought Requirements

Every THOUGHT must include:

1. **Type Classification**: One of the six thought types from `@.claude/rules/thought-protocol.md`
2. **Clear Intent**: What the agent is trying to achieve
3. **Justification**: Why this action is being taken

**Good Example**:
```
THOUGHT [Reasoning]: The error message indicates a token expiration issue.
I should check the token TTL configuration in the auth module because
the default 60-second TTL is likely too short for our use case.
```

**Bad Example**:
```
THOUGHT: Looking at the code.
```

### Action Requirements

Every ACTION must include:

1. **Tool Name**: Specific tool being invoked
2. **Parameters**: All parameters with values
3. **Rationale**: Why this tool/action was chosen

**Good Example**:
```
ACTION: Read
  file_path: src/auth/config.ts
  rationale: Checking TTL configuration value
```

**Bad Example**:
```
ACTION: Reading the file
```

### Observation Requirements

Every OBSERVATION must include:

1. **Result**: Actual output from the action
2. **Status**: success, failure, partial, timeout
3. **Key Extraction**: What was learned from the result

**Good Example**:
```
OBSERVATION [Success]:
Result: TOKEN_TTL = 60 // seconds
Extraction: Found TTL is set to 60 seconds, confirming hypothesis.
This explains the frequent re-authentication errors.
```

**Bad Example**:
```
OBSERVATION: Got the result
```

## Loop Execution Rules

### Rule 1: No Action Without Thought

**FORBIDDEN**:
```
ACTION: Edit file.ts  # No preceding thought
```

**REQUIRED**:
```
THOUGHT: The TTL value needs to be increased to 3600 seconds.
ACTION: Edit file.ts to change TTL from 60 to 3600
```

### Rule 2: No Thought Without Follow-Up

**FORBIDDEN**:
```
THOUGHT: I should check the config file.
THOUGHT: Maybe I should look at logs too.  # No action taken
```

**REQUIRED**:
```
THOUGHT: I should check the config file for TTL value.
ACTION: Read src/auth/config.ts
OBSERVATION: [result]
```

### Rule 3: Complete TAO Triplets

Every iteration MUST be a complete triplet. Partial iterations indicate:
- Loop interruption (should be logged)
- Agent failure (should trigger recovery)
- Human intervention needed

### Rule 4: Observation Grounding

Thoughts in subsequent iterations MUST reference observations:

**Good Example**:
```
OBSERVATION [Iteration 1]: TTL = 60 seconds
...
THOUGHT [Iteration 2]: Based on the TTL value of 60 seconds found in
the config, I need to increase it to 3600 for production use.
```

**Bad Example**:
```
OBSERVATION [Iteration 1]: TTL = 60 seconds
...
THOUGHT [Iteration 2]: I'll update the TTL to some larger value.
```

## Integration with Ralph

### Ralph TAO Logging

Ralph loops MUST log all TAO iterations:

```yaml
ralph_tao_log:
  loop_id: "ralph-001"
  task: "Fix authentication tests"
  iterations:
    - iteration: 1
      thought:
        type: goal
        content: "Fix the failing authentication tests"
      action:
        tool: bash
        command: "npm test -- --grep auth"
      observation:
        status: failure
        result: "3 tests failed"

    - iteration: 2
      thought:
        type: extraction
        content: "From test output, token expiration is the issue"
      action:
        tool: read
        path: "src/auth/config.ts"
      observation:
        status: success
        result: "TOKEN_TTL = 60"
```

### TAO Metrics

Track TAO loop metrics:

| Metric | Description |
|--------|-------------|
| iterations_count | Total TAO iterations |
| thought_type_distribution | Count by thought type |
| action_tool_distribution | Count by tool used |
| observation_success_rate | % successful observations |
| thought_to_action_ratio | Should be ~1.0 |
| grounding_score | % thoughts referencing observations |

## Error Handling

### Observation Failures

When an action fails:

```yaml
on_observation_failure:
  required_response:
    - express_exception_thought
    - analyze_failure_cause
    - determine_recovery_action
    - continue_with_new_tao_iteration

  forbidden:
    - skip_observation_logging
    - proceed_without_analysis
    - repeat_same_action_unchanged
```

### Timeout Handling

```yaml
on_action_timeout:
  log_partial_observation: true
  express_exception_thought: true
  options:
    - retry_with_increased_timeout
    - try_alternative_action
    - escalate_for_human_intervention
```

## Agent Protocol

### TAO Execution Protocol

```yaml
tao_execution:
  pre_iteration:
    - check_loop_termination_conditions
    - load_context_from_previous_observations

  thought_phase:
    - classify_thought_type
    - express_thought_with_reasoning
    - validate_thought_completeness

  action_phase:
    - select_appropriate_tool
    - validate_tool_parameters
    - execute_action
    - capture_timing_metrics

  observation_phase:
    - capture_action_result
    - classify_observation_status
    - extract_key_information
    - log_observation

  post_iteration:
    - update_progress_state
    - check_for_loop_completion
    - prepare_for_next_iteration
```

## Validation Checklist

Before completing any TAO loop:

- [ ] All iterations are complete triplets (T→A→O)
- [ ] All thoughts have type classification
- [ ] All actions have tool and parameters
- [ ] All observations have status and result
- [ ] Subsequent thoughts reference prior observations
- [ ] Loop metrics captured
- [ ] Error handling followed protocol

## References

- @.claude/rules/thought-protocol.md - Six thought types
- @agentic/code/addons/ralph/schemas/iteration-analytics.yaml - Iteration tracking
- @.aiwg/research/findings/REF-018-react.md - ReAct research
- @.aiwg/research/synthesis/topic-04-tool-grounding.md - Tool grounding
- #162 - Implementation issue

---

**Rule Status**: ACTIVE
**Last Updated**: 2026-01-25
