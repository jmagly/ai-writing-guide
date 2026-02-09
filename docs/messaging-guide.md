# Messaging Guide

AIWG messaging integration connects your project to Slack, Discord, and Telegram for real-time notifications, interactive commands, and 2-way AI chat. The messaging subsystem runs within the daemon process.

## Overview

The messaging system provides:

- **Event notifications** — Receive alerts for Ralph completions, security issues, build failures, and HITL gates
- **Interactive commands** — Query status, approve gates, and manage workflows from chat
- **2-way AI chat** — Ask questions about your project directly from messaging platforms
- **Multi-platform** — Same event stream delivered to all connected platforms simultaneously

## Quick Start

### 1. Set environment variables

Each platform requires a bot token via environment variable:

```bash
# Slack
export AIWG_SLACK_TOKEN="xoxb-your-bot-token"
export AIWG_SLACK_CHANNEL="#aiwg-notifications"

# Discord
export AIWG_DISCORD_TOKEN="your-discord-bot-token"
export AIWG_DISCORD_CHANNEL="channel-id"

# Telegram
export AIWG_TELEGRAM_TOKEN="123456:ABCdefGHIjklMNOpqrsTUVwxyz"
export AIWG_TELEGRAM_CHAT_ID="-1001234567890"
```

### 2. Start the daemon

```bash
aiwg daemon start
```

The messaging hub auto-discovers enabled adapters from environment variables. No configuration file changes needed.

### 3. Verify

The daemon log confirms adapter loading:

```
[messaging] Hub started with 2 adapter(s): slack, telegram
[messaging] 2-way AI chat enabled
```

## Platform Setup

### Slack

1. Create a Slack app at https://api.slack.com/apps
2. Add Bot Token Scopes: `chat:write`, `commands`, `app_mentions:read`
3. Install to workspace and copy the Bot User OAuth Token
4. Set environment variables:

```bash
export AIWG_SLACK_TOKEN="xoxb-..."
export AIWG_SLACK_CHANNEL="#aiwg-notifications"  # Default channel for notifications
```

### Discord

1. Create a Discord application at https://discord.com/developers/applications
2. Add a Bot under the application
3. Enable Message Content Intent in Bot settings
4. Generate an invite URL with `Send Messages` and `Read Message History` permissions
5. Invite the bot to your server
6. Set environment variables:

```bash
export AIWG_DISCORD_TOKEN="your-bot-token"
export AIWG_DISCORD_CHANNEL="channel-id"  # Right-click channel → Copy ID
```

### Telegram

1. Message @BotFather on Telegram
2. Send `/newbot` and follow the prompts
3. Copy the bot token
4. Add the bot to your group/channel
5. Get the chat ID (send a message, then check `https://api.telegram.org/bot<token>/getUpdates`)
6. Set environment variables:

```bash
export AIWG_TELEGRAM_TOKEN="123456:ABCdef..."
export AIWG_TELEGRAM_CHAT_ID="-1001234567890"
```

## Commands

All platforms support the same command set. Prefix commands with `/` in chat:

| Command | Permission | Description |
|---------|-----------|-------------|
| `/help` | read | List available commands |
| `/status` | read | Show project status and daemon health |
| `/ralph-status` | read | Show active Ralph loop status |
| `/health` | read | Run health check on all subsystems |
| `/ask <question>` | read | Ask the AI a question about your project |
| `/approve <gate-id>` | write | Approve a pending HITL gate |
| `/reject <gate-id> [reason]` | write | Reject a pending HITL gate with optional reason |

### Permissions

Commands have two permission levels:

- **read** — Available to everyone in the channel
- **write** — Requires explicit permission grant

Grant write permissions via the `writeUsers` option:

```javascript
const hub = await createMessagingHub({
  writeUsers: ['U12345', 'user@example.com'],
});
```

Or in daemon configuration, set `AIWG_WRITE_USERS` environment variable (comma-separated user IDs).

### Command Examples

**Check project status**:
```
You: /status
Bot: Project: my-project
     Phase: Construction
     Daemon uptime: 3600s
     Health: healthy
```

