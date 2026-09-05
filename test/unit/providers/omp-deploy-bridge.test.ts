import { describe, it, expect } from 'vitest';
import aiwgBridge, { registerAiwgHandler, dispatchAiwgEvent, registerAiwgTool } from '../../../agentic/code/providers/omp/aiwg-bridge';
describe('OMP native lifecycle and custom tools', () => {
  it('registers the actual native event surface and propagates tool denials and failures', async () => {
    const events = new Map(); const commands = new Map();
    aiwgBridge({ on: (event: string, handler: unknown) => events.set(event, handler), registerCommand: (name: string, command: unknown) => commands.set(name, command) } as any);
    expect([...events.keys()]).toEqual(['session_start','before_agent_start','tool_call','tool_result','agent_end','session_shutdown']);
    let started = false;
    const removeStart = registerAiwgHandler('session_start', () => { started = true; });
    await events.get('session_start')({}, {}); expect(started).toBe(true); removeStart();
    const remove = registerAiwgHandler('tool_call', () => ({ block: true, reason: 'policy' }));
    expect(await events.get('tool_call')({}, {})).toEqual({ block: true, reason: 'policy' }); remove();
    const failed = registerAiwgHandler('tool_call', () => { throw new Error('handler error'); });
    expect((await dispatchAiwgEvent('tool_call', {}, {}))?.reason).toContain('handler error'); failed();
    expect(() => registerAiwgHandler('permission_request', () => undefined)).toThrow('Unsupported');
    const notices: string[] = []; const context = { ui: { notify: (text: string) => notices.push(text) } };
    await commands.get('aiwg-bridge-status').handler('', context); expect(notices[0]).toContain('Registered handlers: 0');
    await expect(commands.get('aiwg-bridge-status').handler('unexpected', context)).rejects.toThrow('no arguments');
  });
  it('validates tool inputs, outputs, cancellation and error propagation', async () => {
    let registered: any;
    const api = { registerTool: (tool: unknown) => { registered = tool; } } as any;
    const definition = { name: 'echo', label: 'Echo', description: 'Echo a value', parameters: { type: 'object', properties: { text: { type: 'string' } } }, execute: async (_id: string, input: any) => ({ content: [{ type: 'text', text: input.text }] }) } as any;
    registerAiwgTool(api, definition, (input: any) => typeof input.text === 'string', (output: any) => typeof output.content[0].text === 'string');
    expect(await registered.execute('1', { text: 'hello' })).toEqual({ content: [{ type: 'text', text: 'hello' }] });
    await expect(registered.execute('1', { text: 3 })).rejects.toThrow('input');
    await expect(registered.execute('1', { text: 'hello' }, AbortSignal.abort())).rejects.toThrow('cancelled');
    registerAiwgTool(api, definition, () => true, () => false);
    await expect(registered.execute('1', { text: 'hello' })).rejects.toThrow('output');
    registerAiwgTool(api, { ...definition, execute: async () => { throw new Error('native failure'); } }, () => true, () => true);
    await expect(registered.execute('1', {})).rejects.toThrow('native failure');
  });
});

import YAML from 'yaml';
import { AgentPackager } from '../../../src/agents/agent-packager';
it('AgentPackager preserves OMP native model priority, reasoning and explicit spawn policy', async () => {
  const content = await new AgentPackager().package({
    metadata: { name: 'lead', description: 'Review: source and tests', modelPriority: ['openrouter/openai/gpt-4.1-mini', 'openrouter/anthropic/claude-sonnet-4'], thinkingLevel: 'high', tools: ['Read', 'Task'], spawns: ['researcher'], blocking: true, autoloadSkills: ['sdlc-quickref'], readSummarize: false },
    content: 'Verify the source.', filePath: '/agents/lead.md', fileName: 'lead.md',
  }, 'omp');
  const metadata = YAML.parse(content.content.split('---')[1]);
  expect(metadata).toMatchObject({ description: 'Review: source and tests', model: ['openrouter/openai/gpt-4.1-mini', 'openrouter/anthropic/claude-sonnet-4'], thinkingLevel: 'high', tools: ['read', 'task'], spawns: ['researcher'], blocking: true, autoloadSkills: ['sdlc-quickref'], readSummarize: false });
});

import { AgentGenerator } from '../../../src/smiths/agentsmith/generator';
it('AgentSmith generates the native OMP path and conservative leaf tools', async () => {
  const generated = await new AgentGenerator().generateAgent({ name: 'omp-review', description: 'Review: source', platform: 'omp', projectPath: '/tmp/aiwg-omp-smith-fixture', tools: ['Read', 'Task'], dryRun: true });
  const metadata = YAML.parse(generated.content.split('---')[1]);
  expect(generated.path).toContain('.omp/agents/omp-review.md');
  expect(metadata.name).toBe('omp-review'); expect(metadata.tools).toEqual(['read']); expect(metadata.spawns).toEqual([]);
  expect(metadata.model).toBeTruthy();
});
