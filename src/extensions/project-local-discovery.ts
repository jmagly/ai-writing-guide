/**
 * Project-Local Bundle Discovery
 *
 * Scans `.aiwg/{extensions,addons,frameworks,plugins}/<name>/manifest.json`
 * and validates each manifest against the unified schema. Read-only — no
 * deployment side effects.
 *
 * @implements #1034
 * @architecture .aiwg/architecture/adr-aiwg-directory-layout.md (#1039)
 * @architecture .aiwg/architecture/design-manifest-schema.md (#1044)
 */

import { readFile, readdir, lstat, stat, access } from 'fs/promises';
import { resolve, join } from 'path';
import {
  BundleManifestSchema,
  type BundleManifest,
  type ProjectLocalType,
  type ManifestValidationError,
  zodErrorToValidationErrors,
  MANIFEST_MAX_BYTES,
  MAX_BUNDLES_PER_PROJECT,
} from './manifest.js';

const AIWG_DIR = '.aiwg';
const SCAN_TYPES: ProjectLocalType[] = ['extensions', 'addons', 'frameworks', 'plugins'].map(
  // typed elsewhere; the directory names are the plural of the type
  (s) => s as 'extensions' | 'addons' | 'frameworks' | 'plugins'
).map((dir) => {
  // Map directory name to canonical singular type. ExtensionS → extension, etc.
  const map: Record<string, ProjectLocalType> = {
    extensions: 'extension',
    addons: 'addon',
    frameworks: 'framework',
    plugins: 'plugin',
  };
  return map[dir];
});

/** Directory name → singular type */
const DIR_TO_TYPE: Record<string, ProjectLocalType> = {
  extensions: 'extension',
  addons: 'addon',
  frameworks: 'framework',
  plugins: 'plugin',
};

const SCAN_DIRS = Object.keys(DIR_TO_TYPE);

export interface ProjectLocalBundle {
  /** Bundle id from manifest */
  id: string;
  /** Bundle type from manifest */
  type: ProjectLocalType;
  /** Validated manifest */
  manifest: BundleManifest;
  /** Absolute path to the bundle directory */
  bundlePath: string;
  /** Path of the bundle directory relative to project root (e.g., ".aiwg/extensions/foo/") */
  localPath: string;
  /** Path of the manifest.json relative to project root */
  manifestPath: string;
}

export interface ProjectLocalDiscoveryResult {
  bundles: ProjectLocalBundle[];
  errors: ManifestValidationError[];
  /** True if no `.aiwg/<type>/` dirs exist or none contain bundles. */
  isEmpty: boolean;
  /** Counts per type (only populated when bundles found) */
  counts: Record<ProjectLocalType, number>;
}

export interface DiscoveryOptions {
  /** Allow symlinked bundle directories (default false per #1042 T3) */
  allowSymlinks?: boolean;
}

/**
 * Scan all four `.aiwg/<type>/` directories for project-local bundles. Returns
 * a structured result with bundles, errors, and counts. Missing directories
 * are silently skipped (per #1039 §3 / UC-PL-6).
 */
export async function discoverProjectLocalBundles(
  projectDir: string,
  options: DiscoveryOptions = {}
): Promise<ProjectLocalDiscoveryResult> {
  const bundles: ProjectLocalBundle[] = [];
  const errors: ManifestValidationError[] = [];
  const counts: Record<ProjectLocalType, number> = {
    extension: 0,
    addon: 0,
    framework: 0,
    plugin: 0,
  };

  let totalScanned = 0;

  for (const dirName of SCAN_DIRS) {
    const type = DIR_TO_TYPE[dirName];
    const dirPath = resolve(projectDir, AIWG_DIR, dirName);

    let bundleNames: string[];
    try {
      bundleNames = await readdir(dirPath);
    } catch {
      // Directory absent — silently skip (no-op when absent per UC-PL-6)
      continue;
    }

    for (const bundleName of bundleNames) {
      const bundlePath = join(dirPath, bundleName);

      // Skip non-directory entries (e.g., the legacy registry.json file)
      let isDir: boolean;
      try {
        const st = await lstat(bundlePath);
        if (st.isSymbolicLink()) {
          if (!options.allowSymlinks) {
            errors.push({
              path: bundlePath,
              field: '(bundle directory)',
              expected: 'regular directory',
              actual: 'symlink',
              hint: 'Pass --allow-symlinks to opt in (per #1042 threat model T3)',
              severity: 'error',
            });
            continue;
          }
          // Resolve the symlink and check the target is a directory
          const target = await stat(bundlePath);
          isDir = target.isDirectory();
        } else {
          isDir = st.isDirectory();
        }
      } catch {
        continue;
      }
      if (!isDir) continue;

      const manifestPath = join(bundlePath, 'manifest.json');

      // Silently skip directories without manifest.json — these are not
      // project-local bundles. Most commonly, .aiwg/frameworks/<id>/ holds
      // workspace state from initializeFrameworkWorkspace() (archive/,
      // projects/, repo/, working/), not a bundle. Issue #1058.
      try {
        await access(manifestPath);
      } catch {
        continue;
      }

      totalScanned++;

      // Enforce per-project bundle count cap (#1042 D2 / NFR-PL-12)
      if (totalScanned > MAX_BUNDLES_PER_PROJECT) {
        errors.push({
          path: dirPath,
          field: '(bundle count)',
          expected: `<= ${MAX_BUNDLES_PER_PROJECT} bundles per project`,
          actual: `>${MAX_BUNDLES_PER_PROJECT}`,
          hint: 'Refusing to scan further bundles. Reduce project-local artifact count.',
          severity: 'error',
        });
        const isEmpty = bundles.length === 0;
        return { bundles, errors, isEmpty, counts };
      }

      const result = await loadAndValidateManifest(manifestPath, type, projectDir);
      if (result.bundle) {
        bundles.push(result.bundle);
        counts[result.bundle.type]++;
      }
      errors.push(...result.errors);
    }
  }

  // Cross-bundle: check for case-insensitive id collisions within a single type
  // (NFR-PL-6) and duplicate ids (per #1041 §4 case 6)
  for (const type of ['extension', 'addon', 'framework', 'plugin'] as ProjectLocalType[]) {
    const bundlesOfType = bundles.filter((b) => b.type === type);
    const idsLower = new Map<string, ProjectLocalBundle[]>();
    for (const b of bundlesOfType) {
      const key = b.id.toLowerCase();
      const existing = idsLower.get(key) ?? [];
      existing.push(b);
      idsLower.set(key, existing);
    }
    for (const [, group] of idsLower) {
      if (group.length > 1) {
        for (const b of group) {
          errors.push({
            path: b.manifestPath,
            field: 'id',
            expected: 'unique id (case-insensitive) within type',
            actual: `${b.id} (collides with ${group.filter((g) => g !== b).map((g) => g.id).join(', ')})`,
            hint: 'Two bundles within the same type may not share an id, even differing only in case',
            severity: 'error',
          });
        }
        // Drop colliding bundles from the result so they don't get treated as
        // valid downstream
        for (const b of group) {
          const idx = bundles.indexOf(b);
          if (idx >= 0) {
            bundles.splice(idx, 1);
            counts[b.type]--;
          }
        }
      }
    }
  }

  const isEmpty = bundles.length === 0 && errors.length === 0;
  return { bundles, errors, isEmpty, counts };
}

