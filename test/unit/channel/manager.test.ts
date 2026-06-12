import { describe, expect, it } from 'vitest';
import { getVersionInfo } from '../../../src/channel/manager.mjs';

// Config-driven version stamps: user-facing CLI output (the `aiwg use` version
// stamp, `aiwg diagnose` bug-report link, the entrypoint packaging-bug message)
// must source their URLs from package.json — the single public source of truth —
// not hardcode the internal build origin (git.integrolabs.net). These assertions
// guard against a regression to a hardcoded literal or an origin leak.
describe('getVersionInfo public URLs (config-driven from package.json)', () => {
  it('surfaces the public repo, homepage, and issues URLs', async () => {
    const info = await getVersionInfo();
    expect(info.repoUrl).toBe('github.com/jmagly/aiwg');
    expect(info.homepage).toBe('https://aiwg.io');
    expect(info.issuesUrl).toBe('https://github.com/jmagly/aiwg/issues');
  });

  it('never leaks the internal build origin into user-facing fields', async () => {
    const info = await getVersionInfo();
    expect(info.repoUrl).not.toContain('integrolabs');
    expect(info.homepage).not.toContain('integrolabs');
    expect(info.issuesUrl).not.toContain('integrolabs');
  });
});
