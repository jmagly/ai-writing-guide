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

    expect(namedProviders).toHaveLength(13);
    expect(listProviderDefinitions()).toHaveLength(14);
    expect(documentedIds).toEqual(namedProviders.map(({ id }) => id));
    expect(inventory).toContain(`**${namedProviders.length} named provider integrations**`);
    expect(inventory).toMatch(/`generic`\s+adapter is a fourteenth registry entry/);
  });

  it('keeps primary public surfaces on the same count and includes both OMP and Pi', () => {
    const publicFiles = [
      'README.md',
      'docs/config.json',
      'docs/overview/what-is-aiwg.md',
      'docs/overview/executive-brief.md',
      'docs/integrations/cross-platform-overview.md',
      'docs/cli/reference.md',
    ];

    for (const relativePath of publicFiles) {
      const content = readFileSync(resolve(projectRoot, relativePath), 'utf8');
      expect(content, relativePath).toMatch(/13 (?:named )?provider integrations/i);
      expect(content, relativePath).toMatch(/Pi Coding Agent/i);
      expect(content, relativePath).toMatch(/Oh My Pi/i);
    }
  });
});
