import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const guide = readFileSync('docs/uhp-client.md', 'utf8');
const threatModel = readFileSync('docs/security/uhp-client-threat-model.md', 'utf8');
const configReference = readFileSync('docs/configuration/aiwg-config.md', 'utf8');
const cliReference = readFileSync('docs/cli/reference.md', 'utf8');

describe('UHP operator documentation', () => {
  it('distinguishes protocol and product roles without claiming server conformance', () => {
    for (const term of ['AIWG provider', 'UHP', 'A2A', 'MCP', 'OpenAI Responses', 'Community Edition', 'Cloud service']) {
      expect(guide).toContain(term);
    }
    expect(guide).toContain('does not claim UHP server conformance');
    expect(guide).toContain('client interoperates');
  });

  it('covers every supported CLI and typed lifecycle operation', () => {
    for (const operation of [
      'aiwg uhp discover', 'aiwg uhp harnesses', 'aiwg uhp models', 'aiwg uhp run',
      'createResponse', 'streamResponse', 'continueResponse', 'cancelResponse',
      'readResponse', 'reconcileUnknownResponse', 'uploadFile', 'listArtifacts',
      'downloadArtifact',
    ]) expect(`${guide}\n${cliReference}`).toContain(operation);
  });

  it('documents safe configuration, recovery, security, limitations, and upgrades', () => {
    for (const term of [
      'credential', 'source', 'env', 'allowedHosts', 'requestTimeoutMs',
      'inactivityTimeoutMs', 'session_busy', 'idempotency', 'incomplete',
      'model or harness differs', 'Prompt injection', 'retention',
      'limitations and deliberate compromises', 'Upgrade procedure',
    ]) expect(`${guide}\n${threatModel}\n${configReference}`).toContain(term);
    expect(guide).not.toMatch(/--(?:token|bearer|api-key)\b/);
  });
});
