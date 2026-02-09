# ADR: 2-Way AI Chat via Messaging Platforms

**Date**: 2026-02-09
**Status**: ACCEPTED
**Author**: Architecture Designer
**Category**: Integration Architecture
**Issue**: #319, #320
**Depends On**: #313 (Messaging Bot Mode), #312 (Daemon Mode)

## Reasoning

1. **Problem Analysis**: The messaging bot mode (ADR-messaging-bot-mode.md) originally specified one-way notifications (outbound events from AIWG to chat platforms) and inbound slash commands (e.g., `/status`, `/approve`). Users on messaging platforms could receive alerts and issue predefined commands, but could not have free-form conversations with the AI assistant. This limits the value of the messaging integration -- users must switch to a terminal for any question that doesn't map to a slash command.

2. **Constraint Identification**: (a) AI responses must not block the daemon process -- spawning subprocesses is required. (b) Concurrent chat sessions must be limited to prevent resource exhaustion. (c) Platform message length limits must be respected (Telegram: 4096 chars, Discord: 2000 chars, Slack: ~40000 chars). (d) Conversation context must be maintained per-chat for multi-turn interactions. (e) The chat system must coexist with the existing command system without interference.

3. **Alternative Consideration**: Three approaches were evaluated:
   - **API-only (Anthropic API direct)**: Call the Claude API directly from the daemon. Rejected -- requires API keys in the daemon environment, duplicates prompt engineering already handled by `claude` CLI, and doesn't benefit from CLAUDE.md project context that `claude -p` automatically loads.
   - **Persistent `claude` process**: Keep a long-running `claude` process with stdin/stdout. Rejected -- `claude` CLI is designed for single-prompt invocations, persistent mode is not supported, and process management adds complexity.
   - **Spawn `claude -p` per message**: Spawn a fresh `claude -p` process for each message, passing conversation context via the prompt. Selected -- simple, stateless process model, leverages existing `claude` CLI with project context, natural resource management via process lifecycle.

4. **Decision Rationale**: Spawning `claude -p` per message provides the simplest implementation with the best integration. Each invocation picks up CLAUDE.md and project context automatically. Process-level isolation means a crash in one AI response doesn't affect others. Conversation context is managed in-memory by the ChatHandler, which builds a context-aware prompt from message history. The trade-off is higher latency per response (process startup overhead) vs. a persistent connection, but for chat-style interaction this is acceptable.

5. **Risk Assessment**: (a) Resource exhaustion from too many concurrent spawns -- mitigated by `maxConcurrent` limit (default 3). (b) Long-running AI responses blocking the chat -- mitigated by `timeoutMs` (default 120s) with SIGTERM kill. (c) Context window overflow from long conversations -- mitigated by `maxContextMessages` sliding window (default 10 message pairs). (d) Response exceeding platform limits -- mitigated by `maxResponseLength` truncation with `[...truncated]` suffix.

## Context

