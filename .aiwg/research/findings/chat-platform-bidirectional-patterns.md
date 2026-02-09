---
title: "Chat Platform Bidirectional Communication Patterns"
created: 2026-02-08
type: technical_research
topics:
  - messaging-platforms
  - websocket-patterns
  - bot-apis
quality: high
---

# Chat Platform Bidirectional Communication Patterns

**Research Date**: 2026-02-08
**Author**: Technical Researcher
**Purpose**: Document production-ready patterns for Slack, Discord, Telegram bidirectional communication

## Executive Summary

Bidirectional chat platform integration requires platform-specific connection management:
- **Slack**: Incoming Webhooks (outbound) + Slash Commands (inbound HTTP)
- **Discord**: WebSocket Gateway with heartbeat/resume (requires discord.js)
- **Telegram**: Long polling (simplest) or webhook HTTP server

Key finding: Slack and Telegram can work with zero dependencies (native fetch/https). Discord requires discord.js for WebSocket gateway complexity.

## 1. Slack Bidirectional Patterns

### 1.1 Outbound: Incoming Webhooks

**Method**: HTTPS POST to webhook URL
**Dependencies**: None (native fetch or https module)
**Setup**: Create Incoming Webhook in Slack App settings

```typescript
// Minimal outbound implementation
async function sendSlackMessage(webhookUrl: string, message: {
  text: string;
  blocks?: any[];
  thread_ts?: string;
}) {
  const response = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(message),
  });

  if (!response.ok) {
    throw new Error(`Slack webhook failed: ${response.status}`);
  }
}

// Rich formatting with Block Kit
const richMessage = {
  text: "HITL Gate Pending",
  blocks: [
    {
      type: "header",
      text: {
        type: "plain_text",
        text: "HITL Gate: Elaboration → Construction"
      }
    },
    {
      type: "section",
      fields: [
        { type: "mrkdwn", text: "*Gate ID:*\ngate-abc123" },
        { type: "mrkdwn", text: "*Quality:*\n87%" }
      ]
    },
    {
      type: "actions",
      elements: [
        {
          type: "button",
          text: { type: "plain_text", text: "Approve" },
          style: "primary",
          value: "approve_gate-abc123"
        },
        {
          type: "button",
          text: { type: "plain_text", text: "Reject" },
          style: "danger",
          value: "reject_gate-abc123"
        }
      ]
    }
  ]
};
```

**Limitations**:
- Webhooks are one-way (outbound only)
- Cannot receive commands without additional setup
- Cannot update existing messages (need Bot Token for that)

### 1.2 Inbound: Slash Commands

**Method**: HTTP POST from Slack to your server
**Dependencies**: HTTP server (Express, Fastify, or native http)
**Setup**: Create Slash Command in Slack App, set Request URL

```typescript
import express from "express";
import crypto from "crypto";

const app = express();
app.use(express.urlencoded({ extended: true }));

// Verify Slack request signature (CRITICAL for security)
function verifySlackRequest(
  body: string,
  timestamp: string,
  signature: string,
  signingSecret: string
): boolean {
  const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 300;

  // Reject old requests (replay attack protection)
  if (parseInt(timestamp) < fiveMinutesAgo) {
    return false;
  }

  // Verify HMAC-SHA256 signature
  const baseString = `v0:${timestamp}:${body}`;
  const computedSignature = "v0=" + crypto
    .createHmac("sha256", signingSecret)
    .update(baseString)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(computedSignature)
  );
}

app.post("/slack/commands", (req, res) => {
  const body = new URLSearchParams(req.body).toString();
  const timestamp = req.headers["x-slack-request-timestamp"] as string;
  const signature = req.headers["x-slack-signature"] as string;

  // Verify request authenticity
  if (!verifySlackRequest(body, timestamp, signature, process.env.AIWG_SLACK_SIGNING_SECRET!)) {
    return res.status(401).send("Unauthorized");
  }

  // Parse command
  const command = req.body.command; // "/aiwg"
  const text = req.body.text;       // "status" or "approve gate-123"
  const userId = req.body.user_id;
  const channelId = req.body.channel_id;

  // Route command
  const response = handleCommand({
    command: text.split(" ")[0],
    args: text.split(" ").slice(1),
    user: userId,
    channel: channelId,
    platform: "slack"
  });

  // Respond within 3 seconds or Slack shows error
  res.json({
    response_type: "in_channel", // or "ephemeral"
    text: response.text,
    blocks: response.blocks
  });
});

app.listen(3141);
```

