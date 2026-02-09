# ADR: Messaging Bot Mode (Slack, Discord, Telegram)

**Date**: 2026-02-08
**Status**: PROPOSED
**Author**: Architecture Designer
**Category**: Integration Architecture
**Issue**: #313
**Depends On**: #312 (Daemon Mode)

## Reasoning

1. **Problem Analysis**: AIWG has zero messaging platform integration. The competitive analysis (G-02) identifies this as a critical gap: OpenClaw supports 10+ messaging platforms while AIWG requires CLI-only interaction. Development teams running long Ralph loops, HITL gate approvals, and security audits have no way to receive notifications or issue commands from Slack, Discord, or Telegram where they already work. The existing `EscalationHandler` writes crash logs and makes desktop notification attempts, but these are local-only, non-interactive, and unsuitable for distributed teams.

2. **Constraint Identification**: (a) AIWG is a dev-team tool, not a personal assistant -- messaging integration serves development workflows only. (b) All tokens must come from environment variables, never hard-coded (token-security.md). (c) Messaging must be optional -- AIWG must function identically without any messaging configured. (d) No npm dependencies for unconfigured platforms (lazy loading). (e) Runs within the daemon process (#312), not standalone. (f) Must support both outbound notifications and inbound commands.

3. **Alternative Consideration**: Three approaches evaluated:
   - **Direct platform integration**: Hard-code each platform's API into the daemon. Rejected -- tight coupling makes adding platforms expensive and violates separation of concerns.
   - **Webhook-only outbound**: Use generic webhooks for notifications, no inbound. Rejected -- the competitive analysis specifically identifies interactive approval from chat as a differentiator, and HITL gates lose most of their value without interactive responses.
   - **Platform adapter pattern with event bus**: Define a common interface, implement per-platform adapters, connect via an internal event bus. Selected -- enables clean extension to new platforms, separates message formatting from transport, and allows the event bus to serve future integrations (email, PagerDuty, etc.) without architectural changes.

4. **Decision Rationale**: The adapter pattern mirrors AIWG's existing multi-platform deployment architecture (`tools/agents/providers/{provider}.mjs`). The event bus pattern matches the orchestrator's existing architecture where multiple subsystems (PID controller, overseer, memory layer, validation agent) all consume iteration lifecycle events. Adding a messaging subsystem as another event consumer requires zero changes to the orchestrator's core loop. Lazy loading of platform adapters means `discord.js` is never imported unless `AIWG_DISCORD_TOKEN` is set.

5. **Risk Assessment**: (a) Token exposure in chat messages -- mitigated by never including tokens, secrets, or file contents in notifications; only metadata and status. (b) Unauthorized command execution from chat -- mitigated by channel allow-listing and command scope restrictions (read-only by default, approve requires explicit gate ID). (c) Platform API rate limits -- mitigated by message batching and deduplication. (d) Daemon crash takes down messaging -- mitigated by graceful reconnection and the daemon's own crash recovery (#312). (e) Message formatting divergence across platforms -- mitigated by the standardized message format that adapters translate to platform-native rendering.

## Context

### Motivation

The competitive analysis identified messaging integration as a critical gap (G-02, HIGH priority). Current AIWG notification capabilities are limited to:

| Current Mechanism | Limitation |
|-------------------|------------|
| `console.log` in Ralph orchestrator | Local terminal only, lost when terminal closes |
| `EscalationHandler.notifyCrash()` | Writes to crash.log file, no remote delivery |
| Desktop notifications (notify-send) | Local-only, unreliable on headless/CI servers |
| Gitea issue creation | Delayed, not real-time, requires polling |

Development teams need:
- Real-time alerts when Ralph loops complete, fail, or need human input
- Interactive HITL gate approval from chat (the 84% cost reduction from REF-057 depends on timely human response)
- Security audit notifications that reach team members immediately
- Status queries without switching to a terminal

### Dependency on Daemon Mode (#312)

Messaging bot mode requires a persistent process to maintain WebSocket connections (Discord), listen for slash commands (Slack), and poll for updates (Telegram). This persistent process is the daemon from #312. Messaging is a subsystem within the daemon, not a standalone service.

## Decision

Adopt a **platform adapter pattern** with an internal **event bus** connecting AIWG lifecycle events to messaging platform adapters. The system has four layers:

1. **Event Bus** -- Typed internal pub/sub connecting event producers to consumers
2. **Message Formatter** -- Converts events into platform-agnostic message structures
3. **Platform Adapters** -- Translate messages to platform-native API calls
4. **Command Router** -- Parses inbound chat commands and dispatches to AIWG handlers

### Component Diagram

```
 AIWG Daemon Process (#312)
 ================================================================

  +-----------------+  +-----------------+  +------------------+
  | Ralph           |  | HITL Gate       |  | Security Auditor |
  | Orchestrator    |  | Manager         |  | / Health Check   |
  +--------+--------+  +--------+--------+  +--------+---------+
           |                     |                    |
           v                     v                    v
  +--------------------------------------------------------+
  |                    Event Bus                            |
  |  (typed pub/sub: ralph.*, gate.*, security.*, health.*) |
  +-----+-------------------+-------------------+----------+
        |                   |                   |
        v                   v                   v
  +----------+      +-----------+      +-----------+
  | Message  |      | Command   |      | Rate      |
  | Formatter|      | Router    |      | Limiter   |
  +----+-----+      +-----+----+      +-----+-----+
       |                   |                 |
       v                   v                 v
  +--------------------------------------------------------+
  |               Adapter Registry                          |
  |  (lazy-loaded based on configured env vars)             |
  +-----+-------------------+-------------------+----------+
        |                   |                   |
        v                   v                   v
  +----------+      +-----------+      +-----------+
  | Slack    |      | Discord   |      | Telegram  |
  | Adapter  |      | Adapter   |      | Adapter   |
  +----+-----+      +-----+----+      +-----+-----+
       |                   |                 |
       v                   v                 v
  [Slack API]       [Discord API]     [Telegram API]
  Webhooks +        Bot Gateway       Bot API +
  Slash Cmds                          Long Polling
```

### Event Bus

The event bus is a typed pub/sub system internal to the daemon process. No external message broker is required.

```
Event Topics:

  ralph.started        - Ralph loop initiated
  ralph.iteration      - Iteration completed (includes progress %)
  ralph.completed      - Loop completed successfully
  ralph.failed         - Loop failed or limit reached
  ralph.aborted        - Loop aborted by user or overseer

  gate.pending         - HITL gate awaiting approval
  gate.approved        - Gate approved (from CLI or chat)
  gate.rejected        - Gate rejected with feedback
  gate.timeout         - Gate timed out

  security.critical    - Critical security finding
  security.warning     - Security warning
  security.scan_done   - Security scan completed

  health.check         - Health check results
  health.degraded      - System health degraded
  health.recovered     - System health restored

  build.failed         - Build/test failure detected
  build.passed         - Build/test passed
```

Event payload structure:

```typescript
interface AiwgEvent {
  topic: string;           // e.g., "ralph.completed"
  timestamp: string;       // ISO-8601
  source: string;          // e.g., "ralph-orchestrator"
  loopId?: string;         // Ralph loop ID if applicable
  gateId?: string;         // Gate ID if applicable
  severity: "info" | "warning" | "critical";
  summary: string;         // One-line human-readable summary
  details: Record<string, unknown>;  // Event-specific payload
  project: string;         // Project root basename
}
```

### Standardized Message Format

The message formatter converts `AiwgEvent` objects into a platform-agnostic `AiwgMessage` that adapters translate to native rendering:

```typescript
interface AiwgMessage {
  // Content
  title: string;
  body: string;
  severity: "info" | "warning" | "critical";

  // Structure
  fields: Array<{
    label: string;
    value: string;
    inline: boolean;
  }>;

  // Interactive elements (supported on Slack, partial on Discord)
  actions?: Array<{
    id: string;            // e.g., "approve_gate_123"
    label: string;         // e.g., "Approve"
    style: "primary" | "danger" | "default";
    command: string;       // AIWG command to execute
  }>;

  // Metadata
  threadId?: string;       // For threaded replies
  project: string;
  timestamp: string;

  // Rendering hints
  codeBlock?: string;      // Optional code/log snippet
  linkUrl?: string;        // Link to detailed view
  linkText?: string;
}
```

Platform-native translations:

| AiwgMessage Field | Slack | Discord | Telegram |
|-------------------|-------|---------|----------|
| `title` | Attachment title | Embed title | Bold text header |
| `body` | Attachment text | Embed description | Message text |
| `severity` | Color (green/yellow/red) | Embed color | Emoji prefix |
| `fields` | Attachment fields | Embed fields | Formatted text lines |
| `actions` | Interactive buttons (Block Kit) | Button components | Inline keyboard |
| `codeBlock` | ` ```code``` ` block | ` ```code``` ` block | ` ```code``` ` block |
| `threadId` | `thread_ts` | Thread ID | `reply_to_message_id` |

### Platform Adapters

Each adapter implements a common interface:

```typescript
interface MessagingAdapter {
  // Identity
  readonly platform: string;     // "slack" | "discord" | "telegram"

  // Lifecycle
  initialize(): Promise<void>;   // Connect, validate token
  shutdown(): Promise<void>;     // Graceful disconnect

  // Outbound
  send(message: AiwgMessage, channel: string): Promise<MessageResult>;
  update(messageId: string, message: AiwgMessage): Promise<void>;

  // Inbound
  onCommand(handler: CommandHandler): void;

  // Status
  isConnected(): boolean;
  getStatus(): AdapterStatus;
}

interface CommandHandler {
  (command: ParsedCommand): Promise<CommandResponse>;
}

interface ParsedCommand {
  command: string;           // e.g., "status", "approve"
  args: string[];            // e.g., ["gate-123"]
  user: string;              // Platform user ID
  channel: string;           // Platform channel ID
  platform: string;          // "slack" | "discord" | "telegram"
  raw: string;               // Original message text
}

interface CommandResponse {
  text: string;
  ephemeral: boolean;        // Only visible to command issuer
  message?: AiwgMessage;     // Rich formatted response
}
```

#### Slack Adapter

```
Method: Incoming Webhooks (outbound) + Slash Commands (inbound)
Dependencies: None (uses fetch/https built-in)
Token: AIWG_SLACK_WEBHOOK (outbound), AIWG_SLACK_SIGNING_SECRET (inbound)
Inbound: HTTP server on configurable port (default 3141)
Interactive: Block Kit buttons for HITL gate approve/reject
Threading: Groups Ralph iteration updates into threads
```

Slack is the priority platform because:
- Incoming Webhooks require zero dependencies and no persistent connection
- Slash Commands provide structured inbound without a full bot framework
- Block Kit enables rich interactive messages (approve/reject buttons)
- Most development teams already use Slack

Outbound-only mode (webhook only) works without any inbound server, enabling the simplest possible setup: set `AIWG_SLACK_WEBHOOK` and receive notifications immediately.

#### Discord Adapter

```
Method: discord.js Bot API (WebSocket gateway)
Dependencies: discord.js (lazy-loaded, optional peer dependency)
Token: AIWG_DISCORD_TOKEN
Inbound: Slash commands registered via Discord API
Interactive: Button components for HITL gates
Threading: Uses Discord threads for Ralph loop grouping
```

Discord requires the `discord.js` library for the WebSocket gateway connection. This is listed as an optional peer dependency in `package.json` -- it is only imported if `AIWG_DISCORD_TOKEN` is set. The adapter uses lazy `import()` to avoid loading the library at startup.

```typescript
// Lazy loading pattern
async initialize(): Promise<void> {
  const { Client, GatewayIntentBits } = await import("discord.js");
  this.client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages],
  });
  await this.client.login(process.env.AIWG_DISCORD_TOKEN);
}
```

#### Telegram Adapter

```
Method: Telegram Bot API (HTTPS long polling)
Dependencies: None (uses fetch/https built-in)
Token: AIWG_TELEGRAM_TOKEN
Inbound: Bot commands via long polling (no webhook server needed)
Interactive: Inline keyboard buttons for HITL gates
Threading: Reply-to-message for loop grouping
```

Telegram uses long polling by default (no incoming server required). This is the simplest deployment model for users who want to avoid exposing ports. Webhook mode can be enabled for production deployments where a public URL is available.

### Adapter Registry and Lazy Loading

The adapter registry discovers which platforms are configured by checking environment variables at daemon startup. Unconfigured platforms are never loaded.

```typescript
class AdapterRegistry {
  private adapters: Map<string, MessagingAdapter> = new Map();

  async initialize(): Promise<void> {
    // Only load adapters for configured platforms
    if (process.env.AIWG_SLACK_WEBHOOK || process.env.AIWG_SLACK_SIGNING_SECRET) {
      const { SlackAdapter } = await import("./adapters/slack.js");
      const adapter = new SlackAdapter();
      await adapter.initialize();
      this.adapters.set("slack", adapter);
    }

    if (process.env.AIWG_DISCORD_TOKEN) {
      const { DiscordAdapter } = await import("./adapters/discord.js");
      const adapter = new DiscordAdapter();
      await adapter.initialize();
      this.adapters.set("discord", adapter);
    }

    if (process.env.AIWG_TELEGRAM_TOKEN) {
      const { TelegramAdapter } = await import("./adapters/telegram.js");
      const adapter = new TelegramAdapter();
      await adapter.initialize();
      this.adapters.set("telegram", adapter);
    }
  }

  async broadcast(message: AiwgMessage): Promise<void> {
    for (const [platform, adapter] of this.adapters) {
      try {
        await adapter.send(message, this.getDefaultChannel(platform));
      } catch (error) {
        console.error(`[Messaging] ${platform} send failed:`, error.message);
        // Failure on one platform does not block others
      }
    }
  }
}
```

### Inbound Command Router

Commands received from any platform follow a unified routing path:

```
Chat message: "/aiwg approve gate-abc123"
       |
       v
  Platform Adapter (parse platform-specific format)
       |
       v
  ParsedCommand { command: "approve", args: ["gate-abc123"], ... }
       |
       v
  Command Router (validate, authorize, dispatch)
       |
       v
  AIWG Handler (execute command, return result)
       |
       v
  CommandResponse (format for platform)
       |
       v
  Platform Adapter (render platform-native response)
```

Supported inbound commands:

| Command | Arguments | Action | Scope |
|---------|-----------|--------|-------|
| `status` | (none) | Return project status summary | Read-only |
| `ralph-status` | `[loop-id]` | Return Ralph loop status | Read-only |
| `approve` | `<gate-id>` | Approve a pending HITL gate | Write (restricted) |
| `reject` | `<gate-id> [reason]` | Reject a pending HITL gate | Write (restricted) |
| `health` | (none) | Run health check, return results | Read-only |
| `help` | (none) | List available commands | Read-only |

Command authorization:

```typescript
interface CommandAuthorization {
  // Channel-level: only respond in configured channels
  allowedChannels: string[];

  // User-level: approve/reject restricted to authorized users
  approvers: string[];

  // Command-level: some commands require elevated permissions
  commandPermissions: Record<string, "read" | "write">;
}
```

### HITL Gate Integration

HITL gate approval from chat is the highest-value interactive feature. When a gate becomes pending:

1. **Event emitted**: `gate.pending` with gate ID, artifact summary, options
2. **Message formatted**: Rich message with context and approve/reject buttons
3. **Sent to all configured platforms**: Each adapter renders the buttons natively
4. **User clicks button or types command**: Adapter captures response
5. **Command router dispatches**: `approve <gate-id>` or `reject <gate-id> <reason>`
6. **Gate state updated**: Gate transitions, downstream workflow continues
7. **Confirmation sent**: All platforms receive gate resolution notification

Example Slack message for a HITL gate:

```
+----------------------------------------------------------+
| HITL Gate: Elaboration -> Construction                    |
| Gate ID: gate-e2c-20260208-1430                          |
+----------------------------------------------------------+
|                                                          |
| Project: ai-writing-guide                                |
| Artifacts: 5 ready (3 validated, 2 warnings)             |
| Quality Score: 87%                                       |
| Open Issues: 0 critical, 2 minor                         |
|                                                          |
| Deliverables:                                            |
|   * .aiwg/architecture/sad.md                            |
|   * .aiwg/architecture/adrs/ADR-005.md                   |
|   * .aiwg/testing/test-strategy.md                       |
|   * .aiwg/security/threat-model.md                       |
|   * .aiwg/planning/construction-plan.md                  |
|                                                          |
|  [ Approve ]  [ Reject ]  [ View Details ]               |
+----------------------------------------------------------+
```

### Integration with Ralph Orchestrator

The orchestrator does not change. The event bus subscribes to lifecycle points already present in the orchestrator via the daemon wrapper:

```typescript
// In daemon's ralph integration layer
orchestrator.on("iteration:complete", (data) => {
  eventBus.publish({
    topic: "ralph.iteration",
    severity: data.analysis.completed ? "info" : "warning",
    summary: `Iteration ${data.iteration}/${data.maxIterations}: ${data.analysis.completionPercentage}% complete`,
    details: {
      iteration: data.iteration,
      maxIterations: data.maxIterations,
      progress: data.analysis.completionPercentage,
      status: data.analysis.completed ? "completed" : "in_progress",
      loopId: data.loopId,
    },
    project: path.basename(projectRoot),
    timestamp: new Date().toISOString(),
    source: "ralph-orchestrator",
    loopId: data.loopId,
  });
});
```

The orchestrator already has clear lifecycle boundaries (loop start, iteration complete, analysis complete, loop end, abort, crash) that map directly to event topics. The daemon wraps the orchestrator and publishes events; the orchestrator itself needs no modification.

### Integration with Daemon (#312)

Messaging is a subsystem within the daemon, initialized during daemon startup:

```
Daemon Startup Sequence:
  1. Load configuration (aiwg.yml / env vars)
  2. Initialize file watchers (#312)
  3. Initialize messaging subsystem:
     a. Create event bus
     b. Create adapter registry
     c. Discover configured platforms (env vars)
     d. Lazy-load and initialize adapters
     e. Register event subscribers
     f. Register command handlers
     g. Start inbound listeners (Slack HTTP, Discord WS, Telegram polling)
  4. Initialize Ralph supervisor
  5. Start health monitoring
  6. Publish daemon.started event

Daemon Shutdown Sequence:
  1. Publish daemon.stopping event
  2. Stop accepting inbound commands
  3. Drain outbound message queue
  4. Disconnect adapters gracefully
  5. Stop Ralph loops
  6. Stop file watchers
  7. Exit
```

## Security Considerations

### Token Management

All platform tokens are loaded from environment variables per `token-security.md`:

| Variable | Purpose | Required |
|----------|---------|----------|
| `AIWG_SLACK_WEBHOOK` | Slack Incoming Webhook URL | For Slack outbound |
| `AIWG_SLACK_SIGNING_SECRET` | Slack request verification | For Slack inbound |
| `AIWG_SLACK_CHANNELS` | Comma-separated channel IDs | For Slack inbound routing |
| `AIWG_DISCORD_TOKEN` | Discord bot token | For Discord |
| `AIWG_DISCORD_CHANNELS` | Comma-separated channel IDs | For Discord routing |
| `AIWG_TELEGRAM_TOKEN` | Telegram bot token | For Telegram |
| `AIWG_TELEGRAM_CHAT_IDS` | Comma-separated chat IDs | For Telegram routing |

Rules enforced:
- Tokens loaded at point of use within adapter `initialize()`, never stored globally
- Tokens never logged, echoed, or included in error messages
- Tokens never included in outbound messages
- Token presence checked before adapter loading (absent = adapter skipped)
- Slack inbound requests verified against signing secret (HMAC-SHA256)

### Message Content Security

Outbound messages MUST NOT contain:
- File contents (only file paths and metadata)
- Token values or secrets
- Full error stack traces (summary only)
- User credentials or PII
- Environment variable values

Outbound messages MAY contain:
- Project name and path basename
- Loop IDs and gate IDs
- Iteration counts, quality scores, progress percentages
- File paths relative to project root
- Status summaries and error classifications

### Inbound Command Security

- **Channel restriction**: Commands only accepted from channels listed in `AIWG_*_CHANNELS` env vars
- **Command scope**: Read-only commands (status, health) available to all channel members. Write commands (approve, reject) restricted to users listed in `AIWG_APPROVERS` or the approver list in `aiwg.yml`
- **Rate limiting**: Maximum 30 commands per minute per user, 120 per channel
- **Input validation**: Gate IDs validated against active gates before execution. No arbitrary command injection -- only the six defined commands are routable
- **Audit trail**: All inbound commands logged to `.aiwg/messaging/audit.log` with timestamp, user, platform, command, and result

### Slack-Specific Security

- All inbound HTTP requests verified against `AIWG_SLACK_SIGNING_SECRET` using Slack's HMAC-SHA256 signature scheme
- Request timestamps checked (reject if older than 5 minutes) to prevent replay attacks
- Interactive payloads (button clicks) verified with the same signing secret

## Configuration

### Minimal Setup (Outbound Only)

```bash
# Set webhook URL -- notifications start immediately
export AIWG_SLACK_WEBHOOK="https://hooks.slack.com/services/T.../B.../..."
aiwg daemon start
```

### Full Setup

```yaml
# aiwg.yml
messaging:
  # Global settings
  default_severity: info       # Minimum severity to send
  batch_interval_ms: 2000      # Batch messages within window
  rate_limit:
    per_user: 30               # Commands per minute per user
    per_channel: 120           # Commands per minute per channel

  # Platform configuration
  slack:
    enabled: true
    channels:
      - "#aiwg-notifications"  # Outbound channel
      - "#dev-team"            # Inbound + outbound
    inbound_port: 3141         # HTTP server for slash commands
    thread_ralph_loops: true   # Group Ralph updates in threads

  discord:
    enabled: true
    channels:
      - "aiwg-bot"             # Channel name
    thread_ralph_loops: true

  telegram:
    enabled: true
    polling_interval_ms: 3000
    chat_ids: []               # Populated from AIWG_TELEGRAM_CHAT_IDS

  # Authorization
  approvers:                   # Users who can approve/reject gates
    - "U12345678"              # Slack user ID
    - "discord:987654321"      # Discord user ID (prefixed)
    - "telegram:123456789"     # Telegram user ID (prefixed)

  # Event routing (which events go where)
  routing:
    ralph.*: ["slack", "discord"]
    gate.pending: ["slack", "discord", "telegram"]
    security.critical: ["slack", "discord", "telegram"]
    health.*: ["slack"]
```

### Environment Variable Reference

```bash
# Slack
AIWG_SLACK_WEBHOOK=https://hooks.slack.com/services/...
AIWG_SLACK_SIGNING_SECRET=abc123...
AIWG_SLACK_CHANNELS=C12345678,C87654321

# Discord
AIWG_DISCORD_TOKEN=MTk...
AIWG_DISCORD_CHANNELS=123456789,987654321

# Telegram
AIWG_TELEGRAM_TOKEN=123456:ABC-DEF...
AIWG_TELEGRAM_CHAT_IDS=-1001234567890

# Cross-platform
AIWG_APPROVERS=U12345678,discord:987654321,telegram:123456789
AIWG_MESSAGING_SEVERITY=info
```

## File Structure

```
src/
  messaging/
    event-bus.ts              # Typed pub/sub event bus
    message-formatter.ts      # AiwgEvent -> AiwgMessage conversion
    command-router.ts         # Inbound command parsing and dispatch
    adapter-registry.ts       # Lazy-loading adapter discovery
    rate-limiter.ts           # Per-user, per-channel rate limiting
    types.ts                  # Shared interfaces
    adapters/
      slack.ts                # Slack Incoming Webhooks + Slash Commands
      discord.ts              # discord.js bot adapter
      telegram.ts             # Telegram Bot API adapter
    handlers/
      status.ts               # /aiwg status command handler
      ralph-status.ts         # /aiwg ralph-status handler
      gate-approve.ts         # /aiwg approve handler
      gate-reject.ts          # /aiwg reject handler
      health.ts               # /aiwg health handler
      help.ts                 # /aiwg help handler
```

## Consequences

### Positive

- Development teams receive real-time notifications where they already work
- HITL gate approval latency drops from "next time someone checks the terminal" to seconds
- Platform adapter pattern enables future platforms (Microsoft Teams, Matrix, email) with a single new adapter file
- Event bus enables non-messaging consumers (logging, metrics, webhooks) without architecture changes
- Outbound-only mode (Slack webhook) requires zero inbound infrastructure -- lowest possible barrier to entry

### Negative

- Additional surface area for security review (inbound commands, token management)
- Discord adapter requires optional peer dependency (`discord.js`), which may confuse users who see peer dependency warnings on `npm install`
- Slack inbound requires an HTTP server on a port, which may conflict in some environments
- Message formatting for three platforms increases testing matrix
- Daemon mode (#312) becomes a prerequisite -- messaging does not work with CLI-only AIWG

### Neutral

- No changes to the Ralph orchestrator, HITL gate system, or any existing code
- Messaging subsystem is entirely additive -- zero risk to existing functionality
- All platform adapters are independently testable via mock APIs

## Alternatives Considered

### 1. Generic Webhook Only

Send JSON payloads to a user-configured webhook URL. Let users build their own Slack/Discord/Telegram integration.

**Rejected because**: This pushes integration complexity to every user. The whole point of AIWG is to reduce developer toil, not create more of it. Additionally, interactive features (approve/reject buttons) are impossible with generic webhooks.

### 2. ntfy.sh / Pushover / Generic Push

Use a push notification service as an intermediary.

**Rejected because**: Adds an external service dependency. Does not support inbound commands. Does not support interactive elements. Teams already have Slack/Discord -- adding another notification channel creates noise, not value.

### 3. Email Notifications

Send email for notifications, accept email replies for commands.

**Rejected because**: Email is not real-time (delivery delays, inbox noise). Parsing email replies for commands is fragile. Email does not support interactive buttons. Email is suitable as a future low-priority adapter, not the primary integration.

### 4. Full Bot Framework (Botpress, Botkit)

Use an established bot framework that abstracts multiple platforms.

**Rejected because**: These frameworks are designed for conversational AI bots, not structured command/notification systems. They add massive dependency weight (Botpress is 200+ MB), introduce their own state management that conflicts with AIWG's, and are overkill for the six defined commands. The adapter pattern achieves the same platform abstraction with a fraction of the complexity.

## Implementation Roadmap

### Phase 1: Outbound Notifications (Slack Webhook)

- Event bus implementation
- Message formatter
- Slack webhook adapter (outbound only)
- Ralph lifecycle events
- `aiwg daemon` integration

**Deliverable**: Set `AIWG_SLACK_WEBHOOK` and receive Ralph loop notifications in Slack.

### Phase 2: Interactive Slack (Inbound + Buttons)

- Slack slash command handler
- Slack Block Kit interactive messages
- Command router
- HITL gate approve/reject from Slack
- Status and health commands

**Deliverable**: Full bidirectional Slack integration with HITL gate buttons.

### Phase 3: Discord Adapter

- Discord.js bot adapter
- Discord slash command registration
- Discord button components
- Thread grouping for Ralph loops

**Deliverable**: Feature parity with Slack on Discord.

### Phase 4: Telegram Adapter

- Telegram Bot API adapter (long polling)
- Inline keyboard buttons for gates
- Command handling via bot commands

**Deliverable**: Feature parity on Telegram.

### Phase 5: Event Routing and Configuration

- `aiwg.yml` messaging configuration
- Per-topic event routing
- Severity filtering
- `aiwg doctor` messaging health checks

**Deliverable**: Fine-grained control over what goes where.

## References

- @.aiwg/reports/competitive-analysis-openclaw-moltbot-aiwg.md - Gap analysis (G-02)
- @.claude/rules/token-security.md - Token handling requirements
- @tools/ralph-external/orchestrator.mjs - Event lifecycle patterns
- @tools/ralph-external/lib/escalation-handler.mjs - Existing notification patterns
- @.claude/rules/hitl-gates.md - HITL gate architecture
- @.claude/rules/hitl-patterns.md - Gate display and interaction patterns
- @.aiwg/architecture/adrs/ADR-cross-platform-feature-adoption.md - Platform adapter precedent

---

**Rule Status**: PROPOSED
**Last Updated**: 2026-02-08
