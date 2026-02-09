---
title: "Chat Platform Bidirectional Communication - Research Summary"
created: 2026-02-08
type: research_summary
topics:
  - messaging-platforms
  - architecture-decisions
quality: high
---

# Chat Platform Bidirectional Communication - Research Summary

## Executive Summary

Three chat platforms researched for bidirectional communication patterns:

| Platform | Outbound | Inbound | Dependencies | Complexity |
|----------|----------|---------|--------------|------------|
| **Slack** | Webhook (native) | HTTP server + signature verification | None (or Express for inbound) | Low |
| **Discord** | Gateway send | Gateway events + slash commands | discord.js required | Medium |
| **Telegram** | Bot API (native) | Long polling (native) or webhook | None | Low |

**Key Finding**: Slack and Telegram can work with zero npm dependencies (native fetch/https). Discord requires discord.js due to WebSocket Gateway complexity.

## Platform-Specific Patterns

### Slack

**Recommended Approach**: Incoming Webhooks (outbound) + Slash Commands (inbound)

**Outbound (Webhook)**:
- HTTPS POST to webhook URL
- Native fetch, zero dependencies
- Cannot thread messages (no message ID returned)
- Cannot update messages

**Inbound (Slash Commands)**:
- HTTP server receives POST from Slack
- HMAC-SHA256 signature verification required
- 3-second response deadline
- Interactive components (buttons) for HITL gates

**Alternative: Socket Mode**:
- WebSocket to Slack (no public URL needed)
- Requires @slack/socket-mode dependency
- Requires App Token + Bot Token
- Good for development, adds complexity

**Production Recommendation**: Start with webhook-only (outbound), add HTTP server for inbound when needed.

### Discord

**Recommended Approach**: discord.js Bot with Gateway WebSocket

**Why discord.js is Required**:
- Gateway protocol is complex (heartbeat, resume, identify, sharding)
- Manual WebSocket implementation would be 500+ lines just for connection management
- discord.js handles reconnection, rate limiting, and API updates

**Connection Lifecycle**:
1. Connect to gateway WebSocket
2. Send IDENTIFY with token and intents
3. Receive READY with session info
4. Start heartbeat loop
5. Receive events (messages, interactions)
6. On disconnect, RESUME with session_id to avoid event replay

**Slash Commands**:
- Must be registered via REST API (separate step)
- Gateway delivers interactions
- 3-second deferral deadline (use `interaction.deferReply()`)

**Rate Limits**:
- 5 messages per 5 seconds per channel
- 50 requests per second globally
- Strict enforcement, no burst allowance

**Production Recommendation**: Use discord.js, lazy-load it only if AIWG_DISCORD_TOKEN is set.

### Telegram

**Recommended Approach**: Long Polling for simplicity

**Long Polling**:
- GET /getUpdates with 30-second timeout
- Native fetch, zero dependencies
- No public URL needed
- Track `offset` to avoid duplicate updates
- Simple reconnection (just retry)

**Webhook Alternative**:
- Telegram POSTs to your HTTPS endpoint
- Requires public URL with valid TLS cert
- Lower latency than polling
- Good for production, harder for development

**Interactive Keyboards**:
- Inline keyboard buttons for HITL gates
- 64-byte callback data limit
- Answer callback query to remove loading spinner

**Rate Limits**:
- 30 messages/second globally
- 20 messages/minute per chat
- No burst limits

**Production Recommendation**: Start with long polling (easiest), switch to webhook for production if public URL available.

## Unified Patterns

### Adapter Interface

All platforms implement:

```typescript
interface MessagingAdapter {
  readonly platform: string;
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  send(message: AiwgMessage, channel: string): Promise<MessageResult>;
  update(messageId: string, message: AiwgMessage): Promise<void>;
  onCommand(handler: CommandHandler): void;
  isConnected(): boolean;
  getStatus(): AdapterStatus;
}
```

### Canonical Message Format

Platform-agnostic message structure:

```typescript
interface AiwgMessage {
  title: string;
  body: string;
  severity: "info" | "warning" | "critical";
  fields: Array<{ label: string; value: string; inline: boolean }>;
  actions?: Array<{ id: string; label: string; style: string; command: string }>;
  threadId?: string;
  project: string;
  timestamp: string;
  codeBlock?: string;
}
```

Each adapter translates to platform-native format:
- Slack: Block Kit
- Discord: Embeds + Buttons
- Telegram: Markdown + Inline Keyboard

