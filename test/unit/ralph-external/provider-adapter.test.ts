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
let ensureProvidersRegistered: any;
let ClaudeAdapter: any;
let CodexAdapter: any;

beforeEach(async () => {
  const adapterMod = await import('../../../tools/ralph-external/lib/provider-adapter.mjs');
  ProviderAdapter = adapterMod.ProviderAdapter;
  createProvider = adapterMod.createProvider;
  registerProvider = adapterMod.registerProvider;
  listProviders = adapterMod.listProviders;
  hasProvider = adapterMod.hasProvider;
  ensureProvidersRegistered = adapterMod.ensureProvidersRegistered;

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
  it('has all core providers registered', () => {
    const providers = ['claude', 'codex'];
    for (const provider of providers) {
      expect(hasProvider(provider)).toBe(true);
    }

    const providerList = listProviders();
    for (const provider of providers) {
      expect(providerList).toContain(provider);
    }
  });

  it('creates correct adapter instances via factory', () => {
    const tests = [
      { name: 'claude', Class: ClaudeAdapter, caseName: 'Claude' },
      { name: 'codex', Class: CodexAdapter, caseName: 'CODEX' },
    ];

    for (const { name, Class, caseName } of tests) {
      const adapter = createProvider(name);
      expect(adapter).toBeInstanceOf(Class);
      expect(adapter.getName()).toBe(name);

      // Test case-insensitivity
      const caseAdapter = createProvider(caseName);
      expect(caseAdapter).toBeInstanceOf(Class);
    }
  });

  it('throws on unknown provider', () => {
    expect(() => createProvider('nonexistent')).toThrow('Unknown provider');
    expect(() => createProvider('nonexistent')).toThrow('Available providers');
  });

  // Regression test for race condition bug in tools/ralph-external/index.mjs
  it('requires ensureProvidersRegistered() before hasProvider() returns accurate results', async () => {
    // Import a fresh copy of the provider-adapter module to test registration flow
    const freshMod = await import('../../../tools/ralph-external/lib/provider-adapter.mjs?t=' + Date.now());
    const freshHasProvider = freshMod.hasProvider;
    const freshEnsureProvidersRegistered = freshMod.ensureProvidersRegistered;

    // BEFORE ensureProvidersRegistered(), hasProvider() may return false
    // because registration is async and might not have completed yet
    const beforeRegistration = freshHasProvider('claude');

    // AFTER ensureProvidersRegistered(), hasProvider('claude') MUST return true
    await freshEnsureProvidersRegistered();
    const afterRegistration = freshHasProvider('claude');

    // The bug was calling hasProvider() before awaiting ensureProvidersRegistered(),
    // which caused a race condition. After the fix, awaiting ensures providers are registered.
    expect(afterRegistration).toBe(true);

    // Note: We can't reliably assert beforeRegistration === false because in test
    // environment the registration might complete synchronously. The key invariant is:
    // after ensureProvidersRegistered(), hasProvider() MUST work correctly.
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
    it('returns correct binary and name', () => {
      expect(adapter.getBinary()).toBe('claude');
      expect(adapter.getName()).toBe('claude');
    });
  });

  describe('capabilities', () => {
    it('supports all capabilities', () => {
      const caps = adapter.getCapabilities();
      const expectedCaps = [
        'streamJson',
        'sessionResume',
        'budgetControl',
        'systemPrompt',
        'agentMode',
        'mcpConfig',
        'maxTurns',
      ];

      for (const cap of expectedCaps) {
        expect(caps[cap]).toBe(true);
        expect(adapter.hasCapability(cap)).toBe(true);
      }
    });
  });

  describe('model mapping', () => {
    it('passes through all model names unchanged', () => {
      const models = ['opus', 'sonnet', 'haiku', 'claude-3.5-sonnet', 'arbitrary-model'];
      for (const model of models) {
        expect(adapter.mapModel(model)).toBe(model);
      }
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

    it('handles all optional parameters correctly', () => {
      const mcpConfig = { servers: { test: { command: 'test' } } };
      const optionTests = [
        { option: { sessionId: 'abc-123' }, flag: '--session-id', value: 'abc-123' },
        { option: { model: 'opus' }, flag: '--model', value: 'opus' },
        { option: { budget: 2.5 }, flag: '--max-budget-usd', value: '2.5' },
        { option: { maxTurns: 50 }, flag: '--max-turns', value: '50' },
        { option: { verbose: true }, flag: '--verbose', value: null },
        { option: { mcpConfig }, flag: '--mcp-config', value: JSON.stringify(mcpConfig) },
        { option: { systemPrompt: 'You are helpful' }, flag: '--append-system-prompt', value: 'You are helpful' },
      ];

      for (const { option, flag, value } of optionTests) {
        const args = adapter.buildSessionArgs({ prompt: 'task', ...option });
        expect(args).toContain(flag);
        if (value !== null) {
          expect(args).toContain(value);
        }
      }
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

    it('includes optional parameters when provided', () => {
      const optionTests = [
        { option: { model: 'sonnet' }, flag: '--model', value: 'sonnet' },
        { option: { agent: 'ralph-output-analyzer' }, flag: '--agent', value: 'ralph-output-analyzer' },
      ];

      for (const { option, flag, value } of optionTests) {
        const args = adapter.buildAnalysisArgs({ prompt: 'analyze', ...option });
        expect(args).toContain(flag);
        expect(args).toContain(value);
      }
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
    it('handles all parsing scenarios', () => {
      const tests = [
        { input: 'Some text {"key": "value"} more text', expected: { key: 'value' } },
        { input: 'no json here', expected: null },
        { input: '', expected: null },
      ];

      for (const { input, expected } of tests) {
        expect(adapter.parseOutput(input)).toEqual(expected);
      }
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
    it('returns correct binary and name', () => {
      expect(adapter.getBinary()).toBe('codex');
      expect(adapter.getName()).toBe('codex');
    });
  });

  describe('capabilities', () => {
    it('reports limited capabilities', () => {
      const caps = adapter.getCapabilities();
      const unsupportedCaps = [
        'streamJson',
        'sessionResume',
        'budgetControl',
        'systemPrompt',
        'agentMode',
        'mcpConfig',
        'maxTurns',
      ];

      for (const cap of unsupportedCaps) {
        expect(caps[cap]).toBe(false);
        expect(adapter.hasCapability(cap)).toBe(false);
      }
    });
  });

  describe('model mapping', () => {
    it('maps generic model names to Codex models', () => {
      const mappings = [
        { input: 'opus', expected: 'gpt-5.3-codex' },
        { input: 'sonnet', expected: 'codex-mini-latest' },
        { input: 'haiku', expected: 'gpt-5-codex-mini' },
        { input: 'OPUS', expected: 'gpt-5.3-codex' }, // case-insensitive
        { input: 'Sonnet', expected: 'codex-mini-latest' }, // case-insensitive
      ];

      for (const { input, expected } of mappings) {
        expect(adapter.mapModel(input)).toBe(expected);
      }
    });

    it('passes through unknown model names', () => {
      const models = ['gpt-5.3-codex', 'custom-model'];
      for (const model of models) {
        expect(adapter.mapModel(model)).toBe(model);
      }
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

    it('warns on unsupported features', () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      adapter.buildSessionArgs({ prompt: 'task', budget: 5 });
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('Budget control'));

      warnSpy.mockClear();
      adapter.buildSessionArgs({ prompt: 'task', mcpConfig: {} });
      expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('MCP configuration'));

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

    it('maps model names and silently skips unsupported agent flag', () => {
      const args = adapter.buildAnalysisArgs({
        prompt: 'analyze',
        model: 'sonnet',
        agent: 'ralph-output-analyzer',
      });
      expect(args).toContain('--model');
      expect(args).toContain('codex-mini-latest');
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
    it('handles all parsing scenarios', () => {
      const tests = [
        { input: 'Result: {"completed": true}', expected: { completed: true } },
        { input: 'just plain text', expected: null },
      ];

      for (const { input, expected } of tests) {
        expect(adapter.parseOutput(input)).toEqual(expected);
      }
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

  it('both produce prompt as last argument', () => {
    const promptTests = [
      { method: 'buildSessionArgs', prompt: 'test' },
      { method: 'buildAnalysisArgs', prompt: 'analyze' },
    ];

    for (const { method, prompt } of promptTests) {
      const claudeArgs = claude[method]({ prompt });
      const codexArgs = codex[method]({ prompt });
      expect(claudeArgs[claudeArgs.length - 1]).toBe(prompt);
      expect(codexArgs[codexArgs.length - 1]).toBe(prompt);
    }
  });

  it('both handle the same generic model names', () => {
    const models = ['opus', 'sonnet', 'haiku'];
    for (const model of models) {
      expect(typeof claude.mapModel(model)).toBe('string');
      expect(typeof codex.mapModel(model)).toBe('string');
    }
  });
});
