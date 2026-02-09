/**
 * Discord adapter for AIWG messaging bot.
 *
 * Implements Discord integration using REST API (no discord.js dependency).
 * Uses native fetch() to minimize external dependencies.
 *
 * @implements @.aiwg/architecture/adrs/ADR-messaging-bot-mode.md
 */

import { BaseAdapter } from './base.mjs';
import { getSeverityColor } from '../message-formatter.mjs';

/**
 * Discord severity colors (decimal format for embeds)
 */
const DISCORD_COLORS = {
  info: 0x36a64f,      // Green
  warning: 0xdaa520,   // Goldenrod
  critical: 0xdc3545,  // Red
};

/**
 * Discord API base URL (v10)
 */
const DISCORD_API_BASE = 'https://discord.com/api/v10';

/**
 * Discord adapter implementation.
 *
 * Configuration:
 * - botToken: Discord bot token
 * - defaultChannelId: Default channel for messages
 * - guildId: Discord guild (server) ID
 *
 * Environment variables:
 * - AIWG_DISCORD_TOKEN: Bot token (fallback)
 * - AIWG_DISCORD_CHANNEL_ID: Default channel (fallback)
 * - AIWG_DISCORD_GUILD_ID: Guild ID (fallback)
 */
export class DiscordAdapter extends BaseAdapter {
  /** @type {string} */
  #botToken;

  /** @type {string} */
  #defaultChannelId;

  /** @type {string} */
  #guildId;

  /** @type {Map<string, string>} Thread ID to channel ID mapping */
  #threadChannels = new Map();

  /** @type {Map<string, number>} Rate limit tracking per channel */
  #rateLimits = new Map();

  /**
   * Create a Discord adapter.
   *
   * @param {Object} config
   * @param {string} [config.botToken] - Discord bot token
   * @param {string} [config.defaultChannelId] - Default channel ID
   * @param {string} [config.guildId] - Discord guild ID
   */
  constructor(config = {}) {
    super('discord');

    this.#botToken = config.botToken || process.env.AIWG_DISCORD_TOKEN;
    this.#defaultChannelId = config.defaultChannelId || process.env.AIWG_DISCORD_CHANNEL_ID;
    this.#guildId = config.guildId || process.env.AIWG_DISCORD_GUILD_ID;

    if (!this.#botToken) {
      throw new Error('Discord bot token required (config.botToken or AIWG_DISCORD_TOKEN)');
    }

    if (!this.#defaultChannelId) {
      throw new Error('Discord channel ID required (config.defaultChannelId or AIWG_DISCORD_CHANNEL_ID)');
    }
  }

  /**
   * Initialize Discord connection by validating bot token.
   *
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      // Validate token by fetching bot user info
      const response = await this.#apiRequest('GET', '/users/@me');

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(`Discord authentication failed: ${error.message || response.statusText}`);
      }

      const botUser = await response.json();
      console.log(`[discord] Connected as ${botUser.username}#${botUser.discriminator}`);

      this._setConnected();
    } catch (error) {
      this._recordError(error);
      throw new Error(`Discord initialization failed: ${error.message}`);
    }
  }

  /**
   * Shutdown Discord connection.
   *
   * @returns {Promise<void>}
   */
  async shutdown() {
    this._setDisconnected();
    this.#threadChannels.clear();
    this.#rateLimits.clear();
    console.log('[discord] Disconnected');
  }

  /**
   * Send a message to a Discord channel.
   *
   * @param {import('../message-formatter.mjs').AiwgMessage} message
   * @param {string} [channel] - Channel ID (defaults to config channel)
   * @returns {Promise<import('./base.mjs').MessageResult>}
   */
  async send(message, channel) {
    const channelId = channel || this.#defaultChannelId;

    try {
      // Check rate limit
      await this.#waitForRateLimit(channelId);

      const payload = this.#buildMessagePayload(message);

      const response = await this.#apiRequest(
        'POST',
        `/channels/${channelId}/messages`,
        payload
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(`Discord API error: ${error.message || response.statusText}`);
      }

      const sentMessage = await response.json();

      // If message has threadId, create or use existing thread
      if (message.threadId) {
        await this.#ensureThread(channelId, sentMessage.id, message.threadId, message.title);
      }

      this._recordSend();

      return {
        messageId: sentMessage.id,
        channelId: channelId,
        success: true,
      };
    } catch (error) {
      this._recordError(error);
      return {
        messageId: '',
        channelId: channelId,
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Update an existing Discord message.
   *
   * @param {string} messageId
   * @param {import('../message-formatter.mjs').AiwgMessage} message
   * @returns {Promise<void>}
   */
  async update(messageId, message) {
    try {
      // Parse messageId which may be "channelId/messageId"
      const [channelId, msgId] = messageId.includes('/')
        ? messageId.split('/')
        : [this.#defaultChannelId, messageId];

      await this.#waitForRateLimit(channelId);

      const payload = this.#buildMessagePayload(message);

      const response = await this.#apiRequest(
        'PATCH',
        `/channels/${channelId}/messages/${msgId}`,
        payload
      );

      if (!response.ok) {
        const error = await response.json().catch(() => ({ message: 'Unknown error' }));
        throw new Error(`Discord update failed: ${error.message || response.statusText}`);
      }

      this._recordSend();
    } catch (error) {
      this._recordError(error);
      throw error;
    }
  }

  /**
   * Build Discord message payload from AiwgMessage.
   *
   * @param {import('../message-formatter.mjs').AiwgMessage} message
   * @returns {Object}
   */
  #buildMessagePayload(message) {
    const embed = {
      title: message.title,
      description: message.body,
      color: DISCORD_COLORS[message.severity] || DISCORD_COLORS.info,
      fields: message.fields.map((field) => ({
        name: field.label,
        value: field.value || '\u200b', // Zero-width space for empty
        inline: field.inline ?? false,
      })),
      footer: {
        text: `${message.project} • ${new Date(message.timestamp).toLocaleString()}`,
      },
      timestamp: message.timestamp,
    };

    // Add code block if present
    if (message.codeBlock) {
      embed.fields.push({
        name: 'Details',
        value: `\`\`\`\n${message.codeBlock.slice(0, 1000)}\n\`\`\``,
        inline: false,
      });
    }

    // Add link if present
    if (message.linkUrl && message.linkText) {
      embed.fields.push({
        name: message.linkText,
        value: message.linkUrl,
        inline: false,
      });
    }

    const payload = {
      embeds: [embed],
    };

    // Add components (buttons) if actions present
    if (message.actions && message.actions.length > 0) {
      payload.components = [
        {
          type: 1, // Action Row
          components: message.actions.slice(0, 5).map((action) => ({
            type: 2, // Button
            custom_id: action.id,
            label: action.label,
            style: this.#mapButtonStyle(action.style),
          })),
        },
      ];
    }

    return payload;
  }

  /**
   * Map AIWG button style to Discord button style.
   *
   * @param {string} style
   * @returns {number}
   */
  #mapButtonStyle(style) {
    const BUTTON_STYLES = {
      primary: 1,   // Blurple
      secondary: 2, // Grey
      success: 3,   // Green
      danger: 4,    // Red
      link: 5,      // Link button
    };

    return BUTTON_STYLES[style] || BUTTON_STYLES.secondary;
  }

