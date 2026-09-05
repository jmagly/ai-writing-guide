/** Native OMP bridge. Policy handlers are explicitly registered; no prompt-only enforcement. */
import type { ExtensionAPI, ToolDefinition } from '@oh-my-pi/pi-coding-agent';

export const supportedEvents = ['session_start', 'before_agent_start', 'tool_call', 'tool_result', 'agent_end', 'session_shutdown'] as const;
export const unsupportedEvents = ['permission_request', 'pre_compact_enforcement', 'native_hook_installation'] as const;
type Decision = { block: true; reason: string } | undefined;
type Handler = (event: unknown, context: unknown) => unknown | Promise<unknown>;
const handlers = new Map<string, Handler[]>();
export function registerAiwgHandler(event: string, handler: Handler): () => void {
  if (!(supportedEvents as readonly string[]).includes(event)) throw new Error(`Unsupported OMP bridge event: ${event}`);
  const list = handlers.get(event) || []; list.push(handler); handlers.set(event, list);
  return () => { const at = list.indexOf(handler); if (at >= 0) list.splice(at, 1); };
}
export async function dispatchAiwgEvent(event: string, payload: unknown, context: unknown): Promise<Decision> {
  for (const handler of handlers.get(event) || []) {
    try {
      const result = await handler(payload, context) as Decision;
      if (event === 'tool_call' && result?.block) return { block: true, reason: String(result.reason || 'Denied by AIWG handler') };
    } catch (error) {
      if (event === 'tool_call') return { block: true, reason: `AIWG handler failed: ${error instanceof Error ? error.message : String(error)}` };
      throw error;
    }
  }
  return undefined;
}
/** ToolSmith callers provide schemas and validators; unsupported output never reaches OMP. */
export function registerAiwgTool(api: ExtensionAPI, tool: ToolDefinition, validateInput: (input: unknown) => boolean, validateOutput: (output: unknown) => boolean): void {
  if (!tool.name || !tool.parameters || typeof tool.execute !== 'function') throw new Error('Invalid OMP custom tool contract');
  api.registerTool({ ...tool, async execute(id, params, signal, update, context) {
    if (signal?.aborted) throw new Error('AIWG tool cancelled');
    if (!validateInput(params)) throw new Error('Invalid AIWG tool input');
    const result = await tool.execute(id, params, signal, update, context);
    if (signal?.aborted) throw new Error('AIWG tool cancelled');
    if (!validateOutput(result)) throw new Error('Invalid AIWG tool output');
    return result;
  } });
}
export default function aiwgBridge(api: ExtensionAPI): void {
  api.on('session_start', async (event, context) => { await dispatchAiwgEvent('session_start', event, context); });
  api.on('before_agent_start', async (event, context) => { await dispatchAiwgEvent('before_agent_start', event, context); });
  api.on('tool_call', (event, context) => dispatchAiwgEvent('tool_call', event, context));
  api.on('tool_result', async (event, context) => { await dispatchAiwgEvent('tool_result', event, context); });
  api.on('agent_end', async (event, context) => { await dispatchAiwgEvent('agent_end', event, context); });
  api.on('session_shutdown', async (event, context) => { await dispatchAiwgEvent('session_shutdown', event, context); handlers.clear(); });
  api.registerCommand('aiwg-bridge-status', {
    description: 'Show active AIWG OMP lifecycle bridge registrations',
    async handler(args, context) {
      if (args.trim()) throw new Error('aiwg-bridge-status accepts no arguments');
      context.ui.notify(`AIWG OMP bridge: ${supportedEvents.join(', ')}. Registered handlers: ${[...handlers.values()].reduce((n, list) => n + list.length, 0)}.`, 'info');
    },
  });
}
