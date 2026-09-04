import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import YAML from 'yaml';
import { transformAgent, transformCommand, transformRule, deployAgents, deploySkills, createAgentsMd, uninstall, deploy } from '../../../tools/agents/providers/omp.mjs';
const metadata = text => YAML.parse(text.split('---')[1]);
describe('OMP native deployment', () => {
  let root; beforeEach(() => { root = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-omp-')); });
  afterEach(() => fs.rmSync(root, { recursive: true, force: true }));
  it('prevents implicit wildcard task delegation and reports unknown mappings', () => {
    const diagnostics = [];
    const text = transformAgent('research.md', '---\nname: researcher\ndescription: research\ntools: [Read, Task, Magic]\nmodel: sonnet\n---\nResearch carefully.', { diagnostics, quiet: true });
    expect(metadata(text)).toMatchObject({ tools: ['read'], spawns: [] });
    expect(metadata(text).model).toBeUndefined(); expect(diagnostics).toHaveLength(2);
    expect(text).toContain('Research carefully.');
    const spawn = metadata(transformAgent('a.md', '---\nname: lead\ndescription: lead\ntools: [Task]\nspawns: [researcher]\nmodel: openrouter/openai/gpt-4.1-mini\n---\nLead.'));
    expect(spawn.tools).toEqual(['task']); expect(spawn.spawns).toEqual(['researcher']);
  });
  it('normalizes names and rejects native reserved names even with whitespace', () => {
    expect(metadata(transformAgent('agent.md', '---\nname: " reviewer "\ndescription: reviewer\n---\nReview.')).name).toBe('reviewer');
    for (const name of [' main ', ' SUB ', '']) expect(() => transformAgent('agent.md', `---\nname: "${name}"\ndescription: reserved\n---\nWork.`)).toThrow(/OMP/);
    expect(() => transformAgent('agent.md', '---\nname: 42\ndescription: number\n---\nWork.')).toThrow('nonempty string');
  });
  it('translates prompts and conditional rules without importing foreign policy', () => {
    const prompt = transformCommand('a.md', '---\ndescription: "A: prompt"\nargument-hint: target\nallowed-tools: Bash\n---\nRead ${ARGUMENTS}, $1, and literal $HOME.', { quiet: true });
    expect(prompt).toContain('$ARGUMENTS, $1, and literal $HOME'); expect(metadata(prompt)['allowed-tools']).toBeUndefined();
    expect(metadata(transformRule('r.md', '---\npaths: ["src/**"]\nalwaysApply: false\nenforcement: critical\n---\nCheck.'))).toMatchObject({ globs: ['src/**'], alwaysApply: false });
  });
  it('is dry-run safe, idempotent and preserves operator modifications even with force', () => {
    const source = path.join(root, 'review.md'); fs.writeFileSync(source, '---\nname: review\ndescription: review\ntools: [Read]\n---\nReview.');
    const target = path.join(root, 'project');
    deployAgents([source], target, { dryRun: true }); expect(fs.existsSync(target)).toBe(false);
    expect(deployAgents([source], target)).toBe(1); expect(deployAgents([source], target)).toBe(0);
    const deployed = path.join(target, '.omp/agents/review.md'); fs.writeFileSync(deployed, 'operator');
    deployAgents([source], target, { force: true, quiet: true }); expect(fs.readFileSync(deployed, 'utf8')).toBe('operator');
    expect(JSON.parse(fs.readFileSync(path.join(target, '.omp/agents/.aiwg-manifest.json'))).managed['review.md'].transformation).toBe('omp-agents');
  });
  it('keeps standard skills lazy and copies full mode to one native level', () => {
    const skill = path.join(root, 'source/deep/skill'); fs.mkdirSync(skill, { recursive: true }); fs.writeFileSync(path.join(skill, 'SKILL.md'), '---\nname: skill\ndescription: standard\n---\nWork.');
    const target = path.join(root, 'project'); deploySkills([skill], target); expect(fs.existsSync(target)).toBe(false);
    deploySkills([skill], target, { copyStandardSkills: true }); expect(fs.existsSync(path.join(target, '.agents/skills/skill/SKILL.md'))).toBe(true);
    expect(fs.existsSync(path.join(target, '.omp/skills/skill'))).toBe(false);
    const collision = path.join(root, 'other/skill'); fs.mkdirSync(collision, { recursive: true }); fs.copyFileSync(path.join(skill, 'SKILL.md'), path.join(collision, 'SKILL.md'));
    expect(() => deploySkills([skill, collision], target, { dryRun: true })).toThrow('collision');
  });
  it('reconciles full-copy standard skills while preserving modified, unowned and Pi-owned files', () => {
    const skill = path.join(root, 'source/standard'); fs.mkdirSync(path.join(skill, 'references'), { recursive: true });
    fs.writeFileSync(path.join(skill, 'SKILL.md'), '---\nname: standard\ndescription: standard\n---\nWork.');
    fs.writeFileSync(path.join(skill, 'references/modified.md'), 'original'); fs.writeFileSync(path.join(skill, 'references/pi.md'), 'Pi original');
    const target = path.join(root, 'project'); const destination = path.join(target, '.agents/skills/standard');
    deploySkills([skill], target, { copyStandardSkills: true });
    fs.writeFileSync(path.join(destination, 'operator.md'), 'operator'); fs.writeFileSync(path.join(destination, 'references/modified.md'), 'operator edit');
    const receiptPath = path.join(destination, 'references/.aiwg-manifest.json');
    const receipt = JSON.parse(fs.readFileSync(receiptPath)); receipt.managed['pi.md'].provider = 'pi'; fs.writeFileSync(receiptPath, JSON.stringify(receipt));
    deploySkills([skill], target, { dryRun: true, quiet: true }); expect(fs.existsSync(path.join(destination, 'SKILL.md'))).toBe(true);
    deploySkills([skill], target, { quiet: true }); expect(fs.existsSync(path.join(destination, 'SKILL.md'))).toBe(false);
    expect(fs.readFileSync(path.join(destination, 'operator.md'), 'utf8')).toBe('operator');
    expect(fs.readFileSync(path.join(destination, 'references/modified.md'), 'utf8')).toBe('operator edit');
    expect(fs.readFileSync(path.join(destination, 'references/pi.md'), 'utf8')).toBe('Pi original');
    expect(() => deploySkills([skill], target, { quiet: true })).not.toThrow();
    fs.writeFileSync(path.join(skill, 'references/pi.md'), 'new OMP source'); deploySkills([skill], target, { copyStandardSkills: true, quiet: true });
    expect(fs.readFileSync(path.join(destination, 'references/pi.md'), 'utf8')).toBe('Pi original');
  });
  it('preserves symlink destinations and refuses malformed receipts before writes', () => {
    const source = path.join(root, 'review.md'); fs.writeFileSync(source, '---\nname: review\ndescription: review\n---\nWork.');
    const target = path.join(root, 'project'); const native = path.join(target, '.omp'); fs.mkdirSync(native, { recursive: true });
    const outside = path.join(root, 'outside'); fs.mkdirSync(outside); fs.symlinkSync(outside, path.join(native, 'agents'));
    expect(() => deployAgents([source], target)).toThrow('symlink'); expect(fs.readdirSync(outside)).toEqual([]);
    fs.unlinkSync(path.join(native, 'agents')); fs.mkdirSync(path.join(native, 'agents'));
    const receipt = path.join(native, 'agents/.aiwg-manifest.json'); fs.writeFileSync(receipt, '{bad');
    expect(() => deployAgents([source], target)).toThrow('malformed receipt'); expect(fs.existsSync(path.join(native, 'agents/review.md'))).toBe(false);
    fs.writeFileSync(receipt, '{"managed":null}'); expect(() => deployAgents([source], target)).toThrow('malformed receipt');
    fs.unlinkSync(receipt); fs.symlinkSync(path.join(root, 'missing-receipt'), receipt);
    expect(() => deployAgents([source], target)).toThrow('symlink'); expect(fs.existsSync(path.join(root, 'missing-receipt'))).toBe(false);
  });
  it('preserves malformed or operator-modified bootstrap blocks on removal', () => {
    const native = path.join(root, '.omp'); fs.mkdirSync(native);
    const context = path.join(native, 'AGENTS.md'); const malformed = '<!-- AIWG:omp-bootstrap:start -->\noperator'; fs.writeFileSync(context, malformed);
    expect(() => createAgentsMd(root, root)).toThrow('malformed bootstrap'); expect(() => uninstall(root)).toThrow('malformed bootstrap'); expect(fs.readFileSync(context, 'utf8')).toBe(malformed);
    fs.unlinkSync(context); createAgentsMd(root, root); const edited = fs.readFileSync(context, 'utf8').replace('@../AIWG.md', 'operator override'); fs.writeFileSync(context, edited);
    uninstall(root); expect(fs.readFileSync(context, 'utf8')).toBe(edited);
  });
  it('deploys direct bundle kernel skills and respects the native task-agent override exception', async () => {
    const bundle = path.join(root, 'bundle');
    for (const name of ['first', 'second']) { const dir = path.join(bundle, 'skills', name); fs.mkdirSync(dir, { recursive: true }); fs.writeFileSync(path.join(dir, 'SKILL.md'), `---\nname: ${name}\ndescription: fixture\nkernel: true\n---\nWork.`); }
    const target = path.join(root, 'project'); await deploy({ srcRoot: bundle, target, mode: 'general', skillsOnly: true, quiet: true });
    for (const name of ['first', 'second']) expect(fs.existsSync(path.join(target, '.agents/skills', name, 'SKILL.md'))).toBe(true);
    const source = path.join(root, 'leaf.md'); fs.writeFileSync(source, '---\nname: leaf\ndescription: leaf\ntools: [Read]\n---\nRead.');
    deployAgents([source], target, { scope: 'user', home: root, env: { PI_CODING_AGENT_DIR: path.join(root, 'override') }, quiet: true });
    expect(fs.existsSync(path.join(root, '.omp/agent/agents/leaf.md'))).toBe(true);
    expect(fs.existsSync(path.join(root, 'override/agents/leaf.md'))).toBe(false);
  });
  it('preserves shell-looking prompt text and reports unsupported metadata without evaluation', () => {
    const diagnostics = [];
    const prompt = transformCommand('literal.md', '---\ndescription: literal\nunknown-metadata: value\n---\n`uname` $(whoami) $HOME $$ ${1} $ARGUMENTS', { quiet: true, diagnostics });
    expect(prompt).toContain('`uname` $(whoami) $HOME $$ $1 $ARGUMENTS'); expect(diagnostics).toEqual(['prompt literal.md: metadata unknown-metadata omitted']);
    expect(prompt).not.toContain('unknown-metadata:');
  });
  it('uses the resolved profile and uninstalls only unchanged owned files', () => {
    const source = path.join(root, 'review.md'); fs.writeFileSync(source, '---\nname: review\ndescription: review\n---\nReview.');
    const opts = { scope: 'user', env: { OMP_PROFILE: 'testing' }, home: root, quiet: true };
    deployAgents([source], root, opts);
    const agents = path.join(root, '.omp/profiles/testing/agent/agents');
    expect(fs.existsSync(path.join(agents, 'review.md'))).toBe(true);
    fs.writeFileSync(path.join(agents, 'operator.md'), 'mine');
    expect(uninstall(root, { ...opts, dryRun: true })).toBe(1);
    expect(fs.existsSync(path.join(agents, 'review.md'))).toBe(true);
    expect(uninstall(root, opts)).toBe(1);
    expect(fs.readFileSync(path.join(agents, 'operator.md'), 'utf8')).toBe('mine');
  });
  it('preserves context operators and leaves shared bootstraps untouched', () => {
    fs.mkdirSync(path.join(root, '.omp')); fs.writeFileSync(path.join(root, '.omp/AGENTS.md'), 'Operator notes.\n'); fs.writeFileSync(path.join(root, 'AGENTS.md'), 'Shared');
    createAgentsMd(root, root); const once = fs.readFileSync(path.join(root, '.omp/AGENTS.md'), 'utf8'); createAgentsMd(root, root);
    expect(fs.readFileSync(path.join(root, '.omp/AGENTS.md'), 'utf8')).toBe(once); expect(once).toContain('@../WORKSPACE.md'); expect(once).toContain('Operator notes.'); expect(fs.readFileSync(path.join(root, 'AGENTS.md'), 'utf8')).toBe('Shared');
  });
});

it('public remove omp route preserves operator files and supports dry-run', async () => {
  const { removeHandler } = await import('../../../src/cli/handlers/subcommands.ts');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-omp-remove-'));
  try {
    const source = path.join(root, 'agent.md'); fs.writeFileSync(source, '---\nname: agent\ndescription: agent\n---\nWork.');
    deployAgents([source], root);
    const deployed = path.join(root, '.omp/agents/agent.md');
    const operator = path.join(root, '.omp/agents/operator.md'); fs.writeFileSync(operator, 'operator');
    let result = await removeHandler.execute({ args: ['omp', '--provider', 'omp', '--dry-run'], cwd: root });
    expect(result.exitCode).toBe(0); expect(fs.existsSync(deployed)).toBe(true);
    result = await removeHandler.execute({ args: ['omp', '--provider', 'omp'], cwd: root });
    expect(result.exitCode).toBe(0); expect(fs.existsSync(deployed)).toBe(false); expect(fs.readFileSync(operator, 'utf8')).toBe('operator');
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});
