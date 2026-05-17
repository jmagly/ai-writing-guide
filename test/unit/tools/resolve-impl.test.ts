import { afterEach, describe, expect, it } from 'vitest';
import { resolveImpl } from '../../../tools/_resolve-impl.mjs';

const originalForced = process.env.AIWG_RESOLVE_IMPL_FROM;

afterEach(() => {
  if (originalForced === undefined) {
    delete process.env.AIWG_RESOLVE_IMPL_FROM;
  } else {
    process.env.AIWG_RESOLVE_IMPL_FROM = originalForced;
  }
});

describe('resolveImpl', () => {
  it('prefers dist/src when compiled output exists', () => {
    delete process.env.AIWG_RESOLVE_IMPL_FROM;

    const resolved = resolveImpl(import.meta.url, 'plugin/plugin-installer.js');

    expect(resolved).toMatch(/\/dist\/src\/plugin\/plugin-installer\.js$/);
  });

  it('can force source resolution and map .js requests to .ts sources', () => {
    process.env.AIWG_RESOLVE_IMPL_FROM = 'src';

    const resolved = resolveImpl(import.meta.url, 'plugin/plugin-installer.js');

    expect(resolved).toMatch(/\/src\/plugin\/plugin-installer\.ts$/);
  });

  it('can force dist resolution', () => {
    process.env.AIWG_RESOLVE_IMPL_FROM = 'dist';

    const resolved = resolveImpl(import.meta.url, 'writing/validation-engine.js');

    expect(resolved).toMatch(/\/dist\/src\/writing\/validation-engine\.js$/);
  });

  it('throws with attempted paths when no implementation exists', () => {
    delete process.env.AIWG_RESOLVE_IMPL_FROM;

    expect(() => resolveImpl(import.meta.url, 'missing/nope.js')).toThrow(
      /Could not resolve missing\/nope\.js; attempted:/
    );
  });
});
