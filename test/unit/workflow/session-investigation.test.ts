import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import yaml from 'js-yaml';
import Ajv from 'ajv';
import addFormats from 'ajv-formats';

const root = path.resolve(import.meta.dirname, '../../..');
const addon = path.join(root, 'agentic/code/addons/aiwg-utils');
const readYaml = (file: string): any => yaml.load(fs.readFileSync(file, 'utf8'));

// Validate real composition bindings, not just the wording of the skill.
describe('session investigation Flow contracts', () => {
  it('validates the playbook and resolves every dependency, capability, agent and typed handoff', () => {
    const ajv = new Ajv({ allErrors: true, strict: false });
    addFormats(ajv);
    const compile = (kind: string) => ajv.compile(JSON.parse(fs.readFileSync(
      path.join(addon, `workflow/schemas/workflow-${kind}.schema.json`), 'utf8',
    )));
    const playbook = readYaml(path.join(addon, 'flows/session-investigation.yaml'));
    const validatePlaybook = compile('playbook');
    expect(validatePlaybook(playbook), JSON.stringify(validatePlaybook.errors)).toBe(true);
    const validateCapability = compile('capability');
    const outputs = new Map<string, Map<string, string>>();
    for (const step of playbook.spec.steps) {
      for (const dependency of step.depends_on ?? []) expect(outputs.has(dependency)).toBe(true);
      const capability = readYaml(path.join(addon, `flows/capabilities/${step.capability}.yaml`));
      expect(validateCapability(capability), JSON.stringify(validateCapability.errors)).toBe(true);
      expect(fs.existsSync(path.join(addon, `agents/${capability.spec.agent}.md`))).toBe(true);
      for (const input of capability.spec.inputs) {
        const binding = step.inputs.find((item: any) => item.name === input.name);
        expect(binding, `required ${step.id}.${input.name}`).toBeDefined();
        if (binding.from) {
          const [source, name] = binding.from.split('.');
          expect(outputs.get(source)?.get(name)).toBe(input.type);
        }
      }
      const types = new Map<string, string>(capability.spec.outputs.map((item: any) => [item.name, item.type]));
      for (const output of step.outputs) expect(types.has(output.name)).toBe(true);
      outputs.set(step.id, types);
    }
    expect(outputs.get('synthesize')?.get('investigation_report')).toBe('object');
  });
});
