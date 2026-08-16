import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { mkdtemp, readFile, rm, writeFile } from 'fs/promises';
import { tmpdir } from 'os';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

const execFileAsync = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const SCRIPT = resolve(__dirname, '../../../tools/cli/config-gitignore.mjs');
const RUNTIME_PATTERNS = [
  '.aiwg/working/',
  '.aiwg/.index/',
  '.aiwg/ralph/',
  '.aiwg/ralph-external/',
  '.aiwg/security-engineering/reviews/disclosures/',
];

/** @implements #2106 */
describe('config-gitignore resolved Git coverage', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'aiwg-config-gitignore-'));
    await execFileAsync('git', ['init', '--quiet'], { cwd: tempDir });
  });

  afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true });
  });

  it('passes --check when a broad rule already ignores every runtime path', async () => {
    await writeFile(join(tempDir, '.gitignore'), '.aiwg/*\n!.aiwg/aiwg.config\n', 'utf-8');

    const { stdout } = await execFileAsync(process.execPath, [SCRIPT, '--check'], { cwd: tempDir });

    expect(stdout).toContain('AIWG runtime paths are gitignored');
  });

  it('does not append behavior-neutral runtime entries in --fix mode', async () => {
    const original = '.aiwg/*\n!.aiwg/aiwg.config\n';
    await writeFile(join(tempDir, '.gitignore'), original, 'utf-8');

    await execFileAsync(process.execPath, [SCRIPT, '--fix'], { cwd: tempDir });

    const lines = (await readFile(join(tempDir, '.gitignore'), 'utf-8'))
      .split('\n')
      .map(line => line.trim());
    for (const pattern of RUNTIME_PATTERNS) {
      expect(lines).not.toContain(pattern);
    }
  });

  it('warns and fixes a runtime path made trackable by a negation', async () => {
    await writeFile(join(tempDir, '.gitignore'), '.aiwg/*\n!.aiwg/working/\n', 'utf-8');

    let stderr = '';
    try {
      await execFileAsync(process.execPath, [SCRIPT, '--check'], { cwd: tempDir });
    } catch (error) {
      stderr = (error as { stderr?: string }).stderr ?? '';
    }
    expect(stderr).toContain('.aiwg/working/');

    await execFileAsync(process.execPath, [SCRIPT, '--fix'], { cwd: tempDir });
    expect(await readFile(join(tempDir, '.gitignore'), 'utf-8')).toContain('\n.aiwg/working/\n');
  });

  it('recognizes runtime coverage from .git/info/exclude', async () => {
    await writeFile(join(tempDir, '.gitignore'), '', 'utf-8');
    await writeFile(join(tempDir, '.git', 'info', 'exclude'), `${RUNTIME_PATTERNS.join('\n')}\n`, 'utf-8');

    const { stdout } = await execFileAsync(process.execPath, [SCRIPT, '--check'], { cwd: tempDir });

    expect(stdout).toContain('AIWG runtime paths are gitignored');
  });

  it('recognizes runtime coverage from core.excludesFile', async () => {
    await writeFile(join(tempDir, '.gitignore'), '', 'utf-8');
    const excludesPath = join(tempDir, 'operator-excludes');
    await writeFile(excludesPath, `${RUNTIME_PATTERNS.join('\n')}\n`, 'utf-8');
    await execFileAsync('git', ['config', 'core.excludesFile', excludesPath], { cwd: tempDir });

    const { stdout } = await execFileAsync(process.execPath, [SCRIPT, '--check'], { cwd: tempDir });

    expect(stdout).toContain('AIWG runtime paths are gitignored');
  });
});
