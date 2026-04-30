/**
 * Unit tests for aiwg skill-lint handler.
 *
 * @source @src/cli/handlers/skill-lint.ts
 * @implements #1015 Phase C
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';
import { lintSkillFile, lintSkills } from '../../../../src/cli/handlers/skill-lint.js';

// ── Fixtures ────────────────────────────────────────────────────────────

let tmpDir: string;

const PERFECT_SKILL = `---
name: perfect-skill
namespace: aiwg
description: Use when you need a perfect example. Generates outputs with exemplary quality and traceability.
platforms: [all]
user-invocable: true
triggers:
  - "perfect skill"
  - "exemplar"
---

# Perfect Skill

This skill exists as a fixture for the rubric tests. It has a frontmatter with all
required fields, an action-leading description, two triggers, and a body that is
clearly more than thirty words long so the body dimension scores full marks.
The body section continues with enough text to comfortably exceed the
hundred-word floor required for a full body score in the rubric.

## Triggers
- perfect skill
- exemplar

## Behavior
Run the perfect-skill behavior and return the canonical fixture output.
The behavior section is also intentionally verbose to push the total
word count well above one hundred. Authors using this fixture as a
template can copy the structure verbatim and substitute their own
specifics. The fixture intentionally over-shoots so small wording
tweaks during test maintenance do not push it under the body floor.
`;

const STUB_SKILL = `---
name: stub-skill
namespace: aiwg
description: stub
platforms: [all]
user-invocable: true
---

short body.
`;

const NO_TRIGGERS_USER_INVOCABLE = `---
name: needs-triggers
namespace: aiwg
description: Use when you need to verify the discoverability dimension fails on user-invocable skills with no triggers.
platforms: [all]
user-invocable: true
---

# Body

This skill has plenty of body content. It is missing triggers, however, which
is the precise condition we want to fail on. The body has more than one hundred
words to ensure the body dimension scores full marks. We want the discoverability
dimension to be the only failing one in this fixture so the test can assert it.
The body keeps going to comfortably exceed the floor required for a full body
score in the rubric while leaving discoverability as the sole defect.
`;

const AGENT_ONLY = `---
name: agent-only
namespace: aiwg
description: Use when an agent needs to do internal work; this skill is not user-invocable.
platforms: [all]
---

# Body

This skill is not user-invocable so the discoverability dimension auto-passes
even with zero triggers. Body content here is plenty long to satisfy the body
dimension's word floor. Description is action-leading so it scores well too.
The body keeps going so we comfortably hit the hundred-word floor required.
`;

// Two flow sequences on one line — invalid YAML (mapping value followed by
// extra tokens). Same shape as the bug class fixed in #1013.
const BROKEN_YAML = `---
name: broken
namespace: aiwg
description: Use when nothing works because YAML is invalid.
platforms: [all]
commandHint:
  argumentHint: [--keep-changes] [--revert]
---

# Body
This file should fail the schema dimension because the frontmatter does not
parse cleanly. The other dimensions still score what they can but the schema
gate is binary and weighted heavily.
`;

beforeAll(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aiwg-skill-lint-'));
  await fs.mkdir(path.join(tmpDir, 'perfect'), { recursive: true });
  await fs.mkdir(path.join(tmpDir, 'stub'), { recursive: true });
  await fs.mkdir(path.join(tmpDir, 'needs-triggers'), { recursive: true });
  await fs.mkdir(path.join(tmpDir, 'agent-only'), { recursive: true });
  await fs.mkdir(path.join(tmpDir, 'broken'), { recursive: true });
  await fs.writeFile(path.join(tmpDir, 'perfect/SKILL.md'), PERFECT_SKILL);
  await fs.writeFile(path.join(tmpDir, 'stub/SKILL.md'), STUB_SKILL);
  await fs.writeFile(path.join(tmpDir, 'needs-triggers/SKILL.md'), NO_TRIGGERS_USER_INVOCABLE);
  await fs.writeFile(path.join(tmpDir, 'agent-only/SKILL.md'), AGENT_ONLY);
  await fs.writeFile(path.join(tmpDir, 'broken/SKILL.md'), BROKEN_YAML);
});

afterAll(async () => {
  await fs.rm(tmpDir, { recursive: true, force: true });
});

// ── Tests ───────────────────────────────────────────────────────────────

describe('skill-lint rubric', () => {
  it('scores a complete skill at 100', async () => {
    const result = await lintSkillFile(path.join(tmpDir, 'perfect/SKILL.md'));
    expect(result.score).toBe(100);
    expect(result.passes).toBe(true);
    expect(result.dimensions.schema.score).toBe(100);
    expect(result.dimensions.description.score).toBe(100);
    expect(result.dimensions.discoverability.score).toBe(100);
    expect(result.dimensions.body.score).toBe(100);
  });

  it('penalizes a stub skill with short body and short description', async () => {
    const result = await lintSkillFile(path.join(tmpDir, 'stub/SKILL.md'));
    expect(result.score).toBeLessThan(60);
    expect(result.dimensions.body.score).toBe(0);
    expect(result.dimensions.description.score).toBeLessThan(100);
  });

  it('flags user-invocable skills with no triggers', async () => {
    const result = await lintSkillFile(path.join(tmpDir, 'needs-triggers/SKILL.md'));
    expect(result.dimensions.discoverability.score).toBe(0);
    expect(result.dimensions.discoverability.notes[0]).toMatch(/no triggers/i);
  });

  it('auto-passes discoverability for agent-only skills', async () => {
    const result = await lintSkillFile(path.join(tmpDir, 'agent-only/SKILL.md'));
    expect(result.dimensions.discoverability.score).toBe(100);
  });

  it('fails the schema dimension on YAML parse errors', async () => {
    const result = await lintSkillFile(path.join(tmpDir, 'broken/SKILL.md'));
    expect(result.dimensions.schema.score).toBe(0);
    expect(result.dimensions.schema.notes[0]).toMatch(/yaml parse error/i);
  });

  it('respects rubric thresholds (lenient passes more than strict)', async () => {
    const lenient = await lintSkillFile(path.join(tmpDir, 'stub/SKILL.md'), 'lenient');
    const strict = await lintSkillFile(path.join(tmpDir, 'stub/SKILL.md'), 'strict');
    // Lenient threshold (40) may admit a stub that strict (80) rejects.
    expect(lenient.passes || !strict.passes).toBe(true);
  });

  it('aggregates a directory into a report with average and failed count', async () => {
    const report = await lintSkills(tmpDir, 'standard');
    expect(report.files.length).toBe(5);
    expect(report.failedCount).toBeGreaterThan(0);
    expect(report.averageScore).toBeGreaterThan(0);
    expect(report.averageScore).toBeLessThan(100);
  });
});
