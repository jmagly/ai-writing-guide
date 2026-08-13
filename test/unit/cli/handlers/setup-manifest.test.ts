import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { stringify } from 'yaml';
import {
  generateSetupManifest,
  runSetupManifest,
  setupGenerateHandler,
  setupRunHandler,
  setupValidateHandler,
  validateSetupManifest,
} from '../../../../src/cli/handlers/setup-manifest.js';
import { allHandlers } from '../../../../src/cli/handlers/index.js';
import type { HandlerContext } from '../../../../src/cli/handlers/types.js';

const REPO_ROOT = path.resolve(import.meta.dirname, '../../../..');

function ctx(tmpDir: string, args: string[] = []): HandlerContext {
  return {
    args,
    rawArgs: args,
    cwd: tmpDir,
    frameworkRoot: REPO_ROOT,
  };
}

function writeExecutable(filePath: string, body: string): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, body, 'utf8');
  fs.chmodSync(filePath, 0o755);
}

function writeManifest(tmpDir: string, manifest: Record<string, unknown>, name = 'setup.manifest.yaml'): string {
  const manifestPath = path.join(tmpDir, name);
  fs.writeFileSync(manifestPath, stringify(manifest), 'utf8');
  return manifestPath;
}

function baseManifest(step: Record<string, unknown> = { id: 'install', type: 'script', script: 'scripts/install.sh' }) {
  return {
    apiVersion: 'setup.aiwg.io/v1',
    kind: 'SetupManifest',
    metadata: {
      name: 'sample',
      description: 'no os configuration required',
      install_type: 'developer',
    },
    spec: {
      platforms: [{ os: 'linux' }],
      params: [
        { name: 'INSTALL_DIR', type: 'path', interactive_required: true },
      ],
      steps: [step],
    },
  };
}

