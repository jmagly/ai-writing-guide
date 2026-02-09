/**
 * Chat handler for 2-way AI communication via messaging platforms.
 *
 * Spawns `claude -p` to process free-text messages and returns responses.
 * Tracks conversation context per chat/user for multi-turn conversations.
 *
 * @implements @.aiwg/requirements/use-cases/UC-CHAT-001.md
 * @tests @test/unit/messaging/chat-handler.test.js
 */

import { spawn } from 'node:child_process';
import path from 'path';

/**
 * @typedef {Object} ChatHandlerOptions
 * @property {string} [agentCommand='claude'] - Command to spawn for AI processing
 * @property {string[]} [agentArgs=[]] - Additional args for the agent command
 * @property {string} [cwd] - Working directory for spawned processes
 * @property {number} [maxContextMessages=10] - Max messages to include as context
 * @property {number} [timeoutMs=120000] - Timeout for AI response (2 minutes)
 * @property {number} [maxConcurrent=3] - Max concurrent AI processes
 * @property {number} [maxResponseLength=4000] - Max response chars (Telegram limit)
 */

export class ChatHandler {
  /** @type {string} */
  #agentCommand;

  /** @type {string[]} */
  #agentArgs;

  /** @type {string} */
  #cwd;

  /** @type {number} */
  #maxContextMessages;

  /** @type {number} */
  #timeoutMs;

  /** @type {number} */
  #maxConcurrent;

  /** @type {number} */
  #maxResponseLength;

  /** @type {Map<string, Array<{role: string, content: string, timestamp: string}>>} */
  #conversations;

  /** @type {number} */
  #activeProcesses;

  /** @type {Map<string, boolean>} */
  #processingChats;

  /**
   * @param {ChatHandlerOptions} options
   */
  constructor(options = {}) {
    this.#agentCommand = options.agentCommand || 'claude';
    this.#agentArgs = options.agentArgs || [];
    this.#cwd = options.cwd || process.cwd();
    this.#maxContextMessages = options.maxContextMessages || 10;
    this.#timeoutMs = options.timeoutMs || 120_000;
    this.#maxConcurrent = options.maxConcurrent || 3;
    this.#maxResponseLength = options.maxResponseLength || 4000;
    this.#conversations = new Map();
    this.#activeProcesses = 0;
    this.#processingChats = new Map();
  }

  /**
   * Process a chat message and return the AI response.
   *
   * @param {string} text - The user's message
   * @param {Object} context - Platform context
   * @param {string} context.chatId - Chat/conversation identifier
   * @param {string} context.platform - Platform name
   * @param {Object} [context.from] - Sender info
   * @returns {Promise<{response: string, conversationId: string}>}
   */
  async processMessage(text, context) {
    const conversationId = this.#getConversationId(context);

    // Check if this chat is already being processed
    if (this.#processingChats.get(conversationId)) {
      return {
        response: 'Still processing your previous message. Please wait.',
        conversationId,
      };
    }

    // Check concurrency limit
    if (this.#activeProcesses >= this.#maxConcurrent) {
      return {
        response: `AI is busy (${this.#activeProcesses}/${this.#maxConcurrent} active). Please try again shortly.`,
        conversationId,
      };
    }

    // Record user message in conversation history
    this.#addMessage(conversationId, 'user', text);

    // Build prompt with conversation context
    const prompt = this.#buildPrompt(conversationId, text);

    this.#processingChats.set(conversationId, true);
    this.#activeProcesses++;

    try {
      const response = await this.#spawnAgent(prompt);
      const truncated = this.#truncateResponse(response);

      // Record assistant response
      this.#addMessage(conversationId, 'assistant', truncated);

      return { response: truncated, conversationId };
    } catch (error) {
      return {
        response: `Error: ${error.message}`,
        conversationId,
      };
    } finally {
      this.#activeProcesses--;
      this.#processingChats.set(conversationId, false);
    }
  }

