import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ClaudeSessionAdapter,
  CodexSessionAdapter,
  CopilotSessionAdapter,
  CursorSessionAdapter,
  DevinDesktopSessionAdapter,
  FactorySessionAdapter,
  GenericSessionInterchangeAdapter,
  HermesSessionAdapter,
  OpenClawSessionAdapter,
  OpenCodeSessionAdapter,
  OpenHumanSessionAdapter,
  PiSessionAdapter,
  SESSION_PROVIDER_IDS,
  WarpSessionAdapter,
  type SelectedSource,
  type SessionSourceAdapter,
} from '../../../src/sessions/index.js';

type ErrorCode = 'MALFORMED_SOURCE' | 'UNKNOWN_SCHEMA_MAJOR' | 'SCHEMA_DRIFT';

interface MatrixEntry {
  provider: string;
  issue: number;
  status: 'implemented' | 'manual-only' | 'degraded' | 'unsupported';
  operations: string[];
  fixtures: string;
  tests: string;
  documentation: string;
  conformance: {
    locatorClass: string;
    malformed: [string, ErrorCode];
    schemaEvolution: [string, ErrorCode];
    exceptions?: Record<string, string>;
  };
}

interface Matrix {
  contractVersion: string;
  canonicalProviderCount: number;
  providers: MatrixEntry[];
}

const root = resolve('.');
const matrixPath = resolve(root,
  'docs/planning/session-intelligence/provider-conformance-matrix.json');
const matrix = JSON.parse(readFileSync(matrixPath, 'utf8')) as Matrix;

describe('thirteen-provider session release conformance', () => {
  it.each(matrix.providers)('$provider matrix claims match the executable adapter contract', (entry) => {
    const adapter = adapterFor(entry.provider);
    expect(adapter.provider).toBe(entry.provider);
    expect(adapter.disposition).toBe(entry.status);
    expect([...adapter.supportedOperations].sort()).toEqual([...entry.operations].sort());
    expect(adapter.adapterVersion).toMatch(/^\d+\.\d+\.\d+$/);
    expect(adapter.acquisitionModes.length).toBeGreaterThan(0);
    expect(typeof adapter.inspect).toBe('function');
    expect(typeof adapter.stream).toBe('function');
    expect(typeof adapter.discover).toBe('function');
    const adapterTests = readFileSync(resolve(root, entry.tests), 'utf8');
    const providerDocs = readFileSync(resolve(root, entry.documentation), 'utf8').toLowerCase();
    expect(adapterTests, `${entry.provider}: adapter implementation is not exercised`)
      .toContain(adapter.constructor.name);
    expect(providerDocs, `${entry.provider}: docs omit acquisition/import behavior`)
      .toMatch(/acquisition|ingestion|import/);
    expect(providerDocs, `${entry.provider}: docs omit tested behavior`)
      .toMatch(/test|verif|evidence/);
    for (const unsupported of ['discover', 'inspect', 'stream']
      .filter((operation) => !entry.operations.includes(operation))) {
      const exception = unsupported === 'discover' ? 'discovery' : unsupported;
      expect(entry.conformance.exceptions?.[exception],
        `${entry.provider}: undocumented ${unsupported} exception`).toBeTruthy();
    }
  });

  it.each(matrix.providers)(
    '$provider passes the shared malformed, schema-evolution, and authorization contract',
    async (entry) => {
      const adapter = adapterFor(entry.provider);
      for (const [caseName, fixture] of [
        ['malformed', entry.conformance.malformed],
        ['schemaEvolution', entry.conformance.schemaEvolution],
      ] as const) {
        const [name, code] = fixture;
        const selected = selectedFixture(entry, name);
        await expect(collect(adapter.stream(selected)),
          `${entry.provider}: ${caseName}`).rejects.toMatchObject({ code });
      }

      const unauthorized = selectedFixture(entry, entry.conformance.malformed[0]);
      unauthorized.authorizedScope.allowedRoots = [
        resolve(root, 'test/fixtures/sessions/outside-authorized-scope'),
      ];
      await expect(adapter.inspect(unauthorized), `${entry.provider}: traversal boundary`)
        .rejects.toMatchObject({ code: 'SOURCE_NOT_AUTHORIZED' });
    },
  );

  it.each(matrix.providers.filter((entry) => !entry.operations.includes('discover')))(
    '$provider discovery exception is executable and performs no source selection',
    async (entry) => {
      const discovery = collect(adapterFor(entry.provider).discover({
        workspaceId: 'workspace-fixture',
        allowedRoots: [resolve(root, entry.fixtures)],
      }));
      try {
        expect(await discovery).toEqual([]);
      } catch (error) {
        expect(error).toMatchObject({ code: 'UNSUPPORTED_OPERATION' });
      }
      expect(entry.conformance.exceptions?.discovery).toBeTruthy();
    },
  );

  it('maps every canonical provider exactly once to issue, status, operations, fixtures, tests, and docs', () => {
    expect(matrix.contractVersion).toBe('1.0.0');
    expect(matrix.canonicalProviderCount).toBe(13);
    expect(matrix.providers.map((entry) => entry.provider)).toEqual(SESSION_PROVIDER_IDS);
    expect(new Set(matrix.providers.map((entry) => entry.provider)).size).toBe(13);
    expect(new Set(matrix.providers.map((entry) => entry.issue)).size).toBe(13);

    for (const entry of matrix.providers) {
      expect(entry.issue).toBeGreaterThanOrEqual(1910);
      expect(entry.issue <= 1921 || entry.issue === 2152).toBe(true);
      expect(entry.operations).toContain('inspect');
      expect(entry.operations).toContain('stream');
      for (const path of [entry.fixtures, entry.tests, entry.documentation]) {
        expect(existsSync(resolve(root, path)), `${entry.provider}: missing ${path}`).toBe(true);
      }
      expect(statSync(resolve(root, entry.fixtures)).isDirectory()).toBe(true);
      expect(readdirSync(resolve(root, entry.fixtures)).length).toBeGreaterThan(0);
      const tests = readFileSync(resolve(root, entry.tests), 'utf8');
      expect(tests, `${entry.provider}: malformed-input gate`).toMatch(/MALFORMED_SOURCE|malformed/i);
      expect(tests, `${entry.provider}: schema-drift gate`)
        .toMatch(/UNKNOWN_SCHEMA_MAJOR|SCHEMA_DRIFT|unknown-major|drift/i);
    }
  });

  it('keeps provider fixture packs synthetic and free of live credential shapes', () => {
    for (const entry of matrix.providers) {
      for (const name of readdirSync(resolve(root, entry.fixtures))) {
        const path = resolve(root, entry.fixtures, name);
        if (!statSync(path).isFile()) continue;
        const content = readFileSync(path, 'utf8');
        expect(content, `${entry.provider}/${name}: private key`).not.toMatch(
          /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/,
        );
        expect(content, `${entry.provider}/${name}: AWS access key`).not.toMatch(
          /\bAKIA[0-9A-Z]{16}\b/,
        );
        expect(content, `${entry.provider}/${name}: GitHub token`).not.toMatch(
          /\bgh[pousr]_[A-Za-z0-9]{36,}\b/,
        );
        const emails = content.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi) ?? [];
        expect(emails.every((email) => email.endsWith('@example.test')),
          `${entry.provider}/${name}: non-reserved email fixture`).toBe(true);
      }
    }
  });

  it('keeps the provider matrix and session gates in required CI', () => {
    const workflow = readFileSync(resolve(root, '.gitea/workflows/ci.yml'), 'utf8');
    expect(workflow).toContain('npm run test:ci');
    expect(workflow).toContain('npm run test:sessions:sqlite');
    expect(workflow).toMatch(/name:\s+Test/);
    expect(workflow).toMatch(/name:\s+Build/);
    expect(workflow).toMatch(/needs:\s+\[test\]/);
  });
});

