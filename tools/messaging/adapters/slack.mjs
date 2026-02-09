/**
 * @file Slack adapter for AIWG messaging bot
 * @implements BaseAdapter
 */

import { BaseAdapter } from './base.mjs';

/**
 * Slack adapter for AIWG messaging
 *
 * @extends BaseAdapter
 * @example
 * const slack = new SlackAdapter({
 *   webhookUrl: 'https://hooks.slack.com/services/...',
 *   botToken: 'xoxb-...',
 *   defaultChannel: '#aiwg-notifications'
 * });
 * await slack.initialize();
 * await slack.send(message, '#channel');
 */
export class SlackAdapter extends BaseAdapter {
  /**
   * Create a Slack adapter
   *
   * @param {Object} config - Slack configuration
   * @param {string} [config.webhookUrl] - Slack webhook URL
   * @param {string} [config.botToken] - Slack bot token for updates
   * @param {string} [config.defaultChannel] - Default channel for messages
   */
  constructor(config = {}) {
    super('slack');

    this.webhookUrl = config.webhookUrl || process.env.AIWG_SLACK_WEBHOOK_URL;
    this.botToken = config.botToken || process.env.AIWG_SLACK_BOT_TOKEN;
    this.defaultChannel = config.defaultChannel || '#aiwg-notifications';

    /** @type {Map<string, Function>} */
    this.commandHandlers = new Map();

    /** @type {number} */
    this.rateLimitRemaining = 100;

    /** @type {number|null} */
    this.rateLimitReset = null;
  }