**Interactive Components** (button clicks):

```typescript
app.post("/slack/interactive", (req, res) => {
  // Slack sends payload as form-encoded JSON string
  const payload = JSON.parse(req.body.payload);

  // Verify signature same as slash commands

  const action = payload.actions[0];
  const value = action.value; // "approve_gate-abc123"

  // Handle button click
  if (value.startsWith("approve_")) {
    const gateId = value.replace("approve_", "");
    approveGate(gateId);
  }

  // Acknowledge within 3 seconds
  res.json({
    text: "Processing approval..."
  });

  // Update original message asynchronously
  updateSlackMessage(payload.response_url, {
    text: "Gate approved ✓",
    replace_original: true
  });
});
```

### 1.3 Alternative: Socket Mode (WebSocket)

**Method**: WebSocket connection to Slack
**Dependencies**: @slack/socket-mode (or implement WebSocket protocol)
**Advantage**: No inbound HTTP server needed
**Disadvantage**: Requires App-level token + Bot token

```typescript
import { SocketModeClient } from "@slack/socket-mode";
import { WebClient } from "@slack/web-api";

const socketClient = new SocketModeClient({
  appToken: process.env.SLACK_APP_TOKEN, // xapp-...
});

const webClient = new WebClient(process.env.SLACK_BOT_TOKEN); // xoxb-...

socketClient.on("slash_commands", async ({ event, ack }) => {
  await ack(); // Acknowledge within 3 seconds

  const { command, text, user_id, channel_id } = event;

  // Handle command
  const response = handleCommand({
    command: text.split(" ")[0],
    args: text.split(" ").slice(1),
    user: user_id,
    channel: channel_id
  });

  // Send response
  await webClient.chat.postMessage({
    channel: channel_id,
    text: response.text,
    blocks: response.blocks
  });
});

await socketClient.start();
```

**Socket Mode Trade-offs**:
- **Pro**: No public URL needed, easier for development
- **Pro**: Works behind firewall
- **Con**: Requires @slack/socket-mode dependency (~500KB)
- **Con**: Requires two tokens (app token + bot token)
- **Con**: More complex error handling (reconnection)

### 1.4 Threading Pattern

Group related messages into threads:

```typescript
// First message in thread
const response = await sendSlackMessage(webhookUrl, {
  text: "Ralph loop started",
  blocks: [...]
});

// Extract thread_ts from response headers or initial message
const threadTs = response.ts;

// Subsequent messages in same thread
await sendSlackMessage(webhookUrl, {
  text: "Iteration 1 complete",
  thread_ts: threadTs,  // Reply to thread
  blocks: [...]
});
```

**Note**: Webhooks cannot extract `ts` (timestamp/message ID). For threading, need Bot Token + `chat.postMessage` API.

### 1.5 Production Recommendations for Slack

**Minimal Setup (outbound only)**:
```bash
AIWG_SLACK_WEBHOOK=https://hooks.slack.com/services/...
```
- Zero dependencies
- Immediate notifications
- No inbound commands

**Full Setup (bidirectional)**:
```bash
AIWG_SLACK_WEBHOOK=https://hooks.slack.com/services/...
AIWG_SLACK_SIGNING_SECRET=abc123...
AIWG_SLACK_BOT_TOKEN=xoxb-...  # For updating messages, threading
```
- HTTP server on port 3141 for slash commands
- Interactive buttons via `/slack/interactive` endpoint
- Message updates and threading via Bot Token

**Alternative (Socket Mode)**:
```bash
AIWG_SLACK_APP_TOKEN=xapp-...
AIWG_SLACK_BOT_TOKEN=xoxb-...
```
- Requires @slack/socket-mode dependency
- No public URL needed
- Good for development/testing

## 2. Discord Bidirectional Patterns

### 2.1 Gateway WebSocket Connection

**Method**: Persistent WebSocket to Discord Gateway
**Dependencies**: discord.js (recommended) or raw WebSocket (complex)
**Reason for discord.js**: Gateway protocol is complex (heartbeat, resume, identify, sharding)

Discord Gateway lifecycle:
```
1. Connect to wss://gateway.discord.gg/?v=10&encoding=json
2. Receive HELLO with heartbeat_interval
3. Send IDENTIFY with token and intents
4. Receive READY with session_id and resume_gateway_url
5. Start heartbeat loop every heartbeat_interval ms
6. Receive events (MESSAGE_CREATE, INTERACTION_CREATE, etc.)
7. Send RESUME on disconnect to avoid replaying events
```

