/**
 * Base adapter class for messaging platform integrations.
 *
 * All platform adapters (Slack, Discord, Telegram) extend this base class
 * to implement the MessagingAdapter interface from the ADR.
 *
 * @implements @.aiwg/architecture/adrs/ADR-messaging-bot-mode.md
 */

/**
 * @typedef {Object} MessageResult
 * @property {string} messageId - Platform message ID
 * @property {string} channelId - Channel where message was sent
 * @property {boolean} success
 * @property {string} [error]
 */

/**
 * @typedef {Object} AdapterStatus
 * @property {boolean} connected
 * @property {string} platform
 * @property {number} messagesSent
 * @property {number} messagesReceived
 * @property {number} errors
 * @property {string} [lastError]
 * @property {string} [connectedAt]
 */

export class BaseAdapter {
  /** @type {string} */
  platform;

  /** @type {boolean} */
  #connected = false;

  /** @type {number} */
  #messagesSent = 0;

  /** @type {number} */
  #messagesReceived = 0;

  /** @type {number} */
  #errors = 0;

  /** @type {string|null} */
  #lastError = null;

  /** @type {string|null} */
  #connectedAt = null;

  /** @type {Function[]} */
  #commandHandlers = [];

  /** @type {Function[]} */
  #messageHandlers = [];

  constructor(platform) {
    if (new.target === BaseAdapter) {
      throw new Error('BaseAdapter is abstract — instantiate a platform-specific adapter');
    }
    this.platform = platform;
  }

  /**
   * Initialize the adapter (connect to platform).
   * Must be implemented by subclasses.
   *
   * @returns {Promise<void>}
   */
  async initialize() {
    throw new Error('initialize() must be implemented');
  }

  /**
   * Shutdown the adapter (disconnect from platform).
   * Must be implemented by subclasses.
   *
   * @returns {Promise<void>}
   */
  async shutdown() {
    throw new Error('shutdown() must be implemented');
  }

  /**
   * Send a formatted message to a channel.
   * Must be implemented by subclasses.
   *
   * @param {import('../message-formatter.mjs').AiwgMessage} message
   * @param {string} channel - Platform-specific channel identifier
   * @returns {Promise<MessageResult>}
   */
  async send(message, channel) {
    throw new Error('send() must be implemented');
  }

  /**
   * Update an existing message.
   * Must be implemented by subclasses.
   *
   * @param {string} messageId
   * @param {import('../message-formatter.mjs').AiwgMessage} message
   * @returns {Promise<void>}
   */
  async update(messageId, message) {
    throw new Error('update() must be implemented');
  }

  /**
   * Register a command handler for inbound commands.
   *
   * @param {(command: string, args: string[], context: Object) => Promise<void>} handler
   */
  onCommand(handler) {
    this.#commandHandlers.push(handler);
  }

  /**
   * Register a message handler for free-text (non-command) messages.
   *
   * @param {(text: string, context: Object) => Promise<void>} handler
   */
  onMessage(handler) {
    this.#messageHandlers.push(handler);
  }

  /**
   * Check if adapter is connected.
   *
   * @returns {boolean}
   */
  isConnected() {
    return this.#connected;
  }

  /**
   * Get adapter status.
   *
   * @returns {AdapterStatus}
   */
  getStatus() {
    return {
      connected: this.#connected,
      platform: this.platform,
      messagesSent: this.#messagesSent,
      messagesReceived: this.#messagesReceived,
      errors: this.#errors,
      lastError: this.#lastError,
      connectedAt: this.#connectedAt,
    };
  }

  // ========================================================================
  // Protected methods for subclasses
  // ========================================================================

  /** Mark adapter as connected */
  _setConnected() {
    this.#connected = true;
    this.#connectedAt = new Date().toISOString();
  }

  /** Mark adapter as disconnected */
  _setDisconnected() {
    this.#connected = false;
  }

  /** Increment sent counter */
  _recordSend() {
    this.#messagesSent++;
  }

  /** Increment received counter */
  _recordReceive() {
    this.#messagesReceived++;
  }

  /** Record an error */
  _recordError(error) {
    this.#errors++;
    this.#lastError = error?.message || String(error);
  }

  /**
   * Dispatch a command to registered handlers.
   *
   * @param {string} command
   * @param {string[]} args
   * @param {Object} context
   * @returns {Promise<void>}
   */
  async _dispatchCommand(command, args, context) {
    this._recordReceive();
    for (const handler of this.#commandHandlers) {
      try {
        await handler(command, args, { ...context, platform: this.platform });
      } catch (error) {
        this._recordError(error);
        console.error(`[${this.platform}] Command handler error:`, error);
      }
    }
  }

  /**
   * Dispatch a free-text message to registered message handlers.
   *
   * @param {string} text - The message text
   * @param {Object} context - Platform-specific context
   * @returns {Promise<void>}
   */
  async _dispatchMessage(text, context) {
    this._recordReceive();
    for (const handler of this.#messageHandlers) {
      try {
        await handler(text, { ...context, platform: this.platform });
      } catch (error) {
        this._recordError(error);
        console.error(`[${this.platform}] Message handler error:`, error);
      }
    }
  }

  /**
   * Check if any message handlers are registered.
   *
   * @returns {boolean}
   */
  hasMessageHandlers() {
    return this.#messageHandlers.length > 0;
  }
}
