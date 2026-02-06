# Auto-Reply Chain Rules

**Enforcement Level**: MEDIUM
**Scope**: Multi-agent conversations and autonomous dialogue
**Research Basis**: REF-022 AutoGen
**Issue**: #183

## Overview

These rules standardize decentralized auto-reply patterns where agents autonomously continue conversations until termination conditions are met, removing need for central orchestration.

## Research Foundation

From REF-022 AutoGen (Wu et al., 2023):
- Auto-reply chains reduce orchestration overhead by enabling autonomous agent conversations
- Flexible conversation patterns emerge without rigid control flow
- Agents self-terminate based on context, not external signals
- Enables natural dialogue progression while maintaining safety limits

## Core Mechanism

### Conversation Initiation

Any ConversableAgent can initiate a conversation:

```yaml
conversation_flow:
  initiation:
    initiator: any_conversable_agent
    recipient: target_agent
    initial_message: string
    options:
      clear_history: false
      max_turns: 10
      request_reply: true
```

### Auto-Reply Loop

```yaml
auto_reply_loop:
  while: turn_count < max_consecutive_auto_reply
  steps:
    - recipient_receives_message
    - recipient_generates_reply
    - check_termination_conditions:
        - reply_is_null: TERMINATE
        - is_termination_message: TERMINATE
        - max_turns_reached: TERMINATE
        - safety_limit_exceeded: TERMINATE
    - if_not_terminated:
        - swap_sender_recipient
        - increment_turn_count
        - continue_loop
```

## Mandatory Rules

### Rule 1: Define Termination Conditions

**REQUIRED**:
Every auto-reply conversation MUST have explicit termination conditions.

```yaml
termination_config:
  required: true
  conditions:
    # At least one of:
    - termination_keywords: [string]  # Keywords that signal completion
    - termination_function: callable  # Custom termination check
    - max_turns: integer              # Hard turn limit

  defaults:
    max_turns: 10
    timeout_seconds: 300
```

**FORBIDDEN**:
Conversations without termination conditions - infinite loops must be prevented.

### Rule 2: Respect Max Turn Limits

**REQUIRED**:
All auto-reply chains MUST enforce turn limits as safety mechanisms.

```yaml
turn_limits:
  default_max_consecutive: 10
  absolute_max: 20

  override_requirements:
    - explicit_configuration
    - documented_justification
    - human_approval_for_high_limits
```

### Rule 3: Human Input Modes

**REQUIRED**:
Support configurable human input modes for different conversation types.

```yaml
human_input_modes:
  NEVER:
    description: "Fully autonomous - no human interaction"
    use_case: "Background processing, low-criticality tasks"

  TERMINATE:
    description: "Human approval required before termination"
    use_case: "Important decisions, artifact finalization"

  ALWAYS:
    description: "Human approval for every turn"
    use_case: "Critical paths, learning mode"

  default: TERMINATE
```

### Rule 4: Preserve Conversation History

**REQUIRED**:
Full conversation trace MUST be maintained for debugging and audit.

```yaml
conversation_trace:
  required_fields:
    - conversation_id: uuid
    - participants: [agent_names]
    - turns:
        - turn_number: integer
        - sender: string
        - recipient: string
        - message: Message
        - timestamp: datetime
        - response_time_ms: number
    - termination_reason: string
    - total_turns: integer
    - total_tokens: integer

  storage:
    path: ".aiwg/conversations/"
    format: jsonl
    retention_days: 30
```

### Rule 5: Graceful Degradation

**REQUIRED**:
Handle edge cases without crashing the conversation.

```yaml
error_handling:
  on_null_reply:
    action: terminate_gracefully
    record_reason: "Recipient returned null reply"

  on_timeout:
    action: terminate_with_warning
    record_reason: "Response timeout exceeded"

  on_exception:
    action: terminate_and_log_error
    record_reason: "Exception during reply generation"
    preserve_history: true
```

## Termination Keywords

### Standard Keywords by Role

```yaml
termination_keywords:
  requirements_analyst:
    completion:
      - "REQUIREMENTS_COMPLETE"
      - "REQUIREMENTS_APPROVED"
    clarification_done:
      - "NO_MORE_QUESTIONS"
      - "CLARIFICATION_COMPLETE"

  architect:
    completion:
      - "DESIGN_COMPLETE"
      - "ARCHITECTURE_APPROVED"
    review_done:
      - "REVIEW_COMPLETE"
      - "CHANGES_ACCEPTED"

  test_engineer:
    completion:
      - "TESTS_COMPLETE"
      - "COVERAGE_SUFFICIENT"
    review_done:
      - "TEST_REVIEW_COMPLETE"

  security_auditor:
    completion:
      - "SECURITY_REVIEW_COMPLETE"
      - "THREAT_MODEL_APPROVED"
    issue_found:
      - "SECURITY_ISSUE_FOUND"
      - "REQUIRES_REMEDIATION"
```