describe('setup manifest CLI handlers', () => {
  let tmpDir: string;
  let stdoutSpy: ReturnType<typeof vi.spyOn>;
  let stderrSpy: ReturnType<typeof vi.spyOn>;
  let consoleLogSpy: ReturnType<typeof vi.spyOn>;
  let consoleErrorSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-setup-manifest-'));
    stdoutSpy = vi.spyOn(process.stdout, 'write').mockImplementation(() => true);
    stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    stdoutSpy.mockRestore();
    stderrSpy.mockRestore();
    consoleLogSpy.mockRestore();
    consoleErrorSpy.mockRestore();
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it('registers setup manifest commands as agent-facing CLI handlers', () => {
    const ids = new Set(allHandlers.map((handler) => handler.id));
    expect([...ids]).toEqual(expect.arrayContaining(['setup-generate', 'setup-validate', 'setup-run']));
  });

  it('prints help for setup-generate, setup-validate, and setup-run', async () => {
    await expect(setupGenerateHandler.execute(ctx(tmpDir, ['--help']))).resolves.toMatchObject({ exitCode: 0 });
    await expect(setupValidateHandler.execute(ctx(tmpDir, ['--help']))).resolves.toMatchObject({ exitCode: 0 });
    await expect(setupRunHandler.execute(ctx(tmpDir, ['--help']))).resolves.toMatchObject({ exitCode: 0 });
    const output = stdoutSpy.mock.calls.map(([chunk]) => String(chunk)).join('\n');
    expect(output).toContain('aiwg setup-generate');
    expect(output).toContain('aiwg setup-validate');
    expect(output).toContain('aiwg setup-run');
    expect(output).toContain('--json');
    expect(output).toContain('--dry-run');
  });

  it('generates a starter manifest that validates', () => {
    const result = generateSetupManifest({
      cwd: tmpDir,
      output: 'installer/setup.dev.manifest.yaml',
      name: 'generated-project',
      type: 'developer',
      platform: 'linux',
    });

    expect(result.exitCode).toBe(0);
    const validation = validateSetupManifest({
      cwd: tmpDir,
      frameworkRoot: REPO_ROOT,
      manifestPath: 'installer/setup.dev.manifest.yaml',
    });
    expect(validation.findings.filter((finding) => finding.severity === 'error')).toEqual([]);
  });

  it('does not treat setup-generate option values as positional output paths', async () => {
    await expect(setupGenerateHandler.execute(ctx(tmpDir, ['--name', 'named-project']))).resolves.toMatchObject({
      exitCode: 0,
    });

    expect(fs.existsSync(path.join(tmpDir, 'setup.manifest.yaml'))).toBe(true);
    expect(fs.existsSync(path.join(tmpDir, 'named-project'))).toBe(false);
  });

  it('validates a correct manifest and rejects malformed or missing manifests', () => {
    writeExecutable(path.join(tmpDir, 'scripts/install.sh'), '#!/usr/bin/env sh\nexit 0\n');
    writeManifest(tmpDir, baseManifest());

    expect(validateSetupManifest({ cwd: tmpDir, frameworkRoot: REPO_ROOT }).findings).toEqual([]);

    fs.writeFileSync(path.join(tmpDir, 'broken.yaml'), 'apiVersion: [unterminated\n', 'utf8');
    expect(validateSetupManifest({
      cwd: tmpDir,
      frameworkRoot: REPO_ROOT,
      manifestPath: 'broken.yaml',
    }).findings[0]).toMatchObject({ severity: 'error', rule: 'yaml' });

    expect(validateSetupManifest({
      cwd: tmpDir,
      frameworkRoot: REPO_ROOT,
      manifestPath: 'missing.yaml',
    }).findings[0]).toMatchObject({ severity: 'error', rule: 'manifestExists' });
  });

  it('reports schema and installer consistency failures with paths and rule names', () => {
    const cases: Array<[string, Record<string, unknown>, string, string]> = [
      ['schema.yaml', { ...baseManifest(), kind: 'Other' }, '/kind', 'const'],
      ['missing-script.yaml', baseManifest({ id: 'install', type: 'script', script: 'scripts/missing.sh' }), '/spec/steps/0/script', 'scriptExists'],
      ['depends.yaml', baseManifest({ id: 'install', type: 'verify', commands: ['true'], depends_on: ['missing'] }), '/spec/steps/0/depends_on', 'depends_on'],
      ['recovery.yaml', baseManifest({ id: 'install', type: 'verify', commands: ['false'], on_fail: 'missing' }), '/spec/steps/0/on_fail', 'on_fail'],
      ['chain.yaml', baseManifest({ id: 'chain', type: 'chain', manifest: 'missing.yaml' }), '/spec/steps/0/manifest', 'chainManifestExists'],
      ['agentic.yaml', baseManifest({ id: 'manual', type: 'agentic' }), '/spec/steps/0/instruction', 'agenticInstruction'],
    ];

    for (const [fileName, manifest, expectedPath, expectedRule] of cases) {
      writeManifest(tmpDir, manifest, fileName);
      const findings = validateSetupManifest({
        cwd: tmpDir,
        frameworkRoot: REPO_ROOT,
        manifestPath: fileName,
      }).findings;
      expect(findings, fileName).toContainEqual(expect.objectContaining({
        severity: 'error',
        path: expectedPath,
        rule: expectedRule,
      }));
    }
  });

  it('dry-runs a valid manifest without executing steps', () => {
    const marker = path.join(tmpDir, 'marker');
    writeExecutable(path.join(tmpDir, 'scripts/install.sh'), `#!/usr/bin/env sh\nprintf ran > ${marker}\n`);
    writeManifest(tmpDir, baseManifest());

    const result = runSetupManifest({
      cwd: tmpDir,
      frameworkRoot: REPO_ROOT,
      dryRun: true,
      platform: 'linux',
      paramValues: { INSTALL_DIR: tmpDir },
      skip: new Set(),
    });

    expect(result.exitCode).toBe(0);
    expect(fs.existsSync(marker)).toBe(false);
    expect(stdoutSpy.mock.calls.map(([chunk]) => String(chunk)).join('\n')).toContain('[setup:dry-run]');
  });

  it('accepts provider-orchestrated agentic workflows and hands them off before CLI execution', () => {
    const manifest = baseManifest({ id: 'inspect', type: 'agentic', instruction: 'Inspect the project safely.' });
    manifest.metadata.execution_mode = 'provider-orchestrated';
    writeManifest(tmpDir, manifest);

    const validation = validateSetupManifest({ cwd: tmpDir, frameworkRoot: REPO_ROOT });
    expect(validation.findings.filter((finding) => finding.rule === 'agenticStep')).toEqual([]);
    expect(runSetupManifest({
      cwd: tmpDir,
      frameworkRoot: REPO_ROOT,
      platform: 'linux',
      paramValues: { INSTALL_DIR: tmpDir },
      skip: new Set(),
      yes: true,
    })).toMatchObject({
      exitCode: 2,
      message: expect.stringContaining('provider-orchestrated'),
    });
  });

  it('fails invalid manifests and missing params before execution', () => {
    const marker = path.join(tmpDir, 'marker');
    writeExecutable(path.join(tmpDir, 'scripts/install.sh'), `#!/usr/bin/env sh\nprintf ran > ${marker}\n`);
    writeManifest(tmpDir, { ...baseManifest(), kind: 'Other' });
    expect(runSetupManifest({
      cwd: tmpDir,
      frameworkRoot: REPO_ROOT,
      platform: 'linux',
      paramValues: { INSTALL_DIR: tmpDir },
      skip: new Set(),
      yes: true,
    }).exitCode).toBe(1);
    expect(fs.existsSync(marker)).toBe(false);

    writeManifest(tmpDir, baseManifest());
    expect(runSetupManifest({
      cwd: tmpDir,
      frameworkRoot: REPO_ROOT,
      platform: 'linux',
      paramValues: {},
      skip: new Set(),
      yes: true,
    }).exitCode).toBe(1);
    expect(fs.existsSync(marker)).toBe(false);
  });

  it('refuses mutating execution without confirmation and runs successfully with confirmation', () => {
    const installDir = path.join(tmpDir, 'install-target');
    const marker = path.join(installDir, 'marker');
    writeExecutable(path.join(tmpDir, 'scripts/install.sh'), '#!/usr/bin/env sh\nmkdir -p "$INSTALL_DIR"\nprintf ran > "$INSTALL_DIR/marker"\n');
    writeManifest(tmpDir, baseManifest());

    expect(runSetupManifest({
      cwd: tmpDir,
      frameworkRoot: REPO_ROOT,
      platform: 'linux',
      paramValues: { INSTALL_DIR: installDir },
      skip: new Set(),
      yes: false,
    }).exitCode).toBe(2);
    expect(fs.existsSync(marker)).toBe(false);

    expect(runSetupManifest({
      cwd: tmpDir,
      frameworkRoot: REPO_ROOT,
      platform: 'linux',
      paramValues: { INSTALL_DIR: installDir },
      skip: new Set(),
      yes: true,
    }).exitCode).toBe(0);
    expect(fs.readFileSync(marker, 'utf8')).toBe('ran');
  });

  it('runs recovery deterministically and preserves nonzero status after failed step', () => {
    const recoveryMarker = path.join(tmpDir, 'recovered');
    writeExecutable(path.join(tmpDir, 'scripts/fail.sh'), '#!/usr/bin/env sh\nexit 7\n');
    writeExecutable(path.join(tmpDir, 'scripts/recover.sh'), `#!/usr/bin/env sh\nprintf recovered > ${recoveryMarker}\n`);
    writeManifest(tmpDir, {
      ...baseManifest({ id: 'install', type: 'script', script: 'scripts/fail.sh', on_fail: 'recover-install' }),
      spec: {
        ...baseManifest().spec,
        steps: [{ id: 'install', type: 'script', script: 'scripts/fail.sh', on_fail: 'recover-install' }],
        recovery: [{ id: 'recover-install', steps: [{ id: 'recover', type: 'script', script: 'scripts/recover.sh' }] }],
      },
    });

    const result = runSetupManifest({
      cwd: tmpDir,
      frameworkRoot: REPO_ROOT,
      platform: 'linux',
      paramValues: { INSTALL_DIR: tmpDir },
      skip: new Set(),
      yes: true,
    });

    expect(result.exitCode).toBe(7);
    expect(fs.readFileSync(recoveryMarker, 'utf8')).toBe('recovered');
  });
});
