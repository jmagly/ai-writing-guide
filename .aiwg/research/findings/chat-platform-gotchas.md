---
title: "Chat Platform Integration - Gotchas and Edge Cases"
created: 2026-02-08
type: technical_notes
topics:
  - platform-quirks
  - edge-cases
  - troubleshooting
quality: high
---

# Chat Platform Integration - Gotchas and Edge Cases

Production lessons and edge cases for Slack, Discord, and Telegram integration.

## Slack Gotchas

### Webhook Limitations

**Problem**: Incoming Webhooks cannot:
- Get message IDs (can't thread replies)
- Update existing messages
- Read messages or events
- Use interactive components that update the original message

**Solution**: For threading or message updates, need Bot Token + `chat.postMessage` API.

```typescript
// Webhook: fire-and-forget
await fetch(webhookUrl, {
  method: "POST",
  body: JSON.stringify({ text: "Message" })
});
// No message ID returned, can't thread

// Bot Token: full control
const response = await fetch("https://slack.com/api/chat.postMessage", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${botToken}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    channel: "C12345",
    text: "Message"
  })
});
const data = await response.json();
const messageId = data.ts; // Can now thread
```

### Signature Verification Timing Attack

**Problem**: String comparison is vulnerable to timing attacks.

**Wrong**:
```typescript
if (signature === computedSignature) { // VULNERABLE
  // ...
}
```

**Right**:
```typescript
import crypto from "crypto";

if (crypto.timingSafeEqual(
  Buffer.from(signature),
  Buffer.from(computedSignature)
)) {
  // Safe
}
```

### Timestamp Validation

**Problem**: Slack request signature includes timestamp. If not validated, attacker can replay old requests.

```typescript
const timestamp = req.headers["x-slack-request-timestamp"];
const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 300;

if (parseInt(timestamp) < fiveMinutesAgo) {
  return res.status(401).send("Request too old");
}
```

### 3-Second Response Deadline

**Problem**: Slash commands and interactive components must respond within 3 seconds or Slack shows error to user.

**Solution**: Acknowledge immediately, then update asynchronously.

```typescript
app.post("/slack/commands", async (req, res) => {
  // Acknowledge IMMEDIATELY
  res.json({
    response_type: "ephemeral",
    text: "Processing..."
  });

  // Do slow work asynchronously
  processCommand(req.body).then(result => {
    // Update via response_url
    fetch(req.body.response_url, {
      method: "POST",
      body: JSON.stringify({
        replace_original: true,
        text: result.text
      })
    });
  });
});
```

### Block Kit Complexity

**Problem**: Block Kit JSON structure is verbose and easy to get wrong.

**Tip**: Use Block Kit Builder to design, then copy JSON.
https://app.slack.com/block-kit-builder

**Common mistake**: Forgetting `type` field causes silent failures.

```typescript
// Wrong - missing type in text object
{
  "type": "section",
  "text": {
    "text": "Hello" // Missing type!
  }
}

// Right
{
  "type": "section",
  "text": {
    "type": "mrkdwn", // or "plain_text"
    "text": "Hello"
  }
}
```

### Thread Reply Confusion

**Problem**: `thread_ts` is the timestamp of the **parent message**, not the thread itself.

```typescript
// First message in channel
const response = await postMessage({ text: "Thread start" });
const threadTs = response.ts; // This is the thread_ts

// Reply in thread
await postMessage({
  text: "Reply",
  thread_ts: threadTs // Reference parent message timestamp
});
```

## Discord Gotchas

### Intent Requirements

**Problem**: Cannot receive message content without `MessageContent` intent, which is privileged.

**Solution**: Request intent in Discord Developer Portal → Bot → Privileged Gateway Intents.

```typescript
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,           // Required
    GatewayIntentBits.GuildMessages,    // Required for message events
    GatewayIntentBits.MessageContent    // PRIVILEGED - required for message.content
  ]
});
```

**Note**: Apps with >100 servers must request privileged intents via verification.

### Slash Command Registration Delay

**Problem**: Global slash commands take up to 1 hour to propagate.

**Solution**: Use guild-specific commands during development.

```typescript
// Global (slow)
await rest.put(
  Routes.applicationCommands(clientId),
  { body: commands }
);

// Guild-specific (instant)
await rest.put(
  Routes.applicationGuildCommands(clientId, guildId),
  { body: commands }
);
```

### Rate Limit Handling

**Problem**: Discord enforces strict rate limits. Exceeding them results in 429 responses.

**discord.js handles this automatically**, but if using raw API:

```typescript
async function sendWithRateLimit(channelId: string, message: string) {
  const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: "POST",
    headers: {
      "Authorization": `Bot ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ content: message })
  });

  if (response.status === 429) {
    const data = await response.json();
    const retryAfter = data.retry_after; // Seconds

    console.warn(`[Discord] Rate limited, retrying after ${retryAfter}s`);
    await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
    return sendWithRateLimit(channelId, message); // Retry
  }

  return response;
}
```

### Interaction Token Expiry

**Problem**: Interaction tokens expire after 15 minutes. Can't respond to interactions older than that.

**Solution**: Use `interaction.deferReply()` immediately if work takes >3 seconds.

```typescript
client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  // Defer immediately (buys 15 minutes)
  await interaction.deferReply();

  // Do slow work
  const result = await longRunningTask();

  // Edit deferred reply
  await interaction.editReply({
    content: result.text
  });
});
```

### Embed Field Limits

**Problem**: Embeds have strict limits that cause silent failures if exceeded.

| Limit | Value |
|-------|-------|
| Title | 256 characters |
| Description | 4096 characters |
| Fields | 25 fields max |
| Field name | 256 characters |
| Field value | 1024 characters |
| Footer | 2048 characters |
| Total | 6000 characters across all fields |

**Solution**: Truncate or paginate if necessary.

```typescript
function truncateField(value: string, maxLength: number = 1024): string {
  if (value.length <= maxLength) return value;
  return value.slice(0, maxLength - 3) + "...";
}
```

### Gateway Reconnection

**Problem**: Gateway disconnects periodically. Must handle RESUME vs full reconnect.

**discord.js handles this**, but manually:

1. On disconnect, check if we have `session_id`
2. If yes, send RESUME opcode with `session_id` and last `seq`
3. If no, full reconnect with IDENTIFY

discord.js does this automatically. **Don't implement Gateway manually unless you have a very good reason.**

### Button customId Length

**Problem**: Button `customId` limited to 100 characters.

**Solution**: Use short IDs, look up details server-side.

```typescript
// Bad - long customId
{
  customId: "approve_gate-abc123_project-xyz_iteration-5" // >100 chars
}

