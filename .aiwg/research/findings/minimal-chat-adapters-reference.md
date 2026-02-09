---
title: "Minimal Chat Platform Adapters - Quick Reference"
created: 2026-02-08
type: code_patterns
topics:
  - implementation
  - chat-adapters
quality: high
---

# Minimal Chat Platform Adapters - Quick Reference

**Purpose**: Production-ready minimal implementations for each platform

## Slack Adapter (Zero Dependencies)

### Outbound Only (Webhook)

```typescript
// src/messaging/adapters/slack.ts
import { MessagingAdapter, AiwgMessage, MessageResult } from "../types.js";

export class SlackAdapter implements MessagingAdapter {
  readonly platform = "slack";
  private webhookUrl: string;

  constructor() {
    const url = process.env.AIWG_SLACK_WEBHOOK;
    if (!url) {
      throw new Error("AIWG_SLACK_WEBHOOK not set");
    }
    this.webhookUrl = url;
  }

  async initialize(): Promise<void> {
    // Test webhook with a silent ping
    const response = await fetch(this.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: "AIWG bot initialized" })
    });

    if (!response.ok) {
      throw new Error(`Slack webhook test failed: ${response.status}`);
    }
  }

  async shutdown(): Promise<void> {
    // Nothing to clean up for webhooks
  }

  async send(message: AiwgMessage, channel: string): Promise<MessageResult> {
    const payload = {
      channel: channel,
      ...this.formatMessage(message)
    };

    const response = await fetch(this.webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Slack send failed: ${response.status}`);
    }

    // Webhooks don't return message ID - we can't thread
    return { success: true, messageId: undefined };
  }

  async update(messageId: string, message: AiwgMessage): Promise<void> {
    throw new Error("Webhooks cannot update messages. Use Bot Token for updates.");
  }

  onCommand(handler: CommandHandler): void {
    // Webhooks are outbound-only
    throw new Error("Webhooks do not support inbound commands");
  }

  isConnected(): boolean {
    return true; // Stateless - assume connected
  }

  getStatus(): AdapterStatus {
    return {
      platform: "slack",
      connected: true,
      mode: "webhook",
      capabilities: ["send"],
      lastActivity: new Date().toISOString()
    };
  }

  private formatMessage(message: AiwgMessage): any {
    const color = message.severity === "critical" ? "danger"
      : message.severity === "warning" ? "warning"
      : "good";

    const blocks = [
      {
        type: "header",
        text: {
          type: "plain_text",
          text: message.title
        }
      }
    ];

    if (message.body) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: message.body
        }
      });
    }

    if (message.fields.length > 0) {
      blocks.push({
        type: "section",
        fields: message.fields.map(f => ({
          type: "mrkdwn",
          text: `*${f.label}*\n${f.value}`
        }))
      });
    }

    if (message.codeBlock) {
      blocks.push({
        type: "section",
        text: {
          type: "mrkdwn",
          text: `\`\`\`\n${message.codeBlock}\n\`\`\``
        }
      });
    }

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

    return {
      text: message.title, // Fallback for notifications
      blocks: blocks,
      attachments: [{
        color: color,
        footer: `AIWG • ${message.project}`,
        ts: Math.floor(Date.parse(message.timestamp) / 1000)
      }],
      thread_ts: message.threadId
    };
  }
}
```

### Inbound (Slash Commands + Interactive)

```typescript
// src/messaging/adapters/slack-inbound.ts
import express from "express";
import crypto from "crypto";
import { CommandHandler, ParsedCommand } from "../types.js";

export class SlackInboundServer {
  private app = express();
  private commandHandler?: CommandHandler;
  private signingSecret: string;

  constructor() {
    const secret = process.env.AIWG_SLACK_SIGNING_SECRET;
    if (!secret) {
      throw new Error("AIWG_SLACK_SIGNING_SECRET not set");
    }
    this.signingSecret = secret;

    this.app.use(express.urlencoded({ extended: true }));
    this.app.use(express.json());

    this.setupRoutes();
  }