### 2.2 Minimal discord.js Bot

```typescript
import { Client, GatewayIntentBits, Events } from "discord.js";

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent, // Required for message.content
  ],
});

client.once(Events.ClientReady, (c) => {
  console.log(`Discord bot ready as ${c.user.tag}`);
});

// Slash command interaction
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName, options } = interaction;

  if (commandName === "status") {
    const status = getAiwgStatus();
    await interaction.reply({
      content: status.text,
      embeds: [
        {
          title: "AIWG Status",
          description: status.details,
          color: 0x00ff00,
          fields: [
            { name: "Loop ID", value: status.loopId, inline: true },
            { name: "Progress", value: `${status.progress}%`, inline: true },
          ],
        },
      ],
    });
  }
});

// Message command (prefix-based)
client.on(Events.MessageCreate, async (message) => {
  if (message.author.bot) return;
  if (!message.content.startsWith("!aiwg ")) return;

  const args = message.content.slice(6).trim().split(/ +/);
  const command = args.shift()?.toLowerCase();

  if (command === "status") {
    const status = getAiwgStatus();
    await message.reply({
      content: status.text,
      embeds: [...]
    });
  }
});

await client.login(process.env.AIWG_DISCORD_TOKEN);
```

### 2.3 Slash Command Registration

Discord requires slash commands to be registered via REST API:

```typescript
import { REST, Routes, SlashCommandBuilder } from "discord.js";

const commands = [
  new SlashCommandBuilder()
    .setName("status")
    .setDescription("Show AIWG project status"),

  new SlashCommandBuilder()
    .setName("approve")
    .setDescription("Approve a HITL gate")
    .addStringOption(option =>
      option.setName("gate_id")
        .setDescription("The gate ID to approve")
        .setRequired(true)
    ),
];

const rest = new REST({ version: "10" }).setToken(process.env.AIWG_DISCORD_TOKEN!);

// Register globally (takes up to 1 hour to propagate)
await rest.put(
  Routes.applicationCommands(clientId),
  { body: commands.map(c => c.toJSON()) }
);

// OR register for specific guild (instant, for testing)
await rest.put(
  Routes.applicationGuildCommands(clientId, guildId),
  { body: commands.map(c => c.toJSON()) }
);
```

### 2.4 Interactive Buttons

```typescript
import { ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

const row = new ActionRowBuilder<ButtonBuilder>()
  .addComponents(
    new ButtonBuilder()
      .setCustomId("approve_gate-abc123")
      .setLabel("Approve")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId("reject_gate-abc123")
      .setLabel("Reject")
      .setStyle(ButtonStyle.Danger)
  );

await channel.send({
  content: "HITL Gate Pending",
  embeds: [...],
  components: [row]
});

// Handle button click
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isButton()) return;

  const [action, gateId] = interaction.customId.split("_");

  if (action === "approve") {
    await approveGate(gateId);
    await interaction.update({
      content: "Gate approved ✓",
      components: [] // Remove buttons
    });
  }
});
```

### 2.5 Threading Pattern

```typescript
// Create thread from message
const message = await channel.send({
  content: "Ralph loop started"
});

const thread = await message.startThread({
  name: `Ralph Loop ${loopId}`,
  autoArchiveDuration: 60 // Minutes
});

// Send updates to thread
await thread.send("Iteration 1 complete");
await thread.send("Iteration 2 complete");
```

### 2.6 Reconnection and Resume

discord.js handles this automatically, but the pattern:

```typescript
// On disconnect, Gateway sends RESUME opcode
// Client responds with RESUME payload containing:
{
  op: 6,
  d: {
    token: "Bot ...",
    session_id: savedSessionId,
    seq: lastSequenceNumber
  }
}

// Gateway replays missed events since seq
// Client resumes without re-identifying
```

### 2.7 Rate Limits

Discord enforces strict rate limits:

| Endpoint | Limit |
|----------|-------|
| Message send | 5/5s per channel |
| Global | 50/1s |
| Slash command response | 3s to `interaction.reply()` or `interaction.deferReply()` |

**Mitigation**:
- Queue messages, send at most 1/s per channel
- Defer slash command responses immediately, then edit

```typescript
await interaction.deferReply(); // Buys 15 minutes

// Do slow work...
const result = await longRunningTask();

await interaction.editReply({
  content: result.text,
  embeds: [...]
});
```