/**
 * Read a single manifest.json, validate it, and return either a bundle or
 * structured errors. Used by the scanner; exported for tests.
 */
export async function loadAndValidateManifest(
  manifestPath: string,
  expectedType: ProjectLocalType,
  projectDir: string
): Promise<{ bundle?: ProjectLocalBundle; errors: ManifestValidationError[] }> {
  // Size cap (#1042 D1 / NFR-PL-11): refuse before parse
  let st;
  try {
    st = await stat(manifestPath);
  } catch {
    return {
      errors: [{
        path: manifestPath,
        field: '(file)',
        expected: 'manifest.json present',
        actual: 'absent',
        hint: 'Project-local bundle directory missing manifest.json',
        severity: 'error',
      }],
    };
  }
  if (st.size > MANIFEST_MAX_BYTES) {
    return {
      errors: [{
        path: manifestPath,
        field: '(file size)',
        expected: `<= ${MANIFEST_MAX_BYTES} bytes`,
        actual: `${st.size} bytes`,
        hint: 'Manifest exceeds size limit; refusing to parse',
        severity: 'error',
      }],
    };
  }

  let raw: string;
  try {
    raw = await readFile(manifestPath, 'utf-8');
  } catch (err) {
    return {
      errors: [{
        path: manifestPath,
        field: '(read)',
        expected: 'readable manifest.json',
        actual: (err as Error).message,
        severity: 'error',
      }],
    };
  }

  // Encoding check (NFR-PL-5): UTF-8 BOM is allowed; we'll normalize. Other
  // BOMs (UTF-16 LE/BE, Latin-1) are rejected.
  if (raw.charCodeAt(0) === 0xFEFF) {
    raw = raw.slice(1);
  } else if (raw.charCodeAt(0) === 0xFFFE || raw.charCodeAt(0) === 0xFEFF) {
    return {
      errors: [{
        path: manifestPath,
        field: '(encoding)',
        expected: 'UTF-8',
        actual: 'non-UTF-8 BOM detected',
        hint: 'Manifest must be UTF-8 encoded',
        severity: 'error',
      }],
    };
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return {
      errors: [{
        path: manifestPath,
        field: '(JSON parse)',
        expected: 'valid JSON',
        actual: (err as Error).message,
        severity: 'error',
      }],
    };
  }

  const result = BundleManifestSchema.safeParse(parsed);
  if (!result.success) {
    return { errors: zodErrorToValidationErrors(result.error, manifestPath) };
  }

  const manifest = result.data;

  // Cross-check: manifest declared type must match the directory it lives in.
  if (manifest.type !== expectedType) {
    return {
      errors: [{
        path: manifestPath,
        field: 'type',
        expected: `"${expectedType}" (matching directory .aiwg/${expectedType}s/)`,
        actual: `"${manifest.type}"`,
        hint: `Bundle in .aiwg/${expectedType}s/ must declare type: "${expectedType}"`,
        severity: 'error',
      }],
    };
  }

  const bundlePath = manifestPath.slice(0, -'/manifest.json'.length);
  const localPath = bundlePath.startsWith(projectDir + '/')
    ? bundlePath.slice(projectDir.length + 1) + '/'
    : bundlePath + '/';

  return {
    bundle: {
      id: manifest.id,
      type: manifest.type,
      manifest,
      bundlePath,
      localPath,
      manifestPath: manifestPath.startsWith(projectDir + '/')
        ? manifestPath.slice(projectDir.length + 1)
        : manifestPath,
    },
    errors: [],
  };
}

// Suppress unused import noise from the SCAN_TYPES helper (kept for clarity)
void SCAN_TYPES;
