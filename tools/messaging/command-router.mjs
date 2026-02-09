/**
 * Inbound command router for messaging platform commands.
 *
 * Parses commands from messaging platforms (e.g., /status, /approve gate-123)
 * and dispatches them to registered handlers with permission checking.
 *
 * @implements @.aiwg/architecture/adrs/ADR-messaging-bot-mode.md
 */

import { COMMANDS, CommandPermission } from './types.mjs';

/**
 * @typedef {Object} CommandContext
 * @property {string} platform - Source platform (slack, discord, telegram)
 * @property {string} userId - Platform user ID
 * @property {string} channelId - Channel/chat ID
 * @property {string} [threadId] - Thread/reply ID if applicable
 * @property {string} [guildId] - Discord guild ID if applicable
 * @property {Record<string, unknown>} [metadata] - Platform-specific metadata
 */

/**
 * @typedef {Object} CommandResult
 * @property {boolean} success
 * @property {string} [message] - Response message
 * @property {Record<string, unknown>} [data] - Structured response data
 * @property {string} [error] - Error message if !success
 */

/**
 * @callback CommandHandler
 * @param {string[]} args - Parsed command arguments
 * @param {CommandContext} context
 * @returns {Promise<CommandResult>}
 */

export class CommandRouter {
  /** @type {Map<string, CommandHandler>} */
  #handlers;

  /** @type {Map<string, Set<string>>} */
  #userPermissions;

  /** @type {Set<string>} */
  #defaultReadUsers;

  /** @type {(userId: string, permission: string) => boolean} */
  #permissionChecker;

  /** @type {number} */
  #rateLimitWindowMs;

  /** @type {number} */
  #rateLimitMaxRequests;

  /** @type {Map<string, {count: number, resetAt: number}>} */
  #rateLimitBuckets;

  /**
   * @param {Object} [options]
   * @param {(userId: string, permission: string) => boolean} [options.permissionChecker]
   * @param {number} [options.rateLimitWindowMs=60000]
   * @param {number} [options.rateLimitMaxRequests=10]
   */
  constructor({
    permissionChecker,
    rateLimitWindowMs = 60_000,
    rateLimitMaxRequests = 10,
  } = {}) {
    this.#handlers = new Map();
    this.#userPermissions = new Map();
    this.#defaultReadUsers = new Set();
    this.#permissionChecker = permissionChecker || this.#defaultPermissionCheck.bind(this);
    this.#rateLimitWindowMs = rateLimitWindowMs;
    this.#rateLimitMaxRequests = rateLimitMaxRequests;
    this.#rateLimitBuckets = new Map();
  }

  /**
   * Register a command handler.
   *
   * @param {string} command - Command name (without /)
   * @param {CommandHandler} handler
   */
  registerHandler(command, handler) {
    this.#handlers.set(command, handler);
  }

  /**
   * Parse and dispatch a command string.
   *
   * @param {string} rawInput - Raw command input (e.g., "/status" or "approve gate-123")
   * @param {CommandContext} context
   * @returns {Promise<CommandResult>}
   */
  async dispatch(rawInput, context) {
    // Parse command and arguments
    const { command, args } = this.#parseCommand(rawInput);

    if (!command) {
      return { success: false, error: 'Empty command' };
    }

    // Check if command exists
    const commandDef = COMMANDS[command];
    if (!commandDef) {
      return {
        success: false,
        error: `Unknown command: "${command}". Available: ${Object.keys(COMMANDS).join(', ')}`,
      };
    }

    // Check rate limit
    if (!this.#checkRateLimit(context.userId)) {
      return {
        success: false,
        error: 'Rate limit exceeded. Please wait before sending more commands.',
      };
    }

    // Check permission
    if (!this.#permissionChecker(context.userId, commandDef.permission)) {
      return {
        success: false,
        error: `Permission denied: "${command}" requires "${commandDef.permission}" permission`,
      };
    }

    // Find handler
    const handler = this.#handlers.get(command);
    if (!handler) {
      return {
        success: false,
        error: `No handler registered for command: "${command}"`,
      };
    }

    // Execute handler
    try {
      const result = await handler(args, context);
      return result;
    } catch (error) {
      console.error(`[CommandRouter] Error executing "${command}":`, error);
      return {
        success: false,
        error: `Command failed: ${error.message}`,
      };
    }
  }

  /**
   * Grant a permission level to a user.
   *
   * @param {string} userId
   * @param {string} permission - 'read' or 'write'
   */
  grantPermission(userId, permission) {
    if (!this.#userPermissions.has(userId)) {
      this.#userPermissions.set(userId, new Set());
    }
    this.#userPermissions.get(userId).add(permission);
  }

  /**
   * Revoke a permission from a user.
   *
   * @param {string} userId
   * @param {string} permission
   */
  revokePermission(userId, permission) {
    const perms = this.#userPermissions.get(userId);
    if (perms) {
      perms.delete(permission);
    }
  }

  /**
   * Grant default read access to a user (any user can read by default).
   *
   * @param {string} userId
   */
  grantDefaultRead(userId) {
    this.#defaultReadUsers.add(userId);
  }

  /**
   * Get help text for all commands.
   *
   * @returns {string}
   */
  getHelpText() {
    const lines = ['Available commands:', ''];
    for (const [name, def] of Object.entries(COMMANDS)) {
      const permBadge = def.permission === CommandPermission.WRITE ? '[WRITE]' : '[READ]';
      lines.push(`  /${name} ${permBadge} - ${def.description}`);
    }
    return lines.join('\n');
  }

  /**
   * Get registered handler count.
   *
   * @returns {number}
   */
  get handlerCount() {
    return this.#handlers.size;
  }

  /**
   * Parse raw command input into command name and arguments.
   *
   * @param {string} rawInput
   * @returns {{command: string|null, args: string[]}}
   */
  #parseCommand(rawInput) {
    const trimmed = rawInput.trim();
    if (!trimmed) {
      return { command: null, args: [] };
    }

    // Remove leading / if present
    const normalized = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed;
    const parts = normalized.split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    return { command, args };
  }

  /**
   * Default permission checker - read is open, write requires explicit grant.
   *
   * @param {string} userId
   * @param {string} requiredPermission
   * @returns {boolean}
   */
  #defaultPermissionCheck(userId, requiredPermission) {
    // Read is open to everyone
    if (requiredPermission === CommandPermission.READ) {
      return true;
    }

    // Write requires explicit permission
    const perms = this.#userPermissions.get(userId);
    return perms?.has(CommandPermission.WRITE) || false;
  }

  /**
   * Check and update rate limit for a user.
   *
   * @param {string} userId
   * @returns {boolean} true if within limit
   */
  #checkRateLimit(userId) {
    const now = Date.now();
    const bucket = this.#rateLimitBuckets.get(userId);

    if (!bucket || now > bucket.resetAt) {
      this.#rateLimitBuckets.set(userId, {
        count: 1,
        resetAt: now + this.#rateLimitWindowMs,
      });
      return true;
    }

    bucket.count++;
    return bucket.count <= this.#rateLimitMaxRequests;
  }
}