### Command Router

Unified command handling across platforms:

```typescript
class CommandRouter {
  register(command: string, handler: CommandHandler);
  route(command: ParsedCommand): Promise<CommandResponse>;
}

interface ParsedCommand {
  command: string;
  args: string[];
  user: string;
  channel: string;
  platform: string;
  raw: string;
}
```

### Threading Pattern

Group related messages:

| Platform | Method | Notes |
|----------|--------|-------|
| Slack | `thread_ts` | Requires Bot Token (not available with webhook) |
| Discord | Thread creation | Create thread from initial message |
| Telegram | `reply_to_message_id` | Simple reply-to mechanism |

### Reconnection Strategy

| Platform | Mechanism | Implementation |
|----------|-----------|----------------|
| Slack (webhook) | Stateless | Retry with exponential backoff |
| Discord | Gateway RESUME | discord.js handles automatically |
| Telegram | Restart polling | Simple retry loop |

## Security Patterns

### Token Management

All tokens from environment variables:

```bash
# Slack
AIWG_SLACK_WEBHOOK=https://hooks.slack.com/services/...
AIWG_SLACK_SIGNING_SECRET=abc123...  # For inbound verification
AIWG_SLACK_BOT_TOKEN=xoxb-...        # For message updates/threading

# Discord
AIWG_DISCORD_TOKEN=MTk...
AIWG_DISCORD_CLIENT_ID=123456789

# Telegram
AIWG_TELEGRAM_TOKEN=123456:ABC-DEF...
```

**Rules**:
- Load at point of use (adapter initialize)
- Never log, echo, or include in messages
- Never pass as CLI arguments
- Use heredoc pattern for scoped lifetime (if applicable)

### Request Verification

**Slack**: HMAC-SHA256 signature verification

```typescript
function verifySlackRequest(body: string, timestamp: string, signature: string, secret: string): boolean {
  // Check timestamp (reject if >5 minutes old)
  // Compute HMAC-SHA256 of "v0:{timestamp}:{body}"
  // Compare signatures using timingSafeEqual
}
```

**Telegram**: IP allowlist or secret token

```
Telegram IPs:
- 149.154.160.0/20
- 91.108.4.0/22
```

**Discord**: Token authentication handled by discord.js

### Channel Authorization

```bash
# Only respond in configured channels
AIWG_SLACK_CHANNELS=C12345678,C87654321
AIWG_DISCORD_CHANNELS=123456789
AIWG_TELEGRAM_CHAT_IDS=-1001234567890
```

### User Authorization

```bash
# Only these users can approve/reject gates
AIWG_APPROVERS=U12345678,discord:987654321,telegram:123456789
```

Prefix platform for cross-platform unique IDs.

## Implementation Strategy

### Phase 1: Slack Outbound (MVP)

**Goal**: Notifications with zero inbound infrastructure

**Deliverables**:
- SlackAdapter (webhook only)
- MessageFormatter (AiwgMessage → Slack blocks)
- Event bus integration
- Ralph lifecycle events → Slack

**Dependencies**: None (native fetch)
**Effort**: 1-2 days
**Risk**: Low

### Phase 2: Slack Inbound

**Goal**: Interactive HITL gates from Slack

**Deliverables**:
- HTTP server for slash commands
- Signature verification
- CommandRouter
- Interactive button handling
- HITL gate approve/reject

**Dependencies**: Express
**Effort**: 2-3 days
**Risk**: Medium (signature verification critical)

### Phase 3: Discord

**Goal**: Feature parity with Slack on Discord

**Deliverables**:
- DiscordAdapter with discord.js
- Slash command registration
- Gateway event handling
- Button components
- Threading

**Dependencies**: discord.js
**Effort**: 3-4 days
**Risk**: Medium (Gateway complexity, rate limits)

### Phase 4: Telegram

**Goal**: Lightweight alternative with long polling

**Deliverables**:
- TelegramAdapter (long polling)
- Bot command handling
- Inline keyboard
- Reply-to threading

**Dependencies**: None
**Effort**: 2-3 days
**Risk**: Low

### Phase 5: Production Hardening

**Goal**: Reliable production operation

**Deliverables**:
- Rate limiting per platform
- Health monitoring
- Reconnection logic
- Message queuing and retry
- Metrics and logging
- Error escalation

**Effort**: 3-5 days
**Risk**: Medium

## Dependency Matrix

