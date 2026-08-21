import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { parse } from 'yaml';

test('agentic.yaml is an independently reviewed fail-closed handoff manifest', async () => {
  const source = await readFile('agentic.yaml', 'utf8');
  const manifest = parse(source);

  assert.equal(manifest.apiVersion, 'setup.aiwg.io/v1');
  assert.equal(manifest.kind, 'SetupManifest');
  assert.equal(manifest.metadata.name, 'aiwg-agentic-bootstrap');
  assert.equal(manifest.metadata.execution_mode, 'provider-orchestrated');
  assert.deepEqual(
    manifest.spec.steps.map((step) => step.id),
    ['verify-public-setup', 'inspect-and-handoff', 'report-verification'],
  );

  const instructions = manifest.spec.steps.map((step) => step.instruction).join('\n');
  assert.match(instructions, /setup\.aiwg\.yaml\.aiwg-attestation\.json/);
  assert.match(instructions, /status verified/);
  assert.match(instructions, /persisted freshness state/);
  assert.match(instructions, /HTTP status/);
  assert.match(instructions, /policy-exempt/);
  assert.match(instructions, /approval before mutations/);
});
