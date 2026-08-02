import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import Ajv2020 from 'ajv/dist/2020.js';

const root = path.resolve(__dirname, '../../..');
const addonRoot = path.join(root, 'agentic/code/addons/compound-memory');

describe('compound-memory architecture contract', () => {
  it('documents the accepted ownership, trust, budget, and degradation decisions', () => {
    const adr = readFileSync(
      path.join(root, 'docs/architecture/adr-compound-memory-lifecycle.md'),
      'utf8',
    );
    expect(adr).toContain('Status: Accepted');
    expect(adr).toContain('Provider bootstrap files are generated');
    expect(adr).toContain('hard character budget');
    expect(adr).toContain('bounded lexical retrieval');
    expect(adr).toContain('Generated output is always `derived`');
  });

  it('validates the manifest defaults against the declared configuration schema', () => {
    const manifest = JSON.parse(readFileSync(path.join(addonRoot, 'manifest.json'), 'utf8'));
    const schema = JSON.parse(readFileSync(
      path.join(addonRoot, manifest.configuration.schema),
      'utf8',
    ));
    const validate = new Ajv2020({ allErrors: true, strict: true }).compile(schema);
    expect(validate(manifest.configuration.defaults), JSON.stringify(validate.errors)).toBe(true);
    expect(manifest.dependencies.required).toEqual(['line-memory', 'llm-wiki']);
  });
});
