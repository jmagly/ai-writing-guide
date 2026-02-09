/**
 * Telegram Bot API adapter for AIWG messaging.
 *
 * Implements the MessagingAdapter interface using raw fetch() to interact
 * with the Telegram Bot API. Supports sending formatted messages with HTML,
 * inline keyboard buttons, long-polling for inbound commands, and message updates.
 *
 * @implements @.aiwg/architecture/adrs/ADR-messaging-bot-mode.md
 */

import { BaseAdapter } from './base.mjs';
import { getSeverityEmoji } from '../message-formatter.mjs';

/**
 * @typedef {Object} TelegramConfig
 * @property {string} botToken - Telegram bot token
 * @property {string} defaultChatId - Default chat ID for messages
 * @property {boolean} [pollingEnabled] - Enable long-polling for commands
 * @property {number} [pollingTimeout] - Polling timeout in seconds (default: 30)
 */

/**
 * Telegram Bot API adapter.
 */
export class TelegramAdapter extends BaseAdapter {
  /** @type {string} */
  #botToken;

  /** @type {string} */
  #defaultChatId;

  /** @type {boolean} */
  #pollingEnabled;

  /** @type {number} */
  #pollingTimeout;

  /** @type {string} */
  #apiBase;

  /** @type {AbortController|null} */
  #pollingController = null;

  /** @type {number} */
  #updateOffset = 0;

  /** @type {Map<string, {chat_id: string, message_id: number}>} */
  #messageIdMap = new Map();

  /**
   * Create a Telegram adapter.
   *
   * @param {TelegramConfig} config
   */
  constructor(config = {}) {
    super('telegram');

    // Load from config or environment variables
    this.#botToken = config.botToken || process.env.AIWG_TELEGRAM_TOKEN;
    this.#defaultChatId = config.defaultChatId || process.env.AIWG_TELEGRAM_CHAT_ID;
    this.#pollingEnabled = config.pollingEnabled ?? false;
    this.#pollingTimeout = config.pollingTimeout ?? 30;

    if (!this.#botToken) {
      throw new Error('Telegram bot token is required (config.botToken or AIWG_TELEGRAM_TOKEN)');
    }

    if (!this.#defaultChatId) {
      throw new Error('Telegram default chat ID is required (config.defaultChatId or AIWG_TELEGRAM_CHAT_ID)');
    }

    this.#apiBase = `https://api.telegram.org/bot${this.#botToken}`;
  }

  /**
   * Initialize the Telegram adapter.
   *
   * Validates the bot token by calling getMe and starts polling if enabled.
   *
   * @returns {Promise<void>}
   */
  async initialize() {
    try {
      // Validate token by calling getMe
      const response = await fetch(`${this.#apiBase}/getMe`);
      const data = await response.json();

      if (!data.ok) {
        throw new Error(`Telegram API error: ${data.description}`);
      }

      console.log(`[telegram] Connected as bot: ${data.result.username}`);
      this._setConnected();

      // Start polling if enabled
      if (this.#pollingEnabled) {
        this.#startPolling();
      }
    } catch (error) {
      this._recordError(error);
      throw new Error(`Failed to initialize Telegram adapter: ${error.message}`);
    }
  }

  /**
   * Shutdown the Telegram adapter.
   *
   * Stops polling and marks adapter as disconnected.
   *
   * @returns {Promise<void>}
   */
  async shutdown() {
    this.#stopPolling();
    this._setDisconnected();
    console.log('[telegram] Adapter shut down');
  }

  /**
   * Send a formatted message to a Telegram chat.
   *
   * @param {import('../message-formatter.mjs').AiwgMessage} message
   * @param {string} [channel] - Chat ID (defaults to configured defaultChatId)
   * @returns {Promise<import('./base.mjs').MessageResult>}
   */
  async send(message, channel) {
    const chatId = channel || this.#defaultChatId;

    try {
      const text = this.#formatMessageAsHtml(message);
      const payload = {
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      };

      // Add reply_to_message_id if threadId is provided
      if (message.threadId) {
        const threadRef = this.#messageIdMap.get(message.threadId);
        if (threadRef && threadRef.chat_id === chatId) {
          payload.reply_to_message_id = threadRef.message_id;
        }
      }

      // Add inline keyboard if actions are provided
      if (message.actions && message.actions.length > 0) {
        payload.reply_markup = {
          inline_keyboard: [
            message.actions.map((action) => ({
              text: action.label,
              callback_data: action.command,
            })),
          ],
        };
      }

      const response = await this.#apiCall('sendMessage', payload);

      if (!response.ok) {
        throw new Error(response.description || 'Unknown Telegram API error');
      }

      const messageId = `${response.result.chat.id}:${response.result.message_id}`;

      // Store message ID for potential updates or threading
      this.#messageIdMap.set(messageId, {
        chat_id: response.result.chat.id,
        message_id: response.result.message_id,
      });

