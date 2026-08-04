import path from "node:path";
import {
  loadResourceTrustRootFile,
  readVerifiedRegularFile,
  resolveWebRelease,
  type VerifiedWebRelease,
  type WebReleaseOptions,
} from "../../resources/web-release.js";
import { getProjectDir } from "../../config/aiwg-config.js";
import { cleanWebResourceCache } from "../../resources/cache-cleanup.js";
import { writeWebResourceLock } from "../../resources/lockfile.js";
import type { CommandHandler, HandlerContext, HandlerResult } from "./types.js";
import { createResourceCredentialProvider } from "../../auth/resource-credentials.js";

const MAX_RESOURCE_MANIFEST_BYTES = 4 * 1024 * 1024;
const DEFAULT_CHANNELS = ["stable", "latest", "canary", "main"] as const;

interface ParsedVersionArgs {
  subcommand: "list" | "resolve" | "show" | "clean-cache";
  selector?: string;
  json: boolean;
  pretty: boolean;
  offline: boolean;
  writeLock: boolean;
  dryRun: boolean;
  force: boolean;
  channels: string[];
}

interface ReleaseManifestSummary {
  schemaVersion?: unknown;
  version?: unknown;
  compatibility?: unknown;
  source?: unknown;
  bundles: unknown[];
  fileCount: number;
}

function usage(): string {
  return [
    "Usage: aiwg versions <list|resolve|show|clean-cache> [selector] [--json] [--pretty] [--offline]",
    "",
    "Examples:",
    "  aiwg versions list --json",
    "  aiwg versions resolve stable --json",
    "  aiwg versions resolve stable --write-lock",
    "  aiwg versions show 2026.7.18",
    "  aiwg versions clean-cache --dry-run",
  ].join("\n");
}

function flagValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith("--")) throw new Error(`${flag} requires a value`);
  return value;
}

function parseArgs(args: string[]): ParsedVersionArgs {
  const [rawSubcommand = "list", ...rest] = args;
  if (
    rawSubcommand !== "list" &&
    rawSubcommand !== "resolve" &&
    rawSubcommand !== "show" &&
    rawSubcommand !== "clean-cache"
  ) {
    throw new Error(`Unknown versions subcommand: ${rawSubcommand}\n\n${usage()}`);
  }

  const valueFlagIndexes = new Set<number>();
  for (const flag of ["--channels", "--target", "--prefix"]) {
    const index = rest.indexOf(flag);
    if (index !== -1) {
      valueFlagIndexes.add(index);
      valueFlagIndexes.add(index + 1);
    }
  }

  const positionals = rest.filter((arg, index) => !arg.startsWith("--") && !valueFlagIndexes.has(index));
  if ((rawSubcommand === "resolve" || rawSubcommand === "show") && positionals.length !== 1) {
    throw new Error(`aiwg versions ${rawSubcommand} requires exactly one version, range, digest, or channel selector\n\n${usage()}`);
  }
  if (rawSubcommand === "list" && positionals.length > 0) {
    throw new Error(`aiwg versions list does not accept positional selectors\n\n${usage()}`);
  }
  if (rawSubcommand === "clean-cache" && positionals.length > 0) {
    throw new Error(`aiwg versions clean-cache does not accept positional selectors\n\n${usage()}`);
  }
  const writeLock = rest.includes("--write-lock");
  if ((rawSubcommand === "list" || rawSubcommand === "clean-cache") && writeLock) {
    throw new Error(`aiwg versions ${rawSubcommand} cannot write resources.lock.json; use resolve or show with --write-lock`);
  }

  const channelsValue = flagValue(rest, "--channels");
  const channels = channelsValue
    ? channelsValue.split(",").map((channel) => channel.trim()).filter(Boolean)
    : [...DEFAULT_CHANNELS];
  if (channels.length === 0) throw new Error("--channels must include at least one channel");

  return {
    subcommand: rawSubcommand,
    selector: positionals[0],
    json: rest.includes("--json") || rest.includes("--format=json"),
    pretty: rest.includes("--pretty"),
    offline: rest.includes("--offline"),
    writeLock,
    dryRun: rest.includes("--dry-run"),
    force: rest.includes("--force"),
    channels,
  };
}

function webReleaseOptionsFromEnvironment(): Omit<WebReleaseOptions, "selector" | "offline"> {
  const baseUrl = process.env.AIWG_RESOURCE_BASE_URL;
  const cacheRoot = process.env.AIWG_RESOURCE_CACHE_ROOT;
  const trustRootFile = process.env.AIWG_RESOURCE_TRUST_ROOT_FILE;
  const publicKeyPem = trustRootFile === undefined
    ? undefined
    : loadResourceTrustRootFile(path.resolve(trustRootFile));

  return {
    credentialProvider: createResourceCredentialProvider(process.env),
    ...(baseUrl === undefined ? {} : { baseUrl }),
    ...(cacheRoot === undefined ? {} : { cacheRoot }),
    ...(publicKeyPem === undefined ? {} : { publicKeyPem }),
    ...(process.env.AIWG_RESOURCE_ALLOW_INSECURE_LOOPBACK_HTTP === "1"
      ? { allowInsecureLoopbackHttp: true }
      : {}),
  };
}