**Approve a HITL gate**:
```
You: /approve gate-e2c-001
Bot: Gate gate-e2c-001 approved
```

**Ask a question**:
```
You: /ask what is our test coverage?
Bot: Based on the project configuration, the test suite runs via
     `npx vitest run` and currently has approximately 2,619 tests...
```

## 2-Way AI Chat

Beyond slash commands, you can send free-text messages to the bot for AI-powered responses. The bot uses `claude -p` with your project's full context (CLAUDE.md, codebase, etc.).

### How It Works

1. Send a message to the bot (DM or mention in a channel)
2. The messaging hub forwards it to the ChatHandler
3. ChatHandler spawns a `claude -p` process with conversation context
4. The AI response is sent back to the originating platform

### Multi-Turn Conversations

The chat system maintains conversation history per chat channel. Each conversation tracks up to 10 message pairs (configurable), so the AI remembers context from recent messages:

```
You: What testing framework do we use?
Bot: The project uses Vitest for testing...

You: How do I add a new test file?
Bot: Based on the existing test structure, create a new file in
     test/unit/ following the pattern...
```

### Configuration

Chat behavior is configured via `createMessagingHub()` options or environment variables:

| Setting | Default | Description |
|---------|---------|-------------|
| `maxConcurrent` | 3 | Maximum simultaneous AI processes |
| `maxContextMessages` | 10 | Conversation history depth (message pairs) |
| `timeoutMs` | 120000 | AI response timeout (milliseconds) |
| `maxResponseLength` | 4000 | Maximum response characters |

### Concurrency Limits

To prevent resource exhaustion, the chat system limits concurrent AI processes:

- **Global limit**: Maximum 3 simultaneous `claude -p` processes (configurable)
- **Per-chat dedup**: Only one AI process per chat at a time
- **Busy response**: When limits are reached, users receive a "please wait" message

### Disabling Chat

To run messaging with notifications and commands only (no AI chat):

```javascript
const hub = await createMessagingHub({
  chatHandler: false,
});
```

## Event Topics

The messaging system forwards events from the internal event bus to all connected platforms. Events are formatted into human-readable messages with severity indicators.

### Event Categories

| Category | Topics | Description |
|----------|--------|-------------|
| **Ralph** | `ralph.started`, `ralph.iteration`, `ralph.completed`, `ralph.failed`, `ralph.aborted` | Ralph loop lifecycle events |
| **HITL Gates** | `gate.pending`, `gate.approved`, `gate.rejected`, `gate.timeout` | Human-in-the-loop gate events |
| **Security** | `security.critical`, `security.warning`, `security.scan_done` | Security scan results |
| **Health** | `health.check`, `health.degraded`, `health.recovered` | System health transitions |
| **Build** | `build.failed`, `build.passed` | Build/test results |
| **Daemon** | `daemon.started`, `daemon.stopping` | Daemon lifecycle |
| **Chat** | `chat.message`, `chat.response`, `chat.error` | Chat session events |

### Event Severity

Events carry a severity level that affects formatting:

| Severity | Display | Use Case |
|----------|---------|----------|
| `info` | Normal text | Status updates, completions |
| `warning` | Highlighted | Degraded health, gate timeouts |
| `critical` | Alert/urgent | Security issues, failures |

### Publishing Custom Events

From your own integrations, publish events to the messaging hub:

```javascript
hub.publish({
  topic: 'custom.event',
  source: 'my-integration',
  severity: 'info',
  summary: 'Deployment completed successfully',
  details: { version: '1.2.3', environment: 'staging' },
  timestamp: new Date().toISOString(),
});
```

## Custom Adapters

To add support for a new messaging platform, extend `BaseAdapter`:

```javascript
import { BaseAdapter } from '../adapters/base.mjs';

export class MyPlatformAdapter extends BaseAdapter {
  constructor(config) {
    super('myplatform');
    this.config = config;
  }

  async initialize() {
    // Connect to platform API
    this._setConnected();
  }

  async send(message, channel) {
    // Format and send message to platform
    this._recordSend();
    return { messageId: '...', channelId: channel, success: true };
  }

  async update(messageId, message) {
    // Update an existing message
  }

  async shutdown() {
    this._setDisconnected();
  }
}
```