### 2.8 Production Recommendations for Discord

**Required**:
```bash
AIWG_DISCORD_TOKEN=MTk...
AIWG_DISCORD_CLIENT_ID=123456789  # For slash command registration
```

**Intents needed**:
- `Guilds` - Required for all bots
- `GuildMessages` - Required for message events
- `MessageContent` - Privileged, required for `message.content` (prefix commands)

**Dependencies**:
```json
{
  "dependencies": {
    "discord.js": "^14.14.1"
  }
}
```

**Lazy loading pattern**:
```typescript
// Only import if AIWG_DISCORD_TOKEN is set
if (process.env.AIWG_DISCORD_TOKEN) {
  const { DiscordAdapter } = await import("./adapters/discord.js");
  const adapter = new DiscordAdapter();
  await adapter.initialize();
}
```

## 3. Telegram Bidirectional Patterns

### 3.1 Long Polling (Recommended for Simplicity)

**Method**: HTTPS GET to `getUpdates` API in loop
**Dependencies**: None (native fetch)
**Advantage**: No public URL needed, zero infrastructure

```typescript
interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: { id: number; username: string };
    chat: { id: number; type: string };
    text?: string;
  };
  callback_query?: {
    id: string;
    from: { id: number };
    message: { message_id: number; chat: { id: number } };
    data: string; // Button callback data
  };
}

class TelegramAdapter {
  private baseUrl: string;
  private offset: number = 0;
  private pollingInterval: NodeJS.Timeout | null = null;

  constructor(token: string) {
    this.baseUrl = `https://api.telegram.org/bot${token}`;
  }

  async startPolling(intervalMs: number = 3000) {
    this.pollingInterval = setInterval(async () => {
      try {
        await this.poll();
      } catch (error) {
        console.error("[Telegram] Polling error:", error.message);
      }
    }, intervalMs);
  }

  async poll() {
    const response = await fetch(`${this.baseUrl}/getUpdates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        offset: this.offset,
        timeout: 30, // Long polling timeout (seconds)
        allowed_updates: ["message", "callback_query"]
      })
    });

    const data = await response.json();

    if (!data.ok) {
      throw new Error(`Telegram API error: ${data.description}`);
    }

    const updates: TelegramUpdate[] = data.result;

    for (const update of updates) {
      await this.handleUpdate(update);
      this.offset = update.update_id + 1; // Move offset forward
    }
  }

  async handleUpdate(update: TelegramUpdate) {
    // Handle text message
    if (update.message?.text) {
      const text = update.message.text;
      const chatId = update.message.chat.id;

      // Bot commands start with /
      if (text.startsWith("/status")) {
        const status = getAiwgStatus();
        await this.sendMessage(chatId, status.text);
      }

      if (text.startsWith("/approve ")) {
        const gateId = text.split(" ")[1];
        await approveGate(gateId);
        await this.sendMessage(chatId, "Gate approved ✓");
      }
    }

    // Handle button callback
    if (update.callback_query) {
      const data = update.callback_query.data;
      const chatId = update.callback_query.message!.chat.id;
      const messageId = update.callback_query.message!.message_id;

      if (data.startsWith("approve_")) {
        const gateId = data.replace("approve_", "");
        await approveGate(gateId);

        // Answer callback query (removes loading state)
        await fetch(`${this.baseUrl}/answerCallbackQuery`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            callback_query_id: update.callback_query.id,
            text: "Approved!"
          })
        });

        // Update message
        await this.editMessage(chatId, messageId, "Gate approved ✓");
      }
    }
  }

  async sendMessage(chatId: number, text: string, options?: {
    reply_to_message_id?: number;
    reply_markup?: any;
  }) {
    const response = await fetch(`${this.baseUrl}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: "Markdown",
        ...options
      })
    });

    return response.json();
  }

  async editMessage(chatId: number, messageId: number, text: string) {
    await fetch(`${this.baseUrl}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        message_id: messageId,
        text: text,
        parse_mode: "Markdown"
      })
    });
  }

  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }
}
```

### 3.2 Inline Keyboards (Interactive Buttons)

```typescript
await telegram.sendMessage(chatId, "HITL Gate Pending", {
  reply_markup: {
    inline_keyboard: [
      [
        { text: "✅ Approve", callback_data: "approve_gate-abc123" },
        { text: "❌ Reject", callback_data: "reject_gate-abc123" }
      ],
      [
        { text: "📋 View Details", url: "https://..." }
      ]
    ]
  }
});
```

**Callback data limit**: 64 bytes max. For long data, use short IDs and look up details server-side.

### 3.3 Threading Pattern

Telegram uses `reply_to_message_id`:

```typescript
// Initial message
const response = await telegram.sendMessage(chatId, "Ralph loop started");
const threadId = response.result.message_id;

// Replies
await telegram.sendMessage(chatId, "Iteration 1 complete", {
  reply_to_message_id: threadId
});

await telegram.sendMessage(chatId, "Iteration 2 complete", {
  reply_to_message_id: threadId
});
```

### 3.4 Webhook Alternative

**Method**: Telegram POSTs to your HTTPS endpoint on each update
**Advantage**: Real-time, no polling overhead
**Disadvantage**: Requires public HTTPS URL

```typescript
import express from "express";

const app = express();
app.use(express.json());

app.post("/telegram/webhook", (req, res) => {
  const update: TelegramUpdate = req.body;

  handleUpdate(update);

  res.sendStatus(200); // Acknowledge
});

app.listen(443); // Telegram requires 443, 80, 88, or 8443

// Set webhook URL
await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    url: "https://yourdomain.com/telegram/webhook"
  })
});
```

**Security**: Verify requests came from Telegram:

```typescript
import crypto from "crypto";

function verifyTelegramWebhook(req, token) {
  const secret = crypto.createHash("sha256").update(token).digest();
  const checkString = req.headers["x-telegram-bot-api-secret-token"];

  // Compare or use IP allow-list: 149.154.160.0/20, 91.108.4.0/22
}
```

### 3.5 Rate Limits

Telegram limits:
- 30 messages/second across all chats
- 20 messages/minute per chat
- No burst limits (unlike Discord)

**Mitigation**: Queue messages, rate-limit per chat.

### 3.6 Production Recommendations for Telegram

**Minimal Setup (long polling)**:
```bash
AIWG_TELEGRAM_TOKEN=123456:ABC-DEF...
AIWG_TELEGRAM_CHAT_IDS=-1001234567890  # Comma-separated
```
- Zero dependencies
- No public URL needed
- Polling interval: 3-5 seconds

**Webhook Setup**:
```bash
AIWG_TELEGRAM_TOKEN=123456:ABC-DEF...
AIWG_TELEGRAM_WEBHOOK_URL=https://yourdomain.com/telegram/webhook
```
- Requires HTTPS with valid cert
- Lower latency than polling
- Telegram delivers updates in real-time

## 4. Unified Patterns

### 4.1 Platform Adapter Interface

```typescript
interface MessagingAdapter {
  // Identity
  readonly platform: "slack" | "discord" | "telegram";

  // Lifecycle
  initialize(): Promise<void>;
  shutdown(): Promise<void>;

  // Outbound
  send(message: AiwgMessage, channel: string): Promise<MessageResult>;
  update(messageId: string, message: AiwgMessage): Promise<void>;

  // Inbound
  onCommand(handler: CommandHandler): void;

  // Status
  isConnected(): boolean;
  getStatus(): AdapterStatus;
}

interface AiwgMessage {
  title: string;
  body: string;
  severity: "info" | "warning" | "critical";
  fields: Array<{ label: string; value: string; inline: boolean }>;
  actions?: Array<{
    id: string;
    label: string;
    style: "primary" | "danger" | "default";
    command: string;
  }>;
  threadId?: string;
  codeBlock?: string;
}

interface ParsedCommand {
  command: string;
  args: string[];
  user: string;
  channel: string;
  platform: string;
  raw: string;
}

type CommandHandler = (command: ParsedCommand) => Promise<CommandResponse>;

interface CommandResponse {
  text: string;
  ephemeral: boolean;
  message?: AiwgMessage;
}
```

### 4.2 Command Router

```typescript
class CommandRouter {
  private handlers = new Map<string, CommandHandler>();

  register(command: string, handler: CommandHandler) {
    this.handlers.set(command, handler);
  }

  async route(command: ParsedCommand): Promise<CommandResponse> {
    // Validate channel
    if (!this.isChannelAllowed(command.channel, command.platform)) {
      return {
        text: "Command not allowed in this channel",
        ephemeral: true
      };
    }

    // Validate user for write commands
    if (["approve", "reject"].includes(command.command)) {
      if (!this.isUserApprover(command.user, command.platform)) {
        return {
          text: "You are not authorized to approve/reject gates",
          ephemeral: true
        };
      }
    }

    // Route to handler
    const handler = this.handlers.get(command.command);
    if (!handler) {
      return {
        text: `Unknown command: ${command.command}. Try 'help'`,
        ephemeral: true
      };
    }

    return handler(command);
  }

  private isChannelAllowed(channel: string, platform: string): boolean {
    const allowed = process.env[`AIWG_${platform.toUpperCase()}_CHANNELS`]?.split(",") || [];
    return allowed.includes(channel);
  }

  private isUserApprover(user: string, platform: string): boolean {
    const approvers = process.env.AIWG_APPROVERS?.split(",") || [];
    const prefixedUser = `${platform}:${user}`;
    return approvers.includes(user) || approvers.includes(prefixedUser);
  }
}

// Usage
const router = new CommandRouter();

router.register("status", async (cmd) => {
  const status = getAiwgStatus();
  return {
    text: status.summary,
    ephemeral: false,
    message: {
      title: "AIWG Status",
      body: status.details,
      severity: "info",
      fields: [
        { label: "Loop ID", value: status.loopId, inline: true },
        { label: "Progress", value: `${status.progress}%`, inline: true }
      ]
    }
  };
});

router.register("approve", async (cmd) => {
  const gateId = cmd.args[0];
  if (!gateId) {
    return { text: "Usage: approve <gate-id>", ephemeral: true };
  }

  await approveGate(gateId);
  return {
    text: `Gate ${gateId} approved ✓`,
    ephemeral: false
  };
});
```

### 4.3 Message Formatting Abstraction

```typescript
class MessageFormatter {
  static toSlackBlocks(message: AiwgMessage): any[] {
    const blocks: any[] = [];

    // Header
    blocks.push({
      type: "header",
      text: { type: "plain_text", text: message.title }
    });

    // Body
    if (message.body) {
      blocks.push({
        type: "section",
        text: { type: "mrkdwn", text: message.body }
      });
    }

    // Fields
    if (message.fields.length > 0) {
      blocks.push({
        type: "section",
        fields: message.fields.map(f => ({
          type: "mrkdwn",
          text: `*${f.label}*\n${f.value}`
        }))
      });
    }

    // Code block
    if (message.codeBlock) {
      blocks.push({
        type: "section",
        text: { type: "mrkdwn", text: `\`\`\`\n${message.codeBlock}\n\`\`\`` }
      });
    }

    // Actions
    if (message.actions && message.actions.length > 0) {
      blocks.push({
        type: "actions",
        elements: message.actions.map(a => ({
          type: "button",
          text: { type: "plain_text", text: a.label },
          value: a.id,
          style: a.style === "primary" ? "primary" : a.style === "danger" ? "danger" : undefined
        }))
      });
    }

    return blocks;
  }

  static toDiscordEmbed(message: AiwgMessage): any {
    const color = message.severity === "critical" ? 0xff0000
      : message.severity === "warning" ? 0xffaa00
      : 0x00ff00;

    return {
      title: message.title,
      description: message.body,
      color: color,
      fields: message.fields.map(f => ({
        name: f.label,
        value: f.value,
        inline: f.inline
      })),
      timestamp: new Date().toISOString()
    };
  }

  static toTelegramMarkdown(message: AiwgMessage): string {
    let text = `**${message.title}**\n\n`;

    if (message.body) {
      text += `${message.body}\n\n`;
    }

    for (const field of message.fields) {
      text += `**${field.label}**: ${field.value}\n`;
    }

    if (message.codeBlock) {
      text += `\n\`\`\`\n${message.codeBlock}\n\`\`\`\n`;
    }

    return text;
  }

  static toTelegramKeyboard(message: AiwgMessage): any {
    if (!message.actions || message.actions.length === 0) {
      return undefined;
    }

    return {
      inline_keyboard: [
        message.actions.map(a => ({
          text: a.label,
          callback_data: a.id
        }))
      ]
    };
  }
}
```

### 4.4 Connection Health Monitoring

```typescript
class ConnectionHealthMonitor {
  private adapters: Map<string, MessagingAdapter>;
  private reconnectAttempts = new Map<string, number>();
  private maxReconnectAttempts = 5;