function readManifestSummary(release: VerifiedWebRelease): ReleaseManifestSummary {
  const bytes = readVerifiedRegularFile(release.releaseManifestPath, {
    label: "verified AIWG resource release manifest",
    maxBytes: MAX_RESOURCE_MANIFEST_BYTES,
    expectedSha256: release.manifestDigest,
  });
  const value = JSON.parse(bytes.toString("utf8")) as Record<string, unknown>;
  const bundles = Array.isArray(value.bundles) ? value.bundles : [];
  const files = Array.isArray(value.files) ? value.files : [];
  return {
    schemaVersion: value.schemaVersion,
    version: value.version,
    compatibility: value.compatibility,
    source: value.source,
    bundles,
    fileCount: files.length,
  };
}

function releaseJson(
  release: VerifiedWebRelease,
  manifest?: ReleaseManifestSummary,
  lockfilePath?: string,
): Record<string, unknown> {
  return {
    selector: release.selector,
    selectorKind: release.selectorKind,
    version: release.version,
    manifestSha256: release.manifestDigest,
    manifestUrl: release.manifestUrl,
    baseUrl: release.baseUrl,
    cacheDir: release.cacheDir,
    channelSequence: release.channelSequence,
    fortemiCore: {
      manifestSha256: release.fortemiManifestSha256,
      manifestSize: release.fortemiManifestSize,
      exportSha256: release.fortemiExportSha256,
      exportSize: release.fortemiExportSize,
    },
    descriptorCount: release.descriptors.size,
    ...(lockfilePath === undefined ? {} : { lockfile: lockfilePath }),
    ...(manifest === undefined ? {} : { manifest }),
  };
}

function printJson(value: unknown, pretty: boolean): void {
  console.log(JSON.stringify(value, null, pretty ? 2 : 0));
}

function printReleaseText(release: VerifiedWebRelease, manifest?: ReleaseManifestSummary, lockfilePath?: string): void {
  console.log(`selector: ${release.selector} (${release.selectorKind})`);
  console.log(`version: ${release.version}`);
  if (release.channelSequence !== undefined) console.log(`channel_sequence: ${release.channelSequence}`);
  console.log(`manifest_sha256: ${release.manifestDigest}`);
  console.log(`manifest_url: ${release.manifestUrl}`);
  console.log(`cache_dir: ${release.cacheDir}`);
  console.log(`fortemi_manifest_sha256: ${release.fortemiManifestSha256}`);
  console.log(`fortemi_export_sha256: ${release.fortemiExportSha256}`);
  console.log(`descriptor_count: ${release.descriptors.size}`);
  if (lockfilePath !== undefined) console.log(`lockfile: ${lockfilePath}`);
  if (manifest) {
    console.log(`schema_version: ${String(manifest.schemaVersion)}`);
    console.log(`file_count: ${manifest.fileCount}`);
    console.log(`bundle_count: ${manifest.bundles.length}`);
  }
}

export const versionsHandler: CommandHandler = {
  id: "versions",
  name: "Resource Versions",
  description: "Browse and resolve signed AIWG web resource releases",
  category: "index",
  aliases: [],

  async execute(ctx: HandlerContext): Promise<HandlerResult> {
    if (ctx.args[0] === "help" || ctx.args[0] === "--help" || ctx.args[0] === "-h") {
      console.log(usage());
      return { exitCode: 0 };
    }

    let parsed: ParsedVersionArgs;
    try {
      parsed = parseArgs(ctx.args);
    } catch (error) {
      return { exitCode: 2, message: error instanceof Error ? error.message : String(error) };
    }

    try {
      const baseOptions = webReleaseOptionsFromEnvironment();
      if (parsed.subcommand === "clean-cache") {
        const result = cleanWebResourceCache(getProjectDir(ctx, ctx.args), {
          cacheRoot: process.env.AIWG_RESOURCE_CACHE_ROOT,
          dryRun: parsed.dryRun,
          force: parsed.force,
        });
        if (parsed.json) {
          printJson(result, parsed.pretty);
        } else {
          console.log(`cache_root: ${result.cacheRoot}`);
          console.log(`dry_run: ${result.dryRun}`);
          console.log(`force: ${result.force}`);
          console.log(`locked: ${result.locked.length}`);
          console.log(`preserved: ${result.preserved.length}`);
          console.log(`removed: ${result.removed.length}`);
          console.log(`skipped: ${result.skipped.length}`);
        }
        return { exitCode: 0 };
      }

      if (parsed.subcommand === "list") {
        const resolved: Array<Record<string, unknown>> = [];
        const unavailable: Array<{ channel: string; error: string }> = [];
        for (const channel of parsed.channels) {
          try {
            const release = await resolveWebRelease({
              ...baseOptions,
              selector: channel,
              offline: parsed.offline,
            });
            resolved.push(releaseJson(release));
          } catch (error) {
            unavailable.push({
              channel,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }
        if (parsed.json) {
          printJson({ channels: resolved, unavailable }, parsed.pretty);
        } else {
          for (const release of resolved) {
            console.log(`${release.selector}: ${release.version} ${release.manifestSha256}`);
          }
          if (resolved.length === 0) console.log("No configured channels resolved.");
        }
        return { exitCode: 0 };
      }

      const release = await resolveWebRelease({
        ...baseOptions,
        selector: parsed.selector,
        offline: parsed.offline,
      });
      const manifest = parsed.subcommand === "show" ? readManifestSummary(release) : undefined;
      const lockfilePath = parsed.writeLock
        ? writeWebResourceLock(getProjectDir(ctx, ctx.args), release).path
        : undefined;
      if (parsed.json) {
        printJson(releaseJson(release, manifest, lockfilePath), parsed.pretty);
      } else {
        printReleaseText(release, manifest, lockfilePath);
      }
      return { exitCode: 0 };
    } catch (error) {
      return { exitCode: 1, message: error instanceof Error ? error.message : String(error) };
    }
  },
};
