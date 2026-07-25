import fs from "node:fs/promises";
import path from "node:path";
import {
  fetchVerifiedRawResource,
  resolveWebRelease,
  type VerifiedWebRelease,
  type WebReleaseOptions,
} from "./web-release.js";

export type AiwgResourceSourceMode = "local" | "web" | "auto";

export interface ParsedAiwgResourceId {
  logicalId: string;
  relativePath: string;
  rawPath: string;
}

export interface ResolveAiwgResourceOptions {
  source?: AiwgResourceSourceMode;
  frameworkRoot: string;
  selector?: string;
  offline?: boolean;
  webRelease?: VerifiedWebRelease;
  webReleaseOptions?: Omit<WebReleaseOptions, "selector" | "offline">;
}

export interface ResolvedAiwgResource {
  logicalId: string;
  source: "local" | "web";
  path: string;
  bytes: Buffer;
  webRelease?: VerifiedWebRelease;
  diagnostics: string[];
}

function assertSafeSegment(value: string, label: string): void {
  if (!/^[A-Za-z0-9._-]+$/.test(value) || value === "." || value === "..") {
    throw new Error(`${label} is not a safe AIWG resource segment`);
  }
}

function assertSafeRelativePath(value: string): void {
  if (
    value.length === 0 ||
    value.startsWith("/") ||
    value.includes("\\") ||
    value.split("/").some((part) => part === "" || part === "." || part === "..")
  ) {
    throw new Error("AIWG logical resource path is not safe");
  }
  for (const part of value.split("/")) assertSafeSegment(part, "AIWG logical resource path segment");
}

export function parseAiwgResourceId(logicalId: string): ParsedAiwgResourceId {
  let url: URL;
  try {
    url = new URL(logicalId);
  } catch {
    throw new Error(`Invalid AIWG logical resource ID: ${logicalId}`);
  }
  if (url.protocol !== "aiwg:") throw new Error(`Unsupported AIWG logical resource protocol: ${url.protocol}`);
  if (url.search || url.hash || url.username || url.password) {
    throw new Error("AIWG logical resource IDs must not include auth, query, or fragment components");
  }

  const namespace = url.hostname;
  const parts = url.pathname.split("/").filter(Boolean);
  let relativePath: string;
  if (namespace === "frameworks") {
    const [name, ...rest] = parts;
    if (!name || rest.length === 0) throw new Error("Framework resource IDs require a name and path");
    assertSafeSegment(name, "framework name");
    const suffix = rest.join("/");
    assertSafeRelativePath(suffix);
    relativePath = `agentic/code/frameworks/${name}/${suffix}`;
  } else if (namespace === "addons") {
    const [name, ...rest] = parts;
    if (!name || rest.length === 0) throw new Error("Addon resource IDs require a name and path");
    assertSafeSegment(name, "addon name");
    const suffix = rest.join("/");
    assertSafeRelativePath(suffix);
    relativePath = `agentic/code/addons/${name}/${suffix}`;
  } else if (namespace === "core") {
    if (parts.length < 2) throw new Error("Core resource IDs require a kind and path");
    const [kind, ...rest] = parts;
    assertSafeSegment(kind, "core resource kind");
    const suffix = rest.join("/");
    assertSafeRelativePath(suffix);
    relativePath = `agentic/code/${kind}/${suffix}`;
  } else {
    throw new Error(`Unsupported AIWG logical resource namespace: ${namespace}`);
  }

  return {
    logicalId,
    relativePath,
    rawPath: `raw/${relativePath}`,
  };
}

export function logicalIdFromFirstPartyPath(indexedPath: string): string | null {
  const normalized = indexedPath.replace(/\\/g, "/").replace(/^raw\//, "").replace(/^\/+/, "");
  const parts = normalized.split("/");
  if (parts[0] !== "agentic" || parts[1] !== "code") return null;
  if ((parts[2] === "frameworks" || parts[2] === "addons") && parts.length > 4) {
    return `aiwg://${parts[2]}/${parts[3]}/${parts.slice(4).join("/")}`;
  }
  if (parts.length > 3) return `aiwg://core/${parts[2]}/${parts.slice(3).join("/")}`;
  return null;
}

async function readLocalResource(parsed: ParsedAiwgResourceId, frameworkRoot: string): Promise<Buffer> {
  const root = path.resolve(frameworkRoot);
  const pathname = path.resolve(root, parsed.relativePath);
  if (!pathname.startsWith(`${root}${path.sep}`)) throw new Error("AIWG local resource resolved outside the framework root");
  return fs.readFile(pathname);
}

export async function resolveAiwgResourceBytes(
  logicalId: string,
  options: ResolveAiwgResourceOptions,
): Promise<ResolvedAiwgResource> {
  const parsed = parseAiwgResourceId(logicalId);
  const requestedSource = options.source ?? "local";
  const diagnostics: string[] = [];

  if (requestedSource === "local" || requestedSource === "auto") {
    try {
      const bytes = await readLocalResource(parsed, options.frameworkRoot);
      diagnostics.push(`source=${requestedSource === "auto" ? "auto(local)" : "local"}`);
      return {
        logicalId,
        source: "local",
        path: path.resolve(options.frameworkRoot, parsed.relativePath),
        bytes,
        diagnostics,
      };
    } catch (error) {
      if (requestedSource === "local") throw error;
      diagnostics.push(`local-miss=${error instanceof Error ? error.message : String(error)}`);
    }
  }

  const webRelease = options.webRelease ?? await resolveWebRelease({
    ...options.webReleaseOptions,
    selector: options.selector ?? "stable",
    offline: options.offline,
  });
  const bytes = await fetchVerifiedRawResource(webRelease, parsed.rawPath, {
    baseUrl: options.webReleaseOptions?.baseUrl,
    fetcher: options.webReleaseOptions?.fetcher,
    allowInsecureLoopbackHttp: options.webReleaseOptions?.allowInsecureLoopbackHttp,
    offline: options.offline,
  });
  diagnostics.push(`source=${requestedSource === "auto" ? "auto(web)" : "web"}`);
  return {
    logicalId,
    source: "web",
    path: parsed.rawPath,
    bytes,
    webRelease,
    diagnostics,
  };
}
