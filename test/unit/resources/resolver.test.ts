import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  logicalIdFromFirstPartyPath,
  parseAiwgResourceId,
  resolveAiwgResourceBytes,
} from "../../../src/resources/resolver.js";
import {
  createWebResourceReleaseFixture,
  TEST_SKILL_BODY,
  TEST_SKILL_PATH,
  TEST_VERSION,
} from "../../fixtures/web-resource-release.js";

describe("AIWG resource resolver", () => {
  let cacheRoot: string;
  let frameworkRoot: string;
  let fixture: ReturnType<typeof createWebResourceReleaseFixture>;

  beforeEach(async () => {
    cacheRoot = fs.mkdtempSync(path.join(os.tmpdir(), "aiwg-resolver-cache-"));
    frameworkRoot = fs.mkdtempSync(path.join(os.tmpdir(), "aiwg-resolver-root-"));
    fixture = createWebResourceReleaseFixture();
    await fixture.start();
  });

  afterEach(async () => {
    await fixture.stop();
    fs.rmSync(cacheRoot, { recursive: true, force: true });
    fs.rmSync(frameworkRoot, { recursive: true, force: true });
  });

  function publishFixture(): void {
    const release = fixture.publishRelease();
    fixture.publishChannel("stable", 6, release);
  }

  function writeLocal(relativePath = TEST_SKILL_PATH, body = "local resource\n"): string {
    const pathname = path.join(frameworkRoot, relativePath);
    fs.mkdirSync(path.dirname(pathname), { recursive: true });
    fs.writeFileSync(pathname, body);
    return pathname;
  }

  it("parses first-party logical IDs into local and raw paths", () => {
    expect(parseAiwgResourceId("aiwg://frameworks/sdlc-complete/skills/example/SKILL.md")).toMatchObject({
      relativePath: "agentic/code/frameworks/sdlc-complete/skills/example/SKILL.md",
      rawPath: "raw/agentic/code/frameworks/sdlc-complete/skills/example/SKILL.md",
    });
    expect(parseAiwgResourceId("aiwg://addons/aiwg-utils/skills/address-issues/SKILL.md").relativePath)
      .toBe("agentic/code/addons/aiwg-utils/skills/address-issues/SKILL.md");
    expect(parseAiwgResourceId("aiwg://core/agents/personas/root-agent.md").relativePath)
      .toBe("agentic/code/agents/personas/root-agent.md");
  });

  it("converts indexed first-party paths to logical IDs", () => {
    expect(logicalIdFromFirstPartyPath(TEST_SKILL_PATH))
      .toBe("aiwg://frameworks/sdlc-complete/skills/web-regression/SKILL.md");
    expect(logicalIdFromFirstPartyPath(`raw/${TEST_SKILL_PATH}`))
      .toBe("aiwg://frameworks/sdlc-complete/skills/web-regression/SKILL.md");
    expect(logicalIdFromFirstPartyPath(".aiwg/project/skill.md")).toBeNull();
  });

  it("resolves local resources from the framework root", async () => {
    const pathname = writeLocal();

    const resolved = await resolveAiwgResourceBytes(
      "aiwg://frameworks/sdlc-complete/skills/web-regression/SKILL.md",
      { source: "local", frameworkRoot },
    );

    expect(resolved.source).toBe("local");
    expect(resolved.path).toBe(pathname);
    expect(resolved.bytes.toString("utf8")).toBe("local resource\n");
  });

  it("resolves web resources through the signed release cache", async () => {
    publishFixture();

    const resolved = await resolveAiwgResourceBytes(
      "aiwg://frameworks/sdlc-complete/skills/web-regression/SKILL.md",
      {
        source: "web",
        frameworkRoot,
        selector: TEST_VERSION,
        webReleaseOptions: {
          baseUrl: fixture.baseUrl,
          cacheRoot,
          publicKeyPem: fixture.publicKeyPem,
          allowInsecureLoopbackHttp: true,
        },
      },
    );

    expect(resolved.source).toBe("web");
    expect(resolved.path).toBe(`raw/${TEST_SKILL_PATH}`);
    expect(resolved.bytes).toEqual(TEST_SKILL_BODY);
    expect(resolved.webRelease?.manifestDigest).toMatch(/^[0-9a-f]{64}$/);
  });

  it("preserves local precedence in auto mode", async () => {
    publishFixture();
    writeLocal(TEST_SKILL_PATH, "local wins\n");

    const resolved = await resolveAiwgResourceBytes(
      "aiwg://frameworks/sdlc-complete/skills/web-regression/SKILL.md",
      {
        source: "auto",
        frameworkRoot,
        selector: "stable",
        webReleaseOptions: {
          baseUrl: fixture.baseUrl,
          cacheRoot,
          publicKeyPem: fixture.publicKeyPem,
          allowInsecureLoopbackHttp: true,
        },
      },
    );

    expect(resolved.source).toBe("local");
    expect(resolved.bytes.toString("utf8")).toBe("local wins\n");
  });

  it("falls back to web in auto mode when the local resource is missing", async () => {
    publishFixture();

    const resolved = await resolveAiwgResourceBytes(
      "aiwg://frameworks/sdlc-complete/skills/web-regression/SKILL.md",
      {
        source: "auto",
        frameworkRoot,
        selector: "stable",
        webReleaseOptions: {
          baseUrl: fixture.baseUrl,
          cacheRoot,
          publicKeyPem: fixture.publicKeyPem,
          allowInsecureLoopbackHttp: true,
        },
      },
    );

    expect(resolved.source).toBe("web");
    expect(resolved.bytes).toEqual(TEST_SKILL_BODY);
    expect(resolved.diagnostics.join("\n")).toContain("local-miss=");
  });

  it("fails clearly when a local resource is missing", async () => {
    await expect(resolveAiwgResourceBytes(
      "aiwg://frameworks/sdlc-complete/skills/web-regression/SKILL.md",
      { source: "local", frameworkRoot },
    )).rejects.toThrow(/no such file|ENOENT/i);
  });
});
