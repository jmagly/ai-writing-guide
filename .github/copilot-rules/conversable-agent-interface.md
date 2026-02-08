# Conversable Agent Interface Rules

**Enforcement Level**: MEDIUM
**Scope**: All SDLC agent definitions
**Research Basis**: REF-022 AutoGen
**Issue**: #174

## Overview

These rules standardize all SDLC agents to implement a conversable agent interface with `send()`, `receive()`, and `generateReply()` methods, following the AutoGen framework pattern.

## Research Foundation

From REF-022 AutoGen (Wu et al., 2023):
- Conversable agent interface enables flexible multi-agent conversations
- Standardized send/receive/reply pattern simplifies inter-agent communication
- Supports both human-agent and agent-agent interactions
- Enables conversation persistence and replay
- Facilitates debugging and monitoring

## Core Interface

### ConversableAgent Protocol

All SDLC agents MUST implement this interface:

```typescript
interface ConversableAgent {
  // Identity
  name: string;
  systemMessage: string;

  // Communication
  send(
    message: Message,
    recipient: ConversableAgent,
    requestReply?: boolean
  ): Promise<void>;

  receive(
    message: Message,
    sender: ConversableAgent,
    requestReply?: boolean
  ): Promise<void>;

  generateReply(
    messages: Message[],
    sender?: ConversableAgent
  ): Promise<Message | null>;

  // Conversation Management
  initiateChat(
    recipient: ConversableAgent,
    message: Message,
    clearHistory?: boolean
  ): Promise<ConversationResult>;

  // History
  conversationHistory: Message[];
}
```

### Message Schema

```typescript
interface Message {
  role: "user" | "assistant" | "system";
  content: string;
  metadata?: {
    artifactPath?: string;
    artifactType?: string;
    [key: string]: any;
  };
  timestamp: string;
  sender: string;
}
```

### Conversation Result

```typescript
interface ConversationResult {
  messages: Message[];
  summary?: string;
  artifacts?: string[];  // Generated file paths
  cost?: {
    inputTokens: number;
    outputTokens: number;
    totalTokens: number;
  };
}
```

## Agent Definition Updates

### Required Additions

Every agent definition MUST include:

```markdown
## Interface

**Protocol**: ConversableAgent v1.0

### Methods

| Method | Description |
|--------|-------------|
| `send(message, recipient)` | Send message to another agent |
| `receive(message, sender)` | Handle incoming message |
| `generateReply(messages)` | Generate response to messages |
| `initiateChat(recipient, message)` | Start conversation |

### Message Handling

**Receives**:
- PRD → Triggers architecture design
- RequirementsUpdate → Updates existing design

**Sends**:
- SystemDesign → To implementation agents
- ADR → To documentation agents
```

## Communication Patterns

### Direct Agent-to-Agent

```yaml
pattern: direct
flow:
  - product_manager.send(prd_message, architect)
  - architect.receive(prd_message, product_manager)
  - architect.generateReply([prd_message])
  - architect.send(design_message, engineer)
```

### Broadcast to Multiple Agents

```yaml
pattern: broadcast
flow:
  - architect.send(design_message, [engineer, security_auditor, test_engineer])
  - # All recipients receive in parallel
```

### Conversational Loop

```yaml
pattern: conversation
flow:
  - product_manager.initiateChat(architect, initial_message)
  - # Automatic back-and-forth until resolution
  - # Returns ConversationResult with full history
```

## Implementation Rules

### Rule 1: Preserve Conversation History

**REQUIRED**:
Every agent MUST maintain conversation history for debugging and replay.

```typescript
class SDLCAgent implements ConversableAgent {
  conversationHistory: Message[] = [];

  async receive(message: Message, sender: ConversableAgent) {
    this.conversationHistory.push(message);  // REQUIRED
    // ... process message
  }
}
```

### Rule 2: Handle requestReply Flag

**REQUIRED**:
Respect the `requestReply` parameter:

