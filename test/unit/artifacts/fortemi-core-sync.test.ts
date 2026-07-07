import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { createHash } from "node:crypto";
import {
  syncFortemiCoreIndex,
  getFortemiCoreSyncStatus,
} from "../../../src/artifacts/fortemi-core-sync.js";
import { collectIndexStatus } from "../../../src/artifacts/index-status.js";
import {
  GRAPH_CONFIGS,
  BUILTIN_GRAPH_CONFIGS,
  getGraphIndexDir,
} from "../../../src/artifacts/types.js";
import type {
  ArtifactIndex,
  DependencyGraph,
  MetadataEntry,
} from "../../../src/artifacts/types.js";

function resetRegistry(): void {
  for (const k of Object.keys(GRAPH_CONFIGS)) {
    if (!(k in BUILTIN_GRAPH_CONFIGS)) delete GRAPH_CONFIGS[k];
  }
}

function entry(overrides: Partial<MetadataEntry> = {}): MetadataEntry {
  return {
    path: "agentic/code/addons/aiwg-utils/skills/aiwg-doctor/SKILL.md",
    type: "skill",
    phase: "operations",
    title: "AIWG Doctor",
    name: "aiwg-doctor",
    tags: ["aiwg"],
    created: "2026-01-01T00:00:00.000Z",
    updated: "2026-01-02T00:00:00.000Z",
    checksum: "abcdef1234567890",
    summary: "Run workspace health diagnostics.",
    dependencies: [],
    dependents: [],
    triggers: ["doctor"],
    capability: "Diagnose the AIWG workspace.",
    ...overrides,
  };
}

function writeProjectIndex(root: string, metadataEntry: MetadataEntry): void {
  const dir = getGraphIndexDir(root, "project");
  fs.mkdirSync(dir, { recursive: true });
  const index: ArtifactIndex = {
    version: "1.0.0",
    builtAt: "2026-01-03T00:00:00.000Z",
    buildTimeMs: 1,
    entries: { [metadataEntry.path]: metadataEntry },
  };
  const graph: DependencyGraph = {
    [metadataEntry.path]: { upstream: [], downstream: [] },
  };
  fs.writeFileSync(path.join(dir, "metadata.json"), JSON.stringify(index));
  fs.writeFileSync(path.join(dir, "dependencies.json"), JSON.stringify(graph));
}