  async checkHealth() {
    const health = {
      overall: "healthy" as "healthy" | "degraded" | "critical",
      adapters: {} as Record<string, AdapterStatus>
    };

    for (const [platform, adapter] of this.adapters) {
      const status = adapter.getStatus();
      health.adapters[platform] = status;

      if (!status.connected) {
        health.overall = "degraded";

        // Attempt reconnection
        await this.attemptReconnect(platform, adapter);
      }
    }

    return health;
  }

  private async attemptReconnect(platform: string, adapter: MessagingAdapter) {
    const attempts = this.reconnectAttempts.get(platform) || 0;

    if (attempts >= this.maxReconnectAttempts) {
      console.error(`[Messaging] ${platform} max reconnect attempts reached`);
      return;
    }

    try {
      console.log(`[Messaging] Attempting to reconnect ${platform} (attempt ${attempts + 1})`);
      await adapter.initialize();
      this.reconnectAttempts.set(platform, 0); // Reset on success
      console.log(`[Messaging] ${platform} reconnected successfully`);
    } catch (error) {
      this.reconnectAttempts.set(platform, attempts + 1);
      console.error(`[Messaging] ${platform} reconnect failed:`, error.message);

      // Exponential backoff
      const backoffMs = Math.min(1000 * Math.pow(2, attempts), 30000);
      setTimeout(() => this.attemptReconnect(platform, adapter), backoffMs);
    }
  }
}
```

### 4.5 Graceful Degradation

```typescript
class AdapterRegistry {
  private adapters = new Map<string, MessagingAdapter>();

