import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventEmitter } from 'node:events';
import { REPLChat } from '../../../tools/daemon/repl-chat.mjs';

// Mock child_process
vi.mock('node:child_process', () => {
  return {
    spawn: vi.fn(),
  };
});

describe('REPLChat', () => {
  let replChat;
  let mockSpawn;
  let outputCapture;

  beforeEach(async () => {
    // Import spawn mock
    const childProcess = await import('node:child_process');
    mockSpawn = childProcess.spawn;
    mockSpawn.mockClear();

    // Setup output capture
    outputCapture = [];
    const outputHandler = (text) => outputCapture.push(text);

    replChat = new REPLChat({ outputHandler });
  });

  afterEach(() => {
    if (replChat.running) {
      replChat.stop();
    }
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should use default options', () => {
      const chat = new REPLChat();

      expect(chat.agentCommand).toBe('claude');
      expect(chat.agentArgs).toEqual([]);
      expect(chat.cwd).toBe(process.cwd());
      expect(chat.activeProcess).toBeNull();
      expect(chat.running).toBe(false);
      expect(chat.inputQueue).toEqual([]);
      expect(chat.history).toEqual([]);
      expect(chat.maxHistory).toBe(100);
      expect(chat.readline).toBeNull();
      expect(chat.outputHandler).toBeNull();
      expect(chat.promptString).toBe('aiwg> ');
      expect(chat.supervisor).toBeNull();
    });

    it('should use custom options', () => {
      const outputHandler = vi.fn();
      const supervisor = { getStatus: vi.fn() };
      const chat = new REPLChat({
        agentCommand: 'custom-agent',
        agentArgs: ['--arg1', '--arg2'],
        cwd: '/custom/dir',
        maxHistory: 50,
        outputHandler,
        prompt: 'custom> ',
        supervisor,
      });

      expect(chat.agentCommand).toBe('custom-agent');
      expect(chat.agentArgs).toEqual(['--arg1', '--arg2']);
      expect(chat.cwd).toBe('/custom/dir');
      expect(chat.maxHistory).toBe(50);
      expect(chat.outputHandler).toBe(outputHandler);
      expect(chat.promptString).toBe('custom> ');
      expect(chat.supervisor).toBe(supervisor);
    });
  });

  describe('start', () => {
    it('should set running to true and emit started', async () => {
      const startedSpy = vi.fn();
      replChat.on('started', startedSpy);

      await replChat.start();

      expect(replChat.running).toBe(true);
      expect(startedSpy).toHaveBeenCalledTimes(1);
    });

    it('should setup readline interface when provided', async () => {
      const rl = new EventEmitter();
      rl.setPrompt = vi.fn();
      rl.prompt = vi.fn();
      rl.close = vi.fn();

      await replChat.start(rl);

      expect(replChat.readline).toBe(rl);
      expect(rl.setPrompt).toHaveBeenCalledWith('aiwg> ');
      expect(rl.prompt).toHaveBeenCalledTimes(1);
    });

    it('should handle readline line events', async () => {
      const rl = new EventEmitter();
      rl.setPrompt = vi.fn();
      rl.prompt = vi.fn();
      rl.close = vi.fn();

      // Mock spawn for message processing
      const mockProc = new EventEmitter();
      mockProc.stdout = new EventEmitter();
      mockProc.stderr = new EventEmitter();
      mockProc.pid = 1234;
      mockSpawn.mockReturnValue(mockProc);

      await replChat.start(rl);

      // Emit line event - this will trigger sendMessage which is async
      const linePromise = new Promise((resolve) => {
        replChat.on('message:sent', resolve);
      });
      rl.emit('line', 'test message');
      await linePromise;

      expect(mockSpawn).toHaveBeenCalledWith('claude', ['-p', 'test message'], expect.any(Object));
    });

    it('should prompt again on empty line', async () => {
      const rl = new EventEmitter();
      rl.setPrompt = vi.fn();
      rl.prompt = vi.fn();
      rl.close = vi.fn();

      await replChat.start(rl);
      rl.prompt.mockClear();

      rl.emit('line', '   ');

      expect(rl.prompt).toHaveBeenCalledTimes(1);
      expect(mockSpawn).not.toHaveBeenCalled();
    });

    it('should handle readline close event', async () => {
      const rl = new EventEmitter();
      rl.setPrompt = vi.fn();
      rl.prompt = vi.fn();
      rl.close = vi.fn();

      await replChat.start(rl);

      rl.emit('close');

      expect(replChat.running).toBe(false);
    });

    it('should be no-op when already running', async () => {
      const startedSpy = vi.fn();
      replChat.on('started', startedSpy);

      await replChat.start();
      await replChat.start();

      expect(startedSpy).toHaveBeenCalledTimes(1);
    });
  });

  describe('stop', () => {
    it('should set running to false and emit stopped', async () => {
      const stoppedSpy = vi.fn();
      replChat.on('stopped', stoppedSpy);

      await replChat.start();
      replChat.stop();

      expect(replChat.running).toBe(false);
      expect(stoppedSpy).toHaveBeenCalledTimes(1);
    });

    it('should kill active process', async () => {
      const mockProc = new EventEmitter();
      mockProc.stdout = new EventEmitter();
      mockProc.stderr = new EventEmitter();
      mockProc.pid = 1234;
      mockProc.kill = vi.fn();
      mockSpawn.mockReturnValue(mockProc);

      await replChat.start();
      const messagePromise = replChat.sendMessage('test');
      // Wait a tick for process to be assigned
      await Promise.resolve();

      replChat.stop();

      expect(mockProc.kill).toHaveBeenCalledWith('SIGTERM');
      expect(replChat.activeProcess).toBeNull();

      // Resolve the hanging promise
      mockProc.emit('exit', null, 'SIGTERM');
      await messagePromise.catch(() => {});
    });

    it('should handle process kill error gracefully', async () => {
      const mockProc = new EventEmitter();
      mockProc.stdout = new EventEmitter();
      mockProc.stderr = new EventEmitter();
      mockProc.pid = 1234;
      mockProc.kill = vi.fn(() => {
        throw new Error('Process not found');
      });
      mockSpawn.mockReturnValue(mockProc);

      await replChat.start();
      const messagePromise = replChat.sendMessage('test');
      await Promise.resolve();

      expect(() => replChat.stop()).not.toThrow();
      expect(replChat.activeProcess).toBeNull();

      mockProc.emit('exit', null, 'SIGTERM');
      await messagePromise.catch(() => {});
    });

    it('should close readline interface', async () => {
      const rl = new EventEmitter();
      rl.setPrompt = vi.fn();
      rl.prompt = vi.fn();
      rl.close = vi.fn();

      await replChat.start(rl);
      replChat.stop();

      expect(rl.close).toHaveBeenCalledTimes(1);
      expect(replChat.readline).toBeNull();
    });

    it('should be no-op when not running', () => {
      const stoppedSpy = vi.fn();
      replChat.on('stopped', stoppedSpy);

      replChat.stop();

      expect(stoppedSpy).not.toHaveBeenCalled();
    });
  });

  describe('sendMessage', () => {
    beforeEach(async () => {
      await replChat.start();
    });

    it('should throw when not running', async () => {
      replChat.stop();

      await expect(replChat.sendMessage('test')).rejects.toThrow('REPL is not running');
    });

    it('should add user message to history', async () => {
      const mockProc = new EventEmitter();
      mockProc.stdout = new EventEmitter();
      mockProc.stderr = new EventEmitter();
      mockProc.pid = 1234;
      mockSpawn.mockReturnValue(mockProc);

      const messagePromise = replChat.sendMessage('test message');

      // Wait for history to be added
      await Promise.resolve();

      expect(replChat.history).toHaveLength(1);
      expect(replChat.history[0].role).toBe('user');
      expect(replChat.history[0].content).toBe('test message');
      expect(replChat.history[0].timestamp).toBeDefined();

      // Clean up
      mockProc.emit('exit', 0);
      await messagePromise;
    });

    it('should queue message when agent is processing', async () => {
      const mockProc = new EventEmitter();
      mockProc.stdout = new EventEmitter();
      mockProc.stderr = new EventEmitter();
      mockProc.pid = 1234;
      mockSpawn.mockReturnValue(mockProc);

      const queuedSpy = vi.fn();
      replChat.on('queued', queuedSpy);

      const msg1Promise = replChat.sendMessage('msg1');
      await Promise.resolve(); // Wait for first message to start processing

      await replChat.sendMessage('msg2'); // This should be queued

      expect(replChat.inputQueue).toEqual(['msg2']);
      expect(queuedSpy).toHaveBeenCalledWith({
        message: 'msg2',
        queueSize: 1,
      });

      // Clean up - clear queue to prevent recursive _processMessage hang
      replChat.inputQueue = [];
      mockProc.emit('exit', 0);
      await msg1Promise;
    });

    it('should process message immediately when idle', async () => {
      const mockProc = new EventEmitter();
      mockProc.stdout = new EventEmitter();
      mockProc.stderr = new EventEmitter();
      mockProc.pid = 1234;
      mockSpawn.mockReturnValue(mockProc);

      const messagePromise = replChat.sendMessage('test message');

      await Promise.resolve();

      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        ['-p', 'test message'],
        expect.objectContaining({
          stdio: ['ignore', 'pipe', 'pipe'],
          cwd: process.cwd(),
        })
      );

      // Clean up
      mockProc.emit('exit', 0);
      await messagePromise;
    });
  });

  describe('getHistory', () => {
    beforeEach(async () => {
      await replChat.start();
      // Add some history entries
      for (let i = 1; i <= 5; i++) {
        replChat.history.push({
          role: 'user',
          content: `message ${i}`,
          timestamp: new Date().toISOString(),
        });
      }
    });

    it('should return all history entries', () => {
      const history = replChat.getHistory();

      expect(history).toHaveLength(5);
      expect(history[0].content).toBe('message 1');
      expect(history[4].content).toBe('message 5');
    });

    it('should return a copy of history', () => {
      const history = replChat.getHistory();

      history.push({ role: 'user', content: 'extra', timestamp: new Date().toISOString() });

      expect(replChat.history).toHaveLength(5);
    });
  });

  describe('isProcessing getter', () => {
    beforeEach(async () => {
      await replChat.start();
    });

    it('should return false when no active process', () => {
      expect(replChat.isProcessing).toBe(false);
    });

    it('should return true when process is active', async () => {
      const mockProc = new EventEmitter();
      mockProc.stdout = new EventEmitter();
      mockProc.stderr = new EventEmitter();
      mockProc.pid = 1234;
      mockSpawn.mockReturnValue(mockProc);

      const messagePromise = replChat.sendMessage('test');
      await Promise.resolve();

      expect(replChat.isProcessing).toBe(true);

      // Clean up
      mockProc.emit('exit', 0);
      await messagePromise;
    });
  });

  describe('queueSize getter', () => {
    beforeEach(async () => {
      await replChat.start();
    });

    it('should return queue length', async () => {
      const mockProc = new EventEmitter();
      mockProc.stdout = new EventEmitter();
      mockProc.stderr = new EventEmitter();
      mockProc.pid = 1234;
      mockSpawn.mockReturnValue(mockProc);

      expect(replChat.queueSize).toBe(0);

      const msg1Promise = replChat.sendMessage('msg1');
      await Promise.resolve();
      await replChat.sendMessage('msg2');
      await replChat.sendMessage('msg3');

      expect(replChat.queueSize).toBe(2);

      // Clean up - clear queue to prevent recursive _processMessage hang
      replChat.inputQueue = [];
      mockProc.emit('exit', 0);
      await msg1Promise;
    });
  });

  describe('_handleCommand', () => {
    beforeEach(async () => {
      await replChat.start();
      outputCapture = [];
    });

    it('should handle /quit command', () => {
      const stoppedSpy = vi.fn();
      replChat.on('stopped', stoppedSpy);

      replChat._handleCommand('/quit');

      expect(replChat.running).toBe(false);
      expect(stoppedSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle /exit command', () => {
      const stoppedSpy = vi.fn();
      replChat.on('stopped', stoppedSpy);

      replChat._handleCommand('/exit');

      expect(replChat.running).toBe(false);
      expect(stoppedSpy).toHaveBeenCalledTimes(1);
    });

    it('should handle /cancel with active process', async () => {
      const mockProc = new EventEmitter();
      mockProc.stdout = new EventEmitter();
      mockProc.stderr = new EventEmitter();
      mockProc.pid = 1234;
      mockProc.kill = vi.fn();
      mockSpawn.mockReturnValue(mockProc);

      const messagePromise = replChat.sendMessage('test');
      await Promise.resolve();
      outputCapture = [];

      replChat._handleCommand('/cancel');

      expect(mockProc.kill).toHaveBeenCalledWith('SIGTERM');
      expect(outputCapture.some(line => line.includes('Cancelled'))).toBe(true);

      // Clean up
      mockProc.emit('exit', null, 'SIGTERM');
      await messagePromise;
    });

    it('should handle /cancel without active process', () => {
      replChat._handleCommand('/cancel');

      expect(outputCapture.some(line => line.includes('No active process to cancel'))).toBe(true);
    });

    it('should handle /status without supervisor', () => {
      replChat._handleCommand('/status');

      const output = outputCapture.join('\n');
      expect(output).toContain('--- Status ---');
      expect(output).toContain('Running: true');
      expect(output).toContain('Processing: false');
      expect(output).toContain('Queue: 0 message(s)');
      expect(output).toContain('History: 0 entries');
    });

    it('should handle /status with supervisor', () => {
      const supervisor = {
        getStatus: vi.fn(() => ({
          running: 2,
          queued: 3,
        })),
      };
      replChat.supervisor = supervisor;

      replChat._handleCommand('/status');

      const output = outputCapture.join('\n');
      expect(output).toContain('Agents running: 2');
      expect(output).toContain('Agents queued: 3');
      expect(supervisor.getStatus).toHaveBeenCalledTimes(1);
    });

    it('should handle /history with entries', () => {
      replChat.history.push({ role: 'user', content: 'msg1', timestamp: new Date().toISOString() });
      replChat.history.push({ role: 'assistant', content: 'response1', timestamp: new Date().toISOString() });
      outputCapture = [];

      replChat._handleCommand('/history');

      const output = outputCapture.join('');
      expect(output).toContain('[You] msg1');
      expect(output).toContain('[AI] response1');
    });

    it('should handle /history when empty', () => {
      replChat._handleCommand('/history');

      expect(outputCapture.some(line => line.includes('No chat history'))).toBe(true);
    });

    it('should handle /tasks without supervisor', () => {
      replChat._handleCommand('/tasks');

      expect(outputCapture.some(line => line.includes('No agent supervisor available'))).toBe(true);
    });

    it('should handle /tasks with supervisor and no tasks', () => {
      const supervisor = {
        getStatus: vi.fn(() => ({
          running: 0,
          queued: 0,
          tasks: {
            running: [],
            queued: [],
          },
        })),
      };
      replChat.supervisor = supervisor;

      replChat._handleCommand('/tasks');

      expect(outputCapture.some(line => line.includes('No active tasks'))).toBe(true);
    });

    it('should handle /tasks with supervisor and active tasks', () => {
      const supervisor = {
        getStatus: vi.fn(() => ({
          running: 1,
          queued: 2,
          tasks: {
            running: [{ id: 'task-1', prompt: 'running task', pid: 1234 }],
            queued: [
              { id: 'task-2', prompt: 'queued task 1' },
              { id: 'task-3', prompt: 'queued task 2' },
            ],
          },
        })),
      };
      replChat.supervisor = supervisor;

      replChat._handleCommand('/tasks');

      const output = outputCapture.join('\n');
      expect(output).toContain('Running:');
      expect(output).toContain('task-1: running task (PID 1234)');
      expect(output).toContain('Queued:');
      expect(output).toContain('task-2: queued task 1');
      expect(output).toContain('task-3: queued task 2');
    });

    it('should handle /run without supervisor', () => {
      replChat._handleCommand('/run test prompt');

      expect(outputCapture.some(line => line.includes('No agent supervisor available'))).toBe(true);
    });

    it('should handle /run with missing prompt', () => {
      const supervisor = {
        submit: vi.fn(),
      };
      replChat.supervisor = supervisor;

      replChat._handleCommand('/run');

      expect(outputCapture.some(line => line.includes('Usage: /run <prompt>'))).toBe(true);
      expect(supervisor.submit).not.toHaveBeenCalled();
    });

    it('should handle /run with prompt', () => {
      const supervisor = {
        submit: vi.fn(() => ({ id: 'task-123' })),
      };
      replChat.supervisor = supervisor;

      replChat._handleCommand('/run test prompt here');

      expect(supervisor.submit).toHaveBeenCalledWith('test prompt here');
      expect(outputCapture.some(line => line.includes('Task submitted: task-123'))).toBe(true);
    });

    it('should handle /help command', () => {
      replChat._handleCommand('/help');

      const output = outputCapture.join('\n');
      expect(output).toContain('--- Commands ---');
      expect(output).toContain('/help');
      expect(output).toContain('/status');
      expect(output).toContain('/history');
      expect(output).toContain('/tasks');
      expect(output).toContain('/run');
      expect(output).toContain('/cancel');
      expect(output).toContain('/quit');
    });

    it('should handle unknown command', () => {
      replChat._handleCommand('/unknown');

      expect(outputCapture.some(line => line.includes('Unknown command: /unknown'))).toBe(true);
    });

    it('should prompt after command when readline is active', () => {
      const rl = new EventEmitter();
      rl.setPrompt = vi.fn();
      rl.prompt = vi.fn();
      rl.close = vi.fn();

      replChat.readline = rl;
      rl.prompt.mockClear();

      replChat._handleCommand('/help');

      expect(rl.prompt).toHaveBeenCalledTimes(1);
    });
  });

  describe('_processMessage', () => {
    beforeEach(async () => {
      await replChat.start();
    });

    it('should spawn process with correct arguments', async () => {
      const mockProc = new EventEmitter();
      mockProc.stdout = new EventEmitter();
      mockProc.stderr = new EventEmitter();
      mockProc.pid = 1234;
      mockSpawn.mockReturnValue(mockProc);

      const messagePromise = replChat.sendMessage('test message');
      await Promise.resolve();

      expect(mockSpawn).toHaveBeenCalledWith(
        'claude',
        ['-p', 'test message'],
        expect.objectContaining({
          stdio: ['ignore', 'pipe', 'pipe'],
          cwd: process.cwd(),
          env: expect.any(Object),
        })
      );

      // Clean up
      mockProc.emit('exit', 0);
      await messagePromise;
    });

    it('should emit processing:start event', async () => {
      const mockProc = new EventEmitter();
      mockProc.stdout = new EventEmitter();
      mockProc.stderr = new EventEmitter();
      mockProc.pid = 1234;
      mockSpawn.mockReturnValue(mockProc);

      const startedSpy = vi.fn();
      replChat.on('processing:start', startedSpy);

      const messagePromise = replChat.sendMessage('test');
      await Promise.resolve();

      expect(startedSpy).toHaveBeenCalledWith({
        message: 'test',
      });

      // Clean up
      mockProc.emit('exit', 0);
      await messagePromise;
    });

    it('should stream stdout to output', async () => {
      const mockProc = new EventEmitter();
      mockProc.stdout = new EventEmitter();
      mockProc.stderr = new EventEmitter();
      mockProc.pid = 1234;
      mockSpawn.mockReturnValue(mockProc);

      const messagePromise = replChat.sendMessage('test');
      await Promise.resolve();
      outputCapture = [];

      mockProc.stdout.emit('data', Buffer.from('line 1\n'));
      mockProc.stdout.emit('data', Buffer.from('line 2\n'));

      expect(outputCapture).toContain('line 1\n');
      expect(outputCapture).toContain('line 2\n');

      // Clean up
      mockProc.emit('exit', 0);
      await messagePromise;
    });

    it('should emit output events for stderr', async () => {
      const mockProc = new EventEmitter();
      mockProc.stdout = new EventEmitter();
      mockProc.stderr = new EventEmitter();
      mockProc.pid = 1234;
      mockSpawn.mockReturnValue(mockProc);

      const outputSpy = vi.fn();
      replChat.on('output', outputSpy);

      const messagePromise = replChat.sendMessage('test');
      await Promise.resolve();

      mockProc.stderr.emit('data', Buffer.from('error message\n'));

      expect(outputSpy).toHaveBeenCalledWith({
        chunk: 'error message\n',
        stream: 'stderr',
      });

      // Clean up
      mockProc.emit('exit', 0);
      await messagePromise;
    });

    it('should handle successful exit and add output to history', async () => {
      const mockProc = new EventEmitter();
      mockProc.stdout = new EventEmitter();
      mockProc.stderr = new EventEmitter();
      mockProc.pid = 1234;
      mockSpawn.mockReturnValue(mockProc);

      const messagePromise = replChat.sendMessage('test');
      await Promise.resolve();

      mockProc.stdout.emit('data', Buffer.from('response text'));
      mockProc.emit('exit', 0);

      await messagePromise;

      expect(replChat.activeProcess).toBeNull();

      const assistantEntry = replChat.history.find(e => e.role === 'assistant');
      expect(assistantEntry).toBeDefined();
      expect(assistantEntry.content).toBe('response text');
    });

    it('should handle SIGTERM exit without error', async () => {
      const mockProc = new EventEmitter();
      mockProc.stdout = new EventEmitter();
      mockProc.stderr = new EventEmitter();
      mockProc.pid = 1234;
      mockSpawn.mockReturnValue(mockProc);

      const messagePromise = replChat.sendMessage('test');
      await Promise.resolve();

      mockProc.emit('exit', null, 'SIGTERM');

      await messagePromise;

      expect(replChat.activeProcess).toBeNull();
      // Should not add assistant entry on cancel
      const assistantEntry = replChat.history.find(e => e.role === 'assistant');
      expect(assistantEntry).toBeUndefined();
    });

    it('should handle non-zero exit code as error', async () => {
      const mockProc = new EventEmitter();
      mockProc.stdout = new EventEmitter();
      mockProc.stderr = new EventEmitter();
      mockProc.pid = 1234;
      mockSpawn.mockReturnValue(mockProc);

      // Add error listener to prevent EventEmitter throw on emit('error')
      replChat.on('error', () => {});

      const messagePromise = replChat.sendMessage('test');
      await Promise.resolve();

      mockProc.emit('exit', 1);

      await messagePromise;

      expect(outputCapture.some(line => line.includes('[Error: Process exited with code 1]'))).toBe(true);
    });

    it('should process next queued message on completion', async () => {
      const mockProc1 = new EventEmitter();
      mockProc1.stdout = new EventEmitter();
      mockProc1.stderr = new EventEmitter();
      mockProc1.pid = 1234;

      const mockProc2 = new EventEmitter();
      mockProc2.stdout = new EventEmitter();
      mockProc2.stderr = new EventEmitter();
      mockProc2.pid = 5678;

      mockSpawn
        .mockReturnValueOnce(mockProc1)
        .mockReturnValueOnce(mockProc2);

      const msg1Promise = replChat.sendMessage('msg1');
      await Promise.resolve();
      await replChat.sendMessage('msg2');

      expect(replChat.queueSize).toBe(1);

      // When mockProc1 exits, _processMessage recursively processes msg2
      // msg1Promise won't resolve until msg2 also completes
      mockProc1.emit('exit', 0);

      // Allow microtasks for msg2 to be spawned
      await new Promise(resolve => setTimeout(resolve, 10));

      expect(mockSpawn).toHaveBeenCalledTimes(2);
      expect(mockSpawn).toHaveBeenLastCalledWith(
        'claude',
        ['-p', 'msg2'],
        expect.any(Object)
      );
      expect(replChat.queueSize).toBe(0);

      // Exit mockProc2 so msg1Promise can resolve
      mockProc2.emit('exit', 0);
      await msg1Promise;
    });

    it('should prompt readline when queue is empty after completion', async () => {
      const rl = new EventEmitter();
      rl.setPrompt = vi.fn();
      rl.prompt = vi.fn();
      rl.close = vi.fn();

      replChat.readline = rl;

      const mockProc = new EventEmitter();
      mockProc.stdout = new EventEmitter();
      mockProc.stderr = new EventEmitter();
      mockProc.pid = 1234;
      mockSpawn.mockReturnValue(mockProc);

      const messagePromise = replChat.sendMessage('test');
      await Promise.resolve();
      rl.prompt.mockClear();

      mockProc.emit('exit', 0);
      await messagePromise;

      expect(rl.prompt).toHaveBeenCalledTimes(1);
    });

    it('should handle process spawn error', async () => {
      const mockProc = new EventEmitter();
      mockProc.stdout = new EventEmitter();
      mockProc.stderr = new EventEmitter();
      mockProc.pid = 1234;
      mockSpawn.mockReturnValue(mockProc);

      const errorSpy = vi.fn();
      replChat.on('error', errorSpy);

      const messagePromise = replChat.sendMessage('test');
      await Promise.resolve();
      outputCapture = [];

      mockProc.emit('error', new Error('spawn failed'));

      await messagePromise;

      expect(replChat.activeProcess).toBeNull();
      expect(errorSpy).toHaveBeenCalledWith(expect.objectContaining({
        message: 'spawn failed',
      }));
      expect(outputCapture.some(line => line.includes('[Error: spawn failed]'))).toBe(true);
    });

    it('should respect maxHistory limit', async () => {
      const chat = new REPLChat({
        maxHistory: 3,
        outputHandler: (text) => outputCapture.push(text),
      });
      await chat.start();

      const mockProc = new EventEmitter();
      mockProc.stdout = new EventEmitter();
      mockProc.stderr = new EventEmitter();
      mockProc.pid = 1234;
      mockSpawn.mockReturnValue(mockProc);

      // Send 3 messages
      for (let i = 1; i <= 3; i++) {
        const messagePromise = chat.sendMessage(`msg ${i}`);
        await Promise.resolve();
        mockProc.stdout.emit('data', Buffer.from(`response ${i}`));
        mockProc.emit('exit', 0);
        await messagePromise;
        await Promise.resolve();
      }

      // History should contain 3 entries (trimmed to maxHistory)
      expect(chat.history.length).toBeLessThanOrEqual(3);
    });
  });

  describe('_write', () => {
    it('should use outputHandler when provided', () => {
      const outputHandler = vi.fn();
      const chat = new REPLChat({ outputHandler });

      chat._write('test output');

      expect(outputHandler).toHaveBeenCalledWith('test output');
    });

    it('should use process.stdout when no outputHandler', () => {
      const chat = new REPLChat();
      const stdoutWrite = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);

      chat._write('test output');

      expect(stdoutWrite).toHaveBeenCalledWith('test output');

      stdoutWrite.mockRestore();
    });
  });
});
