import path from 'node:path';
import type { ExternalJobFlow } from './types.js';

export type SchedulerFormat = 'cron' | 'systemd' | 'gitea-actions';

function shellQuote(value: string): string {
  return `'${value.replace(/'/gu, `'"'"'`)}'`;
}

function command(flowFile: string): string {
  return `aiwg job run ${shellQuote(path.resolve(flowFile))} --once`;
}

export function renderExternalTrigger(flow: ExternalJobFlow, flowFile: string, format: SchedulerFormat): string {
  const invocation = command(flowFile);
  if (format === 'cron') {
    return [
      '# The host owns scheduling; AIWG executes one reviewed job.',
      'SHELL=/bin/sh',
      `0 * * * * ${invocation}`,
    ].join('\n');
  }
  if (format === 'systemd') {
    const unit = `aiwg-job-${flow.metadata.name}`;
    return [
      `# /etc/systemd/system/${unit}.service`,
      '[Unit]',
      `Description=AIWG external job ${flow.metadata.name}`,
      '[Service]',
      'Type=oneshot',
      `ExecStart=/bin/sh -lc ${shellQuote(invocation)}`,
      '',
      `# /etc/systemd/system/${unit}.timer`,
      '[Unit]',
      `Description=Trigger AIWG external job ${flow.metadata.name}`,
      '[Timer]',
      'OnCalendar=hourly',
      'Persistent=true',
      '[Install]',
      'WantedBy=timers.target',
    ].join('\n');
  }
  return [
    'name: AIWG external job',
    'on:',
    '  schedule:',
    "    - cron: '0 * * * *'",
    '  workflow_dispatch:',
    'jobs:',
    '  run:',
    '    runs-on: self-hosted',
    '    steps:',
    '      - name: Run reviewed single-shot job',
    `        run: ${invocation}`,
    '# The self-hosted runner must provide the reviewed workspace and authentication.',
    '# Do not add credential values to this file or command.',
  ].join('\n');
}
