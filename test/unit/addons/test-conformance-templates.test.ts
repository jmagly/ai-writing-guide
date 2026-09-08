import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
// @ts-expect-error Native shipped addon MJS.
import { listTemplates, developTemplate, deployTemplate } from '../../../agentic/code/addons/testing-quality/lib/templates.mjs';
// @ts-expect-error Native shipped addon MJS.
import { applyPlan, rollbackPlan } from '../../../agentic/code/addons/testing-quality/lib/normalization.mjs';
// @ts-expect-error Native shipped addon MJS.
import { validateContract } from '../../../agentic/code/addons/testing-quality/lib/contracts.mjs';
let root: string;
beforeEach(async () => { root = await fs.mkdtemp(path.join(os.tmpdir(), 'aiwg-template-')); });
afterEach(async () => { await fs.rm(root, { recursive: true, force: true }); });
const definition = () => ({
  id: 'custom-runner-config', platform: 'custom-platform', description: 'Generate concrete test reporting config',
  variables: [
    { name: 'directory', type: 'path', required: true },
    { name: 'system', type: 'string', required: true },
    { name: 'timeout', type: 'number', required: false, default: 1234 },
    { name: 'required', type: 'boolean', required: false, default: true },
  ],
  files: [{ path: '{{directory}}/testing.config.json', content: '{"system":{{system|json}},"timeout":{{timeout}},"required":{{required}}}\n' }],
});
async function source(value = definition()) { await fs.writeFile(path.join(root, 'source.json'), JSON.stringify(value)); return 'source.json'; }

