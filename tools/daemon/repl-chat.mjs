/**
 * REPL Chat Interface - Interactive conversation with claude -p streaming
 *
 * Provides a readline-based chat interface that spawns claude -p for AI reasoning,
 * streams output back to the user, and handles agent notifications.
 *
 * @implements @.aiwg/requirements/use-cases/UC-REPL-001.md
 * @tests @test/unit/daemon/repl-chat.test.js
 */

import { spawn } from 'node:child_process';
import { EventEmitter } from 'node:events';

export class REPLChat extends EventEmitter {
  constructor(options = {}) {
    super();
    this.agentCommand = options.agentCommand || 'claude';
    this.agentArgs = options.agentArgs || [];
    this.cwd = options.cwd || process.cwd();
    this.activeProcess = null;
    this.running = false;
    this.inputQueue = [];
    this.history = [];
    this.maxHistory = options.maxHistory || 100;
    this.readline = null;
    this.outputHandler = options.outputHandler || null;
    this.promptString = options.prompt || 'aiwg> ';
    this.supervisor = options.supervisor || null;
  }

  /**
   * Start the REPL chat interface
   * @param {object} rlInterface - A readline.Interface instance (injected for testability)
   */
  async start(rlInterface) {
    if (this.running) return;
    this.running = true;

    this.readline = rlInterface;

    if (this.readline) {
      this.readline.on('line', (line) => {
        this._handleInput(line.trim());
      });

      this.readline.on('close', () => {
        this.stop();
      });

      this.readline.setPrompt(this.promptString);
      this.readline.prompt();
    }

    this.emit('started');
  }

  /**
   * Stop the REPL chat interface
   */
  stop() {
    if (!this.running) return;
    this.running = false;

    if (this.activeProcess) {
      try {
        this.activeProcess.kill('SIGTERM');
      } catch {
        // Process may have already exited
      }
      this.activeProcess = null;
    }

    if (this.readline) {
      this.readline.close();
      this.readline = null;
    }

    this.emit('stopped');
  }

  /**
   * Send a message to be processed by the AI
   * Can be called programmatically (e.g., from IPC)
   */
  async sendMessage(message) {
    if (!this.running) {
      throw new Error('REPL is not running');
    }

    if (this.activeProcess) {
      this.inputQueue.push(message);
      this.emit('queued', { message, queueSize: this.inputQueue.length });
      return;
    }

    await this._processMessage(message);
  }

  /**
   * Get chat history
   */
  getHistory() {
    return [...this.history];
  }

  /**
   * Check if AI is currently processing
   */
  get isProcessing() {
    return this.activeProcess !== null;
  }

  /**
   * Get queue size
   */
  get queueSize() {
    return this.inputQueue.length;
  }

  // --- Private methods ---

  _handleInput(input) {
    if (!input) {
      if (this.readline) this.readline.prompt();
      return;
    }

    // Handle built-in commands
    if (input.startsWith('/')) {
      this._handleCommand(input);
      return;
    }

    this.sendMessage(input);
  }

  _handleCommand(input) {
    const parts = input.slice(1).split(/\s+/);
    const command = parts[0].toLowerCase();
    const args = parts.slice(1);

    switch (command) {
      case 'quit':
      case 'exit':
        this.stop();
        return;

      case 'cancel':
        if (this.activeProcess) {
          try {
            this.activeProcess.kill('SIGTERM');
          } catch {
            // Already dead
          }
          this._write('\n[Cancelled]\n');
        } else {
          this._write('No active process to cancel\n');
        }
        break;

      case 'status':
        this._showStatus();
        break;

      case 'history':
        this._showHistory();
        break;

      case 'tasks':
        this._showTasks();
        break;

      case 'run': {
        const prompt = args.join(' ');
        if (!prompt) {
          this._write('Usage: /run <prompt>\n');
        } else if (this.supervisor) {
          const task = this.supervisor.submit(prompt);
          this._write(`Task submitted: ${task.id}\n`);
        } else {
          this._write('No agent supervisor available\n');
        }
        break;
      }

      case 'help':
        this._showHelp();
        break;

      default:
        this._write(`Unknown command: /${command}. Type /help for available commands.\n`);
    }

    if (this.readline && this.running) {
      this.readline.prompt();
    }
  }