  async broadcast(message: AiwgMessage): Promise<void> {
    const results = await Promise.allSettled(
      Array.from(this.adapters.entries()).map(([platform, adapter]) =>
        adapter.send(message, this.getDefaultChannel(platform))
          .catch(error => {
            console.error(`[Messaging] ${platform} send failed:`, error.message);
            // Log but don't throw - failure on one platform doesn't block others
            return null;
          })
      )
    );

    const failures = results.filter(r => r.status === "rejected").length;

    if (failures === this.adapters.size) {
      // All platforms failed - this is critical
      console.error("[Messaging] All platforms failed to send message");
      // Fall back to file logging
      await this.logToFile(message);
    }
  }

  private async logToFile(message: AiwgMessage) {
    const logPath = path.join(projectRoot, ".aiwg", "messaging", "failed-messages.log");
    await fs.appendFile(logPath, JSON.stringify({
      timestamp: new Date().toISOString(),
      message
    }) + "\n");
  }
}
```

## 5. Reference Projects

### 5.1 Hubot Patterns

Hubot (github.com/hubotio/hubot) uses adapter pattern:

**Key insights**:
- Adapters implement `send()`, `reply()`, `receive()` interface
- Middleware pipeline for message processing
- Brain (persistence) separate from adapters
- Scripts register listeners via regex matching

**Minimal adapter interface**:
```typescript
interface Adapter {
  send(envelope: Envelope, ...strings: string[]): void;
  reply(envelope: Envelope, ...strings: string[]): void;
  run(): void;
  close(): void;
}

