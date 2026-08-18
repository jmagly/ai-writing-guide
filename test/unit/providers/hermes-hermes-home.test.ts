import { describe, expect, it, afterEach } from 'vitest';
import os from 'os';

// @ts-expect-error — .mjs provider module without type declarations
import { getHermesHome } from '../../../tools/agents/providers/hermes.mjs';

// #2119 — HERMES_HOME must be honored as a drop-in replacement for ~/.hermes,
// mirroring the upstream Hermes runtime resolution chain
// (context-local → HERMES_HOME → platform default $HOME/.hermes).
//
// `os.homedir()` is cached from the launch environment in Node's ESM runtime,
// so we anchor the expected default to `os.homedir()` itself rather than
// trying to mutate `process.env.HOME` mid-test.

const HOMEDIR = os.homedir();

describe('hermes provider getHermesHome (#2119)', () => {
  const ORIGINAL_HERMES_HOME = process.env.HERMES_HOME;

  afterEach(() => {
    if (ORIGINAL_HERMES_HOME === undefined) delete process.env.HERMES_HOME;
    else process.env.HERMES_HOME = ORIGINAL_HERMES_HOME;
  });

  it('returns the HERMES_HOME env value when it is set (absolute path)', () => {
    process.env.HERMES_HOME = '/custom/role/home';
    expect(getHermesHome()).toBe('/custom/role/home');
  });

  it('expands a leading tilde against the user home directory', () => {
    process.env.HERMES_HOME = '~/role-home';
    expect(getHermesHome()).toBe(`${HOMEDIR}/role-home`);
  });

  it('falls back to $HOME/.hermes when HERMES_HOME is unset', () => {
    delete process.env.HERMES_HOME;
    expect(getHermesHome()).toBe(`${HOMEDIR}/.hermes`);
  });

  it('falls back to $HOME/.hermes when HERMES_HOME is blank', () => {
    process.env.HERMES_HOME = '   ';
    expect(getHermesHome()).toBe(`${HOMEDIR}/.hermes`);
  });

  it('never returns an empty string and always returns an absolute path', () => {
    process.env.HERMES_HOME = '';
    const value = getHermesHome();
    expect(value).not.toBe('');
    expect(value.startsWith('/')).toBe(true);
  });
});
