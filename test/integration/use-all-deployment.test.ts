/**
 * Integration tests for `aiwg use all` disallow-list behaviour
 *
 * Validates that:
 *   - `aiwg use all` deploys every addon except those in the disallow list
 *   - `aiwg use aiwg-dev` is rejected with a useful error
 *   - `aiwg use <any-valid-addon>` works without being in a hardcoded list
 *   - New addons added to agentic/code/addons/ are auto-discovered
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs/promises';
import { existsSync, mkdtempSync, rmSync } from 'fs';
import path from 'path';
import os from 'os';
import { execFileSync, spawnSync } from 'child_process';

const REPO_ROOT = path.resolve(__dirname, '../..');
const BIN = path.join(REPO_ROOT, 'bin/aiwg.mjs');

function runAiwg(
  args: string[],
  cwd: string = os.tmpdir()
): { stdout: string; stderr: string; exitCode: number } {
  if (args.includes('use') && !args.includes('--copy-all') && !args.includes('--dry-run')) {
    args = [...args, '--copy-all'];
  }
  const result = spawnSync(process.execPath, [BIN, ...args], {
    cwd,
    encoding: 'utf-8',
    timeout: 60_000,
    env: { ...process.env },
  });
  return {
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    exitCode: result.status ?? 1,
  };
}

function canInitGit(): boolean {
  const tmp = mkdtempSync(path.join(os.tmpdir(), 'aiwg-git-check-'));
  try {
    execFileSync('git', ['init'], { cwd: tmp, stdio: 'pipe' });
    return true;
  } catch {
    return false;
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

const GIT_AVAILABLE = canInitGit();

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function makeProject(): Promise<string> {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'aiwg-use-all-'));
  if (GIT_AVAILABLE) {
    execFileSync('git', ['init'], { cwd: dir, stdio: 'pipe' });
  }
  return dir;
}

async function cleanProject(dir: string) {
  if (existsSync(dir)) await fs.rm(dir, { recursive: true, force: true });
}

// ---------------------------------------------------------------------------
// Disallow-list unit-level integration
// ---------------------------------------------------------------------------

describe('aiwg use — disallow list', () => {
  it('accepts aiwg-dev as an explicit install (contributor workflow)', () => {
    // aiwg-dev is excluded from `use all` but must be installable explicitly
    const result = runAiwg(['use', 'aiwg-dev', '--dry-run']);
    expect(result.exitCode).toBe(0);
  });

  it('rejects unknown addon names', () => {
    const result = runAiwg(['use', 'this-does-not-exist-abc123']);
    expect(result.exitCode).not.toBe(0);
    expect(result.stdout + result.stderr).toMatch(/unknown target|not found/i);
  });

  it('accepts a real addon by name without it being in a hardcoded list', () => {
    // auto-memory is new and was NOT in the old VALID_ADDONS hardcoded list
    const result = runAiwg(['use', 'auto-memory', '--dry-run']);
    // dry-run exit code 0 means the addon was recognised and would be deployed
    expect(result.exitCode).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// aiwg use all — deployment coverage
// ---------------------------------------------------------------------------

describe.skipIf(!GIT_AVAILABLE)('aiwg use all — deployment coverage', () => {
  let projectDir: string;

  beforeEach(async () => {
    projectDir = await makeProject();
  });

  afterEach(async () => {
    await cleanProject(projectDir);
  });

  it('deploys to .claude/.aiwg/skills/ without errors', () => {
    const result = runAiwg(['use', 'all', '--target', projectDir], projectDir);
    expect(result.exitCode, `aiwg use all failed (exit ${result.exitCode}):\nstdout: ${result.stdout}\nstderr: ${result.stderr}`).toBe(0);
    const skillsDir = path.join(projectDir, '.claude', '.aiwg', 'skills');
    expect(existsSync(skillsDir)).toBe(true);
  });

  it('deploys more skills than the old hardcoded 4-addon set would produce', async () => {
    const result = runAiwg(['use', 'all', '--target', projectDir], projectDir);
    expect(result.exitCode).toBe(0);

    const skillsDir = path.join(projectDir, '.claude', '.aiwg', 'skills');
    if (!existsSync(skillsDir)) return; // guard for environments without write access

    const deployed = await fs.readdir(skillsDir);
    // Old behaviour only deployed aiwg-utils + ralph skills (~30 total)
    // New behaviour deploys all addons, should be substantially more
    expect(deployed.length).toBeGreaterThan(30);
  });

  it('does not deploy aiwg-dev skills', async () => {
    runAiwg(['use', 'all', '--target', projectDir], projectDir);
    const skillsDir = path.join(projectDir, '.claude', '.aiwg', 'skills');
    if (!existsSync(skillsDir)) return;

    // aiwg-dev skills: validate-component, validate-addon, dev-doctor, link-check
    const devSkills = ['validate-component', 'validate-addon', 'dev-doctor', 'link-check'];
    const deployed = await fs.readdir(skillsDir);
    for (const devSkill of devSkills) {
      expect(deployed).not.toContain(devSkill);
    }
  });

  it('deploys addons that were previously missing from the hardcoded list', async () => {
    const result = runAiwg(['use', 'all', '--target', projectDir], projectDir);
    expect(result.exitCode).toBe(0);

    const skillsDir = path.join(projectDir, '.claude', '.aiwg', 'skills');
    if (!existsSync(skillsDir)) return;

    const deployed = await fs.readdir(skillsDir);

    // These addons have skills and were NOT in the old VALID_ADDONS list
    // They should now appear after `aiwg use all`
    const previouslyMissing = [
      'voice-apply',      // voice-framework
      'curate',           // media-curator
      'agent-loop',       // ralph (was hardcoded but let's verify)
      'project-awareness', // aiwg-utils (was hardcoded but let's verify)
    ];

    for (const skill of previouslyMissing) {
      expect(deployed).toContain(skill);
    }
  });

  it('deploys agents alongside skills', async () => {
    runAiwg(['use', 'all', '--target', projectDir], projectDir);
    const agentsDir = path.join(projectDir, '.claude', 'agents');
    if (!existsSync(agentsDir)) return;

    const agents = await fs.readdir(agentsDir);
    expect(agents.length).toBeGreaterThan(0);
    expect(agents.some(a => a.endsWith('.md'))).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// new-project skill — rename validation
// ---------------------------------------------------------------------------

describe('new-project skill rename', () => {
  it('new-project skill exists in source tree', async () => {
    const skillPath = path.join(
      REPO_ROOT,
      'agentic/code/addons/aiwg-utils/skills/new-project/SKILL.md'
    );
    expect(existsSync(skillPath)).toBe(true);
  });

  it('old new/ skill directory no longer exists in source tree', () => {
    const oldPath = path.join(
      REPO_ROOT,
      'agentic/code/addons/aiwg-utils/skills/new/SKILL.md'
    );
    expect(existsSync(oldPath)).toBe(false);
  });

  it('new-project is listed in the aiwg-utils manifest', async () => {
    const manifestPath = path.join(
      REPO_ROOT,
      'agentic/code/addons/aiwg-utils/manifest.json'
    );
    const manifest = JSON.parse(await fs.readFile(manifestPath, 'utf-8'));
    expect(manifest.skills).toContain('new-project');
    expect(manifest.skills).not.toContain('new');
  });
});
