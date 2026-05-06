/**
 * Project-Local Doctor Section
 *
 * Builds the "Project-local artifacts" section for `aiwg doctor` output
 * per the spec at @.aiwg/architecture/design-doctor-log-promote.md (#1049).
 *
 * Pure function over (projectDir, frameworkRoot) — returns a string. The
 * doctor handler in src/cli/handlers/utilities.ts is responsible for
 * printing it. Section is fully suppressed when no project-local dirs
 * are present.
 *
 * @design @.aiwg/architecture/design-doctor-log-promote.md
 * @implements #1037
 */

import { resolve } from 'path';
import { homedir } from 'os';
import { discoverProjectLocalBundles } from './project-local-discovery.js';
import { buildUpstreamRegistry } from './upstream-registry.js';
import { resolveShadows } from './shadow-resolver.js';
import { checkBundleManifestIgnored } from './project-local-gitignore.js';
import { sha256OfFileNormalized } from './managed-marker.js';
import type { ProjectLocalType } from './manifest.js';
import type { AiwgConfig } from '../config/aiwg-config.js';

export interface DoctorSectionResult {
  /** Pre-formatted multi-line section (empty string when no project-local content). */
  output: string;
  /** Count of validation errors found. */
  validationErrors: number;
  /** Count of denylist violations (refuse-unsafe / refuse-phantom / refuse-duplicate). */
  denylistViolations: number;
  /** Count of artifacts whose deployed file hash differs from the registered hash. */
  driftCount: number;
  /** True when the section had failing content (validation, denylist, drift). */
  hasFailures: boolean;
}

interface BuildOptions {
  projectDir: string;
  frameworkRoot: string;
  /** Optional pre-loaded config; if null/undefined we skip drift detection. */
  config: AiwgConfig | null;
  /** Suppress informational subsections (counts, shadows). */
  quiet?: boolean;
}

/**
 * Hash a deployed file with the managed-marker stripped. Returns null on
 * read errors (e.g., file missing — caller treats as deploy-not-present).
 *
 * Source files are recorded via the same normalization in
 * `hashBundleArtifacts()`, so the equivalence relation is symmetric.
 *
 * @implements #1086
 */
async function sha256(absPath: string): Promise<string | null> {
  try {
    return await sha256OfFileNormalized(absPath);
  } catch {
    return null;
  }
}

const TYPES: readonly ProjectLocalType[] = ['extension', 'addon', 'framework', 'plugin'];

const TYPE_DIR: Record<ProjectLocalType, string> = {
  extension: 'extensions',
  addon: 'addons',
  framework: 'frameworks',
  plugin: 'plugins',
};

// Per PUW-026 (#1127): home-deploying providers get absolute prefixes so
// `resolve(projectDir, prefix)` correctly produces the home-rooted path
// (resolve treats absolute paths as authoritative). Previously these were
// `null`, which silently skipped lifecycle operations against home-deployed
// project-local bundles.
const PROVIDER_PREFIX: Record<string, string | null> = {
  claude: '.claude',
  cursor: '.cursor',
  factory: '.factory',
  opencode: '.opencode',
  windsurf: '.windsurf',
  warp: '.warp',
  codex: '.codex',
  copilot: '.github',
  openclaw: resolve(homedir(), '.openclaw'),
  hermes: resolve(homedir(), '.hermes'),
};