// Good - short ID
{
  customId: "approve_g123" // Lookup gate-abc123 in database
}
```

## Telegram Gotchas

### Long Polling Offset Management

**Problem**: If `offset` tracking breaks, bot receives duplicate updates or misses updates.

**Solution**: Always increment `offset` to `update.update_id + 1` after processing.

```typescript
const updates: TelegramUpdate[] = data.result;

for (const update of updates) {
  await handleUpdate(update);
  this.offset = update.update_id + 1; // CRITICAL
}
```

**Recovery**: If state lost, reset `offset` to 0 and process all pending updates (may cause duplicates).

### Callback Data 64-Byte Limit

**Problem**: Inline keyboard `callback_data` limited to 64 bytes.

**Wrong**:
```typescript
{
  callback_data: "approve_gate-abc123_project-xyz_iteration-5_severity-high" // >64 bytes
}
```

**Right**:
```typescript
// Store mapping server-side
const callbackId = shortid.generate(); // "g7x3k"
callbacks.set(callbackId, {
  action: "approve",
  gateId: "gate-abc123",
  project: "xyz",
  iteration: 5
});

{
  callback_data: `approve_${callbackId}` // <64 bytes
}
```

### answerCallbackQuery Requirement

**Problem**: If you don't call `answerCallbackQuery` after button click, user sees loading spinner forever.

```typescript
// Button clicked
if (update.callback_query) {
  // MUST call this within ~30 seconds
  await fetch(`${baseUrl}/answerCallbackQuery`, {
    method: "POST",
    body: JSON.stringify({
      callback_query_id: update.callback_query.id,
      text: "Done!" // Optional notification
    })
  });

  // Then do actual work
  await handleButtonClick(update.callback_query.data);
}
```

### Markdown Parsing Mode Strictness

**Problem**: Telegram's Markdown parser is strict. Invalid syntax causes entire message to fail.

**Common issues**:
- Unescaped `_` in URLs: `https://example.com/foo_bar` breaks
- Mismatched `**` or `__`
- `[link]()` with missing URL

**Solution**: Use `parse_mode: "HTML"` for more reliable formatting.

```typescript
// Markdown (fragile)
{
  parse_mode: "Markdown",
  text: "**Bold** _italic_ [link](https://example.com/foo_bar)" // Breaks
}

// HTML (robust)
{
  parse_mode: "HTML",
  text: "<b>Bold</b> <i>italic</i> <a href=\"https://example.com/foo_bar\">link</a>"
}
```

### File Size Limits

**Problem**: Telegram has different file size limits for different upload methods.

