const KNOWN_REGISTRIES = [
  /^https?:\/\/registry\.npmjs\.org\//,
  /^https?:\/\/registry\.yarnpkg\.com\//,
  /^https?:\/\/npm\.pkg\.github\.com\//,
];

const HOSTED_GIT_PREFIX_RE = /^(?:github|gitlab|bitbucket|gist):/;
const HTTPS_GIT_RE = /^(?:https?|ssh):\/\/[^\s#]+?\.git(?:#.+)?$/;
const SCP_GIT_RE = /^[A-Za-z0-9_.-]+@[A-Za-z0-9_.-]+:[^\s#]+?\.git(?:#.+)?$/;
const GITHUB_SHORTHAND_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+(?:#.+)?$/;

export function isKnownRegistry(url) {
  return KNOWN_REGISTRIES.some((re) => re.test(url));
}

export function classifyDependencySource(source) {
  if (typeof source !== 'string' || source.length === 0) return null;

  if (/^git\+/.test(source)) return { pattern: 'git+*', label: 'git+ scheme prefix' };
  if (/^git:\/\//.test(source)) return { pattern: 'git://', label: 'raw git:// scheme' };
  if (HOSTED_GIT_PREFIX_RE.test(source)) {
    return { pattern: 'hosted-git', label: 'hosted git shorthand' };
  }
  if (HTTPS_GIT_RE.test(source)) {
    return { pattern: 'https-git', label: 'direct git URL over http(s)/ssh' };
  }
  if (SCP_GIT_RE.test(source)) {
    return { pattern: 'ssh-git', label: 'SSH-style git spec' };
  }
  if (GITHUB_SHORTHAND_RE.test(source)) {
    return { pattern: 'github-user-repo', label: 'GitHub user/repo shorthand' };
  }
  if (/^file:/.test(source)) return { pattern: 'file:', label: 'local filesystem path' };
  if (/^link:/.test(source)) return { pattern: 'link:', label: 'workspace symlink' };

  const tarballMatch = /^https?:\/\/[^\s]+?\.(tgz|tar\.gz)(\?|$|#)/.test(source);
  if (tarballMatch && !isKnownRegistry(source)) {
    return { pattern: 'direct-tarball', label: 'tarball URL from non-registry host' };
  }

  return null;
}