export async function buildProjectLocalDoctorSection(
  opts: BuildOptions,
): Promise<DoctorSectionResult> {
  const { projectDir, frameworkRoot, config, quiet = false } = opts;

  const discovery = await discoverProjectLocalBundles(projectDir);

  // No project-local content → no section at all
  if (discovery.isEmpty && discovery.errors.length === 0) {
    return { output: '', validationErrors: 0, denylistViolations: 0, driftCount: 0, hasFailures: false };
  }

  const lines: string[] = ['', '── Project-local artifacts ────────────────────────────────────'];

  // Counts
  if (!quiet) {
    lines.push(`  Discovered: ${discovery.bundles.length} bundle${discovery.bundles.length === 1 ? '' : 's'}`);
    for (const t of TYPES) {
      const dirName = TYPE_DIR[t];
      const ofType = discovery.bundles.filter(b => b.type === t);
      if (ofType.length === 0 && discovery.bundles.length > 0) continue;
      const idList = ofType.length > 0 ? `  (${ofType.map(b => b.id).join(', ')})` : '';
      lines.push(`    ${dirName.padEnd(11)} ${ofType.length}${idList}`);
    }
    lines.push('');
  }

  // Validation
  const validationErrors = discovery.errors.length;
  if (validationErrors === 0) {
    if (!quiet) lines.push('  Validation: ✓ all manifests valid');
  } else {
    lines.push(`  Validation: ✗ ${validationErrors} error${validationErrors === 1 ? '' : 's'}`);
    for (const e of discovery.errors.slice(0, 10)) {
      lines.push(`    ✗ ${e.path}: ${e.field} — ${e.actual}`);
    }
    if (validationErrors > 10) {
      lines.push(`    + ${validationErrors - 10} more (run 'aiwg list --project-local' for full list)`);
    }
  }
  lines.push('');

  // Shadows + denylist
  let denylistViolations = 0;
  if (discovery.bundles.length > 0) {
    try {
      const upstream = await buildUpstreamRegistry({ frameworkRoot });
      const shadowResult = await resolveShadows(discovery.bundles, upstream);
      const refusals = shadowResult.resolutions.filter(
        r => r.verdict === 'refuse-unsafe' || r.verdict === 'refuse-phantom' || r.verdict === 'refuse-duplicate',
      );
      denylistViolations = refusals.length;

      if (!quiet) {
        const informational = shadowResult.shadows.filter(
          s => s.verdict === 'deploy-with-warning' || s.verdict === 'deploy-acknowledged',
        );
        if (informational.length > 0) {
          lines.push(`  Shadows (${informational.length}):`);
          for (const s of informational) {
            const marker = s.verdict === 'deploy-acknowledged' ? '!!' : '⚠';
            const note = s.verdict === 'deploy-acknowledged' ? '  overrides safety-critical (acknowledged)' : `  overrides ${s.upstream?.source ?? 'upstream'}`;
            lines.push(`    ${marker} ${s.bundleId} :: ${s.artifactType}/${s.artifactId}${note}`);
          }
          lines.push('');
        }
      }

      if (refusals.length > 0) {
        lines.push(`  Denylist violations (${refusals.length}):`);
        for (const r of refusals) {
          lines.push(`    ✗ ${r.bundleId} :: ${r.artifactType}/${r.artifactId}  [${r.verdict}]`);
        }
        lines.push('');
      } else if (!quiet) {
        lines.push('  Denylist violations: 0');
        lines.push('');
      }
    } catch {
      // Shadow resolution failure is non-fatal for doctor
    }
  }

  // Drift detection (requires config and artifactHashes)
  let driftCount = 0;
  const driftLines: string[] = [];
  let unhashedSeen = false;
  if (config) {
    for (const bundle of discovery.bundles) {
      const entry = config.installed[bundle.id];
      if (!entry || entry.source !== 'project-local') continue;
      const hashes = entry.artifactHashes;
      if (!hashes) {
        unhashedSeen = true;
        continue;
      }
      for (const provider of Object.keys(entry.deployedTo)) {
        const prefix = PROVIDER_PREFIX[provider];
        if (!prefix) continue;
        for (const [sourceRel, expectedHash] of Object.entries(hashes)) {
          const deployedAbs = resolve(projectDir, `${prefix}/${sourceRel}`);
          const actualHash = await sha256(deployedAbs);
          if (actualHash === null) {
            // Missing — not drift, deploy is just absent
            continue;
          }
          if (actualHash !== expectedHash) {
            driftCount++;
            driftLines.push(`    ✗ ${bundle.id} :: ${sourceRel} @ ${provider}  (deployed file differs from source)`);
          }
        }
      }
    }
  }

  if (driftCount > 0) {
    lines.push(`  Drift (${driftCount}):`);
    lines.push(...driftLines);
    lines.push('');
  } else if (!quiet) {
    lines.push('  Drift: 0');
    if (unhashedSeen) {
      lines.push('    (some entries lack artifactHashes — re-run `aiwg use <bundle>` to record)');
    }
    lines.push('');
  }

  // Provider deployment matrix
  if (!quiet && config) {
    const projectLocalEntries = Object.entries(config.installed).filter(
      ([, e]) => e.source === 'project-local',
    );
    if (projectLocalEntries.length > 0) {
      const allProviders = new Set<string>();
      for (const [, entry] of projectLocalEntries) {
        for (const p of Object.keys(entry.deployedTo)) allProviders.add(p);
      }
      const provList = [...allProviders].sort();

      if (provList.length > 0) {
        lines.push('  Provider deployment matrix:');
        lines.push(`    ${'bundle'.padEnd(20)}${provList.map(p => p.padEnd(8)).join('')}`);
        for (const [name, entry] of projectLocalEntries) {
          const cells = provList.map(p => {
            const c = entry.deployedTo[p];
            if (!c) return '-'.padEnd(8);
            const total = c.agents + c.commands + c.skills + c.rules;
            return `✓ ${total}`.padEnd(8);
          }).join('');
          lines.push(`    ${name.padEnd(20)}${cells}`);
        }
        lines.push('');
      }
    }
  }

  // #1085 — flag bundles whose source is silently git-ignored. Best-effort
  // (uses `git check-ignore`); skipped silently outside git repos.
  let gitignoredCount = 0;
  if (discovery.bundles.length > 0) {
    const ignored: string[] = [];
    for (const b of discovery.bundles) {
      const isIgnored = await checkBundleManifestIgnored(projectDir, b.manifestPath);
      if (isIgnored === true) ignored.push(`${b.type}/${b.id} (${b.manifestPath})`);
    }
    gitignoredCount = ignored.length;
    if (ignored.length > 0) {
      lines.push(`  Git tracking: ✗ ${ignored.length} bundle${ignored.length === 1 ? '' : 's'} silently ignored`);
      for (const i of ignored.slice(0, 5)) {
        lines.push(`    ✗ ${i}`);
      }
      if (ignored.length > 5) {
        lines.push(`    + ${ignored.length - 5} more`);
      }
      lines.push('    Project-local bundle source should be tracked. Add to .gitignore:');
      lines.push('      !.aiwg/addons/');
      lines.push('      !.aiwg/extensions/');
      lines.push('      !.aiwg/frameworks/');
      lines.push('      !.aiwg/plugins/');
      lines.push('    Or run `aiwg new-bundle <name>` to have AIWG add this block automatically.');
      lines.push('');
    } else if (!quiet) {
      lines.push('  Git tracking: ✓ all bundle manifests visible to git');
      lines.push('');
    }
  }

  const hasFailures = validationErrors > 0 || denylistViolations > 0 || driftCount > 0 || gitignoredCount > 0;
  return {
    output: lines.join('\n'),
    validationErrors,
    denylistViolations,
    driftCount,
    hasFailures,
  };
}

/** Convenience accessor: just the section text. */
export async function projectLocalDoctorSection(
  projectDir: string,
  frameworkRoot: string,
  config: AiwgConfig | null,
  quiet = false,
): Promise<string> {
  const r = await buildProjectLocalDoctorSection({ projectDir, frameworkRoot, config, quiet });
  return r.output;
}