      // If this message has a threadId, store it too for future threading
      if (message.threadId) {
        this.#messageIdMap.set(message.threadId, {
          chat_id: response.result.chat.id,
          message_id: response.result.message_id,
        });
      }

      this._recordSend();

      return {
        messageId,
        channelId: String(response.result.chat.id),
        success: true,
      };
    } catch (error) {
      this._recordError(error);
      return {
        messageId: '',
        channelId: chatId,
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Update an existing message.
   *
   * @param {string} messageId - Format: "chat_id:message_id"
   * @param {import('../message-formatter.mjs').AiwgMessage} message
   * @returns {Promise<void>}
   */
  async update(messageId, message) {
    try {
      const ref = this.#messageIdMap.get(messageId);
      if (!ref) {
        throw new Error(`Message ID not found: ${messageId}`);
      }

      const text = this.#formatMessageAsHtml(message);
      const payload = {
        chat_id: ref.chat_id,
        message_id: ref.message_id,
        text,
        parse_mode: 'HTML',
      };

      // Update inline keyboard if actions are provided
      if (message.actions && message.actions.length > 0) {
        payload.reply_markup = {
          inline_keyboard: [
            message.actions.map((action) => ({
              text: action.label,
              callback_data: action.command,
            })),
          ],
        };
      }

      const response = await this.#apiCall('editMessageText', payload);

      if (!response.ok) {
        throw new Error(response.description || 'Unknown Telegram API error');
      }
    } catch (error) {
      this._recordError(error);
      throw new Error(`Failed to update Telegram message: ${error.message}`);
    }
  }

  // ========================================================================
  // Private methods
  // ========================================================================

  /**
   * Make a Telegram Bot API call.
   *
   * @param {string} method - API method name
   * @param {Object} payload - Request payload
   * @returns {Promise<any>}
   */
  async #apiCall(method, payload) {
    const url = `${this.#apiBase}/${method}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    // Handle rate limiting
    if (response.status === 429) {
      const retryAfter = data.parameters?.retry_after || 1;
      console.warn(`[telegram] Rate limited. Retrying after ${retryAfter}s`);
      await new Promise((resolve) => setTimeout(resolve, retryAfter * 1000));
      return this.#apiCall(method, payload);
    }

    return data;
  }

  /**
   * Format an AiwgMessage as HTML text for Telegram.
   *
   * @param {import('../message-formatter.mjs').AiwgMessage} message
   * @returns {string}
   */
  #formatMessageAsHtml(message) {
    const emoji = getSeverityEmoji(message.severity);
    const parts = [];

    // Title with emoji
    parts.push(`${emoji} <b>${this.#escapeHtml(message.title)}</b>\n`);

    // Body
    if (message.body) {
      parts.push(`${this.#escapeHtml(message.body)}\n`);
    }

    // Fields
    if (message.fields && message.fields.length > 0) {
      parts.push('');
      for (const field of message.fields) {
        parts.push(
          `<b>${this.#escapeHtml(field.label)}:</b> ${this.#escapeHtml(field.value)}`
        );
      }
    }

    // Code block
    if (message.codeBlock) {
      parts.push('');
      parts.push(`<pre>${this.#escapeHtml(message.codeBlock)}</pre>`);
    }

    // Link
    if (message.linkUrl && message.linkText) {
      parts.push('');
      parts.push(`<a href="${this.#escapeHtml(message.linkUrl)}">${this.#escapeHtml(message.linkText)}</a>`);
    }

    // Footer
    parts.push('');
    parts.push(`<i>${this.#escapeHtml(message.project)} • ${this.#escapeHtml(message.timestamp)}</i>`);

    return parts.join('\n');
  }

  /**
   * Escape HTML special characters for Telegram HTML mode.
   *
   * @param {string} text
   * @returns {string}
   */
  #escapeHtml(text) {
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  /**
   * Start long-polling for updates.
   */
  #startPolling() {
    if (this.#pollingController) {
      return; // Already polling
    }

    this.#pollingController = new AbortController();
    console.log('[telegram] Starting long-polling for commands');

    this.#pollLoop();
  }

  /**
   * Stop long-polling.
   */
  #stopPolling() {
    if (this.#pollingController) {
      this.#pollingController.abort();
      this.#pollingController = null;
      console.log('[telegram] Stopped long-polling');
    }
  }

  /**
   * Long-polling loop.
   */
  async #pollLoop() {
    while (this.#pollingController && !this.#pollingController.signal.aborted) {
      try {
        await this.#pollOnce();
      } catch (error) {
        if (error.name === 'AbortError') {
          break;
        }
        console.error('[telegram] Polling error:', error);
        this._recordError(error);
        // Wait before retrying
        await new Promise((resolve) => setTimeout(resolve, 5000));
      }
    }
  }

  /**
   * Poll for updates once.
   */
  async #pollOnce() {
    const payload = {
      offset: this.#updateOffset,
      timeout: this.#pollingTimeout,
      allowed_updates: ['message', 'callback_query'],
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), (this.#pollingTimeout + 10) * 1000);

    try {
      const response = await fetch(`${this.#apiBase}/getUpdates`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!data.ok) {
        throw new Error(`Telegram API error: ${data.description}`);
      }

      const updates = data.result || [];

      for (const update of updates) {
        this.#updateOffset = Math.max(this.#updateOffset, update.update_id + 1);
        await this.#handleUpdate(update);
      }
    } catch (error) {
      clearTimeout(timeoutId);
      if (error.name !== 'AbortError') {
        throw error;
      }
    }
  }

  /**
   * Handle a Telegram update.
   *
   * @param {Object} update
   */
  async #handleUpdate(update) {
    try {
      // Handle text messages (commands)
      if (update.message?.text) {
        await this.#handleMessage(update.message);
      }

      // Handle callback queries (button presses)
      if (update.callback_query) {
        await this.#handleCallbackQuery(update.callback_query);
      }
    } catch (error) {
      console.error('[telegram] Error handling update:', error);
      this._recordError(error);
    }
  }

  /**
   * Handle a text message (parse commands or dispatch free-text).
   *
   * @param {Object} message
   */
  async #handleMessage(message) {
    const text = message.text.trim();

    const context = {
      chatId: String(message.chat.id),
      messageId: message.message_id,
      from: {
        id: message.from.id,
        username: message.from.username,
        firstName: message.from.first_name,
      },
    };

    // Parse bot commands (format: /command or /command@botname)
    const commandMatch = text.match(/^\/([a-z_]+)(?:@\w+)?\s*(.*)/i);
    if (commandMatch) {
      const command = commandMatch[1];
      const argsText = commandMatch[2];
      const args = argsText ? argsText.split(/\s+/) : [];

      await this._dispatchCommand(command, args, context);
      return;
    }

    // Non-command free-text message → dispatch to message handlers
    if (this.hasMessageHandlers()) {
      await this._dispatchMessage(text, context);
    }
  }

  /**
   * Handle a callback query (button press).
   *
   * @param {Object} callbackQuery
   */
  async #handleCallbackQuery(callbackQuery) {
    const data = callbackQuery.data;

    // Parse as command
    const parts = data.trim().split(/\s+/);
    const command = parts[0];
    const args = parts.slice(1);

    const context = {
      chatId: String(callbackQuery.message.chat.id),
      messageId: callbackQuery.message.message_id,
      callbackQueryId: callbackQuery.id,
      from: {
        id: callbackQuery.from.id,
        username: callbackQuery.from.username,
        firstName: callbackQuery.from.first_name,
      },
    };

    await this._dispatchCommand(command, args, context);

    // Acknowledge callback query
    await this.#apiCall('answerCallbackQuery', {
      callback_query_id: callbackQuery.id,
    });
  }
}

// Export as both default and named
export default TelegramAdapter;