  async _processMessage(message) {
    this.history.push({ role: 'user', content: message, timestamp: new Date().toISOString() });

    if (this.history.length > this.maxHistory) {
      this.history.shift();
    }

    this.emit('message:sent', { message });

    const args = [...this.agentArgs, '-p', message];
    let stdout = '';

    try {
      this.activeProcess = spawn(this.agentCommand, args, {
        cwd: this.cwd,
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env },
      });

      this.emit('processing:start', { message });

      this.activeProcess.stdout.on('data', (chunk) => {
        const text = chunk.toString();
        stdout += text;
        this._write(text);
        this.emit('output', { chunk: text, stream: 'stdout' });
      });

      this.activeProcess.stderr.on('data', (chunk) => {
        const text = chunk.toString();
        this.emit('output', { chunk: text, stream: 'stderr' });
      });

      await new Promise((resolve, reject) => {
        this.activeProcess.on('exit', (code, signal) => {
          this.activeProcess = null;

          if (signal === 'SIGTERM' || signal === 'SIGKILL') {
            resolve();
          } else if (code === 0) {
            this.history.push({
              role: 'assistant',
              content: stdout,
              timestamp: new Date().toISOString(),
            });

            if (this.history.length > this.maxHistory) {
              this.history.shift();
            }
            resolve();
          } else {
            reject(new Error(`Process exited with code ${code}`));
          }
        });

        this.activeProcess.on('error', (err) => {
          this.activeProcess = null;
          reject(err);
        });
      });
    } catch (err) {
      this._write(`\n[Error: ${err.message}]\n`);
      this.emit('error', err);
    }

    this.emit('processing:end');
    this._write('\n');

    // Process next queued message
    if (this.inputQueue.length > 0) {
      const next = this.inputQueue.shift();
      await this._processMessage(next);
    } else if (this.readline && this.running) {
      this.readline.prompt();
    }
  }

  _write(text) {
    if (this.outputHandler) {
      this.outputHandler(text);
    } else {
      process.stdout.write(text);
    }
  }

  _showStatus() {
    const lines = [
      '--- Status ---',
      `Running: ${this.running}`,
      `Processing: ${this.isProcessing}`,
      `Queue: ${this.inputQueue.length} message(s)`,
      `History: ${this.history.length} entries`,
    ];

    if (this.supervisor) {
      const status = this.supervisor.getStatus();
      lines.push(`Agents running: ${status.running}`);
      lines.push(`Agents queued: ${status.queued}`);
    }

    this._write(lines.join('\n') + '\n');
  }

  _showHistory() {
    if (this.history.length === 0) {
      this._write('No chat history\n');
      return;
    }

    const recent = this.history.slice(-10);
    for (const entry of recent) {
      const prefix = entry.role === 'user' ? 'You' : 'AI';
      const preview = entry.content.slice(0, 80).replace(/\n/g, ' ');
      this._write(`[${prefix}] ${preview}${entry.content.length > 80 ? '...' : ''}\n`);
    }
  }

  _showTasks() {
    if (!this.supervisor) {
      this._write('No agent supervisor available\n');
      return;
    }

    const status = this.supervisor.getStatus();

    if (status.tasks.running.length === 0 && status.tasks.queued.length === 0) {
      this._write('No active tasks\n');
      return;
    }

    if (status.tasks.running.length > 0) {
      this._write('Running:\n');
      for (const t of status.tasks.running) {
        this._write(`  ${t.id}: ${t.prompt} (PID ${t.pid})\n`);
      }
    }

    if (status.tasks.queued.length > 0) {
      this._write('Queued:\n');
      for (const t of status.tasks.queued) {
        this._write(`  ${t.id}: ${t.prompt}\n`);
      }
    }
  }

  _showHelp() {
    this._write([
      '--- Commands ---',
      '/help       - Show this help',
      '/status     - Show REPL and agent status',
      '/history    - Show recent chat history',
      '/tasks      - Show running and queued agent tasks',
      '/run <msg>  - Submit background agent task',
      '/cancel     - Cancel current AI processing',
      '/quit       - Exit the REPL',
      '',
    ].join('\n'));
  }
}