| Method | Limit |
|--------|-------|
| `sendPhoto` | 10 MB |
| `sendDocument` | 50 MB |
| `sendAudio` | 50 MB |
| `sendVideo` | 50 MB |

For AIWG, not likely to hit these (sending text messages only).

### Chat ID vs Username

**Problem**: Cannot send messages to username directly. Must use numeric chat ID.

**Solution**: Have user start conversation with bot first, then extract chat ID from update.

```typescript
// User sends /start to bot
if (update.message?.text === "/start") {
  const chatId = update.message.chat.id;
  console.log(`User chat ID: ${chatId}`);

  // Save this for later use
  await saveUserChatId(update.message.from.id, chatId);
}
```

**Tip**: For groups, chat ID is negative: `-1001234567890`

### Webhook vs Long Polling Conflict

**Problem**: Cannot use both webhook and long polling simultaneously.

**Solution**: Call `deleteWebhook` before starting long polling.

```typescript
// Switch from webhook to polling
await fetch(`${baseUrl}/deleteWebhook`);

// Now polling will work
await fetch(`${baseUrl}/getUpdates`, { ... });
```

### Rate Limit: Message Edit Frequency

**Problem**: Can only edit same message 50 times per minute.

**Solution**: Batch updates, debounce edit calls.

```typescript
const editDebounce = new Map<number, NodeJS.Timeout>();

function editMessageDebounced(chatId: number, messageId: number, text: string) {
  // Clear pending edit
  if (editDebounce.has(messageId)) {
    clearTimeout(editDebounce.get(messageId)!);
  }

  // Schedule edit after 1 second
  editDebounce.set(messageId, setTimeout(async () => {
    await editMessage(chatId, messageId, text);
    editDebounce.delete(messageId);
  }, 1000));
}
```

## Cross-Platform Gotchas

### Emoji Rendering Differences

**Problem**: Emoji display differently across platforms.

```
Slack:  :white_check_mark:  → ✅
Discord: ✅                   → ✅ (native emoji)
Telegram: ✅                  → ✅ (native emoji)
```

**Solution**: Use Unicode emoji for consistency.

```typescript
const emoji = {
  success: "✅",
  warning: "⚠️",
  error: "❌",
  info: "ℹ️"
};
```

### Message Length Limits

| Platform | Limit | Notes |
|----------|-------|-------|
| Slack | 40,000 chars | Per message, but 3,000 recommended for readability |
| Discord | 2,000 chars | Per message, 4,096 in embeds |
| Telegram | 4,096 chars | Per message |

**Solution**: Truncate long messages, provide "View full output" link.

```typescript
function truncateMessage(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  const truncated = text.slice(0, maxLength - 100);
  return `${truncated}\n\n... (truncated, see full output at <link>)`;
}
```

### Code Block Formatting

**All platforms support triple-backtick code blocks**, but syntax highlighting differs:

```
Slack:     ```language\ncode```
Discord:   ```language\ncode```
Telegram:  ```language\ncode``` (since Bot API 5.1)
```

**Best practice**: Use language identifier for all platforms.

```typescript
const codeBlock = `\`\`\`typescript\n${code}\n\`\`\``;
```

### Link Formatting

| Platform | Format | Example |
|----------|--------|---------|
| Slack | `<url\|text>` | `<https://example.com\|Click here>` |
| Discord | `[text](url)` | `[Click here](https://example.com)` |
| Telegram | `[text](url)` (Markdown) or `<a href="url">text</a>` (HTML) | `[Click here](https://example.com)` |

**Solution**: Format links per platform in adapter.

### Timestamp Formatting

**Problem**: Each platform has different timestamp format.

```
Slack:    <t:1234567890:f>  (Unix timestamp + format specifier)
Discord:  <t:1234567890:F>  (Unix timestamp + format specifier)
Telegram: Unix timestamp as number (no special formatting)
```

**Solution**: Use human-readable relative time instead.

```typescript
function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  const now = new Date();
  const diff = now.getTime() - date.getTime();
  const minutes = Math.floor(diff / 60000);

  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}
```

## Testing Edge Cases

### Network Failures

**Test**: Simulate network disconnect during:
- Message send
- Command processing
- Gateway connection (Discord)
- Long polling (Telegram)

**Expected**: Graceful retry with exponential backoff, no data loss.

### Token Expiry

**Test**: Use invalid/expired token.

**Expected**: Clear error message on initialize(), adapter not registered.

### Rate Limit Exceeded

**Test**: Send messages faster than platform allows.

**Expected**: Queue messages, respect rate limits, no 429 errors.

### Malformed Payloads

**Test**: Send invalid JSON, missing required fields, wrong types.

**Expected**: Validation errors caught, no crashes.