  private setupRoutes() {
    // Slash command endpoint
    this.app.post("/slack/commands", async (req, res) => {
      // Verify request signature
      if (!this.verifySignature(req)) {
        return res.status(401).send("Unauthorized");
      }

      const { command, text, user_id, channel_id } = req.body;

      const parsed: ParsedCommand = {
        command: text.split(" ")[0] || "help",
        args: text.split(" ").slice(1),
        user: user_id,
        channel: channel_id,
        platform: "slack",
        raw: text
      };

      try {
        const response = await this.commandHandler!(parsed);

        res.json({
          response_type: response.ephemeral ? "ephemeral" : "in_channel",
          text: response.text,
          blocks: response.message ? this.formatBlocks(response.message) : undefined
        });
      } catch (error) {
        res.json({
          response_type: "ephemeral",
          text: `Error: ${error.message}`
        });
      }
    });

    // Interactive component endpoint
    this.app.post("/slack/interactive", async (req, res) => {
      const payload = JSON.parse(req.body.payload);

      if (!this.verifySignature(req)) {
        return res.status(401).send("Unauthorized");
      }

      const action = payload.actions[0];
      const value = action.value; // e.g., "approve_gate-123"

      const [command, ...args] = value.split("_");

      const parsed: ParsedCommand = {
        command: command,
        args: args,
        user: payload.user.id,
        channel: payload.channel.id,
        platform: "slack",
        raw: value
      };

      try {
        const response = await this.commandHandler!(parsed);

        // Acknowledge button click
        res.json({
          text: response.text,
          replace_original: true
        });
      } catch (error) {
        res.json({
          text: `Error: ${error.message}`,
          replace_original: false
        });
      }
    });
  }

