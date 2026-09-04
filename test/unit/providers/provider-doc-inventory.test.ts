import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import { listProviderDefinitions } from '../../../src/providers/provider-definitions.js';

const projectRoot = resolve(import.meta.dirname, '../../..');

describe('public provider inventory', () => {
  it('matches the named built-in provider registry exactly', () => {
    const namedProviders = listProviderDefinitions().filter(({ id }) => id !== 'generic');
    const inventory = readFileSync(resolve(projectRoot, 'docs/providers/provider-inventory.md'), 'utf8');
    const documentedIds = [...inventory.matchAll(/^\| `([a-z]+)` \|/gm)].map((match) => match[1]);

    expect(namedProviders).toHaveLength(12);
    expect(documentedIds).toEqual(namedProviders.map(({ id }) => id));
    expect(inventory).toContain('**12 named provider integrations**');
    expect(inventory).toMatch(/`generic`\s+adapter is a thirteenth registry entry/);
  });

  it('keeps primary public surfaces on the same count and includes Pi', () => {
    const publicFiles = [
      'README.md',
      'docs/config.json',
      'docs/overview/what-is-aiwg.md',
      'docs/overview/executive-brief.md',
      'docs/integrations/cross-platform-overview.md',
    ];

    for (const relativePath of publicFiles) {
      const content = readFileSync(resolve(projectRoot, relativePath), 'utf8');
      expect(content, relativePath).toMatch(/12 (?:named )?provider integrations/i);
      expect(content, relativePath).toMatch(/Pi Coding Agent/i);
    }
  });
});
