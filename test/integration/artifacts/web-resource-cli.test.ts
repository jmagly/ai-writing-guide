import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  createWebResourceReleaseFixture,
  TEST_RAW_PATH,
  TEST_SKILL_BODY,
  TEST_VERSION,
} from "../../fixtures/web-resource-release.js";

interface CliResult {
  code: number | null;
  signal: NodeJS.Signals | null;
  stdout: Buffer;
  stderr: Buffer;
}

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const SOURCE_CLI = path.join(REPO_ROOT, "test", "fixtures", "source-aiwg-cli.ts");
const TSX = path.join(REPO_ROOT, "node_modules", ".bin", "tsx");

describe("artifact CLI signed web resources", () => {
  let cacheRoot: string;
  let cwd: string;
  let home: string;
  let trustRootFile: string;
  let fixture: ReturnType<typeof createWebResourceReleaseFixture>;

  beforeEach(async () => {
    cwd = fs.mkdtempSync(path.join(os.tmpdir(), "aiwg-web-cli-cwd-"));
    cacheRoot = fs.mkdtempSync(path.join(os.tmpdir(), "aiwg-web-cli-cache-"));
    home = path.join(cwd, "home");
    fs.mkdirSync(home, { recursive: true });
    fixture = createWebResourceReleaseFixture();
    await fixture.start();
    const release = fixture.publishRelease();
    fixture.publishChannel("stable", 7, release);
    fixture.publishVersionIndex([release]);
    trustRootFile = path.join(cwd, "release-root.pem");
    fs.writeFileSync(trustRootFile, fixture.publicKeyPem, { mode: 0o600 });
  });

  afterEach(async () => {
    await fixture.stop();
    fs.rmSync(cwd, { recursive: true, force: true });
    fs.rmSync(cacheRoot, { recursive: true, force: true });
  });

  function runCli(args: string[]): Promise<CliResult> {
    return new Promise((resolve, reject) => {
      const child = spawn(TSX, [SOURCE_CLI, ...args], {
        cwd,
        env: {
          ...process.env,
          HOME: home,
          XDG_CACHE_HOME: path.join(home, ".cache"),
          XDG_CONFIG_HOME: path.join(home, ".config"),
          XDG_DATA_HOME: path.join(home, ".local", "share"),
          AIWG_ROOT: REPO_ROOT,
          AIWG_RESOURCE_BASE_URL: fixture.baseUrl,
          AIWG_RESOURCE_CACHE_ROOT: cacheRoot,
          AIWG_RESOURCE_TRUST_ROOT_FILE: trustRootFile,
          AIWG_RESOURCE_ALLOW_INSECURE_LOOPBACK_HTTP: "1",
          AIWG_LOG_LEVEL: "silent",
        },
        stdio: ["ignore", "pipe", "pipe"],
      });
      const stdout: Buffer[] = [];
      const stderr: Buffer[] = [];
      child.stdout.on("data", (chunk: Buffer) => stdout.push(chunk));
      child.stderr.on("data", (chunk: Buffer) => stderr.push(chunk));
      child.once("error", reject);
      child.once("close", (code, signal) => resolve({
        code,
        signal,
        stdout: Buffer.concat(stdout),
        stderr: Buffer.concat(stderr),
      }));
    });
  }

  function expectSuccess(result: CliResult): void {
    expect(result.signal).toBeNull();
    expect(result.code, result.stderr.toString("utf8")).toBe(0);
  }

  it("runs real source CLI discover with signed provenance and repeats warm offline with the server unavailable", async () => {
    const cold = await runCli([
      "discover", "signed web regression",
      "--resource-source", "web",
      "--aiwg-version", TEST_VERSION,
      "--json",
    ]);
    expectSuccess(cold);
    const coldJson = JSON.parse(cold.stdout.toString("utf8"));

    expect(coldJson.total).toBe(1);
    expect(coldJson.results[0]).toMatchObject({
      name: "web-regression",
      type: "skill",
      provenance: { graph: "framework", scope: "packaged" },
    });
    expect(coldJson.results[0].id).toMatch(/^aiwg:skill:[0-9a-f]{16}$/);
    expect(coldJson.query).toMatchObject({
      resource_source: "web",
      aiwg_selector: TEST_VERSION,
      aiwg_version: TEST_VERSION,
      graph: "framework",
    });
    expect(coldJson.query.manifest_sha256).toMatch(/^[0-9a-f]{64}$/);
    expect(coldJson.query.manifest_url).toBe(`${fixture.baseUrl}/resources/${TEST_VERSION}/manifest.json`);

    const requestsBeforeOffline = fixture.requestPaths.length;
    await fixture.stop();
    const warm = await runCli([
      "discover", "signed web regression",
      "--resource-source", "web",
      "--aiwg-version", TEST_VERSION,
      "--offline",
      "--json",
    ]);
    expectSuccess(warm);
    const warmJson = JSON.parse(warm.stdout.toString("utf8"));
    expect(warmJson.results[0].id).toBe(coldJson.results[0].id);
    expect(warmJson.query.manifest_sha256).toBe(coldJson.query.manifest_sha256);
    expect(fixture.requestPaths).toHaveLength(requestsBeforeOffline);
  });

  it("runs real source CLI show byte-identically and uses only its warm offline body cache", async () => {
    const localFallback = path.join(cwd, TEST_RAW_PATH.replace(/^raw\//, ""));
    fs.mkdirSync(path.dirname(localFallback), { recursive: true });
    fs.writeFileSync(localFallback, "LOCAL FALLBACK MUST NOT BE READ\n");

    const discovered = await runCli([
      "discover", "signed web regression",
      "--resource-source", "web",
      "--aiwg-version", TEST_VERSION,
      "--json",
    ]);
    expectSuccess(discovered);
    const discoveredId = JSON.parse(discovered.stdout.toString("utf8")).results[0].id;

    const coldShow = await runCli([
      "show", "skill", discoveredId,
      "--resource-source", "web",
      "--aiwg-version", TEST_VERSION,
    ]);
    expectSuccess(coldShow);
    expect(coldShow.stdout).toEqual(TEST_SKILL_BODY);
    expect(fixture.requestPaths).toContain(`/resources/${TEST_VERSION}/${TEST_RAW_PATH}`);

    const requestsBeforeOffline = fixture.requestPaths.length;
    await fixture.stop();
    const warmShow = await runCli([
      "show", "skill", discoveredId,
      "--resource-source", "web",
      "--aiwg-version", TEST_VERSION,
      "--offline",
    ]);
    expectSuccess(warmShow);
    expect(warmShow.stdout).toEqual(TEST_SKILL_BODY);
    expect(warmShow.stdout.toString("utf8")).not.toContain("LOCAL FALLBACK");
    expect(fixture.requestPaths).toHaveLength(requestsBeforeOffline);
  });

  it("resolves, shows, and lists signed web resource versions through the source CLI", async () => {
    const resolved = await runCli(["versions", "resolve", "stable", "--json"]);
    expectSuccess(resolved);
    const resolvedJson = JSON.parse(resolved.stdout.toString("utf8"));
    expect(resolvedJson).toMatchObject({
      selector: "stable",
      selectorKind: "channel",
      version: TEST_VERSION,
      channelSequence: 7,
      manifestUrl: `${fixture.baseUrl}/resources/${TEST_VERSION}/manifest.json`,
    });
    expect(resolvedJson.manifestSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(resolvedJson.fortemiCore.exportSha256).toMatch(/^[0-9a-f]{64}$/);

    const shown = await runCli(["versions", "show", TEST_VERSION, "--json"]);
    expectSuccess(shown);
    const shownJson = JSON.parse(shown.stdout.toString("utf8"));
    expect(shownJson).toMatchObject({
      selector: TEST_VERSION,
      selectorKind: "exact",
      version: TEST_VERSION,
      manifest: {
        schemaVersion: "aiwg.resource-manifest/v2",
        version: TEST_VERSION,
        fileCount: 3,
      },
    });
    expect(shownJson.manifest.compatibility.cli.minimumVersion).toBe("2026.1.1");

    const listed = await runCli(["versions", "list", "--channels", "stable", "--json"]);
    expectSuccess(listed);
    const listedJson = JSON.parse(listed.stdout.toString("utf8"));
    expect(listedJson.unavailable).toEqual([]);
    expect(listedJson.channels).toHaveLength(1);
    expect(listedJson.channels[0]).toMatchObject({
      selector: "stable",
      version: TEST_VERSION,
      channelSequence: 7,
    });
  });

  it("writes a project resource lockfile from a signed web version resolution", async () => {
    const result = await runCli(["versions", "resolve", "stable", "--json", "--write-lock"]);
    expectSuccess(result);
    const json = JSON.parse(result.stdout.toString("utf8"));
    const lockfilePath = path.join(cwd, ".aiwg", "resources.lock.json");
    expect(json.lockfile).toBe(lockfilePath);

    const lockfile = JSON.parse(fs.readFileSync(lockfilePath, "utf8"));
    expect(lockfile).toMatchObject({
      schemaVersion: "aiwg.resources-lock/v1",
      resources: {
        framework: {
          source: "web",
          selector: "stable",
          selectorKind: "channel",
          version: TEST_VERSION,
          manifestUrl: `${fixture.baseUrl}/resources/${TEST_VERSION}/manifest.json`,
          manifestSha256: json.manifestSha256,
          channelSequence: 7,
        },
      },
    });
    expect(lockfile.resources.framework.fortemiCore.exportSha256).toBe(json.fortemiCore.exportSha256);

    const lockedGeneration = path.join(cacheRoot, "releases", TEST_VERSION, json.manifestSha256);
    const unlockedGeneration = path.join(cacheRoot, "releases", "2026.7.99", "b".repeat(64));
    fs.mkdirSync(unlockedGeneration, { recursive: true });
    expect(fs.existsSync(lockedGeneration)).toBe(true);

    const cleanup = await runCli(["versions", "clean-cache", "--json"]);
    expectSuccess(cleanup);
    const cleanupJson = JSON.parse(cleanup.stdout.toString("utf8"));
    expect(cleanupJson.preserved).toEqual([
      expect.objectContaining({ version: TEST_VERSION, manifestSha256: json.manifestSha256 }),
    ]);
    expect(cleanupJson.removed).toEqual([
      expect.objectContaining({ version: "2026.7.99", manifestSha256: "b".repeat(64) }),
    ]);
    expect(fs.existsSync(lockedGeneration)).toBe(true);
    expect(fs.existsSync(unlockedGeneration)).toBe(false);
  });

  it("resolves SemVer ranges and digest selectors through the source CLI", async () => {
    const range = await runCli(["versions", "resolve", "^2026.7.0", "--json"]);
    expectSuccess(range);
    const rangeJson = JSON.parse(range.stdout.toString("utf8"));
    expect(rangeJson).toMatchObject({
      selector: "^2026.7.0",
      selectorKind: "range",
      version: TEST_VERSION,
    });

    const digest = await runCli([
      "versions",
      "resolve",
      `sha256:${rangeJson.manifestSha256}`,
      "--json",
    ]);
    expectSuccess(digest);
    const digestJson = JSON.parse(digest.stdout.toString("utf8"));
    expect(digestJson).toMatchObject({
      selector: `sha256:${rangeJson.manifestSha256}`,
      selectorKind: "digest",
      version: TEST_VERSION,
      manifestSha256: rangeJson.manifestSha256,
    });
  });
});
