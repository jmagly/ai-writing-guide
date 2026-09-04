import { writeFileSync } from 'node:fs';
export default function (api: any) {
  api.on('session_start', (_event: any, context: any) => {
    const prompt = context.getSystemPrompt().join('\n');
    writeFileSync(process.env.AIWG_OMP_PRECEDENCE_REPORT!, JSON.stringify({
      kernelSkill: prompt.includes('NATIVE_KERNEL_SKILL_CANARY'),
      standardSkill: prompt.includes('NATIVE_STANDARD_SKILL_CANARY'),
      workspaceOccurrences: prompt.split('CANONICAL_WORKSPACE_PRECEDENCE').length - 1,
      aiwgOccurrences: prompt.split('CANONICAL_AIWG_PRECEDENCE').length - 1,
      alwaysRule: prompt.includes('ALWAYS_PRECEDENCE_RULE'),
      disabledRule: prompt.includes('DISABLED_PRECEDENCE_RULE'),
      nativeContext: prompt.includes('NATIVE_PRECEDENCE_CONTEXT'),
      foreignProjectContext: prompt.includes('FOREIGN_PROJECT_PRECEDENCE_CONTEXT'),
      foreignUserContext: prompt.includes('FOREIGN_USER_PRECEDENCE_CONTEXT'),
    }));
  });
}
