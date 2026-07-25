import { createHash, createPublicKey, generateKeyPairSync, sign } from "node:crypto";
import { createServer, type Server } from "node:http";
import type { ResourceFetchResponse } from "../../src/resources/web-release.js";

export const TEST_VERSION = "2026.7.22";
export const TEST_SKILL_PATH = "agentic/code/frameworks/sdlc-complete/skills/web-regression/SKILL.md";
export const TEST_RAW_PATH = `raw/${TEST_SKILL_PATH}`;
export const TEST_SKILL_BODY = Buffer.from(
  "---\nname: web-regression\ndescription: Exercise signed web resource regression behavior\n---\n# Web Regression\n\nDownloaded exactly from the signed release fixture.\n",
  "utf8",
);

type JsonObject = Record<string, any>;

export interface StreamingResponseState {
  reads: number;
  cancelled: boolean;
  cancelReasons: unknown[];
  arrayBufferCalls: number;
}

export function createStreamingResourceResponse(
  chunks: Uint8Array[],
  contentLength?: number,
): { response: ResourceFetchResponse; state: StreamingResponseState } {
  const state: StreamingResponseState = {
    reads: 0,
    cancelled: false,
    cancelReasons: [],
    arrayBufferCalls: 0,
  };
  let index = 0;
  const response: ResourceFetchResponse = {
    ok: true,
    status: 200,
    headers: {
      get(name: string) {
        return name.toLowerCase() === "content-length" && contentLength !== undefined
          ? String(contentLength)
          : null;
      },
    },
    body: {
      getReader() {
        return {
          async read() {
            state.reads += 1;
            if (index >= chunks.length) return { done: true };
            return { done: false, value: chunks[index++] };
          },
          async cancel(reason?: unknown) {
            state.cancelled = true;
            state.cancelReasons.push(reason);
          },
        };
      },
    },
    async arrayBuffer() {
      state.arrayBufferCalls += 1;
      return Buffer.concat(chunks.map((chunk) => Buffer.from(chunk))).buffer;
    },
  };
  return { response, state };
}

export interface PublishedRelease {
  version: string;
  manifestBytes: Buffer;
  manifestDigest: string;
  fortemiManifestBytes: Buffer;
  exportBytes: Buffer;
  rawBody: Buffer;
}

export interface ReleaseOverrides {
  version?: string;
  rawBody?: Buffer;
  mutateExport?: (value: JsonObject) => void;
  mutateFortemiManifest?: (value: JsonObject) => void;
  mutateReleaseManifest?: (value: JsonObject) => void;
}