  /**
   * Ensure a thread exists for the given message.
   *
   * @param {string} channelId
   * @param {string} messageId
   * @param {string} threadId
   * @param {string} threadName
   * @returns {Promise<void>}
   */
  async #ensureThread(channelId, messageId, threadId, threadName) {
    // Check if thread already exists
    if (this.#threadChannels.has(threadId)) {
      return;
    }

    try {
      // Create thread from message
      const response = await this.#apiRequest(
        'POST',
        `/channels/${channelId}/messages/${messageId}/threads`,
        {
          name: threadName.slice(0, 100), // Max 100 chars
          auto_archive_duration: 1440, // 24 hours
        }
      );

      if (response.ok) {
        const thread = await response.json();
        this.#threadChannels.set(threadId, thread.id);
        console.log(`[discord] Created thread: ${threadName}`);
      }
    } catch (error) {
      console.warn(`[discord] Thread creation failed:`, error.message);
      // Non-fatal - message was still sent
    }
  }

  /**
   * Wait if rate limited for a channel.
   *
   * @param {string} channelId
   * @returns {Promise<void>}
   */
  async #waitForRateLimit(channelId) {
    const resetTime = this.#rateLimits.get(channelId);
    if (!resetTime) return;

    const now = Date.now();
    if (now < resetTime) {
      const waitMs = resetTime - now;
      console.log(`[discord] Rate limited on channel ${channelId}, waiting ${waitMs}ms`);
      await new Promise((resolve) => setTimeout(resolve, waitMs));
    }

    this.#rateLimits.delete(channelId);
  }

  /**
   * Make a Discord API request.
   *
   * @param {string} method - HTTP method
   * @param {string} path - API path (e.g., "/users/@me")
   * @param {Object} [body] - Request body
   * @returns {Promise<Response>}
   */
  async #apiRequest(method, path, body) {
    const url = `${DISCORD_API_BASE}${path}`;

    const headers = {
      'Authorization': `Bot ${this.#botToken}`,
      'User-Agent': 'AIWG-Bot/1.0',
    };

    const options = {
      method,
      headers,
    };

    if (body) {
      headers['Content-Type'] = 'application/json';
      options.body = JSON.stringify(body);
    }

    const response = await fetch(url, options);

    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = response.headers.get('Retry-After');
      const resetAfter = response.headers.get('X-RateLimit-Reset-After');

      const waitMs = retryAfter
        ? parseInt(retryAfter) * 1000
        : resetAfter
        ? parseFloat(resetAfter) * 1000
        : 1000;

      // Extract channel ID from path if possible
      const channelMatch = path.match(/\/channels\/(\d+)/);
      if (channelMatch) {
        this.#rateLimits.set(channelMatch[1], Date.now() + waitMs);
      }

      console.warn(`[discord] Rate limited, retry after ${waitMs}ms`);

      // Wait and retry
      await new Promise((resolve) => setTimeout(resolve, waitMs));
      return this.#apiRequest(method, path, body);
    }

    return response;
  }

  /**
   * Register webhook handler for Discord interactions.
   *
   * This would be called by an HTTP server receiving Discord webhooks.
   * For now, it's a placeholder for future webhook integration.
   *
   * @param {Function} handler - Express-like handler (req, res) => void
   * @returns {void}
   */
  registerWebhook(handler) {
    // TODO: Implement webhook handling for slash commands and button interactions
    // This requires running an HTTP server to receive Discord interaction webhooks
    console.log('[discord] Webhook registration not yet implemented');
  }
}

// Export as both default and named export
export default DiscordAdapter;