```typescript
async receive(
  message: Message,
  sender: ConversableAgent,
  requestReply: boolean = true
) {
  this.conversationHistory.push(message);

  if (requestReply) {
    const reply = await this.generateReply(
      this.conversationHistory,
      sender
    );

    if (reply) {
      await this.send(reply, sender, false);  // No reply to reply
    }
  }
}
```

### Rule 3: Include Artifact Metadata

**REQUIRED**:
Messages about artifacts MUST include path metadata:

```typescript
const message: Message = {
  role: "assistant",
  content: "System design completed",
  metadata: {
    artifactPath: ".aiwg/architecture/sad.md",
    artifactType: "SystemDesign"
  },
  timestamp: new Date().toISOString(),
  sender: "architect"
};
```

### Rule 4: Return null for No Reply

**REQUIRED**:
`generateReply` MUST return `null` if no reply is appropriate:

```typescript
async generateReply(messages: Message[]): Promise<Message | null> {
  const lastMessage = messages[messages.length - 1];

  // Check if this message is relevant to this agent
  if (!this.canHandle(lastMessage)) {
    return null;  // Not: throw error or return empty
  }

  // Generate appropriate reply
  return this.createReply(lastMessage);
}
```

## Agent-Specific Implementations

### Architect Agent

```markdown
## Conversation Patterns

**Input Messages**:
- PRD from Product Manager → Design system
- RequirementsUpdate → Revise design
- TechnicalQuestion → Provide guidance

**Output Messages**:
- SystemDesign → To Engineer, Test Engineer
- ADR → To all stakeholders
- ArchitectureQuestion → To Domain Expert

**Example Conversation**:
```
PM → Architect: "Here's the PRD for user auth"
Architect → PM: "Reviewing... I have a question about SSO requirements"
PM → Architect: "SSO is required for enterprise customers"
Architect → PM: "Understood. Design complete. See SAD at .aiwg/architecture/sad.md"
Architect → Engineer: "Please implement based on system design"
```
```

### Test Engineer Agent

```markdown
## Conversation Patterns

**Input Messages**:
- Implementation from Engineer → Generate tests
- TestRequest from PM → Create test plan
- BugReport → Design regression tests

**Output Messages**:
- TestSuite → To Engineer (for test-driven development)
- TestReport → To PM, Engineer
- CoverageReport → To all stakeholders

**Example Conversation**:
```
Engineer → TestEngineer: "Implementation complete for auth module"
TestEngineer → Engineer: "Generating tests... Found edge case not covered"
Engineer → TestEngineer: "Good catch, please add that test"
TestEngineer → Engineer: "Test suite complete. 95% coverage achieved."
```
```

## Migration Path

### Phase 1: Add Interface (Non-Breaking)

1. Define `ConversableAgent` interface
2. Create `BaseConversableAgent` class
3. Add interface methods to existing agents
4. Keep existing `run()` methods

### Phase 2: Update Orchestration

1. Update workflows to use `send`/`receive`
2. Test conversational patterns
3. Validate artifact generation

### Phase 3: Deprecate Old Interface

1. Mark `run()` as deprecated
2. Update all documentation
3. Remove in next major version

## Validation Checklist

For each agent definition:

- [ ] Implements ConversableAgent interface
- [ ] Has `name` and `systemMessage`
- [ ] `send()` method defined
- [ ] `receive()` method defined
- [ ] `generateReply()` method defined
- [ ] Conversation history maintained
- [ ] Message metadata includes artifact paths
- [ ] Example conversations documented

## References

- @.aiwg/research/findings/REF-022-autogen.md - Research foundation
- @agentic/code/frameworks/sdlc-complete/schemas/flows/agent-pubsub.yaml - Event-driven activation
- @agentic/code/frameworks/sdlc-complete/agents/ - Agent definitions
- #174 - Implementation issue

---

**Rule Status**: ACTIVE
**Last Updated**: 2026-01-25