  /**
   * Get conversation history for a chat.
   *
   * @param {string} conversationId
   * @returns {Array<{role: string, content: string, timestamp: string}>}
   */
  getConversation(conversationId) {
    return [...(this.#conversations.get(conversationId) || [])];
  }

  /**
   * Clear conversation history for a chat.
   *
   * @param {string} conversationId
   */
  clearConversation(conversationId) {
    this.#conversations.delete(conversationId);
  }

  /**
   * Get stats about active processing.
   *
   * @returns {{activeProcesses: number, maxConcurrent: number, conversationCount: number}}
   */
  getStats() {
    return {
      activeProcesses: this.#activeProcesses,
      maxConcurrent: this.#maxConcurrent,
      conversationCount: this.#conversations.size,
    };
  }

  // --- Private methods ---

  /**
   * Get a stable conversation ID from context.
   *
   * @param {Object} context
   * @returns {string}
   */
  #getConversationId(context) {
    return `${context.platform || 'unknown'}:${context.chatId || 'default'}`;
  }

  /**
   * Add a message to conversation history.
   *
   * @param {string} conversationId
   * @param {string} role
   * @param {string} content
   */
  #addMessage(conversationId, role, content) {
    if (!this.#conversations.has(conversationId)) {
      this.#conversations.set(conversationId, []);
    }

    const history = this.#conversations.get(conversationId);
    history.push({
      role,
      content,
      timestamp: new Date().toISOString(),
    });

    // Trim to max context size
    while (history.length > this.#maxContextMessages * 2) {
      history.shift();
    }
  }

  /**
   * Build a prompt that includes conversation context.
   *
   * @param {string} conversationId
   * @param {string} currentMessage
   * @returns {string}
   */
  #buildPrompt(conversationId, currentMessage) {
    const history = this.#conversations.get(conversationId) || [];

    // If there's only the current message, just return it
    if (history.length <= 1) {
      return currentMessage;
    }

    // Build context from previous messages (excluding the current one which was just added)
    const contextMessages = history.slice(0, -1).slice(-this.#maxContextMessages);

    if (contextMessages.length === 0) {
      return currentMessage;
    }

    const contextBlock = contextMessages
      .map((msg) => `${msg.role === 'user' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n');

    return `Previous conversation context:\n${contextBlock}\n\nCurrent message:\n${currentMessage}`;
  }

  /**
   * Spawn the AI agent and return its response.
   *
   * @param {string} prompt
   * @returns {Promise<string>}
   */
  #spawnAgent(prompt) {
    return new Promise((resolve, reject) => {
      const args = [...this.#agentArgs, '-p', prompt];
      let stdout = '';
      let stderr = '';

      const proc = spawn(this.#agentCommand, args, {
        cwd: this.#cwd,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env },
      });

      const timeout = setTimeout(() => {
        try {
          proc.kill('SIGTERM');
        } catch {
          // Process may have already exited
        }
        reject(new Error('AI response timed out'));
      }, this.#timeoutMs);

      proc.stdout.on('data', (chunk) => {
        stdout += chunk.toString();
      });

      proc.stderr.on('data', (chunk) => {
        stderr += chunk.toString();
      });

      proc.on('exit', (code, signal) => {
        clearTimeout(timeout);
        if (signal === 'SIGTERM' || signal === 'SIGKILL') {
          reject(new Error('AI process was terminated'));
        } else if (code === 0) {
          resolve(stdout.trim());
        } else {
          reject(new Error(`AI process exited with code ${code}`));
        }
      });

      proc.on('error', (err) => {
        clearTimeout(timeout);
        reject(new Error(`Failed to spawn AI: ${err.message}`));
      });
    });
  }

  /**
   * Truncate response to fit platform limits.
   *
   * @param {string} response
   * @returns {string}
   */
  #truncateResponse(response) {
    if (response.length <= this.#maxResponseLength) {
      return response;
    }
    return response.slice(0, this.#maxResponseLength - 20) + '\n\n[...truncated]';
  }
}
