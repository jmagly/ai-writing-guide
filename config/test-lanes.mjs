// Required offline lane ownership. Live UAT is separately declared by its configs.
export const packagingFiles = [
  'test/integration/artifacts/aiwg-tracking.test.ts',
  'test/smoke/cockpit-base-footprint.test.js',
  'test/integration/network-analysis-addon.test.ts',
  'test/integration/cli-package-webmode.test.ts',
  'test/integration/global-install-native-policy.test.ts',
];
export const discoveryFiles = ['test/integration/artifacts/discover-fortemi-corpus.test.ts'];
export const nodeFiles = [
  'tools/ralph-external/*.test.mjs', 'test/unit/ralph/*.test.mjs',
  'test/contract/agentic-publication-source.test.mjs',
  'test/contract/setup-manifest-site-dispatch.test.mjs',
  'test/contract/site-manifest-release-dispatch.test.mjs',
];
