import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const ROOT = path.resolve(import.meta.dirname, '../..');

const publishedReadmes = [
  {
    packageName: 'aiwg',
    path: 'README.md',
    title: '# AIWG',
    install: 'npm i -g aiwg',
  },
  {
    packageName: '@aiwg/cli',
    path: 'packages/cli/README.md',
    title: '# @aiwg/cli',
    install: 'npm install --global @aiwg/cli',
  },
  {
    packageName: '@aiwg/cockpit',
    path: 'apps/cockpit/README.md',
    title: '# AIWG Cockpit',
    install: 'npm i -g @aiwg/cockpit',
  },
] as const;

describe('published package README quality contract', () => {
  for (const published of publishedReadmes) {
    it(`${published.packageName} ships a full dedicated README`, () => {
      const body = readFileSync(path.join(ROOT, published.path), 'utf8');
      const wordCount = body.trim().split(/\s+/).length;

      expect(Buffer.byteLength(body), `${published.path} must not regress to a package stub`).toBeGreaterThan(25_000);
      expect(wordCount, `${published.path} must retain full package-level documentation`).toBeGreaterThan(2_500);
      expect(body).toContain(published.title);
      expect(body).toContain(published.install);
      expect(body).toMatch(/^## Quick Start$/m);
      expect(body).toMatch(/^## (How It Works|Architecture)$/m);
      expect(body).toMatch(/^## Installation Troubleshooting$/m);
      expect(body).toMatch(/^## (Documentation|See also)$/m);
    });
  }
});
