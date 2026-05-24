#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const baseDir = path.join(root, '.aiwg', 'security-engineering', 'reviews', 'disclosures');
const validStages = new Set(['triage', 'fix', 'cve', 'publish', 'close']);

function parseArgs(argv) {
  const args = { caseId: null, stage: 'triage', evidence: '', decision: '', nextDeadline: '', embargoDays: '' };
  for (let i = 0; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith('--') && !args.caseId) args.caseId = a;
    else if (a === '--stage' && argv[i + 1]) args.stage = argv[++i];
    else if (a === '--evidence' && argv[i + 1]) args.evidence = argv[++i];
    else if (a === '--decision' && argv[i + 1]) args.decision = argv[++i];
    else if (a === '--next-deadline' && argv[i + 1]) args.nextDeadline = argv[++i];
    else if (a === '--embargo-days' && argv[i + 1]) args.embargoDays = argv[++i];
    else if (a === '--help' || a === '-h') {
      console.log('Usage: track.mjs <case-id> [--stage triage|fix|cve|publish|close] [--evidence <text>] [--decision <text>] [--next-deadline <date>] [--embargo-days N]');
      process.exit(0);
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
if (!args.caseId) {
  console.error('Missing case ID.');
  process.exit(1);
}
if (!validStages.has(args.stage)) {
  console.error(`Invalid stage: ${args.stage}`);
  process.exit(1);
}
const file = path.join(baseDir, `${args.caseId}.md`);
if (!fs.existsSync(file)) {
  console.error(`Case record not found: ${path.relative(root, file)}`);
  process.exit(1);
}
const now = new Date().toISOString();
const entry = `\n## Lifecycle Transition: ${args.stage}\n\n` +
  `- **Timestamp**: ${now}\n` +
  `- **Actor**: ${process.env.USER || process.env.USERNAME || 'unknown'}\n` +
  `- **Evidence**: ${args.evidence || 'not recorded'}\n` +
  `- **Decision**: ${args.decision || 'not recorded'}\n` +
  `- **Next deadline**: ${args.nextDeadline || 'not set'}\n` +
  (args.embargoDays ? `- **Embargo days**: ${args.embargoDays}\n` : '') +
  '\n';
fs.appendFileSync(file, entry);
console.log(`Updated ${path.relative(root, file)} at stage ${args.stage}`);