function adapterFor(provider: string): SessionSourceAdapter {
  const adapters: Record<string, () => SessionSourceAdapter> = {
    claude: () => new ClaudeSessionAdapter(),
    codex: () => new CodexSessionAdapter(),
    copilot: () => new CopilotSessionAdapter(),
    cursor: () => new CursorSessionAdapter(),
    factory: () => new FactorySessionAdapter(),
    generic: () => new GenericSessionInterchangeAdapter(),
    hermes: () => new HermesSessionAdapter(),
    openclaw: () => new OpenClawSessionAdapter(),
    opencode: () => new OpenCodeSessionAdapter(),
    openhuman: () => new OpenHumanSessionAdapter(),
    pi: () => new PiSessionAdapter(),
    warp: () => new WarpSessionAdapter(),
    'devin-desktop': () => new DevinDesktopSessionAdapter(),
  };
  const create = adapters[provider];
  if (!create) throw new Error(`provider matrix has no executable adapter: ${provider}`);
  return create();
}

function selectedFixture(entry: MatrixEntry, name: string): SelectedSource {
  return {
    provider: entry.provider,
    locator: resolve(root, entry.fixtures, name),
    locatorClass: entry.conformance.locatorClass,
    sourceId: `conformance-${entry.provider}-${name}`,
    authorizedScope: {
      workspaceId: 'workspace-fixture',
      allowedRoots: [resolve(root, entry.fixtures)],
    },
  };
}

async function collect<T>(values: AsyncIterable<T>): Promise<T[]> {
  const items: T[] = [];
  for await (const value of values) items.push(value);
  return items;
}