describe("Fortemi Core static index sync (#1687)", () => {
  let tmp: string;
  let prevXdg: string | undefined;

  beforeEach(() => {
    tmp = fs.mkdtempSync(path.join(os.tmpdir(), "aiwg-fortemi-core-sync-"));
    prevXdg = process.env.XDG_DATA_HOME;
    process.env.XDG_DATA_HOME = path.join(tmp, "xdg");
    resetRegistry();
  });

  afterEach(() => {
    if (prevXdg === undefined) delete process.env.XDG_DATA_HOME;
    else process.env.XDG_DATA_HOME = prevXdg;
    resetRegistry();
    fs.rmSync(tmp, { recursive: true, force: true });
  });

  it("materializes a deterministic v2 export and reports unchanged incremental syncs", () => {
    writeProjectIndex(tmp, entry());

    const first = syncFortemiCoreIndex(tmp, {
      repo: "roctinam/aiwg",
      privacy: "sanitized",
      generatedAt: "2026-01-05T00:00:00.000Z",
    });
    const second = syncFortemiCoreIndex(tmp, {
      repo: "roctinam/aiwg",
      privacy: "sanitized",
      generatedAt: "2026-01-05T00:00:00.000Z",
    });

    expect(first.status).toBe("created");
    expect(second.status).toBe("unchanged");
    expect(second.export_checksum).toBe(first.export_checksum);
    expect(second.skos_coverage).toEqual({
      records_with_concepts: 1,
      total_records: 1,
      ratio: 1,
    });
    const exported = JSON.parse(
      fs.readFileSync(path.join(tmp, second.export_path), "utf-8"),
    );
    expect(exported.schema_version).toBe("aiwg.fortemi.index.export.v2");
    expect(exported.items[0].type).toBe("aiwg.skill");
    expect(exported.items[0].skos_concepts.length).toBeGreaterThan(0);
  });

  it("reports unchanged for normal re-syncs when only the generated timestamp would differ", () => {
    writeProjectIndex(tmp, entry());

    const first = syncFortemiCoreIndex(tmp, {
      repo: "roctinam/aiwg",
      privacy: "sanitized",
    });
    const second = syncFortemiCoreIndex(tmp, {
      repo: "roctinam/aiwg",
      privacy: "sanitized",
    });

    expect(first.status).toBe("created");
    expect(second.status).toBe("unchanged");
    expect(second.generated_at).toBe(first.generated_at);
    expect(second.export_checksum).toBe(first.export_checksum);
  });

  it("updates the cache when indexed records change", () => {
    writeProjectIndex(tmp, entry());
    const first = syncFortemiCoreIndex(tmp, {
      generatedAt: "2026-01-05T00:00:00.000Z",
    });
    writeProjectIndex(
      tmp,
      entry({
        summary: "Run deeper workspace health diagnostics.",
        checksum: "1234567890abcdef",
        updated: "2026-01-06T00:00:00.000Z",
      }),
    );
    const second = syncFortemiCoreIndex(tmp, {
      generatedAt: "2026-01-05T00:00:00.000Z",
    });

    expect(second.status).toBe("updated");
    expect(second.export_checksum).not.toBe(first.export_checksum);
  });

  it("keeps status quiet until a project opts in by creating a Fortemi Core cache", () => {
    writeProjectIndex(tmp, entry());
    expect(getFortemiCoreSyncStatus(tmp).optedIn).toBe(false);
    expect(collectIndexStatus(tmp).fortemiCore.optedIn).toBe(false);

    syncFortemiCoreIndex(tmp, { generatedAt: "2026-01-05T00:00:00.000Z" });
    const status = collectIndexStatus(tmp).fortemiCore;

    expect(status.optedIn).toBe(true);
    expect(status.built).toBe(true);
    expect(status.stale).toBe(false);
    expect(status.itemCount).toBe(1);
  });

  it("reports the Fortemi Core cache stale when the export file is missing", () => {
    writeProjectIndex(tmp, entry());
    syncFortemiCoreIndex(tmp, { generatedAt: "2026-01-05T00:00:00.000Z" });

    const statusBefore = getFortemiCoreSyncStatus(tmp);
    fs.rmSync(statusBefore.exportPath);

    const status = collectIndexStatus(tmp).fortemiCore;
    expect(status.optedIn).toBe(true);
    expect(status.built).toBe(false);
    expect(status.stale).toBe(true);
    expect(status.reason).toBe("manifest exists but export file is missing");
  });

  it("reports the Fortemi Core cache stale when the manifest JSON is corrupt", () => {
    const cacheDir = path.join(tmp, ".aiwg", ".index", "fortemi-core", "project");
    fs.mkdirSync(cacheDir, { recursive: true });
    fs.writeFileSync(path.join(cacheDir, "manifest.json"), "{ not json");

    const direct = getFortemiCoreSyncStatus(tmp);
    expect(direct.optedIn).toBe(true);
    expect(direct.built).toBe(false);
    expect(direct.stale).toBe(true);
    expect(direct.reason).toContain("manifest file is unreadable");

    const status = collectIndexStatus(tmp).fortemiCore;
    expect(status.optedIn).toBe(true);
    expect(status.built).toBe(false);
    expect(status.stale).toBe(true);
    expect(status.reason).toContain("manifest file is unreadable");
  });

  it("reports the Fortemi Core cache stale when the source graph is rebuilt later", () => {
    writeProjectIndex(tmp, entry());
    syncFortemiCoreIndex(tmp, { generatedAt: "2026-01-05T00:00:00.000Z" });

    writeProjectIndex(
      tmp,
      entry({
        updated: "2026-01-06T00:00:00.000Z",
        checksum: "1234567890abcdef",
      }),
    );
    const indexPath = path.join(
      getGraphIndexDir(tmp, "project"),
      "metadata.json",
    );
    const rebuilt = JSON.parse(fs.readFileSync(indexPath, "utf-8"));
    rebuilt.builtAt = "2026-01-06T00:00:00.000Z";
    fs.writeFileSync(indexPath, JSON.stringify(rebuilt));

    const status = collectIndexStatus(tmp).fortemiCore;
    expect(status.optedIn).toBe(true);
    expect(status.built).toBe(true);
    expect(status.stale).toBe(true);
    expect(status.sourceIndexBuiltAt).toBe("2026-01-03T00:00:00.000Z");
    expect(status.reason).toBe(
      "source index is newer than the Fortemi Core static cache",
    );
  });

  it("reports the Fortemi Core cache stale when the export JSON is corrupt", () => {
    writeProjectIndex(tmp, entry());
    syncFortemiCoreIndex(tmp, { generatedAt: "2026-01-05T00:00:00.000Z" });

    const statusBefore = getFortemiCoreSyncStatus(tmp);
    fs.writeFileSync(statusBefore.exportPath, "{ not json");

    const status = collectIndexStatus(tmp).fortemiCore;
    expect(status.optedIn).toBe(true);
    expect(status.built).toBe(true);
    expect(status.stale).toBe(true);
    expect(status.reason).toContain("export file is unreadable");
  });

  it("reports the Fortemi Core cache stale when the export checksum drifts", () => {
    writeProjectIndex(tmp, entry());
    syncFortemiCoreIndex(tmp, { generatedAt: "2026-01-05T00:00:00.000Z" });

    const statusBefore = getFortemiCoreSyncStatus(tmp);
    const exported = JSON.parse(fs.readFileSync(statusBefore.exportPath, "utf-8"));
    exported.items = [];
    fs.writeFileSync(statusBefore.exportPath, JSON.stringify(exported, null, 2) + "\n");

    const status = collectIndexStatus(tmp).fortemiCore;
    expect(status.optedIn).toBe(true);
    expect(status.built).toBe(true);
    expect(status.stale).toBe(true);
    expect(status.reason).toBe("export checksum does not match manifest");
  });

  it("reports the Fortemi Core cache stale when the export schema drifts", () => {
    writeProjectIndex(tmp, entry());
    syncFortemiCoreIndex(tmp, { generatedAt: "2026-01-05T00:00:00.000Z" });

    const statusBefore = getFortemiCoreSyncStatus(tmp);
    const exported = JSON.parse(fs.readFileSync(statusBefore.exportPath, "utf-8"));
    exported.schema_version = "aiwg.fortemi.index.export.v1";
    const exportText = JSON.stringify(exported, null, 2) + "\n";
    fs.writeFileSync(statusBefore.exportPath, exportText);

    const manifest = JSON.parse(fs.readFileSync(statusBefore.manifestPath, "utf-8"));
    manifest.export_checksum = createHash("sha256").update(exportText).digest("hex");
    fs.writeFileSync(statusBefore.manifestPath, JSON.stringify(manifest, null, 2) + "\n");

    const status = collectIndexStatus(tmp).fortemiCore;
    expect(status.optedIn).toBe(true);
    expect(status.built).toBe(true);
    expect(status.stale).toBe(true);
    expect(status.reason).toBe(
      "export schema 'aiwg.fortemi.index.export.v1' does not match manifest 'aiwg.fortemi.index.export.v2'",
    );
  });
});