  /**
   * Initialize the Slack adapter
   *
   * @returns {Promise<void>}
   * @throws {Error} If webhook URL is not configured
   */
  async initialize() {
    if (!this.webhookUrl) {
      throw new Error('Slack webhook URL not configured. Set AIWG_SLACK_WEBHOOK_URL environment variable or pass webhookUrl in config.');
    }

    // Validate webhook URL format
    if (!this.webhookUrl.startsWith('https://hooks.slack.com/')) {
      throw new Error('Invalid Slack webhook URL format.');
    }

    // Send test ping to verify connectivity
    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: 'AIWG Slack adapter initialized',
          attachments: [{
            color: '#36a64f',
            text: 'Connection test successful',
            footer: 'AIWG Messaging Bot',
            ts: Math.floor(Date.now() / 1000),
          }],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Slack webhook test failed: ${response.status} ${errorText}`);
      }

      this._setConnected();
    } catch (error) {
      this._recordError(error);
      throw new Error(`Failed to initialize Slack adapter: ${error.message}`);
    }
  }

  /**
   * Shutdown the Slack adapter
   *
   * @returns {Promise<void>}
   */
  async shutdown() {
    this._setDisconnected();
  }

  /**
   * Send a message to Slack
   *
   * @param {Object} message - AiwgMessage to send
   * @param {string} [channel] - Target channel (overrides default)
   * @returns {Promise<string>} Message ID (timestamp)
   * @throws {Error} If send fails
   */
  async send(message, channel) {
    if (!this.isConnected()) {
      throw new Error('Slack adapter not connected. Call initialize() first.');
    }

    await this._checkRateLimit();

    const slackMessage = this._convertToSlackFormat(message, channel);

    try {
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(slackMessage),
      });

      this._updateRateLimitInfo(response);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Slack API error: ${response.status} ${errorText}`);
      }

      const result = await response.text();
      if (result !== 'ok') {
        throw new Error(`Slack webhook returned: ${result}`);
      }

      this._recordSend();

      // Slack webhooks don't return message IDs, so we generate one based on timestamp
      const messageId = `slack_${Date.now()}`;
      return messageId;
    } catch (error) {
      this._recordError(error);
      throw error;
    }
  }

  /**
   * Update an existing Slack message
   *
   * @param {string} messageId - Message timestamp (ts) to update
   * @param {Object} message - Updated AiwgMessage
   * @returns {Promise<void>}
   * @throws {Error} If bot token not configured or update fails
   */
  async update(messageId, message) {
    if (!this.botToken) {
      throw new Error('Slack bot token required for message updates. Set AIWG_SLACK_BOT_TOKEN environment variable.');
    }

    if (!this.isConnected()) {
      throw new Error('Slack adapter not connected. Call initialize() first.');
    }

    await this._checkRateLimit();

    // Extract channel and timestamp from messageId if in format "channel:ts"
    let channel, ts;
    if (messageId.includes(':')) {
      [channel, ts] = messageId.split(':');
    } else {
      channel = this.defaultChannel;
      ts = messageId;
    }

    const slackMessage = this._convertToSlackFormat(message, channel);

    try {
      const response = await fetch('https://slack.com/api/chat.update', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.botToken}`,
        },
        body: JSON.stringify({
          channel,
          ts,
          text: slackMessage.text,
          attachments: slackMessage.attachments,
        }),
      });

      this._updateRateLimitInfo(response);

      const result = await response.json();

      if (!result.ok) {
        throw new Error(`Slack API error: ${result.error}`);
      }

      this._recordSend();
    } catch (error) {
      this._recordError(error);
      throw error;
    }
  }

  /**
   * Register a command handler
   *
   * @param {Function} handler - Function to handle commands: (command, args, context) => void
   */
  onCommand(handler) {
    this.commandHandlers.set('default', handler);
  }

  /**
   * Parse and dispatch a Slack slash command
   *
   * @param {Object} slackPayload - Slack slash command payload
   * @returns {Promise<void>}
   */
  async handleSlashCommand(slackPayload) {
    const { command, text, user_name, channel_name, channel_id, team_domain } = slackPayload;

    this._recordReceive();

    // Parse command and arguments
    const commandName = command.replace(/^\//, '');
    const args = text ? text.split(/\s+/) : [];

    const context = {
      platform: 'slack',
      userId: user_name,
      channelId: channel_id,
      channelName: channel_name,
      teamDomain: team_domain,
      timestamp: new Date().toISOString(),
    };

    await this._dispatchCommand(commandName, args, context);
  }

  /**
   * Convert AiwgMessage to Slack attachment format
   *
   * @private
   * @param {Object} message - AiwgMessage
   * @param {string} [channel] - Target channel
   * @returns {Object} Slack message payload
   */
  _convertToSlackFormat(message, channel) {
    const severityColors = {
      info: '#36a64f',
      warning: '#daa520',
      critical: '#dc3545',
    };

    const color = severityColors[message.severity] || severityColors.info;

    const attachment = {
      color,
      fallback: `${message.title}: ${message.body}`,
      title: message.title,
      text: message.body,
      footer: `AIWG • ${message.project}`,
      ts: Math.floor(new Date(message.timestamp).getTime() / 1000),
    };

    // Add fields if present
    if (message.fields && message.fields.length > 0) {
      attachment.fields = message.fields.map(field => ({
        title: field.label,
        value: field.value,
        short: field.inline || false,
      }));
    }

    // Add code block if present
    if (message.codeBlock) {
      attachment.text = `${attachment.text}\n\`\`\`\n${message.codeBlock}\n\`\`\``;
    }

    // Add link if present
    if (message.linkUrl && message.linkText) {
      attachment.text = `${attachment.text}\n<${message.linkUrl}|${message.linkText}>`;
    }

    // Add actions if present (Slack Block Kit actions)
    if (message.actions && message.actions.length > 0) {
      attachment.actions = message.actions.map(action => ({
        type: 'button',
        text: action.label,
        value: action.id,
        style: this._mapActionStyle(action.style),
        url: action.command ? undefined : action.url,
      }));
    }

    const payload = {
      text: message.title,
      attachments: [attachment],
    };

    // Set channel if provided
    if (channel) {
      payload.channel = channel;
    }

    // Set thread if provided
    if (message.threadId) {
      payload.thread_ts = message.threadId;
    }

    return payload;
  }

  /**
   * Map AIWG action style to Slack button style
   *
   * @private
   * @param {string} style - AIWG action style (primary, danger, default)
   * @returns {string} Slack button style
   */
  _mapActionStyle(style) {
    const styleMap = {
      primary: 'primary',
      danger: 'danger',
      default: 'default',
    };

    return styleMap[style] || 'default';
  }

  /**
   * Check rate limit and wait if necessary
   *
   * @private
   * @returns {Promise<void>}
   */
  async _checkRateLimit() {
    if (this.rateLimitRemaining <= 0 && this.rateLimitReset) {
      const now = Date.now() / 1000;
      if (now < this.rateLimitReset) {
        const waitTime = (this.rateLimitReset - now) * 1000;
        console.warn(`[Slack] Rate limit exceeded. Waiting ${Math.ceil(waitTime / 1000)}s...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }

  /**
   * Update rate limit information from response headers
   *
   * @private
   * @param {Response} response - Fetch response
   */
  _updateRateLimitInfo(response) {
    const remaining = response.headers.get('X-Rate-Limit-Remaining');
    const reset = response.headers.get('X-Rate-Limit-Reset');

    if (remaining !== null) {
      this.rateLimitRemaining = parseInt(remaining, 10);
    }

    if (reset !== null) {
      this.rateLimitReset = parseInt(reset, 10);
    }
  }

  /**
   * Get adapter status including rate limit info
   *
   * @returns {Object} Status information
   */
  getStatus() {
    const baseStatus = super.getStatus();

    return {
      ...baseStatus,
      rateLimit: {
        remaining: this.rateLimitRemaining,
        resetAt: this.rateLimitReset ? new Date(this.rateLimitReset * 1000).toISOString() : null,
      },
      config: {
        webhookConfigured: !!this.webhookUrl,
        botTokenConfigured: !!this.botToken,
        defaultChannel: this.defaultChannel,
      },
    };
  }
}

// Export as default and named export
export default SlackAdapter;