function digest(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

function jsonBytes(value: unknown): Buffer {
  return Buffer.from(`${JSON.stringify(value)}\n`, "utf8");
}

export function createWebResourceReleaseFixture() {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const publicKeyPem = publicKey.export({ type: "spki", format: "pem" }).toString();
  const publicKeyDer = createPublicKey(publicKeyPem).export({ type: "spki", format: "der" });
  const keyId = `sha256:${digest(publicKeyDer)}`;
  const routes = new Map<string, Buffer>();
  const requestPaths: string[] = [];
  let server: Server | undefined;
  let baseUrl: string | undefined;

  const detachedSignature = (payload: Uint8Array): Buffer => jsonBytes({
    schemaVersion: "aiwg.detached-signature/v1",
    algorithm: "Ed25519",
    keyId,
    payloadSha256: digest(payload),
    signature: sign(null, payload, privateKey).toString("base64"),
  });

  const publishRelease = (overrides: ReleaseOverrides = {}): PublishedRelease => {
    const version = overrides.version ?? TEST_VERSION;
    const rawBody = overrides.rawBody ?? TEST_SKILL_BODY;
    const exported: JsonObject = {
      schema_version: "aiwg.fortemi.index.export.v2",
      generated_at: "2026-07-22T12:00:00.000Z",
      source: { repo: "loopback-fixture", privacy: "public", graph: "framework" },
      compatibility: {
        previous_schema_version: "aiwg.fortemi.index.export.v1",
        strategy: "supported",
      },
      items: [{
        schema_version: "aiwg.fortemi.index.record.v2",
        id: "aiwg:skill:web-regression",
        type: "aiwg.skill",
        source: {
          path: TEST_SKILL_PATH,
          repo_relative_path: TEST_SKILL_PATH,
          locator: `file://${TEST_SKILL_PATH}`,
          origin: "loopback-fixture",
          checksum: digest(rawBody),
          updated_at: "2026-07-22T12:00:00.000Z",
        },
        title: "Web Regression",
        name: "web-regression",
        summary: "Exercise signed web resource regression behavior.",
        text: "Exercise signed web resource regression behavior.",
        search: {
          title: "Web Regression",
          name: "web-regression",
          summary: "Exercise signed web resource regression behavior.",
          body: "",
          triggers: ["signed web regression"],
          aliases: [],
          capability: "Exercise signed web resource regression behavior.",
          tags: ["web-resource", "regression"],
          phase: "construction",
          type: "skill",
          frontmatter: { name: "web-regression" },
        },
        facets: { phase: ["construction"], type: ["skill"] },
        tags: ["web-resource", "regression"],
        concepts: [],
        relationships: [],
        provenance: [],
        privacy: { classification: "public", pii: false, locality: "framework" },
        updated_at: "2026-07-22T12:00:00.000Z",
      }],
    };
    overrides.mutateExport?.(exported);
    const exportBytes = jsonBytes(exported);

    const fortemiManifest: JsonObject = {
      schema_version: "aiwg.fortemi.prebuilt.v1",
      backend: "fortemi-core",
      graph: "framework",
      export_path: "aiwg-fortemi-index-v2.json",
      export_schema_version: "aiwg.fortemi.index.export.v2",
      export_checksum: digest(exportBytes),
      item_count: 1,
    };
    overrides.mutateFortemiManifest?.(fortemiManifest);
    const fortemiManifestBytes = jsonBytes(fortemiManifest);

    const releaseManifest: JsonObject = {
      schemaVersion: "aiwg.resource-manifest/v2",
      version,
      compatibility: {
        schemaVersion: "aiwg.resource-compatibility/v1",
        resourceSchema: "aiwg.resource-manifest/v2",
        cli: { minimumVersion: "2026.1.1", knownIncompatibleRanges: [] },
      },
      bundles: [],
      files: [
        {
          path: "raw/prebuilt/fortemi-core/framework/manifest.json",
          size: fortemiManifestBytes.length,
          sha256: digest(fortemiManifestBytes),
        },
        {
          path: "raw/prebuilt/fortemi-core/framework/aiwg-fortemi-index-v2.json",
          size: exportBytes.length,
          sha256: digest(exportBytes),
        },
        { path: TEST_RAW_PATH, size: rawBody.length, sha256: digest(rawBody) },
      ],
    };
    overrides.mutateReleaseManifest?.(releaseManifest);
    const manifestBytes = jsonBytes(releaseManifest);
    const prefix = `/resources/${version}`;
    routes.set(`${prefix}/manifest.json`, manifestBytes);
    routes.set(`${prefix}/manifest.sig`, detachedSignature(manifestBytes));
    routes.set(`${prefix}/raw/prebuilt/fortemi-core/framework/manifest.json`, fortemiManifestBytes);
    routes.set(`${prefix}/raw/prebuilt/fortemi-core/framework/aiwg-fortemi-index-v2.json`, exportBytes);
    routes.set(`${prefix}/${TEST_RAW_PATH}`, rawBody);
    return {
      version,
      manifestBytes,
      manifestDigest: digest(manifestBytes),
      fortemiManifestBytes,
      exportBytes,
      rawBody,
    };
  };

  const publishChannel = (channel: string, sequence: number, release: PublishedRelease): Buffer => {
    const bytes = jsonBytes({
      schemaVersion: "aiwg.channel-manifest/v1",
      channel,
      sequence,
      version: release.version,
      releaseManifest: `/resources/${release.version}/manifest.json`,
      releaseManifestSha256: release.manifestDigest,
    });
    routes.set(`/resources/channels/${channel}.json`, bytes);
    routes.set(`/resources/channels/${channel}.sig`, detachedSignature(bytes));
    return bytes;
  };

  const publishVersionIndex = (releases: PublishedRelease[]): Buffer => {
    const bytes = jsonBytes({
      schemaVersion: "aiwg.resource-version-index/v1",
      generatedAt: "2026-07-22T12:00:00.000Z",
      versions: releases.map((release) => ({
        version: release.version,
        releaseManifest: `/resources/${release.version}/manifest.json`,
        releaseManifestSha256: release.manifestDigest,
      })),
    });
    routes.set("/resources/versions.json", bytes);
    routes.set("/resources/versions.sig", detachedSignature(bytes));
    return bytes;
  };

  const start = async (): Promise<string> => {
    if (server) throw new Error("loopback fixture is already running");
    server = createServer((request, response) => {
      const pathname = new URL(request.url ?? "/", "http://127.0.0.1").pathname;
      requestPaths.push(pathname);
      const body = routes.get(pathname);
      if (!body) {
        response.writeHead(404, { "content-type": "text/plain", "content-length": "9" });
        response.end("not found");
        return;
      }
      response.writeHead(200, {
        "content-type": pathname.endsWith(".json") ? "application/json" : "application/octet-stream",
        "content-length": String(body.length),
      });
      response.end(body);
    });
    await new Promise<void>((resolve, reject) => {
      server!.once("error", reject);
      server!.listen(0, "127.0.0.1", () => resolve());
    });
    const address = server.address();
    if (!address || typeof address === "string") throw new Error("loopback fixture did not bind a TCP port");
    baseUrl = `http://127.0.0.1:${address.port}`;
    return baseUrl;
  };

  const stop = async (): Promise<void> => {
    if (!server) return;
    const active = server;
    server = undefined;
    await new Promise<void>((resolve, reject) => active.close((error) => error ? reject(error) : resolve()));
  };

  return {
    publicKeyPem,
    routes,
    requestPaths,
    publishRelease,
    publishChannel,
    publishVersionIndex,
    start,
    stop,
    get baseUrl() {
      if (!baseUrl) throw new Error("loopback fixture has not been started");
      return baseUrl;
    },
    setRoute(pathname: string, bytes: Buffer) {
      routes.set(pathname, bytes);
    },
    signBytes: detachedSignature,
  };
}
