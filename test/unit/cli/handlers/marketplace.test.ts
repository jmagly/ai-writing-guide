/**
 * Unit tests for aiwg marketplace handler
 *
 * Covers:
 *   - marketplace search <query>  fans out to all available adapters
 *   - Results carry source attribution
 *   - --source <id> filters to a single adapter
 *   - --json returns structured output on stdout
 *   - marketplace list returns installed packages
 *   - Unknown subcommand returns exitCode 1 with usage
 *
 * @source @src/cli/handlers/marketplace.ts
 * @implements #805
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { HandlerContext } from '../../../../src/cli/handlers/types.js';

// ── Mocks ──────────────────────────────────────────────────────────────────

vi.mock('../../../../src/skills/registry.js', () => ({
  searchSkills: vi.fn(),
  listSkills: vi.fn(),
  getAllAdapters: vi.fn(),
}));

vi.mock('../../../../src/packages/registry.js', () => ({
  listInstalledPackages: vi.fn(),
  installPackage: vi.fn(),
}));

vi.mock('../../../../src/marketplace/exchange.js', () => ({
  exportPortablePackage: vi.fn(),
  findIndexedPackage: vi.fn(),
  importPortablePackage: vi.fn(),
  marketplaceConfigDir: vi.fn(({ projectLocal, projectDir }) =>
    projectLocal ? `${projectDir}/.aiwg` : '/tmp/global-aiwg'),
  publishLocalPackage: vi.fn(),
  readCatalogEnvelope: vi.fn(),
  readTrustStore: vi.fn(),
  registerCatalog: vi.fn(),
  removeCatalog: vi.fn(),
  resolveCatalogEntry: vi.fn(),
  resolveVerificationPolicy: vi.fn(),
  searchCatalogs: vi.fn(),
  verifyIndexedPackage: vi.fn(),
}));

vi.mock('../../../../src/cli/ui.js', () => ({
  blank: vi.fn(() => console.log('')),
  rule: vi.fn(),
  info: vi.fn((s: string) => console.log(s)),
  success: vi.fn((s: string) => console.log(s)),
  warn: vi.fn((s: string) => console.log(s)),
  // dim routes through console.log so captured output includes empty-state messages
  dim: vi.fn((s: string) => console.log(s)),
  error: vi.fn((s: string) => console.log(s)),
  dimText: vi.fn((s: string) => s),
  bold: vi.fn((s: string) => s),
  accent: vi.fn((s: string) => s),
  brandMark: vi.fn(() => '◆'),
}));

// ── Fixtures ───────────────────────────────────────────────────────────────

const SAMPLE_CLAWHUB_RESULT = {
  name: 'parallel-dispatch',
  description: 'Spawn parallel subagents for fanout search',
  source: 'clawhub',
  package: 'aiwg/rlm',
  platforms: ['claude'],
  installed: false,
};

const SAMPLE_OPENCLAW_RESULT = {
  name: 'project-awareness',
  description: 'Learn project structure at session start',
  source: 'openclaw',
  package: 'community/utils',
  platforms: ['claude', 'cursor'],
  installed: true,
};

const SAMPLE_LOCAL_RESULT = {
  name: 'induct-research',
  description: 'Bootstrap research workflow',
  source: 'local',
  package: 'aiwg/research-complete',
  platforms: ['claude'],
  installed: true,
};

const SAMPLE_PACKAGE = {
  key: 'roko/ring-methodology',
  name: 'ring-methodology',
  owner: 'roko',
  version: '2026.3.4',
  type: 'framework',
  source: 'https://git.integrolabs.net/roko/ring-methodology.git',
  installedAt: '2026-03-01T00:00:00.000Z',
  deployCount: 1,
};

const SAMPLE_LOCK = {
  schemaVersion: 'aiwg.marketplace.package-lock.v1',
  lockId: `sha256:${'a'.repeat(64)}`,
  identity: 'acme/example',
  version: '1.2.3',
  canonicalRemote: 'https://example.test/acme/example.git',
  requestedRef: 'v1.2.3',
  resolvedCommit: 'b'.repeat(40),
  gitTreeObject: 'c'.repeat(40),
  treeSha256: 'd'.repeat(64),
  artifactSha256: 'e'.repeat(64),
  wrapperSchemaVersion: '1',
  fortemiProfile: '2.0.0/full-v1',
  envelopeSha256: 'f'.repeat(64),
  dependencyLocks: {},
  createdAt: '2026-08-03T00:00:00.000Z',
};

const SAMPLE_ENVELOPE = {
  package: { namespace: 'acme', name: 'example', version: '1.2.3' },
};

const SAMPLE_VERIFICATION = {
  ok: true,
  status: 'verified',
  lock: SAMPLE_LOCK,
  envelopeSha256: 'f'.repeat(64),
  warnings: [],
  errors: [],
};

const SAMPLE_CATALOG_ENTRY = {
  identity: 'acme/example',
  version: '1.2.3',
  description: 'Example signed package',
  license: 'MIT',
  canonicalRemote: 'https://example.test/acme/example.git',
  requestedRef: 'v1.2.3',
  resolvedCommit: 'b'.repeat(40),
  envelopePath: 'packages/example/envelope.json',
  envelopeSha256: 'f'.repeat(64),
  lockId: SAMPLE_LOCK.lockId,
  publisher: 'acme',
  provenanceCompleteness: 100,
  verificationStatus: 'verified',
  catalogId: 'acme-community',
  observation: 'Catalog inclusion is an observation, not an endorsement',
};

const SAMPLE_ADAPTERS = [
  { id: 'local', name: 'Local' },
  { id: 'clawhub', name: 'ClawHub Registry' },
  { id: 'openclaw', name: 'OpenClaw Registry' },
];

function makeCtx(args: string[] = []): HandlerContext {
  return {
    args,
    rawArgs: ['marketplace', ...args],
    cwd: '/tmp/myproject',
    frameworkRoot: '/opt/aiwg',
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe('marketplaceHandler', () => {
  let mockSearchSkills: ReturnType<typeof vi.fn>;
  let mockListSkills: ReturnType<typeof vi.fn>;
  let mockGetAllAdapters: ReturnType<typeof vi.fn>;
  let mockListPackages: ReturnType<typeof vi.fn>;
  let mockInstallPackage: ReturnType<typeof vi.fn>;
  let exchange: typeof import('../../../../src/marketplace/exchange.js');

  beforeEach(async () => {
    vi.clearAllMocks();

    const registry = await import('../../../../src/skills/registry.js');
    const pkgRegistry = await import('../../../../src/packages/registry.js');
    exchange = await import('../../../../src/marketplace/exchange.js');

    mockSearchSkills = registry.searchSkills as ReturnType<typeof vi.fn>;
    mockListSkills = registry.listSkills as ReturnType<typeof vi.fn>;
    mockGetAllAdapters = registry.getAllAdapters as ReturnType<typeof vi.fn>;
    mockListPackages = pkgRegistry.listInstalledPackages as ReturnType<typeof vi.fn>;
    mockInstallPackage = pkgRegistry.installPackage as ReturnType<typeof vi.fn>;

    mockSearchSkills.mockResolvedValue([]);
    mockListSkills.mockResolvedValue([]);
    mockGetAllAdapters.mockReturnValue(SAMPLE_ADAPTERS);
    mockListPackages.mockResolvedValue([]);
    mockInstallPackage.mockResolvedValue({
      key: 'acme/example',
      envelope: SAMPLE_ENVELOPE,
      lock: SAMPLE_LOCK,
      verification: SAMPLE_VERIFICATION,
    });
    vi.mocked(exchange.searchCatalogs).mockResolvedValue([]);
    vi.mocked(exchange.findIndexedPackage).mockResolvedValue(null);
    vi.mocked(exchange.resolveVerificationPolicy).mockResolvedValue({
      policy: {
        requireSignature: false,
        allowIntegrityOnly: true,
        allowYanked: false,
        allowDeprecated: true,
        allowRefMove: false,
        allowRollback: false,
      },
      trustStore: { schemaVersion: 'aiwg.marketplace.trust-store.v1', keys: [] },
    });
    vi.mocked(exchange.readTrustStore).mockResolvedValue({
      schemaVersion: 'aiwg.marketplace.trust-store.v1',
      keys: [],
    });
  });

  // ── Handler Metadata ─────────────────────────────────────────────────────

  describe('handler metadata', () => {
    it('has id "marketplace"', async () => {
      const { marketplaceHandler } = await import('../../../../src/cli/handlers/marketplace.js');
      expect(marketplaceHandler.id).toBe('marketplace');
    });

    it('has category "framework"', async () => {
      const { marketplaceHandler } = await import('../../../../src/cli/handlers/marketplace.js');
      expect(marketplaceHandler.category).toBe('framework');
    });

    it('exports a CommandHandler-shaped object', async () => {
      const { marketplaceHandler } = await import('../../../../src/cli/handlers/marketplace.js');
      expect(typeof marketplaceHandler.execute).toBe('function');
      expect(Array.isArray(marketplaceHandler.aliases)).toBe(true);
    });
  });

  // ── marketplace search ───────────────────────────────────────────────────

  describe('search subcommand', () => {
    it('calls searchSkills with the query string', async () => {
      mockSearchSkills.mockResolvedValue([SAMPLE_CLAWHUB_RESULT]);
      const { marketplaceHandler } = await import('../../../../src/cli/handlers/marketplace.js');

      vi.spyOn(console, 'log').mockImplementation(() => {});
      const result = await marketplaceHandler.execute(makeCtx(['search', 'parallel']));

      expect(result.exitCode).toBe(0);
      expect(mockSearchSkills).toHaveBeenCalledWith('parallel', undefined);
    });

    it('returns exitCode 1 when no query provided', async () => {
      const { marketplaceHandler } = await import('../../../../src/cli/handlers/marketplace.js');
      const result = await marketplaceHandler.execute(makeCtx(['search']));

      expect(result.exitCode).toBe(1);
      expect(result.message).toMatch(/query required/i);
    });

    it('renders source attribution in table output', async () => {
      mockSearchSkills.mockResolvedValue([SAMPLE_CLAWHUB_RESULT, SAMPLE_OPENCLAW_RESULT]);
      const { marketplaceHandler } = await import('../../../../src/cli/handlers/marketplace.js');

      const lines: string[] = [];
      vi.spyOn(console, 'log').mockImplementation((...args) => lines.push(args.join(' ')));

      await marketplaceHandler.execute(makeCtx(['search', 'dispatch']));

      const output = lines.join('\n');
      expect(output).toContain('clawhub');
      expect(output).toContain('openclaw');
    });

    it('renders result names in output', async () => {
      mockSearchSkills.mockResolvedValue([SAMPLE_CLAWHUB_RESULT]);
      const { marketplaceHandler } = await import('../../../../src/cli/handlers/marketplace.js');

      const lines: string[] = [];
      vi.spyOn(console, 'log').mockImplementation((...args) => lines.push(args.join(' ')));

      await marketplaceHandler.execute(makeCtx(['search', 'parallel']));

      expect(lines.join('\n')).toContain('parallel-dispatch');
    });

    it('shows empty-state message when no results found', async () => {
      mockSearchSkills.mockResolvedValue([]);
      const { marketplaceHandler } = await import('../../../../src/cli/handlers/marketplace.js');

      const lines: string[] = [];
      vi.spyOn(console, 'log').mockImplementation((...args) => lines.push(args.join(' ')));

      const result = await marketplaceHandler.execute(makeCtx(['search', 'nonexistent']));

      expect(result.exitCode).toBe(0);
      const output = lines.join('\n');
      expect(output.toLowerCase()).toMatch(/no results|nothing found|0 results/);
    });

    it('--source flag passes providerId to searchSkills', async () => {
      mockSearchSkills.mockResolvedValue([SAMPLE_CLAWHUB_RESULT]);
      const { marketplaceHandler } = await import('../../../../src/cli/handlers/marketplace.js');

      vi.spyOn(console, 'log').mockImplementation(() => {});
      await marketplaceHandler.execute(makeCtx(['search', 'parallel', '--source', 'clawhub']));

      expect(mockSearchSkills).toHaveBeenCalledWith('parallel', 'clawhub');
    });

    it('--json outputs parseable JSON array with source field', async () => {
      mockSearchSkills.mockResolvedValue([SAMPLE_CLAWHUB_RESULT, SAMPLE_OPENCLAW_RESULT]);
      const { marketplaceHandler } = await import('../../../../src/cli/handlers/marketplace.js');

      const lines: string[] = [];
      vi.spyOn(console, 'log').mockImplementation((...args) => lines.push(args.join(' ')));

      const result = await marketplaceHandler.execute(
        makeCtx(['search', 'parallel', '--json'])
      );

      expect(result.exitCode).toBe(0);
      const output = lines.join('\n');
      // Must be parseable JSON
      const parsed = JSON.parse(output);
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed).toHaveLength(2);
      // Each result must include source attribution
      expect(parsed[0].source).toBe('clawhub');
      expect(parsed[1].source).toBe('openclaw');
    });

    it('--json with --source limits results', async () => {
      mockSearchSkills.mockResolvedValue([SAMPLE_CLAWHUB_RESULT]);
      const { marketplaceHandler } = await import('../../../../src/cli/handlers/marketplace.js');

      const lines: string[] = [];
      vi.spyOn(console, 'log').mockImplementation((...args) => lines.push(args.join(' ')));

      await marketplaceHandler.execute(
        makeCtx(['search', 'parallel', '--source', 'clawhub', '--json'])
      );

      expect(mockSearchSkills).toHaveBeenCalledWith('parallel', 'clawhub');
      const parsed = JSON.parse(lines.join('\n'));
      expect(parsed).toHaveLength(1);
    });
  });

  // ── marketplace list ─────────────────────────────────────────────────────

  describe('list subcommand', () => {
    it('returns exitCode 0 and calls listInstalledPackages', async () => {
      const { marketplaceHandler } = await import('../../../../src/cli/handlers/marketplace.js');

      vi.spyOn(console, 'log').mockImplementation(() => {});
      const result = await marketplaceHandler.execute(makeCtx(['list']));

      expect(result.exitCode).toBe(0);
      expect(mockListPackages).toHaveBeenCalled();
    });

    it('shows empty-state message when no packages installed', async () => {
      const { marketplaceHandler } = await import('../../../../src/cli/handlers/marketplace.js');

      const lines: string[] = [];
      vi.spyOn(console, 'log').mockImplementation((...args) => lines.push(args.join(' ')));

      await marketplaceHandler.execute(makeCtx(['list']));

      expect(lines.join('\n').toLowerCase()).toMatch(/no packages|nothing installed/);
    });

    it('renders installed package keys in output', async () => {
      mockListPackages.mockResolvedValue([SAMPLE_PACKAGE]);
      const { marketplaceHandler } = await import('../../../../src/cli/handlers/marketplace.js');

      const lines: string[] = [];
      vi.spyOn(console, 'log').mockImplementation((...args) => lines.push(args.join(' ')));

      await marketplaceHandler.execute(makeCtx(['list']));

      expect(lines.join('\n')).toContain('roko/ring-methodology');
    });

    it('--json returns parseable array of installed packages', async () => {
      mockListPackages.mockResolvedValue([SAMPLE_PACKAGE]);
      const { marketplaceHandler } = await import('../../../../src/cli/handlers/marketplace.js');

      const lines: string[] = [];
      vi.spyOn(console, 'log').mockImplementation((...args) => lines.push(args.join(' ')));

      const result = await marketplaceHandler.execute(makeCtx(['list', '--json']));

      expect(result.exitCode).toBe(0);
      const parsed = JSON.parse(lines.join('\n'));
      expect(Array.isArray(parsed)).toBe(true);
      expect(parsed[0].key).toBe('roko/ring-methodology');
    });
  });

  // ── Git-native provenance workflow ──────────────────────────────────────

  describe('Git-native provenance subcommands', () => {
    it('combines signed catalog observations with skill search results without endorsement', async () => {
      vi.mocked(exchange.searchCatalogs).mockResolvedValue([SAMPLE_CATALOG_ENTRY] as never);
      const { marketplaceHandler } = await import('../../../../src/cli/handlers/marketplace.js');
      const lines: string[] = [];
      vi.spyOn(console, 'log').mockImplementation((...args) => lines.push(args.join(' ')));

      const result = await marketplaceHandler.execute(makeCtx(['search', 'example', '--json']));

      expect(result.exitCode).toBe(0);
      const parsed = JSON.parse(lines.join('\n'));
      expect(parsed[0]).toMatchObject({
        source: 'catalog:acme-community',
        package: 'acme/example',
        verificationStatus: 'verified',
        observation: SAMPLE_CATALOG_ENTRY.observation,
      });
    });

    it('installs catalog coordinates through the same immutable lock pipeline', async () => {
      vi.mocked(exchange.resolveCatalogEntry).mockResolvedValue(SAMPLE_CATALOG_ENTRY as never);
      vi.mocked(exchange.readCatalogEnvelope).mockResolvedValue(SAMPLE_ENVELOPE as never);
      const { marketplaceHandler } = await import('../../../../src/cli/handlers/marketplace.js');

      const result = await marketplaceHandler.execute(makeCtx([
        'install', 'acme/example@1.2.3', '--project-local', '--verify',
      ]));

      expect(result.exitCode).toBe(0);
      expect(mockInstallPackage).toHaveBeenCalledWith(
        SAMPLE_CATALOG_ENTRY.canonicalRemote,
        expect.objectContaining({
          configDir: '/tmp/myproject/.aiwg',
          ref: SAMPLE_CATALOG_ENTRY.resolvedCommit,
          expectedLockId: SAMPLE_LOCK.lockId,
          catalogId: SAMPLE_CATALOG_ENTRY.catalogId,
          verify: true,
        }),
      );
      expect(result.message).toContain(SAMPLE_LOCK.lockId);
    });

    it('verifies installed content offline and surfaces failures as a non-zero exit', async () => {
      vi.mocked(exchange.verifyIndexedPackage).mockResolvedValue({
        entry: { lock: SAMPLE_LOCK },
        verification: SAMPLE_VERIFICATION,
      } as never);
      const { marketplaceHandler } = await import('../../../../src/cli/handlers/marketplace.js');

      const passing = await marketplaceHandler.execute(makeCtx(['verify', SAMPLE_LOCK.lockId, '--project-local']));
      expect(passing.exitCode).toBe(0);
      expect(passing.message).toMatch(/offline/i);

      vi.mocked(exchange.verifyIndexedPackage).mockResolvedValue({
        entry: { lock: SAMPLE_LOCK },
        verification: { ...SAMPLE_VERIFICATION, ok: false, status: 'failed', errors: ['digest mismatch'] },
      } as never);
      const failing = await marketplaceHandler.execute(makeCtx(['verify', SAMPLE_LOCK.lockId]));
      expect(failing).toEqual({ exitCode: 1, message: 'Verification failed: digest mismatch' });
    });

    it('exports and imports a portable package with operation receipts', async () => {
      vi.mocked(exchange.exportPortablePackage).mockResolvedValue({
        output: '/tmp/example.aiwg.json',
        bundle: { lock: SAMPLE_LOCK },
        receipt: { receiptId: `sha256:${'1'.repeat(64)}` },
      } as never);
      vi.mocked(exchange.importPortablePackage).mockResolvedValue({
        entry: { lock: SAMPLE_LOCK },
        verification: SAMPLE_VERIFICATION,
        receipt: { receiptId: `sha256:${'2'.repeat(64)}` },
      } as never);
      const { marketplaceHandler } = await import('../../../../src/cli/handlers/marketplace.js');

      const exported = await marketplaceHandler.execute(makeCtx([
        'export', 'acme/example', '--output', '/tmp/example.aiwg.json', '--project-local',
      ]));
      expect(exported.exitCode).toBe(0);
      expect(exchange.exportPortablePackage).toHaveBeenCalledWith(expect.objectContaining({
        query: 'acme/example',
        output: '/tmp/example.aiwg.json',
        projectLocal: true,
      }));

      const imported = await marketplaceHandler.execute(makeCtx([
        'import', '/tmp/example.aiwg.json', '--verify', '--project-local',
      ]));
      expect(imported.exitCode).toBe(0);
      expect(exchange.importPortablePackage).toHaveBeenCalledWith(expect.objectContaining({
        input: '/tmp/example.aiwg.json',
        verify: true,
        projectLocal: true,
      }));
      expect(imported.message).toContain(SAMPLE_LOCK.lockId);
    });

    it('removes only catalog discovery state and retains immutable locks', async () => {
      vi.mocked(exchange.removeCatalog).mockResolvedValue(true);
      const { marketplaceHandler } = await import('../../../../src/cli/handlers/marketplace.js');

      const result = await marketplaceHandler.execute(makeCtx(['remove', 'acme-community']));

      expect(result.exitCode).toBe(0);
      expect(result.message).toMatch(/locks remain valid/i);
    });

    it('rejects ambiguous scope and incomplete publish arguments before mutation', async () => {
      const { marketplaceHandler } = await import('../../../../src/cli/handlers/marketplace.js');
      const scoped = await marketplaceHandler.execute(makeCtx([
        'list', '--project-local', '--global',
      ]));
      expect(scoped.exitCode).toBe(1);
      expect(scoped.message).toMatch(/either --project-local or --global/i);

      const publish = await marketplaceHandler.execute(makeCtx(['publish', '/tmp/source']));
      expect(publish.exitCode).toBe(1);
      expect(publish.message).toMatch(/--key.*--publisher/i);
      expect(exchange.publishLocalPackage).not.toHaveBeenCalled();
    });
  });

  // ── default (no subcommand) ───────────────────────────────────────────────

  describe('default / no subcommand', () => {
    it('shows usage when called with no arguments', async () => {
      const { marketplaceHandler } = await import('../../../../src/cli/handlers/marketplace.js');
      const result = await marketplaceHandler.execute(makeCtx([]));

      expect(result.exitCode).toBe(0);
      expect(result.message).toMatch(/marketplace search|marketplace list/i);
    });
  });

  // ── unknown subcommand ────────────────────────────────────────────────────

  describe('unknown subcommand', () => {
    it('returns exitCode 1 with usage text', async () => {
      const { marketplaceHandler } = await import('../../../../src/cli/handlers/marketplace.js');
      const result = await marketplaceHandler.execute(makeCtx(['bogus']));

      expect(result.exitCode).toBe(1);
      expect(result.message).toContain('bogus');
      expect(result.message).toMatch(/marketplace search|marketplace list/i);
    });
  });
});
