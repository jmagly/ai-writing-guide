import { createHash, generateKeyPairSync } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createWebReleaseTestOptions,
  fetchVerifiedRawResource,
  parseResourceSelector,
  readVerifiedRegularFile,
  resolveWebRelease,
  verifySignedResourceBytes,
} from "../../../src/resources/web-release.js";
import {
  createWebResourceReleaseFixture,
  createStreamingResourceResponse,
  TEST_RAW_PATH,
  TEST_VERSION,
} from "../../fixtures/web-resource-release.js";
import { loadFortemiCoreExport } from "../../../src/artifacts/fortemi-core-query-adapter.js";

describe("signed web release resolver", () => {
  let cacheRoot: string;
  let fixture: ReturnType<typeof createWebResourceReleaseFixture>;

  beforeEach(async () => {
    cacheRoot = fs.mkdtempSync(path.join(os.tmpdir(), "aiwg-web-release-test-"));
    fixture = createWebResourceReleaseFixture();
    await fixture.start();
  });

  afterEach(async () => {
    await fixture.stop();
    fs.rmSync(cacheRoot, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  function options(selector = TEST_VERSION) {
    return createWebReleaseTestOptions(fixture.baseUrl, {
      selector,
      cacheRoot,
      publicKeyPem: fixture.publicKeyPem,
    });
  }

  it.each([
    ["2026.7.22", { kind: "exact", value: "2026.7.22" }],
    ["2026.7.22-rc.1", { kind: "exact", value: "2026.7.22-rc.1" }],
    ["stable", { kind: "channel", value: "stable" }],
    ["release-candidate", { kind: "channel", value: "release-candidate" }],
    ["^2026.7.0", { kind: "range", value: "^2026.7.0" }],
    [">=2026.7.0 <2026.8.0", { kind: "range", value: ">=2026.7.0 <2026.8.0" }],
    ["sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", {
      kind: "digest",
      value: "sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
      digest: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    }],
  ])("parses safe selector %s", (selector, expected) => {
    expect(parseResourceSelector(selector)).toMatchObject(expected);
  });

  it.each(["", "v2026.7.22", "2026.00.1", "2026.13.1", "2026.7.-1", "../stable", "Stable", "a".repeat(33), "sha256:bad"])(
    "rejects unsafe selector %j",
    (selector) => expect(() => parseResourceSelector(selector)).toThrow(/Unsupported AIWG resource selector/),
  );

  it("resolves a signed exact release with the injected Ed25519 trust root and loopback escape hatch", async () => {
    const published = fixture.publishRelease();
    const release = await resolveWebRelease(options());

    expect(release.version).toBe(TEST_VERSION);
    expect(release.selectorKind).toBe("exact");
    expect(release.manifestDigest).toBe(published.manifestDigest);
    expect(release.descriptors.get(TEST_RAW_PATH)?.sha256).toBe(
      createHash("sha256").update(published.rawBody).digest("hex"),
    );
    expect(fixture.requestPaths).toEqual([
      `/resources/${TEST_VERSION}/manifest.json`,
      `/resources/${TEST_VERSION}/manifest.sig`,
      `/resources/${TEST_VERSION}/raw/prebuilt/fortemi-core/framework/manifest.json`,
      `/resources/${TEST_VERSION}/raw/prebuilt/fortemi-core/framework/aiwg-fortemi-index-v2.json`,
    ]);
  });

  it("sends the configured paid-resource credential without placing it in URLs", async () => {
    fixture.publishRelease();
    vi.stubEnv("AIWG_RESOURCE_ACCESS_TOKEN", "aiwg_rt_test_customer_token");
    await resolveWebRelease(options());

    expect(fixture.requestHeaders.every((headers) =>
      headers.authorization === "Bearer aiwg_rt_test_customer_token",
    )).toBe(true);
    expect(fixture.requestPaths.join("\n")).not.toContain("aiwg_rt_test_customer_token");
  });

  it("resolves a signed channel and records its monotonic sequence", async () => {
    const published = fixture.publishRelease();
    fixture.publishChannel("stable", 7, published);

    const release = await resolveWebRelease(options("stable"));

    expect(release.selectorKind).toBe("channel");
    expect(release.channelSequence).toBe(7);
    expect(release.manifestDigest).toBe(published.manifestDigest);
  });

  it("resolves SemVer ranges and manifest digest selectors through the signed version index", async () => {
    const older = fixture.publishRelease({ version: "2026.7.21" });
    const latest = fixture.publishRelease();
    fixture.publishVersionIndex([older, latest]);

    const ranged = await resolveWebRelease(options("^2026.7.0"));
    expect(ranged.selectorKind).toBe("range");
    expect(ranged.version).toBe(TEST_VERSION);
    expect(ranged.manifestDigest).toBe(latest.manifestDigest);

    const byDigest = await resolveWebRelease(options(`sha256:${older.manifestDigest}`));
    expect(byDigest.selectorKind).toBe("digest");
    expect(byDigest.version).toBe("2026.7.21");
    expect(byDigest.manifestDigest).toBe(older.manifestDigest);
    expect(fixture.requestPaths).toContain("/resources/versions.json");
    expect(fixture.requestPaths).toContain("/resources/versions.sig");
  });

  it("rejects a public-key mismatch before accepting signed metadata", async () => {
    fixture.publishRelease();
    const otherKey = generateKeyPairSync("ed25519").publicKey.export({ type: "spki", format: "pem" });

    await expect(resolveWebRelease({ ...options(), publicKeyPem: otherKey })).rejects.toThrow(
      /keyId does not match the configured trust root/,
    );
  });

  it("aborts an unbounded response stream as soon as it exceeds the fixed limit", async () => {
    const oneMiB = 1024 * 1024;
    const streamed = createStreamingResourceResponse(
      Array.from({ length: 5 }, () => new Uint8Array(oneMiB)),
    );
    let requestSignal: AbortSignal | undefined;
    const fetcher = vi.fn(async (_input, init) => {
      requestSignal = init?.signal;
      return streamed.response;
    });

    await expect(resolveWebRelease({ ...options(), fetcher })).rejects.toThrow(
      /release manifest exceeds the maximum permitted size/,
    );
    expect(streamed.state.reads).toBe(5);
    expect(streamed.state.cancelled).toBe(true);
    expect(streamed.state.cancelReasons[0]).toMatch(/exceeded its fixed size limit/);
    expect(streamed.state.arrayBufferCalls).toBe(0);
    expect(requestSignal?.aborted).toBe(true);
  });

  it("rejects non-Ed25519 trust roots and malformed detached-signature envelopes", () => {
    const payload = Buffer.from("signed payload");
    const rsaKey = generateKeyPairSync("rsa", { modulusLength: 2048 }).publicKey.export({ type: "spki", format: "pem" });
    expect(() => verifySignedResourceBytes(payload, fixture.signBytes(payload), rsaKey)).toThrow(/must be an Ed25519 public key/);
    expect(() => verifySignedResourceBytes(payload, Buffer.from("not json"), fixture.publicKeyPem)).toThrow(/not valid JSON/);

    const valid = JSON.parse(fixture.signBytes(payload).toString("utf8"));
    const malformed = [
      [{ ...valid, algorithm: "RSA" }, /unsupported detached-signature schema or algorithm/],
      [{ ...valid, keyId: "bad" }, /invalid keyId/],
      [{ ...valid, payloadSha256: "bad" }, /invalid payloadSha256/],
      [{ ...valid, signature: "bad" }, /invalid Ed25519 signature encoding/],
    ] as const;
    for (const [envelope, error] of malformed) {
      expect(() => verifySignedResourceBytes(payload, Buffer.from(JSON.stringify(envelope)), fixture.publicKeyPem)).toThrow(error);
    }
  });

  it("rejects a well-formed but cryptographically invalid Ed25519 signature", () => {
    const payload = Buffer.from("signed payload");
    const envelope = JSON.parse(fixture.signBytes(payload).toString("utf8"));
    envelope.signature = Buffer.alloc(64).toString("base64");
    expect(() => verifySignedResourceBytes(payload, Buffer.from(JSON.stringify(envelope)), fixture.publicKeyPem))
      .toThrow(/signature verification failed/);
  });

  it.each([
    {
      name: "release digest",
      arrange: () => {
        fixture.publishRelease();
        fixture.setRoute(`/resources/${TEST_VERSION}/manifest.json`, Buffer.from("{}\n"));
      },
      error: /payload digest does not match/,
    },
    {
      name: "release schema",
      arrange: () => fixture.publishRelease({ mutateReleaseManifest: (value) => { value.schemaVersion = "bad"; } }),
      error: /unsupported schemaVersion/,
    },
    {
      name: "nested manifest descriptor digest",
      arrange: () => {
        fixture.publishRelease();
        fixture.setRoute(
          `/resources/${TEST_VERSION}/raw/prebuilt/fortemi-core/framework/manifest.json`,
          Buffer.from("{}\n"),
        );
      },
      error: /release descriptor size or digest verification failed/,
    },
    {
      name: "Fortemi index descriptor digest",
      arrange: () => {
        fixture.publishRelease();
        fixture.setRoute(
          `/resources/${TEST_VERSION}/raw/prebuilt/fortemi-core/framework/aiwg-fortemi-index-v2.json`,
          Buffer.from("{}\n"),
        );
      },
      error: /release descriptor size or digest verification failed/,
    },
    {
      name: "nested index checksum",
      arrange: () => fixture.publishRelease({ mutateFortemiManifest: (value) => { value.export_checksum = "0".repeat(64); } }),
      error: /export checksum does not match/,
    },
    {
      name: "nested manifest schema",
      arrange: () => fixture.publishRelease({ mutateFortemiManifest: (value) => { value.schema_version = "bad"; } }),
      error: /unsupported schema_version/,
    },
    {
      name: "Fortemi index schema",
      arrange: () => fixture.publishRelease({ mutateExport: (value) => { value.schema_version = "bad"; } }),
      error: /index export has an unsupported schema_version/,
    },
    {
      name: "CLI index discovery chunks",
      arrange: () => fixture.publishRelease({ mutateExport: (value) => { value.items[0].chunks = [{ id: "forbidden" }]; } }),
      error: /must not contain discovery\/search chunks/,
    },
  ])("fails closed on $name failure", async ({ arrange, error }) => {
    arrange();
    await expect(resolveWebRelease(options())).rejects.toThrow(error);
  });

  it.each([
    {
      name: "v2 compatibility",
      mutateReleaseManifest: (value: any) => { value.compatibility.cli.minimumVersion = "invalid"; },
      error: /compatibility metadata is invalid/,
    },
    {
      name: "unsafe bundle filename",
      mutateReleaseManifest: (value: any) => { value.bundles = [{ filename: "../bad.tar.zst", size: 0, sha256: "0".repeat(64) }]; },
      error: /unsafe bundle filename/,
    },
    {
      name: "unsafe descriptor path",
      mutateReleaseManifest: (value: any) => { value.files[0].path = "raw/../manifest.json"; },
      error: /not a safe relative path/,
    },
    {
      name: "invalid descriptor size",
      mutateReleaseManifest: (value: any) => { value.files[0].size = -1; },
      error: /descriptor size.*invalid/,
    },
    {
      name: "invalid descriptor digest",
      mutateReleaseManifest: (value: any) => { value.files[0].sha256 = "bad"; },
      error: /descriptor digest.*invalid/,
    },
  ])("rejects $name validation failure", async ({ mutateReleaseManifest, error }) => {
    fixture.publishRelease({ mutateReleaseManifest });
    await expect(resolveWebRelease(options())).rejects.toThrow(error);
  });

  it.each([
    {
      name: "backend",
      mutateFortemiManifest: (value: any) => { value.backend = "sqlite"; },
      error: /backend or graph is invalid/,
    },
    {
      name: "export path",
      mutateFortemiManifest: (value: any) => { value.export_path = "other.json"; },
      error: /export path or schema is invalid/,
    },
    {
      name: "checksum encoding",
      mutateFortemiManifest: (value: any) => { value.export_checksum = "bad"; },
      error: /export checksum is invalid/,
    },
    {
      name: "item count",
      mutateFortemiManifest: (value: any) => { value.item_count = 0; },
      error: /item_count is invalid/,
    },
  ])("rejects nested Fortemi manifest $name failure", async ({ mutateFortemiManifest, error }) => {
    fixture.publishRelease({ mutateFortemiManifest });
    await expect(resolveWebRelease(options())).rejects.toThrow(error);
  });

  it.each([
    {
      name: "graph",
      mutateExport: (value: any) => { value.source.graph = "project"; },
      error: /index export graph is invalid/,
    },
    {
      name: "item count",
      mutateExport: (value: any) => { value.items.push({}); },
      error: /item count does not match/,
    },
  ])("rejects Fortemi export $name failure", async ({ mutateExport, error }) => {
    fixture.publishRelease({ mutateExport });
    await expect(resolveWebRelease(options())).rejects.toThrow(error);
  });

  it.each([
    ["not a url", false, /Invalid AIWG resource base URL/],
    ["http://example.com", true, /require HTTPS/],
    ["http://127.0.0.1:1234", false, /require HTTPS/],
    ["https://user:pass@example.com", false, /clean origin/],
    ["https://example.com?x=1", false, /clean origin/],
    ["https://example.com/#fragment", false, /clean origin/],
  ])("rejects unsafe base URL %s", async (baseUrl, allowInsecureLoopbackHttp, error) => {
    await expect(resolveWebRelease({
      selector: TEST_VERSION,
      baseUrl,
      allowInsecureLoopbackHttp,
      cacheRoot,
      publicKeyPem: fixture.publicKeyPem,
      fetcher: vi.fn(),
    })).rejects.toThrow(error);
  });

  it("rejects unsafe, mutable, and uncommitted raw resource paths", async () => {
    fixture.publishRelease();
    const release = await resolveWebRelease(options());
    const noFetch = vi.fn();

    await expect(fetchVerifiedRawResource(release, "../secret", { fetcher: noFetch })).rejects.toThrow(/safe relative path/);
    await expect(fetchVerifiedRawResource(release, "/raw/secret", { fetcher: noFetch })).rejects.toThrow(/safe relative path/);
    await expect(fetchVerifiedRawResource(release, "manifest.json", { fetcher: noFetch })).rejects.toThrow(/only immutable raw/);
    await expect(fetchVerifiedRawResource(release, "raw/not-committed.md", { fetcher: noFetch })).rejects.toThrow(/does not commit/);
    expect(noFetch).not.toHaveBeenCalled();
  });

  it("caches sequence 100000000 and rejects subsequent rollback and same-sequence equivocation", async () => {
    const first = fixture.publishRelease();
    fixture.publishChannel("stable", 100000000, first);
    await resolveWebRelease(options("stable"));
    expect(fs.readdirSync(path.join(cacheRoot, "channels", "stable"))).toEqual([
      expect.stringMatching(/^100000000-[0-9a-f]{64}$/),
    ]);

    fixture.publishChannel("stable", 99999999, first);
    await expect(resolveWebRelease(options("stable"))).rejects.toThrow(/sequence rollback detected/);

    const conflicting = fixture.publishRelease({ version: "2026.7.23" });
    fixture.publishChannel("stable", 100000000, conflicting);
    await expect(resolveWebRelease(options("stable"))).rejects.toThrow(/sequence 100000000 has conflicting signed metadata/);
  });

  it("installs only complete atomic generations", async () => {
    const published = fixture.publishRelease();
    const release = await resolveWebRelease(options());

    expect(path.basename(release.cacheDir)).toBe(published.manifestDigest);
    expect(fs.existsSync(path.join(release.cacheDir, "complete.json"))).toBe(true);
    expect(fs.existsSync(release.releaseManifestPath)).toBe(true);
    expect(fs.existsSync(release.releaseSignaturePath)).toBe(true);
    expect(fs.existsSync(release.fortemiManifestPath)).toBe(true);
    expect(fs.existsSync(release.fortemiExportPath)).toBe(true);
  });

  it("supports warm offline resolution with zero fetch calls and rejects cold or corrupt caches", async () => {
    fixture.publishRelease();
    const warm = await resolveWebRelease(options());
    const forbiddenFetch = vi.fn(async () => { throw new Error("offline fetch attempted"); });

    const offline = await resolveWebRelease({ ...options(), offline: true, fetcher: forbiddenFetch });
    expect(offline.manifestDigest).toBe(warm.manifestDigest);
    expect(forbiddenFetch).not.toHaveBeenCalled();

    const coldCache = path.join(cacheRoot, "cold");
    await expect(resolveWebRelease({ ...options(), cacheRoot: coldCache, offline: true, fetcher: forbiddenFetch }))
      .rejects.toThrow(/not cached/);
    expect(forbiddenFetch).not.toHaveBeenCalled();

    fs.writeFileSync(warm.fortemiExportPath, "tampered");
    await expect(resolveWebRelease({ ...options(), offline: true, fetcher: forbiddenFetch }))
      .rejects.toThrow(/corrupt.*offline mode fails closed/i);
    expect(forbiddenFetch).not.toHaveBeenCalled();
  });

  it("rejects swapped nested manifest and export bytes against their outer release descriptors", async () => {
    fixture.publishRelease();
    const release = await resolveWebRelease(options());
    const swapped = fixture.publishRelease({
      mutateExport: (value) => {
        value.items[0].title = "Internally Consistent But Swapped";
        value.items[0].name = "swapped-index";
      },
    });
    fs.writeFileSync(release.fortemiManifestPath, swapped.fortemiManifestBytes);
    fs.writeFileSync(release.fortemiExportPath, swapped.exportBytes);

    const loaded = loadFortemiCoreExport(cacheRoot, "framework", {
      manifestPath: release.fortemiManifestPath,
      exportPath: release.fortemiExportPath,
      manifestSha256: release.fortemiManifestSha256,
      manifestSize: release.fortemiManifestSize,
      exportSha256: release.fortemiExportSha256,
      exportSize: release.fortemiExportSize,
    });
    expect(loaded.exported).toBeUndefined();
    expect(loaded.reason).toMatch(/does not match the signed release descriptor/i);
    await expect(resolveWebRelease({ ...options(), offline: true, fetcher: vi.fn() }))
      .rejects.toThrow(/corrupt.*offline mode fails closed/i);
  });

  it("fails closed when a cached Fortemi file is replaced by a symlink", async () => {
    fixture.publishRelease();
    const release = await resolveWebRelease(options());
    const target = path.join(cacheRoot, "symlink-target.json");
    fs.copyFileSync(release.fortemiExportPath, target);
    fs.rmSync(release.fortemiExportPath);
    fs.symlinkSync(target, release.fortemiExportPath);
    const forbiddenFetch = vi.fn();

    const loaded = loadFortemiCoreExport(cacheRoot, "framework", {
      manifestPath: release.fortemiManifestPath,
      exportPath: release.fortemiExportPath,
      manifestSha256: release.fortemiManifestSha256,
      manifestSize: release.fortemiManifestSize,
      exportSha256: release.fortemiExportSha256,
      exportSize: release.fortemiExportSize,
    });
    expect(loaded.exported).toBeUndefined();
    expect(loaded.reason).toMatch(/regular file.*symlink/i);

    await expect(resolveWebRelease({ ...options(), offline: true, fetcher: forbiddenFetch }))
      .rejects.toThrow(/corrupt.*offline mode fails closed/i);
    expect(forbiddenFetch).not.toHaveBeenCalled();
  });

  it("fails closed when a cached signed-metadata file is non-regular", async () => {
    fixture.publishRelease();
    const release = await resolveWebRelease(options());
    fs.rmSync(release.releaseSignaturePath);
    fs.mkdirSync(release.releaseSignaturePath);
    const forbiddenFetch = vi.fn();

    await expect(resolveWebRelease({ ...options(), offline: true, fetcher: forbiddenFetch }))
      .rejects.toThrow(/corrupt.*offline mode fails closed/i);
    expect(forbiddenFetch).not.toHaveBeenCalled();
  });

  it("fails closed without blocking when a checked cache file is swapped for a FIFO", () => {
    if (process.platform === "win32" || typeof fs.constants.O_NONBLOCK !== "number") return;
    const pathname = path.join(cacheRoot, "fifo-race.json");
    fs.writeFileSync(pathname, "{}\n");
    const originalLstat = fs.lstatSync.bind(fs);
    let swapped = false;
    vi.spyOn(fs, "lstatSync").mockImplementation(((candidate: fs.PathLike) => {
      const stat = originalLstat(candidate);
      if (!swapped && path.resolve(String(candidate)) === pathname) {
        swapped = true;
        fs.rmSync(pathname);
        const result = spawnSync("mkfifo", [pathname]);
        if (result.status !== 0) {
          throw new Error(`mkfifo failed: ${result.stderr.toString("utf8")}`);
        }
      }
      return stat;
    }) as typeof fs.lstatSync);

    expect(() => readVerifiedRegularFile(pathname, {
      label: "FIFO race regression fixture",
      maxBytes: 1024,
    })).toThrow(/invalid descriptor type or size/);
  });

  it.each([
    ["mismatched", JSON.stringify({
      schemaVersion: "aiwg.resource-cache-generation/v1",
      version: TEST_VERSION,
      manifestSha256: "0".repeat(64),
    })],
    ["corrupt", "{not-json"],
  ])("fails closed when the completion marker is %s", async (_name, marker) => {
    fixture.publishRelease();
    const release = await resolveWebRelease(options());
    fs.writeFileSync(path.join(release.cacheDir, "complete.json"), marker);
    const forbiddenFetch = vi.fn();

    await expect(resolveWebRelease({ ...options(), offline: true, fetcher: forbiddenFetch }))
      .rejects.toThrow(/corrupt.*offline mode fails closed/i);
    expect(forbiddenFetch).not.toHaveBeenCalled();
  });

  it("supports warm channel offline resolution with zero fetch calls", async () => {
    const published = fixture.publishRelease();
    fixture.publishChannel("stable", 3, published);
    await resolveWebRelease(options("stable"));
    const forbiddenFetch = vi.fn(async () => { throw new Error("offline fetch attempted"); });

    const offline = await resolveWebRelease({ ...options("stable"), offline: true, fetcher: forbiddenFetch });
    expect(offline.channelSequence).toBe(3);
    expect(forbiddenFetch).not.toHaveBeenCalled();
  });

  it("fails closed for cold and corrupt offline raw-body caches without fetching", async () => {
    fixture.publishRelease();
    const release = await resolveWebRelease(options());
    const forbiddenFetch = vi.fn(async () => { throw new Error("offline fetch attempted"); });

    await expect(fetchVerifiedRawResource(release, TEST_RAW_PATH, { offline: true, fetcher: forbiddenFetch }))
      .rejects.toThrow(/not cached/);
    const body = await fetchVerifiedRawResource(release, TEST_RAW_PATH, {
      baseUrl: fixture.baseUrl,
      allowInsecureLoopbackHttp: true,
    });
    expect(body.length).toBeGreaterThan(0);
    const descriptor = release.descriptors.get(TEST_RAW_PATH)!;
    const cachedBody = path.join(release.cacheDir, "raw-bodies", descriptor.sha256);
    fs.writeFileSync(cachedBody, "tampered");
    await expect(fetchVerifiedRawResource(release, TEST_RAW_PATH, { offline: true, fetcher: forbiddenFetch }))
      .rejects.toThrow(/corrupt.*offline mode fails closed/i);
    expect(forbiddenFetch).not.toHaveBeenCalled();
  });

  it("leaves no complete generation after a tampered download and preserves a prior valid generation", async () => {
    const prior = fixture.publishRelease();
    const priorRelease = await resolveWebRelease(options());
    expect(priorRelease.manifestDigest).toBe(prior.manifestDigest);

    const tampered = fixture.publishRelease({
      mutateFortemiManifest: (value) => { value.export_checksum = "f".repeat(64); },
    });
    fixture.publishChannel("stable", 2, tampered);
    await expect(resolveWebRelease(options("stable"))).rejects.toThrow(/export checksum does not match/);

    const releaseRoot = path.join(cacheRoot, "releases", TEST_VERSION);
    const completeGenerations = fs.readdirSync(releaseRoot).filter((name) =>
      fs.existsSync(path.join(releaseRoot, name, "complete.json")),
    );
    expect(completeGenerations).toEqual([prior.manifestDigest]);
    const recovered = await resolveWebRelease({ ...options(), offline: true, fetcher: vi.fn() });
    expect(recovered.manifestDigest).toBe(prior.manifestDigest);
  });
});
