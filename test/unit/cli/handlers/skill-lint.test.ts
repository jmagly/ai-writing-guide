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

// Fixture: skill body with slash-prefix references to non-kernel skills.
// Regression check for issue #1260 — these should reduce the body score
// and surface guidance to drop the "/" prefix.
const SLASH_OFFENDER = `---
name: slash-offender
namespace: aiwg
description: Use when verifying the post-kernel-pivot lint check catches slash-prefix references to non-kernel skills in the body.
platforms: [all]
user-invocable: true
triggers:
  - "lint slash refs"
---

# Slash Offender

This skill describes how it composes \`/issue-list\`, \`/issue-create\`, and
\`/flow-deploy-to-production\` — all non-kernel skills that should be reached
via \`aiwg discover\` + \`aiwg show\`, not as slash commands. The lint check
should flag these.

Kernel references like \`/aiwg-doctor\`, \`/aiwg-refresh\`, and \`/use\` are
fine and must NOT be flagged. The body is intentionally padded so the only
penalty comes from the slash-prefix offenders, not from being a stub.
Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod
tempor incididunt ut labore et dolore magna aliqua.
`;

// Fixture: same offending pattern, but inside the "Available Slash Commands"
// template block. The lint check should treat that block as
// template output and NOT flag the slash references there. (Used by
// aiwg-regenerate-claude — see #1260 exception.)
const SLASH_TEMPLATE_BLOCK = `---
name: slash-template
namespace: aiwg
description: Use when verifying the lint check ignores generated-output slash refs inside Available Slash Commands template blocks.
platforms: [all]
user-invocable: true
triggers:
  - "template block exception"
---

# Slash Template

This skill emits user-facing CLAUDE.md content. The narrative body does not
reference any slash-prefixed non-kernel skills, so the lint should not flag
anything. Padding to clear the 100-word body floor: lorem ipsum dolor sit
amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut
labore et dolore magna aliqua, ut enim ad minim veniam, quis nostrud.

### Available Slash Commands (Claude Code)

Below is the template block that gets injected into user CLAUDE.md files.
Slash prefixes here are intentional — Claude Code users invoke them as
slash commands.

- \`/intake-wizard\` - Generate project intake forms interactively
- \`/flow-inception-to-elaboration\` - Phase transition
- \`/issue-list\` - List tickets
`;

const COMPANION_CLI = `---
name: companion-cli
namespace: aiwg
description: Use when verifying companion CLI inventory keeps commands attached to workflow judgment.
platforms: [all]
user-invocable: true
triggers:
  - "companion cli"
---

# Companion CLI

This skill uses a supporting command and then interprets the output as part of
the workflow. Run \`aiwg index query "authentication" --json\`, review the
results, summarize the relevant artifacts, and report any gaps to the user.
`;

const CLI_REPLACEMENT_RISK = `---
name: cli-replacement-risk
namespace: aiwg
description: Use when verifying companion CLI inventory catches replacement wording.
platforms: [all]
user-invocable: true
triggers:
  - "replacement risk"
---

# Replacement Risk

Just run \`aiwg issue-list --json\`.
`;

beforeAll(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'aiwg-skill-lint-'));
  await fs.mkdir(path.join(tmpDir, 'perfect'), { recursive: true });
  await fs.mkdir(path.join(tmpDir, 'stub'), { recursive: true });
  await fs.mkdir(path.join(tmpDir, 'needs-triggers'), { recursive: true });
  await fs.mkdir(path.join(tmpDir, 'agent-only'), { recursive: true });
  await fs.mkdir(path.join(tmpDir, 'broken'), { recursive: true });
  await fs.mkdir(path.join(tmpDir, 'slash-offender'), { recursive: true });
  await fs.mkdir(path.join(tmpDir, 'slash-template'), { recursive: true });
  await fs.mkdir(path.join(tmpDir, 'companion-cli'), { recursive: true });
  await fs.mkdir(path.join(tmpDir, 'cli-replacement-risk'), { recursive: true });
  await fs.writeFile(path.join(tmpDir, 'perfect/SKILL.md'), PERFECT_SKILL);
  await fs.writeFile(path.join(tmpDir, 'stub/SKILL.md'), STUB_SKILL);
  await fs.writeFile(path.join(tmpDir, 'needs-triggers/SKILL.md'), NO_TRIGGERS_USER_INVOCABLE);
  await fs.writeFile(path.join(tmpDir, 'agent-only/SKILL.md'), AGENT_ONLY);
  await fs.writeFile(path.join(tmpDir, 'broken/SKILL.md'), BROKEN_YAML);
  await fs.writeFile(path.join(tmpDir, 'slash-offender/SKILL.md'), SLASH_OFFENDER);
  await fs.writeFile(path.join(tmpDir, 'slash-template/SKILL.md'), SLASH_TEMPLATE_BLOCK);
  await fs.writeFile(path.join(tmpDir, 'companion-cli/SKILL.md'), COMPANION_CLI);
  await fs.writeFile(path.join(tmpDir, 'cli-replacement-risk/SKILL.md'), CLI_REPLACEMENT_RISK);
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
    expect(report.files.length).toBe(9);
    expect(report.failedCount).toBeGreaterThan(0);
    expect(report.averageScore).toBeGreaterThan(0);
    expect(report.averageScore).toBeLessThan(100);
  });

  it('inventories companion CLI commands without treating them as skill replacements', async () => {
    const report = await lintSkills(tmpDir, 'standard');
    const ok = report.companionCli.items.find(i => i.file.endsWith('companion-cli/SKILL.md'));
    const risky = report.companionCli.items.find(i => i.file.endsWith('cli-replacement-risk/SKILL.md'));

    expect(ok).toBeDefined();
    expect(ok?.risk).toBe('ok');
    expect(ok?.commands).toContain('aiwg index query "authentication" --json');

    expect(risky).toBeDefined();
    expect(risky?.risk).toBe('review');
    expect(risky?.notes.join(' ')).toMatch(/replacing|surrounding skill\/workflow/i);
    expect(report.companionCli.reviewCount).toBeGreaterThanOrEqual(1);
  });

  // Regression check for issue #1260 — slash-prefix references to
  // non-kernel skills in the body should reduce the body score and
  // surface a clear remediation note.
  it('penalizes body for slash-prefix refs to non-kernel skills (#1260)', async () => {
    const result = await lintSkillFile(path.join(tmpDir, 'slash-offender/SKILL.md'));
    expect(result.dimensions.body.score).toBeLessThan(100);
    const offendersNote = result.dimensions.body.notes.find(n => /slash-prefix refs/i.test(n));
    expect(offendersNote).toBeDefined();
    expect(offendersNote).toMatch(/issue-list/);
    expect(offendersNote).toMatch(/aiwg discover/);
    // Kernel-listed skills must not appear in the offenders list.
    expect(offendersNote).not.toMatch(/aiwg-doctor/);
    expect(offendersNote).not.toMatch(/(^|[^-])use($|[^a-z])/); // bare "use" not flagged
  });

  // Companion: the "Available Slash Commands" template block emits
  // user-facing CLAUDE.md content. Slash refs there are intentional and
  // must be ignored by the regression check.
  it('does not flag slash refs inside Available Slash Commands template block (#1260 exception)', async () => {
    const result = await lintSkillFile(path.join(tmpDir, 'slash-template/SKILL.md'));
    expect(result.dimensions.body.score).toBe(100);
    expect(result.dimensions.body.notes).toEqual([]);
  });
});