The messaging bot mode (#313) established platform adapters for Slack, Discord, and Telegram with:
- **Outbound**: Event bus -> message formatter -> adapter.send()
- **Inbound commands**: adapter.onCommand() -> command router -> response

Missing was free-text conversation -- the ability for a user to type a natural language question on Slack/Discord/Telegram and receive an AI-powered response from the project's context.

The `claude` CLI supports a `-p` flag for single-prompt, non-interactive invocations:
```bash
claude -p "What is our test coverage?"
# Returns: Based on the project configuration...
```

This automatically loads CLAUDE.md, project rules, and codebase context -- making it the ideal backend for chat responses that are project-aware without any additional configuration.

## Decision

Adopt a **ChatHandler** class that spawns `claude -p` subprocesses for each message, with per-chat conversation memory and configurable concurrency limits.

### Architecture

```
Messaging Platform (Slack/Discord/Telegram)
  | free-text message
  v
BaseAdapter._dispatchMessage(text, context)
  |
  v
MessagingHub onMessage handler
  |
  v
ChatHandler.processMessage(text, {chatId, platform, from})
  |
  +-- Check: is this chat already being processed? -> "Please wait" response
  +-- Check: maxConcurrent reached? -> "AI is busy" response
  +-- Record user message in conversation history
  +-- Build prompt with conversation context
  +-- Spawn `claude -p <prompt>`
        |
        v
     stdout captured -> response
        |
  +-- Truncate if > maxResponseLength
  +-- Record assistant response in history
  +-- Return {response, conversationId}
        |
        v
MessagingHub sends response back via adapter.send()
```

### Conversation Memory

- **Storage**: In-memory `Map<string, Message[]>` keyed by `{platform}:{chatId}`
- **Window**: Sliding window of `maxContextMessages * 2` entries (user + assistant pairs)
- **Context building**: Previous messages prepended to current prompt:
  ```
  Previous conversation context:
  User: What framework do we use?
  Assistant: The project uses the AIWG SDLC framework...

  Current message:
  How do I add a new agent?
  ```
- **Lifecycle**: Conversations persist in memory until `clearConversation()` is called or the daemon restarts
- **No persistence**: Conversation history is intentionally ephemeral. Persistent conversation storage introduces data retention concerns and complexity that are not justified for this use case. Users who need persistent records can rely on the messaging platform's own history.

### Concurrency Model

- **Global limit**: `maxConcurrent` (default 3) simultaneous `claude -p` processes across all chats
- **Per-chat dedup**: A `processingChats` Map prevents a second message in the same chat from spawning another process while one is in-flight. The user receives a "Please wait, I'm still thinking..." response.
- **Tracking**: `activeProcesses` counter incremented on spawn, decremented in `finally` block to ensure cleanup even on error or timeout
- **Backpressure**: When `maxConcurrent` is reached, new messages receive an "AI is busy, please try again in a moment" response rather than queuing. Queuing was rejected because stale questions answered minutes later are worse than a prompt retry.

### Process Spawning

```javascript
const proc = spawn(this.#agentCommand, [...this.#agentArgs, '-p', prompt], {
  cwd: this.#cwd,
  stdio: ['ignore', 'pipe', 'pipe'],
  env: { ...process.env },
});
```

Key design decisions for the spawned process:

- **stdin is ignored**: The prompt is passed via the `-p` argument, not stdin. This avoids pipe management complexity and ensures the prompt is fully delivered before the process begins.
- **stdout is captured**: The entire stdout stream is buffered and returned as the response.
- **stderr is captured**: Errors are logged but not returned to the user. Internal errors (API failures, context issues) are surfaced as a generic "I encountered an error" message.
- **Environment inherited**: The child process inherits all environment variables from the daemon, including any API keys required by `claude`.
- **Timeout enforcement**: A timer kills the process with SIGTERM after `timeoutMs`. If the process does not exit within 5 seconds of SIGTERM, SIGKILL is sent.
- **Working directory**: Set to `this.#cwd` (defaults to `process.cwd()`), which determines the CLAUDE.md and project context that `claude -p` loads.

### Response Handling

Responses from `claude -p` are post-processed before delivery:

1. **Length truncation**: If stdout exceeds `maxResponseLength` (default 4000), the response is truncated and `[...truncated]` is appended. The default of 4000 characters fits within Telegram's 4096-character limit with room for formatting.
2. **Empty response handling**: If stdout is empty, a fallback message ("I wasn't able to generate a response") is returned.
3. **Error response**: If the process exits with a non-zero code, stderr is logged and a user-friendly error message is returned.
4. **Timeout response**: If the process is killed due to timeout, the user receives "Response timed out after {timeoutMs/1000} seconds."

### Integration Points

#### With BaseAdapter

The BaseAdapter class (`tools/messaging/adapters/base.mjs`) was extended with three additions to support free-text messages alongside the existing command system:

| Method | Type | Purpose |
|--------|------|---------|
| `onMessage(handler)` | Public | Register a handler for free-text (non-command) messages |
| `_dispatchMessage(text, context)` | Protected | Called by subclass adapters when a free-text message arrives |
| `hasMessageHandlers()` | Public | Returns whether any message handlers are registered |

These parallel the existing `onCommand(handler)`, `_dispatchCommand(command, context)`, and command routing. The separation ensures that command processing (which has strict parsing and authorization) is not entangled with free-text handling (which is open-ended).

#### With EventBus

Chat events are published on the event bus for monitoring and future integrations:

| Topic | Constant | Published When |
|-------|----------|----------------|
| `chat.message` | `CHAT_MESSAGE` | A free-text message arrives from any platform |
| `chat.response` | `CHAT_RESPONSE` | An AI response is generated and sent back |
| `chat.error` | `CHAT_ERROR` | Response generation or delivery fails |

These events follow the same `AiwgEvent` payload structure as all other event bus topics. Subscribers can monitor chat activity, track response latency, or trigger side effects (e.g., logging chat interactions).

#### With CommandRouter (/ask)

The `/ask` command provides command-system access to the chat handler:

```
/ask what is our test coverage?
  -> CommandRouter dispatches to 'ask' handler
  -> ChatHandler.processMessage("what is our test coverage?", context)
  -> {success: true, message: "Based on the project..."}
```

This enables AI interaction even on platforms where free-text routing is not configured, or where users prefer the explicit `/ask` prefix to distinguish AI questions from regular chat.

The `/ask` command uses `CommandPermission.READ` because it does not modify any state -- it only reads project context and returns information.

### Configuration

```javascript
const hub = await createMessagingHub({
  chatHandler: {
    agentCommand: 'claude',       // CLI command to spawn
    agentArgs: [],                 // Additional arguments (e.g., ['--model', 'sonnet'])
    cwd: process.cwd(),            // Working directory for project context
    maxContextMessages: 10,        // Sliding window: 10 user+assistant pairs
    timeoutMs: 120_000,            // Kill process after 2 minutes
    maxConcurrent: 3,              // Max simultaneous AI processes
    maxResponseLength: 4000,       // Truncate response beyond this length
  }
});
```

| Option | Default | Description |
|--------|---------|-------------|
| `agentCommand` | `'claude'` | The CLI command to spawn. Can be changed to any claude-compatible binary. |
| `agentArgs` | `[]` | Extra arguments passed before `-p`. Useful for `--model` or `--max-turns`. |
| `cwd` | `process.cwd()` | Working directory. Determines which CLAUDE.md is loaded. |
| `maxContextMessages` | `10` | Number of previous message pairs to include in prompt context. |
| `timeoutMs` | `120000` | Maximum time for a single AI response before process kill. |
| `maxConcurrent` | `3` | Maximum simultaneous `claude -p` processes across all chats. |
| `maxResponseLength` | `4000` | Truncation threshold in characters. |

Setting `chatHandler: false` disables 2-way chat entirely. Omitting the option enables chat with defaults.

## Consequences

### Positive

- Natural language interaction from messaging platforms without terminal access
- Automatic CLAUDE.md and project context via `claude -p` -- no prompt engineering needed
- Multi-turn conversations with per-chat sliding window memory
- Process isolation prevents a single response failure from cascading to other chats or the daemon
- Simple implementation using existing CLI infrastructure -- no API client libraries or authentication logic
- Coexists cleanly with the command system -- commands and free-text messages have separate dispatch paths

### Negative

- Higher latency than API-direct approach due to process startup overhead (~2-5 seconds per invocation)
- Conversation memory is in-memory only -- lost on daemon restart
- `claude` CLI must be installed and available in PATH on the daemon host
- Each response consumes a full `claude` invocation (token cost adds up for chatty teams)
- No streaming -- the entire response is buffered before delivery, so users see no typing indicator during processing

### Mitigations for Negatives

- **Latency**: Acceptable for chat interaction patterns. Users type messages, expect a brief delay. A "Thinking..." indicator can be sent immediately.
- **Memory loss**: By design -- the messaging platform retains history, and conversation context is only needed for short-term coherence.
- **CLI dependency**: Documented in installation requirements. `aiwg doctor` checks for `claude` in PATH.
- **Token cost**: `maxConcurrent` limits parallelism. `maxContextMessages` bounds per-invocation token usage. Teams can set `chatHandler: false` to disable.
- **No streaming**: Future enhancement. Current architecture supports swapping to streaming when `claude` CLI adds streaming support to `-p` mode.

## References

- @.aiwg/architecture/adrs/ADR-messaging-bot-mode.md -- Parent messaging architecture
- @.aiwg/architecture/adrs/ADR-daemon-mode.md -- Daemon that hosts the messaging subsystem
- @tools/messaging/chat-handler.mjs -- ChatHandler implementation
- @tools/messaging/index.mjs -- Hub wiring for chat (createMessagingHub factory)
- @tools/messaging/adapters/base.mjs -- BaseAdapter with onMessage() extension
- @tools/messaging/types.mjs -- CHAT_MESSAGE, CHAT_RESPONSE, CHAT_ERROR event topics
- @test/unit/messaging/chat-handler.test.js -- ChatHandler unit tests
- @test/unit/messaging/hub-chat-wiring.test.js -- Hub integration tests