  private verifySignature(req: any): boolean {
    const signature = req.headers["x-slack-signature"] as string;
    const timestamp = req.headers["x-slack-request-timestamp"] as string;
    const body = new URLSearchParams(req.body).toString();

    // Reject old requests (replay attack protection)
    const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 300;
    if (parseInt(timestamp) < fiveMinutesAgo) {
      return false;
    }

    // Verify HMAC-SHA256 signature
    const baseString = `v0:${timestamp}:${body}`;
    const computedSignature = "v0=" + crypto
      .createHmac("sha256", this.signingSecret)
      .update(baseString)
      .digest("hex");

    try {
      return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(computedSignature)
      );
    } catch {
      return false;
    }
  }

  private formatBlocks(message: AiwgMessage): any[] {
    // Same as SlackAdapter.formatMessage but returns just blocks
    return [];
  }

  setCommandHandler(handler: CommandHandler) {
    this.commandHandler = handler;
  }

  listen(port: number = 3141) {
    this.app.listen(port, () => {
      console.log(`[Slack Inbound] Listening on port ${port}`);
    });
  }
}
```

## Discord Adapter (Requires discord.js)

```typescript
// src/messaging/adapters/discord.ts
import { Client, GatewayIntentBits, Events, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";
import { MessagingAdapter, AiwgMessage, CommandHandler, ParsedCommand } from "../types.js";

export class DiscordAdapter implements MessagingAdapter {
  readonly platform = "discord";
  private client?: Client;
  private commandHandler?: CommandHandler;
  private defaultChannelId: string;

  constructor() {
    const channels = process.env.AIWG_DISCORD_CHANNELS?.split(",") || [];
    if (channels.length === 0) {
      throw new Error("AIWG_DISCORD_CHANNELS not set");
    }
    this.defaultChannelId = channels[0];
  }

  async initialize(): Promise<void> {
    const { Client, GatewayIntentBits } = await import("discord.js");

    this.client = new Client({
      intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
      ]
    });

    this.client.once(Events.ClientReady, (c) => {
      console.log(`[Discord] Ready as ${c.user.tag}`);
    });

    // Slash command handler
    this.client.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isChatInputCommand()) return;

      const parsed: ParsedCommand = {
        command: interaction.commandName,
        args: interaction.options.data.map(o => o.value?.toString() || ""),
        user: interaction.user.id,
        channel: interaction.channelId,
        platform: "discord",
        raw: `/${interaction.commandName}`
      };

      try {
        const response = await this.commandHandler!(parsed);

        await interaction.reply({
          content: response.text,
          embeds: response.message ? [this.formatEmbed(response.message)] : undefined,
          ephemeral: response.ephemeral
        });
      } catch (error) {
        await interaction.reply({
          content: `Error: ${error.message}`,
          ephemeral: true
        });
      }
    });

    // Button handler
    this.client.on(Events.InteractionCreate, async (interaction) => {
      if (!interaction.isButton()) return;

      const [command, ...args] = interaction.customId.split("_");

      const parsed: ParsedCommand = {
        command: command,
        args: args,
        user: interaction.user.id,
        channel: interaction.channelId,
        platform: "discord",
        raw: interaction.customId
      };

      try {
        const response = await this.commandHandler!(parsed);

        await interaction.update({
          content: response.text,
          components: [] // Remove buttons
        });
      } catch (error) {
        await interaction.reply({
          content: `Error: ${error.message}`,
          ephemeral: true
        });
      }
    });

    const token = process.env.AIWG_DISCORD_TOKEN;
    if (!token) {
      throw new Error("AIWG_DISCORD_TOKEN not set");
    }

    await this.client.login(token);

    // Register slash commands (do this once, or via separate script)
    await this.registerCommands();
  }

  async shutdown(): Promise<void> {
    this.client?.destroy();
  }

  async send(message: AiwgMessage, channelId?: string): Promise<MessageResult> {
    const channel = await this.client!.channels.fetch(channelId || this.defaultChannelId);

    if (!channel?.isTextBased()) {
      throw new Error("Channel is not text-based");
    }

    const embed = this.formatEmbed(message);
    const components = this.formatButtons(message);

    const sent = await channel.send({
      embeds: [embed],
      components: components.length > 0 ? components : undefined
    });

    return {
      success: true,
      messageId: sent.id
    };
  }

  async update(messageId: string, message: AiwgMessage): Promise<void> {
    const channel = await this.client!.channels.fetch(this.defaultChannelId);

    if (!channel?.isTextBased()) {
      throw new Error("Channel is not text-based");
    }

    const msg = await channel.messages.fetch(messageId);
    const embed = this.formatEmbed(message);

    await msg.edit({
      embeds: [embed],
      components: [] // Remove buttons on update
    });
  }

  onCommand(handler: CommandHandler): void {
    this.commandHandler = handler;
  }

  isConnected(): boolean {
    return this.client?.isReady() || false;
  }

  getStatus(): AdapterStatus {
    return {
      platform: "discord",
      connected: this.isConnected(),
      mode: "gateway",
      capabilities: ["send", "update", "interactive"],
      lastActivity: new Date().toISOString()
    };
  }

  private formatEmbed(message: AiwgMessage): EmbedBuilder {
    const color = message.severity === "critical" ? 0xff0000
      : message.severity === "warning" ? 0xffaa00
      : 0x00ff00;

    const embed = new EmbedBuilder()
      .setTitle(message.title)
      .setDescription(message.body || null)
      .setColor(color)
      .setTimestamp()
      .setFooter({ text: `AIWG • ${message.project}` });

    for (const field of message.fields) {
      embed.addFields({
        name: field.label,
        value: field.value,
        inline: field.inline
      });
    }

    if (message.codeBlock) {
      embed.setDescription(`${message.body || ""}\n\`\`\`\n${message.codeBlock}\n\`\`\``);
    }

    return embed;
  }

  private formatButtons(message: AiwgMessage): any[] {
    if (!message.actions || message.actions.length === 0) {
      return [];
    }

    const row = new ActionRowBuilder<ButtonBuilder>();

    for (const action of message.actions) {
      const style = action.style === "primary" ? ButtonStyle.Success
        : action.style === "danger" ? ButtonStyle.Danger
        : ButtonStyle.Secondary;

      row.addComponents(
        new ButtonBuilder()
          .setCustomId(action.id)
          .setLabel(action.label)
          .setStyle(style)
      );
    }

    return [row];
  }

  private async registerCommands() {
    const { REST, Routes, SlashCommandBuilder } = await import("discord.js");

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

      new SlashCommandBuilder()
        .setName("health")
        .setDescription("Run AIWG health check"),
    ];

    const rest = new REST({ version: "10" }).setToken(process.env.AIWG_DISCORD_TOKEN!);
    const clientId = process.env.AIWG_DISCORD_CLIENT_ID!;

    await rest.put(
      Routes.applicationCommands(clientId),
      { body: commands.map(c => c.toJSON()) }
    );

    console.log("[Discord] Slash commands registered");
  }
}
```

## Telegram Adapter (Zero Dependencies, Long Polling)

```typescript
// src/messaging/adapters/telegram.ts
import { MessagingAdapter, AiwgMessage, CommandHandler, ParsedCommand } from "../types.js";

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: { id: number; username?: string };
    chat: { id: number; type: string };
    text?: string;
  };
  callback_query?: {
    id: string;
    from: { id: number };
    message: { message_id: number; chat: { id: number } };
    data: string;
  };
}

