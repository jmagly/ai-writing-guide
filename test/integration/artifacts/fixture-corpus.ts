import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

import { buildIndex } from '../../../src/artifacts/index-builder.js';
import type {
  ArtifactIndex,
  DependencyGraph,
  IndexStats,
  TagIndex,
} from '../../../src/artifacts/types.js';

const ARTIFACT_ROOT_ENV = 'AIWG_ARTIFACTS_PATH';

export interface BuiltFixtureIndex {
  projectDir: string;
  artifactDir: string;
  indexDir: string;
  metadata: ArtifactIndex;
  tags: TagIndex;
  dependencies: DependencyGraph;
  stats: IndexStats;
  cleanup(): void;
}

const FIXTURE_FILES: Record<string, string> = {
  'requirements/UC-login.md': `---
title: Log In
tags: [fixture, requirements]
---
# Log In

The user signs in. See @.aiwg/architecture/ADR-auth.md.
`,
  'requirements/NFR-security.md': `# Authentication Security

The login flow must reject invalid credentials.
`,
  'architecture/ADR-auth.md': `---
title: Authentication Boundary
tags: [fixture, architecture]
---
# Authentication Boundary

The application owns its authentication boundary.
`,
  'planning/iteration-plan.md': `# Iteration Plan

Implement @.aiwg/requirements/UC-login.md during the fixture iteration.
`,
  'testing/TP-login.md': `# Login Test Plan

Verify @.aiwg/requirements/UC-login.md.
`,
  'security/TM-auth-threat-model.md': `# Authentication Threat Model

Review the authentication boundary.
`,
  'deployment/release-plan.md': `# Release Plan

Deploy only after the test plan passes.
`,
};

function writeFixtureCorpus(artifactDir: string): void {
  for (const [relativePath, content] of Object.entries(FIXTURE_FILES)) {
    const target = path.join(artifactDir, relativePath);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, content);
  }
}

function readJson<T>(file: string): T {
  return JSON.parse(fs.readFileSync(file, 'utf8')) as T;
}

/**
 * Build an index from a corpus owned entirely by the test.
 *
 * `relocated` exercises the public AIWG_ARTIFACTS_PATH contract. The default
 * case explicitly removes that variable while building so a maintainer's
 * shell configuration cannot redirect the scan to an ambient corpus.
 */
export async function buildFixtureIndex(relocated = false): Promise<BuiltFixtureIndex> {
  const projectDir = fs.mkdtempSync(path.join(os.tmpdir(), 'aiwg-artifact-fixture-'));
  const artifactDir = relocated
    ? path.join(projectDir, 'relocated-corpus')
    : path.join(projectDir, '.aiwg');
  const previousArtifactRoot = process.env[ARTIFACT_ROOT_ENV];

  writeFixtureCorpus(artifactDir);

  try {
    if (relocated) {
      process.env[ARTIFACT_ROOT_ENV] = artifactDir;
    } else {
      delete process.env[ARTIFACT_ROOT_ENV];
    }
    await buildIndex(projectDir, { force: true });
  } finally {
    if (previousArtifactRoot === undefined) {
      delete process.env[ARTIFACT_ROOT_ENV];
    } else {
      process.env[ARTIFACT_ROOT_ENV] = previousArtifactRoot;
    }
  }

  const indexDir = path.join(artifactDir, '.index');
  return {
    projectDir,
    artifactDir,
    indexDir,
    metadata: readJson<ArtifactIndex>(path.join(indexDir, 'metadata.json')),
    tags: readJson<TagIndex>(path.join(indexDir, 'tags.json')),
    dependencies: readJson<DependencyGraph>(path.join(indexDir, 'dependencies.json')),
    stats: readJson<IndexStats>(path.join(indexDir, 'stats.json')),
    cleanup: () => fs.rmSync(projectDir, { recursive: true, force: true }),
  };
}

export const FIXTURE_ENTRY_PATHS = Object.keys(FIXTURE_FILES)
  .map(relativePath => `.aiwg/${relativePath}`)
  .sort();
