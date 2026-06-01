import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const repo = resolve(__dirname, '../../..');
function read(rel: string): string {
  return readFileSync(resolve(repo, rel), 'utf8');
}

describe('routing documentation regressions', () => {
  it('agent-loop documents native /goal routing for Codex and Claude Code', () => {
    const skill = read('agentic/code/addons/agent-loop/skills/agent-loop/SKILL.md');
    expect(skill).toContain('Provider with native `/goal` (Codex, Claude Code)');
    expect(skill).toContain('/goal "<task>; completion: <measurable criterion>"');
    expect(skill).toContain('/goal "<task>; completion: <criterion>"');
    expect(skill).toContain('stays AIWG-native');
    const addressIssues = read('agentic/code/frameworks/sdlc-complete/skills/address-issues/SKILL.md');
    expect(addressIssues).toContain('Codex and Claude Code');
    expect(existsSync(resolve(repo, '.aiwg/research/codex-goal-integration.md'))).toBe(true);
    expect(existsSync(resolve(repo, '.aiwg/architecture/adr-codex-goal-routing.md'))).toBe(true);
  });

  it('agent-loop documents external-route /workflow handling (verified against codex 0.135.0)', () => {
    const skill = read('agentic/code/addons/agent-loop/skills/agent-loop/SKILL.md');
    expect(skill).toContain('native dynamic orchestration (Claude Code Workflow tool)');
    expect(skill).toContain('Codex has no core `/workflow`');
    expect(skill).toContain('detached/resume-after-session work stays AIWG-native');
    expect(existsSync(resolve(repo, '.aiwg/architecture/adr-workflow-routing.md'))).toBe(true);
    expect(existsSync(resolve(repo, '.aiwg/research/provider-workflow-integration.md'))).toBe(true);
  });

  it('steward persona surfaces orchestration/loop routing incl. cross-stack Missions (#1538/#1546)', () => {
    const addon = read('agentic/code/addons/aiwg-utils/agents/aiwg-steward.md');
    const persona = read('agentic/code/agents/personas/aiwg-steward.md');
    for (const doc of [addon, persona]) {
      expect(doc).toContain('Orchestration & loop routing');
      // External/background stays AIWG-native (native primitives are session-scoped)
      expect(doc).toContain('AIWG-native external route');
      // AIWG-owned Codex Mission entry, not the plugin /workflow
      expect(doc).toContain('/aiwg-mission');
      expect(doc).toMatch(/plugin-provided|plugin/i);
      // Cross-stack Mission conductor (#1546) routed via serve runtime:<name>
      expect(doc).toContain('Cross-stack Mission');
      expect(doc).toContain('runtime:<name>');
      // Retained-ownership invariant
      expect(doc.toLowerCase()).toContain('activity-log');
      expect(doc.toLowerCase()).toContain('best-output');
    }
  });

  it('steward routes project-local authoring through AIWG creation commands and docs', () => {
    const steward = read('agentic/code/addons/aiwg-utils/skills/steward/SKILL.md');
    const persona = read('agentic/code/agents/personas/aiwg-steward.md');
    for (const doc of [steward, persona]) {
      expect(doc).toContain('Project-Local Authoring Routing');
      expect(doc).toContain('aiwg new-bundle <name> --starter skill');
      expect(doc).toContain('docs/customization/project-local-quickstart.md');
    }
    const quickref = read('agentic/code/addons/aiwg-utils/skills/aiwg-utils-quickref/SKILL.md');
    expect(quickref).toContain('aiwg discover "project-local customization"');
  });

  it('Claude Code docs cover the managed 1M-context default and opt-in path', () => {
    const quickstart = read('docs/integrations/claude-code-quickstart.md');
    expect(quickstart).toContain('CLAUDE_CODE_DISABLE_1M_CONTEXT=1');
    expect(quickstart).toContain('export CLAUDE_CODE_DISABLE_1M_CONTEXT=0');
    const changelog = read('CHANGELOG.md');
    expect(changelog).toContain('Claude Code external loop launches now default-disable 1M-context model variants');
  });

  it('aiwg-pr is explicitly AIWG-specific and has a discoverable delivery alias', () => {
    const skill = read('agentic/code/addons/aiwg-utils/skills/aiwg-pr/SKILL.md');
    expect(skill).toContain('Do not use `aiwg-pr` for ordinary repository pull request work');
    expect(skill).toContain('`aiwg-delivery-pr` is the explicit alias');
    const alias = read('agentic/code/addons/aiwg-utils/skills/aiwg-delivery-pr/SKILL.md');
    expect(alias).toContain('not a generic repository PR guide');
    const quickref = read('agentic/code/addons/aiwg-utils/skills/aiwg-utils-quickref/SKILL.md');
    expect(quickref).toContain('"open a PR for this repo"');
    expect(quickref).toContain('`aiwg-pr`');
  });

  // #1480: skill-first CLI augmentation audit. The cli-secondary rule must state
  // the augment/orchestration invariants and distinguish discovery from paired
  // commands; cli-reference.md must carry that framing; and the named paired
  // surfaces must be covered. This is the documented audit procedure (criterion 6).
  it('cli-secondary rule states the augment-not-replace + skill-orchestration invariants (#1480)', () => {
    const rule = read('agentic/code/addons/aiwg-utils/rules/cli-secondary.md');
    expect(rule).toMatch(/augment[\s\S]*do not replace/i);
    // skill owns orchestration/formatting/presentation/synthesis/gates/recovery
    expect(rule.toLowerCase()).toContain('orchestrat');
    expect(rule.toLowerCase()).toContain('synthesis');
    expect(rule.toLowerCase()).toContain('recovery');
    // discovery surface stays direct-callable, distinct from paired action commands
    expect(rule.toLowerCase()).toContain('discovery surface');
    expect(rule.toLowerCase()).toContain('paired');
    // the named paired action surfaces are covered by the rule's pairing table
    for (const cmd of ['use', 'refresh', 'regenerate', 'doctor', 'doc-sync', 'ralph', 'sdlc-accelerate', 'mc']) {
      expect(rule).toContain(`aiwg ${cmd}`);
    }
  });

  it('cli-reference.md carries the skill-first reading guide (#1480)', () => {
    const ref = read('docs/cli-reference.md');
    expect(ref).toContain('skill-first');
    expect(ref).toContain('augment');
    // distinguishes the two categories and routes paired commands through the skill
    expect(ref.toLowerCase()).toContain('direct-callable');
    expect(ref).toContain('paired skill');
    expect(ref).toContain('cli-secondary.md');
  });
});
