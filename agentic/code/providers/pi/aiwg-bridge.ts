/** AIWG's reviewed Pi bridge. Loaded only after Pi project trust is granted. */
import type { ExtensionAPI } from '@earendil-works/pi-coding-agent';

const destructive = /(?:^|[;&|]\s*)(?:sudo\s+)?(?:rm\s+-\S*r\S*\s+|git\s+(?:reset\s+--hard|clean\s+-)|chmod\s+777|chown\s+-R)/i;
const packageMutation = /(?:^|[;&|]\s*)(?:npm|pnpm|yarn|bun|pipx?|uv|cargo)\s+(?:install|add|update|upgrade)\b/i;

export async function evaluateAiwgPiCommand(
  command: string,
  hasUI: boolean,
  confirm?: () => Promise<boolean>,
): Promise<{ block: true; reason: string } | undefined> {
  if (!destructive.test(command) && !packageMutation.test(command)) return undefined;
  if (!hasUI) return { block: true, reason: 'AIWG policy blocked a destructive or package-mutating command in headless mode.' };
  return await confirm?.() ? undefined : { block: true, reason: 'Denied by AIWG operator policy.' };
}

export default function aiwgBridge(pi: ExtensionAPI): void {
  pi.on('tool_call', async (event, context) => {
    if (event.toolName !== 'bash') return undefined;
    const command = typeof event.input?.command === 'string' ? event.input.command : '';
    return evaluateAiwgPiCommand(command, context.hasUI, async () => {
      const choice = await context.ui.select('AIWG policy requires explicit approval for this command.', ['Deny', 'Allow once']);
      return choice === 'Allow once';
    });
  });
}
