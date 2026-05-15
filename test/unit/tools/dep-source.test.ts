import { describe, expect, it } from 'vitest';
import { classifyDependencySource } from '../../../tools/lint/lib/dep-source.js';

describe('classifyDependencySource', () => {
  it('allows registry dependency specs', () => {
    expect(classifyDependencySource('^1.2.3')).toBeNull();
    expect(classifyDependencySource('https://registry.npmjs.org/foo/-/foo-1.2.3.tgz')).toBeNull();
  });

  it('rejects npm git dependency forms from package-spec docs', () => {
    expect(classifyDependencySource('https://github.com/npm/cli.git')?.pattern).toBe('https-git');
    expect(classifyDependencySource('git@github.com:npm/cli.git')?.pattern).toBe('ssh-git');
    expect(classifyDependencySource('git+ssh://git@github.com/npm/cli#v6.0.0')?.pattern).toBe('git+*');
    expect(classifyDependencySource('github:npm/cli#HEAD')?.pattern).toBe('hosted-git');
    expect(classifyDependencySource('npm/cli#c12ea07')?.pattern).toBe('github-user-repo');
  });

  it('rejects other direct source patterns', () => {
    expect(classifyDependencySource('https://example.com/foo-1.0.0.tgz')?.pattern).toBe('direct-tarball');
    expect(classifyDependencySource('file:../local-pkg')?.pattern).toBe('file:');
    expect(classifyDependencySource('link:../workspace-pkg')?.pattern).toBe('link:');
  });
});
