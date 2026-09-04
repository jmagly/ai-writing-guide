import { writeFileSync } from 'node:fs';
/** Deliberately credential-free: inspect the initialized host, never prompt it. */
export default function (api: any) {
  api.on('session_start', (_event: any, ctx: any) => {
    const prompt = ctx.getSystemPrompt().join('\n');
    const commands = api.getCommands().map((item: any) => item.name);
    const tools = api.getAllTools();
    const task = tools.find((tool: any) => tool.name === 'task');
    writeFileSync(process.env.AIWG_OMP_CONFORMANCE_REPORT!, JSON.stringify({
      contextImport: prompt.includes('AIWG_OMP_ROOT_CONTEXT_CANARY'),
      nestedContext: prompt.includes('AIWG_OMP_NESTED_CONTEXT_CANARY'),
      foreignExcluded: !prompt.includes('AIWG_OMP_DISABLED_FOREIGN_CANARY'),
      ruleLoaded: prompt.includes('AIWG_OMP_RULE_CANARY'),
      skillLoaded: prompt.includes('AIWG_OMP_SKILL_DESCRIPTION_CANARY'),
      promptListedByCommandAPI: commands.includes('conformance-prompt'),
      agentDiscovered: JSON.stringify(task ?? {}).includes('conformance-agent'),
      toolsAvailable: tools.some((tool: any) => tool.name === 'read'),
      mode: ctx.mode,
      runtime: { bun: process.versions.bun, platform: process.platform, arch: process.arch },
      commandNames: commands,
    }), { mode: 0o600 });
  });
}