### Required Methods

| Method | Description |
|--------|-------------|
| `initialize()` | Connect to platform, set up event listeners |
| `send(message, channel)` | Send a formatted message |
| `update(messageId, message)` | Update an existing message |
| `shutdown()` | Disconnect and clean up |

### Protected Methods (from BaseAdapter)

| Method | Description |
|--------|-------------|
| `_setConnected()` | Mark adapter as connected |
| `_setDisconnected()` | Mark adapter as disconnected |
| `_recordSend()` | Increment sent message counter |
| `_recordReceive()` | Increment received message counter |
| `_recordError(error)` | Record an error |
| `_dispatchCommand(command, args, context)` | Forward command to registered handlers |
| `_dispatchMessage(text, context)` | Forward free-text message to handlers |

### Registering Inbound Handlers

For platforms that support inbound messages, call the dispatch methods from your adapter's event listeners:

```javascript
// In your adapter's initialize():
this.client.on('message', (msg) => {
  if (msg.text.startsWith('/')) {
    const [command, ...args] = msg.text.slice(1).split(' ');
    this._dispatchCommand(command, args, {
      chatId: msg.chatId,
      from: msg.author,
    });
  } else {
    this._dispatchMessage(msg.text, {
      chatId: msg.chatId,
      from: msg.author,
    });
  }
});
```

## Architecture

```
┌─────────────────────────────────────────────────┐
│                  Daemon Process                  │
│                                                  │
│  ┌──────────┐    ┌──────────────────┐           │
│  │ EventBus │───→│ MessageFormatter │           │
│  └──────────┘    └────────┬─────────┘           │
│       ↑                   ↓                      │
│  Events from         Formatted messages          │
│  Ralph, Health,      ┌─────────┬─────────┐      │
│  Security, etc.      ↓         ↓         ↓      │
│                  ┌───────┐ ┌───────┐ ┌────────┐ │
│                  │ Slack │ │Discord│ │Telegram│  │
│                  └───┬───┘ └───┬───┘ └────┬───┘ │
│                      ↓         ↓          ↓      │
│  Inbound:     ┌──────────────────────────────┐  │
│  /commands    │      CommandRouter            │  │
│  free text    │      ChatHandler              │  │
│               └──────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

## Troubleshooting

### No adapters loaded

Verify environment variables are set:

```bash
echo $AIWG_SLACK_TOKEN
echo $AIWG_DISCORD_TOKEN
echo $AIWG_TELEGRAM_TOKEN
```

At least one token must be set for messaging to activate.

### Bot not responding to commands

- Verify the bot has appropriate permissions in the channel
- Check daemon logs: `tail -f .aiwg/daemon/daemon.log`
- Ensure commands start with `/` (e.g., `/status`, not `status`)

### AI chat responses are slow

Each response spawns a `claude -p` process with full project context. For large projects, this can take 30-60 seconds. To speed up:

- Reduce project context (optimize CLAUDE.md)
- Increase `maxConcurrent` if you have resources
- Use `/ask` for quick questions (routes through command system)

### Messages truncated

Response length is capped at `maxResponseLength` (default 4000 chars) to respect platform limits. Truncated responses end with `[...truncated]`. Adjust the limit in chat handler configuration.

### Rate limiting

If a platform rate-limits the bot, errors appear in daemon logs. The adapters handle rate limits gracefully with backoff, but sustained high-volume notifications may require message batching configuration.

## Cross-References

- [Daemon Guide](daemon-guide.md) — Daemon setup and management
- [Ralph Guide](ralph-guide.md) — Ralph loops with messaging notifications
- `.aiwg/architecture/adrs/ADR-messaging-bot-mode.md` — Architecture decision
- `.aiwg/architecture/adrs/ADR-2way-chat.md` — Chat architecture
- `tools/messaging/README.md` — Developer documentation
