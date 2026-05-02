/**
 * Unit tests for bundle manifest schema (#1044)
 *
 * @source @src/extensions/manifest.ts
 */

import { describe, it, expect } from 'vitest';
import {
  BundleManifestSchema,
  zodErrorToValidationErrors,
  MANIFEST_MAX_BYTES,
  MAX_BUNDLES_PER_PROJECT,
  MAX_KEYWORDS_PER_MANIFEST,
  MAX_OVERRIDES_PER_MANIFEST,
} from '../../../src/extensions/manifest.js';

function baseValid(): Record<string, unknown> {
  return {
    id: 'foo',
    type: 'addon',
    name: 'Foo Addon',
    version: '1.0.0',
    description: 'A test addon',
    manifestVersion: '1',
    platforms: { claude: 'full' },
    keywords: ['test'],
    deployment: { pathTemplate: '.{platform}/skills/{id}.md' },
    addonConfig: {
      entry: { skills: 'skills/' },
    },
  };
}

describe('BundleManifestSchema', () => {
  describe('happy path', () => {
    it('accepts a minimal valid addon manifest', () => {
      const result = BundleManifestSchema.safeParse(baseValid());
      expect(result.success).toBe(true);
    });

    it('accepts a minimal valid framework manifest', () => {
      const m = baseValid();
      m.type = 'framework';
      delete m.addonConfig;
      m.frameworkConfig = { path: 'src/' };
      expect(BundleManifestSchema.safeParse(m).success).toBe(true);
    });

    it('accepts a minimal valid extension manifest with no extensionConfig', () => {
      const m = baseValid();
      m.type = 'extension';
      delete m.addonConfig;
      expect(BundleManifestSchema.safeParse(m).success).toBe(true);
    });

    it('accepts a valid plugin manifest', () => {
      const m = baseValid();
      m.type = 'plugin';
      delete m.addonConfig;
      m.pluginConfig = { payloadType: 'addon', payloadPath: 'payload/' };
      expect(BundleManifestSchema.safeParse(m).success).toBe(true);
    });
  });

  describe('strict validation', () => {
    it('rejects unknown top-level keys', () => {
      const m = { ...baseValid(), unknownField: 'oops' };
      expect(BundleManifestSchema.safeParse(m).success).toBe(false);
    });

    it('rejects missing required fields', () => {
      const m = baseValid();
      delete m.id;
      expect(BundleManifestSchema.safeParse(m).success).toBe(false);
    });
  });

  describe('id validation', () => {
    it('rejects ids that don\'t match kebab-case', () => {
      // Per #1039 §5: leading digits ARE allowed (e.g., "1password-fork" is fine);
      // uppercase, underscore, space, leading/trailing hyphen, non-alphanumeric are NOT.
      const cases = ['Foo', 'foo_bar', 'foo bar', '-foo', 'foo-', 'foo!'];
      for (const id of cases) {
        const m = { ...baseValid(), id };
        expect(BundleManifestSchema.safeParse(m).success, `id "${id}" should be rejected`).toBe(false);
      }
    });

    it('accepts kebab-case ids', () => {
      const cases = ['foo', 'foo-bar', 'foo-bar-baz', 'a1', 'a1-b2'];
      for (const id of cases) {
        const m = { ...baseValid(), id };
        expect(BundleManifestSchema.safeParse(m).success, `id "${id}" should be accepted`).toBe(true);
      }
    });
  });

  describe('discriminator coherence', () => {
    it('rejects type: addon without addonConfig', () => {
      const m = baseValid();
      delete m.addonConfig;
      expect(BundleManifestSchema.safeParse(m).success).toBe(false);
    });

    it('rejects type: framework with addonConfig instead of frameworkConfig', () => {
      const m = baseValid();
      m.type = 'framework';
      // Has addonConfig but type is framework — discriminator mismatch
      expect(BundleManifestSchema.safeParse(m).success).toBe(false);
    });

    it('rejects multiple *Config blocks', () => {
      const m = baseValid();
      m.frameworkConfig = { path: 'src/' };
      // Has both addonConfig and frameworkConfig
      expect(BundleManifestSchema.safeParse(m).success).toBe(false);
    });
  });

  describe('limits', () => {
    it('rejects more than MAX_KEYWORDS_PER_MANIFEST keywords', () => {
      const m = baseValid();
      m.keywords = Array.from({ length: MAX_KEYWORDS_PER_MANIFEST + 1 }, (_, i) => `kw${i}`);
      expect(BundleManifestSchema.safeParse(m).success).toBe(false);
    });

    it('rejects more than MAX_OVERRIDES_PER_MANIFEST overrides', () => {
      const m = baseValid();
      m.overrides = Array.from({ length: MAX_OVERRIDES_PER_MANIFEST + 1 }, (_, i) => `o${i}`);
      expect(BundleManifestSchema.safeParse(m).success).toBe(false);
    });

    it('exposes the size cap as a constant', () => {
      expect(MANIFEST_MAX_BYTES).toBe(64 * 1024);
      expect(MAX_BUNDLES_PER_PROJECT).toBe(200);
    });
  });

  describe('safety-critical and overrides fields', () => {
    it('accepts safety-critical: true', () => {
      const m = baseValid();
      m['safety-critical'] = true;
      expect(BundleManifestSchema.safeParse(m).success).toBe(true);
    });

    it('accepts overrides: ["other-id"]', () => {
      const m = baseValid();
      m.overrides = ['other-id'];
      expect(BundleManifestSchema.safeParse(m).success).toBe(true);
    });

    it('rejects overrides entries longer than 64 chars', () => {
      const m = baseValid();
      m.overrides = ['x'.repeat(65)];
      expect(BundleManifestSchema.safeParse(m).success).toBe(false);
    });
  });

  describe('manifestVersion gate', () => {
    it('rejects manifestVersion: "2" (forward-compat)', () => {
      const m = baseValid();
      m.manifestVersion = '2';
      expect(BundleManifestSchema.safeParse(m).success).toBe(false);
    });

    it('rejects missing manifestVersion', () => {
      const m = baseValid();
      delete m.manifestVersion;
      expect(BundleManifestSchema.safeParse(m).success).toBe(false);
    });
  });

  describe('zodErrorToValidationErrors', () => {
    it('converts a Zod error to structured ManifestValidationError[]', () => {
      const m = baseValid();
      delete m.id;
      const result = BundleManifestSchema.safeParse(m);
      expect(result.success).toBe(false);
      if (!result.success) {
        const errors = zodErrorToValidationErrors(result.error, '/path/to/manifest.json');
        expect(errors.length).toBeGreaterThan(0);
        expect(errors[0].path).toBe('/path/to/manifest.json');
        expect(errors[0].severity).toBe('error');
      }
    });
  });
});