interface Envelope {
  room: string;
  user: User;
  message: Message;
}
```

**Pattern for AIWG**: Hubot's adapter interface is sound. We can adopt similar `send()`/`reply()` distinction.

### 5.2 Botkit Patterns

Botkit (github.com/howdyai/botkit) uses conversation-first design:

**Key insights**:
- Platform-specific bot instances (SlackBot, DiscordBot)
- `hears()` pattern-matching for commands
- `ask()` for conversational flows (not needed for AIWG)
- Middleware for message processing

**Not applicable to AIWG**: Botkit is conversation-AI focused, too heavy for structured command/notification.

### 5.3 Matrix Bridge Patterns

Matrix bridges (github.com/matrix-org/matrix-appservice-bridge) translate between protocols:

**Key insights**:
- Canonical message format that translates both ways
- Intent-based API (each bridge user has an "intent" to send as)
- State tracking for rooms/channels
- Retry queue for failed messages

**Pattern for AIWG**: The canonical message format (`AiwgMessage`) mirrors Matrix's approach. Retry queue is useful for production.

## 6. Production Patterns Summary

### 6.1 Dependency Minimization

| Platform | Native Impl Possible? | Recommended Approach |
|----------|----------------------|---------------------|
| Slack | Yes | Native for webhooks, optional Express for inbound |
| Discord | No (complex protocol) | discord.js required |
| Telegram | Yes | Native for both polling and webhooks |

### 6.2 Reconnection Strategies

**Discord (WebSocket)**:
- Automatic reconnect via discord.js
- Exponential backoff on failure
- Session resume to avoid event replay

**Telegram (Long Polling)**:
- Retry on network error with backoff
- Track `offset` to avoid duplicate updates
- No session state to maintain

**Slack (HTTP)**:
- Webhooks: retry with exponential backoff
- Slash commands: server availability is our responsibility

### 6.3 Rate Limiting

Implement token bucket per platform:

```typescript
class RateLimiter {
  private buckets = new Map<string, TokenBucket>();

