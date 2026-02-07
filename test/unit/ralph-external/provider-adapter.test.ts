/**
 * Unit tests for Provider Adapter system
 *
 * Tests the base class, factory, Claude adapter, and Codex adapter
 * for the external Ralph loop multi-provider support.
 *
 * @source @tools/ralph-external/lib/provider-adapter.mjs
 * @source @tools/ralph-external/lib/claude-adapter.mjs
 * @source @tools/ralph-external/lib/codex-adapter.mjs
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';

// Dynamic imports for .mjs modules
let ProviderAdapter: any;
let createProvider: any;
let registerProvider: any;
let listProviders: any;
let hasProvider: any;
let ClaudeAdapter: any;
let CodexAdapter: any;

beforeEach(async () => {
  const adapterMod = await import('../../../tools/ralph-external/lib/provider-adapter.mjs');
  ProviderAdapter = adapterMod.ProviderAdapter;
  createProvider = adapterMod.createProvider;
  registerProvider = adapterMod.registerProvider;
  listProviders = adapterMod.listProviders;
  hasProvider = adapterMod.hasProvider;

  const claudeMod = await import('../../../tools/ralph-external/lib/claude-adapter.mjs');
  ClaudeAdapter = claudeMod.ClaudeAdapter;

  const codexMod = await import('../../../tools/ralph-external/lib/codex-adapter.mjs');
  CodexAdapter = codexMod.CodexAdapter;
});

// ============================================================================
// Base Class Tests
// ============================================================================

describe('ProviderAdapter (base class)', () => {
  it('cannot be instantiated directly', () => {
    expect(() => new ProviderAdapter()).toThrow('abstract');
  });

  it('subclass can be instantiated', () => {
    class TestAdapter extends ProviderAdapter {
      getBinary() { return 'test'; }
      getName() { return 'test'; }
      getCapabilities() { return {}; }
      buildSessionArgs() { return []; }
      buildAnalysisArgs() { return []; }
      mapModel(m: string) { return m; }
    }
    expect(() => new TestAdapter()).not.toThrow();
  });
});

// ============================================================================
// Registry & Factory Tests
// ============================================================================

describe('Provider Registry', () => {
  it('has claude registered', () => {
    expect(hasProvider('claude')).toBe(true);
  });

  it('has codex registered', () => {
    expect(hasProvider('codex')).toBe(true);
  });

  it('lists registered providers', () => {
    const providers = listProviders();
    expect(providers).toContain('claude');
    expect(providers).toContain('codex');
  });

  it('creates claude adapter via factory', () => {
    const adapter = createProvider('claude');
    expect(adapter).toBeInstanceOf(ClaudeAdapter);
    expect(adapter.getName()).toBe('claude');
  });

  it('creates codex adapter via factory', () => {
    const adapter = createProvider('codex');
    expect(adapter).toBeInstanceOf(CodexAdapter);
    expect(adapter.getName()).toBe('codex');
  });

  it('factory is case-insensitive', () => {
    expect(createProvider('Claude')).toBeInstanceOf(ClaudeAdapter);
    expect(createProvider('CODEX')).toBeInstanceOf(CodexAdapter);
  });

  it('throws on unknown provider', () => {
    expect(() => createProvider('nonexistent')).toThrow('Unknown provider');
    expect(() => createProvider('nonexistent')).toThrow('Available providers');
  });
});

// ============================================================================
// Claude Adapter Tests
// ============================================================================

describe('ClaudeAdapter', () => {
  let adapter: any;

  beforeEach(() => {
    adapter = new ClaudeAdapter();
  });

  describe('identity', () => {
    it('returns correct binary', () => {
      expect(adapter.getBinary()).toBe('claude');
    });

    it('returns correct name', () => {
      expect(adapter.getName()).toBe('claude');
    });
  });

  describe('capabilities', () => {
    it('supports all capabilities', () => {
      const caps = adapter.getCapabilities();
      expect(caps.streamJson).toBe(true);
      expect(caps.sessionResume).toBe(true);
      expect(caps.budgetControl).toBe(true);
      expect(caps.systemPrompt).toBe(true);
      expect(caps.agentMode).toBe(true);
      expect(caps.mcpConfig).toBe(true);
      expect(caps.maxTurns).toBe(true);
    });

    it('hasCapability returns true for all', () => {
      expect(adapter.hasCapability('streamJson')).toBe(true);
      expect(adapter.hasCapability('budgetControl')).toBe(true);
    });
  });

  describe('model mapping', () => {
    it('passes through Claude model names', () => {
      expect(adapter.mapModel('opus')).toBe('opus');
      expect(adapter.mapModel('sonnet')).toBe('sonnet');
      expect(adapter.mapModel('haiku')).toBe('haiku');
    });

    it('passes through arbitrary model names', () => {
      expect(adapter.mapModel('claude-3.5-sonnet')).toBe('claude-3.5-sonnet');
    });
  });

  describe('buildSessionArgs', () => {
    it('includes required flags', () => {
      const args = adapter.buildSessionArgs({ prompt: 'test task' });
      expect(args).toContain('--dangerously-skip-permissions');
      expect(args).toContain('--print');
      expect(args).toContain('--output-format');
      expect(args).toContain('stream-json');
      expect(args[args.length - 1]).toBe('test task');
    });

    it('includes session ID when provided', () => {
      const args = adapter.buildSessionArgs({
        prompt: 'task',
        sessionId: 'abc-123',
      });
      expect(args).toContain('--session-id');
      expect(args).toContain('abc-123');
    });

    it('includes model when provided', () => {
      const args = adapter.buildSessionArgs({
        prompt: 'task',
        model: 'opus',
      });
      expect(args).toContain('--model');
      expect(args).toContain('opus');
    });

    it('includes budget when provided', () => {
      const args = adapter.buildSessionArgs({
        prompt: 'task',
        budget: 2.5,
      });
      expect(args).toContain('--max-budget-usd');
      expect(args).toContain('2.5');
    });

    it('includes max turns when provided', () => {
      const args = adapter.buildSessionArgs({
        prompt: 'task',
        maxTurns: 50,
      });
      expect(args).toContain('--max-turns');
      expect(args).toContain('50');
    });

    it('includes verbose flag', () => {
      const args = adapter.buildSessionArgs({
        prompt: 'task',
        verbose: true,
      });
      expect(args).toContain('--verbose');
    });

    it('includes MCP config as JSON', () => {
      const mcpConfig = { servers: { test: { command: 'test' } } };
      const args = adapter.buildSessionArgs({
        prompt: 'task',
        mcpConfig,
      });
      expect(args).toContain('--mcp-config');
      expect(args).toContain(JSON.stringify(mcpConfig));
    });

    it('includes system prompt', () => {
      const args = adapter.buildSessionArgs({
        prompt: 'task',
        systemPrompt: 'You are helpful',
      });
      expect(args).toContain('--append-system-prompt');
      expect(args).toContain('You are helpful');
    });

    it('puts prompt last', () => {
      const args = adapter.buildSessionArgs({
        prompt: 'my task',
        model: 'opus',
        budget: 5,
        verbose: true,
      });
      expect(args[args.length - 1]).toBe('my task');
    });
  });

  describe('buildAnalysisArgs', () => {
    it('includes required flags', () => {
      const args = adapter.buildAnalysisArgs({ prompt: 'analyze this' });
      expect(args).toContain('--dangerously-skip-permissions');
      expect(args).toContain('--print');
      expect(args).toContain('--output-format');
      expect(args).toContain('json');
      expect(args[args.length - 1]).toBe('analyze this');
    });

    it('includes model when provided', () => {
      const args = adapter.buildAnalysisArgs({
        prompt: 'analyze',
        model: 'sonnet',
      });
      expect(args).toContain('--model');
      expect(args).toContain('sonnet');
    });

    it('includes agent when provided', () => {
      const args = adapter.buildAnalysisArgs({
        prompt: 'analyze',
        agent: 'ralph-output-analyzer',
      });
      expect(args).toContain('--agent');
      expect(args).toContain('ralph-output-analyzer');
    });
  });

  describe('environment overrides', () => {
    it('sets CI=true', () => {
      expect(adapter.getEnvOverrides()).toEqual({ CI: 'true' });
    });
  });

  describe('transcript path', () => {
    it('returns Claude transcript path', () => {
      const path = adapter.getTranscriptPath('session-123', '/my/project');
      expect(path).toContain('.claude');
      expect(path).toContain('projects');
      expect(path).toContain('session-123.jsonl');
    });
  });

  describe('output parsing', () => {
    it('extracts JSON from stdout', () => {
      const result = adapter.parseOutput('Some text {"key": "value"} more text');
      expect(result).toEqual({ key: 'value' });
    });

    it('returns null for non-JSON', () => {
      expect(adapter.parseOutput('no json here')).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(adapter.parseOutput('')).toBeNull();
    });
  });
});

// ============================================================================
// Codex Adapter Tests
// ============================================================================

describe('CodexAdapter', () => {
  let adapter: any;

  beforeEach(() => {
    adapter = new CodexAdapter();
  });

  describe('identity', () => {
    it('returns correct binary', () => {
      expect(adapter.getBinary()).toBe('codex');
    });

    it('returns correct name', () => {
      expect(adapter.getName()).toBe('codex');
    });
  });

  describe('capabilities', () => {
    it('reports limited capabilities', () => {
      const caps = adapter.getCapabilities();
      expect(caps.streamJson).toBe(false);
      expect(caps.sessionResume).toBe(false);
      expect(caps.budgetControl).toBe(false);
      expect(caps.systemPrompt).toBe(false);
      expect(caps.agentMode).toBe(false);
      expect(caps.mcpConfig).toBe(false);
      expect(caps.maxTurns).toBe(false);
    });

    it('hasCapability returns false for unsupported', () => {
      expect(adapter.hasCapability('streamJson')).toBe(false);
      expect(adapter.hasCapability('budgetControl')).toBe(false);
    });
  });

  describe('model mapping', () => {
    it('maps opus to gpt-5.3-codex', () => {
      expect(adapter.mapModel('opus')).toBe('gpt-5.3-codex');
    });

    it('maps sonnet to codex-mini-latest', () => {
      expect(adapter.mapModel('sonnet')).toBe('codex-mini-latest');
    });

    it('maps haiku to gpt-5-codex-mini', () => {
      expect(adapter.mapModel('haiku')).toBe('gpt-5-codex-mini');
    });

    it('is case-insensitive', () => {
      expect(adapter.mapModel('OPUS')).toBe('gpt-5.3-codex');
      expect(adapter.mapModel('Sonnet')).toBe('codex-mini-latest');
    });

    it('passes through unknown model names', () => {
      expect(adapter.mapModel('gpt-5.3-codex')).toBe('gpt-5.3-codex');
      expect(adapter.mapModel('custom-model')).toBe('custom-model');
    });
  });

  describe('buildSessionArgs', () => {
    it('uses --full-auto instead of --dangerously-skip-permissions', () => {
      const args = adapter.buildSessionArgs({ prompt: 'task' });
      expect(args).toContain('--full-auto');
      expect(args).not.toContain('--dangerously-skip-permissions');
      expect(args).not.toContain('--print');
      expect(args).not.toContain('--output-format');
    });

    it('maps model names', () => {
      const args = adapter.buildSessionArgs({
        prompt: 'task',
        model: 'opus',
      });
      expect(args).toContain('--model');
      expect(args).toContain('gpt-5.3-codex');
    });

    it('injects system prompt into main prompt', () => {
      const args = adapter.buildSessionArgs({
        prompt: 'my task',
        systemPrompt: 'Be helpful',
      });
      const lastArg = args[args.length - 1];
      expect(lastArg).toContain('Be helpful');
      expect(lastArg).toContain('my task');
      expect(lastArg).toContain('[System Context]');
    });

    it('puts prompt last', () => {
      const args = adapter.buildSessionArgs({ prompt: 'do stuff' });
      expect(args[args.length - 1]).toBe('do stuff');
    });

    it('warns on unsupported budget', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      adapter.buildSessionArgs({ prompt: 'task', budget: 5 });
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Budget control')
      );
      warnSpy.mockRestore();
    });

    it('warns on unsupported MCP config', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      adapter.buildSessionArgs({ prompt: 'task', mcpConfig: {} });
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('MCP configuration')
      );
      warnSpy.mockRestore();
    });
  });

  describe('buildAnalysisArgs', () => {
    it('uses --full-auto and --quiet', () => {
      const args = adapter.buildAnalysisArgs({ prompt: 'analyze' });
      expect(args).toContain('--full-auto');
      expect(args).toContain('--quiet');
      expect(args).not.toContain('--dangerously-skip-permissions');
    });

    it('maps model names', () => {
      const args = adapter.buildAnalysisArgs({
        prompt: 'analyze',
        model: 'sonnet',
      });
      expect(args).toContain('--model');
      expect(args).toContain('codex-mini-latest');
    });

    it('silently skips agent flag', () => {
      const args = adapter.buildAnalysisArgs({
        prompt: 'analyze',
        agent: 'ralph-output-analyzer',
      });
      expect(args).not.toContain('--agent');
    });
  });

  describe('environment overrides', () => {
    it('sets CI=true', () => {
      expect(adapter.getEnvOverrides()).toEqual({ CI: 'true' });
    });
  });

  describe('transcript path', () => {
    it('returns null (not supported)', () => {
      expect(adapter.getTranscriptPath('session-123', '/project')).toBeNull();
    });
  });

  describe('output parsing', () => {
    it('extracts JSON from plain text output', () => {
      const result = adapter.parseOutput('Result: {"completed": true}');
      expect(result).toEqual({ completed: true });
    });

    it('returns null for non-JSON', () => {
      expect(adapter.parseOutput('just plain text')).toBeNull();
    });
  });
});

// ============================================================================
// Cross-Provider Consistency Tests
// ============================================================================

describe('Cross-Provider Consistency', () => {
  let claude: any;
  let codex: any;

  beforeEach(() => {
    claude = new ClaudeAdapter();
    codex = new CodexAdapter();
  });

  it('both implement all required methods', () => {
    const methods = [
      'getBinary', 'getName', 'getCapabilities',
      'buildSessionArgs', 'buildAnalysisArgs', 'mapModel',
      'isAvailable', 'getVersion', 'parseOutput',
      'getEnvOverrides', 'getTranscriptPath',
    ];
    for (const method of methods) {
      expect(typeof claude[method]).toBe('function');
      expect(typeof codex[method]).toBe('function');
    }
  });

  it('both produce prompt as last argument in session args', () => {
    const claudeArgs = claude.buildSessionArgs({ prompt: 'test' });
    const codexArgs = codex.buildSessionArgs({ prompt: 'test' });
    expect(claudeArgs[claudeArgs.length - 1]).toBe('test');
    expect(codexArgs[codexArgs.length - 1]).toBe('test');
  });

  it('both produce prompt as last argument in analysis args', () => {
    const claudeArgs = claude.buildAnalysisArgs({ prompt: 'analyze' });
    const codexArgs = codex.buildAnalysisArgs({ prompt: 'analyze' });
    expect(claudeArgs[claudeArgs.length - 1]).toBe('analyze');
    expect(codexArgs[codexArgs.length - 1]).toBe('analyze');
  });

  it('both handle the same generic model names', () => {
    const models = ['opus', 'sonnet', 'haiku'];
    for (const model of models) {
      expect(typeof claude.mapModel(model)).toBe('string');
      expect(typeof codex.mapModel(model)).toBe('string');
    }
  });
});