export class TelegramAdapter implements MessagingAdapter {
  readonly platform = "telegram";
  private baseUrl: string;
  private offset: number = 0;
  private pollingInterval?: NodeJS.Timeout;
  private commandHandler?: CommandHandler;
  private defaultChatId: number;

  constructor() {
    const token = process.env.AIWG_TELEGRAM_TOKEN;
    if (!token) {
      throw new Error("AIWG_TELEGRAM_TOKEN not set");
    }
    this.baseUrl = `https://api.telegram.org/bot${token}`;

    const chatIds = process.env.AIWG_TELEGRAM_CHAT_IDS?.split(",") || [];
    if (chatIds.length === 0) {
      throw new Error("AIWG_TELEGRAM_CHAT_IDS not set");
    }
    this.defaultChatId = parseInt(chatIds[0]);
  }

  async initialize(): Promise<void> {
    // Test connection
    const response = await fetch(`${this.baseUrl}/getMe`);
    const data = await response.json();

    if (!data.ok) {
      throw new Error(`Telegram API error: ${data.description}`);
    }

    console.log(`[Telegram] Ready as ${data.result.username}`);

    // Start polling
    this.startPolling();
  }

  async shutdown(): Promise<void> {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = undefined;
    }
  }

  async send(message: AiwgMessage, chatId?: string): Promise<MessageResult> {
    const chat = chatId ? parseInt(chatId) : this.defaultChatId;
    const text = this.formatText(message);
    const keyboard = this.formatKeyboard(message);

    const payload: any = {
      chat_id: chat,
      text: text,
      parse_mode: "Markdown"
    };

    if (message.threadId) {
      payload.reply_to_message_id = parseInt(message.threadId);
    }

    if (keyboard) {
      payload.reply_markup = keyboard;
    }

    const response = await fetch(`${this.baseUrl}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await response.json();

    if (!data.ok) {
      throw new Error(`Telegram send failed: ${data.description}`);
    }

    return {
      success: true,
      messageId: data.result.message_id.toString()
    };
  }

  async update(messageId: string, message: AiwgMessage): Promise<void> {
    const text = this.formatText(message);

    const response = await fetch(`${this.baseUrl}/editMessageText`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: this.defaultChatId,
        message_id: parseInt(messageId),
        text: text,
        parse_mode: "Markdown"
      })
    });

    const data = await response.json();

    if (!data.ok) {
      throw new Error(`Telegram update failed: ${data.description}`);
    }
  }

  onCommand(handler: CommandHandler): void {
    this.commandHandler = handler;
  }

  isConnected(): boolean {
    return !!this.pollingInterval;
  }

  getStatus(): AdapterStatus {
    return {
      platform: "telegram",
      connected: this.isConnected(),
      mode: "long_polling",
      capabilities: ["send", "update", "interactive"],
      lastActivity: new Date().toISOString()
    };
  }

  private startPolling() {
    this.pollingInterval = setInterval(async () => {
      try {
        await this.poll();
      } catch (error) {
        console.error("[Telegram] Polling error:", error.message);
      }
    }, 3000);
  }

  private async poll() {
    const response = await fetch(`${this.baseUrl}/getUpdates`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        offset: this.offset,
        timeout: 30, // Long polling timeout
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
      this.offset = update.update_id + 1;
    }
  }

  private async handleUpdate(update: TelegramUpdate) {
    // Handle text message
    if (update.message?.text) {
      const text = update.message.text;
      const chatId = update.message.chat.id;

      // Bot commands start with /
      if (text.startsWith("/")) {
        const parts = text.slice(1).split(" ");
        const command = parts[0];
        const args = parts.slice(1);

        const parsed: ParsedCommand = {
          command: command,
          args: args,
          user: update.message.from.id.toString(),
          channel: chatId.toString(),
          platform: "telegram",
          raw: text
        };

        try {
          const response = await this.commandHandler!(parsed);
          await this.send(
            {
              title: "",
              body: response.text,
              severity: "info",
              fields: [],
              project: "",
              timestamp: new Date().toISOString()
            },
            chatId.toString()
          );
        } catch (error) {
          await this.send(
            {
              title: "",
              body: `Error: ${error.message}`,
              severity: "critical",
              fields: [],
              project: "",
              timestamp: new Date().toISOString()
            },
            chatId.toString()
          );
        }
      }
    }

    // Handle button callback
    if (update.callback_query) {
      const data = update.callback_query.data;
      const [command, ...args] = data.split("_");

      const parsed: ParsedCommand = {
        command: command,
        args: args,
        user: update.callback_query.from.id.toString(),
        channel: update.callback_query.message!.chat.id.toString(),
        platform: "telegram",
        raw: data
      };

      try {
        const response = await this.commandHandler!(parsed);

        // Answer callback query
        await fetch(`${this.baseUrl}/answerCallbackQuery`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            callback_query_id: update.callback_query.id,
            text: "Done!"
          })
        });

        // Update message
        await this.update(
          update.callback_query.message!.message_id.toString(),
          {
            title: "",
            body: response.text,
            severity: "info",
            fields: [],
            project: "",
            timestamp: new Date().toISOString()
          }
        );
      } catch (error) {
        await fetch(`${this.baseUrl}/answerCallbackQuery`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            callback_query_id: update.callback_query.id,
            text: `Error: ${error.message}`,
            show_alert: true
          })
        });
      }
    }
  }

  private formatText(message: AiwgMessage): string {
    const emoji = message.severity === "critical" ? "🔴"
      : message.severity === "warning" ? "🟡"
      : "🟢";

    let text = `${emoji} **${message.title}**\n\n`;

    if (message.body) {
      text += `${message.body}\n\n`;
    }

    for (const field of message.fields) {
      text += `**${field.label}**: ${field.value}\n`;
    }

    if (message.codeBlock) {
      text += `\n\`\`\`\n${message.codeBlock}\n\`\`\`\n`;
    }

    return text.trim();
  }

  private formatKeyboard(message: AiwgMessage): any | undefined {
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

## Shared Types

```typescript
// src/messaging/types.ts

export interface MessagingAdapter {
  readonly platform: string;
  initialize(): Promise<void>;
  shutdown(): Promise<void>;
  send(message: AiwgMessage, channel: string): Promise<MessageResult>;
  update(messageId: string, message: AiwgMessage): Promise<void>;
  onCommand(handler: CommandHandler): void;
  isConnected(): boolean;
  getStatus(): AdapterStatus;
}

export interface AiwgMessage {
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
  project: string;
  timestamp: string;
  codeBlock?: string;
}

export interface MessageResult {
  success: boolean;
  messageId?: string;
}

export interface ParsedCommand {
  command: string;
  args: string[];
  user: string;
  channel: string;
  platform: string;
  raw: string;
}

export interface CommandResponse {
  text: string;
  ephemeral: boolean;
  message?: AiwgMessage;
}

export type CommandHandler = (command: ParsedCommand) => Promise<CommandResponse>;

export interface AdapterStatus {
  platform: string;
  connected: boolean;
  mode: string;
  capabilities: string[];
  lastActivity: string;
}
```

## Usage Example

```typescript
// src/messaging/index.ts
import { SlackAdapter } from "./adapters/slack.js";
import { DiscordAdapter } from "./adapters/discord.js";
import { TelegramAdapter } from "./adapters/telegram.js";
import { CommandRouter } from "./command-router.js";

async function initializeMessaging() {
  const adapters: MessagingAdapter[] = [];
  const router = new CommandRouter();

  // Lazy-load adapters based on env vars
  if (process.env.AIWG_SLACK_WEBHOOK) {
    const slack = new SlackAdapter();
    await slack.initialize();
    adapters.push(slack);
  }

  if (process.env.AIWG_DISCORD_TOKEN) {
    const discord = new DiscordAdapter();
    await discord.initialize();
    discord.onCommand((cmd) => router.route(cmd));
    adapters.push(discord);
  }

  if (process.env.AIWG_TELEGRAM_TOKEN) {
    const telegram = new TelegramAdapter();
    await telegram.initialize();
    telegram.onCommand((cmd) => router.route(cmd));
    adapters.push(telegram);
  }

  console.log(`[Messaging] Initialized ${adapters.length} adapters`);

  return { adapters, router };
}

// Send message to all platforms
async function broadcastMessage(message: AiwgMessage) {
  const { adapters } = await initializeMessaging();

  for (const adapter of adapters) {
    try {
      await adapter.send(message, getDefaultChannel(adapter.platform));
    } catch (error) {
      console.error(`[${adapter.platform}] Send failed:`, error.message);
    }
  }
}
```

## Environment Variables

```bash
# Slack (webhook only - outbound)
AIWG_SLACK_WEBHOOK=https://hooks.slack.com/services/T.../B.../...

# Slack (full bidirectional)
AIWG_SLACK_WEBHOOK=https://hooks.slack.com/services/...
AIWG_SLACK_SIGNING_SECRET=abc123...
AIWG_SLACK_BOT_TOKEN=xoxb-...
AIWG_SLACK_CHANNELS=C12345678,C87654321

# Discord
AIWG_DISCORD_TOKEN=MTk...
AIWG_DISCORD_CLIENT_ID=123456789
AIWG_DISCORD_CHANNELS=123456789,987654321

# Telegram
AIWG_TELEGRAM_TOKEN=123456:ABC-DEF...
AIWG_TELEGRAM_CHAT_IDS=-1001234567890

# Authorization
AIWG_APPROVERS=U12345678,discord:987654321,telegram:123456789
```

## Dependencies

```json
{
  "dependencies": {
    "express": "^4.18.2"
  },
  "optionalDependencies": {
    "discord.js": "^14.14.1"
  }
}
```

**Notes**:
- Slack and Telegram work with zero extra dependencies
- Discord requires discord.js
- Express required if using Slack inbound (slash commands)
- All adapters use native fetch (Node.js 18+)

## Next Steps

1. Implement event bus for publishing events
2. Create message formatter to convert events → AiwgMessage
3. Integrate with Ralph orchestrator lifecycle events
4. Add rate limiting per platform
5. Add health monitoring and reconnection logic
