import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { buildWebResourceDoctorSection } from "../../../src/resources/doctor.js";
import { writeWebResourceLock } from "../../../src/resources/lockfile.js";
import { resolveWebRelease } from "../../../src/resources/web-release.js";
import { createWebResourceReleaseFixture } from "../../fixtures/web-resource-release.js";

describe("web resource doctor diagnostics", () => {
  let projectDir: string;
  let cacheRoot: string;
  let fixture: ReturnType<typeof createWebResourceReleaseFixture>;

  beforeEach(async () => {
    projectDir = fs.mkdtempSync(path.join(os.tmpdir(), "aiwg-resource-doctor-project-"));
    cacheRoot = fs.mkdtempSync(path.join(os.tmpdir(), "aiwg-resource-doctor-cache-"));
    fixture = createWebResourceReleaseFixture();
    await fixture.start();
  });

  afterEach(async () => {
    await fixture.stop();
    fs.rmSync(projectDir, { recursive: true, force: true });
    fs.rmSync(cacheRoot, { recursive: true, force: true });
  });

  async function lockedRelease() {
    const published = fixture.publishRelease();
    fixture.publishChannel("stable", 5, published);
    const release = await resolveWebRelease({
      selector: "stable",
      baseUrl: fixture.baseUrl,
      cacheRoot,
      publicKeyPem: fixture.publicKeyPem,
      allowInsecureLoopbackHttp: true,
    });
    writeWebResourceLock(projectDir, release, { now: new Date("2026-07-24T12:00:00.000Z") });
    return release;
  }

  it("reports info when the project has no resource lockfile", () => {
    const section = buildWebResourceDoctorSection(projectDir, { cacheRoot });

    expect(section.hasFailures).toBe(false);
    expect(section.diagnostics).toEqual([
      expect.objectContaining({ severity: "info", code: "resource-lockfile-missing" }),
    ]);
    expect(section.output).toContain("web resource source mode is not pinned");
  });

  it("verifies a warm locked resource cache", async () => {
    await lockedRelease();

    const section = buildWebResourceDoctorSection(projectDir, { cacheRoot });

    expect(section.hasFailures).toBe(false);
    expect(section.diagnostics).toEqual([
      expect.objectContaining({ severity: "info", code: "resource-source-mode" }),
      expect.objectContaining({ severity: "ok", code: "resource-cache-verified" }),
    ]);
  });

  it("warns when a locked resource cache generation is missing", async () => {
    const release = await lockedRelease();
    fs.rmSync(release.cacheDir, { recursive: true, force: true });

    const section = buildWebResourceDoctorSection(projectDir, { cacheRoot });

    expect(section.hasFailures).toBe(false);
    expect(section.diagnostics).toContainEqual(
      expect.objectContaining({ severity: "warning", code: "resource-cache-miss" }),
    );
  });

  it("fails when locked cache bytes drift from the lockfile digests", async () => {
    const release = await lockedRelease();
    fs.writeFileSync(path.join(release.cacheDir, "manifest.json"), "{\"tampered\":true}\n");

    const section = buildWebResourceDoctorSection(projectDir, { cacheRoot });

    expect(section.hasFailures).toBe(true);
    expect(section.diagnostics).toContainEqual(
      expect.objectContaining({ severity: "error", code: "resource-cache-drift" }),
    );
  });
});
