import fs from "node:fs";
import path from "node:path";
import { getResourceCacheRoot, readVerifiedRegularFile } from "./web-release.js";
import { readResourceLockfile, resourceLockfilePath } from "./lockfile.js";

type ResourceDoctorSeverity = "ok" | "info" | "warning" | "error";

export interface ResourceDoctorDiagnostic {
  severity: ResourceDoctorSeverity;
  code: string;
  message: string;
}

export interface ResourceDoctorSection {
  output: string;
  diagnostics: ResourceDoctorDiagnostic[];
  hasFailures: boolean;
}

export interface ResourceDoctorOptions {
  cacheRoot?: string;
}

const MAX_RELEASE_MANIFEST_BYTES = 4 * 1024 * 1024;

function mark(severity: ResourceDoctorSeverity): string {
  if (severity === "ok") return "✓";
  if (severity === "info") return "•";
  if (severity === "warning") return "⚠";
  return "✗";
}

function cacheGenerationDir(cacheRoot: string, version: string, manifestSha256: string): string {
  return path.join(cacheRoot, "releases", version, manifestSha256);
}

function isRealDirectory(pathname: string): boolean {
  try {
    const stat = fs.lstatSync(pathname);
    return stat.isDirectory() && !stat.isSymbolicLink();
  } catch {
    return false;
  }
}

export function buildWebResourceDoctorSection(
  projectDir: string,
  options: ResourceDoctorOptions = {},
): ResourceDoctorSection {
  const diagnostics: ResourceDoctorDiagnostic[] = [];
  const cacheRoot = getResourceCacheRoot(options.cacheRoot);
  let lockfile;

  try {
    lockfile = readResourceLockfile(projectDir);
  } catch (error) {
    diagnostics.push({
      severity: "error",
      code: "resource-lockfile-invalid",
      message: `${resourceLockfilePath(projectDir)} is invalid: ${error instanceof Error ? error.message : String(error)}`,
    });
  }

  if (!lockfile) {
    diagnostics.push({
      severity: "info",
      code: "resource-lockfile-missing",
      message: `No ${resourceLockfilePath(projectDir)} found; web resource source mode is not pinned for this project.`,
    });
  } else {
    for (const [key, resource] of Object.entries(lockfile.resources)) {
      diagnostics.push({
        severity: "info",
        code: "resource-source-mode",
        message: `${key}: source=${resource.source}, selector=${resource.selector}, resolved=${resource.version}, manifest=${resource.manifestSha256}`,
      });

      const generationDir = cacheGenerationDir(cacheRoot, resource.version, resource.manifestSha256);
      if (!isRealDirectory(generationDir)) {
        diagnostics.push({
          severity: "warning",
          code: "resource-cache-miss",
          message: `${key}: locked release ${resource.version}/${resource.manifestSha256} is not present in ${cacheRoot}; run the pinned versions command once online to warm the cache.`,
        });
        continue;
      }

      try {
        readVerifiedRegularFile(path.join(generationDir, "manifest.json"), {
          label: `${key} locked resource manifest`,
          maxBytes: MAX_RELEASE_MANIFEST_BYTES,
          expectedSha256: resource.manifestSha256,
        });
        readVerifiedRegularFile(path.join(generationDir, "raw", "prebuilt", "fortemi-core", "framework", "manifest.json"), {
          label: `${key} locked Fortemi Core manifest`,
          maxBytes: MAX_RELEASE_MANIFEST_BYTES,
          expectedSize: resource.fortemiCore.manifestSize,
          expectedSha256: resource.fortemiCore.manifestSha256,
        });
        readVerifiedRegularFile(path.join(generationDir, "raw", "prebuilt", "fortemi-core", "framework", "aiwg-fortemi-index-v2.json"), {
          label: `${key} locked Fortemi Core export`,
          maxBytes: resource.fortemiCore.exportSize,
          expectedSize: resource.fortemiCore.exportSize,
          expectedSha256: resource.fortemiCore.exportSha256,
        });
        diagnostics.push({
          severity: "ok",
          code: "resource-cache-verified",
          message: `${key}: locked release cache is warm and digest-verified.`,
        });
      } catch (error) {
        diagnostics.push({
          severity: "error",
          code: "resource-cache-drift",
          message: `${key}: locked release cache drift detected: ${error instanceof Error ? error.message : String(error)}`,
        });
      }
    }
  }

  const lines = ["\n── Web resource cache ──"];
  for (const diagnostic of diagnostics) {
    lines.push(`  ${mark(diagnostic.severity)} ${diagnostic.message}`);
  }
  return {
    output: lines.join("\n"),
    diagnostics,
    hasFailures: diagnostics.some((diagnostic) => diagnostic.severity === "error"),
  };
}
