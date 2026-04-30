#!/usr/bin/env node
// Convert `aiwg skill-lint --json` output (on stdin) into a markdown
// comment body for posting on PRs. Used by the skill-lint-pr workflow
// in .gitea/workflows/skill-lint-pr.yml.
//
// Usage:
//   aiwg skill-lint --json file1 file2 | node tools/cli/format-skill-lint-comment.mjs > comment.md

import { readFileSync } from 'node:fs';

const input = readFileSync(0, 'utf8');
let report;
try {
  report = JSON.parse(input);
} catch (e) {
  console.error(`format-skill-lint-comment: failed to parse JSON: ${e.message}`);
  process.exit(2);
}

const { rubric, threshold, files = [], averageScore = 0, failedCount = 0 } = report;

const verdict = failedCount === 0 ? '✅' : '⚠️';
const lines = [
  `<!-- aiwg-skill-lint-bot -->`,
  `## ${verdict} Skill Quality (rubric: \`${rubric}\`, threshold: ${threshold})`,
  '',
  `**${files.length}** SKILL.md file(s) scored, **${failedCount}** below threshold, average **${averageScore}/100**.`,
  '',
];

if (files.length === 0) {
  lines.push('_No SKILL.md files changed in this PR._');
  process.stdout.write(lines.join('\n') + '\n');
  process.exit(0);
}

// Per-file table
lines.push('| File | Score | Schema | Description | Discoverability | Body | Pass |');
lines.push('|------|-------|--------|-------------|-----------------|------|------|');
for (const f of files) {
  const dim = f.dimensions || {};
  const cell = (d) => (d ? d.score : '—');
  const pass = f.passes ? '✓' : '✗';
  lines.push(
    `| \`${f.file}\` | ${f.score} | ${cell(dim.schema)} | ${cell(dim.description)} | ${cell(dim.discoverability)} | ${cell(dim.body)} | ${pass} |`
  );
}

// Failure detail
const failed = files.filter((f) => !f.passes);
if (failed.length > 0) {
  lines.push('');
  lines.push('### Issues');
  for (const f of failed) {
    lines.push('');
    lines.push(`<details><summary><code>${f.file}</code> — ${f.score}/100</summary>`);
    lines.push('');
    for (const [name, dim] of Object.entries(f.dimensions || {})) {
      if (dim.score === 100) continue;
      const notes = (dim.notes || []).map((n) => `  - ${n}`).join('\n');
      lines.push(`- **${name}** (${dim.score}/100):`);
      if (notes) lines.push(notes);
    }
    lines.push('');
    lines.push('</details>');
  }
}

lines.push('');
lines.push('---');
lines.push('_Rubric details: [`docs/skills/quality-rubric.md`](./docs/skills/quality-rubric.md)._');
lines.push('_Run locally: `aiwg skill-lint <path> [--rubric strict|standard|lenient]`._');

process.stdout.write(lines.join('\n') + '\n');