## Conversation Patterns

### Pattern 1: Linear Chain

```yaml
linear_chain:
  description: "A → B → C sequential conversations"
  flow:
    - conversation_1:
        participants: [pm, requirements_analyst]
        termination: REQUIREMENTS_COMPLETE
        output: requirements
    - conversation_2:
        participants: [requirements_analyst, architect]
        input: requirements
        termination: DESIGN_COMPLETE
        output: design
    - conversation_3:
        participants: [architect, implementer]
        input: design
        termination: IMPLEMENTATION_COMPLETE
```

### Pattern 2: Review Loop

```yaml
review_loop:
  description: "Back-and-forth until approval"
  participants: [proposer, reviewer]
  flow:
    - proposer_submits
    - reviewer_reviews
    - if_changes_requested:
        - proposer_revises
        - continue_loop
    - if_approved:
        - terminate
  max_iterations: 5
```

### Pattern 3: Multi-Party Discussion

```yaml
multi_party:
  description: "Round-robin among multiple agents"
  participants: [architect, security_auditor, test_engineer]
  flow:
    - architect_proposes
    - each_reviewer_comments
    - architect_addresses
    - continue_until_consensus
  consensus_required: true
```

## Safety Configuration

### Required Safety Limits

```yaml
safety_config:
  required:
    max_turns: integer      # Maximum conversation turns
    timeout_seconds: number # Wall-clock timeout

  optional:
    token_budget: integer           # Max tokens per conversation
    require_progress: boolean       # Detect stuck conversations
    progress_check_interval: 3      # Turns between progress checks
```

### Progress Detection

```yaml
progress_detection:
  enabled: true
  check_interval_turns: 3
  indicators:
    positive:
      - new_artifact_generated
      - validation_passed
      - decision_made
    negative:
      - repeated_message_pattern
      - same_questions_asked
      - no_new_information
  stuck_threshold: 2  # Consecutive negative checks
  action_on_stuck: inject_clarification_request
```

## Integration with SDLC

### Phase-Appropriate Chains

| Phase | Chain Type | Max Turns | Human Mode |
|-------|------------|-----------|------------|
| Requirements | Review Loop | 10 | TERMINATE |
| Architecture | Multi-Party | 15 | TERMINATE |
| Implementation | Linear | 5 | NEVER |
| Testing | Review Loop | 10 | NEVER |
| Security | Review Loop | 10 | TERMINATE |

### Example: Requirements Elicitation

```yaml
requirements_elicitation:
  initiator: product_manager
  recipient: requirements_analyst
  initial_message: "We need user authentication"

  expected_flow:
    - analyst_asks_clarifying_questions
    - pm_answers
    - analyst_asks_more_or_summarizes
    - pm_confirms_or_corrects
    - continue_until: REQUIREMENTS_COMPLETE

  termination:
    keywords: ["REQUIREMENTS_COMPLETE", "REQUIREMENTS_APPROVED"]
    max_turns: 10
    human_mode: TERMINATE
```

## Debugging Support

### Conversation Replay

```yaml
replay_support:
  enable_snapshots: true
  snapshot_interval: 1  # Every turn

  replay_commands:
    view_conversation: "aiwg conversation view <id>"
    replay_from_turn: "aiwg conversation replay <id> --from-turn <n>"
    inspect_turn: "aiwg conversation inspect <id> <turn>"
```

### Logging Configuration

```yaml
logging:
  level: info
  include:
    - conversation_start
    - each_turn_summary
    - termination_reason
  verbose_include:
    - full_message_content
    - response_timing
    - token_counts
```

## Validation Checklist

Before enabling auto-reply chains:

- [ ] Termination conditions defined
- [ ] Max turn limit configured
- [ ] Human input mode set appropriately
- [ ] Safety limits configured
- [ ] Conversation tracing enabled
- [ ] Progress detection configured
- [ ] Error handling defined
- [ ] Role-specific termination keywords set

## References

- @.aiwg/research/findings/REF-022-autogen.md - Research foundation
- @.claude/rules/conversable-agent-interface.md - Agent interface
- @agentic/code/frameworks/sdlc-complete/schemas/flows/agent-pubsub.yaml - Event-driven activation
- #183 - Implementation issue

---

**Rule Status**: ACTIVE
**Last Updated**: 2026-01-25
