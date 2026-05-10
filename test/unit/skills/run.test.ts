/**
 * Tests for `aiwg run skill <name>` (#1227).
 *
 * Smoke fixture verifies the project-root CWD invariant: the script
 * runs from the calling project's root, not the skill's source dir or
 * the AIWG install. It writes a marker file using a relative path and
 * the test asserts the marker lands in the project, not elsewhere.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { promises as fs } from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { runSkill } from '../../../src/skills/run.js';

let tmpRoot: string;
let projectDir: string;
let aiwgRoot: string;
let skillDir: string;

async function buildFakeSkill(scriptBody: string): Promise<void> {
  // Create the AIWG_ROOT-shaped layout for a skill:
  // <aiwgRoot>/agentic/code/addons/test-pack/skills/marker-skill/
  //   SKILL.md          (declares script entrypoint)
  //   scripts/run.cjs   (the executable)
  skillDir = path.join(
    aiwgRoot,
    'agentic',
    'code',
    'addons',
    'test-pack',
    'skills',
    'marker-skill',
  );
  await fs.mkdir(path.join(skillDir, 'scripts'), { recursive: true });
  await fs.writeFile(
    path.join(skillDir, 'SKILL.md'),
    [
      '---',
      'name: marker-skill',
      'description: writes marker.txt to CWD',
      'script:',
      '  entrypoint: scripts/run.cjs',
      '  runtime: node',
      '---',
      '# Marker skill',
    ].join('\n'),
    'utf8',
  );
  await fs.writeFile(path.join(skillDir, 'scripts', 'run.cjs'), scriptBody, 'utf8');
}

async function buildIndex(extraEntry?: Record<string, unknown>): Promise<void> {
  // Use the project graph (`<cwd>/.aiwg/.index/project/`) — keeps the
  // index inside the test's tmpRoot so we never touch the user's real
  // framework graph at $XDG_DATA_HOME/aiwg/index/framework/.
  const indexDir = path.join(projectDir, '.aiwg', '.index', 'project');
  await fs.mkdir(indexDir, { recursive: true });
  const skillRelPath = 'agentic/code/addons/test-pack/skills/marker-skill/SKILL.md';
  const entries: Record<string, unknown> = {
    [skillRelPath]: {
      path: skillRelPath,
      type: 'skill',
      phase: 'meta',
      title: 'marker-skill',
      tags: [],
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      checksum: 'aaaaaaaaaaaaaaaa',
      summary: 'writes marker.txt to CWD',
      dependencies: [],
      dependents: [],
      capability: 'writes marker.txt to CWD',
      script: {
        entrypoint: 'scripts/run.cjs',
        runtime: 'node',
        cwd: 'project-root',
      },
    },
  };
  if (extraEntry) {
    Object.assign(entries, extraEntry);
  }
  const index = {
    version: '1.0',
    builtAt: new Date().toISOString(),
    buildTimeMs: 1,
    entries,
  };
  await fs.writeFile(
    path.join(indexDir, 'metadata.json'),
    JSON.stringify(index, null, 2),
    'utf8',
  );
}

beforeEach(async () => {
  tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'aiwg-run-skill-'));
  projectDir = path.join(tmpRoot, 'project');
  aiwgRoot = path.join(tmpRoot, 'aiwg-install');
  await fs.mkdir(projectDir, { recursive: true });
  await fs.mkdir(aiwgRoot, { recursive: true });
  process.env.AIWG_ROOT = aiwgRoot;
});

afterEach(async () => {
  delete process.env.AIWG_ROOT;
  await fs.rm(tmpRoot, { recursive: true, force: true });
});

describe('runSkill — project-root CWD invariant (#1227)', () => {
  it('runs the script with CWD = project root, not skill-dir or AIWG root', async () => {
    // Script writes marker.txt to CWD using a relative path.
    await buildFakeSkill(
      `const fs = require('fs');
       fs.writeFileSync('marker.txt', 'hello from skill\\n');`,
    );
    await buildIndex();

    const exitCode = await runSkill({
      cwd: projectDir,
      name: 'marker-skill',
      args: [],
    });
    expect(exitCode).toBe(0);

    // Marker should be in the project, NOT in the skill dir or AIWG root.
    const inProject = await fs
      .readFile(path.join(projectDir, 'marker.txt'), 'utf8')
      .catch(() => null);
    const inSkillDir = await fs
      .stat(path.join(skillDir, 'marker.txt'))
      .then(() => true)
      .catch(() => false);
    const inAiwgRoot = await fs
      .stat(path.join(aiwgRoot, 'marker.txt'))
      .then(() => true)
      .catch(() => false);

    expect(inProject).toBe('hello from skill\n');
    expect(inSkillDir).toBe(false);
    expect(inAiwgRoot).toBe(false);
  });

  it('exposes AIWG_SKILL_DIR / AIWG_PROJECT_ROOT / AIWG_ROOT to the script', async () => {
    await buildFakeSkill(
      `const fs = require('fs');
       const out = {
         AIWG_SKILL_DIR: process.env.AIWG_SKILL_DIR,
         AIWG_PROJECT_ROOT: process.env.AIWG_PROJECT_ROOT,
         AIWG_ROOT: process.env.AIWG_ROOT,
         cwd: process.cwd(),
       };
       fs.writeFileSync('env.json', JSON.stringify(out));`,
    );
    await buildIndex();

    const exitCode = await runSkill({
      cwd: projectDir,
      name: 'marker-skill',
      args: [],
    });
    expect(exitCode).toBe(0);

    const captured = JSON.parse(
      await fs.readFile(path.join(projectDir, 'env.json'), 'utf8'),
    );
    expect(captured.AIWG_PROJECT_ROOT).toBe(projectDir);
    expect(captured.AIWG_ROOT).toBe(aiwgRoot);
    expect(captured.AIWG_SKILL_DIR).toBe(skillDir);
    expect(captured.cwd).toBe(projectDir);
  });

  it('forwards args verbatim to the script', async () => {
    await buildFakeSkill(
      `const fs = require('fs');
       fs.writeFileSync('args.json', JSON.stringify(process.argv.slice(2)));`,
    );
    await buildIndex();

    const exitCode = await runSkill({
      cwd: projectDir,
      name: 'marker-skill',
      args: ['--voice', 'technical-authority', '--input', 'draft.md'],
    });
    expect(exitCode).toBe(0);
    const args = JSON.parse(
      await fs.readFile(path.join(projectDir, 'args.json'), 'utf8'),
    );
    expect(args).toEqual(['--voice', 'technical-authority', '--input', 'draft.md']);
  });

  it('propagates the script exit code', async () => {
    await buildFakeSkill(`process.exit(42);`);
    await buildIndex();
    const exitCode = await runSkill({
      cwd: projectDir,
      name: 'marker-skill',
      args: [],
    });
    expect(exitCode).toBe(42);
  });

  it('returns 1 with a clear error when the skill is unknown', async () => {
    await buildFakeSkill(`/* unused */`);
    await buildIndex();
    const exitCode = await runSkill({
      cwd: projectDir,
      name: 'no-such-skill',
      args: [],
    });
    expect(exitCode).toBe(1);
  });

  it('returns 1 when the skill is instructional only (no script block)', async () => {
    // Build a project-graph index entry with NO script field
    const indexDir = path.join(projectDir, '.aiwg', '.index', 'project');
    await fs.mkdir(indexDir, { recursive: true });
    const skillPath = 'agentic/code/addons/test-pack/skills/instr-only/SKILL.md';
    await fs.writeFile(
      path.join(indexDir, 'metadata.json'),
      JSON.stringify({
        version: '1.0',
        builtAt: new Date().toISOString(),
        buildTimeMs: 1,
        entries: {
          [skillPath]: {
            path: skillPath,
            type: 'skill',
            phase: 'meta',
            title: 'instr-only',
            tags: [],
            created: new Date().toISOString(),
            updated: new Date().toISOString(),
            checksum: 'bbbbbbbbbbbbbbbb',
            summary: 'instructions only',
            dependencies: [],
            dependents: [],
          },
        },
      }),
      'utf8',
    );
    const exitCode = await runSkill({
      cwd: projectDir,
      name: 'instr-only',
      args: [],
    });
    expect(exitCode).toBe(1);
  });

  it('honors --cwd override', async () => {
    await buildFakeSkill(
      `const fs = require('fs');
       fs.writeFileSync('marker.txt', 'overridden');`,
    );
    await buildIndex();
    const overrideDir = path.join(tmpRoot, 'somewhere-else');
    await fs.mkdir(overrideDir, { recursive: true });

    const exitCode = await runSkill({
      cwd: projectDir,
      name: 'marker-skill',
      args: [],
      cwdOverride: overrideDir,
    });
    expect(exitCode).toBe(0);

    const inOverride = await fs
      .readFile(path.join(overrideDir, 'marker.txt'), 'utf8')
      .catch(() => null);
    expect(inOverride).toBe('overridden');
  });
});
