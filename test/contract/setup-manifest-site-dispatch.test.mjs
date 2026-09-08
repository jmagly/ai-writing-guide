import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

test('first-party installation guidance uses the canonical aiwg.io manifest', async () => {
  const files = [
    'README.md',
    'packages/cli/README.md',
    'docs/agentic-install-runbook.md',
    'docs/getting-started/install-connect-verify.md',
    'agentic/code/addons/aiwg-utils/skills/steward/SKILL.md',
  ];
  for (const file of files) {
    const body = await readFile(file, 'utf8');
    assert.match(body, /https:\/\/aiwg\.io\/setup\.aiwg\.yaml/);
    assert.doesNotMatch(
      body,
      /https:\/\/raw\.githubusercontent\.com\/jmagly\/aiwg\/main\/setup\.aiwg\.yaml/
    );
  }
});

test('beginner surfaces keep the three-step self-verifying install contract', async () => {
  const manifest = await readFile('setup.aiwg.yaml', 'utf8');
  assert.match(manifest, /choices:\n(?:\s+- .+\n)*\s+- devin\n/);
  assert.match(manifest, /aiwg use all --provider PROVIDER --json/);
  assert.doesNotMatch(manifest, /id: build-and-regenerate/);
  assert.match(manifest, /do not make index, regenerate, status, or doctor commands mandatory/);

  const readme = await readFile('README.md', 'utf8');
  const manual = readme.slice(
    readme.indexOf('If you prefer to install manually:'),
    readme.indexOf('For the complete beginner path'),
  );
  assert.match(manual, /npm i -g aiwg\s+cd \/path\/to\/your\/project\s+aiwg use all --provider <provider>/);
  assert.doesNotMatch(manual, /aiwg (?:index|regenerate|status|doctor)/);

  const cliReadme = await readFile('packages/cli/README.md', 'utf8');
  assert.match(
    cliReadme,
    /npm install --global aiwg\s+cd \/path\/to\/your\/project\s+aiwg use all --provider <provider>/,
  );

  for (const file of [
    'docs/getting-started/install-connect-verify.md',
    'docs/getting-started/new-project.md',
    'docs/getting-started/existing-project.md',
    'docs/getting-started/start-here.md',
    'docs/getting-started/just-try-it.md',
    'docs/getting-started/audit-existing-code.md',
    'docs/getting-started/team-setup.md',
    'docs/getting-started/macos-install.md',
  ]) {
    const body = await readFile(file, 'utf8');
    // Beginner guides route to one canonical setup path instead of copying CLI steps.
    const target = file === 'docs/getting-started/install-connect-verify.md'
      ? /\[manual installation reference\]\(\.\.\/cli\/install-and-repair\.md\)/
      : /\]\(install-connect-verify\.md\)/;
    assert.match(body, target, file);
    assert.doesNotMatch(body, /aiwg index build --all/, file);
  }
});

test('secure long-running-agent guidance uses the auditable site manifest', async () => {
  const files = [
    'README.md',
    'apps/cockpit/README.md',
    'docs/getting-started/install-connect-verify.md',
  ];
  for (const file of files) {
    const body = await readFile(file, 'utf8');
    assert.match(body, /https:\/\/aiwg\.io\/agentic-sandbox\/setup\.aiwg\.yaml/);
    assert.doesNotMatch(
      body,
      /https:\/\/raw\.githubusercontent\.com\/jmagly\/agentic-sandbox\/main\/setup\.aiwg\.yaml/,
    );
  }
});