  async checkLimit(key: string, limit: number, windowMs: number): Promise<boolean> {
    let bucket = this.buckets.get(key);
    if (!bucket) {
      bucket = new TokenBucket(limit, windowMs);
      this.buckets.set(key, bucket);
    }

    return bucket.tryConsume();
  }
}

class TokenBucket {
  private tokens: number;
  private lastRefill: number;

  constructor(
    private capacity: number,
    private refillPeriodMs: number
  ) {
    this.tokens = capacity;
    this.lastRefill = Date.now();
  }

  tryConsume(): boolean {
    this.refill();

    if (this.tokens > 0) {
      this.tokens--;
      return true;
    }

    return false;
  }

  private refill() {
    const now = Date.now();
    const elapsed = now - this.lastRefill;
    const tokensToAdd = Math.floor((elapsed / this.refillPeriodMs) * this.capacity);

    if (tokensToAdd > 0) {
      this.tokens = Math.min(this.capacity, this.tokens + tokensToAdd);
      this.lastRefill = now;
    }
  }
}

// Usage per platform
const rateLimiter = new RateLimiter();

// Discord: 5 messages per 5 seconds per channel
const canSend = await rateLimiter.checkLimit(`discord:${channelId}`, 5, 5000);

// Telegram: 20 messages per minute per chat
const canSend = await rateLimiter.checkLimit(`telegram:${chatId}`, 20, 60000);
```

### 6.4 Thread Context Management

Maintain thread mappings:

```typescript
class ThreadManager {
  private threads = new Map<string, string>(); // loopId -> threadId

  getOrCreateThread(loopId: string, platform: string, channel: string): string | undefined {
    const key = `${platform}:${loopId}`;
    return this.threads.get(key);
  }

  setThread(loopId: string, platform: string, threadId: string) {
    const key = `${platform}:${loopId}`;
    this.threads.set(key, threadId);
  }

  clearThread(loopId: string, platform: string) {
    const key = `${platform}:${loopId}`;
    this.threads.delete(key);
  }
}

// Usage
const threadManager = new ThreadManager();

// First message creates thread
const messageId = await adapter.send(message, channel);
threadManager.setThread(loopId, "slack", messageId);

// Subsequent messages use thread
const threadId = threadManager.getOrCreateThread(loopId, "slack", channel);
await adapter.send(message, channel, { threadId });
```

## 7. Implementation Checklist

### Phase 1: Slack Outbound (Minimal)
- [x] Incoming Webhook implementation (native fetch)
- [x] AiwgMessage → Slack Block Kit formatter
- [x] Ralph event → Slack notification
- [x] Error handling and retry
- [x] Documentation and examples

### Phase 2: Slack Inbound
- [ ] HTTP server for slash commands
- [ ] Signature verification
- [ ] Command router implementation
- [ ] Interactive component handler (buttons)
- [ ] Threading support (requires Bot Token)

### Phase 3: Discord
- [ ] discord.js integration with lazy loading
- [ ] Slash command registration
- [ ] Gateway connection and event handling
- [ ] Button component support
- [ ] Thread creation and management
- [ ] Reconnection logic

### Phase 4: Telegram
- [ ] Long polling implementation (native)
- [ ] Inline keyboard support
- [ ] Bot command handling
- [ ] Reply-to threading
- [ ] Webhook mode (alternative)

### Phase 5: Unified Infrastructure
- [ ] Event bus implementation
- [ ] Adapter registry with lazy loading
- [ ] Rate limiting per platform
- [ ] Health monitoring and reconnection
- [ ] Configuration via aiwg.yml

## References

- Slack API: https://api.slack.com/messaging
- Discord API: https://discord.com/developers/docs/
- Telegram Bot API: https://core.telegram.org/bots/api
- Hubot: https://github.com/hubotio/hubot
- Matrix Bridges: https://github.com/matrix-org/matrix-appservice-bridge
- @.aiwg/architecture/adrs/ADR-messaging-bot-mode.md