### Concurrent Updates

**Test**: Multiple messages to same channel simultaneously.

**Expected**: No race conditions, all messages delivered.

### Large Message Content

**Test**: Send message exceeding platform limit.

**Expected**: Truncate or split into multiple messages.

## Debugging Tips

### Slack

**Enable debug mode**:
```bash
export SLACK_DEBUG=1
```

**Check webhook deliveries**: Slack App settings → Features → Incoming Webhooks → Recent Deliveries

**Test slash command**: Slack App settings → Features → Slash Commands → Request URL (test mode)

### Discord

**Enable debug logging**:
```typescript
const client = new Client({
  intents: [...],
  rest: { timeout: 60000 },
  ws: { logLevel: LogLevel.Debug }
});
```

**Check gateway events**: Discord Developer Portal → Applications → [App] → Bot → Gateway Activity

**Test slash commands**: Discord Developer Portal → Applications → [App] → OAuth2 → URL Generator

### Telegram

**Check bot info**:
```bash
curl https://api.telegram.org/bot<TOKEN>/getMe
```

**Check webhook status**:
```bash
curl https://api.telegram.org/bot<TOKEN>/getWebhookInfo
```

**Monitor updates**:
```bash
curl https://api.telegram.org/bot<TOKEN>/getUpdates
```

## Production Checklist

Before deploying to production:

### Slack
- [ ] Webhook URL secured (HTTPS only in production)
- [ ] Signing secret set and verified
- [ ] Bot token (if used) has minimal required scopes
- [ ] Channel IDs configured
- [ ] Signature verification implemented
- [ ] 3-second response deadline handled
- [ ] Error messages user-friendly

### Discord
- [ ] Bot token secured
- [ ] Required intents enabled (MessageContent if needed)
- [ ] Privileged intents approved (if >100 servers)
- [ ] Slash commands registered
- [ ] Rate limiting implemented
- [ ] Gateway reconnection handled (discord.js auto-handles)
- [ ] Interaction deferral for slow commands

### Telegram
- [ ] Bot token secured
- [ ] Polling or webhook configured (not both)
- [ ] answerCallbackQuery called for all button clicks
- [ ] Offset tracking persistent (survives restarts)
- [ ] Message length limits handled
- [ ] Rate limits respected (20/min per chat)

### All Platforms
- [ ] Tokens loaded from environment, not hard-coded
- [ ] Tokens never logged or exposed
- [ ] Channel/user authorization implemented
- [ ] Error handling and retry logic
- [ ] Health monitoring and alerts
- [ ] Message queuing for reliability
- [ ] Metrics and logging
- [ ] Documentation for setup and troubleshooting

## Common Error Messages

### Slack

**Error**: `invalid_payload`
- **Cause**: Malformed JSON or missing required fields
- **Fix**: Validate Block Kit JSON, check for `type` fields

**Error**: `channel_not_found`
- **Cause**: Invalid channel ID or bot not invited to channel
- **Fix**: Invite bot to channel, use correct channel ID (starts with C)

**Error**: `not_authed`
- **Cause**: Invalid or missing token
- **Fix**: Check AIWG_SLACK_WEBHOOK or AIWG_SLACK_BOT_TOKEN

### Discord

**Error**: `Missing Access`
- **Cause**: Bot lacks permission in channel
- **Fix**: Grant bot role required permissions (Send Messages, Embed Links, etc.)

**Error**: `Unknown Interaction`
- **Cause**: Interaction token expired (>15 minutes)
- **Fix**: Respond faster, or use `interaction.deferReply()` immediately

**Error**: `Invalid Form Body`
- **Cause**: Embed exceeds limits or invalid structure
- **Fix**: Check embed field limits, truncate if needed

### Telegram

**Error**: `Bad Request: chat not found`
- **Cause**: Invalid chat ID
- **Fix**: Use numeric chat ID, ensure bot was started by user

**Error**: `Bad Request: can't parse entities`
- **Cause**: Invalid Markdown syntax
- **Fix**: Switch to `parse_mode: "HTML"` or escape special characters

**Error**: `Conflict: terminated by other getUpdates request`
- **Cause**: Multiple processes polling simultaneously
- **Fix**: Ensure only one polling process, or delete webhook first

## References

- Slack API Troubleshooting: https://api.slack.com/docs/rate-limits
- Discord API Errors: https://discord.com/developers/docs/topics/opcodes-and-status-codes
- Telegram Bot API Errors: https://core.telegram.org/bots/api#making-requests
- @.aiwg/architecture/adrs/ADR-messaging-bot-mode.md
- @.aiwg/research/findings/chat-platform-bidirectional-patterns.md