describe('testing platform template development and deployment', () => {
  it('lists packaged entries with stable IDs and creates only an example deployment plan', async () => {
    const templates = await listTemplates({ platform: 'javascript-vitest' });
    const entry = templates.find((item: any) => item.id === 'javascript-vitest:vitest.config.example');
    expect(entry).toMatchObject({ platform: 'javascript-vitest', destination: '.aiwg/testing/conformance/examples/javascript-vitest/vitest.config.example.mjs' });
    const plan = await deployTemplate(root, { platform: 'javascript-vitest', template: entry.id });
    expect(plan.spec.changes[0].path).toBe(entry.destination);
    expect(plan.spec.changes[0].after.content).toBe(await fs.readFile(path.join(process.cwd(), 'agentic/code/addons/testing-quality', entry.source), 'utf8'));
    await expect(fs.stat(path.join(root, entry.destination))).rejects.toMatchObject({ code: 'ENOENT' });
    await expect(listTemplates({ platform: 'nonexistent' })).rejects.toThrow('Unknown template platform');
  });

  it('authors a self-contained typed template and deploys real target configuration through guarded apply', async () => {
    const input = await source();
    const custom = await developTemplate(root, { source: input, output: 'custom.json' });
    expect(custom.kind).toBe('TestNormalizationTemplate');
    expect(await validateContract(custom, 'custom-template.v1')).toEqual(custom);
    await fs.rm(path.join(root, input)); // Developed artifact contains all content.
    const plan = await deployTemplate(root, { source: 'custom.json', platform: 'custom-platform', variables: { directory: 'config', system: 'line\n"quoted"' } });
    expect(JSON.parse(plan.spec.changes[0].after.content)).toEqual({ system: 'line\n"quoted"', timeout: 1234, required: true });
    await expect(fs.stat(path.join(root, 'config/testing.config.json'))).rejects.toMatchObject({ code: 'ENOENT' });
    const receipt = await applyPlan(root, plan);
    expect(JSON.parse(await fs.readFile(path.join(root, 'config/testing.config.json'), 'utf8')).required).toBe(true);
    await rollbackPlan(root, receipt);
    await expect(fs.stat(path.join(root, 'config/testing.config.json'))).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('captures existing content for review and refuses intervening drift at apply', async () => {
    await source();
    await fs.mkdir(path.join(root, 'config'));
    await fs.writeFile(path.join(root, 'config/testing.config.json'), 'existing config');
    const plan = await deployTemplate(root, { source: 'source.json', variables: { directory: 'config', system: 'my-system' } });
    expect(plan.spec.changes[0].before.content).toBe('existing config');
    expect(await fs.readFile(path.join(root, 'config/testing.config.json'), 'utf8')).toBe('existing config');
    await fs.writeFile(path.join(root, 'config/testing.config.json'), 'later edit');
    await expect(applyPlan(root, plan)).rejects.toThrow('Precondition conflict');
  });

  it('rejects traversal, path substitutions from strings, symlink sources/destinations and duplicate rendered destinations', async () => {
    await source();
    await expect(deployTemplate(root, { source: 'source.json', variables: { directory: '../outside', system: 'x' } })).rejects.toThrow('safe target-relative');
    const wrongPathType = definition();wrongPathType.variables[0].type = 'string';
    await source(wrongPathType);
    await expect(developTemplate(root, { source: 'source.json' })).rejects.toThrow('path variable');
    await source();
    await fs.symlink(path.join(root, 'source.json'), path.join(root, 'source-link'));
    await expect(developTemplate(root, { source: 'source-link' })).rejects.toThrow('symlink');
    await fs.symlink(root, path.join(root, 'config'));
    await expect(deployTemplate(root, { source: 'source.json', variables: { directory: 'config', system: 'x' } })).rejects.toThrow('symlink');
    await fs.unlink(path.join(root, 'config'));
    const duplicate = definition();duplicate.files.push({ path: 'config/testing.config.json', content: 'other' });
    await source(duplicate);
    await expect(deployTemplate(root, { source: 'source.json', variables: { directory: 'config', system: 'x' } })).rejects.toThrow('Duplicate path');
  });

  it('rejects unknown/missing/wrong-type values, undeclared variables and template expressions', async () => {
    await source();
    await expect(deployTemplate(root, { source: 'source.json', variables: { directory: 'config', system: 'x', other: true } })).rejects.toThrow('Unknown template variable');
    await expect(deployTemplate(root, { source: 'source.json', variables: { directory: 'config' } })).rejects.toThrow('Missing required');
    await expect(deployTemplate(root, { source: 'source.json', variables: { directory: 'config', system: 'x', timeout: 'slow' } })).rejects.toThrow('requires number');
    const unknown = definition();unknown.files[0].content = '{{notDeclared}}';await source(unknown);
    await expect(developTemplate(root, { source: 'source.json' })).rejects.toThrow('Undeclared');
    unknown.files[0].content = '{{process.exit()}}';await source(unknown);
    await expect(developTemplate(root, { source: 'source.json' })).rejects.toThrow('Unsupported template expression');
  });

  it('validates schema/defaults, refuses unsafe paths, existing outputs and oversized sources', async () => {
    await source();
    await developTemplate(root, { source: 'source.json', output: 'custom.json' });
    await expect(developTemplate(root, { source: 'source.json', output: 'custom.json' })).rejects.toMatchObject({ code: 'EEXIST' });
    const invalid = definition();invalid.files[0].path = '../escape';await source(invalid);
    await expect(developTemplate(root, { source: 'source.json' })).rejects.toThrow('Unsafe relative');
    const badDefault: any = definition();badDefault.variables[2].default = 'not a number';await source(badDefault);
    await expect(developTemplate(root, { source: 'source.json' })).rejects.toThrow('requires number');
    const badSchema: any = definition();badSchema.arbitraryCommand = 'run me';await source(badSchema);
    await expect(developTemplate(root, { source: 'source.json' })).rejects.toThrow('Invalid custom-template');
    await fs.writeFile(path.join(root, 'huge.json'), ' '.repeat(1024 * 1024 + 1));
    await expect(developTemplate(root, { source: 'huge.json' })).rejects.toThrow('maxFileBytes');
  });
  it('permits distinct typed destination variables and rejects collisions after their actual values render', async () => {
    const custom = definition();
    custom.variables.push({ name: 'otherDirectory', type: 'path', required: true } as any);
    custom.files.push({ path: '{{otherDirectory}}/testing.config.json', content: 'second config' });
    await source(custom);
    const developed = await developTemplate(root, { source: 'source.json' });
    expect(developed.spec.files).toHaveLength(2);
    const plan = await deployTemplate(root, { source: 'source.json', variables: { directory: 'first', otherDirectory: 'second', system: 'x' } });
    expect(plan.spec.changes.map((change: any) => change.path)).toEqual(['first/testing.config.json', 'second/testing.config.json']);
    await expect(deployTemplate(root, { source: 'source.json', variables: { directory: 'same', otherDirectory: 'same', system: 'x' } })).rejects.toThrow('Duplicate path');
  });

});
