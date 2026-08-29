import { Readable } from 'node:stream';
import { parse as parseYaml } from 'yaml';
import { describe, expect, it } from 'vitest';
import {
  createRedactionTransform,
  prepareEvidenceForSink,
  publishEvidence,
  redactStructured,
  redactText,
  type GovernancePolicy,
} from '../../../src/governance/index.js';

const canaries = {
  bearer: 'redaction-canary-bearer-value-123456',
  password: 'redaction-canary-password-value',
  query: 'redaction-canary-query-value',
  cookie: 'redaction-canary-cookie-value',
  privateKeyBody: 'cmVkYWN0aW9uLWNhbmFyeS1wcml2YXRlLWtleQ==',
  organization: 'ACME-SECRET-8675309',
};

function expectNoCanaries(value: unknown): void {
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);
  for (const canary of Object.values(canaries)) expect(serialized).not.toContain(canary);
}

describe('mandatory evidence redaction boundary (#178)', () => {
  it('redacts common text secret classes without exposing values in findings', () => {
    const input = [
      `Authorization: Bearer ${canaries.bearer}`,
      `Cookie: session=${canaries.cookie}`,
      `password=${canaries.password}`,
      `https://example.test/run?token=${canaries.query}&safe=yes`,
      `postgresql://alice:${canaries.password}@db.example.test/prod`,
      `-----BEGIN PRIVATE KEY-----\n${canaries.privateKeyBody}\n-----END PRIVATE KEY-----`,
      canaries.organization,
      `{"password": "${canaries.password} with spaces"}`,
      `secret='${canaries.password} single quoted'`,
    ].join('\n');
    const result = redactText(input, {
      fingerprintKey: 'synthetic-test-fingerprint-key',
      organizationPatterns: [{ id: 'asset-secret', pattern: 'ACME-SECRET-[0-9]+' }],
    });
    expect(result.sensitivity).toBe('sensitive');
    expect(result.findings.map((finding) => finding.class)).toEqual(expect.arrayContaining([
      'authorization-header', 'cookie-header', 'sensitive-assignment', 'url-query-secret',
      'connection-string', 'private-key', 'organization-asset-secret',
    ]));
    expect(result.text).toContain('Authorization: [REDACTED:authorization-header');
    expect(result.findings.every((finding) => finding.fingerprint?.startsWith('hmac-sha256:'))).toBe(true);
    expectNoCanaries(result.text);
    expectNoCanaries(result.findings);
    expect(result.text).not.toContain('with spaces');
    expect(result.text).not.toContain('single quoted');
  });

  it('redacts nested JSON/YAML fields, encoded secrets, and stderr content', () => {
    const encoded = Buffer.from(`token=${canaries.bearer}`).toString('base64');
    const input = parseYaml(`
status: failed
response:
  headers:
    authorization: "Bearer ${canaries.bearer}"
  stderr: "password=${canaries.password}"
  encoded: "${encoded}"
items:
  - cookie: "${canaries.cookie}"
`);
    const result = redactStructured(input, { fingerprintKey: 'synthetic-key' });
    expect(result.value.status).toBe('failed');
    expect(result.findings.map((finding) => finding.path)).toEqual(expect.arrayContaining([
      '/response/headers/authorization', '/response/stderr', '/response/encoded', '/items/0/cookie',
    ]));
    expect(JSON.stringify(result.value)).toContain('[REDACTED:encoded-secret');
    expect(JSON.stringify(result.value)).toContain('[REDACTED:sensitive-field');
    expectNoCanaries(result.value);
    expect(JSON.stringify(result.value)).not.toContain(encoded);
  });

  it('holds stream output until chunk-boundary and multiline matches are safe', async () => {
    const transform = createRedactionTransform({ fingerprintKey: 'stream-key' });
    const chunks = [
      'stderr: Authorization: Bear',
      `er ${canaries.bearer}\n-----BEGIN PRIVATE KEY-----\n`,
      `${canaries.privateKeyBody}\n-----END PRIVATE KEY-----\n`,
    ];
    const output: Buffer[] = [];
    for await (const chunk of Readable.from(chunks).pipe(transform)) output.push(Buffer.from(chunk));
    const rendered = Buffer.concat(output).toString('utf8');
    expect(rendered).toContain('[REDACTED:authorization-header');
    expect(rendered).toContain('[REDACTED:private-key');
    expectNoCanaries(rendered);
  });

  it('rejects invalid UTF-8 without emitting partial stream output', async () => {
    const output: Buffer[] = [];
    const consume = async (): Promise<void> => {
      for await (const chunk of Readable.from([Buffer.from([0x61, 0xe2, 0x28, 0xa1])]).pipe(createRedactionTransform())) {
        output.push(Buffer.from(chunk));
      }
    };
    await expect(consume()).rejects.toMatchObject({ code: 'INVALID_UTF8' });
    expect(output).toHaveLength(0);
  });

  it('fails closed before persistent publication when sanitization cannot complete', async () => {
    let writes = 0;
    const result = await publishEvidence({
      artifact: {
        id: 'audit-too-large', kind: 'RawAuditEvidence', category: 'raw-audit',
        payload: 'x'.repeat(64), tier: 'raw', rawCaptureReason: 'incident debugging',
      },
      sinkId: 'encrypted-artifact-store',
      policy: { redaction: { limits: { maxInputBytes: 16 } } },
      writer: () => { writes += 1; },
    });
    expect(result.allowed).toBe(false);
    expect(result.prepared).toBeUndefined();
    expect(result.audit).toMatchObject({ redaction: 'failed', reasonCodes: ['sanitization-failed'] });
    expect(writes).toBe(0);
  });

  it('requires a sink-enabled, scoped, audited override instead of silent bypass', () => {
    const cyclic: Record<string, unknown> = { status: 'failed' };
    cyclic.self = cyclic;
    const policy: GovernancePolicy = {
      sinks: {
        'restricted-override-store': {
          id: 'restricted-override-store', visibility: 'restricted', external: false,
          persistent: true, mutable: true, maxClassification: 'restricted-identity',
          allowRedactionOverride: true,
        },
      },
    };
    const base = {
      artifact: {
        id: 'audit-override', kind: 'RawAuditEvidence', category: 'raw-audit',
        payload: cyclic, tier: 'raw' as const, rawCaptureReason: 'forensic exception',
      },
      sinkId: 'restricted-override-store',
      policy,
      now: new Date('2026-08-29T12:00:00.000Z'),
    };
    expect(prepareEvidenceForSink(base)).toMatchObject({ allowed: false, audit: { redaction: 'failed' } });
    const authorized = prepareEvidenceForSink({
      ...base,
      redactionOverride: {
        id: 'override-1', actor: 'security-officer', reason: 'preserve exact forensic image',
        artifactId: 'audit-override', sinkId: 'restricted-override-store',
        approvedAt: '2026-08-29T11:59:00.000Z', expiresAt: '2026-08-29T13:00:00.000Z',
      },
    });
    expect(authorized).toMatchObject({
      allowed: true,
      audit: {
        decision: 'override', redaction: 'override', redactionOverrideId: 'override-1',
        redactionOverrideActor: 'security-officer',
      },
    });
    expect(authorized.audit.redactionOverrideReasonDigest).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(JSON.stringify(authorized.audit)).not.toContain('preserve exact forensic image');
    expect(prepareEvidenceForSink({
      ...base,
      redactionOverride: {
        id: 'override-future', actor: 'security-officer', reason: 'future approval is invalid',
        artifactId: 'audit-override', sinkId: 'restricted-override-store',
        approvedAt: '2026-08-29T13:01:00.000Z',
      },
    }).allowed).toBe(false);
  });
});