| Platform | Required | Optional | Notes |
|----------|----------|----------|-------|
| Slack | None | Express (for inbound) | Webhook uses native fetch |
| Discord | discord.js | - | Gateway protocol too complex for native impl |
| Telegram | None | - | Bot API simple enough for native fetch |

**Total Minimal Dependencies**:
- None (for Slack webhook + Telegram long polling)
- discord.js (if Discord needed)
- Express (if Slack inbound needed)

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| Token exposure in messages | Low | Critical | Never include tokens in message content, strict review |
| Unauthorized commands | Medium | High | Channel + user authorization, signature verification |
| Rate limit violations | Medium | Medium | Per-platform rate limiting, message queuing |
| Gateway disconnect (Discord) | Medium | Medium | Auto-reconnect via discord.js, health monitoring |
| Polling failure (Telegram) | Low | Low | Exponential backoff, retry loop |
| Webhook delivery failure (Slack) | Low | Medium | Retry with exponential backoff, log failures |

## Comparison with Existing Solutions

### Hubot
- **Pattern**: Multi-platform adapter interface
- **Useful**: Adapter separation, `send()`/`reply()` distinction
- **Not useful**: Brain persistence (AIWG uses .aiwg/), conversation focus

### Botkit
- **Pattern**: Platform-specific bot instances
- **Useful**: Event-driven command handling
- **Not useful**: Conversation flows (AIWG is command-based), heavy framework

### Matrix Bridges
- **Pattern**: Canonical message format, bidirectional translation
- **Useful**: Message format abstraction, retry queue
- **Not useful**: Full Matrix protocol (overkill)

## Production Best Practices

### 1. Lazy Loading

```typescript
// Only load discord.js if configured
if (process.env.AIWG_DISCORD_TOKEN) {
  const { DiscordAdapter } = await import("./adapters/discord.js");
  // ...
}
```

### 2. Graceful Degradation

```typescript
// Failure on one platform doesn't block others
for (const adapter of adapters) {
  try {
    await adapter.send(message, channel);
  } catch (error) {
    console.error(`[${adapter.platform}] Failed:`, error.message);
    // Continue to next adapter
  }
}
```

### 3. Health Monitoring

```typescript
setInterval(async () => {
  for (const adapter of adapters) {
    if (!adapter.isConnected()) {
      console.warn(`[${adapter.platform}] Disconnected, reconnecting...`);
      await adapter.initialize();
    }
  }
}, 60000); // Check every minute
```

### 4. Rate Limiting

```typescript
class RateLimiter {
  private buckets = new Map<string, TokenBucket>();

  async checkLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
    // Token bucket algorithm
  }
}

// Per platform
await rateLimiter.checkLimit(`discord:${channelId}`, 5, 5000); // Discord: 5/5s
await rateLimiter.checkLimit(`telegram:${chatId}`, 20, 60000); // Telegram: 20/min
```

### 5. Message Threading

```typescript
class ThreadManager {
  private threads = new Map<string, string>(); // loopId -> threadId

  getOrCreateThread(loopId: string, platform: string): string | undefined;
  setThread(loopId: string, platform: string, threadId: string): void;
  clearThread(loopId: string, platform: string): void;
}
```

## Key Takeaways

1. **Slack and Telegram work with zero dependencies** - Use native fetch for simplest setup
2. **Discord requires discord.js** - Gateway protocol too complex for manual implementation
3. **Start with outbound-only** - Slack webhook provides immediate value with zero infrastructure
4. **Adapter pattern works well** - Clean separation, easy to add new platforms
5. **Canonical message format** - Abstract platform differences, single source of truth
6. **Security is critical** - Signature verification (Slack), channel/user authorization, no token leakage
7. **Graceful degradation** - One platform failure doesn't break everything
8. **Threading enhances UX** - Group related updates, reduce channel noise

## References

- Slack API: https://api.slack.com/
- Discord API: https://discord.com/developers/docs/
- Telegram Bot API: https://core.telegram.org/bots/api
- Hubot: https://github.com/hubotio/hubot
- Matrix Bridges: https://github.com/matrix-org/matrix-appservice-bridge
- @.aiwg/architecture/adrs/ADR-messaging-bot-mode.md - Architectural decision
- @.aiwg/research/findings/chat-platform-bidirectional-patterns.md - Detailed patterns
- @.aiwg/research/findings/minimal-chat-adapters-reference.md - Code implementations
